// =============================================================================
// Opt 3 OUTPUT derivation (#2679) -- post-match 5-axis personality from combat.
//
// Pure scalar core: 8 inputs in [0,1] (or null/absent) -> 5 display axes in
// [0,1] keyed by the canonical EN creature keys (radar order). 0.5 = neutral.
// +pole = 1.0 per the canonical display contract: Predazione / Cauto / Sciame /
// Memoria / Robusto. MBTI direction follows the ENGINE letter convention
// (vcScoring deriveMbtiType: value HIGH = I/S/T/J) -- the 2026-04-27 research
// doc formulas are pole-local; here they are re-expressed against the contract.
//
// MIRROR: Game-Godot-v2 scripts/ai/personality_axes.gd (parity fixtures in both
// test suites). Stat normalization is an ADAPTER concern (stack scales differ).
//
// GOVERNANCE -- PROPOSED constants (ratify N=40, SPEC-M item 2, NOT fiat):
// blend weights + stat bounds below. Flagged inconsistencies (NOT resolved
// here, same N=40 batch):
//   - J_P: input formPulseVc maps memory_instinct <-> J_P; this output spends
//     J_P in explore_caution and derives memory_instinct behaviourally.
//   - E_I: PROPOSED_FP_VC_MAPPING comments "+Sciame -> +E_I (extraversion
//     proxy)" but the engine convention is E_I HIGH = Introvert; this output
//     uses the engine convention (solitary_swarm = 1 - E_I).
// Spec: Game-Godot-v2 docs/superpowers/specs/
//   2026-06-09-personality-axes-output-derivation-design.md
// =============================================================================
'use strict';

const AXIS_KEYS = [
  'symbiosis_predation',
  'explore_caution',
  'solitary_swarm',
  'memory_instinct',
  'agile_robust',
];

const NEUTRAL = 0.5;

// PROPOSED (N=40): blend weights.
const EXPLORE_SN_WEIGHT = 0.6;
const EXPLORE_JP_WEIGHT = 0.4;
const MEMORY_SWITCH_WEIGHT = 0.5;
const MEMORY_SETUP_WEIGHT = 0.5;
const AGILE_SPEED_WEIGHT = 0.7;
const AGILE_HP_WEIGHT = 0.3;

// PROPOSED (N=40): backend species-scale stat bounds (research-suggested).
const STAT_BOUNDS = {
  speed: { min: 1, max: 6 },
  hp: { min: 6, max: 20 },
};

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Linear [min,max] -> [0,1] with clamp. Null on non-finite value or
 * degenerate bounds (caller treats null as "stat not derivable").
 */
function normalizeStat(value, min, max) {
  const v = num(value);
  if (v === null || !(max > min)) return null;
  return clamp01((v - min) / (max - min));
}

/**
 * Pure core: derive the 5 display axes from 8 scalar inputs.
 * Any missing/null required input degrades THAT axis to 0.5 (neutral).
 *
 * @param {object} inputs — { t_f, e_i, s_n, j_p, action_switch_rate,
 *   setup_ratio, speed_norm, hp_norm } each [0,1] or null/absent
 * @returns {object} { <5 EN creature keys>: float [0,1] }
 */
function deriveAxes(inputs = {}) {
  const tF = num(inputs.t_f);
  const eI = num(inputs.e_i);
  const sN = num(inputs.s_n);
  const jP = num(inputs.j_p);
  const switchRate = num(inputs.action_switch_rate);
  const setupRatio = num(inputs.setup_ratio);
  const speedNorm = num(inputs.speed_norm);
  const hpNorm = num(inputs.hp_norm);

  return {
    // T_F high = T = Predazione (+pole right).
    symbiosis_predation: tF === null ? NEUTRAL : clamp01(tF),
    // S (concrete) + J (planner) = Cauto (+pole right).
    explore_caution:
      sN === null || jP === null
        ? NEUTRAL
        : clamp01(EXPLORE_SN_WEIGHT * clamp01(sN) + EXPLORE_JP_WEIGHT * clamp01(jP)),
    // E_I high = I = Solitario -> invert for +pole Sciame.
    solitary_swarm: eI === null ? NEUTRAL : clamp01(1 - clamp01(eI)),
    // Low switch + high setup = Memoria (display domain: 1.0 = Memoria).
    memory_instinct:
      switchRate === null || setupRatio === null
        ? NEUTRAL
        : clamp01(
            MEMORY_SWITCH_WEIGHT * (1 - clamp01(switchRate)) +
              MEMORY_SETUP_WEIGHT * clamp01(setupRatio),
          ),
    // Slow + tanky = Robusto (+pole right) -> invert the research agile axis.
    agile_robust:
      speedNorm === null || hpNorm === null
        ? NEUTRAL
        : clamp01(
            AGILE_SPEED_WEIGHT * (1 - clamp01(speedNorm)) + AGILE_HP_WEIGHT * clamp01(hpNorm),
          ),
  };
}

function axisValue(axis) {
  return axis && typeof axis === 'object' ? num(axis.value) : null;
}

/**
 * True when the actor entry carries at least one derivable signal (a finite
 * mbti axis value or a finite behavioural raw metric). Serializers use this
 * to skip pure-neutral payload bloat.
 */
function hasSignal(actorEntry) {
  if (!actorEntry || typeof actorEntry !== 'object') return false;
  const axes = actorEntry.mbti_axes || {};
  for (const key of ['T_F', 'E_I', 'S_N', 'J_P']) {
    if (axisValue(axes[key]) !== null) return true;
  }
  const raw = actorEntry.raw_metrics || {};
  return num(raw.action_switch_rate) !== null || num(raw.setup_ratio) !== null;
}

/**
 * Adapter from a buildVcSnapshot per_actor entry (+ optional unit stats).
 *
 * @param {object} actorEntry — per_actor[uid] (mbti_axes {value,coverage},
 *   raw_metrics {action_switch_rate, setup_ratio})
 * @param {object|null} unitStats — { speed, hp_max } in backend species scale
 * @param {object} [opts] — { bounds } override for STAT_BOUNDS
 * @returns {object|null} 5-axis map, or null on non-object actorEntry
 */
function deriveFromVcActor(actorEntry, unitStats = null, opts = {}) {
  if (!actorEntry || typeof actorEntry !== 'object') return null;
  const axes = actorEntry.mbti_axes || {};
  const raw = actorEntry.raw_metrics || {};
  const bounds = opts.bounds || STAT_BOUNDS;
  return deriveAxes({
    t_f: axisValue(axes.T_F),
    e_i: axisValue(axes.E_I),
    s_n: axisValue(axes.S_N),
    j_p: axisValue(axes.J_P),
    action_switch_rate: num(raw.action_switch_rate),
    setup_ratio: num(raw.setup_ratio),
    speed_norm: unitStats
      ? normalizeStat(unitStats.speed, bounds.speed.min, bounds.speed.max)
      : null,
    hp_norm: unitStats ? normalizeStat(unitStats.hp_max, bounds.hp.min, bounds.hp.max) : null,
  });
}

module.exports = {
  AXIS_KEYS,
  STAT_BOUNDS,
  deriveAxes,
  deriveFromVcActor,
  normalizeStat,
  hasSignal,
};
