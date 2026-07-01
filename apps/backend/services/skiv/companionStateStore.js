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
// Shared bucket for ownerless writes under per-Nido isolation (SPEC-F Option A):
// keeps anonymous saves from evicting an owned Nido's ambassador (see saveCompanionState).
const ANON_BUCKET = '__anon__';

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

// Per-ITEM whitelist for the two append-bounded arrays, mirroring
// packages/contracts/schemas/skiv_companion.schema.json (each item is
// additionalProperties:false). The top-level whitelist keeps the WHOLE array but
// does NOT recurse, so a client-supplied entry (import / resync of a foreign card,
// signature = integrity not authenticity) could smuggle nested PII
// (partner_card_url, session_id, ...) into a persisted item and leak it via
// share/history for a known lineage_id (Codex P1). Enforce the item schema too.
const CROSSBREED_ITEM_FIELDS = Object.freeze([
  'ts',
  'role',
  'with_lineage_id',
  'partner_card_signature',
  'offspring_lineage_id',
  'biome_at_crossbreed',
  'biome_environmental_mutation',
  'tier',
]);
const VOICE_DIARY_ITEM_FIELDS = Object.freeze(['ts', 'phase', 'voice_line', 'trigger_event']);

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

/**
 * Whitelist each item of an append-bounded array to its schema sub-fields
 * (item additionalProperties:false). Drops nested PII / non-schema keys a client
 * could smuggle inside a crossbreed_history / voice_diary entry (Codex P1). Skips
 * non-object entries. Returns a NEW array of NEW objects (no external ref kept).
 */
function sanitizeItems(arr, fields) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const clean = {};
    for (const key of fields) {
      if (key in item && item[key] !== undefined) clean[key] = item[key];
    }
    out.push(clean);
  }
  return out;
}

/**
 * Additive append with de-dup (SPEC-F FC1 resync, spec :172-175). Returns a NEW
 * array = home entries + the external entries whose canonical-JSON form is not
 * already present (order-preserving, home first). Non-arrays coerce to []. The
 * caller re-caps (FIFO) + re-signs; this only merges. Entries have no natural id
 * so canonicalJson is the dedup key (stable across key order).
 */
function appendDeduped(homeArr, externalArr) {
  const home = Array.isArray(homeArr) ? homeArr : [];
  const external = Array.isArray(externalArr) ? externalArr : [];
  if (external.length === 0) return home;
  const seen = new Set(home.map((e) => canonicalJson(e)));
  const out = [...home];
  for (const entry of external) {
    const key = canonicalJson(entry);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

function fromPrismaRow(row) {
  // Prefer the full-card JSONB column (persist-all-fields). Pre-migration rows have
  // state=NULL -> fall back to the 6 legacy columns (species_id/progression/... are
  // genuinely absent for those, i.e. the same truncated shape as before the migration).
  const full = parseJsonSafe(row.state);
  if (full && typeof full === 'object' && !Array.isArray(full)) {
    return full;
  }
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
  // SPEC-F per-Nido isolation (Option A, in-memory): owner → lineage_ids in
  // insertion order, used ONLY when a save opts in with { owner, isolate:true }
  // (flag SPEC_F_NIDO_ISOLATION_ENABLED, wired in the router). Off by default ->
  // the global cap path below is byte-identical. Warm-state only (not persisted;
  // resets on restart -- durable per-Nido cap = Option C, a Prisma migration).
  const ownerLineages = new Map(); // owner → lineage_id[]
  const usePrisma = prismaSupportsSkivCompanion(opts.prisma);
  const log = opts.logger || console;
  const ambassadorCap = Number.isFinite(opts.ambassadorCap)
    ? opts.ambassadorCap
    : AMBASSADOR_CAP_PER_NIDO;

  function persistAsync(state, owner) {
    if (!usePrisma) return;
    // Option C (durable per-Nido cap): persist the owner ONLY on an owned write
    // (non-empty string). Internal ownerless writes (addCrossbreedEvent, resync)
    // must NOT wipe a stored owner -> the key is OMITTED from the update, not
    // written as null. The column is server-side metadata, NEVER part of the
    // whitelisted card (it would leak via share + change the signature).
    const ownedWrite = typeof owner === 'string' && owner.length > 0;
    const data = {
      lineageId: state.lineage_id,
      schemaVersion: state.schema_version,
      signature: state.companion_card_signature || null,
      crossbreedHistory: state.crossbreed_history || [],
      voiceDiaryPortable: state.voice_diary_portable || [],
      shareUrl: state.share_url || null,
      // Persist the FULL whitelisted card (persist-all-fields, TKT-PERSISTENCE-LAYER).
      // The 6 columns above drop species_id/biome_id/mbti_axes/progression/cabinet/
      // mutations/aspect/unit_id/generated_at -> those vanished at first restart. The
      // `state` JSONB column holds the entire sanitized (PII-free) card; fromPrismaRow
      // prefers it and falls back to the 6 columns for pre-migration rows (state=null).
      state,
      ...(ownedWrite ? { owner } : {}),
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
          state: data.state,
          ...(ownedWrite ? { owner } : {}),
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
   * Bulk-hydrate ALL persisted companion rows into memory at startup. Without this
   * the Prisma-backed store starts EMPTY on every restart (hydrateAsync only pulls a
   * single lineage lazily on a guarded write) -> GET /skiv/share 404s for a persisted
   * ambassador until something touches it. Fire-and-forget at boot (app.js). No-op for
   * in-memory stores; never throws (a hydrate failure degrades to a cold start).
   * Returns the count hydrated.
   *
   * Default (isolate=false) = GLOBAL cap, most-recently-updated first: FIFO eviction
   * only drops a lineage from the in-memory map, never its persisted row, so an
   * unbounded findMany would revive earlier-evicted ambassadors and push states.size
   * past the cap on restart (Codex P1). Evicted lineages carry the oldest updatedAt (an
   * evicted lineage can no longer receive events -- addCrossbreedEvent throws when it is
   * absent from memory) so they fall outside `take: cap`.
   *
   * Option C (isolate=true, SPEC_F_NIDO_ISOLATION_ENABLED): per-owner windows.
   * Under isolation the persisted rows legitimately exceed the global cap (N owners
   * x cap each), so the global `take: cap` would DROP owned ambassadors. Instead:
   * load ALL rows oldest-first, bucket by the persisted `owner` column (ownerless
   * rows -> ANON_BUCKET, mirroring saveCompanionState), keep the NEWEST `cap` per
   * bucket, and rebuild the ownerLineages index in updatedAt order so post-boot
   * FIFO eviction (list.shift()) keeps dropping the oldest -- the per-Nido cap is
   * now durable across restart.
   */
  async function hydrateAllAsync({ isolate = false } = {}) {
    if (!usePrisma) return 0;
    try {
      if (!isolate) {
        const rows = await opts.prisma.skivCompanionState.findMany({
          orderBy: { updatedAt: 'desc' },
          take: ambassadorCap,
        });
        let n = 0;
        for (const row of rows) {
          const state = fromPrismaRow(row);
          if (state && typeof state.lineage_id === 'string') {
            states.set(state.lineage_id, state);
            n += 1;
          }
        }
        return n;
      }
      // Isolation ON: per-owner windows, oldest-first for FIFO index order.
      const rows = await opts.prisma.skivCompanionState.findMany({
        orderBy: { updatedAt: 'asc' },
      });
      const buckets = new Map(); // bucket -> row[] (updatedAt asc)
      for (const row of rows) {
        const bucket =
          typeof row.owner === 'string' && row.owner.length > 0 ? row.owner : ANON_BUCKET;
        let list = buckets.get(bucket);
        if (!list) {
          list = [];
          buckets.set(bucket, list);
        }
        list.push(row);
      }
      let n = 0;
      for (const [bucket, list] of buckets) {
        // Newest `cap` per bucket; rows beyond it were FIFO-evicted pre-restart
        // (or would be immediately) -- leave them in the DB, out of memory.
        const kept = list.slice(Math.max(0, list.length - ambassadorCap));
        const index = [];
        for (const row of kept) {
          const state = fromPrismaRow(row);
          if (state && typeof state.lineage_id === 'string') {
            states.set(state.lineage_id, state);
            index.push(state.lineage_id);
            n += 1;
          }
        }
        if (index.length > 0) ownerLineages.set(bucket, index);
      }
      return n;
    } catch (err) {
      log.warn?.(`[companionStateStore] prisma bulk-hydrate failed:`, err?.message || err);
      return 0;
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
  function saveCompanionState(rawState, { owner = null, isolate = false } = {}) {
    // Step 1: schema_version migrate-if-legacy.
    const stateInput = isLegacySchema(rawState) ? migrateLegacyState(rawState) : rawState;
    // Step 2: assert invariants.
    assertValid(stateInput);
    // Step 3: sanitize whitelist (drop any PII keys present).
    const sanitized = sanitizeWhitelist(stateInput);
    // Defaults for optional arrays. sanitizeItems enforces the PER-ITEM schema
    // whitelist so a client-supplied entry (import / resync of a foreign card)
    // cannot persist nested PII past the top-level whitelist (Codex P1).
    sanitized.crossbreed_history = sanitizeItems(
      fifoBounded(sanitized.crossbreed_history || [], CROSSBREED_HISTORY_MAX_ENTRIES),
      CROSSBREED_ITEM_FIELDS,
    );
    sanitized.voice_diary_portable = sanitizeItems(
      fifoBounded(sanitized.voice_diary_portable || [], VOICE_DIARY_MAX_ENTRIES),
      VOICE_DIARY_ITEM_FIELDS,
    );
    sanitized.share_url = sanitized.share_url ?? null;
    // Step 4: compute signature server-side (ignore any client-supplied value).
    sanitized.companion_card_signature = signatureFor(sanitized);
    // Step 5: ambassador cap FIFO eviction.
    const isNewLineage = !states.has(sanitized.lineage_id);
    if (isolate) {
      // Per-Nido cap (SPEC-F isolation ON): each owner keeps its OWN cap window; an
      // owner's (cap+1)th add evicts THAT owner's oldest, never another Nido's. An
      // ownerless write (owner=null: no JWT/player_id) uses a SHARED anonymous bucket
      // that can only evict OTHER anonymous entries -- otherwise dropping the owner
      // field would fall to the global path and evict an owned ambassador, re-opening
      // the cross-Nido eviction (Codex P2). ANON_BUCKET vs a real player_id collision
      // is negligible (that player just shares the anon window).
      const bucket = owner || ANON_BUCKET;
      let list = ownerLineages.get(bucket);
      if (!list) {
        list = [];
        ownerLineages.set(bucket, list);
      }
      if (isNewLineage && list.length >= ambassadorCap) {
        const oldest = list.shift();
        if (oldest !== undefined) {
          states.delete(oldest);
          log.debug?.(
            `[companionStateStore] per-owner FIFO eviction: bucket ${bucket} cap ${ambassadorCap} reached, dropped ${oldest}`,
          );
        }
      }
      if (isNewLineage) list.push(sanitized.lineage_id);
    } else if (isNewLineage && states.size >= ambassadorCap) {
      // Global cap (default / isolation OFF): current behavior, byte-identical.
      const oldestKey = states.keys().next().value;
      if (oldestKey !== undefined) {
        states.delete(oldestKey);
        log.debug?.(
          `[companionStateStore] FIFO eviction: ambassador cap ${ambassadorCap} reached, dropped ${oldestKey}`,
        );
      }
    }
    states.set(sanitized.lineage_id, sanitized);
    // Owner rides to the persistence layer regardless of `isolate` (Option C):
    // pre-populates durable ownership so a later isolation flip has history.
    persistAsync(sanitized, owner);
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
   * SPEC-F FC1 additive resync of a RETURNING Custode (spec :172-181, ratified
   * Opt-A home-authoritative). The lineage MUST already exist at home (caller
   * checks/hydrates first). Merges the incoming card's external history into the
   * canonical home state: the two additive arrays (crossbreed_history,
   * voice_diary_portable) APPEND external entries (deduped); EVERY other field
   * stays HOME (progression/cabinet/mutations/aspect/mbti/species/biome) -- the
   * card can never regress or forge a home stat. Reuses saveCompanionState so the
   * FIFO cap, server-side re-sign, and persist are byte-identical to a normal save;
   * the lineage exists (isNewLineage=false) so no cap-eviction of another Nido.
   */
  function resyncCompanionState(lineageId, incomingCard) {
    if (!lineageId || typeof lineageId !== 'string') {
      throw new TypeError('resyncCompanionState: lineageId (string) required');
    }
    const existing = states.get(lineageId);
    if (!existing) {
      throw new Error(
        `resyncCompanionState: no home state for lineage_id=${lineageId}. Call saveCompanionState first.`,
      );
    }
    if (!incomingCard || typeof incomingCard !== 'object' || Array.isArray(incomingCard)) {
      throw new TypeError('resyncCompanionState: incoming card object required');
    }
    // Sanitize incoming items to their schema sub-fields BEFORE dedup (so the
    // canonical-JSON dedup key compares clean items, and no nested PII enters the
    // merge, Codex P1) + cap here (newest kept): saveCompanionState's assertValid
    // REJECTS an over-cap array before its own fifoBounded runs, so trim first.
    const merged = {
      ...existing,
      crossbreed_history: fifoBounded(
        appendDeduped(
          existing.crossbreed_history,
          sanitizeItems(incomingCard.crossbreed_history, CROSSBREED_ITEM_FIELDS),
        ),
        CROSSBREED_HISTORY_MAX_ENTRIES,
      ),
      voice_diary_portable: fifoBounded(
        appendDeduped(
          existing.voice_diary_portable,
          sanitizeItems(incomingCard.voice_diary_portable, VOICE_DIARY_ITEM_FIELDS),
        ),
        VOICE_DIARY_MAX_ENTRIES,
      ),
    };
    return saveCompanionState(merged);
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
    ownerLineages.clear();
    return n;
  }

  return {
    getCompanionState,
    saveCompanionState,
    resyncCompanionState,
    addCrossbreedEvent,
    getCrossbreedHistory,
    signatureFor,
    listAmbassadors,
    size,
    clearAll,
    hydrateAsync,
    hydrateAllAsync,
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
  appendDeduped,
  sanitizeItems,
  // Constants
  AMBASSADOR_CAP_PER_NIDO,
  VOICE_DIARY_MAX_ENTRIES,
  CROSSBREED_HISTORY_MAX_ENTRIES,
  CURRENT_SCHEMA_VERSION,
  WHITELIST_TOP_FIELDS,
  BLACKLIST_FIELDS,
};
