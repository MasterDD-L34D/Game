'use strict';

// =============================================================================
// Imprint axis -> branco trait grant -- D6 (aa01 L'Impronta, 2026-06-30).
//
// Master-dd ratified (AskUserQuestion, close-out Tier-2 aa01 cluster):
//   - stacking model = **B** (the imprint FEEDS the single shared branco-trait
//     slot; it does NOT stack a second trait -> no P6 power-creep),
//   - mechanism = **(a) designated-axis** = `locomotion` (only the locomotion
//     pole grants; the other 3 axes stay cosmetic for the trait),
// against the DRAFT spec docs/planning/2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md.
//
// Mirrors brancoTraitEmergence governance (MA1 part 2, ADR-2026-06-08):
//   - MECHANISM (objective): designated-axis pole -> trait_id. Pure, no-mutate,
//     deterministic, silent no-op on an unknown/missing axis. Tested.
//   - MAPPING (subjective): PROPOSED -- ratify via N=40 (MA3 anti-hard-gate),
//     NOT a fiat. Flag stays default OFF until the separate prod env flip.
//   - Dormant: no imprint tuple -> no candidate. Soft signal, never a hard gate.
//
// VERIFY-FIRST CORRECTION (load-bearing, 2026-06-30):
//   The draft's PROPOSED locomotion picks were `zampe_a_molla` (VELOCE) and
//   `mimetismo_cromatico_passivo` (SILENZIOSA). BOTH are engine-INERT/near-inert
//   -- the SAME defect the brancoTraitEmergence coverage audit (2026-06-23)
//   already caught and rejected:
//     - `mimetismo_cromatico_passivo`: action_type:passive -> NO runtime consumer
//       (traitEffects passesBasicTriggers gates on action_type==='attack').
//     - `zampe_a_molla`: action_type:attack + min_mos>=5 -> fires ~never.
//   A third candidate, `spore_psichiche_silenziate` (action_type:melee_attack),
//   is ALSO inert via the same gate (melee_attack !== 'attack' -> return false at
//   traitEffects.js passesBasicTriggers). Shipping any of these as the PROPOSED
//   default would make the N=40 ratify pass falsely (a no-op trait shows ~0 delta)
//   and ship the feature engine-LIVE / surface-DEAD.
//   -> The PROPOSED picks below are drawn from the audited-LIVE brancoTrait set:
//     - VELOCE     -> `coda_stabilizzatrice_vortex` (T2, attack/on_result:hit,
//        extra_damage melee; the branco mapping's Agile-pole pick -> fast/agile fit).
//     - SILENZIOSA -> `cartilagini_flessoacustiche` (T2, attack/on_result:hit,
//        damage_reduction NO-gate, reliable; acoustic/anticipatory = silent-move fit).
//   These remain PROPOSED -- master-dd may re-pick at the N=40 ratify (esp. if a
//   genuinely LIVE stealth-flavoured trait is authored for SILENZIOSA).
// =============================================================================

const { isImprintEnabled } = require('./imprintBiomeWeights');

const IMPRINT_TRAIT_GRANT_FLAG = 'IMPRINT_TRAIT_GRANT_ENABLED';

// Mechanism (a): only this axis grants a trait. The other imprint axes stay cosmetic.
const DESIGNATED_AXIS = 'locomotion';

// PROPOSED locomotion pole -> branco trait_id (audited-LIVE; ratify via N=40).
// Pole here is the imprint VALUE (VELOCE / SILENZIOSA), not a +/- sign.
const PROPOSED_IMPRINT_TRAIT_MAPPING = {
  locomotion: {
    VELOCE: 'coda_stabilizzatrice_vortex',
    SILENZIOSA: 'cartilagini_flessoacustiche',
  },
};

// Flag gate (mirror isImprintEnabled / isFatigueEnabled): the grant is active ONLY
// when its OWN flag is 'true' AND the imprint beat itself is enabled. Default OFF on
// both -> no trait ever granted -> byte-identical legacy (band-neutral).
function isImprintTraitGrantEnabled(env = process.env) {
  return Boolean(env) && env[IMPRINT_TRAIT_GRANT_FLAG] === 'true' && isImprintEnabled(env);
}

/**
 * Pure: the team imprint 4-tuple -> the single candidate branco trait it would
 * grant (or null). Reads ONLY the designated axis's pole. No-mutate, deterministic,
 * never throws. An unknown/missing axis value -> null (silent, dormant).
 *
 * @param {{ locomotion?, offense?, defense?, senses? }} tuple
 * @param {{ mapping?, axis? }} [opts]
 * @returns {{ trait_id, axis, pole, source: 'imprint' } | null}
 */
function emergeImprintTrait(tuple, opts = {}) {
  if (!tuple || typeof tuple !== 'object') return null;
  const mapping = opts.mapping || PROPOSED_IMPRINT_TRAIT_MAPPING;
  const axis = opts.axis || DESIGNATED_AXIS;
  const raw = tuple[axis];
  if (raw == null) return null;
  const pole = String(raw).toUpperCase();
  const trait_id = mapping[axis] && mapping[axis][pole];
  if (!trait_id) return null;
  return { trait_id, axis, pole, source: 'imprint' };
}

module.exports = {
  IMPRINT_TRAIT_GRANT_FLAG,
  DESIGNATED_AXIS,
  PROPOSED_IMPRINT_TRAIT_MAPPING,
  isImprintTraitGrantEnabled,
  emergeImprintTrait,
};
