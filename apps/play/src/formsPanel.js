// M12 Phase C — Forms evolution panel.
//
// Overlay modal listing 16 MBTI forms for the currently selected PG:
//   - Confidence bar (distance → 0..1 score)
//   - Eligibility chip + reasons if ineligible
//   - Evolve button → POST /api/v1/forms/session/:sid/:uid/evolve
//   - Pack roll preview → POST /api/v1/forms/pack/roll
//
// Exports:
//   initFormsPanel({ getSessionId, getSelectedUnit, getVcSnapshot }) — wire HUD
//
// Consumer: apps/play/src/main.js attaches a header button '🧬 Evo'.
// Ref ADR-2026-04-23-m12-phase-a.

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getSelectedUnit: () => null,
  getVcSnapshot: () => ({}),
  onEvolveSuccess: null,
  lastUnitId: null,
  cachedOptions: null,
  lastPackRoll: null,
};

// ---------------------------------------------------------------------------
// VC axes inference (from game state — fallback to neutral 0.5).
// ---------------------------------------------------------------------------
export function inferVcAxes(vcSnapshot) {
  const axes = vcSnapshot?.mbti_axes || vcSnapshot?.axes || {};
  const keys = ['E_I', 'S_N', 'T_F', 'J_P'];
  const out = {};
  for (const k of keys) {
    const entry = axes[k];
    if (entry && typeof entry.value === 'number') {
      out[k] = { value: entry.value };
    } else if (typeof entry === 'number') {
      out[k] = { value: entry };
    } else {
      out[k] = { value: 0.5 };
    }
  }
  return { mbti_axes: out };
}

// ---------------------------------------------------------------------------
// Overlay DOM.
// ---------------------------------------------------------------------------
function injectStyles() {
  if (document.getElementById('forms-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'forms-panel-styles';
  style.textContent = `
    .forms-overlay {
      position: fixed; inset: 0; z-index: 9996;
      background: rgba(11, 13, 18, 0.78);
      display: none; align-items: flex-start; justify-content: center;
      padding: 32px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .forms-overlay.visible { display: flex; }
    .forms-card {
      max-width: 880px; width: 100%; background: #151922;
      border: 1px solid #2a3040; border-radius: 14px; padding: 22px 24px;
    }
    .forms-card-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    }
    .forms-card-head h2 { margin: 0; font-size: 1.25rem; color: #66d1fb; }
    .forms-card-head .unit-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #2a3040;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem;
    }
    .forms-card-head .close-btn {
      background: transparent; border: none; color: #ef9a9a;
      cursor: pointer; font-size: 1.2rem;
    }
    .forms-meta {
      display: flex; gap: 14px; flex-wrap: wrap;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 14px; font-size: 0.85rem;
    }
    .forms-meta strong { color: #ffb74d; }
    .forms-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .form-entry {
      background: #1d2230; border: 1px solid #2a3040; border-radius: 10px;
      padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
    }
    .form-entry.eligible { border-color: #66bb6a; }
    .form-entry.ineligible { opacity: 0.72; }
    .form-entry .row-main {
      display: flex; align-items: baseline; gap: 8px;
    }
    .form-entry .form-id {
      font-weight: 700; color: #ffb74d; letter-spacing: 0.5px;
    }
    .form-entry .form-label { color: #e8eaf0; font-size: 0.9rem; }
    .form-entry .form-temp {
      margin-left: auto; font-size: 0.7rem; color: #8891a3;
      text-transform: uppercase;
    }
    .form-entry .confidence-bar {
      background: #0b0d12; border-radius: 4px; height: 6px; overflow: hidden;
      position: relative;
    }
    .form-entry .confidence-bar .fill {
      height: 100%; background: #4fc3f7; transition: width 0.2s;
    }
    .form-entry.eligible .confidence-bar .fill { background: #66bb6a; }
    .form-entry .row-bottom {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.78rem; color: #8891a3;
    }
    .form-entry .reasons { color: #ef9a9a; font-size: 0.75rem; }
    .form-entry button.evolve-btn {
      background: #66bb6a; color: #001014; border: none;
      border-radius: 6px; padding: 6px 10px; font-weight: 700;
      cursor: pointer; font-size: 0.85rem;
    }
    .form-entry button.evolve-btn:disabled {
      background: #2a3040; color: #8891a3; cursor: not-allowed;
    }
    .forms-pack-row {
      margin-top: 16px; display: flex; gap: 10px; align-items: center;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 10px 14px;
    }
    .forms-pack-row button {
      background: #ffb74d; color: #201000; border: none;
      border-radius: 6px; padding: 8px 12px; font-weight: 700; cursor: pointer;
    }
    .forms-pack-row .roll-result {
      flex: 1; font-family: monospace; font-size: 0.85rem; color: #e8eaf0;
    }
    .forms-status {
      margin-top: 10px; min-height: 1.2em; font-size: 0.85rem;
    }
    .forms-status.ok { color: #66bb6a; }
    .forms-status.err { color: #ef5350; }
  `;
  document.head.appendChild(style);
}

function buildOverlay() {
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const overlay = document.createElement('div');
  overlay.id = 'forms-overlay';
  overlay.className = 'forms-overlay';
  overlay.innerHTML = `
    <div class="forms-card" role="dialog" aria-label="Evoluzione Form">
      <div class="forms-card-head">
        <h2>🧬 Evoluzione Form</h2>
        <span class="unit-chip" id="forms-unit-chip">—</span>
        <button type="button" class="close-btn" id="forms-close">✕</button>
      </div>
      <div class="forms-meta" id="forms-meta">
        <span><strong>PE:</strong> <span id="forms-meta-pe">—</span></span>
        <span><strong>Form attuale:</strong> <span id="forms-meta-current">—</span></span>
        <span><strong>Cooldown:</strong> <span id="forms-meta-cd">—</span></span>
        <span><strong>Evolve count:</strong> <span id="forms-meta-count">—</span></span>
      </div>
      <div class="forms-grid" id="forms-grid"></div>
      <div class="forms-pack-row">
        <button type="button" id="forms-pack-btn">🎲 Roll pack</button>
        <span class="roll-result" id="forms-pack-result">Nessun roll effettuato.</span>
      </div>
      <div class="forms-status" id="forms-status"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#forms-close').addEventListener('click', closeFormsPanel);
  overlay.querySelector('#forms-pack-btn').addEventListener('click', handlePackRoll);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeFormsPanel();
  });
  STATE.overlayEl = overlay;
  return overlay;
}

function setStatus(text, kind = '') {
  const el = document.getElementById('forms-status');
  if (!el) return;
  el.textContent = text || '';
  el.className = `forms-status${kind ? ' ' + kind : ''}`;
}

function renderMeta(state) {
  const peEl = document.getElementById('forms-meta-pe');
  const curEl = document.getElementById('forms-meta-current');
  const cdEl = document.getElementById('forms-meta-cd');
  const countEl = document.getElementById('forms-meta-count');
  if (peEl) peEl.textContent = String(state?.pe ?? 0);
  if (curEl) curEl.textContent = state?.current_form_id ?? '—';
  if (cdEl)
    cdEl.textContent =
      state?.last_evolve_round !== null && state?.last_evolve_round !== undefined
        ? `ultima round ${state.last_evolve_round}`
        : '—';
  if (countEl) countEl.textContent = String(state?.evolve_count ?? 0);
}

function renderOptions(options) {
  const grid = document.getElementById('forms-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!Array.isArray(options) || options.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;color:#8891a3">Nessun form disponibile.</div>';
    return;
  }
  for (const opt of options) {
    const entry = document.createElement('div');
    entry.className = `form-entry ${opt.eligible ? 'eligible' : 'ineligible'}`;
    const pct = Math.max(0, Math.min(1, opt.confidence_to_target || 0));
    const reasonTxt = (opt.reasons || []).join(', ');
    entry.innerHTML = `
      <div class="row-main">
        <span class="form-id">${opt.target_form_id}</span>
        <span class="form-label">${opt.target_label || ''}</span>
        <span class="form-temp">${opt.target_temperament || ''}</span>
      </div>
      <div class="confidence-bar"><div class="fill" style="width:${(pct * 100).toFixed(0)}%"></div></div>
      <div class="row-bottom">
        <span>conf ${(pct * 100).toFixed(0)}% · PE ${opt.pe_cost}/${opt.pe_available}</span>
        <button type="button" class="evolve-btn" data-form="${opt.target_form_id}" ${opt.eligible ? '' : 'disabled'}>Evolvi</button>
      </div>
      ${reasonTxt ? `<div class="reasons">✖ ${reasonTxt}</div>` : ''}
    `;
    entry.querySelector('.evolve-btn').addEventListener('click', () => handleEvolveClick(opt));
    grid.appendChild(entry);
  }
}

async function refresh() {
  const sid = STATE.getSessionId();
  const unit = STATE.getSelectedUnit();
  const vc = STATE.getVcSnapshot() || {};
  if (!sid) {
    setStatus('✖ Nessuna sessione attiva.', 'err');
    return;
  }
  if (!unit?.id) {
    setStatus('✖ Nessuna unità selezionata. Scegli un PG dalla board.', 'err');
    return;
  }
  STATE.lastUnitId = unit.id;
  const unitChip = document.getElementById('forms-unit-chip');
  if (unitChip) unitChip.textContent = `${unit.id}${unit.job ? ' · ' + unit.job : ''}`;
  setStatus('Carico opzioni…');

  // Load current session state (auto-seed with PE if backend says not_found).
  let state = await api.formsSessionGet(sid, unit.id);
  if (!state.ok) {
    const seedPe = Number(unit.pe ?? unit.pe_remaining ?? 10);
    const currentForm = unit.current_form_id || unit.form_id || null;
    state = await api.formsSessionSeed(sid, unit.id, {
      pe: seedPe,
      current_form_id: currentForm,
    });
  }
  const unitState = state.data || {};
  renderMeta(unitState);

  // Load options.
  const axes = inferVcAxes(vc);
  const opts = await api.formsOptions({
    unit: {
      id: unit.id,
      pe: unitState.pe,
      current_form_id: unitState.current_form_id,
      last_evolve_round: unitState.last_evolve_round,
      evolve_count: unitState.evolve_count,
    },
    vc_snapshot: axes,
    current_round: vc.round ?? vc.turn ?? 0,
  });
  if (!opts.ok) {
    setStatus(`✖ Options: ${opts.data?.error || opts.status}`, 'err');
    return;
  }
  STATE.cachedOptions = opts.data?.options || [];
  renderOptions(STATE.cachedOptions);
  const eligibleCount = STATE.cachedOptions.filter((o) => o.eligible).length;
  setStatus(`${eligibleCount}/${STATE.cachedOptions.length} form eleggibili.`, 'ok');
}

async function handleEvolveClick(opt) {
  const sid = STATE.getSessionId();
  const unit = STATE.getSelectedUnit();
  if (!sid || !unit?.id) return;
  setStatus(`Evolving → ${opt.target_form_id}…`);
  const vc = STATE.getVcSnapshot() || {};
  const axes = inferVcAxes(vc);
  const res = await api.formsSessionEvolve(sid, unit.id, {
    target_form_id: opt.target_form_id,
    vc_snapshot: axes,
    current_round: vc.round ?? vc.turn ?? 0,
  });
  if (!res.ok) {
    setStatus(`✖ ${res.data?.reason || 'errore'}`, 'err');
    return;
  }
  setStatus(
    `✓ Evoluta in ${res.data.delta.new_form_id} (${res.data.delta.label}) · PE ${res.data.delta.pe_after}`,
    'ok',
  );
  // M12 Phase D — fire side-effect hook so host can render animation/popup/log.
  if (typeof STATE.onEvolveSuccess === 'function') {
    try {
      STATE.onEvolveSuccess({ unitId: unit.id, delta: res.data.delta });
    } catch {
      /* non-critical */
    }
  }
  await refresh();
}

async function handlePackRoll() {
  const unit = STATE.getSelectedUnit();
  if (!unit?.id) {
    setStatus('✖ Seleziona un PG per roll pack.', 'err');
    return;
  }
  const state = STATE.cachedOptions?.[0];
  const formId = state?.target_form_id || null;
  const jobId = unit.job || null;
  const res = await api.formsPackRoll({ form_id: formId, job_id: jobId });
  const resultEl = document.getElementById('forms-pack-result');
  if (!resultEl) return;
  if (!res.ok) {
    resultEl.textContent = `✖ ${res.data?.error || 'roll fallito'}`;
    return;
  }
  STATE.lastPackRoll = res.data;
  if (res.data.requires_choice) {
    resultEl.textContent = `d20=${res.data.dice.d20} · SCELTA (d20=20, pack a scelta player)`;
    return;
  }
  const combo = Array.isArray(res.data.combo) ? res.data.combo.join(', ') : '—';
  resultEl.textContent = `${res.data.source}${res.data.resolved_pack ? ' → ' + res.data.resolved_pack : ''} · [${combo}] · cost ${res.data.cost} PE · d20=${res.data.dice.d20}${res.data.dice.d12 ? ', d12=' + res.data.dice.d12 : ''}`;
}

export function openFormsPanel() {
  buildOverlay();
  STATE.overlayEl.classList.add('visible');
  refresh();
}

export function closeFormsPanel() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initFormsPanel({
  getSessionId,
  getSelectedUnit,
  getVcSnapshot,
  onEvolveSuccess,
  buttonId = 'forms-open',
} = {}) {
  STATE.getSessionId = typeof getSessionId === 'function' ? getSessionId : () => null;
  STATE.getSelectedUnit = typeof getSelectedUnit === 'function' ? getSelectedUnit : () => null;
  STATE.getVcSnapshot = typeof getVcSnapshot === 'function' ? getVcSnapshot : () => ({});
  STATE.onEvolveSuccess = typeof onEvolveSuccess === 'function' ? onEvolveSuccess : null;
  buildOverlay();
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.addEventListener('click', openFormsPanel);
  }
  return { openFormsPanel, closeFormsPanel, refresh };
}
