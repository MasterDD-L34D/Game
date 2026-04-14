// SPRINT_001 fase 3 + SPRINT_002 fase 1-4 — engine minimo giocabile.
//
// Espone 5 route sotto /api/session/*:
//   POST /start     crea sessione (units custom o default), griglia 6x6
//   GET  /state     ritorna stato corrente (units, turn, grid, active_unit)
//   POST /action    risolve attack o move (d20 + trait effects)
//   POST /turn/end  passa il turno; se tocca al sistema, esegue REGOLA_001
//   POST /end       chiude sessione e finalizza il log su disco
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

const GRID_SIZE = 6;
const DEFAULT_HP = 10;
const DEFAULT_AP = 2;
const DEFAULT_MOD = 3;
const DEFAULT_DC = 12;
const DEFAULT_GUARDIA = 1;

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
    if (result.hit) {
      const baseDamage = 1 + result.pt;
      const adjusted = baseDamage + evaluation.damage_modifier;
      damageDealt = Math.max(0, adjusted);
      target.hp = Math.max(0, target.hp - damageDealt);
    }
    return { result, evaluation, damageDealt };
  }

  function buildAttackEvent({ session, actor, target, result, evaluation, damageDealt, hpBefore }) {
    return {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'attack',
      target_id: target.id,
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
      const { result, evaluation, damageDealt } = performAttack(session, actor, target);
      const event = buildAttackEvent({
        session,
        actor,
        target,
        result,
        evaluation,
        damageDealt,
        hpBefore,
      });
      event.actor_id = 'sistema';
      event.actor_species = actor.species;
      event.actor_job = actor.job;
      event.ia_rule = 'REGOLA_001';
      event.ia_controlled_unit = actor.id;
      await appendEvent(session, event);
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

      const actionType = body.action_type;

      if (actionType === 'attack') {
        const targetId = body.target_id || body.target;
        const target = session.units.find((u) => u.id === targetId);
        if (!target) {
          return res.status(400).json({ error: `target "${targetId}" non trovato` });
        }
        const hpBefore = target.hp;
        const { result, evaluation, damageDealt } = performAttack(session, actor, target);
        const event = buildAttackEvent({
          session,
          actor,
          target,
          result,
          evaluation,
          damageDealt,
          hpBefore,
        });
        await appendEvent(session, event);
        return res.json({
          roll: result.roll,
          mos: result.mos,
          result: result.hit ? 'hit' : 'miss',
          pt: result.pt,
          damage_dealt: damageDealt,
          target_hp: target.hp,
          trait_effects: evaluation.trait_effects,
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
        await appendEvent(session, event);
        return res.json({ ok: true, actor_id: actor.id, position: actor.position });
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
