'use strict';
// OD-058 D1 N=40 action-economy probe (issue #2531, gate D1).
//
// Measures what the Overcharge verb (#2481: spend 3 SG -> +1 AP this turn, player-only)
// does to the action economy when an AI policy uses it GREEDILY every time the gauge is
// full. Four arms over the SAME seeds (paired, fp-delta-probe #2701 pattern):
//   control  -- adapter status quo (overcharge never called);
//   control2 -- control replicate = per-seed noise floor (see ARMS note);
//   live     -- overcharge:'greedy' (organic SG accrual via sgTracker thresholds);
//   seeded   -- overcharge:'greedy' + initial_sg 3 on every player unit (worst-case
//               first-turn chain, the "rischio chain 2 azioni pesanti" bound).
//
// Scenario: a REAL encounter YAML loaded via scenario-enemies (default
// enc_hardcore_reinf_01, elimination 5/5) -- NOT the weak fallback enemy, so the verb is
// exercised in a fight that can be lost (anti-pattern #14). Roster pins the CANONICAL
// 2-AP budget (SoT 90-FINAL-DESIGN-FREEZE §7.1 "2 AP base, esteso a 3 con spesa 3 SG");
// the full-loop band roster's ap:3 would mismeasure the +1 marginal effect.
//
// GOVERNANCE (L-069 posture, same as meta-band-aggregator): this probe only REPORTS
// the paired deltas as evidence for the D1 gate ("N=40 action-economy probe prima di
// accreditare verso P6"). It never ratifies; the verdict is master-dd's.
//
// Usage:
//   node tools/sim/overcharge-probe.js --runs 40 --seed-base 41000 \
//     --scenario enc_hardcore_reinf_01 --out reports/sim/overcharge-n40-<date>
//
// Caveat (carried into the report): the shared sim policy attacks (1 AP each) and never
// uses cost_ap 2-3 abilities, so the probe measures the +1 AP as "one extra basic attack
// per overcharged turn" -- a LOWER bound on swing. Real players chain heavy abilities
// (cost_ap 3) on the borrowed AP; treat the deltas as the conservative floor.

const fs = require('node:fs');
const path = require('node:path');
const { runEncounter } = require('./combat-adapter');
const { buildScenarioEnemies } = require('./scenario-enemies');

// ---------------------------------------------------------------------------
// Pure statistics
// ---------------------------------------------------------------------------

function meanSdCi(values) {
  const xs = (values || []).map(Number).filter((v) => Number.isFinite(v));
  const n = xs.length;
  if (n === 0) return { mean: null, sd: null, ci95: [null, null], n: 0 };
  const mean = xs.reduce((s, v) => s + v, 0) / n;
  const varSum = xs.reduce((s, v) => s + (v - mean) * (v - mean), 0);
  const sd = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;
  const half = n > 1 ? (1.96 * sd) / Math.sqrt(n) : 0;
  return { mean, sd, ci95: [mean - half, mean + half], n };
}

// Wilson score interval for a binomial rate (robust at the 0/1 edges the sim's
// saturated baselines actually hit -- normal approx would clip outside [0,1]).
function wilson95(successes, n) {
  if (!n) return [null, null];
  const z = 1.96;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return [(centre - margin) / denom, (centre + margin) / denom];
}

function aggregateActionEconomy(runs) {
  const rs = Array.isArray(runs) ? runs : [];
  const n = rs.length;
  const wins = rs.filter((r) => r && r.outcome === 'victory').length;
  return {
    n,
    win_rate: n ? wins / n : null,
    win_ci95: wilson95(wins, n),
    timeouts: rs.filter((r) => r && r.outcome === 'timeout').length,
    rounds: meanSdCi(rs.map((r) => r.rounds)),
    player_attacks: meanSdCi(rs.map((r) => r.playerAttacks)),
    overcharge_uses: meanSdCi(rs.map((r) => r.overchargeUses)),
    survivors: meanSdCi(rs.map((r) => r.survivors)),
  };
}

// Per-seed paired deltas (live - control). Pairs are matched by seed; unmatched
// seeds are dropped (never imputed). Win flips tally the per-seed outcome changes.
function pairDelta(controlRuns, liveRuns) {
  const bySeed = new Map((controlRuns || []).map((r) => [r.seed, r]));
  const roundsD = [];
  const attacksD = [];
  let lossToWin = 0;
  let winToLoss = 0;
  let pairs = 0;
  let cWins = 0;
  let lWins = 0;
  for (const l of liveRuns || []) {
    const c = l ? bySeed.get(l.seed) : undefined;
    if (!c) continue;
    pairs += 1;
    roundsD.push(Number(l.rounds) - Number(c.rounds));
    attacksD.push(Number(l.playerAttacks) - Number(c.playerAttacks));
    const cWin = c.outcome === 'victory';
    const lWin = l.outcome === 'victory';
    if (cWin) cWins += 1;
    if (lWin) lWins += 1;
    if (!cWin && lWin) lossToWin += 1;
    if (cWin && !lWin) winToLoss += 1;
  }
  return {
    pairs,
    rounds_delta: meanSdCi(roundsD),
    attacks_delta: meanSdCi(attacksD),
    flips: { loss_to_win: lossToWin, win_to_loss: winToLoss },
    win_rate_delta: pairs ? (lWins - cWins) / pairs : null,
  };
}

// ---------------------------------------------------------------------------
// Arm runner (in-process app per run, hermetic -- full-loop-batch pattern)
// ---------------------------------------------------------------------------

// Canonical 2-AP probe party (see header). Mirrors the full-loop starters except ap.
function probeRoster() {
  return [
    {
      id: 'hero_a',
      species: 'dune_stalker',
      job: 'skirmisher',
      hp: 30,
      max_hp: 30,
      speed: 5,
      ap: 2,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'hero_b',
      species: 'velox',
      job: 'skirmisher',
      hp: 30,
      max_hp: 30,
      speed: 5,
      ap: 2,
      mod: 18,
      attack_range: 2,
      initiative: 16,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
  ];
}

// One in-process app PER ARM on a PERSISTENT listener + keep-alive fetch. Two
// port-exhaustion traps live here (both hit EADDRINUSE mid-batch on Windows):
//   1. fresh createApp per run (full-loop-batch mitigates with --isolate);
//   2. supertest(app) -- it binds a NEW ephemeral listener per request, so even a
//      shared app burns hundreds of ports per run.
// app.listen(0) once per arm + native fetch (undici keep-alive pool) keeps the
// whole arm on a handful of sockets. 127.0.0.1 EXPLICIT, never "localhost"
// (L-074: Windows resolves localhost via IPv6 first -> ~2s stall per call).
async function runArm({ scenario, runs, seedBase, armOpts, scaling, onRun }) {
  const { createApp } = require('../../apps/backend/app');
  const { app, close } = createApp({ databasePath: null });
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const toRes = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
  const http = {
    post: (p, body) =>
      fetch(`${base}${p}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      }).then(toRes),
    get: (p, query) => {
      const qs = query ? `?${new URLSearchParams(query)}` : '';
      return fetch(`${base}${p}${qs}`).then(toRes);
    },
  };
  const records = [];
  try {
    const enemiesProto = buildScenarioEnemies(scenario, scaling || {});
    if (!enemiesProto || !enemiesProto.length) {
      throw new Error(`scenario "${scenario}" did not yield a YAML roster (anti-#14: no fallback)`);
    }
    for (let i = 0; i < runs; i += 1) {
      const seed = `oc-${seedBase + i}`;
      const roster = probeRoster();
      // Fresh enemy copies per run (the session mutates hp/status in place).
      const enemies = enemiesProto.map((u) => ({ ...u, status: { ...(u.status || {}) } }));
      const initialSg =
        armOpts && armOpts.seedSg ? Object.fromEntries(roster.map((u) => [u.id, 3])) : null;
      // eslint-disable-next-line no-await-in-loop
      const res = await runEncounter(http, {
        roster,
        enemies,
        scenarioId: scenario,
        seed,
        maxRounds: 160,
        ...(armOpts && armOpts.overcharge ? { overcharge: armOpts.overcharge } : {}),
        ...(initialSg ? { initialSg } : {}),
        endSession: true, // #3157 F4: close the session so the log gets session_end
      });
      const rec = {
        seed,
        outcome: res.outcome,
        rounds: res.rounds,
        playerAttacks: res.playerAttacks,
        overchargeUses: res.overchargeUses,
        survivors: (res.survivorIds || []).length,
      };
      records.push(rec);
      if (onRun) onRun(rec, i);
    }
    return records;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (typeof close === 'function') await close().catch(() => {});
  }
}

const ARMS = {
  control: {},
  // Same config as `control`: the per-seed NOISE FLOOR. The /start seed pins the
  // session RNG but residual non-seeded randomness (e.g. reinforcement rolls) keeps
  // same-seed replays from being byte-identical -- 'control2 - control' measures that
  // floor, and a real verb effect must clear it (a13 probe-wipe-1/2 replicate pattern).
  control2: {},
  live: { overcharge: 'greedy' },
  seeded: { overcharge: 'greedy', seedSg: true },
};

function parseArgs(argv) {
  const args = {
    runs: 40,
    seedBase: 41000,
    scenario: 'enc_hardcore_reinf_01',
    out: '',
    commit: process.env.GIT_COMMIT || 'unknown',
    // Difficulty overlay (scenario-enemies knobs: countMult/countAdd/hpMult/hpAdd/
    // modAdd/dcAdd) so the baseline sits OFF the win-rate ceiling (greedy sim
    // saturates authored fights ~1.0 -> a saturated probe hides the win-rate swing).
    // Measurement-point choice only, NOT a band ratification (L-069).
    scaling: {},
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--runs') args.runs = Math.max(1, Number(next()));
    else if (tok === '--seed-base') args.seedBase = Number(next());
    else if (tok === '--scenario') args.scenario = next();
    else if (tok === '--out') args.out = next();
    else if (tok === '--commit') args.commit = next();
    else if (tok === '--scaling') args.scaling = JSON.parse(next());
  }
  return args;
}

function fmt(x, digits = 2) {
  return x === null || x === undefined || Number.isNaN(x) ? 'n/a' : Number(x).toFixed(digits);
}

function renderReport({ args, summaries, deltas }) {
  const lines = [];
  lines.push(`# Overcharge action-economy probe (OD-058 D1, N=${args.runs})`);
  lines.push('');
  lines.push(
    `Scenario \`${args.scenario}\` | scaling ${JSON.stringify(args.scaling || {})} | roster 2x skirmisher ap:2 (canon §7.1) | commit \`${args.commit}\` | seed base ${args.seedBase}.`,
  );
  lines.push('');
  lines.push('| arm | n | win rate (Wilson CI95) | rounds | player attacks | overcharge uses |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [arm, s] of Object.entries(summaries)) {
    lines.push(
      `| ${arm} | ${s.n} | ${fmt(s.win_rate)} [${fmt(s.win_ci95[0])}, ${fmt(s.win_ci95[1])}] | ${fmt(
        s.rounds.mean,
        1,
      )} +/- ${fmt(s.rounds.sd, 1)} | ${fmt(s.player_attacks.mean, 1)} | ${fmt(
        s.overcharge_uses.mean,
      )} |`,
    );
  }
  lines.push('');
  lines.push('## Paired deltas (same seeds)');
  lines.push('');
  lines.push(
    '| pair | pairs | win-rate delta | rounds delta (CI95) | attacks delta (CI95) | flips L->W / W->L |',
  );
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [name, d] of Object.entries(deltas)) {
    lines.push(
      `| ${name} | ${d.pairs} | ${fmt(d.win_rate_delta)} | ${fmt(d.rounds_delta.mean, 1)} [${fmt(
        d.rounds_delta.ci95[0],
        1,
      )}, ${fmt(d.rounds_delta.ci95[1], 1)}] | ${fmt(d.attacks_delta.mean, 1)} [${fmt(
        d.attacks_delta.ci95[0],
        1,
      )}, ${fmt(d.attacks_delta.ci95[1], 1)}] | ${d.flips.loss_to_win} / ${d.flips.win_to_loss} |`,
    );
  }
  lines.push('');
  lines.push('Read the verb rows AGAINST the noise-floor row: the session seed pins the start RNG');
  lines.push(
    'but residual non-seeded randomness keeps same-seed replays from being identical, so a',
  );
  lines.push('real effect must clear the control2-control floor.');
  lines.push('');
  lines.push('Caveat: shared sim policy = basic attacks only (1 AP); deltas are the conservative');
  lines.push(
    'floor of the +1 AP swing (real players chain cost_ap 3 abilities on the borrowed AP).',
  );
  lines.push('Evidence only -- ratification verso P6 = master-dd (L-069).');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  // Hermetic gates (full-loop-batch pattern): no orchestrator spawn, no status poll.
  process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = process.env.IDEA_ENGINE_STUB_ORCHESTRATOR || '1';
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH =
    process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH || '1';
  const args = parseArgs(process.argv);
  const outDir = args.out || path.join('reports', 'sim', 'overcharge-probe');
  const armRuns = {};
  for (const [arm, armOpts] of Object.entries(ARMS)) {
    const dir = path.join(outDir, arm);
    fs.mkdirSync(dir, { recursive: true });
    // eslint-disable-next-line no-await-in-loop
    const runs = await runArm({
      scenario: args.scenario,
      runs: args.runs,
      seedBase: args.seedBase,
      armOpts,
      scaling: args.scaling,
      onRun: (rec, i) =>
        process.stdout.write(
          `[overcharge-probe] ${arm} ${i + 1}/${args.runs} seed=${rec.seed} outcome=${rec.outcome} uses=${rec.overchargeUses}\n`,
        ),
    });
    armRuns[arm] = runs;
    fs.writeFileSync(path.join(dir, 'runs.jsonl'), runs.map((r) => JSON.stringify(r)).join('\n'));
    fs.writeFileSync(
      path.join(dir, 'summary.json'),
      JSON.stringify({ arm, args, summary: aggregateActionEconomy(runs) }, null, 2),
    );
  }
  const summaries = Object.fromEntries(
    Object.entries(armRuns).map(([arm, runs]) => [arm, aggregateActionEconomy(runs)]),
  );
  const deltas = {
    'control2 - control (noise floor)': pairDelta(armRuns.control, armRuns.control2),
    'live - control': pairDelta(armRuns.control, armRuns.live),
    'seeded - control': pairDelta(armRuns.control, armRuns.seeded),
  };
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify({ args, summaries, deltas }, null, 2),
  );
  fs.writeFileSync(path.join(outDir, 'report.md'), renderReport({ args, summaries, deltas }));
  process.stdout.write(`[overcharge-probe] done -> ${outDir}\n`);
}

module.exports = { aggregateActionEconomy, pairDelta, meanSdCi, wilson95, probeRoster };

if (require.main === module) {
  main().catch((err) => {
    console.error('[overcharge-probe] FATAL:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
