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
});
