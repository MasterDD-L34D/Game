// =============================================================================
// TUTORIAL 04 BATCH — "Pozza Acida del Bosco" (diff 4/5)
//
// 2 player vs 3 (1 lanciere bleeding + 2 corrieri) + 3 hazard tiles.
// Trait denti_seghettati su lanciere causa bleeding cumulativo.
// Target win rate ~30-50% per diff 4/5.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const N_RUNS = 10;
const MAX_ROUNDS = 18;

async function runOne(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_04');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units, hazard_tiles: scenario.body.hazard_tiles });
  const sid = startRes.body.session_id;

  const stats = {
    sid: sid.slice(0, 8),
    rounds: 0,
    outcome: 'timeout',
    player_hits: 0,
    player_misses: 0,
    player_damage: 0,
    enemy_damage: 0,
    hazard_damage: 0,
    bleeding_events: 0,
  };

  for (let r = 1; r <= MAX_ROUNDS; r++) {
    stats.rounds = r;
    const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
    if (stateRes.status !== 200) break;
    const state = stateRes.body;

    const aliveEnemies = state.units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
    const alivePlayers = state.units.filter((u) => u.controlled_by === 'player' && u.hp > 0);

    if (aliveEnemies.length === 0) {
      stats.outcome = 'victory';
      break;
    }
    if (alivePlayers.length === 0) {
      stats.outcome = 'defeat';
      break;
    }

    let liveEnemies = aliveEnemies.map((e) => ({ ...e }));

    for (const player of alivePlayers) {
      const target = liveEnemies[0];
      if (!target) break;
      const actionRes = await request(app).post('/api/session/action').send({
        session_id: sid,
        actor_id: player.id,
        action_type: 'attack',
        target_id: target.id,
      });
      if (actionRes.status === 200 && actionRes.body.roll !== undefined) {
        const x = actionRes.body;
        if (x.result === 'hit') {
          stats.player_hits++;
          stats.player_damage += x.damage_dealt || 0;
          target.hp -= x.damage_dealt || 0;
          if (target.hp <= 0) {
            liveEnemies = liveEnemies.filter((e) => e.hp > 0);
          }
        } else {
          stats.player_misses++;
        }
      }
    }

    const turnRes = await request(app).post('/api/session/turn/end').send({ session_id: sid });
    if (turnRes.status === 200) {
      if (turnRes.body.ia_actions) {
        for (const ia of turnRes.body.ia_actions) {
          if ((ia.type === 'attack' || ia.action_type === 'attack') && ia.result === 'hit') {
            stats.enemy_damage += ia.damage_dealt || 0;
          }
        }
      }
      if (Array.isArray(turnRes.body.hazard_events)) {
        for (const h of turnRes.body.hazard_events) stats.hazard_damage += h.damage || 0;
      }
      if (Array.isArray(turnRes.body.side_effects)) {
        for (const s of turnRes.body.side_effects) {
          if (s.unit_id) stats.bleeding_events++;
        }
      }
    }
  }

  await request(app).post('/api/session/end').send({ session_id: sid });
  return stats;
}

test(`TUTORIAL 04 BATCH: ${N_RUNS} runs (diff 4/5, bleeding + hazard)`, async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const allStats = [];
  for (let i = 0; i < N_RUNS; i++) {
    allStats.push(await runOne(app));
  }

  const victories = allStats.filter((s) => s.outcome === 'victory').length;
  const defeats = allStats.filter((s) => s.outcome === 'defeat').length;
  const timeouts = allStats.filter((s) => s.outcome === 'timeout').length;
  const avgRounds = allStats.reduce((a, s) => a + s.rounds, 0) / N_RUNS;
  const totalAttacks = allStats.reduce((a, s) => a + s.player_hits + s.player_misses, 0);
  const totalHits = allStats.reduce((a, s) => a + s.player_hits, 0);
  const hitRate = totalAttacks > 0 ? (totalHits / totalAttacks) * 100 : 0;
  const avgPlayerDmg = allStats.reduce((a, s) => a + s.player_damage, 0) / N_RUNS;
  const avgEnemyDmg = allStats.reduce((a, s) => a + s.enemy_damage, 0) / N_RUNS;
  const avgHazardDmg = allStats.reduce((a, s) => a + s.hazard_damage, 0) / N_RUNS;
  const totalBleed = allStats.reduce((a, s) => a + s.bleeding_events, 0);

  console.log(`\n  ╔═══ TUTORIAL 04 BATCH (N=${N_RUNS}) ═══╗`);
  console.log(`  ║  Difficulty: 4/5 — Pozza Acida + bleeding`);
  console.log(`  ║`);
  console.log(`  ║  Outcomes:`);
  console.log(
    `  ║    Victories: ${victories}/${N_RUNS} (${((victories / N_RUNS) * 100).toFixed(0)}%)`,
  );
  console.log(`  ║    Defeats:   ${defeats}/${N_RUNS}`);
  console.log(`  ║    Timeouts:  ${timeouts}/${N_RUNS}`);
  console.log(`  ║`);
  console.log(`  ║  Combat:`);
  console.log(`  ║    Avg rounds: ${avgRounds.toFixed(1)}`);
  console.log(`  ║    Hit rate: ${hitRate.toFixed(1)}% (${totalHits}/${totalAttacks})`);
  console.log(`  ║    Avg player damage/run: ${avgPlayerDmg.toFixed(1)}`);
  console.log(`  ║    Avg enemy damage/run: ${avgEnemyDmg.toFixed(1)}`);
  console.log(`  ║    Avg hazard damage/run: ${avgHazardDmg.toFixed(1)}`);
  console.log(`  ║    Total bleeding events: ${totalBleed}`);
  console.log(`  ╚════════════════════════════════════════╝\n`);

  assert.equal(allStats.length, N_RUNS);
});
