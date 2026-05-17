// Ability Executor — FRICTION #4 (playtest 2026-04-17).
//
// Dispatcher per action_type='ability' in POST /api/session/action.
// Carica spec da jobsLoader (data/core/jobs.yaml), applica cost_ap,
// dispatch per effect_type, emette raw event schema-compat:
//   { action_type: 'ability', ability_id, effect_type, phase?, ... }
//
// Implementa 18/18 effect_type (TUTTI supportati):
//   - move_attack (dash_strike): move + attack + conditional buff
//   - attack_move (evasive_maneuver): attack + move + self-buff
//   - buff (fortify): self-buff stat + duration
//   - heal (growth_spore): restore HP ally, opz. remove_status
//   - multi_attack (blade_flurry): loop attack_count con damage_step_mod
//   - attack_push (shield_bash): attack + push + apply_status
//   - debuff (disrupt_field): target status_debuff + stat_bonus negativo
//   - ranged_attack (focused_blast): attack range custom + conditional_status
//   - drain_attack (essence_drain): attack + lifesteal + seed_gain
//   - execution_attack (kill_shot): attack + damage_step_mod + multiplier se hp%<threshold
//   - shield (energy_barrier): target.shield_hp consumato in performAttack pre-damage
//   - team_buff (resonance_amplifier): allies in range, buff/pp_grant
//   - team_heal (symbiotic_bloom): allies in range, heal_dice + seed_gain
//   - aoe_buff (sanctuary): area NxN, buff allies + stress_reduction
//   - aoe_debuff (binding_field): area NxN, debuff enemies
//   - surge_aoe (cataclysm): area NxN, damage_dice + stress_reset, shield-aware
//   - reaction (intercept, overwatch_shot): register actor.reactions[] (trigger sys = follow-up)
//   - aggro_pull (taunt): self-buff defense + target.status.aggro_locked
//     (declareSistemaIntents respect override per SIS units)
//
// Stat bonus wiring: actor.attack_mod_bonus + target.defense_mod_bonus
// consumati in sessionHelpers.resolveAttack + predictCombat. Decay via
// status[stat_buff|debuff] → sessionRoundBridge azzera bonus a scadenza.

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

const SUPPORTED_EFFECT_TYPES = new Set([
  'move_attack',
  'attack_move',
  'buff',
  'heal',
  'multi_attack',
  'attack_push',
  'debuff',
  'ranged_attack',
  'drain_attack',
  'execution_attack',
  'shield',
  'team_buff',
  'team_heal',
  'aoe_buff',
  'aoe_debuff',
  'surge_aoe',
  'reaction',
  'aggro_pull',
]);

// Push direction from actor to target: target spostato di 1 cella
// lontano da actor lungo l'asse con delta maggiore (Manhattan).
function computePushDestination(actor, target) {
  const dx = Number(target.position.x) - Number(actor.position.x);
  const dy = Number(target.position.y) - Number(actor.position.y);
  // Dominant axis
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: Number(target.position.x) + Math.sign(dx || 1), y: Number(target.position.y) };
  }
  return { x: Number(target.position.x), y: Number(target.position.y) + Math.sign(dy || 1) };
}

function isWithinGrid(pos, gridSize) {
  return pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize;
}

// Helper: unita' vive in area NxN centrata su pos (size = lato del quadrato).
// size=3 → ±1 (3x3=9 cells); size=2 → ±0..1 (2x2=4 cells, biased SE).
function unitsInArea(units, center, size) {
  const half = Math.floor(Number(size || 1) / 2);
  const extra = Number(size || 1) % 2 === 0 ? 0 : 0; // square anchor: simmetrico
  return units.filter(
    (u) =>
      u &&
      u.hp > 0 &&
      Math.abs(Number(u.position?.x) - Number(center.x)) <= half + extra &&
      Math.abs(Number(u.position?.y) - Number(center.y)) <= half + extra,
  );
}

// Roll dice helper {count, sides, modifier}.
function rollDice(dice, rng) {
  const count = Math.max(1, Number(dice?.count || 1));
  const sides = Math.max(1, Number(dice?.sides || 4));
  let total = 0;
  for (let i = 0; i < count; i += 1) total += Math.floor(rng() * sides) + 1;
  return total + Number(dice?.modifier || 0);
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

  // V5 SG earn (ADR-2026-04-26 Opzione C mixed): accumulate dealt+taken
  // su ogni damage step triggered da ability. Wrapped in try per non
  // rompere flow se sgTracker module assente.
  function applySgEarn(actor, target, damageDealt) {
    if (!(Number(damageDealt) > 0)) return;
    try {
      const sgTracker = require('./combat/sgTracker');
      sgTracker.accumulate(actor, { damage_dealt: damageDealt });
      sgTracker.accumulate(target, { damage_taken: damageDealt });
    } catch {
      /* sgTracker optional */
    }
  }

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
    if (!isWithinGrid(dest, session.grid?.width || gridSize)) {
      return {
        status: 400,
        body: {
          error: `posizione fuori griglia (${session.grid?.width || gridSize}x${session.grid?.height || gridSize})`,
        },
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

    // Applica bonus attack_mod temporaneo via actor.attack_mod_bonus:
    // resolveAttack in sessionHelpers.js somma il bonus al mod. Dopo
    // l'attacco lo azzeriamo (one-shot, non persistente come buff status).
    if (buffApplied && (ability.buff_stat || 'attack_mod') === 'attack_mod') {
      actor.attack_mod_bonus = (actor.attack_mod_bonus || 0) + buffApplied.amount;
    }
    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };
    // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
    const res = performAttack(session, actor, target, {
      channel: ability && ability.channel ? ability.channel : null,
    });
    if (buffApplied && (ability.buff_stat || 'attack_mod') === 'attack_mod') {
      actor.attack_mod_bonus = Math.max(0, (actor.attack_mod_bonus || 0) - buffApplied.amount);
    }
    applySgEarn(actor, target, res.damageDealt);

    const attackEvent = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: res.damageDealt,
      hpBefore,
      targetPositionAtAttack: targetPositionAtAttack,
      positional: res.positional || null,
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
    if (!isWithinGrid(dest, session.grid?.width || gridSize)) {
      return {
        status: 400,
        body: {
          error: `posizione fuori griglia (${session.grid?.width || gridSize}x${session.grid?.height || gridSize})`,
        },
      };
    }

    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };
    // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
    const res = performAttack(session, actor, target, {
      channel: ability && ability.channel ? ability.channel : null,
    });
    applySgEarn(actor, target, res.damageDealt);
    const attackEvent = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: res.damageDealt,
      hpBefore,
      targetPositionAtAttack: targetPositionAtAttack,
      positional: res.positional || null,
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

  // multi_attack (blade_flurry): loop attack_count volte, modifica danno
  // per ogni hit via damage_step_mod (es. -1 inflict -1 damage).
  // Interrompe se target muore. PP/SG/Seed gating: skippato in MVP.
  async function executeMultiAttack({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const range = Number(actor.attack_range) || 2;
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const attackCount = Math.max(1, Number(ability.attack_count || 1));
    const damageStepMod = Number(ability.damage_step_mod || 0);
    const attacks = [];

    for (let i = 0; i < attackCount; i += 1) {
      if (target.hp <= 0) break;
      const hpBefore = target.hp;
      const targetPositionAtAttack = { ...target.position };
      // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
      const res = performAttack(session, actor, target, {
        channel: ability && ability.channel ? ability.channel : null,
      });

      // Applica damage_step_mod post-hoc: se res.damageDealt > 0, aggiusta hp.
      // damage_step_mod può essere negativo (reduce) o positivo (amplify).
      let adjustedDamage = res.damageDealt;
      if (res.result.hit && damageStepMod !== 0 && res.damageDealt > 0) {
        const delta = damageStepMod;
        if (delta < 0) {
          // Ridotto: restituisci hp assorbiti (min 0).
          const refund = Math.min(-delta, res.damageDealt);
          target.hp = Math.min(Number(target.max_hp || hpBefore), target.hp + refund);
          session.damage_taken[target.id] = Math.max(
            0,
            (session.damage_taken[target.id] || 0) - refund,
          );
          adjustedDamage = Math.max(0, res.damageDealt - refund);
        } else {
          // Amplificato: drena hp extra.
          const extra = Math.min(delta, target.hp);
          target.hp = Math.max(0, target.hp - extra);
          session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
          adjustedDamage = res.damageDealt + extra;
        }
      }
      applySgEarn(actor, target, adjustedDamage);

      const event = buildAttackEvent({
        session,
        actor,
        target,
        result: res.result,
        evaluation: res.evaluation,
        damageDealt: adjustedDamage,
        hpBefore,
        targetPositionAtAttack,
        positional: res.positional || null,
      });
      event.action_type = 'ability';
      event.ability_id = ability.ability_id;
      event.effect_type = 'multi_attack';
      event.attack_index = i + 1;
      event.attack_count = attackCount;
      event.damage_step_mod = damageStepMod;
      event.ap_spent = i === 0 ? Number(ability.cost_ap || 0) : 0;
      if (res.parry) event.parry = res.parry;
      await appendEvent(session, event);

      attacks.push({
        index: i + 1,
        die: res.result.die,
        roll: res.result.roll,
        mos: res.result.mos,
        hit: res.result.hit,
        damage_dealt: adjustedDamage,
        target_hp: target.hp,
      });
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
        effect_type: 'multi_attack',
        attacks,
        attacks_executed: attacks.length,
        target_id: target.id,
        target_hp: target.hp,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // attack_push (shield_bash): attack + push target 1 cella + apply_status.
  // FRICTION #7 (playtest 2026-04-17-02): ability paga AP, status default
  // gated on hit. Override esplicito via ability.effect_trigger='always'
  // applica push + apply_status anche su miss (caso "sbilanciato sempre").
  async function executeAttackPush({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const range = Number(actor.attack_range) || 2;
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };
    // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
    const res = performAttack(session, actor, target, {
      channel: ability && ability.channel ? ability.channel : null,
    });
    applySgEarn(actor, target, res.damageDealt);

    const trigger = String(ability.effect_trigger || 'on_hit');
    const allowEffect = (trigger === 'always' || res.result.hit) && target.hp > 0;

    // Push: calcola destinazione, verifica griglia + non occupata. Fallisce
    // silenziosamente se bloccato (attack va comunque a segno).
    let pushed = null;
    if (allowEffect) {
      const pushDist = Math.max(1, Number(ability.push_distance || 1));
      const pushFrom = { ...target.position };
      let destX = pushFrom.x;
      let destY = pushFrom.y;
      for (let step = 0; step < pushDist; step += 1) {
        const next = computePushDestination(actor, { position: { x: destX, y: destY } });
        if (!isWithinGrid(next, session.grid?.width || gridSize)) break;
        const blocker = session.units.find(
          (u) =>
            u.id !== target.id && u.hp > 0 && u.position.x === next.x && u.position.y === next.y,
        );
        if (blocker) break;
        destX = next.x;
        destY = next.y;
      }
      if (destX !== pushFrom.x || destY !== pushFrom.y) {
        target.position = { x: destX, y: destY };
        pushed = { from: pushFrom, to: { x: destX, y: destY } };
      }
    }

    // apply_status su target (rispetta effect_trigger come push)
    let appliedStatus = null;
    if (allowEffect && ability.apply_status && ability.apply_status.status_id) {
      const sid = String(ability.apply_status.status_id);
      const dur = Number(ability.apply_status.duration || 1);
      if (!target.status) target.status = {};
      target.status[sid] = Math.max(Number(target.status[sid]) || 0, dur);
      appliedStatus = { id: sid, duration: dur };
    }

    const event = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: res.damageDealt,
      hpBefore,
      targetPositionAtAttack,
      positional: res.positional || null,
    });
    event.action_type = 'ability';
    event.ability_id = ability.ability_id;
    event.effect_type = 'attack_push';
    event.ap_spent = Number(ability.cost_ap || 0);
    event.effect_trigger = trigger;
    if (pushed) event.pushed = pushed;
    if (appliedStatus) event.applied_status = appliedStatus;
    if (res.parry) event.parry = res.parry;
    await appendEvent(session, event);

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
        effect_type: 'attack_push',
        effect_trigger: trigger,
        attack: {
          target_id: target.id,
          die: res.result.die,
          roll: res.result.roll,
          mos: res.result.mos,
          hit: res.result.hit,
          damage_dealt: res.damageDealt,
          target_hp: target.hp,
        },
        pushed,
        applied_status: appliedStatus,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // debuff: apply target status[stat_debuff]=duration + target[stat_bonus]-=amount.
  // Specchio di buff ma su target. extend_status_if_present prolunga status
  // esistenti di N turni se target li ha gia' (simbiosi con disrupt_field).
  async function executeDebuff({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const range = Number(ability.range) || Number(actor.attack_range) || 2;
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const debuffStat = ability.debuff_stat;
    const amount = Number(ability.debuff_amount || 0); // usually negative
    const duration = Number(ability.debuff_duration || 1);
    const statusKey = `${debuffStat}_debuff`;

    if (!target.status) target.status = {};
    target.status[statusKey] = Math.max(Number(target.status[statusKey]) || 0, duration);
    target[`${debuffStat}_bonus`] = (target[`${debuffStat}_bonus`] || 0) + amount;

    // extend_status_if_present: +N turni a status gia' attivi (panic/bleeding/etc).
    let extendedStatuses = [];
    const extendN = Number(ability.extend_status_if_present || 0);
    if (extendN > 0 && target.status) {
      for (const [k, v] of Object.entries(target.status)) {
        if (k === statusKey) continue;
        const num = Number(v);
        if (num > 0) {
          target.status[k] = num + extendN;
          extendedStatuses.push({ id: k, new_duration: num + extendN });
        }
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
      effect_type: 'debuff',
      target_id: target.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      debuff_stat: debuffStat,
      debuff_amount: amount,
      debuff_duration: duration,
      extended_statuses: extendedStatuses,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'debuff',
        target_id: target.id,
        debuff_applied: { stat: debuffStat, amount, duration },
        extended_statuses: extendedStatuses,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // ranged_attack: attack con range/damage_step custom + opzionale conditional_status.
  // Range override: ability.range ha precedenza su actor.attack_range.
  async function executeRangedAttack({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const range = Number(ability.range) || Number(actor.attack_range) || 3;
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };
    // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
    const res = performAttack(session, actor, target, {
      channel: ability && ability.channel ? ability.channel : null,
    });

    const damageStepMod = Number(ability.damage_step_mod || 0);
    let adjustedDamage = res.damageDealt;
    if (res.result.hit && damageStepMod !== 0 && res.damageDealt > 0) {
      if (damageStepMod < 0) {
        const refund = Math.min(-damageStepMod, res.damageDealt);
        target.hp = Math.min(Number(target.max_hp || hpBefore), target.hp + refund);
        session.damage_taken[target.id] = Math.max(
          0,
          (session.damage_taken[target.id] || 0) - refund,
        );
        adjustedDamage = Math.max(0, res.damageDealt - refund);
      } else {
        const extra = Math.min(damageStepMod, target.hp);
        target.hp = Math.max(0, target.hp - extra);
        session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
        adjustedDamage = res.damageDealt + extra;
      }
    }
    applySgEarn(actor, target, adjustedDamage);

    // Conditional status: { condition: "mos >= 10", status_id, duration }
    let appliedStatus = null;
    const cond = ability.conditional_status;
    if (cond && cond.condition && res.result.hit && target.hp > 0) {
      const match = /^mos\s*>=\s*(\d+)/.exec(String(cond.condition));
      if (match && res.result.mos >= Number(match[1])) {
        const sid = String(cond.status_id || '');
        const dur = Number(cond.duration || 1);
        if (sid) {
          if (!target.status) target.status = {};
          target.status[sid] = Math.max(Number(target.status[sid]) || 0, dur);
          appliedStatus = { id: sid, duration: dur };
        }
      }
    }

    const event = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: adjustedDamage,
      hpBefore,
      targetPositionAtAttack,
      positional: res.positional || null,
    });
    event.action_type = 'ability';
    event.ability_id = ability.ability_id;
    event.effect_type = 'ranged_attack';
    event.ap_spent = Number(ability.cost_ap || 0);
    event.damage_step_mod = damageStepMod;
    if (appliedStatus) event.applied_status = appliedStatus;
    if (res.parry) event.parry = res.parry;
    await appendEvent(session, event);

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
        effect_type: 'ranged_attack',
        attack: {
          target_id: target.id,
          die: res.result.die,
          roll: res.result.roll,
          mos: res.result.mos,
          hit: res.result.hit,
          damage_dealt: adjustedDamage,
          target_hp: target.hp,
        },
        applied_status: appliedStatus,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // drain_attack: attack mischia + heal actor per lifesteal_pct % del danno.
  async function executeDrainAttack({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const range = Number(actor.attack_range) || 1;
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };
    // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
    const res = performAttack(session, actor, target, {
      channel: ability && ability.channel ? ability.channel : null,
    });
    applySgEarn(actor, target, res.damageDealt);

    const lifestealPct = Number(ability.lifesteal_pct || 0);
    let healed = 0;
    if (res.result.hit && res.damageDealt > 0 && lifestealPct > 0) {
      const actorMaxHp = Number(actor.max_hp || actor.hp || 0);
      const missing = Math.max(0, actorMaxHp - Number(actor.hp || 0));
      const raw = Math.floor((res.damageDealt * lifestealPct) / 100);
      healed = Math.max(0, Math.min(raw, missing));
      actor.hp = Number(actor.hp || 0) + healed;
    }

    const seedGain = Number(ability.seed_gain || 0);
    if (seedGain > 0) {
      actor.seed = Number(actor.seed || 0) + seedGain;
    }

    const event = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: res.damageDealt,
      hpBefore,
      targetPositionAtAttack,
      positional: res.positional || null,
    });
    event.action_type = 'ability';
    event.ability_id = ability.ability_id;
    event.effect_type = 'drain_attack';
    event.ap_spent = Number(ability.cost_ap || 0);
    event.healing_applied = healed;
    event.seed_gain = seedGain;
    if (res.parry) event.parry = res.parry;
    await appendEvent(session, event);

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
        effect_type: 'drain_attack',
        attack: {
          target_id: target.id,
          die: res.result.die,
          roll: res.result.roll,
          mos: res.result.mos,
          hit: res.result.hit,
          damage_dealt: res.damageDealt,
          target_hp: target.hp,
        },
        healing_applied: healed,
        actor_hp: actor.hp,
        seed_gain: seedGain,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // execution_attack (kill_shot): attack con damage_step_mod. Se target HP%
  // < execute_threshold_hp_pct, damage * execute_damage_multiplier.
  async function executeExecutionAttack({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    const range = Number(actor.attack_range) || 2;
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: `target fuori range (${range})` } };
    }

    const hpBefore = target.hp;
    const maxHp = Number(target.max_hp || hpBefore || 1);
    const hpPct = hpBefore / maxHp;
    const threshold = Number(ability.execute_threshold_hp_pct || 0);
    const multiplier = Number(ability.execute_damage_multiplier || 1);
    const executionTriggered = threshold > 0 && hpPct < threshold;

    const targetPositionAtAttack = { ...target.position };
    // M7-#3: pass ability channel for resistance routing (default null → fisico fallback)
    const res = performAttack(session, actor, target, {
      channel: ability && ability.channel ? ability.channel : null,
    });

    let adjustedDamage = res.damageDealt;
    const damageStepMod = Number(ability.damage_step_mod || 0);
    if (res.result.hit && res.damageDealt > 0) {
      let delta = damageStepMod;
      if (executionTriggered && multiplier > 1) {
        // Applica multiplier sul damage post-mod.
        const postMod = res.damageDealt + delta;
        const multiplied = Math.max(0, postMod * multiplier);
        const finalDamage = Math.max(0, multiplied);
        const diff = finalDamage - res.damageDealt;
        if (diff > 0) {
          const extra = Math.min(diff, target.hp);
          target.hp = Math.max(0, target.hp - extra);
          session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
          adjustedDamage = res.damageDealt + extra;
        } else if (diff < 0) {
          const refund = Math.min(-diff, res.damageDealt);
          target.hp = Math.min(maxHp, target.hp + refund);
          session.damage_taken[target.id] = Math.max(
            0,
            (session.damage_taken[target.id] || 0) - refund,
          );
          adjustedDamage = Math.max(0, res.damageDealt - refund);
        }
      } else if (delta !== 0) {
        if (delta < 0) {
          const refund = Math.min(-delta, res.damageDealt);
          target.hp = Math.min(maxHp, target.hp + refund);
          session.damage_taken[target.id] = Math.max(
            0,
            (session.damage_taken[target.id] || 0) - refund,
          );
          adjustedDamage = Math.max(0, res.damageDealt - refund);
        } else {
          const extra = Math.min(delta, target.hp);
          target.hp = Math.max(0, target.hp - extra);
          session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
          adjustedDamage = res.damageDealt + extra;
        }
      }
    }
    applySgEarn(actor, target, adjustedDamage);

    const event = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: adjustedDamage,
      hpBefore,
      targetPositionAtAttack,
      positional: res.positional || null,
    });
    event.action_type = 'ability';
    event.ability_id = ability.ability_id;
    event.effect_type = 'execution_attack';
    event.ap_spent = Number(ability.cost_ap || 0);
    event.damage_step_mod = damageStepMod;
    event.execution_triggered = executionTriggered;
    event.target_hp_pct_before = Math.round(hpPct * 100) / 100;
    if (res.parry) event.parry = res.parry;
    await appendEvent(session, event);

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
        effect_type: 'execution_attack',
        attack: {
          target_id: target.id,
          die: res.result.die,
          roll: res.result.roll,
          mos: res.result.mos,
          hit: res.result.hit,
          damage_dealt: adjustedDamage,
          target_hp: target.hp,
        },
        execution_triggered: executionTriggered,
        target_hp_pct_before: Math.round(hpPct * 100) / 100,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // shield (energy_barrier): assorbi prossimi N HP danno per duration turni.
  // target.shield_hp consumato in performAttack pre-damage. Decay via
  // status.shield_buff in sessionRoundBridge.
  async function executeShield({ session, actor, ability, body }) {
    const targetId = String(body.target_id || actor.id);
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    if (target.controlled_by !== actor.controlled_by) {
      return { status: 400, body: { error: 'shield richiede target alleato (o self)' } };
    }
    const shieldHp = Number(ability.shield_hp || 0);
    const duration = Number(ability.shield_duration || 1);
    if (shieldHp <= 0) {
      return { status: 400, body: { error: 'shield_hp richiesto in ability spec' } };
    }
    target.shield_hp = (Number(target.shield_hp) || 0) + shieldHp;
    if (!target.status) target.status = {};
    target.status.shield_buff = Math.max(Number(target.status.shield_buff) || 0, duration);

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
      effect_type: 'shield',
      target_id: target.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      shield_hp_granted: shieldHp,
      shield_hp_total: target.shield_hp,
      shield_duration: duration,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'shield',
        target_id: target.id,
        shield_hp_granted: shieldHp,
        shield_hp_total: target.shield_hp,
        shield_duration: duration,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // team_buff: applica buff a tutti gli alleati in range Manhattan da actor.
  // Variante pp_grant (resonance_amplifier): aggiunge PP istantanei.
  async function executeTeamBuff({ session, actor, ability }) {
    const range = Number(ability.range || 2);
    const allies = session.units.filter(
      (u) =>
        u &&
        u.hp > 0 &&
        u.controlled_by === actor.controlled_by &&
        manhattanDistance(actor.position, u.position) <= range,
    );

    const buffStat = ability.buff_stat;
    const amount = Number(ability.buff_amount || 0);
    const duration = Number(ability.buff_duration || 1);
    const ppGrant = Number(ability.pp_grant || 0);

    const applied = [];
    for (const ally of allies) {
      const entry = { unit_id: ally.id };
      if (buffStat) {
        applySelfBuff(ally, buffStat, amount, duration);
        entry.buff = { stat: buffStat, amount, duration };
      }
      if (ppGrant > 0) {
        ally.pp = (Number(ally.pp) || 0) + ppGrant;
        entry.pp_grant = ppGrant;
      }
      applied.push(entry);
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
      effect_type: 'team_buff',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      range,
      allies_affected: applied,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'team_buff',
        allies_affected: applied,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // team_heal: heal_dice per ogni alleato in range (incluso self).
  async function executeTeamHeal({ session, actor, ability }) {
    const range = Number(ability.range || 2);
    const allies = session.units.filter(
      (u) =>
        u &&
        u.hp > 0 &&
        u.controlled_by === actor.controlled_by &&
        manhattanDistance(actor.position, u.position) <= range,
    );
    const seedGain = Number(ability.seed_gain || 0);

    const healed = [];
    for (const ally of allies) {
      const rolled = rollDice(ability.heal_dice, rng);
      const maxHp = Number(ally.max_hp || ally.hp || 0);
      const missing = Math.max(0, maxHp - Number(ally.hp || 0));
      const heal = Math.max(0, Math.min(rolled, missing));
      const hpBefore = ally.hp;
      ally.hp = hpBefore + heal;
      if (seedGain > 0) ally.seed = (Number(ally.seed) || 0) + seedGain;
      healed.push({
        unit_id: ally.id,
        rolled,
        healing_applied: heal,
        hp_before: hpBefore,
        hp_after: ally.hp,
        seed_gain: seedGain,
      });
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
      effect_type: 'team_heal',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      range,
      healed,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'team_heal',
        healed,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // aoe_buff (sanctuary): area NxN centrata su body.position. Buff alleati.
  async function executeAoeBuff({ session, actor, ability, body }) {
    const center = body.position;
    if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') {
      return { status: 400, body: { error: 'position { x, y } richiesta per aoe_buff' } };
    }
    if (!isWithinGrid(center, session.grid?.width || gridSize)) {
      return { status: 400, body: { error: 'centro AoE fuori griglia' } };
    }
    const range = Number(ability.range || 0);
    if (range > 0 && manhattanDistance(actor.position, center) > range) {
      return { status: 400, body: { error: `centro AoE fuori range (${range})` } };
    }
    const size = Number(ability.aoe_size || 2);
    const inArea = unitsInArea(session.units, center, size);
    const allies = inArea.filter((u) => u.controlled_by === actor.controlled_by);

    const buffStat = ability.buff_stat;
    const amount = Number(ability.buff_amount || 0);
    const duration = Number(ability.buff_duration || 1);
    const stressReduction = Number(ability.stress_reduction || 0);

    const applied = [];
    for (const ally of allies) {
      const entry = { unit_id: ally.id };
      if (buffStat) {
        applySelfBuff(ally, buffStat, amount, duration);
        entry.buff = { stat: buffStat, amount, duration };
      }
      if (stressReduction > 0) {
        ally.stress = Math.max(0, Number(ally.stress || 0) - stressReduction);
        entry.stress_reduction = stressReduction;
      }
      applied.push(entry);
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
      effect_type: 'aoe_buff',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      center,
      aoe_size: size,
      allies_affected: applied,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'aoe_buff',
        center,
        aoe_size: size,
        allies_affected: applied,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // aoe_debuff (binding_field): area NxN. Debuff nemici.
  async function executeAoeDebuff({ session, actor, ability, body }) {
    const center = body.position;
    if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') {
      return { status: 400, body: { error: 'position { x, y } richiesta per aoe_debuff' } };
    }
    if (!isWithinGrid(center, session.grid?.width || gridSize)) {
      return { status: 400, body: { error: 'centro AoE fuori griglia' } };
    }
    const range = Number(ability.range || 0);
    if (range > 0 && manhattanDistance(actor.position, center) > range) {
      return { status: 400, body: { error: `centro AoE fuori range (${range})` } };
    }
    const size = Number(ability.aoe_size || 3);
    const inArea = unitsInArea(session.units, center, size);
    const enemies = inArea.filter((u) => u.controlled_by !== actor.controlled_by);

    const debuffStat = ability.debuff_stat;
    const amount = Number(ability.debuff_amount || 0);
    const duration = Number(ability.debuff_duration || 1);

    const applied = [];
    for (const enemy of enemies) {
      if (!debuffStat) break;
      const statusKey = `${debuffStat}_debuff`;
      if (!enemy.status) enemy.status = {};
      enemy.status[statusKey] = Math.max(Number(enemy.status[statusKey]) || 0, duration);
      enemy[`${debuffStat}_bonus`] = (enemy[`${debuffStat}_bonus`] || 0) + amount;
      applied.push({
        unit_id: enemy.id,
        debuff: { stat: debuffStat, amount, duration },
      });
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
      effect_type: 'aoe_debuff',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      center,
      aoe_size: size,
      enemies_affected: applied,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'aoe_debuff',
        center,
        aoe_size: size,
        enemies_affected: applied,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // surge_aoe (cataclysm): area NxN, danno dadi a tutti i nemici dentro.
  // stress_reset opzionale (Surge Burst meccanica). PP/SG gating skippato.
  async function executeSurgeAoe({ session, actor, ability, body }) {
    const center = body.position;
    if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') {
      return { status: 400, body: { error: 'position { x, y } richiesta per surge_aoe' } };
    }
    if (!isWithinGrid(center, session.grid?.width || gridSize)) {
      return { status: 400, body: { error: 'centro AoE fuori griglia' } };
    }
    const range = Number(ability.range || 0);
    if (range > 0 && manhattanDistance(actor.position, center) > range) {
      return { status: 400, body: { error: `centro AoE fuori range (${range})` } };
    }
    const size = Number(ability.aoe_size || 2);
    const inArea = unitsInArea(session.units, center, size);
    const targets = inArea.filter((u) => u.controlled_by !== actor.controlled_by);

    const damaged = [];
    // M14-C 2026-04-26 — wire elevation multiplier su surge_aoe dice roll.
    // Unico site in abilityExecutor che bypassa performAttack (L249 session.js)
    // perche' rolla dadi diretti senza hit check. Per-target perche' ogni
    // target AoE ha elevation/facing proprio rispetto all'actor.
    const { computePositionalDamage } = require('../routes/sessionHelpers');
    for (const target of targets) {
      const rolled = rollDice(ability.damage_dice, rng);
      const positional = computePositionalDamage({
        actor,
        target,
        baseDamage: Math.max(0, rolled),
      });
      let damage = positional.damage;
      // Shield assorb su area damage anche
      let absorbed = 0;
      if (Number(target.shield_hp) > 0 && damage > 0) {
        absorbed = Math.min(Number(target.shield_hp), damage);
        target.shield_hp = Math.max(0, Number(target.shield_hp) - absorbed);
        damage = Math.max(0, damage - absorbed);
      }
      const hpBefore = target.hp;
      target.hp = Math.max(0, target.hp - damage);
      session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + damage;
      applySgEarn(actor, target, damage);
      damaged.push({
        unit_id: target.id,
        rolled,
        damage_dealt: damage,
        shield_absorbed: absorbed,
        hp_before: hpBefore,
        hp_after: target.hp,
        killed: target.hp === 0,
        positional_mult: positional.multiplier,
        elevation_delta: positional.elevation_delta,
      });
    }

    if (Number(ability.stress_reset) > 0) {
      actor.stress = Number(ability.stress_reset);
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
      effect_type: 'surge_aoe',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      center,
      aoe_size: size,
      damaged,
      stress_after: actor.stress,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'surge_aoe',
        center,
        aoe_size: size,
        damaged,
        stress_after: actor.stress,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // reaction (intercept, overwatch_shot): registra trigger su actor.reactions[].
  // iter4: consumo automatico in reactionEngine.triggerOnDamage/Move.
  // iter6 follow-up #4: cap max 1 reaction armata per actor — re-arm sostituisce
  // la precedente (ritorno include `replaced_previous` se applicabile). Evita
  // stacking di overwatch/intercept multipli senza cooldown.
  async function executeReaction({ session, actor, ability }) {
    if (!Array.isArray(actor.reactions)) actor.reactions = [];
    const reaction = {
      ability_id: ability.ability_id,
      trigger: ability.trigger || null,
      damage_step_mod: Number(ability.damage_step_mod || 0),
      target: ability.target || 'self',
      armed_turn: session.turn,
    };
    let replacedPrevious = null;
    if (actor.reactions.length >= 1) {
      replacedPrevious = actor.reactions[0];
      actor.reactions = [reaction]; // replace (cap 1)
    } else {
      actor.reactions.push(reaction);
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
      effect_type: 'reaction',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      reaction_armed: reaction,
      replaced_previous: replacedPrevious,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'reaction',
        reaction_armed: reaction,
        replaced_previous: replacedPrevious,
        reactions_count: actor.reactions.length,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // aggro_pull (taunt): forza target a attaccare actor per N turni.
  // Self-buff defense_mod (per spec). Target.status.aggro_locked = duration
  // + target.aggro_source = actor.id. declareSistemaIntents rispetta override
  // se target è SIS. Su PG (target=player) il flag è informativo (no AI).
  async function executeAggroPull({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    if (target.controlled_by === actor.controlled_by) {
      return { status: 400, body: { error: 'aggro_pull richiede target nemico' } };
    }
    // Target deve essere adiacente (taunt mischia per design)
    const range = Number(ability.range || 1);
    if (manhattanDistance(actor.position, target.position) > range) {
      return {
        status: 400,
        body: {
          error: `target fuori range (${range}, dist=${manhattanDistance(actor.position, target.position)})`,
        },
      };
    }

    // Self-buff defense (es. taunt: defense_mod +2 1 turno)
    let buffApplied = null;
    if (ability.buff_stat) {
      const amt = Number(ability.buff_amount || 0);
      const dur = Number(ability.buff_duration || 1);
      applySelfBuff(actor, ability.buff_stat, amt, dur);
      buffApplied = { stat: ability.buff_stat, amount: amt, duration: dur };
    }

    // Aggro lock su target
    const aggroDuration = Number(ability.aggro_duration || ability.buff_duration || 1);
    if (!target.status) target.status = {};
    target.status.aggro_locked = Math.max(Number(target.status.aggro_locked) || 0, aggroDuration);
    target.aggro_source = actor.id;

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
      effect_type: 'aggro_pull',
      target_id: target.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      aggro_duration: aggroDuration,
      buff_applied: buffApplied,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'aggro_pull',
        target_id: target.id,
        aggro_duration: aggroDuration,
        aggro_source: actor.id,
        buff_applied: buffApplied,
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
      case 'multi_attack':
        return executeMultiAttack({ session, actor, ability, body });
      case 'attack_push':
        return executeAttackPush({ session, actor, ability, body });
      case 'debuff':
        return executeDebuff({ session, actor, ability, body });
      case 'ranged_attack':
        return executeRangedAttack({ session, actor, ability, body });
      case 'drain_attack':
        return executeDrainAttack({ session, actor, ability, body });
      case 'execution_attack':
        return executeExecutionAttack({ session, actor, ability, body });
      case 'shield':
        return executeShield({ session, actor, ability, body });
      case 'team_buff':
        return executeTeamBuff({ session, actor, ability });
      case 'team_heal':
        return executeTeamHeal({ session, actor, ability });
      case 'aoe_buff':
        return executeAoeBuff({ session, actor, ability, body });
      case 'aoe_debuff':
        return executeAoeDebuff({ session, actor, ability, body });
      case 'surge_aoe':
        return executeSurgeAoe({ session, actor, ability, body });
      case 'reaction':
        return executeReaction({ session, actor, ability });
      case 'aggro_pull':
        return executeAggroPull({ session, actor, ability, body });
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

// Test helper: override l'index per test deterministici. Reset con
// resetAbilityIndex() per ricaricare da jobs.yaml.
function _setAbilityForTest(abilityId, spec) {
  const idx = ensureAbilityIndex();
  idx.set(String(abilityId), spec);
}
function _resetAbilityIndex() {
  abilityIndex = null;
}

module.exports = {
  createAbilityExecutor,
  findAbility,
  ensureAbilityIndex,
  SUPPORTED_EFFECT_TYPES,
  _setAbilityForTest,
  _resetAbilityIndex,
};
