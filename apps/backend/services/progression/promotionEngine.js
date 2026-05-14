'use strict';

/**
 * TKT-M15 — Promotion engine (FFT-style class advancement).
 *
 * Pure functions:
 *   - loadPromotionConfig(): YAML → config object (lazy cached).
 *   - computeUnitMetrics(unit, eventLog): aggregate kills/assists/objectives.
 *   - evaluatePromotion(unit, eventLog, config?): eligibility per tier.
 *   - applyPromotion(unit, targetTier, config?): mutate unit stats + tier.
 *
 * Acceptance criteria (scope ticket §3):
 *   ✅ Promotion eligibility computed at end-of-mission (kill+assist+objective).
 *   ✅ Player può accept/defer (engine returns eligibility list, no auto-apply).
 *   ✅ Reward applicato: +stats + ability_unlock_tier marker.
 *   ✅ Test suite 6+.
 *
 * Pillar P3 Identità Specie × Job 🟢ⁿ rinforzato. CT bar half = already shipped
 * via apps/play/src/ctBar.js + main.js wire (PR #1998).
 */

const fs = require('fs');
const path = require('path');

let yamlLoader = null;
try {
  // eslint-disable-next-line global-require
  yamlLoader = require('js-yaml');
} catch {
  yamlLoader = null;
}

let cachedConfig = null;
let cachedConfigPath = null;

const DEFAULT_CONFIG_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'promotions',
  'promotions.yaml',
);

// 2026-05-14 OD-025-B2 ai-station — FALLBACK_CONFIG bumped v0.1.0 → v0.2.0
// to align with promotions.yaml v0.2.0 (5-tier ladder: base → veteran →
// captain → elite → master). Closes cross-stack drift detected post-merge
// PR #2262: Godot v2 mirror (scripts/progression/promotion_engine.gd)
// already at v0.2.0 — this fallback was the only stale surface. Fallback
// only fires when YAML unreadable/js-yaml missing; in normal operation
// loadPromotionConfig parses the canonical YAML.
const FALLBACK_CONFIG = {
  version: '0.2.0-fallback',
  tier_ladder: ['base', 'veteran', 'captain', 'elite', 'master'],
  thresholds: {
    veteran: { kills_min: 3, objectives_min: 1 },
    captain: { kills_min: 8, objectives_min: 3, assists_min: 2 },
    elite: { kills_min: 18, objectives_min: 6, assists_min: 6 },
    master: { kills_min: 35, objectives_min: 12, assists_min: 12 },
  },
  rewards: {
    veteran: { hp_bonus: 5, attack_mod_bonus: 1, ability_unlock_tier: 'r2' },
    captain: {
      hp_bonus: 10,
      attack_mod_bonus: 2,
      initiative_bonus: 2,
      ability_unlock_tier: 'r3',
    },
    elite: {
      hp_bonus: 15,
      attack_mod_bonus: 3,
      defense_mod_bonus: 2,
      initiative_bonus: 3,
      ability_unlock_tier: 'r4',
    },
    master: {
      hp_bonus: 25,
      attack_mod_bonus: 4,
      defense_mod_bonus: 3,
      initiative_bonus: 4,
      crit_chance_bonus: 5,
      ability_unlock_tier: 'r5',
    },
  },
};

/**
 * Load promotion config from YAML. Cached per path. Best-effort: returns
 * fallback object when js-yaml missing or file unreadable.
 */
function loadPromotionConfig(filePath = DEFAULT_CONFIG_PATH) {
  if (cachedConfig && cachedConfigPath === filePath) return cachedConfig;
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    cachedConfig = FALLBACK_CONFIG;
    cachedConfigPath = filePath;
    return cachedConfig;
  }
  if (!yamlLoader || typeof yamlLoader.load !== 'function') {
    cachedConfig = FALLBACK_CONFIG;
    cachedConfigPath = filePath;
    return cachedConfig;
  }
  try {
    const parsed = yamlLoader.load(raw);
    if (!parsed || typeof parsed !== 'object') {
      cachedConfig = FALLBACK_CONFIG;
    } else {
      cachedConfig = parsed;
    }
  } catch {
    cachedConfig = FALLBACK_CONFIG;
  }
  cachedConfigPath = filePath;
  return cachedConfig;
}

function resetCache() {
  cachedConfig = null;
  cachedConfigPath = null;
}

/**
 * Aggregate per-unit metrics from session.events log.
 *
 * Event schema (canonical, see CLAUDE.md §session engine):
 *   { action_type, turn, actor_id, target_id, damage_dealt, result, ... }
 *
 * Metrics extracted:
 *   - kills: count of events where actor_id === unit.id AND result indicates
 *            target hp dropped to 0 (action_type === 'attack' AND
 *            result.includes('kill') OR target_hp_after === 0 OR
 *            event.killed === true).
 *   - assists: actor damaged target same turn another unit landed killing blow.
 *              Simplified heuristic: count attack events where actor_id === unit.id
 *              AND target_id later appears as victim in same/next turn.
 *   - objectives: count of events with action_type === 'objective_complete' OR
 *                 action_type === 'mission_objective' AND result === 'ok'.
 */
function computeUnitMetrics(unit, eventLog = []) {
  if (!unit || !unit.id) {
    return { kills: 0, assists: 0, objectives: 0 };
  }
  const events = Array.isArray(eventLog) ? eventLog : [];
  let kills = 0;
  let assists = 0;
  let objectives = 0;

  // Walk events; track lethal blows + own contributions.
  const damagedByUnit = new Map(); // target_id → turn last damaged by unit
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    const actorId = ev.actor_id;
    const targetId = ev.target_id;
    const action = ev.action_type;
    if (action === 'attack' && actorId === unit.id) {
      damagedByUnit.set(targetId, ev.turn);
      // Kill: explicit flag OR result 'kill' OR target hp dropped to 0.
      const isKill =
        ev.killed === true ||
        (typeof ev.result === 'string' && ev.result.includes('kill')) ||
        ev.target_hp_after === 0;
      if (isKill) kills += 1;
    } else if (action === 'attack' && actorId !== unit.id && targetId) {
      // Other actor killed target; assist if we damaged target within last 2 turns.
      const lastTurn = damagedByUnit.get(targetId);
      if (lastTurn !== undefined && ev.turn - lastTurn <= 2) {
        const isKill =
          ev.killed === true ||
          (typeof ev.result === 'string' && ev.result.includes('kill')) ||
          ev.target_hp_after === 0;
        if (isKill) assists += 1;
      }
    }
    if (
      (action === 'objective_complete' || action === 'mission_objective') &&
      (!actorId ||
        actorId === unit.id ||
        (Array.isArray(ev.contributors) && ev.contributors.includes(unit.id)))
    ) {
      if (ev.result === 'ok' || ev.result === 'completed') objectives += 1;
    }
  }
  return { kills, assists, objectives };
}

function currentTier(unit) {
  if (!unit) return 'base';
  return unit.promotion_tier || 'base';
}

function nextTier(currentTierName, ladder) {
  const idx = ladder.indexOf(currentTierName);
  if (idx < 0 || idx >= ladder.length - 1) return null;
  return ladder[idx + 1];
}

/**
 * Evaluate promotion eligibility for unit at current eventLog state.
 * Returns { current_tier, next_tier, eligible, metrics, threshold, reward }.
 * eligible=false when already at max tier OR thresholds not met.
 */
function evaluatePromotion(unit, eventLog = [], config = null) {
  const cfg = config || loadPromotionConfig();
  const ladder = Array.isArray(cfg.tier_ladder) ? cfg.tier_ladder : FALLBACK_CONFIG.tier_ladder;
  const cur = currentTier(unit);
  const next = nextTier(cur, ladder);
  const metrics = computeUnitMetrics(unit, eventLog);
  if (!next) {
    return {
      current_tier: cur,
      next_tier: null,
      eligible: false,
      reason: 'max_tier_reached',
      metrics,
      threshold: null,
      reward: null,
    };
  }
  const threshold = cfg.thresholds?.[next] || null;
  const reward = cfg.rewards?.[next] || null;
  if (!threshold) {
    return {
      current_tier: cur,
      next_tier: next,
      eligible: false,
      reason: 'no_threshold_defined',
      metrics,
      threshold: null,
      reward,
    };
  }
  const reasons = [];
  if (Number.isFinite(threshold.kills_min) && metrics.kills < threshold.kills_min) {
    reasons.push(`kills ${metrics.kills} < ${threshold.kills_min}`);
  }
  if (Number.isFinite(threshold.assists_min) && metrics.assists < threshold.assists_min) {
    reasons.push(`assists ${metrics.assists} < ${threshold.assists_min}`);
  }
  if (Number.isFinite(threshold.objectives_min) && metrics.objectives < threshold.objectives_min) {
    reasons.push(`objectives ${metrics.objectives} < ${threshold.objectives_min}`);
  }
  const eligible = reasons.length === 0;
  return {
    current_tier: cur,
    next_tier: next,
    eligible,
    reason: eligible ? 'thresholds_met' : reasons.join('; '),
    metrics,
    threshold,
    reward,
  };
}

/**
 * Apply promotion in place: mutate unit stats + bump promotion_tier.
 * Returns { ok, applied_tier, deltas, error? }.
 */
function applyPromotion(unit, targetTier, config = null) {
  if (!unit || !unit.id) {
    return { ok: false, error: 'invalid_unit' };
  }
  const cfg = config || loadPromotionConfig();
  const ladder = Array.isArray(cfg.tier_ladder) ? cfg.tier_ladder : FALLBACK_CONFIG.tier_ladder;
  if (!ladder.includes(targetTier)) {
    return { ok: false, error: 'unknown_tier', target_tier: targetTier };
  }
  const cur = currentTier(unit);
  const curIdx = ladder.indexOf(cur);
  const tgtIdx = ladder.indexOf(targetTier);
  if (tgtIdx !== curIdx + 1) {
    return {
      ok: false,
      error: 'not_next_tier',
      current_tier: cur,
      target_tier: targetTier,
    };
  }
  const reward = cfg.rewards?.[targetTier];
  if (!reward) {
    return { ok: false, error: 'no_reward_defined', target_tier: targetTier };
  }
  const deltas = {};
  if (Number.isFinite(reward.hp_bonus)) {
    const before = Number(unit.hp || 0);
    const beforeMax = Number(unit.max_hp || unit.hp || 0);
    unit.hp = before + reward.hp_bonus;
    unit.max_hp = beforeMax + reward.hp_bonus;
    deltas.hp = reward.hp_bonus;
  }
  if (Number.isFinite(reward.attack_mod_bonus)) {
    unit.attack_mod = Number(unit.attack_mod || 0) + reward.attack_mod_bonus;
    deltas.attack_mod = reward.attack_mod_bonus;
  }
  if (Number.isFinite(reward.initiative_bonus)) {
    unit.initiative = Number(unit.initiative || 0) + reward.initiative_bonus;
    deltas.initiative = reward.initiative_bonus;
  }
  // 2026-05-14 OD-025-B2 elite/master tier stat additions (mirror Godot v2
  // PromotionEngine._apply_reward, scripts/progression/promotion_engine.gd).
  if (Number.isFinite(reward.defense_mod_bonus)) {
    unit.defense_mod = Number(unit.defense_mod || 0) + reward.defense_mod_bonus;
    deltas.defense_mod = reward.defense_mod_bonus;
  }
  if (Number.isFinite(reward.crit_chance_bonus)) {
    unit.crit_chance = Number(unit.crit_chance || 0) + reward.crit_chance_bonus;
    deltas.crit_chance = reward.crit_chance_bonus;
  }
  if (reward.ability_unlock_tier) {
    unit.ability_tier_unlocked = reward.ability_unlock_tier;
    deltas.ability_unlock_tier = reward.ability_unlock_tier;
  }
  unit.promotion_tier = targetTier;
  return {
    ok: true,
    applied_tier: targetTier,
    previous_tier: cur,
    deltas,
  };
}

module.exports = {
  loadPromotionConfig,
  resetCache,
  computeUnitMetrics,
  evaluatePromotion,
  applyPromotion,
  currentTier,
  nextTier,
  FALLBACK_CONFIG,
};
