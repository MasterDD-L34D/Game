// Diary store — pure unit tests for Skiv ticket #7 (Sprint C).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ALLOWED_EVENT_TYPES,
  sanitiseUnitId,
  appendEntry,
  getDiary,
  tailDiary,
  summary,
  _resetDiaryForTest,
} = require('../../apps/backend/services/diary/diaryStore');

function tmpBaseDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'diary-test-'));
}

test('ALLOWED_EVENT_TYPES: 12 entries post 2026-04-25 content sprint + Skiv diary waves', () => {
  assert.equal(ALLOWED_EVENT_TYPES.size, 12);
  assert.ok(ALLOWED_EVENT_TYPES.has('form_evolved'));
  assert.ok(ALLOWED_EVENT_TYPES.has('thought_internalized'));
  assert.ok(ALLOWED_EVENT_TYPES.has('scenario_completed'));
  assert.ok(ALLOWED_EVENT_TYPES.has('mbti_axis_threshold_crossed'));
  assert.ok(ALLOWED_EVENT_TYPES.has('defy_used'));
  assert.ok(ALLOWED_EVENT_TYPES.has('synergy_triggered'));
  // Skiv Saga additions (mutation catalog + jobs expansion content sprint).
  assert.ok(ALLOWED_EVENT_TYPES.has('mutation_acquired'));
  assert.ok(ALLOWED_EVENT_TYPES.has('job_changed'));
});

test('sanitiseUnitId: accepts alnum + dash + underscore', () => {
  assert.equal(sanitiseUnitId('skiv'), 'skiv');
  assert.equal(sanitiseUnitId('p1-vega'), 'p1-vega');
  assert.equal(sanitiseUnitId('unit_42'), 'unit_42');
  assert.equal(sanitiseUnitId('SKIV_42'), 'SKIV_42');
});

test('sanitiseUnitId: rejects path traversal + special chars', () => {
  assert.equal(sanitiseUnitId('../etc/passwd'), null);
  assert.equal(sanitiseUnitId('skiv/foo'), null);
  assert.equal(sanitiseUnitId('skiv;rm -rf'), null);
  assert.equal(sanitiseUnitId('skiv with space'), null);
  assert.equal(sanitiseUnitId(''), null);
  assert.equal(sanitiseUnitId(null), null);
  assert.equal(sanitiseUnitId(123), null);
});

test('sanitiseUnitId: rejects too-long ids (>96 chars)', () => {
  assert.equal(sanitiseUnitId('a'.repeat(97)), null);
  assert.equal(sanitiseUnitId('a'.repeat(96)), 'a'.repeat(96));
});

test('appendEntry: invalid unit_id → invalid_unit_id', () => {
  const baseDir = tmpBaseDir();
  const out = appendEntry('../bad', { event_type: 'defy_used' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'invalid_unit_id');
});

test('appendEntry: invalid event_type → 409 with detail', () => {
  const baseDir = tmpBaseDir();
  const out = appendEntry('skiv', { event_type: 'spurious_event' }, { baseDir });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'invalid_event_type');
  assert.equal(out.detail.event_type, 'spurious_event');
});

test('appendEntry: missing entry → invalid_entry', () => {
  const baseDir = tmpBaseDir();
  assert.equal(appendEntry('skiv', null, { baseDir }).error, 'invalid_entry');
  assert.equal(appendEntry('skiv', 'string', { baseDir }).error, 'invalid_entry');
});

test('appendEntry: happy path stamps ts + persists JSONL', () => {
  const baseDir = tmpBaseDir();
  const out = appendEntry(
    'skiv',
    { event_type: 'defy_used', turn: 5, payload: { relief: 25 } },
    { baseDir },
  );
  assert.equal(out.ok, true);
  assert.equal(out.entry.event_type, 'defy_used');
  assert.equal(out.entry.turn, 5);
  assert.deepEqual(out.entry.payload, { relief: 25 });
  assert.ok(typeof out.entry.ts === 'string');
  // Verify written to disk
  const filepath = path.join(baseDir, 'skiv.jsonl');
  assert.ok(fs.existsSync(filepath));
  const raw = fs.readFileSync(filepath, 'utf8');
  assert.ok(raw.includes('defy_used'));
});

test('getDiary: returns [] for missing diary', () => {
  const baseDir = tmpBaseDir();
  assert.deepEqual(getDiary('never_existed', { baseDir }), []);
});

test('getDiary: returns chronological entries', () => {
  const baseDir = tmpBaseDir();
  appendEntry('skiv', { event_type: 'defy_used', turn: 1 }, { baseDir });
  appendEntry('skiv', { event_type: 'synergy_triggered', turn: 2 }, { baseDir });
  appendEntry(
    'skiv',
    { event_type: 'thought_internalized', turn: 3, payload: { id: 'i_osservatore' } },
    { baseDir },
  );
  const all = getDiary('skiv', { baseDir });
  assert.equal(all.length, 3);
  assert.equal(all[0].event_type, 'defy_used');
  assert.equal(all[2].event_type, 'thought_internalized');
  assert.equal(all[2].payload.id, 'i_osservatore');
});

test('getDiary: malformed JSON lines silently skipped', () => {
  const baseDir = tmpBaseDir();
  fs.mkdirSync(baseDir, { recursive: true });
  const filepath = path.join(baseDir, 'skiv.jsonl');
  fs.writeFileSync(
    filepath,
    `${JSON.stringify({ event_type: 'defy_used', ts: 'a' })}\n` +
      `not json line\n` +
      `${JSON.stringify({ event_type: 'synergy_triggered', ts: 'b' })}\n`,
    'utf8',
  );
  const all = getDiary('skiv', { baseDir });
  assert.equal(all.length, 2);
  assert.equal(all[0].event_type, 'defy_used');
  assert.equal(all[1].event_type, 'synergy_triggered');
});

test('tailDiary: defaults to last 50 chronological', () => {
  const baseDir = tmpBaseDir();
  for (let i = 0; i < 60; i += 1) {
    appendEntry('skiv', { event_type: 'defy_used', turn: i }, { baseDir });
  }
  const tail = tailDiary('skiv', { baseDir });
  assert.equal(tail.length, 50);
  assert.equal(tail[0].turn, 10); // 60 - 50
  assert.equal(tail[49].turn, 59);
});

test('tailDiary: respects custom limit + reverse=true', () => {
  const baseDir = tmpBaseDir();
  for (let i = 0; i < 5; i += 1) {
    appendEntry('skiv', { event_type: 'defy_used', turn: i }, { baseDir });
  }
  const tail = tailDiary('skiv', { baseDir, limit: 3, reverse: true });
  assert.equal(tail.length, 3);
  assert.equal(tail[0].turn, 4); // most recent first
  assert.equal(tail[2].turn, 2);
});

test('tailDiary: limit clamps [1, 500]', () => {
  const baseDir = tmpBaseDir();
  appendEntry('skiv', { event_type: 'defy_used' }, { baseDir });
  // limit=0 → clamped to 1
  assert.equal(tailDiary('skiv', { baseDir, limit: 0 }).length, 1);
  // limit huge → clamped to 500 (we have 1 entry so just 1 shown)
  assert.equal(tailDiary('skiv', { baseDir, limit: 99999 }).length, 1);
});

test('summary: empty diary → total 0, empty by_event_type', () => {
  const baseDir = tmpBaseDir();
  const out = summary('never_existed', { baseDir });
  assert.equal(out.total, 0);
  assert.deepEqual(out.by_event_type, {});
  assert.equal(out.first_seen, null);
  assert.equal(out.last_seen, null);
});

test('summary: aggregates counts + first/last ts', () => {
  const baseDir = tmpBaseDir();
  appendEntry(
    'skiv',
    { event_type: 'defy_used', turn: 1, ts: '2026-04-25T10:00:00Z' },
    { baseDir },
  );
  appendEntry(
    'skiv',
    { event_type: 'defy_used', turn: 2, ts: '2026-04-25T10:05:00Z' },
    { baseDir },
  );
  appendEntry(
    'skiv',
    { event_type: 'synergy_triggered', turn: 3, ts: '2026-04-25T10:10:00Z' },
    { baseDir },
  );
  const out = summary('skiv', { baseDir });
  assert.equal(out.total, 3);
  assert.equal(out.by_event_type.defy_used, 2);
  assert.equal(out.by_event_type.synergy_triggered, 1);
  assert.equal(out.first_seen, '2026-04-25T10:00:00Z');
  assert.equal(out.last_seen, '2026-04-25T10:10:00Z');
});

test('_resetDiaryForTest: removes diary file', () => {
  const baseDir = tmpBaseDir();
  appendEntry('skiv', { event_type: 'defy_used' }, { baseDir });
  assert.equal(getDiary('skiv', { baseDir }).length, 1);
  _resetDiaryForTest('skiv', { baseDir });
  assert.equal(getDiary('skiv', { baseDir }).length, 0);
});
