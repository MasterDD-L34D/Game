'use strict';
// fase-2b full-loop-batch. Runs K full-loop AI-playtest sims (different seeds) IN-PROCESS
// (createApp({databasePath:null}) + supertest -- the runner is in-process testable, unlike
// the tunnel-based batch-ai-runner.js), aggregates them via meta-band-aggregator, and emits
// JSONL (one line per run) + summary.json + report.md with per-run provenance (seed +
// commit + policy + scenario-chain + flags, spec §10 DoD).
//
// Usage:
//   node tools/sim/full-loop-batch.js --runs 40 --branch cave_path --policy greedy
//   GIT_COMMIT=$(git rev-parse HEAD) META_NETWORK_ROUTING=true node tools/sim/full-loop-batch.js --runs 40
//
// The PROVISIONAL bands (meta-band-aggregator) are NOT ratified: master-dd ratifies the
// exact numbers post-N=40 (L-069). This batch produces the PLACEMENT + report for that
// human verdict; it never claims the bands as canon.

// Make the batch HERMETIC: each run spins a fresh createApp, so at N=40 the per-app status
// refresh + orchestrator worker pool open enough 127.0.0.1 connections to hit EADDRINUSE
// mid-batch. Stub the orchestrator (no Python worker spawn -- the full loop never generates
// species) and disable the status refresh (no background poll) so N>=40 runs reliably. Same
// gates the test suites set (app.js:341 + app.js:434). Respect an explicit override.
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = process.env.IDEA_ENGINE_STUB_ORCHESTRATOR || '1';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH =
  process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH || '1';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { runFullLoop } = require('./full-loop-runner');
const { aggregate, PROVISIONAL_BANDS } = require('./meta-band-aggregator');
const { aggregatePersonality, renderPersonalityMd } = require('./personality-axes-aggregator');
const { aggregateA13, renderA13Md } = require('./a13-wound-aggregator');
const greedyPolicy = require('./greedy-policy');
const { makeMbtiPolicy } = require('./mbti-policy');
const { traverse } = require('./meta-network-driver');

// Canonical cave_path starter party: a dune_stalker + velox authored squad. The Nido
// recruits grow it as chapters clear. job = `skirmisher` (slice b): a real perk-job
// (perks.yaml AND jobs.yaml) so the PI sink reaches the engine pick (the prior `stalker` was
// neither -> /api/progression/:id/pick 409'd before the PI gate, piSpentTotal stuck at 0).
// #2691: `speed` populated so the starters exercise the personality agile_robust axis too
// (dune_stalker = base_stats.yaml 5; velox = fast-skirmisher default 5). Recruits get their
// speed from the morphotype adapter (ecologyCombatAdapter.speedForMorphotype).
const DEFAULT_ROSTER = [
  {
    id: 'hero_a',
    species: 'dune_stalker',
    job: 'skirmisher',
    hp: 30,
    max_hp: 30,
    speed: 5,
    ap: 3,
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
    ap: 3,
    mod: 18,
    attack_range: 2,
    initiative: 16,
    position: { x: 1, y: 2 },
    controlled_by: 'player',
    status: {},
  },
];

function parseArgs(argv) {
  const args = {
    runs: 5,
    seedBase: 1000,
    branch: 'cave_path',
    policy: 'greedy',
    maxChapters: 15,
    out: '',
    commit: process.env.GIT_COMMIT || 'unknown',
    // --isolate: run each seed in its own child process (Windows native-crash mitigation).
    // --child-seed <n>: internal -- the per-seed child entry the isolate parent spawns.
    isolate: false,
    childSeed: null,
    // --a13: A13 wound N=40 evidence mode (campaign-linked sessions + /end + bounded
    // retries). Default OFF = the band batch is byte-identical to the status quo.
    a13: false,
    a13MaxRetries: 1,
    // --gate: exit 1 if any ratified meta band-metric is out of band (CI gate mode).
    // Default OFF = diagnostic mode (always exit 0 on completion). The batch is NOT
    // bit-deterministic per seed (recruit/mate/attrition vary), so this is a STATISTICAL
    // gate -- the bands carry margin; use it warn-only until the runner is fully seed-pinned.
    gate: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    switch (tok) {
      case '--runs':
        args.runs = Math.max(1, Number(next()));
        break;
      case '--seed-base':
        args.seedBase = Number(next());
        break;
      case '--branch':
        args.branch = next();
        break;
      case '--policy':
        args.policy = next();
        break;
      case '--max-chapters':
        args.maxChapters = Math.max(1, Number(next()));
        break;
      case '--out':
        args.out = next();
        break;
      case '--commit':
        args.commit = next();
        break;
      case '--isolate':
        args.isolate = true;
        break;
      case '--child-seed':
        args.childSeed = next();
        break;
      case '--a13':
        args.a13 = true;
        break;
      case '--a13-max-retries':
        args.a13MaxRetries = Math.max(0, Number(next()));
        break;
      case '--gate':
        args.gate = true;
        break;
      default:
        if (tok && tok.startsWith('--')) console.warn(`unknown arg: ${tok}`);
    }
  }
  return args;
}

// Per-run provenance (spec §10 DoD): everything needed to reproduce the run + know what
// was active. flags captures the test-context env (e.g. META_NETWORK_ROUTING for fase-2c).
function buildProvenance({ runId, seed, commit, policy, branch, scenarioChain, flags } = {}) {
  return {
    run_id: runId,
    seed: String(seed),
    commit: commit || 'unknown',
    policy: policy || 'greedy',
    branch: branch || null,
    scenario_chain: scenarioChain || [],
    flags: flags || {},
  };
}

// Default real runner: a fresh in-process backend per run (isolated meta/campaign stores),
// AI plays the whole loop, app closed after. Lazy-requires createApp + supertest so the
// pure helpers above don't drag the backend in when only they are imported.
async function runOneReal(runOpts) {
  const { createApp } = require('../../apps/backend/app');
  const request = require('supertest');
  const { app, close } = createApp({ databasePath: null });
  const http = {
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
  try {
    return await runFullLoop(http, runOpts);
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

// Resolve the --policy value into a { policy (object), label (string) } pair. Accepts a
// string ('greedy' | 'mbti' | 'mbti:ESFP') or an already-built policy object. Anything
// unrecognised falls back to greedy (never throws).
function resolvePolicy(p) {
  if (p && typeof p === 'object' && typeof p.chooseRecruits === 'function') {
    return { policy: p, label: p.mbti ? `mbti:${p.mbti}` : 'custom' };
  }
  const s = String(p || 'greedy').toLowerCase();
  if (s === 'mbti' || s.startsWith('mbti:')) {
    const type = s.includes(':') ? String(p).split(':')[1].toUpperCase() : 'INTJ';
    const policy = makeMbtiPolicy(type);
    return { policy, label: `mbti:${policy.mbti}` };
  }
  return { policy: greedyPolicy, label: 'greedy' };
}

// Run K sims with monotonic deterministic seeds. `runOne` is injectable (tests pass a fake;
// CLI uses runOneReal). Resolves the policy ONCE and injects the policy object into each
// run (so --policy mbti:ESFP actually plays as ESFP), recording the label in provenance.
// Attaches provenance to each result. Sequential: each run owns a fresh app, so there is no
// shared-store contention.
async function runBatch(opts = {}) {
  const {
    runs = 5,
    seedBase = 1000,
    branch = 'cave_path',
    policy = 'greedy',
    maxChapters = 15,
    commit = process.env.GIT_COMMIT || 'unknown',
    roster = DEFAULT_ROSTER,
    playerPrefix = 'fl_batch',
    flags = currentFlags(),
    enemyScaling = calibrationScaling(),
    peEarned = peEarnedConfig(),
    a13 = false,
    a13MaxRetries = 1,
    runOne = runOneReal,
    onProgress,
  } = opts;
  const { policy: policyImpl, label: policyLabel } = resolvePolicy(policy);
  const results = [];
  for (let i = 0; i < runs; i += 1) {
    const seed = String(seedBase + i);
    const runOpts = {
      playerId: `${playerPrefix}_${i}`,
      roster,
      branchKey: branch,
      seed,
      maxChapters,
      policy: policyImpl,
      enemyScaling,
      peEarned,
      ...(a13 ? { a13: true, a13MaxRetries } : {}),
    };
    const res = await runOne(runOpts);
    const scenarioChain = (res.chapters || []).map((c) => c.encounter);
    res.provenance = buildProvenance({
      runId: i,
      seed,
      commit,
      policy: policyLabel,
      branch,
      scenarioChain,
      flags,
    });
    results.push(res);
    if (typeof onProgress === 'function') onProgress(i + 1, runs, res);
  }
  return results;
}

// fase-2c difficulty calibration (band-report Finding 1: completion_rate 1.0 OOB). The band
// batch fights the scaled-enemy chapters (enc_tutorial_01 + enc_savana_01, both 2x base) at
// this difficulty so completion_rate lands in the provisional 0.4-0.7 band -- the faithful
// 2-unit fight is crushed deterministically by the 30-HP starter party. The numbers below
// are baked (the band report reproduces with `node full-loop-batch.js`, no special env);
// each FL_ENEMY_* env var overrides one knob for the N=10->N=40 bisection (L-069/L-072/L-073:
// N=10 probes direction, N=40 ratifies). Count is the decisive lever (damage ~1-3/hit means
// 2 units can never out-race a 60-HP party; more units can).
function calibrationScaling() {
  const num = (name, d) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) ? v : d;
  };
  // Baked calibration (N=10 probe -> N=40 ratify, L-069): countMult 5 + hpAdd 3 = the gating
  // elimination missions (enc_tutorial_01 + enc_savana_01, both 2x base) spawn 10 sistema
  // units at ~10 HP (= 100 total HP). The 30-HP starter party clears ~100 HP within the
  // 40-round mission limit ~60% of the time; the one-attempt-per-mission cap (full-loop-runner)
  // turns the other ~40% (a mission that runs out the clock) into a campaign failure ->
  // completion_rate lands in the provisional 0.4-0.7 band. Each FL_ENEMY_* env var overrides
  // one knob for re-calibration. (hpAdd not hpMult: integer per-unit HP is the natural dial.)
  //
  // Graph-mode re-calibration (META_NETWORK_ROUTING=true, REAL draft rosters via option-C #2603):
  // once the draft node-encounters fight their REAL authored rosters (not the weak-fixed fallback),
  // the static overlay countMult 5 + hpAdd 4 is brutal (5x an authored hardcore roster -> 0/10).
  // The real rosters are already substantial, so the graph overlay drops to countMult 3 + hpAdd 2 +
  // dcAdd 1 (dcAdd = the fine knob; the razor-steep HP curve cannot pin a tight centre on its own --
  // hpAdd 2->3 jumps ~0.77->~0.2). N=40 lands all three policies in the tight 0.4-0.7 band (greedy
  // 0.675 / ESFP 0.70 / INTJ 0.60). KEY: the original 0/10 was a CALIBRATION ARTIFACT of the stale
  // fallback-tuned overlay, NOT an inherent climax gate -- the terminal climax is winnable, so NO
  // retry-allowance mechanic is needed (option-C Phase 2 dropped).
  //
  // Post-#2669 re-calibration (OA2 objective-completion fix): A/B/C restored survival/capture/
  // sabotage/escape completion (they used to fall through to elimination), so at the old static
  // cm5/hp3 the AI completed MORE -> completion_rate rose ~0.6 -> 0.825 (OOB-high). Re-tuned the
  // static default UP via the FINE knobs (dcAdd + modAdd, both 1): hpAdd/countMult are too coarse
  // (hpAdd 4 -> 0.4 low-edge, countMult 6 -> 0.0). cm5/hp3/dcAdd1/modAdd1 lands greedy N=49 at
  // completion 0.51 -- dead centre of the ratified 0.4-0.7 band, all 7 meta-metrics in-band
  // (master-dd ratify 2026-06-09, L-069). NB graph-mode (cm3/hp2/dc1) is NOT re-verified post-fix
  // -> re-run META_NETWORK_ROUTING=true N=40 before trusting its band.
  const graphMode = process.env.META_NETWORK_ROUTING === 'true';
  return {
    countMult: num('FL_ENEMY_COUNT_MULT', graphMode ? 3 : 5),
    countAdd: num('FL_ENEMY_COUNT_ADD', 0),
    hpMult: num('FL_ENEMY_HP_MULT', 1),
    hpAdd: num('FL_ENEMY_HP_ADD', graphMode ? 2 : 3),
    modAdd: num('FL_ENEMY_MOD_ADD', graphMode ? 0 : 1),
    dcAdd: num('FL_ENEMY_DC_ADD', 1),
  };
}

// fase-2c PI sink (slice b): the per-victory PE the runner converts to PI (SoT 5:1) to spend
// on a hybrid perk pick. The faithful runner default (3) never affords the 5-PI pick over the
// arc; the band batch raises it (FL_PE_EARNED, default 8) so a run clearing >=4 chapters
// accrues >=32 PE = 6 PI >= cost. Paired with the skirmisher (perk-job) DEFAULT_ROSTER the
// sink is actually exercised (the non-perk 'stalker' 409'd before reaching the PI gate).
function peEarnedConfig() {
  const v = Number(process.env.FL_PE_EARNED);
  return Number.isFinite(v) && v > 0 ? v : 8;
}

// --- Subprocess isolation (Windows native-crash mitigation, --isolate) ------------------
// The in-process batch spins a fresh createApp per run; at the calibrated difficulty (6-8
// sistema units/fight) the accumulated per-round trait-effect + AI work trips a Windows
// native crash (0xC0000409 STATUS_STACK_BUFFER_OVERRUN) mid-batch -- the same flakiness the
// N=40 baseline hit (band report, ISTJ 3x). `--isolate` runs each seed in its OWN node
// process (fresh memory == immune to the accumulation) and retries on a crash, so the band
// batch reproduces reliably at the calibrated difficulty. Pure retry/collect logic (spawn +
// read injected) is unit-tested; the real spawn re-invokes this file in `--child-seed` mode.
function runChildSeed(seed, { spawn, readResult, retries = 3 } = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      spawn(seed); // throws (non-zero child exit) on a native crash
      const result = readResult(seed);
      if (result && typeof result === 'object') return { ok: true, result, attempts: attempt };
      lastErr = new Error('child produced no parseable result');
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, attempts: retries, error: String((lastErr && lastErr.message) || lastErr) };
}

// runOne replacement (injected into runBatch) that runs each seed in an isolated child
// process. Returns the runFullLoop result shape on success; a crash-after-retries sentinel
// (completed:false + _crashed) that main() filters OUT of N (logged, never silently counted).
function makeChildRunOne({
  policyLabel = 'greedy',
  branch = 'cave_path',
  maxChapters = 15,
  a13 = false,
  a13MaxRetries = 1,
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-iso-'));
  return async (runOpts) => {
    const seed = String(runOpts.seed);
    const outFile = path.join(dir, `run-${seed}.json`);
    const spawn = () => {
      try {
        fs.rmSync(outFile, { force: true });
      } catch {
        /* fresh slate per attempt */
      }
      // Inherit env so the child sees the same FL_ENEMY_*/FL_PE_EARNED calibration; drop the
      // child's stdio (backend logs are noise + the result travels via the out file).
      execFileSync(
        process.execPath,
        [
          __filename,
          '--child-seed',
          seed,
          '--policy',
          policyLabel,
          '--branch',
          branch,
          '--max-chapters',
          String(maxChapters),
          '--out',
          outFile,
          ...(a13 ? ['--a13', '--a13-max-retries', String(a13MaxRetries)] : []),
        ],
        { env: process.env, stdio: 'ignore', maxBuffer: 64 * 1024 * 1024 },
      );
    };
    const readResult = () => JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const r = runChildSeed(seed, { spawn, readResult });
    if (r.ok) return r.result;
    console.warn(
      `[isolate] seed ${seed} crashed after ${r.attempts} attempts (${r.error}) -- EXCLUDED from N (logged, not silently counted)`,
    );
    return { completed: false, _crashed: true, chapters: [], economy: {} };
  };
}

// The per-seed child entry the isolate parent spawns: one full loop, result written as JSON
// to --out (the parent reads it back). Same config path as the in-process runOne (calibration
// + PE from env), so an isolated batch is identical to the in-process one minus the crash.
async function runChildOnce(args) {
  const { policy: policyImpl } = resolvePolicy(args.policy);
  const res = await runOneReal({
    playerId: `fl_iso_${args.childSeed}`,
    roster: DEFAULT_ROSTER,
    branchKey: args.branch,
    seed: String(args.childSeed),
    maxChapters: args.maxChapters,
    policy: policyImpl,
    enemyScaling: calibrationScaling(),
    peEarned: peEarnedConfig(),
    ...(args.a13 ? { a13: true, a13MaxRetries: args.a13MaxRetries } : {}),
  });
  const out = args.out || path.join(os.tmpdir(), `fl-child-${args.childSeed}.json`);
  fs.writeFileSync(out, JSON.stringify(res));
}

// The env flags the report should record alongside each run: the fase-2c routing test-
// context PLUS the hermetic stubs this batch applies (Codex #2570 P2 -- the stubbed runtime
// differs from an unstubbed run, so provenance must capture it for reproducibility).
function currentFlags() {
  return {
    META_NETWORK_ROUTING: process.env.META_NETWORK_ROUTING || 'false',
    IDEA_ENGINE_STUB_ORCHESTRATOR: process.env.IDEA_ENGINE_STUB_ORCHESTRATOR || '0',
    IDEA_ENGINE_DISABLE_STATUS_REFRESH: process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH || '0',
    // A13 N=40 control arm: '1' = read-side amplifier neutralized (wound still persists).
    // Provenance MUST carry it -- it is the A/B discriminator between the two batches.
    A13_WOUND_READ_DISABLED: process.env.A13_WOUND_READ_DISABLED || '0',
  };
}

// Compact one run-result into a single JSONL line (per-run record).
function runToJsonl(r) {
  const chapters = r.chapters || [];
  return {
    run_id: r.provenance && r.provenance.run_id,
    seed: r.provenance && r.provenance.seed,
    completed: r.completed === true,
    chapters: chapters.length,
    outcome_chain: chapters.map((c) => c.outcome),
    scenario_chain:
      (r.provenance && r.provenance.scenario_chain) || chapters.map((c) => c.encounter),
    initial_roster: r.initialRosterSize,
    survivors: (r.finalRoster || []).length,
    recruited: (r.recruited || []).length,
    economy_recruited: (r.economyRecruited || []).length,
    offspring: r.offspring,
    // Per-run breeding crosses (parent-species pairs) for traceability of lineage_diversity.
    offspring_lineages: (r.offspringLineages || []).map((l) => l && l.parentSpecies),
    economy: r.economy,
    violations: r.violations || [],
    meta_violations: r.metaViolations || [],
    // Opt 3 N=40 evidence (#2679): per-mission per-unit personality axes
    // (additive; [] on older runners / capture failures).
    personality_samples: r.personalitySamples || [],
    // A13 N=40 evidence: per-attempt wound trail (only when the runner ran in a13
    // mode -- chapters then carry attempt/biome fields). Absent otherwise.
    ...(chapters.some((c) => c && 'attempt' in c)
      ? {
          a13_chapters: chapters.map((c) => ({
            encounter: c.encounter,
            outcome: c.outcome,
            attempt: c.attempt,
            biome_id: c.biome_id,
            biome_wounded: c.biome_wounded,
          })),
        }
      : {}),
    provenance: r.provenance,
  };
}

// Default routing-coverage walk plan. A BADLANDS-only plan never reaches CRYOSTEPPE, so the
// winter-gated bridge would stay unexercised (Codex #2572 P2). Starting at CRYOSTEPPE makes
// the season gate decisive: in winter step 1 takes the CRYOSTEPPE -> FORESTA_TEMPERATA
// bridge; without a season it is locked and the walk diverges to BADLANDS. The trio gives a
// baseline + the bridge crossed + the bridge locked (divergence proof).
const ROUTING_WALKS = [
  { start: 'BADLANDS', season: null },
  { start: 'CRYOSTEPPE', season: 'winter' },
  { start: 'CRYOSTEPPE', season: null },
];

// fase-2c routing wiring: exercise the GAP-C meta-network routing graph in test-context
// (only when META_NETWORK_ROUTING=true). Spins one in-process backend and traverses the
// graph for each planned walk (default = ROUTING_WALKS, which crosses the season-gated
// bridge), returning coverage. Lazy-requires createApp + supertest (same hermetic deal as
// runOneReal). Never touches the live campaign -> band-safe.
async function runRoutingCoverage({ walks = ROUTING_WALKS } = {}) {
  const { createApp } = require('../../apps/backend/app');
  const request = require('supertest');
  const { app, close } = createApp({ databasePath: null });
  const http = {
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
  try {
    const runs = [];
    for (const w of walks) runs.push(await traverse(http, { start: w.start, season: w.season }));
    return { enabled: runs.every((r) => r.enabled), walks, runs };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function buildSummary(results, config = {}, routing) {
  const agg = aggregate(results);
  const summary = {
    config,
    n: agg.n,
    provisional: agg.provisional,
    metrics: agg.metrics,
    completion: {
      completed: (results || []).filter((r) => r && r.completed === true).length,
      total: agg.n,
    },
  };
  // fase-2c: routing-graph coverage when META_NETWORK_ROUTING is on -> the flag stops being
  // a no-op for the batch report (closes the band-report Finding 4). Omitted when off.
  if (routing) summary.routing = routing;
  // Opt 3 N=40 evidence (#2679): personality-axes distribution aggregate, only
  // when the runner captured samples (additive; band consumers unaffected).
  const personality = aggregatePersonality(results);
  if (personality.n_samples > 0) summary.personality = personality;
  // A13 N=40 evidence: wound-exposure aggregate, only when the batch ran in a13
  // mode (config.a13) -- a default batch's summary is unchanged.
  if (config.a13) summary.a13 = aggregateA13(results);
  return summary;
}

function band(metric) {
  if (!metric) return '-';
  if (!metric.range) return 'composite';
  const [lo, hi] = metric.range;
  if (hi === null || hi === undefined) return `>= ${lo}`;
  return `${lo} - ${hi}`;
}

function metricValue(metric) {
  if (!metric) return '-';
  // lineage_diversity (its own gated metric): show the distinct-cross count + the dominant cross
  // (the policy-sensitive breeding signal). Checked before the generic `value` branch because it
  // also carries a numeric `value`.
  if (metric.dominant_lineages !== undefined)
    return `${metric.value} crosses, dominant ${metric.dominant_lineages.join('/') || 'none'}`;
  if (metric.value !== undefined) return metric.value;
  if (metric.build_power_drift !== undefined)
    return `drift ${metric.build_power_drift} (pe ${metric.pe_earned_avg}, bp ${metric.build_power_avg})`;
  if (metric.recruit_rate !== undefined)
    return `recruit ${metric.recruit_rate}, aff ${metric.affinity_proven_rate}, mate ${metric.mating_rate}`;
  if (metric.offspring_avg !== undefined) return `offspring ${metric.offspring_avg}`;
  if (metric.dominant_roles !== undefined)
    return `dominant ${metric.dominant_roles.join('/') || 'none'}, ${metric.distinct_roles} roles`;
  return '-';
}

function buildReport(summary) {
  const m = summary.metrics || {};
  const lines = [];
  lines.push('# Full-loop meta band-metrics');
  lines.push('');
  lines.push(
    `Runs: **${summary.n}** | Completed: **${summary.completion.completed}/${summary.completion.total}** | Policy: \`${summary.config.policy || 'greedy'}\` | Branch: \`${summary.config.branch || 'cave_path'}\``,
  );
  lines.push('');
  // Adaptive banner: once the aggregate flips `provisional` to false (master-dd ratified the
  // bands, L-069), a regenerated report says RATIFIED instead of PROVISIONAL -- so it never
  // contradicts the ratified decision sheet in the playtest doc (Codex #2580 P2).
  const bandStatus = summary.provisional ? 'PROVISIONAL' : 'RATIFIED (master-dd, L-069)';
  lines.push(`> **${bandStatus}** -- ${PROVISIONAL_BANDS.note}`);
  lines.push('');
  lines.push('| Metric | Value | Band | In band |');
  lines.push('|---|---|---|:---:|');
  for (const k of [
    'completion_rate',
    'roster_attrition',
    'economy_flow',
    'relationship_progress',
    'offspring_viability',
    'lineage_diversity',
    'roster_composition',
  ]) {
    const metric = m[k];
    lines.push(
      `| ${k} | ${metricValue(metric)} | ${band(metric)} | ${metric && metric.in_band ? '✅' : '❌'} |`,
    );
  }
  lines.push('');
  // Reuse the aggregator's economy_flow note (it already distinguishes exercised /
  // unaffordable / blocked / wired) instead of a hard-coded claim that would go stale
  // (Codex #2574 P2: the PI sink is now wired, so "NOT wired" was wrong).
  if (m.economy_flow && m.economy_flow.note) {
    lines.push(`> Note (economy_flow): ${m.economy_flow.note}`);
    lines.push('');
  }
  if (summary.routing && Array.isArray(summary.routing.runs)) {
    lines.push('## META_NETWORK_ROUTING coverage (GAP-C, test-context)');
    lines.push('');
    lines.push('| Start | Season | Nodes visited | Reasons | Terminal |');
    lines.push('|---|---|---:|---|---|');
    for (const run of summary.routing.runs) {
      const cov = run.coverage || {};
      lines.push(
        `| ${run.start} | ${run.season || 'none'} | ${cov.nodes_visited || 0} | ${(cov.reasons || []).join(', ')} | ${run.terminalReason} |`,
      );
    }
    lines.push('');
    lines.push(
      '> Flag exercised in TEST only -- the live act/chapter campaign is unchanged; PROD-enable of meta-network routing is a separate master-dd verdict.',
    );
    lines.push('');
  }
  // Opt 3 N=40 evidence (#2679): personality-axes distribution section, only
  // when the summary carries samples (additive; older batches render unchanged).
  if (summary.personality) {
    const section = renderPersonalityMd(summary.personality);
    if (section) {
      lines.push(section);
    }
  }
  // A13 N=40 evidence: wound-exposure section (a13 batches only). The banner says
  // which ARM this batch is (control = read-side disabled) so the two artifacts
  // cannot be confused.
  if (summary.a13) {
    const disabled =
      summary.config && summary.config.flags
        ? summary.config.flags.A13_WOUND_READ_DISABLED === '1'
        : false;
    lines.push(
      `> A13 arm: **${disabled ? 'CONTROL (read-side disabled)' : 'WOUND-LIVE (PRESSURE_PER_BIOME=1)'}**`,
    );
    lines.push('');
    lines.push(renderA13Md(summary.a13));
  }
  lines.push('Per-run records: `runs.jsonl`. Aggregate: `summary.json`.');
  lines.push('');
  return lines.join('\n');
}

function writeArtifacts(outDir, { results, summary, report }) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonlPath = path.join(outDir, 'runs.jsonl');
  const lines = (results || []).map((r) => JSON.stringify(runToJsonl(r)));
  fs.writeFileSync(jsonlPath, lines.length ? lines.join('\n') + '\n' : '');
  const summaryPath = path.join(outDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  const reportPath = path.join(outDir, 'report.md');
  fs.writeFileSync(reportPath, report);
  return { jsonlPath, summaryPath, reportPath };
}

async function main() {
  const args = parseArgs(process.argv);
  // Isolate child entry: run ONE seed + write its result; the parent reads it back.
  if (args.childSeed != null) return runChildOnce(args);
  const flags = currentFlags();
  const enemyScaling = calibrationScaling();
  const peEarned = peEarnedConfig();
  const outDir =
    args.out ||
    path.join(
      os.tmpdir(),
      'full-loop-band',
      `batch-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    );
  console.log(
    `FULL-LOOP BATCH: ${args.runs} runs | branch=${args.branch} policy=${args.policy} seedBase=${args.seedBase} commit=${args.commit} isolate=${args.isolate} a13=${args.a13}${args.a13 ? `(maxRetries=${args.a13MaxRetries})` : ''} peEarned=${peEarned} flags=${JSON.stringify(flags)} enemyScaling=${JSON.stringify(enemyScaling)}`,
  );
  const t0 = Date.now();
  const runOne = args.isolate
    ? makeChildRunOne({
        policyLabel: args.policy,
        branch: args.branch,
        maxChapters: args.maxChapters,
        a13: args.a13,
        a13MaxRetries: args.a13MaxRetries,
      })
    : runOneReal;
  const rawResults = await runBatch({
    ...args,
    flags,
    enemyScaling,
    peEarned,
    runOne,
    onProgress: (done, total, res) => {
      const outcome = res._crashed
        ? 'CRASHED'
        : res.completed
          ? 'completed'
          : (res.chapters || []).slice(-1)[0]?.outcome || 'incomplete';
      process.stdout.write(
        `[${done}/${total}] ${outcome} chapters=${(res.chapters || []).length}\n`,
      );
    },
  });
  // Crashed-after-retries seeds are EXCLUDED from N (logged, never silently counted as a
  // non-completion -- that would bias completion_rate down). With fresh-process retries this
  // is ~0; surfaced honestly when not.
  const crashed = rawResults.filter((r) => r && r._crashed).length;
  const results = rawResults.filter((r) => !(r && r._crashed));
  if (crashed) {
    console.warn(
      `[isolate] ${crashed}/${rawResults.length} seeds crashed after retries -> EXCLUDED from N (N=${results.length}); re-run those seeds to fill the batch`,
    );
  }
  // fase-2c: when the routing flag is on, exercise the meta-network graph (test-context)
  // so the flag is no longer a no-op for the report (band-report Finding 4).
  let routing;
  if (flags.META_NETWORK_ROUTING === 'true') {
    routing = await runRoutingCoverage();
    console.log(
      `routing coverage: ${routing.runs.map((r) => `${r.start}/${r.season || 'none'}=${r.coverage.nodes_visited}n`).join(' ')}`,
    );
  }
  const summary = buildSummary(
    results,
    {
      runs: args.runs,
      branch: args.branch,
      policy: args.policy,
      commit: args.commit,
      flags,
      enemyScaling,
      // Persist the PE-per-victory calibration too (Codex #2576 P2): FL_PE_EARNED changes PE
      // totals + pi_sink affordability, so summary.config must carry it or two reports with
      // the same enemyScaling could not be told apart / reproduced from summary.json.
      peEarned,
      // A13 mode + retry bound: summary.a13 gates on this, and the two N=40 arms are
      // only reproducible if the config records the retry rules they shared.
      a13: args.a13,
      a13MaxRetries: args.a13MaxRetries,
    },
    routing,
  );
  const report = buildReport(summary);
  const paths = writeArtifacts(outDir, { results, summary, report });
  const wallSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n=== BATCH COMPLETE ===');
  console.log(`Wall: ${wallSec}s | Out: ${outDir}`);
  console.log(`Completion: ${summary.completion.completed}/${summary.completion.total}`);
  for (const k of Object.keys(summary.metrics)) {
    const metric = summary.metrics[k];
    console.log(`  ${k}: ${metricValue(metric)} band=${band(metric)} in_band=${metric.in_band}`);
  }
  console.log(`\nReport: ${paths.reportPath}`);
  console.log(
    'NOTE: bands are PROVISIONAL (Claude-derived) -- master-dd ratifies exact numbers post-N=40 (L-069).',
  );

  // --gate (CI gate mode): exit 1 if any ratified meta band-metric is out of band.
  // STATISTICAL gate -- the runner is not fully seed-pinned (recruit/mate/attrition vary
  // per seed), so the bands carry margin; wire this warn-only until the runner is bit-
  // deterministic. Default (no --gate) = diagnostic, always exit 0 on completion.
  if (args.gate) {
    const failed = Object.keys(summary.metrics).filter((k) => !summary.metrics[k].in_band);
    if (failed.length > 0) {
      console.error(
        `\n[gate] META-LOOP OUT OF BAND: ${failed.join(', ')} -- a ratified meta band-metric ` +
          'left its range (see report). If this is a correct change that shifts a band, follow ' +
          'the band-invalidation protocol (docs/process/CANONICAL-AI-PLAYTEST.md sec 9).',
      );
      process.exit(1);
    }
    console.log('\n[gate] all meta band-metrics in-band.');
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('BATCH FAIL:', e);
    process.exit(2);
  });
}

module.exports = {
  parseArgs,
  buildProvenance,
  resolvePolicy,
  runBatch,
  runOneReal,
  runRoutingCoverage,
  ROUTING_WALKS,
  buildSummary,
  buildReport,
  writeArtifacts,
  runToJsonl,
  DEFAULT_ROSTER,
  calibrationScaling,
  peEarnedConfig,
  runChildSeed,
  makeChildRunOne,
};
