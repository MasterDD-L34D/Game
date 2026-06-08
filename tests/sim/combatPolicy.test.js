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

// OA2 (SPEC-O): objective-aware zone-pursuit so non-elimination objectives complete in the sim.
test('zone objective + actor outside zone -> moves toward the zone, NOT the enemy', () => {
  const actor = { id: 'p', position: { x: 5, y: 5 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 9, y: 9 } }];
  const obj = { type: 'capture_point', config: { target_zone: [0, 0, 2, 2] } }; // centroid (1,1) up-left
  const a = selectPlayerAction(actor, units, obj);
  assert.equal(a.action_type, 'move');
  assert.deepEqual(a.target_position, { x: 4, y: 5 }); // toward zone (-x), not enemy (+x)
});

test('zone objective + actor INSIDE zone + adjacent enemy -> attacks (in range)', () => {
  const actor = { id: 'p', position: { x: 5, y: 5 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 5, y: 6 } }];
  const obj = { type: 'sabotage', config: { target_zone: [4, 4, 6, 6] } };
  const a = selectPlayerAction(actor, units, obj);
  assert.deepEqual(a, { action_type: 'attack', target_id: 'e' });
});

test('zone objective + actor IN zone + FAR enemy -> HOLDS (null), does not chase out', () => {
  const actor = { id: 'p', position: { x: 5, y: 5 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 9, y: 9 } }];
  const obj = { type: 'capture_point', config: { target_zone: [4, 4, 6, 6] } };
  assert.equal(selectPlayerAction(actor, units, obj), null); // hold -> objective ticks
});

test('elimination objective -> closest-enemy (unchanged)', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 4, y: 0 } }];
  const a = selectPlayerAction(actor, units, { type: 'elimination' });
  assert.deepEqual(a.target_position, { x: 1, y: 0 }); // toward enemy
});

test('no objective arg -> backward compat (closest enemy)', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 4, y: 0 } }];
  assert.deepEqual(selectPlayerAction(actor, units).target_position, { x: 1, y: 0 });
});
