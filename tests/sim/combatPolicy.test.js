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

// OA2 item 7: min_units_in_zone > 1 must be satisfiable. Pursuers must spread
// across DISTINCT free zone tiles instead of funneling onto one entry tile --
// single-tile occupancy (session.js "niente overlap") otherwise strands the 2nd
// unit one tile outside the zone forever, capping units_in_zone at 1.
test('zone pursuit: two units from adjacent spawns BOTH reach the zone (min_units=2)', () => {
  const ZONE = [4, 4, 6, 6]; // enc_capture_01
  const obj = { type: 'capture_point', config: { target_zone: ZONE } };
  const units = [
    {
      id: 'p1',
      controlled_by: 'player',
      hp: 10,
      ap_remaining: 2,
      attack_range: 1,
      position: { x: 0, y: 0 },
    },
    {
      id: 'p2',
      controlled_by: 'player',
      hp: 10,
      ap_remaining: 2,
      attack_range: 1,
      position: { x: 0, y: 1 },
    },
    { id: 'e1', controlled_by: 'sistema', hp: 10, attack_range: 1, position: { x: 9, y: 9 } },
  ];
  const players = units.filter((u) => u.controlled_by === 'player');
  const occupiedBy = (x, y, selfId) =>
    units.find(
      (u) => u.id !== selfId && (u.hp ?? 0) > 0 && u.position.x === x && u.position.y === y,
    );
  // Mirror the backend turn+occupancy loop: one move per player per tick; a move
  // onto an occupied tile is rejected (backend returns 400 "casella occupata").
  for (let t = 0; t < 60; t += 1) {
    for (const p of players) {
      const a = selectPlayerAction(p, units, obj);
      if (!a || a.action_type !== 'move') continue;
      if (occupiedBy(a.target_position.x, a.target_position.y, p.id)) continue;
      p.position = { x: a.target_position.x, y: a.target_position.y };
    }
  }
  const inZoneTile = (pos) => pos.x >= 4 && pos.x <= 6 && pos.y >= 4 && pos.y <= 6;
  const count = players.filter((p) => inZoneTile(p.position)).length;
  assert.equal(
    count,
    2,
    `both players must hold the zone (got ${count}: ${players.map((p) => `${p.id}@[${p.position.x},${p.position.y}]`).join(' ')})`,
  );
});
