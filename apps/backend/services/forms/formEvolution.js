// M12 Phase A — Form evolution engine.
//
// Layer on top of services/personalityProjection.js (projectForm + loadForms)
// to gate actual transitions between MBTI forms with trigger conditions:
//   - Axes confidence >= threshold (default 0.55)
//   - PE cost paid (default 8 PE; tunable via evo_costs.yaml future)
//   - Cooldown respected (default 3 rounds since last evolve)
//   - Candidate != current form
//
// Entry points:
//   - new FormEvolutionEngine({ forms, options })
//   - engine.evaluate(unitState, vcSnapshot) → eligibility report
//   - engine.evolve(unitState, targetFormId, options) → mutated state + delta
//   - engine.options(unitState, vcSnapshot) → sorted candidates
//
// Unit state shape (minimal):
//   {
//     id, current_form_id?, pe?, last_evolve_round?, evolve_count?,
//   }
//
// VC snapshot shape (matches personalityProjection.projectForm input):
//   { mbti_axes: { E_I:{value}, S_N:{value}, T_F:{value}, J_P:{value} } }
//
// Deterministic + side-effect-free for `evaluate`/`options`; `evolve` mutates
// the passed unit state in place (and returns it for chaining).

'use strict';

const { loadForms, projectForm } = require('../personalityProjection');

const DEFAULT_OPTIONS = {
  // Minimum confidence (from projectForm) to consider a form eligible.
  confidenceThreshold: 0.55,
  // PE cost deducted on evolve.
  peCost: 8,
  // Cooldown measured in rounds.
  cooldownRounds: 3,
  // Max evolve hops per unit per campaign (null = unlimited).
  maxEvolutions: null,
  // Whether to allow re-picking the current form (no-op evolve). Default false.
  allowSameForm: false,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

class FormEvolutionEngine {
  constructor({ forms = null, options = {} } = {}) {
    this.forms = forms || loadForms();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Evaluate whether `unit` can evolve into `targetFormId` given its VC
   * snapshot. Returns a structured report (never throws on missing data).
   */
  evaluate(unit, vcSnapshot, targetFormId, { currentRound = 0, extraPe = 0 } = {}) {
    const reasons = [];
    const form = this.forms?.forms?.[targetFormId];
    if (!form) {
      return {
        eligible: false,
        target_form_id: targetFormId,
        reasons: ['form_not_found'],
        projection: null,
      };
    }

    const projection = projectForm(vcSnapshot?.mbti_axes || {}, this.forms);
    const distanceToTarget = projection
      ? this._distanceToForm(vcSnapshot?.mbti_axes || {}, form.axes || {})
      : null;
    const confidenceToTarget =
      distanceToTarget !== null ? Math.max(0, 1 - distanceToTarget / 2) : 0;

    // Rule 1 — confidence threshold.
    if (confidenceToTarget < this.options.confidenceThreshold) {
      reasons.push('confidence_below_threshold');
    }
    // Rule 2 — PE cost available.
    const peAvailable = Number(unit?.pe ?? 0) + Number(extraPe);
    if (peAvailable < this.options.peCost) {
      reasons.push('insufficient_pe');
    }
    // Rule 3 — cooldown.
    const lastRound = Number(unit?.last_evolve_round ?? -Infinity);
    if (currentRound - lastRound < this.options.cooldownRounds) {
      reasons.push('cooldown_active');
    }
    // Rule 4 — not already in target.
    if (!this.options.allowSameForm && unit?.current_form_id === targetFormId) {
      reasons.push('already_current_form');
    }
    // Rule 5 — max evolutions cap.
    if (
      this.options.maxEvolutions !== null &&
      Number(unit?.evolve_count ?? 0) >= this.options.maxEvolutions
    ) {
      reasons.push('max_evolutions_reached');
    }

    return {
      eligible: reasons.length === 0,
      target_form_id: targetFormId,
      target_label: form.label,
      target_temperament: form.temperament,
      projection,
      confidence_to_target: Math.round(confidenceToTarget * 100) / 100,
      distance_to_target:
        distanceToTarget !== null ? Math.round(distanceToTarget * 1000) / 1000 : null,
      reasons,
      pe_cost: this.options.peCost,
      pe_available: peAvailable,
      cooldown_remaining: Math.max(0, this.options.cooldownRounds - (currentRound - lastRound)),
    };
  }

  /**
   * Return all 16 forms scored + eligibility, sorted descending by confidence.
   * (Renamed from `options` to avoid clash with the constructor-stored config.)
   */
  evaluateAll(unit, vcSnapshot, { currentRound = 0, extraPe = 0 } = {}) {
    const formEntries = Object.keys(this.forms?.forms || {});
    const scored = formEntries.map((fid) =>
      this.evaluate(unit, vcSnapshot, fid, { currentRound, extraPe }),
    );
    scored.sort((a, b) => b.confidence_to_target - a.confidence_to_target);
    return scored;
  }

  /**
   * Apply evolution in place. Returns { ok, delta, unit }.
   * Performs its own eligibility check — on fail returns { ok:false, reason }.
   */
  evolve(unit, vcSnapshot, targetFormId, { currentRound = 0, extraPe = 0 } = {}) {
    const report = this.evaluate(unit, vcSnapshot, targetFormId, { currentRound, extraPe });
    if (!report.eligible) {
      return {
        ok: false,
        reason: report.reasons[0] || 'unknown',
        all_reasons: report.reasons,
        report,
      };
    }
    const oldFormId = unit.current_form_id || null;
    const peBefore = Number(unit.pe ?? 0);
    const peAfter = Math.max(0, peBefore - this.options.peCost);
    unit.current_form_id = targetFormId;
    unit.pe = peAfter;
    unit.last_evolve_round = currentRound;
    unit.evolve_count = Number(unit.evolve_count ?? 0) + 1;

    const formMeta = this.forms.forms[targetFormId];
    return {
      ok: true,
      unit,
      delta: {
        old_form_id: oldFormId,
        new_form_id: targetFormId,
        pe_before: peBefore,
        pe_after: peAfter,
        pe_spent: peBefore - peAfter,
        round: currentRound,
        label: formMeta.label,
        temperament: formMeta.temperament,
        job_affinities: formMeta.job_affinities || [],
        job_penalties: formMeta.job_penalties || [],
      },
      report,
    };
  }

  /** Raw form catalog snapshot (for GET /registry). */
  snapshot() {
    const out = [];
    for (const [id, form] of Object.entries(this.forms?.forms || {})) {
      out.push({
        id,
        label: form.label,
        description_it: form.description_it,
        temperament: form.temperament,
        axes: form.axes,
        job_affinities: form.job_affinities || [],
        job_penalties: form.job_penalties || [],
      });
    }
    return { version: this.forms?.version || null, forms: out };
  }

  getForm(formId) {
    const form = this.forms?.forms?.[formId];
    if (!form) return null;
    return {
      id: formId,
      label: form.label,
      description_it: form.description_it,
      temperament: form.temperament,
      axes: form.axes,
      job_affinities: form.job_affinities || [],
      job_penalties: form.job_penalties || [],
    };
  }

  _distanceToForm(observedAxes, targetAxes) {
    const keys = ['E_I', 'S_N', 'T_F', 'J_P'];
    let sumSq = 0;
    for (const k of keys) {
      const obs =
        observedAxes[k] && observedAxes[k].value !== undefined ? observedAxes[k].value : 0.5;
      const tgt = targetAxes[k] !== undefined ? targetAxes[k] : 0.5;
      sumSq += (clamp(obs, 0, 1) - clamp(tgt, 0, 1)) ** 2;
    }
    return Math.sqrt(sumSq);
  }
}

module.exports = {
  FormEvolutionEngine,
  DEFAULT_OPTIONS,
};
