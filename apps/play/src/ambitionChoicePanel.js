// Action 6 (ADR-2026-04-28 §Action 6) — Ambition choice ritual UI.
//
// Choice ritual modal: fame_dominance vs bond_proposal post defeat alpha
// + bond_hearts threshold gate. Mirror pattern legacyRitualPanel.js (G4)
// + thoughtsRitualPanel (G3) — overlay modale con 30s countdown timer +
// irreversible session lock.
//
// Triggered when ambitionHud detects choice_ready=true.

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getBondHearts: () => 0,
  pickedThisSession: new Set(), // ambitionId set — once per ambition.
  currentAmbitionId: null,
  timerHandle: null,
  countdownSec: 30,
  onCompleteCallback: null,
};

function injectStyles() {
  if (document.getElementById('ambition-choice-styles')) return;
  const s = document.createElement('style');
  s.id = 'ambition-choice-styles';
  s.textContent = `
    .ambition-choice-overlay {
      position: fixed; inset: 0; z-index: 9995;
      background: rgba(6, 4, 10, 0.86);
      display: none; align-items: center; justify-content: center;
      padding: 24px 16px;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .ambition-choice-overlay.visible { display: flex; }
    .ambition-choice-card {
      max-width: 600px; width: 100%; background: #100c14;
      border: 1px solid #4a3520; border-radius: 14px; padding: 22px 24px;
      box-shadow: 0 0 32px rgba(255, 198, 107, 0.18);
    }
    .ambition-choice-head {
      display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px;
    }
    .ambition-choice-head h2 { margin: 0; font-size: 1.3rem; color: #ffc66b; }
    .ambition-choice-timer {
      margin-left: auto; background: #0b0d12; border: 1px solid #4a3520;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem; color: #ffc66b;
    }
    .ambition-choice-subtitle {
      color: #c8a78a; font-size: 0.92rem; margin-bottom: 16px;
      font-style: italic; line-height: 1.5;
    }
    .ambition-choice-buttons {
      display: flex; gap: 14px; margin-top: 14px;
    }
    .ambition-choice-btn {
      flex: 1; padding: 14px 16px; border-radius: 10px;
      font-size: 0.96rem; cursor: pointer;
      transition: transform 120ms ease, background 120ms ease;
      text-align: center;
    }
    .ambition-choice-btn:hover { transform: translateY(-1px); }
    .ambition-choice-btn.disabled { opacity: 0.45; cursor: not-allowed; }
    .ambition-choice-btn .label { font-weight: 600; margin-bottom: 4px; }
    .ambition-choice-btn .hint { font-size: 0.78rem; opacity: 0.85; }
    .choice-ritual-fame {
      background: rgba(239, 68, 68, 0.12); color: #ef9a9a;
      border: 1px solid #ef4444;
    }
    .choice-ritual-fame:hover { background: rgba(239, 68, 68, 0.2); }
    .choice-ritual-bond {
      background: rgba(74, 222, 128, 0.12); color: #4ade80;
      border: 1px solid #4ade80;
    }
    .choice-ritual-bond:hover { background: rgba(74, 222, 128, 0.2); }
    .ambition-choice-result {
      margin-top: 14px; padding: 14px 16px;
      background: rgba(255, 198, 107, 0.08);
      border-left: 3px solid #ffc66b; border-radius: 4px;
    }
    .ambition-choice-result .voice-line {
      font-style: italic; color: #ffc66b; line-height: 1.45; margin-bottom: 4px;
    }
    .ambition-choice-locked {
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
  wrap.className = 'ambition-choice-overlay';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'Rituale Scelta — Ambition');
  wrap.innerHTML = `
    <div class="ambition-choice-card" data-role="card">
      <div class="ambition-choice-head">
        <h2>🤝 Rituale della Scelta</h2>
        <span class="ambition-choice-timer" data-role="timer">30s</span>
      </div>
      <div class="ambition-choice-subtitle" data-role="subtitle">—</div>
      <div data-role="body"></div>
    </div>
  `;
  document.body.appendChild(wrap);
  STATE.overlayEl = wrap;
  return wrap;
}

function clearTimer() {
  if (STATE.timerHandle) {
    clearInterval(STATE.timerHandle);
    STATE.timerHandle = null;
  }
}

function startCountdown(overlay, secs = 30) {
  clearTimer();
  STATE.countdownSec = secs;
  const timerEl = overlay.querySelector('[data-role="timer"]');
  if (timerEl) timerEl.textContent = `${secs}s`;
  STATE.timerHandle = setInterval(() => {
    STATE.countdownSec -= 1;
    if (timerEl) timerEl.textContent = `${Math.max(0, STATE.countdownSec)}s`;
    if (STATE.countdownSec <= 0) {
      clearTimer();
      // Auto-pick fame on timeout (default conservative).
      submitChoice('fame_dominance');
    }
  }, 1000);
}

async function submitChoice(choice) {
  const sid = STATE.getSessionId();
  const ambitionId = STATE.currentAmbitionId;
  if (!sid || !ambitionId) {
    closeChoicePanel();
    return;
  }
  clearTimer();

  const overlay = STATE.overlayEl;
  if (!overlay) return;
  // Disable buttons.
  overlay.querySelectorAll('.ambition-choice-btn').forEach((b) => {
    b.classList.add('disabled');
    b.setAttribute('disabled', 'true');
  });

  const bondHearts = Number(STATE.getBondHearts() || 0);
  const res = await api.ambitionChoiceRitual(sid, ambitionId, choice, bondHearts);

  const body = overlay.querySelector('[data-role="body"]');
  if (!body) return;

  if (res?.ok && res.data?.locked) {
    const beat = res.data.narrative_beat || {};
    body.innerHTML = `
      <div class="ambition-choice-locked">
        <div class="voice-line">${beat.voice_line_skiv ? '"' + escapeHtml(beat.voice_line_skiv) + '"' : '— silenzio —'}</div>
        <div>Bond hearts: ${escapeHtml(String(res.data.bond_hearts))} / ${escapeHtml(String(res.data.bond_hearts_threshold))}.
        Servono più legami prima del ritual bond.</div>
        <div style="margin-top:10px;text-align:right">
          <button class="ambition-choice-btn choice-ritual-fame" data-action="dismiss">Chiudi</button>
        </div>
      </div>
    `;
    body
      .querySelector('button[data-action="dismiss"]')
      ?.addEventListener('click', closeChoicePanel);
    return;
  }

  if (res?.ok && res.data?.completed) {
    const beat = res.data.narrative_beat || {};
    STATE.pickedThisSession.add(ambitionId);
    body.innerHTML = `
      <div class="ambition-choice-result">
        <div class="voice-line">${beat.voice_line_skiv ? '"' + escapeHtml(beat.voice_line_skiv) + '"' : '— silenzio —'}</div>
        <div>Outcome: <strong>${escapeHtml(res.data.outcome || '—')}</strong></div>
        <div style="margin-top:10px;text-align:right">
          <button class="ambition-choice-btn choice-ritual-bond" data-action="dismiss">Lascia che il vento porti</button>
        </div>
      </div>
    `;
    body.querySelector('button[data-action="dismiss"]')?.addEventListener('click', () => {
      if (typeof STATE.onCompleteCallback === 'function') {
        try {
          STATE.onCompleteCallback(res.data);
        } catch {
          /* noop */
        }
      }
      closeChoicePanel();
    });
    return;
  }

  // Error fallback.
  body.innerHTML = `
    <div class="ambition-choice-locked">
      ⚠ Il rituale ha vacillato: ${escapeHtml(res?.data?.error || 'errore sconosciuto')}.
      <div style="margin-top:10px;text-align:right">
        <button class="ambition-choice-btn choice-ritual-fame" data-action="dismiss">Chiudi</button>
      </div>
    </div>
  `;
  body.querySelector('button[data-action="dismiss"]')?.addEventListener('click', closeChoicePanel);
}

export function renderChoiceRitual(ambition) {
  const overlay = buildOverlay();
  const subtitle = overlay.querySelector('[data-role="subtitle"]');
  const body = overlay.querySelector('[data-role="body"]');
  if (subtitle) {
    subtitle.textContent = ambition?.title_it || 'Rituale di Scelta';
  }
  if (!body) return;
  body.innerHTML = `
    <div class="ambition-choice-buttons">
      <button class="ambition-choice-btn choice-ritual-fame" data-choice="fame_dominance">
        <div class="label">⚔ Fame</div>
        <div class="hint">Domina e disperdi. Sangue copre tracce.</div>
      </button>
      <button class="ambition-choice-btn choice-ritual-bond" data-choice="bond_proposal">
        <div class="label">🤝 Bond</div>
        <div class="hint">Proponi alleanza. Sabbia ricorda nuova forma.</div>
      </button>
    </div>
  `;
  body.querySelectorAll('button[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => submitChoice(btn.getAttribute('data-choice')));
  });
}

export function openChoicePanel(ambition, opts = {}) {
  const sid = STATE.getSessionId();
  if (!sid || !ambition) return;
  if (STATE.pickedThisSession.has(ambition.ambition_id)) return;
  STATE.currentAmbitionId = ambition.ambition_id;
  STATE.onCompleteCallback = typeof opts.onComplete === 'function' ? opts.onComplete : null;
  const overlay = buildOverlay();
  overlay.classList.add('visible');
  renderChoiceRitual(ambition);
  startCountdown(overlay, Number(opts.countdownSec) || 30);
}

export function closeChoicePanel() {
  clearTimer();
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
  STATE.currentAmbitionId = null;
}

export function isChoiceLocked(ambitionId) {
  return STATE.pickedThisSession.has(ambitionId);
}

export function _resetAmbitionChoiceState() {
  clearTimer();
  STATE.pickedThisSession.clear();
  STATE.currentAmbitionId = null;
  STATE.onCompleteCallback = null;
  STATE.overlayEl = null;
}

export function initAmbitionChoicePanel(opts = {}) {
  STATE.getSessionId = opts.getSessionId || STATE.getSessionId;
  STATE.getBondHearts = opts.getBondHearts || STATE.getBondHearts;
}
