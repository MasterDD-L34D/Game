// TKT-ORPHAN-MORALE wire test — pure helper extracted from
// sessionRoundBridge.postResolveKills. Deterministic via real checkMorale
// forced with morale_mod (no HTTP/DB/RNG-flakiness). One test exercises all
// filters (adjacency / team / living / self) + trigger + event shape.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { moraleEventsForKill } = require('../../apps/backend/services/combat/moraleOnKill');

test('emits one morale event only for a living adjacent same-team ally', () => {
  const dead = { id: 'd1', controlled_by: 'sistema', position: { x: 1, y: 1 } };
  const units = [
    dead,
    { id: 'ally', controlled_by: 'sistema', hp: 10, morale_mod: -20, position: { x: 1, y: 2 } },
    { id: 'dead_ally', controlled_by: 'sistema', hp: 0, morale_mod: -20, position: { x: 2, y: 1 } },
    { id: 'far', controlled_by: 'sistema', hp: 10, morale_mod: -20, position: { x: 3, y: 3 } },
    { id: 'enemy', controlled_by: 'player', hp: 10, morale_mod: -20, position: { x: 0, y: 1 } },
  ];

  const evs = moraleEventsForKill(dead, units, { sessionId: 's1', turn: 4 });

  assert.equal(evs.length, 1, 'only the living adjacent same-team ally reacts');
  const e = evs[0];
  assert.equal(e.actor_id, 'ally');
  assert.equal(e.target_id, 'ally');
  assert.equal(e.action_type, 'morale');
  assert.equal(e.morale_event, 'ally_killed_adjacent');
  assert.equal(e.turn, 4);
  assert.equal(e.session_id, 's1');
  assert.ok(e.result === 'panic' || e.result === 'rage', 'panic (or rage on nat-1)');
});
