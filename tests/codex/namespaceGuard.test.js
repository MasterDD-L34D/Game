// SPEC-K -- A.L.I.E.N.A. Codex namespace cross-check (HA2 follow-up).
//
// The unlock hook (apps/play/src/main.js) reveals a Codex entry only when a
// `controlled_by==='sistema'` unit's species slug (`species_id || species`)
// EQUALS the entry id. So an entry whose id matches no sistema/enemy species in
// any canonical roster can never unlock through play (orphan). These tests pin
// (a) the in-play species universe collector and (b) the orphan SOFT-warn.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'tools', 'js', 'validate_codex_aliena.js');
const { collectInPlaySpecies, validateEntry } = require(SCRIPT);

// A well-formed 6-dimension block (content present, in-band) so the only warn we
// assert on is the namespace orphan one.
function fullDims() {
  const c = 'x'.repeat(200);
  const dims = {};
  for (const k of [
    'A_ambiente',
    'L_linee_evolutive',
    'I_impianto',
    'E_ecologia',
    'N_norme_socio',
  ]) {
    dims[k] = { heading: k, content: c };
  }
  dims.A_ancoraggio_narrativo = { heading: 'anc', content: c, story_hook_it: 'gancio' };
  return dims;
}

function entry(id) {
  return {
    codex_entry: {
      id,
      unlock: { triggers: ['encounter_completed'] },
      aliena_dimensions: fullDims(),
    },
  };
}

test('collectInPlaySpecies unions scenario sistema + encounter rosters', () => {
  const { species, sources } = collectInPlaySpecies(REPO_ROOT);
  assert.ok(sources.scenario, 'scenario roster source loaded');
  assert.ok(sources.encounters, 'encounter roster source loaded');
  // dune_stalker is player-only in the scenario builders; it reaches the universe
  // ONLY via the savana pack-clash encounter (apex_neutral species_hint).
  assert.ok(species.has('dune_stalker'), 'dune_stalker present via encounter roster');
  // a scenario-only sistema species
  assert.ok(species.has('predoni_nomadi'), 'predoni_nomadi present (scenario sistema)');
});

test('validateEntry warns on an orphan id against a universe', () => {
  const errors = [];
  const warnings = [];
  validateEntry(
    'ghost.yaml',
    entry('ghost_species_xyz'),
    errors,
    warnings,
    new Set(['dune_stalker']),
  );
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.ok(
    warnings.some((w) => /orphan/.test(w) && /ghost_species_xyz/.test(w)),
    `expected orphan warn, got: ${warnings.join(' | ')}`,
  );
});

test('validateEntry does NOT orphan-warn an in-universe id', () => {
  const errors = [];
  const warnings = [];
  validateEntry('ok.yaml', entry('dune_stalker'), errors, warnings, new Set(['dune_stalker']));
  assert.ok(!warnings.some((w) => /orphan/.test(w)), warnings.join(' | '));
});

test('validateEntry skips the orphan check when universe is null (fixture mode)', () => {
  const errors = [];
  const warnings = [];
  validateEntry('x.yaml', entry('anything'), errors, warnings, null);
  assert.ok(!warnings.some((w) => /orphan/.test(w)), warnings.join(' | '));
});

test('real data/codex produces no orphan namespace warning', () => {
  const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /orphan entry/);
});
