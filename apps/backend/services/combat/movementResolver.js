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

const VOLO_GRADE_MIN = 1;
const VOLO_GRADE_MAX = 3;

// Dual trait-shape carrier check (string | {id}), matching the slice modules.
function hasVoloTrait(actor) {
  const traits = actor && Array.isArray(actor.traits) ? actor.traits : [];
  for (const t of traits) {
    if (typeof t === 'string' && t === VOLO_TRAIT) return true;
    if (t && typeof t === 'object' && t.id === VOLO_TRAIT) return true;
  }
  return false;
}

function clampGrade(g) {
  return Math.min(VOLO_GRADE_MAX, Math.max(VOLO_GRADE_MIN, Math.trunc(g)));
}

// Resolve the volo grade for a unit. Order (per the per-creature gap-fix spec):
//   1. non-carrier -> 0 (no volo);
//   2. per-unit override `actor.volo_grade` (>=1) -> clamp [1,3] -- survives the
//      session-start whitelist (normaliseUnit) and is registry-free, so player/AI/
//      minion all read it (the minion gap closes without a registry file-read);
//   3. global base `registry[VOLO_TRAIT].effect.grade` (>=1) -> clamp [1,3];
//   4. else 1.
// The gate is trait presence, so a stray volo_grade on a non-carrier is ignored.
function evaluateVoloGrade(registry, actor) {
  if (!hasVoloTrait(actor)) return 0;
  const unitGrade = actor && Number(actor.volo_grade);
  if (Number.isFinite(unitGrade) && unitGrade >= VOLO_GRADE_MIN) return clampGrade(unitGrade);
  const def = registry && registry[VOLO_TRAIT];
  const base = def && def.effect && Number(def.effect.grade);
  if (Number.isFinite(base) && base >= VOLO_GRADE_MIN) return clampGrade(base);
  return VOLO_GRADE_MIN;
}

module.exports = {
  resolveMovementProfile,
  deriveProfile,
  applyVoloGrade,
  evaluateVoloGrade,
  HAZARD_TERRAIN,
  VOLO_TRAIT,
};
