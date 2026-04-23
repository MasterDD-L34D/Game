// M13 P6 — Mission timer engine (Long War 2 pattern).
// ADR-2026-04-24-p6-hardcore-timeout (pending).
//
// Pure module. Tracks per-encounter `turn_limit`, emits warning when
// `soft_warning_at` rounds remain, triggers `on_expire` action when exceeded.
// Addresses hardcore deadlock (turtle-kite win rate 84.6-96.7%) by forcing
// commitment: pressure_start aggressivo + timer = impossibile overcamp.
//
// Contract:
//   tick(session, encounter, opts?) → {
//     enabled: bool,
//     round: int (current session round/turn),
//     turn_limit: int,
//     turns_elapsed: int,
//     remaining_turns: int,
//     warning: bool,
//     expired: bool,
//     action: null | 'defeat' | 'escalate_pressure' | 'spawn_wave',
//     side_effects: { pressure_delta?, extra_spawns? },
//     skipped: bool,
//     reason: string,
//   }
//
// Encounter schema:
//   mission_timer:
//     enabled: true
//     turn_limit: 15            # hard cap rounds
//     soft_warning_at: 3        # remaining rounds when warning fires
//     on_expire: 'defeat' | 'escalate_pressure' | 'spawn_wave'
//     on_expire_payload:        # optional; used by on_expire != 'defeat'
//       pressure_delta: 30
//       extra_spawns: 3
//
// Side effects (on session):
//   - session.mission_timer_state = { started_at_turn, warnings_emitted: [int] }
//   - If on_expire === 'escalate_pressure': session.sistema_pressure += delta (caller handles)
//
// Emits via caller:
//   { action_type: 'mission_timer_warning', turn, remaining, automatic: true }
//   { action_type: 'mission_timer_expired', turn, action, automatic: true }

'use strict';

function ensureState(session) {
  if (!session.mission_timer_state) {
    session.mission_timer_state = {
      started_at_turn: session.turn ?? 0,
      warnings_emitted: [],
      expired: false,
    };
  }
  return session.mission_timer_state;
}

function tick(session, encounter, _opts = {}) {
  const policy = encounter?.mission_timer;
  if (!policy || policy.enabled !== true) {
    return { enabled: false, skipped: true, reason: 'policy_disabled' };
  }
  const turnLimit = Number(policy.turn_limit);
  if (!Number.isFinite(turnLimit) || turnLimit <= 0) {
    return { enabled: false, skipped: true, reason: 'invalid_turn_limit' };
  }

  const state = ensureState(session);
  const round = session.turn ?? session.round ?? 0;
  const elapsed = Math.max(0, round - state.started_at_turn);
  const remaining = turnLimit - elapsed;
  const softWarningAt = Number(policy.soft_warning_at) || 3;

  const base = {
    enabled: true,
    round,
    turn_limit: turnLimit,
    turns_elapsed: elapsed,
    remaining_turns: remaining,
    warning: false,
    expired: false,
    action: null,
    side_effects: {},
    skipped: false,
    reason: 'ticked',
  };

  if (state.expired) {
    return { ...base, expired: true, skipped: true, reason: 'already_expired' };
  }

  if (remaining <= 0) {
    state.expired = true;
    const onExpire = policy.on_expire || 'defeat';
    const payload = policy.on_expire_payload || {};
    return {
      ...base,
      expired: true,
      action: onExpire,
      side_effects: {
        pressure_delta: Number(payload.pressure_delta) || 0,
        extra_spawns: Number(payload.extra_spawns) || 0,
      },
      reason: 'expired',
    };
  }

  if (remaining <= softWarningAt && !state.warnings_emitted.includes(remaining)) {
    state.warnings_emitted.push(remaining);
    return { ...base, warning: true, reason: 'warning' };
  }

  return base;
}

// Helper: compute remaining without mutating state (UI preview).
function peek(session, encounter) {
  const policy = encounter?.mission_timer;
  if (!policy || policy.enabled !== true) return null;
  const turnLimit = Number(policy.turn_limit) || 0;
  const startedAt = session.mission_timer_state?.started_at_turn ?? session.turn ?? 0;
  const round = session.turn ?? 0;
  const elapsed = Math.max(0, round - startedAt);
  return {
    turn_limit: turnLimit,
    turns_elapsed: elapsed,
    remaining_turns: turnLimit - elapsed,
    expired: turnLimit - elapsed <= 0,
  };
}

module.exports = { tick, peek };
