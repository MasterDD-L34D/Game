// apps/backend/services/combat/artigliPsionici.js
//
// artigli_psionici (creature-trait mechanics slice 4, trait 2 -- rakshasa).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// "Read-the-prey" -> conditional defense (Pillars Psion / Hades Guan Yu). On a
// melee hit, the carrier studies its target and gains a stacking damage_reduction
// (cap 3) that applies ONLY when the carrier later DEFENDS against that SAME
// target. The DR is source-predicated -- it does nothing against any other attacker.
//
// Marker storage: an off-status `carrier._lettura_preda = {<preyId>: stacks}` map,
// NOT a `unit.status` key. A dynamically-suffixed status (lettura_preda_<id>) would
// not match the exact-string PERSISTENT_STATUS_KEYS set and would be wiped/decayed
// by the round-model sync. The off-status field mirrors the `_camo_silent` window
// precedent (progressionApply.js) -- it survives the round and is learned for the
// encounter (no auto-decay: the prey, once read, stays read).
//
// Pure (mutates the carrier's `_lettura_preda` map). Band-neutral: no sim unit
// carries artigli_psionici, so markPrey is never called and computeArtigliDR
// returns 0 for every existing unit (no `_lettura_preda` field).

'use strict';

const ARTIGLI_TRAIT = 'artigli_psionici';
const ARTIGLI_CAP = 3;

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

/**
 * SET side: the carrier studies a target on a melee hit. Increments the per-prey
 * stack up to ARTIGLI_CAP. Returns the new stack count.
 *
 * @param {object} carrier the artigli carrier (the attacker; mutated)
 * @param {string} preyId  the studied target's id
 * @param {number} cap     stack cap (default ARTIGLI_CAP)
 * @returns {number} the new stack count (0 if carrier invalid)
 */
function markPrey(carrier, preyId, cap = ARTIGLI_CAP) {
  if (!carrier || typeof carrier !== 'object' || preyId == null) return 0;
  if (!carrier._lettura_preda || typeof carrier._lettura_preda !== 'object') {
    carrier._lettura_preda = {};
  }
  const next = Math.min(cap, (Number(carrier._lettura_preda[preyId]) || 0) + 1);
  carrier._lettura_preda[preyId] = next;
  return next;
}

/**
 * READ side: the carrier's damage_reduction when defending against a specific
 * attacker. Returns the studied-stack vs that attacker (capped), 0 otherwise.
 *
 * @param {object} defender   the artigli carrier (now defending)
 * @param {string} attackerId the incoming attacker's id
 * @returns {number} DR amount (0 when the attacker is not a read prey)
 */
function computeArtigliDR(defender, attackerId) {
  const map = defender && defender._lettura_preda;
  if (!map || typeof map !== 'object' || attackerId == null) return 0;
  return Math.min(ARTIGLI_CAP, Number(map[attackerId]) || 0);
}

module.exports = {
  markPrey,
  computeArtigliDR,
  hasTrait,
  ARTIGLI_TRAIT,
  ARTIGLI_CAP,
};
