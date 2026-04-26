// OD-013 Path A — MBTI phased reveal (Disco Elysium pacing pattern).
//
// Pure helper: data un VC snapshot per_actor entry, computa quali assi MBTI
// sono "rivelati" al player (confidence > threshold) vs "nascosti" (con hint
// diegetico tipo "ancora confuso").
//
// Sorgente confidence (vcScoring.js non espone `confidence` nativo):
//   - coverage='full' + value out-of-deadband (>0.6 o <0.4) → confidence ~0.85
//   - coverage='full' + value in deadband (0.4-0.6) → confidence ~0.45
//   - coverage='partial' → confidence 0.5 * coverage_factor
//   - null → confidence 0
// Formula: confidence = coverage_factor * decisiveness
//   coverage_factor: full=1.0, partial=0.6
//   decisiveness: |value - 0.5| * 2  (0..1, 1 = molto deciso, 0 = pari)
//
// Threshold default 0.7 (Disco Elysium pacing). Override via env
// MBTI_REVEAL_THRESHOLD=0.5 per A/B test. Range valido [0..1].

const COVERAGE_FACTOR = {
  full: 1.0,
  partial: 0.6,
};

// Italian labels per axis (conservative, design doc consistent).
const AXIS_LABELS = {
  E_I: { lo: 'Estroversione', hi: 'Introversione', label: 'Energia sociale' },
  S_N: { lo: 'Intuizione', hi: 'Sensazione', label: 'Percezione' },
  T_F: { lo: 'Sentimento', hi: 'Pensiero', label: 'Decisione' },
  J_P: { lo: 'Percezione', hi: 'Giudizio', label: 'Stile' },
};

// Hint diegetici per asse nascosto (italiano, in-character).
const AXIS_HINTS = {
  E_I: 'Sei socievole o solitario? Ancora non lo sai.',
  S_N: 'Vedi il dettaglio o l’insieme? Confuso.',
  T_F: 'Logica o cuore? Indeciso.',
  J_P: 'Pianifichi o improvvisi? Non sei sicuro.',
};

const DEAD_BAND_LOW = 0.4;
const DEAD_BAND_HIGH = 0.6;

/** Compute confidence (0..1) from a single axis entry {value, coverage}. */
function computeConfidence(axisEntry) {
  if (!axisEntry || axisEntry.value === null || axisEntry.value === undefined) return 0;
  const value = Number(axisEntry.value);
  if (!Number.isFinite(value)) return 0;
  const coverageFactor = COVERAGE_FACTOR[axisEntry.coverage] || 0;
  if (coverageFactor === 0) return 0;
  const decisiveness = Math.min(1, Math.abs(value - 0.5) * 2);
  return Number((coverageFactor * decisiveness).toFixed(3));
}

/** Pick letter for axis given value (out-of-deadband only). */
function letterForAxis(axis, value) {
  const labels = AXIS_LABELS[axis];
  if (!labels) return null;
  if (value < DEAD_BAND_LOW) return { letter: axis.split('_')[0], label: labels.lo };
  if (value > DEAD_BAND_HIGH) return { letter: axis.split('_')[1], label: labels.hi };
  return null; // dead-band → indeterminate
}

/**
 * Compute revealed/hidden MBTI axes for a single actor's VC snapshot.
 *
 * @param {object} actorVc - per_actor[uid] entry from buildVcSnapshot
 *                            (must have mbti_axes key).
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.7] - confidence cutoff for reveal.
 * @returns {{revealed: Array, hidden: Array}} additive shape.
 *   revealed: [{axis, value, confidence, letter, label, axis_label}]
 *   hidden:   [{axis, hint, axis_label, confidence}]
 */
function computeRevealedAxes(actorVc, opts = {}) {
  const threshold = resolveThreshold(opts.threshold);
  const out = { revealed: [], hidden: [] };
  if (!actorVc || typeof actorVc !== 'object') return out;
  const axes = actorVc.mbti_axes;
  if (!axes || typeof axes !== 'object') return out;

  for (const axis of Object.keys(AXIS_LABELS)) {
    const entry = axes[axis];
    const labels = AXIS_LABELS[axis];
    const confidence = computeConfidence(entry);
    if (confidence >= threshold && entry && entry.value !== null && entry.value !== undefined) {
      const letterInfo = letterForAxis(axis, Number(entry.value));
      if (letterInfo) {
        out.revealed.push({
          axis,
          value: Number(entry.value),
          confidence,
          letter: letterInfo.letter,
          label: letterInfo.label,
          axis_label: labels.label,
          coverage: entry.coverage || 'unknown',
        });
        continue;
      }
    }
    out.hidden.push({
      axis,
      hint: AXIS_HINTS[axis],
      axis_label: labels.label,
      confidence,
    });
  }

  return out;
}

/**
 * Build the `mbti_revealed` map keyed by unit_id from a full vcSnapshot.
 *
 * @param {object} vcSnapshot - output of buildVcSnapshot.
 * @param {object} [opts]
 * @returns {Object<string, {revealed, hidden}>}
 */
function buildMbtiRevealedMap(vcSnapshot, opts = {}) {
  const out = {};
  if (!vcSnapshot || typeof vcSnapshot !== 'object') return out;
  const perActor = vcSnapshot.per_actor;
  if (!perActor || typeof perActor !== 'object') return out;
  for (const [uid, actorVc] of Object.entries(perActor)) {
    out[uid] = computeRevealedAxes(actorVc, opts);
  }
  return out;
}

function resolveThreshold(override) {
  if (Number.isFinite(override) && override >= 0 && override <= 1) return override;
  const envRaw = process.env.MBTI_REVEAL_THRESHOLD;
  if (envRaw !== undefined && envRaw !== '') {
    const parsed = Number(envRaw);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return 0.7;
}

module.exports = {
  computeConfidence,
  computeRevealedAxes,
  buildMbtiRevealedMap,
  resolveThreshold,
  AXIS_LABELS,
  AXIS_HINTS,
};
