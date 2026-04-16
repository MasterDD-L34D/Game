// X3 pattern: Sistema AI as xstate actor model.
//
// Sistema come actor con propria FSM:
//   observing → planning → declaring → waiting
//
// Parent (round machine) spawna un actor per ogni unita AI-controlled.
// Comunicazione: Sistema invia DECLARE_INTENT al parent via callback,
// parent invia TURN_RESULT dopo risoluzione.
//
// Vedi docs/planning/tactical-architecture-patterns.md §X3

'use strict';

const { setup, createMachine, createActor, fromPromise, assign } = require('xstate');
const { selectAiPolicy, manhattanDistance } = require('./policy');

/**
 * Crea la state machine per una singola unita Sistema.
 *
 * @param {object} deps
 * @param {function} deps.pickTarget - (units, actor) → target unit
 * @param {function} [deps.onDeclareIntent] - callback (unitId, intent) → void
 */
function createSistemaMachine(deps = {}) {
  const { pickTarget, onDeclareIntent } = deps;

  return setup({
    types: {
      context:
        /** @type {{
          unitId: string,
          policy: { rule: string, intent: string } | null,
          targetId: string | null,
        }} */
        ({}),
      events:
        /** @type {
          | { type: 'OBSERVE'; units: any[] }
          | { type: 'TURN_RESULT'; result: any }
          | { type: 'RESET' }
        } */
        ({}),
    },
    actions: {
      pickTargetAndPolicy: assign(({ context, event }) => {
        if (event.type !== 'OBSERVE' || !pickTarget) return {};
        const units = event.units || [];
        const actor = units.find((u) => u.id === context.unitId);
        if (!actor || actor.hp <= 0) return { policy: null, targetId: null };
        const target = pickTarget(units, actor);
        if (!target) return { policy: null, targetId: null };
        const policy = selectAiPolicy(actor, target);
        return { policy, targetId: target.id };
      }),
      declareIntent: ({ context }) => {
        if (onDeclareIntent && context.policy) {
          onDeclareIntent(context.unitId, context.policy);
        }
      },
      resetState: assign({ policy: null, targetId: null }),
    },
  }).createMachine({
    id: 'sistema-unit',
    initial: 'idle',
    context: {
      unitId: '',
      policy: null,
      targetId: null,
    },
    states: {
      idle: {
        on: {
          OBSERVE: { target: 'planning', actions: 'pickTargetAndPolicy' },
        },
      },
      planning: {
        always: [
          { target: 'idle', guard: ({ context }) => !context.policy },
          { target: 'declaring' },
        ],
      },
      declaring: {
        entry: 'declareIntent',
        always: { target: 'waiting' },
      },
      waiting: {
        on: {
          TURN_RESULT: { target: 'idle', actions: 'resetState' },
          RESET: { target: 'idle', actions: 'resetState' },
        },
      },
    },
  });
}

/**
 * Factory: crea un actor Sistema per una unit specifica.
 */
function createSistemaActor(unitId, deps = {}) {
  const machine = createSistemaMachine(deps);
  const actor = createActor(machine);
  // Inject unitId in context before start
  actor.getSnapshot().context.unitId = unitId;
  actor.start();
  return actor;
}

module.exports = {
  createSistemaMachine,
  createSistemaActor,
};
