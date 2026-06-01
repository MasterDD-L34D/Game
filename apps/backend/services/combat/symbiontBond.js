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

module.exports = {
  computeBondConfig,
  applyBondRedirect,
  applyBondedDeathGrace,
  DEFAULT_REDIRECT_PCT,
  STRONG_REDIRECT_PCT,
  SECONDARY_REDIRECT_PCT,
  EMERGENCY_HP_THRESHOLD,
  EMERGENCY_COOLDOWN,
};
