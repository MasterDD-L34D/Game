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
      // Consuma guardia solo se parata riuscita (mitigazione cumulativa)
      if (parryResult && parryResult.success) {
        target.guardia = Math.max(0, Number(target.guardia) - 1);
      }
      // SPRINT_003 fase 0: traccia damage_taken cumulativo per unita'.
      // Lo stato e' in memoria (non nel log) — VC scoring lo ricalcola
      // dagli eventi per restare stateless.
      session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + damageDealt;
      target.hp = Math.max(0, target.hp - damageDealt);
      if (target.hp === 0) {
        killOccurred = true;
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
  });
  const { handleLegacyAttackViaRound, handleTurnEndViaRound } = roundBridge;

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

      // SPRINT_020: calcola turn_order via iniziativa descending.
      const turnOrder = buildTurnOrder(units);
      const firstActiveId = turnOrder[0] || null;
      const session = {
        session_id: sessionId,
        turn: 1,
        active_unit: firstActiveId,
        turn_order: turnOrder,
        turn_index: 0,
        units,
        // Q-001 T2.4: snapshot iniziale per replay (deep copy, immutable)
        units_snapshot_initial: JSON.parse(JSON.stringify(units)),
        grid: { width: GRID_SIZE, height: GRID_SIZE },
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
        sistema_pressure: 0,
        // Hazard tiles dal scenario (es. enc_tutorial_03 fumarole).
        // Lista {x, y, damage, type}. Applicato a fine turno via
        // applyHazardDamage in handleTurnEndViaRound.
        hazard_tiles: Array.isArray(req.body?.hazard_tiles) ? req.body.hazard_tiles : [],
        // Q-001 T2.3: difficulty profile scaling metadata (null se profile invalid)
        _difficultyProfile: difficultyProfileMeta,
      };
      sessions.set(sessionId, session);
      activeSessionId = sessionId;
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(logFilePath, '[]\n', 'utf8');
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
        if (dest.x < 0 || dest.x >= GRID_SIZE || dest.y < 0 || dest.y >= GRID_SIZE) {
          return res
            .status(400)
            .json({ error: `posizione fuori griglia (${GRID_SIZE}x${GRID_SIZE})` });
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
        return res.json({
          ok: true,
          actor_id: actor.id,
          position: actor.position,
          position_from: positionFrom,
          facing: actor.facing,
          cap_pt_used: session.cap_pt_used,
          cap_pt_max: session.cap_pt_max,
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

      return res.status(400).json({
        error: `action_type sconosciuto: "${actionType}" (atteso "attack", "move" o "turn")`,
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

  router.post('/end', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);
      await persistEvents(session);
      const eventsCount = session.events.length;
      const logFile = session.logFilePath;
      sessions.delete(session.session_id);
      if (activeSessionId === session.session_id) {
        activeSessionId = null;
      }
      // C3: assemble debrief summary with PE/PI/VC/PF
      let debrief = null;
      try {
        const vcSnapshot = buildVcSnapshot(session, telemetryConfig);
        const { computeSessionPE, buildDebriefSummary } = require('../services/rewardEconomy');
        const peResult = computeSessionPE(vcSnapshot, {
          difficulty: session.difficulty || 'standard',
        });
        debrief = buildDebriefSummary(session, vcSnapshot, peResult);
      } catch {
        // debrief is best-effort — don't block session end
      }
      res.json({
        session_id: session.session_id,
        finalized: true,
        log_file: logFile,
        events_count: eventsCount,
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
