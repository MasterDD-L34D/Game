// ADR-2026-05-29 TKT-CL-06+CL-07 -- jobs.yaml trait_abilities dispatch smoke.
//
// Verifica che la sezione trait_abilities seedata via
// tools/scripts/seed_trait_abilities_from_mechanics.py sia presente,
// distribuita correttamente per effect_type, e che ogni entry rispetti
// il minimum schema atteso da abilityExecutor.js (source: trait marker).
//
// G4 tdd-guard: no tool installed; characterization test su shipped state.
// Test runner: node:test (scripts/run-test-api.cjs glob tests/api/*.test.js).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const JOBS_PATH = path.join(REPO_ROOT, 'data/core/jobs.yaml');

// Lightweight YAML extract for trait_abilities section (no js-yaml dep).
function extractTraitAbilities() {
  // Normalize CRLF -> LF (Windows worktree may have native line endings).
  const content = fs.readFileSync(JOBS_PATH, 'utf8').replace(/\r\n/g, '\n');
  const startMatch = content.match(/\ntrait_abilities:\n/);
  if (!startMatch) return null;
  const start = startMatch.index + startMatch[0].length;
  const section = content.slice(start);
  const lines = section.split('\n');
  const abilityIds = [];
  const effectTypes = [];
  const sources = [];
  for (const line of lines) {
    const idMatch = line.match(/^  ([a-z_][a-z0-9_]+):\s*$/);
    if (idMatch) abilityIds.push(idMatch[1]);
    const typeMatch = line.match(/^    effect_type:\s*(\S+)/);
    if (typeMatch) effectTypes.push(typeMatch[1]);
    const sourceMatch = line.match(/^    source:\s*(\S+)/);
    if (sourceMatch) sources.push(sourceMatch[1]);
  }
  return { abilityIds, effectTypes, sources };
}

test('jobs.yaml has trait_abilities section', () => {
  const result = extractTraitAbilities();
  assert.ok(result, 'trait_abilities section MUST exist in jobs.yaml');
  assert.ok(result.abilityIds.length > 0, 'expected non-empty abilityIds list');
});

test('trait_abilities count matches expected post-seed (>= 39 audit baseline)', () => {
  const { abilityIds } = extractTraitAbilities();
  assert.ok(
    abilityIds.length >= 39,
    `expected >= 39 trait_abilities (audit 2026-05-10 baseline), got ${abilityIds.length}`,
  );
});

test('trait_abilities distribution covers all 4 effect_types', () => {
  const { effectTypes } = extractTraitAbilities();
  const distinct = new Set(effectTypes);
  for (const t of ['buff', 'heal', 'damage', 'apply_status']) {
    assert.ok(distinct.has(t), `effect_type ${t} missing from trait_abilities seed`);
  }
});

test('every trait_ability declares source: trait marker', () => {
  const { abilityIds, sources } = extractTraitAbilities();
  assert.equal(
    sources.length,
    abilityIds.length,
    `source count mismatch: ${sources.length} vs ${abilityIds.length}`,
  );
  for (const s of sources) {
    assert.equal(s, 'trait', `expected source: trait, got ${s}`);
  }
});

test('representative audit EASY abilities present', () => {
  const { abilityIds } = extractTraitAbilities();
  const sample = ['elastic_absorb', 'digest_heal', 'buoyant_lift', 'magnetic_sense', 'chromatic_fade'];
  for (const a of sample) {
    assert.ok(abilityIds.includes(a), `expected audit EASY ability ${a} present`);
  }
});

test('representative audit MEDIUM (damage) abilities present', () => {
  const { abilityIds } = extractTraitAbilities();
  const sample = ['tail_whip', 'cleave_strike', 'spore_burst', 'umbral_spore', 'spin_burst'];
  for (const a of sample) {
    assert.ok(abilityIds.includes(a), `expected audit MEDIUM ability ${a} present`);
  }
});
