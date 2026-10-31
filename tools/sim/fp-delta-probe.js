'use strict';
// fp-delta-probe (MA3 N=40) -- offline paired A/B for MAX_FP_VC_DELTA tuning.
//
// Reads the runs.jsonl produced by full-loop-batch (with per-unit mbti_axes,
// captured by combat-adapter from GET /:id/vc) and re-applies the REAL engine
// transform `applyFormPulseDelta` to every baseline sample, across synthetic
// Form Pulse profiles x candidate caps. Paired by construction: same sample,
// with/without nudge -> zero between-arm variance, the measured effect is the
// transform itself (mapping ratified RATIFIED-PROVISIONAL, MA3 2026-06-10).
//
// Metrics per (profile, cap, mbti axis):
//   n              -- samples with a finite baseline value on that axis
//   mean_abs_shift -- average |value' - value| (expected = |profile| * cap, minus clamp)
//   flip_rate      -- share of samples whose 0.5-side changes (MBTI letter proxy)
//   clamp_rate     -- share clamped at [0,1] (shift < expected)
//
// L-069 posture: this probe REPORTS; the cap ratification is a master-dd verdict.
//
// Usage:
//   node tools/sim/fp-delta-probe.js --runs-jsonl reports/sim/fp-delta-n40-<date>/runs.jsonl \
//     --out reports/sim/fp-delta-n40-<date>
//   (optional) --caps 0.03,0.05,0.10

const fs = require('node:fs');
const path = require('node:path');

const {
  applyFormPulseDelta,
  PROPOSED_FP_VC_MAPPING,
} = require('../../apps/backend/services/formPulseVc');

// Synthetic branco-level FP profiles (aggregated swipe direction per creature axis).
// Extremes bound the effect; half = realistic mixed strength; neutral = sanity (0 shift).
const DEFAULT_PROFILES = {
  full_plus: { solitary_swarm: 1, explore_caution: 1, symbiosis_predation: 1, memory_instinct: 1 },
  full_minus: {
    solitary_swarm: -1,
    explore_caution: -1,
    symbiosis_predation: -1,
    memory_instinct: -1,
  },
  half_plus: {
    solitary_swarm: 0.5,
    explore_caution: 0.5,
    symbiosis_predation: 0.5,
    memory_instinct: 0.5,
  },
  neutral: { solitary_swarm: 0, explore_caution: 0, symbiosis_predation: 0, memory_instinct: 0 },
};

const DEFAULT_CAPS = [0.03, 0.05, 0.1];

// Lift per-unit {unit_id, faction, mbti_axes, run_id, step} rows out of batch JSONL lines.
function flattenRunsJsonl(lines) {
  const flat = [];
  for (const line of lines) {
    if (!line || !line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    for (const sample of row.personality_samples || []) {
      for (const unit of sample.units || []) {
        if (!unit || !unit.mbti_axes || typeof unit.mbti_axes !== 'object') continue;
        flat.push({
          run_id: row.run_id,
          step: sample.step,
          unit_id: unit.unit_id,
          faction: unit.faction,
          mbti_axes: unit.mbti_axes,
        });
      }
    }
  }
  return flat;
}

// Paired A/B across profiles x caps. Pure: no IO.
function analyzeSamples(samples, opts = {}) {
  const profiles = opts.profiles || DEFAULT_PROFILES;
  const caps = opts.caps || DEFAULT_CAPS;
  const mapping = opts.mapping || PROPOSED_FP_VC_MAPPING;
  const mappedAxes = [...new Set(Object.values(mapping).map((m) => m.mbti))];

  const stats = [];
  for (const [profileName, fpAxes] of Object.entries(profiles)) {
    for (const cap of caps) {
      const acc = {};
      for (const axis of mappedAxes) {
        acc[axis] = { n: 0, sumAbsShift: 0, flips: 0, clamps: 0 };
      }
      // expected |shift| per mbti axis for this profile (pre-clamp)
      const expected = {};
      for (const [fpKey, cfg] of Object.entries(mapping)) {
        const raw = Number(fpAxes[fpKey]);
        if (!Number.isFinite(raw)) continue;
        expected[cfg.mbti] = Math.abs(Math.max(-1, Math.min(1, raw))) * cap;
      }

      for (const sample of samples) {
        const base = sample && sample.mbti_axes;
        if (!base || typeof base !== 'object') continue;
        const adjusted = applyFormPulseDelta(base, fpAxes, { mapping, maxDelta: cap });
        for (const axis of mappedAxes) {
          const b = base[axis];
          const a = adjusted[axis];
          if (!b || typeof b !== 'object' || b.value == null) continue;
          const bv = Number(b.value);
          if (!Number.isFinite(bv)) continue;
          const av = Number(a.value);
          const shift = Math.abs(av - bv);
          const bucket = acc[axis];
          bucket.n += 1;
          bucket.sumAbsShift += shift;
          if (bv < 0.5 !== av < 0.5) bucket.flips += 1;
          if (shift < (expected[axis] || 0) - 1e-9) bucket.clamps += 1;
        }
      }

      for (const axis of mappedAxes) {
        const bucket = acc[axis];
        stats.push({
          profile: profileName,
          cap,
          axis,
          n: bucket.n,
          mean_abs_shift: bucket.n ? bucket.sumAbsShift / bucket.n : 0,
          expected_shift: expected[axis] || 0,
          flips: bucket.flips,
          flip_rate: bucket.n ? bucket.flips / bucket.n : 0,
          clamps: bucket.clamps,
          clamp_rate: bucket.n ? bucket.clamps / bucket.n : 0,
        });
      }
    }
  }
  return stats;
}

function renderProbeMd(stats, meta = {}) {
  const lines = [];
  lines.push(`# FP->VC delta probe (MA3 N=40) -- ${meta.date || ''}`);
  lines.push('');
  lines.push(
    `Paired offline A/B on ${meta.samples ?? '?'} per-unit baseline mbti_axes ` +
      `(${meta.runs ?? '?'} run, source ${meta.source || '?'}). Transform = REAL engine ` +
      'applyFormPulseDelta (mapping RATIFIED-PROVISIONAL MA3). L-069: report only, ' +
      'cap verdict = master-dd.',
  );
  lines.push('');
  lines.push('| profile | cap | axis | n | mean shift | expected | flip rate | clamp rate |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const s of stats) {
    lines.push(
      `| ${s.profile} | ${s.cap} | ${s.axis} | ${s.n} | ${s.mean_abs_shift.toFixed(4)} | ` +
        `${s.expected_shift.toFixed(4)} | ${(s.flip_rate * 100).toFixed(1)}% | ` +
        `${(s.clamp_rate * 100).toFixed(1)}% |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { capsArg: null, runsJsonl: null, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--runs-jsonl':
        args.runsJsonl = argv[++i];
        break;
      case '--out':
        args.out = argv[++i];
        break;
      case '--caps':
        args.capsArg = argv[++i];
        break;
      default:
        break;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.runsJsonl || !args.out) {
    console.error(
      'usage: node tools/sim/fp-delta-probe.js --runs-jsonl <runs.jsonl> --out <dir> [--caps 0.03,0.05,0.10]',
    );
    process.exit(2);
  }
  const caps = args.capsArg ? args.capsArg.split(',').map(Number) : DEFAULT_CAPS;
  const lines = fs.readFileSync(args.runsJsonl, 'utf8').split('\n');
  const samples = flattenRunsJsonl(lines);
  const runs = new Set(samples.map((s) => s.run_id)).size;
  const stats = analyzeSamples(samples, { caps });
  const meta = {
    date: new Date().toISOString().slice(0, 10),
    samples: samples.length,
    runs,
    source: args.runsJsonl,
  };

  fs.mkdirSync(args.out, { recursive: true });
  const summaryPath = path.join(args.out, 'fp-delta-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ meta, stats }, null, 2) + '\n', 'utf8');
  const mdPath = path.join(args.out, 'fp-delta-report.md');
  fs.writeFileSync(mdPath, renderProbeMd(stats, meta) + '\n', 'utf8');
  console.log(`[fp-delta-probe] samples=${samples.length} runs=${runs}`);
  console.log(`[fp-delta-probe] summary: ${summaryPath}`);
  console.log(`[fp-delta-probe] report:  ${mdPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeSamples, flattenRunsJsonl, renderProbeMd, DEFAULT_PROFILES };
