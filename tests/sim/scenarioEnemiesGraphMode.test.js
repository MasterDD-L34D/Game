'use strict';

// GAP-C option-C band-verify wiring: the sim must fight the REAL draft node-encounter
// rosters in graph mode (mirror combat C1). Without graphMode, draft ids stay null ->
// runner falls back to the weak-fixed enemy (the pre-C1 sim behavior, static-band-safe).

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildScenarioEnemies } = require('../../tools/sim/scenario-enemies');

test('buildScenarioEnemies: draft id -> null without graphMode (encounters/-only)', () => {
  assert.equal(buildScenarioEnemies('enc_tutorial_03'), null);
});

test('buildScenarioEnemies: draft id -> real roster with graphMode (unions encounters-draft/)', () => {
  const enemies = buildScenarioEnemies('enc_tutorial_03', {}, { graphMode: true });
  assert.ok(Array.isArray(enemies) && enemies.length > 0, 'draft roster built in graph mode');
  assert.ok(enemies[0].hp > 0, 'enemy has hp');
  assert.equal(enemies[0].controlled_by, 'sistema');
});

test('buildScenarioEnemies: live id builds in both modes (static unchanged)', () => {
  assert.ok(buildScenarioEnemies('enc_savana_01'), 'live encounter in static mode');
  assert.ok(buildScenarioEnemies('enc_savana_01', {}, { graphMode: true }), 'live in graph mode');
});
