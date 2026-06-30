'use strict';

// =============================================================================
// Unified branco-trait producer -- W2 + W4 (Form-Pulse trait v2 flip-readiness,
// grilling 2026-06-30, master-dd ratified).
//
// ONE pure module that fills the SINGLE shared branco-trait slot from a weighted argmax
// over the union of two signals (verdicts P-c "combine" + D-2 "all 4 imprint axes"):
//   { 5 Form-Pulse continuous creature axes, magnitude |avg| }
//   UNION
//   { 4 imprint binary body-part axes, magnitude w (a PROPOSED weight) }.
// The winner's axis decides which mapping (Form-Pulse vs imprint) supplies the trait. No
// projection between the two axis vocabularies -- each keeps its own mapping (W3).
//
// This REPLACES the #3083 inline `fromPulses || imprint` fallback in
// coopOrchestrator._applyBrancoTraitEmergence and centralizes the precedence in one place.
//
// W4 flag-unification: the two old intertwined flags (FORM_PULSE_TRAIT_V2_ENABLED +
// IMPRINT_TRAIT_GRANT_ENABLED) collapse into ONE gate. The caller passes `combined` =
// isFormPulseTraitV2Enabled(): OFF -> form-pulse only (imprint never participates),
// byte-identical to today's branco baseline; ON -> the combined argmax (+ threshold 0).
// This removes the flag-coupling that let the enemy-HP offset ride the form-pulse flag
// alone (grilling branch 3).
//
// Single-slot guaranteed (ONE branco trait, no power stack) -> the W1 offset stays valid.
// `w` (the imprint weight) is a PROPOSED env knob -- its ratified value is the W6 N=40
// (master-dd), NOT fixed here (mirror MA3 / PROPOSED_FP_VC_MAPPING).
// =============================================================================

const { emergeBrancoTrait, PROPOSED_BRANCO_TRAIT_MAPPING } = require('./brancoTraitEmergence');
const { PROPOSED_IMPRINT_TRAIT_MAPPING } = require('../imprint/imprintTraitGrant');

const IMPRINT_WEIGHT_FLAG = 'FORM_PULSE_IMPRINT_WEIGHT';

// PROPOSED placeholder (NOT ratified). The imprint binary axes have magnitude |v|=1, so the
// raw weight `w` is how hard a present imprint pole competes against the continuous Form-Pulse
// leans (|avg| in [0,1]). Target (grilling W2): imprint wins ~30-40% of emergences -- too high
// and the binary imprint dominates the continuous averages; too low and it is vestigial. The
// ratified value is the W6 N=40 (master-dd); env-overridable for the sweep.
const PROPOSED_IMPRINT_WEIGHT = 0.5;

/**
 * The imprint weight for the argmax. Env override FORM_PULSE_IMPRINT_WEIGHT (>= 0) wins;
 * otherwise the PROPOSED default. Pure; never throws.
 */
function resolveImprintWeight(env = process.env) {
  const raw = Number(env && env[IMPRINT_WEIGHT_FLAG]);
  return Number.isFinite(raw) && raw >= 0 ? raw : PROPOSED_IMPRINT_WEIGHT;
}

/**
 * Pure: fill the single branco-trait slot from the Form-Pulse aggregate and (when combined)
 * the imprint tuple. No-mutate, deterministic tie-break, never throws.
 *
 * Tie-break: among ALL form candidates only the global argmax can win, so emergeBrancoTrait's
 * own first-max-wins result IS the form representative. It is compared against the imprint
 * candidates with a STRICT `>` so (a) Form-Pulse wins an exact tie with the imprint weight
 * (Form-Pulse precedence), and (b) among imprint axes the first in mapping order wins.
 *
 * @param {object}  args.aggregate      Form-Pulse branco aggregate { creatureAxis: avg in [-1,1] }
 * @param {object}  [args.imprintTuple] { locomotion, offense, defense, senses } pole strings | null
 * @param {boolean} [args.combined]     true when the unified flag is ON (imprint participates)
 * @param {number}  [args.threshold]    emergence threshold (0 when ON, else 0.30)
 * @param {number}  [args.w]            imprint weight (resolveImprintWeight); only used when combined
 * @param {object}  [args.formMapping]  Form-Pulse axis x pole -> trait_id
 * @param {object}  [args.imprintMapping] imprint axis x pole -> trait_id
 * @returns {{ trait_id, axis, pole, magnitude } | null}
 */
function produceBrancoTrait(args = {}) {
  const {
    aggregate,
    imprintTuple = null,
    combined = false,
    threshold,
    w,
    formMapping = PROPOSED_BRANCO_TRAIT_MAPPING,
    imprintMapping = PROPOSED_IMPRINT_TRAIT_MAPPING,
  } = args;

  const opts = { mapping: formMapping };
  if (Number.isFinite(threshold)) opts.threshold = threshold;
  const fromForm = emergeBrancoTrait(aggregate, opts);

  // OFF: form-pulse only -> byte-identical to today's branco baseline (imprint never read).
  // Returned bare (no `source`) so the shape == emergeBrancoTrait exactly.
  if (!combined) return fromForm;

  // ON: the imprint binary axes also compete for the single slot, each at magnitude w. The
  // winner is tagged with which channel supplied it (observability; #3083 carried `source`).
  let best = fromForm ? { ...fromForm, source: 'formpulse' } : null;
  const wMag = Number.isFinite(w) ? w : 0;
  const effThreshold = Number.isFinite(threshold) ? threshold : 0;
  // w must be a STRICTLY positive weight to compete: w=0 (the FORM_PULSE_IMPRINT_WEIGHT=0
  // control sweep) disables the imprint contribution -- otherwise an empty Form-Pulse aggregate
  // would still grant a magnitude-0 imprint trait, corrupting a zero-weight calibration run.
  if (imprintTuple && typeof imprintTuple === 'object' && wMag > 0 && wMag >= effThreshold) {
    for (const axis of Object.keys(imprintMapping)) {
      const raw = imprintTuple[axis];
      if (raw == null) continue;
      const pole = String(raw).toUpperCase();
      const trait_id = imprintMapping[axis] && imprintMapping[axis][pole];
      if (!trait_id) continue; // unmapped pole (e.g. a TODO balance-pick cell) -> no candidate
      if (!best || wMag > best.magnitude) {
        best = { trait_id, axis, pole, magnitude: wMag, source: 'imprint' };
      }
    }
  }
  return best || null;
}

module.exports = {
  IMPRINT_WEIGHT_FLAG,
  PROPOSED_IMPRINT_WEIGHT,
  resolveImprintWeight,
  produceBrancoTrait,
};
