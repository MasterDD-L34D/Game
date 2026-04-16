// ADR-2026-04-16 PR 3 di N — declareSistemaIntents.
//
// Rifattorizzazione del sistemaTurnRunner per il round model:
// invece di eseguire sequenzialmente attack/move mutando lo state e
// consumando AP in un loop, produce una lista di **intents** da passare
// al round orchestrator via `declareIntent`.
//
// Uso tipico nel round flow (wiring futuro in session.js):
//   const { createDeclareSistemaIntents } = require('./declareSistemaIntents');
//   const declare = createDeclareSistemaIntents({
//     pickLowestHpEnemy,
//     stepTowards,
//     manhattanDistance,
//     gridSize: GRID_SIZE,
//   });
//   const { intents, decisions } = declare(session);
//   for (const { unit_id, action } of intents) {
//     session.roundState = orchestrator.declareIntent(
//       session.roundState, unit_id, action,
//     ).nextState;
//   }
//
// Il modulo e' **puro**: non tocca session.units, non muta AP, non
// emette eventi, non scrive su disco. Lavora sulla shape legacy
// session.units (hp scalare, position {x,y}, ecc.) perche' e' quello
// che selectAiPolicy da policy.js si aspetta. L'adattamento allo
// shape del round orchestrator avviene nel chiamante (session.js
// PR 4 scope).
//
// Semantica "un intent per round per unit":
// Nel round model ogni unit dichiara al massimo un'azione principale
// per round. Il loop AP del vecchio sistemaTurnRunner (2 azioni per
// turno se AP pieno) non ha equivalente diretto: il round successivo
// permettera' la seconda azione. Questo riduce la "pressione"
// dell'AI a round pieni ma mantiene fairness (2 round SIS = 2 azioni,
// stesso throughput di 1 turno SIS vecchio). Eventuali upgrade
// (multi-action intents) sono PR futura.

const { selectAiPolicy, stepAway, DEFAULT_ATTACK_RANGE, loadAiConfig } = require('./policy');
const { selectAiPolicyUtility } = require('./utilityBrain');

function createDeclareSistemaIntents(deps) {
  const {
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize = 6,
    useUtilityAi = false, // opt-in: set true to use Utility AI brain
    difficultyProfile = {}, // { selection: 'argmax'|'weighted_top3'|'random', noise: 0-1 }
  } = deps || {};

  if (typeof pickLowestHpEnemy !== 'function') {
    throw new Error('createDeclareSistemaIntents: pickLowestHpEnemy is required');
  }
  if (typeof stepTowards !== 'function') {
    throw new Error('createDeclareSistemaIntents: stepTowards is required');
  }
  if (typeof manhattanDistance !== 'function') {
    throw new Error('createDeclareSistemaIntents: manhattanDistance is required');
  }

  /**
   * Dichiara intents per tutte le unita' SIS-controlled vive nella session.
   *
   * Non muta la session. Ritorna:
   *   {
   *     intents: [{ unit_id, action }],          // ready per declareIntent
   *     decisions: [{ unit_id, rule, intent, reason? }], // log + debug
   *   }
   *
   * L'ordine di emissione e' deterministico: segue session.units
   * (stesso ordine di iterazione del runner legacy).
   */
  return function declareSistemaIntents(session) {
    if (!session || !Array.isArray(session.units)) {
      return { intents: [], decisions: [] };
    }

    const intents = [];
    const decisions = [];

    for (const actor of session.units) {
      if (!actor) continue;
      if (actor.controlled_by !== 'sistema') continue;
      if (Number(actor.hp || 0) <= 0) continue;

      const target = pickLowestHpEnemy(session, actor);
      if (!target) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_TARGET',
          intent: 'skip',
          reason: 'no enemy alive',
        });
        continue;
      }

      // Select policy: Utility AI (opt-in) or legacy rules
      let policy;
      if (useUtilityAi) {
        policy = selectAiPolicyUtility(actor, target, {}, difficultyProfile);
      } else {
        policy = selectAiPolicy(actor, target);
      }
      const distance = manhattanDistance(actor.position, target.position);

      // Fallback cornered: stessa logica di sistemaTurnRunner. Se
      // REGOLA_002 e' attiva ma il retreat e' bloccato (step fallisce
      // o unit cornered), cade back a REGOLA_001 (attack se in range,
      // approach altrimenti).
      if (policy.intent === 'retreat') {
        const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
        const canRetreat = stepAway(actor.position, target.position, gridSize) !== null;
        if (!canRetreat) {
          policy =
            distance <= range
              ? { rule: 'REGOLA_001', intent: 'attack' }
              : { rule: 'REGOLA_001', intent: 'approach' };
        }
      }

      // intent='skip' non genera nessun intent: l'unit resta ferma.
      // Viene comunque tracciato in decisions per debug.
      if (policy.intent === 'skip') {
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'skip',
          reason: `stato emotivo — ${policy.rule}`,
        });
        continue;
      }

      if (policy.intent === 'attack') {
        // Attack intent minimale. Il campo damage_dice e' un default
        // portabile: il resolver (placeholder in PR 2, reale in PR 4)
        // puo' override via i trait/stats dell'actor. Il field
        // `source_ia_rule` e' metadata per la UI/log.
        const action = {
          id: `sis-attack-${actor.id}`,
          type: 'attack',
          actor_id: actor.id,
          target_id: target.id,
          ability_id: null,
          ap_cost: 1,
          channel: null,
          damage_dice: deps._damageDice || { count: 1, sides: 6, modifier: 2 },
          source_ia_rule: policy.rule,
        };
        intents.push({ unit_id: actor.id, action });
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'attack',
          target_id: target.id,
        });
        continue;
      }

      // intent='approach' o 'retreat' → move
      const positionFrom = { ...actor.position };
      const nextPos =
        policy.intent === 'retreat'
          ? stepAway(actor.position, target.position, gridSize)
          : stepTowards(actor.position, target.position);

      if (!nextPos || (nextPos.x === positionFrom.x && nextPos.y === positionFrom.y)) {
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'skip',
          reason:
            policy.intent === 'retreat'
              ? `cannot retreat — cornered near ${target.id}`
              : `cannot approach ${target.id}`,
        });
        continue;
      }

      // Overlap guard: se la cella e' occupata da un'altra unit viva,
      // niente intent (no-op). Il controllo stretto avviene anche nel
      // resolver reale PR 4, ma lo facciamo early per evitare intent
      // invalidi nella pending_intents list.
      const blocker = session.units.find(
        (u) =>
          u.id !== actor.id &&
          Number(u.hp || 0) > 0 &&
          u.position &&
          u.position.x === nextPos.x &&
          u.position.y === nextPos.y,
      );
      if (blocker) {
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'skip',
          reason: `blocked by ${blocker.id} at (${nextPos.x},${nextPos.y})`,
        });
        continue;
      }

      const moveAction = {
        id: `sis-move-${actor.id}`,
        type: 'move',
        actor_id: actor.id,
        target_id: null,
        ability_id: null,
        ap_cost: 1,
        channel: null,
        move_to: { x: nextPos.x, y: nextPos.y },
        position_from: positionFrom,
        source_ia_rule: policy.rule,
      };
      intents.push({ unit_id: actor.id, action: moveAction });
      decisions.push({
        unit_id: actor.id,
        rule: policy.rule,
        intent: policy.intent, // 'approach' o 'retreat'
        target_id: target.id,
        move_to: nextPos,
      });
    }

    return { intents, decisions };
  };
}

module.exports = { createDeclareSistemaIntents };
