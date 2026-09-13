// End-game detection + overlay (con VC debrief integrato).

import { api } from './api.js';
import { renderPromotionPanel } from './promotionPanel.js';

function renderVcBlock(vcSnapshot) {
  if (!vcSnapshot || !vcSnapshot.per_actor) return '';
  const players = Object.entries(vcSnapshot.per_actor).filter(
    ([, v]) => v && v.controlled_by === 'player',
  );
  if (players.length === 0) return '';

  const rows = players.map(([uid, v]) => {
    const mbti = v.mbti || v.mbti_type || '—';
    const enneaEntries = v.ennea || v.ennea_top || {};
    const topEnnea = Array.isArray(enneaEntries)
      ? enneaEntries[0]
      : Object.entries(enneaEntries).sort((a, b) => b[1] - a[1])[0];
    const enneaStr = topEnnea
      ? Array.isArray(topEnnea)
        ? `${topEnnea[0]} (${Number(topEnnea[1]).toFixed(2)})`
        : String(topEnnea)
      : '—';
    const aggr = v.aggregates || {};
    const agg = Object.entries(aggr)
      .slice(0, 3)
      .map(([k, val]) => `${k}: ${typeof val === 'number' ? val.toFixed(2) : val}`)
      .join(' · ');
    return `<div class="vc-row">
      <strong>${uid}</strong>
      <span class="vc-mbti">${mbti}</span>
      <span class="vc-ennea">Ennea ${enneaStr}</span>
      <div class="vc-agg">${agg || '—'}</div>
    </div>`;
  });
  return `<div class="vc-block"><h3>VC · come hai giocato</h3>${rows.join('')}</div>`;
}

export function detectEndgame(state) {
  if (!state || !Array.isArray(state.units)) return null;
  const player = state.units.filter((u) => u.controlled_by === 'player');
  const sistema = state.units.filter((u) => u.controlled_by === 'sistema');
  const allPlayerDead = player.length > 0 && player.every((u) => u.hp <= 0);
  const allSisDead = sistema.length > 0 && sistema.every((u) => u.hp <= 0);
  if (allSisDead) return 'victory';
  if (allPlayerDead) return 'defeat';
  return null;
}

export function showEndgame(result, state, handlers) {
  const overlay = document.getElementById('endgame-overlay');
  const title = document.getElementById('endgame-title');
  const stats = document.getElementById('endgame-stats');
  if (!overlay || !title || !stats) return;

  overlay.classList.remove('hidden');
  title.textContent = result === 'victory' ? '🏆 Vittoria!' : '☠ Sconfitta';
  title.className = result === 'victory' ? 'win' : 'lose';

  const playerHpLost = (state.units || [])
    .filter((u) => u.controlled_by === 'player')
    .reduce((sum, u) => sum + Math.max(0, (u.max_hp || u.hp || 0) - u.hp), 0);
  const sistemaHpLost = (state.units || [])
    .filter((u) => u.controlled_by === 'sistema')
    .reduce((sum, u) => sum + Math.max(0, (u.max_hp || u.hp || 0) - u.hp), 0);

  stats.innerHTML = `
    Turni: <strong>${state.turn || 0}</strong><br>
    HP persi PG: <strong>${playerHpLost}</strong><br>
    HP inflitti a Sistema: <strong>${sistemaHpLost}</strong><br>
    Session: <code>${(state.session_id || '').slice(0, 8) || '—'}</code>
    <div id="vc-debrief-slot" class="vc-loading">⏳ Calcolo VC…</div>
  `;

  // Async VC fetch (non blocca overlay)
  if (state.session_id) {
    api.vc(state.session_id).then((r) => {
      const slot = document.getElementById('vc-debrief-slot');
      if (!slot) return;
      if (r.ok && r.data) {
        slot.className = '';
        slot.innerHTML = renderVcBlock(r.data);
      } else {
        slot.className = 'vc-error';
        slot.textContent = '⚠ VC non disponibile';
      }
    });
  }

  // TKT-M15-FE — Promotion panel (victory only; defeat path doesn't grant
  // promotion eligibility usually but engine returns reason=thresholds_not_met
  // gracefully so rendering on defeat is a noop empty state).
  if (result === 'victory' && state.session_id) {
    try {
      renderPromotionPanel(state.session_id, document.getElementById('endgame-stats'));
    } catch (err) {
      console.warn('[promotion] render error', err);
    }
  }

  document.getElementById('endgame-next').onclick = handlers.next;
  document.getElementById('endgame-retry').onclick = handlers.retry;
  document.getElementById('endgame-close').onclick = () => overlay.classList.add('hidden');
}

export function hideEndgame() {
  const overlay = document.getElementById('endgame-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function nextScenarioId(current) {
  const order = [
    'enc_tutorial_01',
    'enc_tutorial_02',
    'enc_tutorial_03',
    'enc_tutorial_04',
    'enc_tutorial_05',
    'enc_tutorial_06_hardcore',
  ];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return order[0]; // loop to start
  return order[idx + 1];
}
