// S1 polish Phase 1 — Skiv portable companion state store.
//
// In-memory storage (Map keyed by lineage_id) + optional Prisma write-through
// (when DATABASE_URL set + prisma.skivCompanionState delegate present).
//
// Privacy: schema whitelist enforced at saveCompanionState() — PII fields
// (session_id, hp_current, sg_current, _notes, etc.) are stripped pre-persist.
// Signature recomputed server-side from canonical-JSON whitelist.
//
// Cap policy: max 10 ambassador per Nido (Q5 default). FIFO eviction at 11th add.
//
// References:
//   - ADR-2026-04-27 §A schema, §D privacy whitelist, §C cap policy.
//   - Pattern: apps/backend/services/forms/formSessionStore.js (M12 Phase D).

'use strict';

const crypto = require('node:crypto');

// Defaults Q4-Q8 (master-dd 2026-04-27 sera, accept-all-defaults).
const AMBASSADOR_CAP_PER_NIDO = 10;
const VOICE_DIARY_MAX_ENTRIES = 5;
const CROSSBREED_HISTORY_MAX_ENTRIES = 10;
const CURRENT_SCHEMA_VERSION = '0.2.0';

// Whitelist campi share-safe per signature + persistenza (ADR §D).
// NON includere: session_id, hp_current, sg_current, pressure_tier, ap_current,
// _notes, IP origine, user email/username, diary[] full, partner_card_url.
const WHITELIST_TOP_FIELDS = Object.freeze([
  'schema_version',
  'unit_id',
  'species_id',
  'biome_id',
  'lineage_id',
  'companion_card_signature',
  'mbti_axes',
  'progression',
  'cabinet',
  'mutations',
  'aspect',
  'crossbreed_history',
  'voice_diary_portable',
  'share_url',
  'generated_at',
]);

// Blacklist explicit (defense-in-depth — anything not in whitelist is dropped,
// blacklist is for documentation + extra-strict guard for known PII keys).
const BLACKLIST_FIELDS = Object.freeze([
  'session_id',
  'hp_current',
  'sg_current',
  'pressure_tier',
  'ap_current',
  '_notes',
  'ip_address',
  'email',
  'username',
  'user_id',
  'diary',
  'partner_card_url',
  'telemetry',
]);

/**
 * Detect if Prisma client exposes the SkivCompanionState delegate.
 * Stub client doesn't expose it → fallback in-memory only.
 */
function prismaSupportsSkivCompanion(prisma) {
  return Boolean(
    prisma &&
      prisma.skivCompanionState &&
      typeof prisma.skivCompanionState.upsert === 'function' &&
      typeof prisma.skivCompanionState.findUnique === 'function',
  );
}

/**
 * Sanitize state object, stripping any keys outside the whitelist or
 * explicitly in blacklist. Returns a NEW object (no mutation).
 */
function sanitizeWhitelist(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('sanitizeWhitelist: state object required');
  }
  const out = {};
  for (const key of WHITELIST_TOP_FIELDS) {
    if (key in state && state[key] !== undefined) {
      out[key] = state[key];
    }
  }
  // Defensive: in-development drift guard. Throw if a known PII key sneaks in.
  for (const black of BLACKLIST_FIELDS) {
    if (black in state) {
      // We don't throw — we silently drop. Logging optional via constructor logger.
      // Drop guarantees PII never reaches signature compute or persisted store.
    }
  }
  return out;
}

/**
 * Canonical-JSON serialization for deterministic signature.
 * Sort object keys recursively, stringify with no whitespace.
 */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalJson(v)).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(value[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Deterministic sha256 signature over whitelist subset.
 * Excludes companion_card_signature itself (chicken-and-egg).
 */
function signatureFor(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('signatureFor: state object required');
  }
  const sanitized = sanitizeWhitelist(state);
  // Strip the signature itself before computing — otherwise the hash would
  // depend on its own previous value.
  const { companion_card_signature: _ignore, ...payload } = sanitized;
  void _ignore;
  const canonical = canonicalJson(payload);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Migrate a legacy 0.1.x state to 0.2.0 in-memory shape (backward-compat reader).
 * Does NOT persist or mutate disk file — caller may choose to re-save.
 *
 * Strategy:
 *   - Pin schema_version to 0.2.0
 *   - Derive lineage_id from _notes sentinel or fallback unit_id
 *   - Initialize crossbreed_history=[], voice_diary_portable=[], share_url=null
 *   - companion_card_signature: null (caller must recompute via signatureFor)
 */
function migrateLegacyState(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('migrateLegacyState: state object required');
  }
  const lineageId =
    state.lineage_id || `skiv-${state.biome_id || 'unknown'}-legacy-${state.unit_id || 'anon'}`;
  return {
    ...state,
    schema_version: CURRENT_SCHEMA_VERSION,
    lineage_id: lineageId,
    companion_card_signature: state.companion_card_signature || null,
    crossbreed_history: Array.isArray(state.crossbreed_history) ? state.crossbreed_history : [],
    voice_diary_portable: Array.isArray(state.voice_diary_portable)
      ? state.voice_diary_portable
      : [],
    share_url: state.share_url || null,
  };
}

function isLegacySchema(state) {
  if (!state || typeof state !== 'object') return false;
  const v = state.schema_version;
  if (typeof v !== 'string') return true;
  return /^0\.1\./.test(v);
}

/**
 * Validate state against schema invariants used at save-time.
 * Pure check — does not mutate. Throws on violation.
 *
 * Note: full AJV validation is the caller's responsibility (registered in
 * apps/backend/app.js). This adapter enforces only contract invariants
 * critical to persistence integrity (cap, types, required fields).
 */
function assertValid(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('saveCompanionState: state object required');
  }
  if (typeof state.schema_version !== 'string') {
    throw new Error('saveCompanionState: schema_version (string) required');
  }
  if (!/^0\.2\./.test(state.schema_version)) {
    throw new Error(
      `saveCompanionState: schema_version must be 0.2.x, got ${state.schema_version}. Run migrateLegacyState() first.`,
    );
  }
  if (typeof state.lineage_id !== 'string' || state.lineage_id.length < 4) {
    throw new Error('saveCompanionState: lineage_id (string, min 4 chars) required');
  }
  if (
    Array.isArray(state.crossbreed_history) &&
    state.crossbreed_history.length > CROSSBREED_HISTORY_MAX_ENTRIES
  ) {
    throw new Error(
      `saveCompanionState: crossbreed_history exceeds cap ${CROSSBREED_HISTORY_MAX_ENTRIES}`,
    );
  }
  if (
    Array.isArray(state.voice_diary_portable) &&
    state.voice_diary_portable.length > VOICE_DIARY_MAX_ENTRIES
  ) {
    throw new Error(
      `saveCompanionState: voice_diary_portable exceeds cap ${VOICE_DIARY_MAX_ENTRIES}`,
    );
  }
}

/**
 * Apply FIFO eviction to an append-bounded array.
 * Returns a new array bounded to maxSize (oldest entries dropped).
 */
function fifoBounded(arr, maxSize) {
  if (!Array.isArray(arr) || arr.length <= maxSize) return arr || [];
  return arr.slice(arr.length - maxSize);
}

function fromPrismaRow(row) {
  return {
    schema_version: row.schemaVersion || CURRENT_SCHEMA_VERSION,
    lineage_id: row.lineageId,
    companion_card_signature: row.signature || null,
    crossbreed_history: parseJsonSafe(row.crossbreedHistory) || [],
    voice_diary_portable: parseJsonSafe(row.voiceDiaryPortable) || [],
    share_url: row.shareUrl || null,
  };
}

function parseJsonSafe(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw; // Prisma JSONB → already object
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Factory for the companion state store.
 *
 * @param {object} [opts]
 * @param {object} [opts.prisma] — Prisma client (write-through if delegate present)
 * @param {object} [opts.logger] — logger fallback to console
 * @param {number} [opts.ambassadorCap] — override default 10
 */
function createCompanionStateStore(opts = {}) {
  const states = new Map(); // lineage_id → state
  // FIFO insertion order for cap eviction (Map preserves insertion order in JS).
  const usePrisma = prismaSupportsSkivCompanion(opts.prisma);
  const log = opts.logger || console;
  const ambassadorCap = Number.isFinite(opts.ambassadorCap)
    ? opts.ambassadorCap
    : AMBASSADOR_CAP_PER_NIDO;

  function persistAsync(state) {
    if (!usePrisma) return;
    const data = {
      lineageId: state.lineage_id,
      schemaVersion: state.schema_version,
      signature: state.companion_card_signature || null,
      crossbreedHistory: state.crossbreed_history || [],
      voiceDiaryPortable: state.voice_diary_portable || [],
      shareUrl: state.share_url || null,
    };
    opts.prisma.skivCompanionState
      .upsert({
        where: { lineageId: state.lineage_id },
        create: data,
        update: {
          schemaVersion: data.schemaVersion,
          signature: data.signature,
          crossbreedHistory: data.crossbreedHistory,
          voiceDiaryPortable: data.voiceDiaryPortable,
          shareUrl: data.shareUrl,
        },
      })
      .catch((err) => {
        log.warn?.(
          `[companionStateStore] prisma upsert failed for ${state.lineage_id}:`,
          err?.message || err,
        );
      });
  }

  async function hydrateAsync(lineageId) {
    if (!usePrisma) return null;
    try {
      const row = await opts.prisma.skivCompanionState.findUnique({ where: { lineageId } });
      if (!row) return null;
      const state = fromPrismaRow(row);
      states.set(lineageId, state);
      return state;
    } catch (err) {
      log.warn?.(
        `[companionStateStore] prisma hydrate failed for ${lineageId}:`,
        err?.message || err,
      );
      return null;
    }
  }

  /**
   * Get a companion state by lineage_id. Returns null when not present.
   * Returns a deep-ish copy (top-level + arrays cloned) to prevent
   * accidental external mutation.
   */
  function getCompanionState(lineageId) {
    if (!lineageId || typeof lineageId !== 'string') return null;
    const state = states.get(lineageId);
    if (!state) return null;
    return {
      ...state,
      crossbreed_history: [...(state.crossbreed_history || [])],
      voice_diary_portable: [...(state.voice_diary_portable || [])],
    };
  }

  /**
   * Save a companion state. Validates schema invariants, sanitizes whitelist,
   * recomputes signature server-side, applies cap eviction, persists.
   *
   * Returns the canonical stored state (with computed signature).
   */
  function saveCompanionState(rawState) {
    // Step 1: schema_version migrate-if-legacy.
    const stateInput = isLegacySchema(rawState) ? migrateLegacyState(rawState) : rawState;
    // Step 2: assert invariants.
    assertValid(stateInput);
    // Step 3: sanitize whitelist (drop any PII keys present).
    const sanitized = sanitizeWhitelist(stateInput);
    // Defaults for optional arrays.
    sanitized.crossbreed_history = fifoBounded(
      sanitized.crossbreed_history || [],
      CROSSBREED_HISTORY_MAX_ENTRIES,
    );
    sanitized.voice_diary_portable = fifoBounded(
      sanitized.voice_diary_portable || [],
      VOICE_DIARY_MAX_ENTRIES,
    );
    sanitized.share_url = sanitized.share_url ?? null;
    // Step 4: compute signature server-side (ignore any client-supplied value).
    sanitized.companion_card_signature = signatureFor(sanitized);
    // Step 5: ambassador cap FIFO eviction (per Nido = global registry, default 10).
    if (!states.has(sanitized.lineage_id) && states.size >= ambassadorCap) {
      const oldestKey = states.keys().next().value;
      if (oldestKey !== undefined) {
        states.delete(oldestKey);
        log.debug?.(
          `[companionStateStore] FIFO eviction: ambassador cap ${ambassadorCap} reached, dropped ${oldestKey}`,
        );
      }
    }
    states.set(sanitized.lineage_id, sanitized);
    persistAsync(sanitized);
    return getCompanionState(sanitized.lineage_id);
  }

  /**
   * Append a crossbreed event to history. FIFO bounded by 10 entries (Q5 default).
   * Recomputes signature server-side post-append.
   */
  function addCrossbreedEvent(lineageId, event) {
    if (!lineageId || typeof lineageId !== 'string') {
      throw new TypeError('addCrossbreedEvent: lineageId (string) required');
    }
    if (!event || typeof event !== 'object') {
      throw new TypeError('addCrossbreedEvent: event object required');
    }
    const existing = states.get(lineageId);
    if (!existing) {
      throw new Error(
        `addCrossbreedEvent: no state for lineage_id=${lineageId}. Call saveCompanionState first.`,
      );
    }
    const ts = event.ts || new Date().toISOString();
    const entry = { ...event, ts };
    const next = {
      ...existing,
      crossbreed_history: fifoBounded(
        [...(existing.crossbreed_history || []), entry],
        CROSSBREED_HISTORY_MAX_ENTRIES,
      ),
    };
    next.companion_card_signature = signatureFor(next);
    states.set(lineageId, next);
    persistAsync(next);
    return getCompanionState(lineageId);
  }

  /**
   * Get crossbreed history for a lineage_id.
   * Returns [] when not present (graceful, not error).
   */
  function getCrossbreedHistory(lineageId) {
    const state = states.get(lineageId);
    if (!state) return [];
    return [...(state.crossbreed_history || [])];
  }

  function listAmbassadors() {
    return [...states.keys()];
  }

  function size() {
    return states.size;
  }

  function clearAll() {
    const n = states.size;
    states.clear();
    return n;
  }

  return {
    getCompanionState,
    saveCompanionState,
    addCrossbreedEvent,
    getCrossbreedHistory,
    signatureFor,
    listAmbassadors,
    size,
    clearAll,
    hydrateAsync,
    _mode: usePrisma ? 'prisma' : 'in-memory',
  };
}

module.exports = {
  createCompanionStateStore,
  prismaSupportsSkivCompanion,
  // Pure helpers exported for tests + reuse.
  signatureFor,
  canonicalJson,
  sanitizeWhitelist,
  migrateLegacyState,
  isLegacySchema,
  fifoBounded,
  // Constants
  AMBASSADOR_CAP_PER_NIDO,
  VOICE_DIARY_MAX_ENTRIES,
  CROSSBREED_HISTORY_MAX_ENTRIES,
  CURRENT_SCHEMA_VERSION,
  WHITELIST_TOP_FIELDS,
  BLACKLIST_FIELDS,
};
