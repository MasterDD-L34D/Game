'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dist, selectPlayerAction, pickInRangeTarget } = require('../../tools/sim/combat-policy');

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

// Post-#3214 free ordering, the AP-driven drivers act units in a FIXED order, so a
// blind primary-axis approach step deterministically funnels a unit onto a tile an
// ally already took -> 400 "casella occupata" EVERY round -> guaranteed timeout
// (fullLoopRouting enc_tutorial_05 red on main). The approach must route around
// occupied tiles like the OA2 zone-pursuit branch (item 7) already does.
test('approach: ally on the primary-axis tile -> sidesteps around it', () => {
  const actor = { id: 'p', position: { x: 1, y: 2 }, attack_range: 1, ap_remaining: 3 };
  const units = [
    actor,
    { id: 'ally', controlled_by: 'player', hp: 10, position: { x: 2, y: 2 } },
    { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 5, y: 2 } },
  ];
  const a = selectPlayerAction(actor, units);
  assert.equal(a.action_type, 'move');
  // primary axis (x+1,y) is taken by the ally; same row -> secondary axis is a
  // no-op -> perpendicular sidestep (y+1) is the first free candidate.
  assert.deepEqual(a.target_position, { x: 1, y: 3 });
});

test('approach: fully boxed in -> null (hold the tick, no 400-spam)', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [
    actor,
    { id: 'a1', controlled_by: 'player', hp: 10, position: { x: 1, y: 0 } },
    { id: 'a2', controlled_by: 'player', hp: 10, position: { x: 0, y: 1 } },
    { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 3, y: 0 } },
  ];
  // (1,0) and (0,1) occupied, (0,-1) off-board, secondary axis is a no-op ->
  // every candidate is exhausted -> hold instead of emitting a rejected move.
  assert.equal(selectPlayerAction(actor, units), null);
});

test('selectPlayerAction: returns null when no alive enemy', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 0, position: { x: 1, y: 0 } }];
  assert.equal(selectPlayerAction(actor, units), null);
});

// W5 inc-1: focus-fire (opt-in via opts.focusFire). Among IN-RANGE enemies, target the
// lowest-HP (finish-off) to concentrate damage. Default OFF = byte-identical (nearest).
test('focusFire: two enemies in range, different HP -> attacks the LOWEST-HP one', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 3, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'hi', controlled_by: 'sistema', hp: 9, position: { x: 1, y: 0 } }, // nearer, high HP
    { id: 'lo', controlled_by: 'sistema', hp: 2, position: { x: 3, y: 0 } }, // farther, low HP
  ];
  const a = selectPlayerAction(actor, units, { type: 'elimination' }, { focusFire: true });
  assert.deepEqual(a, { action_type: 'attack', target_id: 'lo' });
});

test('focusFire OFF (default) -> attacks the NEAREST in-range (byte-identical)', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 3, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'hi', controlled_by: 'sistema', hp: 9, position: { x: 1, y: 0 } },
    { id: 'lo', controlled_by: 'sistema', hp: 2, position: { x: 3, y: 0 } },
  ];
  // no opts + explicit focusFire:false both keep the legacy nearest pick
  assert.deepEqual(selectPlayerAction(actor, units, { type: 'elimination' }), {
    action_type: 'attack',
    target_id: 'hi',
  });
  assert.deepEqual(
    selectPlayerAction(actor, units, { type: 'elimination' }, { focusFire: false }),
    {
      action_type: 'attack',
      target_id: 'hi',
    },
  );
});

test('focusFire: equal HP in range -> deterministic nearest, then id tie-break', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 3, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'b', controlled_by: 'sistema', hp: 5, position: { x: 2, y: 0 } },
    { id: 'a', controlled_by: 'sistema', hp: 5, position: { x: 1, y: 0 } }, // nearer -> wins
  ];
  const r = selectPlayerAction(actor, units, { type: 'elimination' }, { focusFire: true });
  assert.deepEqual(r, { action_type: 'attack', target_id: 'a' });
});

test('focusFire: low-HP enemy OUT of range, full-HP in range -> attacks in-range (no chase-out)', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'near', controlled_by: 'sistema', hp: 9, position: { x: 1, y: 0 } }, // in range
    { id: 'weak', controlled_by: 'sistema', hp: 1, position: { x: 5, y: 0 } }, // far, low HP
  ];
  const r = selectPlayerAction(actor, units, { type: 'elimination' }, { focusFire: true });
  assert.deepEqual(r, { action_type: 'attack', target_id: 'near' });
});

test('focusFire: none in range -> approaches nearest (unchanged)', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 2, position: { x: 4, y: 0 } }];
  const r = selectPlayerAction(actor, units, { type: 'elimination' }, { focusFire: true });
  assert.equal(r.action_type, 'move');
  assert.deepEqual(r.target_position, { x: 1, y: 0 });
});

// Codex P2 #3127: focusFire must be honored in the OA2 in-zone attack path too (attacking
// does not move the actor, so focusing a low-HP in-range foe keeps the hold intact).
test('focusFire IN zone: attacks lowest-HP in-range foe, not nearest', () => {
  const actor = { id: 'p', position: { x: 5, y: 5 }, attack_range: 2, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'hi', controlled_by: 'sistema', hp: 9, position: { x: 5, y: 6 } }, // adjacent, high HP
    { id: 'lo', controlled_by: 'sistema', hp: 2, position: { x: 6, y: 6 } }, // dist 2, low HP
  ];
  const obj = { type: 'capture_point', config: { target_zone: [4, 4, 6, 6] } };
  const r = selectPlayerAction(actor, units, obj, { focusFire: true });
  assert.deepEqual(r, { action_type: 'attack', target_id: 'lo' });
});

test('in zone default (no focusFire): still attacks the nearest in-range (byte-identical)', () => {
  const actor = { id: 'p', position: { x: 5, y: 5 }, attack_range: 2, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'hi', controlled_by: 'sistema', hp: 9, position: { x: 5, y: 6 } }, // nearest
    { id: 'lo', controlled_by: 'sistema', hp: 2, position: { x: 6, y: 6 } },
  ];
  const obj = { type: 'capture_point', config: { target_zone: [4, 4, 6, 6] } };
  assert.deepEqual(selectPlayerAction(actor, units, obj), {
    action_type: 'attack',
    target_id: 'hi',
  });
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

// Task 6 (LOS parity seam): pickInRangeTarget accepts an optional losFn and, when
// provided, also requires it -- so an in-range but LOS-blocked enemy is excluded.
test('pickInRangeTarget: losFn blocking the only in-range enemy -> null', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 5 };
  const enemy = { id: 'e', hp: 5, position: { x: 4, y: 0 } };
  assert.equal(
    pickInRangeTarget(actor, [enemy], false, () => false),
    null,
  );
  assert.deepEqual(
    pickInRangeTarget(actor, [enemy], false, () => true),
    enemy,
  );
});

// Task 6 integration: selectPlayerAction wires opts.terrainFeatures through the shared
// production losClearForAi (apps/backend/services/ai/policy.js), so the sim measures the
// SAME LOS rule as production. Flag ON + a roccia blocker strictly between actor and the
// only enemy -> the in-range attack is filtered out.
// Task 2 (AI LOS-repositioning): with the reposition wiring, this now takes the
// stepToRegainLos path (a perpendicular one-tile step that reopens a firing line),
// NOT the plain stepToward-approach. A single-tile wall at (2,0) leaves a legal
// reopening step, so the destination lands OFF the enemy's row (y != 0) -- proving
// the reposition path fired rather than a straight stepToward toward the enemy
// (which would advance on x and stay on row 0).
test('flag ON: LOS-blocked enemy triggers repositioning', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  try {
    const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 5, ap_remaining: 1 };
    const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 4, y: 0 } }];
    const terrainFeatures = [{ x: 2, y: 0, type: 'roccia' }];
    const a = selectPlayerAction(actor, units, { type: 'elimination' }, { terrainFeatures });
    assert.equal(a.action_type, 'move');
    // reposition moved perpendicular (off row 0), not a stepToward along row 0 at the wall.
    assert.notEqual(a.target_position.y, 0);
  } finally {
    delete process.env.COMBAT_LOS_ENABLED;
  }
});

test('selectPlayerAction: same LOS-blocking geometry, flag OFF -> byte-identical attack', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 5, ap_remaining: 1 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 4, y: 0 } }];
  const terrainFeatures = [{ x: 2, y: 0, type: 'roccia' }];
  const a = selectPlayerAction(actor, units, { type: 'elimination' }, { terrainFeatures });
  assert.deepEqual(a, { action_type: 'attack', target_id: 'e' });
});

// Task 2 (AI LOS-repositioning): the sim player-proxy plays "shoot whoever is visible", so
// it passes ALL enemies to stepToRegainLos. When the only in-range enemy is LOS-blocked, the
// proxy should try a one-tile reposition that reopens a firing line BEFORE falling back to
// the dumb stepToward-along-the-wall approach.
test('flag ON: LOS-blocked ranged attacker repositions instead of walking at the wall', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = {
    id: 'p1',
    position: { x: 0, y: 1 },
    attack_range: 5,
    ap_remaining: 2,
    controlled_by: 'player',
  };
  const enemy = { id: 'e1', position: { x: 4, y: 1 }, hp: 10, controlled_by: 'sistema' };
  const units = [actor, enemy];
  const opts = {
    terrainFeatures: [
      { x: 2, y: 0, type: 'roccia' },
      { x: 2, y: 1, type: 'roccia' },
    ],
    gridSize: 6,
  };
  const action = selectPlayerAction(actor, units, null, opts);
  // LOS blocked -> not an attack; should move to a tile that reopens LOS (y changes off row 1),
  // not a plain stepToward along row 1.
  assert.equal(action.action_type, 'move');
  assert.notEqual(action.target_position.y, 1);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag OFF: same setup is byte-identical (in-range attack, LOS ignored)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const actor = {
    id: 'p1',
    position: { x: 0, y: 1 },
    attack_range: 5,
    ap_remaining: 2,
    controlled_by: 'player',
  };
  const enemy = { id: 'e1', position: { x: 4, y: 1 }, hp: 10, controlled_by: 'sistema' };
  const units = [actor, enemy];
  const opts = {
    terrainFeatures: [
      { x: 2, y: 0, type: 'roccia' },
      { x: 2, y: 1, type: 'roccia' },
    ],
    gridSize: 6,
  };
  const action = selectPlayerAction(actor, units, null, opts);
  assert.equal(action.action_type, 'attack');
  delete process.env.COMBAT_LOS_ENABLED;
});

// Budget lookahead (v2): flag ON + LOS-blocked and NO single 4-neighbor step reopens a
// firing line (a FULL vertical wall), but the actor's AP budget reaches a reopening tile
// two steps away -- standing ON the wall column (terrain blocks LOS, not movement;
// endpoints are excluded by squareLos, so (2,1) sees the enemy at (4,1) across the free
// (3,1)). Reserve phase (budget ap-1 = 1) finds nothing; the full-budget phase (2) must
// spend the whole pool to set up next turn's shot instead of the dumb stepToward.
test('flag ON: no one-step reopening but a full-budget tile exists -> multi-tile reposition', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = {
    id: 'p1',
    position: { x: 0, y: 1 },
    attack_range: 5,
    ap_remaining: 2,
    controlled_by: 'player',
  };
  const enemy = { id: 'e1', position: { x: 4, y: 1 }, hp: 10, controlled_by: 'sistema' };
  const units = [actor, enemy];
  const opts = {
    terrainFeatures: [
      { x: 2, y: 0, type: 'roccia' },
      { x: 2, y: 1, type: 'roccia' },
      { x: 2, y: 2, type: 'roccia' },
      { x: 2, y: 3, type: 'roccia' },
      { x: 2, y: 4, type: 'roccia' },
      { x: 2, y: 5, type: 'roccia' },
    ],
    gridSize: 6,
  };
  const action = selectPlayerAction(actor, units, null, opts);
  assert.equal(action.action_type, 'move');
  assert.deepEqual(action.target_position, { x: 2, y: 1 });
  delete process.env.COMBAT_LOS_ENABLED;
});

// Turn-starved guard ("never worse than today"): with 1 AP left the budget lookahead
// cannot reach past the 4-neighbors (reserve phase budget 0 -> null; full phase budget 1
// = the shipped greedy step, which the FULL wall defeats) -> graceful stepToward fallback.
// Pins that the heuristic NEVER returns a tile costing more than ap_remaining.
test('flag ON: turn-starved (1 AP) + full wall -> graceful stepToward fallback (never worse than today)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = {
    id: 'p1',
    position: { x: 0, y: 1 },
    attack_range: 5,
    ap_remaining: 1,
    controlled_by: 'player',
  };
  const enemy = { id: 'e1', position: { x: 4, y: 1 }, hp: 10, controlled_by: 'sistema' };
  const units = [actor, enemy];
  const opts = {
    terrainFeatures: [
      { x: 2, y: 0, type: 'roccia' },
      { x: 2, y: 1, type: 'roccia' },
      { x: 2, y: 2, type: 'roccia' },
      { x: 2, y: 3, type: 'roccia' },
      { x: 2, y: 4, type: 'roccia' },
      { x: 2, y: 5, type: 'roccia' },
    ],
    gridSize: 6,
  };
  const action = selectPlayerAction(actor, units, null, opts);
  // Full wall defeats budget 1 -> fall through to the plain approach (stepToward).
  assert.equal(action.action_type, 'move');
  assert.equal(action.target_position.x, 1);
  assert.equal(action.target_position.y, 1);
  delete process.env.COMBAT_LOS_ENABLED;
});
