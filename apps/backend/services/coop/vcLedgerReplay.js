// OD-058 D3 (issue #2531) -- coop vcSnapshot server-side, replay-from-event-log.
//
// The coop debrief used to be trust-the-host: the host computed a vcSnapshot
// client-side (GET /:id/debrief or its own resolver) and POSTed the flattened
// debrief_payload to /coop/combat/end. This module rebuilds the snapshot from
// the server's OWN event ledger (session.events of the combat session linked
// via coopStore.linkSession) through the exact same vcScoring path the
// single-player flow uses:
//
//   session.events (ledger) -> buildVcSnapshot -> vcSnapshotToDebriefPayload
//
// Parity coop<->single is therefore by construction (Node mirror of the Godot
// parity-contract pattern, test_combat_engine_parity_contract.gd #371).
//
// Scope guard (Opzione 2, issue #2531 D3): combat resolution stays client-side;
// outcome/survivors/xp remain host-reported. Only the VC/debrief derivation
// moves server-side. Kill switch: COOP_VC_LEDGER_REPLAY=0|false|off.
'use strict';

const { loadTelemetryConfig, buildVcSnapshot } = require('../vcScoring');
const { vcSnapshotToDebriefPayload } = require('./vcSnapshotToDebriefPayload');

// Default telemetry config, loaded lazily once (session.js loads its own copy
// at factory init from the same DEFAULT_TELEMETRY_PATH -> identical values).
let _defaultConfig = null;
function _telemetryConfig() {
  if (!_defaultConfig) {
    _defaultConfig = loadTelemetryConfig(undefined, { log: () => {}, warn: () => {} });
  }
  return _defaultConfig;
}

/**
 * Kill switch -- default ON. COOP_VC_LEDGER_REPLAY=0|false|off restores the
 * legacy trust-the-host behavior on /coop/combat/end.
 */
function isLedgerReplayEnabled() {
  const raw = String(process.env.COOP_VC_LEDGER_REPLAY ?? '')
    .trim()
    .toLowerCase();
  return !['0', 'false', 'off'].includes(raw);
}

/**
 * Verdetto #2679 Q2-bis -- per-unit stats for the personality agile_robust
 * derivation. speed + EXPLICIT max_hp only: current hp never leaks into the
 * "birth physique" axis (end-of-mission damage is not physique). Units
 * without stats are omitted -> the axis degrades to the 0.5 neutral by
 * design. NB: a canonical per-species base-stats dataset does NOT exist yet
 * (the research's species.yaml is a ghost) -- when it lands, bounds become
 * data-derived (see the #2679 follow-up ticket).
 *
 * Moved here from routes/session.js (closure) so the coop ledger-replay path
 * shares the single canonical implementation (anti-drift).
 */
function unitStatsById(session) {
  const out = {};
  for (const u of (session && session.units) || []) {
    if (!u || !u.id) continue;
    const stats = {};
    // Explicit null/undefined guards: Number(null) === 0 is finite, so a
    // bare Number.isFinite check would turn "no speed" into speed 0.
    if (u.speed !== null && u.speed !== undefined && Number.isFinite(Number(u.speed))) {
      stats.speed = Number(u.speed);
    }
    if (u.max_hp !== null && u.max_hp !== undefined && Number.isFinite(Number(u.max_hp))) {
      stats.hp_max = Number(u.max_hp);
    }
    if (Object.keys(stats).length) out[u.id] = stats;
  }
  return out;
}

/**
 * Rebuild the vcSnapshot from the session's event ledger.
 *
 * @param {object} session -- live combat session (the coop-linked one)
 * @param {object} [opts]
 * @param {Map|object|null} [opts.formPulses] -- branco Form Pulse map from
 *   coopStore.getFormPulses(campaignId). Applied ONLY when the session does
 *   not already carry its own (mirror of the /end hydration guard,
 *   routes/session.js `!session.formPulses`). Read-only: the session object
 *   is never mutated.
 * @param {object} [opts.telemetryConfig] -- injected config (tests); default
 *   lazy-loads the canonical telemetry.yaml.
 * @returns {object|null} buildVcSnapshot output, or null on invalid session.
 */
function replayVcSnapshotFromLedger(session, { formPulses = null, telemetryConfig = null } = {}) {
  if (!session || typeof session !== 'object') return null;
  const cfg = telemetryConfig || _telemetryConfig();
  const source =
    !session.formPulses && formPulses ? Object.assign({}, session, { formPulses }) : session;
  return buildVcSnapshot(source, cfg);
}

/**
 * Full D3 replay product: vc_snapshot + pinned debrief_payload (Godot #276
 * shape via vcSnapshotToDebriefPayload -- the serializer is produced by the
 * replay, not only by the host-driven /end flow) + events_count so the
 * caller can apply the empty-ledger host-fallback policy.
 *
 * @returns {{vc_snapshot: object, debrief_payload: object, events_count: number}|null}
 */
function replayDebriefFromLedger(session, opts = {}) {
  const snapshot = replayVcSnapshotFromLedger(session, opts);
  if (!snapshot) return null;
  const events = Array.isArray(session.events) ? session.events : [];
  return {
    vc_snapshot: snapshot,
    debrief_payload: vcSnapshotToDebriefPayload(snapshot, unitStatsById(session)),
    events_count: events.length,
    // Actor-attributed events only: lifecycle markers (session_start, actor
    // null) do NOT make a ledger replayable -- a linked-but-never-fought
    // server session (Godot client-side combat) must keep the host fallback.
    actor_events_count: events.filter((e) => e && e.actor_id).length,
  };
}

module.exports = {
  isLedgerReplayEnabled,
  unitStatsById,
  replayVcSnapshotFromLedger,
  replayDebriefFromLedger,
};
