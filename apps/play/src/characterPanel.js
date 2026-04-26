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

import { api } from './api.js';

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
  body.innerHTML = renderMbtiSection(actorVc) + renderEnneaSection(actorVc);
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
