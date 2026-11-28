// =============================================================================
// FIRST PLAYTEST — sessione completa end-to-end
//
// Simula una partita tutorial intera:
//   enc_tutorial_01 → start → round loop (attack+move) → end → VC debrief
//
// Obiettivo: verificare che il loop di gioco giri da /start a /end
// con output VC leggibile — il primo "playtest digitale" del progetto.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('FIRST PLAYTEST: full tutorial session with VC debrief', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  // ── 1. Load tutorial scenario ──
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(scenario.status, 200, 'tutorial scenario should load');
  assert.equal(scenario.body.units.length, 4, 'should have 4 units');

  // ── 2. Start session ──
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  assert.equal(startRes.status, 200, `start failed: ${JSON.stringify(startRes.body)}`);
  const sid = startRes.body.session_id;
  assert.ok(sid, 'session_id should exist');

  const playerUnits = startRes.body.state.units.filter((u) => u.controlled_by === 'player');
  const enemyUnits = startRes.body.state.units.filter((u) => u.controlled_by === 'sistema');
  assert.equal(playerUnits.length, 2, '2 player units');
  assert.equal(enemyUnits.length, 2, '2 enemy units');

  console.log(`\n  ┌─ SESSION ${sid.slice(0, 8)}...`);
  console.log(`  │  Players: ${playerUnits.map((u) => u.id).join(', ')}`);
  console.log(`  │  Enemies: ${enemyUnits.map((u) => u.id).join(', ')}`);

  // ── 3. Play rounds until game over or max turns ──
  const MAX_ROUNDS = 12;
  let roundNum = 0;
  let gameOver = false;
  let totalPlayerDamage = 0;
  let totalPlayerHits = 0;
  let totalPlayerMisses = 0;

  for (roundNum = 1; roundNum <= MAX_ROUNDS && !gameOver; roundNum++) {
    // Get current state
    const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });

    if (stateRes.status !== 200) break;
    const state = stateRes.body;

    // Check if enemies are all dead
    const aliveEnemies = state.units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
    if (aliveEnemies.length === 0) {
      console.log(`  │  Round ${roundNum}: VICTORY — all enemies eliminated`);
      gameOver = true;
      break;
    }

    // Check if players are all dead
    const alivePlayers = state.units.filter((u) => u.controlled_by === 'player' && u.hp > 0);
    if (alivePlayers.length === 0) {
      console.log(`  │  Round ${roundNum}: DEFEAT — all players eliminated`);
      gameOver = true;
      break;
    }

    // Player actions: each alive player attacks nearest alive enemy
    for (const player of alivePlayers) {
      // Re-read state between attacks to avoid targeting already-dead enemies
      const liveStateRes = await request(app).get('/api/session/state').query({ session_id: sid });
      const liveEnemies = liveStateRes.body.units.filter(
        (u) => u.controlled_by === 'sistema' && u.hp > 0,
      );
      const target = liveEnemies[0];
      if (!target) break;

      // Use /action (legacy unified endpoint, wraps round automatically)
      const actionRes = await request(app).post('/api/session/action').send({
        session_id: sid,
        actor_id: player.id,
        action_type: 'attack',
        target_id: target.id,
      });

      if (actionRes.status === 200 && actionRes.body.roll !== undefined) {
        const r = actionRes.body;
        const emoji = r.result === 'hit' ? '⚔️' : '💨';
        console.log(
          `  │  R${roundNum} ${player.id} → ${target.id}: d20=${r.roll} MoS=${r.mos} ${emoji} dmg=${r.damage_dealt || 0} (hp=${r.target_hp})`,
        );
        if (r.result === 'hit') {
          totalPlayerHits++;
          totalPlayerDamage += r.damage_dealt || 0;
        } else {
          totalPlayerMisses++;
        }
      }
    }

    // End turn (triggers AI actions + side effects)
    const turnRes = await request(app).post('/api/session/turn/end').send({ session_id: sid });

    if (turnRes.status === 200 && turnRes.body.ia_actions) {
      for (const ia of turnRes.body.ia_actions) {
        // Backend emits `type: 'attack'` (not action_type). See sessionRoundBridge.js:367.
        if (ia.type === 'attack' || ia.action_type === 'attack') {
          const emoji = ia.result === 'hit' ? '🔴' : '🔵';
          const aid = ia.unit_id || ia.actor_id;
          const tid = ia.target || ia.target_id;
          console.log(`  │  R${roundNum} AI ${aid} → ${tid}: ${emoji} dmg=${ia.damage_dealt || 0}`);
        }
      }
    }
  }

  // ── 4. End session & get debrief ──
  const endRes = await request(app).post('/api/session/end').send({ session_id: sid });
  assert.equal(endRes.status, 200, `end failed: ${JSON.stringify(endRes.body)}`);
  assert.ok(endRes.body.finalized, 'session should be finalized');

  console.log(`  │`);
  console.log(`  │  ── DEBRIEF ──`);
  console.log(`  │  Rounds played: ${roundNum - 1}`);
  console.log(`  │  Player hits/misses: ${totalPlayerHits}/${totalPlayerMisses}`);
  console.log(`  │  Total player damage: ${totalPlayerDamage}`);
  console.log(`  │  Events logged: ${endRes.body.events_count || 'N/A'}`);

  // ── 5. Get VC snapshot ──
  const vcRes = await request(app).get(`/api/session/${sid}/vc`);
  if (vcRes.status === 200 && vcRes.body) {
    const vc = vcRes.body;
    console.log(`  │`);
    console.log(`  │  ── VC SNAPSHOT ──`);
    console.log(`  │  Turns elapsed: ${vc.turns_elapsed || 'N/A'}`);
    console.log(`  │  Units alive (player): ${vc.units_alive_player ?? 'N/A'}`);
    console.log(`  │  Units alive (enemy): ${vc.units_alive_enemy ?? 'N/A'}`);
    console.log(
      `  │  Damage dealt/taken: ${vc.total_damage_dealt_by_player ?? 'N/A'}/${vc.total_damage_taken_by_player ?? 'N/A'}`,
    );

    // Log any MBTI/Ennea projections if present
    if (vc.mbti || vc.ennea || vc.aggregate) {
      console.log(`  │  MBTI: ${JSON.stringify(vc.mbti || 'N/A')}`);
      console.log(`  │  Ennea: ${JSON.stringify(vc.ennea || 'N/A')}`);
    }
  }

  console.log(`  └─ SESSION COMPLETE\n`);

  // ── Assertions ──
  assert.ok(endRes.body.finalized, 'session must finalize');
  assert.ok(roundNum <= MAX_ROUNDS + 1, `should complete within ${MAX_ROUNDS} rounds`);
});
