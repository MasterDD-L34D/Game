// apps/backend/services/combat/pigmentiAurorali.js
//
// pigmenti_aurorali (creature-trait mechanics slice 7, trait 9 -- treant).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// Aurora pigments (Slay-the-Spire Glow). While the carrier is healthy (HP >= 50%),
// at end-of-round any ENEMY ending its turn adjacent (manhattan 1) is dazzled:
// `abbagliato` (-1 atk on its next attack, read in combat/statusModifiers). The glow
// dims as HP drops -- below the gate it does nothing.
//
// (The ACTIVE mode -- 1 AP intensify to -2 + disorient on attackers -- is DEFERRED:
// a trait-granted ability needs the contract-schema effect_type + jobs.yaml
// re-baseline, owner-gated like filtri/matrice active. The slice-7 partner
// eco_sismico [tile timed-status] is DEFERRED too -- its tile-entry trigger needs the
// move/terrain substrate. Both surfaced in the slice-7 PR.)
//
// Pure (mutates adjacent enemies' status). Band-neutral: no sim unit carries
// pigmenti_aurorali, so applyEndRoundGlow is a no-op for every existing roster.

'use strict';

const PIGMENTI_TRAIT = 'pigmenti_aurorali';
const ABBAGLIATO = 'abbagliato';
const ABBAGLIATO_TURNS = 1;
const HP_GATE = 0.5; // glow only while HP >= 50% of max

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

function manhattanDistance(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

/**
 * End-of-round glow sweep. While the carrier is at/above the HP gate, dazzle every
 * living adjacent enemy (opposite faction) with `abbagliato`. Pure; mutates the
 * dazzled enemies' status. Returns the applied events ([] on no-op).
 *
 * @param {object} opts
 * @param {object} opts.carrier the pigmenti carrier (needs position + controlled_by)
 * @param {Array}  opts.units   full roster
 * @returns {Array<{unit_id, stato, turns}>}
 */
function applyEndRoundGlow({ carrier, units }) {
  const events = [];
  if (!hasTrait(carrier, PIGMENTI_TRAIT)) return events;
  if (!carrier.position || !Array.isArray(units)) return events;
  // HP gate: glow dims below 50%.
  const max = Number(carrier.max_hp || carrier.hp || 0);
  const hp = Number(carrier.hp);
  if (!(max > 0) || !(hp >= HP_GATE * max)) return events;

  const faction = carrier.controlled_by;
  for (const enemy of units) {
    if (!enemy || enemy === carrier || enemy.id === carrier.id) continue;
    if (enemy.controlled_by === faction) continue; // allies untouched
    if (!(Number(enemy.hp) > 0)) continue;
    if (manhattanDistance(enemy.position, carrier.position) !== 1) continue;
    if (!enemy.status || typeof enemy.status !== 'object') enemy.status = {};
    const current = Number(enemy.status[ABBAGLIATO] || 0);
    if (current < ABBAGLIATO_TURNS) enemy.status[ABBAGLIATO] = ABBAGLIATO_TURNS;
    events.push({ unit_id: enemy.id ?? null, stato: ABBAGLIATO, turns: ABBAGLIATO_TURNS });
  }
  return events;
}

module.exports = {
  applyEndRoundGlow,
  hasTrait,
  manhattanDistance,
  PIGMENTI_TRAIT,
  ABBAGLIATO,
  ABBAGLIATO_TURNS,
  HP_GATE,
};
