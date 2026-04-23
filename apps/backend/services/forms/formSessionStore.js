// M12 Phase B — In-memory session store for form evolution state.
// ADR-2026-04-23-m12-phase-a (Phase B extension).
//
// Scopes unit form state per session_id so that /api/v1/forms/session/:sid/*
// endpoints can read/write without piggybacking on session.js (guardrail:
// session.js is size-sensitive + owner-locked).
//
// Storage shape: Map<`${sessionId}:${unitId}`, unitState>
//   unitState = { current_form_id, pe, last_evolve_round, evolve_count, last_delta?, updated_at }
//
// Prisma adapter: constructor accepts `{ prisma }` for future persistence.
// Phase B ships in-memory only; Phase C wires a Prisma table if deploy needs it.

'use strict';

function makeKey(sessionId, unitId) {
  return `${sessionId}:${unitId}`;
}

function createFormSessionStore({ prisma = null } = {}) {
  const states = new Map();
  const prismaBackend = prisma || null; // reserved for Phase C

  function getUnitState(sessionId, unitId) {
    if (!sessionId || !unitId) return null;
    const state = states.get(makeKey(sessionId, unitId));
    return state ? { ...state } : null;
  }

  function setUnitState(sessionId, unitId, patch) {
    if (!sessionId || !unitId) {
      throw new Error('session_id + unit_id required');
    }
    const key = makeKey(sessionId, unitId);
    const prev = states.get(key) || {
      id: unitId,
      current_form_id: null,
      pe: 0,
      last_evolve_round: null,
      evolve_count: 0,
    };
    const next = {
      ...prev,
      ...patch,
      id: unitId,
      updated_at: Date.now(),
    };
    states.set(key, next);
    return { ...next };
  }

  function seedUnit(sessionId, unitId, seed = {}) {
    const patch = {
      current_form_id: seed.current_form_id ?? null,
      pe: Number.isFinite(seed.pe) ? seed.pe : 0,
      last_evolve_round: seed.last_evolve_round ?? null,
      evolve_count: seed.evolve_count ?? 0,
    };
    return setUnitState(sessionId, unitId, patch);
  }

  function applyDelta(sessionId, unitId, delta) {
    if (!delta || typeof delta !== 'object') {
      throw new Error('delta object required');
    }
    const current = getUnitState(sessionId, unitId) || seedUnit(sessionId, unitId);
    const patch = {
      current_form_id: delta.new_form_id ?? current.current_form_id,
      pe: delta.pe_after !== undefined ? delta.pe_after : current.pe,
      last_evolve_round: delta.round ?? current.last_evolve_round,
      evolve_count: Number(current.evolve_count ?? 0) + 1,
      last_delta: delta,
    };
    return setUnitState(sessionId, unitId, patch);
  }

  function listSession(sessionId) {
    const out = [];
    const prefix = `${sessionId}:`;
    for (const [key, val] of states.entries()) {
      if (key.startsWith(prefix)) out.push({ ...val });
    }
    return out;
  }

  function clearSession(sessionId) {
    const prefix = `${sessionId}:`;
    let removed = 0;
    for (const key of Array.from(states.keys())) {
      if (key.startsWith(prefix)) {
        states.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  function clearAll() {
    const n = states.size;
    states.clear();
    return n;
  }

  function size() {
    return states.size;
  }

  return {
    getUnitState,
    setUnitState,
    seedUnit,
    applyDelta,
    listSession,
    clearSession,
    clearAll,
    size,
    _prisma: prismaBackend, // reserved
  };
}

module.exports = { createFormSessionStore };
