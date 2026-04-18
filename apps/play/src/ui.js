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

// W4.1 — Format pending intent for sidebar badge display.
function formatIntent(intent) {
  if (!intent) return '';
  const t = intent.type || intent.action_type;
  if (t === 'move' && intent.move_to) return `move [${intent.move_to.x},${intent.move_to.y}]`;
  if (t === 'move' && intent.position) return `move [${intent.position.x},${intent.position.y}]`;
  if (t === 'attack') return `atk ${intent.target_id || intent.target || '?'}`;
  if (t === 'ability')
    return `ability ${intent.ability_id || '?'}${intent.target_id ? ` → ${intent.target_id}` : ''}`;
  return t || 'intent';
}

// W6.3 — Extract recent events for a unit (last 5 events where unit is actor or target).
function recentUnitEvents(state, unitId, limit = 5) {
  const events = Array.isArray(state.events) ? state.events : [];
  const filtered = events.filter(
    (e) =>
      e.actor_id === unitId ||
      e.target_id === unitId ||
      e.ia_controlled_unit === unitId ||
      e.unit_id === unitId,
  );
  return filtered.slice(-limit).reverse();
}

function formatEventLine(ev, unitId) {
  const t = ev.action_type || ev.type || 'event';
  const dmg = ev.damage_dealt;
  const role = ev.target_id === unitId ? 'subìto' : 'inflitto';
  if (t === 'attack' || t === 'ability') {
    if (dmg == null) return `${t}`;
    if (dmg === 0) return `miss`;
    if (dmg < 0) return `heal +${-dmg}`;
    return dmg > 0 ? `-${dmg} HP (${role})` : `${t}`;
  }
  if (t === 'move') {
    const f = ev.position_from;
    const to = ev.position_to;
    if (Array.isArray(f) && Array.isArray(to)) return `move [${f[0]},${f[1]}]→[${to[0]},${to[1]}]`;
    return `move`;
  }
  if (t === 'spawn' || ev.result === 'spawned') return 'spawn';
  return t;
}

// W7.D — Lazy cache abilities per job from /api/jobs. Populated on first render.
const _abilitiesCache = new Map(); // job → [{ability_id, display_name, ap_cost}]
let _abilitiesFetchPromise = null;

async function ensureAbilities() {
  if (_abilitiesFetchPromise) return _abilitiesFetchPromise;
  _abilitiesFetchPromise = fetch('/api/jobs')
    .then((r) => r.json())
    .then((data) => {
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      for (const j of jobs) {
        const key = (j.id || j.job || '').toLowerCase();
        if (!key) continue;
        const raw = Array.isArray(j.abilities)
          ? j.abilities
          : Array.isArray(j.ability_ids)
            ? j.ability_ids
            : [];
        // Normalize: support sia array of strings che array of objects.
        const normalized = raw.map((x) =>
          typeof x === 'string'
            ? { ability_id: x, display_name: x.replace(/_/g, ' ') }
            : x && typeof x === 'object'
              ? x
              : { ability_id: String(x) },
        );
        _abilitiesCache.set(key, normalized);
      }
      return _abilitiesCache;
    })
    .catch(() => _abilitiesCache);
  return _abilitiesFetchPromise;
}

function getAbilitiesForJob(job) {
  return _abilitiesCache.get((job || '').toLowerCase()) || [];
}

export function renderUnits(
  ul,
  state,
  selectedId,
  onClick,
  pendingIntents = null,
  onCancelIntent = null,
  predictedOrder = null,
) {
  // Kick off abilities fetch (idempotent, populates cache for next render).
  ensureAbilities().then(() => {
    // Trigger re-render only if abilities weren't available first pass.
    if (ul.dataset.abilitiesRefetched) return;
    ul.dataset.abilitiesRefetched = '1';
    ul.dispatchEvent(new CustomEvent('abilities-ready'));
  });
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
        ${u.initiative != null ? `<span title="Reaction speed — priority queue ADR-2026-04-15">⚡ ${u.initiative}</span>` : ''}
        ${u.guardia ? `<span>guardia ${u.guardia}</span>` : ''}
      </div>
      ${statusChips ? `<div class="unit-status-row">${statusChips}</div>` : ''}
      ${u.ai_profile ? `<div class="unit-ai">AI: <code>${u.ai_profile}</code></div>` : ''}
      ${(() => {
        if (u.controlled_by !== 'player' || u.hp <= 0) return '';
        if (!pendingIntents) return '';
        const intent = pendingIntents.get ? pendingIntents.get(u.id) : pendingIntents[u.id];
        if (intent) {
          const rank = predictedOrder && predictedOrder.get ? predictedOrder.get(u.id) : null;
          const rankHtml = rank
            ? `<span class="priority-rank" title="Ordine predetto (initiative + action_speed − status_penalty)">#${rank}</span>`
            : '';
          return `<div class="intent-row">
            ${rankHtml}
            <div class="intent-badge declared" title="Intent dichiarato">✓ ${formatIntent(intent)}</div>
            <button class="intent-cancel" data-unit-id="${u.id}" title="Annulla intent (re-click action per nuovo)">✕</button>
          </div>`;
        }
        return `<div class="intent-badge pending" title="Nessun intent dichiarato">⏳ in attesa</div>`;
      })()}
      ${(() => {
        // W6.3 / W7.C — Per-PG expanded HUD: traits + abilities + recent events filtered.
        // W7.C: default <details open> perché user non trovava la sezione collapsed.
        // W7.D: ability chips inline per player (prima era solo shared bottom bar).
        if (u.controlled_by !== 'player' || u.hp <= 0) return '';
        const traits = Array.isArray(u.traits) ? u.traits : [];
        const abilities = getAbilitiesForJob(u.job);
        const evRows = recentUnitEvents(state, u.id, 4);
        const traitsHtml = traits.length
          ? `<div class="unit-traits" title="Trait attivi (evoluzione)">🧬 ${traits.map((t) => `<code>${t}</code>`).join(' ')}</div>`
          : '';
        const abilitiesHtml = abilities.length
          ? `<div class="unit-abilities" title="Abilities conosciute">⚔ ${abilities
              .map(
                (a) =>
                  `<span class="ab-chip" title="${(a.effect_type || '').toString()} · AP ${a.ap_cost ?? 1}">${a.display_name || a.ability_id}</span>`,
              )
              .join('')}</div>`
          : '';
        const eventsHtml = evRows.length
          ? `<details class="unit-log-details" open><summary>📜 Ultimi eventi (${evRows.length})</summary><ul class="unit-log">${evRows
              .map((e) => `<li>T${e.turn || '?'}: ${formatEventLine(e, u.id)}</li>`)
              .join('')}</ul></details>`
          : '';
        return `${traitsHtml}${abilitiesHtml}${eventsHtml}`;
      })()}
    `;
    li.addEventListener('click', (ev) => {
      // W6.2b — skip select se click su intent-cancel btn (gestito separatamente).
      if (ev.target && ev.target.classList.contains('intent-cancel')) return;
      onClick(u);
    });
    // W6.2b — cancel intent per PG button
    const cancelBtn = li.querySelector('.intent-cancel');
    if (cancelBtn && onCancelIntent) {
      cancelBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onCancelIntent(cancelBtn.dataset.unitId);
      });
    }
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
