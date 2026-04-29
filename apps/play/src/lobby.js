// M11 Phase B — Lobby picker bootstrap.
// ADR-2026-04-20 (protocol) + kickoff Phase B.
//
// Responsibilities:
//   - Render create/join forms (HTML in /lobby.html)
//   - POST /api/lobby/create | /api/lobby/join
//   - Persist session in localStorage via `saveLobbySession`
//   - Redirect to /index.html (game shell) which detects role + connects WS
//   - Offer "resume" if a stored session exists

import {
  saveLobbySession,
  loadLobbySession,
  clearLobbySession,
  LOBBY_STORAGE_KEY,
} from './network.js';

async function postJson(path, body) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, networkError: true, message: err?.message };
  }
}

function setStatus(id, text, kind = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
  el.className = `status${kind ? ' ' + kind : ''}`;
}

function setFormDisabled(form, disabled) {
  if (!form) return;
  for (const el of form.elements) el.disabled = disabled;
}

function redirectToGame() {
  // Absolute path so it works under Vite dev (port 5180) + build preview.
  window.location.href = './index.html';
}

function renderExistingSession() {
  const existing = loadLobbySession();
  const banner = document.getElementById('existing-session');
  if (!existing || !banner) return;
  document.getElementById('existing-code').textContent = existing.code;
  document.getElementById('existing-role').textContent = existing.role;
  banner.classList.add('visible');
  document.getElementById('existing-resume').addEventListener('click', () => {
    redirectToGame();
  });
  document.getElementById('existing-forget').addEventListener('click', () => {
    clearLobbySession();
    banner.classList.remove('visible');
  });
}

function initCreateForm() {
  const form = document.getElementById('form-create');
  if (!form) return;
  const sharePanel = document.getElementById('share-panel');
  const shareCode = document.getElementById('share-code');
  const shareUrl = document.getElementById('share-url-input');
  const shareCopy = document.getElementById('share-copy');
  const shareEnter = document.getElementById('share-enter');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setStatus('status-create', '');
    const hostName = document.getElementById('host-name').value.trim();
    const campaignIdRaw = document.getElementById('campaign-id').value.trim();
    const maxPlayers = Number(document.getElementById('max-players').value) || 4;
    if (!hostName) {
      setStatus('status-create', 'Nome host richiesto.', 'err');
      return;
    }
    setFormDisabled(form, true);
    setStatus('status-create', 'Creazione stanza in corso…');

    const payload = { host_name: hostName, max_players: maxPlayers };
    if (campaignIdRaw) payload.campaign_id = campaignIdRaw;

    const res = await postJson('/api/lobby/create', payload);
    setFormDisabled(form, false);
    if (!res.ok || !res.data?.code) {
      setStatus(
        'status-create',
        `Errore: ${res.data?.error || res.message || `HTTP ${res.status}`}`,
        'err',
      );
      return;
    }

    const { code, host_id, host_token, campaign_id } = res.data;
    const session = {
      code,
      player_id: host_id,
      token: host_token,
      role: 'host',
      host_id,
      campaign_id: campaign_id || null,
    };
    saveLobbySession(session);

    if (sharePanel) {
      shareCode.textContent = code;
      // Share URL: current origin + /lobby.html — users on phone load + auto-fill code.
      const url = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}lobby.html?code=${code}`;
      shareUrl.value = url;
      sharePanel.classList.add('visible');
      // 2026-04-29 master-dd request: QR code visibile per join rapido smartphone.
      // api.qrserver.com gratis, zero npm dep, zero approval. Online OK (ngrok pubblico = require internet anyway).
      const qrWrap = document.getElementById('share-qr-wrap');
      const qrImg = document.getElementById('share-qr');
      if (qrWrap && qrImg) {
        const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(url)}`;
        qrImg.src = qrApi;
        qrWrap.classList.add('visible');
      }
    }
    setStatus('status-create', `✓ Stanza ${code} creata. Premi Entra nella TV per avviare.`, 'ok');
  });

  if (shareCopy) {
    shareCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl.value);
        shareCopy.textContent = '✓';
        setTimeout(() => (shareCopy.textContent = '📋'), 1500);
      } catch {
        shareUrl.select();
      }
    });
  }
  if (shareEnter) {
    shareEnter.addEventListener('click', () => redirectToGame());
  }
}

function initJoinForm() {
  const form = document.getElementById('form-join');
  if (!form) return;
  const codeInput = document.getElementById('join-code');

  // Auto-uppercase + restrict to consonants (alphabet from ADR-2026-04-20).
  codeInput?.addEventListener('input', (ev) => {
    const up = ev.target.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    if (up !== ev.target.value) ev.target.value = up;
  });

  // Auto-populate code from ?code= URL param (invite link).
  try {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode && codeInput) {
      codeInput.value = urlCode
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 4);
      document.getElementById('player-name')?.focus();
    }
  } catch {
    // noop
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setStatus('status-join', '');
    const code = codeInput.value.toUpperCase().trim();
    const playerName = document.getElementById('player-name').value.trim();
    if (code.length !== 4) {
      setStatus('status-join', 'Codice deve essere 4 lettere.', 'err');
      return;
    }
    if (!playerName) {
      setStatus('status-join', 'Nome richiesto.', 'err');
      return;
    }
    setFormDisabled(form, true);
    setStatus('status-join', 'Connessione alla stanza…');
    const res = await postJson('/api/lobby/join', { code, player_name: playerName });
    setFormDisabled(form, false);
    if (!res.ok || !res.data?.player_id) {
      setStatus(
        'status-join',
        `Errore: ${res.data?.error || res.message || `HTTP ${res.status}`}`,
        'err',
      );
      return;
    }
    const { player_id, player_token, room } = res.data;
    const session = {
      code,
      player_id,
      token: player_token,
      role: 'player',
      host_id: room?.host_id || null,
      campaign_id: room?.campaign_id || null,
    };
    saveLobbySession(session);
    setStatus('status-join', '✓ Connesso. Apertura gioco…', 'ok');
    setTimeout(() => redirectToGame(), 300);
  });
}

function init() {
  renderExistingSession();
  initCreateForm();
  initJoinForm();
  // Dev aid: log storage key for debugging session state.
  if (typeof console !== 'undefined') {
    console.info(`[lobby] localStorage key: ${LOBBY_STORAGE_KEY}`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
