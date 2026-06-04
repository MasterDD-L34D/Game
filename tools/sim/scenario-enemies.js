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
const ENCOUNTER_DRAFT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'docs',
  'planning',
  'encounters-draft',
);

// Tier -> base combat stats (mirrors ai-driven-sim buildEnemiesFromYaml hp/mod table;
// dc scales with tier so higher tiers are also harder to hit). These are the FAITHFUL
// per-tier defaults; the band batch tunes difficulty on top via the `scaling` param below
// (fase-2c calibration, Finding 1: completion_rate 1.0 OOB) -- never by mutating these.
const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };
const TIER_DC = { base: 10, elite: 11, apex: 12 };

// The sim sizes the grid from the PLAYER count (gridSizeFor), NOT the YAML grid_size, so
// authored spawn points can land off-grid (e.g. x:7 on the 2-player 6x6). Clamp positions
// to a conservative on-grid bound so the fight is well-formed. The authored per-encounter
// grid is a fase-2c concern (would need modulation wiring).
const GRID_SAFE_MAX = 5;

// Only ELIMINATION encounters become scaled 'scenario' fights: the combat-adapter resolves
// victory = all sistema dead (= elimination), so a survival/capture/escort encounter would
// be a DIFFERENT fight than authored. We return null (-> fallback to the weak-fixed enemy)
// instead of misreporting it as an elimination 'scenario' fight (Codex #2567 P2). Faithful
// survival/capture staging + the authored grid are deferred to fase-2c.
const SUPPORTED_OBJECTIVES = new Set(['elimination']);

// `scaling` is the band-batch calibration overlay (fase-2c). Faithful default = {} (no
// scaling = the authored 2-base-unit fight). countMult/countAdd scale the roster SIZE (the
// decisive lever: damage is ~1-3/hit, so 2 units can never out-race a 60-HP party -- more
// units can); hpMult/hpAdd + modAdd/dcAdd tune the per-unit knife-edge. Pure DI (no env
// global) so it stays unit-testable + the batch records the values in provenance.
function buildScenarioEnemies(scenarioId, scaling = {}, opts = {}) {
  const s = scaling || {};
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const countMult = num(s.countMult, 1);
  const countAdd = num(s.countAdd, 0);
  const hpMult = num(s.hpMult, 1);
  const hpAdd = num(s.hpAdd, 0);
  const modAdd = num(s.modAdd, 0);
  const dcAdd = num(s.dcAdd, 0);

  // GAP-C option-C band-verify: graph-mode runs union encounters-draft/ (mirror combat C1)
  // so the 4 draft node-encounters fight their REAL rosters; static runs stay encounters/-only
  // (the weak-fixed fallback) -> ratified static cave_path bands untouched.
  let yamlPath = path.join(ENCOUNTER_DIR, `${scenarioId}.yaml`);
  if (!fs.existsSync(yamlPath) && opts.graphMode) {
    yamlPath = path.join(ENCOUNTER_DRAFT_DIR, `${scenarioId}.yaml`);
  }
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
    const authoredCount = unitDef.count || 1;
    const count = Math.max(1, Math.round(authoredCount * countMult) + countAdd);
    const species = unitDef.species || 'predoni_nomadi';
    const hp = Math.max(1, Math.round((TIER_HP[tier] || TIER_HP.base) * hpMult) + hpAdd);
    const mod = (TIER_MOD[tier] || TIER_MOD.base) + modAdd;
    const dc = (TIER_DC[tier] || TIER_DC.base) + dcAdd;
    for (let i = 0; i < count; i += 1) {
      const pos = spawnPoints[spIdx % spawnPoints.length];
      spIdx += 1;
      const px = Math.min(GRID_SAFE_MAX, Math.max(0, (pos && pos[0]) || 0));
      const py = Math.min(GRID_SAFE_MAX, Math.max(0, (pos && pos[1]) || 0));
      enemies.push({
        id: `sis_${scenarioId}_${enemies.length + 1}`,
        species,
        hp,
        max_hp: hp,
        ap: 2,
        mod,
        dc,
        attack_range: 1,
        position: { x: px, y: py },
        controlled_by: 'sistema',
        status: {},
      });
    }
  }
  return enemies.length ? enemies : null;
}

module.exports = { buildScenarioEnemies, TIER_HP, TIER_MOD, TIER_DC, GRID_SAFE_MAX };
