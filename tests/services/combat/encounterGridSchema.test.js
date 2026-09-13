// tests/services/combat/encounterGridSchema.test.js
// Move terrain-cost substrate (2026-06-29): the additive `grid.terrain_features`
// extension to encounter.schema.json (lava-wall hazard encounters). Red->green TDD.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');

const SCHEMA_PATH = path.join(__dirname, '../../../schemas/evo/encounter.schema.json');

function makeValidator() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

const baseEncounter = {
  encounter_id: 'enc_grid_fixture',
  name: 'Grid Fixture',
  biome_id: 'deserto_caldo',
  grid_size: [8, 8],
  objective: { type: 'elimination' },
  player_spawn: [[0, 0]],
  waves: [
    { wave_id: 1, turn_trigger: 0, spawn_points: [[7, 7]], units: [{ species: 'x', count: 1 }] },
  ],
  difficulty_rating: 3,
};

test('encounter schema accepts grid.terrain_features (lava)', () => {
  const validate = makeValidator();
  const data = {
    ...baseEncounter,
    grid: {
      width: 8,
      height: 8,
      terrain_features: [
        { x: 3, y: 0, type: 'lava', defense_mod: 0 },
        { x: 4, y: 0, type: 'roccia', defense_mod: 2 },
      ],
    },
  };
  const valid = validate(data);
  assert.ok(valid, JSON.stringify(validate.errors));
});

test('encounter schema rejects an unknown terrain type', () => {
  const validate = makeValidator();
  const data = {
    ...baseEncounter,
    grid: { width: 8, height: 8, terrain_features: [{ x: 1, y: 1, type: 'plasma' }] },
  };
  assert.equal(validate(data), false);
});

test('encounter schema still accepts an encounter with NO grid key (backward-compat)', () => {
  const validate = makeValidator();
  assert.ok(validate({ ...baseEncounter }), JSON.stringify(validate.errors));
});
