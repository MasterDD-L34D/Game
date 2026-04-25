// M19 — Debrief overlay (phone).
// Post-combat summary: outcome + XP + narrative + ready button.
// ADR coop-mvp-spec.md §2.6.

export function renderDebriefPanel() {
  if (typeof document === 'undefined') return null;
  let overlay = document.getElementById('debrief-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'debrief-overlay';
  overlay.className = 'debrief-overlay';
  overlay.innerHTML = `
    <div class="db-wrap">
      <div class="db-outcome" id="db-outcome" data-kind="victory">
        <span class="db-outcome-icon">🏁</span>
        <span class="db-outcome-label">Round concluso</span>
      </div>

      <div class="db-card">
        <div class="db-card-title">IL TUO PG</div>
        <div class="db-card-row">
          <span class="db-card-name" id="db-pg-name">—</span>
          <span class="db-card-level" id="db-pg-level">Lv 1</span>
        </div>
        <div class="db-card-stats">
          <div class="db-stat"><span>XP</span><span id="db-xp">0</span></div>
          <div class="db-stat"><span>HP</span><span id="db-hp">—/—</span></div>
          <div class="db-stat"><span>Survived</span><span id="db-survived">✓</span></div>
        </div>
      </div>

      <div class="db-section" id="db-evolve-section" style="display:none">
        <div class="db-section-title">Evoluzione Form disponibile</div>
        <div class="db-evolve-card">
          <div class="db-evolve-title" id="db-evolve-title">—</div>
          <div class="db-evolve-blurb" id="db-evolve-blurb">—</div>
          <div class="db-evolve-row">
            <button type="button" class="db-evolve-btn" id="db-evolve-yes">🧬 Evolve</button>
            <button type="button" class="db-skip-btn" id="db-evolve-no">⏭ Mantieni</button>
          </div>
        </div>
      </div>

      <div class="db-section" id="db-rewards-section" style="display:none">
        <div class="db-section-title">🎁 Ricompense Tri-Sorgente</div>
        <div class="db-rewards-list" id="db-rewards-list">
          <div class="db-empty">Caricamento offerte…</div>
        </div>
        <button type="button" class="db-skip-btn" id="db-rewards-skip">⏭ Skip (+1 Frammento Genetico)</button>
      </div>

      <div class="db-section">
        <div class="db-section-title">Cronaca del round</div>
        <div class="db-narrative" id="db-narrative">
          <div class="db-empty">Nessun evento registrato</div>
        </div>
      </div>

      <button type="button" class="db-ready" id="db-ready">
        ✅ Pronto — prossimo scenario
      </button>
      <div class="db-status" id="db-status" aria-live="polite"></div>

      <div class="db-section" id="db-skiv-section">
        <div class="db-section-title">🦎 Skiv — riflessione</div>
        <pre class="db-skiv-card" id="db-skiv-card">[ Skiv tace. Sabbia ferma. ]</pre>
      </div>

      <div class="db-section">
        <div class="db-section-title">Party (<span id="db-party-count">0</span>)</div>
        <div class="db-party" id="db-party"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/** Compone testo narrativo italiano da events combat. */
function narrativeFromEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return [];
  const out = [];
  for (const e of events.slice(-20)) {
    const actor = e.actor || e.actor_id || '?';
    const target = e.target || e.target_id || '?';
    const kind = e.kind || e.type || e.action || 'event';
    switch (kind) {
      case 'attack':
      case 'attack_hit': {
        const dmg = e.damage ?? e.dmg ?? '?';
        const crit = e.critical ? ' (crit!)' : '';
        out.push(`${actor} colpisce ${target} per ${dmg}${crit}.`);
        break;
      }
      case 'attack_miss':
        out.push(`${actor} manca ${target}.`);
        break;
      case 'move':
        out.push(`${actor} si muove.`);
        break;
      case 'defend':
        out.push(`${actor} si difende.`);
        break;
      case 'unit_dead':
      case 'death':
        out.push(`💀 ${actor} è stato eliminato.`);
        break;
      case 'heal':
        out.push(`${actor} recupera HP.`);
        break;
      default:
        out.push(`${actor} ${kind}${target !== '?' ? ` → ${target}` : ''}.`);
    }
  }
  return out;
}

export function wireDebriefPanel(overlay, bridge) {
  if (!overlay || !bridge) return null;
  const state = {
    submitted: false,
    lastState: null,
    outcome: 'victory',
    partyList: [],
    readySet: new Set(),
  };

  const outcomeEl = overlay.querySelector('#db-outcome');
  const outcomeLabel = overlay.querySelector('.db-outcome-label');
  const outcomeIcon = overlay.querySelector('.db-outcome-icon');
  const readyBtn = overlay.querySelector('#db-ready');
  const statusEl = overlay.querySelector('#db-status');

  const setStatus = (msg, kind) => {
    statusEl.textContent = msg || '';
    statusEl.dataset.kind = kind || '';
  };

  const renderOutcome = () => {
    const isWin = state.outcome !== 'defeat' && state.outcome !== 'timeout';
    outcomeEl.dataset.kind = isWin ? 'victory' : 'defeat';
    outcomeIcon.textContent = isWin ? '🏆' : state.outcome === 'timeout' ? '⏱' : '💀';
    outcomeLabel.textContent = isWin
      ? 'Vittoria!'
      : state.outcome === 'timeout'
        ? 'Tempo scaduto'
        : 'Sconfitta';
  };

  const renderPgCard = () => {
    const myUnit = findMyUnit(state.lastState, bridge.session.player_id);
    if (!myUnit) {
      overlay.querySelector('#db-pg-name').textContent = '—';
      overlay.querySelector('#db-pg-level').textContent = 'Lv ?';
      overlay.querySelector('#db-xp').textContent = '—';
      overlay.querySelector('#db-hp').textContent = '—/—';
      overlay.querySelector('#db-survived').textContent = '—';
      return;
    }
    overlay.querySelector('#db-pg-name').textContent = myUnit.name || myUnit.id;
    overlay.querySelector('#db-pg-level').textContent = `Lv ${myUnit.level ?? 1}`;
    overlay.querySelector('#db-xp').textContent = String(myUnit.xp ?? 0);
    const hp = myUnit.hp ?? 0;
    const hpMax = myUnit.hp_max ?? myUnit.max_hp ?? hp;
    overlay.querySelector('#db-hp').textContent = `${hp}/${hpMax}`;
    overlay.querySelector('#db-survived').textContent = hp > 0 ? '✓' : '✗';
  };

  const renderNarrative = () => {
    const list = overlay.querySelector('#db-narrative');
    const events = state.lastState?.events || [];
    const lines = narrativeFromEvents(events);
    if (lines.length === 0) {
      list.innerHTML = '<div class="db-empty">Nessun evento registrato</div>';
      return;
    }
    list.innerHTML = lines.map((l) => `<div class="db-narrative-row">${l}</div>`).join('');
    list.scrollTop = list.scrollHeight;
  };

  // Skiv-as-Monitor — mini card render in debrief (Phase 2 wire 2026-04-25).
  // Fetch text/plain ASCII card from backend; graceful fallback if offline.
  const renderSkivMonitorCard = async () => {
    const cardEl = overlay.querySelector('#db-skiv-card');
    if (!cardEl) return;
    try {
      const res = await fetch('/api/skiv/card', { cache: 'no-store' });
      if (!res.ok) {
        cardEl.textContent = '[ Skiv dorme. Monitor non ha girato. ]';
        return;
      }
      const text = await res.text();
      cardEl.textContent = text || '[ Skiv tace. ]';
    } catch {
      cardEl.textContent = '[ Backend irraggiungibile. Sabbia tace. ]';
    }
  };

  const renderParty = () => {
    const list = overlay.querySelector('#db-party');
    const count = overlay.querySelector('#db-party-count');
    const entries = state.partyList || [];
    if (count) count.textContent = String(entries.length);
    if (!entries.length) {
      list.innerHTML = '<div class="db-empty">Solo tu per ora</div>';
      return;
    }
    list.innerHTML = entries
      .map((p) => {
        const ready = state.readySet.has(p.id);
        return `<div class="db-party-row ${ready ? 'ready' : 'pending'}">
          <span class="db-party-dot"></span>
          <span class="db-party-name">${p.name || p.id}</span>
          <span class="db-party-status">${ready ? '✅ pronto' : '💭'}</span>
        </div>`;
      })
      .join('');
  };

  const render = () => {
    renderOutcome();
    renderPgCard();
    renderNarrative();
    renderParty();
    // Fire-and-forget: Skiv card refresh ad ogni render debrief.
    renderSkivMonitorCard();
  };

  readyBtn.addEventListener('click', async () => {
    if (state.submitted) return;
    setStatus('Invio…');
    readyBtn.disabled = true;
    try {
      const res = await fetch('/api/coop/debrief/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: bridge.session.code,
          player_id: bridge.session.player_id,
          player_token: bridge.session.token,
          choice: { type: 'skip' },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Errore: ${data?.error || 'HTTP ' + res.status}`, 'err');
        readyBtn.disabled = false;
        return;
      }
      state.submitted = true;
      state.readySet.add(bridge.session.player_id);
      renderParty();
      setStatus('✓ Pronto — attendi altri', 'ok');
    } catch (err) {
      setStatus(`Errore rete: ${err.message}`, 'err');
      readyBtn.disabled = false;
    }
  });

  // V2 Tri-Sorgente — reward offer section
  const rewardsSection = overlay.querySelector('#db-rewards-section');
  const rewardsList = overlay.querySelector('#db-rewards-list');
  const rewardsSkipBtn = overlay.querySelector('#db-rewards-skip');

  async function fetchAndRenderRewards(campaignId, actorId) {
    if (!rewardsSection || !campaignId) return;
    rewardsSection.style.display = '';
    rewardsList.innerHTML = '<div class="db-empty">Caricamento…</div>';
    try {
      const res = await fetch('/api/rewards/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, actor_id: actorId || null }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.offers)) {
        rewardsList.innerHTML = '<div class="db-empty">Offerte non disponibili</div>';
        return;
      }
      rewardsList.innerHTML = '';
      for (const o of data.offers) {
        const card = document.createElement('div');
        card.className = 'db-evolve-card';
        card.innerHTML = `
          <div class="db-evolve-title">${o.card?.label || o.card?.id || '—'}</div>
          <div class="db-evolve-blurb">${o.card?.rarity || 'common'} · score ${Number(o.score || 0).toFixed(2)}</div>
        `;
        rewardsList.appendChild(card);
      }
    } catch (err) {
      rewardsList.innerHTML = `<div class="db-empty">Errore: ${err.message}</div>`;
    }
  }

  if (rewardsSkipBtn) {
    rewardsSkipBtn.addEventListener('click', async () => {
      const cid = state.campaignId;
      if (!cid) return;
      try {
        await fetch('/api/rewards/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: cid, reason: 'skip_offer' }),
        });
        setStatus('✓ Skip: +1 Frammento Genetico', 'ok');
        rewardsSection.style.display = 'none';
      } catch (err) {
        setStatus(`Errore skip: ${err.message}`, 'err');
      }
    });
  }

  return {
    setState(worldState, outcome) {
      state.lastState = worldState;
      if (outcome) state.outcome = outcome;
      render();
    },
    // V2 Tri-Sorgente — called post-victory when campaign_id available
    showRewardOffer(campaignId, actorId) {
      state.campaignId = campaignId;
      if (state.outcome === 'victory') fetchAndRenderRewards(campaignId, actorId);
    },
    setReadyList(list) {
      state.readySet.clear();
      for (const id of list || []) state.readySet.add(id);
      renderParty();
    },
    setParty(players) {
      state.partyList = players
        .filter((p) => p.role !== 'host')
        .map((p) => ({ id: p.id, name: p.name || p.id }));
      renderParty();
    },
    show() {
      overlay.classList.remove('db-hidden');
    },
    hide() {
      overlay.classList.add('db-hidden');
    },
    reset() {
      state.submitted = false;
      state.readySet.clear();
      readyBtn.disabled = false;
      setStatus('');
    },
  };
}

function findMyUnit(worldState, playerId) {
  if (!worldState || !Array.isArray(worldState.units)) return null;
  return (
    worldState.units.find((u) => u.owner_id === playerId) ||
    worldState.units.find((u) => u.owned_by === playerId) ||
    null
  );
}
