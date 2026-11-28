const test = require('node:test');
const assert = require('node:assert/strict');

const { translatePathfinderStatblock } = require('../../services/generation/biomeSynthesizer');

test('translatePathfinderStatblock throws Error on invalid statblock', () => {
  assert.throws(
    () => translatePathfinderStatblock(null),
    (err) => err.message.includes('Statblock Pathfinder non valido'),
  );
  assert.throws(
    () => translatePathfinderStatblock(42),
    (err) => err.message.includes('Statblock Pathfinder non valido'),
  );
});

test('translatePathfinderStatblock characterizes minimal valid statblock without context', () => {
  const result = translatePathfinderStatblock({
    id: 'gob',
    name: 'Goblin',
    type: 'Humanoid',
    axes: {},
  });

  assert.equal(result.id, 'pathfinder-gob');
  assert.equal(result.display_name, 'Goblin');
  assert.ok(result.functional_tags.includes('pathfinder'));
  assert.ok(result.functional_tags.includes('humanoid'));
  assert.deepEqual(result.biomes, []);
  assert.equal(result.playable_unit, false);
  assert.equal(result.environment_affinity.biome_class, 'pathfinder_unknown');
  assert.ok(result.traits.core.includes('pathfinder'));
  assert.equal(result.source_dataset.profile_id, 'gob');
});

test('translatePathfinderStatblock characterizes context with biomeId set', () => {
  const result = translatePathfinderStatblock(
    { id: 'gob', type: 'Humanoid', axes: {} },
    { biomeId: 'foresta' },
  );

  assert.deepEqual(result.biomes, ['foresta']);
  assert.equal(result.environment_affinity.biome_class, 'foresta');
});

test('translatePathfinderStatblock characterizes display_name fallbacks', () => {
  const resultIdOnly = translatePathfinderStatblock({ id: 'gob', axes: {} });
  assert.equal(resultIdOnly.display_name, 'gob');

  const resultNoNameNoId = translatePathfinderStatblock({ axes: {} });
  assert.equal(resultNoNameNoId.display_name, 'Creatura Pathfinder');
});

test('translatePathfinderStatblock characterizes fallbackTraits in context', () => {
  const result = translatePathfinderStatblock(
    { id: 'gob', genetic_traits: ['z', 'x'], axes: {} },
    { fallbackTraits: ['x', 'pathfinder', 'y'] },
  );

  assert.deepEqual(result.traits.core, ['pathfinder', 'z', 'x', 'y']);
});
