// =============================================================================
// Form Pulse -> VC axis delta -- SPEC-M acceptance #4 (soft + bounded transform).
//
// Il Form Pulse (5 micro-scenari swipe, assi creature-themed) e' stored/broadcast
// in coopOrchestrator (`submitFormPulse`) ma NON era letto da vcScoring. Questo
// modulo costruisce il transform mancante: `formPulses -> VC/MBTI axis delta`.
//
// DUE livelli, distinti per governance:
//   - MECCANISMO (oggettivo): nudge soft + bounded + clamp01, no-mutate. Testato.
//   - MAPPING (soggettivo): quale asse-creatura spinge quale asse-MBTI e in che
//     direzione. `PROPOSED_FP_VC_MAPPING` e' una PROPOSTA -- va ratificata via MA3
//     (master-dd); le direzioni qui sotto sono un default ragionato, non un fiat.
//
// Magnitudine (`MAX_FP_VC_DELTA`) = soft cap per asse; valore esatto da ratificare
// con N=40 (MA3 anti-hard-gate). Anti-pattern museum `personality-mbti-gates-ghost`:
// i signal sono input MORBIDI, non fissano archetipo ne' hard-gate-ano rami.
//
// Convenzione input FP: ogni asse-creatura in [-1, +1] (direzione swipe). Il "+pole"
// di ogni asse e' annotato nel mapping. Valori fuori range sono clampati a [-1,1].
// =============================================================================

'use strict';

// Soft cap per asse -- GOVERNANCE: RATIFIED-PROVISIONAL (verdetto master-dd
// 2026-06-10, N=40 paired probe: 2234 campioni/40 run, flip~0% = nudge non gate;
// re-validate on player data). Evidence: docs/reports/2026-06-10-fp-vc-delta-n40-evidence.md
const MAX_FP_VC_DELTA = 0.05;

// PROPOSED (ratify via MA3, master-dd). FP creature axis -> { mbti, sign }.
// sign=+1 => il +pole dell'asse-creatura ALZA il valore dell'asse-MBTI mappato.
// MBTI axis value in [0,1]; clamp01 dopo il delta.
// Direzioni allineate alla CONVENZIONE ENGINE (deriveMbtiType letterOrUncertain:
// value HIGH = I/S/T/J) -- verdetto master-dd 2026-06-10 (#2679 Q4): il sign E_I
// era invertito ("+Sciame -> +E_I extraversion proxy" spingeva verso Introvert).
const PROPOSED_FP_VC_MAPPING = {
  // +pole = Sciame (sociale) -> spinge verso E = ABBASSA E_I (engine: HIGH = I).
  solitary_swarm: { mbti: 'E_I', sign: -1 },
  // +pole = Cauto (concreto) -> +S_N (sensing proxy)
  explore_caution: { mbti: 'S_N', sign: +1 },
  // +pole = Predazione (freddo/calcolo) -> +T_F (thinking proxy)
  symbiosis_predation: { mbti: 'T_F', sign: +1 },
  // +pole = Memoria (pianificazione) -> +J_P (judging proxy)
  memory_instinct: { mbti: 'J_P', sign: +1 },
  // NB: `agile_robust` (Agile/Robusto) = asse Forma/fisico, nessuna corrispondenza
  // MBTI pulita -> volutamente NON mappato (alimentera' la Forma, non il VC).
};

function clamp01(x) {
  if (!Number.isFinite(x)) return x;
  return Math.max(0, Math.min(1, x));
}

function clampUnit(x) {
  return Math.max(-1, Math.min(1, x));
}

/**
 * Apply a soft, bounded form-pulse delta to a set of MBTI axes.
 * Pure: returns a new axes object, never mutates the input.
 *
 * @param mbtiAxes  { E_I:{value,coverage}, S_N:{...}, ... } (from vcScoring)
 * @param fpAxes    { [creatureAxis]: Number in [-1,1] } (aggregated or per-actor)
 * @param opts      { mapping?, maxDelta? }
 * @returns adjusted axes (axes with a finite value get nudged + fp_adjusted:true)
 */
function applyFormPulseDelta(mbtiAxes, fpAxes, opts = {}) {
  if (!mbtiAxes || typeof mbtiAxes !== 'object') return mbtiAxes;
  if (!fpAxes || typeof fpAxes !== 'object') return mbtiAxes;
  const mapping = opts.mapping || PROPOSED_FP_VC_MAPPING;
  const maxDelta = Number.isFinite(opts.maxDelta) ? opts.maxDelta : MAX_FP_VC_DELTA;

  const out = {};
  for (const [k, v] of Object.entries(mbtiAxes)) out[k] = v;

  for (const [fpKey, cfg] of Object.entries(mapping)) {
    const raw = Number(fpAxes[fpKey]);
    if (!Number.isFinite(raw)) continue;
    const delta = cfg.sign * clampUnit(raw) * maxDelta;
    const target = out[cfg.mbti];
    if (!target || typeof target !== 'object') continue;
    if (target.value == null) continue; // null/partial axis -> leave untouched (Number(null)===0!)
    const cur = Number(target.value);
    if (!Number.isFinite(cur)) continue;
    out[cfg.mbti] = { ...target, value: clamp01(cur + delta), fp_adjusted: true };
  }
  return out;
}

/**
 * Aggregate per-player form pulses into a single branco-level axis map (average).
 * Accepts a Map or plain object: playerId -> { axes: {k:Number} } OR -> {k:Number}.
 * The Custode bias / branco VC nudge consume the aggregate (SPEC-M sez.8).
 */
function aggregateFormPulses(fpMap) {
  if (!fpMap) return {};
  const entries = fpMap instanceof Map ? Array.from(fpMap.values()) : Object.values(fpMap);
  const sums = {};
  const counts = {};
  for (const entry of entries) {
    const axesObj = entry && entry.axes && typeof entry.axes === 'object' ? entry.axes : entry;
    if (!axesObj || typeof axesObj !== 'object') continue;
    for (const [k, v] of Object.entries(axesObj)) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      sums[k] = (sums[k] || 0) + n;
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  const avg = {};
  for (const k of Object.keys(sums)) avg[k] = sums[k] / counts[k];
  return avg;
}

module.exports = {
  MAX_FP_VC_DELTA,
  PROPOSED_FP_VC_MAPPING,
  applyFormPulseDelta,
  aggregateFormPulses,
};
