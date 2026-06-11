// OD-058 D1 N=40 (issue #2531) -- overcharge action-economy probe, pure statistics.
// aggregateActionEconomy: per-arm summary (win rate + Wilson CI95, mean/sd/CI95 for
// rounds / player_attacks / overcharge_uses). pairDelta: per-seed paired deltas
// (live - control) so the cross-arm comparison is variance-controlled (same seeds,
// same scenario -- the fp-delta-probe #2701 paired pattern).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { aggregateActionEconomy, pairDelta } = require('../../tools/sim/overcharge-probe');

const mkRun = (seed, outcome, rounds, attacks, uses, survivors = 1) => ({
  seed,
  outcome,
  rounds,
  playerAttacks: attacks,
  overchargeUses: uses,
  survivors,
});

test('aggregateActionEconomy: n, win_rate, means and CI bounds', () => {
  const runs = [
    mkRun('s1', 'victory', 10, 20, 2),
    mkRun('s2', 'defeat', 20, 10, 1),
    mkRun('s3', 'victory', 30, 30, 3),
    mkRun('s4', 'victory', 20, 20, 2),
  ];
  const agg = aggregateActionEconomy(runs);
  assert.equal(agg.n, 4);
  assert.equal(agg.win_rate, 0.75);
  // Wilson CI is a proper sub-interval of [0,1] around the rate.
  assert.ok(agg.win_ci95[0] > 0 && agg.win_ci95[0] < 0.75);
  assert.ok(agg.win_ci95[1] > 0.75 && agg.win_ci95[1] < 1);
  assert.equal(agg.rounds.mean, 20);
  assert.equal(agg.player_attacks.mean, 20);
  assert.equal(agg.overcharge_uses.mean, 2);
  // CI95 brackets the mean symmetrically (normal approx).
  assert.ok(agg.rounds.ci95[0] < 20 && agg.rounds.ci95[1] > 20);
});

test('aggregateActionEconomy: empty -> n 0, null rates (no fabricated numbers)', () => {
  const agg = aggregateActionEconomy([]);
  assert.equal(agg.n, 0);
  assert.equal(agg.win_rate, null);
  assert.equal(agg.rounds.mean, null);
});

test('pairDelta: per-seed paired diffs (live - control) + win flip tally', () => {
  const control = [mkRun('s1', 'defeat', 20, 10, 0), mkRun('s2', 'victory', 30, 25, 0)];
  const live = [mkRun('s1', 'victory', 14, 16, 3), mkRun('s2', 'victory', 24, 28, 2)];
  const d = pairDelta(control, live);
  assert.equal(d.pairs, 2);
  // s1: rounds 14-20 = -6; s2: 24-30 = -6 -> mean -6
  assert.equal(d.rounds_delta.mean, -6);
  // s1: attacks +6; s2: +3 -> mean 4.5
  assert.equal(d.attacks_delta.mean, 4.5);
  assert.equal(d.flips.loss_to_win, 1);
  assert.equal(d.flips.win_to_loss, 0);
  assert.equal(d.win_rate_delta, 0.5);
});

test('pairDelta: unmatched seeds are dropped, not invented', () => {
  const control = [mkRun('s1', 'victory', 10, 10, 0)];
  const live = [mkRun('s2', 'victory', 12, 12, 1)];
  const d = pairDelta(control, live);
  assert.equal(d.pairs, 0);
});
