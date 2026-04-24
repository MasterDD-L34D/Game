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

  return { getOrCreate, get, remove, list, clear };
}

module.exports = { createCoopStore };
