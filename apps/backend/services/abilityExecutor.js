// Ability Executor — FRICTION #4 MVP (playtest 2026-04-17).
//
// Dispatcher per action_type='ability' in POST /api/session/action.
// Carica spec da jobsLoader (data/core/jobs.yaml), applica cost_ap,
// dispatch per effect_type, emette raw event schema-compat:
//   { action_type: 'ability', ability_id, effect_type, phase?, ... }
//
// MVP implementa 4 effect_type: move_attack, attack_move, buff, heal.
// Altri tipi (aoe_*, multi_attack, shield, surge_aoe, reaction, ...)
// ritornano 501 con la lista dei supported.

'use strict';

const { loadJobs, extractAbilities } = require('./jobsLoader');

let abilityIndex = null;

function buildAbilityIndex() {
  const catalog = loadJobs();
  const idx = new Map();
  if (!catalog || !catalog.jobs) return idx;
  for (const job of Object.values(catalog.jobs)) {
    for (const ab of extractAbilities(job)) {
      if (ab && ab.ability_id) idx.set(String(ab.ability_id), ab);
    }
  }
  return idx;
}

function ensureAbilityIndex() {
  if (!abilityIndex) abilityIndex = buildAbilityIndex();
  return abilityIndex;
}

function findAbility(abilityId) {
  return ensureAbilityIndex().get(String(abilityId || '')) || null;
}

const SUPPORTED_EFFECT_TYPES = new Set(['move_attack', 'attack_move', 'buff', 'heal']);

function isWithinGrid(pos, gridSize) {
  return pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize;
}

function createAbilityExecutor(deps) {
  const {
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    appendEvent,
    manhattanDistance,
    gridSize = 6,
    rng = Math.random,
  } = deps;

  // Applica buff self come status[buffStat_buff] + actor[buffStat_bonus].
  // L'applicazione puntuale del bonus (es. a attack_mod effettivo) e'
  // demandata al consumer: qui tracciamo solo il buff per il log e per
  // lettura da parte di UI/debrief. Espansione al resolver = follow-up.
  function applySelfBuff(actor, stat, amount, duration) {
    if (!actor.status) actor.status = {};
    const key = `${stat}_buff`;
    actor.status[key] = Math.max(Number(actor.status[key]) || 0, duration);
    actor[`${stat}_bonus`] = (actor[`${stat}_bonus`] || 0) + amount;
  }

  async function executeMoveAttack({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const dest = body.position;
    if (!dest || typeof dest.x !== 'number' || typeof dest.y !== 'number') {
      return { status: 400, body: { error: 'position { x, y } richiesta per move_attack' } };
    }
    if (!isWithinGrid(dest, gridSize)) {
      return {
        status: 400,
        body: { error: `posizione fuori griglia (${gridSize}x${gridSize})` },
      };
    }
    const moveDist = manhattanDistance(actor.position, dest);
    const maxMove = Number(ability.move_distance) || 0;
    if (moveDist > maxMove) {
      return {
        status: 400,
        body: { error: `move_distance superata: ${moveDist} > ${maxMove}` },
      };
    }
    const blocker = session.units.find(
      (u) => u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
    );
    if (blocker) {
      return {
        status: 400,
        body: { error: `casella (${dest.x},${dest.y}) occupata da ${blocker.id}` },
      };
    }

    // Conditional buff valutato PRIMA del move (dash_strike: target_not_adjacent
    // = Manhattan > 1 al momento della dichiarazione).
    let buffApplied = null;
    const distBefore = manhattanDistance(actor.position, target.position);
    if (ability.buff_condition === 'target_not_adjacent' && distBefore > 1) {
      buffApplied = {
        stat: ability.buff_stat || 'attack_mod',
        amount: Number(ability.buff_amount || 0),
        reason: 'target_not_adjacent',
      };
    }

    const positionFrom = { ...actor.position };
    actor.position = { x: dest.x, y: dest.y };
    const moveEvent = buildMoveEvent({ session, actor, positionFrom });
    moveEvent.action_type = 'ability';
    moveEvent.ability_id = ability.ability_id;
    moveEvent.effect_type = 'move_attack';
    moveEvent.phase = 'move';
    moveEvent.ap_spent = 0;
    await appendEvent(session, moveEvent);

    // Verifica range dopo il move (skirmisher range=2 di default).
    const attackRange = Number(actor.attack_range) || 2;
    const distAfter = manhattanDistance(actor.position, target.position);
    if (distAfter > attackRange) {
      return {
        status: 400,
        body: {
          error: `target fuori range dopo move: dist=${distAfter}, range=${attackRange}`,
          position_from: positionFrom,
          position_to: { ...actor.position },
        },
      };
    }

    // Applica bonus attack_mod temporaneo sull'attacco singolo.
    const originalMod = actor.mod;
    if (buffApplied && (ability.buff_stat || 'attack_mod') === 'attack_mod') {
      actor.mod = Number(actor.mod || 0) + buffApplied.amount;
    }
    const hpBefore = target.hp;
    const targetPosAtAttack = { ...target.position };
    const res = performAttack(session, actor, target);
    actor.mod = originalMod;

    const attackEvent = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: res.damageDealt,
      hpBefore,
      targetPositionAtAttack: targetPosAtAttack,
    });
    attackEvent.action_type = 'ability';
    attackEvent.ability_id = ability.ability_id;
    attackEvent.effect_type = 'move_attack';
    attackEvent.phase = 'attack';
    attackEvent.ap_spent = Number(ability.cost_ap || 0);
    if (buffApplied) attackEvent.ability_buff = buffApplied;
    if (res.parry) attackEvent.parry = res.parry;
    await appendEvent(session, attackEvent);

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'move_attack',
        position_from: positionFrom,
        position_to: { ...actor.position },
        attack: {
          target_id: target.id,
          die: res.result.die,
          roll: res.result.roll,
          mos: res.result.mos,
          hit: res.result.hit,
          damage_dealt: res.damageDealt,
          target_hp: target.hp,
        },
        buff_applied: buffApplied,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  async function executeAttackMove({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const attackRange = Number(actor.attack_range) || 2;
    if (manhattanDistance(actor.position, target.position) > attackRange) {
      return {
        status: 400,
        body: { error: `target fuori range (${attackRange})` },
      };
    }
    const dest = body.position;
    if (!dest || typeof dest.x !== 'number' || typeof dest.y !== 'number') {
      return { status: 400, body: { error: 'position { x, y } richiesta per attack_move' } };
    }
    if (!isWithinGrid(dest, gridSize)) {
      return {
        status: 400,
        body: { error: `posizione fuori griglia (${gridSize}x${gridSize})` },
      };
    }

    const hpBefore = target.hp;
    const targetPosAtAttack = { ...target.position };
    const res = performAttack(session, actor, target);
    const attackEvent = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: res.damageDealt,
      hpBefore,
      targetPositionAtAttack: targetPosAtAttack,
    });
    attackEvent.action_type = 'ability';
    attackEvent.ability_id = ability.ability_id;
    attackEvent.effect_type = 'attack_move';
    attackEvent.phase = 'attack';
    attackEvent.ap_spent = Number(ability.cost_ap || 0);
    if (res.parry) attackEvent.parry = res.parry;
    await appendEvent(session, attackEvent);

    const moveDist = manhattanDistance(actor.position, dest);
    const maxMove = Number(ability.move_distance) || 0;
    if (moveDist > maxMove) {
      return {
        status: 400,
        body: {
          error: `move_distance superata: ${moveDist} > ${maxMove} (attack completato)`,
        },
      };
    }
    const blocker = session.units.find(
      (u) => u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
    );
    if (blocker) {
      return {
        status: 400,
        body: {
          error: `casella (${dest.x},${dest.y}) occupata da ${blocker.id} (attack completato)`,
        },
      };
    }
    const positionFrom = { ...actor.position };
    actor.position = { x: dest.x, y: dest.y };
    const moveEvent = buildMoveEvent({ session, actor, positionFrom });
    moveEvent.action_type = 'ability';
    moveEvent.ability_id = ability.ability_id;
    moveEvent.effect_type = 'attack_move';
    moveEvent.phase = 'move';
    moveEvent.ap_spent = 0;
    await appendEvent(session, moveEvent);

    let buffApplied = null;
    if (ability.buff_stat) {
      const amt = Number(ability.buff_amount || 0);
      const dur = Number(ability.buff_duration || 1);
      applySelfBuff(actor, ability.buff_stat, amt, dur);
      buffApplied = { stat: ability.buff_stat, amount: amt, duration: dur };
    }

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'attack_move',
        attack: {
          target_id: target.id,
          die: res.result.die,
          roll: res.result.roll,
          mos: res.result.mos,
          hit: res.result.hit,
          damage_dealt: res.damageDealt,
          target_hp: target.hp,
        },
        position_from: positionFrom,
        position_to: { ...actor.position },
        buff_applied: buffApplied,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  async function executeBuff({ session, actor, ability }) {
    const buffStat = ability.buff_stat;
    if (!buffStat) {
      return { status: 400, body: { error: 'buff_stat richiesto in ability spec' } };
    }
    const amt = Number(ability.buff_amount || 0);
    const dur = Number(ability.buff_duration || 1);
    applySelfBuff(actor, buffStat, amt, dur);

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    const event = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'ability',
      ability_id: ability.ability_id,
      effect_type: 'buff',
      target_id: actor.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      buff_stat: buffStat,
      buff_amount: amt,
      buff_duration: dur,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'buff',
        buff_applied: { stat: buffStat, amount: amt, duration: dur },
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  async function executeHeal({ session, actor, ability, body }) {
    const targetId = String(body.target_id || actor.id);
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    if (target.controlled_by !== actor.controlled_by) {
      return { status: 400, body: { error: 'heal richiede target alleato' } };
    }
    const range = Number(ability.range) || 0;
    if (range > 0 && manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const dice = ability.heal_dice || { count: 1, sides: 4, modifier: 0 };
    let rolled = 0;
    const dCount = Number(dice.count || 1);
    const dSides = Number(dice.sides || 4);
    for (let i = 0; i < dCount; i += 1) {
      rolled += Math.floor(rng() * dSides) + 1;
    }
    rolled += Number(dice.modifier || 0);
    const hpBefore = target.hp;
    const maxHp = Number(target.max_hp || hpBefore || 0);
    const healed = Math.max(0, Math.min(rolled, Math.max(0, maxHp - hpBefore)));
    target.hp = hpBefore + healed;

    let removedStatus = null;
    if (ability.remove_status && target.status) {
      const prev = Number(target.status[ability.remove_status]) || 0;
      if (prev > 0) {
        target.status[ability.remove_status] = 0;
        removedStatus = { id: ability.remove_status, turns_removed: prev };
      }
    }

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    const event = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'ability',
      ability_id: ability.ability_id,
      effect_type: 'heal',
      target_id: target.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      healing_applied: healed,
      heal_rolled: rolled,
      target_hp_before: hpBefore,
      target_hp_after: target.hp,
      removed_status: removedStatus,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'heal',
        target_id: target.id,
        healing_applied: healed,
        heal_rolled: rolled,
        target_hp_before: hpBefore,
        target_hp_after: target.hp,
        removed_status: removedStatus,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  async function executeAbility({ session, actor, body }) {
    const abilityId = String(body.ability_id || '');
    if (!abilityId) {
      return { status: 400, body: { error: 'ability_id richiesto per action_type=ability' } };
    }
    const ability = findAbility(abilityId);
    if (!ability) {
      return { status: 400, body: { error: `ability_id "${abilityId}" non trovata nel catalog` } };
    }
    const costAp = Number(ability.cost_ap || 0);
    const apAvailable = Number(actor.ap_remaining ?? actor.ap ?? 0);
    if (apAvailable < costAp) {
      return {
        status: 400,
        body: {
          error: `AP insufficienti per ability (richiesti ${costAp}, disponibili ${apAvailable})`,
          ap_remaining: apAvailable,
          cost_ap: costAp,
        },
      };
    }
    switch (ability.effect_type) {
      case 'move_attack':
        return executeMoveAttack({ session, actor, ability, body });
      case 'attack_move':
        return executeAttackMove({ session, actor, ability, body });
      case 'buff':
        return executeBuff({ session, actor, ability });
      case 'heal':
        return executeHeal({ session, actor, ability, body });
      default:
        return {
          status: 501,
          body: {
            error: `effect_type "${ability.effect_type}" non implementato in MVP`,
            ability_id: abilityId,
            effect_type: ability.effect_type,
            supported: Array.from(SUPPORTED_EFFECT_TYPES),
          },
        };
    }
  }

  return { executeAbility, findAbility, SUPPORTED_EFFECT_TYPES };
}

module.exports = {
  createAbilityExecutor,
  findAbility,
  ensureAbilityIndex,
  SUPPORTED_EFFECT_TYPES,
};
