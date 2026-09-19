// Sprint 3 §III (2026-04-27) — Wildermyth choice→permanent flag pattern.
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #12 Wildermyth.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCampaign,
  getCampaign,
  recordPermanentFlag,
  getPermanentFlag,
  _resetStore,
} = require('../../apps/backend/services/campaign/campaignStore');

test('createCampaign initializes empty permanentFlags array', () => {
  _resetStore();
  const c = createCampaign('p1');
  assert.deepEqual(c.permanentFlags, []);
});

test('createCampaign accepts permanentFlags in opts', () => {
  _resetStore();
  const c = createCampaign('p1', 'default', {
    permanentFlags: [{ key: 'preexisting', value: true, recorded_at: '2026-04-27T00:00:00Z' }],
  });
  assert.equal(c.permanentFlags.length, 1);
  assert.equal(c.permanentFlags[0].key, 'preexisting');
});

test('recordPermanentFlag appends new flag', () => {
  _resetStore();
  const c = createCampaign('p1');
  const updated = recordPermanentFlag(c.id, {
    key: 'spared_apex',
    value: true,
    narrative: 'Hai risparmiato il Predatore — ricorderà.',
    source_chapter: 3,
  });
  assert.equal(updated.permanentFlags.length, 1);
  const f = updated.permanentFlags[0];
  assert.equal(f.key, 'spared_apex');
  assert.equal(f.value, true);
  assert.equal(f.narrative, 'Hai risparmiato il Predatore — ricorderà.');
  assert.equal(f.source_chapter, 3);
  assert.ok(f.recorded_at);
});

test('recordPermanentFlag idempotent on same key (updates value, retains recorded_at)', () => {
  _resetStore();
  const c = createCampaign('p1');
  const first = recordPermanentFlag(c.id, { key: 'pact_made', value: 'silver' });
  const recordedAt = first.permanentFlags[0].recorded_at;
  // Wait a tick (deterministic via two calls) then update
  const second = recordPermanentFlag(c.id, { key: 'pact_made', value: 'gold' });
  assert.equal(second.permanentFlags.length, 1, 'no duplicate');
  assert.equal(second.permanentFlags[0].value, 'gold');
  assert.equal(second.permanentFlags[0].recorded_at, recordedAt, 'original timestamp preserved');
});

test('recordPermanentFlag uses currentChapter as default source_chapter', () => {
  _resetStore();
  const c = createCampaign('p1');
  // c.currentChapter = 1 by default
  const updated = recordPermanentFlag(c.id, { key: 'discovered_glyph' });
  assert.equal(updated.permanentFlags[0].source_chapter, 1);
});

test('recordPermanentFlag ignores invalid input', () => {
  _resetStore();
  const c = createCampaign('p1');
  assert.equal(recordPermanentFlag(c.id, null), null);
  assert.equal(recordPermanentFlag(c.id, { value: 1 }), null, 'no key');
  assert.equal(recordPermanentFlag('nonexistent_id', { key: 'x' }), null);
});

test('getPermanentFlag returns the flag entry', () => {
  _resetStore();
  const c = createCampaign('p1');
  recordPermanentFlag(c.id, { key: 'broke_seal', value: 1 });
  const f = getPermanentFlag(c.id, 'broke_seal');
  assert.ok(f);
  assert.equal(f.key, 'broke_seal');
  assert.equal(f.value, 1);
});

test('getPermanentFlag returns null when missing', () => {
  _resetStore();
  const c = createCampaign('p1');
  assert.equal(getPermanentFlag(c.id, 'never_set'), null);
  assert.equal(getPermanentFlag('bad_id', 'x'), null);
});

test('multiple flags accumulate independently', () => {
  _resetStore();
  const c = createCampaign('p1');
  recordPermanentFlag(c.id, { key: 'flag_a', value: 1 });
  recordPermanentFlag(c.id, { key: 'flag_b', value: 2 });
  recordPermanentFlag(c.id, { key: 'flag_c', value: 3 });
  const fresh = getCampaign(c.id);
  assert.equal(fresh.permanentFlags.length, 3);
  const keys = fresh.permanentFlags.map((f) => f.key).sort();
  assert.deepEqual(keys, ['flag_a', 'flag_b', 'flag_c']);
});
