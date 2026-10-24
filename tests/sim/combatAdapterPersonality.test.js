// Opt 3 N=40 evidence (#2679) -- combat-adapter personality capture: after the
// round loop the adapter reads the NON-destructive GET /:id/vc debrief_payload
// and returns per-unit personality_axes (faction-tagged). Best-effort: a failed
// /vc never blocks the encounter result.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runEncounter } = require('../../tools/sim/combat-adapter');

const AXES = {
  symbiosis_predation: 0.8,
  explore_caution: 0.6,
  solitary_swarm: 0.7,
  memory_instinct: 0.55,
  agile_robust: 0.5,
};

// Minimal fake backend: session starts, one state poll shows all foes dead ->
// victory on round 1; /vc returns a debrief_payload with personality_axes.
function makeFakeHttp({ vcStatus = 200, vcBody } = {}) {
  const calls = [];
  return {
    calls,
    post: async (p, body) => {
      calls.push({ method: 'post', p, body });
      if (p === '/api/session/start') return { status: 200, body: { session_id: 's1' } };
      return { status: 200, body: {} };
    },
    get: async (p, query) => {
      calls.push({ method: 'get', p, query });
      if (p === '/api/session/state') {
        return {
          status: 200,
          body: {
            units: [
              { id: 'hero_a', controlled_by: 'player', hp: 10 },
              { id: 'foe_1', controlled_by: 'sistema', hp: 0 },
            ],
            active_unit: 'hero_a',
          },
        };
      }
      if (p === '/api/session/s1/vc') {
        return {
          status: vcStatus,
          body:
            vcBody !== undefined
              ? vcBody
              : {
                  per_actor: {},
                  debrief_payload: {
                    per_actor: {
                      hero_a: { sentience_tier: 'T2', personality_axes: AXES },
                      foe_1: { sentience_tier: 'T1', personality_axes: AXES },
                      ghost: { sentience_tier: 'T1' }, // no axes -> excluded
                    },
                  },
                },
        };
      }
      return { status: 404, body: {} };
    },
  };
}

test('captures per-unit personality_axes from /:id/vc, faction-tagged', async () => {
  const http = makeFakeHttp();
  const res = await runEncounter(http, {
    roster: [{ id: 'hero_a', controlled_by: 'player', hp: 10 }],
    enemies: [{ id: 'foe_1', controlled_by: 'sistema', hp: 4 }],
    scenarioId: 'enc_x',
  });
  assert.equal(res.outcome, 'victory');
  assert.ok(Array.isArray(res.personalityUnits));
  const hero = res.personalityUnits.find((u) => u.unit_id === 'hero_a');
  const foe = res.personalityUnits.find((u) => u.unit_id === 'foe_1');
  assert.ok(hero && foe, 'both factions captured');
  assert.equal(hero.faction, 'player');
  assert.equal(foe.faction, 'sistema');
  assert.deepEqual(hero.axes, AXES);
  assert.equal(
    res.personalityUnits.find((u) => u.unit_id === 'ghost'),
    undefined,
    'units without personality_axes are excluded',
  );
});

test('captures per-unit mbti_axes alongside personality_axes (fp-delta probe input)', async () => {
  const MBTI = {
    E_I: { value: 0.62, coverage: 0.8 },
    S_N: { value: 0.48, coverage: 0.7 },
  };
  const http = makeFakeHttp({
    vcBody: {
      // mbti_axes lives on the RAW snapshot per_actor (GET /:id/vc returns the
      // full buildVcSnapshot), NOT inside the pinned debrief_payload schema.
      per_actor: {
        hero_a: { mbti_axes: MBTI },
      },
      debrief_payload: {
        per_actor: {
          hero_a: { sentience_tier: 'T2', personality_axes: AXES },
          foe_1: { sentience_tier: 'T1', personality_axes: AXES }, // no mbti -> null
        },
      },
    },
  });
  const res = await runEncounter(http, {
    roster: [{ id: 'hero_a', controlled_by: 'player', hp: 10 }],
    enemies: [{ id: 'foe_1', controlled_by: 'sistema', hp: 4 }],
    scenarioId: 'enc_x',
  });
  const hero = res.personalityUnits.find((u) => u.unit_id === 'hero_a');
  const foe = res.personalityUnits.find((u) => u.unit_id === 'foe_1');
  assert.deepEqual(hero.mbti_axes, MBTI);
  assert.equal(foe.mbti_axes, null);
});

test('failed /vc -> personalityUnits [] (never blocks the outcome)', async () => {
  const http = makeFakeHttp({ vcStatus: 500, vcBody: {} });
  const res = await runEncounter(http, {
    roster: [{ id: 'hero_a', controlled_by: 'player', hp: 10 }],
    enemies: [{ id: 'foe_1', controlled_by: 'sistema', hp: 4 }],
  });
  assert.equal(res.outcome, 'victory');
  assert.deepEqual(res.personalityUnits, []);
});
