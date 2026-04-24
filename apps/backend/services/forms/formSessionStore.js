// M12 Phase B — In-memory session store for form evolution state.
// M12 Phase D — Prisma write-through adapter (ADR-2026-04-23 addendum).
//
// Scopes unit form state per session_id so that /api/v1/forms/session/:sid/*
// endpoints can read/write without piggybacking on session.js (guardrail:
// session.js is size-sensitive + owner-locked).
//
// Storage shape: Map<`${sessionId}:${unitId}`, unitState>
//   unitState = { current_form_id, pe, last_evolve_round, evolve_count, last_delta?, updated_at }
//
// Prisma adapter: constructor accepts `{ prisma }`. When `prisma.formSessionState`
// is present, writes fire-and-forget upsert + `hydrate(sessionId)` pre-loads
// the in-memory Map from DB. Keeps route API synchronous; failures log and fall
// back to in-memory only.

'use strict';

function makeKey(sessionId, unitId) {
  return `${sessionId}:${unitId}`;
}

function prismaSupportsForms(prisma) {
  return Boolean(
    prisma &&
      prisma.formSessionState &&
      typeof prisma.formSessionState.upsert === 'function' &&
      typeof prisma.formSessionState.findMany === 'function',
  );
}

function createFormSessionStore({ prisma = null, logger = null } = {}) {
  const states = new Map();
  const usePrisma = prismaSupportsForms(prisma);
  const log = logger || console;

  function persistAsync(sessionId, unitId, next) {
    if (!usePrisma) return;
    const lastDelta = next.last_delta ? JSON.stringify(next.last_delta) : null;
    prisma.formSessionState
      .upsert({
        where: { sessionId_unitId: { sessionId, unitId } },
        create: {
          sessionId,
          unitId,
          currentFormId: next.current_form_id ?? null,
          pe: Number(next.pe ?? 0),
          lastEvolveRound: next.last_evolve_round ?? null,
          evolveCount: Number(next.evolve_count ?? 0),
          lastDelta,
        },
        update: {
          currentFormId: next.current_form_id ?? null,
          pe: Number(next.pe ?? 0),
          lastEvolveRound: next.last_evolve_round ?? null,
          evolveCount: Number(next.evolve_count ?? 0),
          lastDelta,
        },
      })
      .catch((err) => {
        log.warn?.(
          `[formSessionStore] prisma upsert failed for ${sessionId}:${unitId}:`,
          err?.message || err,
        );
      });
  }

  function fromPrismaRow(row) {
    let lastDelta = null;
    if (row.lastDelta) {
      try {
        lastDelta = JSON.parse(row.lastDelta);
      } catch {
        lastDelta = null;
      }
    }
    return {
      id: row.unitId,
      current_form_id: row.currentFormId ?? null,
      pe: row.pe ?? 0,
      last_evolve_round: row.lastEvolveRound ?? null,
      evolve_count: row.evolveCount ?? 0,
      last_delta: lastDelta,
      updated_at: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
    };
  }

  async function hydrate(sessionId) {
    if (!usePrisma || !sessionId) return 0;
    try {
      const rows = await prisma.formSessionState.findMany({ where: { sessionId } });
      for (const row of rows) {
        states.set(makeKey(sessionId, row.unitId), fromPrismaRow(row));
      }
      return rows.length;
    } catch (err) {
      log.warn?.(`[formSessionStore] hydrate failed for ${sessionId}:`, err?.message || err);
      return 0;
    }
  }

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
    persistAsync(sessionId, unitId, next);
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
    if (usePrisma) {
      prisma.formSessionState.deleteMany({ where: { sessionId } }).catch((err) => {
        log.warn?.(
          `[formSessionStore] prisma deleteMany failed for ${sessionId}:`,
          err?.message || err,
        );
      });
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
    hydrate,
    _mode: usePrisma ? 'prisma' : 'in-memory',
  };
}

module.exports = { createFormSessionStore, prismaSupportsForms };
