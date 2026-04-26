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
  // Sprint D — lineage tab state (cached tribe + currently expanded lineage).
  cachedTribes: [],
  expandedLineageId: null,
  expandedChain: [],
  selectedUnitId: null,
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
        <h3>Mating roll (seleziona 1 NPG)</h3>
        <div class="nest-setup-row">
          <button type="button" class="nest-btn" id="nest-mating-btn" disabled>
            🧬 Tenta riproduzione
          </button>
          <span id="nest-mating-hint" style="font-size:0.8rem;color:#8891a3"></span>
        </div>
      </div>
      <div class="nest-section" data-tab="lineage" id="nest-lineage-section">
        <h3>🧬 Lignaggio &amp; Tribù emergent (<span id="nest-tribes-count">0</span>)</h3>
        <div class="nest-tribe-list" id="nest-tribe-list">
          <div class="nest-empty">
            Nessuna tribù emerge ancora (servono ≥3 unità con lo stesso lineage).
          </div>
        </div>
        <div id="nest-lineage-tree-wrap"></div>
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
  STATE.overlayEl = overlay;
  return overlay;
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
  renderNpcs(STATE.cachedNpcs);
  // Sprint D — fetch tribe emergent in parallel; failure non-fatal.
  await refreshLineage().catch(() => {});
  setStatus(
    `${STATE.cachedNpcs.length} NPG · nido Lv ${STATE.cachedNest.level}${STATE.cachedNest.biome ? ' (' + STATE.cachedNest.biome + ')' : ''} · ${STATE.cachedTribes.length} tribù`,
    'ok',
  );
}

export function openNestHub() {
  buildOverlay();
  if (STATE.overlayEl) STATE.overlayEl.classList.add('visible');
  refresh();
}

export function closeNestHub() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initNestHub({ getPartyMember, buttonId = 'nest-open' } = {}) {
  STATE.getPartyMember = typeof getPartyMember === 'function' ? getPartyMember : () => null;
  buildOverlay();
  if (typeof document === 'undefined') {
    return { openNestHub, closeNestHub, refresh };
  }
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.addEventListener('click', openNestHub);
  }
  return { openNestHub, closeNestHub, refresh };
}
