const assert = require('node:assert/strict');
const test = require('node:test');

const { applyQualitySuggestion, QualityServiceError } = require('../../server/services/quality');

test('applyQualitySuggestion esegue fix specie e produce log di validazione', async () => {
  const calls = [];
  const runtimeValidator = {
    async validateSpeciesBatch(entries, context) {
      calls.push({ method: 'species', entries, context });
      return {
        corrected: entries,
        messages: [
          'Specie corretta',
          { level: 'warning', message: 'Valore anomalo' },
        ],
        discarded: [{}],
      };
    },
  };

  const result = await applyQualitySuggestion(
    {
      suggestion: {
        id: 'fix-1',
        scope: 'species',
        action: 'fix',
        payload: { entries: [{ id: 1 }], biomeId: 'forest' },
      },
    },
    { runtimeValidator },
  );

  assert.equal(result.suggestion.id, 'fix-1');
  assert.equal(result.suggestion.scope, 'species');
  assert.equal(result.suggestion.action, 'fix');
  assert.equal(result.logs.length, 4);
  assert.equal(result.logs[0].level, 'info');
  assert.equal(result.logs[1].level, 'warning');
  assert.equal(result.logs[2].level, 'warning');
  assert.equal(result.logs[3].level, 'success');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    method: 'species',
    entries: [{ id: 1 }],
    context: { biomeId: 'forest' },
  });
});

test('applyQualitySuggestion rigenera specie con orchestrator', async () => {
  const runtimeValidator = {
    async validateSpeciesBatch() {
      throw new Error('non dovrebbe essere chiamato');
    },
  };
  const generationOrchestrator = {
    async generateSpeciesBatch({ batch }) {
      return {
        results: [
          { meta: { request_id: 'req-1' }, validation: { messages: ['ok'] } },
        ],
        errors: [
          { request_id: 'req-2', error: 'fallimento' },
        ],
      };
    },
  };

  const result = await applyQualitySuggestion(
    {
      suggestion: {
        id: 'regen-1',
        scope: 'species',
        action: 'regenerate',
        payload: { entries: [{ id: 2 }] },
      },
    },
    { runtimeValidator, generationOrchestrator },
  );

  assert.equal(result.result.results[0].meta.request_id, 'req-1');
  assert.equal(result.logs.length, 3);
  assert.equal(result.logs[0].level, 'success');
  assert.equal(result.logs[1].level, 'info');
  assert.equal(result.logs[2].level, 'error');
});

test('applyQualitySuggestion pianifica rigenerazione per scope non specie', async () => {
  const runtimeValidator = {
    async validateFoodweb() {
      throw new Error('non dovrebbe essere chiamato');
    },
  };

  const result = await applyQualitySuggestion(
    {
      suggestion: {
        id: 'regen-2',
        scope: 'biomes',
        action: 'regenerate',
        payload: {},
      },
    },
    { runtimeValidator },
  );

  assert.deepEqual(result.result, { status: 'scheduled', scope: 'biomes' });
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].message, 'Rigenerazione pianificata');
});

test('applyQualitySuggestion segnala scope fix non supportato', async () => {
  const runtimeValidator = {
    async validateSpeciesBatch() {
      return {};
    },
  };

  await assert.rejects(
    () =>
      applyQualitySuggestion(
        { suggestion: { id: 'fix-unsupported', scope: 'unknown', action: 'fix', payload: {} } },
        { runtimeValidator },
      ),
    (error) => {
      assert.ok(error instanceof QualityServiceError);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('applyQualitySuggestion richiede suggestion con id', async () => {
  const runtimeValidator = {
    async validateSpeciesBatch() {
      return {};
    },
  };

  await assert.rejects(
    () => applyQualitySuggestion({}, { runtimeValidator }),
    (error) => {
      assert.ok(error instanceof QualityServiceError);
      assert.equal(error.message, "Suggerimento richiesto per l'applicazione");
      return true;
    },
  );
});
