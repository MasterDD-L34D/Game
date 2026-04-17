// UI helpers — sidebar units + log.

export function renderUnits(ul, state, selectedId, onClick) {
  ul.innerHTML = '';
  for (const u of state.units || []) {
    const li = document.createElement('li');
    li.classList.add(u.controlled_by === 'player' ? 'player' : 'sistema');
    if (u.hp <= 0) li.classList.add('dead');
    if (u.id === state.active_unit) li.classList.add('active');
    if (u.id === selectedId) li.classList.add('selected');

    const ratio = u.hp / (u.max_hp || u.hp || 1);
    const hpClass = ratio < 0.3 ? 'crit' : ratio < 0.6 ? 'warn' : '';

    li.innerHTML = `
      <strong>${u.id}</strong>
      <span class="hp-bar ${hpClass}"><span style="width:${Math.max(0, ratio * 100).toFixed(0)}%"></span></span>
      ${u.hp}/${u.max_hp || u.hp}
      · AP ${u.ap_remaining ?? u.ap}/${u.ap}
      ${u.position ? `· [${u.position.x},${u.position.y}]` : ''}
      ${u.job ? `· <em>${u.job}</em>` : ''}
    `;
    li.addEventListener('click', () => onClick(u));
    ul.appendChild(li);
  }
}

export function appendLog(logEl, msg, kind = 'event') {
  const div = document.createElement('div');
  div.className = kind;
  const ts = new Date().toLocaleTimeString('it-IT');
  div.textContent = `[${ts}] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

export function updateStatus(state) {
  const turnEl = document.getElementById('turn-info');
  const activeEl = document.getElementById('active-info');
  if (turnEl) turnEl.textContent = `Turn ${state.turn || 0}`;
  if (activeEl) activeEl.textContent = `Active: ${state.active_unit || '—'}`;
}
