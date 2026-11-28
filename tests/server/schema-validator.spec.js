const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createSchemaValidator,
  SchemaValidationError,
} = require('../../apps/backend/middleware/schemaValidator');
const qualitySuggestionSchema = require('../../schemas/quality/suggestion.schema.json');
const qualityApplySchema = require('../../schemas/quality/suggestions-apply-request.schema.json');

test('schema validator accetta payload valido per quality suggestion apply', () => {
  const schemaValidator = createSchemaValidator();
  schemaValidator.registerSchema('quality://suggestion', qualitySuggestionSchema);
  schemaValidator.registerSchema('quality://suggestions/apply/request', qualityApplySchema);

  const payload = {
    suggestion: {
      id: 'fix-1',
      scope: 'species',
      action: 'fix',
      payload: {
        entries: [{ id: 1 }],
        biomeId: 'forest',
      },
    },
  };

  assert.doesNotThrow(() =>
    schemaValidator.validate('quality://suggestions/apply/request', payload),
  );
});

test('schema validator rifiuta payload senza id suggerimento', () => {
  const schemaValidator = createSchemaValidator();
  schemaValidator.registerSchema('quality://suggestion', qualitySuggestionSchema);
  schemaValidator.registerSchema('quality://suggestions/apply/request', qualityApplySchema);

  assert.throws(
    () =>
      schemaValidator.validate('quality://suggestions/apply/request', {
        suggestion: { scope: 'species', action: 'fix', payload: {} },
      }),
    (error) => {
      assert.ok(error instanceof SchemaValidationError);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});
