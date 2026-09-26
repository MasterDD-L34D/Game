'use strict';
// Opt 3 N=40 evidence aggregator (#2679). Pure statistics over the per-run
// `personalitySamples` the full-loop runner collects (combat-adapter GET
// /:id/vc -> debrief_payload.per_actor[uid].personality_axes).
//
// GOVERNANCE (L-069 posture, same as meta-band-aggregator): this module only
// REPORTS distributions as evidence for the personality-axes ratification
// batch (PROPOSED constants + J_P + E_I flags, SPEC-M item 2). It never
// ratifies, never enforces thresholds; master-dd owns the verdict.
//
// Sample row shape (runner): { step, encounter, units: [{ unit_id, faction,
// axes: {5 EN creature keys} }] }.

const AXIS_KEYS = [
  'symbiosis_predation',
  'explore_caution',
  'solitary_swarm',
  'memory_instinct',
  'agile_robust',
];

const NEUTRAL_EPS = 1e-9;

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// Flatten batch results -> one row per (run, step, unit) with a full axes map.
function collectRows(results) {
  const rows = [];
  for (const r of results || []) {
    const samples = (r && r.personalitySamples) || [];
    for (const s of samples) {
      for (const u of (s && s.units) || []) {
        if (!u || typeof u !== 'object' || !u.axes || typeof u.axes !== 'object') continue;
        const axes = {};
        let complete = true;
        for (const key of AXIS_KEYS) {
          const v = num(u.axes[key]);
          if (v === null) {
            complete = false;
            break;
          }
          axes[key] = v;
        }
        if (!complete) continue;
        rows.push({
          unit_id: String(u.unit_id || ''),
          faction: u.faction === 'player' ? 'player' : 'sistema',
          axes,
        });
      }
    }
  }
  return rows;
}

function axisStats(values) {
  const n = values.length;
  if (n === 0) return { n: 0, mean: null, sd: null, min: null, max: null, neutral_rate: null };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let neutral = 0;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    if (Math.abs(v - 0.5) < NEUTRAL_EPS) neutral += 1;
  }
  const mean = sum / n;
  let varSum = 0;
  for (const v of values) varSum += (v - mean) ** 2;
  return {
    n,
    mean,
    sd: Math.sqrt(varSum / n), // population sd (descriptive, not inferential)
    min,
    max,
    neutral_rate: neutral / n,
  };
}

// Pearson r over paired samples; null when either side has zero variance
// (constant axis -> correlation undefined, NEVER NaN).
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx < NEUTRAL_EPS || syy < NEUTRAL_EPS) return null;
  return sxy / Math.sqrt(sxx * syy);
}

function perAxis(rows) {
  const out = {};
  for (const key of AXIS_KEYS) {
    out[key] = axisStats(rows.map((r) => r.axes[key]));
  }
  return out;
}

function aggregatePersonality(results) {
  const rows = collectRows(results);
  const agg = {
    n_samples: rows.length,
    per_axis: perAxis(rows),
    degenerate_rate: null,
    dominant_hist: {},
    correlations: [],
    by_faction: {},
  };
  if (rows.length === 0) return agg;

  // Degenerate = the whole 5-axis profile is neutral (radar would carry zero
  // signal; the Godot surface hides it -- high rate means the sim policy or
  // the formulas discriminate nothing).
  let degenerate = 0;
  for (const r of rows) {
    const allNeutral = AXIS_KEYS.every((k) => Math.abs(r.axes[k] - 0.5) < NEUTRAL_EPS);
    if (allNeutral) degenerate += 1;
    else {
      // Dominant axis (top-1 by |v - 0.5|; ties resolve by AXIS_KEYS order).
      let best = null;
      let bestD = -1;
      for (const k of AXIS_KEYS) {
        const d = Math.abs(r.axes[k] - 0.5);
        if (d > bestD + NEUTRAL_EPS) {
          bestD = d;
          best = k;
        }
      }
      agg.dominant_hist[best] = (agg.dominant_hist[best] || 0) + 1;
    }
  }
  agg.degenerate_rate = degenerate / rows.length;

  // Pairwise correlations (collinearity check: the Opt 3 research claims each
  // axis has a distinct source -> |r| ~ 1 between axes would refute that).
  for (let i = 0; i < AXIS_KEYS.length; i += 1) {
    for (let j = i + 1; j < AXIS_KEYS.length; j += 1) {
      const a = AXIS_KEYS[i];
      const b = AXIS_KEYS[j];
      agg.correlations.push({
        pair: [a, b],
        r: pearson(
          rows.map((r) => r.axes[a]),
          rows.map((r) => r.axes[b]),
        ),
      });
    }
  }

  for (const faction of ['player', 'sistema']) {
    const sub = rows.filter((r) => r.faction === faction);
    agg.by_faction[faction] = { n_samples: sub.length, per_axis: perAxis(sub) };
  }
  return agg;
}

function fmt(v, digits = 3) {
  if (v === null || v === undefined) return '-';
  return Number(v).toFixed(digits);
}

// Markdown evidence section for the batch report. Empty string when no samples
// (personality capture off / older runner) so the band report is unchanged.
function renderPersonalityMd(agg) {
  if (!agg || !agg.n_samples) return '';
  const lines = [];
  lines.push('## Personality axes (Opt 3 OUTPUT) -- N-sample evidence');
  lines.push('');
  lines.push(
    `${agg.n_samples} per-unit samples. Constants are PROPOSED (blend weights + stat ` +
      'bounds, #2679): this section is EVIDENCE for the N=40 ratification batch ' +
      '(incl. the J_P + formPulseVc E_I flags); master-dd ratifies, the batch never does.',
  );
  lines.push('');
  lines.push('| axis | n | mean | sd | min | max | neutral_rate |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const key of AXIS_KEYS) {
    const s = agg.per_axis[key];
    lines.push(
      `| ${key} | ${s.n} | ${fmt(s.mean)} | ${fmt(s.sd)} | ${fmt(s.min)} | ${fmt(s.max)} | ${fmt(
        s.neutral_rate,
      )} |`,
    );
  }
  lines.push('');
  lines.push(`Degenerate (all-5 neutral) rate: ${fmt(agg.degenerate_rate)}.`);
  const domPairs = Object.entries(agg.dominant_hist).sort((a, b) => b[1] - a[1]);
  lines.push(
    `Dominant-axis histogram: ${domPairs.map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.`,
  );
  const strong = agg.correlations.filter((c) => c.r !== null && Math.abs(c.r) >= 0.8);
  lines.push(
    `Collinearity (|r| >= 0.8): ${
      strong.length ? strong.map((c) => `${c.pair.join('~')} r=${fmt(c.r, 2)}`).join(', ') : 'none'
    }.`,
  );
  for (const faction of ['player', 'sistema']) {
    const f = agg.by_faction[faction];
    if (!f || !f.n_samples) continue;
    const means = AXIS_KEYS.map((k) => `${k} ${fmt(f.per_axis[k].mean, 2)}`).join(', ');
    lines.push(`Faction ${faction} (${f.n_samples}): ${means}.`);
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = { AXIS_KEYS, aggregatePersonality, renderPersonalityMd, collectRows };
