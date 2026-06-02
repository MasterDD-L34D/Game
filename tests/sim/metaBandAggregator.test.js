'use strict';
// fase-2b meta-band-aggregator: pure aggregation of N full-loop run-results into the 5
// meta band-metrics (spec §7) + placement vs the PROVISIONAL ranges. Tested on synthetic
// run-results so each metric + in-band flag is asserted exactly; the real-run wiring is
// covered by the fullLoopBatch integration test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregate, PROVISIONAL_BANDS } = require('../../tools/sim/meta-band-aggregator');

// Minimal full-loop run-result shaped like runFullLoop's return, with only the fields the
// aggregator reads. `chapters` carry per-chapter build-power (xpGranted + mpEarned).
function synthRun(o = {}) {
  const chapters = o.chapters || [
    { outcome: 'victory', xpGranted: 12, mpEarned: 2 },
    { outcome: 'victory', xpGranted: 12, mpEarned: 2 },
    { outcome: 'victory', xpGranted: 12, mpEarned: 2 },
  ];
  return {
    completed: o.completed ?? true,
    chapters,
    finalRoster: o.finalRoster ?? ['a', 'b'],
    recruited: o.recruited ?? ['r1', 'r2'],
    recruitedSpecies: o.recruitedSpecies ?? ['dune-stalker', 'sand-burrower'],
    economyRecruited: o.economyRecruited ?? ['e1'],
    offspring: o.offspring ?? 1,
    economyAffinityProven: o.economyAffinityProven ?? true,
    initialRosterSize: o.initialRosterSize ?? 4,
    economy: o.economy || {
      peEarnedTotal: 9,
      xpGrantedTotal: 36,
      mpEarnedTotal: 6,
      piSpentTotal: 0,
    },
  };
}

test('aggregate: completion_rate = completed/N, in-band at 0.40-0.70', () => {
  // 2 of 4 completed -> 0.50, inside the provisional 0.40-0.70 band.
  const runs = [
    synthRun(),
    synthRun(),
    synthRun({ completed: false }),
    synthRun({ completed: false }),
  ];
  const r = aggregate(runs);
  assert.equal(r.n, 4);
  assert.equal(r.provisional, true);
  assert.equal(r.metrics.completion_rate.value, 0.5);
  assert.deepEqual(r.metrics.completion_rate.range, PROVISIONAL_BANDS.completion_rate);
  assert.equal(r.metrics.completion_rate.in_band, true);
});

test('aggregate: completion_rate above band (all completed = too easy) flagged out', () => {
  const runs = [synthRun(), synthRun(), synthRun()];
  const r = aggregate(runs);
  assert.equal(r.metrics.completion_rate.value, 1);
  assert.equal(r.metrics.completion_rate.in_band, false);
});

test('aggregate: roster_attrition = survivors / units-that-fought, in (0,1)', () => {
  // initial 4, 0 combat-recruits, 2 survivors -> 0.5 survivor ratio -> in band.
  const lossy = synthRun({ initialRosterSize: 4, recruited: [], finalRoster: ['a', 'b'] });
  const r = aggregate([lossy]);
  assert.equal(r.metrics.roster_attrition.value, 0.5);
  assert.equal(r.metrics.roster_attrition.in_band, true);
});

test('aggregate: roster_attrition = 1.0 (no losses) flagged out of band', () => {
  // initial 2 + 2 combat-recruits = 4 fought, all 4 survive -> ratio 1.0 -> too easy.
  const noLoss = synthRun({
    initialRosterSize: 2,
    recruited: ['r1', 'r2'],
    finalRoster: ['a', 'b', 'r1', 'r2'],
  });
  const r = aggregate([noLoss]);
  assert.equal(r.metrics.roster_attrition.value, 1);
  assert.equal(r.metrics.roster_attrition.in_band, false);
});

test('aggregate: economy_flow build-power drift ~1.0 (flat) in band + pi_sink gap surfaced', () => {
  const r = aggregate([synthRun(), synthRun()]);
  const ef = r.metrics.economy_flow;
  assert.equal(ef.pe_earned_avg, 9);
  assert.equal(ef.build_power_avg, 42); // 36 xp + 6 mp
  assert.equal(ef.build_power_drift, 1); // flat per-chapter build power
  assert.equal(ef.pi_sink_exercised, false); // no PI sink wired in the loop yet
  assert.equal(ef.in_band, true);
});

test('aggregate: economy_flow rejects no-signal runs (Codex #2568 P2)', () => {
  // Failed runs with NO reward telemetry (empty chapters + zero economy) -> buildPowerDrift
  // returns the neutral 1, which sits INSIDE the drift band. economy_flow must NOT certify a
  // healthy economy from zero signal (a backend regression that stops emitting XP/MP/PE, or
  // an all-failed batch, must read out-of-band, not falsely green).
  const noSignal = synthRun({
    completed: false,
    chapters: [],
    economy: { peEarnedTotal: 0, xpGrantedTotal: 0, mpEarnedTotal: 0, piSpentTotal: 0 },
  });
  const r = aggregate([noSignal, noSignal]);
  assert.equal(r.metrics.economy_flow.build_power_avg, 0);
  assert.equal(r.metrics.economy_flow.has_signal, false);
  assert.equal(r.metrics.economy_flow.in_band, false, 'no economy signal cannot be in band');
});

test('aggregate: economy_flow runaway build-power drift (>2x) flagged out', () => {
  const creep = synthRun({
    chapters: [
      { outcome: 'victory', xpGranted: 10, mpEarned: 0 },
      { outcome: 'victory', xpGranted: 20, mpEarned: 0 },
      { outcome: 'victory', xpGranted: 30, mpEarned: 0 },
    ],
  });
  const r = aggregate([creep]);
  assert.equal(r.metrics.economy_flow.build_power_drift, 3); // 30 / 10
  assert.equal(r.metrics.economy_flow.in_band, false);
});

test('aggregate: economy_flow surfaces PI pick attempts + insufficiency (sink wired, fase-2c)', () => {
  // The PI sink is now WIRED: a run can attempt hybrid picks but the economy may not afford
  // them (attempts>0, spent=0, insufficient>0). The aggregator surfaces that honestly.
  const r = aggregate([
    synthRun({
      economy: {
        peEarnedTotal: 24,
        xpGrantedTotal: 36,
        mpEarnedTotal: 6,
        piSpentTotal: 0,
        piPickAttempts: 3,
        piInsufficient: 3,
      },
    }),
  ]);
  const ef = r.metrics.economy_flow;
  assert.equal(ef.pi_pick_attempts, 3);
  assert.equal(ef.pi_insufficient, 3);
  assert.equal(ef.pi_sink_exercised, false);
  assert.match(ef.note, /unaffordable|insufficient/i);
});

test('aggregate: economy_flow reports PI sink exercised when PI is actually spent', () => {
  const r = aggregate([
    synthRun({
      economy: {
        peEarnedTotal: 30,
        xpGrantedTotal: 36,
        mpEarnedTotal: 6,
        piSpentTotal: 5,
        piPickAttempts: 1,
        piInsufficient: 0,
      },
    }),
  ]);
  assert.equal(r.metrics.economy_flow.pi_sink_exercised, true);
  assert.match(r.metrics.economy_flow.note, /sink exercised/i);
});

test('aggregate: economy_flow notes picks BLOCKED when attempted but neither spent nor insufficient', () => {
  // The real cave_path case: the sim roster's job has no perk pair (409), so picks are
  // attempted but never resolve -- NOT a PI-budget problem. The note must say "blocked",
  // not "unaffordable" (the verify-first finding: stalker is not a perk-job).
  const r = aggregate([
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
  ]);
  const ef = r.metrics.economy_flow;
  assert.equal(ef.pi_pick_attempts, 18);
  assert.equal(ef.pi_insufficient, 0);
  assert.equal(ef.pi_sink_exercised, false);
  assert.match(ef.note, /blocked/i);
});

test('aggregate: relationship_progress in band when recruit + earned-affinity + mating all fire', () => {
  const r = aggregate([synthRun(), synthRun()]);
  const rp = r.metrics.relationship_progress;
  assert.equal(rp.recruit_rate, 2); // 2 combat-recruits per run
  assert.equal(rp.affinity_proven_rate, 1); // every run proved the earned gate
  assert.equal(rp.mating_rate, 1); // 1 offspring per run
  assert.equal(rp.in_band, true);
});

test('aggregate: relationship_progress stalled (no recruit, no affinity) flagged out', () => {
  const stalled = synthRun({
    recruited: [],
    economyRecruited: [],
    economyAffinityProven: false,
    offspring: 0,
  });
  const r = aggregate([stalled]);
  assert.equal(r.metrics.relationship_progress.in_band, false);
});

test('aggregate: offspring_viability in band when offspring rolled (>=1 avg)', () => {
  const r = aggregate([synthRun(), synthRun()]);
  const ov = r.metrics.offspring_viability;
  assert.equal(ov.offspring_avg, 1);
  assert.equal(ov.in_band, true);
});

test('aggregate: offspring_viability out of band when no breeding happens', () => {
  const r = aggregate([synthRun({ offspring: 0 }), synthRun({ offspring: 0 })]);
  assert.equal(r.metrics.offspring_viability.offspring_avg, 0);
  assert.equal(r.metrics.offspring_viability.in_band, false);
});

test('aggregate: roster_composition maps recruited species to role_class profile', () => {
  // dune-stalker=APEX, ferrocolonia=PREDATOR, nano-rust-bloom=HAZARD -> 3 distinct roles.
  const r = aggregate([
    synthRun({
      recruitedSpecies: ['dune-stalker', 'ferrocolonia-magnetotattica', 'nano-rust-bloom'],
    }),
  ]);
  const rc = r.metrics.roster_composition;
  assert.deepEqual(rc.role_profile, { APEX: 1, PREDATOR: 1, HAZARD: 1 });
  assert.equal(rc.distinct_roles, 3);
  assert.equal(rc.in_band, true); // >= 3 distinct roles = healthy spread
});

test('aggregate: roster_composition is POLICY-SENSITIVE (the P4 fix, dominant roles diverge)', () => {
  // The headline finding was that quantity metrics are policy-insensitive. Composition is
  // NOT: an APEX/PREDATOR-leaning roster and a HAZARD/PREY-leaning one yield DIFFERENT
  // dominant roles -> P4 (temperament) becomes measurable.
  const analyst = aggregate([
    synthRun({ recruitedSpecies: ['dune-stalker', 'dune-stalker', 'ferrocolonia-magnetotattica'] }),
  ]);
  const explorer = aggregate([
    synthRun({ recruitedSpecies: ['nano-rust-bloom', 'nano-rust-bloom', 'sand-burrower'] }),
  ]);
  assert.deepEqual(analyst.metrics.roster_composition.dominant_roles, ['APEX']);
  assert.deepEqual(explorer.metrics.roster_composition.dominant_roles, ['HAZARD']);
  assert.notDeepEqual(
    analyst.metrics.roster_composition.dominant_roles,
    explorer.metrics.roster_composition.dominant_roles,
  );
});

test('aggregate: roster_composition out of band when < 3 distinct roles (collapsed)', () => {
  const r = aggregate([synthRun({ recruitedSpecies: ['dune-stalker', 'dune-stalker'] })]);
  assert.equal(r.metrics.roster_composition.distinct_roles, 1);
  assert.equal(r.metrics.roster_composition.in_band, false);
});

test('aggregate: roster_composition excludes UNKNOWN from diversity + dominance (Codex #2573 P2)', () => {
  // An unmapped/typo species (roleOf -> UNKNOWN) must NOT count as a real ecological role:
  // 2 valid roles + 1 unknown is NOT a healthy 3-role spread. UNKNOWN is tracked separately
  // (unknown_count) to flag invalid telemetry, never inflating distinct_roles or dominance.
  const r = aggregate([
    synthRun({ recruitedSpecies: ['dune-stalker', 'sand-burrower', 'not-a-species'] }),
  ]);
  const rc = r.metrics.roster_composition;
  assert.equal(rc.distinct_roles, 2, 'unknown not counted as a distinct role');
  assert.equal(rc.unknown_count, 1, 'unknowns tracked separately');
  assert.ok(!rc.dominant_roles.includes('UNKNOWN'), 'UNKNOWN never dominant');
  assert.ok(!('UNKNOWN' in rc.role_profile), 'UNKNOWN kept out of the role profile');
  assert.equal(rc.in_band, false, '2 real roles + 1 unknown is not a healthy 3-role spread');
});

test('aggregate: empty input -> n=0, every metric out of band, never throws', () => {
  const r = aggregate([]);
  assert.equal(r.n, 0);
  for (const k of Object.keys(r.metrics)) {
    assert.equal(r.metrics[k].in_band, false, `${k} out of band on empty input`);
  }
});

test('PROVISIONAL_BANDS: documents WARN provenance (Claude-derived, pending master-dd)', () => {
  // The bands are provisional ranges, not ratified numbers (L-069: master-dd ratifies the
  // exact band post-N=40). The module must say so to prevent a downstream reader treating
  // them as canon.
  assert.match(PROVISIONAL_BANDS.note || '', /WARN|provisional|pending master-dd/i);
});
