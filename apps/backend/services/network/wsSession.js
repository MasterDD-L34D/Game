// M11 Phase A — Jackbox-style WebSocket session server.
// ADR-2026-04-20.
//
// Responsibilities:
//   - In-memory room store (roomCode → Room)
//   - 4-letter room code generator (20 consonant alphabet, avoid vowels/obscenity)
//   - Host-authoritative state: only host can mutate; players send intents
//   - WebSocket server factory: accepts `ws` connections w/ ?code=&token= auth
//   - Broadcast helpers: room.broadcast, room.sendToPlayer
//   - Reconnection: token survives disconnect; player re-joins w/ same token
//
// Port: 3341 (ADR-2026-04-20). Isolated from HTTP 3334 to avoid
// collisions with Vite :5180, calibration :3340, demo :3334.
//
// Protocol (JSON on wire):
//   { type: 'hello'        , payload: { role, player_id, name } }          // S→C on connect ack
//   { type: 'player_joined', payload: { player_id, name, role } }           // S→C broadcast
//   { type: 'player_left'  , payload: { player_id, reason } }               // S→C broadcast
//   { type: 'state'        , payload: <arbitrary>, version: N }             // S→C host-authored
//   { type: 'intent'       , payload: <arbitrary> }                          // C→S player→host
//   { type: 'chat'         , payload: { from, text } }                      // bidirectional
//   { type: 'ping'         , payload: { t } } / { type: 'pong', payload: { t } }
//   { type: 'error'        , payload: { code, message } }                   // S→C
//   M15 additions:
//   { type: 'intent_cancel', payload: null }                                 // C→S (player)
//   { type: 'phase'        , payload: { phase } }                            // C→S (host only)
//   { type: 'round_clear'  , payload: null }                                 // C→S (host only)
//   { type: 'round_ready'  , payload: { round, phase, ready, missing, total, all_ready, ts } } // S→C broadcast
//
// NOT in Phase A: persistence, reconnect-backoff client logic, lobby UI.
// Phase B will layer frontend and deeper campaign integration.

'use strict';

const { WebSocketServer } = require('ws');
const crypto = require('node:crypto');
const { signPlayerToken, verifyPlayerToken } = require('./jwtAuth');
const { applyOps: applyJsonPatchOps } = require('./jsonPatch');

// B-NEW-2 RCA aid 2026-05-08 — structured JSON log for lobby lifecycle
// events (create / join / vote / close / host_grace_fire / ghost_remove).
// Pre-fix: phone smoke iter3 friends online found 4 lobby orfane in <5min
// with ZERO log line → root-causing took manual REST snapshot polling.
// Now: every state-machine transition emits a one-line JSON record on
// stdout, easy to grep + tail in deploy-quick log capture. Disable via
// env LOBBY_LOG_DISABLED=1 (smoke runs that prefer silent backend).
const LOBBY_LOG_DISABLED = process.env.LOBBY_LOG_DISABLED === '1';
function logLobbyEvent(event, payload = {}) {
  if (LOBBY_LOG_DISABLED) return;
  try {
    console.info(JSON.stringify({ component: 'lobby-service', event, ts: Date.now(), ...payload }));
  } catch {
    // log must never break lobby flow.
  }
}

const ROOM_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ'; // 20 consonants, no vowels, no Y (avoid words)
const ROOM_CODE_LENGTH = 4;
const MAX_ROOM_CREATE_RETRIES = 20;
const DEFAULT_MAX_PLAYERS = 8;
const DEFAULT_HEARTBEAT_MS = 30_000;
// TKT-M11B-05 — host-transfer grace window. If the host socket closes and
// does not reattach within this window, the oldest connected player is
// promoted to host role. Set to 0 to disable automatic host transfer.
//
// Sprint deploy-quick FU4 — bumped 30s → 90s to accommodate mobile
// cross-device flow: phone host backgrounds tab to grab another device or
// share code via SMS/Slack, mobile browser pauses WS, backend triggered
// host-transfer + room close before user could re-foreground. 90s gives
// enough buffer for typical "switch app, copy URL, paste, switch back"
// without breaking smoke test scenarios. Override via env if production
// loads need stricter SLA.
const DEFAULT_HOST_TRANSFER_GRACE_MS = Number(process.env.LOBBY_HOST_TRANSFER_GRACE_MS || 90_000);
// Sprint R.2 — intent/state ledger size cap. On reconnect, if
// `state_version - last_seen_version <= MAX_LEDGER_SIZE`, server replays
// missed entries; else falls back to full state snapshot.
const MAX_LEDGER_SIZE = 100;
// 2026-05-06 phone smoke W8 fix — phase whitelist guard. Pre-fix
// `Room.publishPhaseChange` accepted any string, allowing room.phase
// to drift from coopOrchestrator.PHASES (lobby, character_creation,
// world_setup, combat, debrief, ended). Whitelist superset adds known
// UI-only transient phases used by Godot phone composer.
const KNOWN_PHASES = new Set([
  'lobby',
  'onboarding', // 2026-05-06 narrative onboarding port (Sprint M.6)
  'character_creation',
  'world_setup',
  'world_seed_reveal', // UI-only transient between world_setup → combat
  'combat',
  'debrief',
  'ended',
  // Combat lifecycle hints (not orch phases, but used by round model).
  'planning',
  'ready',
  'resolving',
  'idle',
]);
// Sprint R.4 — phantom-disconnect cleanup grace window. If a non-host
// player's socket closes and they do not reconnect within this window,
// they are removed from `room.players` and a `player_left` broadcast
// fires with `reason = "ghost_timeout"`. Set to 0 to disable cleanup
// (keeps M11 Phase A semantics — players linger forever). Host path
// is unchanged (existing host_transfer_grace_ms drives host promotion).
const DEFAULT_GHOST_TIMEOUT_MS = 120_000;
// B-NEW-4-bis: window during which a closed room code maps to HTTP 410
// (Gone) on /lobby/rejoin instead of 404 (Not Found). 5 minutes covers
// typical "phone backgrounded → user reopens" recovery.
const RECENTLY_CLOSED_TTL_MS = 300_000;

function generateRoomCode() {
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const idx = crypto.randomInt(0, ROOM_CODE_ALPHABET.length);
    out += ROOM_CODE_ALPHABET[idx];
  }
  return out;
}

function generatePlayerId() {
  return `p_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Room — in-memory Jackbox-style lobby.
 * Host-authoritative: only host.player_id can publish `state`.
 * Other roles can emit `intent` + `chat`.
 */
class Room {
  constructor({
    code,
    hostId,
    hostName,
    maxPlayers = DEFAULT_MAX_PLAYERS,
    campaignId = null,
    hostTransferGraceMs = DEFAULT_HOST_TRANSFER_GRACE_MS,
    // Sprint R.4 — phantom-disconnect cleanup window for non-host
    // players. 0 disables (lingering players, M11 Phase A baseline).
    ghostTimeoutMs = DEFAULT_GHOST_TIMEOUT_MS,
    // Opzione C: optional persistence hook. Fire-and-forget after mutation.
    onMutate = null,
    // Hydrate path: reuse data from Prisma snapshot (skips host player seed).
    hydrateFromSeed = null,
  }) {
    this.code = code;
    this.hostId = hostId;
    this.maxPlayers = maxPlayers;
    this.campaignId = campaignId;
    this.createdAt = hydrateFromSeed?.createdAt || Date.now();
    this.closed = Boolean(hydrateFromSeed?.closed);
    this.hostTransferGraceMs = hostTransferGraceMs;
    this.ghostTimeoutMs = ghostTimeoutMs;
    // TKT-M11B-05 — pending host-transfer timer handle.
    this._hostTransferTimer = null;
    // Sprint R.4 — pending ghost-cleanup timers per player_id.
    this._ghostTimers = new Map();
    // player_id → { id, name, role, token, socket?, connected, joinedAt }
    this.players = new Map();
    // Host state published, last-write-wins; version monotonic.
    this.state = hydrateFromSeed?.state ?? null;
    this.stateVersion = hydrateFromSeed?.stateVersion ?? 0;
    // Intent queue (Phase A: FIFO, host drains on demand)
    this.intents = [];
    // M15 — Simultaneous planning round state.
    // player_id → latest intent entry this round. 1 intent per player per round.
    this.pendingIntents = new Map();
    // Phase lifecycle: idle|planning|ready|resolving|ended (optional hint, UI-driven)
    this.phase = 'idle';
    // Round counter (advances on clearRoundIntents).
    this.roundIndex = 0;
    // Sprint R.2 — versioned event ledger for resume-on-reconnect.
    // Each entry: { version, type, payload, ts }. Capped at
    // MAX_LEDGER_SIZE (oldest evicted). `version` shares the
    // monotonic counter with stateVersion (incremented on every
    // append). A reconnect with `last_version=N` replays entries
    // > N; if delta exceeds cap, full state snapshot used instead.
    this._ledger = [];
    this._onMutate = typeof onMutate === 'function' ? onMutate : null;

    if (hydrateFromSeed?.players?.length) {
      for (const p of hydrateFromSeed.players) {
        // Codex PR #2031 P1 fix: hydrated pre-JWT rooms retain raw token
        // strings in player.token. Hash legacy tokens upon hydration to
        // avoid retaining raw strings in memory.
        let safeToken = p.token;
        if (typeof p.token === 'string' && !p.token.includes('.')) {
          safeToken = crypto.createHash('sha256').update(p.token).digest('hex');
        }

        this.players.set(p.id, {
          id: p.id,
          name: p.name,
          role: p.role,
          token: safeToken,
          socket: null,
          connected: false,
          joinedAt: p.joinedAt,
        });
      }
    } else {
      // Sprint R.1 — token is now a signed JWT (HS256) bearing
      // { player_id, room_code, role }. Backward-compat: still stored
      // in `.token` and string-compared in legacy host-auth paths
      // (closeRoom). Defense in depth: WS connect verifies signature.
      const hostToken = signPlayerToken({
        player_id: hostId,
        room_code: code,
        role: 'host',
      });
      this.players.set(hostId, {
        id: hostId,
        name: hostName,
        role: 'host',
        token: hostToken,
        socket: null,
        connected: false,
        joinedAt: this.createdAt,
      });
    }
  }

  _notifyMutate(event) {
    if (this._onMutate) {
      try {
        this._onMutate(this, event);
      } catch {
        // persistence errors swallowed: in-memory stays authoritative
      }
    }
  }

  addPlayer({ name, role = 'player' }) {
    if (this.closed) {
      throw new Error('room_closed');
    }
    if (this.players.size >= this.maxPlayers) {
      throw new Error('room_full');
    }
    const playerId = generatePlayerId();
    // Sprint R.1 — JWT replaces raw random token. Same `.token` field
    // semantics for legacy callers; verify on WS connect path below.
    const token = signPlayerToken({
      player_id: playerId,
      room_code: this.code,
      role,
    });
    this.players.set(playerId, {
      id: playerId,
      name,
      role,
      token,
      socket: null,
      connected: false,
      joinedAt: Date.now(),
    });
    this._notifyMutate({ kind: 'player_added', playerId });
    return { playerId, token };
  }

  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  authenticate(playerId, token) {
    const p = this.players.get(playerId);
    if (!p) return null;
    if (p.token !== token) {
      // Codex PR #2031 P1 fix fallback: check against hashed token for hydrated legacy players.
      const safeToken = typeof token === 'string' ? token : '';
      const hashed = crypto.createHash('sha256').update(safeToken).digest('hex');
      if (p.token !== hashed) {
        return null;
      }
    }
    return p;
  }

  attachSocket(playerId, socket) {
    const p = this.players.get(playerId);
    if (!p) return false;
    // Close previous socket silently if reconnecting.
    if (p.socket && p.socket !== socket && p.socket.readyState === 1) {
      try {
        p.socket.close(4000, 'superseded');
      } catch {
        // noop
      }
    }
    p.socket = socket;
    p.connected = true;
    // Sprint R.4 — clear pending ghost-cleanup timer when player
    // reconnects within the grace window.
    this._clearGhostTimer(playerId);
    return true;
  }

  detachSocket(playerId, socket = null) {
    const p = this.players.get(playerId);
    if (!p) return false;
    // Codex PR #2034 P1 fix: when attachSocket closes a previous
    // socket as `superseded`, that older socket later fires `close`
    // → handler calls detachSocket. By then the NEW socket is already
    // attached (p.socket === newSocket). Pre-fix: detachSocket
    // unconditionally cleared p.socket + scheduled ghost cleanup,
    // marking the actively-connected player as a ghost during the
    // reconnect race.
    //
    // Now: if caller passes the socket that just closed AND it's not
    // p.socket (i.e. it was already superseded), this call is a stale
    // close-event no-op. Caller without socket arg keeps legacy
    // behavior for back-compat.
    if (socket !== null && p.socket !== null && p.socket !== socket) {
      return false;
    }
    p.socket = null;
    p.connected = false;
    // Sprint R.4 — schedule ghost cleanup. Host path is unchanged
    // (host_transfer_grace handles host promotion); only non-host
    // players get auto-removed on grace timeout.
    if (playerId !== this.hostId) {
      this._scheduleGhostCleanup(playerId);
    }
    return true;
  }

  /**
   * Sprint R.4 — schedule auto-removal for a disconnected player.
   * After ghostTimeoutMs ms with no reconnect, the player record is
   * deleted from `room.players` and `player_left` broadcasts with
   * `reason = "ghost_timeout"`. Idempotent: re-scheduling resets the
   * timer (legitimate when same player re-disconnects).
   */
  _scheduleGhostCleanup(playerId) {
    if (!this.ghostTimeoutMs || this.ghostTimeoutMs <= 0) return;
    if (this.closed) return;
    this._clearGhostTimer(playerId);
    const timer = setTimeout(() => {
      this._ghostTimers.delete(playerId);
      const p = this.players.get(playerId);
      // Only fire when player still disconnected. Defense against
      // races where attachSocket fired between timer schedule and
      // callback dispatch.
      if (!p || p.connected) return;
      this.players.delete(playerId);
      this.broadcast({
        type: 'player_left',
        payload: { player_id: playerId, reason: 'ghost_timeout' },
      });
      this._notifyMutate({ kind: 'player_ghost_removed', playerId });
      logLobbyEvent('ghost_remove', { code: this.code, player_id: playerId });
    }, this.ghostTimeoutMs);
    timer.unref?.();
    this._ghostTimers.set(playerId, timer);
  }

  _clearGhostTimer(playerId) {
    const timer = this._ghostTimers.get(playerId);
    if (!timer) return;
    clearTimeout(timer);
    this._ghostTimers.delete(playerId);
  }

  _clearAllGhostTimers() {
    for (const t of this._ghostTimers.values()) {
      clearTimeout(t);
    }
    this._ghostTimers.clear();
  }

  publicPlayerList() {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      connected: p.connected,
      joined_at: p.joinedAt,
    }));
  }

  broadcast(message, { except = null } = {}) {
    const payload = JSON.stringify(message);
    for (const p of this.players.values()) {
      if (p.id === except) continue;
      if (p.socket && p.socket.readyState === 1) {
        try {
          p.socket.send(payload);
        } catch {
          // swallow — will be cleaned on close event
        }
      }
    }
  }

  sendTo(playerId, message) {
    const p = this.players.get(playerId);
    if (!p || !p.socket || p.socket.readyState !== 1) return false;
    try {
      p.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sprint R.2 — append an entry to the resume ledger. Each entry carries
   * the monotonic `version` (== current stateVersion AFTER bump on state
   * pushes; for non-state events, an in-band tick that does NOT advance
   * stateVersion is fine — but for the R.2 baseline we only ledger entries
   * that bump version). Returns the appended entry.
   */
  _appendLedger(type, payload) {
    const entry = {
      version: this.stateVersion,
      type,
      payload,
      ts: Date.now(),
    };
    this._ledger.push(entry);
    if (this._ledger.length > MAX_LEDGER_SIZE) {
      this._ledger.shift();
    }
    return entry;
  }

  /**
   * Sprint R.2 — return ledger entries with version > sinceVersion.
   * Empty array when sinceVersion is at or beyond ledger head.
   */
  ledgerSince(sinceVersion) {
    if (!Number.isFinite(sinceVersion)) return this._ledger.slice();
    return this._ledger.filter((e) => e.version > sinceVersion);
  }

  /**
   * Sprint R.2 — diagnostic / test accessor.
   */
  ledgerSize() {
    return this._ledger.length;
  }

  /**
   * Sprint R.2 — true when full snapshot needed (delta exceeds cap OR
   * ledger empty / pre-version request older than oldest entry).
   */
  needsFullSnapshot(sinceVersion) {
    if (!Number.isFinite(sinceVersion) || sinceVersion < 0) return true;
    if (sinceVersion >= this.stateVersion) return false; // up to date
    if (this._ledger.length === 0) return true;
    const oldest = this._ledger[0].version;
    return sinceVersion < oldest - 1; // requested range pre-dates ledger
  }

  publishState(newState) {
    this.stateVersion += 1;
    this.state = newState;
    // Sprint R.2 — record state push in resume ledger BEFORE broadcast
    // so reconnecting peers can replay.
    this._appendLedger('state', newState);
    this.broadcast({
      type: 'state',
      version: this.stateVersion,
      payload: newState,
    });
    this._notifyMutate({ kind: 'state_published', version: this.stateVersion });
    return this.stateVersion;
  }

  /**
   * Sprint R.3 — incremental state diff broadcast via JSON-Patch ops.
   *
   * Applies `ops` against current `this.state` (no-op safe), bumps
   * `stateVersion`, ledger-records as `state_patch` so reconnecting
   * peers can replay the diff. Broadcasts `{type:'state_patch', version,
   * ops}` to all members.
   *
   * Falls back to a full-state record in the ledger when current state
   * is null (no baseline) — this preserves the resume invariant that
   * any in-window cursor can rebuild authoritative state.
   *
   * @param {Array<{op, path, value?}>} ops - JSON-Patch ops (subset:
   *   replace, add, remove)
   * @returns {number} new stateVersion
   */
  publishStatePatch(ops) {
    if (!Array.isArray(ops) || ops.length === 0) {
      throw new Error('ops_required');
    }
    // Apply locally so authoritative state stays current. If state was
    // null, treat as empty object (caller should publishState() first
    // for non-trivial roots — patch is incremental).
    const baseline = this.state == null ? {} : this.state;
    this.state = applyJsonPatchOps(baseline, ops);
    this.stateVersion += 1;
    this._appendLedger('state_patch', { ops });
    this.broadcast({
      type: 'state_patch',
      version: this.stateVersion,
      ops,
    });
    this._notifyMutate({ kind: 'state_patch_published', version: this.stateVersion });
    return this.stateVersion;
  }

  /**
   * Sprint R.5 — generic event publisher. Bumps stateVersion, ledger-
   * records the entry, broadcasts `{type, version, payload}` to all
   * peers. Used for non-state event classes (phase_change,
   * action_resolved, status_apply, etc.) that callers want preserved
   * in the resume ledger so reconnecting clients can dispatch
   * registered handlers.
   *
   * Reserved type names (already used by Phase A protocol — DO NOT
   * publish via this helper to avoid collision):
   *   hello, state, state_patch, intent, intent_cancel, chat,
   *   replay, error, ping, pong, player_joined, player_left,
   *   player_disconnected, player_connected, host_transferred,
   *   round_ready, room_closed, phase
   *
   * Phase change uses dedicated convenience `publishPhaseChange(phase)`
   * which delegates here with `type = 'phase_change'`.
   *
   * @param {string} type - event class
   * @param {object} payload - opaque payload dispatched to client
   *   handlers via ResumeTokenManager.register_handler(type, ...)
   * @returns {number} new stateVersion
   */
  publishEvent(type, payload) {
    if (!type || typeof type !== 'string') {
      throw new Error('event_type_required');
    }
    const RESERVED = new Set([
      'hello',
      'state',
      'state_patch',
      'intent',
      'intent_cancel',
      'chat',
      'replay',
      'error',
      'ping',
      'pong',
      'player_joined',
      'player_left',
      'player_disconnected',
      'player_connected',
      'host_transferred',
      'round_ready',
      'room_closed',
      'phase',
    ]);
    if (RESERVED.has(type)) {
      throw new Error(`reserved_event_type: ${type}`);
    }
    this.stateVersion += 1;
    this._appendLedger(type, payload ?? null);
    this.broadcast({
      type,
      version: this.stateVersion,
      payload: payload ?? null,
    });
    this._notifyMutate({ kind: 'event_published', event_type: type, version: this.stateVersion });
    return this.stateVersion;
  }

  /**
   * Sprint R.5 — convenience wrapper for phase transitions. Differs
   * from M15 `setPhase()` (lifecycle hint) — this version-stamps the
   * change so reconnect-replay can dispatch it via registered handler.
   * Callers driving combat phase transitions should prefer this.
   */
  publishPhaseChange(phase) {
    if (typeof phase !== 'string' || phase.length === 0) {
      throw new Error('phase_required');
    }
    if (!KNOWN_PHASES.has(phase)) {
      throw new Error(`phase_not_whitelisted:${phase}`);
    }
    this.phase = phase;
    return this.publishEvent('phase_change', { phase });
  }

  /**
   * Sprint R.5 — convenience wrapper for combat resolver outcomes.
   * Payload is opaque; canonical shape per `services/combat/` resolver
   * is `{actor_id, target_id, action_type, result, ...}`.
   */
  publishActionResolved(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('action_payload_required');
    }
    return this.publishEvent('action_resolved', payload);
  }

  pushIntent({ from, payload }) {
    const entry = {
      id: `i_${crypto.randomBytes(4).toString('hex')}`,
      from,
      payload,
      ts: Date.now(),
      round: this.roundIndex,
    };
    this.intents.push(entry);
    // M15 — track latest intent per player for ready-set broadcast.
    this.pendingIntents.set(from, entry);
    // Relay intent to host (drain point).
    this.sendTo(this.hostId, { type: 'intent', payload: entry });
    // Broadcast ready-set snapshot to everyone (players + host).
    this.broadcastRoundReady();
    return entry;
  }

  /**
   * M15 — Broadcast { ready:[player_id], missing:[player_id] } excluding host.
   * Host is arbiter, not a participant. Called after each pushIntent and
   * on explicit round lifecycle transitions.
   */
  broadcastRoundReady() {
    const participants = Array.from(this.players.values()).filter(
      (p) => p.id !== this.hostId && p.role !== 'host',
    );
    const ready = [];
    const missing = [];
    for (const p of participants) {
      if (this.pendingIntents.has(p.id)) ready.push(p.id);
      else missing.push(p.id);
    }
    const allReady = missing.length === 0 && participants.length > 0;
    // M16 P0-3 — auto-transition planning → ready quando tutti hanno
    // inviato intent. Host vede phase=ready e drive resolve via REST;
    // dopo invia round_clear per reset (nextRound planning).
    if (allReady && this.phase === 'planning') {
      this.phase = 'ready';
    }
    this.broadcast({
      type: 'round_ready',
      payload: {
        round: this.roundIndex,
        phase: this.phase,
        ready,
        missing,
        total: participants.length,
        all_ready: allReady,
        ts: Date.now(),
      },
    });
  }

  /**
   * M15 — Remove an intent (player cancels before commit).
   * Returns true if removed.
   */
  cancelIntent(playerId) {
    if (!this.pendingIntents.has(playerId)) return false;
    this.pendingIntents.delete(playerId);
    this.broadcastRoundReady();
    return true;
  }

  /**
   * M15 — Clear intents + advance round counter.
   * Called by host after commit/resolve complete.
   */
  clearRoundIntents() {
    this.pendingIntents.clear();
    this.roundIndex += 1;
    this.phase = 'planning';
    this.broadcastRoundReady();
  }

  /**
   * M15 — Update phase hint + broadcast. Host-only in practice.
   */
  setPhase(phase) {
    if (typeof phase !== 'string') return;
    this.phase = phase;
    this.broadcastRoundReady();
  }

  /**
   * TKT-M11B-05 — promote an existing player to host role. Broadcasts
   * `host_transferred` with the new hostId. Returns the promoted player, or
   * null if the candidate does not exist.
   *
   * The promoted player's `player_token` (issued at join) now authenticates
   * host operations (POST /api/lobby/close, WS `state`). No new token is
   * minted to keep the protocol simple — clients reuse what they already have.
   */
  transferHostTo(newHostId, { reason = 'host_transferred' } = {}) {
    if (this.closed) return null;
    const candidate = this.players.get(newHostId);
    if (!candidate) return null;
    const previousHostId = this.hostId;
    const previousHost = this.players.get(previousHostId);
    if (previousHost) previousHost.role = 'player';
    candidate.role = 'host';
    this.hostId = newHostId;
    this.clearHostTransferTimer();
    this._notifyMutate({ kind: 'host_transferred', newHostId, previousHostId });
    this.broadcast({
      type: 'host_transferred',
      payload: {
        new_host_id: newHostId,
        previous_host_id: previousHostId,
        reason,
        ts: Date.now(),
      },
    });
    return candidate;
  }

  /**
   * TKT-M11B-05 — pick the oldest *connected* non-host player and promote.
   * Returns the promoted player, or null if no eligible candidate exists.
   */
  transferHostAuto({ reason = 'host_dropped' } = {}) {
    if (this.closed) return null;
    const candidates = Array.from(this.players.values())
      .filter((p) => p.id !== this.hostId && p.connected)
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    if (candidates.length === 0) return null;
    return this.transferHostTo(candidates[0].id, { reason });
  }

  scheduleHostTransfer(onFire) {
    this.clearHostTransferTimer();
    if (!this.hostTransferGraceMs || this.hostTransferGraceMs <= 0) return;
    this._hostTransferTimer = setTimeout(() => {
      this._hostTransferTimer = null;
      try {
        onFire?.();
      } catch {
        // noop
      }
    }, this.hostTransferGraceMs);
    this._hostTransferTimer.unref?.();
  }

  clearHostTransferTimer() {
    if (this._hostTransferTimer) {
      clearTimeout(this._hostTransferTimer);
      this._hostTransferTimer = null;
    }
  }

  close(reason = 'host_closed') {
    if (this.closed) return;
    this.closed = true;
    // Sprint R.4 — clear any pending ghost timers on hard close.
    this._clearAllGhostTimers();
    this.clearHostTransferTimer();
    for (const p of this.players.values()) {
      if (p.socket && p.socket.readyState === 1) {
        try {
          p.socket.send(JSON.stringify({ type: 'room_closed', payload: { reason } }));
          p.socket.close(4001, reason);
        } catch {
          // noop
        }
      }
    }
    this._notifyMutate({ kind: 'closed', reason });
    logLobbyEvent('room_close', {
      code: this.code,
      reason,
      player_count: this.players.size,
    });
  }

  snapshot() {
    return {
      code: this.code,
      host_id: this.hostId,
      campaign_id: this.campaignId,
      created_at: this.createdAt,
      closed: this.closed,
      max_players: this.maxPlayers,
      state_version: this.stateVersion,
      players: this.publicPlayerList(),
    };
  }
}

/**
 * LobbyService — in-memory registry of Rooms.
 * Single process only (Phase A). Redis-adapter swap in Phase B+ if needed.
 *
 * Opzione C (2026-04-26): optional Prisma write-through. Pass `{ prisma }`
 * to enable persistence; `hydrate()` replays non-closed rooms on boot.
 * In-memory Map resta authoritative; errori persistenza non rompono il flow.
 */
class LobbyService {
  constructor({
    maxPlayers = DEFAULT_MAX_PLAYERS,
    prisma = null,
    logger = null,
    persistence = null,
  } = {}) {
    this.rooms = new Map(); // code → Room
    // B-NEW-4-bis fix 2026-05-08 (agent-driven smoke iter4) — TTL Set
    // tracking recently-closed room codes so /api/lobby/rejoin can return
    // 410 (room_closed) instead of 404 (room_not_found). Pre-fix: closeRoom
    // dropped the entry from `rooms`, so a phone that exits + reopens
    // mid-session got "room_not_found" + cleared its localStorage even
    // though the canonical reason was "room closed by host". UX wise the
    // distinction matters: 404 means "room never existed" → user creates
    // new lobby; 410 means "session ended cleanly" → user goes home.
    // Entries auto-expire after RECENTLY_CLOSED_TTL_MS.
    this._recentlyClosed = new Map(); // code → expiry_ts
    this.maxPlayers = maxPlayers;
    this.prisma = prisma;
    this.logger = logger || console;
    // Lazy require to keep module load order permissive when prisma absent.
    this._persistence = persistence || (prisma ? require('./lobbyPersistence') : null);
    this._persistEnabled = Boolean(
      this._persistence && this._persistence.prismaSupportsLobby?.(prisma),
    );
  }

  _onMutate() {
    if (!this._persistEnabled) return () => {};
    const self = this;
    return (room /* , event */) => {
      self._persistence.persistRoomAsync(self.prisma, room, { logger: self.logger }).catch(() => {
        // persist errors already logged inside adapter; swallow to protect
        // in-memory flow.
      });
    };
  }

  async hydrate() {
    if (!this._persistEnabled) return 0;
    const seeds = await this._persistence.hydrateRooms(this.prisma, { logger: this.logger });
    let restored = 0;
    for (const seed of seeds) {
      if (seed.closed) continue;
      if (this.rooms.has(seed.code)) continue;
      const room = new Room({
        code: seed.code,
        hostId: seed.hostId,
        hostName: null, // unused when hydrateFromSeed provides players
        maxPlayers: seed.maxPlayers,
        campaignId: seed.campaignId,
        hostTransferGraceMs: DEFAULT_HOST_TRANSFER_GRACE_MS,
        onMutate: this._onMutate(),
        hydrateFromSeed: seed,
      });
      this.rooms.set(seed.code, room);
      restored += 1;
    }
    return restored;
  }

  createRoom({ hostName, campaignId = null, maxPlayers, hostTransferGraceMs } = {}) {
    if (!hostName || typeof hostName !== 'string') {
      throw new Error('host_name_required');
    }
    let code = null;
    for (let attempt = 0; attempt < MAX_ROOM_CREATE_RETRIES; attempt += 1) {
      const candidate = generateRoomCode();
      if (!this.rooms.has(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new Error('room_code_exhaustion');
    }
    const hostId = generatePlayerId();
    const room = new Room({
      code,
      hostId,
      hostName,
      maxPlayers: maxPlayers || this.maxPlayers,
      campaignId,
      hostTransferGraceMs:
        hostTransferGraceMs !== undefined ? hostTransferGraceMs : DEFAULT_HOST_TRANSFER_GRACE_MS,
      onMutate: this._onMutate(),
    });
    this.rooms.set(code, room);
    // Opzione C: initial persist snapshot so reconnect survives restart.
    if (this._persistEnabled) {
      this._persistence
        .persistRoomAsync(this.prisma, room, { logger: this.logger })
        .catch(() => {});
    }
    const host = room.getPlayer(hostId);
    logLobbyEvent('create', {
      code,
      host_id: hostId,
      host_name: hostName,
      max_players: room.maxPlayers,
      campaign_id: campaignId,
    });
    return {
      code,
      host_id: hostId,
      host_token: host.token,
      campaign_id: campaignId,
      max_players: room.maxPlayers,
    };
  }

  joinRoom({ code, playerName }) {
    if (!code) throw new Error('room_code_required');
    const normalized = String(code).toUpperCase();
    const room = this.rooms.get(normalized);
    if (!room) throw new Error('room_not_found');
    if (room.closed) throw new Error('room_closed');
    if (!playerName || typeof playerName !== 'string') {
      throw new Error('player_name_required');
    }
    const { playerId, token } = room.addPlayer({ name: playerName });
    // Broadcast presence to any already-connected sockets.
    room.broadcast({
      type: 'player_joined',
      payload: { player_id: playerId, name: playerName, role: 'player' },
    });
    logLobbyEvent('join', {
      code: normalized,
      player_id: playerId,
      player_name: playerName,
      player_count: room.players.size,
    });
    return { player_id: playerId, player_token: token, room: room.snapshot() };
  }

  closeRoom({ code, hostToken }) {
    const normalized = String(code || '').toUpperCase();
    const room = this.rooms.get(normalized);
    if (!room) throw new Error('room_not_found');
    const host = room.getPlayer(room.hostId);
    if (!host) {
      throw new Error('host_auth_failed');
    }
    if (host.token !== hostToken) {
      const safeHostToken = typeof hostToken === 'string' ? hostToken : '';
      const hashed = crypto.createHash('sha256').update(safeHostToken).digest('hex');
      if (host.token !== hashed) {
        throw new Error('host_auth_failed');
      }
    }
    room.close();
    this.rooms.delete(normalized);
    this._recentlyClosed.set(normalized, Date.now() + RECENTLY_CLOSED_TTL_MS);
    if (this._persistEnabled) {
      this._persistence
        .deleteRoomAsync(this.prisma, normalized, { logger: this.logger })
        .catch(() => {});
    }
    logLobbyEvent('close', { code: normalized, reason: 'host_closed' });
    return { code: normalized, closed: true };
  }

  /**
   * B-NEW-4-bis: was this code closed within the recently-closed TTL?
   * Used by /api/lobby/rejoin to disambiguate 404 vs 410.
   */
  wasRecentlyClosed(code) {
    if (!code) return false;
    const normalized = String(code).toUpperCase();
    const expiry = this._recentlyClosed.get(normalized);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this._recentlyClosed.delete(normalized);
      return false;
    }
    return true;
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(String(code).toUpperCase()) || null;
  }

  listRooms() {
    return Array.from(this.rooms.values()).map((r) => r.snapshot());
  }

  roomCount() {
    return this.rooms.size;
  }
}

/**
 * P1-14 2026-04-26 — coop snapshot mirato al solo player riconnesso.
 * Send (NON broadcast) gli stessi messaggi di rebroadcastCoopState ma a
 * destinatario singolo. Chiamato in attachSocket post-reconnect per evitare
 * stale lobby state mid-coop (player drop combat → rejoin → wrong overlay).
 * Best-effort: swallow errori upstream.
 */
function sendCoopSnapshotToPlayer(room, orch, playerId) {
  if (!room || !orch || !playerId) return;
  const player = room.players?.get?.(playerId);
  const socket = player?.socket;
  if (!socket || socket.readyState !== 1) return;
  const allIds = Array.from(room.players.values())
    .filter((p) => p.id !== room.hostId && p.role !== 'host')
    .map((p) => p.id);
  const send = (msg) => {
    try {
      socket.send(JSON.stringify(msg));
    } catch {
      // best-effort
    }
  };
  send({
    type: 'phase_change',
    payload: {
      phase: orch.phase,
      round: orch.run?.currentIndex ?? 0,
      scenario: orch.run?.scenarioStack?.[orch.run?.currentIndex] || null,
      reason: 'reconnect',
    },
  });
  if (typeof orch.characterReadyList === 'function') {
    send({ type: 'character_ready_list', payload: orch.characterReadyList(allIds) });
  }
  if (orch.phase === 'world_setup' && typeof orch.worldTally === 'function') {
    send({ type: 'world_tally', payload: orch.worldTally(allIds) });
  }
  if (orch.phase === 'debrief' && typeof orch.debriefReadyList === 'function') {
    send({
      type: 'debrief_ready_list',
      payload: {
        outcome: orch.run?.outcome || 'victory',
        ready_list: orch.debriefReadyList(allIds),
      },
    });
  }
}

/**
 * F-1 2026-04-25 — rebroadcast coop phase snapshot to room after host transfer.
 * Mirrors the key messages from routes/coop.js:broadcastCoopState (not imported
 * to avoid circular module load). Pure best-effort; swallows errors upstream.
 */
function rebroadcastCoopState(room, orch) {
  if (!room || typeof room.broadcast !== 'function' || !orch) return;
  const allIds = Array.from(room.players.values())
    .filter((p) => p.id !== room.hostId && p.role !== 'host')
    .map((p) => p.id);
  room.broadcast({
    type: 'phase_change',
    payload: {
      phase: orch.phase,
      round: orch.run?.currentIndex ?? 0,
      scenario: orch.run?.scenarioStack?.[orch.run?.currentIndex] || null,
      reason: 'host_transferred',
    },
  });
  if (typeof orch.characterReadyList === 'function') {
    room.broadcast({
      type: 'character_ready_list',
      payload: orch.characterReadyList(allIds),
    });
  }
  if (orch.phase === 'world_setup' && typeof orch.worldTally === 'function') {
    room.broadcast({ type: 'world_tally', payload: orch.worldTally(allIds) });
  }
  if (orch.phase === 'debrief' && typeof orch.debriefReadyList === 'function') {
    room.broadcast({
      type: 'debrief_ready_list',
      payload: {
        outcome: orch.run?.outcome || 'victory',
        ready_list: orch.debriefReadyList(allIds),
      },
    });
    // 2026-05-15 Bundle C follow-up — surface 4-layer psicologico payload
    // post host-transfer (parity with routes/coop.js:broadcastCoopState).
    if (orch.run?.debrief && typeof orch.run.debrief === 'object') {
      room.broadcast({
        type: 'debrief_payload',
        payload: orch.run.debrief,
      });
    }
  }
}

/**
 * Attach a WebSocketServer to an existing http.Server, gated on path.
 * Alternatively, pass `port` to spawn a standalone server (useful for tests).
 *
 * Connection URL: ws://host:port/ws?code=ABCD&player_id=p_xxx&token=YYY
 * Auth: player_id + token must match an existing room record.
 *
 * Optional `coopStore` (F-1): when present, host-transfer will rebroadcast
 * the coop phase snapshot so the promoted host sees current phase without
 * needing to poll GET /api/coop/state.
 */
function createWsServer({
  lobby,
  server = null,
  port = null,
  path = '/ws',
  coopStore = null,
} = {}) {
  if (!lobby) throw new Error('lobby_required');
  if (!server && (port === null || port === undefined)) {
    throw new Error('server_or_port_required');
  }

  const wssOptions = server ? { server, path } : { port, path };
  const wss = new WebSocketServer(wssOptions);

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.__alive === false) {
        try {
          client.terminate();
        } catch {
          // noop
        }
        continue;
      }
      client.__alive = false;
      try {
        client.ping();
      } catch {
        // noop
      }
    }
  }, DEFAULT_HEARTBEAT_MS);
  heartbeat.unref?.();

  wss.on('connection', (socket, req) => {
    socket.__alive = true;
    socket.on('pong', () => {
      socket.__alive = true;
    });

    const url = new URL(req.url, 'http://localhost');
    const code = (url.searchParams.get('code') || '').toUpperCase();
    const playerId = url.searchParams.get('player_id') || '';
    const token = url.searchParams.get('token') || '';
    // Sprint R.2 — optional resume cursor. Client sends
    // `?last_version=N` on reconnect to request ledger replay of state
    // pushes since N. Absent / non-finite → fresh hello path (no replay).
    const lastVersionRaw = url.searchParams.get('last_version');
    const lastVersion = Number(lastVersionRaw);
    const hasResumeCursor = lastVersionRaw !== null && Number.isFinite(lastVersion);

    const room = lobby.getRoom(code);
    if (!room) {
      socket.send(JSON.stringify({ type: 'error', payload: { code: 'room_not_found' } }));
      socket.close(4004, 'room_not_found');
      return;
    }
    // Sprint R.1 — JWT verify gates the WS connection. Server is sole
    // signature authority; client never verifies. On expired token,
    // emit `auth_expired` so clients can trigger REST re-join (mint
    // fresh JWT) without inferring from generic `auth_failed`.
    //
    // Codex PR #2031 P1 fix: hydrated pre-JWT rooms retain raw token
    // strings in player.token (LobbyService.hydrate() restores them
    // verbatim). Pure JWT-only verify locks out those active rooms on
    // deploy. Fallback path: if JWT decode fails AND the raw token
    // matches the stored player record, accept it (legacy compat).
    // Expired-JWT close is preserved (must re-mint via REST), but
    // signature/format errors degrade to legacy-token attempt.
    let claims = null;
    let legacyTokenAccepted = false;
    try {
      claims = verifyPlayerToken(token);
    } catch (err) {
      if (err.code === 'auth_expired') {
        socket.send(JSON.stringify({ type: 'error', payload: { code: 'auth_expired' } }));
        socket.close(4002, 'auth_expired');
        return;
      }
      // Not a JWT (or malformed signature) — try legacy token match.
      // room.authenticate compares against stored raw token.
      const legacyPlayer = room.authenticate(playerId, token);
      if (!legacyPlayer) {
        socket.send(JSON.stringify({ type: 'error', payload: { code: 'auth_failed' } }));
        socket.close(4003, 'auth_failed');
        return;
      }
      legacyTokenAccepted = true;
    }
    // Cross-check JWT claims (skip when legacy raw token accepted —
    // raw tokens carry no claims).
    if (!legacyTokenAccepted && (claims.room_code !== code || claims.player_id !== playerId)) {
      socket.send(JSON.stringify({ type: 'error', payload: { code: 'auth_failed' } }));
      socket.close(4003, 'auth_failed');
      return;
    }
    const player = room.authenticate(playerId, token);
    if (!player) {
      socket.send(JSON.stringify({ type: 'error', payload: { code: 'auth_failed' } }));
      socket.close(4003, 'auth_failed');
      return;
    }

    const wasReconnect = !!room.players?.get?.(playerId)?.socket;
    room.attachSocket(playerId, socket);
    // TKT-M11B-05 — if the returning player is (now or still) host, any
    // pending host-transfer timer must be cancelled.
    if (playerId === room.hostId) {
      room.clearHostTransferTimer();
    }
    // P1-14 2026-04-26 — coop snapshot push su reconnect mid-coop.
    // Player riconnesso mid-world_setup/combat/debrief altrimenti vede
    // lobby state stale, deve manualmente call GET /api/coop/state.
    //
    // Bug fix 2026-04-29 master-dd live test: player NEW connect (post host
    // startRun) NON riceveva snapshot perche' condizione wasReconnect=true.
    // Result: player stuck su lobby UI mentre server in character_creation.
    // Fix: trigger snapshot push sempre se orch.phase != lobby (NEW + reconnect).
    if (coopStore && typeof coopStore.get === 'function') {
      try {
        const orch = coopStore.get(room.code);
        if (orch && orch.phase && orch.phase !== 'lobby') {
          // Defer 1 tick so hello message arriva prima dello snapshot.
          setImmediate(() => sendCoopSnapshotToPlayer(room, orch, playerId));
        }
      } catch {
        // best-effort, no block
      }
    }
    // Hello ack + snapshot. Note: player.role reflects the latest mutation,
    // including a potential mid-session transferHost promotion.
    socket.send(
      JSON.stringify({
        type: 'hello',
        payload: {
          role: player.role,
          player_id: playerId,
          name: player.name,
          room: room.snapshot(),
          state: room.state,
          state_version: room.stateVersion,
        },
      }),
    );
    // Sprint R.2 — resume replay dispatch. After hello, if client sent
    // `last_version=N` and the ledger covers the gap, send a `replay`
    // message with the missed entries. Otherwise (delta too large or
    // pre-ledger) the hello state already represents authoritative
    // current snapshot — client falls back to full-state path.
    if (hasResumeCursor) {
      if (lastVersion === room.stateVersion) {
        // Up to date — no replay needed.
        socket.send(
          JSON.stringify({
            type: 'replay',
            payload: { entries: [], reason: 'up_to_date' },
          }),
        );
      } else if (room.needsFullSnapshot(lastVersion)) {
        // Codex PR #98 (Godot v2 paired) P1 fix: client has no path to
        // surface authoritative snapshot via entries[]-only payload.
        // Attach current room state + version so client emits its
        // existing state_received signal directly. Pre-fix clients
        // without paired update simply ignore the extra fields
        // (back-compat).
        socket.send(
          JSON.stringify({
            type: 'replay',
            payload: {
              entries: [],
              reason: 'snapshot_required',
              state: room.state,
              state_version: room.stateVersion,
            },
          }),
        );
      } else {
        const entries = room.ledgerSince(lastVersion);
        socket.send(
          JSON.stringify({
            type: 'replay',
            payload: { entries, reason: 'incremental' },
          }),
        );
      }
    }
    // Announce (re)connection.
    room.broadcast(
      {
        type: 'player_connected',
        payload: { player_id: playerId, name: player.name, role: player.role },
      },
      { except: playerId },
    );

    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ type: 'error', payload: { code: 'bad_json' } }));
        return;
      }
      if (!msg || typeof msg.type !== 'string') {
        socket.send(JSON.stringify({ type: 'error', payload: { code: 'bad_message' } }));
        return;
      }

      switch (msg.type) {
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong', payload: msg.payload || {} }));
          break;

        case 'state':
          // Host-authoritative gate.
          if (player.role !== 'host') {
            socket.send(JSON.stringify({ type: 'error', payload: { code: 'not_host' } }));
            return;
          }
          room.publishState(msg.payload ?? null);
          break;

        case 'intent': {
          // 2026-05-06 phone smoke retry B6 fix — split lifecycle vs combat.
          // Godot phone composer (Sprint W7) sends 7 action types via
          // `intent` msg: 5 lifecycle (character_create, form_pulse_submit,
          // lineage_choice, reveal_acknowledge, next_macro) + 2 combat
          // (combat_action, end_turn). Pre-fix gate rejected ALL host
          // intents + non-host intents outside planning/idle, locking
          // every player out of submitting characters in
          // character_creation phase.
          const action = typeof msg.payload?.action === 'string' ? msg.payload.action : '';
          const COMBAT_ACTIONS = new Set(['combat_action', 'end_turn']);
          const isCombatIntent = COMBAT_ACTIONS.has(action);
          if (isCombatIntent) {
            // Combat intents: host cannot act (Sistema-driven), phase must
            // be planning/idle.
            if (player.role === 'host') {
              socket.send(
                JSON.stringify({ type: 'error', payload: { code: 'host_cannot_intent' } }),
              );
              return;
            }
            if (room.phase && room.phase !== 'planning' && room.phase !== 'idle') {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: 'phase_locked', phase: room.phase },
                }),
              );
              return;
            }
          }
          // 2026-05-06 phone smoke retry B7 fix — Godot phone has no
          // host-side drain JS (web v1 had it). Lifecycle intents must
          // be drained server-side directly via coopStore. Otherwise
          // pushIntent only relays to host (no-op for Godot host) and
          // emits unknown_type error on host phone.
          // 2026-05-06 narrative onboarding port — drain onboarding_choice
          // intent server-side. Host-only enforcement at orch layer.
          // Resolves choice from campaign onboarding YAML, calls
          // orch.submitOnboardingChoice (auto-advances onboarding →
          // character_creation), broadcasts onboarding_chosen.
          if (action === 'onboarding_choice' && coopStore) {
            try {
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const optionKeyRaw =
                typeof msg.payload?.option_key === 'string' ? msg.payload.option_key : '';
              const autoSelected = Boolean(msg.payload?.auto_selected);
              // eslint-disable-next-line global-require
              const { loadCampaign, getOnboarding } = require('../campaign/campaignLoader');
              const campaignDefId =
                typeof msg.payload?.campaign_def_id === 'string'
                  ? msg.payload.campaign_def_id
                  : 'default_campaign_mvp';
              const defDoc = loadCampaign(campaignDefId);
              const onboarding = getOnboarding(defDoc);
              if (!onboarding || !Array.isArray(onboarding.choices)) {
                socket.send(
                  JSON.stringify({
                    type: 'error',
                    payload: { code: 'onboarding_not_configured' },
                  }),
                );
                return;
              }
              const validKeys = onboarding.choices.map((c) => c.option_key);
              const optionKey = validKeys.includes(optionKeyRaw)
                ? optionKeyRaw
                : onboarding.default_choice_on_timeout || validKeys[0];
              const choiceDef = onboarding.choices.find((c) => c.option_key === optionKey);
              const normalized = orch.submitOnboardingChoice(
                playerId,
                {
                  option_key: choiceDef.option_key,
                  trait_id: choiceDef.trait_id,
                  label: choiceDef.label,
                  narrative: choiceDef.narrative,
                  auto_selected: autoSelected,
                },
                { hostId: room.hostId },
              );
              room.broadcast({
                type: 'onboarding_chosen',
                payload: normalized,
              });
              // Auto-advance phase via versioned phase_change broadcast.
              room.publishPhaseChange('character_creation');
              socket.send(
                JSON.stringify({
                  type: 'onboarding_choice_accepted',
                  payload: { choice: normalized, phase: orch.phase },
                }),
              );
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'onboarding_choice_failed' },
                }),
              );
            }
            return;
          }
          if (action === 'character_create' && coopStore) {
            try {
              // Codex P2-1 fix — do NOT auto-bootstrap run from non-host
              // intent. /coop/run/start is host-only and case 'phase'
              // already bootstraps when host transitions to
              // character_creation. Allowing player to startRun() here
              // would let any authenticated client mutate coop state
              // before host start, leaving subsequent host start to
              // fail with `cannot_start_from_phase:character_creation`.
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const allPids = Array.from(room.players.values()).map((p) => p.id);
              const speciesId =
                typeof msg.payload?.species_id === 'string' ? msg.payload.species_id : '';
              const formIdRaw = typeof msg.payload?.form_id === 'string' ? msg.payload.form_id : '';
              const spec = orch.submitCharacter(
                playerId,
                {
                  name: msg.payload?.name,
                  // Phone composer Sprint W7 doesn't pick form_id yet;
                  // synthesize from species_id so submitCharacter passes.
                  form_id: formIdRaw || (speciesId ? `form_${speciesId}` : 'form_default'),
                  species_id: speciesId || null,
                  job_id: msg.payload?.job_id || 'guerriero',
                },
                { allPlayerIds: allPids },
              );
              // B-NEW-5 fix 2026-05-08 — skip downstream broadcast on
              // idempotent resubmit (phone retry burst / WS reconnect
              // intent flush). Ack still fires so the client gets visual
              // confirmation per tap, but ready-list bus stays quiet.
              if (!spec._deduplicated) {
                room.broadcast({
                  type: 'character_ready_list',
                  payload: orch.characterReadyList(allPids),
                });
                if (orch.phase === 'world_setup') {
                  room.publishPhaseChange('world_setup');
                }
              }
              socket.send(
                JSON.stringify({
                  type: 'character_accepted',
                  payload: { spec, phase: orch.phase },
                }),
              );
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'character_create_failed' },
                }),
              );
            }
            return;
          }
          // B-NEW-14 fix 2026-05-09 — host WS world_confirm intent.
          // Pre-fix only REST `/api/coop/world/confirm` exposed; phone
          // composer had no host_token nor REST client wired for the
          // confirm step → host stuck in MODE_WORLD_VOTE post tally
          // accept (browser smoke iter6 caught). Now host phone can
          // emit `intent {action:"world_confirm", scenario_id?, biome_id?}`
          // and backend mirrors REST flow: validate host role via
          // room.hostId, call orch.confirmWorld, broadcast phase_change.
          if (action === 'world_confirm' && coopStore) {
            try {
              if (playerId !== room.hostId) {
                socket.send(JSON.stringify({ type: 'error', payload: { code: 'host_only' } }));
                return;
              }
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const result = orch.confirmWorld({
                scenarioId: msg.payload?.scenario_id,
                biomeId: msg.payload?.biome_id,
                formAxes: msg.payload?.form_axes,
                runSeed: msg.payload?.run_seed,
                trainerCanonical: msg.payload?.trainer_canonical,
              });
              room.publishPhaseChange(orch.phase);
              const ackPayload = { scenario_id: result.scenario_id, phase: orch.phase };
              if (result.enriched_world) Object.assign(ackPayload, result.enriched_world);
              socket.send(JSON.stringify({ type: 'world_confirm_accepted', payload: ackPayload }));
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'world_confirm_failed' },
                }),
              );
            }
            return;
          }
          // 2026-05-06 phone smoke W5 fix — drain world_vote intents
          // server-side via coopOrchestrator.voteWorld. Pre-fix the intent
          // was relayed to host Godot which has no GDScript handler →
          // silent drop. World tally never updated.
          if (action === 'world_vote' && coopStore) {
            try {
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const allPids = Array.from(room.players.values()).map((p) => p.id);
              // B-NEW-1 fix 2026-05-08 — connected-only quorum so phone
              // smoke does not stall when 2nd player WS dropped mid-vote.
              const connectedPids = Array.from(room.players.values())
                .filter((p) => p.connected && p.id !== room.hostId && p.role !== 'host')
                .map((p) => p.id);
              const tally = orch.voteWorld(playerId, {
                scenarioId: msg.payload?.scenario_id,
                accept: msg.payload?.choice === 'accept' || msg.payload?.accept === true,
                allPlayerIds: allPids,
                connectedPlayerIds: connectedPids,
              });
              logLobbyEvent('vote', {
                code: room.code,
                player_id: playerId,
                accept: tally.per_player?.[playerId]?.accept ?? null,
                accept_count: tally.accept,
                reject_count: tally.reject,
                connected_total: tally.connected_total,
                all_connected_accepted: tally.all_connected_accepted,
              });
              room.broadcast({ type: 'world_tally', payload: tally });
              socket.send(JSON.stringify({ type: 'world_vote_accepted', payload: { tally } }));
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'world_vote_failed' },
                }),
              );
            }
            return;
          }
          // 2026-05-06 phone smoke W6 fix — drain lineage_choice (debrief
          // phase) server-side via coopOrchestrator.submitDebriefChoice.
          // Pre-fix the intent was relayed to host Godot → silent drop,
          // debrief phase never auto-advanced to next scenario or ended.
          if (action === 'lineage_choice' && coopStore) {
            try {
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const allPids = Array.from(room.players.values()).map((p) => p.id);
              const choice = {
                mutations_to_leave: Array.isArray(msg.payload?.mutations_to_leave)
                  ? msg.payload.mutations_to_leave
                  : [],
              };
              const advance = orch.submitDebriefChoice(playerId, choice, {
                allPlayerIds: allPids,
              });
              room.broadcast({
                type: 'debrief_ready_list',
                payload: {
                  outcome: orch.run?.outcome || 'victory',
                  ready_list: orch.debriefReadyList(allPids),
                },
              });
              if (advance?.action === 'ended') {
                room.publishPhaseChange('ended');
              } else if (orch.phase === 'world_setup') {
                room.publishPhaseChange('world_setup');
              }
              socket.send(
                JSON.stringify({
                  type: 'lineage_choice_accepted',
                  payload: { phase: orch.phase, advance: advance || null },
                }),
              );
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'lineage_choice_failed' },
                }),
              );
            }
            return;
          }
          // 2026-05-06 phone smoke W8b fix — drain reveal_acknowledge
          // (UI-only world_seed_reveal phase) server-side via
          // coopOrchestrator.acknowledgeReveal. Auto-advance phase to
          // world_setup when all expected players ack. Pre-fix relay to
          // Godot host → silent drop.
          if (action === 'reveal_acknowledge' && coopStore) {
            try {
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const allPids = Array.from(room.players.values()).map((p) => p.id);
              const status = orch.acknowledgeReveal(playerId, { allPlayerIds: allPids });
              room.broadcast({
                type: 'reveal_ack_list',
                payload: orch.revealAckList(allPids),
              });
              if (status.all_ready) {
                room.publishPhaseChange('world_setup');
              }
              socket.send(
                JSON.stringify({
                  type: 'reveal_acknowledge_accepted',
                  payload: { status, phase: room.phase },
                }),
              );
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'reveal_acknowledge_failed' },
                }),
              );
            }
            return;
          }
          // 2026-05-06 phone smoke W4 fix — drain form_pulse_submit
          // server-side via coopOrchestrator.submitFormPulse. Pre-fix the
          // intent was relayed to host Godot via pushIntent → Godot host
          // has no GDScript drain → silent drop. Now broadcasts
          // `form_pulse_list` (per-player ready+axes snapshot) so all
          // clients can render progress + send `form_pulse_accepted` to
          // sender for ack.
          if (action === 'form_pulse_submit' && coopStore) {
            try {
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              // Exclude host from expected players: Godot phone host doesn't
              // submit form_pulse_submit (host = arbiter, players = phones).
              // Without filter, status.total inflates by 1 + all_ready stuck
              // false. Mirrors routes/coop.js allPlayerIds() helper +
              // sendCoopSnapshotToPlayer/rebroadcastCoopState exclusion.
              // Codex review P2 #2073.
              const allPids = Array.from(room.players.values())
                .filter((p) => p.id !== room.hostId && p.role !== 'host')
                .map((p) => p.id);
              const status = orch.submitFormPulse(
                playerId,
                { axes: msg.payload?.form_axes || msg.payload?.axes || {} },
                { allPlayerIds: allPids },
              );
              room.broadcast({
                type: 'form_pulse_list',
                payload: {
                  status,
                  list: orch.formPulseList(allPids),
                },
              });
              socket.send(
                JSON.stringify({
                  type: 'form_pulse_accepted',
                  payload: { status },
                }),
              );
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'form_pulse_failed' },
                }),
              );
            }
            return;
          }
          // 2026-05-06 phone smoke W7 fix — drain next_macro server-side via
          // coopOrchestrator.submitNextMacro. Host-only post-debrief macro
          // navigation choice {advance, branch, retreat}. Pre-fix relay
          // to Godot host → silent drop, run stuck post-debrief.
          if (action === 'next_macro' && coopStore) {
            try {
              const orch = coopStore.get(room.code);
              if (!orch) {
                socket.send(
                  JSON.stringify({ type: 'error', payload: { code: 'run_not_started' } }),
                );
                return;
              }
              const result = orch.submitNextMacro(
                playerId,
                { choice: msg.payload?.choice },
                { hostId: room.hostId },
              );
              room.broadcast({
                type: 'next_macro_committed',
                payload: {
                  choice: result.choice,
                  phase: result.phase,
                  advance: result.advance || null,
                },
              });
              if (result.phase === 'world_setup') {
                room.publishPhaseChange('world_setup');
              } else if (result.phase === 'ended') {
                room.publishPhaseChange('ended');
              }
              socket.send(
                JSON.stringify({
                  type: 'next_macro_accepted',
                  payload: { choice: result.choice, phase: result.phase },
                }),
              );
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  payload: { code: err.message || 'next_macro_failed' },
                }),
              );
            }
            return;
          }
          // No more lifecycle drain branches — all 5 server-side now.
          // Defensive fallback: relay to host (legacy web v1 path) for
          // any unrecognized lifecycle intent.
          room.pushIntent({ from: playerId, payload: msg.payload ?? null });
          break;
        }

        case 'intent_cancel':
          if (player.role === 'host') return;
          if (room.phase === 'resolving' || room.phase === 'ready') {
            socket.send(
              JSON.stringify({
                type: 'error',
                payload: { code: 'phase_locked', phase: room.phase },
              }),
            );
            return;
          }
          room.cancelIntent(playerId);
          break;

        case 'phase':
          // Host-only: set phase hint (planning|ready|resolving|ended).
          if (player.role !== 'host') {
            socket.send(JSON.stringify({ type: 'error', payload: { code: 'not_host' } }));
            return;
          }
          // Sprint deploy-quick FU4 — use publishPhaseChange instead of
          // setPhase: setPhase only updates `this.phase` + sends
          // `round_ready` (which phone composer doesn't bind to phase
          // transitions). publishPhaseChange emits the versioned
          // `phase_change` event consumed by clients via
          // `event_received` → phone composer maps to `_swap_mode(phase)`.
          // Also retain round_ready broadcast for legacy listeners.
          {
            const phaseArg = typeof msg.payload?.phase === 'string' ? msg.payload.phase : '';
            if (phaseArg.length > 0) {
              try {
                room.publishPhaseChange(phaseArg);
              } catch (err) {
                socket.send(
                  JSON.stringify({
                    type: 'error',
                    payload: { code: 'phase_invalid', message: String(err.message || err) },
                  }),
                );
                return;
              }
              room.broadcastRoundReady();
              // 2026-05-06 phone smoke retry B7 fix — phone-only flow lacks
              // POST /api/coop/run/start call (web v1 host JS made it).
              // When host transitions to character_creation, bootstrap
              // coopOrchestrator inline so submitCharacter intents work.
              if (phaseArg === 'character_creation' && coopStore) {
                try {
                  const orch = coopStore.getOrCreate(room.code);
                  if (orch.phase === 'lobby') {
                    orch.startRun({});
                  }
                } catch (err) {
                  // Non-fatal — log and continue. Character submit will
                  // surface error if orch unhealthy.
                  console.warn('[ws] coop bootstrap failed:', err.message);
                }
              }
              // B-NEW-1-bis fix 2026-05-08 (agent-driven smoke iter4) —
              // phone host advancing manually via `phase=world_setup` WS
              // intent updated `room.phase` but NEVER `orch.phase`.
              // Subsequent `world_vote` intents threw `not_in_world_setup`
              // and surfaced as no-op taps on the phone (no error toast on
              // Godot composer). Sync orch phase so the connected-only
              // quorum logic shipped in #2133 actually runs. Same pattern
              // for combat / debrief / ended for symmetry — manual phase
              // override on host phone keeps the orch state machine in
              // sync. world_seed_reveal stays UI-only (transient).
              if (
                coopStore &&
                (phaseArg === 'world_setup' ||
                  phaseArg === 'combat' ||
                  phaseArg === 'debrief' ||
                  phaseArg === 'ended')
              ) {
                try {
                  const orch = coopStore.get(room.code);
                  if (orch && orch.phase !== phaseArg) {
                    orch._setPhase(phaseArg);
                  }
                } catch (err) {
                  console.warn(`[ws] orch phase sync to ${phaseArg} failed:`, err && err.message);
                }
              }
              // 2026-05-06 narrative onboarding port — bootstrap orch in
              // onboarding phase. Loads campaign onboarding YAML and
              // broadcasts to all clients so phones can render briefing.
              if (phaseArg === 'onboarding' && coopStore) {
                try {
                  const orch = coopStore.getOrCreate(room.code);
                  if (orch.phase === 'lobby') {
                    orch.startOnboarding({});
                  }
                  // Lazy-load campaign loader (avoids circular dep at
                  // module init time when wsSession.js is imported by
                  // app.js before campaign service initializes).
                  // eslint-disable-next-line global-require
                  const { loadCampaign, getOnboarding } = require('../campaign/campaignLoader');
                  const campaignDefId =
                    typeof msg.payload?.campaign_def_id === 'string'
                      ? msg.payload.campaign_def_id
                      : 'default_campaign_mvp';
                  const defDoc = loadCampaign(campaignDefId);
                  const onboarding = getOnboarding(defDoc);
                  if (onboarding) {
                    room.broadcast({
                      type: 'onboarding_payload',
                      payload: { campaign_def_id: campaignDefId, onboarding },
                    });
                  }
                } catch (err) {
                  console.warn('[ws] onboarding bootstrap failed:', err.message);
                }
              }
            }
          }
          break;

        case 'round_clear':
          // Host-only: end round, clear intents, advance counter.
          if (player.role !== 'host') {
            socket.send(JSON.stringify({ type: 'error', payload: { code: 'not_host' } }));
            return;
          }
          room.clearRoundIntents();
          break;

        case 'chat': {
          const text = typeof msg.payload?.text === 'string' ? msg.payload.text.slice(0, 500) : '';
          if (!text) return;
          room.broadcast({
            type: 'chat',
            payload: { from: playerId, name: player.name, text, ts: Date.now() },
          });
          break;
        }

        default:
          socket.send(
            JSON.stringify({ type: 'error', payload: { code: 'unknown_type', type: msg.type } }),
          );
      }
    });

    socket.on('close', () => {
      // Codex PR #2034 P1 fix: pass closing socket so detachSocket can
      // skip stale close events (superseded reconnect race).
      room.detachSocket(playerId, socket);
      room.broadcast({
        type: 'player_disconnected',
        payload: { player_id: playerId },
      });
      // TKT-M11B-05 — if the host's socket dropped, schedule an auto host
      // transfer. If the host reconnects before the grace window, the timer
      // is cleared in the hello/attach path above.
      if (playerId === room.hostId && !room.closed) {
        room.scheduleHostTransfer(() => {
          const promoted = room.transferHostAuto({ reason: 'host_dropped' });
          if (!promoted) {
            // No eligible candidate; close the room as a fallback so clients
            // stop waiting indefinitely.
            logLobbyEvent('host_grace_fire_close', {
              code: room.code,
              prev_host_id: playerId,
              reason: 'no_candidate',
            });
            room.close('host_dropped_no_candidate');
            return;
          }
          logLobbyEvent('host_grace_fire_transfer', {
            code: room.code,
            prev_host_id: playerId,
            new_host_id: promoted.id,
          });
          // F-2 2026-04-25 — replay round_ready snapshot to the promoted host
          // (and peers) so combat-phase round state is not lost across host
          // transfer. Without this, a transfer mid-`resolving`/`planning` left
          // the new host blind to ready-set + roundIndex on the WS channel.
          try {
            room.broadcastRoundReady();
          } catch {
            // swallow — best-effort.
          }
          // F-1 2026-04-25 — rebroadcast coop state to the new host + peers
          // so the promoted client sees the correct phase/run without needing
          // to call GET /api/coop/state manually.
          if (coopStore && typeof coopStore.get === 'function') {
            try {
              const orch = coopStore.get(room.code);
              if (orch) rebroadcastCoopState(room, orch);
            } catch {
              // swallow — rebroadcast is best-effort.
            }
          }
        });
      }
    });

    socket.on('error', () => {
      // swallow; close handler cleans up
    });
  });

  return {
    wss,
    close: () =>
      new Promise((resolve) => {
        clearInterval(heartbeat);
        for (const client of wss.clients) {
          try {
            client.terminate();
          } catch {
            // noop
          }
        }
        wss.close(() => resolve());
      }),
  };
}

module.exports = {
  LobbyService,
  Room,
  createWsServer,
  generateRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
};
