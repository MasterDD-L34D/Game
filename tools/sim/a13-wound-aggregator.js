'use strict';
// A13 N=40 evidence aggregator (SPEC-I gate / SPEC-P PA2). Pure statistics over the
// per-run `chapters` the full-loop runner records in a13 mode (biome_id /
// biome_wounded / attempt).
//
// GOVERNANCE (L-069 posture, same as meta-band-aggregator): this module only
// REPORTS the wound-exposure + retry-conditional rates as evidence for the
// PRESSURE_PER_BIOME / DEGRADE_STEP (=1) ratification. It never ratifies; the
// cross-arm verdict (control vs wound-live) is master-dd's.
//
// Cross-arm note: in the CONTROL arm (A13_WOUND_READ_DISABLED=1) the PA3
// telegraph is off, so `biome_wounded` is false everywhere by construction. The
// arm-comparable split is therefore ATTEMPT-conditional (first try vs retry):
// a retry always follows a defeat in that biome, i.e. it fights the wound when
// the knob is live and a clean biome when it is not. `biome_wounded` stays in
// the output as the wound-live arm's exposure diagnostic.

function _isA13Chapter(c) {
  return c && typeof c === 'object' && 'attempt' in c;
}

function _rate(victories, n) {
  return n > 0 ? victories / n : null;
}

function aggregateA13(results) {
  let attempts = 0;
  let retries = 0;
  let woundedAttempts = 0;
  const first = { n: 0, victories: 0 };
  const retry = { n: 0, victories: 0, wounded_n: 0 };
  const perBiome = {};
  let runsCompleted = 0;
  let runsFailedOnRetry = 0;
  let runs = 0;

  for (const r of results || []) {
    if (!r || typeof r !== 'object') continue;
    runs += 1;
    if (r.completed) runsCompleted += 1;
    const chapters = (Array.isArray(r.chapters) ? r.chapters : []).filter(_isA13Chapter);
    for (const c of chapters) {
      attempts += 1;
      const victory = c.outcome === 'victory';
      const wounded = !!c.biome_wounded;
      if (wounded) woundedAttempts += 1;
      const isRetry = Number(c.attempt) > 1;
      if (isRetry) {
        retries += 1;
        retry.n += 1;
        if (victory) retry.victories += 1;
        if (wounded) retry.wounded_n += 1;
      } else {
        first.n += 1;
        if (victory) first.victories += 1;
      }
      const biome = c.biome_id || '(none)';
      if (!perBiome[biome]) perBiome[biome] = { attempts: 0, wounded: 0, victories: 0 };
      perBiome[biome].attempts += 1;
      if (wounded) perBiome[biome].wounded += 1;
      if (victory) perBiome[biome].victories += 1;
    }
    // Brick proxy: the run failed AND its last a13 attempt was a non-victory retry
    // (the retry chain was exhausted without recovering).
    const last = chapters[chapters.length - 1];
    if (!r.completed && last && Number(last.attempt) > 1 && last.outcome !== 'victory') {
      runsFailedOnRetry += 1;
    }
  }

  return {
    runs,
    attempts,
    retries,
    wounded_attempts: woundedAttempts,
    wound_exposure_rate: _rate(woundedAttempts, attempts),
    first_attempt: { ...first, victory_rate: _rate(first.victories, first.n) },
    retry: { ...retry, victory_rate: _rate(retry.victories, retry.n) },
    per_biome: perBiome,
    runs_completed: runsCompleted,
    runs_failed_on_retry: runsFailedOnRetry,
  };
}

function _pct(v) {
  return v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`;
}

function renderA13Md(a) {
  const lines = [];
  lines.push('### A13 wound exposure (evidence, not verdict)');
  lines.push('');
  lines.push(
    `- runs: ${a.runs} (completed ${a.runs_completed}, failed-on-retry ${a.runs_failed_on_retry})`,
  );
  lines.push(`- attempts: ${a.attempts} (retries ${a.retries})`);
  lines.push(
    `- wound exposure: ${a.wounded_attempts}/${a.attempts} attempts (${_pct(a.wound_exposure_rate)})`,
  );
  lines.push(
    `- first-attempt victory rate: ${a.first_attempt.victories}/${a.first_attempt.n} (${_pct(a.first_attempt.victory_rate)})`,
  );
  lines.push(
    `- retry victory rate: ${a.retry.victories}/${a.retry.n} (${_pct(a.retry.victory_rate)}) -- wounded retries: ${a.retry.wounded_n}`,
  );
  lines.push('');
  lines.push('| biome | attempts | wounded | victories |');
  lines.push('| --- | --- | --- | --- |');
  for (const [biome, b] of Object.entries(a.per_biome)) {
    lines.push(`| ${biome} | ${b.attempts} | ${b.wounded} | ${b.victories} |`);
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = { aggregateA13, renderA13Md };
