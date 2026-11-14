// M10 Phase D — campaign panel UI.
//
// Overlay modal: start new campaign, show progress, handle choice_node,
// display narrative briefing pre-encounter.
//
// Consumer di /api/campaign/* endpoints. Persistence UUID in localStorage
// per demo (single-player, zero auth).
//
// API:
//   initCampaignPanel(options): wire up HUD button + modal overlay
//   openCampaignOverlay(): show modal
//   closeCampaignOverlay(): hide modal
//
// Ref ADR-2026-04-21.

import { api } from './api.js';

const LS_KEY_CAMPAIGN_ID = 'evoTacticsCampaignId';
const LS_KEY_PLAYER_ID = 'evoTacticsPlayerId';

const STATE = {
  campaignId: null,
  playerId: null,
  summary: null,
  overlayEl: null,
};

function _loadStoredIds() {
  try {
    STATE.campaignId = localStorage.getItem(LS_KEY_CAMPAIGN_ID) || null;
    STATE.playerId = localStorage.getItem(LS_KEY_PLAYER_ID) || null;
  } catch {
    STATE.campaignId = null;
    STATE.playerId = null;
  }
}

function _saveIds() {
  try {
    if (STATE.campaignId) localStorage.setItem(LS_KEY_CAMPAIGN_ID, STATE.campaignId);
    if (STATE.playerId) localStorage.setItem(LS_KEY_PLAYER_ID, STATE.playerId);
  } catch {
    /* ignore localStorage errors */
  }
}

function _clearStoredIds() {
  try {
    localStorage.removeItem(LS_KEY_CAMPAIGN_ID);
    localStorage.removeItem(LS_KEY_PLAYER_ID);
  } catch {
    /* ignore */
  }
  STATE.campaignId = null;
  STATE.playerId = null;
  STATE.summary = null;
}

function _ensurePlayerId() {
  if (STATE.playerId) return STATE.playerId;
  STATE.playerId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  _saveIds();
  return STATE.playerId;
}

async function _fetchSummary() {
  if (!STATE.campaignId) return null;
  const res = await api.campaignSummary(STATE.campaignId);
  if (res.ok) {
    STATE.summary = res.data;
    return res.data;
  }
  if (res.status === 404) {
    _clearStoredIds();
    return null;
  }
  return null;
}

async function _startNewCampaign() {
  const playerId = _ensurePlayerId();
  const res = await api.campaignStart(playerId);
  if (!res.ok) return null;
  STATE.campaignId = res.data.campaign.id;
  _saveIds();
  await _fetchSummary();
  return res.data;
}

async function _abandon() {
  if (!STATE.campaignId) return;
  if (!confirm('Abbandonare questa campagna?')) return;
  await api.campaignEnd(STATE.campaignId, 'abandoned');
  _clearStoredIds();
  _render();
}

async function _chooseBranch(branchKey) {
  if (!STATE.campaignId) return;
  const res = await api.campaignChoose(STATE.campaignId, branchKey);
  if (res.ok) {
    await _fetchSummary();
    _render();
  }
}

function _renderProgressBar(pct) {
  const p = Math.round((pct || 0) * 100);
  return `
    <div class="camp-progress">
      <div class="camp-progress-bar" style="width:${p}%"></div>
      <span class="camp-progress-label">${p}% completato</span>
    </div>
  `;
}

function _renderChoiceNode(choice) {
  if (!choice) return '';
  return `
    <div class="camp-choice">
      <h3>⚔️ Scelta richiesta</h3>
      <p class="camp-choice-desc">${choice.description || ''}</p>
      <div class="camp-choice-options">
        <button class="camp-choice-btn" data-branch="${choice.option_a.branch_key}">
          <strong>${choice.option_a.label}</strong>
          <small>${choice.option_a.narrative || ''}</small>
        </button>
        <button class="camp-choice-btn" data-branch="${choice.option_b.branch_key}">
          <strong>${choice.option_b.label}</strong>
          <small>${choice.option_b.narrative || ''}</small>
        </button>
      </div>
    </div>
  `;
}

function _renderEncounterBriefing(current) {
  if (!current) return '';
  return `
    <div class="camp-briefing">
      <div class="camp-act-info">Atto ${current.act_idx} · Capitolo ${current.chapter_idx}</div>
      <h3>${current.encounter_id || 'Nessun encounter'}</h3>
      <p class="camp-narrative">${current.narrative_pre || 'Nessuna narrativa.'}</p>
    </div>
  `;
}

function _renderBody() {
  const s = STATE.summary;
  if (!s) {
    return `
      <div class="camp-empty">
        <h2>Nessuna campagna attiva</h2>
        <p>Inizia "Sopravvivi all'Apex" — 2 atti, branching narrativo, ~9 mission.</p>
        <button id="camp-start" class="hud-btn-primary">🗺 Inizia Campagna</button>
      </div>
    `;
  }

  const camp = s.campaign;
  const def = s.campaign; // campaign_def not included in summary, use from start response cache
  const header = `
    <div class="camp-header">
      <h2>🗺 Sopravvivi all'Apex</h2>
      <div class="camp-status-pills">
        <span class="camp-pill camp-pill-status-${s.completion_status}">${s.completion_status}</span>
        <span class="camp-pill">Atto ${camp.currentAct} · Cap ${camp.currentChapter}</span>
        ${camp.branchChoices.length ? `<span class="camp-pill">↪ ${camp.branchChoices.join(', ')}</span>` : ''}
      </div>
    </div>
  `;

  let bodyParts = [header, _renderProgressBar(s.progress)];

  if (s.can_choose && s.current_encounter?.choice) {
    bodyParts.push(_renderChoiceNode(s.current_encounter.choice));
  } else if (s.current_encounter) {
    bodyParts.push(_renderEncounterBriefing(s.current_encounter));
  }

  if (s.completion_status === 'completed') {
    bodyParts.push(`
      <div class="camp-completed">
        <h3>🏆 Campagna Completata</h3>
        <p>Hai sopravvissuto all'Apex. Il tuo branco è libero.</p>
      </div>
    `);
  }

  bodyParts.push(`
    <div class="camp-actions">
      <button id="camp-refresh" class="hud-btn">🔄 Refresh</button>
      ${!camp.finalState ? '<button id="camp-abandon" class="hud-btn-danger">✕ Abbandona</button>' : ''}
      ${camp.finalState ? '<button id="camp-new" class="hud-btn-primary">🗺 Nuova Campagna</button>' : ''}
    </div>
  `);

  return bodyParts.join('\n');
}

function _render() {
  if (!STATE.overlayEl) return;
  const card = STATE.overlayEl.querySelector('.camp-card-body');
  if (!card) return;
  card.innerHTML = _renderBody();

  // Wire event handlers (delegation not needed, single render)
  const startBtn = card.querySelector('#camp-start');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      await _startNewCampaign();
      _render();
    });
  }
  const refreshBtn = card.querySelector('#camp-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await _fetchSummary();
      _render();
    });
  }
  const abandonBtn = card.querySelector('#camp-abandon');
  if (abandonBtn) abandonBtn.addEventListener('click', _abandon);
  const newBtn = card.querySelector('#camp-new');
  if (newBtn) {
    newBtn.addEventListener('click', async () => {
      _clearStoredIds();
      await _startNewCampaign();
      _render();
    });
  }
  card.querySelectorAll('.camp-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.branch;
      if (key) _chooseBranch(key);
    });
  });
}

export async function openCampaignOverlay() {
  if (!STATE.overlayEl) return;
  await _fetchSummary();
  _render();
  STATE.overlayEl.classList.remove('hidden');
}

export function closeCampaignOverlay() {
  if (!STATE.overlayEl) return;
  STATE.overlayEl.classList.add('hidden');
}

export function initCampaignPanel(_options = {}) {
  _loadStoredIds();

  // Build overlay if missing
  let overlay = document.getElementById('campaign-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'campaign-overlay';
    overlay.className = 'feedback-overlay hidden'; // reuse feedback styles
    overlay.innerHTML = `
      <div class="feedback-card camp-card">
        <div class="feedback-header">
          <h2>Campagna</h2>
          <button id="campaign-close" class="feedback-close" aria-label="Chiudi">✕</button>
        </div>
        <div class="camp-card-body feedback-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  STATE.overlayEl = overlay;

  const closeBtn = overlay.querySelector('#campaign-close');
  if (closeBtn) closeBtn.addEventListener('click', closeCampaignOverlay);

  // ESC close
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeCampaignOverlay();
    }
  });

  // Click outside card = close
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeCampaignOverlay();
  });

  // Wire HUD button
  const hudBtn = document.getElementById('campaign-open');
  if (hudBtn) {
    hudBtn.addEventListener('click', openCampaignOverlay);
  }
}
