// =============================================================================
// Chronicle emitters -- SPEC-Q M-7 wiring. Helpers that translate engine
// lifecycle events into chronicle_event appends (services/chronicle/chronicleStore).
//
// Keystone link (SPEC-P A3 failure-as-lore): a failed run is a narrative event.
// `emitRunFailed` is called best-effort at session end (routes/session.js) so the
// chronicle starts receiving real events. M-3 `emitMutationLineage` (below) fires on
// lineage propagation (legacy death @ session.js + offspring birth @ routes/lineage.js).
// M-2 creature_named lands via the identity service.
// =============================================================================

'use strict';

const { appendEvent } = require('./chronicleStore');

// Loss outcomes that count as a narrative run failure (A3). Victory/draw/abandon excluded.
const DEFEAT_OUTCOMES = new Set(['wipe', 'timeout', 'defeat', 'objective_failed']);

/**
 * Append a `run_failed` chronicle event when a session ends in defeat.
 * Pure-ish: reads session.{campaign_id,outcome,encounter_id,turn}, never throws.
 * Returns the chronicleStore.appendEvent result, or { ok:false, error } for no-op.
 *
 * @param session  combat session (post outcome-normalization)
 * @param opts     { baseDir? } (test override; prod uses chronicleStore default)
 */
function emitRunFailed(session, opts = {}) {
  if (!session || typeof session !== 'object') return { ok: false, error: 'no_session' };
  const runId = session.campaign_id;
  if (!runId) return { ok: false, error: 'no_campaign_id' };
  if (!DEFEAT_OUTCOMES.has(session.outcome)) return { ok: false, error: 'not_a_defeat' };
  return appendEvent(
    runId,
    {
      type: 'run_failed',
      actor_id: null,
      tier: 'public',
      payload: {
        outcome: session.outcome,
        encounter_id: session.encounter_id || null,
        turn: Number.isFinite(Number(session.turn)) ? Number(session.turn) : null,
      },
    },
    { baseDir: opts.baseDir },
  );
}

/**
 * Append a `mutation_lineage` chronicle event when mutations propagate through a
 * lineage -- legacy death (a dying unit's mutations enter the species/biome pool)
 * or offspring birth (a newborn carries selected mutations). M-3, completes the
 * M-7 keystone (4/4 emitters). Best-effort: no campaign_id / no mutations -> no-op.
 * Never throws (combat / ritual must not break on chronicle failure).
 *
 * @param ctx  { campaign_id, mutations:string[], species_id?, biome_id?, lineage_id?, source?, actor_id? }
 * @param opts { baseDir? }
 */
function emitMutationLineage(ctx, opts = {}) {
  if (!ctx || typeof ctx !== 'object') return { ok: false, error: 'no_ctx' };
  const runId = ctx.campaign_id;
  if (!runId) return { ok: false, error: 'no_campaign_id' };
  const mutations = Array.isArray(ctx.mutations)
    ? ctx.mutations.filter((m) => typeof m === 'string' && m)
    : [];
  if (mutations.length === 0) return { ok: false, error: 'no_mutations' };
  return appendEvent(
    runId,
    {
      type: 'mutation_lineage',
      actor_id: ctx.actor_id || null,
      tier: 'public',
      payload: {
        mutations,
        count: mutations.length,
        species_id: ctx.species_id || null,
        biome_id: ctx.biome_id || null,
        lineage_id: ctx.lineage_id || null,
        source: ctx.source || null,
      },
    },
    { baseDir: opts.baseDir },
  );
}

/**
 * Derive a deterministic, data-driven heirloom name from its provenance.
 * No new flavor pool (avoids a content-ratify gate): the name is built from the
 * provenance label (creature name or species id) plus the most salient mutation
 * id when present. Stable for the same inputs (no RNG, no timestamp).
 *
 * @param provenanceName  string -- creature name or species id
 * @param mutations       string[] -- salient mutations (first = most salient)
 * @returns string
 */
function deriveHeirloomName(provenanceName, mutations) {
  const salient = Array.isArray(mutations) && mutations.length > 0 ? mutations[0] : null;
  if (salient) return `Reliquia ${salient} di ${provenanceName}`;
  return `Reliquia di ${provenanceName}`;
}

/**
 * Append a `heirloom_created` chronicle event -- M-1 named heirloom/artifact
 * (FFT pattern: a notable creature's legacy crystallizes into a named, tangible
 * artifact with tracked provenance, lineage->object). Completes L3 alongside
 * M-3 mutation_lineage. Best-effort: no campaign_id / no provenance -> no-op.
 * Never throws (combat / ritual must not break on chronicle failure).
 *
 * Tier `public`: heirloom provenance is shared Nido lineage memory (SPEC-Q sez.10).
 *
 * @param ctx  { campaign_id, creature_id?, creature_name?, species_id?, biome_id?,
 *               lineage_id?, mutations?:string[], heirloom_name?, source?, actor_id? }
 * @param opts { baseDir? }
 */
function emitHeirloom(ctx, opts = {}) {
  if (!ctx || typeof ctx !== 'object') return { ok: false, error: 'no_ctx' };
  const runId = ctx.campaign_id;
  if (!runId) return { ok: false, error: 'no_campaign_id' };
  // Provenance: an heirloom must commemorate something (a named figure or a species).
  const provenanceName = ctx.creature_name || ctx.species_id || null;
  if (!provenanceName) return { ok: false, error: 'no_provenance' };
  const mutations = Array.isArray(ctx.mutations)
    ? ctx.mutations.filter((m) => typeof m === 'string' && m)
    : [];
  const heirloomName =
    typeof ctx.heirloom_name === 'string' && ctx.heirloom_name
      ? ctx.heirloom_name
      : deriveHeirloomName(provenanceName, mutations);
  return appendEvent(
    runId,
    {
      type: 'heirloom_created',
      actor_id: ctx.actor_id || ctx.creature_id || null,
      tier: 'public',
      payload: {
        heirloom_name: heirloomName,
        creature_id: ctx.creature_id || null,
        creature_name: ctx.creature_name || null,
        species_id: ctx.species_id || null,
        biome_id: ctx.biome_id || null,
        lineage_id: ctx.lineage_id || null,
        mutations,
        source: ctx.source || null,
      },
    },
    { baseDir: opts.baseDir },
  );
}

module.exports = {
  emitRunFailed,
  emitMutationLineage,
  emitHeirloom,
  deriveHeirloomName,
  DEFEAT_OUTCOMES,
};
