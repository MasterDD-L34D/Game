// apps/backend/services/combat/nucleiWeakPoint.js
//
// nuclei_di_controllo weak-point (creature-trait mechanics slice 2, trait 8).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// 2-state targetable weak-point (XCOM MEC pattern). A unit carrying the trait
// starts `nucleo_intatto` (+1 atk aura, read in combat/statusModifiers). A hit
// that lands with MoS >= 5 (a precise blow on the control node) BREAKS a nucleus:
// the unit loses `nucleo_intatto` and gains `danno_nucleo` (a hunkered, defensive
// state -> +1 defense in statusModifiers). v1 is the 2-state break (intact ->
// danno); the 3rd state (nucleo_distrutto + burst) is a follow-up.
//
// Pure: mutates the passed target.status in place, returns the transition event
// (or null). Called by performAttack AFTER damage is applied, only on a hit.
// Band-neutral: no sim unit carries `nucleo_intatto` until a creature flips live.

'use strict';

const NUCLEO_INTATTO = 'nucleo_intatto';
const DANNO_NUCLEO = 'danno_nucleo';
const NUCLEO_MOS_THRESHOLD = 5;
// Sustained turn count (mirror passiveStatusApplier PASSIVE_DEFAULT_TURNS: the
// broken state is durable -- it outlives any normal encounter, and the round
// decay loop ticks it down slowly).
const DANNO_TTL = 99;

/**
 * Apply a weak-point hit to a defender. If the defender has an intact nucleus
 * and the hit's MoS >= threshold, break it (intact -> danno_nucleo).
 *
 * @param {object} target       the defender (mutated: target.status)
 * @param {object} attackResult { mos }
 * @returns {{unit_id, from, to, mos} | null} the transition, or null on no-op
 */
function applyNucleoHit(target, attackResult) {
  if (!target || !target.status || typeof target.status !== 'object') return null;
  const mos = Number(attackResult && attackResult.mos);
  if (!Number.isFinite(mos) || mos < NUCLEO_MOS_THRESHOLD) return null;
  if (!(Number(target.status[NUCLEO_INTATTO]) > 0)) return null;

  delete target.status[NUCLEO_INTATTO];
  target.status[DANNO_NUCLEO] = DANNO_TTL;
  return { unit_id: target.id ?? null, from: NUCLEO_INTATTO, to: DANNO_NUCLEO, mos };
}

module.exports = {
  applyNucleoHit,
  NUCLEO_INTATTO,
  DANNO_NUCLEO,
  NUCLEO_MOS_THRESHOLD,
  DANNO_TTL,
};
