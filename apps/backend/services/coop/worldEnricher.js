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
//     ermes: { eco_pressure_score, bias },
//     aliena_summary_it: '...',
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
 * Enrich a confirmed world with full W5 schema rich fields.
 *
 * @param {object} input
 * @param {string} input.biomeId — primary biome slug
 * @param {object} [input.formAxes] — party MBTI {T,F,N,S}
 * @param {number} [input.runSeed=0] — deterministic name+closing seed
 * @param {boolean} [input.trainerCanonical] — B3 hybrid override (Skiv)
 * @param {object} [services] — service injection for tests
 * @returns {object} {world, ermes, aliena_summary_it, custode}
 */
function enrichWorld(input = {}, services = {}) {
  const { biomeId, formAxes = {}, runSeed = 0, trainerCanonical = false } = input;
  const biomeAdapter = services.biomeAdapter || biomeAdapterDefault;
  const alienaGenerator = services.alienaGenerator || alienaGeneratorDefault;
  const ermesExporter = services.ermesExporter || ermesExporterDefault;
  const companionPicker = services.companionPicker || companionPickerDefault;
  if (!biomeId || typeof biomeId !== 'string') {
    return { world: {}, ermes: {}, aliena_summary_it: '', custode: {} };
  }
  const world = biomeAdapter.adaptBiome(biomeId);
  const ermes = ermesExporter.getErmesForBiome(biomeId);
  const aliena_summary_it = alienaGenerator.generateAlienaSummary(biomeId);
  const custode = companionPicker.pick({
    biomeId,
    formAxes,
    runSeed,
    trainerCanonical,
  });
  return { world, ermes, aliena_summary_it, custode };
}

module.exports = {
  enrichWorld,
};
