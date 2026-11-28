// Skiv Goal 4 — Legacy death mutation choice ritual UI (P2 cross-gen agency).
//
// Overlay modale spawn-on-event: trigger su actor.lifecycle_phase === 'legacy'
// (transition to legacy phase). Allenatore vede checkbox lista
// applied_mutations e decide cosa lasciare alla prossima generazione.
//
// Default: tutto lasciato (back-compat). Decisione irreversible per session.
// Narrative beat (Skiv canonical voice, italiano + desert metaphor):
//   - 100% lasciato → bond hearts +1 — "Hai dato tutto. La sabbia ricorda."
//   - < 50% lasciato → bond hearts -1 — "Il vento porta solo certe ossa."
//   - 50-99% → bond hearts 0 — "La sabbia segue. Quello che lasci lo lasci."

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getSelectedUnit: () => null,
  pickedThisSession: new Set(), // unitId set — one ritual per unit per session.
  currentUnit: null,
  currentSpeciesId: null,
  currentBiomeId: null,
  onCompleteCallback: null,
};

function injectStyles() {
  if (document.getElementById('legacy-ritual-styles')) return;
  const s = document.createElement('style');
  s.id = 'legacy-ritual-styles';
  s.textContent = `
    .legacy-ritual-overlay {
      position: fixed; inset: 0; z-index: 9996;
      background: rgba(6, 4, 10, 0.88);
      display: none; align-items: center; justify-content: center;
      padding: 24px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .legacy-ritual-overlay.visible { display: flex; }
    .legacy-ritual-card {
      max-width: 640px; width: 100%; background: #100c14;
      border: 1px solid #4a3520; border-radius: 14px; padding: 22px 24px;
      box-shadow: 0 0 32px rgba(255, 198, 107, 0.18);
    }
    .legacy-ritual-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }
    .legacy-ritual-head h2 { margin: 0; font-size: 1.3rem; color: #ffc66b; }
    .legacy-ritual-head .unit-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #4a3520;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem; color: #ffc66b;
    }
    .legacy-ritual-subtitle {
      color: #c8a78a; font-size: 0.92rem; margin-bottom: 16px;
      font-style: italic; line-height: 1.5;
    }
    .legacy-ritual-list {
      display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;
      max-height: 360px; overflow-y: auto;
    }
    .legacy-ritual-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; background: #1a1208; border: 1px solid #4a3520;
      border-radius: 8px; cursor: pointer; transition: border-color 160ms ease;
    }
    .legacy-ritual-row:hover { border-color: #ffc66b; }
    .legacy-ritual-row input[type="checkbox"] {
      width: 18px; height: 18px; accent-color: #ffc66b; cursor: pointer;
    }
    .legacy-ritual-row .mut-id { font-weight: 600; color: #e8eaf0; flex: 1; }
    .legacy-ritual-row.left-yes { background: #2a1f10; }
    .legacy-ritual-summary {
      padding: 10px 12px; background: #0b0d12; border-radius: 8px;
      font-size: 0.88rem; color: #c8cfdd; margin-bottom: 14px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .legacy-ritual-summary .ratio { color: #ffc66b; font-weight: 600; }
    .legacy-ritual-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .legacy-ritual-btn {
      background: #2a1f10; color: #ffc66b; border: 1px solid #ffc66b;
      border-radius: 6px; padding: 8px 16px; font-size: 0.92rem;
      cursor: pointer; transition: background 120ms ease;
    }
    .legacy-ritual-btn:hover { background: #4a3520; }
    .legacy-ritual-btn.secondary {
      background: #1a1f2b; color: #9aa3b5; border-color: #2a3040;
    }
    .legacy-ritual-btn.secondary:hover { background: #2a3040; color: #c8cfdd; }
    .legacy-ritual-btn.disabled { opacity: 0.45; cursor: not-allowed; }
    .legacy-ritual-result {
      margin-top: 12px; padding: 14px 16px;
      background: rgba(255, 198, 107, 0.08); border-left: 3px solid #ffc66b;
      border-radius: 4px;
    }
    .legacy-ritual-result.delta-pos { border-left-color: #4ade80; background: rgba(74, 222, 128, 0.08); }
    .legacy-ritual-result.delta-neg { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
    .legacy-ritual-result .voice-line {
      font-style: italic; color: #ffc66b; margin-bottom: 4px; line-height: 1.45;
    }
    .legacy-ritual-result.delta-pos .voice-line { color: #4ade80; }
    .legacy-ritual-result.delta-neg .voice-line { color: #ef9a9a; }
    .legacy-ritual-result .delta-line {
      font-size: 0.84rem; color: #c8cfdd;
    }
    .legacy-ritual-empty {
      padding: 28px 12px; text-align: center; color: #9aa3b5;
      font-style: italic;
    }
    .legacy-ritual-locked {
      padding: 18px 14px; text-align: center; color: #ffc66b;
      background: rgba(255, 198, 107, 0.08); border-radius: 8px;
      font-size: 0.92rem;
    }
  `;
  document.head.appendChild(s);
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function buildOverlay() {
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const wrap = document.createElement('div');
  wrap.className = 'legacy-ritual-overlay';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'Rituale Legacy — Skiv Goal 4');
  wrap.innerHTML = `
    <div class="legacy-ritual-card" data-role="card">
      <div class="legacy-ritual-head">
        <h2>🦴 Rituale del Lascito</h2>
        <span class="unit-chip" data-role="unit-chip">—</span>
      </div>
      <div class="legacy-ritual-subtitle" data-role="subtitle">
        Il vento si volta. Decidi quali ossa la sabbia porterà alla prossima generazione.
        Quello che non lasci muore con te.
      </div>
      <div data-role="body"></div>
    </div>
  `;
  document.body.appendChild(wrap);
  STATE.overlayEl = wrap;
  return wrap;
}

function updateSummary(overlay) {
  const list = overlay.querySelector('[data-role="body"] .legacy-ritual-list');
  const summary = overlay.querySelector('[data-role="body"] .legacy-ritual-summary .ratio');
  if (!list || !summary) return;
  const total = list.querySelectorAll('input[type="checkbox"]').length;
  const left = list.querySelectorAll('input[type="checkbox"]:checked').length;
  summary.textContent = `${left} / ${total}`;
  list.querySelectorAll('.legacy-ritual-row').forEach((row) => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) row.classList.add('left-yes');
    else row.classList.remove('left-yes');
  });
}

export function renderRitual(unit) {
  const overlay = buildOverlay();
  const body = overlay.querySelector('[data-role="body"]');
  const chip = overlay.querySelector('[data-role="unit-chip"]');
  chip.textContent = unit ? `${unit.label || unit.id}` : 'nessun PG';

  const lockKey = unit && unit.id;
  if (lockKey && STATE.pickedThisSession.has(lockKey)) {
    body.innerHTML = `
      <div class="legacy-ritual-locked">
        🔒 Hai già celebrato il rituale legacy per ${escapeHtml(unit?.label || unit?.id || 'questa creatura')}
        in questa sessione. La decisione è irreversibile — la sabbia ha già preso.
      </div>
    `;
    return;
  }

  const applied = Array.isArray(unit?.applied_mutations) ? unit.applied_mutations : [];

  if (applied.length === 0) {
    body.innerHTML = `
      <div class="legacy-ritual-empty">
        Nessuna mutazione applicata da lasciare. Il sangue è puro,
        il vento non porta nulla. <em>La sabbia segue.</em>
        <div style="margin-top:14px">
          <button class="legacy-ritual-btn secondary" data-action="close">Chiudi</button>
        </div>
      </div>
    `;
    body.querySelector('button[data-action="close"]')?.addEventListener('click', closeRitualPanel);
    return;
  }

  const rows = applied
    .map((mid) => {
      // Default: tutto lasciato (back-compat).
      return `
        <label class="legacy-ritual-row left-yes">
          <input type="checkbox" checked data-mut-id="${escapeHtml(mid)}">
          <span class="mut-id">${escapeHtml(mid)}</span>
        </label>
      `;
    })
    .join('');

  body.innerHTML = `
    <div class="legacy-ritual-list">${rows}</div>
    <div class="legacy-ritual-summary">
      <span>Mutazioni che lasci:</span>
      <span class="ratio">${applied.length} / ${applied.length}</span>
    </div>
    <div class="legacy-ritual-actions">
      <button class="legacy-ritual-btn secondary" data-action="close">Annulla</button>
      <button class="legacy-ritual-btn" data-action="submit">✦ Sigilla il lascito</button>
    </div>
    <div data-role="result-slot"></div>
  `;

  body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => updateSummary(overlay));
  });
  body.querySelector('button[data-action="close"]')?.addEventListener('click', closeRitualPanel);
  body.querySelector('button[data-action="submit"]')?.addEventListener('click', submitRitual);
}

function collectChecked(overlay) {
  const checks = overlay.querySelectorAll(
    '[data-role="body"] .legacy-ritual-list input[type="checkbox"]:checked',
  );
  return Array.from(checks)
    .map((cb) => cb.getAttribute('data-mut-id'))
    .filter(Boolean);
}

async function submitRitual() {
  const sid = STATE.getSessionId();
  const unit = STATE.currentUnit;
  if (!sid || !unit || !unit.id) {
    closeRitualPanel();
    return;
  }
  const overlay = STATE.overlayEl;
  if (!overlay) return;

  const submitBtn = overlay.querySelector('button[data-action="submit"]');
  if (submitBtn) {
    submitBtn.classList.add('disabled');
    submitBtn.disabled = true;
  }

  const mutationsToLeave = collectChecked(overlay);
  const totalApplied = Array.isArray(unit.applied_mutations) ? unit.applied_mutations.length : 0;

  try {
    const res = await api.legacyRitualSubmit(sid, unit.id, mutationsToLeave, {
      species_id: STATE.currentSpeciesId || unit.species_id || unit.species || null,
      biome_id: STATE.currentBiomeId || null,
      legacyUnit: {
        id: unit.id,
        applied_mutations: unit.applied_mutations || [],
      },
    });
    if (res && res.ok && res.data) {
      STATE.pickedThisSession.add(unit.id);
      const slot = overlay.querySelector('[data-role="result-slot"]');
      const narrative = res.data.narrative || {};
      const propagation = res.data.propagation || {};
      const delta = Number(narrative.delta || 0);
      const cls = delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : '';
      const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
      const heartsLine =
        delta === 0
          ? 'Bond hearts: invariato.'
          : `Bond hearts: ${sign}${Math.abs(delta)} (allenatore).`;
      if (slot) {
        slot.innerHTML = `
          <div class="legacy-ritual-result ${cls}">
            <div class="voice-line">${narrative.voice_it ? '"' + escapeHtml(narrative.voice_it) + '"' : '<em>— silenzio —</em>'}</div>
            <div class="delta-line">
              ${escapeHtml(heartsLine)}
              Lasciato: <strong>${propagation.left_count ?? mutationsToLeave.length}</strong> /
              ${propagation.total_applied ?? totalApplied}.
              Pool size: <strong>${propagation.pool_size ?? '?'}</strong>.
            </div>
            <div style="margin-top:10px;text-align:right">
              <button class="legacy-ritual-btn secondary" data-action="dismiss">Lascia che il vento porti</button>
            </div>
          </div>
        `;
        slot.querySelector('button[data-action="dismiss"]')?.addEventListener('click', () => {
          if (typeof STATE.onCompleteCallback === 'function') {
            try {
              STATE.onCompleteCallback({ delta, propagation, narrative });
            } catch {
              /* noop */
            }
          }
          closeRitualPanel();
        });
      }
    } else {
      const slot = overlay.querySelector('[data-role="result-slot"]');
      const errMsg = res?.data?.error || res?.errorMessage || 'errore sconosciuto';
      if (slot) {
        slot.innerHTML = `
          <div class="legacy-ritual-result delta-neg">
            <div class="voice-line">⚠ Il rituale ha vacillato: ${escapeHtml(errMsg)}</div>
            <div class="delta-line">Riprova o chiudi.</div>
          </div>
        `;
      }
      if (submitBtn) {
        submitBtn.classList.remove('disabled');
        submitBtn.disabled = false;
      }
    }
  } catch (err) {
    console.warn('[legacy-ritual] submit failed', err);
    if (submitBtn) {
      submitBtn.classList.remove('disabled');
      submitBtn.disabled = false;
    }
  }
}

export async function openRitualPanel(unit, opts = {}) {
  const sid = STATE.getSessionId();
  const u = unit || STATE.getSelectedUnit();
  if (!sid || !u || !u.id) return;
  STATE.currentUnit = u;
  STATE.currentSpeciesId = opts.speciesId || opts.species_id || u.species_id || u.species || null;
  STATE.currentBiomeId = opts.biomeId || opts.biome_id || null;
  STATE.onCompleteCallback = typeof opts.onComplete === 'function' ? opts.onComplete : null;
  const overlay = buildOverlay();
  overlay.classList.add('visible');
  renderRitual(u);
}

export function closeRitualPanel() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
  STATE.currentUnit = null;
}

export function isRitualLocked(unitId) {
  return STATE.pickedThisSession.has(unitId);
}

// Test/debug hook — drop overlay reference + reset lock cache.
export function _resetLegacyRitualState() {
  STATE.pickedThisSession.clear();
  STATE.currentUnit = null;
  STATE.currentSpeciesId = null;
  STATE.currentBiomeId = null;
  STATE.onCompleteCallback = null;
  STATE.overlayEl = null;
}

export function initLegacyRitualPanel(opts = {}) {
  STATE.getSessionId = opts.getSessionId || STATE.getSessionId;
  STATE.getSelectedUnit = opts.getSelectedUnit || STATE.getSelectedUnit;
  // Listen for lifecycle_phase_changed event (fired when actor enters
  // legacy phase). When triggered, auto-open ritual for the unit.
  // Default: trigger on transition to 'legacy' phase only.
  window.addEventListener('lifecycle_phase_changed', (ev) => {
    const detail = ev?.detail || {};
    const phase = detail.lifecycle_phase || detail.phase;
    if (phase !== 'legacy') return;
    const unitId = detail.unit_id || detail.unitId;
    const unit = detail.unit || STATE.getSelectedUnit();
    if (unitId && unit && unit.id !== unitId) return;
    openRitualPanel(unit, {
      speciesId: detail.species_id || detail.speciesId,
      biomeId: detail.biome_id || detail.biomeId,
    });
  });
}
