// =============================================================================
// Emergent branco-trait -- MA1 part 2 (ADR-2026-06-08, SPEC-M onboarding-identity).
//
// MA1 (ratified, opzione C ibrida): ogni player sceglie il trait della PROPRIA
// creatura (per-creatura, gia' DONE = campaign.acquiredTraitsByCreature) + UN
// trait-branco EMERGENTE dall'aggregato delle scelte (Form Pulse). Questo modulo
// e' la seconda meta': aggregato Form Pulse -> 1 trait condiviso di branco.
//
// DUE livelli, distinti per governance (stesso pattern di formPulseVc):
//   - MECCANISMO (oggettivo): aggregato -> asse dominante (max |avg|) sopra soglia
//     -> polo -> trait. Puro, no-mutate, testato.
//   - MAPPING + SOGLIA (soggettivi): quale asse-creatura/polo -> quale trait, e
//     quanto deve essere dominante il branco prima che un trait emerga.
//     `PROPOSED_*` = proposta ragionata, NON un fiat -- da ratificare via N=40
//     (MA3 anti-hard-gate), come PROPOSED_FP_VC_MAPPING / MAX_FP_VC_DELTA.
//
// Dormant fino a che la Form-Pulse UX (Godot) popola `formPulses`: nessun pulse
// -> aggregato vuoto -> nessun trait emergente (il branco ha solo i trait
// per-creatura). Anti-pattern museum `personality-mbti-gates-ghost`: i signal
// sono input MORBIDI, non fissano archetipo ne' hard-gate-ano rami.
//
// Assi Form Pulse (creature-themed, da formPulseVc): ogni asse in [-1,+1].
// =============================================================================

'use strict';

const { aggregateFormPulses } = require('../formPulseVc');
const { PROPOSED_IMPRINT_TRAIT_MAPPING } = require('../imprint/imprintTraitGrant');

// =============================================================================
// GOVERNANCE: RATIFIED (master-dd verdict 2026-06-24, Eduardo). The branco + minor mappings,
// the cap-tier rule, and the threshold->0 (always-emerge) are ACCEPTED. Evidence: coverage
// matrix + engine-LIVE audit (PR #3016), N=200 power probe (~1.2/creature), combat A/B (PR #3017).
// The `PROPOSED_*` symbol names are kept for API/import stability (the prefix is now vestigial).
// NOTE: ratification != flag flip -- FORM_PULSE_TRAIT_V2_ENABLED stays default OFF; the prod env
// flip is a separate deploy step (Ryzen operator, 2026-06-23-prod-flag-flip-readiness.md).
// =============================================================================

// RATIFIED (master-dd 2026-06-24). Soglia di dominanza: |avg| minimo
// dell'asse di branco prima che un trait emerga. Sotto soglia = branco indeciso
// -> nessun trait condiviso (solo i per-creatura). 0.30 = lean chiaro, non rumore.
const EMERGENCE_THRESHOLD = 0.3;

// Form-Pulse trait system v2 (spec 2026-06-23) -- Piece 1: always-emerge. Flag-gated,
// default OFF so the threshold stays 0.30 (band-neutral, byte-identical to today). With the
// flag ON the threshold drops to 0: the branco ALWAYS receives the dominant-axis trait, even
// a weak lean (a perfectly flat aggregate falls back to the first mapping axis, pole +, via
// emergeBrancoTrait's existing argmax). The mapping/threshold are RATIFIED (master-dd 2026-06-24);
// the flag itself stays default OFF until the separate prod env flip.
const FORM_PULSE_TRAIT_V2_FLAG = 'FORM_PULSE_TRAIT_V2_ENABLED';

// True iff the v2 flag is explicitly 'true' (mirror imprint isImprintEnabled / stamina).
function isFormPulseTraitV2Enabled(env = process.env) {
  return Boolean(env) && env[FORM_PULSE_TRAIT_V2_FLAG] === 'true';
}

// The emergence threshold for the current flag state: 0 (always emerge) when v2 is ON,
// else the band-neutral default 0.30. Callers pass this as emergeBrancoTrait opts.threshold.
function resolveEmergenceThreshold(env = process.env) {
  return isFormPulseTraitV2Enabled(env) ? 0 : EMERGENCE_THRESHOLD;
}

// RATIFIED (master-dd 2026-06-24). FP creature axis + pole -> branco trait_id.
// Ogni trait_id ESISTE in data/core/traits/active_effects.yaml ED e' engine-LIVE
// (trigger con consumer runtime reale; mismatch o trait inert = no-op silenzioso).
// Polo "+": vedi annotazioni di formPulseVc.
//   solitary_swarm  + = Sciame (sociale)      / - = solitario
//   explore_caution + = Cauto (concreto)      / - = esplorazione
//   symbiosis_predation + = Predazione (freddo)/ - = simbiosi
//   memory_instinct + = Memoria (planning)    / - = istinto
//   agile_robust    + = Robusto (forma)        / - = Agile
//
// Coverage audit 2026-06-23 (docs/planning/2026-06-23-aa01-form-pulse-trait-v2-coverage-matrix.md):
// 3 pick branco erano engine-INERT/near-inert (stesso difetto della review #2992 sul minor pool):
//   - solitary_swarm- : `mimetismo_cromatico_passivo` = action_type:passive + buff_stat -> NESSUN
//     consumer runtime (traitEffects/passiveStatusApplier/abilityExecutor non applicano buff_stat
//     passivo). Remap -> `mente_lucida` (apply_status panic, LIVE via evaluateStatusTraits).
//   - symbiosis_predation- : `empatia_coordinativa` = passive buff_stat = INERT. Remap ->
//     `spirito_combattivo` (triggers_on_ally_attack, LIVE via beastBondReaction, co-op/simbiosi).
//   - agile_robust- : `zampe_a_molla` = requires posizione_sopraelevata -> spara ~mai su mappe
//     piatte (near-inert, come `ali_fulminee` che la review aveva gia' scartato). Remap ->
//     `coda_stabilizzatrice_vortex` (extra_damage melee, LIVE; fratello T2 del minor Agile).
// Follow-up 2026-06-23 (verdetto Eduardo "stringi il polo S debole"): explore_caution+ (S/Cauto)
// era `sensori_sismici` = LIVE ma double-gated (melee + mos>=5) -> spara di rado (WEAK, e ci atterra
// Lealista-6 difensivo). Remap -> `cartilagini_flessoacustiche` (damage_reduction NO-gate, LIVE;
// difesa anticipatoria acustica = Cauto/vigilanza, ora reliable + coerente con Lealista).
// Tier branco non normalizzati (cervello_predittivo T3): spread documentato + gestito via
// encounter-difficulty offset (verdetto Eduardo 2026-06-23, path ratify-doc N=200), non re-tier.
const PROPOSED_BRANCO_TRAIT_MAPPING = {
  solitary_swarm: { '+': 'legame_di_branco', '-': 'mente_lucida' },
  explore_caution: { '+': 'cartilagini_flessoacustiche', '-': 'sensori_geomagnetici' },
  symbiosis_predation: { '+': 'ferocia', '-': 'spirito_combattivo' },
  memory_instinct: { '+': 'cervello_predittivo', '-': 'cervello_a_bassa_latenza' },
  agile_robust: { '+': 'pelle_elastomera', '-': 'coda_stabilizzatrice_vortex' },
};

// Form-Pulse trait v2 -- Piece 2: per-player MINOR trait pool (spec 2026-06-23, RATIFIED
// master-dd 2026-06-24). A SEPARATE, distinct-category 5x2 table of T1 trait_ids -- the minor trait
// reads as a smaller, personal flavor, NEVER a second branco-combat trait (so it must not
// reuse any PROPOSED_BRANCO_TRAIT_MAPPING id). CAP-TIER (Eduardo verdict 2026-06-23): the minor
// pool stays genuinely minor = EVERY id is T1 AND engine-LIVE-reliable (enforced by
// tests/services/formPulseTraitV2Coverage.test.js). The harsh review (PR #2992) caught the
// `memory_instinct` picks (`ancestor_autocontrollo_...fr_06` requires_target_tag = engine-INERT;
// `ali_fulminee` elevation-gated = fires ~never) -> replaced with `sensori_planctonici` +
// `coda_prensile_muscolare`. The coverage audit (2026-06-23) caught a 4th the review missed:
//   - symbiosis_predation- : `comunicazione_fotonica_coda_coda` = action_type:passive + buff_stat
//     -> NO runtime consumer = INERT. Remap -> `membrane_eliofiltranti` (damage_reduction T1,
//     no-gate, reliable; complements the co-op `spirito_combattivo` branco = endure-beside-allies).
// Pool RATIFIED (master-dd 2026-06-24); flag still default OFF until the prod env flip.
const PROPOSED_MINOR_TRAIT_MAPPING = {
  solitary_swarm: { '+': 'biofilm_glow', '-': 'camere_mirage' },
  explore_caution: { '+': 'cuticole_cerose', '-': 'antenne_dustsense' },
  symbiosis_predation: { '+': 'denti_seghettati', '-': 'membrane_eliofiltranti' },
  memory_instinct: { '+': 'sensori_planctonici', '-': 'coda_prensile_muscolare' },
  agile_robust: { '+': 'cartilagini_biofibre', '-': 'coda_stabilizzatrice_filo' },
};

// The dominant axis of one player's bars over the mapped axes (argmax|value|), optionally
// EXCLUDING an axis (used for the complement fall-through). Returns { axis, pole } | null.
// Pure; deterministic tie-break (mapping definition order, first max wins). Never throws.
function playerDominantAxis(axes, mapping, exclude) {
  if (!axes || typeof axes !== 'object') return null;
  let bestAxis = null;
  let bestMag = -Infinity;
  let bestAvg = 0;
  for (const axis of Object.keys(mapping)) {
    if (axis === exclude) continue;
    const v = Number(axes[axis]);
    if (!Number.isFinite(v)) continue;
    const mag = Math.abs(v);
    if (mag > bestMag) {
      bestMag = mag;
      bestAxis = axis;
      bestAvg = v;
    }
  }
  return bestAxis === null ? null : { axis: bestAxis, pole: bestAvg >= 0 ? '+' : '-' };
}

/**
 * Per-player minor trait via the COMPLEMENT rule (spec 2026-06-23): the player's OWN dominant
 * axis -> its minor-pool trait; if that axis EQUALS the branco's dominant axis, fall to the
 * player's 2nd-strongest axis so the minor COMPLEMENTS (never duplicates) the shared branco
 * trait. Pure, no-mutate. Empty/all-invalid bars -> null.
 *
 * @param playerAxes { [axis]: Number } one player's bars
 * @param brancoAxis  the emergent branco trait's dominant axis (string) | null
 * @param opts        { mapping? } (minor-pool mapping, default PROPOSED_MINOR_TRAIT_MAPPING)
 * @returns { trait_id, axis, pole: '+'|'-' } | null
 */
function emergePlayerMinorTrait(playerAxes, brancoAxis, opts = {}) {
  const mapping = opts.mapping || PROPOSED_MINOR_TRAIT_MAPPING;
  let pick = playerDominantAxis(playerAxes, mapping);
  if (!pick) return null;
  if (pick.axis === brancoAxis) {
    // Complement: use the 2nd-strongest (skip the branco axis). If the player leaned ONLY
    // the branco axis, keep it (a distinct minor-pool id, still not the branco trait).
    const alt = playerDominantAxis(playerAxes, mapping, brancoAxis);
    if (alt) pick = alt;
  }
  const trait_id = mapping[pick.axis] && mapping[pick.axis][pick.pole];
  if (!trait_id) return null;
  return { trait_id, axis: pick.axis, pole: pick.pole };
}

// Form-Pulse trait v2 -- Piece 3: roll a random signed bar value per axis for a
// non-participating player on timeout. rng() in [0,1) -> 2*rng()-1 in [-1,1), rounded to 3dp.
// The CALLER persists the result (frozen roll) so reconnect/snapshot stay deterministic
// despite the real-random source. rng is injectable for tests; default Math.random.
function rollRandomFormAxes(rng = Math.random) {
  const out = {};
  for (const axis of Object.keys(PROPOSED_BRANCO_TRAIT_MAPPING)) {
    out[axis] = Math.round((2 * rng() - 1) * 1000) / 1000;
  }
  return out;
}

// W1 offset-rework (grilling 2026-06-30): the set of trait_ids the Form-Pulse v2 system can
// GRANT (shared branco pole + per-player minor pole + imprint pole). The enemy-HP offset scales
// on how many of these are actually present on the player creatures, so the offset rides the
// real GRANT, not the flag (fixes flag-ON + solo = +40% enemy HP with zero buff).
function _grantableIds(mapping) {
  return Object.values(mapping || {}).flatMap((poles) => Object.values(poles || {}));
}
const GRANTED_V2_TRAIT_IDS = new Set([
  ..._grantableIds(PROPOSED_BRANCO_TRAIT_MAPPING),
  ..._grantableIds(PROPOSED_MINOR_TRAIT_MAPPING),
  ..._grantableIds(PROPOSED_IMPRINT_TRAIT_MAPPING),
]);

/**
 * W1 offset-rework: total granted Form-Pulse v2 buff power present on the team = the count of
 * branco/minor/imprint pool trait instances on the PLAYER creatures (enemy units ignored). Pure,
 * no-mutate. 0 in solo / when nothing was granted -> the offset is a no-op (1.0).
 *
 * PROXY CEILING (ponytail): each granted instance counts as 1 power-unit. A player who happens to
 * CHOOSE a pool trait inflates the count slightly (small, flag-ON-only, and biased SAFE -- it can
 * only ADD enemy HP, never the old zero-buff +40%). The exact per-trait power spread is the W6
 * N=40 ratify (see the combat-A/B caveat 5), not this chip.
 *
 * @param {Array} units -- combat units (player + sistema)
 * @returns {number} >= 0 granted buff power
 */
function countGrantedV2BuffPower(units) {
  if (!Array.isArray(units)) return 0;
  let power = 0;
  for (const u of units) {
    if (!u || u.controlled_by === 'sistema') continue;
    const traits = Array.isArray(u.traits) ? u.traits : [];
    for (const id of traits) {
      if (GRANTED_V2_TRAIT_IDS.has(id)) power += 1;
    }
  }
  return power;
}

function _posInt(raw, dflt) {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

// Form-Pulse trait v2 -- Piece 3: the 2-stage deadline (ms) for `playerCount` connected
// players. PROPOSED defaults (ratify): warn 45s, grace +30s, +per-player increment (0 by
// default). All env-configurable. warn = base + perPlayer*count; auto = warn + grace. Only
// consulted when the v2 flag is ON (the timer is gated by it).
function formPulseTimeoutMs(env = process.env, playerCount = 2) {
  const n = Number.isFinite(playerCount) ? Math.max(0, playerCount) : 0;
  const e = env || {};
  const warnBase = _posInt(e.FORM_PULSE_WARN_MS, 45000);
  const grace = _posInt(e.FORM_PULSE_GRACE_MS, 30000);
  const perPlayer = _posInt(e.FORM_PULSE_PER_PLAYER_MS, 1);
  // perPlayer default 1ms is effectively "no scaling" unless FORM_PULSE_PER_PLAYER_MS is set.
  const scaled = e.FORM_PULSE_PER_PLAYER_MS ? perPlayer * n : 0;
  const warnMs = warnBase + scaled;
  return { warnMs, autoMs: warnMs + grace };
}

/**
 * Pure: branco axis aggregate -> 1 emergent branco trait (or null).
 * Mechanism: dominant axis = argmax|avg| among mapped axes; if |avg| >= threshold
 * the trait for that axis's pole (sign of avg) emerges. Deterministic tie-break
 * (mapping definition order, first max wins). No-mutate.
 *
 * @param aggregate { [creatureAxis]: Number in [-1,1] } (from aggregateFormPulses)
 * @param opts      { mapping?, threshold? }
 * @returns { trait_id, axis, pole: '+'|'-', magnitude } | null
 */
function emergeBrancoTrait(aggregate, opts = {}) {
  if (!aggregate || typeof aggregate !== 'object') return null;
  const mapping = opts.mapping || PROPOSED_BRANCO_TRAIT_MAPPING;
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : EMERGENCE_THRESHOLD;

  let bestAxis = null;
  let bestMag = -Infinity;
  let bestAvg = 0;
  for (const axis of Object.keys(mapping)) {
    const v = Number(aggregate[axis]);
    if (!Number.isFinite(v)) continue;
    const mag = Math.abs(v);
    if (mag > bestMag) {
      bestMag = mag;
      bestAxis = axis;
      bestAvg = v;
    }
  }
  if (bestAxis === null || bestMag < threshold) return null;
  const pole = bestAvg >= 0 ? '+' : '-';
  const trait_id = mapping[bestAxis] && mapping[bestAxis][pole];
  if (!trait_id) return null;
  return { trait_id, axis: bestAxis, pole, magnitude: bestMag };
}

/**
 * Convenience for the campaign wiring: aggregate per-player Form Pulses (Map or
 * object, player -> {axes} | {axis:Number}) then emerge. Empty/null -> null.
 */
function emergeBrancoTraitFromPulses(fpMap, opts = {}) {
  const aggregate = aggregateFormPulses(fpMap);
  return emergeBrancoTrait(aggregate, opts);
}

module.exports = {
  EMERGENCE_THRESHOLD,
  FORM_PULSE_TRAIT_V2_FLAG,
  PROPOSED_BRANCO_TRAIT_MAPPING,
  PROPOSED_MINOR_TRAIT_MAPPING,
  isFormPulseTraitV2Enabled,
  resolveEmergenceThreshold,
  emergeBrancoTrait,
  emergeBrancoTraitFromPulses,
  emergePlayerMinorTrait,
  rollRandomFormAxes,
  formPulseTimeoutMs,
  countGrantedV2BuffPower,
  GRANTED_V2_TRAIT_IDS,
};
