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

const { loadActiveTraitRegistry, evaluateAttackTraits } = require('../services/traitEffects');
const { loadFairnessConfig, checkCapPtBudget, consumeCapPt } = require('../services/fairnessCap');
const { loadTelemetryConfig, buildVcSnapshot } = require('../services/vcScoring');

const GRID_SIZE = 6;
const DEFAULT_HP = 10;
const DEFAULT_AP = 2;
const DEFAULT_MOD = 3;
const DEFAULT_DC = 12;
const DEFAULT_GUARDIA = 1;

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
  return {
    id,
    species: input.species ? String(input.species) : 'unknown',
    job: input.job ? String(input.job) : 'unknown',
    traits,
    hp: Number.isFinite(Number(input.hp)) ? Number(input.hp) : DEFAULT_HP,
    ap,
    ap_remaining: Number.isFinite(Number(input.ap_remaining)) ? Number(input.ap_remaining) : ap,
    mod: Number.isFinite(Number(input.mod)) ? Number(input.mod) : DEFAULT_MOD,
    dc: Number.isFinite(Number(input.dc)) ? Number(input.dc) : DEFAULT_DC,
    guardia: Number.isFinite(Number(input.guardia)) ? Number(input.guardia) : DEFAULT_GUARDIA,
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
    if (result.hit) {
      const baseDamage = 1 + result.pt;
      const adjusted = baseDamage + evaluation.damage_modifier;
      damageDealt = Math.max(0, adjusted);
      // SPRINT_003 fase 0: traccia damage_taken cumulativo per unita'.
      // Lo stato e' in memoria (non nel log) — VC scoring lo ricalcola
      // dagli eventi per restare stateless.
      session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + damageDealt;
      target.hp = Math.max(0, target.hp - damageDealt);
      if (target.hp === 0) {
        killOccurred = true;
      }
    }
    return { result, evaluation, damageDealt, killOccurred };
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
    return {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'move',
      // SPRINT_003 fase 0: turn + ap_spent
      turn: session.turn,
      ap_spent: 1,
      position_from: positionFrom,
      position_to: { ...actor.position },
      trait_effects: [],
    };
  }

  async function runSistemaTurn(session) {
    // REGOLA_001: il Sistema seleziona l'unita' nemica con meno HP.
    // Se e' in range (Manhattan <= 2) esegue attack, altrimenti move
    // di 1 passo verso di lei. Usa lo stesso d20 dei giocatori.
    const actor = session.units.find((u) => u.id === session.active_unit);
    if (!actor) return null;
    const target = pickLowestHpEnemy(session, actor);
    if (!target) return null;

    const distance = manhattanDistance(actor.position, target.position);
    if (distance <= 2) {
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
      event.actor_id = 'sistema';
      event.actor_species = actor.species;
      event.actor_job = actor.job;
      event.ia_rule = 'REGOLA_001';
      event.ia_controlled_unit = actor.id;
      await appendEvent(session, event);
      if (killOccurred) {
        await emitKillAndAssists(session, actor, target, event);
      }
      return {
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
      };
    }

    const positionFrom = { ...actor.position };
    actor.position = stepTowards(actor.position, target.position);
    const event = buildMoveEvent({ session, actor, positionFrom });
    event.actor_id = 'sistema';
    event.ia_rule = 'REGOLA_001';
    event.ia_controlled_unit = actor.id;
    await appendEvent(session, event);
    return {
      actor: 'sistema',
      unit_id: actor.id,
      type: 'move',
      target: target.id,
      position_from: positionFrom,
      position_to: actor.position,
    };
  }

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
        const dist = manhattanDistance(actor.position, dest);
        if (dist > actor.ap) {
          return res
            .status(400)
            .json({ error: `posizione fuori range AP (distanza ${dist} > ap ${actor.ap})` });
        }
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
          cap_pt_used: session.cap_pt_used,
          cap_pt_max: session.cap_pt_max,
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

      // 1. Reset ap_remaining dell'unita' che sta terminando il turno
      const current = session.units.find((u) => u.id === session.active_unit);
      if (current) {
        current.ap_remaining = current.ap;
      }

      // 2. Passa il turno all'unita' successiva
      const nextId = nextUnitId(session);
      session.active_unit = nextId;
      session.turn += 1;

      // 3. Se la nuova unita' e' controllata dal sistema, esegui REGOLA_001
      const next = session.units.find((u) => u.id === nextId);
      let iaAction = null;
      if (next && next.controlled_by === 'sistema' && next.hp > 0) {
        iaAction = await runSistemaTurn(session);
      }

      return res.json({
        session_id: session.session_id,
        turn: session.turn,
        active_unit: session.active_unit,
        ia_action: iaAction,
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
