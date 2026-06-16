// SPEC-Q M-6 (P2 Spore) -- visual-swap verify audit.
//
// WHAT THIS RESOLVES (acceptance gate #6): SPEC-Q sez.9 hypothesised that the 24
// mutations with `derived_ability_id: null` are "visual-swap likely 0-runtime".
// Ground-truth (2026-06-17) refines that premise:
//
//   * `derived_ability_id` feeds `unit.abilities` (mutationEngine.applyMutationPure),
//     but the combat resolver / traitEffects NEVER read `unit.abilities` -- so the
//     field is INERT metadata for EVERY mutation (null or not). It does NOT gate
//     runtime. (grep: no `.abilities` consumer under apps/backend/services/combat.)
//   * The real combat footprint of a mutation = its `trait_swap.add`, resolved via
//     data/core/traits/active_effects.yaml (the live trait registry, traitEffects.js).
//   * `visual_swap_it` / `aspect_token` are rendered by apps/play/src/render.js.
//
// So a `derived_ability_id: null` mutation is NOT automatically 0-runtime: if it
// swaps in a trait present in active_effects.yaml it has a genuine combat effect.
// This audit classifies every mutation by its trait_swap footprint and flags the
// genuine visual-only ones as SPEC-K (Godot surface) candidates.
//
// Verdicts:
//   trait-runtime : adds >=1 mechanical trait (in active_effects) -> NOT 0-runtime.
//   visual-only   : adds no mechanical trait but has a visual_swap/aspect_token ->
//                   ~0-runtime (only the visual + the bingo category counter) ->
//                   SPEC-K candidate if it ever becomes a Godot surface.
//   inert         : no mechanical trait AND no visual swap -> truly 0-runtime metadata.

'use strict';

/**
 * Classify a single mutation's runtime footprint.
 *
 * @param {object} entry  catalog entry (must include `id`)
 * @param {Set<string>} mechanicalTraitIds  trait ids present in active_effects.yaml
 * @returns {object} classification row
 */
function classifyMutation(entry, mechanicalTraitIds) {
  const mech = mechanicalTraitIds instanceof Set ? mechanicalTraitIds : new Set();
  const derived = entry.derived_ability_id != null ? entry.derived_ability_id : null;
  const swap = entry.trait_swap || {};
  const addedTraits = Array.isArray(swap.add)
    ? swap.add.filter((t) => typeof t === 'string' && t)
    : [];
  const removedTraits = Array.isArray(swap.remove)
    ? swap.remove.filter((t) => typeof t === 'string' && t)
    : [];
  const mechanicalAdded = addedTraits.filter((t) => mech.has(t));
  const nonMechanicalAdded = addedTraits.filter((t) => !mech.has(t));
  const hasVisualSwap =
    Boolean(entry.aspect_token) ||
    (typeof entry.visual_swap_it === 'string' && entry.visual_swap_it.length > 0);
  const hasTraitRuntime = mechanicalAdded.length > 0;

  let verdict;
  if (hasTraitRuntime) verdict = 'trait-runtime';
  else if (hasVisualSwap) verdict = 'visual-only';
  else verdict = 'inert';

  return {
    id: entry.id,
    tier: entry.tier != null ? entry.tier : null,
    category: entry.category != null ? entry.category : null,
    body_slot: entry.body_slot != null ? entry.body_slot : null,
    derived_ability_id: derived,
    derived_is_null: derived == null,
    added_traits: addedTraits,
    removed_traits: removedTraits,
    mechanical_added: mechanicalAdded,
    non_mechanical_added: nonMechanicalAdded,
    aspect_token: entry.aspect_token != null ? entry.aspect_token : null,
    has_visual_swap: hasVisualSwap,
    verdict,
    spec_k_candidate: verdict === 'visual-only',
  };
}

/**
 * Audit the whole catalog. Returns rows + the null-derived subset + a summary.
 *
 * @param {object} catalogById  { id: entry } (loadMutationCatalog().byId)
 * @param {Set<string>} mechanicalTraitIds
 */
function auditMutationVisualSwap(catalogById, mechanicalTraitIds) {
  const rows = Object.values(catalogById || {}).map((e) => classifyMutation(e, mechanicalTraitIds));
  const nullRows = rows.filter((r) => r.derived_is_null);
  const summary = {
    total: rows.length,
    derived_present: rows.length - nullRows.length,
    derived_null: nullRows.length,
    null_trait_runtime: nullRows.filter((r) => r.verdict === 'trait-runtime').length,
    null_visual_only: nullRows.filter((r) => r.verdict === 'visual-only').length,
    null_inert: nullRows.filter((r) => r.verdict === 'inert').length,
    spec_k_candidates: rows.filter((r) => r.spec_k_candidate).length,
  };
  return { rows, nullRows, summary };
}

module.exports = { classifyMutation, auditMutationVisualSwap };

// ── CLI ──────────────────────────────────────────────────────────────────────
// node tools/audit/mutationVisualSwapAudit.js  -> writes docs/generated/*.{md,json}
if (require.main === module) {
  /* eslint-disable global-require, no-console */
  const fs = require('node:fs');
  const path = require('node:path');
  const {
    loadMutationCatalog,
  } = require('../../apps/backend/services/mutations/mutationCatalogLoader');
  const { loadActiveTraitRegistry } = require('../../apps/backend/services/traitEffects');

  const ROOT = path.resolve(__dirname, '..', '..');
  const catalog = loadMutationCatalog({ refresh: true });
  const traitRegistry = loadActiveTraitRegistry();
  const mechanicalTraitIds = new Set(Object.keys(traitRegistry));
  const { rows, nullRows, summary } = auditMutationVisualSwap(catalog.byId, mechanicalTraitIds);

  const outDir = path.join(ROOT, 'docs', 'generated');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'mutation-visual-swap-audit-m6.json');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        spec: 'SPEC-Q M-6',
        catalog_schema_version: catalog.schema_version || null,
        mechanical_trait_count: mechanicalTraitIds.size,
        summary,
        rows,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  const fmt = (r) =>
    `| \`${r.id}\` | ${r.tier} | ${r.category} | ${r.derived_is_null ? 'null' : '`' + r.derived_ability_id + '`'} | ${
      r.mechanical_added.length ? '`' + r.mechanical_added.join(', ') + '`' : '--'
    } | ${r.has_visual_swap ? 'yes' : 'no'} | **${r.verdict}** |`;

  const lines = [];
  lines.push('# SPEC-Q M-6 -- mutation visual-swap audit (derived_ability_id null)');
  lines.push('');
  lines.push('> AUTO-GENERATED by `tools/audit/mutationVisualSwapAudit.js`. Do not hand-edit.');
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push(
    '`derived_ability_id` is inert metadata (the combat resolver never reads `unit.abilities`); ' +
      'the real runtime footprint is `trait_swap.add` resolved via `active_effects.yaml`. ' +
      `Mechanical trait registry size: ${mechanicalTraitIds.size}.`,
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- total mutations: **${summary.total}**`);
  lines.push(
    `- derived_ability_id null: **${summary.derived_null}**  (present: ${summary.derived_present})`,
  );
  lines.push(
    `- of the null ones -> trait-runtime (NOT 0-runtime): **${summary.null_trait_runtime}**`,
  );
  lines.push(
    `- of the null ones -> visual-only (~0-runtime, SPEC-K candidate): **${summary.null_visual_only}**`,
  );
  lines.push(`- of the null ones -> inert (truly 0-runtime): **${summary.null_inert}**`);
  lines.push(`- total SPEC-K (Godot-surface) candidates: **${summary.spec_k_candidates}**`);
  lines.push('');
  lines.push('## Null-derived_ability_id mutations (the 24 under audit)');
  lines.push('');
  lines.push(
    '| id | tier | category | derived_ability_id | mechanical traits added | visual swap | verdict |',
  );
  lines.push(
    '| -- | ---- | -------- | ------------------ | ----------------------- | ----------- | ------- |',
  );
  for (const r of nullRows) lines.push(fmt(r));
  lines.push('');
  lines.push('## All mutations (full catalog)');
  lines.push('');
  lines.push(
    '| id | tier | category | derived_ability_id | mechanical traits added | visual swap | verdict |',
  );
  lines.push(
    '| -- | ---- | -------- | ------------------ | ----------------------- | ----------- | ------- |',
  );
  for (const r of rows) lines.push(fmt(r));
  lines.push('');

  const mdPath = path.join(outDir, 'mutation-visual-swap-audit-m6.md');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');

  console.log(`[m6-audit] wrote ${path.relative(ROOT, jsonPath)} + ${path.relative(ROOT, mdPath)}`);
  console.log(`[m6-audit] summary: ${JSON.stringify(summary)}`);
}
