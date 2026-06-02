'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runFullLoop } = require('../../tools/sim/full-loop-runner');

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
