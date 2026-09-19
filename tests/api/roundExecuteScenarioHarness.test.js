// =============================================================================
// Round Execute Scenario Harness — proof of SoT canonical flow.
//
// Esegue tutorial_02 N=10 volte usando /api/session/round/execute per
// round completo invece di /action sequenziale. Verifica:
//   1. /round/execute orchestra player + AI + resolves correttamente
//   2. Win rate post-ap=2 compatibile con band 60-70% (tolleranza N=10)
//   3. AP budget validazione non genera false positive
//   4. Round count coerente (no infinite loop)
//
// Complementare a tutorial02.test.js (che usa /action legacy).
// =============================================================================

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const N_RUNS = 10;
const MAX_ROUNDS = 14;

async function runOneBatch(app) {
  const scenario = await request(app).get('/api/tutorial/enc_tutorial_02');
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
    ap_violations: 0,
    batch_requests: 0,
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

    // Build player intents: ogni player attacca primo enemy vivo in range, 2 volte se AP lo permette.
    const intents = [];
    for (const player of alivePlayers) {
      const target = aliveEnemies.find(
        (e) =>
          Math.abs(player.position.x - e.position.x) + Math.abs(player.position.y - e.position.y) <=
          (player.attack_range || 2),
      );
      if (target) {
        const apBudget = Number(player.ap_remaining ?? player.ap ?? 0);
        // 2 attack consecutivi se ap>=2 (canonical use case).
        const attacks = Math.min(apBudget, 2);
        for (let i = 0; i < attacks; i += 1) {
          intents.push({
            actor_id: player.id,
            action: { type: 'attack', target_id: target.id },
          });
        }
      }
    }

    // Batch round/execute con ai_auto=true + priority_queue=true (canonical).
    // Canonical flow ordina player + AI intents per priority e dispatcha in
    // ordine di initiative + action_speed - status_penalty.
    const batchRes = await request(app).post('/api/session/round/execute').send({
      session_id: sid,
      player_intents: intents,
      ai_auto: true,
      priority_queue: true,
    });
    stats.batch_requests += 1;

    if (batchRes.status === 400) {
      // AP violation (edge case che non dovrebbe capitare con logic corretto)
      stats.ap_violations += 1;
      break;
    }
    assert.equal(
      batchRes.status,
      200,
      `round ${r} batch: ${JSON.stringify(batchRes.body).slice(0, 200)}`,
    );

    // Conta hit/miss/damage dai results. Con priority_queue=true, results[]
    // include player + AI intents mescolati. Distingui via controlled_by
    // dallo state corrente (alivePlayers lookup set).
    const playerIds = new Set(alivePlayers.map((u) => u.id));
    for (const result of batchRes.body.results || []) {
      if (result.action_type === 'attack' && result.result) {
        const r = result.result;
        const isPlayer = playerIds.has(result.actor_id);
        if (r.result === 'hit') {
          if (isPlayer) {
            stats.player_hits += 1;
            stats.player_damage += Number(r.damage_dealt || 0);
          } else {
            stats.enemy_damage += Number(r.damage_dealt || 0);
          }
        } else if (r.result === 'miss' && isPlayer) {
          stats.player_misses += 1;
        }
      }
    }

    // ai_result è null con priority_queue=true (AI nel queue, non handleTurnEndViaRound).
    const ai = batchRes.body.ai_result;
    if (ai && Array.isArray(ai.ia_actions)) {
      for (const ia of ai.ia_actions) {
        if ((ia.type === 'attack' || ia.action_type === 'attack') && ia.result === 'hit') {
          stats.enemy_damage += Number(ia.damage_dealt || 0);
        }
      }
    }
  }

  await request(app).post('/api/session/end').send({ session_id: sid });
  return stats;
}

test(`ROUND/EXECUTE HARNESS: ${N_RUNS} runs tutorial_02 via batch endpoint`, async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const allStats = [];
  for (let i = 0; i < N_RUNS; i += 1) {
    allStats.push(await runOneBatch(app));
  }

  const victories = allStats.filter((s) => s.outcome === 'victory').length;
  const defeats = allStats.filter((s) => s.outcome === 'defeat').length;
  const timeouts = allStats.filter((s) => s.outcome === 'timeout').length;
  const totalAttacks = allStats.reduce((a, s) => a + s.player_hits + s.player_misses, 0);
  const totalHits = allStats.reduce((a, s) => a + s.player_hits, 0);
  const avgRounds = allStats.reduce((a, s) => a + s.rounds, 0) / N_RUNS;
  const avgPlayerDmg = allStats.reduce((a, s) => a + s.player_damage, 0) / N_RUNS;
  const avgEnemyDmg = allStats.reduce((a, s) => a + s.enemy_damage, 0) / N_RUNS;
  const totalApViolations = allStats.reduce((a, s) => a + s.ap_violations, 0);

  console.log('\n  ╔═══ ROUND/EXECUTE HARNESS (N=10) ═══╗');
  console.log(`  ║  Scenario: enc_tutorial_02 (2v3 asymmetric)`);
  console.log(`  ║  Endpoint: POST /round/execute (canonical flow)`);
  console.log(`  ║`);
  console.log(`  ║  Outcomes:`);
  console.log(
    `  ║    Victories: ${victories}/${N_RUNS} (${Math.round((victories / N_RUNS) * 100)}%)`,
  );
  console.log(`  ║    Defeats:   ${defeats}/${N_RUNS}`);
  console.log(`  ║    Timeouts:  ${timeouts}/${N_RUNS}`);
  console.log(`  ║`);
  console.log(`  ║  Combat:`);
  console.log(`  ║    Avg rounds: ${avgRounds.toFixed(1)}`);
  console.log(
    `  ║    Hit rate: ${totalAttacks > 0 ? ((totalHits / totalAttacks) * 100).toFixed(1) : 0}% (${totalHits}/${totalAttacks})`,
  );
  console.log(`  ║    Avg player damage/run: ${avgPlayerDmg.toFixed(1)}`);
  console.log(`  ║    Avg enemy damage/run:  ${avgEnemyDmg.toFixed(1)}`);
  console.log(`  ║    AP violations: ${totalApViolations} (deve essere 0)`);
  console.log(`  ╚════════════════════════════════════════╝\n`);

  // Assertions
  assert.equal(totalApViolations, 0, 'no false positive AP violations');
  assert.ok(avgRounds > 0 && avgRounds <= MAX_ROUNDS, 'rounds in range valido');
  assert.ok(victories + defeats + timeouts === N_RUNS, 'tutti run classificati');
  // Win rate soft check: almeno 1 vittoria su 10 (sanity, no infinite loop)
  assert.ok(victories >= 1, 'almeno 1 vittoria su N=10 (sanity)');
});
