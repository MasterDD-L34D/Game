'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runFullLoop } = require('../../tools/sim/full-loop-runner');
const { makeMbtiPolicy } = require('../../tools/sim/mbti-policy');

function supertestHttp(app) {
  return {
    post: (path, body) =>
      request(app)
        .post(path)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (path, query) =>
      request(app)
        .get(path)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

function starterRoster() {
  return [
    {
      id: 'hero_a',
      species: 'dune_stalker',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'hero_b',
      species: 'velox',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 18,
      attack_range: 2,
      initiative: 16,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
  ];
}

test('runFullLoop: AI plays the cave_path campaign end-to-end with REAL combat -> completed, invariants clean', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);

  const res = await runFullLoop(http, {
    playerId: 'fl_e2e',
    roster: starterRoster(),
    branchKey: 'cave_path',
    seed: 'fl1b',
    maxChapters: 15,
  });

  assert.equal(res.completed, true, `campaign completed; chapters=${JSON.stringify(res.chapters)}`);
  assert.deepEqual(
    res.violations,
    [],
    `no invariant violations: ${JSON.stringify(res.violations)}`,
  );
  // cave_path = 5 tutorials + savana + cave + boss -> at least 5 chapters really played.
  assert.ok(res.chapters.length >= 5, `multiple chapters played, got ${res.chapters.length}`);
  // Every recorded outcome is real (the combat actually ran, not a faked stamp).
  assert.ok(res.chapters.every((c) => ['victory', 'defeat', 'timeout'].includes(c.outcome)));
  // fase-1b-2 Nido meta-step: the AI loop recruits via /api/meta/recruit on each
  // cleared chapter -> the Nido seam is really exercised end-to-end, no failures.
  assert.ok(res.recruited.length >= 5, `recruited across chapters, got ${res.recruited.length}`);
  assert.deepEqual(
    res.metaViolations,
    [],
    `no meta violations: ${JSON.stringify(res.metaViolations)}`,
  );
  // fase-1b-3a recruit -> combat: a unit recruited on a cleared chapter is resolved to
  // a faithful canon-derived player unit and JOINS the next mission's combat roster
  // (attrition replacement). Assert recruit_s1 (recruited after chapter 1) actually
  // fought a later chapter -> the recruit -> combat feedback loop is closed.
  assert.ok(
    res.chapters.slice(1).some((c) => (c.rosterIds || []).includes('recruit_s1')),
    `a recruited unit fought a later chapter; chapters=${JSON.stringify(
      res.chapters.map((c) => ({ step: c.step, rosterIds: c.rosterIds })),
    )}`,
  );
  // fase-1b-3b Nido economy + breeding: the AI earns affinity/trust to satisfy the
  // CANONICAL recruit gate (no affinity_at_recruit bypass) and rolls mating offspring ->
  // both seams are really exercised end-to-end (separate from the combat-recruit;
  // offspring are not resolved into combat yet).
  assert.equal(
    res.economyAffinityProven,
    true,
    'earned affinity/trust flipped the canonical recruit gate',
  );
  assert.ok(
    res.economyRecruited.length >= 1,
    `at least one earned-gate (no-bypass) recruit, got ${res.economyRecruited.length}`,
  );
  assert.ok(res.offspring >= 1, `at least one mating offspring rolled, got ${res.offspring}`);
  // fase-2b economy telemetry: the runner aggregates the backend's REAL advance economy
  // per run (PE earned per cleared chapter + backend-computed XP/MP grants). PI-spent is
  // 0 because no shop/PI-sink is wired in the loop yet -- surfaced as a real gap, never
  // invented. These feed meta-band-aggregator's economy_flow metric.
  assert.equal(res.initialRosterSize, 2, 'initial authored roster size captured');
  assert.ok(res.economy, 'economy telemetry present');
  const clearedChapters = res.chapters.filter((c) => c.outcome === 'victory').length;
  assert.equal(
    res.economy.peEarnedTotal,
    3 * clearedChapters,
    `PE earned = peEarned(3) x cleared chapters(${clearedChapters})`,
  );
  assert.ok(res.economy.xpGrantedTotal > 0, 'XP granted accrued from real victories');
  assert.equal(res.economy.piSpentTotal, 0, 'no PI sink wired in the loop yet');
  // fase-2a scaled enemies: covered cave_path chapters (enc_tutorial_01/02, savana_01,
  // caverna_02) load real wave-1 rosters from YAML; the uncovered ones (tutorial_03/04/05,
  // tutorial_06_hardcore) fall back to the weak-fixed enemy. Assert BOTH paths run -> the
  // scenario loader is wired and the fallback keeps the loop completing.
  const sources = res.chapters.map((c) => c.enemiesSource);
  assert.ok(
    sources.includes('scenario'),
    `scaled enemies used on covered chapters; sources=${sources}`,
  );
  assert.ok(
    sources.includes('fallback'),
    `fallback used on uncovered chapters; sources=${sources}`,
  );
});

test('runFullLoop: does NOT recruit when /campaign/advance rejects a victory chapter (Codex #2563 P2)', async () => {
  // Fake http: combat wins (state has no enemies) but /campaign/advance returns 409
  // (finalized/race). The campaign did NOT clear the chapter, so the Nido meta-step
  // must be skipped -> /api/meta/recruit is never called.
  const calls = [];
  const http = {
    post: async (path) => {
      calls.push(path);
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance') return { status: 409, body: { error: 'finalized' } };
      if (path === '/api/meta/recruit') return { status: 200, body: { success: true } };
      return { status: 200, body: {} };
    },
    get: async (path) => {
      if (path === '/api/session/state') {
        // No alive sistema units -> runEncounter resolves to 'victory' immediately.
        return {
          status: 200,
          body: {
            units: [{ id: 'hero_a', controlled_by: 'player', hp: 30 }],
            active_unit: 'hero_a',
          },
        };
      }
      if (path === '/api/campaign/summary')
        return { status: 200, body: { current_encounter: { encounter_id: 'e1' } } };
      return { status: 200, body: {} };
    },
  };
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: [
      {
        id: 'hero_a',
        max_hp: 30,
        job: 'stalker',
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
    ],
    maxChapters: 3,
  });
  assert.deepEqual(res.recruited, [], 'no recruit on a rejected advance');
  assert.ok(!calls.includes('/api/meta/recruit'), 'meta/recruit never called when advance != 200');
});

test('runFullLoop: does NOT recruit on the campaign-completing chapter (Codex #2565 P2)', async () => {
  // A victory whose advance completes the campaign (campaign_completed:true) has no next
  // mission, so recruiting there would inflate finalRoster/recruited with a unit that
  // never fights. The meta-step must be skipped on the completing chapter.
  const calls = [];
  const http = {
    post: async (path) => {
      calls.push(path);
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance') {
        return { status: 200, body: { campaign_completed: true } };
      }
      if (path === '/api/meta/recruit') {
        return { status: 200, body: { success: true, npc: { recruited: true } } };
      }
      return { status: 200, body: {} };
    },
    get: async (path) => {
      if (path === '/api/session/state') {
        return {
          status: 200,
          body: {
            units: [{ id: 'hero_a', controlled_by: 'player', hp: 30 }],
            active_unit: 'hero_a',
          },
        };
      }
      if (path === '/api/campaign/summary') {
        return { status: 200, body: { current_encounter: { encounter_id: 'e1' } } };
      }
      return { status: 200, body: {} };
    },
  };
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: [
      {
        id: 'hero_a',
        max_hp: 30,
        job: 'stalker',
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
    ],
    maxChapters: 3,
  });
  assert.equal(res.completed, true, 'campaign completed');
  assert.deepEqual(res.recruited, [], 'no recruit on the completing chapter');
  assert.ok(!calls.includes('/api/meta/recruit'), 'meta/recruit not called on completion');
});

test('runFullLoop: repeated runs on one app do not collide on courtship ids (Codex #2566 P2)', async (t) => {
  // The Nido economy courtship NPCs live on the default meta store (no campaign_id).
  // With fixed ids, a second run on the same app would find them already-recruited
  // (gate_not_met) -> economyRecruited 0 + metaViolations. Courtship ids must be scoped
  // per run (campaign id) so a batch of full-loop sims on one process stays clean.
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);
  const run = (playerId, seed) =>
    runFullLoop(http, {
      playerId,
      roster: starterRoster(),
      branchKey: 'cave_path',
      seed,
      maxChapters: 15,
    });

  const r1 = await run('fl_batch1', 'b1');
  const r2 = await run('fl_batch2', 'b2');

  for (const [label, r] of [
    ['run1', r1],
    ['run2', r2],
  ]) {
    assert.deepEqual(
      r.metaViolations,
      [],
      `${label} meta violations: ${JSON.stringify(r.metaViolations)}`,
    );
    assert.ok(
      r.economyRecruited.length >= 1,
      `${label} earned-recruit survives repeated runs, got ${r.economyRecruited.length}`,
    );
    assert.ok(r.offspring >= 1, `${label} offspring rolled, got ${r.offspring}`);
  }
});

test('runFullLoop: aggregates per-run economy telemetry from the backend advance (fase-2b)', async () => {
  // Fake http with a controlled advance economy payload: a single victory chapter that
  // COMPLETES the campaign (campaign_completed -> hasNextChapter false -> the meta-step
  // is skipped), so the runner's economy aggregation is asserted EXACTLY against
  // backend-shaped xp_grants (sum `amount`) + mp_grants (sum `earned`). No invention.
  const http = {
    post: async (path) => {
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance')
        return {
          status: 200,
          body: {
            campaign_completed: true,
            xp_grants: [
              { unit_id: 'hero_a', amount: 12 },
              { unit_id: 'hero_b', amount: 12 },
            ],
            mp_grants: [{ unit_id: 'hero_a', earned: 3 }],
          },
        };
      return { status: 200, body: {} };
    },
    get: async (path) => {
      if (path === '/api/session/state')
        return {
          status: 200,
          body: {
            units: [{ id: 'hero_a', controlled_by: 'player', hp: 30 }],
            active_unit: 'hero_a',
          },
        };
      if (path === '/api/campaign/summary')
        return { status: 200, body: { current_encounter: { encounter_id: 'e1' } } };
      return { status: 200, body: {} };
    },
  };
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: [
      {
        id: 'hero_a',
        max_hp: 30,
        job: 'stalker',
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
    ],
    peEarned: 3,
    maxChapters: 3,
  });
  assert.equal(res.completed, true);
  assert.equal(res.initialRosterSize, 1, 'initial authored roster size captured');
  assert.ok(res.economy, 'economy telemetry present');
  assert.equal(res.economy.peEarnedTotal, 3, 'PE earned summed over cleared chapters (3 x 1)');
  assert.equal(
    res.economy.xpGrantedTotal,
    24,
    'XP granted summed from advance xp_grants (12 + 12)',
  );
  assert.equal(res.economy.mpEarnedTotal, 3, 'MP earned summed from advance mp_grants');
  assert.equal(res.economy.piSpentTotal, 0, 'no PI sink wired in the loop yet (surfaced gap)');
});

test('runFullLoop: drives the INJECTED opts.policy for the meta-step (fase-2c pluggable)', async () => {
  // A 2-chapter fake: chapter 1 victory (not completed) -> the Nido meta-step fires and MUST
  // use opts.policy (not the hardcoded greedy). Chapter 2 completes. A spy policy records its
  // calls; the spy's recruit id surfacing in res.recruited proves the runner used it.
  const calls = { recruits: 0, courtship: 0, mating: 0 };
  const spyPolicy = {
    chooseRecruits({ step }) {
      calls.recruits += 1;
      return [{ npcId: `spy_r${step}`, speciesId: 'dune-stalker' }];
    },
    chooseCourtship({ step, runId }) {
      calls.courtship += 1;
      return {
        npcId: `spy_c_${runId}_${step}`,
        speciesId: 'dune-stalker',
        affinityDelta: 1,
        trustDelta: 2,
      };
    },
    chooseMating({ step }) {
      calls.mating += 1;
      return null;
    },
  };
  let chapter = 0;
  const http = {
    post: async (path) => {
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance') {
        chapter += 1;
        return { status: 200, body: { campaign_completed: chapter >= 2 } };
      }
      if (path === '/api/meta/recruit')
        return { status: 200, body: { success: true, npc: { recruited: true } } };
      if (path === '/api/meta/trust') return { status: 200, body: { can_recruit: true } };
      return { status: 200, body: {} };
    },
    get: async (path) => {
      if (path === '/api/session/state')
        return {
          status: 200,
          body: {
            units: [{ id: 'hero_a', controlled_by: 'player', hp: 30 }],
            active_unit: 'hero_a',
          },
        };
      if (path === '/api/campaign/summary')
        return { status: 200, body: { current_encounter: { encounter_id: 'e1' } } };
      return { status: 200, body: {} };
    },
  };
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: [
      {
        id: 'hero_a',
        max_hp: 30,
        job: 'stalker',
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
    ],
    policy: spyPolicy,
    maxChapters: 3,
  });
  assert.equal(res.completed, true);
  assert.ok(calls.recruits >= 1, 'injected policy.chooseRecruits used');
  assert.ok(calls.courtship >= 1, 'injected policy.chooseCourtship used');
  assert.ok(
    res.recruited.includes('spy_r1'),
    `recruited via the injected policy, not greedy; got ${JSON.stringify(res.recruited)}`,
  );
  // Composition telemetry (fase-2c): the runner records the SPECIES of each combat-recruit
  // so the aggregator can measure roster role_class composition (P4 divergence).
  assert.ok(
    res.recruitedSpecies.includes('dune-stalker'),
    `recruited species recorded; got ${JSON.stringify(res.recruitedSpecies)}`,
  );
});

test('runFullLoop: a mbtiPolicy plays the real cave_path campaign end-to-end (fase-2c)', async (t) => {
  // The temperament-guided policy must satisfy the same runner contract as greedy: complete
  // the campaign, recruit via the Nido seam, prove the earned-affinity gate. This is what the
  // N=40 band-batch will run for each MBTI archetype to test P4 in the meta-loop.
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = {
    post: (p, body) =>
      request(app)
        .post(p)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
  const res = await runFullLoop(http, {
    playerId: 'fl_mbti_esfp',
    roster: [
      {
        id: 'hero_a',
        species: 'dune_stalker',
        job: 'stalker',
        hp: 30,
        max_hp: 30,
        ap: 3,
        mod: 20,
        attack_range: 2,
        initiative: 18,
        position: { x: 1, y: 1 },
        controlled_by: 'player',
        status: {},
      },
      {
        id: 'hero_b',
        species: 'velox',
        job: 'stalker',
        hp: 30,
        max_hp: 30,
        ap: 3,
        mod: 18,
        attack_range: 2,
        initiative: 16,
        position: { x: 1, y: 2 },
        controlled_by: 'player',
        status: {},
      },
    ],
    branchKey: 'cave_path',
    seed: 'fl2c-esfp',
    policy: makeMbtiPolicy('ESFP'),
    maxChapters: 15,
  });
  assert.equal(res.completed, true, `mbti campaign completed; chapters=${res.chapters.length}`);
  assert.deepEqual(
    res.violations,
    [],
    `no invariant violations: ${JSON.stringify(res.violations)}`,
  );
  assert.ok(
    res.recruited.length >= 5,
    `mbti policy recruited across chapters, got ${res.recruited.length}`,
  );
  assert.equal(res.economyAffinityProven, true, 'earned-affinity gate fired under the mbti policy');
});
