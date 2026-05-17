// W5-bb (cross-repo Godot v2 mirror) — World enricher facade.
//
// Single entrypoint that combines biomeAdapter + alienaGenerator +
// ermesExporter + companionPicker to produce W5-canonical rich payload
// consumed by Godot v2 WorldSetupState.
//
// Output shape (matches `data/world_setup/sample_world_setup_*.json` in
// Game-Godot-v2 repo):
//
//   {
//     world: { biome_id, biome_label_it, pressure, hazards },
//     ermes: { eco_pressure_score, bias, role_gap },           // W5.5: + role_gap
//     aliena_summary_it: '...',
//     aliena_version: 'template_v1' | 'llm_v1',                // W5.5: discriminator
//     custode: { display_name, species_id, biome_origin_id, voice_it,
//                opening_line, closing_ritual, voice_modifier },
//   }
//
// Stateless: pure function over inputs + service dependencies. Services
// are injectable for tests.

'use strict';

const biomeAdapterDefault = require('./biomeAdapter');
const alienaGeneratorDefault = require('./alienaGenerator');
const ermesExporterDefault = require('./ermesExporter');
const companionPickerDefault = require('../companion/companionPicker');

/**
 * Enrich a confirmed world with full W5 schema rich fields (sync path,
 * template_v1 ALIENA only).
 *
 * @param {object} input
 * @param {string} input.biomeId — primary biome slug
 * @param {object} [input.formAxes] — party MBTI {T,F,N,S}
 * @param {Array} [input.party] — W5.5: Array of player dicts with .job_id
 *   (or Array[String] job_ids) — used by ermes role_gap compute
 * @param {number} [input.runSeed=0] — deterministic name+closing seed
 * @param {boolean} [input.trainerCanonical] — B3 hybrid override (Skiv)
 * @param {object} [services] — service injection for tests
 * @returns {object} {world, ermes, aliena_summary_it, aliena_version, custode}
 */
function enrichWorld(input = {}, services = {}) {
  const { biomeId, formAxes = {}, party = [], runSeed = 0, trainerCanonical = false } = input;
  const biomeAdapter = services.biomeAdapter || biomeAdapterDefault;
  const alienaGenerator = services.alienaGenerator || alienaGeneratorDefault;
  const ermesExporter = services.ermesExporter || ermesExporterDefault;
  const companionPicker = services.companionPicker || companionPickerDefault;
  if (!biomeId || typeof biomeId !== 'string') {
    return {
      world: {},
      ermes: {},
      aliena_summary_it: '',
      aliena_version: '',
      custode: {},
    };
  }
  const world = biomeAdapter.adaptBiome(biomeId);
  // W5.5 — pipe role_gap into ermes payload (tolerant fallback when
  // computeRoleGap absent for pre-W5.5 mocks).
  const ermes = ermesExporter.getErmesForBiome(biomeId);
  if (typeof ermesExporter.computeRoleGap === 'function') {
    ermes.role_gap = ermesExporter.computeRoleGap(party, biomeId);
  }
  // Sync (non-async) BACK-COMPAT: template_v1 only. Async LLM path via
  // enrichWorldAsync (separate fn so existing sync callers don't break).
  const aliena_summary_it = alienaGenerator.generateAlienaSummary(biomeId);
  // Tolerant version fallback when stub generator omits constant.
  const aliena_version = alienaGenerator.ALIENA_VERSION_TEMPLATE_V1 || 'template_v1';
  const custode = companionPicker.pick({
    biomeId,
    formAxes,
    runSeed,
    trainerCanonical,
  });
  return { world, ermes, aliena_summary_it, aliena_version, custode };
}

/**
 * W5.5 — Async variant supporting LLM ALIENA hook.
 *
 * @param {object} input — same as enrichWorld + opts.llmCall
 * @param {Function} [input.llmCall] — async (biomeId, ctx) => string
 * @param {object} [services]
 * @returns {Promise<object>} same shape as enrichWorld; aliena_version
 *   = "llm_v1" when LLM succeeded, "template_v1" otherwise
 */
async function enrichWorldAsync(input = {}, services = {}) {
  const sync = enrichWorld(input, services);
  // Skip LLM call when biome invalid (sync returned empty payload).
  if (!sync.world || Object.keys(sync.world).length === 0) return sync;
  const alienaGenerator = services.alienaGenerator || alienaGeneratorDefault;
  if (typeof alienaGenerator.generateAlienaEnvelope !== 'function') return sync;
  const envelope = await alienaGenerator.generateAlienaEnvelope(input.biomeId, {
    llmCall: input.llmCall,
    llmContext: { formAxes: input.formAxes, party: input.party },
  });
  return {
    ...sync,
    aliena_summary_it: envelope.summary,
    aliena_version: envelope.version,
  };
}

module.exports = {
  enrichWorld,
  enrichWorldAsync,
};
