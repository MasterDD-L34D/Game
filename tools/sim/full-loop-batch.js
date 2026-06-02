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
const { runFullLoop } = require('./full-loop-runner');
const { aggregate, PROVISIONAL_BANDS } = require('./meta-band-aggregator');
const greedyPolicy = require('./greedy-policy');
const { makeMbtiPolicy } = require('./mbti-policy');

// Canonical cave_path starter party (mirrors tests/sim/fullLoopRunner.test.js): a
// dune_stalker + velox authored squad. The Nido recruits grow it as chapters clear.
const DEFAULT_ROSTER = [
  {
    id: 'hero_a',
    species: 'dune_stalker',
    job: 'stalker',
    hp: 30,
    max_hp: 30,
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
    job: 'stalker',
    hp: 30,
    max_hp: 30,
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

// The fase-2c test-context flags the report should record alongside each run.
function currentFlags() {
  return { META_NETWORK_ROUTING: process.env.META_NETWORK_ROUTING || 'false' };
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
    economy: r.economy,
    violations: r.violations || [],
    meta_violations: r.metaViolations || [],
    provenance: r.provenance,
  };
}

function buildSummary(results, config = {}) {
  const agg = aggregate(results);
  return {
    config,
    n: agg.n,
    provisional: agg.provisional,
    metrics: agg.metrics,
    completion: {
      completed: (results || []).filter((r) => r && r.completed === true).length,
      total: agg.n,
    },
  };
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
  if (metric.value !== undefined) return metric.value;
  if (metric.build_power_drift !== undefined)
    return `drift ${metric.build_power_drift} (pe ${metric.pe_earned_avg}, bp ${metric.build_power_avg})`;
  if (metric.recruit_rate !== undefined)
    return `recruit ${metric.recruit_rate}, aff ${metric.affinity_proven_rate}, mate ${metric.mating_rate}`;
  if (metric.offspring_avg !== undefined) return `offspring ${metric.offspring_avg}`;
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
  lines.push(`> **PROVISIONAL** -- ${PROVISIONAL_BANDS.note}`);
  lines.push('');
  lines.push('| Metric | Value | Provisional band | In band |');
  lines.push('|---|---|---|:---:|');
  for (const k of [
    'completion_rate',
    'roster_attrition',
    'economy_flow',
    'relationship_progress',
    'offspring_viability',
  ]) {
    const metric = m[k];
    lines.push(
      `| ${k} | ${metricValue(metric)} | ${band(metric)} | ${metric && metric.in_band ? '✅' : '❌'} |`,
    );
  }
  lines.push('');
  if (m.economy_flow && m.economy_flow.pi_sink_exercised === false) {
    lines.push(
      '> Note: PI sink (shop/build spend) is NOT wired in the loop yet -> economy_flow measures earn + build-power drift only (real gap, surfaced not invented).',
    );
    lines.push('');
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
  const flags = currentFlags();
  const outDir =
    args.out ||
    path.join(
      os.tmpdir(),
      'full-loop-band',
      `batch-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    );
  console.log(
    `FULL-LOOP BATCH: ${args.runs} runs | branch=${args.branch} policy=${args.policy} seedBase=${args.seedBase} commit=${args.commit} flags=${JSON.stringify(flags)}`,
  );
  const t0 = Date.now();
  const results = await runBatch({
    ...args,
    flags,
    onProgress: (done, total, res) => {
      const outcome = res.completed
        ? 'completed'
        : (res.chapters || []).slice(-1)[0]?.outcome || 'incomplete';
      process.stdout.write(
        `[${done}/${total}] ${outcome} chapters=${(res.chapters || []).length}\n`,
      );
    },
  });
  const summary = buildSummary(results, {
    runs: args.runs,
    branch: args.branch,
    policy: args.policy,
    commit: args.commit,
    flags,
  });
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
  buildSummary,
  buildReport,
  writeArtifacts,
  runToJsonl,
  DEFAULT_ROSTER,
};
