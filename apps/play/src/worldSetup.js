// M18 — World setup overlay (phone).
// Party vota scenario proposto dall'host.
// ADR coop-mvp-spec.md §2.4.

const SCENARIO_INFO = {
  enc_tutorial_01: {
    title: 'Tutorial 01 · Primi Passi',
    biome: 'Savana Dorata',
    difficulty: 1,
    duration: '~10 min',
    enemies: 2,
    blurb: 'Incontro base. Nessun boss. Ideale per imparare.',
  },
  enc_tutorial_02: {
    title: 'Tutorial 02 · Pattuglia',
    biome: 'Savana Asimmetrica',
    difficulty: 2,
    duration: '~12 min',
    enemies: 3,
    blurb: 'Nemico flanker. Serve coordinazione.',
  },
  enc_tutorial_03: {
    title: 'Tutorial 03 · Hazard Savana',
    biome: 'Savana con fuoco',
    difficulty: 3,
    duration: '~15 min',
    enemies: 3,
    blurb: 'Tile hazard attivi. Movimento conta.',
  },
  enc_tutorial_04: {
    title: 'Tutorial 04 · Foresta Sanguinante',
    biome: 'Foresta Umida',
    difficulty: 3,
    duration: '~15 min',
    enemies: 3,
    blurb: 'Trait bleeding. Status matter.',
  },
  enc_tutorial_05: {
    title: 'Tutorial 05 · BOSS Apex',
    biome: 'Radura centrale',
    difficulty: 4,
    duration: '~20 min',
    enemies: 4,
    blurb: 'Boss fight. Focus fire obbligatorio.',
  },
};

function getScenarioInfo(id) {
  return (
    SCENARIO_INFO[id] || {
      title: id || 'Scenario',
      biome: '—',
      difficulty: 2,
      duration: '~15 min',
      enemies: 3,
      blurb: 'Scenario personalizzato.',
    }
  );
}

export function renderWorldSetup() {
  if (typeof document === 'undefined') return null;
  let overlay = document.getElementById('world-setup-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'world-setup-overlay';
  overlay.className = 'world-setup-overlay';
  overlay.innerHTML = `
    <div class="ws-wrap">
      <div class="ws-phase">
        <span class="ws-phase-icon">🗺</span>
        <span class="ws-phase-label">Scegliete insieme scenario</span>
      </div>

      <div class="ws-card" id="ws-card">
        <div class="ws-card-header">
          <div class="ws-card-title" id="ws-title">—</div>
          <div class="ws-card-biome" id="ws-biome">—</div>
        </div>
        <div class="ws-card-stats">
          <div class="ws-stat"><span>Diff</span><span id="ws-diff">—</span></div>
          <div class="ws-stat"><span>Durata</span><span id="ws-duration">—</span></div>
          <div class="ws-stat"><span>Nemici</span><span id="ws-enemies">—</span></div>
        </div>
        <div class="ws-card-blurb" id="ws-blurb">—</div>
      </div>

      <div class="ws-vote-row">
        <button type="button" class="ws-vote ws-vote-accept" id="ws-accept">
          👍 D'accordo
        </button>
        <button type="button" class="ws-vote ws-vote-reject" id="ws-reject">
          👎 Altro
        </button>
      </div>
      <div class="ws-status" id="ws-status" aria-live="polite"></div>

      <div class="ws-section">
        <div class="ws-section-title">Tally (<span id="ws-tally-count">0</span>)</div>
        <div class="ws-tally" id="ws-tally">
          <div class="ws-empty">In attesa dei voti…</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

export function wireWorldSetup(overlay, bridge) {
  if (!overlay || !bridge) return null;
  const state = {
    proposedScenarioId: null,
    lastVote: null, // 'accept' | 'reject' | null
    tally: { accept: 0, reject: 0, pending: 0 },
    partyList: [], // [{player_id, name}]
  };

  const titleEl = overlay.querySelector('#ws-title');
  const biomeEl = overlay.querySelector('#ws-biome');
  const diffEl = overlay.querySelector('#ws-diff');
  const durEl = overlay.querySelector('#ws-duration');
  const enEl = overlay.querySelector('#ws-enemies');
  const blurbEl = overlay.querySelector('#ws-blurb');
  const statusEl = overlay.querySelector('#ws-status');
  const acceptBtn = overlay.querySelector('#ws-accept');
  const rejectBtn = overlay.querySelector('#ws-reject');

  const setStatus = (msg, kind) => {
    statusEl.textContent = msg || '';
    statusEl.dataset.kind = kind || '';
  };

  const renderProposal = () => {
    const info = getScenarioInfo(state.proposedScenarioId);
    titleEl.textContent = info.title;
    biomeEl.textContent = info.biome;
    diffEl.textContent = '●'.repeat(info.difficulty) + '○'.repeat(Math.max(0, 5 - info.difficulty));
    durEl.textContent = info.duration;
    enEl.textContent = String(info.enemies);
    blurbEl.textContent = info.blurb;
  };

  const renderTally = () => {
    const list = overlay.querySelector('#ws-tally');
    const count = overlay.querySelector('#ws-tally-count');
    const t = state.tally || {};
    if (count) count.textContent = String((t.accept || 0) + (t.reject || 0));
    const party = state.partyList || [];
    const perPlayer = t.per_player || {};
    if (!party.length) {
      list.innerHTML = '<div class="ws-empty">In attesa dei voti…</div>';
      return;
    }
    list.innerHTML = party
      .map((p) => {
        const v = perPlayer[p.id];
        const kind = v?.accept === true ? 'accept' : v?.accept === false ? 'reject' : 'pending';
        const icon = kind === 'accept' ? '👍' : kind === 'reject' ? '👎' : '💭';
        return `<div class="ws-tally-row ${kind}">
          <span class="ws-tally-name">${p.name || p.id}</span>
          <span class="ws-tally-vote">${icon}</span>
        </div>`;
      })
      .join('');
  };

  const sendVote = async (accept) => {
    if (!state.proposedScenarioId) {
      setStatus('Scenario non caricato', 'err');
      return;
    }
    setStatus('Invio voto…');
    acceptBtn.disabled = true;
    rejectBtn.disabled = true;
    try {
      const res = await fetch('/api/coop/world/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: bridge.session.code,
          player_id: bridge.session.player_id,
          player_token: bridge.session.token,
          scenario_id: state.proposedScenarioId,
          accept,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Errore: ${data?.error || 'HTTP ' + res.status}`, 'err');
        acceptBtn.disabled = false;
        rejectBtn.disabled = false;
        return;
      }
      state.lastVote = accept ? 'accept' : 'reject';
      setStatus(accept ? "👍 D'accordo — attendi altri" : '👎 Rifiutato', 'ok');
      overlay.classList.toggle('voted-accept', accept);
      overlay.classList.toggle('voted-reject', !accept);
      // Re-enable buttons to allow changing vote before confirm.
      acceptBtn.disabled = false;
      rejectBtn.disabled = false;
    } catch (err) {
      setStatus(`Errore rete: ${err.message}`, 'err');
      acceptBtn.disabled = false;
      rejectBtn.disabled = false;
    }
  };

  acceptBtn.addEventListener('click', () => sendVote(true));
  rejectBtn.addEventListener('click', () => sendVote(false));

  return {
    onPhaseChange(payload) {
      const sid = payload?.scenario || null;
      if (sid && sid !== state.proposedScenarioId) {
        state.proposedScenarioId = sid;
        state.lastVote = null;
        overlay.classList.remove('voted-accept', 'voted-reject');
        renderProposal();
        setStatus('');
      }
    },
    onWorldTally(tally) {
      state.tally = tally || state.tally;
      renderTally();
    },
    onPlayersChanged(players) {
      state.partyList = players
        .filter((p) => p.role !== 'host')
        .map((p) => ({ id: p.id, name: p.name || p.id }));
      renderTally();
    },
    show() {
      overlay.classList.remove('ws-hidden');
    },
    hide() {
      overlay.classList.add('ws-hidden');
    },
    destroy() {
      overlay.remove();
    },
  };
}
