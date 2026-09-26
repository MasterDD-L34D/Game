// tests/api/jobPerkCategoryBKillWire.test.js
//
// TKT-JOB-PHASEC Category B — END-TO-END kill-hook coverage (Codex P1 on #2474).
//
// The reachability test proves engine -> attach -> applyPerkKillEffects, but does
// NOT prove the kill hook in performAttack actually CALLS applyPerkKillEffects in
// the /round/execute flow. A regression that drops the kill-hook call would pass
// CI. These tests close that hole: they seed the module-default progression store
// (the singleton the /start route reads), drive a REAL kill through
// /api/session/round/execute (priority_queue: the same path the calibration
// harness uses), and assert the killer received its on-kill buff.
//
// performAttack stays a private closure; this drives it through the HTTP seam.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const {
  getDefaultStore,
  resetDefaults,
} = require('../../apps/backend/services/progression/progressionApply');
const { ProgressionEngine } = require('../../apps/backend/services/progression/progressionEngine');

const CAMPAIGN = 'phasec-b-killwire';

// Seed the module-default store (the one applyProgressionToUnits reads at /start
// when no store is injected — i.e. the production session route) with a stalker
// carrying a single on-kill perk picked from the real jobs_expansion.yaml.
function seedKiller(unitId, level, choice) {
  const engine = new ProgressionEngine();
  const seeded = engine.seed(unitId, 'stalker', { xpTotal: 1_000_000 });
  const picked = engine.pickPerk(seeded, level, choice);
  getDefaultStore().set(CAMPAIGN, unitId, picked.unit);
}

// Killer adjacent to a 1-HP enemy, high mod so the attack always hits and kills.
function units(killerId) {
  return [
    {
      id: killerId,
      species: 'dune_stalker',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 20, // guarantees the hit (d20 + 20 vs dc ~10)
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'foe',
      species: 'velox',
      hp: 1, // dies to a single hit -> killOccurred fires
      max_hp: 1,
      ap: 1,
      mod: 0,
      attack_range: 1,
      initiative: 1,
      position: { x: 1, y: 2 }, // Manhattan 1 from killer
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

async function startWithKiller(app, killerId) {
  const res = await request(app)
    .post('/api/session/start')
    .send({ units: units(killerId), campaign_id: CAMPAIGN });
  assert.equal(res.status, 200, `start ok: ${JSON.stringify(res.body).slice(0, 200)}`);
  return res.body.session_id;
}

async function killViaRound(app, sid, killerId) {
  const res = await request(app)
    .post('/api/session/round/execute')
    .send({
      session_id: sid,
      player_intents: [{ actor_id: killerId, action: { type: 'attack', target_id: 'foe' } }],
      ai_auto: false,
      priority_queue: true,
    });
  assert.equal(res.status, 200, `execute ok: ${JSON.stringify(res.body).slice(0, 200)}`);
}

async function unitFromState(app, sid, unitId) {
  const res = await request(app).get('/api/session/state').query({ session_id: sid });
  assert.equal(res.status, 200);
  return (res.body.units || []).find((u) => u.id === unitId);
}

test('Category B kill-wire: eternal_kill_buff bumps killer base mod on a real /round/execute kill', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  resetDefaults();
  seedKiller('k1', 7, 'b'); // st_r6_eternal_hunt -> eternal_kill_buff (+2 perm)

  const sid = await startWithKiller(app, 'k1');
  const before = await unitFromState(app, sid, 'k1');
  assert.ok(before, 'killer present after start');
  const modBefore = Number(before.mod);

  await killViaRound(app, sid, 'k1');

  const foe = await unitFromState(app, sid, 'foe');
  assert.ok(
    !foe || Number(foe.hp) === 0,
    `enemy died (kill hook precondition); foe=${JSON.stringify(foe)}`,
  );

  const after = await unitFromState(app, sid, 'k1');
  assert.equal(
    Number(after.mod) - modBefore,
    2,
    `eternal_kill_buff applied through the kill hook (mod ${modBefore} -> ${after.mod})`,
  );
});

test('Category B kill-wire: kill_buff_attack arms killer attack_mod_bonus on a real kill', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  resetDefaults();
  seedKiller('k2', 6, 'b'); // st_r5_killer_focus -> kill_buff_attack (+2 temp)

  const sid = await startWithKiller(app, 'k2');
  const before = await unitFromState(app, sid, 'k2');
  assert.equal(Number(before.attack_mod_bonus) || 0, 0, 'no attack buff before the kill');

  await killViaRound(app, sid, 'k2');

  const foe = await unitFromState(app, sid, 'foe');
  assert.ok(!foe || Number(foe.hp) === 0, 'enemy died (kill hook precondition)');

  const after = await unitFromState(app, sid, 'k2');
  assert.ok(
    Number(after.attack_mod_bonus) >= 1,
    `kill_buff_attack applied through the kill hook (attack_mod_bonus=${after.attack_mod_bonus})`,
  );
});

test('Category B kill-wire: a killer with no kill perk is unchanged after a kill (control)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  resetDefaults(); // no seed -> no _perk_passives

  const sid = await startWithKiller(app, 'k3');
  const before = await unitFromState(app, sid, 'k3');
  const modBefore = Number(before.mod);

  await killViaRound(app, sid, 'k3');

  const foe = await unitFromState(app, sid, 'foe');
  assert.ok(!foe || Number(foe.hp) === 0, 'enemy died');

  const after = await unitFromState(app, sid, 'k3');
  assert.equal(Number(after.mod), modBefore, 'base mod unchanged without a kill perk');
  assert.equal(Number(after.attack_mod_bonus) || 0, 0, 'no attack buff without a kill perk');
});
