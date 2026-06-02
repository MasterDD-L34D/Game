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
  ROUTING_WALKS,
  runChildSeed,
  peEarnedConfig,
  calibrationScaling,
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
    '--isolate',
    '--child-seed',
    '1007',
  ]);
  assert.equal(o.runs, 40);
  assert.equal(o.branch, 'surface_path');
  assert.equal(o.policy, 'mbti');
  assert.equal(o.seedBase, 500);
  assert.equal(o.isolate, true, '--isolate flag parsed');
  assert.equal(o.childSeed, '1007', '--child-seed value parsed');
});

test('parseArgs: isolate defaults off, childSeed null', () => {
  const d = parseArgs(['node', 'full-loop-batch.js']);
  assert.equal(d.isolate, false);
  assert.equal(d.childSeed, null);
});

test('runChildSeed: retries a crashing child, returns the result once it succeeds', () => {
  // Simulates the Windows 0xC0000409 native crash: the child throws twice (non-zero exit),
  // then the 3rd fresh process succeeds. Pure retry logic (spawn + read injected).
  let calls = 0;
  const spawn = () => {
    calls += 1;
    if (calls < 3) throw new Error('Command failed: 0xC0000409');
  };
  const readResult = () => ({ completed: true, seed: 's' });
  const r = runChildSeed('1000', { spawn, readResult, retries: 3 });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 3, 'retried until the 3rd attempt succeeded');
  assert.equal(r.result.completed, true);
});

test('runChildSeed: gives up after `retries` crashes (no infinite loop, error surfaced)', () => {
  const spawn = () => {
    throw new Error('persistent crash');
  };
  const r = runChildSeed('1000', { spawn, readResult: () => ({}), retries: 3 });
  assert.equal(r.ok, false);
  assert.equal(r.attempts, 3);
  assert.match(r.error, /persistent crash/);
});

test('runChildSeed: an unparseable/empty child result is retried, not accepted', () => {
  let calls = 0;
  const spawn = () => {};
  const readResult = () => {
    calls += 1;
    return calls < 2 ? null : { completed: false };
  };
  const r = runChildSeed('x', { spawn, readResult, retries: 3 });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2, 'first (null) result rejected, second accepted');
});

test('peEarnedConfig: defaults to an affording rate; FL_PE_EARNED overrides', () => {
  delete process.env.FL_PE_EARNED;
  // 5:1 PE->PI, hybrid cost 5 PI -> need >=25 PE over the arc; default must afford a run
  // that clears >=4 victory chapters (4 * default >= 25).
  assert.ok(peEarnedConfig() * 4 >= 25, 'default PE affords the hybrid pick within the arc');
  process.env.FL_PE_EARNED = '12';
  try {
    assert.equal(peEarnedConfig(), 12);
  } finally {
    delete process.env.FL_PE_EARNED;
  }
});

test('calibrationScaling: FL_ENEMY_* env overrides each knob (robust to baked defaults)', () => {
  for (const k of [
    'FL_ENEMY_COUNT_MULT',
    'FL_ENEMY_COUNT_ADD',
    'FL_ENEMY_HP_MULT',
    'FL_ENEMY_HP_ADD',
    'FL_ENEMY_MOD_ADD',
    'FL_ENEMY_DC_ADD',
  ]) {
    delete process.env[k];
  }
  // No env -> the BAKED calibration (N=10 probe -> N=40 ratify): countMult 5 + hpAdd 3 =
  // 10 sistema units at ~10 HP. Locks the calibration so an accidental revert to neutral
  // (which made completion a degenerate 1.0) is caught.
  const baked = calibrationScaling();
  assert.equal(baked.countMult, 5, 'baked countMult (calibration)');
  assert.equal(baked.hpAdd, 3, 'baked hpAdd (calibration)');
  process.env.FL_ENEMY_COUNT_MULT = '7';
  process.env.FL_ENEMY_DC_ADD = '9';
  try {
    const s = calibrationScaling();
    assert.equal(s.countMult, 7);
    assert.equal(s.dcAdd, 9);
    for (const k of ['countMult', 'countAdd', 'hpMult', 'hpAdd', 'modAdd', 'dcAdd']) {
      assert.ok(Number.isFinite(s[k]), `${k} is numeric`);
    }
  } finally {
    delete process.env.FL_ENEMY_COUNT_MULT;
    delete process.env.FL_ENEMY_DC_ADD;
  }
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

test('buildReport: PI-sink note reflects the wired/blocked state, never "NOT wired" (Codex #2574 P2)', () => {
  // The sink is wired now: attempts>0, spent=0, insufficient=0 (canonical blocked case). The
  // report must reuse the aggregator's honest note, not the stale hard-coded "NOT wired" claim.
  const results = [
    synthRun({
      economy: {
        peEarnedTotal: 24,
        xpGrantedTotal: 36,
        mpEarnedTotal: 6,
        piSpentTotal: 0,
        piPickAttempts: 18,
        piInsufficient: 0,
      },
    }),
  ];
  const md = buildReport(buildSummary(results, { runs: 1 }));
  assert.ok(!/NOT wired/i.test(md), 'no stale "NOT wired" claim in the report');
  assert.match(md, /blocked|WIRED/i, 'report reflects the wired/blocked state');
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
  // the batch WIRING end-to-end on the real backend (slower than the pure tests). Pins
  // `enemyScaling: {}` (faithful, no calibration) so this smoke stays deterministic + tests
  // wiring, NOT difficulty -- the calibrated difficulty is exercised by the N=40 band batch
  // (see docs/playtest/2026-06-02-full-loop-band-report.md), not this 2-run smoke.
  const results = await runBatch({
    runs: 2,
    seedBase: 7000,
    branch: 'cave_path',
    commit: 'smoke',
    enemyScaling: {},
  });
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
  // At faithful (un-calibrated) difficulty the AI never loses -> completion 1.0, OUT of the
  // provisional 0.40-0.70 band. That the band flags this as "too easy" is the POINT; the
  // baked calibrationScaling() default (asserted separately) is what brings completion into
  // range for the real band batch.
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

test('ROUTING_WALKS: the default coverage plan exercises the winter bridge (Codex #2572 P2)', () => {
  // A coverage plan of only BADLANDS starts never reaches CRYOSTEPPE -> the winter bridge
  // stays unexercised. The default must include a CRYOSTEPPE/winter walk (crosses the
  // bridge) so routing coverage genuinely hits the season-gated edge.
  assert.ok(Array.isArray(ROUTING_WALKS) && ROUTING_WALKS.length >= 2, 'a multi-walk plan');
  assert.ok(
    ROUTING_WALKS.some((w) => w.start === 'CRYOSTEPPE' && w.season === 'winter'),
    `plan exercises the winter bridge; got ${JSON.stringify(ROUTING_WALKS)}`,
  );
});

test('buildReport: renders a routing-coverage section when present (closes Finding 4)', () => {
  const s = buildSummary([synthRun()], { runs: 1 }, ROUTING_FIXTURE);
  const md = buildReport(s);
  assert.match(md, /META_NETWORK_ROUTING|routing coverage/i);
  assert.ok(md.includes('BADLANDS'), 'names the traversed node');
  assert.ok(md.includes('all_cleared'), 'shows the terminal reason');
});
