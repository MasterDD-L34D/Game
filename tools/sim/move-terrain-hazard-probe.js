'use strict';
// Move terrain-cost substrate -- HAZARD-stress band probe (Phase 4 addendum).
//
// The foresta pilot N=40 was null-by-construction (medium profiles, vegetazione free,
// roccia off-path, flyers exempt -> the substrate never fired). Harsh+opposite review
// (2026-06-28) correctly flagged that as "a measurement of nothing". This probe does the
// OPPOSITE: it FORCES the substrate to fire -- heavy-profile units (corazzato -> heavy
// profile: lava 2.0, roccia 2.0) must cross a full-height lava+roccia WALL (no detour) to
// reach the enemies. It measures the substrate's IMPACT MAGNITUDE/DIRECTION when it bites,
// which is the real band question the flip needs (the flip is GLOBAL; data/encounters/
// elite_01.yaml carries lava in prod).
//
// Paired-seed (same seed ON vs OFF), in-process (supertest, NO prod), node 22.
// Synthetic-but-deliberate: a worst-case traversal, not a prod roster -- it answers
// "how much does the flip shift play when units cross hazard", not "is encounter X balanced".
//
// Usage: node tools/sim/move-terrain-hazard-probe.js [N] [enemyScale]

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

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

// Full-height lava (x=3) + roccia (x=4) WALL on an 8x8 grid -> no detour, units MUST pay.
function hazardWall() {
  const t = [];
  for (let y = 0; y < 8; y += 1) {
    t.push({ x: 3, y, type: 'lava' });
    t.push({ x: 4, y, type: 'roccia' });
  }
  return t;
}

// Heavy-profile players (corazzato -> heavy: lava/roccia 2.0) at the left, must cross the
// wall to reach the enemies at the right. No volo (they pay the full hazard cost).
function roster() {
  return [0, 1, 2].map((i) => ({
    id: `heavy_${i}`,
    species: 'x',
    job: 'vanguard',
    morphotype: 'corazzato',
    hp: 22,
    max_hp: 22,
    ap: 3,
    mod: 7,
    dc: 12,
    attack_range: 1,
    initiative: 14 - i,
    position: { x: 0, y: 2 + i },
    controlled_by: 'player',
    traits: [],
    status: {},
  }));
}

function enemies(scale) {
  return [0, 1, 2].map((i) => ({
    id: `foe_${i}`,
    species: 'velox',
    hp: Math.round(8 * scale),
    max_hp: Math.round(8 * scale),
    ap: 2,
    mod: Math.round(2 * scale),
    dc: 10,
    attack_range: 1,
    initiative: 8 - i,
    position: { x: 7, y: 2 + i },
    controlled_by: 'sistema',
    status: {},
  }));
}

async function runArm(flagOn, seed, scale) {
  if (flagOn) process.env.MOVE_TERRAIN_COST_ENABLED = 'true';
  else delete process.env.MOVE_TERRAIN_COST_ENABLED;
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const r = await runEncounter(http, {
      roster: roster(),
      enemies: enemies(scale),
      seed,
      maxRounds: 30,
      terrainFeatures: hazardWall(),
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
        scenario: 'hazard-wall (lava x3 + roccia x4, heavy profile, no volo)',
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
