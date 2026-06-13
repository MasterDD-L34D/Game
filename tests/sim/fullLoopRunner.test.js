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
  // lineage_diversity: the runner records each offspring's parent-species CROSS so the
  // aggregator can measure breeding composition (the breeding P4 signal). greedy courts the
  // badlands pool in order -> the step-2 mating breeds dune-stalker x nano-rust-bloom.
  assert.ok(
    res.offspringLineages.length >= 1,
    `offspring lineages captured, got ${res.offspringLineages.length}`,
  );
  assert.ok(
    res.offspringLineages.every(
      (l) => Array.isArray(l.parentSpecies) && l.parentSpecies.length === 2,
    ),
    'each lineage record carries a 2-parent cross',
  );
  assert.ok(
    res.offspringLineages.some(
      (l) =>
        JSON.stringify(l.parentSpecies) === JSON.stringify(['dune-stalker', 'nano-rust-bloom']),
    ),
    `greedy breeds the in-order pool cross; got ${JSON.stringify(res.offspringLineages.map((l) => l.parentSpecies))}`,
  );
  // fase-2b/2c economy telemetry: the runner aggregates the backend's REAL advance economy
  // per run (PE earned per cleared chapter + backend-computed XP/MP grants). The PI SINK is
  // now WIRED (fase-2c): the runner attempts a hybrid perk pick for leveled survivors. In the
  // canonical sim it spends 0 -- not invented: the sim roster's job ('stalker') is not a
  // perk-job, so picks 409 (and the PE->PI 5:1 rate would 402 anyway). That is surfaced
  // honestly via piPickAttempts (the sink is exercised-as-attempted), not hidden.
  assert.equal(res.initialRosterSize, 2, 'initial authored roster size captured');
  assert.ok(res.economy, 'economy telemetry present');
  const clearedChapters = res.chapters.filter((c) => c.outcome === 'victory').length;
  assert.equal(
    res.economy.peEarnedTotal,
    3 * clearedChapters,
    `PE earned = peEarned(3) x cleared chapters(${clearedChapters})`,
  );
  assert.ok(res.economy.xpGrantedTotal > 0, 'XP granted accrued from real victories');
  assert.equal(res.economy.piSpentTotal, 0, 'canonical sim cannot spend PI (job lacks perks)');
  assert.ok(
    res.economy.piPickAttempts > 0,
    'PI sink wired: hybrid picks attempted for leveled survivors',
  );
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
  // lineage_diversity is POLICY-SENSITIVE: ESFP courts a different species order than greedy
  // (pool [nano-rust-bloom, sand-burrower, ...]), so its step-2 mating breeds a DIFFERENT cross
  // (nano-rust-bloom x sand-burrower) than greedy's (dune-stalker x nano-rust-bloom above) ->
  // P4 measurable in breeding in a REAL run, not only in the synthetic aggregator test.
  assert.ok(
    res.offspringLineages.some(
      (l) =>
        JSON.stringify(l.parentSpecies) === JSON.stringify(['nano-rust-bloom', 'sand-burrower']),
    ),
    `ESFP breeds its temperament-ordered cross; got ${JSON.stringify(res.offspringLineages.map((l) => l.parentSpecies))}`,
  );
});

test('runFullLoop: records offspring lineages from the Nido breeding step (lineage_diversity)', async () => {
  // ch1 + ch2 clear (the Nido economy step fires; mating starts at step 2) then ch3 completes.
  // The runner must COLLECT each offspring's parent-species cross into res.offspringLineages so
  // the aggregator can measure lineage_diversity. Deterministic fake (no enemies -> instant
  // victory); greedy courts dune-stalker (s1) then nano-rust-bloom (s2) -> the step-2 cross.
  let advances = 0;
  const http = {
    post: async (path) => {
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance') {
        advances += 1;
        return { status: 200, body: { campaign_completed: advances >= 3 } };
      }
      if (path === '/api/meta/recruit')
        return { status: 200, body: { success: true, npc: { recruited: true } } };
      if (path === '/api/meta/trust') return { status: 200, body: { can_recruit: true } };
      if (path === '/api/meta/mating/roll')
        return { status: 200, body: { success: true, offspring: { lineage_id: 'lx', tier: 'B' } } };
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
        job: 'skirmisher',
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
    ],
    maxChapters: 5,
  });
  assert.equal(res.completed, true);
  assert.ok(Array.isArray(res.offspringLineages), 'offspringLineages collected on the run-result');
  assert.equal(
    res.offspringLineages.length,
    res.offspring,
    'one lineage record per counted offspring (no double-count, no drop)',
  );
  assert.ok(res.offspringLineages.length >= 1, 'a step-2 breeding cross was captured');
  assert.deepEqual(
    res.offspringLineages[0].parentSpecies,
    ['dune-stalker', 'nano-rust-bloom'],
    'greedy step-2 cross (parentA = s1 courtship, parentB = s2 courtship)',
  );
  assert.equal(
    res.offspringLineages[0].lineageId,
    'lx',
    'canonical lineage_id carried for provenance',
  );
});

// Shared fake http for the PI-sink tests: one victory chapter that COMPLETES the campaign
// (skips the meta-step), a survivor at level 2 (xp_grants.level_after), and a /pick response
// the test controls. `peEarned` drives the PE-derived PI budget (SoT 5:1).
function piSinkHttp({ pickStatus, pickBody }) {
  return {
    post: async (path) => {
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance') {
        return {
          status: 200,
          body: {
            campaign_completed: true,
            xp_grants: [{ unit_id: 'hero_a', amount: 30, level_after: 2, leveled_up: true }],
          },
        };
      }
      if (path.startsWith('/api/progression/') && path.endsWith('/pick')) {
        return { status: pickStatus, body: pickBody };
      }
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
}

const PI_ROSTER = [
  { id: 'hero_a', max_hp: 30, job: 'stalker', position: { x: 1, y: 1 }, controlled_by: 'player' },
];

test('runFullLoop: PI sink spends on an affordable hybrid perk pick (fase-2c)', async () => {
  // peEarned 30 -> after one victory peEarnedTotal 30 -> PI budget floor(30/5)=6 >= cost 5.
  // The level-2 survivor's hybrid pick succeeds -> economy.piSpentTotal reflects the SINK.
  const http = piSinkHttp({ pickStatus: 200, pickBody: { ok: true, pi_cost: 5 } });
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: PI_ROSTER,
    peEarned: 30,
    maxChapters: 3,
  });
  assert.equal(res.economy.piSpentTotal, 5, 'PI actually spent on the hybrid pick');
  assert.equal(res.economy.piPickAttempts, 1, 'one pick attempted');
  assert.equal(res.economy.piInsufficient, 0);
});

test('runFullLoop: PI sink records insufficient PI when the economy cannot afford it (fase-2c)', async () => {
  // peEarned 3 (canonical) -> PI budget floor(3/5)=0 < cost 5 -> /pick 402 insufficient_pi.
  // The sink is WIRED + attempted; the tight economy is surfaced honestly (not hidden).
  const http = piSinkHttp({ pickStatus: 402, pickBody: { ok: false, error: 'insufficient_pi' } });
  const res = await runFullLoop(http, {
    playerId: 'p',
    roster: PI_ROSTER,
    peEarned: 3,
    maxChapters: 3,
  });
  assert.equal(res.economy.piSpentTotal, 0, 'nothing spent when unaffordable');
  assert.equal(res.economy.piPickAttempts, 1, 'pick still attempted (sink wired)');
  assert.equal(res.economy.piInsufficient, 1, 'insufficiency surfaced');
});

test('runFullLoop: a skirmisher (perk-job) roster spends PI on the REAL progression engine (slice b)', async (t) => {
  // The two PI-sink tests above STUB /pick. This one runs the REAL backend: it proves the
  // engine accepts a perk-job pick + spends. The canonical sim roster's prior job ('stalker')
  // is not a perk-job -> /api/progression/:id/pick 409s before the PI gate -> piSpentTotal
  // stuck at 0 (see the stalker e2e above, line ~130). A real perk-job (skirmisher, present in
  // BOTH perks.yaml and jobs.yaml) reaches engine.pickPerk; with an affording PE (5:1, hybrid
  // cost 5 PI) the sink actually spends. This is the slice-b guard against a regression back to
  // a non-perk job.
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);
  const skirmisherRoster = starterRoster().map((u) => ({ ...u, job: 'skirmisher' }));
  const res = await runFullLoop(http, {
    playerId: 'fl_pi_skirmisher',
    roster: skirmisherRoster,
    branchKey: 'cave_path',
    seed: 'fl-pi-skirm',
    peEarned: 30, // floor(30/5)=6 >= the 5-PI hybrid cost after the first victory
    maxChapters: 15,
  });
  assert.ok(
    res.economy.piSpentTotal >= 5,
    `skirmisher reaches the real pickPerk -> at least one 5-PI hybrid pick spent; economy=${JSON.stringify(res.economy)}`,
  );
  assert.ok(res.economy.piPickAttempts > 0, 'hybrid picks attempted for leveled survivors');
  // piInsufficient may be >0 transiently (two starters reach level 2 the same chapter; the
  // PE->PI budget affords one, the other picks once PE refills next chapter) -- the point is
  // the sink SPENDS, not that every attempt lands the same turn.
});

test('runFullLoop: an unclearable mission (timeout) ENDS the run -- one attempt, no infinite retry (slice a)', async () => {
  // Calibrated scaled-enemy difficulty makes a mission unwinnable in 40 rounds -> timeout.
  // The OLD runner re-fought the same chapter every step (up to maxChapters), so a timeout
  // never failed the campaign -> completion_rate degenerately 1.0. The capped runner ends the
  // campaign after a non-victory mission, so the scaled difficulty sets P(clear the gating
  // missions) and completion_rate becomes a meaningful, tunable band metric.
  let advances = 0;
  const http = {
    post: async (path) => {
      if (path === '/api/campaign/start') return { status: 201, body: { campaign: { id: 'c' } } };
      if (path === '/api/session/start') return { status: 200, body: { session_id: 's' } };
      if (path === '/api/campaign/advance') {
        advances += 1;
        return { status: 200, body: {} }; // paused (non-victory) -> would retry under the old loop
      }
      return { status: 200, body: {} };
    },
    get: async (path) => {
      if (path === '/api/session/state') {
        // A foe that never dies -> runEncounter never reaches victory -> timeout at maxRounds.
        return {
          status: 200,
          body: {
            units: [
              { id: 'hero_a', controlled_by: 'player', hp: 30, position: { x: 1, y: 1 } },
              { id: 'foe', controlled_by: 'sistema', hp: 99, position: { x: 4, y: 4 } },
            ],
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
        job: 'skirmisher',
        position: { x: 1, y: 1 },
        controlled_by: 'player',
      },
    ],
    maxChapters: 15,
  });
  assert.equal(res.completed, false, 'an unclearable mission fails the campaign');
  assert.equal(
    res.chapters.length,
    1,
    'exactly ONE mission attempt -- no 15x retry of the same chapter',
  );
  assert.equal(res.chapters[0].outcome, 'timeout');
  assert.equal(advances, 1, 'advance called once (the run ended, it did not retry)');
});
