'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { selectPlayerAction } = require('../../tools/sim/combat-policy');

// Regression (bug C, #2662-era OA2): zone-pursuit read `objective.config.target_zone`, but the
// objective shape returned by GET /:id/objective (and consumed by the evaluator) carries
// `target_zone` at the TOP level. So `zone` was undefined -> the zone-pursuit branch never
// fired -> players fell through to closest-enemy and never moved to the capture/sabotage/escape
// zone -> those objectives could not complete in the sim. Drive on the real (top-level) shape.
test('zone-pursuit drives toward the zone (top-level target_zone), not the far enemy', () => {
  const actor = {
    id: 'p1',
    position: { x: 0, y: 0 },
    attack_range: 2,
    ap_remaining: 3,
    controlled_by: 'player',
  };
  // Enemy far in +y; the zone centroid is in +x -> the two intents yield DIFFERENT first moves,
  // so the test distinguishes zone-pursuit from the closest-enemy fallback.
  const units = [actor, { id: 'foe', controlled_by: 'sistema', hp: 10, position: { x: 0, y: 9 } }];
  const objective = { type: 'capture_point', target_zone: [4, 4, 6, 6] };
  const action = selectPlayerAction(actor, units, objective);
  assert.equal(action.action_type, 'move');
  // zone centroid (5,5): from (0,0) the x-axis tie-break steps to {x:1,y:0}. The BUG (config
  // undefined -> closest-enemy at (0,9)) steps to {x:0,y:1}.
  assert.deepEqual(
    action.target_position,
    { x: 1, y: 0 },
    'must pursue the zone, not the far enemy',
  );
});
