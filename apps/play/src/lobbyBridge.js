// M11 Phase B + B-plus — Lobby bridge for game shell.
// ADR-2026-04-20.
//
// Wires the LobbyClient into the main game loop with minimal intrusion:
//   - Host role:   game plays locally; `publishWorld(world)` broadcasts state
//                  to all connected players over WS (called from main.js refresh).
//   - Player role: canvas is replaced by a spectator card. A composer lets the
//                  player pick an owned unit, choose an action (move/attack/
//                  defend/ability/end_turn), and submit an intent via WS to
//                  the host, which forwards it to /api/session/declare-intent.
//
// Phase B-plus extensions (ADR-2026-04-20 + kickoff):
//   TKT-M11B-01 — Phone intent UI in spectator overlay (composer form)
//   TKT-M11B-02 — Host onPlayerIntent(cb) hook (main.js subscribes → declareIntent)
//   TKT-M11B-03 — Campaign live-mirror (setCampaignSummary on host, rendered
//                 in spectator overlay on players)

import {
  LobbyClient,
  loadLobbySession,
  clearLobbySession,
  resolveWsUrl,
  saveLobbySession,
} from './network.js';
import './lobbyBridge.css';
import {
  renderPlayerOnboarding,
  renderHostShareHint,
  dismissHostShareHint,
} from './lobbyOnboarding.js';
import { renderPhoneOverlayV2, wirePhoneComposerV2 } from './phoneComposerV2.js';
import './phoneComposerV2.css';

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
  el.textContent = `${count} ${count === 1 ? 'player' : 'players'}`;
}

function renderSpectatorOverlay(session) {
  let overlay = document.getElementById('lobby-spectator-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'lobby-spectator-overlay';
  overlay.className = 'lobby-spectator-overlay';
  overlay.innerHTML = `
    <div class="lobby-spectator-card">
      <h2>📱 Player · Stanza ${session.code}</h2>
      <div class="lobby-spectator-status-row">
        <span id="lobby-spectator-turn" class="lobby-spectator-turn">In attesa dell'host…</span>
      </div>
      <div id="lobby-campaign-summary" class="lobby-campaign-summary lobby-hidden">
        <div class="title">🗺 Campagna</div>
        <div id="lobby-campaign-body">—</div>
      </div>
      <div>
        <p class="lobby-roster-title"><strong>Roster</strong></p>
        <div id="lobby-roster" class="lobby-roster">
          <span class="lobby-roster-chip">(nessuno stato ancora)</span>
        </div>
      </div>
      <div class="lobby-composer" id="lobby-composer">
        <h3>Invia intent al tavolo</h3>
        <div class="lobby-composer-row">
          <label for="lobby-composer-actor">Il tuo PG</label>
          <select id="lobby-composer-actor" disabled>
            <option value="">—</option>
          </select>
        </div>
        <div class="lobby-composer-row">
          <label for="lobby-composer-action">Azione</label>
          <select id="lobby-composer-action">
            <option value="attack">Attack</option>
            <option value="move">Move</option>
            <option value="defend">Defend</option>
            <option value="end_turn">End turn</option>
          </select>
        </div>
        <div class="lobby-composer-row" id="lobby-composer-target-row">
          <label for="lobby-composer-target">Target</label>
          <select id="lobby-composer-target">
            <option value="">—</option>
          </select>
        </div>
        <div class="lobby-composer-row lobby-composer-row-inline" id="lobby-composer-move-row" style="display:none">
          <div>
            <label for="lobby-composer-x">X</label>
            <input id="lobby-composer-x" type="number" min="0" max="15" value="0" />
          </div>
          <div>
            <label for="lobby-composer-y">Y</label>
            <input id="lobby-composer-y" type="number" min="0" max="15" value="0" />
          </div>
        </div>
        <button type="button" class="lobby-composer-submit" id="lobby-composer-submit" disabled>
          📤 Invia intent
        </button>
        <div class="lobby-composer-status" id="lobby-composer-status"></div>
      </div>
      <div class="lobby-intents-sent">
        <strong>Intent inviati:</strong>
        <ul id="lobby-intents-list"></ul>
      </div>
      <details class="lobby-raw-state">
        <summary>State JSON raw</summary>
        <pre id="lobby-spectator-state">(nessuno stato ancora)</pre>
      </details>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function inferFaction(unit) {
  // Common conventions across Evo-Tactics datasets.
  const f = (unit?.faction || unit?.side || unit?.team || '').toString().toLowerCase();
  if (f.includes('enemy') || f.includes('sistema') || f.includes('sis')) return 'enemy';
  if (f.includes('player') || f.includes('party') || f === 'pg') return 'player';
  // Fallback: id prefix 'u_player_' vs 'u_enemy_' / 'e_' / 's_'.
  const id = (unit?.id || '').toLowerCase();
  if (id.startsWith('e_') || id.startsWith('s_')) return 'enemy';
  return 'player';
}

function updateSpectatorState(overlay, version, payload, bridge) {
  if (!overlay) return;
  const pre = overlay.querySelector('#lobby-spectator-state');
  if (pre) {
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
  const turnEl = overlay.querySelector('#lobby-spectator-turn');
  if (turnEl && payload && typeof payload === 'object') {
    const turn = payload.turn ?? '?';
    const round = payload.round ?? '?';
    const active = payload.active_id ?? '?';
    turnEl.textContent = `Turno ${turn} · round ${round} · attivo ${active}`;
  }

  const campaign = payload?.campaign_summary;
  const campaignBox = overlay.querySelector('#lobby-campaign-summary');
  const campaignBody = overlay.querySelector('#lobby-campaign-body');
  if (campaignBox && campaignBody) {
    if (campaign) {
      campaignBox.classList.remove('lobby-hidden');
      const pe = campaign.pe ?? campaign.pe_total ?? 0;
      const pi = campaign.pi ?? campaign.pi_total ?? 0;
      const node = campaign.current_node_id || campaign.state || '—';
      campaignBody.textContent = `${campaign.id || '—'} · nodo ${node} · PE ${pe} · PI ${pi}`;
    } else {
      campaignBox.classList.add('lobby-hidden');
    }
  }

  // Populate roster + composer unit select from payload.units.
  const units = Array.isArray(payload?.units) ? payload.units : [];
  const roster = overlay.querySelector('#lobby-roster');
  const actorSelect = overlay.querySelector('#lobby-composer-actor');
  const targetSelect = overlay.querySelector('#lobby-composer-target');
  if (roster) {
    roster.innerHTML = '';
    if (units.length === 0) {
      const chip = document.createElement('span');
      chip.className = 'lobby-roster-chip';
      chip.textContent = '(roster vuoto)';
      roster.appendChild(chip);
    } else {
      for (const u of units) {
        const chip = document.createElement('span');
        const faction = inferFaction(u);
        const dead = Number(u.hp) <= 0;
        chip.className = `lobby-roster-chip ${faction}${dead ? ' dead' : ''}`;
        const hp = u.hp ?? '?';
        const maxHp = u.max_hp ?? u.hp_max ?? hp;
        chip.textContent = `${u.id || '?'} (${hp}/${maxHp})`;
        roster.appendChild(chip);
      }
    }
  }
  // Refresh composer selects in place (preserve current selection if still valid).
  if (actorSelect) {
    const prev = actorSelect.value;
    const playerUnits = units.filter((u) => inferFaction(u) === 'player' && Number(u.hp) > 0);
    actorSelect.innerHTML = playerUnits.length
      ? playerUnits.map((u) => `<option value="${u.id}">${u.id}</option>`).join('')
      : '<option value="">(nessun PG disponibile)</option>';
    if (playerUnits.some((u) => u.id === prev)) actorSelect.value = prev;
    actorSelect.disabled = playerUnits.length === 0;
    const submit = overlay.querySelector('#lobby-composer-submit');
    if (submit) submit.disabled = playerUnits.length === 0;
  }
  if (targetSelect) {
    const prev = targetSelect.value;
    const enemyUnits = units.filter((u) => inferFaction(u) === 'enemy' && Number(u.hp) > 0);
    targetSelect.innerHTML = enemyUnits.length
      ? `<option value="">—</option>` +
        enemyUnits.map((u) => `<option value="${u.id}">${u.id}</option>`).join('')
      : '<option value="">(nessun nemico)</option>';
    if (enemyUnits.some((u) => u.id === prev)) targetSelect.value = prev;
  }
  bridge._lastUnits = units;
}

// TKT-M11B-04 — Host-side roster panel. Lists all players currently
// registered in the room (live), with connection status dots.
function createHostRosterPanel(bridge) {
  let panel = document.getElementById('lobby-host-roster');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'lobby-host-roster';
  panel.className = 'lobby-host-roster';
  panel.innerHTML = `
    <div class="lobby-host-roster-header">
      <strong>📺 Roster</strong>
      <span class="lobby-host-roster-code">${bridge.code}</span>
      <button type="button" class="lobby-host-roster-toggle" title="Espandi/comprimi">▾</button>
    </div>
    <ul class="lobby-host-roster-list" id="lobby-host-roster-list">
      <li class="lobby-host-roster-empty">(nessun player connesso)</li>
    </ul>
  `;
  document.body.appendChild(panel);
  panel.querySelector('.lobby-host-roster-toggle').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });
  return panel;
}

function updateHostRoster(bridge) {
  const list = document.getElementById('lobby-host-roster-list');
  // M11 bugfix: dismiss share hint ogni volta che roster aggiornato e
  // c'è almeno 1 player non-host. Robust anche se event player_joined/
  // player_connected arriva prima del render hint o è missing.
  try {
    const hasOtherPlayer = Array.from(bridge._players.values()).some(
      (p) => p && p.role !== 'host' && p.id !== bridge.session?.player_id,
    );
    if (hasOtherPlayer) dismissHostShareHint();
  } catch {
    /* ignore */
  }
  if (!list) return;
  const entries = Array.from(bridge._players.values());
  if (entries.length === 0) {
    list.innerHTML = '<li class="lobby-host-roster-empty">(nessun player connesso)</li>';
    return;
  }
  // Host first, players by joinedAt asc.
  entries.sort((a, b) => {
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (b.role === 'host' && a.role !== 'host') return 1;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });
  const readySet = new Set(bridge._readySet || []);
  // M17 — character creation roster overlay: per-player pg form+species.
  const charByPlayer = new Map();
  for (const ch of bridge._characterReadyList || []) {
    if (ch?.player_id) charByPlayer.set(ch.player_id, ch);
  }
  const inCharCreation = bridge._currentPhase === 'character_creation';
  list.innerHTML = entries
    .map((p) => {
      const state = p.connected === false ? 'disconnected' : p.connected ? 'connected' : '';
      const roleCls = p.role === 'host' ? 'host' : 'player';
      let readyCls = '';
      let readyIcon = '';
      let extraLabel = '';
      if (p.role !== 'host') {
        if (inCharCreation) {
          const ch = charByPlayer.get(p.id);
          const charReady = Boolean(ch?.ready);
          readyCls = charReady ? 'intent-ready' : 'intent-pending';
          readyIcon = charReady ? '🎭' : '💭';
          if (charReady && ch) {
            extraLabel = ` <span class="char-label">${escapeHtml(ch.name || '—')}${ch.form_id ? ` · ${escapeHtml(ch.form_id)}` : ''}</span>`;
          }
        } else {
          const isReady = readySet.has(p.id);
          readyCls = isReady ? 'intent-ready' : 'intent-pending';
          readyIcon = isReady ? '✅' : '💭';
        }
      }
      return `
        <li class="${state} ${readyCls}">
          <span class="dot"></span>
          <span class="name">${escapeHtml(p.name || p.id || '?')}${extraLabel}</span>
          <span class="role ${roleCls}">${p.role || 'player'}</span>
          <span class="ready">${readyIcon}</span>
        </li>
      `;
    })
    .join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wireComposer(overlay, bridge) {
  if (!overlay) return;
  const actionSelect = overlay.querySelector('#lobby-composer-action');
  const targetRow = overlay.querySelector('#lobby-composer-target-row');
  const moveRow = overlay.querySelector('#lobby-composer-move-row');
  const submitBtn = overlay.querySelector('#lobby-composer-submit');
  const statusEl = overlay.querySelector('#lobby-composer-status');
  const actorSelect = overlay.querySelector('#lobby-composer-actor');
  const targetSelect = overlay.querySelector('#lobby-composer-target');
  const xInput = overlay.querySelector('#lobby-composer-x');
  const yInput = overlay.querySelector('#lobby-composer-y');
  const intentsList = overlay.querySelector('#lobby-intents-list');

  const syncRows = () => {
    const act = actionSelect.value;
    targetRow.style.display = act === 'attack' ? 'flex' : 'none';
    moveRow.style.display = act === 'move' ? 'flex' : 'none';
  };
  actionSelect.addEventListener('change', syncRows);
  syncRows();

  submitBtn.addEventListener('click', () => {
    const actorId = actorSelect.value;
    const actionType = actionSelect.value;
    if (!actorId) {
      statusEl.className = 'lobby-composer-status err';
      statusEl.textContent = '✖ Seleziona un PG.';
      return;
    }
    const action = { type: actionType, actor_id: actorId };
    if (actionType === 'attack') {
      const t = targetSelect.value;
      if (!t) {
        statusEl.className = 'lobby-composer-status err';
        statusEl.textContent = '✖ Seleziona un bersaglio.';
        return;
      }
      action.target_id = t;
      action.ap_cost = 1;
    } else if (actionType === 'move') {
      action.move_to = { x: Number(xInput.value) || 0, y: Number(yInput.value) || 0 };
      action.ap_cost = 1;
    } else if (actionType === 'defend') {
      action.ap_cost = 1;
    } else if (actionType === 'end_turn') {
      action.ap_cost = 0;
    }
    const ok = bridge.sendPlayerIntent({ actor_id: actorId, action });
    if (!ok) {
      statusEl.className = 'lobby-composer-status err';
      statusEl.textContent = '✖ Invio fallito (socket non pronto).';
      return;
    }
    statusEl.className = 'lobby-composer-status ok';
    statusEl.textContent = `✓ Intent inviato: ${actionType} ${action.target_id || ''}`;
    if (intentsList) {
      const li = document.createElement('li');
      const ts = new Date().toLocaleTimeString();
      li.textContent = `[${ts}] ${actorId} · ${actionType}${
        action.target_id ? ` → ${action.target_id}` : ''
      }${action.move_to ? ` → (${action.move_to.x},${action.move_to.y})` : ''}`;
      intentsList.prepend(li);
      while (intentsList.children.length > 8) intentsList.removeChild(intentsList.lastChild);
    }
  });
}

/**
 * Instantiate and wire a LobbyClient if a lobby session is stored.
 * Returns a bridge object, or null if no session.
 *
 * Bridge API:
 *   isHost, isPlayer, role, code, session
 *   publishWorld(world) — host only, broadcasts as WS `state`
 *   setCampaignSummary(summary) — host only; summary merged into next publishWorld
 *   sendPlayerIntent(payload) — player only; emits WS intent
 *   onPlayerIntent(cb) — host only; cb(normalizedIntent) for each player intent
 *   on(event, cb) — passthrough LobbyClient events (state, intent, hello, ...)
 *   leave() — manual disconnect + clear localStorage + redirect to lobby
 *   getLastState() — last received state (for player role bootstrap)
 *   getCampaignSummary() — last known campaign summary (host-side cache)
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
    _lastUnits: [],
    _campaignSummary: null,
    _playerIntentListeners: new Set(),
    _readySet: [],
    _missingSet: [],
    _currentPhase: 'idle',
    _characterReadyList: [], // M17 character creation roster
    // TKT-M11B-04 — live roster tracking (Map<id, { name, role, connected, joinedAt }>).
    _players: new Map(),
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

  const seedPlayer = (p) => {
    if (!p || !p.id) return;
    bridge._players.set(p.id, {
      id: p.id,
      name: p.name || p.id,
      role: p.role || 'player',
      connected: p.connected !== undefined ? p.connected : p.id === session.player_id,
      joinedAt: p.joined_at || p.joinedAt || Date.now(),
    });
  };

  const refreshRosterUi = () => {
    if (bridge.isHost) updateHostRoster(bridge);
    const count = bridge._players.size;
    setBannerPlayerCount(bridge.banner, count);
  };

  client.on('open', () => setBannerStatus(bridge.banner, 'connecting', 'open · attesa hello…'));
  client.on('hello', (payload) => {
    setBannerStatus(bridge.banner, 'connected', 'connesso');
    // Seed full roster from room snapshot (includes host + all joined players).
    bridge._players.clear();
    const players = Array.isArray(payload?.room?.players) ? payload.room.players : [];
    for (const p of players) seedPlayer(p);
    refreshRosterUi();
    if (payload?.state !== undefined) {
      bridge._lastState = payload.state;
      bridge._lastStateVersion = payload.state_version || 0;
      if (bridge.overlay)
        updateSpectatorState(bridge.overlay, bridge._lastStateVersion, payload.state, bridge);
    }
  });
  client.on('player_joined', (payload) => {
    if (payload?.player_id) {
      seedPlayer({
        id: payload.player_id,
        name: payload.name,
        role: payload.role || 'player',
        connected: false, // joined REST but not yet WS-attached
        joinedAt: Date.now(),
      });
      refreshRosterUi();
      if (bridge.isHost && payload.player_id !== session.player_id) {
        dismissHostShareHint();
      }
    }
  });
  client.on('player_connected', (payload) => {
    if (!payload?.player_id) return;
    const existing = bridge._players.get(payload.player_id);
    if (existing) existing.connected = true;
    else
      seedPlayer({
        id: payload.player_id,
        name: payload.name,
        role: payload.role || 'player',
        connected: true,
      });
    refreshRosterUi();
    // M11 bugfix: hint persisteva se player era già in room a host load.
    // Dismiss anche su connection event (covers replay + late host load).
    if (bridge.isHost && payload.player_id !== session.player_id) {
      dismissHostShareHint();
    }
  });
  client.on('player_disconnected', (payload) => {
    if (!payload?.player_id) return;
    const existing = bridge._players.get(payload.player_id);
    if (existing) {
      existing.connected = false;
      refreshRosterUi();
    }
  });
  client.on('state', ({ version, payload }) => {
    bridge._lastState = payload;
    bridge._lastStateVersion = version;
    if (bridge.overlay) updateSpectatorState(bridge.overlay, version, payload, bridge);
  });
  // M15 — round ready broadcast: host roster shows ✅/💭 ticks.
  client.on('round_ready', (payload) => {
    bridge._readySet = Array.isArray(payload?.ready) ? payload.ready : [];
    bridge._missingSet = Array.isArray(payload?.missing) ? payload.missing : [];
    bridge._currentPhase = payload?.phase || bridge._currentPhase;
    if (bridge.isHost) updateHostRoster(bridge);
  });
  // M17 — character creation phase: roster shows PG + form per player.
  client.on('phase_change', (payload) => {
    bridge._currentPhase = payload?.phase || bridge._currentPhase;
    if (bridge.isHost) updateHostRoster(bridge);
  });
  client.on('character_ready_list', (list) => {
    bridge._characterReadyList = Array.isArray(list) ? list : [];
    if (bridge.isHost) updateHostRoster(bridge);
  });
  // TKT-M11B-02 — host listens for player intents and fans them out to
  // registered listeners (main.js wires this to api.declareIntent).
  client.on('intent', (entry) => {
    if (!bridge.isHost) return;
    // Normalize shape: entry is { id, from, payload, ts } from wsSession.
    const normalized = {
      intent_id: entry?.id || null,
      from_player_id: entry?.from || null,
      ts: entry?.ts || Date.now(),
      actor_id: entry?.payload?.actor_id || entry?.payload?.action?.actor_id || null,
      action: entry?.payload?.action || entry?.payload || null,
      raw: entry,
    };
    for (const cb of Array.from(bridge._playerIntentListeners)) {
      try {
        cb(normalized);
      } catch (err) {
        if (typeof console !== 'undefined') console.error('[lobbyBridge] onPlayerIntent cb', err);
      }
    }
  });
  // TKT-M11B-05 — react to server-promoted host transfer. If we are the new
  // host, update session + banner + spawn host panel. Otherwise update the
  // roster roles + banner note.
  client.on('host_transferred', (payload) => {
    const newHostId = payload?.new_host_id;
    const prevHostId = payload?.previous_host_id;
    if (!newHostId) return;
    // Update local roster roles.
    if (prevHostId && bridge._players.has(prevHostId)) {
      bridge._players.get(prevHostId).role = 'player';
    }
    if (bridge._players.has(newHostId)) {
      bridge._players.get(newHostId).role = 'host';
    }
    refreshRosterUi();
    const promotedSelf = newHostId === session.player_id;
    if (promotedSelf) {
      // Persist new role so refresh / reconnect treat us as host.
      bridge.role = 'host';
      bridge.isHost = true;
      bridge.isPlayer = false;
      bridge.session = { ...session, role: 'host' };
      saveLobbySession(bridge.session);
      // Swap banner role class + text so status reflects promotion.
      if (bridge.banner) {
        bridge.banner.classList.remove('lobby-banner-player');
        bridge.banner.classList.add('lobby-banner-host');
        const roleEl = bridge.banner.querySelector('.lobby-banner-role');
        if (roleEl) roleEl.textContent = '📺 HOST';
      }
      // Remove spectator overlay (we're the TV now).
      if (bridge.overlay) {
        bridge.overlay.remove();
        bridge.overlay = null;
      }
      // Spawn host roster panel (was player; panel not yet created).
      createHostRosterPanel(bridge);
      updateHostRoster(bridge);
      try {
        document.body.classList.remove('lobby-role-player');
        document.body.classList.add('lobby-role-host');
      } catch {
        // noop
      }
      if (typeof console !== 'undefined') {
        console.info(`[lobbyBridge] promoted to host (reason=${payload.reason || 'unknown'})`);
      }
    } else {
      if (typeof console !== 'undefined') {
        console.info(
          `[lobbyBridge] host transferred: ${prevHostId || '?'} → ${newHostId} (reason=${payload.reason || '?'})`,
        );
      }
    }
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
    if (err?.code === 'auth_failed' || err?.code === 'room_not_found') {
      clearLobbySession();
      window.location.href = './lobby.html';
    }
  });

  // Bug fix 2026-04-29 master-dd live test: client.connect() era invocato PRIMA
  // di registrare client.on('phase_change') etc. WS event arriva pre-handler
  // register → event lost → player UI stuck su lobby. Fix: connect dopo tutto
  // l'handler register block (sotto). Vedi fine funzione per chiamata effettiva.

  if (bridge.isPlayer) {
    // M15 UI v2 — card PG + action tiles + party roster ready + chat.
    bridge.session = session;
    bridge.sendIntent = (payload) => client.sendIntent(payload);
    bridge.cancelIntent = () => client.cancelIntent();
    bridge.sendChat = (text) => client.sendChat(text);
    bridge.overlay = renderPhoneOverlayV2(session);
    const phv2 = wirePhoneComposerV2(bridge.overlay, bridge);
    bridge._phv2Api = phv2;
    // M17 — phase coordinator switches overlay (character creation / world / combat / debrief)
    const coordinator = createPhaseCoordinator(bridge);
    bridge._phaseCoordinator = coordinator;
    coordinator.applyPhase('lobby');
    renderPlayerOnboarding();

    client.on('state', ({ payload }) => {
      if (phv2?.onState) phv2.onState(payload);
    });
    client.on('round_ready', (payload) => {
      if (phv2?.onRoundReady) phv2.onRoundReady(payload);
    });
    client.on('chat', (payload) => {
      if (phv2?.onChat) phv2.onChat(payload);
    });
    // M17/M18 — phase + character + world coop broadcasts from server.
    client.on('phase_change', (payload) => {
      coordinator.onPhaseChange(payload);
    });
    client.on('character_ready_list', (list) => {
      coordinator.onCharacterReadyList(list);
    });
    client.on('world_tally', (tally) => {
      coordinator.onWorldTally(tally);
    });
    client.on('debrief_ready_list', (payload) => {
      coordinator.onDebriefReadyList(payload);
    });
    // M19 — forward world state to coordinator for debrief panel narrative.
    client.on('state', ({ payload }) => {
      if (coordinator?.onWorldState) coordinator.onWorldState(payload);
    });
    // keep party roster sync (phv2 + world setup + debrief)
    const syncPartyToAll = () => {
      const list = Array.from(bridge._players.values());
      if (phv2?.onPlayersChanged) phv2.onPlayersChanged(list);
      if (coordinator?.onPlayersChanged) coordinator.onPlayersChanged(list);
    };
    client.on('hello', syncPartyToAll);
    client.on('player_joined', syncPartyToAll);
    client.on('player_connected', syncPartyToAll);
    client.on('player_disconnected', syncPartyToAll);
  }
  if (bridge.isHost) {
    // TKT-M11B-04 — roster panel bottom-left showing who's in the room.
    createHostRosterPanel(bridge);
    updateHostRoster(bridge);
    // Mark host's own slot as connected until WS opens (hello refreshes).
    bridge._players.set(session.player_id, {
      id: session.player_id,
      name: 'Host',
      role: 'host',
      connected: false,
      joinedAt: Date.now(),
    });
    updateHostRoster(bridge);
    // Share hint: code prominente + copy-URL finché stanza vuota.
    // Se la stanza è già popolata (host reload con player già dentro),
    // skip render: altrimenti hint resta visibile incorrect.
    const hasOtherPlayers = Array.from(bridge._players.values()).some(
      (p) => p && p.id !== session.player_id && p.role !== 'host',
    );
    if (!hasOtherPlayers) renderHostShareHint({ session });
    // Tag body for CSS hooks (TV layout polish).
    try {
      document.body.classList.add('lobby-role-host');
    } catch {
      // noop (jsdom-less envs)
    }
  } else {
    try {
      document.body.classList.add('lobby-role-player');
    } catch {
      // noop
    }
  }

  bridge.publishWorld = (world) => {
    if (!bridge.isHost) return false;
    // Merge campaign summary into outbound state if set.
    const payload =
      bridge._campaignSummary && world && typeof world === 'object'
        ? { ...world, campaign_summary: bridge._campaignSummary }
        : world;
    return bridge.client.sendState(payload);
  };
  bridge.sendPlayerIntent = (payload) => {
    if (!bridge.isPlayer) return false;
    return bridge.client.sendIntent(payload);
  };
  bridge.onPlayerIntent = (cb) => {
    if (!bridge.isHost) return () => {};
    bridge._playerIntentListeners.add(cb);
    return () => bridge._playerIntentListeners.delete(cb);
  };
  bridge.setCampaignSummary = (summary) => {
    bridge._campaignSummary = summary || null;
  };
  bridge.getCampaignSummary = () => bridge._campaignSummary;
  bridge.getPlayers = () => Array.from(bridge._players.values());
  bridge.on = (event, cb) => bridge.client.on(event, cb);
  bridge.off = (event, cb) => bridge.client.off(event, cb);
  bridge.leave = leave;
  bridge.getLastState = () => ({
    version: bridge._lastStateVersion,
    payload: bridge._lastState,
  });

  // Connect WS DOPO register handlers (fix race condition 2026-04-29).
  bridge.connect = () => {
    return client.connect().catch((err) => {
      if (typeof console !== 'undefined') console.warn('[lobbyBridge] initial connect failed', err);
    });
  };

  return bridge;
}
