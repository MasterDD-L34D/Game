// 2026-05-06 TKT-P3-FORM-STAT-APPLIER — Form stat_seed → unit baseline applier.
//
// Pre-fix audit 2026-05-06: form_id era cosmetic only — NO stat modifier
// in combat (`wsSession.js:1348` fallback `form_default`). Canonical PI-
// Pacchetti-Forme dichiara form ha mechanical link a baseline stat.
//
// Mapping 16 form × 4 stat delta in `mbti_forms.yaml`:
//   stat_seed: {hp, ap, mod, guardia}
// Range conservativo ±2 max per stat. Additive (NO multiplicative).
// Sum delta per form near-0 (balanced character).
//
// Wire: `routes/sessionHelpers.js normaliseUnit` apply post-baseline.
// Caller side: idempotent (NO double-apply via flag check), graceful
// fallback (form_id missing → no-op).

'use strict';

const { loadForms } = require('../personalityProjection');

/**
 * Lookup stat_seed delta for a given form_id (MBTI 4-letter).
 * @param {string} formId — form key in mbti_forms.yaml (es. INTJ).
 * @returns {{hp, ap, mod, guardia}|null} delta object or null missing.
 */
function getStatSeedForForm(formId) {
  if (typeof formId !== 'string' || formId.length === 0) return null;
  let forms;
  try {
    forms = loadForms();
  } catch {
    return null;
  }
  const formData = forms?.forms?.[formId];
  if (!formData || typeof formData !== 'object') return null;
  const seed = formData.stat_seed;
  if (!seed || typeof seed !== 'object') return null;
  return {
    hp: Number.isFinite(Number(seed.hp)) ? Number(seed.hp) : 0,
    ap: Number.isFinite(Number(seed.ap)) ? Number(seed.ap) : 0,
    mod: Number.isFinite(Number(seed.mod)) ? Number(seed.mod) : 0,
    guardia: Number.isFinite(Number(seed.guardia)) ? Number(seed.guardia) : 0,
  };
}

/**
 * Apply stat_seed delta to a unit object. Returns new unit with
 * adjusted stat values. No-op when form_id missing or unknown.
 * Idempotent via _form_stat_applied flag (set on first apply).
 *
 * @param {object} unit — unit object with hp/max_hp/ap/mod/guardia
 * @returns {object} unit (same ref or new) with deltas applied
 */
function applyStatSeed(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (unit._form_stat_applied) return unit;
  const formId = typeof unit.form_id === 'string' ? unit.form_id : null;
  if (!formId) return unit;
  const seed = getStatSeedForForm(formId);
  if (!seed) return unit;
  // Apply additive deltas. Clamp HP to min 1 (no zero-init kill).
  const newHp = Math.max(1, (Number(unit.hp) || 0) + seed.hp);
  const newMaxHp = Math.max(1, (Number(unit.max_hp) || 0) + seed.hp);
  const newAp = Math.max(0, (Number(unit.ap) || 0) + seed.ap);
  const newApRem = Math.max(
    0,
    (Number.isFinite(Number(unit.ap_remaining)) ? Number(unit.ap_remaining) : newAp) + seed.ap,
  );
  const newMod = (Number(unit.mod) || 0) + seed.mod;
  const newGuardia = Math.max(0, (Number(unit.guardia) || 0) + seed.guardia);
  return {
    ...unit,
    hp: newHp,
    max_hp: newMaxHp,
    ap: newAp,
    ap_remaining: newApRem,
    mod: newMod,
    guardia: newGuardia,
    _form_stat_applied: true,
  };
}

/**
 * 2026-05-10 TKT-MBTI-AFFINITY-RUNTIME — wire job_affinities/penalties
 * runtime as first-turn soft bonus/malus.
 *
 * Audit cross-domain BACKLOG: pre-fix mbti_forms.yaml job_affinities +
 * job_penalties erano data-only. personalityProjection esponeva i campi
 * ma nessun runtime path applicava bonus/malus. Post fix vocab remap
 * (TKT-MBTI-JOB-VOCAB) + expansion add (TKT-MBTI-EXP-JOBS) i field ora
 * resolve canonical jobs ID — questa funzione completa il triangle
 * MBTI→Job→Stat applicando first-turn soft modifier.
 *
 * Logic:
 * - Match by form_id + job_id (canonical IDs entrambi).
 * - In job_affinities → +1 attack_mod_bonus + +1 defense_mod_bonus
 *   con status flag attack_mod_buff=1 + defense_mod_buff=1 (decay
 *   automatico end-of-round via existing decay loop).
 * - In job_penalties → mirror soft_gate.first_turn_penalty da
 *   mbti_forms.yaml (-1/-1, duration 1).
 * - Idempotent via `_form_job_affinity_applied` flag.
 *
 * Wire: `routes/sessionHelpers.js normaliseUnit` post-applyStatSeed.
 * Backward-compat: form_id OR job_id missing → no-op.
 */
function applyJobAffinityBonus(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (unit._form_job_affinity_applied) return unit;
  const formId = typeof unit.form_id === 'string' ? unit.form_id : null;
  const jobId = typeof unit.job === 'string' ? unit.job : null;
  if (!formId || !jobId) return unit;
  let forms;
  try {
    forms = loadForms();
  } catch {
    return unit;
  }
  const formData = forms?.forms?.[formId];
  if (!formData || typeof formData !== 'object') return unit;
  const affinities = Array.isArray(formData.job_affinities) ? formData.job_affinities : [];
  const penalties = Array.isArray(formData.job_penalties) ? formData.job_penalties : [];
  const inAffinity = affinities.includes(jobId);
  const inPenalty = penalties.includes(jobId);
  if (!inAffinity && !inPenalty) return unit;
  // Match canonical mbti_forms.yaml soft_gate.first_turn_penalty schema:
  // {attack_mod, defense_mod, duration_turns}. Affinity = mirror inverse.
  const delta = inAffinity ? 1 : -1;
  const duration = 1;
  const status = unit.status && typeof unit.status === 'object' ? { ...unit.status } : {};
  const bonusAttack = (Number(unit.attack_mod_bonus) || 0) + delta;
  const bonusDefense = (Number(unit.defense_mod_bonus) || 0) + delta;
  status.attack_mod_buff = Math.max(Number(status.attack_mod_buff) || 0, duration);
  status.defense_mod_buff = Math.max(Number(status.defense_mod_buff) || 0, duration);
  return {
    ...unit,
    attack_mod_bonus: bonusAttack,
    defense_mod_bonus: bonusDefense,
    status,
    _form_job_affinity_applied: true,
    _form_job_affinity_kind: inAffinity ? 'affinity' : 'penalty',
  };
}

module.exports = {
  getStatSeedForForm,
  applyStatSeed,
  applyJobAffinityBonus,
};
