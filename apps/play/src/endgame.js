// End-game detection + overlay.

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
  `;

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
  ];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return order[0]; // loop to start
  return order[idx + 1];
}
