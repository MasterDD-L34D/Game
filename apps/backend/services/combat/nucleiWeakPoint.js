// apps/backend/services/combat/nucleiWeakPoint.js
//
// nuclei_di_controllo weak-point (creature-trait mechanics slice 2, trait 8).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// 3-state targetable weak-point (XCOM MEC pattern). A unit carrying the trait
// starts `nucleo_intatto` (+1 atk aura, read in combat/statusModifiers; it also
// broadcasts the `coordinamento` ally aura -- see combat/allyAuraMark). A hit
// that lands with MoS >= 5 (a precise blow on the control node) advances the
// weak-point one stage:
//   nucleo_intatto  --MoS>=5-->  danno_nucleo      (lose the atk aura, hunker:
//                                                    +1 def in statusModifiers)
//   danno_nucleo    --MoS>=5-->  nucleo_distrutto  (terminal; the node detonates
//                                                    for a one-time +2 burst)
//   nucleo_distrutto --any-->    no-op             (already destroyed)
//
// Pure: mutates the passed target.status in place, returns the transition event
// `{unit_id, from, to, mos, burst}` (or null on no-op). `burst` is the one-time
// extra damage the caller applies (0 on the first break, NUCLEO_BURST on the
// destroying hit). Called by performAttack AFTER damage is applied, only on a hit.
// Band-neutral: no sim unit carries `nucleo_intatto` until a creature flips live.

'use strict';

const NUCLEO_INTATTO = 'nucleo_intatto';
const DANNO_NUCLEO = 'danno_nucleo';
const NUCLEO_DISTRUTTO = 'nucleo_distrutto';
const NUCLEO_MOS_THRESHOLD = 5;
// Sustained turn count (mirror passiveStatusApplier PASSIVE_DEFAULT_TURNS: the
// broken/destroyed states are durable -- they outlive any normal encounter, and
// are kept out of the round wipe via sessionRoundBridge PERSISTENT_STATUS_KEYS).
const DANNO_TTL = 99;
// One-time burst damage when the control node is destroyed (XCOM MEC detonation).
const NUCLEO_BURST = 2;

/**
 * Apply a weak-point hit to a defender. A MoS >= threshold hit advances the
 * nucleus one stage (intact -> danno -> distrutto). Destroying the nucleus
 * returns `burst: NUCLEO_BURST` for the caller to apply as one-time damage.
 *
 * @param {object} target       the defender (mutated: target.status)
 * @param {object} attackResult { mos }
 * @returns {{unit_id, from, to, mos, burst} | null} the transition, or null on no-op
 */
function applyNucleoHit(target, attackResult) {
  if (!target || !target.status || typeof target.status !== 'object') return null;
  const mos = Number(attackResult && attackResult.mos);
  if (!Number.isFinite(mos) || mos < NUCLEO_MOS_THRESHOLD) return null;

  if (Number(target.status[NUCLEO_INTATTO]) > 0) {
    delete target.status[NUCLEO_INTATTO];
    target.status[DANNO_NUCLEO] = DANNO_TTL;
    return { unit_id: target.id ?? null, from: NUCLEO_INTATTO, to: DANNO_NUCLEO, mos, burst: 0 };
  }
  if (Number(target.status[DANNO_NUCLEO]) > 0) {
    delete target.status[DANNO_NUCLEO];
    target.status[NUCLEO_DISTRUTTO] = DANNO_TTL;
    return {
      unit_id: target.id ?? null,
      from: DANNO_NUCLEO,
      to: NUCLEO_DISTRUTTO,
      mos,
      burst: NUCLEO_BURST,
    };
  }
  return null;
}

module.exports = {
  applyNucleoHit,
  NUCLEO_INTATTO,
  DANNO_NUCLEO,
  NUCLEO_DISTRUTTO,
  NUCLEO_MOS_THRESHOLD,
  DANNO_TTL,
  NUCLEO_BURST,
};
