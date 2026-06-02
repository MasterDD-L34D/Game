'use strict';
// fase-2a scaled enemies. Loads a real encounter YAML and builds the wave-1 sistema
// roster, so the full-loop combat is a genuine fight (not the weak-fixed always-win
// placeholder) -- the precondition for any meaningful meta band metric (fase-2b).
//
// Ported from tests/smoke/ai-driven-sim.js:buildEnemiesFromYaml (itself a port of
// tools/py/batch_calibrate_non_elim.py:encounter_to_units), extracted here as a pure,
// testable module (ai-driven-sim is coop-coupled). Self-contained tier-stat table (the
// encounter YAML species often lack hp/mod/dc -- this is exactly why the combat-sim uses
// a tier table rather than deriveCombatStats for encounter enemies).
//
// Output is MAPPED to the runner's enemy shape (id/species/hp/max_hp/ap/mod/dc/
// attack_range/position/controlled_by/status) -- the same shape the weak-fixed enemy and
// the combat-adapter kill-wire /session/start path already consume. Returns null on any
// load failure (missing file, malformed, unsupported objective) so the runner falls back
// to the weak-fixed enemy and the loop still completes (cave_path has 4/8 encounters
// without a YAML: tutorial_03/04/05 + tutorial_06_hardcore).

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ENCOUNTER_DIR = path.resolve(__dirname, '..', '..', 'docs', 'planning', 'encounters');

// Tier -> base combat stats (mirrors ai-driven-sim buildEnemiesFromYaml hp/mod table;
// dc scales with tier so higher tiers are also harder to hit). Calibration of the exact
// difficulty band is fase-2c (N=40), not this slice.
const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };
const TIER_DC = { base: 10, elite: 11, apex: 12 };

// Objectives this loader can stage as a plain elimination-style fight. escort/capture
// need extra unit materialization + policy support (deferred) -> null -> fallback.
const SUPPORTED_OBJECTIVES = new Set(['elimination', 'survival']);

function buildScenarioEnemies(scenarioId) {
  const yamlPath = path.join(ENCOUNTER_DIR, `${scenarioId}.yaml`);
  if (!fs.existsSync(yamlPath)) return null;

  let parsed;
  try {
    parsed = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.waves) || parsed.waves.length === 0) return null;
  const objectiveType = (parsed.objective && parsed.objective.type) || 'elimination';
  if (!SUPPORTED_OBJECTIVES.has(objectiveType)) return null;

  // Initial spawn = the wave with the smallest turn_trigger.
  const wave1 = [...parsed.waves].sort((a, b) => (a.turn_trigger || 0) - (b.turn_trigger || 0))[0];
  const spawnPoints =
    Array.isArray(wave1.spawn_points) && wave1.spawn_points.length ? wave1.spawn_points : [[7, 3]];

  const enemies = [];
  let spIdx = 0;
  for (const unitDef of wave1.units || []) {
    const tier = unitDef.tier || 'base';
    const count = unitDef.count || 1;
    const species = unitDef.species || 'predoni_nomadi';
    for (let i = 0; i < count; i += 1) {
      const pos = spawnPoints[spIdx % spawnPoints.length];
      spIdx += 1;
      const hp = TIER_HP[tier] || TIER_HP.base;
      enemies.push({
        id: `sis_${scenarioId}_${enemies.length + 1}`,
        species,
        hp,
        max_hp: hp,
        ap: 2,
        mod: TIER_MOD[tier] || TIER_MOD.base,
        dc: TIER_DC[tier] || TIER_DC.base,
        attack_range: 1,
        position: { x: pos[0], y: pos[1] },
        controlled_by: 'sistema',
        status: {},
      });
    }
  }
  return enemies.length ? enemies : null;
}

module.exports = { buildScenarioEnemies, TIER_HP, TIER_MOD, TIER_DC };
