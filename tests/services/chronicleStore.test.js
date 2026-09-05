// Chronicle store -- pure unit tests (SPEC-Q M-7, per-branco cross-session narrative).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ALLOWED_EVENT_TYPES,
  ALLOWED_TIERS,
  sanitiseRunId,
  appendEvent,
  getChronicle,
  tailChronicle,
  summary,
  _resetChronicleForTest,
} = require('../../apps/backend/services/chronicle/chronicleStore');

function tmpBaseDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-test-'));
}

test('ALLOWED_EVENT_TYPES: covers SPEC-Q salient narrative events', () => {
  for (const t of [
    'creature_named',
    'creature_death',
    'mutation_acquired',
    'scar_earned',
    'legacy_formed',
    'run_failed',
    'biome_wound',
    'heirloom_created',
    'mutation_lineage',
  ]) {
    assert.ok(ALLOWED_EVENT_TYPES.has(t), `missing ${t}`);
  }
});

test('ALLOWED_TIERS: public/private/secret (SPEC-B inherit)', () => {
  assert.deepEqual([...ALLOWED_TIERS].sort(), ['private', 'public', 'secret']);
});

test('sanitiseRunId: accepts alnum + dash + underscore, rejects traversal', () => {
  assert.equal(sanitiseRunId('run_42'), 'run_42');
  assert.equal(sanitiseRunId('branco-vega-7'), 'branco-vega-7');
  assert.equal(sanitiseRunId('../etc/passwd'), null);
  assert.equal(sanitiseRunId('run/foo'), null);
  assert.equal(sanitiseRunId(''), null);
  assert.equal(sanitiseRunId(null), null);
  assert.equal(sanitiseRunId('a'.repeat(97)), null);
});

test('appendEvent: invalid run_id -> invalid_run_id', () => {
  const baseDir = tmpBaseDir();
  const out = appendEvent('../bad', { type: 'creature_named' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'invalid_run_id');
});

test('appendEvent: invalid type -> invalid_event_type with detail', () => {
  const baseDir = tmpBaseDir();
  const out = appendEvent('run1', { type: 'spurious' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'invalid_event_type');
  assert.equal(out.detail.type, 'spurious');
});

test('appendEvent: invalid tier -> invalid_tier', () => {
  const baseDir = tmpBaseDir();
  const out = appendEvent('run1', { type: 'creature_named', tier: 'cosmic' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'invalid_tier');
});

test('appendEvent: missing event -> invalid_event', () => {
  const baseDir = tmpBaseDir();
  assert.equal(appendEvent('run1', null, { baseDir }).error, 'invalid_event');
  assert.equal(appendEvent('run1', 'str', { baseDir }).error, 'invalid_event');
});

test('appendEvent: happy path stamps ts + run_id, defaults tier=public', () => {
  const baseDir = tmpBaseDir();
  const out = appendEvent(
    'run1',
    { type: 'creature_named', actor_id: 'skiv', payload: { name: 'Vega' } },
    { baseDir },
  );
  assert.equal(out.ok, true);
  assert.equal(out.event.type, 'creature_named');
  assert.equal(out.event.actor_id, 'skiv');
  assert.equal(out.event.run_id, 'run1');
  assert.equal(out.event.tier, 'public');
  assert.deepEqual(out.event.payload, { name: 'Vega' });
  assert.ok(typeof out.event.ts === 'string');
  const filepath = path.join(baseDir, 'run1.jsonl');
  assert.ok(fs.existsSync(filepath));
  assert.ok(fs.readFileSync(filepath, 'utf8').includes('creature_named'));
});

test('getChronicle: [] for missing run', () => {
  const baseDir = tmpBaseDir();
  assert.deepEqual(getChronicle('nope', { baseDir }), []);
});

test('getChronicle: chronological + per-branco isolation', () => {
  const baseDir = tmpBaseDir();
  appendEvent('runA', { type: 'creature_named', actor_id: 'a1' }, { baseDir });
  appendEvent('runA', { type: 'scar_earned', actor_id: 'a1' }, { baseDir });
  appendEvent('runB', { type: 'run_failed', actor_id: 'b1' }, { baseDir });
  const a = getChronicle('runA', { baseDir });
  const b = getChronicle('runB', { baseDir });
  assert.equal(a.length, 2);
  assert.equal(a[0].type, 'creature_named');
  assert.equal(b.length, 1); // run isolation
  assert.equal(b[0].type, 'run_failed');
});

test('getChronicle: filter by actor_id and by type', () => {
  const baseDir = tmpBaseDir();
  appendEvent('run1', { type: 'creature_named', actor_id: 'skiv' }, { baseDir });
  appendEvent('run1', { type: 'scar_earned', actor_id: 'skiv' }, { baseDir });
  appendEvent('run1', { type: 'creature_named', actor_id: 'vega' }, { baseDir });
  assert.equal(getChronicle('run1', { baseDir, actor_id: 'skiv' }).length, 2);
  assert.equal(getChronicle('run1', { baseDir, type: 'creature_named' }).length, 2);
  assert.equal(
    getChronicle('run1', { baseDir, actor_id: 'skiv', type: 'creature_named' }).length,
    1,
  );
});

test('tailChronicle: last N + reverse', () => {
  const baseDir = tmpBaseDir();
  for (let i = 0; i < 5; i += 1) {
    appendEvent('run1', { type: 'mutation_acquired', payload: { i } }, { baseDir });
  }
  const tail = tailChronicle('run1', { baseDir, limit: 3, reverse: true });
  assert.equal(tail.length, 3);
  assert.equal(tail[0].payload.i, 4);
});

test('summary: aggregates counts per type + by tier', () => {
  const baseDir = tmpBaseDir();
  appendEvent('run1', { type: 'creature_named', tier: 'public' }, { baseDir });
  appendEvent('run1', { type: 'creature_named', tier: 'public' }, { baseDir });
  appendEvent('run1', { type: 'scar_earned', tier: 'private' }, { baseDir });
  const out = summary('run1', { baseDir });
  assert.equal(out.total, 3);
  assert.equal(out.by_type.creature_named, 2);
  assert.equal(out.by_tier.private, 1);
});

test('_resetChronicleForTest: removes file', () => {
  const baseDir = tmpBaseDir();
  appendEvent('run1', { type: 'creature_named' }, { baseDir });
  assert.equal(getChronicle('run1', { baseDir }).length, 1);
  _resetChronicleForTest('run1', { baseDir });
  assert.equal(getChronicle('run1', { baseDir }).length, 0);
});
