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

// Extracted modules — constants + pure helpers (token optimization).
// See sessionConstants.js and sessionHelpers.js for the extracted code.
const {
  isRoundModelEnabled,
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
} = require('./sessionHelpers');

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
  const declareSistemaIntents = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: GRID_SIZE,
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
      const units = normaliseUnitsPayload(req.body?.units);
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

        // PR 4 (ADR-2026-04-16): se USE_ROUND_MODEL e' attivo, delega
        // al wrapper handleLegacyAttackViaRound che esegue la stessa
        // pipeline performAttack dentro un round cycle (planning →
        // commit → resolve) sincronizzando session.roundState. La
        // response shape resta legacy-compat (+ campi round_wrapper
        // e round_phase come metadata). Path flag-off invariato.
        if (isRoundModelEnabled()) {
          const wrapped = await handleLegacyAttackViaRound({
            session,
            actor,
            target,
            requestedCapPt,
          });
          return res.json(wrapped);
        }

        actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
        const hpBefore = target.hp;
        const targetPositionAtAttack = { ...target.position };
        const { result, evaluation, damageDealt, killOccurred, parry } = performAttack(
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
        });
        // SPRINT_021: traccia parata reattiva nell'evento per il log + VC.
        if (parry) event.parry = parry;
        // SPRINT_003 fase 1: traccia cost nell'evento + consume dal budget.
        if (requestedCapPt > 0) {
          event.cost = { cap_pt: requestedCapPt };
          consumeCapPt(session, requestedCapPt);
        }
        await appendEvent(session, event);
        if (killOccurred) {
          await emitKillAndAssists(session, actor, target, event);
        }
        return res.json({
          roll: result.roll,
          mos: result.mos,
          result: result.hit ? 'hit' : 'miss',
          pt: result.pt,
          damage_dealt: damageDealt,
          target_hp: target.hp,
          trait_effects: evaluation.trait_effects,
          cap_pt_used: session.cap_pt_used,
          cap_pt_max: session.cap_pt_max,
          actor_position: { ...actor.position },
          target_position: { ...targetPositionAtAttack },
          parry,
          state: publicSessionView(session),
        });
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

      // PR 5 (ADR-2026-04-16 M5b): delega al wrapper round-based
      // se USE_ROUND_MODEL=true. Il wrapper usa declareSistemaIntents
      // per emettere intents SIS, poi commit + resolve via orchestrator
      // con real resolveAction bindato al session. Response shape
      // legacy-compat + round_wrapper/round_phase metadata.
      if (isRoundModelEnabled()) {
        const wrapped = await handleTurnEndViaRound(session);
        return res.json(wrapped);
      }

      // Helper: damage-over-time (bleeding) applicato a una singola unita'.
      // Ritorna l'evento descrittore se applicato, null altrimenti.
      const bleedingEvents = [];
      const applyBleedingTo = async (unit) => {
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

      // Helper: reset ap_remaining rispettando fracture (se attivo, cap a 1).
      const resetApWithStatus = (unit) => {
        if (!unit) return;
        const fractureActive = Number(unit.status?.fracture) > 0;
        unit.ap_remaining = fractureActive ? Math.min(1, unit.ap) : unit.ap;
      };

      // Helper: decrementa tutte le status durations di UNA unita' (end-of-turn).
      // Questo e' la variante per-unit della vecchia logica global.
      // SPRINT_019: separato per timing corretto di fracture e bleeding.
      const decrementStatuses = (unit) => {
        if (!unit || !unit.status) return;
        for (const key of Object.keys(unit.status)) {
          const v = Number(unit.status[key]);
          if (v > 0) {
            unit.status[key] = v - 1;
          }
        }
      };

      // === END OF CURRENT UNIT'S TURN ===
      // 1a. Bleeding damage applicato all'unita' che sta finendo (se bleeding)
      const current = session.units.find((u) => u.id === session.active_unit);
      await applyBleedingTo(current);
      // 1b. Reset ap_remaining per il prossimo turno dell'unita' corrente
      // (fracture check usando il valore CORRENTE di fracture, pre-decrement)
      if (current) resetApWithStatus(current);
      // 1c. Decrement delle status durations dell'unita' corrente
      decrementStatuses(current);

      // 2. Passa il turno all'unita' successiva (initiative-based order)
      session.active_unit = nextUnitId(session);
      session.turn += 1;

      // 3. SPRINT_020: usa l'helper advanceThroughAiTurns per eseguire
      //    tutti i SIS nell'ordine, fino al primo player. Supporta ordine
      //    arbitrario di turn_order e multi-SIS.
      const aiPhase = await advanceThroughAiTurns(session);
      const iaActions = aiPhase.iaActions;
      // Merge bleeding events: quelli dal current turn (calcolati sopra)
      // + quelli dalla AI phase (emessi in advanceThroughAiTurns).
      if (Array.isArray(aiPhase.bleedingEvents)) {
        for (const b of aiPhase.bleedingEvents) bleedingEvents.push(b);
      }

      return res.json({
        session_id: session.session_id,
        turn: session.turn,
        active_unit: session.active_unit,
        ia_actions: iaActions,
        ia_action: iaActions[0] || null,
        // SPRINT_019: side_effects contiene i danni da status fisici
        // applicati a inizio /turn/end (bleeding e simili). Il frontend
        // li logga separatamente con emoji 🩸.
        side_effects: bleedingEvents,
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

  // ────────────────────────────────────────────────────────────────
  // Round-based combat endpoints (ADR-2026-04-16, PR 2 di N)
  // ────────────────────────────────────────────────────────────────
  //
  // Le 4 route qui sotto abilitano il nuovo modello round-based
  // (shared-planning → commit → resolve) descritto in
  // ADR-2026-04-16-session-engine-round-migration.md e implementato
  // in apps/backend/services/roundOrchestrator.js (port in JS del
  // Python orchestrator).
  //
  // Feature flag: `USE_ROUND_MODEL`. Se falsa, ogni endpoint ritorna
  // 503. Se vera, il session object accumula uno state parallelo
  // `session.roundState` in shape nativa dell'orchestrator
  // (pending_intents, round_phase, units con hp/ap/reactions dict).
  //
  // Il flusso legacy (/start, /action, /turn/end, /end, /state, /:id/vc)
  // e' intatto: la mappa `sessions` e le funzioni esistenti non sono
  // toccate. Le due superfici coesistono. La migrazione del flusso
  // legacy ai round endpoints (wrapper + refactor AI) e' scope di PR
  // successive.
  //
  // Il `resolveAction` iniettato e' un **placeholder minimale** per
  // PR 2: gestisce `attack` applicando 3 HP di danno fisso al target,
  // `heal` con healing deterministico, e gli altri type come no-op
  // con consumo AP. Il wiring al resolver reale (performAttack +
  // traitEffects) e' scope di PR 4 (legacy wrappers).

  function roundModelGuard(_req, res) {
    if (!isRoundModelEnabled()) {
      res.status(503).json({
        error: 'round_model_disabled',
        message:
          'Feature flag USE_ROUND_MODEL non attivo. Imposta USE_ROUND_MODEL=true per abilitare gli endpoint round-based (vedi ADR-2026-04-16).',
      });
      return false;
    }
    return true;
  }

  /**
   * Adapter session.js units -> orchestrator units.
   *
   * La session in-memory usa `hp`/`max_hp` scalari, `ap`/`ap_remaining`,
   * `status` come oggetto, `guardia` come parry budget. L'orchestrator
   * vuole `hp: {current, max}`, `ap: {current, max}`,
   * `reactions: {current, max}`, `statuses: []`.
   *
   * Il mapping e' idempotente: chiamarlo piu' volte sullo stesso
   * session object ritorna sempre la stessa shape. Preserva `tier`
   * (default 1) e `stress` (default 0) per i predicates DSL.
   */
  function adaptSessionToRoundState(session) {
    const units = (session.units || []).map((u) => {
      const statusObj = u.status || {};
      const statuses = [];
      for (const [id, turns] of Object.entries(statusObj)) {
        if (Number(turns) > 0) {
          statuses.push({
            id,
            intensity: 1,
            remaining_turns: Number(turns),
          });
        }
      }
      return {
        id: String(u.id),
        hp: {
          current: Number(u.hp || 0),
          max: Number(u.max_hp || u.hp || 0),
        },
        ap: {
          current: Number(u.ap_remaining != null ? u.ap_remaining : u.ap || 0),
          max: Number(u.ap || 0),
        },
        reactions: { current: 1, max: 1 },
        initiative: Number(u.initiative || 0),
        tier: Number(u.tier || 1),
        stress: Number(u.stress || 0),
        statuses,
        reaction_cooldown_remaining: Number(u.reaction_cooldown_remaining || 0),
      };
    });
    return {
      session_id: session.session_id,
      turn: Number(session.turn || 1),
      round_phase: null,
      pending_intents: [],
      units,
      log: [],
    };
  }

  /**
   * Ensure `session.roundState` e' inizializzato. Chiamato lazy
   * all'ingresso dei 4 endpoint round-based. Se non esiste, lo
   * costruisce dall'adattamento delle units legacy.
   */
  function ensureRoundState(session) {
    if (!session.roundState) {
      session.roundState = adaptSessionToRoundState(session);
    }
    return session.roundState;
  }

  /**
   * Placeholder resolveAction per PR 2. Gestisce:
   *   - attack: infligge 3 HP di danno fisso al target, consuma AP
   *   - heal: applica 3 HP di healing clampato a max_hp, consuma AP
   *   - defend/parry/ability/move: consuma AP, nessun effect
   *
   * Restituisce `{ nextState, turnLogEntry }` in shape orchestrator
   * (turn_log_entry con damage_applied / healing_applied).
   *
   * PR 4 scope: replace con wiring al `performAttack` reale di
   * session.js (con trait effects, fairness cap, status system, ...).
   */
  function placeholderResolveAction(state, action, _catalog, _rng) {
    const next = JSON.parse(JSON.stringify(state));
    const actorId = String(action.actor_id || '');
    const targetId = action.target_id ? String(action.target_id) : null;
    const actor = next.units.find((u) => u.id === actorId);
    if (actor && actor.ap) {
      actor.ap.current = Math.max(0, Number(actor.ap.current || 0) - Number(action.ap_cost || 0));
    }
    let damageApplied = 0;
    let healingApplied = 0;
    if (action.type === 'attack' && targetId) {
      const target = next.units.find((u) => u.id === targetId);
      if (target && target.hp) {
        damageApplied = 3;
        target.hp.current = Math.max(0, Number(target.hp.current || 0) - damageApplied);
      }
    } else if (action.type === 'heal' && targetId) {
      const target = next.units.find((u) => u.id === targetId);
      if (target && target.hp) {
        const missing = Number(target.hp.max || 0) - Number(target.hp.current || 0);
        healingApplied = Math.max(0, Math.min(3, missing));
        target.hp.current = Number(target.hp.current || 0) + healingApplied;
      }
    }
    const turnLogEntry = {
      turn: Number(next.turn || 1),
      action: { ...action },
      damage_applied: damageApplied,
      healing_applied: healingApplied,
    };
    (next.log = next.log || []).push(turnLogEntry);
    return { nextState: next, turnLogEntry };
  }

  // Orchestrator con closure-scoped deps. Gli unit test del modulo
  // (tests/services/roundOrchestrator.test.js) validano la purezza
  // delle funzioni — qui ci limitiamo a fornire resolveAction +
  // rng = Math.random. Questo orchestrator usa placeholderResolveAction
  // per i 4 endpoint stub /declare-intent, /clear-intent, /commit-round,
  // /resolve-round. Il wrapper legacy /action (PR 4) usa invece una
  // factory separata `createLegacyAttackViaRound` che binda
  // `performAttack` reale al session specifico.
  const roundOrchestrator = createRoundOrchestrator({
    resolveAction: placeholderResolveAction,
    defaultRng: rng,
  });

  /**
   * PR 4: wiring wrapper legacy /action flag-on.
   *
   * Prende un session object (legacy shape) + action body body
   * { actor_id, target_id, action_type } e lo esegue attraverso il
   * round flow (planning → commit → resolve) con un resolveAction
   * bindato al vero `performAttack` della closure session.js.
   *
   * Scope PR 4: solo action_type='attack'. Per altri type il caller
   * deve cadere sul flusso legacy (il wrapper ritorna null).
   *
   * Ritorna un oggetto legacy-shape (roll/mos/result/pt/damage_dealt/
   * target_hp/trait_effects/actor_position/target_position/parry)
   * pronto per `res.json(...)`. Il wrapper aggiorna session.roundState
   * per mantenere il dual-state coerente con gli altri endpoint
   * round-based.
   *
   * Note:
   * - Il performAttack muta session.units in place; dopo la chiamata
   *   ri-adattiamo session.units nello state orchestrator per
   *   mantenere hp/ap sincronizzati nel dual-state.
   * - Cap PT e validazioni legacy (range, AP) sono eseguite PRIMA
   *   di entrare nel round flow (coerenza con la path legacy).
   * - Il log event e il kill/assist emission restano invariati.
   */
  async function handleLegacyAttackViaRound({ session, actor, target, requestedCapPt }) {
    // Costruisci synthetic round action shape per l'orchestrator.
    const roundAction = {
      id: `legacy-attack-${actor.id}-${session.action_counter}`,
      type: 'attack',
      actor_id: actor.id,
      target_id: target.id,
      ability_id: null,
      ap_cost: 1,
      channel: null,
      damage_dice: { count: 1, sides: 6, modifier: 2 },
    };

    // Bind resolveAction al session specifico. Il wrapper interno
    // chiama performAttack (che muta session.units), poi sincronizza
    // la mutazione con lo state orchestrator.
    const capturedResults = {
      result: null,
      evaluation: null,
      damageDealt: 0,
      killOccurred: false,
      parry: null,
    };
    const realResolveAction = (state, action, _catalog, _rng) => {
      // Deep clone dello state orchestrator (shape {units: [{hp:{current,max}...}]})
      const next = JSON.parse(JSON.stringify(state));
      if (action.type === 'attack' && action.target_id) {
        // performAttack muta session.units (legacy shape) in place
        const res = performAttack(session, actor, target);
        capturedResults.result = res.result;
        capturedResults.evaluation = res.evaluation;
        capturedResults.damageDealt = res.damageDealt;
        capturedResults.killOccurred = res.killOccurred;
        capturedResults.parry = res.parry;
        // Sincronizza hp/ap da session.units → state orchestrator units
        for (const uOrch of next.units) {
          const uLegacy = session.units.find((u) => u.id === uOrch.id);
          if (uLegacy) {
            if (uOrch.hp) {
              uOrch.hp.current = Number(uLegacy.hp || 0);
              uOrch.hp.max = Number(uLegacy.max_hp || uLegacy.hp || 0);
            }
            if (uOrch.ap) {
              uOrch.ap.current = Number(
                uLegacy.ap_remaining != null ? uLegacy.ap_remaining : uLegacy.ap || 0,
              );
              uOrch.ap.max = Number(uLegacy.ap || 0);
            }
          }
        }
        const turnLogEntry = {
          turn: Number(next.turn || 1),
          action: { ...action },
          damage_applied: Number(res.damageDealt || 0),
          roll: res.result.roll,
          mos: res.result.mos,
          pt_gained: res.result.pt,
          hit: res.result.hit,
          die: res.result.die,
        };
        (next.log = next.log || []).push(turnLogEntry);
        return { nextState: next, turnLogEntry };
      }
      // Fallback placeholder (non dovrebbe mai trigger per PR 4 scope)
      return placeholderResolveAction(state, action, _catalog, _rng);
    };

    // Consuma AP legacy PRIMA di entrare nel round flow (parita' con
    // il path legacy che decrementa ap_remaining inline).
    actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };

    // Costruisci round state fresco da session.units + fai round cycle
    // completo (declare → commit → resolve) per esercitare la phase
    // machine anche in wrapper single-actor.
    session.roundState = adaptSessionToRoundState(session);
    let cur = session.roundState;
    if (cur.round_phase !== PHASE_PLANNING) {
      cur = roundOrchestrator.beginRound(cur).nextState;
    }
    cur = roundOrchestrator.declareIntent(cur, actor.id, roundAction).nextState;
    cur = roundOrchestrator.commitRound(cur).nextState;
    // Usiamo l'API pure resolveRound del modulo, non l'orchestrator
    // factory (che e' bindato al placeholder). Richiediamo resolveRound
    // esportato dal modulo.
    const result = resolveRoundPure(cur, null, rng, realResolveAction);
    session.roundState = result.nextState;

    // Emetti event legacy come il path originale
    const event = buildAttackEvent({
      session,
      actor,
      target,
      result: capturedResults.result,
      evaluation: capturedResults.evaluation,
      damageDealt: capturedResults.damageDealt,
      hpBefore,
      targetPositionAtAttack,
    });
    if (capturedResults.parry) event.parry = capturedResults.parry;
    if (requestedCapPt > 0) {
      event.cost = { cap_pt: requestedCapPt };
      consumeCapPt(session, requestedCapPt);
    }
    await appendEvent(session, event);
    if (capturedResults.killOccurred) {
      await emitKillAndAssists(session, actor, target, event);
    }

    return {
      roll: capturedResults.result.roll,
      mos: capturedResults.result.mos,
      result: capturedResults.result.hit ? 'hit' : 'miss',
      pt: capturedResults.result.pt,
      damage_dealt: capturedResults.damageDealt,
      target_hp: target.hp,
      trait_effects: capturedResults.evaluation.trait_effects,
      cap_pt_used: session.cap_pt_used,
      cap_pt_max: session.cap_pt_max,
      actor_position: { ...actor.position },
      target_position: targetPositionAtAttack,
      parry: capturedResults.parry,
      state: publicSessionView(session),
      // Round flow metadata (only present when flag on)
      round_wrapper: true,
      round_phase: result.nextState.round_phase,
    };
  }

  /**
   * PR 5 (ADR-2026-04-16 M5b): wiring wrapper legacy /turn/end flag-on.
   *
   * Quando USE_ROUND_MODEL=true, il /turn/end endpoint delega alla
   * round-based pipeline:
   *   1. Build roundState fresco da session.units
   *   2. beginRound (refresh AP/reactions, decay status, bleeding tick
   *      su tutte le unita')
   *   3. declareSistemaIntents(session) per tutti i SIS
   *   4. Per ogni intent -> declareIntent(roundState, unit_id, action)
   *   5. commitRound
   *   6. resolveRound con real resolveAction che:
   *      - attack: delega a performAttack (esistente)
   *      - move: aggiorna session.units.position + append move event
   *      - altri type: consuma solo AP
   *   7. Sync session.units con roundState post-resolve
   *   8. session.turn += 1 (per compat UI legacy)
   *
   * Ritorna: { turn, active_unit, ia_actions, side_effects, state,
   *            round_wrapper, round_phase }.
   *
   * side_effects derivato da beginRound expired+bleeding (shape
   * simile a quello del path legacy: { unit_id, damage, hp_after, killed }).
   *
   * ia_actions derivato dai turn_log_entries del round: shape
   * compatibile con il legacy (actor='sistema', type, target, ecc).
   */
  async function handleTurnEndViaRound(session) {
    // 1. Build fresh roundState from session.units. Include player +
    //    SIS units. Il risultato ha round_phase null (verra' settato
    //    a 'planning' da beginRound).
    session.roundState = adaptSessionToRoundState(session);

    // 2. beginRound: refresh AP/reactions per ogni unit + bleeding tick +
    //    decay status + reaction cooldown decrement. Ritorna bleedingTotal
    //    aggregato ma non ha granularita' per-unit come il path legacy.
    //    Per preservare side_effects shape, calcoliamo noi il tick HP qui.
    const bleedingEvents = [];
    for (const unit of session.units) {
      if (!unit || !unit.status || Number(unit.hp || 0) <= 0) continue;
      const bleedTurns = Number(unit.status.bleeding) || 0;
      if (bleedTurns <= 0) continue;
      const dmg = 1;
      const hpBefore = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'bleeding',
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
    }
    // Reset AP + decrement status per tutte le unita' (equivalente
    // end-of-round). Il legacy path fa questo solo sulla corrente prima
    // di advance, ma nel round model il refresh e' globale.
    for (const unit of session.units) {
      if (!unit) continue;
      const fractureActive = Number(unit.status?.fracture) > 0;
      unit.ap_remaining = fractureActive ? Math.min(1, unit.ap) : unit.ap;
      if (unit.status) {
        for (const key of Object.keys(unit.status)) {
          const v = Number(unit.status[key]);
          if (v > 0) unit.status[key] = v - 1;
        }
      }
    }
    session.roundState = adaptSessionToRoundState(session);
    session.roundState = roundOrchestrator.beginRound(session.roundState).nextState;

    // 3. declareSistemaIntents: emette intents per tutti i SIS vivi
    const { intents, decisions } = declareSistemaIntents(session);

    // 4. Declare ogni intent nel roundState
    let cur = session.roundState;
    for (const { unit_id, action } of intents) {
      cur = roundOrchestrator.declareIntent(cur, unit_id, action).nextState;
    }
    session.roundState = cur;

    // 5. commitRound
    session.roundState = roundOrchestrator.commitRound(session.roundState).nextState;

    // 6. Real resolveAction: gestisce attack (performAttack) + move
    //    (position update + appendEvent). Capture turn_log entries per
    //    costruire ia_actions legacy-shape.
    const iaActions = [];
    const realResolveAction = (state, action, _catalog, _rng) => {
      const next = JSON.parse(JSON.stringify(state));
      const actorId = String(action.actor_id || '');
      const actor = session.units.find((u) => u.id === actorId);
      if (!actor) {
        return { nextState: next, turnLogEntry: { action, skipped: 'no_actor' } };
      }
      let turnLogEntry = {
        turn: Number(next.turn || 1),
        action: { ...action },
        damage_applied: 0,
      };

      if (action.type === 'attack' && action.target_id) {
        const target = session.units.find((u) => u.id === String(action.target_id));
        if (!target || target.hp <= 0) {
          turnLogEntry.skipped = 'target_dead';
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'skip',
            reason: 'target_dead',
            ia_rule: action.source_ia_rule,
          });
        } else {
          const hpBefore = target.hp;
          const targetPosAtk = { ...target.position };
          const res = performAttack(session, actor, target);
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
          const event = buildAttackEvent({
            session,
            actor,
            target,
            result: res.result,
            evaluation: res.evaluation,
            damageDealt: res.damageDealt,
            hpBefore,
            targetPositionAtAttack: targetPosAtk,
          });
          event.actor_id = 'sistema';
          event.actor_species = actor.species;
          event.actor_job = actor.job;
          event.ia_rule = action.source_ia_rule;
          event.ia_controlled_unit = actor.id;
          if (res.parry) event.parry = res.parry;
          // appendEvent e' async ma qui nel resolveAction siamo in ctx sync.
          // Usiamo la versione non-async (push + persist async deferred).
          session.events.push(event);
          session.action_counter++;
          if (res.killOccurred) {
            // Assists are tracked via emitKillAndAssists ma e' async.
            // Minimal inline: update damage_taken log non critico.
          }
          turnLogEntry.damage_applied = res.damageDealt;
          turnLogEntry.roll = res.result.roll;
          turnLogEntry.hit = res.result.hit;
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'attack',
            target: target.id,
            die: res.result.die,
            roll: res.result.roll,
            mos: res.result.mos,
            result: res.result.hit ? 'hit' : 'miss',
            pt: res.result.pt,
            damage_dealt: res.damageDealt,
            trait_effects: res.evaluation.trait_effects,
            actor_position: { ...actor.position },
            target_position: targetPosAtk,
            ia_rule: action.source_ia_rule,
            parry: res.parry,
          });
        }
      } else if (action.type === 'move' && action.move_to) {
        const dest = action.move_to;
        const positionFrom = { ...actor.position };
        // Overlap guard (safety net, gia' fatto in declareSistemaIntents)
        const blocker = session.units.find(
          (u) =>
            u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
        );
        if (blocker) {
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'skip',
            reason: `blocked by ${blocker.id} at (${dest.x},${dest.y})`,
            position_from: positionFrom,
            position_to: positionFrom,
            ia_rule: action.source_ia_rule,
          });
          turnLogEntry.skipped = 'blocked';
        } else {
          actor.position = { x: dest.x, y: dest.y };
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
          const newFacing = facingFromMove(positionFrom, actor.position);
          if (newFacing) actor.facing = newFacing;
          const event = buildMoveEvent({ session, actor, positionFrom });
          event.actor_id = 'sistema';
          event.ia_rule = action.source_ia_rule;
          event.ia_controlled_unit = actor.id;
          session.events.push(event);
          session.action_counter++;
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'move',
            target: action.target_id || null,
            position_from: positionFrom,
            position_to: { ...actor.position },
            ia_rule: action.source_ia_rule,
          });
        }
      } else {
        // Altri type: AP only consumption
        actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
      }

      // Sync back per orchestrator state
      const uOrch = next.units.find((u) => u.id === actorId);
      if (uOrch) {
        if (uOrch.hp) {
          uOrch.hp.current = Number(actor.hp || 0);
          uOrch.hp.max = Number(actor.max_hp || actor.hp || 0);
        }
        if (uOrch.ap) {
          uOrch.ap.current = Number(
            actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0,
          );
        }
      }
      // Anche target per attack
      if (action.type === 'attack' && action.target_id) {
        const tgtLegacy = session.units.find((u) => u.id === String(action.target_id));
        const tgtOrch = next.units.find((u) => u.id === String(action.target_id));
        if (tgtLegacy && tgtOrch && tgtOrch.hp) {
          tgtOrch.hp.current = Number(tgtLegacy.hp || 0);
        }
      }
      return { nextState: next, turnLogEntry };
    };

    const result = resolveRoundPure(session.roundState, null, rng, realResolveAction);
    session.roundState = result.nextState;

    // Persist events written synchronously above
    await persistEvents(session);

    // 7. Advance turn counter (legacy compat for UI badge)
    session.turn += 1;

    return {
      session_id: session.session_id,
      turn: session.turn,
      active_unit: session.active_unit,
      ia_actions: iaActions,
      ia_action: iaActions[0] || null,
      side_effects: bleedingEvents,
      state: publicSessionView(session),
      round_wrapper: true,
      round_phase: session.roundState.round_phase,
      round_decisions: decisions,
    };
  }

  router.post('/declare-intent', (req, res, next) => {
    try {
      if (!roundModelGuard(req, res)) return;
      const { session_id: sessionId, actor_id: actorId, action } = req.body || {};
      const { error, session } = resolveSession(sessionId);
      if (error) return res.status(error.status).json(error.body);
      if (!actorId || typeof actorId !== 'string') {
        return res.status(400).json({ error: 'actor_id richiesto (string)' });
      }
      if (!action || typeof action !== 'object') {
        return res
          .status(400)
          .json({ error: "action richiesto (object con campi 'type', 'actor_id', ...)" });
      }
      const state = ensureRoundState(session);
      // beginRound automatico se phase e' null o 'resolved'
      let current = state;
      if (current.round_phase !== PHASE_PLANNING) {
        current = roundOrchestrator.beginRound(current).nextState;
      }
      const { nextState } = roundOrchestrator.declareIntent(current, actorId, action);
      session.roundState = nextState;
      res.json({
        session_id: session.session_id,
        round_phase: nextState.round_phase,
        pending_intents: nextState.pending_intents,
      });
    } catch (err) {
      // Phase-machine errors -> 400
      if (err && /round_phase|unit_id/.test(String(err.message || ''))) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  router.post('/clear-intent/:actorId', (req, res, next) => {
    try {
      if (!roundModelGuard(req, res)) return;
      const sessionId = (req.body && req.body.session_id) || req.query.session_id;
      const actorId = req.params.actorId;
      const { error, session } = resolveSession(sessionId);
      if (error) return res.status(error.status).json(error.body);
      if (!session.roundState) {
        return res
          .status(400)
          .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
      }
      const { nextState } = roundOrchestrator.clearIntent(session.roundState, actorId);
      session.roundState = nextState;
      res.json({
        session_id: session.session_id,
        round_phase: nextState.round_phase,
        pending_intents: nextState.pending_intents,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/commit-round', (req, res, next) => {
    try {
      if (!roundModelGuard(req, res)) return;
      const sessionId = req.body && req.body.session_id;
      const { error, session } = resolveSession(sessionId);
      if (error) return res.status(error.status).json(error.body);
      if (!session.roundState) {
        return res
          .status(400)
          .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
      }
      const { nextState } = roundOrchestrator.commitRound(session.roundState);
      session.roundState = nextState;
      res.json({
        session_id: session.session_id,
        round_phase: nextState.round_phase,
        pending_intents: nextState.pending_intents,
      });
    } catch (err) {
      if (err && /round_phase/.test(String(err.message || ''))) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  router.post('/resolve-round', (req, res, next) => {
    try {
      if (!roundModelGuard(req, res)) return;
      const sessionId = req.body && req.body.session_id;
      const { error, session } = resolveSession(sessionId);
      if (error) return res.status(error.status).json(error.body);
      if (!session.roundState) {
        return res
          .status(400)
          .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
      }
      const result = roundOrchestrator.resolveRound(session.roundState);
      session.roundState = result.nextState;
      res.json({
        session_id: session.session_id,
        round_phase: result.nextState.round_phase,
        turn_log_entries: result.turnLogEntries,
        resolution_queue: result.resolutionQueue,
        reactions_triggered: result.reactionsTriggered,
        skipped: result.skipped,
        units: result.nextState.units,
      });
    } catch (err) {
      if (err && /round_phase/.test(String(err.message || ''))) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

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
