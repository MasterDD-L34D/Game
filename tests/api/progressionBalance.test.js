// M13 P3 Phase B — balance pass: sanity check non-degenerate perk builds.
// Iterates tutte le combinazioni perk (a/b) per ogni job, verifica:
//   - Max cumulative stat_bonus per singola stat ≤ 4 (target non-degenerate)
//   - Stat aggregato |sum| ≤ 10 (trade-off preservati)
//   - Nessun perk effect schema invalido

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ProgressionEngine } = require('../../apps/backend/services/progression/progressionEngine');

const STAT_KEYS = ['hp_max', 'ap', 'attack_mod', 'defense_mod', 'initiative', 'attack_range'];
// Stat-specific caps: hp_max allowed bigger (tank harvester by design);
// ap/attack_mod/attack_range tightly capped (prevent degenerate burst builds).
const MAX_CUMULATIVE_PER_STAT = {
  hp_max: 10, // harvester tank: +5 +3 +1 = 9, within cap
  ap: 3, // cap multi-action escalation
  attack_mod: 3,
  defense_mod: 4,
  initiative: 4,
  attack_range: 2,
};
const MAX_AGGREGATE_ABS = 20; // sum of |stat_bonus| across all stats per build

function allPathsForJob(engine, jobId) {
  // Build all 2^6 = 64 combinations for levels 2..7.
  const paths = [];
  for (let mask = 0; mask < 64; mask += 1) {
    const picks = [];
    for (let l = 2; l <= 7; l += 1) {
      const bit = (mask >> (l - 2)) & 1;
      picks.push({ level: l, choice: bit === 0 ? 'a' : 'b' });
    }
    paths.push(picks);
  }
  return paths;
}

function simulateBuild(engine, jobId, picks) {
  const unit = engine.seed(`sim_${jobId}`, jobId, { xpTotal: 275 });
  let current = unit;
  for (const p of picks) {
    const r = engine.pickPerk(current, p.level, p.choice);
    current = r.unit;
  }
  return engine.effectiveStats(current);
}

test('no perk build exceeds stat-specific cap (non-degenerate build guard)', () => {
  const engine = new ProgressionEngine();
  const jobs = Object.keys(engine.perks?.jobs || {});
  const offenders = [];
  for (const jobId of jobs) {
    const paths = allPathsForJob(engine, jobId);
    for (const picks of paths) {
      const stats = simulateBuild(engine, jobId, picks);
      for (const key of STAT_KEYS) {
        const cap = MAX_CUMULATIVE_PER_STAT[key];
        if (Math.abs(stats[key]) > cap) {
          offenders.push({ jobId, stat: key, value: stats[key], cap });
        }
      }
    }
  }
  if (offenders.length > 0) {
    const sample = offenders.slice(0, 3);
    assert.fail(`${offenders.length} degenerate builds. Sample: ${JSON.stringify(sample)}`);
  }
});

test('aggregate |sum| of all stat bonuses in any build ≤ 20', () => {
  const engine = new ProgressionEngine();
  const jobs = Object.keys(engine.perks?.jobs || {});
  const violations = [];
  for (const jobId of jobs) {
    for (const picks of allPathsForJob(engine, jobId)) {
      const stats = simulateBuild(engine, jobId, picks);
      const total = Object.values(stats).reduce((s, v) => s + Math.abs(Number(v) || 0), 0);
      if (total > MAX_AGGREGATE_ABS) {
        violations.push({ jobId, total });
      }
    }
  }
  if (violations.length > 0) {
    const sample = violations.slice(0, 3);
    assert.fail(
      `${violations.length} builds exceed aggregate |sum| threshold. Sample: ${JSON.stringify(sample)}`,
    );
  }
});

test('every perk has valid effect schema (stat_bonus | ability_mod | passive)', () => {
  const engine = new ProgressionEngine();
  const invalid = [];
  for (const [jobId, job] of Object.entries(engine.perks.jobs || {})) {
    for (const [levelKey, pair] of Object.entries(job.perks || {})) {
      for (const side of ['perk_a', 'perk_b']) {
        const perk = pair[side];
        if (!perk) {
          invalid.push({ jobId, levelKey, side, reason: 'missing_perk' });
          continue;
        }
        if (!perk.id || typeof perk.id !== 'string') {
          invalid.push({ jobId, levelKey, side, reason: 'missing_id', perk });
          continue;
        }
        const effect = perk.effect || {};
        const hasEffect = Object.keys(effect).some(
          (k) => k.startsWith('stat_bonus') || k === 'ability_mod' || k === 'passive',
        );
        if (!hasEffect) {
          invalid.push({ jobId, levelKey, side, reason: 'no_effect', perkId: perk.id });
        }
      }
    }
  }
  assert.deepEqual(invalid, [], `Invalid perk schema: ${JSON.stringify(invalid.slice(0, 5))}`);
});

test('passive tags coverage: 5 runtime-wired tags exist somewhere in perks.yaml', () => {
  const engine = new ProgressionEngine();
  const wiredTags = new Set([
    'flank_bonus',
    'first_strike_bonus',
    'execution_bonus',
    'isolated_target_bonus',
    'long_range_bonus',
  ]);
  const foundTags = new Set();
  for (const job of Object.values(engine.perks.jobs || {})) {
    for (const pair of Object.values(job.perks || {})) {
      for (const perk of [pair.perk_a, pair.perk_b]) {
        const tag = perk?.effect?.passive?.tag;
        if (tag && wiredTags.has(tag)) foundTags.add(tag);
      }
    }
  }
  assert.equal(
    foundTags.size,
    wiredTags.size,
    `Missing wired tags in perks.yaml: ${[...wiredTags].filter((t) => !foundTags.has(t)).join(', ')}`,
  );
});
