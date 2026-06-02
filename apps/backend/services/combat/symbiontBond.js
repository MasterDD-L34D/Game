// Symbiont bond redirect — TKT-JOB-PHASEC slice B4a (Cat C/D, OQ-BOND verdict V3).
//
// The SYMBIONT job links to an ally via `symbiotic_bond`; while bonded, a share of
// the damage the partner takes is redirected to the symbiont (FFXIV "Cover" model).
//
// State (set at cast by executeSymbioticBond in abilityExecutor):
//   symbiont._bond = { partner_id, redirect_pct, secondary_partner_id, secondary_pct }
//   partner._bonded_by = symbiont.id   (inverse pointer; secondary partner too)
//
// Hook point: performAttack, AFTER the damage step + intercept reroute + companion
// bondReactionTrigger (one absorb layer per hit — gated on !interceptResult &&
// !bondReactionResult by the caller). Math mirrors bondReactionTrigger.fireShieldAlly
// (ablative HP transfer + session.damage_taken bookkeeping), but the share is the
// bond's redirect_pct and the absorber is the bonded symbiont (capped at its HP).
//
// Perks layered here / at cast:
//   - bond_redirect_strong: 50% -> 60% (at cast).
//   - dual_bond: a 2nd partner @ 25% redirect (at cast).
//   - emergency_full_redirect: partner HP<=30% -> 100% redirect for the hit,
//     cooldown 5 rounds (at damage time).
//   - bond_no_distance_limit: drops the cast-time adjacency gate (in the executor).

'use strict';

const DEFAULT_REDIRECT_PCT = 0.5;
const STRONG_REDIRECT_PCT = 0.6;
const SECONDARY_REDIRECT_PCT = 0.25;
const EMERGENCY_HP_THRESHOLD = 0.3;
const EMERGENCY_COOLDOWN = 5;

function findPassive(unit, tag) {
  const passives = Array.isArray(unit && unit._perk_passives) ? unit._perk_passives : [];
  return passives.find((p) => p && p.tag === tag) || null;
}

/**
 * Derive the symbiont's bond configuration from its perks. Read by
 * executeSymbioticBond at cast to populate symbiont._bond.
 *
 * @param {object} symbiont
 * @returns {{ redirect_pct:number, dual:boolean, secondary_pct:number, no_distance_limit:boolean }}
 */
function computeBondConfig(symbiont) {
  const strong = findPassive(symbiont, 'bond_redirect_strong');
  const dual = findPassive(symbiont, 'dual_bond');
  const noDist = findPassive(symbiont, 'bond_no_distance_limit');
  return {
    redirect_pct: strong
      ? Number(strong.payload && strong.payload.redirect_pct) || STRONG_REDIRECT_PCT
      : DEFAULT_REDIRECT_PCT,
    dual: !!dual,
    secondary_pct: dual
      ? Number(dual.payload && dual.payload.secondary_redirect_pct) || SECONDARY_REDIRECT_PCT
      : 0,
    no_distance_limit: !!noDist,
  };
}

/**
 * Redirect a share of the damage a bonded partner just took onto its symbiont.
 * Mutates target.hp (restored), symbiont.hp (reduced), session.damage_taken.
 * Capped at the symbiont's HP (excess stays on the partner). No-op (null) when
 * the partner is not bonded, the symbiont is dead/missing, or the share rounds to 0.
 *
 * @param {object} session — { units, turn, damage_taken }
 * @param {object} target — the bonded partner that just took `damageDealt`
 * @param {number} damageDealt — damage already applied to target.hp
 * @returns {object|null} redirect result or null
 */
function applyBondRedirect(session, target, damageDealt) {
  if (!session || !target || !target._bonded_by) return null;
  const dmg = Number(damageDealt) || 0;
  if (dmg <= 0) return null;
  const symbiont = (session.units || []).find((u) => u && u.id === target._bonded_by);
  if (!symbiont || Number(symbiont.hp) <= 0) return null;
  const bond = symbiont._bond;
  if (!bond) return null;

  // primary vs secondary share
  let pct;
  if (bond.partner_id === target.id) pct = Number(bond.redirect_pct) || 0;
  else if (bond.secondary_partner_id === target.id) pct = Number(bond.secondary_pct) || 0;
  else return null;
  if (pct <= 0) return null;

  // emergency_full_redirect: partner HP <= 30% -> 100% for this hit, cooldown 5.
  const emerg = findPassive(symbiont, 'emergency_full_redirect');
  let emergencyFired = false;
  if (emerg) {
    const round = Number(session.turn) || 0;
    const cdUntil = Number(symbiont._emergency_redirect_cd) || 0;
    const maxHp = Number(target.max_hp || target.hp) || 1;
    const hpPct = Number(target.hp || 0) / maxHp;
    if (hpPct <= EMERGENCY_HP_THRESHOLD && round >= cdUntil) {
      pct = 1.0;
      emergencyFired = true;
      const cd = Number(emerg.payload && emerg.payload.cooldown) || EMERGENCY_COOLDOWN;
      symbiont._emergency_redirect_cd = round + cd;
    }
  }

  let redirect = Math.floor(dmg * pct);
  if (redirect <= 0) return null;
  redirect = Math.min(redirect, Number(symbiont.hp)); // cap at symbiont HP
  if (redirect <= 0) return null;

  const maxHpT = Number(target.max_hp || Number(target.hp) + redirect);
  target.hp = Math.min(maxHpT, Number(target.hp || 0) + redirect);
  symbiont.hp = Math.max(0, Number(symbiont.hp) - redirect);
  if (session.damage_taken) {
    session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) - redirect;
    session.damage_taken[symbiont.id] = (session.damage_taken[symbiont.id] || 0) + redirect;
  }

  return {
    type: 'symbiont_redirect',
    symbiont_id: symbiont.id,
    target_id: target.id,
    redirect_pct: pct,
    redirected: redirect,
    emergency: emergencyFired,
    symbiont_hp_after: symbiont.hp,
    symbiont_killed: symbiont.hp === 0,
  };
}

/**
 * SYMBIONT sy_r5_sacrifice_grace (TKT-JOB-PHASEC B4b, V3) — when a bonded partner
 * DIES, its (living) symbiont heals heal_pct of its max_hp + gains rage. Called
 * from performAttack when a unit with _bonded_by drops to 0. No-op (null) if the
 * partner is not bonded, the symbiont is missing/dead, or lacks the perk.
 *
 * @param {object} session — { units }
 * @param {object} deadPartner — the bonded partner that just died (hp <= 0)
 * @returns {object|null}
 */
function applyBondedDeathGrace(session, deadPartner) {
  if (!session || !deadPartner || !deadPartner._bonded_by) return null;
  const symbiont = (session.units || []).find((u) => u && u.id === deadPartner._bonded_by);
  if (!symbiont || Number(symbiont.hp) <= 0) return null;
  const grace = findPassive(symbiont, 'bonded_death_grace');
  if (!grace) return null;
  const healPct = Number(grace.payload && grace.payload.heal_pct) || 0.5;
  const rageTurns = Number(grace.payload && grace.payload.rage_turns) || 0;
  const maxHp = Number(symbiont.max_hp || symbiont.hp) || 0;
  const before = Number(symbiont.hp) || 0;
  const heal = Math.floor(maxHp * healPct);
  symbiont.hp = maxHp > 0 ? Math.min(maxHp, before + heal) : before + heal;
  if (rageTurns > 0) {
    if (!symbiont.status) symbiont.status = {};
    symbiont.status.rage = Math.max(Number(symbiont.status.rage) || 0, rageTurns);
  }
  return {
    type: 'bonded_death_grace',
    symbiont_id: symbiont.id,
    partner_id: deadPartner.id,
    healed: symbiont.hp - before,
    rage_turns: rageTurns,
  };
}

/**
 * Identify a shared_hp_pool pair for `target`: returns { symbiont, partner } when
 * `target` is a member of a pool (the symbiont carries shared_hp_pool + `target`
 * is its PRIMARY bonded partner, or `target` IS that symbiont). Secondary
 * (dual_bond) partners are NOT pooled. Null otherwise.
 */
function sharedPoolPair(session, target) {
  if (!session || !target) return null;
  let symbiont = null;
  let partner = null;
  if (target._bonded_by) {
    symbiont = (session.units || []).find((u) => u && u.id === target._bonded_by);
    partner = target;
  } else if (target._bond && target._bond.partner_id) {
    symbiont = target;
    partner = (session.units || []).find((u) => u && u.id === target._bond.partner_id);
  }
  if (!symbiont || !partner) return null;
  if (!findPassive(symbiont, 'shared_hp_pool')) return null;
  if (!symbiont._bond || symbiont._bond.partner_id !== partner.id) return null; // primary only
  return { symbiont, partner };
}

/**
 * SYMBIONT capstone sy_r6_one_soul (TKT-JOB-PHASEC V5, OQ-BOND verdict V5) — the
 * symbiont + its primary bonded partner share a combined HP pool: a hit is split
 * equally across the pair and BOTH KO together when the pool empties. Hooked into
 * performAttack AFTER the damage floor, in place of the redirect (mutual exclusion).
 * `targetHpPreDamage` is the struck unit's HP BEFORE the floor (needed because the
 * floor at 0 hides overkill, which the pool needs for the both-KO check).
 *
 * @param {object} session
 * @param {object} target — the struck pool member (hp already floored by the caller)
 * @param {number} damageDealt — the hit's damage
 * @param {number} targetHpPreDamage — target.hp BEFORE the damage step
 * @returns {object|null}
 */
function applySharedHpPool(session, target, damageDealt, targetHpPreDamage) {
  const pair = sharedPoolPair(session, target);
  if (!pair) return null;
  const d = Number(damageDealt) || 0;
  if (d <= 0) return null;
  const { symbiont, partner } = pair;
  const counterpart = target.id === symbiont.id ? partner : symbiont;
  const preTarget = Number(targetHpPreDamage);
  const preCounter = Number(counterpart.hp);
  // Codex #2542 P1: both members must be ALIVE for the pool to activate. The
  // struck unit's pre-DAMAGE HP is used (it is floored to 0 by performAttack
  // before this runs, so its live HP would falsely read dead); the counterpart
  // uses its live HP. A symbiont downed outside this pool (e.g. via a secondary
  // dual_bond redirect) must not pool or be resurrected to 1 by the split.
  if (preTarget <= 0 || preCounter <= 0) return null;
  const poolAfter = preTarget + preCounter - d;

  let bothKo = false;
  if (poolAfter <= 0) {
    target.hp = 0;
    counterpart.hp = 0;
    bothKo = true;
    // Codex #2542 P2: definitive signal that THIS hit pool-KO'd the counterpart,
    // so the bridge emits its kill ONLY on an actual pool both-KO (not merely a
    // bonded unit that happens to be at 0). Consumed + cleared by the bridge.
    counterpart._pool_both_ko = true;
  } else {
    // Equal split: the struck unit takes the ceil half, the counterpart the floor
    // half; overflow on either side is covered by the other (pool conserved).
    const half = Math.floor(d / 2);
    let t = preTarget - (d - half);
    let c = preCounter - half;
    if (t < 0) {
      c += t;
      t = 0;
    }
    if (c < 0) {
      t += c;
      c = 0;
    }
    // Codex #2542 P1: poolAfter > 0 means the bond keeps the pair UP — neither
    // member may show a solo KO while the shared pool still has HP. The struck
    // target is what performAttack tests for death, so guarantee it stays >= 1
    // (borrow from the counterpart); then lift the counterpart off 0 when the
    // pool can still afford it. At a 1-HP pool the struck target keeps the last HP.
    if (t < 1) {
      const need = 1 - t;
      t = 1;
      c -= need;
    }
    if (c < 1 && t > 1) {
      const give = 1 - c;
      c += give;
      t -= give;
    }
    if (t < 1 || c < 1) {
      // Codex #2542 P1: the remaining pool (a single odd HP) can't keep BOTH
      // members >= 1. Per the capstone's "both KO together" invariant, the pair
      // falls together rather than letting one silently drop to 0 while the other
      // lives on (which the rest of the combat code would treat as a solo KO).
      // NB Claude design call on the integer 1-HP tail (both-KO at pool <= 1) —
      // pending master-dd review; the alternative "pin both at 1" creates a
      // 1-damage immortality exploit at the tail.
      target.hp = 0;
      counterpart.hp = 0;
      bothKo = true;
      counterpart._pool_both_ko = true;
    } else {
      target.hp = t;
      counterpart.hp = c;
    }
  }

  // The actual damage each side absorbed after the split (pool conserved:
  // targetActual + counterActual === d, minus any drained overflow).
  const targetActual = Math.max(0, preTarget - Number(target.hp));
  const counterActual = Math.max(0, preCounter - Number(counterpart.hp));

  // Reconcile damage_taken: performAttack credited the struck unit the full `d`;
  // correct it to the actual split (refund the over-count, credit the counterpart).
  if (session.damage_taken) {
    session.damage_taken[target.id] = Math.max(
      0,
      (session.damage_taken[target.id] || 0) - d + targetActual,
    );
    session.damage_taken[counterpart.id] =
      (session.damage_taken[counterpart.id] || 0) + counterActual;
  }

  return {
    type: 'shared_hp_pool',
    symbiont_id: symbiont.id,
    partner_id: partner.id,
    counterpart_id: counterpart.id,
    target_actual: targetActual,
    counter_actual: counterActual,
    both_ko: bothKo,
    pool_after: Math.max(0, poolAfter),
  };
}

module.exports = {
  computeBondConfig,
  applyBondRedirect,
  applyBondedDeathGrace,
  applySharedHpPool,
  sharedPoolPair,
  DEFAULT_REDIRECT_PCT,
  STRONG_REDIRECT_PCT,
  SECONDARY_REDIRECT_PCT,
  EMERGENCY_HP_THRESHOLD,
  EMERGENCY_COOLDOWN,
};
