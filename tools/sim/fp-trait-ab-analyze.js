'use strict';
// fp-trait-ab-analyze -- pair two batch-ai-runner summary.csv files (control vs
// treatment) by seed and report the Form-Pulse trait v2 combat A/B signal:
// rounds-to-victory paired delta (+CI95), victory-rate, and a post-hoc
// "cleared within K rounds" win-rate for a few K thresholds.
//
// L-069 posture: this REPORTS; the encounter-offset ratification is a master-dd
// verdict. Pairing is by deterministic seed (batch-ai-runner seeds = 1000+idx),
// so seed variance cancels (same scenario, same sistema policy, the ONLY
// between-arm difference is the granted trait set).
//
// Usage: node tools/sim/fp-trait-ab-analyze.js <control_dir> <treatment_dir> [--out report.md]

const fs = require('node:fs');
const path = require('node:path');

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}

const controlDir = process.argv[2];
const treatDir = process.argv[3];
const OUT = arg('--out', null);
if (!controlDir || !treatDir) {
  console.error('usage: node fp-trait-ab-analyze.js <control_dir> <treatment_dir> [--out file]');
  process.exit(2);
}

function readRuns(dir) {
  const csv = fs.readFileSync(path.join(dir, 'summary.csv'), 'utf8').trim().split('\n');
  const headers = csv[0].split(',');
  const idx = (h) => headers.indexOf(h);
  const seedI = idx('seed');
  const outI = idx('outcome');
  const roundsI = idx('rounds');
  const rows = csv.slice(1).map((line) => {
    const c = line.split(',');
    return { seed: Number(c[seedI]), outcome: c[outI], rounds: Number(c[roundsI]) };
  });
  return new Map(rows.map((r) => [r.seed, r]));
}

function stats(xs) {
  const n = xs.length;
  if (n === 0) return { n: 0, mean: 0, std: 0, ci95: 0, ci95_lo: 0, ci95_hi: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);
  const ci95 = 1.96 * (std / Math.sqrt(n));
  return { n, mean, std, ci95, ci95_lo: mean - ci95, ci95_hi: mean + ci95 };
}

const ctrl = readRuns(controlDir);
const treat = readRuns(treatDir);

// Pair by seed; keep only seeds present in BOTH arms AND ending in victory in
// both (rounds-to-victory is only defined for a victory; timeouts/defeats are
// reported separately as outcome-rate shifts).
const seeds = [...ctrl.keys()].filter((s) => treat.has(s)).sort((a, b) => a - b);
const paired = [];
const outcomeCounts = { control: {}, treatment: {} };
for (const s of seeds) {
  const c = ctrl.get(s);
  const t = treat.get(s);
  outcomeCounts.control[c.outcome] = (outcomeCounts.control[c.outcome] || 0) + 1;
  outcomeCounts.treatment[t.outcome] = (outcomeCounts.treatment[t.outcome] || 0) + 1;
  if (c.outcome === 'victory' && t.outcome === 'victory') {
    paired.push({ seed: s, ctrl: c.rounds, treat: t.rounds, delta: t.rounds - c.rounds });
  }
}

const deltaStats = stats(paired.map((p) => p.delta));
const ctrlRounds = stats(paired.map((p) => p.ctrl));
const treatRounds = stats(paired.map((p) => p.treat));
const victoryRate = (m) => {
  const v = [...m.values()].filter((r) => r.outcome === 'victory').length;
  return v / m.size;
};
// Post-hoc derived win-rate: fraction of runs that CLEARED within K rounds
// (a victory at rounds<=K), computed over all paired seeds (a non-victory or a
// victory slower than K both count as "not cleared within K").
function clearedWithin(m, K) {
  let c = 0;
  for (const s of seeds) {
    const r = m.get(s);
    if (r.outcome === 'victory' && r.rounds <= K) c += 1;
  }
  return c / seeds.length;
}
const Ks = [18, 20, 22, 24];

const f2 = (x) => x.toFixed(2);
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const lines = [];
lines.push('# Form-Pulse trait v2 — combat A/B (rounds-to-victory + derived WR)');
lines.push('');
lines.push(`Control dir: \`${controlDir}\``);
lines.push(`Treatment dir: \`${treatDir}\``);
lines.push(
  `Paired seeds (both arms): **${seeds.length}** | both-victory pairs: **${paired.length}**`,
);
lines.push('');
lines.push('## Outcome distribution');
lines.push('');
const allOutcomes = [
  ...new Set([...Object.keys(outcomeCounts.control), ...Object.keys(outcomeCounts.treatment)]),
];
lines.push('| arm | ' + allOutcomes.join(' | ') + ' | victory-rate |');
lines.push('|' + '---|'.repeat(allOutcomes.length + 2));
lines.push(
  '| control | ' +
    allOutcomes.map((o) => outcomeCounts.control[o] || 0).join(' | ') +
    ` | ${pct(victoryRate(ctrl))} |`,
);
lines.push(
  '| treatment | ' +
    allOutcomes.map((o) => outcomeCounts.treatment[o] || 0).join(' | ') +
    ` | ${pct(victoryRate(treat))} |`,
);
lines.push('');
lines.push('## Rounds-to-victory (paired, both-victory seeds)');
lines.push('');
lines.push('| metric | value |');
lines.push('|---|---|');
lines.push(
  `| control mean rounds | ${f2(ctrlRounds.mean)} (CI95 ${f2(ctrlRounds.ci95_lo)}..${f2(ctrlRounds.ci95_hi)}) |`,
);
lines.push(
  `| treatment mean rounds | ${f2(treatRounds.mean)} (CI95 ${f2(treatRounds.ci95_lo)}..${f2(treatRounds.ci95_hi)}) |`,
);
lines.push(
  `| **paired Δ rounds (treat − ctrl)** | **${f2(deltaStats.mean)}** (CI95 ${f2(deltaStats.ci95_lo)}..${f2(deltaStats.ci95_hi)}) |`,
);
lines.push('');
lines.push(
  '_Negative Δ = treatment clears FASTER (the buff helps). CI95 crossing 0 = no significant effect._',
);
lines.push('');
lines.push('## Derived win-rate: cleared within K rounds');
lines.push('');
lines.push('| K rounds | control | treatment | Δ pp |');
lines.push('|---:|---:|---:|---:|');
for (const K of Ks) {
  const c = clearedWithin(ctrl, K);
  const t = clearedWithin(treat, K);
  lines.push(`| ≤${K} | ${pct(c)} | ${pct(t)} | ${((t - c) * 100).toFixed(1)} |`);
}
lines.push('');

const report = {
  control_dir: controlDir,
  treatment_dir: treatDir,
  paired_seeds: seeds.length,
  both_victory_pairs: paired.length,
  outcome_counts: outcomeCounts,
  victory_rate: { control: victoryRate(ctrl), treatment: victoryRate(treat) },
  rounds_control: ctrlRounds,
  rounds_treatment: treatRounds,
  paired_delta_rounds: deltaStats,
  cleared_within: Ks.map((K) => ({
    K,
    control: clearedWithin(ctrl, K),
    treatment: clearedWithin(treat, K),
  })),
  per_seed: paired,
};

const md = lines.join('\n');
console.log(md);
if (OUT) {
  fs.writeFileSync(OUT, md + '\n');
  fs.writeFileSync(OUT.replace(/\.md$/, '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`\n-> ${OUT} (+ .json)`);
}
