// =============================================================================
// Failure-as-Lore epilogue -- SPEC-P sez.4 + sez.5 (backend glue).
//
// On run-fail (SPEC-P sez.3 triggers), assemble a bounded epilogue PAYLOAD from
// the run context + emit two chronicle events:
//   - `run_epilogue`  (tier public): the structured DATA the Godot PA1 surface
//     renders as the diegetic Skiv/Custode voice. We assemble the data, NOT the
//     narrative text (that surface = fork PA1 = Godot, item 3).
//   - `codex_update { entry_id, on:'failure' }` (tier public): the Hades/B14
//     discovery hook the SPEC-H Codex consumer collects (SPEC-P does not build
//     the Codex container, sez.5).
//
// Reuses the LIVE pieces (do NOT rebuild): the run_failed event + chronicle (M-7,
// #2668), the A13 biome degrade (`biomeWound`, sez.6 LIVE), J5 fallen/lineage as
// input. Best-effort, never throws (session-end must not break on chronicle fail).
//
// Doctrine "no numero opaco" (SPEC-P sez.2): degrade is a diegetic tag
// (`biome_wounded` / `none`), never a raw float.
// =============================================================================

'use strict';

const { appendEvent } = require('../chronicle/chronicleStore');

// Outcomes that open the failure-as-lore loop (SPEC-P sez.3). `retreated` =
// voluntary early-end, still a run-fail per the spec. `victory`/`draw` excluded.
const RUN_FAIL_OUTCOMES = new Set(['wipe', 'timeout', 'defeat', 'objective_failed', 'retreated']);

/**
 * Pure: run-fail context -> structured epilogue payload (SPEC-P sez.4). No-mutate.
 * Returns null when the outcome is not a run-fail (or ctx is invalid).
 *
 * @param ctx { outcome, biome_id?, encounter_id?, woundedBiomes?:string[], fallen?:object[] }
 */
function buildEpilogue(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  if (!RUN_FAIL_OUTCOMES.has(ctx.outcome)) return null;
  const biomeId = ctx.biome_id || null;
  const woundedBiomes = Array.isArray(ctx.woundedBiomes) ? ctx.woundedBiomes : [];
  const wounded = !!biomeId && woundedBiomes.includes(biomeId);
  const fallen = (Array.isArray(ctx.fallen) ? ctx.fallen : [])
    .filter((u) => u && typeof u === 'object' && u.id)
    .map((u) => ({ id: u.id, species: u.species || null, name: u.name || null }));
  return {
    outcome: ctx.outcome,
    biome_id: biomeId,
    encounter_id: ctx.encounter_id || null,
    wounded, // the biome was wounded this run (A13 degrade applied)
    fallen, // [{ id, species, name }] from J5 (caduti)
    fallen_count: fallen.length,
    // diegetic tag (SPEC-P doctrine: no raw number) -- the surface telegraphs it.
    degrade_summary: wounded ? 'biome_wounded' : 'none',
  };
}

/**
 * Pure: the Codex discovery hook (SPEC-P sez.5). The biome failed-in becomes a
 * codex_update trigger the SPEC-H consumer collects. Null if no biome.
 */
function codexHook(ctx) {
  const biomeId = ctx && ctx.biome_id ? ctx.biome_id : null;
  if (!biomeId) return null;
  return { entry_id: biomeId, on: 'failure' };
}

/**
 * Assemble + emit the failure epilogue (run_epilogue + codex_update) to the
 * chronicle. Best-effort: no campaign_id / not-a-run-fail -> no-op. Never throws.
 *
 * @param ctx  buildEpilogue ctx + { campaign_id }
 * @param opts { baseDir? }
 * @returns { ok, epilogue, codex } | { ok:false, error }
 */
function emitFailureEpilogue(ctx, opts = {}) {
  if (!ctx || typeof ctx !== 'object') return { ok: false, error: 'no_ctx' };
  const runId = ctx.campaign_id;
  if (!runId) return { ok: false, error: 'no_campaign_id' };
  const epilogue = buildEpilogue(ctx);
  if (!epilogue) return { ok: false, error: 'not_a_run_fail' };
  appendEvent(
    runId,
    { type: 'run_epilogue', actor_id: null, tier: 'public', payload: epilogue },
    { baseDir: opts.baseDir },
  );
  const codex = codexHook(ctx);
  if (codex) {
    appendEvent(
      runId,
      { type: 'codex_update', actor_id: null, tier: 'public', payload: codex },
      { baseDir: opts.baseDir },
    );
  }
  return { ok: true, epilogue, codex: codex || null };
}

module.exports = { RUN_FAIL_OUTCOMES, buildEpilogue, codexHook, emitFailureEpilogue };
