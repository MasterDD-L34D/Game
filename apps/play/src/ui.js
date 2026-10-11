// UI helpers — sidebar units + log.

import { getSpeciesDisplayIt } from './speciesNames.js';

// W8d — HTML escape helper per XSS prevention su user-controlled fields.
// Backend può ritornare unit.id / job / trait / ability strings con caratteri speciali.
// innerHTML flow deve escapare <, >, &, ", ' prima di injection.
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// W8d — Canonical unit state predicates (prima: `hp <= 0` vs `hp > 0` vs mix).
export function isUnitAlive(unit) {
  return !!(unit && Number(unit.hp || 0) > 0);
}
export function isUnitDead(unit) {
  return !unit || Number(unit.hp || 0) <= 0;
}

// W8 / W8c — Status labels + SVG icon paths per TV-first spec (42-SG §status, ≥16px).
// MIRROR di CSS `:root --status-*` tokens (style.css). Source of truth = CSS.
// Inline background here needed per chip (element doesn't inherit token automatically).
const STATUS_LABELS = {
  panic: {
    label: 'Panic',
    color: '#ff9800',
    svg: '<path d="M12 2L2 22h20L12 2zm0 6l6 12H6l6-12zm-1 2v5h2v-5h-2zm0 7v2h2v-2h-2z" fill="currentColor"/>',
  },
  rage: {
    label: 'Rage',
    color: '#f44336',
    svg: '<path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z" fill="currentColor"/>',
  },
  stunned: {
    label: 'Stun',
    color: '#9c27b0',
    svg: '<path d="M12 2l2.4 7.4H22l-6.2 4.6 2.4 7.4L12 17l-6.2 4.4 2.4-7.4L2 9.4h7.6L12 2z" fill="currentColor"/>',
  },
  focused: {
    label: 'Focus',
    color: '#03a9f4',
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  },
  confused: {
    label: 'Confuse',
    color: '#ffc107',
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="17" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor">?</text>',
  },
  bleeding: {
    label: 'Bleed',
    color: '#e91e63',
    svg: '<path d="M12 2c-4 6-7 10-7 14a7 7 0 0 0 14 0c0-4-3-8-7-14z" fill="currentColor"/>',
  },
  fracture: {
    label: 'Fract',
    color: '#795548',
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.5"/>',
  },
  sbilanciato: {
    label: 'Sbil',
    color: '#ffeb3b',
    svg: '<path d="M2 12c3-4 5-4 8 0s5 4 8 0 3-4 4-2v4c-1-2-1-2-4 2s-5 4-8 0-5-4-8 0v-4z" fill="currentColor"/>',
  },
  taunted_by: {
    label: 'Taunt',
    color: '#ffc107',
    svg: '<path d="M6 7h12v2H6zM6 11h12v2H6zM6 15h12v2H6z" fill="currentColor"/>',
  },
  aggro_locked: {
    label: 'Aggro',
    color: '#ff5722',
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="currentColor"/>',
  },
};

// W8b — icon 16×16 per 42-STYLE-GUIDE-UI.md §Icon grid spec (was 14px).
function statusIconSvg(svgBody, color) {
  return `<svg class="status-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="color:${color};vertical-align:middle">${svgBody}</svg>`;
}

function renderStatusChips(unit) {
  const status = unit.status || {};
  const chips = [];
  for (const [key, meta] of Object.entries(STATUS_LABELS)) {
    const v = status[key];
    if (v !== undefined && v !== null && (typeof v !== 'number' || v > 0)) {
      const label = typeof v === 'number' && v > 1 ? `${meta.label} (${v})` : meta.label;
      // W8b — ARIA role="img" + aria-label per WCAG (42-SG accessibility).
      // Icon aria-hidden (decorative), label testuale primary.
      chips.push(
        `<span class="status-chip" style="background:${meta.color}" title="${key}" role="img" aria-label="${meta.label}${typeof v === 'number' && v > 1 ? ` (intensità ${v})` : ''}">${statusIconSvg(meta.svg, '#000')} ${label}</span>`,
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

// W8c — export per reuse cross-module (main.js log + future replay/bottom log).
export function formatEventLine(ev, unitId) {
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
// W8g — Also cache job display label IT (per 00E-NAMING_STYLEGUIDE canonical).
const _abilitiesCache = new Map(); // job → [{ability_id, display_name, ap_cost}]
const _jobLabelsIt = new Map(); // job_id → "Schermidore" / "Avanguardia" / etc.
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
        // W8g — store IT label (primary display per 00E naming styleguide).
        const labelIt = j.label || j.label_it || j.displayName || '';
        if (labelIt) _jobLabelsIt.set(key, labelIt);
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

// W8g — Canonical job display label IT from jobs.yaml. Fallback capitalize slug.
export function getJobLabelIt(jobId) {
  if (!jobId) return '';
  const key = String(jobId).toLowerCase();
  if (_jobLabelsIt.has(key)) return _jobLabelsIt.get(key);
  // Fallback: capitalize underscore-separated slug.
  return String(jobId)
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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
  // W8f — Raggruppa player prima (prominenti, clickabili), SIS dopo (dimmed).
  // Aggiungi section header per chiarezza (user feedback: "sono tutte uguali").
  const units = state.units || [];
  const players = units.filter((u) => u.controlled_by === 'player');
  const sistemi = units.filter((u) => u.controlled_by !== 'player');
  const groups = [
    { label: 'I tuoi PG — click per selezionare', units: players, kind: 'player' },
    { label: 'Sistema — nemici', units: sistemi, kind: 'sistema' },
  ];
  for (const g of groups) {
    if (g.units.length === 0) continue;
    const sep = document.createElement('li');
    sep.className = `unit-section-header section-${g.kind}`;
    sep.textContent = g.label;
    sep.setAttribute('aria-hidden', 'true');
    ul.appendChild(sep);
    for (const u of g.units)
      renderUnitLi(
        ul,
        state,
        u,
        selectedId,
        onClick,
        pendingIntents,
        onCancelIntent,
        predictedOrder,
      );
  }
}

// W8f — Extract per-unit li render (was inline). Called after section grouping.
function renderUnitLi(
  ul,
  state,
  u,
  selectedId,
  onClick,
  pendingIntents,
  onCancelIntent,
  predictedOrder,
) {
  {
    const li = document.createElement('li');
    li.classList.add(u.controlled_by === 'player' ? 'player' : 'sistema');
    if (isUnitDead(u)) li.classList.add('dead');
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

    // W8f / W8g — Display name in ITALIANO per 00E-NAMING_STYLEGUIDE canonical.
    // Species: getSpeciesDisplayIt() map statica (MIRROR species.yaml display_name_it).
    // Job: getJobLabelIt() da /api/jobs label (IT). Fallback capitalize slug se mancante.
    // Esempio: "Predatore delle Dune · Schermidore" (invece di "Dune stalker · Skirmisher").
    const speciesIt = getSpeciesDisplayIt(u.species);
    const jobIt = getJobLabelIt(u.job);
    const displayName = speciesIt ? (jobIt ? `${speciesIt} · ${jobIt}` : speciesIt) : u.id || '—';

    // W8d — All user-controlled string fields esc() escaped per XSS prevention.
    // W8f — Display name "Species · Job" primary (es. "Dune Stalker · Scout"),
    // id tecnico piccolo sotto (debug/reference).
    li.innerHTML = `
      <div class="unit-head">
        <strong class="unit-display-name">${esc(displayName)}</strong>
        <code class="unit-tech-id" title="Internal unit id">${esc(u.id)}</code>
      </div>
      <div class="unit-bars">
        <div class="bar-row">
          <span class="bar-label">HP</span>
          <span class="hp-bar ${hpClass}"><span style="width:${Math.max(0, ratio * 100).toFixed(0)}%"></span></span>
          <span class="bar-value">${Number(u.hp) || 0}/${Number(u.max_hp || u.hp) || 0}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">AP</span>
          <span class="ap-bar"><span style="width:${Math.max(0, apRatio * 100).toFixed(0)}%"></span></span>
          <span class="bar-value">${Number(apRemaining) || 0}/${Number(apMax) || 0}${(() => {
            // W8N — AP pending delta: mostra AP consumato da intent pending
            // per questa unit (es. "3/3 −2" = 3 totali, 2 già impegnati).
            if (!Array.isArray(pendingIntents) || pendingIntents.length === 0) return '';
            const pendingSum = pendingIntents
              .filter((pi) => pi.unit_id === u.id)
              .reduce((s, pi) => s + (Number(pi.action?.ap_cost) || 0), 0);
            if (pendingSum <= 0) return '';
            return ` <span class="ap-pending" title="AP già impegnati in intent pending">−${pendingSum}</span>`;
          })()}</span>
        </div>
      </div>
      <div class="unit-stats">
        ${u.position ? `<span>📍 [${Number(u.position.x) || 0},${Number(u.position.y) || 0}]</span>` : ''}
        ${u.dc != null ? `<span>DC ${Number(u.dc) || 0}</span>` : ''}
        ${u.mod != null ? `<span>+${Number(u.mod) || 0}</span>` : ''}
        ${u.attack_range ? `<span>range ${Number(u.attack_range) || 0}</span>` : ''}
        ${u.initiative != null ? `<span title="Reaction speed — priority queue ADR-2026-04-15">⚡ ${Number(u.initiative) || 0}</span>` : ''}
        ${u.guardia ? `<span>guardia ${Number(u.guardia) || 0}</span>` : ''}
      </div>
      ${statusChips ? `<div class="unit-status-row">${statusChips}</div>` : ''}
      ${(() => {
        if (!isUnitAlive(u)) return '';
        const preview = Array.isArray(state.synergy_preview)
          ? state.synergy_preview.find((s) => s.unit_id === u.id && s.ready)
          : null;
        if (!preview) return '';
        const names = preview.synergies
          .map(
            (s) => `${esc(s.name)} <span class="syn-bonus">+${Number(s.bonus_damage) || 1}</span>`,
          )
          .join(', ');
        return `<div class="synergy-telegraph" title="Sinergia pronta — si attiva al prossimo colpo">⚡ ${names}</div>`;
      })()}
      ${u.ai_profile ? `<div class="unit-ai">AI: <code>${esc(u.ai_profile)}</code></div>` : ''}
      ${(() => {
        if (u.controlled_by !== 'player' || !isUnitAlive(u)) return '';
        if (!pendingIntents) return '';
        // W8k — pendingIntents è array [{unit_id, action, ts}] — filter per questa unit.
        const arr = Array.isArray(pendingIntents) ? pendingIntents : [];
        const unitIntents = arr.filter((pi) => pi.unit_id === u.id);
        if (unitIntents.length > 0) {
          const rank = predictedOrder && predictedOrder.get ? predictedOrder.get(u.id) : null;
          const rankHtml = rank
            ? `<span class="priority-rank" title="Ordine predetto (initiative + action_speed − status_penalty)">#${Number(rank) || 0}</span>`
            : '';
          const intentsHtml = unitIntents
            .map(
              (pi, idx) =>
                `<div class="intent-badge declared" title="Intent #${idx + 1}">✓ ${idx + 1}. ${esc(formatIntent(pi.action))}</div>`,
            )
            .join('');
          return `<div class="intent-row intent-row-multi">
            ${rankHtml}
            <div class="intent-list">${intentsHtml}</div>
            <button class="intent-cancel" data-unit-id="${esc(u.id)}" title="Annulla TUTTI ${unitIntents.length} intent di questa unità">✕ ${unitIntents.length}</button>
          </div>`;
        }
        return `<div class="intent-badge pending" title="Nessun intent dichiarato">⏳ in attesa</div>`;
      })()}
      ${(() => {
        // W6.3 / W7.C — Per-PG expanded HUD: traits + abilities + recent events filtered.
        if (u.controlled_by !== 'player' || !isUnitAlive(u)) return '';
        const traits = Array.isArray(u.traits) ? u.traits : [];
        const abilities = getAbilitiesForJob(u.job);
        const evRows = recentUnitEvents(state, u.id, 4);
        const traitsHtml = traits.length
          ? `<div class="unit-traits" title="Trait attivi (evoluzione)">🧬 ${traits.map((t) => `<code>${esc(t)}</code>`).join(' ')}</div>`
          : '';
        const abilitiesHtml = abilities.length
          ? `<div class="unit-abilities" title="Click chip → seleziona unità + popola panel Abilities a destra">⚔ ${abilities
              .map(
                (a) =>
                  `<span class="ab-chip" data-ability-id="${esc(a.ability_id)}" title="${esc((a.effect_type || '').toString())} · AP ${Number(a.ap_cost ?? 1) || 0} · click = seleziona unità e apre abilities">${esc(a.display_name || a.ability_id)}</span>`,
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
    const counter = Number(state.sistema_counter) || 0;
    const counterPct = Math.min(100, Math.round((counter / 30) * 100));
    const counterHtml =
      counter > 0
        ? `<div class="pushback-label">⚔ Pushback ${counter}/30</div>
           <div class="pushback-bar"><div class="pushback-fill" style="width:${counterPct}%"></div></div>`
        : '';

    // 2026-04-27 Step 3 — AI War Progress meter frontend wire (Tier S #1898 backend).
    // Pattern donor: AI War Fleet Command — visibility + anticipation tier.
    // Estende meter con next_tier + distance + history sparkline (Tufte pattern).
    let aiProgressHtml = '';
    if (state.ai_progress) {
      const ap = state.ai_progress;
      const tierName = ap.tier?.name || '';
      const threatLevel = ap.threat_level || 'minimo';
      // Next tier anticipation
      let nextTierHtml = '';
      if (ap.next_tier && Number.isFinite(ap.distance_to_next)) {
        nextTierHtml = `<span class="ai-next-tier">→ ${ap.next_tier.name} (${ap.distance_to_next} pp)</span>`;
      } else if (!ap.next_tier) {
        nextTierHtml = `<span class="ai-next-tier">apex max</span>`;
      }
      // History sparkline: 5 dot last events (Tufte small multiples lite)
      let historyHtml = '';
      if (Array.isArray(ap.history) && ap.history.length > 0) {
        const dots = ap.history
          .slice(-5)
          .map((h) => {
            const p = Number(h.pressure) || 0;
            const intensity = Math.min(1, p / 100);
            const op = 0.3 + intensity * 0.7;
            return `<span class="ai-history-dot" style="opacity:${op}" title="turn ${h.turn} · ${h.pressure}">●</span>`;
          })
          .join('');
        historyHtml = `<div class="ai-history">trend: ${dots}</div>`;
      }
      aiProgressHtml = `
        <div class="ai-progress-info">
          <span class="ai-tier-name" style="color:${tier.color}">${tierName}</span>
          <span class="ai-threat-label">minaccia: <strong>${threatLevel}</strong></span>
          ${nextTierHtml}
        </div>
        ${historyHtml}
      `;
    }

    pressureEl.innerHTML = `
      <div class="pressure-label">SISTEMA <strong style="color:${tier.color}">${tier.label}</strong> · ${tier.value}/100 · cap ${tier.intents} intents/round</div>
      <div class="pressure-bar"><div class="pressure-fill" style="width:${tier.value}%;background:${tier.color}"></div></div>
      ${aiProgressHtml}
      ${counterHtml}
    `;
  }
}
