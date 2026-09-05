'use strict';
// Move terrain-cost substrate -- Phase 4 N=40 band probe.
//
// Measures the win-rate / pace impact of flipping MOVE_TERRAIN_COST_ENABLED on the
// pilot terrain (enc_foresta_temperata_radici: vegetazione_densa/roccia/radura), with
// a roster that exercises the volo creature kit. Paired-seed (same seed ON vs OFF ->
// the only difference is the flag), in-process (supertest createApp, NO prod), node 22.
// Elimination outcome (no objective loaded -> runEncounter uses alive-count).
//
// METHODOLOGY:
// - The flip toggles terrain-cost (all units pay terrain-weighted move AP) + volo relief
//   (carriers exempt by grade). radici (DR2 anchor) is ALWAYS-ON (flag-independent) ->
//   it would be present in BOTH arms and cancel from the delta, AND a sessile range-1
//   unit cannot traverse to engage (the scenario never resolves). So radici is OUT of
//   the flip-delta probe; its band is a separate carrier-vs-non-carrier question.
// - The roster MUST traverse the typed terrain for the cost to bite: 3 volo flyers
//   (g1/g2/g3, exempt) + 1 non-volo skirmisher (pays the cost ON) start bottom-left and
//   close on enemies top-right across the typed tiles.
// - Sensitive metrics: win-rate delta + avg rounds-to-completion delta (terrain-cost
//   slows traversal -> pace shifts even when WR is near a ceiling).
//
// Usage: node tools/sim/move-terrain-n40-probe.js [N] [enemyScale]

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

// Pilot terrain (data/encounters/enc_foresta_temperata_radici.yaml).
const TERRAIN = [
  { x: 2, y: 2, type: 'vegetazione_densa' },
  { x: 4, y: 3, type: 'vegetazione_densa' },
  { x: 1, y: 4, type: 'roccia' },
  { x: 5, y: 5, type: 'radura' },
];

// Player roster: 3 volo flyers (g1/g2/g3, terrain-exempt by grade) + 1 non-volo
// skirmisher (pays terrain cost when ON). All start bottom-left, must cross the typed
// tiles to reach the enemies (so the move-cost actually bites).
function roster() {
  const volo = [
    ['echo_wing', 1, { x: 0, y: 0 }],
    ['aurora_gull', 2, { x: 0, y: 1 }],
    ['noctule_termico', 3, { x: 1, y: 0 }],
  ].map(([id, grade, position]) => ({
    id,
    species: id,
    job: 'skirmisher',
    hp: 14,
    max_hp: 14,
    ap: 3,
    mod: 6,
    dc: 10,
    attack_range: 2,
    initiative: 14,
    position,
    controlled_by: 'player',
    traits: ['adattamento_volo'],
    volo_grade: grade,
    status: {},
  }));
  const ground = [
    {
      id: 'ground_skirmisher',
      species: 'velox',
      job: 'skirmisher',
      hp: 14,
      max_hp: 14,
      ap: 3,
      mod: 6,
      dc: 10,
      attack_range: 2,
      initiative: 12,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      traits: [],
      status: {},
    },
  ];
  return [...volo, ...ground];
}

// Enemies start top-right and advance toward the party across the same typed tiles.
function enemies(scale) {
  const defs = [
    ['umbroid_lurker', 12, 3, 11, { x: 5, y: 5 }],
    ['mud_sentinel', 11, 2, 11, { x: 4, y: 5 }],
    ['echo_seer', 10, 2, 10, { x: 5, y: 4 }],
  ];
  return defs.map(([id, hp, mod, dc, position]) => ({
    id,
    species: id,
    hp: Math.round(hp * scale),
    max_hp: Math.round(hp * scale),
    ap: 3,
    mod: Math.round(mod * scale),
    dc,
    attack_range: 2,
    initiative: 10,
    position,
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
      terrainFeatures: TERRAIN,
      gridSize: 6,
      endSession: true, // #3157 F4: close the session so the log gets session_end
    });
    return { outcome: r.outcome, rounds: r.rounds };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const defeats = arr.filter((r) => r.outcome === 'defeat').length;
  const timeouts = arr.filter((r) => r.outcome === 'timeout').length;
  const avgRounds = arr.reduce((s, r) => s + (r.rounds || 0), 0) / (arr.length || 1);
  return {
    wins,
    defeats,
    timeouts,
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
  const out = {
    N,
    enemyScale: scale,
    flag_on: sOn,
    flag_off: sOff,
    wr_delta: Number((sOn.win_rate - sOff.win_rate).toFixed(4)),
    avg_rounds_delta: Number((sOn.avg_rounds - sOff.avg_rounds).toFixed(2)),
    node: process.version,
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
