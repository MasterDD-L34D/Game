// 2026-05-06 TKT-P3-INNATA-TRAIT-GRANT — Form innata trait grant helper.
//
// Canonical PI-Pacchetti-Forme.md dichiara: ogni Forma assegna 1 trait
// garantito (innata) al portatore. Pre-fix il campo non esisteva in
// `mbti_forms.yaml` e nessun runtime applicava il grant. Audit 2026-05-06
// flag P3 critical drift (specie-forme-tratti audit).
//
// Mapping 16 form → trait_id (pool active_effects.yaml 458 thematic).
// Loader cached via personalityProjection.loadForms (singleton).
//
// Wire: coopOrchestrator.submitCharacter post-normalize append innata
// trait to traits[] when form_id present + innata_trait_id missing dal
// traits array (no-dup).

'use strict';

const { loadForms } = require('../personalityProjection');

/**
 * Lookup innata trait_id for a given form_id (MBTI 4-letter).
 * @param {string} formId — form key in mbti_forms.yaml (es. INTJ, ESFP).
 * @returns {string|null} innata trait_id or null if missing/invalid.
 */
function getInnataTraitForForm(formId) {
  if (typeof formId !== 'string' || formId.length === 0) return null;
  let forms;
  try {
    forms = loadForms();
  } catch {
    return null;
  }
  const formData = forms?.forms?.[formId];
  if (!formData || typeof formData !== 'object') return null;
  const traitId = formData.innata_trait_id;
  return typeof traitId === 'string' && traitId.length > 0 ? traitId : null;
}

/**
 * Apply innata trait grant to a character spec. Returns new spec with
 * traits[] including innata trait (no duplicate). If form_id missing or
 * innata not found, returns spec unchanged.
 *
 * @param {object} spec — character spec with optional form_id + traits
 * @returns {object} spec with traits possibly extended
 */
function applyInnataTraitGrant(spec) {
  if (!spec || typeof spec !== 'object') return spec;
  const formId = typeof spec.form_id === 'string' ? spec.form_id : null;
  if (!formId) return spec;
  const innata = getInnataTraitForForm(formId);
  if (!innata) return spec;
  const existing = Array.isArray(spec.traits) ? spec.traits : [];
  if (existing.includes(innata)) return spec;
  return {
    ...spec,
    traits: [...existing, innata],
  };
}

module.exports = {
  getInnataTraitForForm,
  applyInnataTraitGrant,
};
