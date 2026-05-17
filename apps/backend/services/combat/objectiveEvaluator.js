// Pluggable objective evaluator — ADR-2026-04-20 (Option C).
//
// Registry of per-type evaluator functions. Each evaluator is a pure
// function of (session, encounter, objective) → state, but may mutate
// session.objective_state to accumulate progress across ticks.
//
// Contract:
//   evaluateObjective(session, encounter, opts?) → {
//     completed: bool,
//     failed: bool,
//     progress: object,
//     reason: string,
//     outcome?: 'win' | 'wipe' | 'timeout' | 'objective_failed',
//   }
//
// Types registered:
//   - elimination     (default fallback, SIS HP=0)
//   - capture_point   (PG in zone for N consecutive turns)
//   - escort          (escort_target alive + in extract_zone)
//   - sabotage        (PG in zone N turns within time_limit)
//   - survival        (player_alive AND turn >= survive_turns)
//   - escape          (all PG in target_zone within time_limit)
//
// Feature flag:
//   encounter.objective.loss_conditions?.enabled !== false (default ON).
//   To disable the evaluator entirely for a scenario, omit objective.type.

'use strict';

const evaluators = new Map();

function register(type, fn) {
  evaluators.set(type, fn);
}

function ensureObjectiveState(session, objectiveType) {
  if (!session.objective_state || session.objective_state.type !== objectiveType) {
    session.objective_state = {
      type: objectiveType,
      completed: false,
      failed: false,
      progress: {},
      last_tick_turn: -1,
    };
  }
  return session.objective_state;
}

function countFactionAlive(session, faction) {
  return (session.units || []).filter((u) => u.controlled_by === faction && (u.hp ?? 0) > 0).length;
}

function pointInBox(pos, box) {
  if (!pos || !box || box.length < 4) return false;
  const [x, y] = pos;
  const [x1, y1, x2, y2] = box;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function playersInZone(session, box) {
  return (session.units || []).filter(
    (u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0 && pointInBox(u.position, box),
  );
}

function timeLimitExceeded(session, limit) {
  if (!limit) return false;
  const turn = Number(session.turn) || 0;
  return turn >= limit;
}

// ── Evaluators ──────────────────────────────────────────────────────

register('elimination', (session, enc, obj) => {
  const sistema = countFactionAlive(session, 'sistema');
  const player = countFactionAlive(session, 'player');
  if (sistema === 0 && player > 0) {
    return {
      completed: true,
      failed: false,
      progress: { sistema, player },
      reason: 'all_sis_down',
      outcome: 'win',
    };
  }
  if (player === 0) {
    return {
      completed: false,
      failed: true,
      progress: { sistema, player },
      reason: 'player_wipe',
      outcome: 'wipe',
    };
  }
  return { completed: false, failed: false, progress: { sistema, player }, reason: 'in_progress' };
});

register('capture_point', (session, enc, obj) => {
  const state = ensureObjectiveState(session, 'capture_point');
  const zone = obj.target_zone;
  const holdTurns = Number(obj.hold_turns) || 3;
  const minUnits = Number(obj.min_units_in_zone) || 1;
  const turn = Number(session.turn) || 0;

  if (timeLimitExceeded(session, obj.loss_conditions?.time_limit)) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'timeout',
      outcome: 'timeout',
    };
  }
  if (countFactionAlive(session, 'player') === 0) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'player_wipe',
      outcome: 'wipe',
    };
  }

  const inZone = playersInZone(session, zone).length;
  const held = inZone >= minUnits;
  if (turn > state.last_tick_turn) {
    state.progress.turns_held = held ? (state.progress.turns_held || 0) + 1 : 0;
    state.last_tick_turn = turn;
  }

  const completed = (state.progress.turns_held || 0) >= holdTurns;
  if (completed) state.completed = true;
  return {
    completed,
    failed: false,
    progress: { ...state.progress, units_in_zone: inZone, target_turns: holdTurns },
    reason: completed ? 'zone_held' : 'holding',
    outcome: completed ? 'win' : undefined,
  };
});

register('escort', (session, enc, obj) => {
  const state = ensureObjectiveState(session, 'escort');
  const targetId = obj.escort_target;
  const target = (session.units || []).find((u) => u.id === targetId);
  if (!target) {
    return {
      completed: false,
      failed: true,
      progress: {},
      reason: 'escort_target_missing',
      outcome: 'objective_failed',
    };
  }
  if ((target.hp ?? 0) <= 0) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: { escort_hp: 0 },
      reason: 'escort_target_down',
      outcome: 'objective_failed',
    };
  }
  if (timeLimitExceeded(session, obj.loss_conditions?.time_limit)) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'timeout',
      outcome: 'timeout',
    };
  }
  const extracted = obj.target_zone ? pointInBox(target.position, obj.target_zone) : false;
  if (extracted) state.completed = true;
  return {
    completed: extracted,
    failed: false,
    progress: { escort_hp: target.hp, extracted },
    reason: extracted ? 'escort_extracted' : 'escort_alive',
    outcome: extracted ? 'win' : undefined,
  };
});

register('sabotage', (session, enc, obj) => {
  const state = ensureObjectiveState(session, 'sabotage');
  const zone = obj.target_zone;
  const required = Number(obj.sabotage_turns_required) || Number(obj.hold_turns) || 2;
  const turn = Number(session.turn) || 0;

  if (timeLimitExceeded(session, obj.time_limit || obj.loss_conditions?.time_limit)) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'timeout',
      outcome: 'timeout',
    };
  }
  if (countFactionAlive(session, 'player') === 0) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'player_wipe',
      outcome: 'wipe',
    };
  }

  const inZone = playersInZone(session, zone).length;
  if (turn > state.last_tick_turn) {
    state.progress.sabotage_progress =
      inZone >= 1
        ? (state.progress.sabotage_progress || 0) + 1
        : state.progress.sabotage_progress || 0;
    state.last_tick_turn = turn;
  }
  const completed = (state.progress.sabotage_progress || 0) >= required;
  if (completed) state.completed = true;
  return {
    completed,
    failed: false,
    progress: { ...state.progress, units_in_zone: inZone, required },
    reason: completed ? 'sabotage_complete' : 'sabotaging',
    outcome: completed ? 'win' : undefined,
  };
});

register('survival', (session, enc, obj) => {
  const state = ensureObjectiveState(session, 'survival');
  const target = Number(obj.survive_turns) || 10;
  const player = countFactionAlive(session, 'player');
  const turn = Number(session.turn) || 0;
  if (player === 0) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: { turns_survived: turn },
      reason: 'player_wipe',
      outcome: 'wipe',
    };
  }
  state.progress.turns_survived = turn;
  const completed = turn >= target && player > 0;
  if (completed) state.completed = true;
  return {
    completed,
    failed: false,
    progress: { turns_survived: turn, target },
    reason: completed ? 'survived' : 'surviving',
    outcome: completed ? 'win' : undefined,
  };
});

register('escape', (session, enc, obj) => {
  const state = ensureObjectiveState(session, 'escape');
  const zone = obj.target_zone;
  if (timeLimitExceeded(session, obj.time_limit || obj.loss_conditions?.time_limit)) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'timeout',
      outcome: 'timeout',
    };
  }
  const alivePGs = (session.units || []).filter(
    (u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0,
  );
  if (alivePGs.length === 0) {
    state.failed = true;
    return {
      completed: false,
      failed: true,
      progress: state.progress,
      reason: 'player_wipe',
      outcome: 'wipe',
    };
  }
  const inZone = alivePGs.filter((u) => pointInBox(u.position, zone)).length;
  const completed = inZone === alivePGs.length;
  if (completed) state.completed = true;
  return {
    completed,
    failed: false,
    progress: { units_escaped: inZone, units_alive: alivePGs.length },
    reason: completed ? 'all_escaped' : 'escaping',
    outcome: completed ? 'win' : undefined,
  };
});

// ── Public API ──────────────────────────────────────────────────────

function evaluateObjective(session, encounter, opts = {}) {
  const objective = encounter?.objective;
  if (!objective || !objective.type) {
    return {
      completed: false,
      failed: false,
      progress: {},
      reason: 'no_objective',
    };
  }
  const fn = evaluators.get(objective.type);
  if (!fn) {
    return {
      completed: false,
      failed: false,
      progress: {},
      reason: `unknown_type:${objective.type}`,
    };
  }
  return fn(session, encounter, objective, opts);
}

module.exports = {
  evaluateObjective,
  register,
  _registry: evaluators,
  _internals: { pointInBox, playersInZone, countFactionAlive, timeLimitExceeded },
};
