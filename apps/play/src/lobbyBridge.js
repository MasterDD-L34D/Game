// M11 Phase B — Lobby bridge for game shell.
// ADR-2026-04-20.
//
// Wires the LobbyClient into the main game loop with minimal intrusion:
//   - Host role:   game plays locally; `publishWorld(world)` broadcasts state
//                  to all connected players over WS (called from main.js refresh).
//   - Player role: canvas + inputs are dimmed into "spectator" mode; the last
//                  state received from host is rendered as read-only HUD. Player
//                  can submit intents via chat-style input (stretch for M11B).
//
// Adds a header banner showing room code, role, connection status.
// Exposes `initLobbyBridgeIfPresent()` which returns a bridge or null.

import { LobbyClient, loadLobbySession, clearLobbySession, resolveWsUrl } from './network.js';

function createBanner(session, onLeave) {
  let banner = document.getElementById('lobby-banner');
  if (banner) return banner;
  banner = document.createElement('div');
  banner.id = 'lobby-banner';
  banner.className = `lobby-banner lobby-banner-${session.role}`;
  banner.innerHTML = `
    <span class="lobby-banner-role">${session.role === 'host' ? '📺 HOST' : '📱 PLAYER'}</span>
    <span class="lobby-banner-code">${session.code}</span>
    <span class="lobby-banner-status" data-status="connecting">
      <span class="dot"></span><span class="label">connessione…</span>
    </span>
    <span class="lobby-banner-players" data-count="0"></span>
    <button class="lobby-banner-leave" type="button" title="Esci dalla stanza">✕ Esci</button>
  `;
  // Inject scoped styles only once.
  if (!document.getElementById('lobby-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'lobby-banner-styles';
    style.textContent = `
      .lobby-banner {
        position: fixed;
        top: 8px;
        right: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 12px;
        border-radius: 999px;
        font-family: Inter, system-ui, sans-serif;
        font-size: 0.85rem;
        color: #e8eaf0;
        background: rgba(21, 25, 34, 0.92);
        border: 1px solid #2a3040;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      }
      .lobby-banner-host { border-color: #ffb74d; }
      .lobby-banner-player { border-color: #4fc3f7; }
      .lobby-banner-role { font-weight: 700; letter-spacing: 0.5px; }
      .lobby-banner-host .lobby-banner-role { color: #ffb74d; }
      .lobby-banner-player .lobby-banner-role { color: #4fc3f7; }
      .lobby-banner-code {
        font-family: 'Noto Sans', monospace;
        letter-spacing: 3px;
        font-weight: 700;
      }
      .lobby-banner-status { display: flex; align-items: center; gap: 5px; }
      .lobby-banner-status .dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #ffa726;
      }
      .lobby-banner-status[data-status="connected"] .dot { background: #66bb6a; }
      .lobby-banner-status[data-status="reconnecting"] .dot { background: #ef5350; }
      .lobby-banner-status[data-status="closed"] .dot { background: #78909c; }
      .lobby-banner-leave {
        border: none; background: transparent; color: #ef9a9a;
        cursor: pointer; font-size: 0.9rem; padding: 2px 6px;
      }
      .lobby-banner-leave:hover { color: #ef5350; }
      .lobby-spectator-overlay {
        position: fixed; inset: 0; background: rgba(11, 13, 18, 0.78);
        z-index: 9998; display: flex; align-items: center; justify-content: center;
        color: #e8eaf0; font-family: Inter, system-ui, sans-serif;
        padding: 24px;
      }
      .lobby-spectator-card {
        max-width: 560px; background: #151922; border: 1px solid #2a3040;
        border-radius: 12px; padding: 24px; text-align: center;
      }
      .lobby-spectator-card h2 { margin: 0 0 10px; color: #4fc3f7; }
      .lobby-spectator-card p { color: #8891a3; margin: 4px 0; }
      .lobby-spectator-state {
        text-align: left;
        background: #0b0d12;
        border: 1px solid #2a3040;
        border-radius: 8px;
        padding: 12px;
        margin-top: 14px;
        font-family: monospace;
        font-size: 0.85rem;
        max-height: 220px;
        overflow: auto;
      }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(banner);
  banner.querySelector('.lobby-banner-leave').addEventListener('click', () => onLeave());
  return banner;
}

function setBannerStatus(banner, status, label) {
  const el = banner?.querySelector('.lobby-banner-status');
  if (!el) return;
  el.dataset.status = status;
  const labelEl = el.querySelector('.label');
  if (labelEl) labelEl.textContent = label;
}

function setBannerPlayerCount(banner, count) {
  const el = banner?.querySelector('.lobby-banner-players');
  if (!el) return;
  el.dataset.count = String(count);
  el.textContent = `${count} player`;
}

function renderSpectatorOverlay(session) {
  let overlay = document.getElementById('lobby-spectator-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'lobby-spectator-overlay';
  overlay.className = 'lobby-spectator-overlay';
  overlay.innerHTML = `
    <div class="lobby-spectator-card">
      <h2>📱 In attesa dell'host</h2>
      <p>Stanza <strong>${session.code}</strong> · ruolo <strong>player</strong></p>
      <p>L'host gestisce la TV condivisa. Quando pubblica lo stato della partita lo vedrai qui.</p>
      <p id="lobby-spectator-hint" style="color:#ffb74d"></p>
      <pre id="lobby-spectator-state" class="lobby-spectator-state">(nessuno stato ancora)</pre>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function updateSpectatorState(overlay, version, payload) {
  const pre = overlay?.querySelector('#lobby-spectator-state');
  if (!pre) return;
  try {
    const serialized =
      typeof payload === 'object'
        ? JSON.stringify(payload, null, 2).slice(0, 4000)
        : String(payload);
    pre.textContent = `[v${version}]\n${serialized}`;
  } catch {
    pre.textContent = `[v${version}] <unserializable>`;
  }
}

/**
 * Instantiate and wire a LobbyClient if a lobby session is stored.
 * Returns a bridge object, or null if no session.
 *
 * Bridge API:
 *   isHost, isPlayer, role, code, session
 *   publishWorld(world) — host only, broadcasts as WS `state`
 *   on(event, cb) — passthrough LobbyClient events (state, intent, hello, ...)
 *   leave() — manual disconnect + clear localStorage + redirect to lobby
 *   getLastState() — last received state (for player role bootstrap)
 */
export function initLobbyBridgeIfPresent({ wsImpl = null } = {}) {
  const session = loadLobbySession();
  if (!session) return null;

  const bridge = {
    session,
    code: session.code,
    role: session.role,
    isHost: session.role === 'host',
    isPlayer: session.role === 'player',
    client: null,
    banner: null,
    overlay: null,
    _lastState: null,
    _lastStateVersion: 0,
  };

  const leave = () => {
    try {
      bridge.client?.close(1000, 'user_leave');
    } catch {
      // noop
    }
    clearLobbySession();
    window.location.href = './lobby.html';
  };

  bridge.banner = createBanner(session, leave);

  const client = new LobbyClient({
    wsUrl: resolveWsUrl(),
    code: session.code,
    playerId: session.player_id,
    token: session.token,
    role: session.role,
    wsImpl,
  });
  bridge.client = client;

  client.on('open', () => setBannerStatus(bridge.banner, 'connecting', 'open · attesa hello…'));
  client.on('hello', (payload) => {
    setBannerStatus(bridge.banner, 'connected', 'connesso');
    const count = Array.isArray(payload?.room?.players) ? payload.room.players.length : 0;
    setBannerPlayerCount(bridge.banner, count);
    if (payload?.state !== undefined) {
      bridge._lastState = payload.state;
      bridge._lastStateVersion = payload.state_version || 0;
      if (bridge.overlay)
        updateSpectatorState(bridge.overlay, bridge._lastStateVersion, payload.state);
    }
  });
  client.on('player_joined', () => {
    const count = Number(bridge.banner?.querySelector('.lobby-banner-players')?.dataset.count || 0);
    setBannerPlayerCount(bridge.banner, count + 1);
  });
  client.on('player_disconnected', () => {
    // Count of sockets connected; do not decrement roster, just visual nudge.
  });
  client.on('state', ({ version, payload }) => {
    bridge._lastState = payload;
    bridge._lastStateVersion = version;
    if (bridge.overlay) updateSpectatorState(bridge.overlay, version, payload);
  });
  client.on('close', () => setBannerStatus(bridge.banner, 'closed', 'chiuso'));
  client.on('reconnect', ({ attempt }) =>
    setBannerStatus(bridge.banner, 'reconnecting', `retry ${attempt}…`),
  );
  client.on('reconnect_failed', () =>
    setBannerStatus(bridge.banner, 'closed', 'riconnessione fallita'),
  );
  client.on('room_closed', () => {
    setBannerStatus(bridge.banner, 'closed', 'stanza chiusa');
    setTimeout(() => {
      clearLobbySession();
      window.location.href = './lobby.html';
    }, 1500);
  });
  client.on('error', (err) => {
    // Fatal auth errors → clear + go back.
    if (err?.code === 'auth_failed' || err?.code === 'room_not_found') {
      clearLobbySession();
      window.location.href = './lobby.html';
    }
  });

  // Fire-and-forget connect; resolve errors logged via events.
  client.connect().catch((err) => {
    if (typeof console !== 'undefined') console.warn('[lobbyBridge] initial connect failed', err);
  });

  // Player role: render spectator overlay and disable local game UI.
  if (bridge.isPlayer) {
    bridge.overlay = renderSpectatorOverlay(session);
    // Populate with any buffered state (post-connect will refresh).
    updateSpectatorState(bridge.overlay, 0, bridge._lastState ?? '(nessuno stato ancora)');
  }

  bridge.publishWorld = (world) => {
    if (!bridge.isHost) return false;
    return bridge.client.sendState(world);
  };
  bridge.sendPlayerIntent = (payload) => {
    if (!bridge.isPlayer) return false;
    return bridge.client.sendIntent(payload);
  };
  bridge.on = (event, cb) => bridge.client.on(event, cb);
  bridge.off = (event, cb) => bridge.client.off(event, cb);
  bridge.leave = leave;
  bridge.getLastState = () => ({
    version: bridge._lastStateVersion,
    payload: bridge._lastState,
  });

  return bridge;
}
