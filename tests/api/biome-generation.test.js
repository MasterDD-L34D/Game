const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const REQUIRED_ROLES = ['apex', 'keystone', 'threat'];

function hasRole(species, role) {
  if (!species?.flags) return false;
  return Boolean(species.flags[role]);
}

test('POST /api/v1/generation/biomes produce biomi sintetici coerenti con i vincoli', async () => {
  const dataRoot = path.resolve(__dirname, '..', '..', 'data');
  const { app } = createApp({ dataRoot });

  const response = await request(app)
    .post('/api/v1/generation/biomes')
    .send({
      count: 3,
      constraints: {
        hazard: 'high',
        minSize: 4,
        requiredRoles: REQUIRED_ROLES,
        preferredTags: ['criogenico', 'imboscata'],
      },
    })
    .expect(200);

  const { biomes, meta } = response.body;
  assert.ok(Array.isArray(biomes), 'la risposta deve contenere un array di biomi');
  assert.equal(biomes.length, 3, 'devono essere generati 3 biomi');
  assert.ok(meta?.applied, 'la risposta deve includere metadati sui vincoli applicati');
  assert.equal(meta.applied.hazard, 'high');

  biomes.forEach((biome, index) => {
    assert.equal(biome.synthetic, true, `biome ${index} deve essere marcato come sintetico`);
    assert.ok(
      Array.isArray(biome.traits?.ids),
      "il bioma deve includere l'elenco dei tratti selezionati",
    );
    assert.ok(
      (biome.traits.ids ?? []).length >= 3,
      'il bioma deve avere almeno tre tratti ambientali',
    );
    assert.ok(Array.isArray(biome.species), 'il bioma deve includere specie di supporto');
    assert.ok(
      biome.species.length >= REQUIRED_ROLES.length,
      'devono essere presenti abbastanza specie per coprire i ruoli',
    );
    assert.ok(biome.hazard?.severity, "il bioma deve riportare la severità dell'hazard");
    assert.equal(biome.hazard.severity, 'high');
    assert.ok(
      Number.isFinite(biome.metrics?.zoneCount),
      'il bioma deve riportare la dimensione stimata',
    );
    assert.ok(
      biome.metrics.zoneCount >= 4,
      'la dimensione minima deve rispettare il vincolo richiesto',
    );

    const roleCoverage = new Set();
    biome.species.forEach((species) => {
      assert.equal(
        species.synthetic,
        true,
        'le specie generate devono essere marcate come sintetiche',
      );
      assert.ok(species.display_name, 'ogni specie deve avere un nome visuale');
      REQUIRED_ROLES.forEach((role) => {
        if (hasRole(species, role)) {
          roleCoverage.add(role);
        }
      });
      assert.ok(species.balance?.threat_tier, 'ogni specie deve avere un tier di minaccia');
    });
    REQUIRED_ROLES.forEach((role) => {
      assert.ok(roleCoverage.has(role), `il ruolo ${role} deve essere rappresentato`);
    });
  });
});
