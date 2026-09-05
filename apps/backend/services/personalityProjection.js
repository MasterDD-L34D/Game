// P4: PF_session — personality form projection engine.
//
// Proietta raw VC metrics su MBTI type + Ennea archetype.
// Carica forms da data/core/forms/mbti_forms.yaml.
// Espone:
//   - loadForms(path) → forms catalog
//   - projectForm(mbtiAxes, forms) → { type, form, distance, confidence }
//   - computePfSession(vcSnapshot, forms) → full PF session profile

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_FORMS_PATH = path.resolve(__dirname, '../../../data/core/forms/mbti_forms.yaml');

let _formsCache = null;

/**
 * Carica forms MBTI da YAML.
 */
function loadForms(formsPath = DEFAULT_FORMS_PATH) {
  if (_formsCache) return _formsCache;
  const raw = fs.readFileSync(formsPath, 'utf-8');
  const data = yaml.load(raw);
  _formsCache = data;
  return data;
}

/**
 * Calcola distanza euclidea tra axes osservati e axes target di un form.
 */
function axesDistance(observed, formAxes) {
  const keys = ['E_I', 'S_N', 'T_F', 'J_P'];
  let sumSq = 0;
  for (const k of keys) {
    const obs = observed[k] && observed[k].value !== undefined ? observed[k].value : 0.5;
    const target = formAxes[k] !== undefined ? formAxes[k] : 0.5;
    sumSq += (obs - target) ** 2;
  }
  return Math.sqrt(sumSq);
}

/**
 * Proietta axes MBTI osservati sul form piu vicino.
 * Ritorna { type, form, distance, confidence, top3 }.
 */
function projectForm(mbtiAxes, formsData) {
  const forms = (formsData && formsData.forms) || {};
  const scored = [];
  for (const [typeId, form] of Object.entries(forms)) {
    const dist = axesDistance(mbtiAxes, form.axes || {});
    scored.push({ type: typeId, form, distance: dist });
  }
  scored.sort((a, b) => a.distance - b.distance);

  const best = scored[0];
  if (!best) return null;

  // Confidence: 1 - normalized distance (max possible = sqrt(4) = 2)
  const confidence = Math.max(0, 1 - best.distance / 2);

  return {
    type: best.type,
    label: best.form.label,
    temperament: best.form.temperament,
    distance: Math.round(best.distance * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    job_affinities: best.form.job_affinities || [],
    job_penalties: best.form.job_penalties || [],
    top3: scored.slice(0, 3).map((s) => ({
      type: s.type,
      label: s.form.label,
      distance: Math.round(s.distance * 1000) / 1000,
    })),
  };
}

/**
 * Computa profilo PF_session completo da VC snapshot di un actor.
 */
function computePfSession(actorVc, formsData) {
  if (!actorVc) return null;
  const mbti = actorVc.mbti_axes;
  const mbtiType = actorVc.mbti_type;
  const ennea = actorVc.ennea_archetypes || [];

  const projection = mbti ? projectForm(mbti, formsData) : null;

  return {
    mbti_axes: mbti,
    mbti_type_derived: mbtiType,
    form_projection: projection,
    ennea_archetypes: ennea,
    ennea_primary: ennea.length > 0 ? ennea[0] : null,
  };
}

/**
 * Reset cache (per test).
 */
function resetFormsCache() {
  _formsCache = null;
}

module.exports = {
  loadForms,
  axesDistance,
  projectForm,
  computePfSession,
  resetFormsCache,
  DEFAULT_FORMS_PATH,
};
