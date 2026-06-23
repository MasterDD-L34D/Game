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
const { defaultRng } = require('./combat/pseudoRng');
const { isAbilityInhibited } = require('./combat/abilitySuppression');

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
  'suppress_ability',
  'apply_status',
  'cleanse_status',
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
    rng = defaultRng,
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

  // TKT-JOB-PHASEC slice A1b (Cat F, OQ-F verdict V1) — apply one phenotype_shift
  // 1d6 outcome (Option A). Buff outcomes (1/2/3/6) use applySelfBuff; ap (4) is an
  // immediate uncapped +1 (offsets the 1 ap cost = net free cast); heal (5) caps at
  // max_hp. Returns the outcome descriptor for the event/response.
  function applyPhenotypeOutcome(actor, roll, dur) {
    switch (roll) {
      case 1:
        applySelfBuff(actor, 'attack_mod', 3, dur);
        return { roll, stat: 'attack_mod', amount: 3, duration: dur };
      case 2:
        // defense_mod_bonus is the key resolveAttack/statusModifiers add to dc.
        applySelfBuff(actor, 'defense_mod', 3, dur);
        return { roll, stat: 'defense_mod', amount: 3, duration: dur };
      case 3:
        // move_bonus_bonus is the key validatePlayerIntent reads for move budget.
        applySelfBuff(actor, 'move_bonus', 2, dur);
        return { roll, stat: 'move_bonus', amount: 2, duration: dur };
      case 4: {
        const before = Number(actor.ap_remaining ?? actor.ap ?? 0);
        actor.ap_remaining = before + 1;
        return { roll, stat: 'ap', amount: 1 };
      }
      case 5: {
        const maxHp = Number(actor.max_hp || actor.hp || 0);
        const before = Number(actor.hp || 0);
        actor.hp = maxHp > 0 ? Math.min(maxHp, before + 4) : before + 4;
        return { roll, stat: 'heal', amount: actor.hp - before };
      }
      case 6:
        // initiative is read directly by roundOrchestrator.computeResolvePriority
        // (unit.initiative); there is no consumed initiative_bonus buff field, so
        // bump the base stat (mirrors progressionApply initiative bonuses).
        actor.initiative = Number(actor.initiative || 0) + 5;
        return { roll, stat: 'initiative', amount: 5 };
      default:
        return { roll, stat: 'none', amount: 0 };
    }
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

  // TKT-JOB-PHASEC slice B5 SPIKE POC (OQ-MINION verdict V4) — summon_companion
  // spawns a real minion unit (controlled_by 'player' + owner_id = caster +
  // is_minion), NOT a self hp_max buff. HP from buff_amount (5), atk +1, mob 3,
  // spawned on an adjacent free in-grid tile (else 400), capped at MAX_MINIONS (2;
  // max_minions perk raises it in a follow-up). Minions are expendable: excluded
  // from the party-wipe lose-condition + the round-advance intent gate. AI /
  // pack_command / the 8 minion tags are follow-up slices.
  const MAX_MINIONS = 2;
  async function executeSummonCompanion({ session, actor, ability }) {
    // Owner perk mods (B5): cap (max_minions) + minion stat buffs (minion_attack_buff,
    // alpha_pack_buff, encounter_start_buff_minions). Default cap MAX_MINIONS (2).
    let perkMods = { cap: MAX_MINIONS, attackMod: 0, defenseMod: 0, startBuff: null };
    try {
      perkMods = require('./progression/progressionApply').computeMinionPerkMods(actor);
    } catch {
      /* progression optional */
    }
    const cap = Number(perkMods.cap) || MAX_MINIONS;
    // Cap counts only LIVE minions (Codex #2544 P2): dead minion records linger in
    // session.units and must not permanently block re-summoning.
    const existing = (session.units || []).filter(
      (u) => u && u.is_minion && u.owner_id === actor.id && (u.hp ?? 0) > 0,
    );
    if (existing.length >= cap) {
      return {
        status: 400,
        body: { error: `cap minion raggiunto (${cap})`, max_minions: cap },
      };
    }
    const pos = actor.position || { x: 0, y: 0 };
    const grid = session.grid || null;
    // Only LIVE units block a spawn tile (Codex #2544 P2): corpses don't occupy
    // cells, matching the codebase's live-unit movement/occupancy semantics.
    const occupied = new Set(
      (session.units || [])
        .filter((u) => u && u.position && (u.hp ?? 0) > 0)
        .map((u) => `${u.position.x},${u.position.y}`),
    );
    const candidates = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ];
    const free = candidates.find((c) => {
      if (c.x < 0 || c.y < 0) return false;
      if (grid && (c.x >= Number(grid.width) || c.y >= Number(grid.height ?? grid.width)))
        return false;
      return !occupied.has(`${c.x},${c.y}`);
    });
    if (!free) {
      return { status: 400, body: { error: 'nessuna tile adiacente libera per il minion' } };
    }
    const hp = Number(ability.buff_amount || 5);
    const minion = {
      id: `${actor.id}_minion_${existing.length + 1}_t${Number(session.turn) || 0}`,
      controlled_by: 'player',
      owner_id: actor.id,
      is_minion: true,
      hp,
      max_hp: hp,
      // Combat-consumed fields (Codex #2545 P2): resolveAttack reads attacker `mod`
      // (+ attack_mod_bonus) and target `dc` (+ defense_mod_bonus) — NOT attack_mod/
      // defense_mod. Minion base = mod 1 (spec "attack_mod +1", a weak attacker) /
      // dc 10 (weak defense, < the DEFAULT_DC 13 of a normal unit). Perks add here.
      mod: 1 + Number(perkMods.attackMod || 0),
      dc: 10 + Number(perkMods.defenseMod || 0),
      mobility: 3,
      position: { x: free.x, y: free.y },
      species: 'minion',
      job: null,
      status: {},
      ap: 2,
      ap_remaining: 2,
    };
    // encounter_start_buff_minions: a temporary +atk buff on the freshly-summoned
    // minion (the meaningful application — minions are summoned mid-combat, not at a
    // literal encounter start). Standard {stat}_bonus + {stat}_buff duration form.
    if (perkMods.startBuff && Number(perkMods.startBuff.attack_mod) > 0) {
      minion.attack_mod_bonus = Number(perkMods.startBuff.attack_mod);
      minion.status.attack_mod_buff = Number(perkMods.startBuff.duration) || 1;
    }
    session.units.push(minion);
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
      effect_type: 'summon',
      target_id: minion.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      minion: { id: minion.id, position: minion.position, hp: minion.hp },
      minions_active: existing.length + 1,
      trait_effects: [],
    };
    await appendEvent(session, event);
    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'summon',
        minion_id: minion.id,
        minion_position: minion.position,
        minions_active: existing.length + 1,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // TKT-JOB-PHASEC slice B5 pack_command runtime (OQ-MINION V4) — the beastmaster
  // spends its own AP to issue ONE order (move | attack) to one of its minions, in
  // the BM's turn. The minion attacks via performAttack (the minion is the attacker).
  // Command range = 1 (adjacent) by default, raised to `range` by
  // pack_command_extended_range. (minion_proximity_dmg is held — its data spec
  // "minion adj BM AND target adj BM" is geometrically unsatisfiable for a melee
  // minion under Manhattan adjacency; pending a master-dd interpretation, L-069.)
  async function executePackCommand({ session, actor, ability, body }) {
    const minionId = String(body.minion_id || '');
    const minion = (session.units || []).find((u) => u && u.id === minionId);
    if (!minion || !minion.is_minion || minion.owner_id !== actor.id) {
      return { status: 400, body: { error: `pack_command: "${minionId}" non e' un tuo minion` } };
    }
    if ((minion.hp ?? 0) <= 0) {
      return { status: 400, body: { error: 'pack_command: minion morto' } };
    }
    const rangePerk = Array.isArray(actor._perk_passives)
      ? actor._perk_passives.find((p) => p && p.tag === 'pack_command_extended_range')
      : null;
    const cmdRange = rangePerk ? Number(rangePerk.payload && rangePerk.payload.range) || 5 : 1;
    if (manhattanDistance(actor.position, minion.position) > cmdRange) {
      return {
        status: 400,
        body: { error: `pack_command: minion fuori range comando (${cmdRange})` },
      };
    }
    const order = body.order || {};
    const apCost = Number(ability.cost_ap || 0);

    if (order.type === 'move') {
      const dest = order.position;
      if (!dest || !Number.isFinite(Number(dest.x)) || !Number.isFinite(Number(dest.y))) {
        return { status: 400, body: { error: 'pack_command: order.position richiesto per move' } };
      }
      // Move terrain-cost substrate (flag MOVE_TERRAIN_COST_ENABLED, OFF = band-neutral):
      // ON -> the mobility budget is checked against the terrain-weighted cheapest-path
      // cost (volo lowers it); OFF -> literal Manhattan. Registry unavailable here ->
      // evaluateVoloGrade(null, ...) yields grade 1 for a volo carrier (phase-2 follow-up).
      const mobilityBudget = Number(minion.mobility) || 1;
      let minionMoveDist = manhattanDistance(minion.position, dest);
      if (require('./combat/moveCost').isMoveTerrainCostEnabled()) {
        const { moveApDistance, terrainAtFromFeatures } = require('./combat/moveCost');
        const {
          resolveMovementProfile,
          applyVoloGrade,
          evaluateVoloGrade,
        } = require('./combat/movementResolver');
        const profile = applyVoloGrade(
          resolveMovementProfile(minion, null),
          evaluateVoloGrade(null, minion),
        );
        const g = session.grid || {};
        const terrainAt = terrainAtFromFeatures(g.terrain_features || []);
        const bounds = {
          width: Number(g.width) || 6,
          height: Number(g.height ?? g.width) || 6,
        };
        const c = moveApDistance(minion.position, dest, { profile, terrainAt, bounds });
        if (Number.isFinite(c)) minionMoveDist = c;
      }
      if (minionMoveDist > mobilityBudget) {
        return {
          status: 400,
          body: { error: `pack_command: move oltre mobility (${minion.mobility})` },
        };
      }
      const grid = session.grid || null;
      if (
        dest.x < 0 ||
        dest.y < 0 ||
        (grid && (dest.x >= Number(grid.width) || dest.y >= Number(grid.height ?? grid.width)))
      ) {
        return { status: 400, body: { error: 'pack_command: destinazione fuori griglia' } };
      }
      const occupied = (session.units || []).some(
        (u) =>
          u &&
          u.id !== minion.id &&
          (u.hp ?? 0) > 0 &&
          u.position &&
          u.position.x === Number(dest.x) &&
          u.position.y === Number(dest.y),
      );
      if (occupied) return { status: 400, body: { error: 'pack_command: cella occupata' } };
      minion.position = { x: Number(dest.x), y: Number(dest.y) };
      actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - apCost);
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        actor_id: actor.id,
        action_type: 'ability',
        ability_id: ability.ability_id,
        effect_type: 'pack_command',
        target_id: minion.id,
        turn: session.turn,
        ap_spent: apCost,
        order: 'move',
        minion_position: minion.position,
        trait_effects: [],
      });
      return {
        status: 200,
        body: {
          ok: true,
          ability_id: ability.ability_id,
          effect_type: 'pack_command',
          order: 'move',
          minion_id: minion.id,
          minion_position: minion.position,
          ap_remaining: actor.ap_remaining,
        },
      };
    }

    if (order.type === 'attack') {
      const target = (session.units || []).find((u) => u && u.id === String(order.target_id || ''));
      if (!target || (target.hp ?? 0) <= 0) {
        return { status: 400, body: { error: 'pack_command: target non valido' } };
      }
      if (target.controlled_by === minion.controlled_by) {
        return { status: 400, body: { error: 'pack_command: no friendly fire' } };
      }
      if (manhattanDistance(minion.position, target.position) > 1) {
        return {
          status: 400,
          body: { error: 'pack_command: target fuori range del minion (melee 1)' },
        };
      }
      const res = performAttack(session, minion, target, { channel: null });
      // minion_proximity_dmg (bm_r2_pack_focus): +N when the struck target is
      // adjacent to the BM (the commanded bodyguard punishes threats on the master).
      // L-069: the data's additional "minion adjacent to the BM" clause is
      // geometrically unsatisfiable for a melee minion under Manhattan adjacency
      // (a default-commandable minion is itself adjacent to the BM, dist 2 from any
      // other BM-neighbour), so it is dropped pending a master-dd geometry ruling.
      let proximityBonus = 0;
      const proxPerk = Array.isArray(actor._perk_passives)
        ? actor._perk_passives.find((p) => p && p.tag === 'minion_proximity_dmg')
        : null;
      if (
        proxPerk &&
        res.result &&
        res.result.hit &&
        Number(res.damageDealt) > 0 &&
        manhattanDistance(target.position, actor.position) <= 1
      ) {
        const want = Number(proxPerk.payload && proxPerk.payload.damage) || 0;
        const extra = Math.min(want, Number(target.hp) || 0);
        if (extra > 0) {
          target.hp = Math.max(0, Number(target.hp) - extra);
          if (session.damage_taken) {
            session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
          }
          proximityBonus = extra;
        }
      }
      applySgEarn(minion, target, res.damageDealt + proximityBonus);
      // minion_kill_pe_bonus (bm_r5_apex_companion, V6 A3): when a minion kills, the
      // BM earns +pe CAMPAIGN XP, capped 1/round. Accumulated on actor._minion_kill_pe;
      // granted later by grantXpToSurvivors (PE = campaign XP per 26-ECONOMY).
      if (Number(target.hp) <= 0) {
        const mkPerk = Array.isArray(actor._perk_passives)
          ? actor._perk_passives.find((p) => p && p.tag === 'minion_kill_pe_bonus')
          : null;
        if (mkPerk && actor._minion_kill_pe_round !== session.turn) {
          actor._minion_kill_pe =
            (Number(actor._minion_kill_pe) || 0) +
            (Number(mkPerk.payload && mkPerk.payload.pe) || 0);
          actor._minion_kill_pe_round = session.turn; // cap 1/round
        }
      }
      actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - apCost);
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        actor_id: actor.id,
        action_type: 'ability',
        ability_id: ability.ability_id,
        effect_type: 'pack_command',
        target_id: target.id,
        turn: session.turn,
        ap_spent: apCost,
        order: 'attack',
        minion_id: minion.id,
        damage_dealt: res.damageDealt + proximityBonus,
        proximity_bonus: proximityBonus,
        trait_effects: [],
      });
      return {
        status: 200,
        body: {
          ok: true,
          ability_id: ability.ability_id,
          effect_type: 'pack_command',
          order: 'attack',
          minion_id: minion.id,
          target_id: target.id,
          damage_dealt: res.damageDealt + proximityBonus,
          proximity_bonus: proximityBonus,
          hit: !!(res.result && res.result.hit),
          ap_remaining: actor.ap_remaining,
        },
      };
    }

    return {
      status: 400,
      body: { error: 'pack_command: order.type deve essere "move" o "attack"' },
    };
  }

  async function executeBuff({ session, actor, ability }) {
    // TKT-JOB-PHASEC slice A1b (Cat F 7/7, OQ-F verdict V1) — phenotype_shift is a
    // 1d6 random table + per-round use-cap + double-roll perk, not a fixed buff.
    if (ability.ability_id === 'phenotype_shift') {
      return executePhenotypeShift({ session, actor, ability });
    }
    // TKT-JOB-PHASEC slice B5 — summon_companion spawns a minion, not a self-buff.
    if (ability.ability_id === 'summon_companion') {
      return executeSummonCompanion({ session, actor, ability });
    }
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

  // TKT-JOB-PHASEC slice A1b (Cat F 7/7, OQ-F verdict V1). phenotype_shift rolls a
  // 1d6 table (applyPhenotypeOutcome). double_phenotype_roll perk rolls twice (both
  // apply); a base 1/round use-cap (phenotype_double_use capstone -> 2/round) gates
  // re-casts. Perk mods come from progressionApply.computePhenotypeShiftPerkMods
  // (lazy require, non-blocking). The cap check returns 400 BEFORE spending AP, so a
  // blocked re-cast costs nothing and does not fire the post-2xx use-hook.
  async function executePhenotypeShift({ session, actor, ability }) {
    const round = session.turn;
    let perkMods;
    try {
      perkMods = require('./progression/progressionApply').computePhenotypeShiftPerkMods(actor);
    } catch {
      perkMods = { extraRolls: 0, usesCap: 1, applied: [] };
    }

    if (actor._phenotype_use_round !== round) {
      actor._phenotype_use_round = round;
      actor._phenotype_use_count = 0;
    }
    if ((actor._phenotype_use_count || 0) >= perkMods.usesCap) {
      return {
        status: 400,
        body: {
          error: 'phenotype_shift: cap usi/round raggiunto',
          cap_per_round: perkMods.usesCap,
        },
      };
    }
    actor._phenotype_use_count = (actor._phenotype_use_count || 0) + 1;

    const dur = Number(ability.buff_duration || 2);
    const rolls = 1 + Number(perkMods.extraRolls || 0);
    const outcomes = [];
    for (let i = 0; i < rolls; i += 1) {
      const roll = Math.floor(rng() * 6) + 1;
      outcomes.push(applyPhenotypeOutcome(actor, roll, dur));
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
      effect_type: 'buff',
      target_id: actor.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      phenotype_rolls: outcomes,
      perk_mods: perkMods.applied,
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
        phenotype_rolls: outcomes,
        perk_mods: perkMods.applied,
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

    // chain_heal_adjacent (SYMBIONT sy_r4, TKT-JOB-PHASEC B4b): shared_vitality
    // also heals allies adjacent to the heal target at `factor` of the applied
    // heal — but ONLY when the target is THIS symbiont's bonded partner (Codex
    // #2541 P2: the effect is scoped to the bond, primary or secondary, both of
    // which set target._bonded_by === actor.id). Symbiont-only via the perk.
    let chainHealed = null;
    if (ability.ability_id === 'shared_vitality' && healed > 0 && target._bonded_by === actor.id) {
      const perk = Array.isArray(actor._perk_passives)
        ? actor._perk_passives.find((p) => p && p.tag === 'chain_heal_adjacent')
        : null;
      if (perk) {
        const factor = Number(perk.payload && perk.payload.factor) || 0.5;
        const chainAmt = Math.floor(healed * factor);
        if (chainAmt > 0) {
          chainHealed = [];
          for (const u of session.units) {
            if (!u || u.id === target.id || u.id === actor.id) continue;
            if (u.controlled_by !== actor.controlled_by) continue;
            if (Number(u.hp) <= 0 || !u.position) continue;
            if (manhattanDistance(u.position, target.position) > 1) continue;
            const uMax = Number(u.max_hp || u.hp || 0);
            const uBefore = Number(u.hp || 0);
            const applied = Math.max(0, Math.min(chainAmt, Math.max(0, uMax - uBefore)));
            if (applied > 0) {
              u.hp = uBefore + applied;
              chainHealed.push({ unit_id: u.id, healed: applied });
            }
          }
        }
      }
    }

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
      chain_healed: chainHealed,
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
        chain_healed: chainHealed,
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

    // TKT-JOB-PHASEC slice 4b (Cat F) — mutation_burst combat semantics. Base:
    // MoS>=5 → 1 random status from the five {rage,panic,stunned,bleeding,fracture}
    // (faithful to jobs_expansion description). Perks layer on top via
    // computeMutationBurstPerkMods: perfect_mutation_burst forces all five
    // (ignoring MoS) + a flat bonus damage step; mutation_status_extend adds turns.
    // mutation_burst-only (ability semantics, NOT job-gated). Statuses decay via the
    // generic sessionRoundBridge status loop; bonus damage drains post-hoc (the
    // execution_attack pattern). Placed in performAttack's flow → traversed by the
    // /round/execute priority_queue path (not inert in band-verify).
    let mutationStatuses = [];
    let mutationBonusDamage = 0;
    if (ability.ability_id === 'mutation_burst' && res.result.hit && target.hp > 0) {
      let mods = { extraTurns: 0, forceAllStatuses: false, bonusDamage: 0 };
      try {
        const { computeMutationBurstPerkMods } = require('./progression/progressionApply');
        mods = computeMutationBurstPerkMods(actor);
      } catch {
        /* progression optional — non-blocking */
      }
      const MUTATION_STATUSES = ['rage', 'panic', 'stunned', 'bleeding', 'fracture'];
      let toApply = [];
      if (mods.forceAllStatuses) {
        toApply = MUTATION_STATUSES.slice();
      } else if (Number(res.result.mos) >= 5) {
        toApply = [MUTATION_STATUSES[Math.floor(rng() * MUTATION_STATUSES.length)]];
      }
      const statusTurns = 1 + Math.max(0, Number(mods.extraTurns) || 0);
      if (toApply.length > 0) {
        if (!target.status) target.status = {};
        for (const sid of toApply) {
          target.status[sid] = Math.max(Number(target.status[sid]) || 0, statusTurns);
          mutationStatuses.push({ id: sid, duration: statusTurns });
        }
      }
      const bonus = Math.max(0, Number(mods.bonusDamage) || 0);
      if (bonus > 0 && target.hp > 0) {
        const extra = Math.min(bonus, target.hp);
        target.hp = Math.max(0, target.hp - extra);
        session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
        applySgEarn(actor, target, extra);
        mutationBonusDamage = extra;
      }
    }

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

    // Total damage reported = the attack roll damage + any mutation bonus drained
    // post-hoc (perfect_mutation_burst). mutationBonusDamage is 0 for every other
    // case (Codex #2529 P2: don't undercount the reported damage_dealt).
    const totalDamageDealt = res.damageDealt + mutationBonusDamage;

    const event = buildAttackEvent({
      session,
      actor,
      target,
      result: res.result,
      evaluation: res.evaluation,
      damageDealt: totalDamageDealt,
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
    if (mutationStatuses.length > 0) event.mutation_statuses = mutationStatuses;
    if (mutationBonusDamage > 0) event.mutation_bonus_damage = mutationBonusDamage;
    if (res.parry) event.parry = res.parry;
    await appendEvent(session, event);

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    // TKT-JOB-PHASEC mutation_chain_on_kill (correct rebuild, Codex #2524): refund
    // the AP just spent when a mutation_burst scores the KO → free re-cast. AFTER
    // the spend (fixes P1) and scoped to mutation_burst's own kill (fixes P2).
    if (ability.ability_id === 'mutation_burst' && res.result.hit && target.hp <= 0) {
      try {
        const { applyMutationChainRefund } = require('./progression/progressionApply');
        applyMutationChainRefund(actor, Number(ability.cost_ap || 0));
      } catch {
        /* progression optional — non-blocking */
      }
    }

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
          damage_dealt: totalDamageDealt,
          target_hp: target.hp,
        },
        healing_applied: healed,
        actor_hp: actor.hp,
        seed_gain: seedGain,
        mutation_statuses: mutationStatuses,
        mutation_bonus_damage: mutationBonusDamage,
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
  // TKT-JOB-PHASEC slice B4a (OQ-BOND verdict V3) — symbiotic_bond pairs the
  // symbiont with an ally (sets actor._bond + partner._bonded_by). Re-castable
  // (moves the bond); with dual_bond a 2nd cast sets the secondary partner. The
  // cast-time adjacency gate is dropped by bond_no_distance_limit. The redirect
  // itself happens in performAttack via combat/symbiontBond.applyBondRedirect.
  async function executeSymbioticBond({ session, actor, ability, body }) {
    const targetId = String(body.target_id || '');
    const target = session.units.find((u) => u.id === targetId);
    if (!target || target.hp <= 0) {
      return { status: 400, body: { error: `target "${targetId}" non valido (morto o assente)` } };
    }
    if (target.id === actor.id) {
      return { status: 400, body: { error: 'symbiotic_bond non può legare se stesso' } };
    }
    if (target.controlled_by !== actor.controlled_by) {
      return { status: 400, body: { error: 'symbiotic_bond richiede target alleato' } };
    }
    const cfg = require('./combat/symbiontBond').computeBondConfig(actor);
    if (!cfg.no_distance_limit && manhattanDistance(actor.position, target.position) > 1) {
      return { status: 400, body: { error: 'symbiotic_bond richiede alleato adiacente' } };
    }
    if (!actor._bond) {
      actor._bond = {
        partner_id: null,
        redirect_pct: cfg.redirect_pct,
        secondary_partner_id: null,
        secondary_pct: 0,
      };
    }
    actor._bond.redirect_pct = cfg.redirect_pct;
    let slot = 'primary';
    if (cfg.dual && actor._bond.partner_id && actor._bond.partner_id !== target.id) {
      actor._bond.secondary_partner_id = target.id;
      actor._bond.secondary_pct = cfg.secondary_pct;
      slot = 'secondary';
    } else {
      const prev = actor._bond.partner_id;
      if (prev && prev !== target.id && prev !== actor._bond.secondary_partner_id) {
        const prevUnit = session.units.find((u) => u.id === prev);
        if (prevUnit && prevUnit._bonded_by === actor.id) delete prevUnit._bonded_by;
      }
      actor._bond.partner_id = target.id;
    }
    target._bonded_by = actor.id;

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    const redirectPct = slot === 'secondary' ? actor._bond.secondary_pct : actor._bond.redirect_pct;
    const event = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'ability',
      ability_id: ability.ability_id,
      effect_type: 'bond',
      target_id: target.id,
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      bond_slot: slot,
      redirect_pct: redirectPct,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'bond',
        bonded: { partner_id: target.id, slot, redirect_pct: redirectPct },
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  async function executeShield({ session, actor, ability, body }) {
    // TKT-JOB-PHASEC slice B4a — symbiotic_bond is a pairing, not a 0-hp shield.
    if (ability.ability_id === 'symbiotic_bond') {
      return executeSymbioticBond({ session, actor, ability, body });
    }
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
      // H2 cost-gate (Codex #2555 P2): a cost_pp support ultimate must NOT refill its
      // OWN caster via pp_grant (it just consume-all-spent the pool) -> grant only to
      // OTHER allies. Clamp to POOL_MAX so a grant never overfills the 0..3 pool.
      if (ppGrant > 0 && ally.id !== actor.id) {
        const ppMax = (() => {
          try {
            return Number(require('./combat/ppTracker').POOL_MAX) || 3;
          } catch {
            return 3;
          }
        })();
        ally.pp = Math.min(ppMax, (Number(ally.pp) || 0) + ppGrant);
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
    // TKT-JOB-PHASEC slice B5 — pack_command is a minion order (move|attack), not an
    // aoe_buff; divert to its runtime handler.
    if (ability.ability_id === 'pack_command') {
      return executePackCommand({ session, actor, ability, body });
    }
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

  // suppress_ability (matrice Mode A): area NxN. Applica `inibito` ai nemici nel
  // raggio -> non possono usare abilita' attive (combat/abilitySuppression). Abilita'
  // trait-granted (source: trait, trait_id matrice_antimagia, generata da
  // trait_mechanics.yaml). Mirror di executeAoeDebuff ma applica uno status di
  // controllo invece di un debuff statistico.
  async function executeSuppressAbility({ session, actor, ability, body }) {
    const center = body.position;
    if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') {
      return { status: 400, body: { error: 'position { x, y } richiesta per suppress_ability' } };
    }
    if (!isWithinGrid(center, session.grid?.width || gridSize)) {
      return { status: 400, body: { error: 'centro AoE fuori griglia' } };
    }
    const range = Number(ability.range || 0);
    if (range > 0 && manhattanDistance(actor.position, center) > range) {
      return { status: 400, body: { error: `centro AoE fuori range (${range})` } };
    }
    const size = Number(ability.aoe_size || 3);
    const statusId = String(ability.status_id || 'inibito');
    const duration = Number(ability.status_duration || 1);
    const inArea = unitsInArea(session.units, center, size);
    const enemies = inArea.filter((u) => u.controlled_by !== actor.controlled_by);

    const applied = [];
    for (const enemy of enemies) {
      if (!enemy.status) enemy.status = {};
      enemy.status[statusId] = Math.max(Number(enemy.status[statusId]) || 0, duration);
      applied.push({ unit_id: enemy.id, status: statusId, duration });
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
      effect_type: 'suppress_ability',
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
        effect_type: 'suppress_ability',
        center,
        aoe_size: size,
        status: statusId,
        enemies_affected: applied,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // apply_status (trait-granted, single-target): applica `status_id` per
  // `status_duration` turni al target (body.target_id). Un-dormanta le abilita'
  // trait-native apply_status generate da trait_mechanics.yaml (es. spore_burst ->
  // disorient, ali_membrana_sonica_burst -> panic). status_intensity opzionale.
  async function executeApplyStatus({ session, actor, ability, body }) {
    const targetId = body.target_id;
    const target = (session.units || []).find((u) => String(u.id) === String(targetId));
    if (!target) {
      return { status: 400, body: { error: 'target_id valido richiesto per apply_status' } };
    }
    // Respect the ability's `target` constraint (the trait apply_status abilities are
    // target: enemy debuffs). Reject a mismatched faction so a debuff can't hit an ally
    // or self (no charge on a 4xx -> AP not spent below).
    const wantTarget = String(ability.target || 'enemy');
    const sameFaction = target.controlled_by === actor.controlled_by;
    const isSelf = String(target.id) === String(actor.id);
    if (
      (wantTarget === 'enemy' && sameFaction) ||
      (wantTarget === 'self' && !isSelf) ||
      (wantTarget === 'ally' && (!sameFaction || isSelf))
    ) {
      return {
        status: 400,
        body: { error: `apply_status: target non valido per target='${wantTarget}'` },
      };
    }
    const statusId = String(ability.status_id || '');
    if (!statusId) {
      return { status: 400, body: { error: 'status_id mancante nella ability apply_status' } };
    }
    const duration = Number(ability.status_duration || 1);
    if (!target.status) target.status = {};
    target.status[statusId] = Math.max(Number(target.status[statusId]) || 0, duration);
    if (ability.status_intensity != null) {
      if (!target.status_intensity) target.status_intensity = {};
      target.status_intensity[statusId] = Number(ability.status_intensity);
    }

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );

    const event = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      action_type: 'ability',
      ability_id: ability.ability_id,
      effect_type: 'apply_status',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      target_id: targetId,
      status_id: statusId,
      status_duration: duration,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'apply_status',
        target_id: targetId,
        status: statusId,
        duration,
        ap_remaining: actor.ap_remaining,
      },
    };
  }

  // Creature-trait salvage (filtri_bioattivi ACTIVE): cleanse all transient negative
  // statuses on an adjacent ally. 1 AP + a 2-round in-memory cooldown (not a schema
  // field). Band-neutral: no sim unit carries filtri_bioattivi, so this is never offered.
  async function executeCleanseStatus({ session, actor, ability, body }) {
    const { cleanseNegativeStatuses } = require('./combat/cleanseStatus');
    const COOLDOWN_ROUNDS = 2;
    const turn = Number(session.turn) || 0;
    // Cooldown gate (per-actor, in-memory). On cooldown -> reject WITHOUT spending AP.
    if (Number(actor._filtri_cleanse_cd_until) > turn) {
      return {
        status: 409,
        body: {
          error: 'cleanse_status in cooldown',
          cooldown_until: actor._filtri_cleanse_cd_until,
        },
      };
    }
    const targetId = body.target_id;
    const target = (session.units || []).find((u) => String(u.id) === String(targetId));
    if (!target) {
      return { status: 400, body: { error: 'target_id valido richiesto per cleanse_status' } };
    }
    // target must be an adjacent ally (same faction, not self) -- no AP charge on a 4xx.
    const sameFaction = target.controlled_by === actor.controlled_by;
    const isSelf = String(target.id) === String(actor.id);
    if (!sameFaction || isSelf) {
      return { status: 400, body: { error: 'cleanse_status: il target deve essere un alleato' } };
    }
    const range = Number(ability.range || 1);
    if (manhattanDistance(actor.position, target.position) > range) {
      return { status: 400, body: { error: 'cleanse_status: alleato fuori portata' } };
    }

    const cleansed = cleanseNegativeStatuses(target);
    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - Number(ability.cost_ap || 0),
    );
    actor._filtri_cleanse_cd_until = turn + COOLDOWN_ROUNDS;

    const event = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      action_type: 'ability',
      ability_id: ability.ability_id,
      effect_type: 'cleanse_status',
      turn: session.turn,
      ap_spent: Number(ability.cost_ap || 0),
      target_id: targetId,
      cleansed,
      trait_effects: [],
    };
    await appendEvent(session, event);

    return {
      status: 200,
      body: {
        ok: true,
        actor_id: actor.id,
        ability_id: ability.ability_id,
        effect_type: 'cleanse_status',
        target_id: targetId,
        cleansed,
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
    // Creature-trait slice 1 (spec 2026-06-22-creature-trait-mechanics-design):
    // a unit carrying `inibito` cannot use ACTIVE abilities. Spec anchor =
    // "disables only the unit's ACTIVE abilities (action_type=ability)"; this is
    // the single action_type=ability dispatch entry, so gate it FIRST -> no spec
    // load / AP spend / handler.
    //   - Movement + basic attacks: separate resolvers, untouched.
    //   - Reflex reactions (parry / overwatch / counter FIRING) do NOT come here:
    //     they fire via reactionEngine.triggerOnMove -> performAttack (session.js),
    //     so an inibito unit's already-armed reflexes still trigger (spec: reflex
    //     reactions work). Spending an ability to REGISTER a new overwatch
    //     (effect_type:'reaction') IS an active ability (action_type=ability,
    //     cost_ap) and is intentionally blocked here.
    // Band-neutral: no sim unit applies inibito until a matrice_antimagia carrier
    // (golem) is canonized + flipped live.
    if (isAbilityInhibited(actor)) {
      return {
        status: 400,
        body: {
          error: 'ability bloccata: unita inibita (status inibito attivo)',
          blocked: true,
          reason: 'inibito',
          ability_id: (body && body.ability_id) || null,
        },
      };
    }
    const abilityId = String(body.ability_id || '');
    if (!abilityId) {
      return { status: 400, body: { error: 'ability_id richiesto per action_type=ability' } };
    }
    const baseAbility = findAbility(abilityId);
    if (!baseAbility) {
      return { status: 400, body: { error: `ability_id "${abilityId}" non trovata nel catalog` } };
    }
    // TKT-JOB-PHASEC (Codex #2546 P2): apply the actor's _perk_ability_mods (attached
    // by progression but previously consumed by NO runtime path) to a CLONE of the
    // catalog spec, so ability_mod perks are LIVE at the AP gate + in every handler:
    // bm_r1_swift_command (pack_command cost_ap -1 -> free), bm_r3_quick_summon
    // (summon_companion cost_pi -2), the aberrant damage_step/buff_duration mods, etc.
    // Band-neutral — no sim unit carries expansion-job ability_mods (returns the base
    // spec unchanged), so HC scenarios are byte-identical. Cost fields clamp at 0.
    const abilityMods = Array.isArray(actor._perk_ability_mods) ? actor._perk_ability_mods : [];
    const relevantMods = abilityMods.filter(
      (m) => m && m.ability_id === baseAbility.ability_id && m.field,
    );
    let ability = baseAbility;
    if (relevantMods.length > 0) {
      ability = { ...baseAbility };
      for (const m of relevantMods) {
        const cur = Number(ability[m.field]);
        if (Number.isFinite(cur)) {
          ability[m.field] = cur + (Number(m.delta) || 0);
          if (String(m.field).startsWith('cost_') && ability[m.field] < 0) ability[m.field] = 0;
        }
      }
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
    // H2 economy combat cost-gate (master-dd verdict 2026-06-02 = option C hybrid).
    // SG is the only MODELED combat pool (sgTracker POOL_MAX, seeded by normaliseUnit
    // + earned on damage). Gate it here; deduct only on a 2xx dispatch (below),
    // mirroring the cost_ap-inside-handler / cost_pe (#2522) "no charge on 400" model.
    //   cost_sg <= POOL_MAX -> numeric gate (require >= cost_sg, deduct cost_sg).
    //   cost_sg >  POOL_MAX -> consume-all (require FULL pool, drain to 0): the
    //     inflated value (cataclysm 75 / apocalypse_ray 100 / perfect_mutation 80)
    //     reads as "ultimate -> drains the gauge" per 26-ECONOMY ("Ultimate = consume
    //     all"); no data rescale needed. NB cataclysm is rank-2 by label but its
    //     cost_sg 75 is ultimate-tier -> treated consume-all; set cost_sg <= POOL_MAX
    //     if master-dd wants it numeric.
    // PP (#2555) and PT (this slice) are NOW modeled pools too: PP per-encounter
    // (ppTracker, earned +1 crit/+1 kill), PT per-round (ptTracker, earned from the
    // attack technique roll). Both gated below mirroring SG. PT maneuvers
    // (perforazione/spinte/condizioni/combo) stay a follow-up sink (not yet discrete
    // combat actions). Band-neutral: no sim/scenario party carries a
    // cost_sg/cost_pp/cost_pt ability (HC byte-identical).
    let sgConsumeAll = false;
    const costSg = Number(ability.cost_sg || 0);
    if (costSg > 0) {
      const sgPoolMax = (() => {
        try {
          return Number(require('./combat/sgTracker').POOL_MAX) || 3;
        } catch {
          return 3;
        }
      })();
      const sgHave = Number(actor.sg || 0);
      if (costSg > sgPoolMax) {
        sgConsumeAll = true;
        if (sgHave < sgPoolMax) {
          return {
            status: 400,
            body: {
              error: `SG insufficienti per ultimate (richiede il pool pieno ${sgPoolMax}, disponibili ${sgHave})`,
              pool: 'sg',
              cost: sgPoolMax,
              have: sgHave,
              consume_all: true,
            },
          };
        }
      } else if (sgHave < costSg) {
        return {
          status: 400,
          body: {
            error: `SG insufficienti per ability (richiesti ${costSg}, disponibili ${sgHave})`,
            pool: 'sg',
            cost: costSg,
            have: sgHave,
          },
        };
      }
    }
    // H2 PP cost-gate (26-ECONOMY: "Ultimate = 3 PP consume all"). PP is per-encounter
    // (0..3), earned +1 crit / +1 kill (ppTracker, wired in session.js performAttack).
    // Every cost_pp in the catalog (4..12) exceeds POOL_MAX -> consume-all; the <=max
    // numeric branch is kept for future-proofing. Spend before dispatch + rollback below.
    let ppConsumeAll = false;
    const costPp = Number(ability.cost_pp || 0);
    if (costPp > 0) {
      const ppPoolMax = (() => {
        try {
          return Number(require('./combat/ppTracker').POOL_MAX) || 3;
        } catch {
          return 3;
        }
      })();
      const ppHave = Number(actor.pp || 0);
      if (costPp > ppPoolMax) {
        ppConsumeAll = true;
        if (ppHave < ppPoolMax) {
          return {
            status: 400,
            body: {
              error: `PP insufficienti per ultimate (richiede il pool pieno ${ppPoolMax}, disponibili ${ppHave})`,
              pool: 'pp',
              cost: ppPoolMax,
              have: ppHave,
              consume_all: true,
            },
          };
        }
      } else if (ppHave < costPp) {
        return {
          status: 400,
          body: {
            error: `PP insufficienti per ability (richiesti ${costPp}, disponibili ${ppHave})`,
            pool: 'pp',
            cost: costPp,
            have: ppHave,
          },
        };
      }
    }
    // H2 PT cost-gate (26-ECONOMY §PT: pool 0..12, per-round; earned from the attack
    // technique roll via ptTracker, wired in session.js performAttack). Every cost_pt
    // in the catalog (3..10) is <= POOL_MAX(12) -> NUMERIC gate (require >= cost_pt,
    // deduct EXACTLY cost_pt — NOT consume-all, since PT is a numeric tactical economy,
    // not an ultimate-drain like PP/SG). The consume-all branch is dormant future-proof
    // for any cost_pt > 12. Spend before dispatch + rollback below.
    let ptConsumeAll = false;
    const costPt = Number(ability.cost_pt || 0);
    if (costPt > 0) {
      const ptPoolMax = (() => {
        try {
          return Number(require('./combat/ptTracker').POOL_MAX) || 12;
        } catch {
          return 12;
        }
      })();
      const ptHave = Number(actor.pt || 0);
      if (costPt > ptPoolMax) {
        ptConsumeAll = true;
        if (ptHave < ptPoolMax) {
          return {
            status: 400,
            body: {
              error: `PT insufficienti per ultimate (richiede il pool pieno ${ptPoolMax}, disponibili ${ptHave})`,
              pool: 'pt',
              cost: ptPoolMax,
              have: ptHave,
              consume_all: true,
            },
          };
        }
      } else if (ptHave < costPt) {
        return {
          status: 400,
          body: {
            error: `PT insufficienti per ability (richiesti ${costPt}, disponibili ${ptHave})`,
            pool: 'pt',
            cost: costPt,
            have: ptHave,
          },
        };
      }
    }
    // TKT-JOB-PHASEC slice 2 — track the last ability id used (ability-id
    // granular, finer than last_action_type). Consumed by computePerkDefenseBonus
    // (defense_after_silent). Set after the AP gate, before dispatch.
    actor._last_ability_id = ability.ability_id;
    // H2 cost-gate (Codex #2554 P2): SPEND SG before dispatch so the ability's own
    // damage-earn (sgTracker during the attack) stacks on the REDUCED pool instead of
    // being dropped at the cap. Rolled back below on a non-2xx result (no charge on
    // 400/501), mirroring the cost_ap / cost_pe (#2522) model.
    let sgBefore = null;
    if (costSg > 0) {
      sgBefore = Number(actor.sg || 0);
      actor.sg = sgConsumeAll ? 0 : Math.max(0, sgBefore - costSg);
    }
    let ppBefore = null;
    if (costPp > 0) {
      ppBefore = Number(actor.pp || 0);
      actor.pp = ppConsumeAll ? 0 : Math.max(0, ppBefore - costPp);
    }
    let ptBefore = null;
    if (costPt > 0) {
      ptBefore = Number(actor.pt || 0);
      actor.pt = ptConsumeAll ? 0 : Math.max(0, ptBefore - costPt);
    }
    const dispatch = () => {
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
        case 'suppress_ability':
          return executeSuppressAbility({ session, actor, ability, body });
        case 'apply_status':
          return executeApplyStatus({ session, actor, ability, body });
        case 'cleanse_status':
          return executeCleanseStatus({ session, actor, ability, body });
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
    };
    const result = await dispatch();
    const resolved2xx = result && Number(result.status) >= 200 && Number(result.status) < 300;
    // H2 cost-gate (Codex #2554 P2): the SG spend ran BEFORE dispatch; roll it back
    // if the ability did not resolve (no charge on 400/501). On success the spend
    // stands and the in-dispatch earn already stacked on the reduced pool.
    if (costSg > 0 && !resolved2xx) {
      actor.sg = sgBefore;
    }
    if (costPp > 0 && !resolved2xx) {
      actor.pp = ppBefore;
    }
    if (costPt > 0 && !resolved2xx) {
      actor.pt = ptBefore;
    }
    // TKT-JOB-PHASEC slice 4 (Cat F, OQ-F verdict A) — on-ability-use perk
    // effects, fired only on a successful (2xx) resolution. Lazy require mirrors
    // the sgTracker pattern (non-blocking if the module is unavailable).
    if (resolved2xx) {
      try {
        const { applyPerkAbilityUseEffects } = require('./progression/progressionApply');
        applyPerkAbilityUseEffects(actor, ability.ability_id, { round: session.turn });
      } catch {
        /* progression optional — non-blocking */
      }
    }
    return result;
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
