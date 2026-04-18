// UI helpers — sidebar units + log.

const STATUS_LABELS = {
  panic: { label: 'Panic', icon: '!', color: '#ff9800' },
  rage: { label: 'Rage', icon: '⚡', color: '#f44336' },
  stunned: { label: 'Stun', icon: '★', color: '#9c27b0' },
  focused: { label: 'Focus', icon: '◎', color: '#03a9f4' },
  confused: { label: 'Confuse', icon: '?', color: '#ffc107' },
  bleeding: { label: 'Bleed', icon: '☽', color: '#e91e63' },
  fracture: { label: 'Fract', icon: '✕', color: '#795548' },
  sbilanciato: { label: 'Sbil', icon: '↯', color: '#ffeb3b' },
  taunted_by: { label: 'Taunt', icon: '⎯', color: '#ffc107' },
  aggro_locked: { label: 'Aggro', icon: '◉', color: '#ff5722' },
};

function renderStatusChips(unit) {
  const status = unit.status || {};
  const chips = [];
  for (const [key, meta] of Object.entries(STATUS_LABELS)) {
    const v = status[key];
    if (v !== undefined && v !== null && (typeof v !== 'number' || v > 0)) {
      const label = typeof v === 'number' && v > 1 ? `${meta.label} (${v})` : meta.label;
      chips.push(
        `<span class="status-chip" style="background:${meta.color}" title="${key}">${meta.icon} ${label}</span>`,
      );
    }
  }
  return chips.join('');
}

export function renderUnits(ul, state, selectedId, onClick) {
  ul.innerHTML = '';
  for (const u of state.units || []) {
    const li = document.createElement('li');
    li.classList.add(u.controlled_by === 'player' ? 'player' : 'sistema');
    if (u.hp <= 0) li.classList.add('dead');
    if (u.id === state.active_unit) li.classList.add('active');
    if (u.id === selectedId) li.classList.add('selected');
    // W2.4 — data-job attribute drives CSS accent per job class
    const jobKey = (u.job || u.class || '').toString().toLowerCase().trim();
    if (jobKey) li.setAttribute('data-job', jobKey);

    const ratio = u.hp / (u.max_hp || u.hp || 1);
    const hpClass = ratio < 0.3 ? 'crit' : ratio < 0.6 ? 'warn' : '';
    const apRemaining = u.ap_remaining ?? u.ap;
    const apMax = u.ap;
    const apRatio = apMax > 0 ? apRemaining / apMax : 0;

    const statusChips = renderStatusChips(u);

    li.innerHTML = `
      <div class="unit-head">
        <strong>${u.id}</strong>
        ${u.job ? `<span class="unit-job">${u.job}</span>` : ''}
        ${u.species ? `<span class="unit-species" title="species">${u.species}</span>` : ''}
      </div>
      <div class="unit-bars">
        <div class="bar-row">
          <span class="bar-label">HP</span>
          <span class="hp-bar ${hpClass}"><span style="width:${Math.max(0, ratio * 100).toFixed(0)}%"></span></span>
          <span class="bar-value">${u.hp}/${u.max_hp || u.hp}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">AP</span>
          <span class="ap-bar"><span style="width:${Math.max(0, apRatio * 100).toFixed(0)}%"></span></span>
          <span class="bar-value">${apRemaining}/${apMax}</span>
        </div>
      </div>
      <div class="unit-stats">
        ${u.position ? `<span>📍 [${u.position.x},${u.position.y}]</span>` : ''}
        ${u.dc != null ? `<span>DC ${u.dc}</span>` : ''}
        ${u.mod != null ? `<span>+${u.mod}</span>` : ''}
        ${u.attack_range ? `<span>range ${u.attack_range}</span>` : ''}
        ${u.guardia ? `<span>guardia ${u.guardia}</span>` : ''}
      </div>
      ${statusChips ? `<div class="unit-status-row">${statusChips}</div>` : ''}
      ${u.ai_profile ? `<div class="unit-ai">AI: <code>${u.ai_profile}</code></div>` : ''}
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

// Sistema pressure tier mapping (mirror PRESSURE_TIER_INTENT_CAP backend).
// Esposto come progress meter UI per leggibilità tattica (AI War pattern).
const PRESSURE_TIERS = [
  { threshold: 95, label: 'APEX', color: '#d32f2f', intents: 4 },
  { threshold: 75, label: 'CRITICAL', color: '#f57c00', intents: 3 },
  { threshold: 50, label: 'ESCALATED', color: '#fbc02d', intents: 3 },
  { threshold: 25, label: 'ALERT', color: '#7cb342', intents: 2 },
  { threshold: 0, label: 'CALM', color: '#43a047', intents: 1 },
];

function pressureTier(p) {
  const v = Number.isFinite(Number(p)) ? Math.max(0, Math.min(100, Number(p))) : 0;
  for (const t of PRESSURE_TIERS) if (v >= t.threshold) return { ...t, value: v };
  return { ...PRESSURE_TIERS[PRESSURE_TIERS.length - 1], value: v };
}

export function updateStatus(state) {
  const turnEl = document.getElementById('turn-info');
  const activeEl = document.getElementById('active-info');
  if (turnEl) turnEl.textContent = `Turn ${state.turn || 0}`;
  if (activeEl) activeEl.textContent = `Active: ${state.active_unit || '—'}`;

  // AI Progress meter (sistema_pressure gauge) — pillar 5 visibility.
  // Mostra tier corrente + valore + cap intents/round del SIS.
  const pressureEl = document.getElementById('pressure-meter');
  if (pressureEl) {
    const tier = pressureTier(state.sistema_pressure);
    pressureEl.innerHTML = `
      <div class="pressure-label">SISTEMA <strong style="color:${tier.color}">${tier.label}</strong> · ${tier.value}/100 · cap ${tier.intents} intents/round</div>
      <div class="pressure-bar"><div class="pressure-fill" style="width:${tier.value}%;background:${tier.color}"></div></div>
    `;
  }
}
