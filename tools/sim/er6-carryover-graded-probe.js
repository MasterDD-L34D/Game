'use strict';
// W5 inc-3 -- ER6 overrun carry-over GRADED re-ratify probe.
//
// Re-ratifies the ER6 provisional band (SPEC-I, PR #3119) with the W5 graded metrics
// (enemy_hp_remaining_pct / ko_rate / hp_remaining_pct) instead of the WR-only full-loop meta
// band. Master-dd direction (2026-07-01 AskUserQuestion): "graded-confirm band-neutral" -- ER6 is
// inert on current content (the +1 overrun bonus almost always converts to a spawn in the same
// tick, so carry-over rarely diverges from consume-once), so this CONFIRMS band-neutrality with a
// sharper metric and turns the band PROVISIONAL -> RATIFIED band-neutral on current content.
//
// Paired A/B (same seeds). BOTH arms arm the overrun event (STRESSWAVE_EVENTS_ENABLED=true) so the
// carry path is reachable; the ONLY between-arm difference is REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED
// (ON = carry the unspent bonus to the next tick; OFF = consume-once). Scenario/biome/pressure/
// modulation mirror the canonical ER6 measurement point (spec-i-gates-probe EFFECTS.er6 +
// --modulation duo_hardcore so the authored 10x10 reinforcement entry tiles are on-grid).
//
// In-process (supertest createApp, NO prod port, node 22). Sim NOT bit-repro cross node-version
// (read bands as ranges, ~+-0.05). Flag stays OFF in prod -- this measures, never flips.
//
// Usage: node tools/sim/er6-carryover-graded-probe.js [N]   (default 40)

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');
const { probeRoster } = require('./overcharge-probe');
const { extractStresswave, EFFECTS } = require('./spec-i-gates-probe');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const ER6 = EFFECTS.er6; // scenario enc_hardcore_reinf_01, biome abisso_vulcanico, pressureStart 30

function supertestHttp(app) {
  return {
    post: (p, body) =>
      request(app)
        .post(p)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

async function runArm(carryOn, N, seedBase) {
  // Env scoped to the arm (createApp + the backend read it per-request). BOTH arms arm the
  // overrun event; only the carry-over flag differs.
  const saved = {
    sw: process.env.STRESSWAVE_EVENTS_ENABLED,
    carry: process.env.REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED,
  };
  process.env.STRESSWAVE_EVENTS_ENABLED = 'true';
  if (carryOn) process.env.REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED = 'true';
  else delete process.env.REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED;

  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const enemiesProto = buildScenarioEnemies(ER6.scenario, {});
    if (!enemiesProto || !enemiesProto.length) {
      throw new Error(`ER6 scenario "${ER6.scenario}" yielded no roster (anti-#14: no fallback)`);
    }
    const runs = [];
    for (let i = 0; i < N; i += 1) {
      const seed = `er6carry-${seedBase + i}`;
      const roster = probeRoster();
      const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(http, {
        roster,
        enemies,
        scenarioId: ER6.scenario,
        biomeId: ER6.biomeId,
        seed,
        maxRounds: 160,
        collectEvents: ER6.collectEvents,
        pressureStart: ER6.pressureStart,
        modulation: 'duo_hardcore',
      });
      const ev = extractStresswave(res.collectedEvents);
      const rosterN = (res.rosterIds || []).length || 1;
      runs.push({
        outcome: res.outcome,
        rounds: res.rounds,
        hp_remaining_pct: res.hp_remaining_pct,
        enemy_hp_remaining_pct: res.enemy_hp_remaining_pct,
        units_lost: res.units_lost,
        ko_rate: rosterN ? (res.units_lost || 0) / rosterN : 0,
        overrun_fired: ev.overrun_turn !== null,
        spawns: ev.spawns,
      });
    }
    return runs;
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
    // restore env
    if (saved.sw === undefined) delete process.env.STRESSWAVE_EVENTS_ENABLED;
    else process.env.STRESSWAVE_EVENTS_ENABLED = saved.sw;
    if (saved.carry === undefined) delete process.env.REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED;
    else process.env.REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED = saved.carry;
  }
}

function mean(arr, pick) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + (Number(pick(r)) || 0), 0) / arr.length;
}

function summarize(runs) {
  const n = runs.length || 1;
  const wins = runs.filter((r) => r.outcome === 'victory').length;
  return {
    N: runs.length,
    win_rate: Number((wins / n).toFixed(4)),
    mean_enemy_hp_remaining_pct: Number(mean(runs, (r) => r.enemy_hp_remaining_pct).toFixed(4)),
    mean_hp_remaining_pct: Number(mean(runs, (r) => r.hp_remaining_pct).toFixed(4)),
    mean_ko_rate: Number(mean(runs, (r) => r.ko_rate).toFixed(4)),
    avg_rounds: Number(mean(runs, (r) => r.rounds).toFixed(2)),
    // Mechanic-fires proof (anti-pattern #14): the overrun event must actually arm, else the
    // A/B is vacuous (nothing to carry). Both arms should show the same overrun_rate.
    overrun_rate: Number(mean(runs, (r) => (r.overrun_fired ? 1 : 0)).toFixed(4)),
    mean_spawns: Number(mean(runs, (r) => r.spawns).toFixed(2)),
  };
}

async function main() {
  const N = Math.max(1, Number(process.argv[2]) || 40);
  const seedBase = 7000;
  const off = await runArm(false, N, seedBase); // consume-once
  const on = await runArm(true, N, seedBase); // carry-over (paired seeds)
  const sOff = summarize(off);
  const sOn = summarize(on);
  console.log(
    JSON.stringify(
      {
        probe: 'er6-carryover-graded',
        scenario: ER6.scenario,
        biome: ER6.biomeId,
        pressure_start: ER6.pressureStart,
        modulation: 'duo_hardcore',
        discriminator: 'REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED (both arms STRESSWAVE on)',
        consume_once_OFF: sOff,
        carry_over_ON: sOn,
        deltas: {
          win_rate: Number((sOn.win_rate - sOff.win_rate).toFixed(4)),
          enemy_hp_remaining: Number(
            (sOn.mean_enemy_hp_remaining_pct - sOff.mean_enemy_hp_remaining_pct).toFixed(4),
          ),
          ko_rate: Number((sOn.mean_ko_rate - sOff.mean_ko_rate).toFixed(4)),
          hp_remaining: Number((sOn.mean_hp_remaining_pct - sOff.mean_hp_remaining_pct).toFixed(4)),
        },
        node: process.version,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[er6-carryover-graded-probe] FATAL:', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  });
}

module.exports = { runArm, summarize };
