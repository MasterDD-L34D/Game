#!/usr/bin/env node
// FASE 5 — threshold checker per AI sim nightly cron.
//
// Legge summary.json prodotto da batch-ai-runner.js, confronta WR/completion
// per-profile vs canonical baseline + emette markdown report. Exit 0 se
// dentro threshold, 1 se regression detected (drift >= wr-drift-pp OR
// completion < floor).
//
// Usage:
//   node tools/sim/check-thresholds.js \
//     --summary /path/batch-*/summary.json \
//     --completion-floor 0.95 \
//     --wr-drift-pp 10 \
//     --out /tmp/threshold-report.md
//
// Output:
//   stdout: GitHub Step Summary markdown table
//   stderr: warnings / regression details
//   exit:   0 = clean, 1 = regression
//
// Cross-ref:
//   .github/workflows/ai-sim-nightly.yml
//   docs/research/2026-05-09-k4-commit-window-implementation.md (current baseline)

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Canonical baseline 2026-05-09 (PR #2149 verdict).
// Update quando ship default profile change.
const BASELINE_WR = {
  aggressive: 1.0, // 100% WR utility ON + commit_window 2 (PR #2149)
  aggressive_no_util: 0.95, // K3 ablation reproduction
  aggressive_with_stickiness: 0.55, // K4 sticky 0.15 (PR #2147)
  aggressive_sticky_30: 0.6, // K4 sticky 0.30 (PR #2147)
  aggressive_commit_window: 1.0, // K4 Approach B explicit profile
  balanced: 1.0, // historical 100% WR
  cautious: 0.95, // empirical N=40 measurements 3-data-points 2026-05-10: #25609294902 95.0%, #25616775262 97.5%, sera userland 97.5% (avg 96.67%, 0.95 = conservative -1.67pp lower bound). Was 0.85 placeholder.
};

function parseArgs(argv) {
  const args = {
    summary: null,
    completionFloor: 0.95,
    wrDriftPp: 10,
    out: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[++i];
    switch (tok) {
      case '--summary':
        args.summary = next();
        break;
      case '--completion-floor':
        args.completionFloor = Number(next());
        break;
      case '--wr-drift-pp':
        args.wrDriftPp = Number(next());
        break;
      case '--out':
        args.out = next();
        break;
      default:
        console.warn(`unknown arg: ${tok}`);
    }
  }
  if (!args.summary) {
    console.error('FATAL: --summary <path> required');
    process.exit(2);
  }
  return args;
}

function evaluateProfile(name, stats, baseline, wrDriftPp, completionFloor) {
  const wr = stats.runs > 0 ? stats.victory / stats.runs : 0;
  const completion = stats.runs > 0 ? stats.ended / stats.runs : 0;
  const baselineWr = typeof baseline === 'number' ? baseline : null;
  const driftPp = baselineWr === null ? null : (wr - baselineWr) * 100;
  const issues = [];
  if (completion < completionFloor) {
    issues.push(
      `completion ${(completion * 100).toFixed(1)}% < floor ${(completionFloor * 100).toFixed(0)}%`,
    );
  }
  if (driftPp !== null && Math.abs(driftPp) > wrDriftPp) {
    issues.push(
      `WR ${(wr * 100).toFixed(1)}% (Δ ${driftPp >= 0 ? '+' : ''}${driftPp.toFixed(1)}pp vs baseline ${(baselineWr * 100).toFixed(0)}%) > ±${wrDriftPp}pp`,
    );
  }
  return { name, wr, completion, baselineWr, driftPp, issues, stats };
}

function main() {
  const args = parseArgs(process.argv);
  const summary = JSON.parse(fs.readFileSync(args.summary, 'utf8'));

  const lines = [];
  lines.push('# AI Sim Nightly — threshold report');
  lines.push('');
  lines.push(`- Summary: \`${path.basename(args.summary)}\``);
  lines.push(`- Total runs: ${summary.total}`);
  lines.push(`- Overall completion: ${(summary.completion_rate * 100).toFixed(1)}%`);
  lines.push(`- Avg rounds: ${summary.avg_rounds}`);
  lines.push(`- Drift threshold: ±${args.wrDriftPp}pp`);
  lines.push(`- Completion floor: ${(args.completionFloor * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('| Profile | Runs | WR | Baseline | Drift (pp) | Completion | Status |');
  lines.push('| ------- | ---: | -: | -------: | ---------: | ---------: | :----: |');

  const results = [];
  for (const [name, stats] of Object.entries(summary.by_profile || {})) {
    const baseline = BASELINE_WR[name];
    const r = evaluateProfile(name, stats, baseline, args.wrDriftPp, args.completionFloor);
    results.push(r);
    const wrPct = (r.wr * 100).toFixed(1);
    const baselinePct = r.baselineWr === null ? 'n/a' : `${(r.baselineWr * 100).toFixed(0)}%`;
    const drift =
      r.driftPp === null ? 'n/a' : `${r.driftPp >= 0 ? '+' : ''}${r.driftPp.toFixed(1)}`;
    const compPct = (r.completion * 100).toFixed(1);
    const status = r.issues.length === 0 ? '✅' : '⚠️';
    lines.push(
      `| ${name} | ${stats.runs} | ${wrPct}% | ${baselinePct} | ${drift} | ${compPct}% | ${status} |`,
    );
  }

  const failures = results.filter((r) => r.issues.length > 0);
  lines.push('');
  if (failures.length === 0) {
    lines.push('## Verdict: ✅ Clean');
    lines.push('');
    lines.push('All profiles within tolerance.');
  } else {
    lines.push('## Verdict: ⚠️ Regression detected');
    lines.push('');
    for (const r of failures) {
      lines.push(`### ${r.name}`);
      for (const issue of r.issues) {
        lines.push(`- ${issue}`);
      }
    }
    lines.push('');
    lines.push('### Investigation steps');
    lines.push('1. Inspect artifact `ai-sim-nightly-<run_id>` for per-run JSONL.');
    lines.push('2. Re-run batch locally con tunnel + same seeds per reproducibility.');
    lines.push('3. Confronta vs PR #2149 baseline (current production aggressive profile).');
    lines.push('4. Se drift positivo (improvement), update BASELINE_WR in this script.');
  }

  const report = lines.join('\n');
  process.stdout.write(report + '\n');
  if (args.out) {
    fs.writeFileSync(args.out, report);
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
