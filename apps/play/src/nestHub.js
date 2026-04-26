// OD-001 Path A — V3 Nest Hub overlay (NEW 2026-04-25).
//
// Minimal viable UI for V3 Mating/Nido meta progression engine wire.
// Reads /api/meta/npg + /api/meta/nest and renders:
//   - Nest state (level, biome, requirements_met)
//   - Nest setup form (biome picker + setup button) when level=0
//   - NPG list (recruited NPCs + affinity/trust/cooldown chips)
//   - Mating preview (Phase D, 2-NPG select + roll attempt) — minimal
//
// Pattern clonato da progressionPanel.js (overlay + injectStyles + refresh).
// Consumer: main.js attaches header btn "🪺 Nido" via id="nest-open".
//
// Engine: apps/backend/services/metaProgression.js
// Routes: apps/backend/routes/meta.js (mounted at /api/meta and /api/v1/meta)
// Card: docs/museum/cards/mating_nido-engine-orphan.md (M-007)

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  cachedNpcs: [],
  cachedNest: { level: 0, biome: null, requirements_met: false },
  selectedNpgIds: new Set(),
  // Optional partyMember provider for mating roll (Phase D).
  // Returns { mbti_type, trait_ids } of the active player unit.
  getPartyMember: () => null,
  // Sprint C — squad creatures provider for offspring mating UI.
  // Returns Array<{id, name?, mbti_type?, trait_ids?, gene_slots?}>.
  getSquadCreatures: () => [],
  // Sprint C — Mating tab UI state.
  matingTab: {
    parentAId: null,
    parentBId: null,
    rolledThisSession: false,
    lastResult: null,
  },
  activeTab: 'overview',
};

const BIOME_OPTIONS = [
  'savana',
  'foresta_pluviale',
  'caverna_umida',
  'tundra',
  'palude',
  'deserto',
  'default',
];

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('nest-hub-styles')) return;
  const style = document.createElement('style');
  style.id = 'nest-hub-styles';
  style.textContent = `
    .nest-overlay {
      position: fixed; inset: 0; z-index: 9994;
      background: rgba(11, 13, 18, 0.78);
      display: none; align-items: flex-start; justify-content: center;
      padding: 32px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .nest-overlay.visible { display: flex; }
    .nest-card {
      max-width: 720px; width: 100%; background: #151922;
      border: 1px solid #2a3040; border-radius: 14px; padding: 22px 24px;
    }
    .nest-card-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
    }
    .nest-card-head h2 { margin: 0; font-size: 1.25rem; color: #ffd180; }
    .nest-card-head .close-btn {
      margin-left: auto; background: transparent; border: none; color: #ef9a9a;
      cursor: pointer; font-size: 1.2rem;
    }
    .nest-meta {
      display: flex; gap: 14px; flex-wrap: wrap;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 14px; font-size: 0.85rem;
    }
    .nest-meta strong { color: #ffb74d; }
    .nest-meta .nest-pill {
      background: #1d2230; border: 1px solid #2a3040; border-radius: 999px;
      padding: 2px 10px; font-size: 0.78rem;
    }
    .nest-meta .nest-pill.ok { border-color: #3d5542; color: #a5d6a7; }
    .nest-meta .nest-pill.warn { border-color: #5e3d3d; color: #ef9a9a; }
    .nest-section { margin-bottom: 14px; }
    .nest-section h3 { margin: 0 0 8px; font-size: 0.95rem; color: #ffd180; }
    .nest-setup-row {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    }
    .nest-setup-row select {
      background: #0b0d12; color: #e8eaf0; border: 1px solid #2a3040;
      border-radius: 6px; padding: 6px 10px; font-size: 0.9rem;
    }
    .nest-btn {
      background: #2d4a2d; color: #e8eaf0; border: 1px solid #3d5542;
      border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 0.9rem;
    }
    .nest-btn:hover { background: #3d6a3d; }
    .nest-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .nest-btn.danger { background: #4a2d2d; border-color: #5e3d3d; }
    .nest-empty {
      color: #8891a3; font-style: italic; padding: 8px 0;
    }
    .nest-npc-row {
      display: flex; align-items: center; gap: 10px;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 8px 12px; margin-bottom: 6px;
    }
    .nest-npc-row.selected { border-color: #66bb6a; background: #1e2d20; }
    .nest-npc-row .npc-name { font-weight: 700; color: #ffb74d; min-width: 140px; }
    .nest-npc-row .npc-stats { display: flex; gap: 6px; flex: 1; flex-wrap: wrap; }
    .nest-npc-row .stat-chip {
      background: #151922; border: 1px solid #2a3040; border-radius: 4px;
      padding: 2px 8px; font-family: monospace; font-size: 0.78rem;
    }
    .nest-npc-row .stat-chip.recruited { color: #a5d6a7; border-color: #3d5542; }
    .nest-npc-row .stat-chip.cooldown { color: #ef9a9a; border-color: #5e3d3d; }
    .nest-status {
      margin-top: 12px; min-height: 1.2em; font-size: 0.85rem;
    }
    .nest-status.ok { color: #66bb6a; }
    .nest-status.err { color: #ef5350; }
    /* Sprint C — Tab strip + Mating tab tier visual feedback */
    .nest-tabs {
      display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid #2a3040;
    }
    .nest-tab-btn {
      background: transparent; color: #8891a3; border: none;
      padding: 8px 14px; cursor: pointer; font-size: 0.9rem;
      border-bottom: 2px solid transparent;
    }
    .nest-tab-btn:hover { color: #ffd180; }
    .nest-tab-btn.active {
      color: #ffd180; border-bottom-color: #ffd180; font-weight: 700;
    }
    .nest-tab-pane { display: none; }
    .nest-tab-pane.active { display: block; }
    /* Mating tab — parent selectors */
    .mating-parent-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;
    }
    .mating-parent-grid select {
      background: #0b0d12; color: #e8eaf0; border: 1px solid #2a3040;
      border-radius: 6px; padding: 6px 10px; font-size: 0.9rem; width: 100%;
    }
    .mating-parent-label {
      display: block; font-size: 0.78rem; color: #8891a3; margin-bottom: 4px;
    }
    .mating-roll-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
    }
    .mating-cooldown-hint {
      color: #ef9a9a; font-size: 0.78rem;
    }
    /* Tier visual feedback — no-glow / gold / rainbow */
    .offspring-card {
      background: #0b0d12; border: 2px solid #2a3040; border-radius: 10px;
      padding: 14px 16px; margin-top: 10px; position: relative;
      transition: all 0.3s ease;
    }
    .offspring-card.tier-no-glow {
      border-color: #2a3040;
    }
    .offspring-card.tier-gold {
      border-color: #ffd180;
      box-shadow: 0 0 16px rgba(255, 209, 128, 0.45);
      background: linear-gradient(180deg, #2a210d 0%, #0b0d12 80%);
    }
    .offspring-card.tier-rainbow {
      border-image: linear-gradient(90deg,
        #ff6b6b, #ffd93d, #6bcf7f, #4d9de0, #b06bff, #ff6b6b
      ) 1;
      box-shadow: 0 0 22px rgba(255, 100, 200, 0.5);
      background: linear-gradient(180deg, #1a0d2a 0%, #0b0d12 80%);
      animation: rainbow-pulse 3s ease-in-out infinite;
    }
    @keyframes rainbow-pulse {
      0%, 100% { box-shadow: 0 0 22px rgba(255, 100, 200, 0.5); }
      50% { box-shadow: 0 0 32px rgba(180, 200, 255, 0.7); }
    }
    .offspring-card .tier-badge {
      display: inline-block; padding: 3px 10px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; margin-bottom: 8px;
    }
    .tier-badge.tier-no-glow { background: #2a3040; color: #b0b8c5; }
    .tier-badge.tier-gold { background: #c4a574; color: #1a1410; }
    .tier-badge.tier-rainbow {
      background: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcf7f, #4d9de0, #b06bff);
      color: #1a1410;
    }
    .offspring-lineage {
      font-family: 'Consolas', monospace; color: #66d1fb;
      font-size: 0.78rem; margin-bottom: 6px;
    }
    .offspring-row {
      margin: 6px 0; font-size: 0.85rem;
    }
    .offspring-row .offspring-label {
      color: #8891a3; font-size: 0.78rem; margin-right: 6px;
    }
    .offspring-slot-chip {
      display: inline-block; background: #1d2230; border: 1px solid #2a3040;
      border-radius: 4px; padding: 2px 8px; margin: 0 4px 4px 0;
      font-size: 0.78rem;
    }
    .offspring-slot-chip.from-a { border-color: #4d9de0; }
    .offspring-slot-chip.from-b { border-color: #ff9d4d; }
    .offspring-mutation {
      display: inline-block; background: #1d2230; border: 1px solid #5a4a2f;
      border-radius: 4px; padding: 2px 8px; font-size: 0.78rem; cursor: help;
    }
    .offspring-mutation.tier-rare {
      border-color: #b06bff; color: #d6b3ff;
    }
    .offspring-actions {
      display: flex; gap: 8px; margin-top: 12px;
    }
  `;
  document.head.appendChild(style);
}

function buildOverlay() {
  if (typeof document === 'undefined') return null;
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const overlay = document.createElement('div');
  overlay.id = 'nest-overlay';
  overlay.className = 'nest-overlay';
  overlay.innerHTML = `
    <div class="nest-card" role="dialog" aria-label="Nest Hub">
      <div class="nest-card-head">
        <h2>🪺 Nido — V3 Mating/Reclutamento</h2>
        <button type="button" class="close-btn" id="nest-close">✕</button>
      </div>
      <div class="nest-meta" id="nest-meta">
        <span><strong>Livello:</strong> <span id="nest-meta-level">—</span></span>
        <span><strong>Bioma:</strong> <span id="nest-meta-biome">—</span></span>
        <span class="nest-pill" id="nest-meta-req">requisiti?</span>
      </div>
      <div class="nest-tabs" role="tablist">
        <button type="button" class="nest-tab-btn active" data-tab-btn="overview" role="tab">
          🏠 Overview
        </button>
        <button type="button" class="nest-tab-btn" data-tab-btn="mating" role="tab">
          🧬 Mating
        </button>
        <button type="button" class="nest-tab-btn" data-tab-btn="lineage" role="tab">
          🌳 Lineage
        </button>
      </div>
      <div class="nest-tab-pane active" data-tab="overview">
        <div class="nest-section" id="nest-setup-section" style="display:none">
          <h3>Setup nido</h3>
          <div class="nest-setup-row">
            <select id="nest-biome-select">
              ${BIOME_OPTIONS.map((b) => `<option value="${b}">${b}</option>`).join('')}
            </select>
            <button type="button" class="nest-btn" id="nest-setup-btn">🪺 Inizializza</button>
          </div>
        </div>
        <div class="nest-section">
          <h3>NPG nel nido (<span id="nest-npc-count">0</span>)</h3>
          <div id="nest-npc-list">
            <div class="nest-empty">Carico…</div>
          </div>
        </div>
        <div class="nest-section" id="nest-mating-section" style="display:none">
          <h3>NPG mating roll (seleziona 1 NPG)</h3>
          <div class="nest-setup-row">
            <button type="button" class="nest-btn" id="nest-mating-btn" disabled>
              🧬 Tenta riproduzione (NPG)
            </button>
            <span id="nest-mating-hint" style="font-size:0.8rem;color:#8891a3"></span>
          </div>
        </div>
      </div>
      <div class="nest-tab-pane" data-tab="mating">
        <div class="nest-section">
          <h3>🧬 Squad mating — offspring (MHS 3-tier)</h3>
          <p style="font-size:0.78rem;color:#8891a3;margin:0 0 10px">
            Seleziona due creature della squadra per generare un offspring.
            Il tier (no-glow / gold / rainbow) è determinato da gene_slot match
            e mutazione ambientale del bioma corrente.
          </p>
          <div class="mating-parent-grid">
            <div>
              <label class="mating-parent-label" for="mating-parent-a">Parent A</label>
              <select id="mating-parent-a"><option value="">— seleziona —</option></select>
            </div>
            <div>
              <label class="mating-parent-label" for="mating-parent-b">Parent B</label>
              <select id="mating-parent-b"><option value="">— seleziona —</option></select>
            </div>
          </div>
          <div class="mating-roll-row">
            <button type="button" class="nest-btn" id="mating-roll-btn" disabled>
              🎲 Roll Mating
            </button>
            <span id="mating-cooldown-hint" class="mating-cooldown-hint"></span>
          </div>
          <div id="mating-result-host"></div>
        </div>
      </div>
      <div class="nest-tab-pane" data-tab="lineage">
        <div class="nest-section">
          <h3>🌳 Lineage</h3>
          <p style="font-size:0.85rem;color:#8891a3">
            Sprint D — albero genealogico offspring + tracking parent chain.
          </p>
        </div>
      </div>
      <div class="nest-status" id="nest-status"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#nest-close').addEventListener('click', closeNestHub);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeNestHub();
  });
  overlay.querySelector('#nest-setup-btn').addEventListener('click', handleSetup);
  overlay.querySelector('#nest-mating-btn').addEventListener('click', handleMating);
  // Sprint C — tab switch + Mating tab handlers
  overlay.querySelectorAll('[data-tab-btn]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tabBtn));
  });
  const parentASel = overlay.querySelector('#mating-parent-a');
  const parentBSel = overlay.querySelector('#mating-parent-b');
  if (parentASel) parentASel.addEventListener('change', handleParentChange);
  if (parentBSel) parentBSel.addEventListener('change', handleParentChange);
  const rollBtn = overlay.querySelector('#mating-roll-btn');
  if (rollBtn) rollBtn.addEventListener('click', handleMatingRoll);
  STATE.overlayEl = overlay;
  return overlay;
}

function switchTab(tabName) {
  if (typeof document === 'undefined') return;
  if (!tabName) return;
  STATE.activeTab = tabName;
  if (!STATE.overlayEl) return;
  STATE.overlayEl.querySelectorAll('[data-tab-btn]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tabBtn === tabName);
  });
  STATE.overlayEl.querySelectorAll('[data-tab]').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.tab === tabName);
  });
  // Refresh squad creatures when entering mating tab.
  if (tabName === 'mating') {
    populateParentSelects();
    updateRollButtonState();
  }
}

function setStatus(text, kind = '') {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('nest-status');
  if (!el) return;
  el.textContent = text || '';
  el.className = `nest-status${kind ? ' ' + kind : ''}`;
}

function renderNest(nest) {
  if (typeof document === 'undefined') return;
  const lv = document.getElementById('nest-meta-level');
  const bi = document.getElementById('nest-meta-biome');
  const req = document.getElementById('nest-meta-req');
  const setupSection = document.getElementById('nest-setup-section');
  if (lv) lv.textContent = String(nest?.level ?? 0);
  if (bi) bi.textContent = nest?.biome || '—';
  if (req) {
    const ok = Boolean(nest?.requirements_met);
    req.textContent = ok ? '✓ requisiti ok' : '✖ requisiti non ok';
    req.className = `nest-pill ${ok ? 'ok' : 'warn'}`;
  }
  if (setupSection) {
    setupSection.style.display = (nest?.level ?? 0) === 0 ? '' : 'none';
  }
}

function renderNpcs(npcs) {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('nest-npc-list');
  const count = document.getElementById('nest-npc-count');
  if (count) count.textContent = String(npcs?.length || 0);
  if (!list) return;
  if (!npcs || npcs.length === 0) {
    list.innerHTML = '<div class="nest-empty">Nessun NPG. Reclutane uno dal debrief.</div>';
    return;
  }
  list.innerHTML = '';
  for (const n of npcs) {
    const row = document.createElement('div');
    const isSelected = STATE.selectedNpgIds.has(n.npc_id);
    row.className = `nest-npc-row${isSelected ? ' selected' : ''}`;
    const recruitedChip = n.recruited
      ? '<span class="stat-chip recruited">✓ recruited</span>'
      : '<span class="stat-chip">non recruited</span>';
    const cooldownChip =
      n.mating_cooldown > 0
        ? `<span class="stat-chip cooldown">cd ${n.mating_cooldown}</span>`
        : '';
    const matedChip = n.mated ? '<span class="stat-chip recruited">✓ mated</span>' : '';
    row.innerHTML = `
      <span class="npc-name">${n.npc_id}</span>
      <span class="npc-stats">
        <span class="stat-chip">aff ${n.affinity ?? 0}</span>
        <span class="stat-chip">trust ${n.trust ?? 0}</span>
        ${recruitedChip}
        ${matedChip}
        ${cooldownChip}
      </span>
    `;
    if (n.recruited && !n.mated && n.mating_cooldown <= 0) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => toggleNpgSelect(n.npc_id));
    }
    list.appendChild(row);
  }
  // Update mating section visibility based on selection.
  const matingSection = document.getElementById('nest-mating-section');
  const matingBtn = document.getElementById('nest-mating-btn');
  const matingHint = document.getElementById('nest-mating-hint');
  if (matingSection && matingBtn && matingHint) {
    const eligible = npcs.filter((n) => n.recruited && !n.mated && n.mating_cooldown <= 0);
    matingSection.style.display = eligible.length > 0 ? '' : 'none';
    const sel = [...STATE.selectedNpgIds];
    matingBtn.disabled = sel.length !== 1;
    matingHint.textContent = sel.length === 1 ? `→ ${sel[0]}` : 'click NPG riga per selezionare';
  }
}

function toggleNpgSelect(npcId) {
  if (STATE.selectedNpgIds.has(npcId)) {
    STATE.selectedNpgIds.delete(npcId);
  } else {
    STATE.selectedNpgIds.clear(); // single-select for mating roll
    STATE.selectedNpgIds.add(npcId);
  }
  renderNpcs(STATE.cachedNpcs);
}

async function handleSetup() {
  if (typeof document === 'undefined') return;
  const select = document.getElementById('nest-biome-select');
  const biome = select?.value || 'default';
  setStatus(`Setup nido bioma=${biome}…`);
  const res = await api.metaNestSetup(biome, true);
  if (!res.ok) {
    setStatus(`✖ Setup failed: ${res.data?.error || res.status}`, 'err');
    return;
  }
  setStatus(`✓ Nido inizializzato: ${res.data?.biome} Lv ${res.data?.level}`, 'ok');
  await refresh();
}

async function handleMating() {
  const sel = [...STATE.selectedNpgIds];
  if (sel.length !== 1) return;
  const npcId = sel[0];
  let partyMember = null;
  try {
    partyMember = STATE.getPartyMember?.() || null;
  } catch {
    /* provider optional */
  }
  if (!partyMember) {
    partyMember = { mbti_type: 'NEUTRA', trait_ids: [] };
  }
  setStatus(`Mating roll su ${npcId}…`);
  const res = await api.metaMating(npcId, partyMember);
  if (!res.ok) {
    setStatus(`✖ Mating error: ${res.data?.error || res.status}`, 'err');
    return;
  }
  const d = res.data || {};
  if (d.success) {
    setStatus(
      `🧬 Successo! roll ${d.roll}+${d.modifier}=${d.total} vs ${d.threshold}, offspring ${(d.offspring_traits || []).length} trait`,
      'ok',
    );
  } else {
    setStatus(
      `✖ Roll fallito (${d.roll}+${d.modifier}=${d.total} vs ${d.threshold}). Reason: ${d.reason || '?'}`,
      'err',
    );
  }
  STATE.selectedNpgIds.clear();
  await refresh();
}

async function refresh() {
  setStatus('Carico…');
  const res = await api.metaNpgList();
  if (!res.ok) {
    setStatus(`✖ Backend error: ${res.data?.error || res.status}`, 'err');
    return;
  }
  STATE.cachedNpcs = Array.isArray(res.data?.npcs) ? res.data.npcs : [];
  STATE.cachedNest = res.data?.nest || { level: 0, biome: null, requirements_met: false };
  renderNest(STATE.cachedNest);
  renderNpcs(STATE.cachedNpcs);
  // Sprint C — refresh Mating tab parent selectors when squad changes.
  if (STATE.activeTab === 'mating') {
    populateParentSelects();
    updateRollButtonState();
  }
  setStatus(
    `${STATE.cachedNpcs.length} NPG · nido Lv ${STATE.cachedNest.level}${STATE.cachedNest.biome ? ' (' + STATE.cachedNest.biome + ')' : ''}`,
    'ok',
  );
}

// ─── Sprint C — Mating tab (squad-mate offspring roll) ──────────────────

function getSquadList() {
  try {
    const list = STATE.getSquadCreatures?.() || [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function populateParentSelects() {
  if (typeof document === 'undefined' || !STATE.overlayEl) return;
  const aSel = STATE.overlayEl.querySelector('#mating-parent-a');
  const bSel = STATE.overlayEl.querySelector('#mating-parent-b');
  if (!aSel || !bSel) return;
  const squad = getSquadList();
  const optsHtml = ['<option value="">— seleziona —</option>']
    .concat(
      squad.map((c) => {
        const id = String(c.id || '');
        const label = c.name || c.id || 'unnamed';
        return `<option value="${escapeAttr(id)}">${escapeText(label)}</option>`;
      }),
    )
    .join('');
  // Preserve current selection if still valid.
  const prevA = STATE.matingTab.parentAId;
  const prevB = STATE.matingTab.parentBId;
  aSel.innerHTML = optsHtml;
  bSel.innerHTML = optsHtml;
  if (prevA && squad.find((c) => c.id === prevA)) aSel.value = prevA;
  if (prevB && squad.find((c) => c.id === prevB)) bSel.value = prevB;
}

function handleParentChange() {
  if (typeof document === 'undefined' || !STATE.overlayEl) return;
  const a = STATE.overlayEl.querySelector('#mating-parent-a')?.value || '';
  const b = STATE.overlayEl.querySelector('#mating-parent-b')?.value || '';
  STATE.matingTab.parentAId = a || null;
  STATE.matingTab.parentBId = b || null;
  updateRollButtonState();
}

function updateRollButtonState() {
  if (typeof document === 'undefined' || !STATE.overlayEl) return;
  const btn = STATE.overlayEl.querySelector('#mating-roll-btn');
  const hint = STATE.overlayEl.querySelector('#mating-cooldown-hint');
  if (!btn) return;
  const a = STATE.matingTab.parentAId;
  const b = STATE.matingTab.parentBId;
  const sameParent = a && b && a === b;
  const onCooldown = STATE.matingTab.rolledThisSession;
  let canRoll = Boolean(a && b) && !sameParent && !onCooldown;
  btn.disabled = !canRoll;
  if (hint) {
    if (sameParent) hint.textContent = 'Stessa creatura — seleziona due parent diversi';
    else if (onCooldown) hint.textContent = 'Cooldown attivo (1 mating per sessione)';
    else if (!a || !b) hint.textContent = '';
    else hint.textContent = `Ready: ${a} × ${b}`;
  }
}

async function handleMatingRoll() {
  if (typeof document === 'undefined' || !STATE.overlayEl) return;
  const a = STATE.matingTab.parentAId;
  const b = STATE.matingTab.parentBId;
  if (!a || !b || a === b) return;
  const squad = getSquadList();
  const parentA = squad.find((c) => c.id === a);
  const parentB = squad.find((c) => c.id === b);
  if (!parentA || !parentB) {
    setStatus('✖ Parent non trovato in squad cache', 'err');
    return;
  }
  const biomeId = STATE.cachedNest?.biome || 'default';
  setStatus(`Roll mating ${a} × ${b} in ${biomeId}…`);
  const res = await api.metaMatingRoll(parentA, parentB, biomeId);
  if (!res.ok) {
    setStatus(`✖ Backend error: ${res.data?.error || res.status}`, 'err');
    return;
  }
  const data = res.data || {};
  if (!data.success) {
    setStatus(`✖ Mating fail: ${data.reason || 'unknown'}`, 'err');
    renderOffspringResult(null);
    return;
  }
  STATE.matingTab.rolledThisSession = true;
  STATE.matingTab.lastResult = data;
  renderOffspringResult(data);
  updateRollButtonState();
  const tierLabel = data.tier || 'no-glow';
  setStatus(
    `🧬 Offspring ${tierLabel.toUpperCase()} generato (lineage ${data.offspring?.lineage_id || '?'})`,
    'ok',
  );
}

function renderOffspringResult(result) {
  if (typeof document === 'undefined' || !STATE.overlayEl) return;
  const host = STATE.overlayEl.querySelector('#mating-result-host');
  if (!host) return;
  if (!result || !result.success) {
    host.innerHTML = '';
    return;
  }
  const o = result.offspring || {};
  const tier = result.tier || 'no-glow';
  const tierClass = `tier-${tier}`;
  const slotsHtml = (o.gene_slots || [])
    .map((s) => {
      const fromCls = s.from === 'parent_a' ? 'from-a' : 'from-b';
      const lab = escapeText(s.label_it || s.slot_id);
      const val = escapeText(String(s.value || ''));
      return `<span class="offspring-slot-chip ${fromCls}">${lab}: ${val} <small>(${escapeText(s.from)})</small></span>`;
    })
    .join('');
  const mut = o.environmental_mutation || {};
  const mutTierCls = mut.tier === 2 ? 'tier-rare' : '';
  const mutLabel = escapeText(mut.name_it || mut.id || 'nessuna');
  const mutTooltip = `bioma: ${escapeAttr(mut.biome_id || '?')} | tier: ${mut.tier ?? '—'} | source: ${escapeAttr(mut.source || '?')}`;
  const lineageDisplay = humanizeLineageId(o.lineage_id);
  const bonusHtml = (o.tier_bonus_traits || [])
    .map((t) => `<span class="offspring-slot-chip">${escapeText(t)}</span>`)
    .join('');
  host.innerHTML = `
    <div class="offspring-card ${tierClass}">
      <span class="tier-badge ${tierClass}">${tier}</span>
      <div class="offspring-lineage">🆔 ${escapeText(lineageDisplay)}</div>
      <div class="offspring-row">
        <span class="offspring-label">Gene slots:</span>${slotsHtml || '—'}
      </div>
      <div class="offspring-row">
        <span class="offspring-label">Mutazione ambientale:</span>
        <span class="offspring-mutation ${mutTierCls}" title="${mutTooltip}">${mutLabel}</span>
      </div>
      ${
        bonusHtml
          ? `<div class="offspring-row"><span class="offspring-label">Bonus tier:</span>${bonusHtml}</div>`
          : ''
      }
      <div class="offspring-row">
        <span class="offspring-label">Phase:</span>
        <span class="offspring-slot-chip">${escapeText(o.predicted_lifecycle_phase || 'hatchling')}</span>
      </div>
      <div class="offspring-actions">
        <button type="button" class="nest-btn" id="offspring-add-btn">+ Aggiungi al Nido</button>
      </div>
    </div>
  `;
  const addBtn = host.querySelector('#offspring-add-btn');
  if (addBtn) addBtn.addEventListener('click', () => handleAddOffspring(o));
}

async function handleAddOffspring(offspring) {
  if (!offspring) return;
  setStatus('Aggiungo al Nido…');
  const res = await api.metaNestAddOffspring(offspring);
  if (!res.ok) {
    setStatus(`✖ Add failed: ${res.data?.error || res.status}`, 'err');
    return;
  }
  setStatus(`✓ Offspring ${offspring.lineage_id} aggiunto al Nido`, 'ok');
}

function humanizeLineageId(id) {
  if (!id) return '—';
  // lineage_a1b2c3d4 → A1B2-C3D4 (more readable)
  const m = String(id).match(/^lineage_([0-9a-f]+)$/i);
  if (!m) return id;
  const hex = m[1].toUpperCase();
  if (hex.length >= 8) return `Lineage ${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  return `Lineage ${hex}`;
}

function escapeText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;');
}

export function openNestHub() {
  buildOverlay();
  if (STATE.overlayEl) STATE.overlayEl.classList.add('visible');
  refresh();
}

export function closeNestHub() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initNestHub({ getPartyMember, getSquadCreatures, buttonId = 'nest-open' } = {}) {
  STATE.getPartyMember = typeof getPartyMember === 'function' ? getPartyMember : () => null;
  STATE.getSquadCreatures = typeof getSquadCreatures === 'function' ? getSquadCreatures : () => [];
  buildOverlay();
  if (typeof document === 'undefined') {
    return { openNestHub, closeNestHub, refresh, switchTab };
  }
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.addEventListener('click', openNestHub);
  }
  return { openNestHub, closeNestHub, refresh, switchTab };
}

// Test surface — internal helpers for unit tests.
export const __nestHubInternal = {
  humanizeLineageId,
  escapeText,
  escapeAttr,
  STATE,
};
