// SPRINT_001 fase 3 — engine minimo giocabile.
//
// Espone 4 route sotto /api/session/*:
//   POST /start   crea sessione, piazza 2 unita' su griglia 6x6
//   GET  /state   ritorna stato corrente (unita', turno, griglia)
//   POST /action  risolve attack o move (d20)
//   POST /end     chiude sessione e finalizza il log su disco
//
// Lo stato sessione vive in memoria (Map session_id -> session). Il log
// degli eventi viene appeso a `logs/session_YYYYMMDD_HHMMSS.json` ad
// ogni azione e finalizzato a /end.
//
// Le formule del d20 seguono il GDD v0.1 ("Sistema Dadi Ibrido"):
//   roll = d20 + mod_caratteristica
//   mos  = roll - dc_difesa
//   hit  = mos >= 0
//   pt   = 0
//   if hit:
//     if die >= 15 and die <= 19: pt += 1
//     if die == 20:               pt += 2
//     pt += floor(mos / 5)

const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { Router } = require('express');

const GRID_SIZE = 6;
const DEFAULT_HP = 10;
const DEFAULT_AP = 4;
const DEFAULT_MOD = 2;
const DEFAULT_DC = 13;

function rollD20(rng) {
  return Math.floor(rng() * 20) + 1;
}

function buildInitialUnits() {
  return [
    {
      id: 'unit_1',
      species: 'predatore_alfa',
      job: 'striker',
      hp: DEFAULT_HP,
      ap: DEFAULT_AP,
      position: { x: 1, y: 1 },
      mod: DEFAULT_MOD,
      dc_difesa: DEFAULT_DC,
    },
    {
      id: 'unit_2',
      species: 'sentinella_psi',
      job: 'guardian',
      hp: DEFAULT_HP,
      ap: DEFAULT_AP,
      position: { x: 4, y: 4 },
      mod: DEFAULT_MOD,
      dc_difesa: DEFAULT_DC,
    },
  ];
}

function resolveAttack({ actor, target, rng }) {
  const die = rollD20(rng);
  const roll = die + (actor.mod || 0);
  const dc = target.dc_difesa ?? 10 + (target.mod || 0);
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
    units: session.units,
    grid: session.grid,
  };
}

function createSessionRouter(options = {}) {
  const router = Router();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const logsDir = options.logsDir || path.join(repoRoot, 'logs');
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;

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

  router.post('/start', async (req, res, next) => {
    try {
      const sessionId = newSessionId();
      const now = new Date();
      const logFilePath = path.join(logsDir, `session_${timestampStamp(now)}.json`);
      const session = {
        session_id: sessionId,
        turn: 1,
        units: buildInitialUnits(),
        grid: { width: GRID_SIZE, height: GRID_SIZE },
        logFilePath,
        events: [],
        created_at: now.toISOString(),
      };
      sessions.set(sessionId, session);
      activeSessionId = sessionId;
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(logFilePath, '[]\n', 'utf8');
      res.json({ ...publicSessionView(session), log_file: logFilePath });
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
        const result = resolveAttack({ actor, target, rng });
        if (result.hit) {
          target.hp = Math.max(0, target.hp - 1 - result.pt);
        }
        const event = {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: actor.id,
          action_type: 'attack',
          target_id: target.id,
          die: result.die,
          roll: result.roll,
          dc: result.dc,
          mos: result.mos,
          result: result.hit ? 'hit' : 'miss',
          pt: result.pt,
          position_from: { ...actor.position },
          position_to: { ...actor.position },
        };
        await appendEvent(session, event);
        return res.json({
          roll: result.roll,
          mos: result.mos,
          result: result.hit ? 'hit' : 'miss',
          pt: result.pt,
          target_hp: target.hp,
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
        const dist = Math.abs(dest.x - actor.position.x) + Math.abs(dest.y - actor.position.y);
        if (dist > actor.ap) {
          return res
            .status(400)
            .json({ error: `posizione fuori range AP (distanza ${dist} > ap ${actor.ap})` });
        }
        const positionFrom = { ...actor.position };
        actor.position = { x: dest.x, y: dest.y };
        const event = {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: actor.id,
          action_type: 'move',
          position_from: positionFrom,
          position_to: { ...actor.position },
        };
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
  buildInitialUnits,
  GRID_SIZE,
};
