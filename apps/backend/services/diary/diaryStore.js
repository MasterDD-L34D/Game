// =============================================================================
// Unit Diary Store — Skiv ticket #7 (Sprint C tail).
//
// Pillar 5 cross-session continuity: tra una run e l'altra, un'unit perde la
// sua storia. Diary append-only persistente per unit_id. JSONL per cheap
// rotation + grep-friendly. MVP backend-only — UI viewer deferred.
//
// Schema entry:
//   { ts, turn?, encounter_id?, event_type, payload }
//
// event_type whitelist (V1):
//   - form_evolved
//   - thought_internalized
//   - scenario_completed
//   - mbti_axis_threshold_crossed
//   - defy_used
//   - synergy_triggered
//   - mutation_acquired   (post 2026-04-25 content sprint #1776 — 30 mutation catalog)
//   - job_changed         (post 2026-04-25 — 4 expansion jobs)
//
// Storage: `data/derived/unit_diaries/<sanitised_unit_id>.jsonl` (gitignored).
// Rotation/cleanup deferred to ops.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'derived',
  'unit_diaries',
);

const ALLOWED_EVENT_TYPES = new Set([
  'form_evolved',
  'thought_internalized',
  'scenario_completed',
  'mbti_axis_threshold_crossed',
  'defy_used',
  'synergy_triggered',
  // Post 2026-04-25 content sprint #1776 (30 mutation catalog + 4 expansion jobs).
  'mutation_acquired',
  'job_changed',
  // Skiv-as-Monitor depth wave 2026-04-25 — F-02/F-03 archaeologist findings.
  // Bridge git events + lifecycle phase to diary autopopulate.
  'phase_transition',
  'phase_signal', // warning_zone_it pre-transition cue
  'repo_event', // generic git event mirror (PR/issue/wf)
  'weekly_digest', // narrative arc reveal
]);

const UNIT_ID_PATTERN = /^[A-Za-z0-9_\-]+$/;

function sanitiseUnitId(unitId) {
  if (typeof unitId !== 'string') return null;
  if (!UNIT_ID_PATTERN.test(unitId)) return null;
  if (unitId.length === 0 || unitId.length > 96) return null;
  return unitId;
}

function diaryPath(unitId, baseDir = DEFAULT_BASE_DIR) {
  const safe = sanitiseUnitId(unitId);
  if (!safe) return null;
  return path.join(baseDir, `${safe}.jsonl`);
}

function ensureBaseDir(baseDir = DEFAULT_BASE_DIR) {
  fs.mkdirSync(baseDir, { recursive: true });
}

/**
 * Append a diary entry. Validates event_type + sanitised unit_id.
 * Returns { ok, entry?, error? }. Never throws on bad input.
 */
function appendEntry(unitId, entry, opts = {}) {
  const baseDir = opts.baseDir || DEFAULT_BASE_DIR;
  const safe = sanitiseUnitId(unitId);
  if (!safe) return { ok: false, error: 'invalid_unit_id' };
  if (!entry || typeof entry !== 'object') return { ok: false, error: 'invalid_entry' };
  const eventType = entry.event_type;
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return { ok: false, error: 'invalid_event_type', detail: { event_type: eventType } };
  }
  const stamped = {
    ts: entry.ts || new Date().toISOString(),
    turn: Number.isFinite(Number(entry.turn)) ? Number(entry.turn) : null,
    encounter_id: typeof entry.encounter_id === 'string' ? entry.encounter_id : null,
    event_type: eventType,
    payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {},
  };
  ensureBaseDir(baseDir);
  const filepath = path.join(baseDir, `${safe}.jsonl`);
  fs.appendFileSync(filepath, JSON.stringify(stamped) + '\n', 'utf8');
  return { ok: true, entry: stamped };
}

/**
 * Read full diary as array of entries (chronological order). Returns [] if no
 * file. Each line is parsed; malformed lines are silently skipped.
 */
function getDiary(unitId, opts = {}) {
  const baseDir = opts.baseDir || DEFAULT_BASE_DIR;
  const safe = sanitiseUnitId(unitId);
  if (!safe) return [];
  const filepath = path.join(baseDir, `${safe}.jsonl`);
  if (!fs.existsSync(filepath)) return [];
  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const out = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') out.push(parsed);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}

/**
 * Tail N entries (default 50). Returns most-recent first when reverse=true,
 * else chronological. Used by HUD/debrief viewer.
 */
function tailDiary(unitId, opts = {}) {
  const limit = Number.isFinite(Number(opts.limit))
    ? Math.max(1, Math.min(500, Number(opts.limit)))
    : 50;
  const reverse = Boolean(opts.reverse);
  const all = getDiary(unitId, opts);
  const tail = all.slice(-limit);
  return reverse ? tail.slice().reverse() : tail;
}

/**
 * Aggregate: count per event_type + total + first_seen / last_seen ts.
 * Cheap for ≤1000 entries; future ops can swap for a sqlite index.
 */
function summary(unitId, opts = {}) {
  const all = getDiary(unitId, opts);
  if (all.length === 0) {
    return { unit_id: unitId, total: 0, by_event_type: {}, first_seen: null, last_seen: null };
  }
  const byType = {};
  for (const entry of all) {
    const t = entry.event_type;
    byType[t] = (byType[t] || 0) + 1;
  }
  return {
    unit_id: unitId,
    total: all.length,
    by_event_type: byType,
    first_seen: all[0].ts || null,
    last_seen: all[all.length - 1].ts || null,
  };
}

/**
 * Test helper — wipe the diary file for a unit. NOT exposed via route.
 */
function _resetDiaryForTest(unitId, opts = {}) {
  const baseDir = opts.baseDir || DEFAULT_BASE_DIR;
  const safe = sanitiseUnitId(unitId);
  if (!safe) return;
  const filepath = path.join(baseDir, `${safe}.jsonl`);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  DEFAULT_BASE_DIR,
  sanitiseUnitId,
  diaryPath,
  ensureBaseDir,
  appendEntry,
  getDiary,
  tailDiary,
  summary,
  _resetDiaryForTest,
};
