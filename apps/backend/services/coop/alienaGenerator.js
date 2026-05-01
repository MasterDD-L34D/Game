// W5-bb (cross-repo Godot v2 mirror) — A.L.I.E.N.A. authoring service.
//
// Surfaces player-facing world summary (`aliena_summary_it`) without ever
// labeling the system itself to player. Doctrine: A.L.I.E.N.A. is a
// behind-the-scenes coherence framework; player sees only the world
// statement it produces.
//
// Phase A (W5-bb MVP): static per-biome template lookup. Static strings
// match Godot v2 sample JSON (`data/world_setup/sample_world_setup_*.json`).
//
// Phase B (W5.5): LLM-prompted dynamic generation hook + version
// discriminator field (`aliena_version`) for migration/parity tests.
// LLM call optional via injectable opts.llmCall; default fallback to
// template_v1 (deterministic) when LLM absent or fails.

'use strict';

// Schema version discriminator for cross-repo parity (mirror
// scripts/session/world_setup_state.gd ALIENA_VERSION_*).
const ALIENA_VERSION_TEMPLATE_V1 = 'template_v1';
const ALIENA_VERSION_LLM_V1 = 'llm_v1';

// Static per-biome aliena_summary_it. Mirrors Godot v2 sample JSON content.
// Keys MUST match biomes.yaml ids verbatim.
const STATIC_SUMMARIES = Object.freeze({
  savana:
    'Savana al margine arido: predatori in branco si contendono il territorio sotto pressione idrica crescente. La memoria del bioma favorisce predatori veloci e tattiche di flanking.',
  caverna:
    "Caverna risonante: il buio è una rete sensoriale; chi non sa leggere l'eco resta indietro. La pressione moltiplica gli errori, ma rivela anche le scorciatoie del branco.",
  atollo_obsidiana:
    'Atollo di ossidiana: il magnetismo qui non è ostacolo, è linguaggio. Le creature locali navigano dove altri si perdono — la forma del territorio cambia più veloce della memoria.',
  foresta_temperata:
    'Foresta temperata in equilibrio: il bosco osserva e ricorda. Predatori aerei dominano la canopia; chi sa muoversi nel sottobosco senza interrompere i suoni passa indisturbato.',
  badlands:
    'Calanchi ferromagnetici: il ferro nel terreno tira ogni movimento. Sopravvive chi capisce quando cedere alla pressione e quando spingere oltre la rovina.',
  foresta_miceliale:
    'Foresta miceliale: il sottobosco pulsa di reti vegetali interconnesse. Chi parla la lingua delle spore trova alleati invisibili.',
  abisso_vulcanico:
    'Abisso vulcanico: il calore impone ritmo. Le creature locali si muovono in finestre termiche che chi non legge le fumarole ignora a proprio rischio.',
  reef_luminescente:
    'Reef luminescente: la luce viene dal basso e racconta storie. Il branco si orienta per fotofase, non per gravità.',
  caldera_glaciale:
    'Caldera glaciale: il gelo conserva memoria. Chi cammina lascia traccia chimica per stagioni, e qualcuno la legge sempre.',
  pianura_salina_iperarida:
    'Pianura salina iperarida: il sale corrode ogni passo lento. Sopravvive chi ha imparato a muoversi in finestre brevi, prima che la disidratazione arbitra.',
  mezzanotte_orbitale:
    'Mezzanotte orbitale: il vuoto custodisce piccole voci. Le orbite suggeriscono rotte invisibili a chi non ha pazienza.',
  frattura_abissale_sinaptica:
    'Frattura abissale sinaptica: la rete neurale del bioma decide prima del corpo. Chi entra senza ascoltare la rete viene scartato come segnale spurio.',
  foresta_acida:
    "Foresta acida: ogni passo richiede gradiente chimico. Le creature locali vivono dove l'acidità è linguaggio, non ostacolo.",
});

const FALLBACK_SUMMARY =
  'Il bioma respira con regole proprie. Osserva prima di decidere: il mondo si forma intorno a chi sa ascoltare.';

/**
 * Generate player-facing aliena_summary_it for a biome.
 *
 * @param {string} biomeId — biome slug
 * @param {object} [opts]
 * @returns {string} player-facing summary (never labeled "ALIENA")
 */
function generateAlienaSummary(biomeId, _opts = {}) {
  if (!biomeId || typeof biomeId !== 'string') return FALLBACK_SUMMARY;
  return STATIC_SUMMARIES[biomeId] || FALLBACK_SUMMARY;
}

/**
 * Generate authoring tags (debug-only / never player-facing).
 * Deferred to W5.5+; returns empty array for MVP.
 */
function generateAuthoringTags(_biomeId, _opts = {}) {
  return [];
}

/**
 * W5.5 — Generate ALIENA envelope with summary + version discriminator.
 *
 * Hybrid path: when opts.llmCall provided + succeeds → llm_v1 envelope.
 * Otherwise (LLM absent, throws, returns empty) → template_v1 fallback
 * (deterministic, mirrors Godot v2 AlienaTemplateFallback offline).
 *
 * @param {string} biomeId — biome slug
 * @param {object} [opts]
 * @param {Function} [opts.llmCall] — async (biomeId, ctx) => string|null|throw
 * @param {object} [opts.llmContext] — passed to llmCall (formAxes, partyJobs, etc.)
 * @returns {Promise<{summary: string, version: string}>} envelope
 */
async function generateAlienaEnvelope(biomeId, opts = {}) {
  const templateSummary = generateAlienaSummary(biomeId);
  const { llmCall, llmContext = {} } = opts;
  if (typeof llmCall !== 'function') {
    return { summary: templateSummary, version: ALIENA_VERSION_TEMPLATE_V1 };
  }
  try {
    const llmOut = await llmCall(biomeId, llmContext);
    if (typeof llmOut === 'string' && llmOut.trim().length > 0) {
      return { summary: llmOut.trim(), version: ALIENA_VERSION_LLM_V1 };
    }
  } catch (_err) {
    // LLM failure: graceful fallback to template, never crash request.
  }
  return { summary: templateSummary, version: ALIENA_VERSION_TEMPLATE_V1 };
}

module.exports = {
  generateAlienaSummary,
  generateAlienaEnvelope,
  generateAuthoringTags,
  STATIC_SUMMARIES,
  FALLBACK_SUMMARY,
  ALIENA_VERSION_TEMPLATE_V1,
  ALIENA_VERSION_LLM_V1,
};
