// M17 — coopStore: Map roomCode → CoopOrchestrator.
// In-memory per MVP. Prisma adapter opzionale M20.

'use strict';

const { CoopOrchestrator } = require('./coopOrchestrator');

function createCoopStore({ lobby } = {}) {
  const orchestrators = new Map();

  function getOrCreate(roomCode) {
    if (!roomCode) throw new Error('room_code_required');
    const code = String(roomCode).toUpperCase();
    if (!orchestrators.has(code)) {
      const room = lobby?.getRoom?.(code);
      orchestrators.set(
        code,
        new CoopOrchestrator({
          roomCode: code,
          hostId: room?.hostId || null,
        }),
      );
    }
    return orchestrators.get(code);
  }

  function get(roomCode) {
    if (!roomCode) return null;
    return orchestrators.get(String(roomCode).toUpperCase()) || null;
  }

  function remove(roomCode) {
    if (!roomCode) return false;
    return orchestrators.delete(String(roomCode).toUpperCase());
  }

  function list() {
    return Array.from(orchestrators.keys());
  }

  function clear() {
    orchestrators.clear();
  }

  // PR-1 §22 coop-WS surface — link a combat session id (POST
  // /api/session/start) to the orchestrator whose run.id equals the
  // campaign_id the host passed (run.id == campaign_id in the coop flow).
  // Returns true if a matching orch was found and updated.
  function linkSession(campaignId, sessionId) {
    if (!campaignId || !sessionId) return false;
    for (const orch of orchestrators.values()) {
      if (orch?.run?.id === campaignId) {
        orch.setSessionId(sessionId);
        // Mirror onto the lobby room so the VERSIONED publishPhaseChange
        // (the channel the phone composer consumes) carries session_id.
        const room = lobby?.getRoom?.(orch.roomCode);
        if (room) room.sessionId = sessionId;
        return true;
      }
    }
    return false;
  }

  return { getOrCreate, get, remove, list, clear, linkSession };
}

module.exports = { createCoopStore };
