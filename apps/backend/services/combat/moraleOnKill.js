'use strict';

// TKT-ORPHAN-MORALE — Battle-Brothers morale check on ally death, extracted from
// sessionRoundBridge.postResolveKills for testability. Pure: given the killed
// unit + the unit list, returns morale event objects for each LIVING adjacent
// (Manhattan dist <= 1) same-team ally whose checkMorale triggers. checkMorale
// applies the status to the ally internally (side effect on ally.status).
//
// opts: { sessionId?, turn?, now?, rng? (session-scoped d20 rng), checkMorale? (DI for tests) }

const { checkMorale: defaultCheckMorale } = require('./morale');

function moraleEventsForKill(deadUnit, units, opts = {}) {
  const events = [];
  if (!deadUnit || !Array.isArray(units)) return events;
  const dp = deadUnit.position;
  if (!dp || !Number.isFinite(Number(dp.x)) || !Number.isFinite(Number(dp.y))) return events;

  const checkMorale =
    typeof opts.checkMorale === 'function' ? opts.checkMorale : defaultCheckMorale;
  const deadTeam = deadUnit.controlled_by || deadUnit.team;
  const now = opts.now || new Date().toISOString();

  for (const ally of units) {
    if (!ally || ally.id === deadUnit.id || Number(ally.hp || 0) <= 0) continue;
    if ((ally.controlled_by || ally.team) !== deadTeam) continue;
    const apos = ally.position;
    if (!apos || !Number.isFinite(Number(apos.x))) continue;
    const dist = Math.abs(Number(apos.x) - Number(dp.x)) + Math.abs(Number(apos.y) - Number(dp.y));
    if (dist > 1) continue;

    const res = checkMorale(ally, 'ally_killed_adjacent', { rng: opts.rng });
    if (res && res.triggered && res.status) {
      events.push({
        ts: now,
        session_id: opts.sessionId,
        action_type: 'morale',
        actor_id: ally.id,
        target_id: ally.id,
        turn: opts.turn,
        result: res.status,
        morale_event: 'ally_killed_adjacent',
        morale_score: res.score,
        morale_threshold: res.threshold,
        duration: res.duration,
      });
    }
  }
  return events;
}

module.exports = { moraleEventsForKill };
