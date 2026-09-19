#!/usr/bin/env node
// Envelope B / B1 — pillar-metric regression baselines for playtest #2.
//
// check-thresholds.js baselines ONLY win-rate per profile. This sibling adds
// drift detection for the *pillar* metrics emitted by
// tools/py/playtest_2_analyzer.py --json-out (metrics.json). It maintains a
// rolling baseline file (committed) and flags drift past a per-metric
// tolerance. It ALSO tracks the analyzer pillar verdict so the workflow can
// react to a verdict CHANGE (not just numeric drift).
//
// Bootstrap window (PT2-D): until the baseline has accumulated
// >= BOOTSTRAP_MIN samples it ONLY accumulates — it NEVER raises a regression
// alert. This lets the first ~5 nightly runs establish a baseline silently.
//
// Report delivery (PT2-C): this script never commits. It writes a markdown
// report + a machine `pillar-status.json`; the workflow decides PR vs issue.
//
// Usage:
//   node tools/sim/check-pillar-baselines.js \
//     --metrics /path/playtest-2-metrics-<date>.json \
//     --baseline tools/sim/pillar-baseline.json \
//     --out /tmp/pillar-report.md \
//     --status-out /tmp/pillar-status.json \
//     [--update]            # fold this run into the baseline (rolling mean)
//
// Exit:
//   0 = clean OR bootstrap window (no gating)
//   1 = pillar regression OR pillar verdict change (post-bootstrap only)
//   2 = usage error
//
// Cross-ref:
//   tools/py/playtest_2_analyzer.py (metrics.json producer)
//   tools/sim/check-thresholds.js (WR-only sibling gate)
//   .github/workflows/ai-sim-nightly.yml (consumer)

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Min samples folded into the baseline before alerts are armed (PT2-D).
const BOOTSTRAP_MIN = 5;

// Pillar dimensions tracked. `tol` = allowed absolute drift of the metric vs
// the rolling baseline mean. `unit` is cosmetic. `extract(metrics)` returns a
// number or null (null = key missing → graceful skip, not a failure).
const DIMENSIONS = [
  {
    key: 'p3_promotion_rate',
    label: 'P3 promotion rate (promotions / session)',
    unit: 'per-session',
    tol: 0.5,
    extract(m) {
      const p3 = m.p3_promotions;
      const s = m.summary;
      if (!p3 || !s || !s.total_sessions) return null;
      return p3.total_promotions / s.total_sessions;
    },
  },
  {
    key: 'p4_conviction_stdev',
    label: 'P4 conviction stdev (mean across axes)',
    unit: 'stdev',
    tol: 5,
    extract(m) {
      const cd = m.p4_psicologico && m.p4_psicologico.conviction_distribution;
      if (!cd) return null;
      const stdevs = Object.values(cd)
        .map((a) => (a && typeof a.stdev === 'number' ? a.stdev : null))
        .filter((v) => v !== null);
      if (stdevs.length === 0) return null;
      return stdevs.reduce((a, b) => a + b, 0) / stdevs.length;
    },
  },
  {
    key: 'p4_layer_completeness',
    label: 'P4 4-layer completeness (layers populated, 0-4)',
    unit: 'layers',
    tol: 1,
    extract(m) {
      const lc = m.p4_psicologico && m.p4_psicologico.layer_completeness;
      if (!lc) return null;
      return Object.values(lc).filter(Boolean).length;
    },
  },
  {
    key: 'p6_pressure_spread',
    label: 'P6 pressure-tier spread (distinct tiers observed)',
    unit: 'tiers',
    tol: 1,
    extract(m) {
      const pd = m.p6_fairness && m.p6_fairness.pressure_distribution;
      if (!pd) return null;
      return Object.keys(pd).length;
    },
  },
  {
    key: 'p6_rewind_pct',
    label: 'P6 rewind sessions %',
    unit: '%',
    tol: 20,
    extract(m) {
      const f = m.p6_fairness;
      if (!f || typeof f.rewind_sessions_pct !== 'number') return null;
      return f.rewind_sessions_pct;
    },
  },
  {
    key: 'od024_firing_pct',
    label: 'OD-024 interoception firing %',
    unit: '%',
    tol: 15,
    extract(m) {
      const o = m.od024_interoception;
      if (!o || typeof o.firing_rate_pct !== 'number') return null;
      return o.firing_rate_pct;
    },
  },
  {
    key: 'perf_latency_p95_ms',
    label: 'Performance command latency p95 (M.7)',
    unit: 'ms',
    tol: 40,
    extract(m) {
      const p = m.performance;
      if (!p || typeof p.command_latency_p95_ms !== 'number') return null;
      return p.command_latency_p95_ms;
    },
  },
];

function parseArgs(argv) {
  const args = {
    metrics: null,
    baseline: path.join('tools', 'sim', 'pillar-baseline.json'),
    out: null,
    statusOut: null,
    update: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[++i];
    switch (tok) {
      case '--metrics':
        args.metrics = next();
        break;
      case '--baseline':
        args.baseline = next();
        break;
      case '--out':
        args.out = next();
        break;
      case '--status-out':
        args.statusOut = next();
        break;
      case '--update':
        args.update = true;
        break;
      default:
        console.warn(`unknown arg: ${tok}`);
    }
  }
  if (!args.metrics) {
    console.error('FATAL: --metrics <path> required');
    process.exit(2);
  }
  return args;
}

function loadBaseline(p) {
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      samples: Number(raw.samples) || 0,
      verdict: raw.verdict || null,
      dims: raw.dims || {},
      updated_at: raw.updated_at || null,
    };
  } catch {
    return { samples: 0, verdict: null, dims: {}, updated_at: null };
  }
}

// Pillar verdict: worst of the analyzer's own performance gate + a numeric
// regression check. Kept coarse on purpose (PASS / CONDITIONAL / REGRESSION)
// — it is what the workflow watches for a *verdict change*.
function computeVerdict(metrics, dimResults) {
  const perfV = (metrics.performance && metrics.performance.command_latency_verdict) || 'n/a';
  if (dimResults.some((d) => d.regressed)) return 'REGRESSION';
  if (perfV === 'ABORT') return 'REGRESSION';
  if (perfV === 'CONDITIONAL') return 'CONDITIONAL';
  return 'PASS';
}

function main() {
  const args = parseArgs(process.argv);
  let metrics;
  try {
    metrics = JSON.parse(fs.readFileSync(args.metrics, 'utf8'));
  } catch (e) {
    console.error(`FATAL: cannot read metrics ${args.metrics}: ${e.message}`);
    process.exit(2);
  }

  const baseline = loadBaseline(args.baseline);
  const armed = baseline.samples >= BOOTSTRAP_MIN;

  const dimResults = [];
  for (const dim of DIMENSIONS) {
    let value = null;
    try {
      value = dim.extract(metrics);
    } catch {
      value = null; // graceful: malformed sub-tree treated as missing key
    }
    const base = baseline.dims[dim.key];
    const baseMean = base && typeof base.mean === 'number' ? base.mean : null;
    const present = value !== null && Number.isFinite(value);
    let drift = null;
    let regressed = false;
    if (present && baseMean !== null && armed) {
      drift = value - baseMean;
      regressed = Math.abs(drift) > dim.tol;
    }
    dimResults.push({
      key: dim.key,
      label: dim.label,
      unit: dim.unit,
      tol: dim.tol,
      value,
      present,
      baseMean,
      drift,
      regressed,
      missing: !present,
    });
  }

  const verdict = computeVerdict(metrics, dimResults);
  const verdictChanged = armed && baseline.verdict !== null && baseline.verdict !== verdict;
  const regressed = armed && dimResults.some((d) => d.regressed);
  const alert = armed && (regressed || verdictChanged);

  // ---- Report markdown -----------------------------------------------------
  const lines = [];
  lines.push('## Pillar regression baselines (Envelope B / B1)');
  lines.push('');
  lines.push(`- Metrics: \`${path.basename(args.metrics)}\``);
  lines.push(`- Baseline samples: ${baseline.samples} (bootstrap min ${BOOTSTRAP_MIN})`);
  lines.push(
    `- Mode: ${armed ? '**armed** (alerts active)' : '🟡 **bootstrap window** (alerts suppressed — establishing baseline silently)'}`,
  );
  lines.push(
    `- Pillar verdict: **${verdict}**${baseline.verdict ? ` (prev: ${baseline.verdict})` : ''}`,
  );
  if (verdictChanged)
    lines.push(`- ⚠️ **Pillar verdict CHANGED** ${baseline.verdict} → ${verdict}`);
  lines.push('');
  lines.push('| Dimension | Value | Baseline | Drift | Tol | Status |');
  lines.push('| --------- | ----: | -------: | ----: | --: | :----: |');
  for (const d of dimResults) {
    const v = d.present ? Number(d.value).toFixed(2) : 'n/a (key missing)';
    const b = d.baseMean === null ? 'n/a' : Number(d.baseMean).toFixed(2);
    const dr = d.drift === null ? 'n/a' : `${d.drift >= 0 ? '+' : ''}${d.drift.toFixed(2)}`;
    let status = '✅';
    if (d.missing) status = '➖';
    else if (d.regressed) status = '⚠️';
    else if (!armed) status = '🟡';
    lines.push(`| ${d.label} | ${v} | ${b} | ${dr} | ±${d.tol} | ${status} |`);
  }
  lines.push('');
  if (!armed) {
    lines.push(
      `### Verdict: 🟡 Bootstrap — baseline at ${baseline.samples}/${BOOTSTRAP_MIN} samples, no gating`,
    );
  } else if (alert) {
    lines.push('### Verdict: ⚠️ Pillar regression / verdict change');
    lines.push('');
    for (const d of dimResults.filter((x) => x.regressed)) {
      lines.push(
        `- **${d.label}**: ${Number(d.value).toFixed(2)} vs baseline ${Number(d.baseMean).toFixed(2)} (Δ ${d.drift >= 0 ? '+' : ''}${d.drift.toFixed(2)} > ±${d.tol})`,
      );
    }
    if (verdictChanged) lines.push(`- **Verdict change**: ${baseline.verdict} → ${verdict}`);
    lines.push('');
    lines.push('### Investigation');
    lines.push('1. Inspect artifact `ai-sim-nightly-<run_id>` (telemetry + metrics.json).');
    lines.push('2. Compare vs prior nightly metrics; confirm not a sample-size artifact.');
    lines.push('3. If intentional shift → run with `--update` to re-baseline.');
  } else {
    lines.push('### Verdict: ✅ Clean — all pillar dimensions within tolerance');
  }
  const report = lines.join('\n');
  process.stdout.write(report + '\n');
  if (args.out) fs.writeFileSync(args.out, report);

  // ---- Machine status ------------------------------------------------------
  const status = {
    armed,
    bootstrap: !armed,
    baseline_samples: baseline.samples,
    verdict,
    prev_verdict: baseline.verdict,
    verdict_changed: verdictChanged,
    regressed,
    alert,
    dimensions: dimResults.map((d) => ({
      key: d.key,
      label: d.label,
      value: d.value,
      baseline: d.baseMean,
      drift: d.drift,
      tol: d.tol,
      regressed: d.regressed,
      missing: d.missing,
    })),
    generated_at: new Date().toISOString(),
  };
  if (args.statusOut) fs.writeFileSync(args.statusOut, JSON.stringify(status, null, 2));

  // ---- Rolling baseline update (idempotent incremental mean) ---------------
  if (args.update) {
    const n = baseline.samples;
    const newDims = { ...baseline.dims };
    for (const d of dimResults) {
      if (!d.present) continue; // never fold a missing metric
      const prev =
        newDims[d.key] && typeof newDims[d.key].mean === 'number' ? newDims[d.key].mean : null;
      const prevN = newDims[d.key] && Number(newDims[d.key].n) ? Number(newDims[d.key].n) : 0;
      const mean = prev === null ? d.value : (prev * prevN + d.value) / (prevN + 1);
      newDims[d.key] = { mean: +mean.toFixed(6), n: prevN + 1 };
    }
    const next = {
      samples: n + 1,
      verdict,
      dims: newDims,
      updated_at: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(args.baseline), { recursive: true });
    fs.writeFileSync(args.baseline, JSON.stringify(next, null, 2) + '\n');
    console.error(
      `[pillar-baseline] folded run → samples ${next.samples}, verdict ${verdict} (${path.basename(args.baseline)})`,
    );
  }

  if (alert) process.exit(1);
}

main();
