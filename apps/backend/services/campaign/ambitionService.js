// 2026-04-29 Action 6 (ADR-2026-04-28 §Action 6) — Ambition campaign service.
//
// Long-arc campaign goal layer. Coordina:
//   - ambition definition (YAML) load + validate
//   - progress tracking per (campaign|player) sessione
//   - choice ritual evaluation (fame_path | bond_path) post threshold
//   - narrative beat lookup
//
// Pure helpers (no I/O): evaluateProgress, evaluateChoiceRitual, formatAmbitionLabel.
// Side-effect minimal: in-memory progress map keyed by sessionId+ambitionId.
// NO direct Prisma — graceful in-memory MVP. Wire-through Prisma deferred.
//
// Reuse pattern:
//   - bond_hearts gate threshold via campaign.bond_hearts (PR #1984)
//   - lineage merge bond_path → caller invoke propagateLineage opt-in (PR #1918)
//   - QBN beat trigger → caller advances narrative on outcome
//
// Test coverage: tests/services/ambitionService.test.js (10 test).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const AMBITIONS_DIR = path.join(process.cwd(), 'data', 'core', 'campaign', 'ambitions');
const NARRATIVE_BEATS_DIR = path.join(process.cwd(), 'data', 'core', 'narrative', 'beats');

const _ambitionCache = new Map(); // ambitionId → parsed YAML
const _beatsCache = new Map(); // beatsFile → parsed YAML

// In-memory progress store. Keyed by `${sessionId}::${ambitionId}`.
// Shape: { ambition_id, session_id, progress, completed, choice_made, last_event_at }
const _progressStore = new Map();

function _now() {
  return new Date().toISOString();
}

function _key(sessionId, ambitionId) {
  return `${sessionId}::${ambitionId}`;
}

/**
 * Load ambition YAML by id. Cached.
 *
 * @param {string} ambitionId
 * @param {string} [dir] override per test
 * @returns {object|null}
 */
function loadAmbition(ambitionId, dir = AMBITIONS_DIR) {
  if (!ambitionId || typeof ambitionId !== 'string') return null;
  const cacheKey = `${dir}::${ambitionId}`;
  if (_ambitionCache.has(cacheKey)) return _ambitionCache.get(cacheKey);

  const filePath = path.join(dir, `${ambitionId}.yaml`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(raw);
    if (!data || typeof data !== 'object') return null;
    if (!data.ambition_id || !data.progress_target) return null;
    _ambitionCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Load narrative beats file. Returns map of beat_id → beat.
 */
function loadNarrativeBeats(beatsFile, dir = NARRATIVE_BEATS_DIR) {
  if (!beatsFile) return new Map();
  const cacheKey = `${dir}::${beatsFile}`;
  if (_beatsCache.has(cacheKey)) return _beatsCache.get(cacheKey);

  const filePath = path.join(dir, `${beatsFile}.yaml`);
  if (!fs.existsSync(filePath)) return new Map();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(raw);
    const beats = Array.isArray(data?.beats) ? data.beats : [];
    const beatMap = new Map(beats.map((b) => [b.beat_id, b]));
    _beatsCache.set(cacheKey, beatMap);
    return beatMap;
  } catch {
    return new Map();
  }
}

/**
 * Init / get ambition progress entry for (sessionId, ambitionId).
 * Lazy create con progress=0.
 */
function getProgress(sessionId, ambitionId) {
  if (!sessionId || !ambitionId) return null;
  const k = _key(sessionId, ambitionId);
  if (_progressStore.has(k)) return _progressStore.get(k);
  const entry = {
    ambition_id: ambitionId,
    session_id: sessionId,
    progress: 0,
    completed: false,
    choice_made: null,
    last_event_at: _now(),
  };
  _progressStore.set(k, entry);
  return entry;
}

/**
 * Increment ambition progress on encounter outcome.
 * Pure-ish: muta entry in store, ritorna new entry.
 *
 * @param {string} sessionId
 * @param {string} ambitionId
 * @param {object} encounterEvent { encounter_id, outcome }
 *   outcome: 'victory' | 'defeat' | 'timeout'
 * @returns {object} updated progress entry + flags
 *   { progress, completed, choice_ready, ambition }
 */
function progressAmbition(sessionId, ambitionId, encounterEvent) {
  const ambition = loadAmbition(ambitionId);
  if (!ambition) return { error: 'ambition_not_found', ambition_id: ambitionId };
  const entry = getProgress(sessionId, ambitionId);
  if (entry.completed) {
    return {
      progress: entry.progress,
      completed: true,
      choice_ready: false,
      ambition,
      already_completed: true,
    };
  }

  const outcome = encounterEvent?.outcome;
  const matches = (ambition.encounters_sequence || []).some(
    (e) => e.encounter_id === encounterEvent?.encounter_id,
  );
  if (matches && outcome === 'victory') {
    entry.progress = Math.min(ambition.progress_target, entry.progress + 1);
    entry.last_event_at = _now();
  }

  const target = Number(ambition.progress_target) || 0;
  const choiceReady = entry.progress >= target && !entry.choice_made;
  return {
    progress: entry.progress,
    progress_target: target,
    completed: entry.completed,
    choice_ready: choiceReady,
    choice_made: entry.choice_made,
    ambition,
  };
}

/**
 * Evaluate choice ritual: fame_path | bond_path submission.
 *
 * Gate: bond_hearts >= choice_ritual.bond_hearts_threshold (default 3).
 * Locked → returns { locked: true, locked_reason } senza mutare state.
 *
 * @param {string} sessionId
 * @param {string} ambitionId
 * @param {string} choice 'fame_dominance' | 'bond_proposal'
 * @param {object} ctx { bond_hearts: number }
 * @returns {object} outcome + narrative beat + side-effect flags
 */
function evaluateChoiceRitual(sessionId, ambitionId, choice, ctx = {}) {
  const ambition = loadAmbition(ambitionId);
  if (!ambition) return { error: 'ambition_not_found' };
  const entry = getProgress(sessionId, ambitionId);

  const target = Number(ambition.progress_target) || 0;
  if (entry.progress < target) {
    return { error: 'progress_incomplete', progress: entry.progress, progress_target: target };
  }
  if (entry.choice_made) {
    return { error: 'choice_already_made', choice_made: entry.choice_made };
  }

  const ritual = ambition.choice_ritual || {};
  const threshold = Number(ritual.bond_hearts_threshold ?? 3);
  const bondHearts = Number(ctx.bond_hearts) || 0;
  const paths = ritual.paths || {};

  // Bond path requires bond_hearts >= threshold. Fame path always available.
  const isBond = choice === 'bond_proposal';
  if (isBond && bondHearts < threshold) {
    // Surface locked beat for player feedback.
    const beats = loadNarrativeBeats('skiv_pulverator_alliance');
    const lockedBeat = beats.get('skiv_pulverator_choice_locked_low_bond') || null;
    return {
      locked: true,
      locked_reason: 'bond_hearts_below_threshold',
      bond_hearts: bondHearts,
      bond_hearts_threshold: threshold,
      narrative_beat: lockedBeat,
    };
  }

  const pathDef = isBond ? paths.bond_path : paths.fame_path;
  if (!pathDef) return { error: 'invalid_choice', choice };

  const beats = loadNarrativeBeats('skiv_pulverator_alliance');
  const beat = beats.get(pathDef.narrative_beat_id) || null;

  // Lock state.
  entry.choice_made = pathDef.key || choice;
  entry.completed = true;
  entry.last_event_at = _now();

  return {
    completed: true,
    choice: entry.choice_made,
    outcome: pathDef.outcome,
    lineage_merge: !!pathDef.lineage_merge,
    merge_lineage_on_bond: !!pathDef.merge_lineage_on_bond,
    next_ambition_seed: pathDef.next_ambition_seed || null,
    narrative_beat: beat,
    bond_hearts: bondHearts,
  };
}

/**
 * Get active ambitions list for HUD display.
 * Filtered: sessione corrente, non completed.
 *
 * @param {string} sessionId
 * @returns {Array<object>} [{ ambition_id, title_it, progress, progress_target, ... }]
 */
function getActiveAmbitions(sessionId) {
  if (!sessionId) return [];
  const out = [];
  for (const [, entry] of _progressStore) {
    if (entry.session_id !== sessionId) continue;
    if (entry.completed) continue;
    const ambition = loadAmbition(entry.ambition_id);
    if (!ambition) continue;
    out.push({
      ambition_id: entry.ambition_id,
      title_it: ambition.title_it,
      title_en: ambition.title_en,
      campaign_goal: ambition.campaign_goal,
      progress: entry.progress,
      progress_target: Number(ambition.progress_target) || 0,
      ui_overlay: ambition.ui_overlay || null,
      choice_ready: entry.progress >= (Number(ambition.progress_target) || 0) && !entry.choice_made,
    });
  }
  return out;
}

/**
 * Pure helper — format ambition label per HUD.
 * Replaces `{progress}` + `{progress_target}` placeholders.
 */
function formatAmbitionLabel(ambition, progress) {
  if (!ambition) return '';
  const fmt = ambition.ui_overlay?.format || '{progress}/{progress_target}';
  const target = Number(ambition.progress_target) || 0;
  return String(fmt)
    .replace('{progress}', String(progress))
    .replace('{progress_target}', String(target));
}

/**
 * Seed ambition for a session (idempotent). Called typically on /start.
 */
function seedAmbition(sessionId, ambitionId) {
  const ambition = loadAmbition(ambitionId);
  if (!ambition) return null;
  return getProgress(sessionId, ambitionId);
}

/** Test/internal hook — clear progress + cache. */
function _resetState() {
  _progressStore.clear();
  _ambitionCache.clear();
  _beatsCache.clear();
}

module.exports = {
  loadAmbition,
  loadNarrativeBeats,
  getProgress,
  progressAmbition,
  evaluateChoiceRitual,
  getActiveAmbitions,
  formatAmbitionLabel,
  seedAmbition,
  _resetState,
};
