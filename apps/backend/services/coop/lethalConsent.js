// =============================================================================
// SPEC-J sez.5 -- lethal consent state machine.
//
// Spec: docs/design/evo-tactics-lethal-wounds-rituals.md (sez.5 + sez.8;
// reconstruction point-9). A lethal mission needs the device confirm of EVERY
// player whose creature participates ("a rischio") -- per-player, NOT a quorum
// (SPEC-K 6.4).
//
// Anti-deadlock (sez.5, two distinct fallback triggers):
//   (a) device online but no response -> timeout after delivery-receipt -> soft;
//   (b) delivery FAILED (offline / retries exhausted) -> IMMEDIATE soft fallback.
// Fallback default = NON parte lethal (soft-death). Mai loop bloccato.
//
// Visibility (SPEC-B 3.10 / F5): the `snapshot` is anonymous/aggregated -- counts
// only, never the roster of who confirmed / who is pending.
//
// Pure: no transport, no time source of its own (caller injects `now`). The
// timeout VALUE is a tuning design-call (master-dd); here it is a parameter with
// a PROPOSED default -- the state-machine logic is value-neutral.
// =============================================================================

'use strict';

// RATIFIED-PROVISIONAL (master-dd verdict 2026-06-17). 120s: long enough for a
// player to read the non-silenceable prompt + confirm on their device, short
// enough to not stall the table. Tuning value, not a balance lever. Consistent
// with the coop WS ghost-timeout (120s). NOTE: the round resolves the instant
// EVERY at-risk player confirms (see confirm() -> _allConfirmed -> granted), so
// this timeout only bites the NON-RESPONDER path; the value is observable only
// once the Godot client renders the consent countdown (item-3). Re-tune (likely
// down toward ~90s) only with device-roundtrip latency + co-op playtest data.
const DEFAULT_TIMEOUT_MS = 120000;

const SOFT_STATUSES = new Set(['pending', 'timeout_soft', 'fallback_soft']);

/**
 * Open a consent round for the at-risk players (deduped, non-empty strings).
 * No at-risk players -> trivially `granted` (nobody to consent).
 */
function open(atRiskPlayerIds, { now = 0, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const at_risk = [
    ...new Set(
      (Array.isArray(atRiskPlayerIds) ? atRiskPlayerIds : []).filter(
        (x) => typeof x === 'string' && x,
      ),
    ),
  ];
  return {
    at_risk,
    confirmed: {},
    opened_at: Number(now) || 0,
    // Invariant: a consent round ALWAYS carries a positive timeout, so the
    // auto-timeout (orchestrator sez.5 trigger-a) is always armable. A
    // non-finite OR non-positive caller value (0 / negative) falls back to the
    // PROPOSED default -- a "0 timeout" must never silently disable the
    // unattended fallback and let a non-responsive device hang the round.
    timeout_ms:
      Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
        ? Number(timeoutMs)
        : DEFAULT_TIMEOUT_MS,
    delivery_failed: false,
    status: at_risk.length === 0 ? 'granted' : 'pending',
    resolved_at: at_risk.length === 0 ? Number(now) || 0 : null,
  };
}

// Presence check by own-key, NOT truthiness: a confirm stores the timestamp,
// which is 0 at t=0 (falsy) -- `state.confirmed[id]` would wrongly read as
// "not confirmed". hasOwnProperty is timestamp-value-agnostic.
function _hasConfirmed(state, id) {
  return Object.prototype.hasOwnProperty.call(state.confirmed, id);
}

function _allConfirmed(state) {
  return state.at_risk.length > 0 && state.at_risk.every((id) => _hasConfirmed(state, id));
}

/**
 * An at-risk player confirms. Non-at-risk ids are ignored (a player cannot
 * consent on another's behalf). Idempotent: a re-confirm keeps the first ts and
 * does not re-resolve. Resolving to `granted` only happens from `pending`.
 */
function confirm(state, playerId, { now = 0 } = {}) {
  if (!state || state.status !== 'pending') return state;
  if (!state.at_risk.includes(playerId)) return state;
  const next = { ...state, confirmed: { ...state.confirmed } };
  if (next.confirmed[playerId] === undefined) next.confirmed[playerId] = Number(now) || 0;
  if (_allConfirmed(next)) {
    next.status = 'granted';
    next.resolved_at = Number(now) || 0;
  }
  return next;
}

/** Anti-deadlock trigger (b): mark delivery as failed (offline / retries out). */
function markDeliveryFailed(state) {
  if (!state || state.status !== 'pending') return state;
  return { ...state, delivery_failed: true };
}

/**
 * Anti-deadlock evaluation. Only acts on a still-`pending` round:
 *   - delivery failed -> immediate `fallback_soft`;
 *   - else now-opened_at >= timeout_ms -> `timeout_soft`.
 * A resolved (`granted`/soft) round is never downgraded.
 */
function evalTimeout(state, { now = 0 } = {}) {
  if (!state || state.status !== 'pending') return state;
  if (state.delivery_failed) {
    return { ...state, status: 'fallback_soft', resolved_at: Number(now) || 0 };
  }
  if ((Number(now) || 0) - state.opened_at >= state.timeout_ms) {
    return { ...state, status: 'timeout_soft', resolved_at: Number(now) || 0 };
  }
  return state;
}

/**
 * Anonymous aggregate (F5): counts only, never the per-player roster.
 * `timeout_ms` is the round's configured duration (a constant, NOT a roster ->
 * F5-safe): SPEC-J item-3 J2 -- the Godot client renders the consent countdown
 * from it instead of hardcoding DEFAULT_TIMEOUT_MS, so a future re-tune of the
 * value does not desync the client. 0 when no round is open.
 */
function snapshot(state) {
  if (!state)
    return {
      total: 0,
      confirmed_count: 0,
      pending_count: 0,
      all_confirmed: false,
      status: 'pending',
      timeout_ms: 0,
    };
  const total = state.at_risk.length;
  const confirmed_count = state.at_risk.filter((id) => _hasConfirmed(state, id)).length;
  return {
    total,
    confirmed_count,
    pending_count: Math.max(0, total - confirmed_count),
    all_confirmed: total > 0 && confirmed_count === total,
    status: state.status,
    timeout_ms: state.timeout_ms,
  };
}

/** 'granted' only when every at-risk player confirmed; every soft state -> 'soft'. */
function outcome(state) {
  if (!state) return 'soft';
  return state.status === 'granted' ? 'granted' : 'soft';
}

function isGranted(state) {
  return outcome(state) === 'granted';
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  SOFT_STATUSES,
  open,
  confirm,
  markDeliveryFailed,
  evalTimeout,
  snapshot,
  outcome,
  isGranted,
};
