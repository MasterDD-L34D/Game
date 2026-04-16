// X1 pattern: round orchestrator as xstate statechart.
//
// Modella il round lifecycle come hierarchical state machine:
//   planning → committed → resolving → resolved → (victory | planning)
//
// Complementa roundOrchestrator.js (funzioni pure) con una macchina
// formale che rende transizioni illegali impossibili. Non sostituisce
// roundOrchestrator — lo wrappa con type-safe transitions.
//
// Vedi docs/planning/tactical-architecture-patterns.md §X1

'use strict';

const { setup, createMachine, createActor, assign } = require('xstate');

/**
 * Crea la state machine per un round di combattimento.
 *
 * @param {object} opts
 * @param {function} opts.resolveAction - (state, action, catalog, rng) → result
 * @param {function} [opts.checkVictory] - (state) → boolean
 */
function createRoundMachine(opts = {}) {
  const { resolveAction, checkVictory = () => false } = opts;

  return setup({
    types: {
      context:
        /** @type {{
          units: any[],
          pending_intents: any[],
          resolution_queue: any[],
          round: number,
          turn_log: any[],
        }} */
        ({}),
      events:
        /** @type {
          | { type: 'DECLARE_INTENT'; unitId: string; action: any }
          | { type: 'CLEAR_INTENT'; unitId: string }
          | { type: 'COMMIT' }
          | { type: 'RESOLVE_NEXT' }
          | { type: 'ROUND_DONE' }
        } */
        ({}),
    },
    guards: {
      allIntentsDeclared: ({ context }) => {
        const alive = (context.units || []).filter((u) => u && u.hp > 0);
        if (alive.length === 0) return false;
        const declared = new Set((context.pending_intents || []).map((i) => String(i.unit_id)));
        return alive.every((u) => declared.has(String(u.id)));
      },
      queueEmpty: ({ context }) => (context.resolution_queue || []).length === 0,
      hasVictory: ({ context }) => checkVictory(context),
      noVictory: ({ context }) => !checkVictory(context),
    },
    actions: {
      addIntent: assign({
        pending_intents: ({ context, event }) => {
          if (event.type !== 'DECLARE_INTENT') return context.pending_intents || [];
          const filtered = (context.pending_intents || []).filter(
            (i) => String(i.unit_id) !== String(event.unitId),
          );
          filtered.push({ unit_id: String(event.unitId), action: event.action });
          return filtered;
        },
      }),
      removeIntent: assign({
        pending_intents: ({ context, event }) => {
          if (event.type !== 'CLEAR_INTENT') return context.pending_intents || [];
          return (context.pending_intents || []).filter(
            (i) => String(i.unit_id) !== String(event.unitId),
          );
        },
      }),
      buildQueue: assign({
        resolution_queue: ({ context }) => {
          // Sort by priority desc, unitId asc (mirrors roundOrchestrator)
          const intents = [...(context.pending_intents || [])];
          intents.sort((a, b) => {
            const pa = (a.action && a.action.priority) || 0;
            const pb = (b.action && b.action.priority) || 0;
            if (pb !== pa) return pb - pa;
            return String(a.unit_id).localeCompare(String(b.unit_id));
          });
          return intents;
        },
      }),
      resolveHead: assign({
        resolution_queue: ({ context }) => (context.resolution_queue || []).slice(1),
        turn_log: ({ context }) => {
          const head = (context.resolution_queue || [])[0];
          if (!head) return context.turn_log || [];
          return [
            ...(context.turn_log || []),
            { unit_id: head.unit_id, action: head.action, resolved: true },
          ];
        },
      }),
      advanceRound: assign({
        round: ({ context }) => (context.round || 0) + 1,
        pending_intents: () => [],
        resolution_queue: () => [],
      }),
    },
  }).createMachine({
    id: 'round',
    initial: 'planning',
    context: {
      units: [],
      pending_intents: [],
      resolution_queue: [],
      round: 0,
      turn_log: [],
    },
    states: {
      planning: {
        on: {
          DECLARE_INTENT: { actions: 'addIntent' },
          CLEAR_INTENT: { actions: 'removeIntent' },
          COMMIT: { target: 'committed', guard: 'allIntentsDeclared' },
        },
      },
      committed: {
        entry: 'buildQueue',
        always: { target: 'resolving' },
      },
      resolving: {
        always: [{ target: 'resolved', guard: 'queueEmpty' }],
        on: {
          RESOLVE_NEXT: { actions: 'resolveHead' },
        },
      },
      resolved: {
        always: [
          { target: 'victory', guard: 'hasVictory' },
          { target: 'planning', guard: 'noVictory', actions: 'advanceRound' },
        ],
      },
      victory: {
        type: 'final',
      },
    },
  });
}

/**
 * Factory: crea un actor round con contesto iniziale.
 */
function createRoundActor(opts = {}, initialContext = {}) {
  const machine = createRoundMachine(opts);
  const actor = createActor(machine, {
    input: undefined,
    snapshot: initialContext.units
      ? {
          ...machine.getInitialSnapshot(),
          context: { ...machine.getInitialSnapshot().context, ...initialContext },
        }
      : undefined,
  });
  return actor;
}

module.exports = {
  createRoundMachine,
  createRoundActor,
};
