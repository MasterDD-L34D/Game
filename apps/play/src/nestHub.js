// OD-001 Path A — Sprint A: V3 Nest Hub overlay (4-tab scaffold).
//
// Nido = housing+evolution+mutation hub post-unlock (Pokopia/Stardew CC pattern).
// Sbloccato da `biome_arc_completed` + ≥3 missioni nel bioma affinity (vedi
// sessionHelpers.checkNidoUnlock). Una volta sbloccato, sempre accessibile.
//
// Layout 4 tab:
//   - Squad   → lista creature owned (NPG recruited via /api/meta/npg)
//   - Mating  → mating roll UI (Sprint C riempie full UI; Sprint A: stub
//               minimal preserva engine wire — single NPG select → roll)
//   - Lineage → placeholder "Coming soon" (Sprint D riempie genealogy tree)
//   - Codex   → link che apre codexPanel esistente (in-game wiki)
//
// Pattern clonato da skivPanel.js / codexPanel.js (overlay + injectStyles).
// Consumer: main.js attaches header btn "🏠 Nido" via id="nest-open".
// Visibility: btn-nest hidden by default, mostrato quando state.world.nido_unlocked === true.
//
// Engine: apps/backend/services/metaProgression.js
// Routes: apps/backend/routes/meta.js (mounted /api/meta + /api/v1/meta)
// Report: docs/reports/2026-04-26-nido-pokopia-housing-pattern.md

import { api } from './api.js';

const TAB_IDS = ['squad', 'mating', 'mutations', 'lineage', 'codex'];

const STATE = {
  overlayEl: null,
  cachedNpcs: [],
  cachedNest: { level: 0, biome: null, requirements_met: false },
  selectedNpgIds: new Set(),
  currentTab: 'squad',
  // Optional providers wired da main.js.
  getPartyMember: () => null,
  // Sprint D — lineage tab state (cached tribe + currently expanded lineage).
  cachedTribes: [],
  expandedLineageId: null,
  expandedChain: [],
  selectedUnitId: null,
  // QW-3 Spore Moderate — mutations tab state.
  cachedEligibleMutations: [],
  cachedMutationsBingo: { archetypes: [], counts: {} },
  openCodex: () => {
    /* fallback no-op */
  },
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

// Pure helper — Squad tab uses recruited NPCs as "creature owned" placeholder
// finché schema squad runtime separato non esiste (Sprint B+).
export function filterSquadMembers(npcs) {
  if (!Array.isArray(npcs)) return [];
  return npcs.filter((n) => n && n.recruited === true);
}

// Pure helper — eligible per mating roll (recruited + non-mated + cooldown ok).
export function filterMatingEligible(npcs) {
  if (!Array.isArray(npcs)) return [];
  return npcs.filter((n) => n && n.recruited === true && !n.mated && (n.mating_cooldown ?? 0) <= 0);
}

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
    .nest-tabs {
      display: flex; gap: 4px; border-bottom: 1px solid #2a3040;
      margin-bottom: 14px;
    }
    .nest-tab {
      background: transparent; border: 1px solid transparent; border-bottom: none;
      color: #8891a3; padding: 8px 14px; cursor: pointer;
      font-size: 0.9rem; border-radius: 6px 6px 0 0;
    }
    .nest-tab.active {
      background: #0b0d12; border-color: #2a3040; color: #ffd180;
      position: relative; top: 1px;
    }
    .nest-tab:hover:not(.active) { color: #e8eaf0; }
    .nest-tab-panel { display: none; }
    .nest-tab-panel.active { display: block; }
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
    .tab-stub {
      background: #0b0d12; border: 1px dashed #2a3040; border-radius: 8px;
      padding: 22px; text-align: center; color: #8891a3; font-style: italic;
    }
    .tab-stub strong { color: #ffd180; font-style: normal; display: block;
      margin-bottom: 6px; }
    .nest-creature-row,
    .nest-npc-row {
      display: flex; align-items: center; gap: 10px;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 8px 12px; margin-bottom: 6px;
    }
    .nest-npc-row.selected { border-color: #66bb6a; background: #1e2d20; }
    .nest-creature-avatar,
    .nest-npc-row .npc-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: #1d2230; border: 1px solid #2a3040;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .nest-creature-row .creature-name,
    .nest-npc-row .npc-name { font-weight: 700; color: #ffb74d; min-width: 140px; }
    .nest-creature-row .creature-stats,
    .nest-npc-row .npc-stats { display: flex; gap: 6px; flex: 1; flex-wrap: wrap; }
    .stat-chip {
      background: #151922; border: 1px solid #2a3040; border-radius: 4px;
      padding: 2px 8px; font-family: monospace; font-size: 0.78rem;
    }
    .stat-chip.recruited { color: #a5d6a7; border-color: #3d5542; }
    .stat-chip.cooldown { color: #ef9a9a; border-color: #5e3d3d; }
    .stat-chip.phase { color: #66d1fb; border-color: #2a4a5e; }
    .stat-chip.lineage { color: #c4a574; border-color: #5a4a2f; }
    .nest-status {
      margin-top: 12px; min-height: 1.2em; font-size: 0.85rem;
    }
    .nest-status.ok { color: #66bb6a; }
    .nest-status.err { color: #ef5350; }
    /* QW-3 Spore Moderate — Mutations tab. */
    .nest-mutation-list { display: flex; flex-direction: column; gap: 4px; }
    .nest-mutation-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 6px;
      padding: 8px 10px; font-size: 0.85rem;
    }
    .nest-mutation-row.disabled { opacity: 0.5; }
    .nest-mutation-row .mut-name { flex: 1 1 200px; color: #c084fc; font-weight: 600; }
    .nest-mutation-row .mut-tier {
      background: #1d2230; border: 1px solid #2a3040; border-radius: 4px;
      padding: 1px 6px; font-family: monospace; font-size: 0.72rem;
    }
    .nest-mutation-row .mut-slot {
      background: #1a1f2b; border: 1px solid #5a4a8c; border-radius: 4px;
      padding: 1px 6px; font-family: monospace; font-size: 0.72rem; color: #c4a574;
    }
    .nest-mutation-row .mut-cost { font-family: monospace; font-size: 0.78rem; color: #a78bfa; }
    .nest-mutation-row .mut-apply-btn {
      background: #2d2a4a; color: #e8d4ff; border: 1px solid #5a4a8c;
      border-radius: 4px; padding: 3px 10px; cursor: pointer; font-size: 0.78rem;
    }
    .nest-mutation-row .mut-apply-btn:hover:not(:disabled) { background: #3d3a6a; }
    .nest-mutation-row .mut-apply-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .nest-mutation-bingo {
      background: #0b0d12; border: 1px solid #5a4a8c; border-radius: 6px;
      padding: 8px 10px; margin-top: 6px;
    }
    .nest-mutation-bingo h4 {
      margin: 0 0 6px 0; font-size: 0.78rem; color: #c084fc; text-transform: uppercase;
    }
    .bingo-counts { display: flex; flex-wrap: wrap; gap: 4px; }
    .bingo-cat-chip {
      background: #1a1f2b; border: 1px solid #2a3040; border-radius: 999px;
      padding: 2px 8px; font-size: 0.75rem; font-family: monospace;
    }
    .bingo-cat-chip.completed { border-color: #c084fc; color: #e8d4ff; }
    /* Sprint D — Lineage section (tribe list + tree view). */
    .nest-tribe-list { display: flex; flex-direction: column; gap: 4px; }
    .nest-tribe-row {
      display: flex; align-items: center; gap: 8px;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 6px;
      padding: 6px 10px; cursor: pointer; font-size: 0.85rem;
    }
    .nest-tribe-row:hover { border-color: #ffd180; }
    .nest-tribe-row.expanded { border-color: #ffb74d; background: #1f1a10; }
    .nest-tribe-row .tribe-id {
      font-family: monospace; color: #ffd180; min-width: 120px;
    }
    .nest-tribe-row .tribe-stat {
      background: #151922; border: 1px solid #2a3040; border-radius: 4px;
      padding: 1px 6px; font-family: monospace; font-size: 0.75rem;
    }
    .nest-lineage-tree {
      margin-top: 8px; padding: 8px 12px;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 6px;
      font-family: monospace; font-size: 0.78rem;
    }
    .nest-lineage-node {
      padding: 3px 0 3px 0;
      border-left: 2px solid #2a3040;
      padding-left: 8px;
      cursor: pointer;
    }
    .nest-lineage-node:hover { background: #151922; }
    .nest-lineage-node.selected {
      background: #1e2d20; border-left-color: #66bb6a;
    }
    .nest-lineage-node .gen-badge {
      display: inline-block; background: #1d2230; border: 1px solid #2a3040;
      color: #ffb74d; padding: 0 5px; border-radius: 3px; margin-right: 6px;
      font-size: 0.72rem;
    }
    .nest-lineage-node .unit-id { color: #e8eaf0; }
    .nest-lineage-node .unit-meta { color: #8891a3; margin-left: 6px; }
    .nest-lineage-info {
      margin-top: 6px; padding: 6px 10px;
      background: #1d2230; border: 1px solid #ffd180; border-radius: 6px;
      font-size: 0.78rem; color: #ffd180;
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
    <div class="nest-card" role="dialog" aria-label="Nido Hub">
      <div class="nest-card-head">
        <h2>🏠 Nido</h2>
        <button type="button" class="close-btn" id="nest-close">✕</button>
      </div>
      <div class="nest-meta" id="nest-meta">
        <span><strong>Livello:</strong> <span id="nest-meta-level">—</span></span>
        <span><strong>Bioma:</strong> <span id="nest-meta-biome">—</span></span>
        <span class="nest-pill" id="nest-meta-req">requisiti?</span>
      </div>
      <nav class="nest-tabs" role="tablist">
        <button type="button" class="nest-tab active" data-tab="squad" role="tab">
          🐾 Squad
        </button>
        <button type="button" class="nest-tab" data-tab="mating" role="tab">
          🧬 Mating
        </button>
        <button type="button" class="nest-tab" data-tab="mutations" role="tab">
          🧪 Mutations
        </button>
        <button type="button" class="nest-tab" data-tab="lineage" role="tab">
          🌳 Lineage
        </button>
        <button type="button" class="nest-tab" data-tab="codex" role="tab">
          📖 Codex
        </button>
      </nav>

      <!-- TAB: Squad (default attivo) -->
      <div class="nest-tab-panel active" data-tab-panel="squad">
        <div class="nest-section">
          <h3>Creature nel nido (<span id="nest-squad-count">0</span>)</h3>
          <div id="nest-squad-list">
            <div class="nest-empty">Carico…</div>
          </div>
        </div>
      </div>

      <!-- TAB: Mating (Sprint A stub minimal — Sprint C riempie full UI) -->
      <div class="nest-tab-panel" data-tab-panel="mating">
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
          <h3>NPG (<span id="nest-npc-count">0</span>) — Sprint A stub</h3>
          <div id="nest-npc-list">
            <div class="nest-empty">Carico…</div>
          </div>
        </div>
        <div class="nest-section" id="nest-mating-section" style="display:none">
          <h3>Mating roll (seleziona 1 NPG)</h3>
          <div class="nest-setup-row">
            <button type="button" class="nest-btn" id="nest-mating-btn" disabled>
              🧬 Tenta riproduzione
            </button>
            <span id="nest-mating-hint" style="font-size:0.8rem;color:#8891a3"></span>
          </div>
        </div>
      </div>

      <!-- TAB: Mutations — QW-3 Spore Moderate Gate 5 UX. -->
      <div class="nest-tab-panel" data-tab-panel="mutations">
        <div class="nest-section" id="nest-mutations-section">
          <div style="margin-bottom:8px;color:#8891a3;font-size:0.82rem">
            🧪 Spore Moderate evolution editor — seleziona PG, vedi mutation eligible con MP cost
            + body_slot, applica per evolvere ability derivata.
          </div>
          <div class="nest-setup-row">
            <select id="nest-mutation-unit-select"></select>
            <button type="button" class="nest-btn" id="nest-mutation-refresh-btn">
              🔄 Refresh eligible
            </button>
            <span id="nest-mutation-mp" style="font-size:0.85rem;color:#c084fc"></span>
          </div>
          <h3>Mutation eligible (<span id="nest-mutations-count">0</span>)</h3>
          <div class="nest-mutation-list" id="nest-mutation-list">
            <div class="nest-empty">Seleziona un PG e premi Refresh.</div>
          </div>
          <div id="nest-mutation-bingo-wrap" style="margin-top:10px"></div>
        </div>
      </div>

      <!-- TAB: Lineage — Sprint D wired (OD-001 Path A 4/4 complete). -->
      <div class="nest-tab-panel" data-tab-panel="lineage">
        <div class="nest-section" id="nest-lineage-section">
          <div style="margin-bottom:8px;color:#8891a3;font-size:0.82rem">
            🌳 Genealogia multi-gen — click su una tribù per espandere il chain (max 3 gen).
            Engine: <code>metaProgression.js</code> rollMating offspring_traits + inheritance bias.
          </div>
          <h3>🧬 Lignaggio &amp; Tribù emergent (<span id="nest-tribes-count">0</span>)</h3>
          <div class="nest-tribe-list" id="nest-tribe-list">
            <div class="nest-empty">
              Nessuna tribù emerge ancora (servono ≥3 unità con lo stesso lineage).
            </div>
          </div>
          <div id="nest-lineage-tree-wrap"></div>
        </div>
      </div>

      <!-- TAB: Codex (link a codexPanel esistente) -->
      <div class="nest-tab-panel" data-tab-panel="codex">
        <div class="tab-stub">
          <strong>📖 Codex — wiki in-game</strong>
          Apri il Codex completo (Tips / Glossario / Abilità / Statuses).
          <br><br>
          <button type="button" class="nest-btn" id="nest-codex-link">Apri Codex →</button>
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
  overlay.querySelector('#nest-codex-link').addEventListener('click', () => {
    closeNestHub();
    try {
      STATE.openCodex?.();
    } catch {
      /* ignore */
    }
  });
  overlay.querySelectorAll('.nest-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => switchTab(tabBtn.dataset.tab));
  });
  // QW-3 Spore Moderate — mutations tab handlers (refresh-btn + select change).
  const mutBtn = overlay.querySelector('#nest-mutation-refresh-btn');
  if (mutBtn) mutBtn.addEventListener('click', () => refreshMutations().catch(() => {}));
  const mutSel = overlay.querySelector('#nest-mutation-unit-select');
  if (mutSel) mutSel.addEventListener('change', () => refreshMutations().catch(() => {}));
  STATE.overlayEl = overlay;
  return overlay;
}

export function switchTab(tabName) {
  if (!TAB_IDS.includes(tabName)) return;
  STATE.currentTab = tabName;
  if (typeof document === 'undefined') return;
  const panel = STATE.overlayEl;
  if (!panel) return;
  panel.querySelectorAll('.nest-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  panel.querySelectorAll('.nest-tab-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.tabPanel === tabName);
  });
  // QW-3 — auto-refresh mutations tab on switch (lazy fetch).
  if (tabName === 'mutations') {
    refreshMutations().catch(() => {});
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

// Squad tab — render creature owned (NPG recruited filtered).
// Sprint A: avatar + nome + lifecycle_phase (placeholder) + MBTI form (se presente)
// + lineage_id placeholder (Sprint D popola).
function renderSquad(npcs) {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('nest-squad-list');
  const count = document.getElementById('nest-squad-count');
  const squad = filterSquadMembers(npcs);
  if (count) count.textContent = String(squad.length);
  if (!list) return;
  if (squad.length === 0) {
    list.innerHTML =
      '<div class="nest-empty">Nessuna creatura nel nido. Recluta un NPG dal debrief campagna.</div>';
    return;
  }
  list.innerHTML = '';
  for (const n of squad) {
    const row = document.createElement('div');
    row.className = 'nest-creature-row';
    const phase = n.lifecycle_phase || 'mature'; // placeholder finché schema runtime non esiste
    const mbti = n.mbti_revealed && n.mbti_type ? n.mbti_type : null;
    const lineageId = n.lineage_id || `lin_${String(n.npc_id || '?').slice(0, 6)}`;
    const avatarGlyph = mbti ? mbti.charAt(0) : (n.npc_id || '?').charAt(0).toUpperCase();
    row.innerHTML = `
      <span class="nest-creature-avatar">${avatarGlyph}</span>
      <span class="creature-name">${escapeHtml(n.npc_id || '?')}</span>
      <span class="creature-stats">
        <span class="stat-chip phase">phase: ${escapeHtml(phase)}</span>
        ${mbti ? `<span class="stat-chip recruited">MBTI: ${escapeHtml(mbti)}</span>` : '<span class="stat-chip">MBTI: ?</span>'}
        <span class="stat-chip lineage">lineage: ${escapeHtml(lineageId)}</span>
      </span>
    `;
    list.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      <span class="npc-name">${escapeHtml(n.npc_id || '?')}</span>
      <span class="npc-stats">
        <span class="stat-chip">aff ${n.affinity ?? 0}</span>
        <span class="stat-chip">trust ${n.trust ?? 0}</span>
        ${recruitedChip}
        ${matedChip}
        ${cooldownChip}
      </span>
    `;
    if (n.recruited && !n.mated && (n.mating_cooldown ?? 0) <= 0) {
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
    const eligible = filterMatingEligible(npcs);
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

// ─── Sprint D — Lineage tab rendering ───────────────────────────────────

function renderTribes(tribes) {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('nest-tribe-list');
  const count = document.getElementById('nest-tribes-count');
  if (count) count.textContent = String(tribes?.length || 0);
  if (!list) return;
  if (!tribes || tribes.length === 0) {
    list.innerHTML =
      '<div class="nest-empty">Nessuna tribù emerge ancora (servono ≥3 unità con lo stesso lineage).</div>';
    return;
  }
  list.innerHTML = '';
  for (const t of tribes) {
    const row = document.createElement('div');
    const isExpanded = STATE.expandedLineageId === t.tribe_id;
    row.className = `nest-tribe-row${isExpanded ? ' expanded' : ''}`;
    row.innerHTML = `
      <span class="tribe-id">${t.tribe_id}</span>
      <span class="tribe-stat">${t.members_count}m</span>
      <span class="tribe-stat">gen ${t.oldest_generation}</span>
      <span class="tribe-stat">${t.primary_biome || '—'}</span>
      <span style="margin-left:auto;color:#8891a3;font-size:0.78rem">
        root ${t.lineage_root_unit_id || '—'}
      </span>
    `;
    row.addEventListener('click', () => toggleLineageExpand(t.tribe_id));
    list.appendChild(row);
  }
}

function renderLineageTree() {
  if (typeof document === 'undefined') return;
  const wrap = document.getElementById('nest-lineage-tree-wrap');
  if (!wrap) return;
  if (!STATE.expandedLineageId || !STATE.expandedChain.length) {
    wrap.innerHTML = '';
    return;
  }
  // Group by generation, max 3 generations visible.
  const byGen = new Map();
  for (const u of STATE.expandedChain) {
    const g = u.generation ?? 0;
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g).push(u);
  }
  const sortedGens = [...byGen.keys()].sort((a, b) => a - b).slice(0, 3);

  let html = `<div class="nest-lineage-tree" data-lineage="${STATE.expandedLineageId}">`;
  html += `<div style="color:#ffd180;margin-bottom:6px">
    Lineage <strong>${STATE.expandedLineageId}</strong> · chain ${STATE.expandedChain.length} unità
  </div>`;
  for (const g of sortedGens) {
    const units = byGen.get(g) || [];
    for (const u of units) {
      const isSel = STATE.selectedUnitId === u.unit_id;
      const parents =
        Array.isArray(u.parents) && u.parents.length === 2
          ? `← ${u.parents[0]} × ${u.parents[1]}`
          : 'founder';
      const indent = '  '.repeat(Math.min(g, 2));
      html += `<div class="nest-lineage-node${isSel ? ' selected' : ''}"
        data-unit-id="${u.unit_id}" style="margin-left:${g * 14}px">
        <span class="gen-badge">G${g}</span>
        <span class="unit-id">${indent}${u.unit_id}</span>
        <span class="unit-meta">${parents}${u.born_at_biome ? ' · ' + u.born_at_biome : ''}</span>
      </div>`;
    }
  }
  if (sortedGens.length < byGen.size) {
    const hidden = byGen.size - sortedGens.length;
    html += `<div style="margin-top:6px;color:#8891a3;font-style:italic">
      …e altre ${hidden} generazion${hidden === 1 ? 'e' : 'i'} (max 3 visibili)
    </div>`;
  }
  if (STATE.selectedUnitId) {
    const sel = STATE.expandedChain.find((u) => u.unit_id === STATE.selectedUnitId);
    if (sel) {
      html += `<div class="nest-lineage-info">
        ▸ <strong>${sel.unit_id}</strong>
        · gen ${sel.generation ?? 0}
        · session ${sel.born_at_session || '—'}
        · biome ${sel.born_at_biome || '—'}
      </div>`;
    }
  }
  html += '</div>';
  wrap.innerHTML = html;
  // Wire click → highlight unit info.
  wrap.querySelectorAll('.nest-lineage-node').forEach((node) => {
    node.addEventListener('click', () => {
      const uid = node.getAttribute('data-unit-id');
      STATE.selectedUnitId = STATE.selectedUnitId === uid ? null : uid;
      renderLineageTree();
    });
  });
}

async function toggleLineageExpand(lineageId) {
  if (STATE.expandedLineageId === lineageId) {
    STATE.expandedLineageId = null;
    STATE.expandedChain = [];
    STATE.selectedUnitId = null;
    renderTribes(STATE.cachedTribes);
    renderLineageTree();
    return;
  }
  STATE.expandedLineageId = lineageId;
  STATE.selectedUnitId = null;
  STATE.expandedChain = [];
  renderTribes(STATE.cachedTribes);
  renderLineageTree();
  // Fetch chain async.
  const res = await api.metaLineageChain(lineageId);
  if (res.ok && Array.isArray(res.data?.chain)) {
    STATE.expandedChain = res.data.chain;
    renderLineageTree();
  }
}

async function refreshLineage() {
  const res = await api.metaTribesEmergent();
  if (!res.ok) {
    STATE.cachedTribes = [];
    renderTribes([]);
    return;
  }
  STATE.cachedTribes = Array.isArray(res.data?.tribes) ? res.data.tribes : [];
  renderTribes(STATE.cachedTribes);
  // Re-render expanded tree if still expanded (registry may have grown).
  if (STATE.expandedLineageId) {
    const stillThere = STATE.cachedTribes.some((t) => t.tribe_id === STATE.expandedLineageId);
    if (!stillThere) {
      STATE.expandedLineageId = null;
      STATE.expandedChain = [];
      STATE.selectedUnitId = null;
    }
    renderLineageTree();
  }
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
  renderSquad(STATE.cachedNpcs);
  renderNpcs(STATE.cachedNpcs);
  // Sprint D — fetch tribe emergent in parallel; failure non-fatal.
  await refreshLineage().catch(() => {});
  // QW-3 — populate mutations unit selector from squad list (recruited only).
  populateMutationUnitSelector();
  const squadCount = filterSquadMembers(STATE.cachedNpcs).length;
  setStatus(
    `${squadCount} creature · ${STATE.cachedNpcs.length} NPG · nido Lv ${STATE.cachedNest.level}${STATE.cachedNest.biome ? ' (' + STATE.cachedNest.biome + ')' : ''} · ${STATE.cachedTribes.length} tribù`,
    'ok',
  );
}

// ─── QW-3 Spore Moderate — Mutations tab ──────────────────────────────────

function populateMutationUnitSelector() {
  if (typeof document === 'undefined') return;
  const sel = document.getElementById('nest-mutation-unit-select');
  if (!sel) return;
  const squad = filterSquadMembers(STATE.cachedNpcs);
  let partyMember = null;
  try {
    partyMember = STATE.getPartyMember?.() || null;
  } catch {
    /* optional */
  }
  const options = [];
  if (partyMember && (partyMember.id || partyMember.npc_id)) {
    const pid = partyMember.id || partyMember.npc_id;
    options.push(`<option value="party:${escapeHtml(pid)}">★ ${escapeHtml(pid)} (you)</option>`);
  }
  for (const npc of squad) {
    options.push(
      `<option value="npc:${escapeHtml(npc.npc_id)}">${escapeHtml(npc.npc_id)}</option>`,
    );
  }
  if (options.length === 0) {
    sel.innerHTML = '<option value="">(no eligible units)</option>';
    sel.disabled = true;
  } else {
    sel.innerHTML = options.join('');
    sel.disabled = false;
  }
}

function _selectedMutationUnit() {
  if (typeof document === 'undefined') return null;
  const sel = document.getElementById('nest-mutation-unit-select');
  const v = sel?.value || '';
  if (!v) return null;
  const idx = v.indexOf(':');
  if (idx < 0) return null;
  const kind = v.slice(0, idx);
  const id = v.slice(idx + 1);
  if (kind === 'party') {
    try {
      return STATE.getPartyMember?.() || null;
    } catch {
      return null;
    }
  }
  if (kind === 'npc') {
    return STATE.cachedNpcs.find((n) => n && n.npc_id === id) || null;
  }
  return null;
}

function _unitForMutationApi(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw.npc_id || null,
    trait_ids: Array.isArray(raw.trait_ids) ? raw.trait_ids : [],
    applied_mutations: Array.isArray(raw.applied_mutations) ? raw.applied_mutations : [],
    mp: Number(raw.mp ?? 5),
  };
}

async function refreshMutations() {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('nest-mutation-list');
  const count = document.getElementById('nest-mutations-count');
  const mpEl = document.getElementById('nest-mutation-mp');
  const raw = _selectedMutationUnit();
  if (!raw) {
    if (list) list.innerHTML = '<div class="nest-empty">Seleziona un PG.</div>';
    if (count) count.textContent = '0';
    if (mpEl) mpEl.textContent = '';
    return;
  }
  const unit = _unitForMutationApi(raw);
  if (mpEl) mpEl.textContent = `MP ${unit.mp}/30`;
  const res = await api.mutationsEligible(unit);
  const eligible = res.ok && Array.isArray(res.data?.eligible) ? res.data.eligible : [];
  STATE.cachedEligibleMutations = eligible;
  if (count) count.textContent = String(eligible.length);
  if (list) {
    if (eligible.length === 0) {
      list.innerHTML = '<div class="nest-empty">Nessuna mutation eligible per questo PG.</div>';
    } else {
      list.innerHTML = '';
      for (const m of eligible) {
        const row = document.createElement('div');
        const canAfford = unit.mp >= Number(m.mp_cost ?? 0);
        row.className = `nest-mutation-row${canAfford ? '' : ' disabled'}`;
        const slot = m.body_slot ? escapeHtml(m.body_slot) : 'symbiotic';
        row.innerHTML = `
          <span class="mut-name">${escapeHtml(m.name_it || m.id)}</span>
          <span class="mut-tier">T${m.tier}</span>
          <span class="mut-slot">${slot}</span>
          <span class="mut-cost">${m.mp_cost} MP</span>
          <button type="button" class="mut-apply-btn" ${canAfford ? '' : 'disabled'} data-mut-id="${escapeHtml(m.id)}">Apply</button>
        `;
        const btn = row.querySelector('.mut-apply-btn');
        if (btn && canAfford) btn.addEventListener('click', () => handleApplyMutation(m.id));
        list.appendChild(row);
      }
    }
  }
  await refreshMutationBingo(unit);
}

async function refreshMutationBingo(unit) {
  if (typeof document === 'undefined') return;
  const wrap = document.getElementById('nest-mutation-bingo-wrap');
  if (!wrap) return;
  const res = await api.mutationsBingo(unit);
  const data = res.ok ? res.data || {} : {};
  STATE.cachedMutationsBingo = {
    archetypes: Array.isArray(data.archetypes) ? data.archetypes : [],
    counts: data.counts || {},
  };
  const cats = ['physiological', 'behavioral', 'sensorial', 'environmental', 'symbiotic'];
  const chips = cats
    .map((c) => {
      const n = Number(STATE.cachedMutationsBingo.counts[c] || 0);
      const completed = n >= 3;
      return `<span class="bingo-cat-chip${completed ? ' completed' : ''}">${escapeHtml(c)}: ${n}/3${completed ? ' ✓' : ''}</span>`;
    })
    .join('');
  const archetypes = STATE.cachedMutationsBingo.archetypes;
  const archHtml =
    archetypes.length > 0
      ? `<div style="margin-top:6px;color:#e8d4ff;font-size:0.78rem">Archetipo attivo: ${archetypes
          .map((a) => escapeHtml(a.label_it || a.archetype))
          .join(', ')}</div>`
      : '';
  wrap.innerHTML = `
    <div class="nest-mutation-bingo">
      <h4>🧬 Bingo categorie (3-of-a-kind = archetipo passive)</h4>
      <div class="bingo-counts">${chips}</div>
      ${archHtml}
    </div>
  `;
}

async function handleApplyMutation(mutationId) {
  const raw = _selectedMutationUnit();
  if (!raw) return;
  const unit = _unitForMutationApi(raw);
  setStatus(`Applico ${mutationId} → ${unit.id}…`);
  const res = await api.mutationsApply(unit, mutationId);
  const d = res.data || {};
  if (!res.ok || !d.success) {
    const reason = d.error || `HTTP ${res.status}`;
    setStatus(`✖ Apply fail: ${reason}`, 'err');
    return;
  }
  if (Array.isArray(d.unit?.trait_ids)) raw.trait_ids = d.unit.trait_ids;
  if (Array.isArray(d.unit?.applied_mutations)) raw.applied_mutations = d.unit.applied_mutations;
  if (typeof d.unit?.mp === 'number') raw.mp = d.unit.mp;
  setStatus(
    `✓ ${mutationId}: -${d.mp_spent} MP (now ${d.unit?.mp}/30)${d.derived_ability_id ? ' + ability ' + d.derived_ability_id : ''}`,
    'ok',
  );
  await refreshMutations();
}

export function openNestHub() {
  buildOverlay();
  if (STATE.overlayEl) STATE.overlayEl.classList.add('visible');
  refresh();
}

export function closeNestHub() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initNestHub({ getPartyMember, openCodex, buttonId = 'nest-open' } = {}) {
  STATE.getPartyMember = typeof getPartyMember === 'function' ? getPartyMember : () => null;
  STATE.openCodex = typeof openCodex === 'function' ? openCodex : () => {};
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

// Test surface (export DOM-free helpers for unit tests).
export const __nestHubInternal = {
  TAB_IDS,
  filterSquadMembers,
  filterMatingEligible,
  escapeHtml,
};
