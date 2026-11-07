// tests/api/normaliseUnitSpeciesFormat.test.js
// TDD: verify normaliseUnit canonicalizes species ids to the runtime underscore
// format (species_catalog.json convention, documented in
// services/species/wikiLinkBridge.js).
//
// Regression guard for issue #3157 F1: pack-based scenario builders
// (badlandsPilotScenario.js and siblings) inject kebab-case YAML ids
// ('dune-stalker') as unit.species while tutorial/hardcoded scenarios use
// underscore ('dune_stalker'), so telemetry carried BOTH formats for the same
// species and per-species analytics silently split.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { normaliseUnit } = require('../../apps/backend/routes/sessionHelpers');

test('normaliseUnit: kebab-case species is canonicalized to underscore', () => {
  const unit = normaliseUnit({ id: 'u1', species: 'dune-stalker' }, 0);
  assert.equal(unit.species, 'dune_stalker');
});

test('normaliseUnit: underscore species passes through unchanged', () => {
  const unit = normaliseUnit({ id: 'u1', species: 'dune_stalker' }, 0);
  assert.equal(unit.species, 'dune_stalker');
});

test('normaliseUnit: multi-hyphen species fully canonicalized', () => {
  const unit = normaliseUnit({ id: 'u1', species: 'ferrimordax-rutilus' }, 0);
  assert.equal(unit.species, 'ferrimordax_rutilus');
});

test('normaliseUnit: missing species still defaults to unknown', () => {
  const unit = normaliseUnit({ id: 'u1' }, 0);
  assert.equal(unit.species, 'unknown');
});
