'use strict';
// W5 D8 -- chain-lightning GRADED re-ratify probe.
//
// Re-ratifies the D8 provisional band (aa01 CAP-07, PR #3121 -- caps 3/2 maxDepth 3, flag
// `TERRAIN_CHAIN_LIGHTNING_ENABLED`) with the W5 graded metrics (enemy_hp_remaining_pct /
// hp_remaining_pct / ko_rate) instead of a binary WR gate. Master-dd direction (grilling
// 2026-07-01): D8 leads the graded re-ratify because -- UNLIKE ER6's structurally-inert flag --
// the chain is an ACTIVE mechanic when it fires (multi-tile shock on electrified water terrain),
// so it is the decisive test of whether the graded re-ratify finds a REAL band or another null.
//
// RECON FINDING (the reason this probe is a NON-EXERCISE proof, not a band hunt): the chain path
// is STRUCTURALLY UNREACHABLE by the AI sim. It fires only on `lightning + water -> electrified +
// chain_trigger` (terrainReactions.reactTile) -- a lightning-channel attack landing on a tile that
// is ALREADY water, with adjacent water tiles that have occupants. But in a sim fight:
//   - the player policy (combat-policy.selectPlayerAction) emits NO channel -> resolver default
//     'fisico' -> not in CHANNEL_TO_ELEMENT -> no terrain reaction at all.
//   - the enemy AI (declareSistemaIntents.pickExploitChannel) can only return the target's
//     vuln channel from ARCHETYPE_VULN_CHANNEL = { corazzato:psionico, bioelettrico:fisico,
//     psionico:fisico, termico:ionico, adattivo:null } -> psionico/fisico/ionico only, NEVER
//     acqua or elettrico/folgore.
//   - nothing seeds session.tile_state_map (it lazy-inits to {} on the first mapped-channel hit,
//     which never comes) -> it stays empty for the whole fight.
// => neither faction ever emits a water OR lightning channel, so tile_state_map never gets a water
//    tile, and the chain (gated by isChainLightningEnabled) is DEAD CODE in a sim encounter. Flag
//    ON == OFF byte-identical. This is a NULL by non-exercise -- STRONGER than ER6 (whose overrun
//    event at least fired; here the gated branch is never entered).
//
// This probe CORROBORATES that claim on realistic content: it runs the busiest available fight (the
// ER6 hardcore measurement point -- 10x10 duo_hardcore, an active reinforced elimination where the
// enemy AI channel-attacks every round) with the chain flag ON vs OFF vs TWO OFF replicates
// (off2/off3 = a noise-floor spread) and reports the graded ON-OFF delta. But the graded A/B is NOT
// the arbiter for a structurally-inert flag: at these magnitudes (sub-1%) a single 40-run arm mean
// has its own sampling jitter, so a tiny ON-OFF delta that grazes the floor is EXPECTED noise, not a
// band. The DECISIVE proof is the companion FIRE-COUNT (d8-chain-fire-count.js), which shows the
// chain fires 0 times -> the flag gates dead code -> the delta is noise by construction. Read this
// probe's numbers THROUGH the fire-count, never against a STOP threshold of their own.
//
// The mechanic's correctness + flag gating + geometric footprint are covered elsewhere (NOT here):
//   - flag gates + chain spread + caps 3/2 + floored shock: tests/services/terrainChainLightning.test.js
//   - live acqua->folgore->electrified wire: tests/api/terrainReactionsWire.test.js
//   - deterministic geometric cap-2-vs-3 delta (the real cap-ratify basis): tools/sim/d8-chain-footprint.js
//
// In-process supertest (createApp, NO prod port, node 22). Sim NOT bit-repro cross node-version
// (read bands as ranges, ~+-0.05). Flag stays OFF in prod -- this measures, never flips.
//
// Usage: node tools/sim/d8-chain-graded-probe.js [N]   (default 40)

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');
const { probeRoster } = require('./overcharge-probe');
const { EFFECTS } = require('./spec-i-gates-probe');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

// Reuse the ER6 hardcore measurement point (busiest realistic fight = max enemy channel-attacks =
// max chances for a terrain reaction IF the chain were reachable). The chain flag is orthogonal to
// stresswave, so we do NOT arm STRESSWAVE here -- a plain active elimination is the cleanest read.
const MP = EFFECTS.er6; // enc_hardcore_reinf_01, biome abisso_vulcanico, pressureStart 30

const CHAIN_FLAG = 'TERRAIN_CHAIN_LIGHTNING_ENABLED';

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

async function runArm(chainOn, N, seedBase) {
  const saved = process.env[CHAIN_FLAG];
  if (chainOn) process.env[CHAIN_FLAG] = 'true';
  else delete process.env[CHAIN_FLAG];

  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const enemiesProto = buildScenarioEnemies(MP.scenario, {});
    if (!enemiesProto || !enemiesProto.length) {
      throw new Error(
        `D8 measurement point "${MP.scenario}" yielded no roster (anti-#14: no fallback)`,
      );
    }
    const runs = [];
    for (let i = 0; i < N; i += 1) {
      const seed = `d8chain-${seedBase + i}`;
      const roster = probeRoster();
      const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(http, {
        roster,
        enemies,
        scenarioId: MP.scenario,
        biomeId: MP.biomeId,
        seed,
        maxRounds: 160,
        pressureStart: MP.pressureStart,
        modulation: 'duo_hardcore',
      });
      const rosterN = (res.rosterIds || []).length || 1;
      runs.push({
        outcome: res.outcome,
        rounds: res.rounds,
        hp_remaining_pct: res.hp_remaining_pct,
        enemy_hp_remaining_pct: res.enemy_hp_remaining_pct,
        units_lost: res.units_lost,
        ko_rate: rosterN ? (res.units_lost || 0) / rosterN : 0,
      });
    }
    return runs;
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
    if (saved === undefined) delete process.env[CHAIN_FLAG];
    else process.env[CHAIN_FLAG] = saved;
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
  };
}

// Graded delta between two arm summaries (a - b).
function armDelta(a, b) {
  return {
    win_rate: Number((a.win_rate - b.win_rate).toFixed(4)),
    enemy_hp_remaining: Number(
      (a.mean_enemy_hp_remaining_pct - b.mean_enemy_hp_remaining_pct).toFixed(4),
    ),
    ko_rate: Number((a.mean_ko_rate - b.mean_ko_rate).toFixed(4)),
    hp_remaining: Number((a.mean_hp_remaining_pct - b.mean_hp_remaining_pct).toFixed(4)),
  };
}

// Verdict: compare the D8 effect (on-off) max-abs channel against the same-config noise floor
// spread. IMPORTANT -- for a structurally-inert flag the graded A/B is NOT the arbiter: at these
// magnitudes (sub-1%) the effect and the noise floor are the same order, so effect>floor is NOT
// evidence of a real band (a single 40-run arm mean has its own sampling jitter). The DECISIVE
// test is the fire-count (tools/sim/d8-chain-fire-count.js: chain_spreads==0). We report the
// magnitudes + whether the effect is distinguishable from noise, and defer the ratify to the count.
function neutralityVerdict(effect, floor) {
  const chans = ['enemy_hp_remaining', 'ko_rate', 'hp_remaining', 'win_rate'];
  const maxAbs = (d) => Math.max(...chans.map((c) => Math.abs(Number(d[c]) || 0)));
  const effectMax = maxAbs(effect);
  const floorMax = maxAbs(floor);
  return {
    effect_max_abs: Number(effectMax.toFixed(4)),
    floor_max_abs: Number(floorMax.toFixed(4)),
    effect_within_floor: effectMax <= floorMax + 1e-9,
    // sub-2x the noise floor => indistinguishable from same-config jitter at N=40 (not a real band).
    same_order_as_noise: effectMax <= floorMax * 2 + 1e-9,
    decisive_proof:
      'tools/sim/d8-chain-fire-count.js (chain_spreads == 0 -> flag inert -> delta is noise)',
  };
}

// Arm config. off2 + off3 are same-flag replicates of off -> TWO independent identical-config
// deltas establish the noise floor as a spread (a single replicate under-samples it: a same-seed
// hp_remaining mean can collide to 4 decimals by luck while avg_rounds still drifts). The D8 effect
// (on-off) is band-neutral iff it does not exceed that floor spread. The DECISIVE proof of
// inertness is the companion fire-count (d8-chain-fire-count.js: 0 chain fires) -- this probe only
// shows the observable deltas are within same-config noise.
const ARMS = {
  off: { chainOn: false },
  off2: { chainOn: false },
  off3: { chainOn: false },
  on: { chainOn: true },
};

const SEED_BASE = 8000;

function parseArgs(argv) {
  const a = { arm: null, n: 40, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--arm') a.arm = String(argv[(i += 1)]);
    else if (t === '--n') a.n = Math.max(1, Number(argv[(i += 1)]) || 40);
    else if (t === '--out') a.out = argv[(i += 1)];
    else if (!t.startsWith('--') && Number.isFinite(Number(t))) a.n = Math.max(1, Number(t));
  }
  return a;
}

// Single-arm mode: run ONE arm in THIS (fresh) process, write its summary to --out. Process
// isolation is the point -- a fresh process has clean module-global combat state, so the arm's
// numbers are drift-free vs the other arms (which run in their own processes). Mirrors the
// spec-i-gates-probe --arms X protocol (the same-process batch contaminates arms with a phantom
// +order-drift; the ER6/#3119 finding).
async function runSingleArm(armName, N, outPath) {
  const armDef = ARMS[armName];
  if (!armDef)
    throw new Error(`unknown --arm "${armName}" (use: ${Object.keys(ARMS).join(' | ')})`);
  if (process.env[CHAIN_FLAG] !== undefined) {
    throw new Error(`${CHAIN_FLAG} is already set -- unset it (the probe owns the toggle)`);
  }
  const runs = await runArm(armDef.chainOn, N, SEED_BASE);
  const payload = {
    arm: armName,
    chain_on: armDef.chainOn,
    n: N,
    summary: summarize(runs),
    node: process.version,
  };
  require('node:fs').writeFileSync(outPath, JSON.stringify(payload, null, 2));
  process.stderr.write(`[d8-chain-graded] arm=${armName} done -> ${outPath}\n`);
}

// Orchestrator mode (default): spawn each arm in an ISOLATED child process, then aggregate. This
// removes the module-global arm-order drift that an in-process 3-arm batch introduces (the on arm,
// running 3rd, otherwise diverges from off purely by sequence position, NOT by the flag).
function orchestrate(N) {
  const { spawnSync } = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd8-chain-'));
  const summaries = {};
  for (const armName of Object.keys(ARMS)) {
    const out = path.join(dir, `${armName}.json`);
    const env = { ...process.env };
    delete env[CHAIN_FLAG]; // the child owns the toggle; never inherit a pre-set flag
    const r = spawnSync(
      process.execPath,
      [__filename, '--arm', armName, '--n', String(N), '--out', out],
      {
        env,
        stdio: ['ignore', 'ignore', 'inherit'], // child logs -> stderr (progress); summary -> file
      },
    );
    if (r.status !== 0) throw new Error(`arm ${armName} child exited ${r.status}`);
    summaries[armName] = JSON.parse(fs.readFileSync(out, 'utf8')).summary;
  }
  const effect = armDelta(summaries.on, summaries.off);
  const floor2 = armDelta(summaries.off2, summaries.off);
  const floor3 = armDelta(summaries.off3, summaries.off);
  // Floor spread = the worse of the two independent same-config deltas per channel.
  const floor = {};
  for (const c of Object.keys(floor2)) {
    floor[c] = Math.abs(floor2[c]) >= Math.abs(floor3[c]) ? floor2[c] : floor3[c];
  }
  return {
    probe: 'd8-chain-graded',
    isolation: 'per-arm child process (drift-free)',
    scenario: MP.scenario,
    biome: MP.biomeId,
    pressure_start: MP.pressureStart,
    modulation: 'duo_hardcore',
    discriminator: 'TERRAIN_CHAIN_LIGHTNING_ENABLED (caps 3/2, maxDepth 3)',
    note: 'chain fires only on a lightning-channel attack onto a water tile; neither faction emits water/lightning channels in-sim -> NON-EXERCISE. Decisive proof = tools/sim/d8-chain-fire-count.js (0 chain fires); this probe shows on-off within same-config noise.',
    chain_OFF: summaries.off,
    chain_OFF2_replicate: summaries.off2,
    chain_OFF3_replicate: summaries.off3,
    chain_ON: summaries.on,
    d8_effect_on_minus_off: effect,
    noise_floor_off2_minus_off: floor2,
    noise_floor_off3_minus_off: floor3,
    noise_floor_spread: floor,
    verdict: neutralityVerdict(effect, floor),
    node: process.version,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.arm) {
    if (!args.out) throw new Error('--arm requires --out <file>');
    return runSingleArm(args.arm, args.n, args.out);
  }
  const report = orchestrate(args.n);
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[d8-chain-graded-probe] FATAL:', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  });
}

module.exports = { runArm, summarize, armDelta, neutralityVerdict };
