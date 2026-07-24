const assert = require('node:assert/strict');
const test = require('node:test');

const { validateRuntime, ValidatorServiceError } = require('../../apps/backend/services/validator');

test('validateRuntime delega a validateSpeciesBatch', async () => {
  const calls = [];
  const runtimeValidator = {
    async validateSpeciesBatch(entries, context) {
      calls.push({ entries, context });
      return { corrected: entries, messages: [] };
    },
  };

  const payload = { kind: 'species', payload: { entries: [{ id: 1 }], biomeId: 'forest' } };
  const result = await validateRuntime(payload, { runtimeValidator });

  assert.deepEqual(result, { corrected: payload.payload.entries, messages: [] });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    entries: payload.payload.entries,
    context: { biomeId: 'forest' },
  });
});

test('validateRuntime delega a validateBiome', async () => {
  let called = false;
  const runtimeValidator = {
    async validateBiome(biome, context) {
      called = true;
      assert.deepEqual(biome, { id: 'desert' });
      assert.deepEqual(context, { defaultHazard: 'sandstorm' });
      return { corrected: biome };
    },
  };

  const result = await validateRuntime(
    { kind: 'biome', payload: { biome: { id: 'desert' }, defaultHazard: 'sandstorm' } },
    { runtimeValidator },
  );

  assert.ok(called);
  assert.deepEqual(result, { corrected: { id: 'desert' } });
});

test('validateRuntime solleva errore per kind non supportato', async () => {
  const runtimeValidator = {};
  await assert.rejects(
    () => validateRuntime({ kind: 'unknown', payload: {} }, { runtimeValidator }),
    (error) => {
      assert.ok(error instanceof ValidatorServiceError);
      assert.equal(error.message, 'kind non supportato: unknown');
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('validateRuntime richiede runtimeValidator configurato', async () => {
  await assert.rejects(
    () => validateRuntime({ kind: 'species' }),
    (error) => {
      assert.equal(error.message, 'Runtime validator non configurato');
      assert.equal(error.statusCode, 500);
      return true;
    },
  );
});
