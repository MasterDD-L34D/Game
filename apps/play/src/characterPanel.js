// Sprint 2026-04-26 telemetria VC compromesso — Phone tab "Carattere".
//
// Phone-side detailed personality view: 4 MBTI bars (E↔I / S↔N / T↔F / J↔P)
// + Ennea badge grid (5-9 archetypes triggered/not). Mostra dettaglio numerico
// solo per axes con confidence ≥ threshold (Disco Elysium phased reveal).
// TV side rimane senza numeri (vcTvHud only flash diegetici).
//
// Data sources:
//   - api.vc(sid)        → vcSnapshot.per_actor[uid].mbti_axes + ennea_archetypes
//                           + meta.events_count + per_actor[uid].mbti_revealed
//                           (additive da OD-013 Path A).
//   - api.thoughts(sid)  → thought cabinet (riusato per cross-link future)
//
// Pattern: open via header btn 🎭 Carattere → overlay polling /vc ogni open.
// Lifecycle: openCharacterPanel() / closeCharacterPanel() / initCharacterPanel(opts).
//
// Sprint v3.5 2026-04-27 — Conviction surfacing (Triangle Strategy pattern).
// Aggiunge `flashConvictionBadge(badge)` overlay animato 3s con color-coded
// background per asse. Riferimento `docs/research/triangle-strategy-transfer-plan.md`
// Mechanic 1 Proposal A. Backend produce badge via `buildConvictionBadges()`
// in mbtiSurface.js — vcSnapshot.per_actor[uid].conviction_badges (additive).

import { api } from './api.js';
import { renderPortraitPanel } from './portraitPanel.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getSelectedUnit: () => null,
  lastVc: null,
};

// Italian axis labels (allineato a apps/backend/services/mbtiSurface.js).
const AXIS_LABELS = {
  E_I: { label: 'Energia sociale', lo: 'Estroversione', hi: 'Introversione' },
  S_N: { label: 'Percezione', lo: 'Intuizione', hi: 'Sensazione' },
  T_F: { label: 'Decisione', lo: 'Sentimento', hi: 'Pensiero' },
  J_P: { label: 'Stile', lo: 'Percezione', hi: 'Giudizio' },
};

// Sprint v3.5 — Conviction badge color palette (mirror backend mbtiSurface.AXIS_COLORS).
const CONVICTION_COLORS = {
  E_I: { color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' }, // blue
  S_N: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }, // green
  T_F: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' }, // red
  J_P: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' }, // yellow
};

const CONVICTION_BADGE_DURATION_MS = 3000;
let _convictionBadgeTimer = null;
const _seenBadgeKeys = new Set();

// Ennea archetypes label/icon (italiano evocativo, no numeri).
const ENNEA_META = {
  'Riformatore(1)': { icon: '⚖️', label: 'Riformatore', desc: 'Setup metodico, alta precisione.' },
  'Coordinatore(2)': { icon: '🤝', label: 'Coordinatore', desc: 'Coesione di squadra.' },
  'Conquistatore(3)': { icon: '🔥', label: 'Conquistatore', desc: 'Aggressione e rischio.' },
  'Individualista(4)': {
    icon: '🌙',
    label: 'Individualista',
    desc: 'Resilienza in zona critica.',
  },
  'Architetto(5)': {
    icon: '🏛️',
    label: 'Architetto',
    desc: 'Strategia metodica, basso rischio.',
  },
  'Lealista(6)': { icon: '🛡️', label: 'Lealista', desc: 'Vigilanza e supporto attivo.' },
  'Esploratore(7)': { icon: '🧭', label: 'Esploratore', desc: 'Scoperta e mobilità.' },
  'Cacciatore(8)': { icon: '🏹', label: 'Cacciatore', desc: 'Mordi-e-fuggi mirato.' },
  'Stoico(9)': { icon: '🗿', label: 'Stoico', desc: 'Endurance sotto pressione.' },
};

function injectStyles() {
  if (document.getElementById('character-panel-styles')) return;
  const s = document.createElement('style');
  s.id = 'character-panel-styles';
  s.textContent = `
    .character-overlay {
      position: fixed; inset: 0; z-index: 9994;
      background: rgba(10, 12, 18, 0.86);
      display: none; align-items: flex-start; justify-content: center;
      padding: 24px 12px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .character-overlay.visible { display: flex; }
    .character-card {
      max-width: 720px; width: 100%; background: #11141c;
      border: 1px solid #2a3040; border-radius: 14px; padding: 20px 22px;
    }
    .character-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .character-head h2 { margin: 0; font-size: 1.2rem; color: #ffd166; }
    .character-head .unit-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #2a3040;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem;
    }
    .character-head .close-btn {
      background: transparent; border: none; color: #ef9a9a;
      cursor: pointer; font-size: 1.2rem;
    }
    .character-mbti {
      background: #0d1118; border: 1px solid #2a3040; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 16px;
    }
    .character-mbti h3 {
      font-size: 0.85rem; color: #8aa0c7; margin: 0 0 12px 0;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .character-mbti .mbti-type {
      font-size: 2rem; color: #ffd166; font-weight: 700;
      letter-spacing: 0.15em; margin-bottom: 12px;
    }
    .character-mbti .mbti-type.uncertain { color: #6b7790; opacity: 0.6; }
    .character-axis {
      display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .character-axis .axis-label {
      flex: 0 0 130px; font-size: 0.85rem; color: #c8cfdd;
    }
    .character-axis .axis-bar {
      flex: 1 1 auto; min-width: 140px; height: 14px;
      background: #1a1f2b; border-radius: 7px; position: relative;
      overflow: hidden;
    }
    .character-axis .axis-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #66d1fb 0%, #c6a0ff 100%);
      transition: width 0.3s ease-out;
    }
    .character-axis .axis-bar.hidden .axis-bar-fill {
      background: repeating-linear-gradient(
        45deg, #2a3040 0 8px, #1a1f2b 8px 16px
      );
      opacity: 0.5;
    }
    .character-axis .axis-letter {
      flex: 0 0 32px; font-size: 1.3rem; font-weight: 700;
      color: #ffd166; text-align: center;
    }
    .character-axis .axis-letter.hidden { color: #6b7790; }
    .character-axis .axis-conf {
      flex: 0 0 50px; font-size: 0.8rem; color: #8aa0c7;
      text-align: right;
    }
    .character-axis .axis-hint {
      flex: 1 1 100%; font-size: 0.78rem; color: #6b7790;
      font-style: italic; padding-left: 130px;
    }
    .character-ennea {
      background: #0d1118; border: 1px solid #2a3040; border-radius: 10px;
      padding: 14px 16px;
    }
    .character-ennea h3 {
      font-size: 0.85rem; color: #8aa0c7; margin: 0 0 12px 0;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .ennea-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    @media (max-width: 480px) {
      .ennea-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .ennea-badge {
      background: #1a1f2b; border: 1px solid #2a3040; border-radius: 8px;
      padding: 8px 10px; opacity: 0.4; transition: opacity 0.2s, transform 0.2s;
    }
    .ennea-badge.triggered {
      opacity: 1; border-color: #ffd166;
      box-shadow: 0 0 12px rgba(255, 209, 102, 0.3);
    }
    .ennea-badge .ennea-icon { font-size: 1.4rem; margin-right: 6px; }
    .ennea-badge .ennea-label {
      font-size: 0.85rem; color: #e8eaf0; font-weight: 600;
    }
    .ennea-badge .ennea-desc {
      font-size: 0.72rem; color: #8aa0c7; margin-top: 4px; line-height: 1.3;
    }
    .character-empty {
      padding: 24px 10px; text-align: center; color: #9aa3b5;
      font-style: italic;
    }
    /* Sprint v3.5 — Conviction badge (Triangle Strategy pattern) */
    .conviction-badge {
      position: fixed; top: 18%; left: 50%; transform: translateX(-50%) scale(0.9);
      z-index: 9996; pointer-events: none;
      padding: 14px 22px; border-radius: 14px;
      background: rgba(10, 12, 18, 0.92);
      border: 2px solid var(--cv-color, #ffd166);
      box-shadow: 0 0 24px var(--cv-glow, rgba(255, 209, 102, 0.5));
      color: #ffffff; font-family: Inter, system-ui, sans-serif;
      text-align: center; min-width: 180px; max-width: 320px;
      opacity: 0;
      transition: opacity 220ms ease-out, transform 220ms ease-out;
    }
    .conviction-badge.visible {
      opacity: 1; transform: translateX(-50%) scale(1);
    }
    .conviction-badge .cv-axis-label {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;
      color: #b8c1d4; margin-bottom: 4px;
    }
    .conviction-badge .cv-letter {
      font-size: 2.4rem; font-weight: 800; line-height: 1;
      color: var(--cv-color, #ffd166); text-shadow: 0 0 12px var(--cv-glow, rgba(255,209,102,0.6));
    }
    .conviction-badge .cv-pole-label {
      font-size: 0.95rem; font-weight: 600; margin-top: 6px;
      color: #e8eaf0;
    }
    .conviction-badge .cv-delta {
      font-size: 0.78rem; color: #8aa0c7; margin-top: 4px; font-style: italic;
    }
    /* QW-2 Spore Moderate — MP pool + archetype passives section. */
    .character-mp {
      background: #0d1118; border: 1px solid #2a3040; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 16px;
    }
    .character-mp h3 {
      font-size: 0.85rem; color: #8aa0c7; margin: 0 0 10px 0;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .mp-pool-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
    }
    .mp-pool-row .mp-label {
      flex: 0 0 90px; font-size: 0.85rem; color: #c8cfdd;
    }
    .mp-pool-bar {
      flex: 1 1 auto; height: 14px; background: #1a1f2b; border-radius: 7px;
      position: relative; overflow: hidden;
    }
    .mp-pool-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #a78bfa 0%, #c084fc 100%);
      transition: width 0.3s ease-out;
    }
    .mp-pool-row .mp-value {
      flex: 0 0 60px; font-size: 0.85rem; color: #c084fc;
      font-family: monospace; text-align: right;
    }
    .archetype-passives {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
    }
    .archetype-chip {
      background: #1a1f2b; border: 1px solid #c084fc; border-radius: 999px;
      padding: 4px 10px; font-size: 0.75rem; color: #e8d4ff;
    }
    .archetype-chip .arch-icon { margin-right: 4px; }
    .archetype-empty {
      font-size: 0.78rem; color: #6b7790; font-style: italic; padding-top: 4px;
    }
  `;
  document.head.appendChild(s);
}

function buildOverlay() {
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const wrap = document.createElement('div');
  wrap.className = 'character-overlay';
  wrap.innerHTML = `
    <div class="character-card">
      <div class="character-head">
        <h2>🎭 Carattere</h2>
        <span class="unit-chip" data-role="unit-chip">—</span>
        <button class="close-btn" data-role="close" aria-label="Chiudi">✕</button>
      </div>
      <div data-role="body"></div>
    </div>
  `;
  wrap.addEventListener('click', (ev) => {
    if (ev.target === wrap) closeCharacterPanel();
  });
  wrap.querySelector('[data-role="close"]').addEventListener('click', closeCharacterPanel);
  document.body.appendChild(wrap);
  STATE.overlayEl = wrap;
  return wrap;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

// Map revealed array → axis lookup ({E_I: {letter, value, confidence, label, axis_label}, ...}).
function buildRevealedMap(mbtiRevealed) {
  const out = { revealed: {}, hidden: {} };
  if (!mbtiRevealed) return out;
  for (const r of mbtiRevealed.revealed || []) {
    out.revealed[r.axis] = r;
  }
  for (const h of mbtiRevealed.hidden || []) {
    out.hidden[h.axis] = h;
  }
  return out;
}

function renderMbtiSection(actorVc) {
  const axes = actorVc?.mbti_axes || {};
  // mbti_revealed è additive piggyback dal backend (OD-013 Path A).
  const revealedMap = buildRevealedMap(actorVc?.mbti_revealed);
  const mbtiType = actorVc?.mbti_type || null;
  const typeDisplay = mbtiType
    ? `<div class="mbti-type">${escapeHtml(mbtiType)}</div>`
    : '<div class="mbti-type uncertain">????</div>';

  const axisRows = ['E_I', 'S_N', 'T_F', 'J_P']
    .map((axis) => {
      const labels = AXIS_LABELS[axis];
      const entry = axes[axis];
      const revealed = revealedMap.revealed[axis];
      const hidden = revealedMap.hidden[axis];
      const value = entry && Number.isFinite(entry.value) ? Number(entry.value) : 0.5;
      const pct = Math.round(value * 100);
      const isRevealed = !!revealed;
      const letter = isRevealed ? revealed.letter : '?';
      const confidence = isRevealed
        ? Math.round((revealed.confidence || 0) * 100)
        : Math.round(((hidden && hidden.confidence) || 0) * 100);
      const hintHtml =
        !isRevealed && hidden
          ? `<div class="axis-hint">${escapeHtml(hidden.hint || '')}</div>`
          : '';
      const barCls = isRevealed ? 'axis-bar' : 'axis-bar hidden';
      const letterCls = isRevealed ? 'axis-letter' : 'axis-letter hidden';
      return `
        <div class="character-axis">
          <div class="axis-label">${escapeHtml(labels.label)}<br><span style="font-size:0.7rem;color:#6b7790">${escapeHtml(labels.lo)} ↔ ${escapeHtml(labels.hi)}</span></div>
          <div class="${barCls}"><div class="axis-bar-fill" style="width:${pct}%"></div></div>
          <div class="${letterCls}">${escapeHtml(letter)}</div>
          <div class="axis-conf">${confidence}%</div>
          ${hintHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div class="character-mbti">
      <h3>MBTI — Tipo Cognitivo</h3>
      ${typeDisplay}
      ${axisRows}
    </div>
  `;
}

function renderEnneaSection(actorVc) {
  const archetypes = Array.isArray(actorVc?.ennea_archetypes) ? actorVc.ennea_archetypes : [];
  if (archetypes.length === 0) {
    return `
      <div class="character-ennea">
        <h3>Ennea — Archetipi</h3>
        <div class="character-empty">Nessun archetipo ancora valutato.</div>
      </div>
    `;
  }
  const cards = archetypes
    .map((a) => {
      const meta = ENNEA_META[a.id] || { icon: '◯', label: a.id, desc: '' };
      const cls = a.triggered ? 'ennea-badge triggered' : 'ennea-badge';
      return `
        <div class="${cls}" data-archetype="${escapeHtml(a.id)}">
          <span class="ennea-icon">${meta.icon}</span><span class="ennea-label">${escapeHtml(meta.label)}</span>
          <div class="ennea-desc">${escapeHtml(meta.desc)}</div>
        </div>
      `;
    })
    .join('');
  return `
    <div class="character-ennea">
      <h3>Ennea — Archetipi (acceso = manifestato)</h3>
      <div class="ennea-grid">${cards}</div>
    </div>
  `;
}

// QW-2 — Spore Moderate MP pool + archetype passive section.
// Reads `unit.mp` (default 5 backend hydration) + `unit._archetype_meta`
// (hydrated da applyMutationBingoToUnit ogni session /start).
function renderMpSection(unit) {
  const mp = Number(unit?.mp ?? 0);
  const cap = 30; // MP_POOL_MAX da mpTracker.js
  const pct = Math.min(100, (mp / cap) * 100);
  const archetypes = Array.isArray(unit?._archetype_meta) ? unit._archetype_meta : [];
  const archetypeIcons = {
    tank_plus: '🛡',
    ambush_plus: '🗡',
    scout_plus: '👁',
    adapter_plus: '🌿',
    alpha_plus: '⭐',
  };
  const chips =
    archetypes.length === 0
      ? '<div class="archetype-empty">Nessun archetipo attivo (servono ≥3 mutation stessa categoria).</div>'
      : `<div class="archetype-passives">${archetypes
          .map(
            (a) =>
              `<span class="archetype-chip" title="${escapeHtml(a.passive_token || '')}"><span class="arch-icon">${archetypeIcons[a.archetype] || '◆'}</span>${escapeHtml(a.label_it || a.archetype)}</span>`,
          )
          .join('')}</div>`;
  return `
    <div class="character-mp">
      <h3>Mutation Points &amp; Archetipi (Spore)</h3>
      <div class="mp-pool-row">
        <div class="mp-label">MP pool</div>
        <div class="mp-pool-bar"><div class="mp-pool-bar-fill" style="width:${pct}%"></div></div>
        <div class="mp-value">${mp}/${cap}</div>
      </div>
      ${chips}
    </div>
  `;
}

function render(unit, actorVc) {
  const overlay = buildOverlay();
  const body = overlay.querySelector('[data-role="body"]');
  const chip = overlay.querySelector('[data-role="unit-chip"]');
  chip.textContent = unit ? `${unit.label || unit.id}` : 'nessun PG selezionato';
  if (!unit || !actorVc) {
    body.innerHTML =
      '<div class="character-empty">Seleziona un PG per vedere il suo profilo carattere.</div>';
    return;
  }
  // Sprint β Visual UX 2026-04-28 — CK3 portrait slot above MP section.
  body.innerHTML =
    '<div data-role="portrait-slot"></div>' +
    renderMpSection(unit) +
    renderMbtiSection(actorVc) +
    renderEnneaSection(actorVc);
  const portraitSlot = body.querySelector('[data-role="portrait-slot"]');
  if (portraitSlot) renderPortraitPanel(portraitSlot, unit);
}

/**
 * Sprint v3.5 — Flash conviction badge (Triangle Strategy pattern).
 * Shows a color-coded badge for ~3s then fades. Idempotent per badge "key"
 * (axis+letter+value) to prevent re-flash on repeated polls of same vc state.
 *
 * @param {object} badge - {axis, letter, label, axis_label, color, color_name, confidence, value, delta?}
 * @param {object} [opts]
 * @param {number} [opts.duration=3000]
 * @param {boolean} [opts.force=false] - bypass dedup
 */
export function flashConvictionBadge(badge, opts = {}) {
  if (!badge || !badge.axis || !badge.letter) return;
  injectStyles();

  const dedupKey = `${badge.axis}:${badge.letter}:${(badge.value || 0).toFixed(2)}`;
  if (!opts.force && _seenBadgeKeys.has(dedupKey)) return;
  _seenBadgeKeys.add(dedupKey);

  // Cap dedup memory (last 32 badge)
  if (_seenBadgeKeys.size > 32) {
    const first = _seenBadgeKeys.values().next().value;
    _seenBadgeKeys.delete(first);
  }

  const colors = CONVICTION_COLORS[badge.axis] || {
    color: '#ffd166',
    glow: 'rgba(255,209,102,0.5)',
  };

  // Re-use existing element if present, else create new
  let el = document.getElementById('conviction-badge-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'conviction-badge-overlay';
    el.className = 'conviction-badge';
    document.body.appendChild(el);
  }
  el.style.setProperty('--cv-color', badge.color || colors.color);
  el.style.setProperty('--cv-glow', colors.glow);

  const deltaHtml =
    badge.delta != null && Number.isFinite(badge.delta)
      ? `<div class="cv-delta">${badge.delta > 0 ? '↑' : '↓'} ${Math.abs(badge.delta).toFixed(2)}</div>`
      : '';

  el.innerHTML = `
    <div class="cv-axis-label">${escapeHtml(badge.axis_label || badge.axis)}</div>
    <div class="cv-letter">${escapeHtml(badge.letter)}</div>
    <div class="cv-pole-label">${escapeHtml(badge.label || '')}</div>
    ${deltaHtml}
  `;

  // Force reflow for transition trigger
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.classList.add('visible');

  if (_convictionBadgeTimer) {
    clearTimeout(_convictionBadgeTimer);
  }
  const duration = Number.isFinite(opts.duration) ? opts.duration : CONVICTION_BADGE_DURATION_MS;
  _convictionBadgeTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, duration);
}

/** Reset internal dedup cache. Test-only helper. */
export function _resetConvictionBadgeCache() {
  _seenBadgeKeys.clear();
  if (_convictionBadgeTimer) {
    clearTimeout(_convictionBadgeTimer);
    _convictionBadgeTimer = null;
  }
}

/**
 * Auto-flash conviction badges from a vcSnapshot actor entry, se presente
 * `conviction_badges` (additive backend payload Sprint v3.5).
 *
 * @param {object} actorVc - per_actor[uid] entry.
 */
export function flashConvictionBadgesFromActor(actorVc) {
  if (!actorVc || !Array.isArray(actorVc.conviction_badges)) return;
  // Stagger multipli badge: trigger primo subito, prossimi a delay 800ms
  actorVc.conviction_badges.forEach((badge, idx) => {
    setTimeout(() => flashConvictionBadge(badge), idx * 800);
  });
}

export async function openCharacterPanel() {
  const overlay = buildOverlay();
  overlay.classList.add('visible');
  const sid = STATE.getSessionId();
  const unit = STATE.getSelectedUnit();
  if (!sid) {
    render(unit, null);
    return;
  }
  const res = await api.vc(sid);
  if (!res.ok || !res.data) {
    render(unit, null);
    return;
  }
  STATE.lastVc = res.data;
  const uid = unit?.id || null;
  const entry = uid ? res.data.per_actor?.[uid] : null;
  render(unit, entry);
  // Sprint v3.5 — surface conviction badges se presenti nel payload
  if (entry) flashConvictionBadgesFromActor(entry);
}

export function closeCharacterPanel() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initCharacterPanel(opts = {}) {
  STATE.getSessionId = opts.getSessionId || STATE.getSessionId;
  STATE.getSelectedUnit = opts.getSelectedUnit || STATE.getSelectedUnit;
  const btn = document.getElementById('character-open');
  if (btn) btn.addEventListener('click', () => openCharacterPanel());
}
