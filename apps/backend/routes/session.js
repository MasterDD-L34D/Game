// SPRINT_001 fase 3 + SPRINT_002 fase 1-4 + SPRINT_003 fase 0-3 — engine minimo giocabile.
//
// Espone 6 route sotto /api/session/*:
//   POST /start     crea sessione (units custom o default), griglia 6x6
//   GET  /state     ritorna stato corrente (units, turn, grid, active_unit)
//   POST /action    risolve attack o move (d20 + trait effects + fairness cap)
//   POST /turn/end  passa il turno; se tocca al sistema, esegue REGOLA_001
//   POST /end       chiude sessione e finalizza il log su disco
//   GET  /:id/vc    snapshot VC on-demand (SPRINT_003 fase 3)
//
// Lo stato sessione vive in memoria (Map session_id -> session). Il log
// degli eventi viene appeso a `logs/session_YYYYMMDD_HHMMSS.json` ad
// ogni azione e finalizzato a /end.
//
// d20 (GDD v0.1 "Sistema Dadi Ibrido"):
//   roll = d20 + mod_caratteristica
//   mos  = roll - dc_difesa
//   hit  = mos >= 0
//   pt   = 0
//   if hit:
//     if die in [15..19]: pt += 1
//     if die == 20:       pt += 2
//     pt += floor(mos / 5)
//
// Trait engine (SPRINT_002 fase 2): dopo la risoluzione base, i trait
// dell'attore e del target vengono valutati dal registry in
// data/core/traits/active_effects.yaml e possono modificare il danno
// finale + aggiungere voci in trait_effects per il log.
//
// Sistema IA (SPRINT_002 fase 3): REGOLA_001 in engine/sistema_rules.md.
// Le unita' con controlled_by === 'sistema' sono pilotate dall'IA
// quando il turno scatta al loro id tramite POST /turn/end.

const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { Router } = require('express');

const {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  evaluateStatusTraits,
} = require('../services/traitEffects');
const { loadFairnessConfig, checkCapPtBudget, consumeCapPt } = require('../services/fairnessCap');
const { loadTelemetryConfig, buildVcSnapshot } = require('../services/vcScoring');
// SPRINT_010 (issue #2): IA estratta in modulo dedicato.
// Le funzioni decisionali (selectAiPolicy, stepAway) vivono in services/ai/policy.js,
// l'orchestratore del turno (createSistemaTurnRunner) in services/ai/sistemaTurnRunner.js.
// DEFAULT_ATTACK_RANGE e' ora autoritativo in policy.js (usato sia qui che dall'IA).
const { DEFAULT_ATTACK_RANGE } = require('../services/ai/policy');
const { createSistemaTurnRunner } = require('../services/ai/sistemaTurnRunner');
const { createDeclareSistemaIntents } = require('../services/ai/declareSistemaIntents');
const { loadAiProfiles } = require('../services/ai/aiProfilesLoader');
const { createAbilityExecutor } = require('../services/abilityExecutor');
const reactionEngine = require('../services/reactionEngine');
// M6-#1 (ADR-2026-04-19 + spike 2026-04-19): Node native resistance engine.
// Applica channel-specific resist/vuln su damage pre-hp. Evidence spike:
// 84.6% → 20% win rate hardcore-06 con flat 50% resist (leva confermata).
const {
  loadSpeciesResistances,
  applyResistance,
  computeUnitResistances,
  DEFAULT_SPECIES_RESISTANCES_PATH,
} = require('../services/combat/resistanceEngine');

// Extracted modules — constants + pure helpers (token optimization).
// See sessionConstants.js and sessionHelpers.js for the extracted code.
const {
  GRID_SIZE,
  DEFAULT_HP,
  DEFAULT_AP,
  DEFAULT_MOD,
  DEFAULT_DC,
  DEFAULT_GUARDIA,
  DEFAULT_INITIATIVE,
  DEFAULT_FACING,
  VALID_FACINGS,
  JOB_INITIATIVE,
  JOB_STATS,
  ASSIST_WINDOW_TURNS,
} = require('./sessionConstants');
const {
  rollD20,
  clampPosition,
  normaliseUnit,
  buildDefaultUnits,
  normaliseUnitsPayload,
  resolveAttack,
  timestampStamp,
  publicSessionView,
  buildTurnOrder,
  nextUnitId,
  manhattanDistance,
  pickLowestHpEnemy,
  stepTowards,
  isBackstab,
  facingFromMove,
  predictCombat,
} = require('./sessionHelpers');
const { createRoundBridge } = require('./sessionRoundBridge');

// ADR-2026-04-16: round-based combat model migration. PR 2 di N —
// endpoint stubs dietro feature flag USE_ROUND_MODEL. Il modulo e'
// completamente isolato (PR #1387), esposto qui solo come dipendenza
// delle nuove route /declare-intent, /clear-intent/:id, /commit-round,
// /resolve-round. Il flusso legacy (/action, /turn/end) e' intatto.
const {
  createRoundOrchestrator,
  resolveRound: resolveRoundPure,
  PHASE_PLANNING,
  PHASE_COMMITTED,
  PHASE_RESOLVED,
} = require('../services/roundOrchestrator');

// Feature flag: l'intera superficie round-based e' disabilitata se
// Constants + pure helpers extracted to sessionConstants.js + sessionHelpers.js
// (imported above). Only createSessionRouter closure remains inline.

function createSessionRouter(options = {}) {
  const router = Router();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const logsDir = options.logsDir || path.join(repoRoot, 'logs');
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const traitRegistry = options.traitRegistry || loadActiveTraitRegistry();
  const fairnessConfig = options.fairnessConfig || loadFairnessConfig();
  const telemetryConfig = options.telemetryConfig || loadTelemetryConfig();
  // M6-#1: species resistances data caricato una volta a session-router init.
  // Override path via env GAME_SPECIES_RESISTANCES_PATH o options.
  // Failure soft: null se file mancante → no channel resistance applicata.
  let speciesResistancesData = null;
  try {
    const srPath =
      options.speciesResistancesPath ||
      process.env.GAME_SPECIES_RESISTANCES_PATH ||
      DEFAULT_SPECIES_RESISTANCES_PATH;
    speciesResistancesData = loadSpeciesResistances(srPath);
  } catch (err) {
    console.warn(
      `[session] species_resistances.yaml non caricato (${err.message}). Channel resistance disabilitata.`,
    );
  }

  const sessions = new Map();
  let activeSessionId = null;

  function newSessionId() {
    return crypto.randomUUID();
  }

  function resolveSession(rawId) {
    const sessionId = rawId || activeSessionId;
    if (!sessionId) {
      return {
        error: {
          status: 400,
          body: { error: 'Nessuna sessione attiva. Chiama prima POST /api/session/start' },
        },
      };
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return { error: { status: 404, body: { error: `Sessione ${sessionId} non trovata` } } };
    }
    return { session };
  }

  async function persistEvents(session) {
    if (!session.logFilePath) return;
    await fs.mkdir(path.dirname(session.logFilePath), { recursive: true });
    await fs.writeFile(session.logFilePath, `${JSON.stringify(session.events, null, 2)}\n`, 'utf8');
  }

  async function appendEvent(session, event) {
    // SPRINT_003 fase 0: action_index monotono per-sessione, utile per
    // ordinare deterministicamente gli eventi in VC scoring senza
    // dipendere dal timestamp (che puo' avere granularita' ms uguali).
    event.action_index = session.action_counter++;
    // B4 pattern: distingue azioni player da trigger automatici sistema
    // (bleed tick, status expiry, kill check). Default false.
    if (event.automatic === undefined) event.automatic = false;
    session.events.push(event);
    await persistEvents(session);
  }

  // SPRINT_021: Parata reattiva — design doc 10-SISTEMA_TATTICO.md riga 20.
  // Quando un target viene colpito, se ha guardia > 0 e non e' stunned,
  // tira un d20 reattivo. Successo se d20 + guardia >= PARRY_DC.
  // Effetto: damage −1 (minimo 0) + +1 PT difensivo tracciato.
  // Guardia decrementa di 1 ogni parata riuscita (mitigazione cumulativa).
  const PARRY_DC = 12;
  function rollParry(target) {
    if (!target || target.hp <= 0) return null;
    const guardia = Number(target.guardia) || 0;
    if (guardia <= 0) return null;
    // Target stordito non puo' parare
    if (target.status && Number(target.status.stunned) > 0) return null;
    const die = Math.floor(rng() * 20) + 1;
    const total = die + guardia;
    const success = total >= PARRY_DC;
    return {
      die,
      guardia_used: guardia,
      total,
      dc: PARRY_DC,
      success,
      damage_delta: success ? -1 : 0,
      pt_defensive: success ? 1 : 0,
    };
  }

  function performAttack(session, actor, target) {
    const result = resolveAttack({ actor, target, rng });
    const evaluation = evaluateAttackTraits({
      registry: traitRegistry,
      actor,
      target,
      attackResult: result,
    });
    let damageDealt = 0;
    let killOccurred = false;
    let adjacencyBonus = 0;
    let rageBonus = 0;
    let backstabBonus = 0;
    let wasBackstab = false;
    let panicTriggered = false;
    let parryResult = null;
    let interceptResult = null;
    if (result.hit) {
      const baseDamage = 1 + result.pt;
      // SPRINT_007 fase 1 (issue #4): bonus damage +1 quando l'attaccante
      // e' strettamente adiacente al bersaglio (Manhattan == 1). Incentiva
      // la scelta tattica di entrare in mischia anche se skirmisher/ranger
      // hanno range superiore.
      const attackDist = manhattanDistance(actor.position, target.position);
      if (attackDist === 1) {
        adjacencyBonus = 1;
      }
      // SPRINT_013 (issue #10): bonus rage — se l'attaccante e' in stato
      // rage, +1 damage in aggiunta al bonus adiacenza.
      if (actor.status && Number(actor.status.rage) > 0) {
        rageBonus = 1;
      }
      // SPRINT_022: bonus backstab — se l'actor attacca dalle spalle del
      // target (posizione dietro il suo facing), +1 damage. Cumulativo con
      // adjacency e rage. Inoltre: un backstab BYPASSA la parata (sorpresa).
      wasBackstab = isBackstab(actor, target);
      if (wasBackstab) {
        backstabBonus = 1;
      }
      // SPRINT_021: parata reattiva. SPRINT_022: saltata se backstab.
      parryResult = wasBackstab ? null : rollParry(target);
      const parryDelta = parryResult && parryResult.success ? parryResult.damage_delta : 0;
      const adjusted =
        baseDamage +
        evaluation.damage_modifier +
        adjacencyBonus +
        rageBonus +
        backstabBonus +
        parryDelta;
      damageDealt = Math.max(0, adjusted);
      // M6-#1 (ADR-2026-04-19): applica channel resistance post damage.
      // Resolve target.resistances lazy: computa da resistance_archetype +
      // trait_ids al primo hit (cache su target._resistances).
      // Channel da action.channel (client-provided) o default "fisico".
      // Se speciesResistancesData null (file mancante) → no-op.
      if (speciesResistancesData && damageDealt > 0) {
        if (!Array.isArray(target._resistances)) {
          const traitResists = [];
          for (const tid of Array.isArray(target.traits) ? target.traits : []) {
            const entry = traitRegistry && traitRegistry[tid];
            if (entry && Array.isArray(entry.resistances)) {
              for (const r of entry.resistances) traitResists.push(r);
            }
          }
          target._resistances = computeUnitResistances(
            target.resistance_archetype || null,
            speciesResistancesData,
            traitResists,
          );
        }
        // M6-#1 hotfix: `action` non in scope di performAttack(session, actor, target).
        // Bug merged #1639 causava ReferenceError silenzioso su ogni attack
        // (evidence: batch iter2 0 damage/0 win su 10 run). Default "fisico"
        // hardcoded. Channel routing dinamico via action/ability = M6-#1b
        // follow-up refactor firma.
        const channel = 'fisico';
        damageDealt = applyResistance(damageDealt, target._resistances, channel);
      }
      // Consuma guardia solo se parata riuscita (mitigazione cumulativa)
      if (parryResult && parryResult.success) {
        target.guardia = Math.max(0, Number(target.guardia) - 1);
      }
      // Ability shield (energy_barrier): assorbi damage da target.shield_hp
      // prima di applicarlo a HP. Status target.status.shield_buff tracking
      // duration; al decay roundBridge azzera shield_hp.
      if (Number(target.shield_hp) > 0 && damageDealt > 0) {
        const absorbed = Math.min(Number(target.shield_hp), damageDealt);
        target.shield_hp = Math.max(0, Number(target.shield_hp) - absorbed);
        damageDealt = Math.max(0, damageDealt - absorbed);
        target.shield_absorbed_last = absorbed;
      }
      // SPRINT_003 fase 0: traccia damage_taken cumulativo per unita'.
      // Lo stato e' in memoria (non nel log) — VC scoring lo ricalcola
      // dagli eventi per restare stateless.
      session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + damageDealt;
      target.hp = Math.max(0, target.hp - damageDealt);
      if (target.hp === 0) {
        killOccurred = true;
      }
      // iter4 reaction engine: intercept reroute damage da target a alleato
      // adiacente con `intercept` armed. Restore target.hp + transfer to interceptor.
      if (damageDealt > 0) {
        interceptResult = reactionEngine.triggerOnDamage(session, actor, target, damageDealt);
        if (interceptResult) {
          killOccurred = false; // target survived
          panicTriggered = false; // panic non si applica se danno deviato
        }
      }
      // SPRINT_013 (issue #10): trigger panic nel target se subisce un
      // colpo critico (MoS >= 8). Il target non e' ancora morto (target.hp
      // potrebbe essere a 0 ma panic su un'unita' KO e' innocuo). Applica
      // 2 turni di panic.
      if (result.mos >= 8 && target.status && target.hp > 0) {
        target.status.panic = Math.max(Number(target.status.panic) || 0, 2);
        panicTriggered = true;
      }
    }

    // SPRINT_018: valuta i trait di tipo apply_status (ferocia, intimidatore,
    // stordimento) DOPO l'applicazione del danno, cosi' i trigger possono
    // dipendere da killOccurred. Il risultato muta actor.status /
    // target.status (se vivi) e i trait_effects del log.
    let statusApplies = [];
    if (result.hit) {
      const statusEval = evaluateStatusTraits({
        registry: traitRegistry,
        actor,
        target,
        attackResult: result,
        killOccurred,
      });
      // Merge dei trait_effects di status nel risultato evaluation
      if (Array.isArray(statusEval.trait_effects)) {
        evaluation.trait_effects = (evaluation.trait_effects || []).concat(
          statusEval.trait_effects,
        );
      }
      statusApplies = statusEval.status_applies || [];
      for (const s of statusApplies) {
        const unit = s.target_side === 'actor' ? actor : target;
        if (!unit || unit.hp <= 0 || !unit.status) continue;
        const current = Number(unit.status[s.stato]) || 0;
        unit.status[s.stato] = Math.max(current, s.turns);
      }
    }

    return {
      result,
      evaluation,
      damageDealt,
      killOccurred,
      adjacencyBonus,
      rageBonus,
      backstabBonus,
      wasBackstab,
      panicTriggered,
      status_applies: statusApplies,
      parry: parryResult,
      intercept: interceptResult,
    };
  }

  async function emitKillAndAssists(session, killer, target, attackEvent) {
    // SPRINT_003 fase 0: emette un evento `kill` + 0..N eventi `assist`
    // dopo un attacco che porta target.hp a 0. Gli assist vengono dati
    // alle unita' che hanno inflitto >=1 damage_dealt al target nella
    // finestra di ASSIST_WINDOW_TURNS turni precedenti (escluso killer).
    const killTurn = session.turn;
    const assistorIds = new Set();
    // Parti da -2 perche' -1 e' l'evento attack appena appeso.
    for (let i = session.events.length - 2; i >= 0; i -= 1) {
      const ev = session.events[i];
      if (!ev || typeof ev.turn !== 'number') continue;
      if (killTurn - ev.turn > ASSIST_WINDOW_TURNS) break;
      if (ev.action_type !== 'attack') continue;
      if (ev.target_id !== target.id) continue;
      if (ev.result !== 'hit') continue;
      if (Number(ev.damage_dealt) < 1) continue;
      if (ev.actor_id === killer.id) continue;
      if (
        attackEvent.ia_controlled_unit &&
        ev.ia_controlled_unit === attackEvent.ia_controlled_unit
      ) {
        // Evento IA precedente dello stesso unit controllato dal sistema.
        continue;
      }
      assistorIds.add(ev.actor_id);
    }

    const killEvent = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      action_type: 'kill',
      automatic: true,
      actor_id: attackEvent.actor_id, // puo' essere 'sistema' per IA
      actor_species: killer.species,
      actor_job: killer.job,
      target_id: target.id,
      turn: killTurn,
      killing_blow: {
        die: attackEvent.die,
        roll: attackEvent.roll,
        mos: attackEvent.mos,
        pt: attackEvent.pt,
        damage_dealt: attackEvent.damage_dealt,
      },
    };
    if (attackEvent.ia_rule) killEvent.ia_rule = attackEvent.ia_rule;
    if (attackEvent.ia_controlled_unit)
      killEvent.ia_controlled_unit = attackEvent.ia_controlled_unit;
    await appendEvent(session, killEvent);

    for (const assistorId of assistorIds) {
      const assistUnit = session.units.find((u) => u.id === assistorId);
      const assistEvent = {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'assist',
        actor_id: assistorId,
        actor_species: assistUnit?.species || 'unknown',
        actor_job: assistUnit?.job || 'unknown',
        target_id: target.id,
        killer_id: attackEvent.actor_id,
        turn: killTurn,
        window_turns: ASSIST_WINDOW_TURNS,
      };
      await appendEvent(session, assistEvent);
    }
  }

  function buildAttackEvent({
    session,
    actor,
    target,
    result,
    evaluation,
    damageDealt,
    hpBefore,
    targetPositionAtAttack,
  }) {
    return {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'attack',
      target_id: target.id,
      // SPRINT_003 fase 0: turn + ap_spent + target_position_at_attack
      turn: session.turn,
      ap_spent: 1,
      target_position_at_attack: targetPositionAtAttack || { ...target.position },
      die: result.die,
      roll: result.roll,
      dc: result.dc,
      mos: result.mos,
      result: result.hit ? 'hit' : 'miss',
      pt: result.pt,
      damage_dealt: damageDealt,
      trait_effects: evaluation.trait_effects,
      target_hp_before: hpBefore,
      target_hp_after: target.hp,
      position_from: { ...actor.position },
      position_to: { ...actor.position },
    };
  }

  function buildMoveEvent({ session, actor, positionFrom }) {
    // SPRINT_008 (issue #7): ap_spent = distanza Manhattan reale del move,
    // non piu' flat 1. Usato dal log + dalla telemetria per capire il
    // costo effettivo.
    const dist = manhattanDistance(positionFrom, actor.position);
    return {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'move',
      turn: session.turn,
      ap_spent: dist || 1,
      position_from: positionFrom,
      position_to: { ...actor.position },
      trait_effects: [],
    };
  }

  // SPRINT_010 (issue #2): runSistemaTurn e' estratto in services/ai/sistemaTurnRunner.js.
  // Qui lo costruiamo via factory iniettando le dipendenze del router
  // (performAttack, buildAttackEvent, buildMoveEvent, emitKillAndAssists,
  // appendEvent, pickLowestHpEnemy, manhattanDistance, stepTowards).
  // Policy decisionale (selectAiPolicy, stepAway) vive in services/ai/policy.js.
  const runSistemaTurn = createSistemaTurnRunner({
    pickLowestHpEnemy,
    manhattanDistance,
    stepTowards,
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    emitKillAndAssists,
    appendEvent,
    gridSize: GRID_SIZE,
  });

  // PR 5 (ADR-2026-04-16 M5b): declareSistemaIntents factory wirato al
  // closure session.js. Produce intents pure (nessuna mutazione) per
  // tutte le unita' SIS-controlled. Usato solo quando USE_ROUND_MODEL
  // e' attivo nel wrapper /turn/end legacy.
  //
  // ADR-2026-04-17 Q-001 T3.1: ai_profiles.yaml caricato al boot. Flag
  // `use_utility_brain` per-profile controlla attivazione Utility AI
  // (gradual rollout). Default global `useUtilityAi=false` fallback.
  const aiProfiles = loadAiProfiles();
  const declareSistemaIntents = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: GRID_SIZE,
    aiProfiles,
  });

  // Round bridge factory — all round-model functions live in sessionRoundBridge.js.
  // Orchestrator created here (needs rng from closure) with no-op resolveAction;
  // the bridge injects real resolveAction per-request via resolveRoundPure.
  const roundOrchestrator = createRoundOrchestrator({
    resolveAction: (state) => ({
      nextState: JSON.parse(JSON.stringify(state)),
      turnLogEntry: { damage_applied: 0, healing_applied: 0 },
    }),
    defaultRng: rng,
  });
  const roundBridge = createRoundBridge({
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    emitKillAndAssists,
    appendEvent,
    persistEvents,
    consumeCapPt,
    declareSistemaIntents,
    roundOrchestrator,
    rng,
    resolveSession,
    manhattanDistance,
    gridSize: GRID_SIZE,
    defaultAttackRange: DEFAULT_ATTACK_RANGE,
  });
  const { handleLegacyAttackViaRound, handleTurnEndViaRound } = roundBridge;

  // FRICTION #4 MVP (playtest 2026-04-17): ability executor.
  // POST /api/session/action con action_type='ability' → executor dispatcher
  // (move_attack, attack_move, buff, heal; altri effect_type = 501).
  const abilityExecutor = createAbilityExecutor({
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    appendEvent,
    manhattanDistance,
    gridSize: GRID_SIZE,
    rng,
  });

  // SPRINT_020: helper riutilizzabile che avanza attraverso tutti i turni
  // IA non-player fino a fermarsi su un player vivo (o nessuno). Ritorna
  // { iaActions, bleedingEvents } accumulati dall'intera catena. Usato
  // sia da /start (se la prima unita' e' un SIS) sia da /turn/end (dopo
  // che il player ha finito).
  async function advanceThroughAiTurns(session) {
    const iaActions = [];
    const bleedingEvents = [];

    const applyBleeding = async (unit) => {
      if (!unit || !unit.status || unit.hp <= 0) return;
      const bleedTurns = Number(unit.status.bleeding) || 0;
      if (bleedTurns <= 0) return;
      const dmg = 1;
      const hpBefore = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'bleeding',
        automatic: true,
        actor_id: unit.id,
        actor_species: unit.species,
        actor_job: unit.job,
        target_id: unit.id,
        turn: session.turn,
        damage_dealt: dmg,
        result: 'hit',
        hp_before: hpBefore,
        hp_after: unit.hp,
        bleeding_remaining: bleedTurns - 1,
        trait_effects: [],
      });
      bleedingEvents.push({
        unit_id: unit.id,
        damage: dmg,
        hp_after: unit.hp,
        killed: unit.hp === 0,
      });
    };
    const resetAp = (unit) => {
      if (!unit) return;
      const fractureActive = Number(unit.status?.fracture) > 0;
      unit.ap_remaining = fractureActive ? Math.min(1, unit.ap) : unit.ap;
    };
    const decrement = (unit) => {
      if (!unit || !unit.status) return;
      for (const key of Object.keys(unit.status)) {
        const v = Number(unit.status[key]);
        if (v > 0) unit.status[key] = v - 1;
      }
    };

    let safety = (session.units || []).length + 1;
    while (safety > 0) {
      safety -= 1;
      const actor = session.units.find((u) => u.id === session.active_unit);
      if (!actor || actor.controlled_by !== 'sistema' || actor.hp <= 0) break;
      await applyBleeding(actor);
      if (actor.hp > 0) {
        resetAp(actor);
        const actions = await runSistemaTurn(session);
        if (Array.isArray(actions)) iaActions.push(...actions);
      }
      decrement(actor);
      const nextId = nextUnitId(session);
      session.active_unit = nextId;
      session.turn += 1;
    }

    return { iaActions, bleedingEvents };
  }

  router.post('/start', async (req, res, next) => {
    try {
      const sessionId = newSessionId();
      const now = new Date();
      const logFilePath = path.join(logsDir, `session_${timestampStamp(now)}.json`);
      let units = normaliseUnitsPayload(req.body?.units);

      // Q-001 T2.3 PR-3: applica difficulty profile scaling (opt-in, default normal)
      const requestedProfile =
        typeof req.body?.difficulty_profile === 'string'
          ? req.body.difficulty_profile.trim()
          : 'normal';
      let difficultyProfileMeta = null;
      try {
        const { getDifficultyConfig } = require('../../../services/difficulty/loader');
        const { applyPlayerProfile } = require('../../../services/difficulty/difficultyCalculator');
        const diffCfg = getDifficultyConfig();
        if (diffCfg.player_difficulty_profiles[requestedProfile]) {
          const mockEncounter = {
            waves: [{ units: units.map((u) => ({ species: u.id, count: 1, tier: 'base' })) }],
          };
          const scaled = applyPlayerProfile(mockEncounter, requestedProfile, diffCfg);
          difficultyProfileMeta = scaled._difficultyProfile;

          // Applica enemy_hp_multiplier + player_hp_multiplier a units SIS vs player
          const hpMultEnemy = difficultyProfileMeta.enemy_hp_multiplier || 1.0;
          const hpMultPlayer = difficultyProfileMeta.player_hp_multiplier || 1.0;
          units = units.map((u) => {
            if (!u) return u;
            const isSis = u.controlled_by === 'sistema';
            const mult = isSis ? hpMultEnemy : hpMultPlayer;
            if (mult === 1.0) return u;
            const newMax = Math.round(Number(u.max_hp || u.hp || 10) * mult);
            return { ...u, hp: newMax, max_hp: newMax };
          });
        }
      } catch {
        // best-effort: se config non carica, skip profile scaling
      }

      // ADR-2026-04-17: grid auto-scale basato su deployed PG count (party.yaml)
      let gridW = GRID_SIZE;
      let gridH = GRID_SIZE;
      try {
        const { gridSizeFor, getModulation } = require('../../../services/party/loader');
        const requestedModulation = req.body?.modulation;
        let deployedCount = units.filter((u) => u && u.controlled_by === 'player').length;
        if (requestedModulation) {
          const preset = getModulation(requestedModulation);
          if (preset) deployedCount = preset.deployed;
        }
        const [gw, gh] = gridSizeFor(deployedCount);
        gridW = gw;
        gridH = gh;
      } catch {
        // fallback GRID_SIZE default
      }

      // SPRINT_020: calcola turn_order via iniziativa descending.
      const turnOrder = buildTurnOrder(units);
      const firstActiveId = turnOrder[0] || null;
      // Telemetry B (TKT-01/02): scenario_id + pressure_start persistiti per
      // abilitare sweep riproducibile via script (docs/playtest/2026-04-17-*).
      const scenarioId = req.body?.scenario_id ?? null;
      const pressureStart = Number.isFinite(Number(req.body?.pressure_start))
        ? Number(req.body.pressure_start)
        : null;
      const session = {
        session_id: sessionId,
        scenario_id: scenarioId,
        pressure_start: pressureStart,
        pressure: pressureStart,
        turn: 1,
        active_unit: firstActiveId,
        turn_order: turnOrder,
        turn_index: 0,
        units,
        // Q-001 T2.4: snapshot iniziale per replay (deep copy, immutable)
        units_snapshot_initial: JSON.parse(JSON.stringify(units)),
        grid: { width: gridW, height: gridH },
        logFilePath,
        events: [],
        created_at: now.toISOString(),
        // SPRINT_003 fase 0: contatori in-memory per log esteso + VC.
        action_counter: 0,
        damage_taken: {},
        // SPRINT_003 fase 1: fairness cap PT per-sessione.
        cap_pt_used: 0,
        cap_pt_max: fairnessConfig.cap_pt_max,
        // AI War pattern (2026-04-17): single escalation dial 0..100.
        // Gate SIS intent pool + reinforcement budget via computeSistemaTier().
        // Updated da roundOrchestrator/session handlers su victory/KO events.
        // Scenario può impostare pressure_start (tutorial_02=25, 03=50, 04=75, 05=95).
        sistema_pressure: Math.max(0, Math.min(100, Number(req.body?.sistema_pressure_start) || 0)),
        // Hazard tiles dal scenario (es. enc_tutorial_03 fumarole).
        // Lista {x, y, damage, type}. Applicato a fine turno via
        // applyHazardDamage in handleTurnEndViaRound.
        hazard_tiles: Array.isArray(req.body?.hazard_tiles) ? req.body.hazard_tiles : [],
        // Q-001 T2.3: difficulty profile scaling metadata (null se profile invalid)
        _difficultyProfile: difficultyProfileMeta,
        // ADR-2026-04-19 + 04-20: encounter payload per reinforcementSpawner + objectiveEvaluator.
        // Feature flag OFF default: se undefined, entrambi moduli ritornano no-op.
        encounter: req.body?.encounter ?? null,
      };
      sessions.set(sessionId, session);
      activeSessionId = sessionId;
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(logFilePath, '[]\n', 'utf8');
      await appendEvent(session, {
        action_type: 'session_start',
        turn: 0,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: 'ok',
        position_from: null,
        position_to: null,
        scenario_id: scenarioId,
        pressure: pressureStart,
        units_count: units.length,
        player_count: units.filter((u) => u.controlled_by === 'player').length,
        sistema_count: units.filter((u) => u.controlled_by === 'sistema').length,
        automatic: true,
      });
      // SPRINT_020: se la prima unita' in ordine di iniziativa e' un SIS,
      // esegui immediatamente i suoi turni (e di eventuali successivi SIS)
      // fino a fermarsi al primo player. Il frontend riceve gia' lo stato
      // post-AI-phase, pronto per l'input del giocatore.
      const pre = await advanceThroughAiTurns(session);
      res.json({
        session_id: sessionId,
        state: publicSessionView(session),
        log_file: logFilePath,
        // Se e' scattata la fase IA iniziale (raro ma possibile), esponila
        // cosi' il frontend puo' loggare gli eventi in ordine.
        ia_actions: pre.iaActions,
        side_effects: pre.bleedingEvents,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/state', (req, res) => {
    const { error, session } = resolveSession(req.query?.session_id);
    if (error) return res.status(error.status).json(error.body);
    res.json(publicSessionView(session));
  });

  // Halfway lesson (decision surfacing): pre-combat prediction.
  // Ritorna hit%, crit%, fumble%, avg MoS, avg PT per un attacco
  // actor → target senza eseguirlo. Il client mostra questi numeri
  // per rendere la tattica leggibile (P1).
  router.post('/predict', (req, res) => {
    const body = req.body || {};
    const { error, session } = resolveSession(body.session_id);
    if (error) return res.status(error.status).json(error.body);

    const actor = session.units.find((u) => u.id === body.actor_id);
    if (!actor) {
      return res.status(400).json({ error: `actor_id "${body.actor_id}" non trovato` });
    }
    const target = session.units.find((u) => u.id === body.target_id);
    if (!target) {
      return res.status(400).json({ error: `target_id "${body.target_id}" non trovato` });
    }

    const prediction = predictCombat(actor, target);
    res.json({
      actor_id: actor.id,
      target_id: target.id,
      ...prediction,
    });
  });

  router.post('/action', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

      const actor = session.units.find((u) => u.id === body.actor_id);
      if (!actor) {
        return res.status(400).json({ error: `actor_id "${body.actor_id}" non trovato` });
      }

      // SPRINT_003 fase 1: fairness cap PT hard enforcement.
      // Se il body include cost.cap_pt >= 1, verifica che non superi
      // session.cap_pt_max. Rifiuta con 400 senza mutare stato ne'
      // scrivere eventi (FAIRNESS_CAP_001 in engine/sistema_rules.md).
      const requestedCapPt = Number(body.cost?.cap_pt || 0);
      const capCheck = checkCapPtBudget(session, requestedCapPt, fairnessConfig);
      if (!capCheck.ok) {
        return res.status(400).json({
          error: 'cap_pt_max exceeded',
          cap_pt_used: capCheck.used,
          cap_pt_max: capCheck.max,
          requested: capCheck.requested,
        });
      }

      const actionType = body.action_type;

      if (actionType === 'attack') {
        const targetId = body.target_id || body.target;
        const target = session.units.find((u) => u.id === targetId);
        if (!target) {
          return res.status(400).json({ error: `target "${targetId}" non trovato` });
        }
        if ((target.hp ?? 0) <= 0) {
          return res
            .status(400)
            .json({ error: `target "${targetId}" gia' abbattuto (hp ${target.hp ?? 0})` });
        }
        if ((actor.ap_remaining ?? 0) < 1) {
          return res
            .status(400)
            .json({ error: 'AP insufficienti per attaccare (termina il turno)' });
        }
        const attackDist = manhattanDistance(actor.position, target.position);
        const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
        if (attackDist > range) {
          return res.status(400).json({
            error: `bersaglio fuori range (distanza ${attackDist} > range ${range})`,
          });
        }

        // M17 (ADR-2026-04-16): round flow is the only attack path.
        // Legacy sequential attack code removed. handleLegacyAttackViaRound
        // executes performAttack inside a round cycle (planning → commit →
        // resolve) and returns a legacy-compat response shape.
        const wrapped = await handleLegacyAttackViaRound({
          session,
          actor,
          target,
          requestedCapPt,
        });
        // iter6 follow-up #3: aggro_warning per player units. Player con
        // status.aggro_locked > 0 + aggro_source attivo che attacca un target
        // diverso da source riceve warning informativo (no enforcement,
        // libertà tattica preservata). PG taunted = "dovresti attaccare X"
        // ma può comunque scegliere altro.
        if (
          actor.controlled_by === 'player' &&
          Number(actor.status?.aggro_locked) > 0 &&
          actor.aggro_source &&
          actor.aggro_source !== target.id
        ) {
          wrapped.aggro_warning = {
            actor_id: actor.id,
            forced_target: actor.aggro_source,
            attacked_target: target.id,
            note: 'taunted: ignoring forced target (no enforcement on player)',
          };
        }
        return res.json(wrapped);
      }

      if (actionType === 'move') {
        const dest = body.position;
        if (
          !dest ||
          typeof dest.x !== 'number' ||
          typeof dest.y !== 'number' ||
          !Number.isFinite(dest.x) ||
          !Number.isFinite(dest.y)
        ) {
          return res.status(400).json({ error: 'position { x, y } numerica richiesta per move' });
        }
        const _gw = session.grid?.width || GRID_SIZE;
        const _gh = session.grid?.height || GRID_SIZE;
        if (dest.x < 0 || dest.x >= _gw || dest.y < 0 || dest.y >= _gh) {
          return res.status(400).json({ error: `posizione fuori griglia (${_gw}x${_gh})` });
        }
        if ((actor.ap_remaining ?? 0) < 1) {
          return res
            .status(400)
            .json({ error: 'AP insufficienti per muoversi (termina il turno)' });
        }
        const dist = manhattanDistance(actor.position, dest);
        // SPRINT_008 (issue #7): AP cost per move = distanza Manhattan,
        // non piu' flat 1. Muoverti per N celle costa N AP. Cosi' con
        // ap=2 hai veramente un trade-off: o 1 cella + 1 attacco, o 2 celle
        // e basta, o 2 attacchi. Il validation e' ora contro ap_remaining
        // anziche' actor.ap (max) — cosi' possiamo fare piu' move nello
        // stesso turno solo se abbiamo AP residui sufficienti.
        if (dist > (actor.ap_remaining ?? 0)) {
          return res.status(400).json({
            error: `AP insufficienti per muoversi di ${dist} celle (ap residui: ${actor.ap_remaining ?? 0})`,
          });
        }
        // SPRINT_005 fase 1: niente overlap. Una cella occupata da un'altra
        // unita' viva blocca il movimento (rifiuto 400, niente consumo AP).
        const blocker = session.units.find(
          (u) =>
            u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
        );
        if (blocker) {
          return res
            .status(400)
            .json({ error: `casella (${dest.x},${dest.y}) occupata da ${blocker.id}` });
        }
        actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - dist);
        const positionFrom = { ...actor.position };
        actor.position = { x: dest.x, y: dest.y };
        // SPRINT_022: auto-facing sul movimento. L'unita' "guarda" nella
        // direzione in cui si e' mossa. Se dx==0 e dy==0 (impossibile
        // dato il check dist > 0) non cambia niente.
        const newFacing = facingFromMove(positionFrom, actor.position);
        if (newFacing) actor.facing = newFacing;
        const event = buildMoveEvent({ session, actor, positionFrom });
        // SPRINT_003 fase 1: il costo cap_pt si applica anche al move
        // se passato nel body (utile per abilita' movimento potenziato).
        if (requestedCapPt > 0) {
          event.cost = { cap_pt: requestedCapPt };
          consumeCapPt(session, requestedCapPt);
        }
        await appendEvent(session, event);
        // iter4 reaction engine: overwatch_shot fires se enemy con reaction
        // armed ha il mover in attack_range post-move.
        const overwatchResult = reactionEngine.triggerOnMove(
          session,
          actor,
          positionFrom,
          (overwatchUnit, mover) => performAttack(session, overwatchUnit, mover),
        );
        if (overwatchResult) {
          await appendEvent(session, {
            ts: new Date().toISOString(),
            session_id: session.session_id,
            actor_id: overwatchResult.overwatch_id,
            action_type: 'reaction_trigger',
            ability_id: overwatchResult.ability_id,
            trigger: 'enemy_moves_in_range',
            target_id: overwatchResult.mover_id,
            turn: session.turn,
            from_position: overwatchResult.from_position,
            to_position: overwatchResult.to_position,
            die: overwatchResult.die,
            roll: overwatchResult.roll,
            mos: overwatchResult.mos,
            result: overwatchResult.hit ? 'hit' : 'miss',
            damage_dealt: overwatchResult.damage_dealt,
            mover_hp_before: overwatchResult.mover_hp_before,
            mover_hp_after: overwatchResult.mover_hp_after,
            mover_killed: overwatchResult.mover_killed,
            damage_step_mod: overwatchResult.damage_step_mod,
            trait_effects: [],
          });
        }
        return res.json({
          ok: true,
          actor_id: actor.id,
          position: actor.position,
          position_from: positionFrom,
          facing: actor.facing,
          cap_pt_used: session.cap_pt_used,
          cap_pt_max: session.cap_pt_max,
          overwatch: overwatchResult,
          state: publicSessionView(session),
        });
      }

      // SPRINT_022: nuova azione 'turn' per ruotare senza muoversi.
      // Costa 0 AP (libera, come reazione) — cosi' il giocatore puo'
      // riposizionarsi visivamente a fine turno per prevenire backstab
      // senza pagare un costo meccanico.
      if (actionType === 'turn') {
        const rawFacing = body.facing ? String(body.facing).toUpperCase() : null;
        if (!VALID_FACINGS.has(rawFacing)) {
          return res.status(400).json({
            error: `facing invalido: "${body.facing}". Atteso N/S/E/W`,
          });
        }
        const oldFacing = actor.facing;
        actor.facing = rawFacing;
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: actor.id,
          actor_species: actor.species,
          actor_job: actor.job,
          action_type: 'turn',
          turn: session.turn,
          ap_spent: 0,
          facing_from: oldFacing,
          facing_to: rawFacing,
          trait_effects: [],
        });
        return res.json({
          ok: true,
          actor_id: actor.id,
          facing: actor.facing,
          facing_from: oldFacing,
          state: publicSessionView(session),
        });
      }

      if (actionType === 'ability') {
        const result = await abilityExecutor.executeAbility({ session, actor, body });
        const payload = { ...result.body };
        if (result.status === 200) {
          payload.state = publicSessionView(session);
          payload.cap_pt_used = session.cap_pt_used;
          payload.cap_pt_max = session.cap_pt_max;
        }
        return res.status(result.status).json(payload);
      }

      return res.status(400).json({
        error: `action_type sconosciuto: "${actionType}" (atteso "attack", "move", "turn" o "ability")`,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/turn/end', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

      // M17 (ADR-2026-04-16): round flow is the only /turn/end path.
      // Legacy sequential turn code removed. handleTurnEndViaRound
      // handles bleeding, AP reset, status decay, declareSistemaIntents,
      // commit, resolve, and returns legacy-compat response shape.
      const wrapped = await handleTurnEndViaRound(session);
      return res.json(wrapped);
    } catch (err) {
      next(err);
    }
  });

  // ───────────────────────────────────────────────────────────────
  // POST /round/execute — batch round resolver (Fase 1 SoT-alignment).
  //
  // Accetta TUTTI gli intents player di un round + opzionale AI auto-declare
  // + risolve in una singola richiesta. Allineato al round model canonico
  // (ADR-2026-04-15): internamente usa gli stessi dispatcher di /action
  // (performAttack, abilityExecutor, move handler) in ordine di dichiarazione,
  // seguito da AI turn end se ai_auto=true.
  //
  // Body:
  //   {
  //     session_id: string,
  //     player_intents: [
  //       { actor_id, action: { type: 'attack'|'move'|'ability', ...} },
  //       ...
  //     ],
  //     ai_auto?: boolean (default true),
  //     preview_only?: boolean (default false)  // MVP: not implemented, reserved
  //   }
  //
  // AP budget validato cumulativamente per actor PRIMA del dispatch:
  // Σ ap_cost ≤ ap_remaining → 400 violations se superato.
  // ───────────────────────────────────────────────────────────────
  function estimateApCost(action, actor) {
    if (!action) return 0;
    if (action.type === 'attack') return 1;
    if (action.type === 'move') {
      const dest = action.position;
      if (!dest || !actor || !actor.position) return 1;
      return manhattanDistance(actor.position, dest);
    }
    if (action.type === 'ability') {
      try {
        const { findAbility } = require('../services/abilityExecutor');
        const ab = findAbility(action.ability_id);
        return ab ? Number(ab.cost_ap || 0) : 0;
      } catch {
        return 0;
      }
    }
    if (action.type === 'turn' || action.type === 'skip') return 0;
    return 0;
  }

  // Canonical priority (ADR-2026-04-15):
  // priority = unit.initiative + action_speed - status_penalty
  // action_speed: defend/parry +2, attack 0, ability -1, move -2
  // status_penalty: panic 2×intensity, disorient 1×intensity
  const ACTION_SPEED_TABLE = {
    defend: 2,
    parry: 2,
    attack: 0,
    ability: -1,
    heal: -1,
    move: -2,
    turn: 0,
    skip: 0,
  };

  function computeIntentPriority(actor, action) {
    const base = Number(actor?.initiative || 0);
    const speed =
      typeof ACTION_SPEED_TABLE[action?.type] === 'number' ? ACTION_SPEED_TABLE[action.type] : 0;
    let penalty = 0;
    if (actor?.status) {
      const panic = Number(actor.status.panic) || 0;
      const disorient = Number(actor.status.disorient) || 0;
      penalty = panic * 2 + disorient;
    }
    return base + speed - penalty;
  }

  router.post('/round/execute', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

      const playerIntents = Array.isArray(body.player_intents) ? body.player_intents : [];
      const aiAuto = body.ai_auto !== false;
      const usePriorityQueue = body.priority_queue === true;

      // Validazione intent + AP cumulativo per actor.
      const apByUnit = {};
      const violations = [];
      const normalized = [];
      for (let i = 0; i < playerIntents.length; i += 1) {
        const raw = playerIntents[i];
        if (!raw || !raw.actor_id || !raw.action) {
          violations.push({ index: i, error: 'intent richiede actor_id + action' });
          continue;
        }
        const actor = session.units.find((u) => u.id === raw.actor_id);
        if (!actor) {
          violations.push({ index: i, actor_id: raw.actor_id, error: 'actor non trovato' });
          continue;
        }
        if (Number(actor.hp) <= 0) {
          violations.push({
            index: i,
            actor_id: raw.actor_id,
            error: 'actor morto',
          });
          continue;
        }
        const cost = estimateApCost(raw.action, actor);
        apByUnit[raw.actor_id] = (apByUnit[raw.actor_id] || 0) + cost;
        if (apByUnit[raw.actor_id] > Number(actor.ap_remaining ?? actor.ap ?? 0)) {
          violations.push({
            index: i,
            actor_id: raw.actor_id,
            error: `AP budget superato: Σ ${apByUnit[raw.actor_id]} > ${actor.ap_remaining ?? actor.ap ?? 0}`,
            requested: apByUnit[raw.actor_id],
            available: Number(actor.ap_remaining ?? actor.ap ?? 0),
          });
          continue;
        }
        normalized.push({ index: i, actor, raw });
      }
      if (violations.length > 0) {
        return res.status(400).json({
          error: 'AP budget or intent validation failed',
          violations,
        });
      }

      // Canonical priority queue (opt-in via priority_queue: true):
      // - Mescola player intents + AI intents (se ai_auto) in una sola coda
      // - Calcola priority per ogni intent (initiative + action_speed - penalty)
      // - Sort stable: priority desc, originalIdx asc (preserva ordine per-actor)
      // - Dispatch in priority order
      // - End-of-round ticks via handleTurnEndViaRound(ai_auto=false path impossibile,
      //   fallback: skip AI declare by emptying sistema_pending_intents)
      let dispatchQueue = normalized.map((n) => ({
        actor: n.actor,
        raw: n.raw,
        source: 'player',
        priority: computeIntentPriority(n.actor, n.raw.action),
        originalIdx: n.index,
      }));

      if (usePriorityQueue && aiAuto) {
        try {
          const { intents: aiIntents } = declareSistemaIntents(session);
          for (let i = 0; i < aiIntents.length; i += 1) {
            const aiIntent = aiIntents[i];
            const actor = session.units.find((u) => u.id === aiIntent.unit_id);
            if (!actor) continue;
            const actionType = aiIntent.action?.type || 'skip';
            const action =
              actionType === 'move' && aiIntent.action.move_to
                ? { type: 'move', position: aiIntent.action.move_to }
                : actionType === 'attack'
                  ? { type: 'attack', target_id: aiIntent.action.target_id }
                  : { type: actionType };
            dispatchQueue.push({
              actor,
              raw: { actor_id: actor.id, action },
              source: 'ai',
              priority: computeIntentPriority(actor, action),
              originalIdx: 10000 + i,
            });
          }
        } catch (_aiErr) {
          // AI intent generation failed — continue with player only
        }
      }

      if (usePriorityQueue) {
        dispatchQueue.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          if (a.actor.id !== b.actor.id)
            return String(a.actor.id).localeCompare(String(b.actor.id));
          return a.originalIdx - b.originalIdx;
        });
      }

      // Dispatch in declared/priority order.
      const results = [];
      const eventsCountBefore = session.events.length;
      for (const { actor, raw } of dispatchQueue) {
        if (Number(actor.hp) <= 0) {
          results.push({ actor_id: actor.id, skipped: 'actor_dead_mid_round' });
          continue;
        }
        const action = raw.action;
        if (action.type === 'attack') {
          const target = session.units.find((u) => u.id === action.target_id);
          if (!target || Number(target.hp) <= 0) {
            results.push({
              actor_id: actor.id,
              skipped: 'target_dead_or_missing',
              target_id: action.target_id,
            });
            continue;
          }
          const range = Number(actor.attack_range) || DEFAULT_ATTACK_RANGE;
          if (manhattanDistance(actor.position, target.position) > range) {
            results.push({
              actor_id: actor.id,
              skipped: 'target_out_of_range',
              target_id: action.target_id,
            });
            continue;
          }
          const wrapped = await handleLegacyAttackViaRound({
            session,
            actor,
            target,
            requestedCapPt: 0,
          });
          results.push({ actor_id: actor.id, action_type: 'attack', result: wrapped });
        } else if (action.type === 'move') {
          const dest = action.position;
          const _gw2 = session.grid?.width || GRID_SIZE;
          const _gh2 = session.grid?.height || GRID_SIZE;
          if (
            !dest ||
            typeof dest.x !== 'number' ||
            typeof dest.y !== 'number' ||
            dest.x < 0 ||
            dest.x >= _gw2 ||
            dest.y < 0 ||
            dest.y >= _gh2
          ) {
            results.push({ actor_id: actor.id, skipped: 'invalid_position' });
            continue;
          }
          const blocker = session.units.find(
            (u) =>
              u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
          );
          if (blocker) {
            results.push({
              actor_id: actor.id,
              skipped: 'cell_occupied',
              blocker_id: blocker.id,
            });
            continue;
          }
          const dist = manhattanDistance(actor.position, dest);
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - dist);
          const positionFrom = { ...actor.position };
          actor.position = { x: dest.x, y: dest.y };
          const newFacing = facingFromMove(positionFrom, actor.position);
          if (newFacing) actor.facing = newFacing;
          const moveEvent = buildMoveEvent({ session, actor, positionFrom });
          await appendEvent(session, moveEvent);
          const overwatchResult = reactionEngine.triggerOnMove(
            session,
            actor,
            positionFrom,
            (overwatchUnit, mover) => performAttack(session, overwatchUnit, mover),
          );
          if (overwatchResult) {
            await appendEvent(session, {
              ts: new Date().toISOString(),
              session_id: session.session_id,
              actor_id: overwatchResult.overwatch_id,
              action_type: 'reaction_trigger',
              ability_id: overwatchResult.ability_id,
              trigger: 'enemy_moves_in_range',
              target_id: overwatchResult.mover_id,
              turn: session.turn,
              from_position: overwatchResult.from_position,
              to_position: overwatchResult.to_position,
              die: overwatchResult.die,
              roll: overwatchResult.roll,
              mos: overwatchResult.mos,
              result: overwatchResult.hit ? 'hit' : 'miss',
              damage_dealt: overwatchResult.damage_dealt,
              mover_hp_before: overwatchResult.mover_hp_before,
              mover_hp_after: overwatchResult.mover_hp_after,
              mover_killed: overwatchResult.mover_killed,
              damage_step_mod: overwatchResult.damage_step_mod,
              trait_effects: [],
            });
          }
          results.push({
            actor_id: actor.id,
            action_type: 'move',
            result: {
              position_from: positionFrom,
              position_to: { ...actor.position },
              overwatch: overwatchResult,
            },
          });
        } else if (action.type === 'ability') {
          const dispatch = await abilityExecutor.executeAbility({
            session,
            actor,
            body: action,
          });
          results.push({
            actor_id: actor.id,
            action_type: 'ability',
            status: dispatch.status,
            result: dispatch.body,
          });
        } else if (action.type === 'turn') {
          const rawFacing = action.facing ? String(action.facing).toUpperCase() : null;
          if (VALID_FACINGS.has(rawFacing)) {
            actor.facing = rawFacing;
            results.push({ actor_id: actor.id, action_type: 'turn', facing: rawFacing });
          } else {
            results.push({ actor_id: actor.id, skipped: 'invalid_facing' });
          }
        } else if (action.type === 'skip') {
          results.push({ actor_id: actor.id, action_type: 'skip' });
        } else {
          results.push({
            actor_id: actor.id,
            skipped: `unknown action type: ${action.type}`,
          });
        }
      }

      // AI auto-declare: usa handleTurnEndViaRound (bleeding + hazard +
      // status decay + AI intents + commit + resolve).
      // Con priority_queue=true, AI intents sono già dispatched nel queue,
      // quindi saltiamo handleTurnEndViaRound (no double-dispatch).
      let aiResult = null;
      if (aiAuto && !usePriorityQueue) {
        aiResult = await handleTurnEndViaRound(session);
      } else if (usePriorityQueue) {
        // End-of-round ticks minimali: bleeding + status decay + AP reset + turn++.
        // NO AI declare (già fatto via priority queue).
        for (const unit of session.units) {
          if (!unit || Number(unit.hp) <= 0) continue;
          // Bleeding tick
          const bleedTurns = Number(unit.status?.bleeding) || 0;
          if (bleedTurns > 0) {
            unit.hp = Math.max(0, Number(unit.hp) - 1);
            if (session.damage_taken) {
              session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + 1;
            }
          }
          // AP reset
          const fractureActive = Number(unit.status?.fracture) > 0;
          unit.ap_remaining = fractureActive ? Math.min(1, unit.ap) : unit.ap;
          // Status decay + bonus clear
          if (unit.status) {
            for (const key of Object.keys(unit.status)) {
              const v = Number(unit.status[key]);
              if (v > 0) unit.status[key] = v - 1;
            }
            for (const key of Object.keys(unit.status)) {
              if (!key.endsWith('_buff') && !key.endsWith('_debuff')) continue;
              if (Number(unit.status[key]) > 0) continue;
              const stat = key.replace(/_buff$|_debuff$/, '');
              const bonusKey = `${stat}_bonus`;
              if (unit[bonusKey] !== undefined) unit[bonusKey] = 0;
            }
            if (
              unit.status.shield_buff !== undefined &&
              Number(unit.status.shield_buff) <= 0 &&
              unit.shield_hp
            ) {
              unit.shield_hp = 0;
            }
          }
        }
        session.turn += 1;
      }

      const eventsEmitted = session.events.slice(eventsCountBefore);

      return res.json({
        round: session.turn,
        results,
        ai_result: aiResult,
        priority_queue_used: usePriorityQueue,
        events_emitted_count: eventsEmitted.length,
        events: eventsEmitted,
        ap_consumed: apByUnit,
        state: publicSessionView(session),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/end', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);
      // Telemetry B (TKT-03/05): compute outcome + VC snapshot, persist
      // session_end event prima della finalizzazione.
      const sistemaAlive = session.units.filter(
        (u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0,
      ).length;
      const playerAlive = session.units.filter(
        (u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0,
      ).length;
      // ADR-2026-04-20: objective evaluator prende precedenza su elimination
      // fallback quando encounter.objective.type è definito.
      let objectiveFinal = null;
      if (session.encounter && session.encounter.objective) {
        try {
          const { evaluateObjective } = require('../services/combat/objectiveEvaluator');
          objectiveFinal = evaluateObjective(session, session.encounter);
        } catch {
          // best-effort — non blocca fine sessione
        }
      }
      let outcome;
      if (objectiveFinal && objectiveFinal.outcome) {
        outcome = objectiveFinal.outcome;
      } else if (sistemaAlive === 0 && playerAlive > 0) outcome = 'win';
      else if (playerAlive === 0 && sistemaAlive > 0) outcome = 'wipe';
      else if (playerAlive === 0 && sistemaAlive === 0) outcome = 'draw';
      else outcome = 'abandon';
      // VC snapshot + debrief computed pre-delete so response carries final state
      // (harness scripts no longer need a separate GET /:id/vc before /end).
      let vcSnapshot = null;
      let debrief = null;
      try {
        vcSnapshot = buildVcSnapshot(session, telemetryConfig);
        const { computeSessionPE, buildDebriefSummary } = require('../services/rewardEconomy');
        const peResult = computeSessionPE(vcSnapshot, {
          difficulty: session.difficulty || 'standard',
        });
        debrief = buildDebriefSummary(session, vcSnapshot, peResult);
      } catch {
        // vc + debrief are best-effort — don't block session end
      }
      await appendEvent(session, {
        action_type: 'session_end',
        turn: session.turn,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: outcome,
        position_from: null,
        position_to: null,
        scenario_id: session.scenario_id || null,
        outcome,
        pressure_start: session.pressure_start ?? null,
        pressure_end: session.pressure ?? null,
        player_alive: playerAlive,
        sistema_alive: sistemaAlive,
        vc_aggregate: vcSnapshot?.aggregate ?? null,
        vc_mbti: vcSnapshot?.mbti ?? null,
        vc_ennea: vcSnapshot?.ennea ?? null,
        automatic: true,
      });
      await persistEvents(session);
      const eventsCount = session.events.length;
      const logFile = session.logFilePath;
      sessions.delete(session.session_id);
      if (activeSessionId === session.session_id) {
        activeSessionId = null;
      }
      res.json({
        session_id: session.session_id,
        finalized: true,
        log_file: logFile,
        events_count: eventsCount,
        outcome,
        objective_state: objectiveFinal,
        vc_snapshot: vcSnapshot,
        debrief,
      });
    } catch (err) {
      next(err);
    }
  });

  // SPRINT_003 fase 3: VC snapshot on-demand. Registrato DOPO tutte le
  // route statiche (/start, /state, /action, /turn/end, /end) per
  // evitare che resolveSession('state') venga intercettato dal pattern
  // /:id/vc. Non muta stato, non persistenze.
  router.get('/:id/vc', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  // P4: PF_session endpoint — personality form projection on-demand.
  router.get('/:id/pf', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      const { loadForms, computePfSession } = require('../services/personalityProjection');
      let formsData;
      try {
        formsData = loadForms();
      } catch {
        formsData = { forms: {} };
      }
      const pfResult = {};
      for (const [unitId, actorVc] of Object.entries(snapshot.per_actor || {})) {
        pfResult[unitId] = computePfSession(actorVc, formsData);
      }
      res.json({ session_id: session.session_id, pf_session: pfResult });
    } catch (err) {
      next(err);
    }
  });

  // Q-001 T2.3 PR-3: List available difficulty profiles.
  router.get('/difficulty/profiles', (req, res, next) => {
    try {
      const { getDifficultyConfig } = require('../../../services/difficulty/loader');
      const cfg = getDifficultyConfig();
      const profiles = cfg.player_difficulty_profiles || {};
      const list = Object.entries(profiles).map(([id, profile]) => ({
        id,
        label_it: profile.label_it,
        label_en: profile.label_en,
        description_it: profile.description_it,
        description_en: profile.description_en,
        enemy_count_multiplier: profile.enemy_count_multiplier,
        enemy_hp_multiplier: profile.enemy_hp_multiplier,
        enemy_damage_multiplier: profile.enemy_damage_multiplier,
        player_hp_multiplier: profile.player_hp_multiplier,
      }));
      res.json({ profiles: list, default: 'normal' });
    } catch (err) {
      next(err);
    }
  });

  // Q-001 T2.4 PR-2: Match replay from event log (read-only).
  // Espone session.events + metadata per replay engine/UI download.
  // Schema: packages/contracts/schemas/replay.schema.json
  router.get('/:id/replay', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const events = Array.isArray(session.events) ? session.events : [];
      const turnsPlayed = events.reduce((m, e) => Math.max(m, Number(e?.turn) || 0), 0);
      res.json({
        session_id: session.session_id,
        started_at: session.created_at || null,
        ended_at: session.ended_at || null,
        result: session.result || null,
        events,
        units_snapshot_initial: session.units_snapshot_initial || null,
        meta: {
          turns_played: turnsPlayed,
          events_count: events.length,
          export_version: 1,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Round-based combat endpoints (ADR-2026-04-16, PR 2 di N)
  // ────────────────────────────────────────────────────────────────
  //
  // Le 4 route qui sotto abilitano il nuovo modello round-based
  // (shared-planning → commit → resolve) descritto in
  // ADR-2026-04-16-session-engine-round-migration.md e implementato

  // Round endpoints mounted from sessionRoundBridge.js (token optimization).
  roundBridge.mountRoundEndpoints(router);

  return router;
}

module.exports = {
  createSessionRouter,
  resolveAttack,
  rollD20,
  buildDefaultUnits,
  normaliseUnit,
  GRID_SIZE,
};
