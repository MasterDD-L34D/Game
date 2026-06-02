'use strict';
// fase-2b full-loop-batch: runs K full-loop sims (different seeds) in-process, aggregates
// via meta-band-aggregator, and writes JSONL (one line per run) + summary.json + report.md
// with per-run provenance (seed + commit + policy + scenario-chain + flags, spec §10 DoD).
// Pure pieces are unit-tested with an injected runOne; one real in-process smoke (K=2)
// proves the default path against createApp.
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  parseArgs,
  buildProvenance,
  buildSummary,
  buildReport,
  runBatch,
  writeArtifacts,
  resolvePolicy,
} = require('../../tools/sim/full-loop-batch');

// Synthetic run-result (runFullLoop shape) for the pure-assembly tests.
function synthRun(o = {}) {
  return {
    completed: o.completed ?? true,
    chapters: o.chapters || [
      { step: 1, encounter: 'enc_tutorial_01', outcome: 'victory', xpGranted: 12, mpEarned: 2 },
      { step: 2, encounter: 'savana_01', outcome: 'victory', xpGranted: 12, mpEarned: 2 },
    ],
    violations: [],
    finalRoster: o.finalRoster ?? ['a', 'b'],
    recruited: o.recruited ?? ['r1'],
    economyRecruited: ['e1'],
    offspring: o.offspring ?? 1,
    economyAffinityProven: true,
    initialRosterSize: o.initialRosterSize ?? 2,
    economy: o.economy || {
      peEarnedTotal: 6,
      xpGrantedTotal: 24,
      mpEarnedTotal: 4,
      piSpentTotal: 0,
    },
  };
}

test('parseArgs: defaults + flag overrides', () => {
  const d = parseArgs(['node', 'full-loop-batch.js']);
  assert.equal(d.runs, 5);
  assert.equal(d.branch, 'cave_path');
  assert.equal(d.policy, 'greedy');
  const o = parseArgs([
    'node',
    'x',
    '--runs',
    '40',
    '--branch',
    'surface_path',
    '--policy',
    'mbti',
    '--seed-base',
    '500',
  ]);
  assert.equal(o.runs, 40);
  assert.equal(o.branch, 'surface_path');
  assert.equal(o.policy, 'mbti');
  assert.equal(o.seedBase, 500);
});

test('buildProvenance: carries seed + commit + policy + scenario-chain + flags', () => {
  const p = buildProvenance({
    runId: 3,
    seed: '1003',
    commit: 'abc123',
    policy: 'greedy',
    branch: 'cave_path',
    scenarioChain: ['enc_tutorial_01', 'savana_01'],
    flags: { META_NETWORK_ROUTING: 'false' },
  });
  assert.equal(p.run_id, 3);
  assert.equal(p.seed, '1003');
  assert.equal(p.commit, 'abc123');
  assert.equal(p.policy, 'greedy');
  assert.equal(p.branch, 'cave_path');
  assert.deepEqual(p.scenario_chain, ['enc_tutorial_01', 'savana_01']);
  assert.deepEqual(p.flags, { META_NETWORK_ROUTING: 'false' });
});

test('runBatch: injected runOne -> N results, deterministic monotonic seeds + provenance', async () => {
  const seen = [];
  const fakeRunOne = async (runOpts) => {
    seen.push(runOpts.seed);
    return synthRun();
  };
  const results = await runBatch({
    runs: 3,
    seedBase: 1000,
    runOne: fakeRunOne,
    commit: 'c0',
    policy: 'greedy',
  });
  assert.equal(results.length, 3);
  assert.deepEqual(seen, ['1000', '1001', '1002']); // monotonic, deterministic
  assert.equal(results[0].provenance.run_id, 0);
  assert.equal(results[2].provenance.seed, '1002');
  assert.equal(results[1].provenance.commit, 'c0');
  // scenario_chain derived from the run's chapters.
  assert.deepEqual(results[0].provenance.scenario_chain, ['enc_tutorial_01', 'savana_01']);
});

test('buildSummary: embeds the 5-metric aggregate over the batch', () => {
  const results = [synthRun(), synthRun(), synthRun({ completed: false })];
  const s = buildSummary(results, { runs: 3, policy: 'greedy' });
  assert.equal(s.n, 3);
  assert.equal(s.provisional, true);
  assert.ok(s.metrics.completion_rate, 'completion_rate metric present');
  assert.ok(s.metrics.offspring_viability, 'offspring_viability metric present');
  assert.equal(s.completion.completed, 2);
  assert.equal(s.completion.total, 3);
});

test('buildReport: markdown with the 5 metric rows + a PROVISIONAL WARN banner', () => {
  const s = buildSummary([synthRun(), synthRun()], { runs: 2 });
  const md = buildReport(s);
  assert.match(md, /provisional|WARN|pending master-dd/i);
  for (const k of [
    'completion_rate',
    'roster_attrition',
    'economy_flow',
    'relationship_progress',
    'offspring_viability',
  ]) {
    assert.ok(md.includes(k), `report mentions ${k}`);
  }
});

test('writeArtifacts: writes runs.jsonl (one line per run) + summary.json + report.md', () => {
  const results = [synthRun(), synthRun()].map((r, i) => {
    r.provenance = buildProvenance({
      runId: i,
      seed: String(1000 + i),
      commit: 'c',
      policy: 'greedy',
      branch: 'cave_path',
      scenarioChain: ['enc_tutorial_01', 'savana_01'],
      flags: {},
    });
    return r;
  });
  const summary = buildSummary(results, { runs: 2 });
  const report = buildReport(summary);
  const outDir = path.join(os.tmpdir(), 'fl-batch-test-artifacts');
  fs.rmSync(outDir, { recursive: true, force: true });
  const paths = writeArtifacts(outDir, { results, summary, report });
  // runs.jsonl: one parseable JSON object per line, N lines.
  const jsonl = fs.readFileSync(paths.jsonlPath, 'utf8').split('\n').filter(Boolean);
  assert.equal(jsonl.length, 2);
  const first = JSON.parse(jsonl[0]);
  assert.equal(first.run_id, 0);
  assert.equal(first.completed, true);
  assert.ok(first.economy, 'per-run economy in jsonl');
  assert.ok(first.provenance.seed, 'per-run provenance in jsonl');
  // summary.json parseable + has the aggregate.
  const sum = JSON.parse(fs.readFileSync(paths.summaryPath, 'utf8'));
  assert.equal(sum.n, 2);
  assert.ok(sum.metrics.completion_rate);
  // report.md exists.
  assert.ok(fs.readFileSync(paths.reportPath, 'utf8').length > 0);
  fs.rmSync(outDir, { recursive: true, force: true });
});

test('runBatch: real in-process smoke (K=2) -> real run-results aggregate (fase-2b)', async (t) => {
  // Default runOne path: spin createApp per run, AI plays the whole loop, aggregate. Proves
  // the batch wiring end-to-end on the real backend (slower than the pure tests).
  const results = await runBatch({ runs: 2, seedBase: 7000, branch: 'cave_path', commit: 'smoke' });
  assert.equal(results.length, 2);
  for (const r of results) {
    assert.equal(
      r.completed,
      true,
      `real run completed; chapters=${JSON.stringify(r.chapters?.map((c) => c.outcome))}`,
    );
    assert.ok(r.economy.peEarnedTotal > 0, 'real PE earned');
    assert.ok(
      r.provenance.scenario_chain.length >= 5,
      'scenario chain captured from real chapters',
    );
  }
  const summary = buildSummary(results, { runs: 2, branch: 'cave_path' });
  assert.equal(summary.n, 2);
  // With the current weak/scaled enemies the AI never loses -> completion 1.0, OUT of the
  // provisional 0.40-0.70 band. That OUT-of-band result is the POINT: the band correctly
  // flags "too easy" until enemy scaling/calibration (fase-2c) brings it into range.
  assert.equal(summary.metrics.completion_rate.value, 1);
  assert.equal(summary.metrics.completion_rate.in_band, false);
});

test('resolvePolicy: string -> policy object + label (greedy / mbti / mbti:TYPE)', () => {
  const g = resolvePolicy('greedy');
  assert.equal(typeof g.policy.chooseRecruits, 'function');
  assert.equal(g.label, 'greedy');
  const m = resolvePolicy('mbti:ESFP');
  assert.equal(m.policy.mbti, 'ESFP');
  assert.equal(m.label, 'mbti:ESFP');
  const mDefault = resolvePolicy('mbti');
  assert.equal(mDefault.policy.mbti, 'INTJ'); // default archetype
  const bad = resolvePolicy('nonsense');
  assert.equal(bad.label, 'greedy'); // graceful fallback
  const badMbti = resolvePolicy('mbti:XXXX');
  assert.equal(badMbti.label, 'mbti:INTJ', 'invalid mbti type normalized to the played archetype');
});

test('runBatch: --policy mbti:ESFP INJECTS the temperament policy + labels provenance (fase-2c)', async () => {
  const seen = [];
  const fakeRunOne = async (runOpts) => {
    seen.push(runOpts.policy);
    return synthRun();
  };
  const results = await runBatch({ runs: 1, policy: 'mbti:ESFP', runOne: fakeRunOne });
  assert.equal(seen[0].mbti, 'ESFP', 'the mbti policy object reaches runFullLoop');
  assert.equal(results[0].provenance.policy, 'mbti:ESFP', 'provenance records the policy label');
});

test('runBatch: --policy greedy injects the greedy policy object', async () => {
  const seen = [];
  const fakeRunOne = async (runOpts) => {
    seen.push(runOpts.policy);
    return synthRun();
  };
  const results = await runBatch({ runs: 1, policy: 'greedy', runOne: fakeRunOne });
  assert.equal(typeof seen[0].chooseRecruits, 'function', 'greedy policy object injected');
  assert.equal(results[0].provenance.policy, 'greedy');
});

test('runBatch: provenance records the hermetic env flags (Codex #2570 P2)', async () => {
  // Importing full-loop-batch stubs the orchestrator + disables the status refresh, so the
  // batch runtime differs from an unstubbed run. Provenance must capture that (not just
  // META_NETWORK_ROUTING) so a reader of runs.jsonl knows the run was hermetic.
  const results = await runBatch({ runs: 1, runOne: async () => synthRun() });
  const f = results[0].provenance.flags;
  assert.ok('IDEA_ENGINE_STUB_ORCHESTRATOR' in f, 'stub-orchestrator flag recorded');
  assert.ok('IDEA_ENGINE_DISABLE_STATUS_REFRESH' in f, 'status-refresh flag recorded');
  assert.ok('META_NETWORK_ROUTING' in f, 'routing flag still recorded');
});

const ROUTING_FIXTURE = {
  enabled: true,
  start: 'BADLANDS',
  runs: [
    {
      start: 'BADLANDS',
      season: null,
      terminalReason: 'all_cleared',
      coverage: { nodes_visited: 4, reasons: ['eligible', 'filtered', 'all_cleared'] },
    },
  ],
};

test('buildSummary: includes routing coverage when provided (fase-2c routing wiring)', () => {
  const s = buildSummary([synthRun()], { runs: 1 }, ROUTING_FIXTURE);
  assert.deepEqual(s.routing, ROUTING_FIXTURE);
});

test('buildSummary: omits routing when absent (flag off)', () => {
  const s = buildSummary([synthRun()], { runs: 1 });
  assert.equal(s.routing, undefined);
});

test('buildReport: renders a routing-coverage section when present (closes Finding 4)', () => {
  const s = buildSummary([synthRun()], { runs: 1 }, ROUTING_FIXTURE);
  const md = buildReport(s);
  assert.match(md, /META_NETWORK_ROUTING|routing coverage/i);
  assert.ok(md.includes('BADLANDS'), 'names the traversed node');
  assert.ok(md.includes('all_cleared'), 'shows the terminal reason');
});
