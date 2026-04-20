// M11 Phase B — Jackbox-style WebSocket client wrapper.
// ADR-2026-04-20 (protocol) + kickoff Phase B (frontend).
//
// Usage (browser):
//   import { LobbyClient } from './network.js';
//   const cli = new LobbyClient({
//     wsUrl: import.meta.env.VITE_LOBBY_WS_URL || 'ws://localhost:3341/ws',
//     code: 'ABCD', playerId: 'p_xxx', token: 'HEX', role: 'host',
//   });
//   cli.on('state', ({ version, payload }) => ...);
//   cli.on('hello', ({ role, room, state, state_version }) => ...);
//   await cli.connect();
//
// Features:
//   - Auto-reconnect backoff exp (1s → 30s, jitter ±200ms)
//   - State version reconcile (drops stale, accepts equal/newer)
//   - Event emitter (on/off/once)
//   - Host-only guard on sendState, non-host-only on sendIntent
//   - Accepts custom WebSocket ctor for Node test environments (wsImpl option)
//
// Protocol (wire JSON) — see ADR-2026-04-20 §Protocollo.

const DEFAULT_WS_URL = 'ws://localhost:3341/ws';
const BACKOFF_MIN_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_JITTER_MS = 200;

const EVENT_TYPES = [
  'hello',
  'state',
  'intent',
  'player_joined',
  'player_connected',
  'player_disconnected',
  'host_transferred',
  'chat',
  'room_closed',
  'error',
  'pong',
  'open',
  'close',
  'reconnect',
  'reconnect_failed',
];

function resolveDefaultWsImpl() {
  if (typeof WebSocket !== 'undefined') return WebSocket;
  if (typeof globalThis !== 'undefined' && globalThis.WebSocket) return globalThis.WebSocket;
  return null;
}

function buildUrl(wsUrl, { code, playerId, token }) {
  const sep = wsUrl.includes('?') ? '&' : '?';
  return (
    `${wsUrl}${sep}code=${encodeURIComponent(code)}` +
    `&player_id=${encodeURIComponent(playerId)}` +
    `&token=${encodeURIComponent(token)}`
  );
}

export class LobbyClient {
  constructor({
    wsUrl = DEFAULT_WS_URL,
    code,
    playerId,
    token,
    role = 'player',
    wsImpl = null,
    reconnect = true,
    maxReconnectAttempts = Infinity,
  } = {}) {
    if (!code) throw new Error('LobbyClient: code required');
    if (!playerId) throw new Error('LobbyClient: playerId required');
    if (!token) throw new Error('LobbyClient: token required');

    this.wsUrl = wsUrl;
    this.code = code;
    this.playerId = playerId;
    this.token = token;
    this.role = role;
    this.wsImpl = wsImpl || resolveDefaultWsImpl();
    if (!this.wsImpl) {
      throw new Error('LobbyClient: no WebSocket impl available (pass wsImpl in Node)');
    }
    this.reconnectEnabled = reconnect;
    this.maxReconnectAttempts = maxReconnectAttempts;

    this.socket = null;
    this.connected = false;
    this.manualClose = false;
    this.reconnectAttempt = 0;
    this.stateVersion = 0;
    this.lastState = null;

    this._listeners = Object.fromEntries(EVENT_TYPES.map((k) => [k, new Set()]));
    this._reconnectTimer = null;
  }

  on(event, cb) {
    if (!this._listeners[event]) throw new Error(`LobbyClient: unknown event "${event}"`);
    this._listeners[event].add(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    this._listeners[event]?.delete(cb);
  }

  once(event, cb) {
    const off = this.on(event, (payload) => {
      off();
      cb(payload);
    });
    return off;
  }

  _emit(event, payload) {
    const set = this._listeners[event];
    if (!set || set.size === 0) return;
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow listener errors to keep socket alive.
        if (typeof console !== 'undefined') console.error(`LobbyClient listener(${event})`, err);
      }
    }
  }

  /**
   * Open socket. Resolves on first `hello` message. Rejects on initial
   * connection failure (reconnects thereafter if `reconnect=true`).
   */
  connect() {
    this.manualClose = false;
    return new Promise((resolve, reject) => {
      let settled = false;
      const socket = new this.wsImpl(buildUrl(this.wsUrl, this));
      this.socket = socket;

      const onHelloOnce = this.once('hello', (helloPayload) => {
        if (!settled) {
          settled = true;
          resolve(helloPayload);
        }
      });
      // Hook up close/error as fallback rejection paths for initial attempt.
      const cleanupInit = () => {
        onHelloOnce();
      };

      socket.addEventListener
        ? socket.addEventListener('open', () => this._onOpen(socket))
        : (socket.onopen = () => this._onOpen(socket));

      const messageHandler = (ev) => this._onMessage(ev);
      const closeHandler = (ev) => {
        cleanupInit();
        this._onClose(ev);
        if (!settled) {
          settled = true;
          reject(
            new Error(`LobbyClient: connection closed before hello (code=${ev?.code ?? 'n/a'})`),
          );
        }
      };
      const errorHandler = (err) => {
        this._emit('error', { code: 'socket_error', message: err?.message || 'socket error' });
      };

      if (socket.addEventListener) {
        socket.addEventListener('message', messageHandler);
        socket.addEventListener('close', closeHandler);
        socket.addEventListener('error', errorHandler);
      } else {
        socket.onmessage = messageHandler;
        socket.onclose = closeHandler;
        socket.onerror = errorHandler;
      }
    });
  }

  _onOpen(socket) {
    if (socket !== this.socket) return;
    this.connected = true;
    this.reconnectAttempt = 0;
    this._emit('open', { code: this.code, player_id: this.playerId });
  }

  _onMessage(ev) {
    let msg;
    try {
      msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    } catch {
      this._emit('error', { code: 'bad_json_inbound' });
      return;
    }
    if (!msg || typeof msg.type !== 'string') {
      this._emit('error', { code: 'bad_message_inbound' });
      return;
    }

    switch (msg.type) {
      case 'hello': {
        const p = msg.payload || {};
        if (typeof p.state_version === 'number') this.stateVersion = p.state_version;
        if (p.state !== undefined) this.lastState = p.state;
        this._emit('hello', p);
        return;
      }
      case 'state': {
        const version = typeof msg.version === 'number' ? msg.version : null;
        if (version !== null && version < this.stateVersion) {
          // Stale; drop.
          return;
        }
        if (version !== null) this.stateVersion = version;
        this.lastState = msg.payload;
        this._emit('state', { version, payload: msg.payload });
        return;
      }
      case 'intent':
        this._emit('intent', msg.payload || {});
        return;
      case 'player_joined':
      case 'player_connected':
      case 'player_disconnected':
        this._emit(msg.type, msg.payload || {});
        return;
      case 'host_transferred': {
        // TKT-M11B-05 — server promoted someone to host. Update local role
        // if the promoted id matches ours so sendState guards flip accordingly.
        const payload = msg.payload || {};
        if (payload.new_host_id && payload.new_host_id === this.playerId) {
          this.role = 'host';
        } else if (this.role === 'host' && payload.new_host_id !== this.playerId) {
          // We used to be host but aren't anymore (rare edge: admin force-transfer).
          this.role = 'player';
        }
        this._emit('host_transferred', payload);
        return;
      }
      case 'chat':
        this._emit('chat', msg.payload || {});
        return;
      case 'room_closed':
        this._emit('room_closed', msg.payload || {});
        return;
      case 'error':
        this._emit('error', msg.payload || { code: 'unknown' });
        return;
      case 'pong':
        this._emit('pong', msg.payload || {});
        return;
      default:
        this._emit('error', { code: 'unknown_inbound_type', type: msg.type });
    }
  }

  _onClose(ev) {
    this.connected = false;
    const code = ev?.code;
    const reason = ev?.reason || '';
    this._emit('close', { code, reason });
    if (this.manualClose || !this.reconnectEnabled) return;
    // Do not reconnect on auth failure / room not found / room closed.
    if (code === 4001 || code === 4003 || code === 4004) return;
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this._emit('reconnect_failed', { attempts: this.reconnectAttempt });
      return;
    }
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    this.reconnectAttempt += 1;
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** (this.reconnectAttempt - 1));
    const jitter = Math.floor((Math.random() * 2 - 1) * BACKOFF_JITTER_MS);
    const delay = Math.max(BACKOFF_MIN_MS, base + jitter);
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._emit('reconnect', { attempt: this.reconnectAttempt });
      this._reconnect();
    }, delay);
  }

  _reconnect() {
    const socket = new this.wsImpl(buildUrl(this.wsUrl, this));
    this.socket = socket;
    if (socket.addEventListener) {
      socket.addEventListener('open', () => this._onOpen(socket));
      socket.addEventListener('message', (ev) => this._onMessage(ev));
      socket.addEventListener('close', (ev) => this._onClose(ev));
      socket.addEventListener('error', (err) =>
        this._emit('error', { code: 'socket_error', message: err?.message || 'socket error' }),
      );
    } else {
      socket.onopen = () => this._onOpen(socket);
      socket.onmessage = (ev) => this._onMessage(ev);
      socket.onclose = (ev) => this._onClose(ev);
      socket.onerror = (err) =>
        this._emit('error', { code: 'socket_error', message: err?.message || 'socket error' });
    }
  }

  _send(msg) {
    if (!this.socket || !this.connected) {
      this._emit('error', { code: 'not_connected' });
      return false;
    }
    try {
      this.socket.send(JSON.stringify(msg));
      return true;
    } catch (err) {
      this._emit('error', { code: 'send_failed', message: err?.message });
      return false;
    }
  }

  /** Host-only. */
  sendState(payload) {
    if (this.role !== 'host') {
      this._emit('error', { code: 'not_host' });
      return false;
    }
    return this._send({ type: 'state', payload });
  }

  /** Non-host only. */
  sendIntent(payload) {
    if (this.role === 'host') {
      this._emit('error', { code: 'host_cannot_intent' });
      return false;
    }
    return this._send({ type: 'intent', payload });
  }

  sendChat(text) {
    if (typeof text !== 'string' || !text.trim()) return false;
    return this._send({ type: 'chat', payload: { text: text.slice(0, 500) } });
  }

  ping(data = {}) {
    return this._send({ type: 'ping', payload: { t: Date.now(), ...data } });
  }

  /** Graceful manual close — disables reconnect. */
  close(code = 1000, reason = 'client_close') {
    this.manualClose = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close(code, reason);
      } catch {
        // noop
      }
    }
  }
}

// ============================================================================
// localStorage session helpers (shared between lobby.html bootstrap + main.js).
// Key schema (ADR-2026-04-20 Phase B addendum):
//   'evo_lobby_session' = JSON { code, player_id, token, role, host_id?, campaign_id?, ts }
// ============================================================================

export const LOBBY_STORAGE_KEY = 'evo_lobby_session';

export function saveLobbySession(session) {
  try {
    const enriched = { ...session, ts: Date.now() };
    localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(enriched));
    return true;
  } catch {
    return false;
  }
}

export function loadLobbySession() {
  try {
    const raw = localStorage.getItem(LOBBY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.code || !parsed.player_id || !parsed.token || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLobbySession() {
  try {
    localStorage.removeItem(LOBBY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Resolve the WS URL: VITE env if defined, else same-origin ws:// with port 3341. */
export function resolveWsUrl() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOBBY_WS_URL) {
      return import.meta.env.VITE_LOBBY_WS_URL;
    }
  } catch {
    // import.meta not available in test env; fall through
  }
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.hostname}:3341/ws`;
  }
  return DEFAULT_WS_URL;
}
