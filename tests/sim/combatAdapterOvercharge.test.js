// OD-058 D1 N=40 (issue #2531) -- combat-adapter overcharge opt-in.
// The action-economy probe needs the sim to actually EXERCISE the overcharge verb
// (anti-pattern #14: existing scenarios never call POST /api/session/overcharge).
// Opt-in `overcharge: 'greedy'`: before picking the active player unit's action,
// spend a full SG gauge (sg >= 3, not already overcharged this turn) via
// POST /api/session/overcharge. Default (no opt) stays byte-identical: no
// overcharge call, no initial_sg in the start body.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runEncounter } = require('../../tools/sim/combat-adapter');

// Fake http: one player unit (configurable sg/status) vs one live foe. The foe dies
// after `foeRounds` state fetches so the loop terminates with a victory.
function makeFakeHttp({ sg = 0, status = {}, foeRounds = 2 } = {}) {
  const calls = [];
  let stateFetches = 0;
  return {
    calls,
    post: async (p, body) => {
      calls.push({ method: 'post', p, body });
      if (p === '/api/session/start') return { status: 200, body: { session_id: 's1' } };
      if (p === '/api/session/overcharge') return { status: 200, body: { ok: true } };
      return { status: 200, body: {} };
    },
    get: async (p) => {
      calls.push({ method: 'get', p });
      if (p === '/api/session/state') {
        stateFetches += 1;
        const foeHp = stateFetches > foeRounds ? 0 : 4;
        return {
          status: 200,
          body: {
            turn: stateFetches,
            units: [
              {
                id: 'hero_a',
                controlled_by: 'player',
                hp: 10,
                ap_remaining: 2,
                sg,
                status,
                position: { x: 0, y: 0 },
                attack_range: 1,
              },
              {
                id: 'foe_1',
                controlled_by: 'sistema',
                hp: foeHp,
                position: { x: 0, y: 1 },
              },
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

test('default (no opt): NO /overcharge call + NO initial_sg even with sg >= 3', async () => {
  const http = makeFakeHttp({ sg: 3 });
  const res = await runEncounter(http, { roster: ROSTER, enemies: ENEMIES });
  assert.equal(
    http.calls.find((c) => c.p === '/api/session/overcharge'),
    undefined,
  );
  const start = http.calls.find((c) => c.p === '/api/session/start');
  assert.equal('initial_sg' in start.body, false);
  // Counters present (additive shape) but zero.
  assert.equal(res.overchargeUses, 0);
});

test('overcharge greedy: sg >= 3 -> POST /overcharge {session_id, actor_id} before the action', async () => {
  const http = makeFakeHttp({ sg: 3 });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    overcharge: 'greedy',
  });
  const oc = http.calls.find((c) => c.p === '/api/session/overcharge');
  assert.ok(oc, 'expected POST /api/session/overcharge');
  assert.equal(oc.body.session_id, 's1');
  assert.equal(oc.body.actor_id, 'hero_a');
  // Ordering: the overcharge happens before that unit's /action in the same tick.
  const ocIdx = http.calls.indexOf(oc);
  const actIdx = http.calls.findIndex((c) => c.p === '/api/session/action');
  assert.ok(ocIdx < actIdx, 'overcharge must precede the action');
  assert.ok(res.overchargeUses >= 1);
});

test('overcharge greedy: sg < 3 -> no /overcharge call', async () => {
  const http = makeFakeHttp({ sg: 2 });
  const res = await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    overcharge: 'greedy',
  });
  assert.equal(
    http.calls.find((c) => c.p === '/api/session/overcharge'),
    undefined,
  );
  assert.equal(res.overchargeUses, 0);
});

test('overcharge greedy: already overcharged this turn -> no call (no 409 spam)', async () => {
  const http = makeFakeHttp({ sg: 3, status: { overcharged: 1 } });
  await runEncounter(http, { roster: ROSTER, enemies: ENEMIES, overcharge: 'greedy' });
  assert.equal(
    http.calls.find((c) => c.p === '/api/session/overcharge'),
    undefined,
  );
});

test('initialSg opt -> threaded into /api/session/start body as initial_sg', async () => {
  const http = makeFakeHttp({ sg: 0 });
  await runEncounter(http, {
    roster: ROSTER,
    enemies: ENEMIES,
    initialSg: { hero_a: 3 },
  });
  const start = http.calls.find((c) => c.p === '/api/session/start');
  assert.deepEqual(start.body.initial_sg, { hero_a: 3 });
});

test('playerAttacks counter: counts 2xx attack actions', async () => {
  const http = makeFakeHttp({ sg: 0, foeRounds: 3 });
  const res = await runEncounter(http, { roster: ROSTER, enemies: ENEMIES });
  // foe alive for 3 state fetches at range 1 -> 3 attack actions before victory.
  assert.equal(res.playerAttacks, 3);
});
