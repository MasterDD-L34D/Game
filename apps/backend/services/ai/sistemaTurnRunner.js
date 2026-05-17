// SPRINT_010 (issue #2): orchestratore runSistemaTurn per l'IA del SIS.
//
// Questo modulo estrae la logica di orchestrazione dell'IA dal router
// session.js. Lascia le funzioni "puramente decisionali" in policy.js e
// inietta dall'esterno gli helper di combattimento e l'emissione eventi
// (dipendenze che vivono nel closure di createSessionRouter).
//
// Uso tipico dal router:
//   const { createSistemaTurnRunner } = require('../services/ai/sistemaTurnRunner');
//   const runSistemaTurn = createSistemaTurnRunner({
//     pickLowestHpEnemy,
//     stepTowards,
//     performAttack,
//     buildAttackEvent,
//     buildMoveEvent,
//     emitKillAndAssists,
//     appendEvent,
//     gridSize: GRID_SIZE,
//   });
//   // poi
//   const iaActions = await runSistemaTurn(session);
//
// Il runner:
//   1. Trova l'actor del sistema (session.active_unit)
//   2. Assicura AP pieni all'inizio del turno
//   3. Loop finche' ap_remaining > 0:
//      a. Seleziona il bersaglio (pickLowestHpEnemy)
//      b. Sceglie policy via selectAiPolicy
//      c. Applica fallback "cornered" se necessario (REGOLA_002 →
//         REGOLA_001 approach/attack)
//      d. Esegue attack / move (approach o retreat) / skip
//      e. Decrementa ap_remaining di 1 per iterazione
//   4. Ritorna l'array di azioni eseguite per la risposta /turn/end
//
// Il flag `corneredThisTurn` e' locale al turno: se stepAway fallisce
// una volta, le iterazioni successive evitano REGOLA_002 per non
// oscillare fra approach e retreat.

const { selectAiPolicy, stepAway, DEFAULT_ATTACK_RANGE } = require('./policy');
const { applySystemaPushback } = require('../combat/defyEngine');

function createSistemaTurnRunner(deps) {
  const {
    pickLowestHpEnemy,
    manhattanDistance,
    stepTowards,
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    emitKillAndAssists,
    appendEvent,
    gridSize = 6,
  } = deps || {};

  if (typeof pickLowestHpEnemy !== 'function') {
    throw new Error('createSistemaTurnRunner: pickLowestHpEnemy is required');
  }
  if (typeof stepTowards !== 'function') {
    throw new Error('createSistemaTurnRunner: stepTowards is required');
  }
  if (typeof performAttack !== 'function') {
    throw new Error('createSistemaTurnRunner: performAttack is required');
  }

  return async function runSistemaTurn(session) {
    const effectiveGrid = session.grid?.width || gridSize;

    // Sistema Pushback: fires before the turn loop when counter is charged.
    const pushback = applySystemaPushback(session);
    if (pushback.triggered && typeof appendEvent === 'function') {
      await appendEvent(session, {
        action_type: 'sistema_pushback',
        actor_id: 'sistema',
        turn: session.turn,
        pressure_restored: pushback.pressure_restored,
        pressure_after: pushback.after.pressure,
        sistema_counter_spent: pushback.before.sistema_counter,
      });
    }

    const actor = session.units.find((u) => u.id === session.active_unit);
    if (!actor) return [];
    if ((actor.ap_remaining ?? 0) <= 0) {
      // SPRINT_019: safety-net reset con check fracture (movement penalty).
      // Se l'actor ha fracture > 0, limita a 1 AP per il turno.
      const fractureActive = Number(actor.status?.fracture) > 0;
      actor.ap_remaining = fractureActive ? Math.min(1, actor.ap) : actor.ap;
    }

    const actions = [];
    // Flag per-turno: se REGOLA_002 retreat fallisce per cornered, le
    // iterazioni successive dello stesso turno non rientrano in retreat
    // (evita oscillazioni approach↔retreat).
    let corneredThisTurn = false;

    while ((actor.ap_remaining ?? 0) > 0) {
      const target = pickLowestHpEnemy(session, actor);
      if (!target) break;

      let policy = selectAiPolicy(actor, target);
      const distance = manhattanDistance(actor.position, target.position);

      // Fallback cornered (SPRINT_006 fase 2 + SPRINT_009 fix):
      if (policy.intent === 'retreat') {
        const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
        if (corneredThisTurn) {
          policy =
            distance <= range
              ? { rule: 'REGOLA_001', intent: 'attack' }
              : { rule: 'REGOLA_001', intent: 'approach' };
        } else {
          const canRetreat = stepAway(actor.position, target.position, effectiveGrid) !== null;
          if (!canRetreat) {
            corneredThisTurn = true;
            policy =
              distance <= range
                ? { rule: 'REGOLA_001', intent: 'attack' }
                : { rule: 'REGOLA_001', intent: 'approach' };
          }
        }
      }

      // SPRINT_013 (issue #10): intent 'skip' per stati come stunned.
      // L'actor non fa nulla, consuma tutti gli AP restanti, registra
      // un'unica azione descrittiva.
      if (policy.intent === 'skip') {
        const apSpent = actor.ap_remaining;
        actor.ap_remaining = 0;
        actions.push({
          actor: 'sistema',
          unit_id: actor.id,
          type: 'skip',
          reason: `stato emotivo — ${policy.rule}`,
          position_from: { ...actor.position },
          position_to: { ...actor.position },
          ia_rule: policy.rule,
          ap_spent: apSpent,
        });
        break;
      }

      if (policy.intent === 'attack') {
        const hpBefore = target.hp;
        const targetPositionAtAttack = { ...target.position };
        const { result, evaluation, damageDealt, killOccurred, parry, positional } = performAttack(
          session,
          actor,
          target,
        );
        const event = buildAttackEvent({
          session,
          actor,
          target,
          result,
          evaluation,
          damageDealt,
          hpBefore,
          targetPositionAtAttack,
          positional: positional || null,
        });
        event.actor_id = 'sistema';
        event.actor_species = actor.species;
        event.actor_job = actor.job;
        event.ia_rule = policy.rule;
        event.ia_controlled_unit = actor.id;
        // SPRINT_021: espone parata reattiva del player sul log IA
        if (parry) event.parry = parry;
        await appendEvent(session, event);
        if (killOccurred) {
          await emitKillAndAssists(session, actor, target, event);
        }
        actor.ap_remaining = Math.max(0, actor.ap_remaining - 1);
        actions.push({
          actor: 'sistema',
          unit_id: actor.id,
          type: 'attack',
          target: target.id,
          die: result.die,
          roll: result.roll,
          mos: result.mos,
          result: result.hit ? 'hit' : 'miss',
          pt: result.pt,
          damage_dealt: damageDealt,
          trait_effects: evaluation.trait_effects,
          actor_position: { ...actor.position },
          target_position: targetPositionAtAttack,
          ia_rule: policy.rule,
          parry,
        });
        // K4 stickiness state tracking (attack branch).
        actor.last_action_type = 'attack';
        actor.last_move_direction = null;
        if (killOccurred) break;
        continue;
      }

      // intent: 'approach' (REGOLA_001) o 'retreat' (REGOLA_002)
      const positionFrom = { ...actor.position };
      const nextPos =
        policy.intent === 'retreat'
          ? stepAway(actor.position, target.position, effectiveGrid)
          : stepTowards(actor.position, target.position);

      if (!nextPos || (nextPos.x === positionFrom.x && nextPos.y === positionFrom.y)) {
        actor.ap_remaining = Math.max(0, actor.ap_remaining - 1);
        actions.push({
          actor: 'sistema',
          unit_id: actor.id,
          type: 'skip',
          reason:
            policy.intent === 'retreat'
              ? `cannot retreat — cornered near ${target.id}`
              : `cannot approach ${target.id}`,
          position_from: positionFrom,
          position_to: positionFrom,
          ia_rule: policy.rule,
        });
        continue;
      }

      // Overlap guard (SPRINT_005 fase 1)
      const blocker = session.units.find(
        (u) =>
          u.id !== actor.id && u.hp > 0 && u.position.x === nextPos.x && u.position.y === nextPos.y,
      );
      if (blocker) {
        actor.ap_remaining = Math.max(0, actor.ap_remaining - 1);
        actions.push({
          actor: 'sistema',
          unit_id: actor.id,
          type: 'skip',
          reason: `blocked by ${blocker.id} at (${nextPos.x},${nextPos.y})`,
          position_from: positionFrom,
          position_to: positionFrom,
          ia_rule: policy.rule,
        });
        continue;
      }

      actor.position = nextPos;
      // SPRINT_022: auto-facing sul SIS move come per il player.
      // Il SIS "guarda" nella direzione in cui si e' mosso.
      const dx = nextPos.x - positionFrom.x;
      const dy = nextPos.y - positionFrom.y;
      if (dx !== 0 || dy !== 0) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          actor.facing = dx > 0 ? 'E' : 'W';
        } else {
          actor.facing = dy > 0 ? 'S' : 'N';
        }
      }
      const event = buildMoveEvent({ session, actor, positionFrom });
      event.actor_id = 'sistema';
      event.ia_rule = policy.rule;
      event.ia_controlled_unit = actor.id;
      await appendEvent(session, event);
      actor.ap_remaining = Math.max(0, actor.ap_remaining - 1);
      const moveKind = policy.intent === 'retreat' ? 'retreat' : 'move';
      actions.push({
        actor: 'sistema',
        unit_id: actor.id,
        type: moveKind,
        target: target.id,
        position_from: positionFrom,
        position_to: { ...actor.position },
        ia_rule: policy.rule,
      });
      // K4 Approach A — track last action + move direction per actor so
      // utilityBrain.scoreAction stickiness branch can reward consistent
      // commits next turn. Reduces multi-unit kite oscillation observed
      // in PR #2145 (aggressive 53.5% WR vs 95% K3 ablation).
      actor.last_action_type = moveKind;
      actor.last_move_direction = actor.facing || null;
    }

    return actions;
  };
}

module.exports = { createSistemaTurnRunner };
