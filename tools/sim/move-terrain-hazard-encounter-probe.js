'use strict';
// Move terrain-cost substrate -- "Bocche Vulcaniche" hazard ENCOUNTER band probe.
//
// Paired-seed ON-vs-OFF over the mixed volo-graded roster (desertoCaldoHazardScenario),
// crossing a full-height lava+roccia wall on 8x8. Measures wr_delta + rounds_delta when
// the flag flips. In-process (supertest, NO prod), node 22. Terrain is inlined (the probe
// path mirrors move-terrain-hazard-probe.js); the loadable encounter file of the same id
// carries the same wall for the encounter_id runtime path.
//
// Usage: node tools/sim/move-terrain-hazard-encounter-probe.js [N] [enemyScale]

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
const {
  buildUnits,
  TERRAIN,
} = require('../../apps/backend/services/worldgen/desertoCaldoHazardScenario');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

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

function split(scale) {
  const all = buildUnits().map((u) =>
    u.controlled_by === 'sistema'
      ? {
          ...u,
          hp: Math.round(u.hp * scale),
          max_hp: Math.round(u.max_hp * scale),
          mod: Math.round(u.mod * scale),
        }
      : u,
  );
  return {
    roster: all.filter((u) => u.controlled_by === 'player'),
    enemies: all.filter((u) => u.controlled_by === 'sistema'),
  };
}

async function runArm(flagOn, seed, scale) {
  if (flagOn) process.env.MOVE_TERRAIN_COST_ENABLED = 'true';
  else delete process.env.MOVE_TERRAIN_COST_ENABLED;
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const { roster, enemies } = split(scale);
    const r = await runEncounter(http, {
      roster,
      enemies,
      seed,
      maxRounds: 30,
      terrainFeatures: TERRAIN,
      gridSize: 8,
    });
    return { outcome: r.outcome, rounds: r.rounds };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const avgRounds = arr.reduce((s, r) => s + (r.rounds || 0), 0) / (arr.length || 1);
  return {
    wins,
    defeats: arr.filter((r) => r.outcome === 'defeat').length,
    timeouts: arr.filter((r) => r.outcome === 'timeout').length,
    win_rate: Number((wins / arr.length).toFixed(4)),
    avg_rounds: Number(avgRounds.toFixed(2)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const scale = Number(process.argv[3]) || 1.0;
  const on = [];
  const off = [];
  for (let s = 1; s <= N; s += 1) {
    on.push(await runArm(true, s, scale));
    off.push(await runArm(false, s, scale));
    if (s % 10 === 0) process.stderr.write(`  ${s}/${N}\n`);
  }
  const sOn = summarize(on);
  const sOff = summarize(off);
  console.log(
    JSON.stringify(
      {
        N,
        enemyScale: scale,
        scenario: 'bocche-vulcaniche (lava x3 + roccia x4, mixed volo roster, 8x8)',
        flag_on: sOn,
        flag_off: sOff,
        wr_delta: Number((sOn.win_rate - sOff.win_rate).toFixed(4)),
        avg_rounds_delta: Number((sOn.avg_rounds - sOff.avg_rounds).toFixed(2)),
        node: process.version,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
