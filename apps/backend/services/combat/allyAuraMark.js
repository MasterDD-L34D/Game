// apps/backend/services/combat/allyAuraMark.js
//
// ally_aura_mark primitive (creature-trait mechanics slice 3, primitive P4).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// A range-based ally broadcast: a carrier writes a self-status onto every
// same-faction living ally within manhattan range R. This is the shared seam
// for the slice-3 aura mechanics:
//   - nuclei_di_controllo: `coordinamento` (range 2) while the nucleus is intact
//     -> +1 atk for coordinated allies (read in combat/statusModifiers).
//   - corteccia_memetica: `risonanza_memetica` (range 3, single-use +1 atk) on a
//     heavy hit (see combat/cortecciaMemetica, which calls broadcastAura).
//
// `refreshNucleiCoordinamento` is the roster-level PRODUCER for the sustained
// coordinamento aura: it CLEARS coordinamento from every unit, then rebroadcasts
// from each intact carrier. Recomputing the whole aura each refresh keeps it
// position-accurate (an ally that drifts out of range, or a carrier whose
// nucleus breaks, stops being coordinated). Called at session /start and at
// end-of-round, alongside the passive-status refresh. coordinamento is exempt
// from the round-model status wipe (sessionRoundBridge PERSISTENT_STATUS_KEYS) so
// only this producer adds/removes it.
//
// Pure (mutates the passed allies' status object-maps in place). Band-neutral:
// no sim unit carries nuclei_di_controllo / corteccia_memetica until a creature
// flips live.

'use strict';

const COORDINAMENTO = 'coordinamento';
const COORD_RANGE = 2;
// Sustained turn count (mirror passiveStatusApplier PASSIVE_DEFAULT_TURNS). The
// aura is producer-managed (clear-then-rebroadcast each refresh) and kept out of
// the round wipe via PERSISTENT_STATUS_KEYS, so it never decays on its own.
const COORD_TURNS = 99;

function manhattanDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

/**
 * Broadcast a self-status to same-faction living allies within manhattan range.
 * Refresh-up policy (never lowers a higher remaining count), mirroring the
 * passive applier. Mutates each receiving ally's status in place.
 *
 * @param {object}  opts
 * @param {object}  opts.source the broadcasting unit (needs position + controlled_by)
 * @param {Array}   opts.units  full roster
 * @param {string}  opts.stato  status name to write
 * @param {number}  opts.turns  remaining-turns value to set
 * @param {number}  opts.range  inclusive manhattan range
 * @returns {Array<{unit_id, stato, turns, source_id, range}>}
 */
function broadcastAura({ source, units, stato, turns, range }) {
  const events = [];
  if (!source || typeof source !== 'object' || !source.position) return events;
  if (!Array.isArray(units) || !stato) return events;
  const faction = source.controlled_by;
  const value = Number(turns);
  if (!Number.isFinite(value) || value <= 0) return events;
  for (const ally of units) {
    if (!ally || ally === source || ally.id === source.id) continue;
    if (ally.controlled_by !== faction) continue;
    if (!(Number(ally.hp) > 0)) continue;
    if (manhattanDistance(ally.position, source.position) > Number(range)) continue;
    if (!ally.status || typeof ally.status !== 'object') ally.status = {};
    const current = Number(ally.status[stato] || 0);
    if (current >= value) continue; // refresh-up: never lower
    ally.status[stato] = value;
    events.push({
      unit_id: ally.id ?? null,
      stato,
      turns: value,
      source_id: source.id ?? null,
      range: Number(range),
    });
  }
  return events;
}

/**
 * Roster producer for the coordinamento aura. Clears coordinamento everywhere,
 * then rebroadcasts (range 2) from every unit whose nucleus is intact. Pure
 * (mutates roster status). Returns the broadcast events.
 *
 * @param {Array} units session roster
 * @returns {Array<{unit_id, stato, turns, source_id, range}>}
 */
function refreshNucleiCoordinamento(units) {
  if (!Array.isArray(units)) return [];
  // 1. Clear the aura everywhere -- it is recomputed fresh from current positions.
  for (const u of units) {
    if (u && u.status && typeof u.status === 'object' && COORDINAMENTO in u.status) {
      delete u.status[COORDINAMENTO];
      if (u.status_intensity) delete u.status_intensity[COORDINAMENTO];
    }
  }
  // 2. Rebroadcast from every intact carrier.
  const events = [];
  for (const carrier of units) {
    if (!carrier || !carrier.status || !(Number(carrier.status.nucleo_intatto) > 0)) continue;
    const broadcast = broadcastAura({
      source: carrier,
      units,
      stato: COORDINAMENTO,
      turns: COORD_TURNS,
      range: COORD_RANGE,
    });
    if (broadcast.length > 0) events.push(...broadcast);
  }
  return events;
}

module.exports = {
  broadcastAura,
  refreshNucleiCoordinamento,
  manhattanDistance,
  COORDINAMENTO,
  COORD_RANGE,
  COORD_TURNS,
};
