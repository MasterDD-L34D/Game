// M13 P3 Phase B — Progression panel UI (XP + perk pick).
//
// Overlay modal per unit selezionata:
//   - XP bar + level + pending level-ups count
//   - Per-level perk pair: A vs B cards, click = pick
//   - Auto-seed on open (job da unit)
//   - Effective stats summary (post-pick preview)
//
// Pattern clonato da formsPanel M12 Phase C (overlay + inject styles + refresh).
// Consumer: main.js attaches header btn "📈 Lv" + auto-open hook post-advance.

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  getSessionId: () => null,
  getSelectedUnit: () => null,
  getCampaignId: () => null,
  onPickSuccess: null,
  lastUnitId: null,
  cachedState: null,
};

function injectStyles() {
  if (document.getElementById('progression-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'progression-panel-styles';
  style.textContent = `
    .progression-overlay {
      position: fixed; inset: 0; z-index: 9995;
      background: rgba(11, 13, 18, 0.78);
      display: none; align-items: flex-start; justify-content: center;
      padding: 32px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .progression-overlay.visible { display: flex; }
    .progression-card {
      max-width: 760px; width: 100%; background: #151922;
      border: 1px solid #2a3040; border-radius: 14px; padding: 22px 24px;
    }
    .progression-card-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    }
    .progression-card-head h2 { margin: 0; font-size: 1.25rem; color: #a5d6a7; }
    .progression-card-head .unit-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #2a3040;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem;
    }
    .progression-card-head .close-btn {
      background: transparent; border: none; color: #ef9a9a;
      cursor: pointer; font-size: 1.2rem;
    }
    .progression-meta {
      display: flex; gap: 14px; flex-wrap: wrap;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 14px; font-size: 0.85rem;
    }
    .progression-meta strong { color: #ffb74d; }
    .xp-bar {
      height: 6px; background: #0b0d12; border-radius: 3px; overflow: hidden;
      margin-top: 6px;
    }
    .xp-bar .xp-fill {
      height: 100%; background: #4caf50; transition: width 0.25s;
    }
    .progression-level-section {
      background: #1d2230; border: 1px solid #2a3040; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 10px;
    }
    .progression-level-section.picked { opacity: 0.55; }
    .progression-level-section h3 {
      margin: 0 0 8px; font-size: 0.95rem; color: #a5d6a7;
    }
    .perk-pair {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    }
    .perk-card {
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 10px 12px; cursor: pointer; transition: border-color 0.15s;
    }
    .perk-card:hover { border-color: #66bb6a; }
    .perk-card.picked { border-color: #66bb6a; background: #1e2d20; cursor: default; }
    .perk-card .perk-name {
      font-weight: 700; color: #ffb74d; font-size: 0.9rem; margin-bottom: 4px;
    }
    .perk-card .perk-desc {
      font-size: 0.8rem; color: #b0b8c8; line-height: 1.35;
    }
    .progression-effective {
      margin-top: 16px;
      background: #0b0d12; border: 1px solid #2a3040; border-radius: 8px;
      padding: 10px 14px; font-size: 0.82rem;
    }
    .progression-effective .stat-chips {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
    }
    .stat-chip {
      background: #151922; border: 1px solid #2a3040; border-radius: 4px;
      padding: 2px 8px; font-family: monospace; font-size: 0.78rem;
    }
    .stat-chip.positive { color: #a5d6a7; border-color: #3d5542; }
    .stat-chip.negative { color: #ef9a9a; border-color: #5e3d3d; }
    .progression-status {
      margin-top: 10px; min-height: 1.2em; font-size: 0.85rem;
    }
    .progression-status.ok { color: #66bb6a; }
    .progression-status.err { color: #ef5350; }
  `;
  document.head.appendChild(style);
}

function buildOverlay() {
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const overlay = document.createElement('div');
  overlay.id = 'progression-overlay';
  overlay.className = 'progression-overlay';
  overlay.innerHTML = `
    <div class="progression-card" role="dialog" aria-label="Progression">
      <div class="progression-card-head">
        <h2>📈 Progression</h2>
        <span class="unit-chip" id="progression-unit-chip">—</span>
        <button type="button" class="close-btn" id="progression-close">✕</button>
      </div>
      <div class="progression-meta" id="progression-meta">
        <span><strong>Level:</strong> <span id="progression-meta-level">—</span></span>
        <span><strong>XP:</strong> <span id="progression-meta-xp">—</span></span>
        <span><strong>Pending:</strong> <span id="progression-meta-pending">—</span></span>
      </div>
      <div class="xp-bar"><div class="xp-fill" id="progression-xp-fill" style="width:0%"></div></div>
      <div id="progression-levels"></div>
      <div class="progression-effective" id="progression-effective-block" style="display:none">
        <strong>Stat effettivi (da perk):</strong>
        <div class="stat-chips" id="progression-stat-chips"></div>
      </div>
      <div class="progression-status" id="progression-status"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#progression-close').addEventListener('click', closeProgressionPanel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeProgressionPanel();
  });
  STATE.overlayEl = overlay;
  return overlay;
}

function setStatus(text, kind = '') {
  const el = document.getElementById('progression-status');
  if (!el) return;
  el.textContent = text || '';
  el.className = `progression-status${kind ? ' ' + kind : ''}`;
}

function renderXpBar(state) {
  const el = document.getElementById('progression-xp-fill');
  if (!el) return;
  // Approximate fill: xp_total / 275 (Lv7 threshold).
  const pct = Math.max(0, Math.min(1, Number(state?.xp_total || 0) / 275));
  el.style.width = `${(pct * 100).toFixed(0)}%`;
}

function renderMeta(state, pendingCount) {
  const lv = document.getElementById('progression-meta-level');
  const xp = document.getElementById('progression-meta-xp');
  const pend = document.getElementById('progression-meta-pending');
  if (lv) lv.textContent = String(state?.level ?? 1);
  if (xp) xp.textContent = String(state?.xp_total ?? 0);
  if (pend) pend.textContent = String(pendingCount);
}

function renderEffective(eff) {
  const block = document.getElementById('progression-effective-block');
  const chips = document.getElementById('progression-stat-chips');
  if (!block || !chips) return;
  const stats = eff?.stats || {};
  const entries = Object.entries(stats).filter(([, v]) => Number(v) !== 0);
  if (entries.length === 0) {
    block.style.display = 'none';
    return;
  }
  block.style.display = '';
  chips.innerHTML = entries
    .map(([k, v]) => {
      const n = Number(v);
      const sign = n > 0 ? '+' : '';
      const cls = n > 0 ? 'positive' : 'negative';
      return `<span class="stat-chip ${cls}">${k}: ${sign}${n}</span>`;
    })
    .join('');
}

function renderLevels(jobPerks, state, pendingByLevel) {
  const container = document.getElementById('progression-levels');
  if (!container) return;
  container.innerHTML = '';
  const entries = Object.entries(jobPerks || {})
    .map(([k, v]) => [Number(k.replace('level_', '')), v])
    .sort((a, b) => a[0] - b[0]);
  if (entries.length === 0) {
    container.innerHTML = '<div style="color:#8891a3">Nessun perk definito.</div>';
    return;
  }
  const pickedByLevel = new Map((state?.picked_perks || []).map((p) => [p.level, p]));
  for (const [level, pair] of entries) {
    const picked = pickedByLevel.get(level);
    const reachable = (state?.level ?? 1) >= level;
    const wrap = document.createElement('div');
    wrap.className = `progression-level-section ${picked ? 'picked' : ''}`;
    if (!reachable) wrap.style.opacity = '0.4';
    const hint = picked
      ? `✓ Scelto: ${picked.perk_id}`
      : reachable
        ? 'Scegli A o B'
        : `Richiede livello ${level}`;
    wrap.innerHTML = `
      <h3>Level ${level} · ${hint}</h3>
      <div class="perk-pair">
        <div class="perk-card ${picked?.choice === 'a' ? 'picked' : ''}" data-level="${level}" data-choice="a">
          <div class="perk-name">${pair.perk_a?.name_it || pair.perk_a?.id || 'A'}</div>
          <div class="perk-desc">${pair.perk_a?.description_it || ''}</div>
        </div>
        <div class="perk-card ${picked?.choice === 'b' ? 'picked' : ''}" data-level="${level}" data-choice="b">
          <div class="perk-name">${pair.perk_b?.name_it || pair.perk_b?.id || 'B'}</div>
          <div class="perk-desc">${pair.perk_b?.description_it || ''}</div>
        </div>
      </div>
    `;
    if (!picked && reachable) {
      for (const card of wrap.querySelectorAll('.perk-card')) {
        card.addEventListener('click', () => {
          const lv = Number(card.dataset.level);
          const ch = card.dataset.choice;
          handlePick(lv, ch);
        });
      }
    }
    container.appendChild(wrap);
  }
}

async function refresh() {
  const unit = STATE.getSelectedUnit();
  if (!unit?.id) {
    setStatus('✖ Nessuna unità selezionata.', 'err');
    return;
  }
  STATE.lastUnitId = unit.id;
  const chip = document.getElementById('progression-unit-chip');
  if (chip) chip.textContent = `${unit.id}${unit.job ? ' · ' + unit.job : ''}`;
  setStatus('Carico stato…');

  const campaignId = STATE.getCampaignId();

  // Load or auto-seed state.
  let stateRes = await api.progressionGet(unit.id, campaignId);
  if (!stateRes.ok) {
    if (!unit.job) {
      setStatus('✖ Unit senza job. Seed skip.', 'err');
      return;
    }
    stateRes = await api.progressionSeed(unit.id, {
      job: unit.job,
      campaign_id: campaignId,
    });
  }
  const state = stateRes.data || {};
  STATE.cachedState = state;

  // Load perk pairs for this job.
  const perkRes = await api.progressionJobPerks(state.job || unit.job);
  if (!perkRes.ok) {
    setStatus(`✖ Perk tree: ${perkRes.data?.error || perkRes.status}`, 'err');
    return;
  }

  // Load effective stats snapshot.
  const effRes = await api.progressionEffective(unit.id, campaignId);
  const eff = effRes.ok ? effRes.data : null;

  // Pending levels: reached but unpicked.
  const pickedLevels = new Set((state.picked_perks || []).map((p) => p.level));
  let pendingCount = 0;
  for (let l = 2; l <= (state.level || 1); l += 1) {
    if (!pickedLevels.has(l)) pendingCount += 1;
  }

  renderXpBar(state);
  renderMeta(state, pendingCount);
  renderLevels(perkRes.data.perks, state, pickedLevels);
  renderEffective(eff);
  setStatus(
    pendingCount > 0
      ? `${pendingCount} scelta/e pending · click card per pick`
      : `Nessuna scelta pending.`,
    'ok',
  );
}

async function handlePick(level, choice) {
  const unit = STATE.getSelectedUnit();
  if (!unit?.id) return;
  setStatus(`Pick Lv${level} ${choice.toUpperCase()}…`);
  const campaignId = STATE.getCampaignId();
  const res = await api.progressionPickPerk(unit.id, {
    level,
    choice,
    campaign_id: campaignId,
  });
  if (!res.ok) {
    setStatus(`✖ ${res.data?.error || 'pick failed'}`, 'err');
    return;
  }
  setStatus(`✓ Scelto: ${res.data.picked_perk?.name_it || res.data.picked_perk?.id}`, 'ok');
  if (typeof STATE.onPickSuccess === 'function') {
    try {
      STATE.onPickSuccess({ unitId: unit.id, level, choice, perk: res.data.picked_perk });
    } catch {
      /* non-critical */
    }
  }
  await refresh();
}

export function openProgressionPanel() {
  buildOverlay();
  STATE.overlayEl.classList.add('visible');
  refresh();
}

export function closeProgressionPanel() {
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
}

export function initProgressionPanel({
  getSessionId,
  getSelectedUnit,
  getCampaignId,
  onPickSuccess,
  buttonId = 'progression-open',
} = {}) {
  STATE.getSessionId = typeof getSessionId === 'function' ? getSessionId : () => null;
  STATE.getSelectedUnit = typeof getSelectedUnit === 'function' ? getSelectedUnit : () => null;
  STATE.getCampaignId = typeof getCampaignId === 'function' ? getCampaignId : () => null;
  STATE.onPickSuccess = typeof onPickSuccess === 'function' ? onPickSuccess : null;
  buildOverlay();
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.addEventListener('click', openProgressionPanel);
  }
  return { openProgressionPanel, closeProgressionPanel, refresh };
}
