// tests/api/traitResistanceWiring.test.js
//
// P2 wiring fix 2026-06-10 — trait resistances devono arrivare al runtime.
//
// performAttack (apps/backend/routes/session.js ~796) risolve le resistances
// del bersaglio leggendo `traitRegistry[tid].resistances` dal registry di
// active_effects.yaml (loadActiveTraitRegistry) e le passa a
// computeUnitResistances -> applyResistance. Una resistance dichiarata solo
// in trait_mechanics.yaml NON esiste a runtime (no-op silenzioso) anche se la
// description del trait promette il resist.
//
// Repro end-to-end: due sessioni con lo stesso seed (stessa RNG stream, il
// resist non consuma draw), stesso attacco player sul canale `ionico`,
// vittima identica salvo il trait `pelage_idrorepellente_avanzato`
// (ionico +25% in trait_mechanics). ai_auto=false e vittima senza
// resistance_archetype: l'unica differenza di danno possibile e' il resist
// del trait. Pre-fix il danno era identico nelle due sessioni.
//
// mod 20 vs dc 2 = hit garantito (pattern onHitStatusRoundPersist.test.js).

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

const SEED = 31337;
const ROUNDS = 3;

function units(victimTraits) {
  return [
    {
      id: 'atk',
      controlled_by: 'player',
      species: 'chimera_probe_b',
      job: 'ranger',
      traits: [],
      hp: 60,
      max_hp: 60,
      mod: 20,
      dc: 18,
      ap: 3,
      attack_range: 2,
      initiative: 99,
      position: { x: 1, y: 1 },
    },
    {
      id: 'vic',
      controlled_by: 'sistema',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: victimTraits,
      hp: 80,
      max_hp: 80,
      mod: 0,
      dc: 2,
      ap: 2,
      attack_range: 1,
      initiative: 1,
      position: { x: 1, y: 2 },
      status: {},
    },
  ];
}

async function totalIonicDamage(app, victimTraits) {
  const start = await request(app)
    .post('/api/session/start')
    .send({ units: units(victimTraits), seed: SEED, modulation: 'full' });
  assert.equal(start.status, 200, `start ok: ${JSON.stringify(start.body).slice(0, 200)}`);
  const sid = start.body.session_id;

  let total = 0;
  for (let round = 1; round <= ROUNDS; round += 1) {
    const res = await request(app)
      .post('/api/session/round/execute')
      .send({
        session_id: sid,
        player_intents: [
          { actor_id: 'atk', action: { type: 'attack', target_id: 'vic', channel: 'ionico' } },
        ],
        ai_auto: false,
        priority_queue: true,
      });
    assert.equal(res.status, 200, `round exec ok: ${JSON.stringify(res.body).slice(0, 200)}`);
    for (const r of res.body.results || []) {
      if (r.actor_id !== 'atk' || r.action_type !== 'attack') continue;
      const dmg = Number((r.result || {}).damage_dealt);
      if (Number.isFinite(dmg)) total += dmg;
    }
  }
  return total;
}

test('trait resistance (ionico 25%) riduce il danno in una sessione reale', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const baseline = await totalIonicDamage(app, []);
  const resisted = await totalIonicDamage(app, ['pelage_idrorepellente_avanzato']);

  assert.ok(baseline >= 2, `baseline deve infliggere danno ionico misurabile (totale ${baseline})`);
  assert.ok(
    resisted < baseline,
    `pelage_idrorepellente_avanzato (ionico +25% in trait_mechanics) deve ridurre il danno: ` +
      `baseline=${baseline} resisted=${resisted} — se uguali la resistance non arriva a ` +
      `computeUnitResistances (campo mancante in active_effects.yaml)`,
  );
});
