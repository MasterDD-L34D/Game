// =============================================================================
// BATCH PLAYTEST — N=10 simulazioni tutorial per dati VC aggregati
//
// Esegue 10 partite tutorial back-to-back e raccoglie statistiche aggregate:
//   - hit rate medio
//   - danno medio per partita
//   - rounds-to-victory distribuzione
//   - vittorie/sconfitte
//
// Obiettivo: prima base dati per calibrazione VC e bilanciamento.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const N_RUNS = 10;
const MAX_ROUNDS = 12;

async function runOnePlaytest(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_01');
  const startRes = await request(app)
    .post('/api/session/start')
    .send({ units: scenario.body.units });
  const sid = startRes.body.session_id;

  const stats = {
    sid: sid.slice(0, 8),
    rounds: 0,
    outcome: 'timeout',
    player_hits: 0,
    player_misses: 0,
    player_damage: 0,
    enemy_damage: 0,
    rolls: [],
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
      // Re-read state between player attacks to avoid targeting dead enemies.
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
        stats.rolls.push(x.roll);
        if (x.result === 'hit') {
          stats.player_hits++;
          stats.player_damage += x.damage_dealt || 0;
        } else {
          stats.player_misses++;
        }
      }
    }

    const turnRes = await request(app).post('/api/session/turn/end').send({ session_id: sid });
    if (turnRes.status === 200 && turnRes.body.ia_actions) {
      for (const ia of turnRes.body.ia_actions) {
        // Backend emits `type: 'attack'` (not action_type). See sessionRoundBridge.js:367.
        if ((ia.type === 'attack' || ia.action_type === 'attack') && ia.result === 'hit') {
          stats.enemy_damage += ia.damage_dealt || 0;
        }
      }
    }
  }

  await request(app).post('/api/session/end').send({ session_id: sid });
  return stats;
}

test(`BATCH PLAYTEST: ${N_RUNS} runs aggregate stats`, async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const allStats = [];
  for (let i = 0; i < N_RUNS; i++) {
    const s = await runOnePlaytest(app);
    allStats.push(s);
  }

  // Aggregate
  const victories = allStats.filter((s) => s.outcome === 'victory').length;
  const defeats = allStats.filter((s) => s.outcome === 'defeat').length;
  const timeouts = allStats.filter((s) => s.outcome === 'timeout').length;
  const avgRounds = allStats.reduce((a, s) => a + s.rounds, 0) / N_RUNS;
  const avgPlayerDamage = allStats.reduce((a, s) => a + s.player_damage, 0) / N_RUNS;
  const avgEnemyDamage = allStats.reduce((a, s) => a + s.enemy_damage, 0) / N_RUNS;
  const totalAttacks = allStats.reduce((a, s) => a + s.player_hits + s.player_misses, 0);
  const totalHits = allStats.reduce((a, s) => a + s.player_hits, 0);
  const hitRate = totalAttacks > 0 ? (totalHits / totalAttacks) * 100 : 0;
  const allRolls = allStats.flatMap((s) => s.rolls);
  const avgRoll = allRolls.length > 0 ? allRolls.reduce((a, r) => a + r, 0) / allRolls.length : 0;
  const minRoll = Math.min(...allRolls);
  const maxRoll = Math.max(...allRolls);

  console.log(`\n  ╔═══ BATCH PLAYTEST REPORT (N=${N_RUNS}) ═══╗`);
  console.log(`  ║`);
  console.log(`  ║  Outcomes:`);
  console.log(
    `  ║    Victories: ${victories}/${N_RUNS} (${((victories / N_RUNS) * 100).toFixed(0)}%)`,
  );
  console.log(`  ║    Defeats:   ${defeats}/${N_RUNS}`);
  console.log(`  ║    Timeouts:  ${timeouts}/${N_RUNS}`);
  console.log(`  ║`);
  console.log(`  ║  Combat stats:`);
  console.log(`  ║    Avg rounds to end: ${avgRounds.toFixed(1)}`);
  console.log(`  ║    Hit rate: ${hitRate.toFixed(1)}% (${totalHits}/${totalAttacks})`);
  console.log(`  ║    Avg player damage/run: ${avgPlayerDamage.toFixed(1)}`);
  console.log(`  ║    Avg enemy damage/run:  ${avgEnemyDamage.toFixed(1)}`);
  console.log(`  ║`);
  console.log(`  ║  d20 rolls (n=${allRolls.length}):`);
  console.log(`  ║    Avg: ${avgRoll.toFixed(1)} | Min: ${minRoll} | Max: ${maxRoll}`);
  console.log(`  ║`);
  console.log(`  ║  Per-run summary:`);
  for (const s of allStats) {
    const sym = s.outcome === 'victory' ? '✓' : s.outcome === 'defeat' ? '✗' : '·';
    console.log(
      `  ║    ${sym} ${s.sid} R=${s.rounds} hits=${s.player_hits}/${s.player_hits + s.player_misses} dmg=${s.player_damage}`,
    );
  }
  console.log(`  ╚═══════════════════════════════════════╝\n`);

  // Assertions: stato sano del sistema
  assert.equal(allStats.length, N_RUNS, `must complete all ${N_RUNS} runs`);
  assert.ok(victories + defeats + timeouts === N_RUNS, 'all runs must have outcome');
  assert.ok(allRolls.length > 0, 'at least one attack roll must occur');
  assert.ok(avgRoll > 5 && avgRoll < 16, `avg d20 roll suspicious: ${avgRoll}`);
});
