// P4 Thought Cabinet — overlay UI.
//
// Fetches /api/session/:sid/thoughts on open, groups unlocked thoughts by
// axis (E_I / S_N / J_P) for the selected unit, renders progressive
// tier cards (tier 1/2/3) with title + flavor + effect hint.
//
// Depends on: api.thoughts(sid) + getSelectedUnit.

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getSelectedUnit: () => null,
  lastData: null,
  catalog: null,
};

const AXIS_LABELS = {
  E_I: 'Estroversione ⇄ Introversione',
  S_N: 'Sensazione ⇄ Intuizione',
  J_P: 'Giudicare ⇄ Percepire',
};

function injectStyles() {
  if (document.getElementById('thoughts-panel-styles')) return;
  const s = document.createElement('style');
  s.id = 'thoughts-panel-styles';
  s.textContent = `
    .thoughts-overlay {
      position: fixed; inset: 0; z-index: 9995;
      background: rgba(10, 12, 18, 0.82);
      display: none; align-items: flex-start; justify-content: center;
      padding: 32px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .thoughts-overlay.visible { display: flex; }
    .thoughts-card {
      max-width: 900px; width: 100%; background: #11141c;
      border: 1px solid #2a3040; border-radius: 14px; padding: 22px 24px;
    }
    .thoughts-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
    }
    .thoughts-head h2 { margin: 0; font-size: 1.25rem; color: #c6a0ff; }
    .thoughts-head .unit-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #2a3040;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem;
    }
    .thoughts-head .close-btn {
      background: transparent; border: none; color: #ef9a9a;
      cursor: pointer; font-size: 1.2rem;
    }
    .thoughts-empty {
      padding: 28px 10px; text-align: center; color: #9aa3b5;
      font-style: italic;
    }
    .slot-counter {
      padding: 12px 16px; margin-bottom: 14px;
      border: 1px solid #3a3050; border-radius: 8px;
      background: #1a1626;
      color: #d8c7ff; font-size: 1rem;
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .slot-counter strong {
      color: #ffd166; font-size: 1.1rem;
    }
    .slot-counter .slot-breakdown {
      color: #9aa3b5; font-size: 0.9rem;
    }
    .thoughts-axis {
      margin-bottom: 18px; border: 1px solid #2a3040; border-radius: 10px;
      padding: 14px 16px; background: #0d1118;
    }
    .thoughts-axis-head {
      font-size: 0.9rem; color: #8aa0c7; margin-bottom: 10px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .thoughts-tiers { display: flex; gap: 10px; flex-wrap: wrap; }
    .thought-card {
      flex: 1 1 240px; min-width: 240px; background: #1a1f2b;
      border: 1px solid #2a3040; border-radius: 8px; padding: 10px 12px;
    }
    .thought-card.locked { opacity: 0.32; filter: grayscale(0.6); }
    .thought-card.tier-1 { border-left: 3px solid #66d1fb; }
    .thought-card.tier-2 { border-left: 3px solid #ffc66b; }
    .thought-card.tier-3 { border-left: 3px solid #ff7a9a; }
    .thought-title {
      display: flex; gap: 6px; align-items: baseline;
      font-weight: 600; color: #e8eaf0; margin-bottom: 4px;
    }
    .thought-title .tier-badge {
      font-size: 0.72rem; color: #8aa0c7;
    }
    .thought-title .pole-badge {
      margin-left: auto; background: #0b0d12; border-radius: 4px;
      padding: 1px 6px; font-size: 0.75rem; color: #c6a0ff;
    }
    .thought-flavor {
      font-size: 0.85rem; color: #c8cfdd; margin-bottom: 6px;
      line-height: 1.35;
    }
    .thought-hint {
      font-size: 0.75rem; color: #8aa0c7; font-style: italic;
    }
    .thought-card.newly {
      animation: thought-unlock 1.8s ease-out;
      box-shadow: 0 0 18px rgba(198, 160, 255, 0.35);
    }
    @keyframes thought-unlock {
      0% { transform: scale(0.92); box-shadow: 0 0 0 rgba(198, 160, 255, 0); }
      40% { transform: scale(1.02); box-shadow: 0 0 24px rgba(198, 160, 255, 0.55); }
      100% { transform: scale(1); box-shadow: 0 0 18px rgba(198, 160, 255, 0.35); }
    }
  `;
  document.head.appendChild(s);
}

function buildOverlay() {
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const wrap = document.createElement('div');
  wrap.className = 'thoughts-overlay';
  wrap.innerHTML = `
    <div class="thoughts-card">
      <div class="thoughts-head">
        <h2>🧠 Thought Cabinet</h2>
        <span class="unit-chip" data-role="unit-chip">—</span>
        <button class="close-btn" data-role="close" aria-label="Chiudi">✕</button>
      </div>
      <div data-role="body"></div>
    </div>
  `;
  wrap.addEventListener('click', (ev) => {
    if (ev.target === wrap) closeThoughtsPanel();
  });
  wrap.querySelector('[data-role="close"]').addEventListener('click', closeThoughtsPanel);
  document.body.appendChild(wrap);
  STATE.overlayEl = wrap;
  return wrap;
}

// Load catalog once (small YAML inlined — fetch from backend /thoughts provides IDs only,
// so we mirror a minimal catalog via an endpoint? No — we expose via thoughts response).
// Simplification: build static catalog map client-side keyed by thought id.
const CLIENT_CATALOG = buildClientCatalog();

function buildClientCatalog() {
  // Mirror of data/core/thoughts/mbti_thoughts.yaml (titles + pole + tier + flavor).
  // Kept in sync manually; future iteration can serve catalog via /api/thoughts/catalog.
  return {
    e_voce_collettiva: [
      'E_I',
      'E',
      1,
      'Voce Collettiva',
      'Parla ai compagni anche senza necessità tattica.',
      'Preferisce ingaggi ravvicinati.',
    ],
    e_scintilla_carisma: [
      'E_I',
      'E',
      2,
      'Scintilla di Carisma',
      'Ogni azione è spettacolo. Forzare il fronte diventa istinto.',
      'Intraprende rischi visibili.',
    ],
    e_campione_folla: [
      'E_I',
      'E',
      3,
      'Campione della Folla',
      "Il silenzio è l'unico nemico. Sempre in prima linea.",
      'Unlock job aggressivi.',
    ],
    i_osservatore: [
      'E_I',
      'I',
      1,
      'Osservatore',
      'Preferisce studiare prima di impegnarsi.',
      'Ingaggi distanti; valuta prima.',
    ],
    i_calcolo_silente: [
      'E_I',
      'I',
      2,
      'Calcolo Silente',
      'Ogni intervento pesato. Evita il caos.',
      'Economia azioni alta.',
    ],
    i_lupo_solitario: [
      'E_I',
      'I',
      3,
      'Lupo Solitario',
      'Opera meglio ai margini, lontano dagli altri.',
      'Unlock furtivo/esploratore.',
    ],
    n_intuizione_terrena: [
      'S_N',
      'N',
      1,
      'Intuizione Terrena',
      'Sente pattern nascosti nel biome.',
      'Alta esplorazione.',
    ],
    n_pioniere_possibile: [
      'S_N',
      'N',
      2,
      'Pioniere del Possibile',
      'Inventa soluzioni che non esistono nel manuale.',
      'Preferisce evade/flank.',
    ],
    n_visionario: [
      'S_N',
      'N',
      3,
      'Visionario',
      'Vede mosse 3 round avanti.',
      'Unlock esploratore/tattico.',
    ],
    s_occhio_pratico: [
      'S_N',
      'S',
      1,
      'Occhio Pratico',
      'Si fida di ciò che può toccare.',
      'Setup ratio alto.',
    ],
    s_metodologia_ferro: [
      'S_N',
      'S',
      2,
      'Metodologia di Ferro',
      'Setup prima di tutto; non improvvisa.',
      'Massimizza copertura.',
    ],
    s_veterano_terreno: [
      'S_N',
      'S',
      3,
      'Veterano del Terreno',
      'Ogni tile nota, ogni copertura memorizzata.',
      'Unlock sentinella/controllore.',
    ],
    p_adattatore: [
      'J_P',
      'P',
      1,
      'Adattatore',
      'Cambia piano al volo senza attrito.',
      'Intent flessibile.',
    ],
    p_improvvisatore: [
      'J_P',
      'P',
      2,
      'Improvvisatore',
      "Il piano è suggerimento; l'istante è legge.",
      'Reaction penalty ridotta.',
    ],
    p_anima_selvaggia: [
      'J_P',
      'P',
      3,
      'Anima Selvaggia',
      'Non pianifica. Reagisce. Vince.',
      'Unlock furtivo/assaltatore.',
    ],
    j_disciplina: [
      'J_P',
      'J',
      1,
      'Disciplina',
      'Rispetta il piano anche sotto pressione.',
      'Bonus mantenimento intent.',
    ],
    j_architetto_round: [
      'J_P',
      'J',
      2,
      'Architetto del Round',
      'Ogni mossa incastonata.',
      'Preferisce round planning.',
    ],
    j_maestro_ordine: [
      'J_P',
      'J',
      3,
      'Maestro di Ordine',
      'Il caos del nemico non lo raggiunge mai.',
      'Unlock tattico/controllore.',
    ],
  };
}

function renderAxis(axis, unlockedSet, newlySet) {
  const entries = Object.entries(CLIENT_CATALOG)
    .filter(([, v]) => v[0] === axis)
    .map(([id, v]) => ({
      id,
      axis: v[0],
      pole: v[1],
      tier: v[2],
      title: v[3],
      flavor: v[4],
      hint: v[5],
    }))
    .sort((a, b) => {
      // group by pole then tier
      if (a.pole !== b.pole) return a.pole < b.pole ? -1 : 1;
      return a.tier - b.tier;
    });
  const cards = entries
    .map((t) => {
      const isUnlocked = unlockedSet.has(t.id);
      const isNewly = newlySet.has(t.id);
      const cls = [
        'thought-card',
        `tier-${t.tier}`,
        isUnlocked ? '' : 'locked',
        isNewly ? 'newly' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const title = isUnlocked ? t.title : '???';
      const flavor = isUnlocked ? t.flavor : '— ancora celato —';
      const hint = isUnlocked ? `<div class="thought-hint">${escapeHtml(t.hint)}</div>` : '';
      return `
        <div class="${cls}">
          <div class="thought-title">
            <span>${escapeHtml(title)}</span>
            <span class="tier-badge">T${t.tier}</span>
            <span class="pole-badge">${t.pole}</span>
          </div>
          <div class="thought-flavor">${escapeHtml(flavor)}</div>
          ${hint}
        </div>
      `;
    })
    .join('');
  return `
    <div class="thoughts-axis">
      <div class="thoughts-axis-head">${escapeHtml(AXIS_LABELS[axis])}</div>
      <div class="thoughts-tiers">${cards}</div>
    </div>
  `;
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

function render(unit, perActorEntry) {
  const overlay = buildOverlay();
  const body = overlay.querySelector('[data-role="body"]');
  const chip = overlay.querySelector('[data-role="unit-chip"]');
  chip.textContent = unit ? `${unit.label || unit.id}` : 'nessun PG selezionato';
  if (!unit || !perActorEntry) {
    body.innerHTML =
      '<div class="thoughts-empty">Seleziona un PG per vedere i suoi thoughts sbloccati.</div>';
    return;
  }
  const unlocked = new Set(perActorEntry.unlocked || []);
  const newly = new Set(perActorEntry.newly || []);
  // GAP-04 (ui-design-illuminator audit 2026-04-25): slot counter visible.
  // Backend already ships slots_max + slots_used + internalized + researching;
  // Phase 2 PR #1769. Cold-start player must know "can I research now?".
  const slotsMax = Number(perActorEntry.slots_max || 3);
  const slotsUsed = Number(perActorEntry.slots_used || 0);
  const researchingCount = Array.isArray(perActorEntry.researching)
    ? perActorEntry.researching.length
    : 0;
  const internalizedCount = Array.isArray(perActorEntry.internalized)
    ? perActorEntry.internalized.length
    : 0;
  const slotIcons = Array.from({ length: slotsMax })
    .map((_, i) => (i < slotsUsed ? '●' : '○'))
    .join('');
  const slotCounter = `
    <div class="slot-counter" role="status" aria-label="Slot Thought Cabinet">
      Slots ${slotIcons} <strong>${slotsUsed}/${slotsMax}</strong>
      <span class="slot-breakdown">· 🧠 ${internalizedCount} internalizzati · 🔬 ${researchingCount} in ricerca</span>
    </div>
  `;
  if (unlocked.size === 0) {
    body.innerHTML = `
      ${slotCounter}
      <div class="thoughts-empty">
        Nessun thought ancora sbloccato. Gioca round con pattern MBTI consistente
        su E_I / S_N / J_P.
      </div>
      ${['E_I', 'S_N', 'J_P'].map((a) => renderAxis(a, unlocked, newly)).join('')}
    `;
    return;
  }
  body.innerHTML =
    slotCounter + ['E_I', 'S_N', 'J_P'].map((a) => renderAxis(a, unlocked, newly)).join('');
}

export async function openThoughtsPanel() {
  const overlay = buildOverlay();
  overlay.classList.add('visible');
  const sid = STATE.getSessionId();
  const unit = STATE.getSelectedUnit();
  if (!sid) {
    render(unit, null);
    return;
  }
  const res = await api.thoughts(sid);
  if (!res.ok || !res.data) {
    render(unit, null);
    return;
  }
  STATE.lastData = res.data;
  const uid = unit?.id || null;
  const entry = uid ? res.data.per_actor?.[uid] : null;
  render(unit, entry);
}

export function closeThoughtsPanel() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initThoughtsPanel(opts = {}) {
  STATE.getSessionId = opts.getSessionId || STATE.getSessionId;
  STATE.getSelectedUnit = opts.getSelectedUnit || STATE.getSelectedUnit;
  const btn = document.getElementById('thoughts-open');
  if (btn) btn.addEventListener('click', () => openThoughtsPanel());
}
