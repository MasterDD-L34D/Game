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

// PROPOSED (ratify via MA3, master-dd / N=40). Soglia di dominanza: |avg| minimo
// dell'asse di branco prima che un trait emerga. Sotto soglia = branco indeciso
// -> nessun trait condiviso (solo i per-creatura). 0.30 = lean chiaro, non rumore.
const EMERGENCE_THRESHOLD = 0.3;

// PROPOSED (ratify via MA3, master-dd). FP creature axis + pole -> branco trait_id.
// Tutti i trait_id ESISTONO in data/core/traits/active_effects.yaml (il resolver
// li applica; mismatch = no-op). Polo "+": vedi annotazioni di formPulseVc.
//   solitary_swarm  + = Sciame (sociale)      / - = solitario
//   explore_caution + = Cauto (concreto)      / - = esplorazione
//   symbiosis_predation + = Predazione (freddo)/ - = simbiosi
//   memory_instinct + = Memoria (planning)    / - = istinto
//   agile_robust    + = Robusto (forma)        / - = Agile
const PROPOSED_BRANCO_TRAIT_MAPPING = {
  solitary_swarm: { '+': 'legame_di_branco', '-': 'mimetismo_cromatico_passivo' },
  explore_caution: { '+': 'sensori_sismici', '-': 'sensori_geomagnetici' },
  symbiosis_predation: { '+': 'ferocia', '-': 'empatia_coordinativa' },
  memory_instinct: { '+': 'cervello_predittivo', '-': 'cervello_a_bassa_latenza' },
  agile_robust: { '+': 'pelle_elastomera', '-': 'zampe_a_molla' },
};

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
  PROPOSED_BRANCO_TRAIT_MAPPING,
  emergeBrancoTrait,
  emergeBrancoTraitFromPulses,
};
