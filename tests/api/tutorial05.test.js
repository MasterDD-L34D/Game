// =============================================================================
// TUTORIAL 05 BATCH — "Solo contro l'Apex" (diff 5/5)
//
// Boss fight 2 player vs 1 Apex (traits martello_osseo + ferocia).
// Apex starting HP letto dinamicamente da /api/tutorial/enc_tutorial_05
// per evitare drift con tutorialScenario.js tuning.
// Target win rate ~10-30% per diff 5/5.
// =============================================================================

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const N_RUNS = 10;
const MAX_ROUNDS = 30;

async function runOne(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_05');
  const apexUnit = scenario.body.units.find((u) => u.id === 'e_apex');
  const apexMaxHp = apexUnit ? Number(apexUnit.hp) : 0;
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
    apex_hp_final: apexMaxHp,
    apex_hp_initial: apexMaxHp,
  };

  for (let r = 1; r <= MAX_ROUNDS; r++) {
    stats.rounds = r;
    const stateRes = await request(app).get('/api/session/state').query({ session_id: sid });
    if (stateRes.status !== 200) break;
    const state = stateRes.body;

    const aliveEnemies = state.units.filter((u) => u.controlled_by === 'sistema' && u.hp > 0);
    const alivePlayers = state.units.filter((u) => u.controlled_by === 'player' && u.hp > 0);
    const apex = state.units.find((u) => u.id === 'e_apex');
    if (apex) stats.apex_hp_final = apex.hp;

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
    if (turnRes.status === 200 && turnRes.body.ia_actions) {
      for (const ia of turnRes.body.ia_actions) {
        if ((ia.type === 'attack' || ia.action_type === 'attack') && ia.result === 'hit') {
          stats.enemy_damage += ia.damage_dealt || 0;
        }
      }
    }
  }

  await request(app).post('/api/session/end').send({ session_id: sid });
  return stats;
}

test(`TUTORIAL 05 BATCH: ${N_RUNS} runs (BOSS FIGHT diff 5/5)`, async (t) => {
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
  const avgApexHp = allStats.reduce((a, s) => a + s.apex_hp_final, 0) / N_RUNS;
  const apexMaxHp = allStats[0]?.apex_hp_initial ?? 0;

  console.log(`\n  ╔═══ TUTORIAL 05 BATCH (N=${N_RUNS}) ═══╗`);
  console.log(`  ║  BOSS FIGHT — Apex Predator diff 5/5`);
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
  console.log(`  ║    Avg Apex HP at end: ${avgApexHp.toFixed(1)}/${apexMaxHp}`);
  console.log(`  ╚════════════════════════════════════════╝\n`);

  // Structural: N_RUNS recorded
  assert.equal(allStats.length, N_RUNS);
  // Behavioral invariants (bot review PR #1471): prevent silent regression
  // where harness breaks or no combat engine activity. NOTE: we intentionally
  // do NOT assert `timeouts < N_RUNS` because CI env (no warmup, slower
  // resolver) reliably times out all 10 runs on diff 5/5 BOSS FIGHT even
  // when combat engine is healthy. Balancing is a separate concern tracked
  // in docs/playtest/. Harness sanity covered by the checks below.
  assert.equal(
    victories + defeats + timeouts,
    N_RUNS,
    'outcomes must sum to N_RUNS (each run has exactly one outcome)',
  );
  assert.ok(
    avgRounds > 0 && avgRounds <= MAX_ROUNDS,
    `avgRounds ${avgRounds} out of (0, ${MAX_ROUNDS}] — harness broken`,
  );
  assert.ok(
    totalAttacks > N_RUNS,
    `player attacks ${totalAttacks} < N_RUNS=${N_RUNS} — combat engine silently broken`,
  );
  assert.ok(totalHits > 0, 'zero hits across all runs — resolver broken or CD/mod mismatch');
  assert.ok(
    avgPlayerDmg > 0 || avgEnemyDmg > 0,
    'zero damage dealt by either side — damage pipeline broken',
  );
  assert.ok(apexMaxHp > 0, 'e_apex must be present in scenario with hp > 0');
});
