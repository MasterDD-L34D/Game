const test = require('node:test');
const assert = require('node:assert/strict');

const { createRuntimeValidator } = require('../../services/generation/runtimeValidator');

const runtimeValidator = createRuntimeValidator();

test('runtime validator normalizes species payloads', async () => {
  const species = [
    {
      id: 'spec_runtime_node',
      display_name: 'Specie Nodo',
      role_trofico: 'predatore_apice_test',
      functional_tags: 'predatore',
      vc: {},
      playable_unit: false,
      spawn_rules: {},
      balance: {},
    },
  ];
  const result = await runtimeValidator.validateSpeciesBatch(species, { biomeId: 'badlands' });
  assert.ok(Array.isArray(result.corrected));
  assert.ok(result.corrected.length === 1);
  assert.ok(result.corrected[0].role_trofico);
  assert.ok(Array.isArray(result.corrected[0].biomes));
  assert.ok(result.corrected[0].biomes.includes('badlands'));
});

test('runtime validator exposes biome sanitation', async () => {
  const biome = {
    id: 'biome_node',
    receipt: {},
    ecosistema: {},
    links: { biome_id: 'foresta_temperata' },
    registries: {},
  };
  const result = await runtimeValidator.validateBiome(biome, { defaultHazard: 'vento_forte' });
  assert.ok(result.corrected);
  assert.equal(result.corrected.hazard.id, 'vento_forte');
});
