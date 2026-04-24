// M15 — Phone composer v2 (Jackbox pattern).
// Card PG + action tile buttons + phase banner + party roster ready + chat.
// ADR-2026-04-26-m15-coop-ui-redesign.md

const ACTION_TILES = [
  { id: 'attack', label: 'Attacca', icon: '⚔' },
  { id: 'move', label: 'Muovi', icon: '👟' },
  { id: 'defend', label: 'Difendi', icon: '🛡' },
  { id: 'ability', label: 'Abilità', icon: '✨' },
  { id: 'end_turn', label: 'Passa', icon: '⏭' },
];

function isEnemy(unit) {
  const f = (unit?.faction || unit?.side || unit?.team || '').toString().toLowerCase();
  if (f.includes('enemy') || f.includes('sistema') || f.includes('sis')) return true;
  const id = (unit?.id || '').toLowerCase();
  return id.startsWith('e_') || id.startsWith('s_');
}

function isPlayerUnit(unit) {
  return !isEnemy(unit);
}

export function renderPhoneOverlayV2(session) {
  if (typeof document === 'undefined') return null;
  let overlay = document.getElementById('phone-overlay-v2');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'phone-overlay-v2';
  overlay.className = 'phone-overlay-v2';
  overlay.innerHTML = `
    <div class="phv2-wrap">
      <div class="phv2-phase" id="phv2-phase" data-phase="idle">
        <span class="phv2-phase-icon">⏸</span>
        <span class="phv2-phase-label">In attesa dell'host…</span>
        <span class="phv2-phase-round" id="phv2-round"></span>
      </div>

      <div class="phv2-card" id="phv2-card">
        <div class="phv2-card-header">
          <div class="phv2-card-avatar" id="phv2-avatar">◉</div>
          <div class="phv2-card-info">
            <div class="phv2-card-name" id="phv2-name">—</div>
            <div class="phv2-card-meta" id="phv2-meta">In attesa</div>
          </div>
        </div>
        <div class="phv2-card-stats">
          <div class="phv2-stat"><span class="phv2-stat-label">HP</span><span id="phv2-hp">—/—</span></div>
          <div class="phv2-stat"><span class="phv2-stat-label">AP</span><span id="phv2-ap">—/—</span></div>
          <div class="phv2-stat"><span class="phv2-stat-label">DEF</span><span id="phv2-def">—</span></div>
        </div>
      </div>

      <div class="phv2-section">
        <div class="phv2-section-title">Azione</div>
        <div class="phv2-action-grid" id="phv2-action-grid">
          ${ACTION_TILES.map(
            (t) =>
              `<button type="button" class="phv2-action-tile" data-action="${t.id}">
                 <span class="phv2-action-icon">${t.icon}</span>
                 <span class="phv2-action-label">${t.label}</span>
               </button>`,
          ).join('')}
        </div>
      </div>

      <div class="phv2-section phv2-section-target" id="phv2-target-section">
        <div class="phv2-section-title">Target</div>
        <div class="phv2-target-list" id="phv2-target-list">
          <div class="phv2-empty">Scegli prima un'azione</div>
        </div>
      </div>

      <div class="phv2-confirm-row">
        <button type="button" class="phv2-confirm" id="phv2-confirm" disabled>
          ✓ Conferma intent
        </button>
        <button type="button" class="phv2-cancel phv2-hidden" id="phv2-cancel">
          ✕ Annulla
        </button>
      </div>
      <div class="phv2-status" id="phv2-status" aria-live="polite"></div>

      <div class="phv2-section">
        <div class="phv2-section-title">Party (<span id="phv2-party-count">0</span>)</div>
        <div class="phv2-roster" id="phv2-party-roster"></div>
      </div>

      <div class="phv2-section phv2-section-chat">
        <div class="phv2-section-title">Chat</div>
        <div class="phv2-chat-log" id="phv2-chat-log"></div>
        <form class="phv2-chat-form" id="phv2-chat-form" autocomplete="off">
          <input type="text" id="phv2-chat-input" maxlength="300" placeholder="scrivi al team…" />
          <button type="submit">invia</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

export function wirePhoneComposerV2(overlay, bridge) {
  if (!overlay || !bridge) return;
  const state = {
    selectedAction: null,
    selectedTarget: null,
    myUnit: null,
    units: [],
    enemies: [],
    players: [],
    lastIntentSent: false,
    phase: 'idle',
    ready: [],
    missing: [],
  };
  bridge._phv2 = state;

  const setStatus = (msg, kind) => {
    const el = overlay.querySelector('#phv2-status');
    if (!el) return;
    el.textContent = msg || '';
    el.dataset.kind = kind || '';
  };

  const updateConfirmEnabled = () => {
    const btn = overlay.querySelector('#phv2-confirm');
    if (!btn) return;
    const needsTarget = state.selectedAction === 'attack' || state.selectedAction === 'ability';
    const hasTargetIfNeeded = !needsTarget || !!state.selectedTarget;
    const canSubmit =
      !state.lastIntentSent &&
      !!state.selectedAction &&
      !!state.myUnit &&
      hasTargetIfNeeded &&
      state.phase !== 'resolving' &&
      state.phase !== 'ready';
    btn.disabled = !canSubmit;
  };

  const renderTargets = () => {
    const list = overlay.querySelector('#phv2-target-list');
    const section = overlay.querySelector('#phv2-target-section');
    if (!list) return;
    const needsEnemyTarget =
      state.selectedAction === 'attack' || state.selectedAction === 'ability';
    if (!needsEnemyTarget) {
      list.innerHTML = '<div class="phv2-empty">Nessun target richiesto</div>';
      if (section) section.dataset.required = 'false';
      state.selectedTarget = null;
      updateConfirmEnabled();
      return;
    }
    if (section) section.dataset.required = 'true';
    if (!state.enemies.length) {
      list.innerHTML = '<div class="phv2-empty">Nessun nemico visibile</div>';
      return;
    }
    list.innerHTML = state.enemies
      .map((e) => {
        const hp = e.hp ?? e.health ?? '?';
        const hpMax = e.hp_max ?? e.max_hp ?? hp;
        const name = e.name || e.id || '?';
        const selected = state.selectedTarget === e.id;
        return `<button type="button" class="phv2-target ${selected ? 'selected' : ''}" data-target="${e.id}">
          <span class="phv2-target-name">${name}</span>
          <span class="phv2-target-hp">${hp}/${hpMax}</span>
        </button>`;
      })
      .join('');
    list.querySelectorAll('.phv2-target').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedTarget = btn.dataset.target;
        renderTargets();
      });
    });
    updateConfirmEnabled();
  };

  const renderCard = () => {
    const unit = state.myUnit;
    if (!unit) {
      overlay.querySelector('#phv2-name').textContent = '—';
      overlay.querySelector('#phv2-meta').textContent = 'In attesa di sessione';
      overlay.querySelector('#phv2-hp').textContent = '—/—';
      overlay.querySelector('#phv2-ap').textContent = '—/—';
      overlay.querySelector('#phv2-def').textContent = '—';
      return;
    }
    overlay.querySelector('#phv2-name').textContent = unit.name || unit.id;
    overlay.querySelector('#phv2-meta').textContent =
      [unit.species, unit.job, unit.level ? `Lv ${unit.level}` : null]
        .filter(Boolean)
        .join(' · ') || '—';
    const hp = unit.hp ?? '?';
    const hpMax = unit.hp_max ?? unit.max_hp ?? hp;
    overlay.querySelector('#phv2-hp').textContent = `${hp}/${hpMax}`;
    const ap = unit.ap ?? '?';
    const apMax = unit.ap_max ?? ap;
    overlay.querySelector('#phv2-ap').textContent = `${ap}/${apMax}`;
    overlay.querySelector('#phv2-def').textContent = String(unit.defense ?? unit.def ?? '—');
  };

  const renderPhase = () => {
    const phaseEl = overlay.querySelector('#phv2-phase');
    if (!phaseEl) return;
    phaseEl.dataset.phase = state.phase;
    const roundEl = overlay.querySelector('#phv2-round');
    const label = overlay.querySelector('.phv2-phase-label');
    const icon = overlay.querySelector('.phv2-phase-icon');
    if (state.phase === 'planning') {
      if (state.lastIntentSent) {
        icon.textContent = '⏳';
        label.textContent = 'In attesa degli altri…';
      } else {
        icon.textContent = '🟢';
        label.textContent = 'Tocca a te — pianifica';
      }
    } else if (state.phase === 'ready') {
      icon.textContent = '⏸';
      label.textContent = 'Tutti pronti — commit in corso';
    } else if (state.phase === 'resolving') {
      icon.textContent = '⚡';
      label.textContent = 'Risoluzione round…';
    } else if (state.phase === 'ended') {
      icon.textContent = '🏁';
      label.textContent = 'Partita conclusa';
    } else {
      icon.textContent = '⏸';
      label.textContent = "In attesa dell'host…";
    }
    if (roundEl) {
      roundEl.textContent = state.round != null ? `round ${state.round}` : '';
    }
  };

  const renderParty = () => {
    const list = overlay.querySelector('#phv2-party-roster');
    const count = overlay.querySelector('#phv2-party-count');
    if (!list) return;
    if (count) count.textContent = String(state.players.length);
    if (!state.players.length) {
      list.innerHTML = '<div class="phv2-empty">Solo tu per ora</div>';
      return;
    }
    list.innerHTML = state.players
      .map((p) => {
        const ready = state.ready.includes(p.id);
        return `<div class="phv2-party-row ${ready ? 'ready' : 'pending'}">
          <span class="phv2-party-dot"></span>
          <span class="phv2-party-name">${p.name || p.id}</span>
          <span class="phv2-party-status">${ready ? '✅ pronto' : '💭 pianifica'}</span>
        </div>`;
      })
      .join('');
  };

  const pushChat = (from, text, { self = false } = {}) => {
    const log = overlay.querySelector('#phv2-chat-log');
    if (!log) return;
    const row = document.createElement('div');
    row.className = `phv2-chat-row ${self ? 'self' : ''}`;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'phv2-chat-from';
    nameSpan.textContent = from || '???';
    const textSpan = document.createElement('span');
    textSpan.className = 'phv2-chat-text';
    textSpan.textContent = text;
    row.appendChild(nameSpan);
    row.appendChild(textSpan);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    // Trim if > 200 rows
    while (log.children.length > 200) log.removeChild(log.firstChild);
  };

  // Action tile click
  overlay.querySelectorAll('.phv2-action-tile').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.lastIntentSent) return;
      state.selectedAction = btn.dataset.action;
      overlay
        .querySelectorAll('.phv2-action-tile')
        .forEach((b) => b.classList.toggle('selected', b === btn));
      renderTargets();
      updateConfirmEnabled();
    });
  });

  // Confirm intent
  overlay.querySelector('#phv2-confirm').addEventListener('click', () => {
    if (!state.selectedAction || !state.myUnit) return;
    const payload = {
      actor_id: state.myUnit.id,
      action: state.selectedAction,
    };
    if (state.selectedTarget) payload.target_id = state.selectedTarget;
    const ok = bridge.sendIntent ? bridge.sendIntent(payload) : false;
    if (ok === false) {
      setStatus('Errore invio intent', 'err');
      return;
    }
    state.lastIntentSent = true;
    setStatus('✓ Intent inviato — attesa degli altri', 'ok');
    overlay.querySelector('#phv2-cancel').classList.remove('phv2-hidden');
    updateConfirmEnabled();
    renderPhase();
  });

  // Cancel
  overlay.querySelector('#phv2-cancel').addEventListener('click', () => {
    if (!state.lastIntentSent) return;
    const ok = bridge.cancelIntent ? bridge.cancelIntent() : false;
    if (ok === false) {
      setStatus('Errore cancel', 'err');
      return;
    }
    state.lastIntentSent = false;
    overlay.querySelector('#phv2-cancel').classList.add('phv2-hidden');
    setStatus('Intent annullato — puoi rimodificare', '');
    updateConfirmEnabled();
    renderPhase();
  });

  // Chat submit
  overlay.querySelector('#phv2-chat-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const input = overlay.querySelector('#phv2-chat-input');
    const txt = input.value.trim();
    if (!txt) return;
    if (bridge.sendChat) bridge.sendChat(txt);
    input.value = '';
  });

  // Return updaters
  return {
    onState(payload) {
      const units = Array.isArray(payload?.units) ? payload.units : [];
      state.units = units;
      state.enemies = units.filter(isEnemy);
      state.myUnit =
        units.find((u) => u.owner_id === bridge.session?.player_id) ||
        units.find((u) => u.owned_by === bridge.session?.player_id) ||
        units.find(isPlayerUnit) ||
        null;
      state.round = payload?.round ?? state.round;
      if (payload?.phase) state.phase = payload.phase;
      if (
        state.lastIntentSent &&
        state.phase === 'planning' &&
        (payload?.round ?? null) !== state.lastRound
      ) {
        // new round: unlock intent
        state.lastIntentSent = false;
        state.selectedAction = null;
        state.selectedTarget = null;
        overlay
          .querySelectorAll('.phv2-action-tile')
          .forEach((b) => b.classList.remove('selected'));
        overlay.querySelector('#phv2-cancel').classList.add('phv2-hidden');
      }
      state.lastRound = payload?.round ?? state.lastRound;
      renderCard();
      renderTargets();
      renderPhase();
      updateConfirmEnabled();
    },
    onRoundReady(payload) {
      state.ready = Array.isArray(payload?.ready) ? payload.ready : [];
      state.missing = Array.isArray(payload?.missing) ? payload.missing : [];
      state.phase = payload?.phase || state.phase;
      state.round = payload?.round ?? state.round;
      renderParty();
      renderPhase();
      updateConfirmEnabled();
    },
    onPlayersChanged(players) {
      state.players = players
        .filter((p) => p.role !== 'host')
        .map((p) => ({ id: p.id, name: p.name || p.id }));
      renderParty();
    },
    onChat({ from, name, text }) {
      pushChat(name || from || '???', text, { self: from === bridge.session?.player_id });
    },
    onChatLocal(text) {
      pushChat('tu', text, { self: true });
    },
  };
}
