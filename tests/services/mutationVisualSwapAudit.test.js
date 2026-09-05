// SPEC-Q M-6 (P2, Spore) -- visual-swap verify audit of mutations with a null
// derived_ability_id.
//
// Ground-truth (2026-06-17): derived_ability_id feeds unit.abilities, but the
// combat resolver does NOT read unit.abilities -> the field is inert metadata for
// ALL mutations. The real runtime footprint is trait_swap.add resolved via
// active_effects.yaml. So "derived_ability_id null => 0-runtime" is NOT a sound
// premise; this audit classifies each mutation by its trait_swap footprint, and
// flags genuine visual-only mutations as SPEC-K (Godot surface) candidates.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyMutation,
  auditMutationVisualSwap,
} = require('../../tools/audit/mutationVisualSwapAudit');

const MECH = new Set(['mech_trait_a', 'mech_trait_b']);

test('classify: null derived + mechanical trait added -> trait-runtime (NOT spec-k)', () => {
  const r = classifyMutation(
    {
      id: 'm1',
      derived_ability_id: null,
      trait_swap: { add: ['mech_trait_a'] },
      aspect_token: 'x',
    },
    MECH,
  );
  assert.equal(r.derived_is_null, true);
  assert.equal(r.verdict, 'trait-runtime');
  assert.equal(r.spec_k_candidate, false);
  assert.deepEqual(r.mechanical_added, ['mech_trait_a']);
});

test('classify: null derived + non-mechanical trait + visual -> visual-only (spec-k candidate)', () => {
  const r = classifyMutation(
    {
      id: 'm2',
      derived_ability_id: null,
      trait_swap: { add: ['flavor_trait_only'] },
      visual_swap_it: 'morphology shift',
      aspect_token: 'tok',
    },
    MECH,
  );
  assert.equal(r.verdict, 'visual-only');
  assert.equal(r.spec_k_candidate, true);
  assert.deepEqual(r.non_mechanical_added, ['flavor_trait_only']);
});

test('classify: null derived + empty add + visual -> visual-only (spec-k candidate)', () => {
  const r = classifyMutation(
    { id: 'm3', derived_ability_id: null, trait_swap: { add: [] }, aspect_token: 'tok' },
    MECH,
  );
  assert.equal(r.verdict, 'visual-only');
  assert.equal(r.spec_k_candidate, true);
});

test('classify: null derived + empty add + NO visual -> inert (truly 0-runtime)', () => {
  const r = classifyMutation({ id: 'm4', derived_ability_id: null, trait_swap: { add: [] } }, MECH);
  assert.equal(r.verdict, 'inert');
  assert.equal(r.spec_k_candidate, false);
  assert.equal(r.has_visual_swap, false);
});

test('classify: non-null derived + mechanical trait -> trait-runtime, derived_is_null false', () => {
  const r = classifyMutation(
    {
      id: 'm5',
      derived_ability_id: 'mech_trait_b',
      trait_swap: { add: ['mech_trait_b'] },
      aspect_token: 'tok',
    },
    MECH,
  );
  assert.equal(r.derived_is_null, false);
  assert.equal(r.verdict, 'trait-runtime');
});

test('audit: summary tallies null/present + verdict breakdown + spec-k candidates', () => {
  const byId = {
    a: { id: 'a', derived_ability_id: 'mech_trait_a', trait_swap: { add: ['mech_trait_a'] } },
    b: {
      id: 'b',
      derived_ability_id: null,
      trait_swap: { add: ['mech_trait_b'] },
      aspect_token: 't',
    },
    c: { id: 'c', derived_ability_id: null, trait_swap: { add: ['flavor'] }, aspect_token: 't' },
    d: { id: 'd', derived_ability_id: null, trait_swap: { add: [] }, aspect_token: 't' },
  };
  const { summary, rows, nullRows } = auditMutationVisualSwap(byId, MECH);
  assert.equal(summary.total, 4);
  assert.equal(summary.derived_present, 1);
  assert.equal(summary.derived_null, 3);
  assert.equal(summary.null_trait_runtime, 1); // b
  assert.equal(summary.null_visual_only, 2); // c + d
  assert.equal(summary.spec_k_candidates, 2); // c + d
  assert.equal(rows.length, 4);
  assert.equal(nullRows.length, 3);
});
