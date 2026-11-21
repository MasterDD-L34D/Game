// A2 pressure_tier_floor N=40 band-verify probe -- pure helpers.
// FLOOR_MIN mapping, aggregateOutcomes (win/defeat/timeout rates + Wilson CI),
// verdictFor (GREEN/AMBER/RED vs target_bands), encounterFor, loadBands.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ENCOUNTERS,
  FLOOR_MIN,
  loadBands,
  verdictFor,
  aggregateOutcomes,
  encounterFor,
} = require('../../tools/sim/pressure-floor-probe');

const mkRun = (seed, outcome, rounds = 10, survivors = 1, spawns = 0) => ({
  seed,
  outcome,
  rounds,
  survivors,
  spawns,
});

test('FLOOR_MIN: canonical tier-floor mapping (mirror sessionHelpers)', () => {
  assert.deepEqual({ ...FLOOR_MIN }, { 1: 0, 2: 25, 3: 50, 4: 75, 5: 95 });
});

test('ENCOUNTERS: the 10 floored encounters, tutorial floor 1 is the no-op control', () => {
  assert.equal(ENCOUNTERS.length, 10);
  const tut = ENCOUNTERS.filter((e) => e.class === 'tutorial');
  assert.equal(tut.length, 2);
  assert.ok(tut.every((e) => e.floor === 1));
  // exactly one reinforcement encounter (needs the wider board).
  const reinf = ENCOUNTERS.filter((e) => e.reinf);
  assert.equal(reinf.length, 1);
  assert.equal(reinf[0].id, 'enc_hardcore_reinf_01');
  assert.equal(reinf[0].modulation, 'duo_hardcore');
});

test('encounterFor: known id resolves, unknown -> null', () => {
  assert.equal(encounterFor('enc_savana_01').class, 'standard');
  assert.equal(encounterFor('enc_savana_01').floor, 2);
  assert.equal(encounterFor('nope'), null);
});

test('aggregateOutcomes: win/defeat/timeout rates + Wilson CI bracket', () => {
  const runs = [
    mkRun('s1', 'victory'),
    mkRun('s2', 'defeat'),
    mkRun('s3', 'victory'),
    mkRun('s4', 'timeout'),
  ];
  const a = aggregateOutcomes(runs);
  assert.equal(a.n, 4);
  assert.equal(a.win_rate, 0.5);
  assert.equal(a.defeat_rate, 0.25);
  assert.equal(a.timeout_rate, 0.25);
  // Wilson CI is a proper sub-interval of [0,1] around the rate.
  assert.ok(a.win_ci95[0] > 0 && a.win_ci95[0] < 0.5);
  assert.ok(a.win_ci95[1] > 0.5 && a.win_ci95[1] < 1);
});

test('aggregateOutcomes: empty -> n 0, null rates (no fabricated numbers)', () => {
  const a = aggregateOutcomes([]);
  assert.equal(a.n, 0);
  assert.equal(a.win_rate, null);
  assert.equal(a.defeat_rate, null);
  assert.equal(a.rounds.mean, null);
});

test('verdictFor: GREEN when all rates in band', () => {
  const bands = { win_rate: [0.35, 0.55], defeat_rate: [0.25, 0.4], timeout_rate: [0.1, 0.2] };
  const v = verdictFor(0.45, 0.35, 0.15, bands);
  assert.equal(v.verdict, 'GREEN');
});

test('verdictFor: AMBER within 0.05 of a band edge', () => {
  const bands = { win_rate: [0.35, 0.55], defeat_rate: [0.25, 0.4], timeout_rate: [0.1, 0.2] };
  // win 0.58 = 0.03 over the 0.55 ceiling -> amber (defeat/timeout in band).
  const v = verdictFor(0.58, 0.35, 0.15, bands);
  assert.equal(v.verdict, 'AMBER');
});

test('verdictFor: RED when a rate is far out of band', () => {
  const bands = { win_rate: [0.35, 0.55], defeat_rate: [0.25, 0.4], timeout_rate: [0.1, 0.2] };
  // saturated win 1.0 = 0.45 over ceiling -> red.
  const v = verdictFor(1.0, 0.0, 0.0, bands);
  assert.equal(v.verdict, 'RED');
});

test('verdictFor: UNKNOWN when no bands for the class', () => {
  const v = verdictFor(0.5, 0.3, 0.1, null);
  assert.equal(v.verdict, 'UNKNOWN');
});

test('loadBands: reads the canonical 3 encounter classes from damage_curves.yaml', () => {
  const bands = loadBands();
  for (const cls of ['tutorial', 'standard', 'hardcore']) {
    assert.ok(bands[cls], `missing band for ${cls}`);
    assert.ok(Array.isArray(bands[cls].win_rate) && bands[cls].win_rate.length === 2);
  }
  // hardcore is the hardest band (lowest win-rate ceiling).
  assert.ok(bands.hardcore.win_rate[1] <= bands.standard.win_rate[1]);
});
