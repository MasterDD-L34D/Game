// =============================================================================
// TUTORIAL 03 BATCH — "Pozzo della Caverna Risonante" (diff 3/5)
//
// 2 player vs 2 guardiani caverna + hazard tiles (fumarole tossiche).
// Target win rate ~50-65% per diff 3/5.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const N_RUNS = 10;
const MAX_ROUNDS = 16;

async function runOne(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_03');
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

    for (const player of alivePlayers) {
      const liveStateRes = await request(app).get('/api/session/state').query({ session_id: sid });
      const liveEnemies = liveStateRes.body.units.filter(
        (u) => u.controlled_by === 'sistema' && u.hp > 0,
      );
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
        for (const h of turnRes.body.hazard_events) {
          stats.hazard_damage += h.damage || 0;
        }
      }
    }
  }

  await request(app).post('/api/session/end').send({ session_id: sid });
  return stats;
}

test(`TUTORIAL 03 BATCH: ${N_RUNS} runs (diff 3/5, hazard fumarole)`, async (t) => {
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

  console.log(`\n  ╔═══ TUTORIAL 03 BATCH (N=${N_RUNS}) ═══╗`);
  console.log(`  ║  Difficulty: 3/5 — Caverna Risonante con hazard`);
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
  console.log(`  ╚════════════════════════════════════════╝\n`);

  assert.equal(allStats.length, N_RUNS);
  assert.ok(victories + defeats + timeouts === N_RUNS, 'all runs have outcome');
});
