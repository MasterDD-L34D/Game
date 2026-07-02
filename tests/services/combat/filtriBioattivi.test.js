// tests/services/combat/filtriBioattivi.test.js
//
// filtri_bioattivi (creature-trait mechanics slice 5, trait 6 -- otyugh).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   PASSIVE: each round, cleanse 1 bleeding + 1 fracture + heal 1 per cleanse
//   (Subnautica filtering / Pathfinder otyugh). Object-map shape, run once per
//   round at end-of-round side-effects.
//   (The ACTIVE 1-AP cleanse-all-on-adjacent-ally ability is DEFERRED -- it needs
//   the cleanse_status effect_type in the contract schema [forbidden path] +
//   jobs.yaml re-baseline; surfaced for master-dd in the slice-5 PR.)
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyTurnStartCleanse,
  hasTrait,
  FILTRI_TRAIT,
  CLEANSE_STATUSES,
} = require('../../../apps/backend/services/combat/filtriBioattivi');

function carrier(extra = {}) {
  return { id: 'otyugh', hp: 10, max_hp: 20, status: {}, traits: ['filtri_bioattivi'], ...extra };
}

test('cleanses 1 bleeding + 1 fracture and heals 1 per cleanse', () => {
  const u = carrier({ hp: 10, status: { bleeding: 3, fracture: 2 } });
  const res = applyTurnStartCleanse(u);
  assert.ok(res);
  assert.ok(!(u.status.bleeding > 0), 'bleeding cleansed');
  assert.ok(!(u.status.fracture > 0), 'fracture cleansed');
  assert.equal(u.hp, 12, 'healed 1 per cleanse (2 cleanses -> +2)');
  assert.equal(res.healed, 2);
  assert.deepEqual(res.cleansed.sort(), ['bleeding', 'fracture']);
});

test('also clears the companion severity keys when cleansing', () => {
  const u = carrier({ status: { bleeding: 2, bleeding_severity: 'major' } });
  applyTurnStartCleanse(u);
  assert.ok(!('bleeding' in u.status) || !(u.status.bleeding > 0));
  assert.ok(!('bleeding_severity' in u.status), 'severity cleared with the status');
});

test('only one of the two present -> cleanse it + heal 1', () => {
  const u = carrier({ hp: 5, status: { bleeding: 4 } });
  const res = applyTurnStartCleanse(u);
  assert.equal(res.healed, 1);
  assert.equal(u.hp, 6);
  assert.deepEqual(res.cleansed, ['bleeding']);
});

test('no bleeding/fracture -> no-op (null), no phantom heal', () => {
  const u = carrier({ hp: 7, status: { panic: 1 } });
  assert.equal(applyTurnStartCleanse(u), null);
  assert.equal(u.hp, 7);
  assert.ok(u.status.panic > 0, 'unrelated status untouched');
});

test('a non-carrier never cleanses', () => {
  const u = carrier({ traits: ['other'], status: { bleeding: 3 } });
  assert.equal(applyTurnStartCleanse(u), null);
  assert.ok(u.status.bleeding > 0);
});

test('heal capped at max_hp (no overheal); a downed unit does not cleanse', () => {
  const full = carrier({ hp: 20, max_hp: 20, status: { bleeding: 2 } });
  const res = applyTurnStartCleanse(full);
  assert.ok(res, 'still cleanses at full HP');
  assert.equal(full.hp, 20, 'no overheal');
  assert.equal(res.healed, 0);
  const dead = carrier({ hp: 0, status: { bleeding: 2 } });
  assert.equal(applyTurnStartCleanse(dead), null, 'downed -> no cleanse');
});

test('hasTrait + constants', () => {
  assert.equal(hasTrait({ traits: [{ id: 'filtri_bioattivi' }] }, FILTRI_TRAIT), true);
  assert.equal(FILTRI_TRAIT, 'filtri_bioattivi');
  assert.deepEqual(CLEANSE_STATUSES, ['bleeding', 'fracture']);
});
