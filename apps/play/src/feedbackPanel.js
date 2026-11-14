// M7 feedback panel — playtest collection (2026-04-20)
// Gestisce modal feedback con 2 modes: form rapido (7 questions) + freetext.

'use strict';

const STATE = {
  mode: 'form', // 'form' | 'freetext'
  formAnswers: {},
  overlayEl: null,
  sessionIdGetter: null,
};

function showStatus(el, msg, type = 'info') {
  el.textContent = msg;
  el.className = `feedback-status ${type}`;
}

function setSelected(container, value) {
  container.querySelectorAll('.rating-btn, .choice-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.value === value);
  });
}

function wireRatingsAndChoices(card) {
  card.querySelectorAll('.feedback-rating, .feedback-choice').forEach((container) => {
    const q = container.dataset.q;
    container.querySelectorAll('.rating-btn, .choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        STATE.formAnswers[q] = btn.dataset.value;
        setSelected(container, btn.dataset.value);
      });
    });
  });
}

function switchTab(mode) {
  STATE.mode = mode;
  const tabForm = document.getElementById('feedback-tab-form');
  const tabFree = document.getElementById('feedback-tab-freetext');
  const contentForm = document.getElementById('feedback-form-content');
  const contentFree = document.getElementById('feedback-freetext-content');
  tabForm.classList.toggle('active', mode === 'form');
  tabFree.classList.toggle('active', mode === 'freetext');
  contentForm.classList.toggle('hidden', mode !== 'form');
  contentFree.classList.toggle('hidden', mode !== 'freetext');
}

function buildPayload() {
  const playerName = document.getElementById('feedback-player-name').value.trim();
  const sessionId = STATE.sessionIdGetter ? STATE.sessionIdGetter() : null;
  const base = {
    player_name: playerName || 'anonymous',
    session_id: sessionId || null,
  };

  if (STATE.mode === 'freetext') {
    return {
      ...base,
      kind: 'freetext',
      text: document.getElementById('fb-freetext').value.trim(),
    };
  }

  const answers = { ...STATE.formAnswers };
  const likedEl = document.getElementById('fb-q-liked');
  const improveEl = document.getElementById('fb-q-improve');
  const bugsEl = document.getElementById('fb-q-bugs');
  if (likedEl.value.trim()) answers.liked = likedEl.value.trim();
  if (improveEl.value.trim()) answers.improve = improveEl.value.trim();
  if (bugsEl.value.trim()) answers.bugs = bugsEl.value.trim();

  return { ...base, kind: 'form', answers };
}

async function submit() {
  const submitBtn = document.getElementById('feedback-submit');
  const statusEl = document.getElementById('feedback-status');
  const payload = buildPayload();

  // Validazione basic
  if (STATE.mode === 'freetext' && !payload.text) {
    showStatus(statusEl, 'Scrivi qualcosa prima di inviare.', 'error');
    return;
  }
  if (STATE.mode === 'form' && Object.keys(payload.answers).length === 0) {
    showStatus(statusEl, 'Rispondi almeno a una domanda.', 'error');
    return;
  }

  submitBtn.disabled = true;
  showStatus(statusEl, 'Invio in corso...', 'info');

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showStatus(statusEl, `✅ ${data.message || 'Grazie per il feedback!'}`, 'success');
      // Reset form dopo 2s
      setTimeout(() => {
        document.getElementById('feedback-overlay').classList.add('hidden');
        resetForm();
      }, 2000);
    } else {
      showStatus(statusEl, `❌ Errore: ${data.error || 'invio fallito'}`, 'error');
      submitBtn.disabled = false;
    }
  } catch (err) {
    showStatus(statusEl, `❌ Network: ${err.message}`, 'error');
    submitBtn.disabled = false;
  }
}

function resetForm() {
  STATE.formAnswers = {};
  document.getElementById('feedback-submit').disabled = false;
  document.getElementById('fb-freetext').value = '';
  document.getElementById('fb-q-liked').value = '';
  document.getElementById('fb-q-improve').value = '';
  document.getElementById('fb-q-bugs').value = '';
  document.getElementById('feedback-player-name').value = '';
  document.getElementById('feedback-status').textContent = '';
  document.querySelectorAll('.rating-btn.selected, .choice-btn.selected').forEach((btn) => {
    btn.classList.remove('selected');
  });
  switchTab('form');
}

function openOverlay() {
  STATE.overlayEl.classList.remove('hidden');
}

function closeOverlay() {
  STATE.overlayEl.classList.add('hidden');
}

/**
 * Init feedback panel — wire button + modal events.
 * @param {object} options
 * @param {function} options.getSessionId — ritorna current session_id (per log link)
 */
export function initFeedbackPanel(options = {}) {
  STATE.sessionIdGetter = options.getSessionId || (() => null);
  STATE.overlayEl = document.getElementById('feedback-overlay');
  if (!STATE.overlayEl) {
    console.warn('[feedback] overlay element missing in DOM');
    return;
  }

  document.getElementById('feedback-open')?.addEventListener('click', openOverlay);
  document.getElementById('feedback-close')?.addEventListener('click', closeOverlay);
  document.getElementById('feedback-tab-form')?.addEventListener('click', () => switchTab('form'));
  document
    .getElementById('feedback-tab-freetext')
    ?.addEventListener('click', () => switchTab('freetext'));
  document.getElementById('feedback-submit')?.addEventListener('click', submit);

  // Close su ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !STATE.overlayEl.classList.contains('hidden')) {
      closeOverlay();
    }
  });

  // Close su click overlay (fuori dalla card)
  STATE.overlayEl.addEventListener('click', (e) => {
    if (e.target === STATE.overlayEl) closeOverlay();
  });

  wireRatingsAndChoices(STATE.overlayEl);
}
