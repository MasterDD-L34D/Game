/**
 * Replay Engine — Q-001 T2.4 PR-3
 *
 * MVP scope: **viewer mode** — step/seek attraverso events + apply mutazioni
 * derivate (HP, position). Non replica full session simulation (d20 roll,
 * trait effects, AI decisions) — quelli sono risolti dal server al play-time.
 *
 * Replay = navigation su event log + state estrapolato per visualizzazione.
 * Engine completo (re-simulate from seed) = PR-3b follow-up.
 *
 * API:
 *   const engine = createReplayEngine(replayPayload);
 *   engine.currentStep;              // 0
 *   engine.step();                   // 1, applica events[0]
 *   engine.seekTo(turn, actorId);    // salta a event match
 *   engine.getCurrentState();        // { units: [...], turn, events_seen }
 *   engine.reset();                  // torna a 0
 *
 * Input payload shape: output di GET /:id/replay
 */

function _deepCloneUnits(snapshot) {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.map((u) => ({ ...u, position: u.position ? { ...u.position } : null }));
}

function _applyEvent(units, event) {
  if (!event || !Array.isArray(units)) return units;
  const updated = units.map((u) => ({ ...u, position: u.position ? { ...u.position } : null }));

  const actor = updated.find((u) => u.id === event.actor_id);
  const target = updated.find((u) => u.id === event.target_id);

  switch (event.action_type) {
    case 'move':
    case 'step': {
      if (actor && event.position_to && Array.isArray(event.position_to)) {
        actor.position = { x: event.position_to[0], y: event.position_to[1] };
      }
      break;
    }
    case 'attack':
    case 'ability':
    case 'counter':
    case 'bleed': {
      if (target && Number.isFinite(Number(event.damage_dealt))) {
        target.hp = Math.max(0, (Number(target.hp) || 0) - Number(event.damage_dealt));
      }
      break;
    }
    case 'heal': {
      if (target && Number.isFinite(Number(event.damage_dealt))) {
        const dmg = Number(event.damage_dealt);
        const heal = dmg < 0 ? -dmg : dmg;
        const max = Number(target.max_hp || target.hp_max || Infinity);
        target.hp = Math.min(max, (Number(target.hp) || 0) + heal);
      }
      break;
    }
    // defend/parry/skip: status only, no deterministic state mutation
    default:
      break;
  }

  return updated;
}

function createReplayEngine(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('createReplayEngine: payload object required');
  }
  if (!Array.isArray(payload.events)) {
    throw new TypeError('createReplayEngine: payload.events array required');
  }

  const events = payload.events;
  const initialUnits = payload.units_snapshot_initial
    ? _deepCloneUnits(payload.units_snapshot_initial)
    : [];

  let currentStep = 0;
  let units = _deepCloneUnits(initialUnits);

  function _rebuildState(targetStep) {
    units = _deepCloneUnits(initialUnits);
    for (let i = 0; i < targetStep; i += 1) {
      units = _applyEvent(units, events[i]);
    }
    currentStep = targetStep;
  }

  return {
    get totalSteps() {
      return events.length;
    },
    get currentStep() {
      return currentStep;
    },
    step() {
      if (currentStep >= events.length) return currentStep;
      units = _applyEvent(units, events[currentStep]);
      currentStep += 1;
      return currentStep;
    },
    stepBack() {
      if (currentStep <= 0) return 0;
      _rebuildState(currentStep - 1);
      return currentStep;
    },
    seekTo(step) {
      const s = Math.max(0, Math.min(Number(step) || 0, events.length));
      _rebuildState(s);
      return currentStep;
    },
    seekToEvent(predicate) {
      const idx = events.findIndex(predicate);
      if (idx < 0) return null;
      _rebuildState(idx);
      return idx;
    },
    seekToTurn(turn) {
      return this.seekToEvent((e) => Number(e?.turn) >= Number(turn));
    },
    reset() {
      _rebuildState(0);
    },
    getCurrentState() {
      return {
        units,
        events_seen: currentStep,
        total_events: events.length,
        current_event: currentStep > 0 ? events[currentStep - 1] : null,
        next_event: currentStep < events.length ? events[currentStep] : null,
        turns_played: events
          .slice(0, currentStep)
          .reduce((m, e) => Math.max(m, Number(e?.turn) || 0), 0),
      };
    },
    getEvents() {
      return events.slice();
    },
  };
}

module.exports = { createReplayEngine };
