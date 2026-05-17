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
const { ARCHETYPE_VULN_CHANNEL } = require('../../routes/sessionConstants');

// K4 Approach B — commit-window anti-flip guard helpers.
// Detect direction reversal (oscillation) between consecutive utility-brain
// move decisions and force previous intent for `commit_window` turns.
// Reduces 2-unit kite cycles where score gradient flips faster than
// additive stickiness can compensate (ref PR #2147 negative result).
function _moveDirection(from, to) {
  if (!from || !to) return null;
  const dx = (Number(to.x) || 0) - (Number(from.x) || 0);
  const dy = (Number(to.y) || 0) - (Number(from.y) || 0);
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

function _isOppositeDir(a, b) {
  return (
    (a === 'N' && b === 'S') ||
    (a === 'S' && b === 'N') ||
    (a === 'E' && b === 'W') ||
    (a === 'W' && b === 'E')
  );
}

function _detectFlip(actor, newIntent, newDirection) {
  const lastKind = actor.last_action_type;
  const lastDir = actor.last_move_direction;
  if (!lastKind) return false;
  // Action-kind reversal approach<->retreat
  if (lastKind === 'retreat' && newIntent === 'approach') return true;
  if ((lastKind === 'move' || lastKind === 'approach') && newIntent === 'retreat') return true;
  // Direction reversal during consecutive moves (covers approach->approach with
  // opposite direction as well — that's the canonical 1-tile kite oscillation)
  if (
    lastDir &&
    newDirection &&
    _isOppositeDir(lastDir, newDirection) &&
    (newIntent === 'approach' || newIntent === 'retreat')
  ) {
    return true;
  }
  return false;
}

// M6-Z: pick canale attacco che sfrutta vuln del target basato su archetype.
// Fallback "fisico" default se target senza archetype o archetype adattivo.
function pickExploitChannel(target) {
  if (!target || !target.resistance_archetype) return 'fisico';
  const vuln = ARCHETYPE_VULN_CHANNEL[target.resistance_archetype];
  return vuln || 'fisico';
}

// Sistema pressure tier → max intents per round (AI War pattern).
// Mirror dei tier definiti in packs/.../sistema_pressure.yaml e in
// sessionHelpers.SISTEMA_PRESSURE_TIERS. Definito qui per evitare
// dipendenza circolare con sessionHelpers.
// Rebalance 2026-04-17 post-playtest human: Master reporting "solo 1 SIS muove"
// in T1 tutorial_02 era troppo passivo. Tutti tier +1 intent (tranne Calm che
// resta 1 per preservare tutorial_01 "gentle start"). Cap Apex sale a 4 per
// BOSS scenari (tutorial_05) dove Sistema deve sentirsi minaccia vera.
const PRESSURE_TIER_INTENT_CAP = [
  { threshold: 0, intents_per_round: 1 }, // Calm (tutorial_01 only)
  { threshold: 25, intents_per_round: 2 }, // Alert (tutorial_02 baseline)
  { threshold: 50, intents_per_round: 3 }, // Escalated (tutorial_03 baseline)
  { threshold: 75, intents_per_round: 3 }, // Critical (tutorial_04 baseline)
  { threshold: 95, intents_per_round: 4 }, // Apex (tutorial_05 BOSS baseline)
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
    const effectiveGrid = session.grid?.width || gridSize;

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
    // Phase A status-awareness: a parità di HP (±2 PT), preferisce target debuffati
    // (slowed/disoriented/chilled/marked riducono efficacia del target).
    function hasDebuffStatus(unit) {
      const s = unit?.status;
      if (!s) return false;
      return (
        Number(s.slowed) > 0 ||
        Number(s.disoriented) > 0 ||
        Number(s.chilled) > 0 ||
        Number(s.marked) > 0
      );
    }
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
      return candidates.reduce((best, c) => {
        if (!best) return c;
        const hpDiff = c.hp - best.hp;
        if (Math.abs(hpDiff) > 2) return hpDiff < 0 ? c : best;
        if (hasDebuffStatus(c) && !hasDebuffStatus(best)) return c;
        if (!hasDebuffStatus(c) && hasDebuffStatus(best)) return best;
        return hpDiff < 0 ? c : best;
      }, null);
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

      // iter5 aggro_pull (taunt): se actor ha status.aggro_locked attivo,
      // forza target = aggro_source (vivo). Override pickLowestHpEnemy.
      let target = null;
      let aggroOverride = false;
      const aggroLocked = Number(actor.status?.aggro_locked) || 0;
      const aggroSource = actor.aggro_source;
      if (aggroLocked > 0 && aggroSource) {
        const lock = (session.units || []).find(
          (u) => u && u.id === aggroSource && Number(u.hp) > 0,
        );
        if (lock) {
          target = lock;
          aggroOverride = true;
        }
      }
      if (!target) target = pickLowestHpEnemy(session, actor);
      // Se gia' preso da altro SIS, ri-pick escludendo i presi.
      // Fall back al pick originale solo se non ci sono alternative.
      // Aggro override IGNORA il taken-set (taunt forza il bersaglio).
      if (!aggroOverride && target && takenTargetIds.has(target.id)) {
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
        // K4 stickiness — merge per-profile stickiness_weight (and
        // optional direction weight) into the difficultyProfile passed
        // to selectAction. ai_profiles.yaml entry can declare:
        //   <profile>:
        //     stickiness_weight: 0.15
        //     stickiness_direction_weight: 0.075   (optional, defaults to half)
        // Profile fallback to base difficultyProfile (zero stickiness).
        let stickyDifficulty = difficultyProfile;
        if (aiProfiles && aiProfiles.profiles && actor && actor.ai_profile) {
          const prof = aiProfiles.profiles[actor.ai_profile];
          if (prof) {
            const sw = prof.stickiness_weight;
            const sdw = prof.stickiness_direction_weight;
            if (typeof sw === 'number' || typeof sdw === 'number') {
              stickyDifficulty = {
                ...difficultyProfile,
                ...(typeof sw === 'number' ? { stickiness_weight: sw } : {}),
                ...(typeof sdw === 'number' ? { stickiness_direction_weight: sdw } : {}),
              };
            }
          }
        }
        policy = selectAiPolicyUtility(actor, target, {}, stickyDifficulty);
      } else {
        policy = selectAiPolicy(actor, target, null, threatCtx);
      }

      // K4 Approach B — commit-window anti-flip guard. Reads
      // `commit_window` (turns) from ai_profiles.yaml profile entry.
      // When > 0:
      //   - if a guard window is open (actor.commit_window_remaining > 0),
      //     force the saved intent for this turn and decrement;
      //   - else, detect intent/direction flip vs last committed action
      //     and, if flipped, force previous intent for `commit_window` turns
      //     (anti-oscillation lock).
      // commit_window=2 → reverse-flip ignored, last intent commits 2 turns.
      if (aiProfiles && aiProfiles.profiles && actor.ai_profile) {
        const prof = aiProfiles.profiles[actor.ai_profile];
        const cw = prof ? Number(prof.commit_window) || 0 : 0;
        if (cw > 0) {
          const remaining = Number(actor.commit_window_remaining) || 0;
          if (remaining > 0 && actor.commit_window_intent) {
            policy = { rule: 'COMMIT_WINDOW', intent: actor.commit_window_intent };
            actor.commit_window_remaining = remaining - 1;
          } else if (actor.last_action_type) {
            const candidatePos =
              policy.intent === 'retreat'
                ? stepAway(actor.position, target.position, effectiveGrid)
                : policy.intent === 'approach'
                  ? stepTowards(actor.position, target.position)
                  : null;
            const candidateDir = candidatePos ? _moveDirection(actor.position, candidatePos) : null;
            if (_detectFlip(actor, policy.intent, candidateDir)) {
              const lastIntent =
                actor.last_action_type === 'attack'
                  ? 'attack'
                  : actor.last_action_type === 'retreat'
                    ? 'retreat'
                    : 'approach';
              policy = { rule: 'COMMIT_WINDOW_FLIP', intent: lastIntent };
              // Apply for cw turns total INCLUDING this one — store cw-1.
              actor.commit_window_remaining = Math.max(0, cw - 1);
              actor.commit_window_intent = lastIntent;
            }
          }
        }
      }

      const distance = manhattanDistance(actor.position, target.position);

      // Fallback cornered: stessa logica di sistemaTurnRunner. Se
      // REGOLA_002 e' attiva ma il retreat e' bloccato (step fallisce
      // o unit cornered), cade back a REGOLA_001 (attack se in range,
      // approach altrimenti).
      if (policy.intent === 'retreat') {
        const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
        const canRetreat = stepAway(actor.position, target.position, effectiveGrid) !== null;
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
        // M6-Z: canale exploit target.resistance_archetype (enemy AI smart).
        const action = {
          id: `sis-attack-${actor.id}`,
          type: 'attack',
          actor_id: actor.id,
          target_id: target.id,
          ability_id: null,
          ap_cost: 1,
          channel: pickExploitChannel(target),
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
          aggro_override: aggroOverride || undefined,
          // RCA aggressive timeout (docs/research/2026-05-09-aggressive-profile-calibration.md):
          // surface utility brain score + per-consideration breakdown when
          // policy comes from selectAiPolicyUtility. Undefined for legacy
          // rule-based selectAiPolicy — JSON.stringify drops, no payload bloat.
          score: policy.score,
          breakdown: policy.breakdown,
        });
        continue;
      }

      // intent='approach' o 'retreat' → move
      const positionFrom = { ...actor.position };
      const nextPos =
        policy.intent === 'retreat'
          ? stepAway(actor.position, target.position, effectiveGrid)
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
        aggro_override: aggroOverride || undefined,
        score: policy.score,
        breakdown: policy.breakdown,
      });
    }

    return { intents, decisions };
  };
}

module.exports = { createDeclareSistemaIntents };
