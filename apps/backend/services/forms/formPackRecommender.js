// V4 PI-Pacchetti tematici — form + job → pack recommendation.
//
// Carica data/core/forms/form_pack_bias.yaml.
// API:
//   getFormPacks(formId) → { pack_a, pack_b, pack_c, d12_bias, universal_packs }
//   recommendPacks({ form_id, job_id, d20_roll?, d12_roll? })
//     → { recommended: [pack_key, combo, tags], alternatives[], reason }
//
// Algorithm:
//   1. If d20 in [1..17] → map to universal pack A..J (by d20 table)
//   2. If d20 in [16..17] → Bias Forma, use d12 roll + form d12_bias
//   3. If d20 in [18..19] → Bias Job, pick random from job_bias[job_id]
//   4. If d20 == 20 → Scelta (all packs available)
//
// Ref: docs/core/PI-Pacchetti-Forme.md

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const BIAS_FILE = path.join(process.cwd(), 'data', 'core', 'forms', 'form_pack_bias.yaml');
let _cache = null;

// QW2 / M-017: Form -> starter bioma mapping (slot `starter_bioma` resolution).
// Each Form has a thematic biome + dedicated trait `starter_bioma_<form_id>`
// defined in data/core/traits/active_effects.yaml + glossary.json.
// Wire UI onboarding panel = follow-up PR.
const STARTER_BIOMA_MAP = Object.freeze({
  ISTJ: { biome_id: 'steppe_algoritmiche', trait_id: 'starter_bioma_istj' },
  ISFJ: { biome_id: 'foresta_temperata', trait_id: 'starter_bioma_isfj' },
  INFJ: { biome_id: 'foresta_miceliale', trait_id: 'starter_bioma_infj' },
  INTJ: { biome_id: 'rovine_planari', trait_id: 'starter_bioma_intj' },
  ISTP: { biome_id: 'caverna', trait_id: 'starter_bioma_istp' },
  ISFP: { biome_id: 'reef_luminescente', trait_id: 'starter_bioma_isfp' },
  INFP: { biome_id: 'foresta_acida', trait_id: 'starter_bioma_infp' },
  INTP: { biome_id: 'canyons_risonanti', trait_id: 'starter_bioma_intp' },
  ESTP: { biome_id: 'savana', trait_id: 'starter_bioma_estp' },
  ESFP: { biome_id: 'dorsale_termale_tropicale', trait_id: 'starter_bioma_esfp' },
  ENFP: { biome_id: 'canopia_ionica', trait_id: 'starter_bioma_enfp' },
  ENTP: { biome_id: 'atollo_obsidiana', trait_id: 'starter_bioma_entp' },
  ESTJ: { biome_id: 'badlands', trait_id: 'starter_bioma_estj' },
  ESFJ: { biome_id: 'pianura_salina_iperarida', trait_id: 'starter_bioma_esfj' },
  ENFJ: { biome_id: 'palude', trait_id: 'starter_bioma_enfj' },
  ENTJ: { biome_id: 'abisso_vulcanico', trait_id: 'starter_bioma_entj' },
});

function loadBias() {
  if (_cache) return _cache;
  if (!fs.existsSync(BIAS_FILE)) return null;
  try {
    const raw = fs.readFileSync(BIAS_FILE, 'utf8');
    _cache = yaml.load(raw);
    return _cache;
  } catch (err) {
    console.warn(`[form-pack-bias] load failed: ${err.message}`);
    return null;
  }
}

function _resetCache() {
  _cache = null;
}

/**
 * Get form-specific packs.
 *
 * Returns {pack_a, pack_b, pack_c, d12_bias, starter_bioma}.
 * starter_bioma is the resolved biome+trait pair for slot `starter_bioma`.
 */
function getFormPacks(formId) {
  const bias = loadBias();
  if (!bias) return null;
  const form = bias.forms?.[formId] || bias.forms?.NEUTRA;
  if (!form) return null;
  return {
    form_id: formId,
    pack_a: form.pack_a,
    pack_b: form.pack_b,
    pack_c: form.pack_c,
    d12_bias: form.d12_bias,
    starter_bioma: resolveStarterBioma(formId),
  };
}

/**
 * Resolve `starter_bioma` slot for a given Form to {biome_id, trait_id}.
 *
 * QW2 / M-017: every MBTI Form maps to a thematic biome + a dedicated
 * trait `starter_bioma_<form_id>` (defined in active_effects.yaml).
 * NEUTRA / unknown forms return null (caller handles fallback).
 *
 * @param {string} formId  MBTI form id (e.g. 'INTJ')
 * @returns {{biome_id: string, trait_id: string}|null}
 */
function resolveStarterBioma(formId) {
  if (!formId || typeof formId !== 'string') return null;
  return STARTER_BIOMA_MAP[formId] || null;
}

/**
 * List all 16 form -> starter bioma mappings.
 * Used by UI onboarding + tests + diagnostics.
 *
 * @returns {Array<{form_id, biome_id, trait_id}>}
 */
function listStarterBiomas() {
  return Object.entries(STARTER_BIOMA_MAP).map(([form_id, v]) => ({
    form_id,
    biome_id: v.biome_id,
    trait_id: v.trait_id,
  }));
}

/**
 * Resolve pack from d12 roll given bias ranges.
 */
function resolveD12Pack(form, d12Roll) {
  const b = form.d12_bias || {};
  const r = Number(d12Roll) || 1;
  for (const key of ['a', 'b', 'c']) {
    const range = b[key];
    if (Array.isArray(range) && r >= range[0] && r <= range[1]) {
      return `pack_${key}`;
    }
  }
  return 'pack_a';
}

/**
 * Resolve pack from d20 roll using canonical table (doc PI-Pacchetti-Forme).
 */
function resolveD20Pack(d20Roll) {
  const r = Number(d20Roll) || 1;
  if (r <= 2) return { pack: 'A', type: 'universal' };
  if (r <= 4) return { pack: 'B', type: 'universal' };
  if (r <= 6) return { pack: 'C', type: 'universal' };
  if (r <= 8) return { pack: 'D', type: 'universal' };
  if (r <= 10) return { pack: 'E', type: 'universal' };
  if (r === 11) return { pack: 'F', type: 'universal' };
  if (r === 12) return { pack: 'G', type: 'universal' };
  if (r === 13) return { pack: 'H', type: 'universal' };
  if (r === 14) return { pack: 'I', type: 'universal' };
  if (r === 15) return { pack: 'J', type: 'universal' };
  if (r <= 17) return { pack: null, type: 'bias_forma' };
  if (r <= 19) return { pack: null, type: 'bias_job' };
  return { pack: null, type: 'scelta' };
}

/**
 * Recommend packs given form + job + optional dice rolls.
 * Deterministic if both rolls provided.
 *
 * @returns {{ recommended, type, reason, form_packs, job_bias }}
 */
function recommendPacks({ form_id, job_id, d20_roll = null, d12_roll = null } = {}) {
  const bias = loadBias();
  if (!bias) return { error: 'bias data missing' };
  const form = bias.forms[form_id] || bias.forms.NEUTRA;
  const jobBias = bias.job_bias[job_id] || bias.job_bias.any;
  // QW2 / M-017: starter bioma resolution (null for NEUTRA / unknown forms).
  const starterBioma = resolveStarterBioma(form_id);

  // If no d20 given, return form packs as default recommendation
  if (d20_roll == null) {
    return {
      type: 'static_form_recommendation',
      form_packs: [
        { key: 'pack_a', ...form.pack_a },
        { key: 'pack_b', ...form.pack_b },
        { key: 'pack_c', ...form.pack_c },
      ],
      job_bias: jobBias,
      starter_bioma: starterBioma,
      reason: 'form-based default (no d20 provided)',
    };
  }

  const d20 = resolveD20Pack(d20_roll);

  if (d20.type === 'universal') {
    return {
      type: 'universal',
      d20_roll,
      pack_key: d20.pack,
      combo: bias.universal_packs[d20.pack],
      starter_bioma: starterBioma,
      reason: `d20=${d20_roll} → universal pack ${d20.pack}`,
    };
  }
  if (d20.type === 'bias_forma') {
    const key = resolveD12Pack(form, d12_roll || 1);
    const pack = form[key];
    return {
      type: 'bias_forma',
      d20_roll,
      d12_roll: d12_roll || null,
      form_id,
      pack_key: key,
      combo: pack?.combo || 'form pack missing',
      tags: pack?.tags || [],
      starter_bioma: starterBioma,
      reason: `d20=${d20_roll} Bias Forma → d12=${d12_roll} → ${key}`,
    };
  }
  if (d20.type === 'bias_job') {
    // Pick first from job_bias (deterministic, caller can randomize)
    const packKey = jobBias[0];
    return {
      type: 'bias_job',
      d20_roll,
      job_id,
      pack_key: packKey,
      combo: bias.universal_packs[packKey],
      alternatives: jobBias.slice(1).map((k) => ({ key: k, combo: bias.universal_packs[k] })),
      starter_bioma: starterBioma,
      reason: `d20=${d20_roll} Bias Job (${job_id}) → ${packKey}`,
    };
  }
  // Scelta: return all available
  return {
    type: 'scelta',
    d20_roll,
    all_packs: Object.entries(bias.universal_packs).map(([k, v]) => ({ key: k, combo: v })),
    form_packs: [form.pack_a, form.pack_b, form.pack_c],
    starter_bioma: starterBioma,
    reason: `d20=${d20_roll} Scelta → player choice`,
  };
}

module.exports = {
  loadBias,
  getFormPacks,
  recommendPacks,
  resolveD12Pack,
  resolveD20Pack,
  resolveStarterBioma,
  listStarterBiomas,
  STARTER_BIOMA_MAP,
  _resetCache,
};
