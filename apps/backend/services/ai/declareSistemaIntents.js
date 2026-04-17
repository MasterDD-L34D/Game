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

// Sistema pressure tier → max intents per round (AI War pattern).
// Mirror dei tier definiti in packs/.../sistema_pressure.yaml e in
// sessionHelpers.SISTEMA_PRESSURE_TIERS. Definito qui per evitare
// dipendenza circolare con sessionHelpers.
const PRESSURE_TIER_INTENT_CAP = [
  { threshold: 0, intents_per_round: 1 }, // Calm
  { threshold: 25, intents_per_round: 2 }, // Alert
  { threshold: 50, intents_per_round: 2 }, // Escalated
  { threshold: 75, intents_per_round: 3 }, // Critical
  { threshold: 95, intents_per_round: 3 }, // Apex
];

function intentsCapForPressure(pressure) {
  const p = Number.isFinite(Number(pressure)) ? Math.max(0, Math.min(100, Number(pressure))) : 0;
  let cap = PRESSURE_TIER_INTENT_CAP[0].intents_per_round;
  for (const t of PRESSURE_TIER_INTENT_CAP) {
    if (p >= t.threshold) cap = t.intents_per_round;
  }
  return cap;
}

function createDeclareSistemaIntents(deps) {
  const {
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize = 6,
    useUtilityAi = false, // global fallback; per-actor override via aiProfiles + actor.ai_profile
    aiProfiles = null, // { profiles: { aggressive: { use_utility_brain: true, ... }, ... } } — from ai_profiles.yaml (ADR-2026-04-17 Q-001 T3.1)
    difficultyProfile = {}, // { selection: 'argmax'|'weighted_top3'|'random', noise: 0-1 }
    computeThreatIndex, // AI War pattern: optional, injected from threatAssessment.js
    threatConfig, // override per threat thresholds (from ai_intent_scores.yaml → threat)
  } = deps || {};

  /**
   * Resolve Utility AI flag per-actor (ADR-2026-04-17 gradual rollout).
   * Priorità: profile.use_utility_brain (se aiProfiles loaded + actor.ai_profile) → useUtilityAi global.
   */
  function resolveUseUtilityBrain(actor) {
    if (aiProfiles && aiProfiles.profiles && actor && actor.ai_profile) {
      const profile = aiProfiles.profiles[actor.ai_profile];
      if (profile && typeof profile.use_utility_brain === 'boolean') {
        return profile.use_utility_brain;
      }
    }
    return useUtilityAi;
  }

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

    // AI War pattern: compute threat context once per round
    const threatCtx =
      typeof computeThreatIndex === 'function' ? computeThreatIndex(session, threatConfig) : null;

    // AI War pattern: pressure-driven intent cap.
    // Tier piu' alto (player vincente) → SIS dichiara piu' intents.
    // Calm: 1 intent/round, Critical/Apex: 3.
    const intentsCap = intentsCapForPressure(session.sistema_pressure);

    const intents = [];
    const decisions = [];
    let intentsEmitted = 0;

    // AI War pattern — decentralized unit AI: conflict resolution.
    // No global planner. Ogni unit sceglie il proprio target indipendentemente;
    // un post-pass qui garantisce che due SIS non sprechino focus-fire stackando
    // sullo stesso PG quando altri PG sono vulnerabili. Primo arrivato (ordine
    // session.units) keep, altri ri-pickano escludendo target gia' presi.
    const takenTargetIds = new Set();

    // Helper inline: ripicka target escludendo IDs gia' presi.
    // Mantenuto inline per non allargare l'API pubblica di pickLowestHpEnemy.
    function pickTargetExcluding(actor, excludeSet) {
      const actorFaction = actor.controlled_by;
      const candidates = session.units.filter(
        (u) =>
          u &&
          u.id !== actor.id &&
          u.hp > 0 &&
          u.controlled_by !== actorFaction &&
          !excludeSet.has(u.id),
      );
      if (!candidates.length) return null;
      return candidates.reduce((lowest, c) => (!lowest || c.hp < lowest.hp ? c : lowest), null);
    }

    for (const actor of session.units) {
      if (!actor) continue;
      if (actor.controlled_by !== 'sistema') continue;
      if (Number(actor.hp || 0) <= 0) continue;
      if (intentsEmitted >= intentsCap) {
        decisions.push({
          unit_id: actor.id,
          rule: 'PRESSURE_CAP',
          intent: 'skip',
          reason: `pressure cap raggiunto (${intentsEmitted}/${intentsCap})`,
        });
        continue;
      }

      // Prima scelta: lowest-HP globale (pick classico).
      let target = pickLowestHpEnemy(session, actor);
      // Se gia' preso da altro SIS, ri-pick escludendo i presi.
      // Fall back al pick originale solo se non ci sono alternative.
      if (target && takenTargetIds.has(target.id)) {
        const alt = pickTargetExcluding(actor, takenTargetIds);
        if (alt) target = alt;
      }
      if (!target) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_TARGET',
          intent: 'skip',
          reason: 'no enemy alive',
        });
        continue;
      }

      // Select policy: Utility AI (per-actor via ai_profile.use_utility_brain) or legacy rules
      const actorUseUtility = resolveUseUtilityBrain(actor);
      let policy;
      if (actorUseUtility) {
        policy = selectAiPolicyUtility(actor, target, {}, difficultyProfile);
      } else {
        policy = selectAiPolicy(actor, target, null, threatCtx);
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
        intentsEmitted++;
        // Decentralized conflict resolution: mark target come preso cosi'
        // il prossimo SIS nel loop evita lo stack.
        takenTargetIds.add(target.id);
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
      intentsEmitted++;
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
