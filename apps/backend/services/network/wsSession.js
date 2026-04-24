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

const ROOM_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ'; // 20 consonants, no vowels, no Y (avoid words)
const ROOM_CODE_LENGTH = 4;
const MAX_ROOM_CREATE_RETRIES = 20;
const DEFAULT_MAX_PLAYERS = 8;
const DEFAULT_HEARTBEAT_MS = 30_000;
// TKT-M11B-05 — host-transfer grace window. If the host socket closes and
// does not reattach within this window, the oldest connected player is
// promoted to host role. Set to 0 to disable automatic host transfer.
const DEFAULT_HOST_TRANSFER_GRACE_MS = 30_000;

function generateRoomCode() {
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const idx = crypto.randomInt(0, ROOM_CODE_ALPHABET.length);
    out += ROOM_CODE_ALPHABET[idx];
  }
  return out;
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
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
    // TKT-M11B-05 — pending host-transfer timer handle.
    this._hostTransferTimer = null;
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
    this._onMutate = typeof onMutate === 'function' ? onMutate : null;

    if (hydrateFromSeed?.players?.length) {
      for (const p of hydrateFromSeed.players) {
        this.players.set(p.id, {
          id: p.id,
          name: p.name,
          role: p.role,
          token: p.token,
          socket: null,
          connected: false,
          joinedAt: p.joinedAt,
        });
      }
    } else {
      const hostToken = generateToken();
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
    const token = generateToken();
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
    if (p.token !== token) return null;
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
    return true;
  }

  detachSocket(playerId) {
    const p = this.players.get(playerId);
    if (!p) return false;
    p.socket = null;
    p.connected = false;
    return true;
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

  publishState(newState) {
    this.stateVersion += 1;
    this.state = newState;
    this.broadcast({
      type: 'state',
      version: this.stateVersion,
      payload: newState,
    });
    this._notifyMutate({ kind: 'state_published', version: this.stateVersion });
    return this.stateVersion;
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
    this.broadcast({
      type: 'round_ready',
      payload: {
        round: this.roundIndex,
        phase: this.phase,
        ready,
        missing,
        total: participants.length,
        all_ready: missing.length === 0 && participants.length > 0,
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
    this.closed = true;
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
    return { player_id: playerId, player_token: token, room: room.snapshot() };
  }

  closeRoom({ code, hostToken }) {
    const normalized = String(code || '').toUpperCase();
    const room = this.rooms.get(normalized);
    if (!room) throw new Error('room_not_found');
    const host = room.getPlayer(room.hostId);
    if (!host || host.token !== hostToken) {
      throw new Error('host_auth_failed');
    }
    room.close();
    this.rooms.delete(normalized);
    if (this._persistEnabled) {
      this._persistence
        .deleteRoomAsync(this.prisma, normalized, { logger: this.logger })
        .catch(() => {});
    }
    return { code: normalized, closed: true };
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
 * Attach a WebSocketServer to an existing http.Server, gated on path.
 * Alternatively, pass `port` to spawn a standalone server (useful for tests).
 *
 * Connection URL: ws://host:port/ws?code=ABCD&player_id=p_xxx&token=YYY
 * Auth: player_id + token must match an existing room record.
 */
function createWsServer({ lobby, server = null, port = null, path = '/ws' } = {}) {
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

    const room = lobby.getRoom(code);
    if (!room) {
      socket.send(JSON.stringify({ type: 'error', payload: { code: 'room_not_found' } }));
      socket.close(4004, 'room_not_found');
      return;
    }
    const player = room.authenticate(playerId, token);
    if (!player) {
      socket.send(JSON.stringify({ type: 'error', payload: { code: 'auth_failed' } }));
      socket.close(4003, 'auth_failed');
      return;
    }

    room.attachSocket(playerId, socket);
    // TKT-M11B-05 — if the returning player is (now or still) host, any
    // pending host-transfer timer must be cancelled.
    if (playerId === room.hostId) {
      room.clearHostTransferTimer();
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

        case 'intent':
          if (player.role === 'host') {
            socket.send(JSON.stringify({ type: 'error', payload: { code: 'host_cannot_intent' } }));
            return;
          }
          // M15 — reject if phase != planning OR player already committed.
          if (room.phase && room.phase !== 'planning' && room.phase !== 'idle') {
            socket.send(
              JSON.stringify({
                type: 'error',
                payload: { code: 'phase_locked', phase: room.phase },
              }),
            );
            return;
          }
          room.pushIntent({ from: playerId, payload: msg.payload ?? null });
          break;

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
          room.setPhase(msg.payload?.phase);
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
      room.detachSocket(playerId);
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
            room.close('host_dropped_no_candidate');
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
