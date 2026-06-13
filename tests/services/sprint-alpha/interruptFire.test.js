// Sprint α — Interrupt fire stack tests (JA3 pattern).
//
// 3 cases: queue order init+perk, priority resolution + FIFO tiebreaker,
// no-conflict adjacency (multiple intents stessa cella enqueueable).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addToQueue,
  resolveQueue,
  peekQueue,
  clearQueue,
  computePriority,
  QUEUE_KEY,
} = require('../../../apps/backend/services/combat/interruptFire');

test('interruptFire: computePriority = initiative + reaction_speed_bonus', () => {
  const actor = { initiative: 4, reaction_speed_bonus: 2 };
  assert.equal(computePriority(actor, {}), 6);
  assert.equal(computePriority({ initiative: 3 }, {}), 3);
  assert.equal(computePriority({}, {}), 0);
  assert.equal(computePriority(null, {}), 0);
});

test('interruptFire: addToQueue + resolveQueue priority desc + FIFO tiebreaker', () => {
  const session = {};
  // 3 intents, priority sort 8 > 6 > 5 (FIFO between equals)
  addToQueue(session, { actor_id: 'a', action: { type: 'attack' }, priority: 5 });
  addToQueue(session, { actor_id: 'b', action: { type: 'attack' }, priority: 8 });
  addToQueue(session, { actor_id: 'c', action: { type: 'attack' }, priority: 6 });
  addToQueue(session, { actor_id: 'd', action: { type: 'attack' }, priority: 8 });
  assert.equal(peekQueue(session).length, 4);
  const exec = (intent) => ({ done: true, who: intent.actor_id });
  const r = resolveQueue(session, exec);
  assert.equal(r.resolved, 4);
  // Order check: b (pri 8, FIFO 1), d (pri 8, FIFO 3), c (pri 6), a (pri 5)
  assert.deepEqual(
    r.results.map((x) => x.actor_id),
    ['b', 'd', 'c', 'a'],
  );
  assert.equal(peekQueue(session).length, 0, 'queue drained post-resolve');
});

test('interruptFire: no-conflict adjacency — multi intents enqueueable + clearQueue', () => {
  const session = {};
  // 2 different actors targeting same cell, both interrupts. No collision.
  addToQueue(session, {
    actor_id: 'overwatch_x',
    action: { type: 'attack', target_pos: { x: 3, y: 3 } },
    actor: { initiative: 5, reaction_speed_bonus: 1 },
  });
  addToQueue(session, {
    actor_id: 'overwatch_y',
    action: { type: 'attack', target_pos: { x: 3, y: 3 } },
    actor: { initiative: 4, reaction_speed_bonus: 0 },
  });
  assert.equal(session[QUEUE_KEY].length, 2);
  // computePriority used quando priority esplicita non passata
  assert.equal(session[QUEUE_KEY][0].priority, 6); // 5+1
  assert.equal(session[QUEUE_KEY][1].priority, 4);
  clearQueue(session);
  assert.equal(peekQueue(session).length, 0);
});
