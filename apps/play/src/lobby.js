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

async function probeRejoin(session) {
  // B-NEW-4 fix 2026-05-08 — validate localStorage session via REST before
  // bouncing to game shell. Pre-fix: phone exit + reopen returned to lobby
  // home with no rejoin path (game shell WS attempt failed silently).
  // Post-fix: explicit 200 → safe to redirect; 401/404/410 → clear stale.
  try {
    const res = await fetch('/api/lobby/rejoin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: session.code,
        player_id: session.player_id,
        player_token: session.token,
      }),
    });
    if (res.ok) {
      // Codex P2 #2133: parse server-canonical role + host_id. Old host
      // tokens stay valid post host_transfer (TKT-M11B-05 promotes a
      // player → role moves to candidate, but JWT signature unchanged).
      // Without this update, a returning ex-host bridge boots `isHost=true`
      // from stale localStorage and hits host-only UI/API with player
      // permissions. Caller persists the parsed role pre-redirect.
      let body = null;
      try {
        body = await res.json();
      } catch {
        // body absent or non-JSON; ok=true is still trustworthy.
      }
      return {
        ok: true,
        role: body?.role || null,
        host_id: body?.room?.host_id || null,
        campaign_id: body?.room?.campaign_id || null,
      };
    }
    let reason = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) reason = data.error;
    } catch {
      // body not JSON; keep status code
    }
    return { ok: false, status: res.status, reason };
  } catch (err) {
    // Network failure → keep banner visible so user can retry instead of
    // silently dropping the session.
    return { ok: false, status: 0, reason: err?.message || 'network_error', network: true };
  }
}

function renderExistingSession() {
  const existing = loadLobbySession();
  const banner = document.getElementById('existing-session');
  if (!existing || !banner) return;
  document.getElementById('existing-code').textContent = existing.code;
  document.getElementById('existing-role').textContent = existing.role;
  banner.classList.add('visible');
  const resumeBtn = document.getElementById('existing-resume');
  resumeBtn.addEventListener('click', async () => {
    resumeBtn.disabled = true;
    const original = resumeBtn.textContent;
    resumeBtn.textContent = '⏳ Verifico…';
    const probe = await probeRejoin(existing);
    if (probe.ok) {
      // Codex P2 #2133: persist server-canonical role/host_id so bridge
      // boots with current authority (handles host_transfer demotion).
      const updated = { ...existing };
      let dirty = false;
      if (probe.role && probe.role !== existing.role) {
        updated.role = probe.role;
        dirty = true;
      }
      if (probe.host_id && probe.host_id !== existing.host_id) {
        updated.host_id = probe.host_id;
        dirty = true;
      }
      if (probe.campaign_id !== null && probe.campaign_id !== existing.campaign_id) {
        updated.campaign_id = probe.campaign_id;
        dirty = true;
      }
      if (dirty) saveLobbySession(updated);
      redirectToGame();
      return;
    }
    resumeBtn.disabled = false;
    resumeBtn.textContent = original;
    if (probe.network) {
      // Transient network issue: keep session, surface error.
      const msg = document.createElement('div');
      msg.className = 'status err';
      msg.style.marginTop = '8px';
      msg.textContent = `Errore rete (${probe.reason}). Riprova.`;
      banner.appendChild(msg);
      setTimeout(() => msg.remove(), 4000);
      return;
    }
    // Stale session (room closed / token invalid / not found): clear + hide.
    clearLobbySession();
    banner.classList.remove('visible');
    const codeInput = document.getElementById('join-code');
    if (codeInput && existing.code) {
      codeInput.value = existing.code;
    }
    const status = document.getElementById('status-join');
    if (status) {
      status.className = 'status err';
      status.textContent = `Sessione precedente non più valida (${probe.reason}). Crea o unisciti di nuovo.`;
    }
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

  // Auto-populate code from ?code= or ?room= URL param (invite link).
  // B-NEW-3 fix 2026-05-08 — accept both `code` (canonical Game/ share)
  // and `room` (Godot v2 phone share) aliases. Pre-fix: phone deep-link
  // `?room=XXXX` only filled the input; user still tapped Create CTA by
  // default → 3 lobby orfane in <5min during friends-online smoke. Now:
  // when either param present we promote the Join card visually + scroll
  // it into view + focus the name input so Join is the obvious action.
  try {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code') || params.get('room');
    if (urlCode && codeInput) {
      const sanitized = urlCode
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 4);
      codeInput.value = sanitized;
      const joinCard = form.closest('.card');
      if (joinCard) {
        joinCard.classList.add('card-primary');
        try {
          joinCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // older browsers: scrollIntoView() w/o options
          joinCard.scrollIntoView();
        }
      }
      // De-emphasize Create card so the user does not default-tap it.
      const createCard = document.getElementById('form-create')?.closest('.card');
      if (createCard) createCard.classList.add('card-secondary');
      const status = document.getElementById('status-join');
      if (status) {
        status.className = 'status ok';
        status.textContent = `Codice ${sanitized} pronto. Inserisci il tuo nome ed entra.`;
      }
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
