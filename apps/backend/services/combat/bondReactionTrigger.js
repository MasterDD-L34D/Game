// Beast Bond Reaction Trigger — AncientBeast Tier S #6 residuo (Sprint 7, 2026-04-27).
//
// Bonded creature pairs trigger PASSIVE reactions when one of the pair is hit.
// Distinct from `reactionEngine` (per-actor armed reactions consumed on use):
//   - data-driven via data/core/companion/creature_bonds.yaml
//   - species-pair indexed (order-insensitive)
//   - cooldown_turns regen (no consume-on-use)
//   - cap 1 reaction/round/actor (allineato intercept cap, ADR-2026-04-17 M2)
//
// Reaction types:
//   - counter_attack: bonded ally fires reactive strike at attacker
//     (-1 damage_step, must have attacker in own attack_range).
//   - shield_ally: bonded ally absorbs floor(damageDealt/2), target restored
//     by same amount (ablative transfer, identical math to intercept reroute).
//
// Hook point: performAttack post damage step, AFTER intercept reroute check.
// Compat: missing bond data → no-op silenziosa (loadCreatureBonds returns
// { bonds: [] } on read failure).
//
// Schema: schemas/evo/creature_bond.schema.json.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PATH = path.join(process.cwd(), 'data', 'core', 'companion', 'creature_bonds.yaml');

let _cached = null;

/**
 * Load + cache creature_bonds.yaml. Idempotent.
 * Soft-fail returns { version: 0, bonds: [] } so callers can no-op silently.
 */
function loadCreatureBonds(filePath = DEFAULT_PATH) {
  if (_cached !== null) return _cached;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(raw);
    if (!parsed || !Array.isArray(parsed.bonds)) {
      _cached = { version: 0, bonds: [] };
      return _cached;
    }
    _cached = parsed;
    return _cached;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[creature-bonds] load failed (${err.message}). Bond reactions disabled.`);
    }
    _cached = { version: 0, bonds: [] };
    return _cached;
  }
}

/** Reset cache (test helper). */
function _resetCache() {
  _cached = null;
}

function manhattan(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function isAlive(unit) {
  return unit && Number(unit.hp) > 0;
}

function isStunned(unit) {
  return unit && unit.status && Number(unit.status.stunned) > 0;
}

function speciesId(unit) {
  if (!unit) return null;
  const id = unit.species_id || unit.species || null;
  return id ? String(id) : null;
}

/**
 * Find all bonds whose species_pair matches the given pair (order-insensitive).
 * Identical species (twin pack) supported via [X, X] pair.
 */
function findBondsForPair(bonds, idA, idB) {
  if (!Array.isArray(bonds) || !idA || !idB) return [];
  const a = String(idA);
  const b = String(idB);
  const out = [];
  for (const bond of bonds) {
    if (!bond || !Array.isArray(bond.species_pair) || bond.species_pair.length !== 2) continue;
    const [p0, p1] = bond.species_pair.map(String);
    if ((p0 === a && p1 === b) || (p0 === b && p1 === a)) out.push(bond);
  }
  return out;
}

function isOnCooldown(actor, bond, currentTurn) {
  if (!actor || !actor._bond_cooldown) return false;
  const expiry = Number(actor._bond_cooldown[bond.bond_id]) || 0;
  return Number(currentTurn) < expiry;
}

function setCooldown(actor, bond, currentTurn) {
  if (!actor) return;
  if (!actor._bond_cooldown) actor._bond_cooldown = {};
  const cd = Number(bond.cooldown_turns) || 1;
  actor._bond_cooldown[bond.bond_id] = Number(currentTurn) + cd;
}

/**
 * Scan session.units for a bonded ally eligible to react.
 *
 * Eligibility:
 *   - alive + same controlled_by as target
 *   - not stunned
 *   - not the target itself
 *   - cap 1/round (ally._bond_round_used !== currentTurn)
 *   - species_pair matches (target.species_id, ally.species_id)
 *   - distance(ally, target) ≤ bond.trigger_range (Manhattan)
 *   - bond not on cooldown for this ally
 *
 * Returns { ally, bond } or null.
 */
function evaluateBondTrigger(session, attacker, target, damageDealt, bonds) {
  if (!session || !target) return null;
  if (!damageDealt || Number(damageDealt) <= 0) return null;
  if (!isAlive(target)) return null;
  if (!Array.isArray(bonds) || bonds.length === 0) return null;
  const targetSpec = speciesId(target);
  if (!targetSpec) return null;
  const currentTurn = Number(session.turn) || 0;

  for (const ally of session.units || []) {
    if (!ally || ally.id === target.id) continue;
    if (ally.controlled_by !== target.controlled_by) continue;
    if (!isAlive(ally) || isStunned(ally)) continue;
    if (Number(ally._bond_round_used || -1) === currentTurn) continue;
    const allySpec = speciesId(ally);
    if (!allySpec) continue;
    const matches = findBondsForPair(bonds, targetSpec, allySpec);
    if (matches.length === 0) continue;
    const dist = manhattan(ally.position, target.position);
    for (const bond of matches) {
      if (dist > Number(bond.trigger_range)) continue;
      if (isOnCooldown(ally, bond, currentTurn)) continue;
      return { ally, bond, distance: dist };
    }
  }
  return null;
}

/**
 * Fire counter_attack: bonded ally strikes attacker, damage_step_mod=-1.
 * Requires attacker alive + within ally.attack_range.
 */
function fireCounterAttack(session, ally, attacker, bond, performAttack) {
  if (!attacker || !isAlive(attacker)) return null;
  if (typeof performAttack !== 'function') return null;
  const range = Number(ally.attack_range) || 1;
  if (manhattan(ally.position, attacker.position) > range) return null;

  const attackerHpBefore = attacker.hp;
  const res = performAttack(ally, attacker);
  let damageDealt = res ? Number(res.damageDealt || 0) : 0;
  const damageStepMod = -1;
  if (res && res.result && res.result.hit && damageDealt > 0) {
    const refund = Math.min(1, damageDealt);
    attacker.hp = Math.min(
      Number(attacker.max_hp || attackerHpBefore),
      Number(attacker.hp || 0) + refund,
    );
    if (session.damage_taken) {
      session.damage_taken[attacker.id] = Math.max(
        0,
        (session.damage_taken[attacker.id] || 0) - refund,
      );
    }
    damageDealt = Math.max(0, damageDealt - refund);
  }

  return {
    type: 'counter_attack',
    bond_id: bond.bond_id,
    ally_id: ally.id,
    attacker_id: attacker.id,
    hit: !!(res && res.result && res.result.hit),
    die: res && res.result ? res.result.die : null,
    roll: res && res.result ? res.result.roll : null,
    mos: res && res.result ? res.result.mos : null,
    damage_dealt: damageDealt,
    damage_step_mod: damageStepMod,
    attacker_hp_before: attackerHpBefore,
    attacker_hp_after: attacker.hp,
    attacker_killed: attacker.hp === 0,
  };
}

/**
 * Fire shield_ally: bonded ally absorbs 50% of damageDealt (transfer).
 * target.hp restored by floor(damageDealt/2); ally takes the same.
 * Returns null when transfer would be 0 (damageDealt=1 with floor) — caller
 * should treat as no-op (no bond cooldown set, ally remains unmarked).
 */
function fireShieldAlly(session, ally, target, bond, damageDealt) {
  const transfer = Math.floor(Number(damageDealt) / 2);
  if (transfer <= 0) return null;
  const allyHpBefore = ally.hp;
  target.hp = Math.min(
    Number(target.max_hp || Number(target.hp) + transfer),
    Number(target.hp || 0) + transfer,
  );
  if (session.damage_taken) {
    session.damage_taken[target.id] = Math.max(
      0,
      (session.damage_taken[target.id] || 0) - transfer,
    );
  }
  ally.hp = Math.max(0, Number(ally.hp || 0) - transfer);
  if (session.damage_taken) {
    session.damage_taken[ally.id] = (session.damage_taken[ally.id] || 0) + transfer;
  }
  return {
    type: 'shield_ally',
    bond_id: bond.bond_id,
    ally_id: ally.id,
    target_id: target.id,
    damage_absorbed: transfer,
    ally_hp_before: allyHpBefore,
    ally_hp_after: ally.hp,
    ally_killed: ally.hp === 0,
  };
}

/**
 * Top-level: evaluate eligibility + fire matching reaction.
 *
 * @param {object} session
 * @param {object} attacker
 * @param {object} target
 * @param {number} damageDealt damage already applied to target.hp
 * @param {object} options { bonds: array, performAttack: function }
 * @returns null when no reaction fired, otherwise reaction result object.
 */
function triggerBondReaction(session, attacker, target, damageDealt, options) {
  const opts = options || {};
  const bondsList =
    Array.isArray(opts.bonds) && opts.bonds.length ? opts.bonds : loadCreatureBonds().bonds || [];
  if (!bondsList.length) return null;

  const evaluated = evaluateBondTrigger(session, attacker, target, damageDealt, bondsList);
  if (!evaluated) return null;
  const { ally, bond } = evaluated;
  const currentTurn = Number(session.turn) || 0;

  let result = null;
  if (bond.reaction_type === 'shield_ally') {
    result = fireShieldAlly(session, ally, target, bond, damageDealt);
  } else if (bond.reaction_type === 'counter_attack') {
    result = fireCounterAttack(session, ally, attacker, bond, opts.performAttack);
  }
  if (!result) return null;

  ally._bond_round_used = currentTurn;
  setCooldown(ally, bond, currentTurn);

  // Gate 5 surface: structured stdout JSON emit (TKT-BOND-HUD-SURFACE backend
  // wire). Mirrors generation-orchestrator `component=` pattern so dev
  // playtest log tail can confirm bond firings without HUD ready. Frontend
  // toast/HUD wire deferred to master-dd Mission Console coord (handoff:
  // docs/planning/2026-05-10-tkt-bond-hud-surface-frontend-handoff.md).
  // Suppress in test env to keep `node --test` output clean.
  if (!process.env.IDEA_ENGINE_DISABLE_BOND_LOG && process.env.NODE_ENV !== 'test') {
    try {
      // eslint-disable-next-line no-console
      console.info(
        JSON.stringify({
          component: 'bond-reaction',
          event: 'bond_fired',
          session_id: session.session_id || null,
          turn: currentTurn,
          bond_id: result.bond_id,
          bond_type: result.type,
          ally_id: result.ally_id,
          attacker_id: attacker && attacker.id ? attacker.id : null,
          target_id: target && target.id ? target.id : null,
          damage_absorbed: result.damage_absorbed || 0,
          damage_dealt: result.damage_dealt || 0,
          ally_killed: !!result.ally_killed,
          attacker_killed: !!result.attacker_killed,
        }),
      );
    } catch {
      // structured log is best-effort; combat path must never break on log.
    }
  }

  return result;
}

module.exports = {
  loadCreatureBonds,
  evaluateBondTrigger,
  triggerBondReaction,
  findBondsForPair,
  isOnCooldown,
  setCooldown,
  _resetCache,
};
