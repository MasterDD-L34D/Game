// TKT-SALVAGE-A2 (O8) -- packages/contracts species.schema.json now formalizes
// `resistance_archetype` as a closed enum (the canonical set from
// packs/evo_tactics_pack/data/balance/species_resistances.yaml). Before this the
// field passed unvalidated via additionalProperties:true and a typo'd archetype
// fell silently to the resistanceEngine default (wrong resistances). This locks
// the contract at schema level, above the code-side speciesArchetypeReferences guard.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Ajv = require('ajv/dist/2020');
const { speciesSchema } = require('../../packages/contracts');

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(speciesSchema);

test('species schema accepts every canonical resistance_archetype', () => {
  for (const a of ['adattivo', 'bioelettrico', 'corazzato', 'psionico', 'termico']) {
    const ok = validate({ id: 'x', name: 'X', resistance_archetype: a });
    assert.equal(ok, true, `canonical '${a}' rejected: ${JSON.stringify(validate.errors)}`);
  }
});

test('species schema rejects a non-canonical resistance_archetype (O8 enum bites)', () => {
  const ok = validate({ id: 'x', name: 'X', resistance_archetype: 'strutturale' });
  assert.equal(ok, false);
  assert.ok(
    (validate.errors || []).some(
      (e) => e.instancePath === '/resistance_archetype' && e.keyword === 'enum',
    ),
    `expected an enum error on /resistance_archetype, got ${JSON.stringify(validate.errors)}`,
  );
});

test('species schema still allows an absent resistance_archetype (optional field)', () => {
  assert.equal(validate({ id: 'x', name: 'X' }), true);
});
