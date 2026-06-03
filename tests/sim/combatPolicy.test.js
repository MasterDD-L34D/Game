'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dist, selectPlayerAction } = require('../../tools/sim/combat-policy');

test('dist = Manhattan distance', () => {
  assert.equal(dist({ x: 0, y: 0 }, { x: 2, y: 3 }), 5);
});

test('selectPlayerAction: attacks the nearest alive enemy when in range + has AP', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 2, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'far', controlled_by: 'sistema', hp: 5, position: { x: 5, y: 0 } },
    { id: 'near', controlled_by: 'sistema', hp: 5, position: { x: 1, y: 0 } },
  ];
  assert.deepEqual(selectPlayerAction(actor, units), { action_type: 'attack', target_id: 'near' });
});

test('selectPlayerAction: steps one tile toward the target when out of range', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 4, y: 0 } }];
  const a = selectPlayerAction(actor, units);
  assert.equal(a.action_type, 'move');
  assert.deepEqual(a.target_position, { x: 1, y: 0 });
});

test('selectPlayerAction: returns null when no alive enemy', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 0, position: { x: 1, y: 0 } }];
  assert.equal(selectPlayerAction(actor, units), null);
});
