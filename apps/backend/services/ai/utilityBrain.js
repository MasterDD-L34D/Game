// Utility AI brain — data-driven decision engine for Sistema.
// ADR: docs/adr/ADR-2026-04-16-ai-architecture-utility.md
//
// Architecture:
//   1. enumerateLegalActions(state, actorId) → [{type, target?, params}]
//   2. scoreAction(action, actor, state, considerations, weights) → number
//   3. selectAction(scores, difficultyProfile) → chosen action
//
// Considerations are pure functions: (action, actor, state) → [0, 1].
// Weights come from ai_profiles.yaml difficulty_profiles.
//
// Compatible with existing selectAiPolicy interface — can be called
// from declareSistemaIntents.js without changes.

'use strict';

// ─────────────────────────────────────────────────────────────────
// Consideration curves
// ─────────────────────────────────────────────────────────────────

/** Linear: f(x) = clamp(x, 0, 1) */
function linear(x) {
  return Math.max(0, Math.min(1, x));
}

/** Inverse linear: f(x) = 1 - clamp(x, 0, 1) */
function linearInverse(x) {
  return 1 - linear(x);
}

/** Quadratic: f(x) = clamp(x^2, 0, 1) */
function quadratic(x) {
  const v = Math.max(0, Math.min(1, x));
  return v * v;
}

/** Quadratic inverse: f(x) = 1 - x^2 */
function quadraticInverse(x) {
  return 1 - quadratic(x);
}

/** Logarithmic: f(x) = log(1 + x*9) / log(10) — maps [0,1] to [0,1] */
function logarithmic(x) {
  const v = Math.max(0, Math.min(1, x));
  return Math.log(1 + v * 9) / Math.log(10);
}

/** Binary: 1 if true, 0 if false */
function binary(x) {
  return x ? 1 : 0;
}

const CURVES = {
  linear,
  linear_inverse: linearInverse,
  quadratic,
  quadratic_inverse: quadraticInverse,
  logarithmic,
  binary,
};

// ─────────────────────────────────────────────────────────────────
// Default considerations
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONSIDERATIONS = {
  TargetHealth: {
    // Action-aware: retreat does not target a kill, treat neutrally (0.5).
    // Without this gate, full-HP target → linear_inverse(1.0) = 0 annihilated
    // approach scores under multiplicative aggregation, retreat (no target →
    // default 0.5) won by default → oscillation Apex tutorial_05 (#2008 bug).
    evaluate: (action, actor, state) => {
      if (action.type === 'retreat') return 0.5;
      if (!action.target) return 0.5;
      const t = state.units?.[action.target];
      if (!t || !t.max_hp) return 0.5;
      return t.hp / t.max_hp;
    },
    curve: 'linear_inverse',
    weight: 1.0,
  },
  Distance: {
    evaluate: (action, actor, state) => {
      if (!action.target) return 0.5;
      const t = state.units?.[action.target];
      if (!t?.position || !actor.position) return 0.5;
      const dist = state.distanceFn
        ? state.distanceFn(actor.position, t.position)
        : manhattanFallback(actor.position, t.position);
      const maxRange = 10;
      return Math.min(dist / maxRange, 1);
    },
    curve: 'quadratic_inverse',
    weight: 0.8,
  },
  SelfHealth: {
    // Action-aware: retreat utility is HIGH when wounded, approach/attack
    // utility is HIGH when healthy. Inversion required to differentiate
    // approach vs retreat when target full-HP (otherwise equally valued
    // → oscillation post fix #2008 normaliseUnit).
    evaluate: (action, actor) => {
      if (!actor.max_hp) return 1;
      const ratio = actor.hp / actor.max_hp;
      if (action.type === 'retreat') return 1 - ratio;
      return ratio;
    },
    curve: 'linear',
    weight: 0.7,
  },
  Cover: {
    evaluate: (action, actor, state) => {
      if (!action.target) return 0.5;
      const t = state.units?.[action.target];
      if (!t?.position) return 0.5;
      const tile = state.getTile?.(t.position);
      return tile?.cover ?? 0;
    },
    curve: 'linear_inverse',
    weight: 0.5,
  },
  AllyProximity: {
    evaluate: (action, actor, state) => {
      if (!actor.position || !state.units) return 0;
      let count = 0;
      for (const [id, u] of Object.entries(state.units)) {
        if (id === actor.id || u.team !== actor.team) continue;
        if (!u.position) continue;
        const dist = state.distanceFn
          ? state.distanceFn(actor.position, u.position)
          : manhattanFallback(actor.position, u.position);
        if (dist <= 2) count++;
      }
      return Math.min(count / 3, 1);
    },
    curve: 'logarithmic',
    weight: 0.4,
  },
  StressLevel: {
    evaluate: (action, actor) => {
      return Math.min((actor.stress ?? 0) / 1, 1);
    },
    curve: 'quadratic',
    weight: 0.6,
  },
  CooldownReady: {
    evaluate: (action, actor) => {
      if (action.type !== 'reaction') return 0.5;
      return actor.reaction_cooldown === 0 ? 1 : 0;
    },
    curve: 'binary',
    weight: 0.3,
  },
};

function manhattanFallback(a, b) {
  return (
    Math.abs((a.x ?? a.q ?? 0) - (b.x ?? b.q ?? 0)) +
    Math.abs((a.y ?? a.r ?? 0) - (b.y ?? b.r ?? 0))
  );
}

// ─────────────────────────────────────────────────────────────────
// Core engine
// ─────────────────────────────────────────────────────────────────

/**
 * Score a single action using all considerations.
 * Returns { score, breakdown: [{name, raw, curved, weighted}] }.
 */
// K4 Approach A 2026-05-09 — stickiness term default weight. Bumped
// pre-vs-post utility-OFF SPRT (#2146 K3 ablation 65%→95% +30pp WR;
// production fix +36.5pp). Stickiness inhibits oscillation between
// near-tie actions by giving the previously-committed action a small
// additive bonus. Caller (sistemaTurnRunner) sets actor.last_action_type
// + actor.last_move_direction post-commit each turn. Profile-overridable
// via `stickiness_weight` in ai_profiles.yaml.
const DEFAULT_STICKINESS_WEIGHT = 0.15;
const DEFAULT_STICKINESS_DIRECTION_WEIGHT = 0.075;

function _moveDirection(fromPos, toPos) {
  if (!fromPos || !toPos) return null;
  const dx = (toPos.x ?? 0) - (fromPos.x ?? 0);
  const dy = (toPos.y ?? 0) - (fromPos.y ?? 0);
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

function scoreAction(
  action,
  actor,
  state,
  considerations = DEFAULT_CONSIDERATIONS,
  weightOverrides = {},
  options = {},
) {
  // Additive aggregation. Was multiplicative ((weighted+0.01) accumulator)
  // ma sparse considerations (es. TargetHealth=0 su full-HP target) annichilavano
  // approach scores → oscillation bug Apex tutorial_05 (#2008). Additive sum
  // robusto a single-zero contributors + standard utility AI literature pattern.
  // Test "low-HP target scores higher" preserva (∑weighted con TH alto > ∑ con TH basso).
  let totalScore = 0;
  const breakdown = [];

  for (const [name, config] of Object.entries(considerations)) {
    const raw = config.evaluate(action, actor, state);
    const curveFn = CURVES[config.curve] || linear;
    const curved = curveFn(raw);
    const weight = weightOverrides[name] ?? config.weight;
    const weighted = curved * weight;

    totalScore += weighted;
    breakdown.push({ name, raw, curved, weighted });
  }

  // K4 stickiness — additive bonus when current action matches the
  // previously-committed action_type / move direction. Reduces flip-flop
  // oscillation in multi-unit kite scenarios (PR #2145 H1 validation
  // captured 1-tile alternation between Sistema units).
  const stickWeight = options.stickinessWeight ?? 0;
  const stickDirWeight = options.stickinessDirectionWeight ?? stickWeight * 0.5;
  if (stickWeight > 0 && actor && actor.last_action_type) {
    if (action.type === actor.last_action_type) {
      totalScore += stickWeight;
      breakdown.push({ name: 'StickyAction', raw: 1, curved: 1, weighted: stickWeight });
    }
  }
  if (stickDirWeight > 0 && action.type === 'move' && actor && actor.last_move_direction) {
    const newDir = _moveDirection(actor.position, action.target_position);
    if (newDir && newDir === actor.last_move_direction) {
      totalScore += stickDirWeight;
      breakdown.push({ name: 'StickyDirection', raw: 1, curved: 1, weighted: stickDirWeight });
    }
  }

  return { score: totalScore, breakdown };
}

/**
 * Score all actions and select one based on difficulty profile.
 *
 * difficultyProfile: { selection: 'argmax'|'weighted_top3'|'random', noise: 0-1 }
 *
 * Returns { action, score, breakdown, allScores }.
 */
function selectAction(
  actions,
  actor,
  state,
  difficultyProfile = {},
  considerations = DEFAULT_CONSIDERATIONS,
  weightOverrides = {},
) {
  if (!actions || actions.length === 0) return null;

  const {
    selection = 'argmax',
    noise = 0,
    stickiness_weight: stickinessWeight = 0,
    stickiness_direction_weight: stickinessDirectionWeight,
  } = difficultyProfile;

  // Score all actions
  const scored = actions.map((action) => {
    const result = scoreAction(action, actor, state, considerations, weightOverrides, {
      stickinessWeight,
      stickinessDirectionWeight,
    });
    // Add noise
    const noisyScore = result.score + (Math.random() - 0.5) * 2 * noise * result.score;
    return { action, score: Math.max(0, noisyScore), breakdown: result.breakdown };
  });

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  let chosen;
  switch (selection) {
    case 'random':
      chosen = scored[Math.floor(Math.random() * scored.length)];
      break;
    case 'weighted_top3': {
      const top = scored.slice(0, 3);
      const totalWeight = top.reduce((sum, s) => sum + s.score, 0);
      if (totalWeight === 0) {
        chosen = top[0];
      } else {
        let roll = Math.random() * totalWeight;
        chosen = top[0];
        for (const s of top) {
          roll -= s.score;
          if (roll <= 0) {
            chosen = s;
            break;
          }
        }
      }
      break;
    }
    case 'argmax':
    default:
      chosen = scored[0];
      break;
  }

  return {
    action: chosen.action,
    score: chosen.score,
    breakdown: chosen.breakdown,
    allScores: scored.map((s) => ({ action: s.action, score: s.score })),
  };
}

/**
 * Enumerate legal actions for a SIS unit.
 * Basic version — returns attack/approach/retreat/skip.
 * Extend when grid pathfinding available (§14).
 *
 * Faction key compatibility (2026-04-29 fix):
 * Session units use `controlled_by` (player/sistema), unit tests + utility
 * literature use `team`. Helper unifies both. Without this, real session
 * units passed to enumerateLegalActions had `team=undefined` → filter
 * `u.team !== actor.team` always false → no enemies → only retreat → oscillation.
 */
function enumerateLegalActions(actor, state) {
  const actions = [];

  // Skip if stunned
  if (actor.status?.stunned > 0) {
    return [{ type: 'skip', reason: 'stunned' }];
  }

  const factionOf = (u) => u.team ?? u.controlled_by;
  const actorFaction = factionOf(actor);
  const enemies = Object.entries(state.units || {}).filter(
    ([id, u]) => factionOf(u) !== actorFaction && u.hp > 0,
  );

  for (const [targetId, target] of enemies) {
    // Attack if in range
    const dist = state.distanceFn
      ? state.distanceFn(actor.position, target.position)
      : manhattanFallback(actor.position, target.position);
    const range = actor.attack_range ?? 2;

    if (dist <= range) {
      actions.push({ type: 'attack', target: targetId });
    }

    // Approach (always available)
    actions.push({ type: 'approach', target: targetId });
  }

  // Retreat (always available if HP > 0)
  if (actor.hp > 0) {
    actions.push({ type: 'retreat' });
  }

  // Deduplicate approach targets (keep closest)
  return actions.length > 0 ? actions : [{ type: 'skip', reason: 'no_options' }];
}

/**
 * Bridge function: drop-in replacement for selectAiPolicy.
 * Returns { rule, intent } for compatibility with existing code.
 */
function selectAiPolicyUtility(
  actor,
  target,
  state = {},
  difficultyProfile = {},
  considerations = DEFAULT_CONSIDERATIONS,
  weightOverrides = {},
) {
  // Build minimal state if not provided
  const minimalState = {
    units: { [actor.id || 'actor']: actor, [target?.id || 'target']: target },
    distanceFn: state.distanceFn || manhattanFallback,
    getTile: state.getTile || (() => null),
    ...state,
  };

  const actions = enumerateLegalActions(actor, minimalState);
  const result = selectAction(
    actions,
    actor,
    minimalState,
    difficultyProfile,
    considerations,
    weightOverrides,
  );

  if (!result) return { rule: 'UTILITY_FALLBACK', intent: 'skip' };

  return {
    rule: 'UTILITY_AI',
    intent: result.action.type,
    target: result.action.target,
    score: result.score,
    breakdown: result.breakdown,
  };
}

module.exports = {
  // Curves
  CURVES,
  linear,
  linearInverse,
  quadratic,
  quadraticInverse,
  logarithmic,
  binary,

  // Considerations
  DEFAULT_CONSIDERATIONS,

  // Core
  scoreAction,
  selectAction,
  enumerateLegalActions,

  // Bridge
  selectAiPolicyUtility,
};
