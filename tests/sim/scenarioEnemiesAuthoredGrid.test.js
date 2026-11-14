'use strict';
// fase-2c grid-wiring (ADR-2026-07-03) sim parity: for a board_scale:'grid_sized' encounter the sim
// must clamp authored spawn points to the AUTHORED bound (grid_size), not the conservative
// GRID_SAFE_MAX(5). party_sized/absent keeps the GRID_SAFE_MAX clamp (byte-identical).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildScenarioEnemies } = require('../../tools/sim/scenario-enemies');

const DIR = path.resolve(__dirname, '../../docs/planning/encounters');
const AUTH_ID = 'enc__test_fase2c_authored__';
const PARTY_ID = 'enc__test_fase2c_party__';
const authFile = path.join(DIR, `${AUTH_ID}.yaml`);
const partyFile = path.join(DIR, `${PARTY_ID}.yaml`);

// Spawn at (10, 9): on a 12x12 authored board it is valid; under the legacy GRID_SAFE_MAX(5)
// clamp it would be squashed to (5, 5).
const AUTH_YAML = `board_scale: grid_sized
grid_size: [12, 12]
objective: { type: elimination }
waves:
  - turn_trigger: 0
    spawn_points: [[10, 9]]
    units: [{ species: predoni_nomadi, tier: base, count: 1 }]
`;
const PARTY_YAML = `board_scale: party_sized
grid_size: [12, 12]
objective: { type: elimination }
waves:
  - turn_trigger: 0
    spawn_points: [[10, 9]]
    units: [{ species: predoni_nomadi, tier: base, count: 1 }]
`;

before(() => {
  fs.writeFileSync(authFile, AUTH_YAML, 'utf8');
  fs.writeFileSync(partyFile, PARTY_YAML, 'utf8');
});
after(() => {
  for (const f of [authFile, partyFile]) {
    try {
      fs.unlinkSync(f);
    } catch {}
  }
});

test('grid_sized board: authored spawn stays on-grid (not clamped to GRID_SAFE_MAX)', () => {
  const enemies = buildScenarioEnemies(AUTH_ID);
  assert.ok(Array.isArray(enemies) && enemies.length === 1);
  assert.equal(enemies[0].position.x, 10); // pre-fase-2c this was clamped to 5
  assert.equal(enemies[0].position.y, 9);
});

test('party_sized board: spawn clamped to GRID_SAFE_MAX (byte-identical legacy)', () => {
  const enemies = buildScenarioEnemies(PARTY_ID);
  assert.ok(Array.isArray(enemies) && enemies.length === 1);
  assert.equal(enemies[0].position.x, 5); // GRID_SAFE_MAX clamp unchanged
  assert.equal(enemies[0].position.y, 5);
});
