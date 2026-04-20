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
  if (!document.getElementById('lobby-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'lobby-banner-styles';
    style.textContent = `
      .lobby-banner {
        position: fixed; top: 8px; right: 8px; z-index: 9999;
        display: flex; align-items: center; gap: 10px;
        padding: 6px 12px; border-radius: 999px;
        font-family: Inter, system-ui, sans-serif; font-size: 0.85rem;
        color: #e8eaf0; background: rgba(21, 25, 34, 0.92);
        border: 1px solid #2a3040; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      }
      .lobby-banner-host { border-color: #ffb74d; }
      .lobby-banner-player { border-color: #4fc3f7; }
      .lobby-banner-role { font-weight: 700; letter-spacing: 0.5px; }
      .lobby-banner-host .lobby-banner-role { color: #ffb74d; }
      .lobby-banner-player .lobby-banner-role { color: #4fc3f7; }
      .lobby-banner-code { font-family: 'Noto Sans', monospace; letter-spacing: 3px; font-weight: 700; }
      .lobby-banner-status { display: flex; align-items: center; gap: 5px; }
      .lobby-banner-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #ffa726; }
      .lobby-banner-status[data-status="connected"] .dot { background: #66bb6a; }
      .lobby-banner-status[data-status="reconnecting"] .dot { background: #ef5350; }
      .lobby-banner-status[data-status="closed"] .dot { background: #78909c; }
      .lobby-banner-leave {
        border: none; background: transparent; color: #ef9a9a;
        cursor: pointer; font-size: 0.9rem; padding: 2px 6px;
      }
      .lobby-banner-leave:hover { color: #ef5350; }
      .lobby-spectator-overlay {
        position: fixed; inset: 0; background: rgba(11, 13, 18, 0.78); z-index: 9998;
        display: flex; align-items: center; justify-content: center;
        color: #e8eaf0; font-family: Inter, system-ui, sans-serif; padding: 24px;
      }
      .lobby-spectator-card {
        max-width: 640px; width: 100%; background: #151922; border: 1px solid #2a3040;
        border-radius: 12px; padding: 24px; text-align: left;
        max-height: calc(100vh - 48px); overflow-y: auto;
      }
      .lobby-spectator-card h2 { margin: 0 0 8px; color: #4fc3f7; text-align: center; }
      .lobby-spectator-card p { color: #8891a3; margin: 4px 0; }
      .lobby-spectator-status-row { text-align: center; margin-bottom: 12px; }
      .lobby-campaign-summary {
        background: #1a2538; border: 1px solid #2c4057; border-radius: 8px;
        padding: 10px 14px; margin: 12px 0; font-size: 0.9rem;
      }
      .lobby-campaign-summary .title { color: #ffb74d; font-weight: 700; margin-bottom: 4px; }
      .lobby-roster {
        display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;
      }
      .lobby-roster-chip {
        padding: 4px 10px; border-radius: 999px; font-size: 0.8rem;
        background: #1d2230; border: 1px solid #2a3040; color: #e8eaf0;
      }
      .lobby-roster-chip.dead { opacity: 0.45; text-decoration: line-through; }
      .lobby-roster-chip.player { border-color: #66bb6a; }
      .lobby-roster-chip.enemy { border-color: #ef5350; }
      .lobby-composer {
        margin-top: 14px; padding: 14px; background: #0b0d12;
        border: 1px solid #2a3040; border-radius: 10px;
      }
      .lobby-composer h3 { margin: 0 0 8px; color: #ffb74d; font-size: 0.95rem; }
      .lobby-composer-row {
        display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;
      }
      .lobby-composer-row label { font-size: 0.8rem; color: #8891a3; }
      .lobby-composer select,
      .lobby-composer input {
        padding: 8px 10px; background: #151922; border: 1px solid #2a3040;
        border-radius: 6px; color: #e8eaf0; font-family: inherit; font-size: 0.9rem;
      }
      .lobby-composer-row-inline { display: flex; gap: 8px; }
      .lobby-composer-row-inline > * { flex: 1; }
      .lobby-composer-submit {
        width: 100%; padding: 10px 14px; background: #4fc3f7; color: #001014;
        border: none; border-radius: 6px; font-weight: 700; cursor: pointer;
      }
      .lobby-composer-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      .lobby-composer-status { margin-top: 8px; min-height: 1.2em; font-size: 0.85rem; }
      .lobby-composer-status.ok { color: #66bb6a; }
      .lobby-composer-status.err { color: #ef5350; }
      .lobby-intents-sent {
        margin-top: 12px; font-size: 0.8rem; color: #8891a3;
      }
      .lobby-intents-sent ul { margin: 4px 0; padding-left: 18px; }
      .lobby-intents-sent li { font-family: monospace; color: #e8eaf0; }
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
      <h2>📱 Player · Stanza ${session.code}</h2>
      <div class="lobby-spectator-status-row">
        <span id="lobby-spectator-turn" style="color:#ffb74d">In attesa dell'host…</span>
      </div>
      <div id="lobby-campaign-summary" class="lobby-campaign-summary" style="display:none">
        <div class="title">🗺 Campagna</div>
        <div id="lobby-campaign-body">—</div>
      </div>
      <div>
        <p style="margin-top:0"><strong>Roster</strong></p>
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
      <details style="margin-top:12px">
        <summary style="cursor:pointer;color:#8891a3;font-size:0.85rem">State JSON raw</summary>
        <pre id="lobby-spectator-state" style="background:#0b0d12;border:1px solid #2a3040;border-radius:6px;padding:10px;font-size:0.75rem;max-height:220px;overflow:auto">(nessuno stato ancora)</pre>
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
      campaignBox.style.display = 'block';
      const pe = campaign.pe ?? campaign.pe_total ?? 0;
      const pi = campaign.pi ?? campaign.pi_total ?? 0;
      const node = campaign.current_node_id || campaign.state || '—';
      campaignBody.textContent = `${campaign.id || '—'} · nodo ${node} · PE ${pe} · PI ${pi}`;
    } else {
      campaignBox.style.display = 'none';
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
        updateSpectatorState(bridge.overlay, bridge._lastStateVersion, payload.state, bridge);
    }
  });
  client.on('player_joined', () => {
    const count = Number(bridge.banner?.querySelector('.lobby-banner-players')?.dataset.count || 0);
    setBannerPlayerCount(bridge.banner, count + 1);
  });
  client.on('player_disconnected', () => {
    // No-op: roster count = cumulative joined; presence inferred from state.
  });
  client.on('state', ({ version, payload }) => {
    bridge._lastState = payload;
    bridge._lastStateVersion = version;
    if (bridge.overlay) updateSpectatorState(bridge.overlay, version, payload, bridge);
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

  client.connect().catch((err) => {
    if (typeof console !== 'undefined') console.warn('[lobbyBridge] initial connect failed', err);
  });

  if (bridge.isPlayer) {
    bridge.overlay = renderSpectatorOverlay(session);
    wireComposer(bridge.overlay, bridge);
    updateSpectatorState(bridge.overlay, 0, bridge._lastState ?? {}, bridge);
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
  bridge.on = (event, cb) => bridge.client.on(event, cb);
  bridge.off = (event, cb) => bridge.client.off(event, cb);
  bridge.leave = leave;
  bridge.getLastState = () => ({
    version: bridge._lastStateVersion,
    payload: bridge._lastState,
  });

  return bridge;
}
