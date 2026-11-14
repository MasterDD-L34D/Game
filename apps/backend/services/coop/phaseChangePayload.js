// PR-0 §22 coop-WS surface — single source for the coop `phase_change`
// broadcast payload. Previously this { phase, round, scenario } shape was
// duplicated inline at routes/coop.js (broadcastCoopState) and
// services/network/wsSession.js (reconnect snapshot + host-transfer
// rebroadcast). Centralizing here removes drift risk and gives PR-1 a single
// place to surface session_id / campaign_id.
'use strict';

/**
 * Build the coop `phase_change` payload from an orchestrator.
 *
 * @param {object} orch - CoopOrchestrator (reads phase + run).
 * @param {object} [extra] - extra fields merged over the base (e.g. reason).
 * @returns {{ phase: string, round: number, scenario: (string|null) }}
 */
function buildPhaseChangePayload(orch, extra = {}) {
  const run = orch?.run || null;
  const currentIndex = run?.currentIndex ?? 0;
  return {
    phase: orch?.phase,
    round: currentIndex,
    scenario: run?.scenarioStack?.[currentIndex] || null,
    // PR-1 §22 coop-WS surface — ids for phone-side ALIENA telemetry +
    // tribes fetch. campaign_id == run.id (Godot keys CampaignState on it).
    session_id: orch?.sessionId ?? null,
    campaign_id: run?.id ?? null,
    ...extra,
  };
}

module.exports = { buildPhaseChangePayload };
