'use strict';
// LOS ratify direction probe (N=10) -- mirrors move-terrain-n40-probe.js.
//
// Measures the win-rate / pace impact of flipping COMBAT_LOS_ENABLED on a
// controlled encounter where terrain LOS actually ENGAGES: a wall of blocker
// terrain (roccia/vegetazione_densa/obstacle, data/core/balance/los.yaml)
// sits strictly between a ranged player roster and the enemy line, so
// straight firing lines are obstructed and LOS-ON forces repositioning.
// Paired-seed (same seed ON vs OFF -> the only difference is the flag),
// in-process (supertest createApp, NO prod DB), node 22. Elimination outcome.
//
// This is a DIRECTION PROBE only (SDMG hypothesis, owner-gated flip). It does
// NOT flip any production flag -- COMBAT_LOS_ENABLED is set/deleted on
// process.env inside this script's own Node process, per arm, per run.
// units_block_los (data/core/balance/los.yaml) is left untouched -- terrain-
// LOS only, matching the slice-1 flip scope.
//
// ANTI-R5 POSITIVE CONTROL: before the batch, calls the real losClearOnGrid
// rule directly on the designed positions+terrain to prove LOS actually
// engages (>=1 firing line LOS-blocked). A ~0 win-rate delta is only a
// meaningful "band-neutral" signal if this control shows LOS bites; if it
// were all-clear the probe would be measuring nothing.
//
// Usage: node tools/sim/los-n-probe.js [N]

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');

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

// Blocker wall (data/core/balance/los.yaml blocker_terrain_types: roccia,
// vegetazione_densa, obstacle) filling the mid-board column (x=3, y=0..5) on
// the 6x6 grid, strictly between the player firing line (x=2) and the enemy
// line (x=4) -- so every same-row (and near-row) shot is obstructed.
const TERRAIN = [
  { x: 3, y: 0, type: 'roccia' },
  { x: 3, y: 1, type: 'vegetazione_densa' },
  { x: 3, y: 2, type: 'obstacle' },
  { x: 3, y: 3, type: 'roccia' },
  { x: 3, y: 4, type: 'vegetazione_densa' },
  { x: 3, y: 5, type: 'obstacle' },
];

// Player roster: 3 ranged attackers (attack_range 3-4) on the left (x=2),
// facing the wall at x=3. Positioned so straight shots to the enemy line
// (x=4) are obstructed by the wall directly in front of them.
function roster() {
  const defs = [
    ['ranged_1', 4, { x: 2, y: 0 }],
    ['ranged_2', 3, { x: 2, y: 2 }],
    ['ranged_3', 4, { x: 2, y: 4 }],
  ];
  return defs.map(([id, range, position]) => ({
    id,
    species: id,
    job: 'ranged',
    hp: 14,
    max_hp: 14,
    ap: 3,
    mod: 6,
    dc: 10,
    attack_range: range,
    initiative: 12,
    position,
    controlled_by: 'player',
    traits: [],
    status: {},
  }));
}

// Enemies on the far side (x=4/5) behind/around the blocker wall, so a
// straight shot from the player line is obstructed and LOS-ON should force
// repositioning to get a clear angle.
function enemies(scale) {
  const defs = [
    ['foe_1', 11, 2, 11, { x: 4, y: 0 }],
    ['foe_2', 11, 2, 11, { x: 4, y: 2 }],
    ['foe_3', 11, 2, 11, { x: 4, y: 4 }],
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

// ANTI-R5 POSITIVE CONTROL: assert the designed terrain actually blocks LOS on
// the intended firing pairs BEFORE running the batch. Uses the real production
// rule (losClearOnGrid), not a re-implementation. Prints the per-pair result
// and the blocked count/total. Resets the env var afterward so it doesn't leak
// into the paired-seed loop (each arm manages COMBAT_LOS_ENABLED itself).
function positiveControl() {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const attackers = roster();
  const foes = enemies(1.0);
  const pairs = [];
  for (const a of attackers) {
    for (const e of foes) {
      const dManhattan =
        Math.abs(a.position.x - e.position.x) + Math.abs(a.position.y - e.position.y);
      const inRange = dManhattan <= (a.attack_range || 1);
      if (!inRange) continue;
      const clear = losClearOnGrid({ terrain_features: TERRAIN }, a.position, e.position);
      pairs.push({ attacker: a.id, enemy: e.id, dist: dManhattan, blocked: !clear });
    }
  }
  delete process.env.COMBAT_LOS_ENABLED;
  const blockedCount = pairs.filter((p) => p.blocked).length;
  const summary = {
    intended_firing_pairs: pairs.length,
    blocked_count: blockedCount,
    pairs,
  };
  console.log('=== ANTI-R5 POSITIVE CONTROL ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('=== END POSITIVE CONTROL ===');
  return summary;
}

async function runArm(flagOn, seed, scale) {
  if (flagOn) process.env.COMBAT_LOS_ENABLED = 'true';
  else delete process.env.COMBAT_LOS_ENABLED;
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
      endSession: true,
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
  const N = Number(process.argv[2]) || 10;
  const scale = Number(process.argv[3]) || 1.0;
  const positiveControlSummary = positiveControl();
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
    positive_control: positiveControlSummary,
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
