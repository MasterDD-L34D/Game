// A13 N=40 evidence (SPEC-I gate) -- combat-adapter campaign/biome/end wiring:
// campaign_id + biome_id threaded into /api/session/start (read-side woundedStep
// resolves at start), biome_wounded telegraph captured from /session/state, and
// an opt-in POST /api/session/end fires the A13 write-side (wound/heal persist).
// All additive: with no a13 opts the adapter behaves byte-identically.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runEncounter } = require('../../tools/sim/combat-adapter');

function makeFakeHttp({ endStatus = 200, biomeWounded = false } = {}) {
  const calls = [];
  return {
    calls,
    post: async (p, body) => {
      calls.push({ method: 'post', p, body });
      if (p === '/api/session/start') return { status: 200, body: { session_id: 's1' } };
      if (p === '/api/session/end') return { status: endStatus, body: { outcome: 'victory' } };
      return { status: 200, body: {} };
    },
    get: async (p, query) => {
      calls.push({ method: 'get', p, query });
      if (p === '/api/session/state') {
        return {
          status: 200,
          body: {
            biome_wounded: biomeWounded,
            units: [
              { id: 'hero_a', controlled_by: 'player', hp: 10 },
              { id: 'foe_1', controlled_by: 'sistema', hp: 0 },
            ],
            active_unit: 'hero_a',
          },
        };
      }
      return { status: 404, body: {} };
    },
  };
}

const ROSTER = [{ id: 'hero_a', controlled_by: 'player', hp: 10 }];
const ENEMIES = [{ id: 'foe_1', controlled_by: 'sistema', hp: 4 }];

test('campaignId + biomeId threaded into /api/session/start body', async () => {
  const http = makeFakeHttp();
  await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    scenarioId: 'enc_x',
    campaignId: 'camp_1',
    biomeId: 'savana',
  });
  const start = http.calls.find((c) => c.p === '/api/session/start');
  assert.equal(start.body.campaign_id, 'camp_1');
  assert.equal(start.body.biome_id, 'savana');
});

test('no a13 opts -> start body has NO campaign_id/biome_id, no /end call (status quo)', async () => {
  const http = makeFakeHttp();
  const res = await runEncounter(http, { roster: ROSTER, enemies: ENEMIES });
  const start = http.calls.find((c) => c.p === '/api/session/start');
  assert.equal('campaign_id' in start.body, false);
  assert.equal('biome_id' in start.body, false);
  assert.equal(
    http.calls.find((c) => c.p === '/api/session/end'),
    undefined,
  );
  assert.equal(res.outcome, 'victory');
  assert.equal(res.biomeWounded, false);
  assert.equal(res.ended, false);
});

test('biome_wounded telegraph captured from /session/state', async () => {
  const http = makeFakeHttp({ biomeWounded: true });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    campaignId: 'camp_1',
    biomeId: 'savana',
  });
  assert.equal(res.biomeWounded, true);
});

test('endSession -> POST /api/session/end fires with session_id (write-side trigger)', async () => {
  const http = makeFakeHttp();
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    campaignId: 'camp_1',
    biomeId: 'savana',
    endSession: true,
  });
  const end = http.calls.find((c) => c.p === '/api/session/end');
  assert.ok(end, '/end called');
  assert.equal(end.body.session_id, 's1');
  assert.equal(res.ended, true);
});

test('failed /end -> best-effort: outcome intact, ended:false', async () => {
  const http = makeFakeHttp({ endStatus: 500 });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    campaignId: 'camp_1',
    endSession: true,
  });
  assert.equal(res.outcome, 'victory');
  assert.equal(res.ended, false);
});
