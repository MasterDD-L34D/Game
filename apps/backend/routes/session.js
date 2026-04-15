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

const GRID_SIZE = 6;
const DEFAULT_HP = 10;
const DEFAULT_AP = 2;
const DEFAULT_MOD = 3;
const DEFAULT_DC = 12;
const DEFAULT_GUARDIA = 1;
// DEFAULT_ATTACK_RANGE importato da services/ai/policy.js — autoritativo.

// SPRINT_006: stats per job (attack_range principalmente). I 6 job canonici
// sono quelli di data/core/telemetry.yaml:telemetry.hud_breakdown.roles.
// Strategie:
//   - vanguard/harvester: melee puri (range 1) — devono essere adiacenti
//   - skirmisher/warden/artificer: range medio (2) — versatili
//   - ranger/invoker: long-range (3) — DPS da distanza
// Se il job non e' in questa tabella (es. "unknown") si usa DEFAULT_ATTACK_RANGE.
const JOB_STATS = {
  vanguard: { attack_range: 1 },
  skirmisher: { attack_range: 2 },
  warden: { attack_range: 2 },
  artificer: { attack_range: 2 },
  harvester: { attack_range: 1 },
  ranger: { attack_range: 3 },
  invoker: { attack_range: 3 },
};

// SPRINT_003 fase 0: finestra temporale (in turni) entro cui un damage
// hit conta come assist per un kill avvenuto nel turno corrente.
const ASSIST_WINDOW_TURNS = 2;

function rollD20(rng) {
  return Math.floor(rng() * 20) + 1;
}

function clampPosition(x, y) {
  return {
    x: Math.min(Math.max(0, Number(x) || 0), GRID_SIZE - 1),
    y: Math.min(Math.max(0, Number(y) || 0), GRID_SIZE - 1),
  };
}

// Unit defaults allineati a SPRINT_002 fase 1:
// hp 10, ap 2, ap_remaining 2, mod 3, dc 12, guardia 1, griglia 6x6.
function normaliseUnit(raw, fallbackIndex) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const id = String(input.id || `unit_${fallbackIndex + 1}`);
  const position =
    input.position && typeof input.position === 'object'
      ? clampPosition(input.position.x, input.position.y)
      : fallbackIndex === 0
        ? { x: 0, y: 0 }
        : { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  const traits = Array.isArray(input.traits) ? input.traits.filter(Boolean).map(String) : [];
  const ap = Number.isFinite(Number(input.ap)) ? Number(input.ap) : DEFAULT_AP;
  // SPRINT_006: attack_range cerca override esplicito prima, poi JOB_STATS,
  // poi DEFAULT_ATTACK_RANGE. Cosi' i test che passano attack_range diretto
  // continuano a funzionare; il default diventa "sensibile al job".
  const job = input.job ? String(input.job) : 'unknown';
  const jobStats = JOB_STATS[job] || {};
  const attackRange = Number.isFinite(Number(input.attack_range))
    ? Number(input.attack_range)
    : Number.isFinite(Number(jobStats.attack_range))
      ? Number(jobStats.attack_range)
      : DEFAULT_ATTACK_RANGE;
  const hp = Number.isFinite(Number(input.hp)) ? Number(input.hp) : DEFAULT_HP;
  // SPRINT_006 fase 2: max_hp per REGOLA_002 retreat. Override esplicito
  // possibile dall'input (utile per scenari di test che partono con SIS
  // gia' ferito). Default: parte a hp iniziale (unita' fresca = full HP).
  const maxHp = Number.isFinite(Number(input.max_hp)) ? Number(input.max_hp) : hp;
  // SPRINT_013 (issue #10): oggetto status per stati temporanei.
  // Ogni chiave e' il nome dello stato, valore = turns_remaining.
  // 0 o mancante = inattivo. Accetta override iniziale dall'input.
  // SPRINT_019: aggiunti status fisici bleeding e fracture dal design
  // doc docs/core/10-SISTEMA_TATTICO.md. bleeding = DoT non riducibile,
  // fracture = ap_remaining reset a 1 invece di ap pieno.
  const status =
    input.status && typeof input.status === 'object'
      ? { ...input.status }
      : {
          panic: 0,
          rage: 0,
          stunned: 0,
          focused: 0,
          confused: 0,
          bleeding: 0,
          fracture: 0,
        };
  return {
    id,
    species: input.species ? String(input.species) : 'unknown',
    job,
    traits,
    hp,
    max_hp: maxHp,
    status,
    ap,
    ap_remaining: Number.isFinite(Number(input.ap_remaining)) ? Number(input.ap_remaining) : ap,
    mod: Number.isFinite(Number(input.mod)) ? Number(input.mod) : DEFAULT_MOD,
    dc: Number.isFinite(Number(input.dc)) ? Number(input.dc) : DEFAULT_DC,
    guardia: Number.isFinite(Number(input.guardia)) ? Number(input.guardia) : DEFAULT_GUARDIA,
    attack_range: attackRange,
    position,
    controlled_by: input.controlled_by ? String(input.controlled_by) : 'player',
  };
}

function buildDefaultUnits() {
  // SPRINT_002 default: unit_1 in (0,0) e unit_2 in (5,5). unit_2 e'
  // pilotato dal "sistema" cosi' POST /turn/end puo' far scattare
  // REGOLA_001 anche senza payload custom.
  return [
    normaliseUnit(
      {
        id: 'unit_1',
        species: 'velox',
        job: 'skirmisher',
        traits: ['zampe_a_molla'],
        position: { x: 0, y: 0 },
        controlled_by: 'player',
      },
      0,
    ),
    normaliseUnit(
      {
        id: 'unit_2',
        species: 'carapax',
        job: 'vanguard',
        traits: ['pelle_elastomera'],
        position: { x: 5, y: 5 },
        controlled_by: 'sistema',
      },
      1,
    ),
  ];
}

function normaliseUnitsPayload(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return buildDefaultUnits();
  }
  return raw.map((entry, index) => normaliseUnit(entry, index));
}

function resolveAttack({ actor, target, rng }) {
  const die = rollD20(rng);
  const roll = die + (actor.mod || 0);
  const dc = target.dc ?? target.dc_difesa ?? 10 + (target.mod || 0);
  const mos = roll - dc;
  const hit = mos >= 0;
  let pt = 0;
  if (hit) {
    if (die >= 15 && die <= 19) pt += 1;
    if (die === 20) pt += 2;
    pt += Math.floor(mos / 5);
  }
  return { die, roll, mos, hit, dc, pt };
}

function timestampStamp(date) {
  const iso = date.toISOString();
  return iso
    .replace(/[-:]/g, '')
    .replace(/\..*Z$/, '')
    .replace('T', '_');
}

function publicSessionView(session) {
  return {
    session_id: session.session_id,
    turn: session.turn,
    active_unit: session.active_unit,
    units: session.units,
    grid: session.grid,
    grid_size: session.grid.width,
    log_events_count: session.events.length,
  };
}

function nextUnitId(session) {
  const units = session.units;
  if (!units.length) return null;
  const currentIdx = units.findIndex((u) => u.id === session.active_unit);
  const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % units.length;
  return units[nextIdx].id;
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickLowestHpEnemy(session, actor) {
  const enemies = session.units.filter((u) => u.id !== actor.id && u.hp > 0);
  if (!enemies.length) return null;
  return enemies.reduce((lowest, candidate) => {
    if (!lowest) return candidate;
    return candidate.hp < lowest.hp ? candidate : lowest;
  }, null);
}

function stepTowards(from, to) {
  // Un singolo passo Manhattan verso la destinazione.
  const next = { ...from };
  if (from.x !== to.x) {
    next.x += from.x < to.x ? 1 : -1;
  } else if (from.y !== to.y) {
    next.y += from.y < to.y ? 1 : -1;
  }
  return clampPosition(next.x, next.y);
}

// stepAway e selectAiPolicy sono stati estratti in services/ai/policy.js
// (SPRINT_010 issue #2). Qui viene mantenuto solo l'import a inizio file.

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
    let panicTriggered = false;
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
      const adjusted = baseDamage + evaluation.damage_modifier + adjacencyBonus + rageBonus;
      damageDealt = Math.max(0, adjusted);
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
      panicTriggered,
      status_applies: statusApplies,
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

  router.post('/start', async (req, res, next) => {
    try {
      const sessionId = newSessionId();
      const now = new Date();
      const logFilePath = path.join(logsDir, `session_${timestampStamp(now)}.json`);
      const units = normaliseUnitsPayload(req.body?.units);
      const session = {
        session_id: sessionId,
        turn: 1,
        active_unit: units[0]?.id || null,
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
      res.json({
        session_id: sessionId,
        state: publicSessionView(session),
        log_file: logFilePath,
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
        actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
        const hpBefore = target.hp;
        const targetPositionAtAttack = { ...target.position };
        const { result, evaluation, damageDealt, killOccurred } = performAttack(
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
          cap_pt_used: session.cap_pt_used,
          cap_pt_max: session.cap_pt_max,
          state: publicSessionView(session),
        });
      }

      return res
        .status(400)
        .json({ error: `action_type sconosciuto: "${actionType}" (atteso "attack" o "move")` });
    } catch (err) {
      next(err);
    }
  });

  router.post('/turn/end', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

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

      // 2. Passa il turno all'unita' successiva
      const nextId = nextUnitId(session);
      session.active_unit = nextId;
      session.turn += 1;

      // 3. Se la nuova unita' e' controllata dal sistema, esegui il suo
      //    turno e avanza oltre per tornare al player.
      const next = session.units.find((u) => u.id === nextId);
      let iaActions = [];
      if (next && next.controlled_by === 'sistema' && next.hp > 0) {
        // === START OF SIS TURN ===
        // 3a. Bleeding damage al SIS (se bleeding, applicato prima di agire)
        await applyBleedingTo(next);
        // 3b. Pre-SIS-turn reset AP con fracture check (usando valore pre-decrement)
        if (next.hp > 0) {
          resetApWithStatus(next);
          // 3c. Esegui turno IA con AP gia' limitati se fracture attivo
          iaActions = await runSistemaTurn(session);
        }
        // === END OF SIS TURN ===
        // 3d. Decrement delle status durations del SIS (post-turno)
        decrementStatuses(next);
        const followupId = nextUnitId(session);
        session.active_unit = followupId;
        session.turn += 1;
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
