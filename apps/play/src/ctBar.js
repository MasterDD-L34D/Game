// Action 7 (ADR-2026-04-28 §Action 7) — CT bar visual lookahead 3 turni.
//
// Engine LIVE: roundOrchestrator usa initiative + action_speed - status_penalty
// per priority. publicSessionView esponse turn_order + active_unit + units[]
// con initiative + statuses.
//
// Surface DEAD pre-Action 7: player vede solo "Turno N" generico. NON sa chi
// muove dopo. FFT-style temporal legibility chiusa via top-HUD strip:
// `currentActor → next1 → next2 → next3` (lookahead 3 turni). Player pianifica
// "se faccio wait, salto avanti vs nemicoX?" — equivale lettura ITB intent +
// ordine FFT.
//
// User verdict 2026-04-28 Q6: lookahead 3 turni (NOT 2 = poca info, NOT 5 =
// cognitive overload). Future-proof tunable: ui_config.ct_bar_lookahead.
//
// Pillar P1 leggibilità tattica — chiusura sostanziale gap temporale.

'use strict';

// Cap default lookahead. Override via ui_config.json post-playtest se feel
// "info overload" (reduce 2) o "non basta" (expand 5).
export const DEFAULT_LOOKAHEAD = 3;

// Pure: status penalty derivata da statuses[]. Mirror logic backend
// roundOrchestrator.computeResolvePriority §panic/disorient. Altri status
// (rage/focused/stunned) non penalizzano initiative qui.
export function statusPenalty(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [];
  let penalty = 0;
  for (const s of arr) {
    if (!s) continue;
    const intensity = Number(s.intensity || 1);
    if (s.id === 'panic') penalty += intensity * 2;
    else if (s.id === 'disorient') penalty += intensity;
  }
  return penalty;
}

// Pure: priority effettiva di una unit per ordering CT bar lookahead.
// = initiative - statusPenalty. action_speed escluso (per-action, non
// predicibile pre-intent commit).
export function effectivePriority(unit) {
  const base = Number((unit && unit.initiative) || 0);
  const penalty = statusPenalty(unit && unit.statuses);
  return base - penalty;
}

// Pure: ordina unit alive per priority desc, stable on id asc.
function sortByPriority(aliveUnits) {
  return aliveUnits
    .map((u, idx) => ({ u, prio: effectivePriority(u), idx }))
    .sort((a, b) => b.prio - a.prio || String(a.u.id).localeCompare(String(b.u.id)))
    .map((e) => e.u);
}

// Pure: filtra unit alive (hp > 0). KO esclusi dal lookahead.
function aliveUnits(units) {
  if (!Array.isArray(units)) return [];
  return units.filter((u) => u && Number(u.hp) > 0);
}

/**
 * Pure: compute CT bar lookahead da snapshot session.
 *
 * Input shape: { units, active_unit?, turn_order?, turn_index? }.
 *
 * Strategy:
 *   1. Filter unit alive.
 *   2. Sort by effective priority desc (initiative - status_penalty).
 *   3. Pick `active_unit` come currentActor se presente in alive set.
 *      Altrimenti, primo entry ordinato.
 *   4. Build ring rotation: current → resto sorted (skip current).
 *   5. Slice prime (1 + lookahead) entries.
 *   6. Return array di slot {id, name, archetype, controlled_by, hp, isCurrent, statuses}.
 *
 * Lookahead simula round model: dopo current, rimanenti act in priority order,
 * poi nuovo round riparte da top. Pure proiezione su `units` snapshot —
 * action_speed reale ricomputato runtime ad ogni state-fetch.
 *
 * @param {object} sessionView publicSessionView snapshot
 * @param {number} [lookahead=3] numero di slot futuri da mostrare
 * @returns {Array<{id,name,archetype,controlled_by,hp,isCurrent,statuses}>}
 */
export function computeCtBarLookahead(sessionView, lookahead = DEFAULT_LOOKAHEAD) {
  if (!sessionView || typeof sessionView !== 'object') return [];
  const cap =
    Number.isFinite(lookahead) && lookahead >= 0 ? Math.floor(lookahead) : DEFAULT_LOOKAHEAD;
  const alive = aliveUnits(sessionView.units);
  if (alive.length === 0) return [];

  const sorted = sortByPriority(alive);
  const activeId = sessionView.active_unit || sessionView.active_id || null;
  const currentIdx = activeId ? sorted.findIndex((u) => u.id === activeId) : -1;
  const current = currentIdx >= 0 ? sorted[currentIdx] : sorted[0];

  // Ring rotation: current first, poi resto in priority order (escludi current
  // dal tail), poi wrap per simulare rounds successivi.
  const tail = sorted.filter((u) => u.id !== current.id);
  const total = 1 + cap;
  const slots = [current];
  for (let i = 0; slots.length < total && tail.length > 0; i += 1) {
    slots.push(tail[i % tail.length]);
  }

  return slots.map((u, i) => ({
    id: u.id,
    name: u.name || u.id,
    archetype: u.archetype || u.species_id || null,
    controlled_by: u.controlled_by || null,
    hp: Number(u.hp || 0),
    initiative: Number(u.initiative || 0),
    isCurrent: i === 0,
    statuses: Array.isArray(u.statuses) ? u.statuses : [],
  }));
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

// Pure: faction icon. Player = 🟢, enemy = 🔴, neutral/unknown = ⚪.
function factionIcon(controlledBy) {
  const f = String(controlledBy || '').toLowerCase();
  if (f === 'player' || f === 'players' || f === 'pc') return '🟢';
  if (f === 'sistema' || f === 'enemy' || f === 'ai' || f === 'ia') return '🔴';
  return '⚪';
}

// Pure: short label per slot — initial uppercase + truncate 6 char.
function shortLabel(name) {
  const s = String(name || '?').trim();
  if (s.length === 0) return '?';
  return s.slice(0, 6);
}

// Pure: slot HTML singolo. Idempotent.
export function formatCtBarSlot(slot, position) {
  if (!slot || typeof slot !== 'object') return '';
  const cls = ['ct-bar-slot'];
  if (slot.isCurrent) cls.push('ct-bar-current');
  if (slot.controlled_by) cls.push(`ct-bar-${escapeHtml(slot.controlled_by)}`);
  const icon = factionIcon(slot.controlled_by);
  const label = escapeHtml(shortLabel(slot.name));
  const tip = `${slot.name} — init ${slot.initiative} hp ${slot.hp}${slot.isCurrent ? ' (turno corrente)' : ` (T+${position})`}`;
  return (
    `<span class="${cls.join(' ')}" title="${escapeHtml(tip)}" data-unit-id="${escapeHtml(slot.id)}" data-position="${position}">` +
    `<span class="ct-bar-icon">${icon}</span>` +
    `<span class="ct-bar-label">${label}</span>` +
    `</span>`
  );
}

// Pure: full bar HTML. Slots intercalati con arrow separator → triangle.
export function formatCtBar(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return '';
  const parts = [];
  for (let i = 0; i < slots.length; i += 1) {
    if (i > 0) parts.push('<span class="ct-bar-arrow" aria-hidden="true">▶</span>');
    parts.push(formatCtBarSlot(slots[i], i));
  }
  return parts.join('');
}

// Side effect: render CT bar into HUD container. Idempotent. Hide se nessun
// slot disponibile (graceful degrade pre-session o all-KO).
export function renderCtBar(containerEl, sessionView, lookahead = DEFAULT_LOOKAHEAD) {
  if (!containerEl || typeof containerEl.innerHTML !== 'string') return;
  const slots = computeCtBarLookahead(sessionView, lookahead);
  if (slots.length === 0) {
    containerEl.innerHTML = '';
    containerEl.classList.add('ct-bar-hidden');
    containerEl.removeAttribute('title');
    return;
  }
  containerEl.classList.remove('ct-bar-hidden');
  containerEl.innerHTML = formatCtBar(slots);
  // Tooltip aggregato: lista ordine completo per advanced read.
  const order = slots.map((s, i) => `${i === 0 ? '◉' : `T+${i}`} ${s.name}`).join(' → ');
  containerEl.setAttribute('title', `Ordine turni: ${order}`);
}
