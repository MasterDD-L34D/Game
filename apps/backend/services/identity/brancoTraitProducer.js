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

// Deterministic string hash over the WHOLE imprint tuple (all mapped axes' poles). Drives the
// tuple-determined axis selection so the COMBINATION decides the trait (verdict D-2).
function _tupleHash(tuple, axes) {
  let h = 0;
  for (const axis of axes) {
    const v = tuple[axis] == null ? '' : String(tuple[axis]).toUpperCase();
    for (let i = 0; i < v.length; i++) h = (Math.imul(h, 31) + v.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * TUPLE-DETERMINED imprint-axis selection (verdict D-2; replaces the first-axis tie-break that
 * left only locomotion reachable -- Codex P2 #3115). The imprint is a single shared 4-tuple of
 * EQUAL-magnitude binary axes, so "which axis grants" cannot come from an argmax among them;
 * instead the WHOLE tuple deterministically selects one of the wired-pole axes. Pure, no-mutate,
 * never throws; same tuple -> same axis (reconnect/snapshot-stable). All wired cells are reachable
 * across the tuple space. PROPOSED mechanism (the hash-mod is arbitrary-but-deterministic; master-dd
 * may swap to a curated tuple->axis table at the N=40 ratify).
 *
 * @param {{ locomotion?, offense?, defense?, senses? }} tuple
 * @param {object} mapping  imprint axis x pole -> trait_id
 * @returns {{ axis, pole, trait_id } | null}
 */
function selectImprintAxis(tuple, mapping) {
  if (!tuple || typeof tuple !== 'object' || !mapping || typeof mapping !== 'object') return null;
  const axes = Object.keys(mapping);
  const candidates = [];
  for (const axis of axes) {
    const raw = tuple[axis];
    if (raw == null) continue;
    const pole = String(raw).toUpperCase();
    const trait_id = mapping[axis] && mapping[axis][pole];
    if (trait_id) candidates.push({ axis, pole, trait_id }); // only wired poles are selectable
  }
  if (!candidates.length) return null;
  const idx = _tupleHash(tuple, axes) % candidates.length;
  return candidates[idx];
}

/**
 * Pure: fill the single branco-trait slot from the Form-Pulse aggregate and (when combined)
 * the imprint tuple. No-mutate, deterministic, never throws.
 *
 * Form side: emergeBrancoTrait's own first-max-wins result IS the form representative (only the
 * global argmax can win). Imprint side: ONE tuple-determined candidate (selectImprintAxis). The
 * two compete with a STRICT `>` so Form-Pulse wins an exact tie with the imprint weight w
 * (Form-Pulse precedence).
 *
 * @param {object}  args.aggregate      Form-Pulse branco aggregate { creatureAxis: avg in [-1,1] }
 * @param {object}  [args.imprintTuple] { locomotion, offense, defense, senses } pole strings | null
 * @param {boolean} [args.combined]     true when the unified flag is ON (imprint participates)
 * @param {number}  [args.threshold]    emergence threshold (0 when ON, else 0.30)
 * @param {number}  [args.w]            imprint weight (resolveImprintWeight); only used when combined
 * @param {number}  [args.nPlayers]     team size for the W6 party-normalization (scales the form
 *                                      magnitude by sqrt(nPlayers) in the win comparison so one w
 *                                      hits the imprint-win target across sizes); absent -> unscaled
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
    nPlayers,
    formMapping = PROPOSED_BRANCO_TRAIT_MAPPING,
    imprintMapping = PROPOSED_IMPRINT_TRAIT_MAPPING,
  } = args;

  const opts = { mapping: formMapping };
  if (Number.isFinite(threshold)) opts.threshold = threshold;
  const fromForm = emergeBrancoTrait(aggregate, opts);

  // OFF: form-pulse only -> byte-identical to today's branco baseline (imprint never read).
  // Returned bare (no `source`) so the shape == emergeBrancoTrait exactly.
  if (!combined) return fromForm;

  // ON: the imprint contributes ONE tuple-determined candidate at magnitude w. The winner is
  // tagged with which channel supplied it (observability; #3083 carried `source`).
  let best = fromForm ? { ...fromForm, source: 'formpulse' } : null;
  const wMag = Number.isFinite(w) ? w : 0;
  const effThreshold = Number.isFinite(threshold) ? threshold : 0;
  // PARTY-NORMALIZATION (W6 ratify 2026-07-01): the Form-Pulse magnitude fed to this argmax is the
  // team-AVERAGED |avg| (from aggregateFormPulses), whose spread shrinks ~1/sqrt(n) with team size
  // (CLT) -> a FIXED imprint weight w wins the branco slot far more often on a bigger team (measured
  // N=4000: imprint-win 23% at 2 players vs 65% at 4 for w=0.5). Scaling the form magnitude by
  // sqrt(nPlayers) for the WIN COMPARISON makes the imprint-vs-form competition party-size-invariant,
  // so ONE ratified w hits the 30-40% target across sizes. `nPlayers` absent/invalid -> unscaled =
  // byte-identical to the pre-normalization behavior. Only the COMPARISON is normalized; the returned
  // magnitude stays raw |avg| (form) / w (imprint) so downstream semantics are unchanged.
  const formMagForCompare =
    best && Number.isFinite(nPlayers) && nPlayers > 0
      ? best.magnitude * Math.sqrt(nPlayers)
      : best
        ? best.magnitude
        : 0;
  // w must be a STRICTLY positive weight to compete: w=0 (the FORM_PULSE_IMPRINT_WEIGHT=0
  // control sweep) disables the imprint contribution -- otherwise an empty Form-Pulse aggregate
  // would still grant a magnitude-0 imprint trait, corrupting a zero-weight calibration run.
  if (imprintTuple && typeof imprintTuple === 'object' && wMag > 0 && wMag >= effThreshold) {
    const imp = selectImprintAxis(imprintTuple, imprintMapping);
    if (imp && (!best || wMag > formMagForCompare)) {
      best = { ...imp, magnitude: wMag, source: 'imprint' };
    }
  }
  return best || null;
}

module.exports = {
  IMPRINT_WEIGHT_FLAG,
  PROPOSED_IMPRINT_WEIGHT,
  resolveImprintWeight,
  selectImprintAxis,
  produceBrancoTrait,
};
