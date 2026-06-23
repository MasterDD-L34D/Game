// apps/backend/services/combat/movementResolver.js
'use strict';

// Profile resolution (Q-A verdict): explicit species field > derive(morphotype, form) > default.
// Volo modifier (Q-D verdict = graded): g1 frees normal terrain, g2 also halves hazard,
// g3 frees hazard too. HAZARD = lava/acqua_profonda. Pure; no runtime wire here.

const { getProfile, DEFAULT_PROFILE, PROFILE_NAMES } = require('./movementProfiles');

const HAZARD_TERRAIN = new Set(['lava', 'acqua_profonda']);
const FLYER_MORPHOTYPES = new Set(['aereo', 'volante', 'alato', 'flyer', 'volatore']);
const HEAVY_MORPHOTYPES = new Set(['corazzato', 'massiccio', 'pesante', 'armored', 'colosso']);
const AGILE_FORMS = new Set(['agile', 'aereo', 'scattante', 'light']);
const HEAVY_FORMS = new Set(['corazzato', 'massiccio', 'pesante']);
const VOLO_TRAIT = 'adattamento_volo';

function deriveProfile(morphotype, form) {
  const m = morphotype ? String(morphotype).toLowerCase() : '';
  if (FLYER_MORPHOTYPES.has(m)) return 'light';
  if (HEAVY_MORPHOTYPES.has(m)) return 'heavy';
  const f = form ? String(form).toLowerCase() : '';
  if (AGILE_FORMS.has(f)) return 'light';
  if (HEAVY_FORMS.has(f)) return 'heavy';
  return DEFAULT_PROFILE;
}

function resolveMovementProfile(unit, speciesRecord) {
  const explicit = speciesRecord && speciesRecord.movement_profile;
  if (explicit && PROFILE_NAMES.includes(explicit)) return getProfile(explicit);
  return getProfile(deriveProfile(unit && unit.morphotype, unit && unit.form));
}

function applyVoloGrade(profile, grade) {
  const g = Number(grade) || 0;
  if (g <= 0) return profile;
  const src = (profile && profile.terrain_cost_multiplier) || { default: 1.0 };
  const out = {};
  for (const [type, mult] of Object.entries(src)) {
    if (type === 'default') {
      out.default = Math.min(Number(mult) || 1.0, 1.0);
      continue;
    }
    const isHazard = HAZARD_TERRAIN.has(type);
    if (!isHazard) {
      out[type] = 1.0; // g1+ frees normal terrain
    } else if (g >= 3) {
      out[type] = 1.0; // g3 frees hazard
    } else if (g === 2) {
      out[type] = 1.0 + (Number(mult) - 1.0) / 2; // g2 halves the hazard penalty (2.0 -> 1.5)
    } else {
      out[type] = Number(mult); // g1 leaves hazard unchanged
    }
  }
  if (!('default' in out)) out.default = 1.0;
  return { terrain_cost_multiplier: out };
}

function evaluateVoloGrade(registry, actor) {
  const traits = actor && Array.isArray(actor.traits) ? actor.traits : [];
  if (!traits.includes(VOLO_TRAIT)) return 0;
  const def = registry && registry[VOLO_TRAIT];
  const grade = def && def.effect && Number(def.effect.grade);
  return Number.isFinite(grade) && grade > 0 ? grade : 1;
}

module.exports = {
  resolveMovementProfile,
  deriveProfile,
  applyVoloGrade,
  evaluateVoloGrade,
  HAZARD_TERRAIN,
  VOLO_TRAIT,
};
