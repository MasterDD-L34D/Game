// =============================================================================
// M14-A 2026-04-25 — TERRAIN REACTIONS WIRE
//
// Verifica che il wire post-damage di terrainReactions emetta tile state
// transitions, persista session.tile_state_map cross-round, decay ttl al
// turn_end, attacchi terrain_reaction al log evento, e degrada gracefully
// quando channel mancante o position invalida.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { withRoundFlag, startSession, twoUnits, getState } = require('./sessionTestHelpers');

async function startWithUnits(app, units) {
  const res = await request(app).post('/api/session/start').send({ units }).expect(200);
  return res.body.session_id;
}

test('terrain wire: session.tile_state_map initialized empty on /start', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startSession(app);
  const state = await getState(app, sid);
  assert.ok(state.tile_state_map, 'tile_state_map exposed in state');
  assert.equal(typeof state.tile_state_map, 'object');
  assert.deepEqual(state.tile_state_map, {}, 'starts empty');
});

test('terrain wire: fire channel attack on normal tile → tile becomes fire', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startWithUnits(app, twoUnits({ sisHp: 100, p1Mod: 99 }));

  // Force-reattempt fino a hit (rng reale): turn loop garantisce AP refresh.
  // 2026-05-10 flaky-fix consistency con line 132 (12 → 30 iters per RNG safety
  // margin). 12 iters expected ~8 hits ma RNG variance produced ~5% test fail
  // rate. 30 iters = effectively 100% probability.
  let hit = false;
  let stateMap = {};
  for (let i = 0; i < 30 && !hit; i++) {
    const r = await request(app).post('/api/session/action').send({
      session_id: sid,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
      channel: 'fuoco',
    });
    if (r.status === 200 && r.body.result === 'hit') {
      hit = true;
      assert.ok(r.body.terrain_reaction, 'terrain_reaction surfaced in response');
      assert.equal(r.body.terrain_reaction.element, 'fire');
      assert.equal(r.body.terrain_reaction.new_state, 'fire');
      assert.equal(r.body.terrain_reaction.prev_state, 'normal');
      assert.ok(r.body.terrain_reaction.effects.includes('ignite'));
      stateMap = r.body.state.tile_state_map;
    }
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  assert.ok(hit, 'eventually hits within 12 attempts (rng safety margin)');
  // Tile su (3,2) dove sta sis: deve essere fire.
  const key = '3,2';
  assert.ok(stateMap[key], `tile ${key} present in state map`);
  assert.equal(stateMap[key].type, 'fire');
  assert.ok(stateMap[key].ttl >= 1);
});

test('terrain wire: missing channel → no terrain_reaction', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startWithUnits(app, twoUnits({ sisHp: 100, p1Mod: 99 }));

  // Attack senza `channel` → fisico → no reaction.
  const r = await request(app).post('/api/session/action').send({
    session_id: sid,
    actor_id: 'p1',
    action_type: 'attack',
    target_id: 'sis',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.terrain_reaction, null, 'null terrain_reaction on physical attack');
  // tile_state_map empty
  assert.deepEqual(r.body.state.tile_state_map, {});
});

test('terrain wire: unknown channel → no terrain_reaction', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startWithUnits(app, twoUnits({ sisHp: 100, p1Mod: 99 }));

  // Channel "perforante" non mappato → no reaction.
  const r = await request(app).post('/api/session/action').send({
    session_id: sid,
    actor_id: 'p1',
    action_type: 'attack',
    target_id: 'sis',
    channel: 'perforante',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.terrain_reaction, null);
});

test('terrain wire: tile state ttl decays at turn end', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startWithUnits(app, twoUnits({ sisHp: 100, p1Mod: 99 }));

  // Forza un fire tile. 2026-05-10 flaky-fix (TKT-TERRAIN-FLAKY):
  // bumped 12 → 30 iters per attack hit rate ~70% (d20 vs DC). 12 iters
  // expected ~8 hits ma RNG variance produced ~5% test fail rate. 30 iters
  // expected ~21 hits = effectively 100% probability.
  let foundFire = false;
  for (let i = 0; i < 30 && !foundFire; i++) {
    const r = await request(app).post('/api/session/action').send({
      session_id: sid,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
      channel: 'fuoco',
    });
    if (r.status === 200 && r.body.terrain_reaction?.new_state === 'fire') {
      foundFire = true;
    }
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  assert.ok(foundFire, 'fire tile created');
  let state = await getState(app, sid);
  const key = '3,2';
  const ttlInitial = state.tile_state_map[key]?.ttl;
  assert.ok(ttlInitial >= 1, `ttl initial ${ttlInitial}`);

  // 2-3 turn end cycles, ttl decrement → eventual delete.
  for (let i = 0; i < 4; i++) {
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  state = await getState(app, sid);
  // After enough decay turns, tile should be gone (decayed to normal).
  assert.ok(!state.tile_state_map[key], `tile ${key} decayed away`);
});

test('terrain wire: lightning + water → electrified + burst damage', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startWithUnits(app, twoUnits({ sisHp: 100, p1Mod: 99 }));

  // 2026-05-30 flaky-fix (supersedes the 2026-05-10 30-iter loop): the prior
  // version created the water tile, then ran a 30-iter loop calling turn/end
  // before each folgore strike. With turn/end between water-creation and the
  // lightning strike, the sistema-controlled SIS could move off the water tile
  // (3,2) -> folgore hit a normal tile -> no_reaction; the chase loop then chipped
  // the 100hp SIS to 0 -> the "graceful fallback" attack 400'd ("target gia'
  // abbattuto") -> assert(200) failed ~67% of runs. Root cause was AI movement +
  // HP attrition, NOT burst RNG: terrainReactions is pure with burst_damage
  // const 2. Tile decay across turns is covered by the ttl-decay test above; the
  // wire here only needs ONE clean water->lightning hit. Strike both channels in
  // the SAME p1 turn (p1 has 2 AP, p1Mod 99 = always hit, no turn/end) so the SIS
  // cannot move off the tile and two hits cannot down it -> fully deterministic.

  // AP 2 -> 1: acqua attack puddles the SIS tile (3,2).
  const water = await request(app).post('/api/session/action').send({
    session_id: sid,
    actor_id: 'p1',
    action_type: 'attack',
    target_id: 'sis',
    channel: 'acqua',
  });
  assert.equal(water.status, 200, 'acqua attack resolves');
  assert.equal(
    water.body.terrain_reaction?.new_state,
    'water',
    'water tile created via acqua channel',
  );

  // AP 1 -> 0: folgore on the same tile, same turn -> lightning + water = electrified.
  const strike = await request(app).post('/api/session/action').send({
    session_id: sid,
    actor_id: 'p1',
    action_type: 'attack',
    target_id: 'sis',
    channel: 'folgore',
  });
  assert.equal(strike.status, 200, 'folgore attack resolves');
  assert.equal(
    strike.body.terrain_reaction?.new_state,
    'electrified',
    'water tile becomes electrified',
  );
  assert.ok(strike.body.terrain_reaction.effects.includes('electrify'));
  assert.equal(strike.body.terrain_reaction.burst_damage, 2);
});

test('terrain wire: terrain_reaction field surfaced in attack event log', async (t) => {
  const restore = withRoundFlag('true');
  t.after(restore);
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const sid = await startWithUnits(app, twoUnits({ sisHp: 100, p1Mod: 99 }));

  // 2026-05-10 flaky-fix 12 → 30 iters per RNG safety margin (consistency line 132).
  let hit = false;
  for (let i = 0; i < 30 && !hit; i++) {
    const r = await request(app).post('/api/session/action').send({
      session_id: sid,
      actor_id: 'p1',
      action_type: 'attack',
      target_id: 'sis',
      channel: 'ghiaccio',
    });
    if (r.status === 200 && r.body.result === 'hit') {
      hit = true;
    }
    await request(app).post('/api/session/turn/end').send({ session_id: sid });
  }
  assert.ok(hit, 'eventually hits');

  const state = await getState(app, sid);
  const events = state.events || [];
  const attackEvent = [...events]
    .reverse()
    .find((e) => e.action_type === 'attack' && e.terrain_reaction);
  assert.ok(attackEvent, 'attack event with terrain_reaction in log');
  assert.equal(attackEvent.terrain_reaction.element, 'ice');
  assert.equal(attackEvent.terrain_reaction.new_state, 'ice');
});
