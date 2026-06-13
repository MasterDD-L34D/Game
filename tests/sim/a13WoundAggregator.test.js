// A13 N=40 evidence aggregator -- pure stats over runs[].chapters[] (a13 fields:
// biome_id / biome_wounded / attempt). Reports, never ratifies (L-069 posture).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { aggregateA13, renderA13Md } = require('../../tools/sim/a13-wound-aggregator');

function run(chapters, completed) {
  return { completed, chapters };
}
function ch(outcome, attempt, biomeWounded, biomeId = 'savana') {
  return { outcome, attempt, biome_wounded: biomeWounded, biome_id: biomeId, encounter: 'e' };
}

test('aggregateA13: exposure + first-attempt vs retry victory split', () => {
  const results = [
    // run 1: clean first-attempt win, then defeat -> wounded retry win
    run([ch('victory', 1, false), ch('defeat', 1, false), ch('victory', 2, true)], true),
    // run 2: defeat -> retry (wounded) -> defeat = run failed on retry
    run([ch('defeat', 1, false), ch('defeat', 2, true)], false),
  ];
  const a = aggregateA13(results);
  assert.equal(a.runs, 2);
  assert.equal(a.attempts, 5);
  assert.equal(a.retries, 2);
  assert.equal(a.wounded_attempts, 2);
  assert.equal(a.wound_exposure_rate, 2 / 5);
  assert.equal(a.first_attempt.n, 3);
  assert.equal(a.first_attempt.victories, 1);
  assert.equal(a.first_attempt.victory_rate, 1 / 3);
  assert.equal(a.retry.n, 2);
  assert.equal(a.retry.victories, 1);
  assert.equal(a.retry.victory_rate, 1 / 2);
  assert.equal(a.retry.wounded_n, 2);
  assert.equal(a.runs_failed_on_retry, 1);
  assert.equal(a.runs_completed, 1);
});

test('aggregateA13: per-biome breakdown', () => {
  const results = [
    run([ch('defeat', 1, false, 'savana'), ch('victory', 2, true, 'savana')], true),
    run([ch('victory', 1, false, 'caverna')], true),
  ];
  const a = aggregateA13(results);
  assert.deepEqual(Object.keys(a.per_biome).sort(), ['caverna', 'savana']);
  assert.equal(a.per_biome.savana.attempts, 2);
  assert.equal(a.per_biome.savana.wounded, 1);
  assert.equal(a.per_biome.savana.victories, 1);
  assert.equal(a.per_biome.caverna.attempts, 1);
});

test('aggregateA13: chapters without a13 fields -> excluded (no NaN), null biome bucketed', () => {
  const results = [
    run([{ outcome: 'victory' }], true), // a13 fields absent (default-mode run)
    run([ch('victory', 1, false, null)], true),
  ];
  const a = aggregateA13(results);
  assert.equal(a.attempts, 1, 'only a13-shaped chapters counted');
  assert.equal(a.per_biome['(none)'].attempts, 1);
  assert.equal(a.retry.victory_rate, null, 'no retries -> null rate, not NaN');
});

test('renderA13Md: renders rates + per-biome table', () => {
  const results = [run([ch('defeat', 1, false), ch('victory', 2, true)], true)];
  const md = renderA13Md(aggregateA13(results));
  assert.ok(md.includes('wound exposure'));
  assert.ok(md.includes('savana'));
  assert.ok(md.includes('retry'));
});
