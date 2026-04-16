// X2 pattern: status effects as parallel state machines (xstate v5).
//
// Ogni status effect (panic, rage, stunned, focused, confused, bleeding,
// fracture) e' una regione parallela con stati inactive/active.
// Il round machine invia TICK a beginRound — tutte le regioni processano
// simultaneamente. APPLY_* target regioni specifiche.
//
// Vedi docs/planning/tactical-architecture-patterns.md §X2

'use strict';

const { setup, createMachine, createActor } = require('xstate');

/**
 * Crea una macchina parallela per gli status effects di una singola unit.
 * Ogni regione: inactive ↔ active, con duration tracking e stacking.
 */
function createStatusEffectsMachine() {
  return setup({
    types: {
      context:
        /** @type {{ statuses: Record<string, { duration: number, stacks: number, intensity: number }> }} */ ({}),
      events: /** @type {
        | { type: 'TICK' }
        | { type: 'APPLY_STATUS'; statusId: string; duration: number; intensity?: number; stackable?: boolean }
        | { type: 'REMOVE_STATUS'; statusId: string }
        | { type: 'CLEAR_ALL' }
      } */ ({}),
    },
    actions: {
      applyStatus: ({ context, event }) => {
        if (event.type !== 'APPLY_STATUS') return;
        const { statusId, duration, intensity = 1, stackable = false } = event;
        const existing = context.statuses[statusId];
        if (existing && existing.duration > 0 && stackable) {
          existing.stacks = Math.min((existing.stacks || 1) + 1, 3);
          existing.duration = Math.max(existing.duration, duration);
          existing.intensity = Math.max(existing.intensity, intensity);
        } else {
          context.statuses[statusId] = { duration, stacks: 1, intensity };
        }
      },
      tickAll: ({ context }) => {
        for (const [id, status] of Object.entries(context.statuses)) {
          if (status.duration > 0) {
            status.duration -= 1;
            if (status.duration <= 0) {
              status.stacks = 0;
              status.intensity = 0;
            }
          }
        }
      },
      removeStatus: ({ context, event }) => {
        if (event.type !== 'REMOVE_STATUS') return;
        delete context.statuses[event.statusId];
      },
      clearAll: ({ context }) => {
        for (const key of Object.keys(context.statuses)) {
          delete context.statuses[key];
        }
      },
    },
  }).createMachine({
    id: 'statusEffects',
    initial: 'active',
    context: {
      statuses: {},
    },
    states: {
      active: {
        on: {
          TICK: { actions: 'tickAll' },
          APPLY_STATUS: { actions: 'applyStatus' },
          REMOVE_STATUS: { actions: 'removeStatus' },
          CLEAR_ALL: { actions: 'clearAll' },
        },
      },
    },
  });
}

/**
 * Factory: crea un actor per status effects di una unit.
 * Inizializza con statuses esistenti se forniti.
 */
function createStatusActor(initialStatuses = {}) {
  const machine = createStatusEffectsMachine();
  const actor = createActor(machine, {
    snapshot: undefined,
    input: undefined,
  });
  actor.start();
  // Popola statuses iniziali
  for (const [statusId, data] of Object.entries(initialStatuses)) {
    if (data && Number(data.duration || data) > 0) {
      const duration = typeof data === 'number' ? data : Number(data.duration || 0);
      const intensity = typeof data === 'number' ? 1 : Number(data.intensity || 1);
      actor.send({
        type: 'APPLY_STATUS',
        statusId,
        duration,
        intensity,
      });
    }
  }
  return actor;
}

/**
 * Estrae snapshot leggibile degli statuses attivi.
 */
function getActiveStatuses(actor) {
  const ctx = actor.getSnapshot().context;
  const result = {};
  for (const [id, status] of Object.entries(ctx.statuses)) {
    if (status.duration > 0) {
      result[id] = { ...status };
    }
  }
  return result;
}

module.exports = {
  createStatusEffectsMachine,
  createStatusActor,
  getActiveStatuses,
};
