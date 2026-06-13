'use strict';

/**
 * TKT-P6 — Rewind safety valve.
 *
 * Scope ticket §4: anti-frustration ammortizer per OD-014. Undo button N times
 * per battle. Snapshot state pre-action, rewind on player request.
 *
 * Design:
 * - Ring buffer FIFO, default size 3 (configurable via REWIND_BUFFER_SIZE env).
 * - Each snapshot = deep clone subset critical state: units, turn, active_unit,
 *   sistema_pressure, sistema_counter, turn_index, encounter? events tail.
 * - Budget separate from buffer: how many rewinds player still has this combat.
 *   Default 3, reset on encounter end / new combat.
 * - snapshot() pushes; rewind() pops most recent snapshot and decrements budget.
 *   Returns the popped state for caller to merge back into session.
 *
 * Non goals: full event log rollback. Persisted events stay in log; rewind only
 * touches in-memory mutable session fields. Telemetry events for rewind itself
 * are appended forward, NOT removed.
 */

const DEFAULT_BUFFER_SIZE = 3;
const DEFAULT_BUDGET = 3;

function envBufferSize() {
  const raw = Number(process.env.REWIND_BUFFER_SIZE);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 10) return Math.floor(raw);
  return DEFAULT_BUFFER_SIZE;
}

function envBudget() {
  const raw = Number(process.env.REWIND_BUDGET_PER_BATTLE);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 10) return Math.floor(raw);
  return DEFAULT_BUDGET;
}

/**
 * Deep clone via JSON round-trip. Adequate for plain-data session fields.
 * Functions / Date / Map are NOT preserved — we only clone POD state.
 */
function deepClone(value) {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/**
 * Extract the snapshot-able subset of session state.
 * Keeps the buffer payload focused (avoids cloning logs / config).
 */
function pickSnapshotState(session) {
  if (!session || typeof session !== 'object') return null;
  return {
    turn: session.turn,
    active_unit: session.active_unit,
    turn_index: session.turn_index,
    turn_order: deepClone(session.turn_order),
    units: deepClone(session.units),
    sistema_pressure: session.sistema_pressure,
    sistema_counter: session.sistema_counter,
    tile_state_map: deepClone(session.tile_state_map),
    last_round_combos: deepClone(session.last_round_combos),
    last_round_synergies: deepClone(session.last_round_synergies),
    // events count marker — used to truncate event tail on restore.
    events_count: Array.isArray(session.events) ? session.events.length : 0,
  };
}

/**
 * Apply a popped snapshot back onto session in place. Caller is responsible
 * for invoking this; rewindBuffer only stores and returns the snapshot.
 */
function applySnapshot(session, snapshot) {
  if (!session || !snapshot) return false;
  if (Number.isFinite(snapshot.turn)) session.turn = snapshot.turn;
  if (snapshot.active_unit !== undefined) session.active_unit = snapshot.active_unit;
  if (Number.isFinite(snapshot.turn_index)) session.turn_index = snapshot.turn_index;
  if (Array.isArray(snapshot.turn_order)) session.turn_order = snapshot.turn_order;
  if (Array.isArray(snapshot.units)) session.units = snapshot.units;
  if (Number.isFinite(snapshot.sistema_pressure))
    session.sistema_pressure = snapshot.sistema_pressure;
  if (Number.isFinite(snapshot.sistema_counter)) session.sistema_counter = snapshot.sistema_counter;
  if (snapshot.tile_state_map && typeof snapshot.tile_state_map === 'object') {
    session.tile_state_map = snapshot.tile_state_map;
  }
  if (Array.isArray(snapshot.last_round_combos))
    session.last_round_combos = snapshot.last_round_combos;
  if (Array.isArray(snapshot.last_round_synergies))
    session.last_round_synergies = snapshot.last_round_synergies;
  // Truncate event tail: log entries written between snapshot + rewind are
  // discarded from session.events (still on disk log file). Forward audit log
  // includes the rewind event itself appended by caller post-apply.
  if (Number.isFinite(snapshot.events_count) && Array.isArray(session.events)) {
    if (session.events.length > snapshot.events_count) {
      session.events.length = snapshot.events_count;
    }
  }
  return true;
}

/**
 * Factory: create per-session rewind buffer state. Attach to session via
 * ensureRewindState(session).
 *
 * Public API:
 *   - snapshot(session): clones state subset + pushes into ring buffer.
 *   - rewind(session): pops latest snapshot, decrements budget, returns snapshot
 *                      OR null if buffer empty / budget exhausted.
 *   - budget(state): remaining rewind budget.
 *   - reset(state): clear buffer + restore default budget (call on combat end).
 *   - state(state): summary { budget_remaining, snapshots_count, buffer_size }.
 */
function createRewindBuffer({ size = envBufferSize(), budget = envBudget() } = {}) {
  return {
    size,
    budget_max: budget,
    budget_remaining: budget,
    snapshots: [],
  };
}

function ensureRewindState(session) {
  if (!session) return null;
  if (!session._rewind_state) {
    session._rewind_state = createRewindBuffer();
  }
  return session._rewind_state;
}

function snapshotSession(session) {
  const state = ensureRewindState(session);
  if (!state) return false;
  const snap = pickSnapshotState(session);
  if (!snap) return false;
  state.snapshots.push(snap);
  // Ring trim: drop oldest if exceeds size.
  while (state.snapshots.length > state.size) {
    state.snapshots.shift();
  }
  return true;
}

function rewindSession(session) {
  const state = ensureRewindState(session);
  if (!state) return { ok: false, reason: 'no_state' };
  if (state.budget_remaining <= 0) {
    return { ok: false, reason: 'budget_exhausted', budget_remaining: 0 };
  }
  if (state.snapshots.length === 0) {
    return { ok: false, reason: 'buffer_empty', budget_remaining: state.budget_remaining };
  }
  const snap = state.snapshots.pop();
  state.budget_remaining -= 1;
  const applied = applySnapshot(session, snap);
  return {
    ok: applied,
    reason: applied ? 'rewound' : 'apply_failed',
    budget_remaining: state.budget_remaining,
    snapshots_remaining: state.snapshots.length,
  };
}

function resetRewind(session) {
  if (!session) return false;
  session._rewind_state = createRewindBuffer();
  return true;
}

function rewindStateSummary(session) {
  const state = session && session._rewind_state ? session._rewind_state : null;
  if (!state) {
    return {
      budget_remaining: envBudget(),
      budget_max: envBudget(),
      snapshots_count: 0,
      buffer_size: envBufferSize(),
    };
  }
  return {
    budget_remaining: state.budget_remaining,
    budget_max: state.budget_max,
    snapshots_count: state.snapshots.length,
    buffer_size: state.size,
  };
}

module.exports = {
  createRewindBuffer,
  ensureRewindState,
  snapshotSession,
  rewindSession,
  resetRewind,
  rewindStateSummary,
  pickSnapshotState,
  applySnapshot,
  // Exported for tests
  __internals: { envBufferSize, envBudget, deepClone },
};
