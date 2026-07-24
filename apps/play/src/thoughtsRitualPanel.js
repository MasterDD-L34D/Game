// Skiv Goal 3 — Thoughts ritual choice UI (P4 agency, Disco extension).
//
// Overlay modale spawn-on-event: quando research_completed fire (or manual
// open), shows top-3 candidate thoughts ranked by vcSnapshot mbti_axes match
// + 1-paragraph preview + voice line (Disco-style, mirror inner voices #1945).
// 30-second decision timer with default top-1 auto-pick on timeout.
// Decision irreversible per session (pick → /thoughts/research mode=rounds).
//
// Skiv canonical voice: italiano, deserto, "sabbia segue".

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getSelectedUnit: () => null,
  pickedThisSession: new Set(), // unitId set — one ritual per unit per session.
  timerInterval: null,
  timerStart: 0,
  timerDurationMs: 30000,
  currentCandidates: null,
  currentUnitId: null,
};

const TIMER_DURATION_MS = 30000;

function injectStyles() {
  if (document.getElementById('thoughts-ritual-styles')) return;
  const s = document.createElement('style');
  s.id = 'thoughts-ritual-styles';
  s.textContent = `
    .thoughts-ritual-overlay {
      position: fixed; inset: 0; z-index: 9997;
      background: rgba(8, 6, 14, 0.86);
      display: none; align-items: center; justify-content: center;
      padding: 24px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .thoughts-ritual-overlay.visible { display: flex; }
    .thoughts-ritual-card {
      max-width: 980px; width: 100%; background: #11141c;
      border: 1px solid #3a2a50; border-radius: 14px; padding: 22px 24px;
      box-shadow: 0 0 32px rgba(198, 160, 255, 0.18);
    }
    .thoughts-ritual-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 6px;
    }
    .thoughts-ritual-head h2 { margin: 0; font-size: 1.3rem; color: #c6a0ff; }
    .thoughts-ritual-head .unit-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #2a3040;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem;
    }
    .thoughts-ritual-subtitle {
      color: #9aa3b5; font-size: 0.88rem; margin-bottom: 14px;
      font-style: italic;
    }
    .thoughts-ritual-timer {
      height: 6px; background: #0b0d12; border-radius: 3px;
      border: 1px solid #2a3040; overflow: hidden; margin-bottom: 16px;
    }
    .thoughts-ritual-timer-fill {
      height: 100%; width: 100%;
      background: linear-gradient(90deg, #4ade80 0%, #ffd166 60%, #ef4444 100%);
      transform-origin: left;
      animation: ritual-countdown 30s linear forwards;
    }
    .thoughts-ritual-timer-fill.paused { animation-play-state: paused; }
    .thoughts-ritual-timer-label {
      font-size: 0.78rem; color: #c6a0ff; letter-spacing: 0.04em;
      margin-top: 4px; display: flex; justify-content: space-between;
    }
    .thoughts-ritual-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }
    .ritual-candidate {
      background: #1a1f2b; border: 1px solid #2a3040; border-radius: 10px;
      padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
      cursor: pointer; transition: border-color 160ms ease, transform 160ms ease;
    }
    .ritual-candidate:hover {
      border-color: #c6a0ff; transform: translateY(-2px);
    }
    .ritual-candidate.tier-1 { border-left: 3px solid #66d1fb; }
    .ritual-candidate.tier-2 { border-left: 3px solid #ffc66b; }
    .ritual-candidate.tier-3 { border-left: 3px solid #ff7a9a; }
    .ritual-candidate.top-pick {
      box-shadow: 0 0 0 1px #c6a0ff inset, 0 0 16px rgba(198, 160, 255, 0.28);
    }
    .ritual-candidate-head {
      display: flex; align-items: baseline; gap: 8px;
    }
    .ritual-candidate-title {
      font-weight: 600; color: #e8eaf0; font-size: 1.02rem;
    }
    .ritual-candidate-pole {
      margin-left: auto; background: #0b0d12; border-radius: 4px;
      padding: 1px 6px; font-size: 0.75rem; color: #c6a0ff;
    }
    .ritual-candidate-flavor {
      color: #c8cfdd; font-size: 0.86rem; line-height: 1.4;
    }
    .ritual-candidate-bonus {
      font-size: 0.78rem; color: #9aa3b5;
    }
    .ritual-candidate-bonus strong { color: #ffd166; }
    .ritual-candidate-voice {
      font-style: italic; color: #c6a0ff; font-size: 0.82rem;
      border-left: 2px solid #c6a0ff; padding-left: 8px; line-height: 1.35;
    }
    .ritual-candidate-pick {
      background: #2a3040; color: #e8eaf0; border: 1px solid #c6a0ff;
      border-radius: 4px; padding: 6px 10px; font-size: 0.85rem;
      cursor: pointer; transition: background 120ms ease;
    }
    .ritual-candidate-pick:hover { background: #3a2a50; }
    .ritual-candidate-pick.disabled {
      opacity: 0.45; cursor: not-allowed;
    }
    .thoughts-ritual-empty {
      padding: 28px 12px; text-align: center; color: #9aa3b5;
      font-style: italic;
    }
    .thoughts-ritual-locked {
      padding: 18px 14px; text-align: center; color: #ffc66b;
      background: rgba(255, 198, 107, 0.08); border-radius: 8px;
      font-size: 0.92rem;
    }
    @keyframes ritual-countdown {
      0% { transform: scaleX(1); }
      100% { transform: scaleX(0); }
    }
    @keyframes ritual-pulse-warning {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      50% { box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.55); }
    }
    .thoughts-ritual-card.urgent {
      animation: ritual-pulse-warning 1.2s ease-in-out infinite;
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
  wrap.className = 'thoughts-ritual-overlay';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'Rituale del Pensiero — Skiv Goal 3');
  wrap.innerHTML = `
    <div class="thoughts-ritual-card" data-role="card">
      <div class="thoughts-ritual-head">
        <h2>🧠 Rituale del Pensiero</h2>
        <span class="unit-chip" data-role="unit-chip">—</span>
      </div>
      <div class="thoughts-ritual-subtitle" data-role="subtitle">
        Tre voci si avvicinano. Scegli quale ascendere — la sabbia non aspetta.
      </div>
      <div class="thoughts-ritual-timer">
        <div class="thoughts-ritual-timer-fill" data-role="timer-fill"></div>
      </div>
      <div class="thoughts-ritual-timer-label">
        <span data-role="timer-text">30s rimanenti</span>
        <span data-role="timer-default">Default: top-1 auto-pick</span>
      </div>
      <div data-role="body"></div>
    </div>
  `;
  document.body.appendChild(wrap);
  STATE.overlayEl = wrap;
  return wrap;
}

function formatBonusLine(bonus, cost) {
  const parts = [];
  if (bonus && typeof bonus === 'object') {
    for (const [k, v] of Object.entries(bonus)) {
      if (!Number.isFinite(v) || v === 0) continue;
      const sign = v > 0 ? '+' : '';
      parts.push(`<strong>${sign}${v} ${escapeHtml(k)}</strong>`);
    }
  }
  if (cost && typeof cost === 'object') {
    for (const [k, v] of Object.entries(cost)) {
      if (!Number.isFinite(v) || v === 0) continue;
      const sign = v > 0 ? '-' : '+';
      parts.push(`<span style="color:#ef9a9a">${sign}${Math.abs(v)} ${escapeHtml(k)}</span>`);
    }
  }
  return parts.length ? parts.join(' · ') : '<em style="color:#9aa3b5">— effetto narrativo —</em>';
}

export function renderCandidates(candidates, unit) {
  const overlay = buildOverlay();
  const body = overlay.querySelector('[data-role="body"]');
  const chip = overlay.querySelector('[data-role="unit-chip"]');
  chip.textContent = unit ? `${unit.label || unit.id}` : 'nessun PG';
  if (!candidates || candidates.length === 0) {
    body.innerHTML = `
      <div class="thoughts-ritual-empty">
        Nessun pensiero pronto al rituale. Continua a giocare con consistenza
        MBTI per sbloccare nuove voci. <em>La sabbia segue il vento.</em>
      </div>
    `;
    return;
  }
  // Lock check: if user already picked this session for this unit.
  const lockKey = STATE.currentUnitId || (unit && unit.id) || null;
  if (lockKey && STATE.pickedThisSession.has(lockKey)) {
    body.innerHTML = `
      <div class="thoughts-ritual-locked">
        🔒 Hai già scelto un pensiero per ${escapeHtml(unit?.label || unit?.id || 'questa creatura')}
        in questa sessione. La decisione è irreversibile — il vento ha già preso la sua direzione.
      </div>
    `;
    return;
  }
  const cards = candidates
    .map((c, idx) => {
      const isTop = idx === 0;
      const cls = ['ritual-candidate', `tier-${c.tier || 1}`, isTop ? 'top-pick' : '']
        .filter(Boolean)
        .join(' ');
      const voiceLine =
        c.voice_preview && c.voice_preview.voice_it
          ? `<div class="ritual-candidate-voice">"${escapeHtml(c.voice_preview.voice_it)}"</div>`
          : '<div class="ritual-candidate-voice" style="opacity:0.45"><em>— voce ancora silente —</em></div>';
      const bonusLine = formatBonusLine(c.effect_bonus, c.effect_cost);
      return `
        <div class="${cls}" data-thought-id="${escapeHtml(c.thought_id)}" data-pick-index="${idx}">
          <div class="ritual-candidate-head">
            <span class="ritual-candidate-title">${escapeHtml(c.title_it || c.thought_id)}</span>
            <span class="ritual-candidate-pole">T${c.tier || 1} · ${escapeHtml(c.pole_letter || '?')}</span>
          </div>
          <div class="ritual-candidate-flavor">${escapeHtml(c.flavor_it || '')}</div>
          ${voiceLine}
          <div class="ritual-candidate-bonus">${bonusLine}</div>
          <button class="ritual-candidate-pick" data-action="pick" data-thought-id="${escapeHtml(c.thought_id)}">
            ✦ Scegli questa voce
          </button>
        </div>
      `;
    })
    .join('');
  body.innerHTML = `<div class="thoughts-ritual-grid">${cards}</div>`;
  // Bind pick handlers.
  body.querySelectorAll('button[data-action="pick"]').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const thoughtId = btn.getAttribute('data-thought-id');
      await pickThought(thoughtId);
    });
  });
}

function startTimer() {
  stopTimer();
  STATE.timerStart = Date.now();
  const overlay = STATE.overlayEl;
  if (!overlay) return;
  const fill = overlay.querySelector('[data-role="timer-fill"]');
  const text = overlay.querySelector('[data-role="timer-text"]');
  const card = overlay.querySelector('[data-role="card"]');
  if (fill) {
    fill.style.animation = 'none';
    // Reflow then re-apply.
    void fill.offsetWidth;
    fill.style.animation = `ritual-countdown ${STATE.timerDurationMs}ms linear forwards`;
  }
  STATE.timerInterval = setInterval(() => {
    const elapsed = Date.now() - STATE.timerStart;
    const remaining = Math.max(0, STATE.timerDurationMs - elapsed);
    if (text) text.textContent = `${Math.ceil(remaining / 1000)}s rimanenti`;
    if (card) {
      if (remaining < 10000) card.classList.add('urgent');
      else card.classList.remove('urgent');
    }
    if (remaining <= 0) {
      stopTimer();
      autoPickTopOne();
    }
  }, 200);
}

function stopTimer() {
  if (STATE.timerInterval) {
    clearInterval(STATE.timerInterval);
    STATE.timerInterval = null;
  }
}

async function autoPickTopOne() {
  const candidates = STATE.currentCandidates;
  if (!candidates || candidates.length === 0) {
    closeRitualPanel();
    return;
  }
  // Skip lock: auto-pick is the default.
  await pickThought(candidates[0].thought_id, { auto: true });
}

async function pickThought(thoughtId, opts = {}) {
  const sid = STATE.getSessionId();
  const unitId = STATE.currentUnitId;
  if (!sid || !unitId || !thoughtId) {
    closeRitualPanel();
    return;
  }
  // Irreversible session lock — even if backend fails, we mark as picked
  // ONLY on success; otherwise allow retry. But once /research returns ok,
  // commit lock.
  try {
    const res = await api.thoughtsRitualPick(sid, unitId, thoughtId);
    if (res && res.ok) {
      STATE.pickedThisSession.add(unitId);
    } else {
      // Surface error briefly then close.
      const overlay = STATE.overlayEl;
      if (overlay) {
        const body = overlay.querySelector('[data-role="body"]');
        const errMsg = res?.data?.error || res?.error || 'errore sconosciuto';
        if (body) {
          body.innerHTML = `
            <div class="thoughts-ritual-locked" style="color:#ef9a9a;background:rgba(239,154,154,0.08)">
              ⚠ Il rituale ha vacillato: ${escapeHtml(errMsg)}.
              ${opts.auto ? 'Auto-pick fallito.' : 'Riprova o chiudi.'}
            </div>
          `;
        }
      }
    }
  } catch (err) {
    /* swallow — lock not committed, user can retry on next open */
    console.warn('[thoughts-ritual] pick failed', err);
  } finally {
    stopTimer();
    setTimeout(() => closeRitualPanel(), opts.auto ? 600 : 200);
  }
}

export async function openRitualPanel(unit) {
  const sid = STATE.getSessionId();
  const u = unit || STATE.getSelectedUnit();
  if (!sid || !u || !u.id) return;
  STATE.currentUnitId = u.id;
  // Lock guard: if already picked, still open (UX shows lock notice).
  let candidates = [];
  try {
    const res = await api.thoughtsCandidates(sid, u.id, 3);
    if (res && res.ok && res.data) {
      candidates = Array.isArray(res.data.candidates) ? res.data.candidates : [];
    }
  } catch (err) {
    console.warn('[thoughts-ritual] fetch candidates failed', err);
  }
  STATE.currentCandidates = candidates;
  const overlay = buildOverlay();
  overlay.classList.add('visible');
  renderCandidates(candidates, u);
  // Only start timer if there are candidates AND not locked.
  if (candidates.length > 0 && !STATE.pickedThisSession.has(u.id)) {
    startTimer();
  }
}

export function closeRitualPanel() {
  stopTimer();
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
  STATE.currentCandidates = null;
}

export function isRitualLocked(unitId) {
  return STATE.pickedThisSession.has(unitId);
}

// Test/debug hook — reset lock cache + drop overlay reference (forces
// rebuild on next openRitualPanel; useful when test stubs swap the DOM).
export function _resetRitualState() {
  STATE.pickedThisSession.clear();
  STATE.currentCandidates = null;
  STATE.currentUnitId = null;
  STATE.overlayEl = null;
  stopTimer();
}

export function initThoughtsRitualPanel(opts = {}) {
  STATE.getSessionId = opts.getSessionId || STATE.getSessionId;
  STATE.getSelectedUnit = opts.getSelectedUnit || STATE.getSelectedUnit;
  STATE.timerDurationMs = Number.isFinite(opts.timerMs) ? opts.timerMs : TIMER_DURATION_MS;
  // Listen for research_completed event (fired by thoughtsPanel /
  // sessionThoughts on internalize promotion). When triggered, auto-open
  // ritual for the selected unit ONLY if a 3rd thought is being completed
  // (Skiv apex gate moment).
  window.addEventListener('research_completed', (ev) => {
    const detail = ev?.detail || {};
    const unitId = detail.unit_id || null;
    const internalizedCount = Number(detail.internalized_count || 0);
    // Skiv ritual triggers specifically on the THIRD internalization (apex gate).
    if (internalizedCount !== 3) return;
    // Use selected unit fallback if event has no unit_id.
    const unit = STATE.getSelectedUnit();
    if (unitId && unit && unit.id !== unitId) return;
    openRitualPanel(unit);
  });
}
