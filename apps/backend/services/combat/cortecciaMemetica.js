// apps/backend/services/combat/cortecciaMemetica.js
//
// corteccia_memetica (creature-trait mechanics slice 3, trait 4 -- treant).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// A reactive defensive broadcaster (Darkest Dungeon ripple / Banner Saga
// willpower). When the carrier takes a hit of >= 3 damage:
//   1. the bark hardens -> `corteccia_attiva` self-status that grants
//      `damage_reduction 2` on FUTURE incoming hits (consumed by
//      computeCortecciaDR at the damage-mitigation step in performAttack);
//   2. the shared wound resonates -> `risonanza_memetica`, a single-use +1 atk
//      buff broadcast to same-faction allies within range 3 (via the
//      ally_aura_mark primitive). The buff is consumed by consumeRisonanza on
//      the ally's next attack (single-use, not a duration tick).
//
// `damage_reduction 2` is realized at the real DR mitigation seam (next to
// applyArchetypeDR in performAttack), NOT as a defenseDelta -- this matches the
// spec's literal "damage_reduction 2" (reduce damage taken) rather than raising
// the to-hit DC. (Design note for master-dd: faithful engine mapping.)
//
// Pure (mutates the carrier + allies' status object-maps in place). Band-neutral:
// no sim unit carries corteccia_memetica until a creature flips live.

'use strict';

const { broadcastAura } = require('./allyAuraMark');

const CORTECCIA_TRAIT = 'corteccia_memetica';
const CORTECCIA_DMG_THRESHOLD = 3;
const CORTECCIA_DR = 2;
const CORTECCIA_ATTIVA = 'corteccia_attiva';
// Hardened window after a heavy blow; re-applied on each qualifying hit. Decays
// via the universal round status loop (no PERSISTENT key -- it is meant to lapse).
const CORTECCIA_ATTIVA_TURNS = 2;

const RISONANZA = 'risonanza_memetica';
const RISONANZA_RANGE = 3;
// Single-use: read as +1 atk by computeStatusModifiers, then cleared on use by
// consumeRisonanza. The turn count is just a fallback lifetime if never spent.
const RISONANZA_TURNS = 2;

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

/**
 * On-damage-received reaction for corteccia_memetica. Fires when the carrier
 * takes >= CORTECCIA_DMG_THRESHOLD damage on a single hit.
 *
 * @param {object} opts
 * @param {object} opts.target      the unit that took damage (mutated)
 * @param {number} opts.damageDealt damage applied by this hit
 * @param {Array}  opts.units       full roster (for the ally broadcast)
 * @returns {{self_status, broadcast} | null}
 */
function applyCortecciaReaction({ target, damageDealt, units }) {
  if (!target || typeof target !== 'object') return null;
  if (!hasTrait(target, CORTECCIA_TRAIT)) return null;
  if (!(Number(damageDealt) >= CORTECCIA_DMG_THRESHOLD)) return null;

  if (!target.status || typeof target.status !== 'object') target.status = {};
  const current = Number(target.status[CORTECCIA_ATTIVA] || 0);
  if (current < CORTECCIA_ATTIVA_TURNS) target.status[CORTECCIA_ATTIVA] = CORTECCIA_ATTIVA_TURNS;

  const broadcast = broadcastAura({
    source: target,
    units: Array.isArray(units) ? units : [],
    stato: RISONANZA,
    turns: RISONANZA_TURNS,
    range: RISONANZA_RANGE,
  });

  return { self_status: CORTECCIA_ATTIVA, broadcast };
}

/**
 * DR consumer: the hardened bark reduces incoming damage by CORTECCIA_DR while
 * corteccia_attiva is up. Read at the damage-mitigation step.
 *
 * @param {object} target
 * @returns {number} damage to subtract (0 when inactive)
 */
function computeCortecciaDR(target) {
  const st = target && target.status;
  if (st && !Array.isArray(st) && Number(st[CORTECCIA_ATTIVA]) > 0) return CORTECCIA_DR;
  return 0;
}

/**
 * Single-use spend of risonanza_memetica. Returns true (and clears the status)
 * when the unit carried it, false otherwise. Called after the unit attacks.
 *
 * @param {object} unit (mutated)
 * @returns {boolean}
 */
function consumeRisonanza(unit) {
  const st = unit && unit.status;
  if (st && !Array.isArray(st) && Number(st[RISONANZA]) > 0) {
    delete st[RISONANZA];
    if (unit.status_intensity) delete unit.status_intensity[RISONANZA];
    return true;
  }
  return false;
}

module.exports = {
  applyCortecciaReaction,
  computeCortecciaDR,
  consumeRisonanza,
  hasTrait,
  CORTECCIA_TRAIT,
  CORTECCIA_DMG_THRESHOLD,
  CORTECCIA_DR,
  CORTECCIA_ATTIVA,
  CORTECCIA_ATTIVA_TURNS,
  RISONANZA,
  RISONANZA_RANGE,
  RISONANZA_TURNS,
};
