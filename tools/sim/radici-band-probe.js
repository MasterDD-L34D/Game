'use strict';
// radici_ancora_planare band probe (carrier-vs-non-carrier).
//
// radici is an ALWAYS-ON slice (flag-independent): a carrier that does NOT move is
// anchored (status ancorato, DR2 at the mitigation seam); a move breaks the anchor.
// So its band is NOT a MOVE_TERRAIN_COST_ENABLED ON/OFF question -- it is carrier vs
// non-carrier. This measures the win-rate impact of the DR2 anchor with a defensive
// roster that HOLDS (attack_range 3 -> can fight without moving -> keeps the anchor)
// while enemies advance and attack it.
//
// Paired-seed (same seed carrier vs non-carrier -> only the trait differs), in-process
// (supertest createApp, NO prod), node 22. Elimination outcome.
//
// Usage: node tools/sim/radici-band-probe.js [N] [enemyScale]

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

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

// Defensive radici party: 3 sessile carriers that HOLD (attack_range 3 -> fight without
// moving -> the anchor stays up). withRadici toggles the trait (the only difference).
function roster(withRadici) {
  return [
    ['ferrocolonia', { x: 2, y: 2 }],
    ['cactus_weaver', { x: 3, y: 2 }],
    ['sentinella_radice', { x: 2, y: 3 }],
  ].map(([id, position]) => ({
    id,
    species: id,
    job: 'warden',
    hp: 16,
    max_hp: 16,
    ap: 2,
    mod: 5,
    dc: 10,
    attack_range: 3,
    initiative: 10,
    position,
    controlled_by: 'player',
    traits: withRadici ? ['radici_ancora_planare'] : [],
    status: {},
  }));
}

// Enemies advance from the corners and attack the held party.
function enemies(scale) {
  const defs = [
    ['raider_a', 10, 3, 11, { x: 0, y: 0 }],
    ['raider_b', 10, 3, 11, { x: 5, y: 0 }],
    ['raider_c', 10, 3, 11, { x: 0, y: 5 }],
    ['raider_d', 10, 3, 11, { x: 5, y: 5 }],
  ];
  return defs.map(([id, hp, mod, dc, position]) => ({
    id,
    species: 'velox',
    hp: Math.round(hp * scale),
    max_hp: Math.round(hp * scale),
    ap: 3,
    mod: Math.round(mod * scale),
    dc,
    attack_range: 1,
    initiative: 8,
    position,
    controlled_by: 'sistema',
    status: {},
  }));
}

async function runArm(withRadici, seed, scale) {
  delete process.env.MOVE_TERRAIN_COST_ENABLED; // radici is flag-independent
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const r = await runEncounter(http, {
      roster: roster(withRadici),
      enemies: enemies(scale),
      seed,
      maxRounds: 30,
      gridSize: 6,
    });
    return { outcome: r.outcome, rounds: r.rounds, survivors: (r.survivorIds || []).length };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const avgSurv = arr.reduce((s, r) => s + (r.survivors || 0), 0) / (arr.length || 1);
  return {
    wins,
    defeats: arr.filter((r) => r.outcome === 'defeat').length,
    timeouts: arr.filter((r) => r.outcome === 'timeout').length,
    win_rate: Number((wins / arr.length).toFixed(4)),
    avg_survivors: Number(avgSurv.toFixed(2)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const scale = Number(process.argv[3]) || 1.0;
  const withR = [];
  const without = [];
  for (let s = 1; s <= N; s += 1) {
    withR.push(await runArm(true, s, scale));
    without.push(await runArm(false, s, scale));
    if (s % 10 === 0) process.stderr.write(`  ${s}/${N}\n`);
  }
  const a = summarize(withR);
  const b = summarize(without);
  console.log(
    JSON.stringify(
      {
        N,
        enemyScale: scale,
        with_radici: a,
        without_radici: b,
        wr_delta: Number((a.win_rate - b.win_rate).toFixed(4)),
        survivors_delta: Number((a.avg_survivors - b.avg_survivors).toFixed(2)),
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
