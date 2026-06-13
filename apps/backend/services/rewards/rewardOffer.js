// V2 Tri-Sorgente reward offer — Node-native (ADR-2026-04-26).
//
// Node replacement of legacy services/triSorgente/bridge.js (Python).
// Consistent with M6-#4 Phase 1 kill-Python-rules-engine direction.
//
// Pipeline (docs/architecture/tri-sorgente/overview.md):
//   1) Table selection by biome/tier → 2) Roll → 3) Pool R/A/P merge
//   → 4) Scoring → 5) Synergy/Diversity boost → 6) Softmax T=0.7 sample
//   → 7) Return 3 cards + skip fragment
//
// Score formula:
//   score(c) = base(c) + w_roll*roll_comp + w_pers*pers_comp + w_act*act_comp
//              + w_syn*syn_boost - w_dup*dup_pen - w_excl*excl_pen
//
// Softmax T=0.7 canonical. Skip accumulates fragments (M10+ nest integration).

'use strict';

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_OFFER_SIZE = 3;

const WEIGHTS = {
  roll: 1.0,
  personality: 0.8,
  actions: 0.6,
  synergy: 0.5,
  duplicate: -1.5,
  exclusion: -5.0,
};

const BASE_BY_RARITY = {
  common: 1.0,
  uncommon: 1.4,
  rare: 1.9,
  epic: 2.6,
  legendary: 3.5,
};

/**
 * Seed-deterministic RNG (mulberry32). Fallback a Math.random se seed null.
 */
function createRng(seed) {
  if (seed == null) return Math.random;
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute roll_comp for card given roll entry + adjacency.
 * Card hit on roll bucket → 1.0, adjacent 1-3 → 0.5, else 0.
 */
function rollComponent(card, rollBucket) {
  if (!card.roll_bucket) return 0;
  const dist = Math.abs(Number(card.roll_bucket) - Number(rollBucket));
  if (dist === 0) return 1.0;
  if (dist <= 3) return 0.5;
  return 0;
}

/**
 * Compute personality_comp: sum clamped of matches between card
 * personality_weights and actor mbti/ennea traits.
 */
function personalityComponent(card, personality = {}) {
  if (!Array.isArray(card.personality_weights)) return 0;
  const mbti = personality.mbti_type || null;
  const enneaTop = Array.isArray(personality.ennea_top_themes) ? personality.ennea_top_themes : [];
  let score = 0;
  for (const w of card.personality_weights) {
    if (w.mbti && mbti && w.mbti === mbti) score += Number(w.weight) || 0;
    if (w.ennea && enneaTop.includes(w.ennea)) score += Number(w.weight) || 0;
  }
  return Math.max(0, Math.min(2.0, score));
}

/**
 * Compute action_comp: sum affinity from recent raw action counts.
 */
function actionComponent(card, recentActions = {}) {
  if (!Array.isArray(card.action_affinities)) return 0;
  let score = 0;
  for (const aff of card.action_affinities) {
    const count = Number(recentActions[aff.action] || 0);
    if (count <= 0) continue;
    // Log-scaled affinity (avoid dominance da action spam)
    score += (Number(aff.weight) || 0) * Math.log1p(count);
  }
  return Math.max(0, Math.min(2.0, score));
}

/**
 * Compute synergy_boost: overlap between card.synergy_tags and dominant_tags.
 */
function synergyBoost(card, dominantTags = []) {
  if (!Array.isArray(card.synergy_tags) || dominantTags.length === 0) return 0;
  const hits = card.synergy_tags.filter((t) => dominantTags.includes(t)).length;
  return Math.min(1.5, hits * 0.5);
}

/**
 * Compute duplicate_penalty: card already acquired N times.
 */
function duplicatePenalty(card, acquiredCounts = {}) {
  const count = Number(acquiredCounts[card.id] || 0);
  const maxCopies = card.max_copies ?? 1;
  if (count >= maxCopies) return 1.0;
  return 0;
}

/**
 * Hard exclusion (card.exclusion_tags ∩ roster_tags non-empty).
 */
function exclusionPenalty(card, rosterTags = []) {
  if (!Array.isArray(card.exclusion_tags) || rosterTags.length === 0) return 0;
  const hits = card.exclusion_tags.filter((t) => rosterTags.includes(t));
  return hits.length > 0 ? 1.0 : 0;
}

/**
 * Score a card given context.
 */
function scoreCard(card, ctx) {
  const base = BASE_BY_RARITY[card.rarity || 'common'] || 1.0;
  const rollComp = rollComponent(card, ctx.rollBucket);
  const persComp = personalityComponent(card, ctx.personality);
  const actComp = actionComponent(card, ctx.recentActions);
  const synBoost = synergyBoost(card, ctx.dominantTags);
  const dupPen = duplicatePenalty(card, ctx.acquiredCounts);
  const exclPen = exclusionPenalty(card, ctx.rosterTags);
  return (
    base +
    WEIGHTS.roll * rollComp +
    WEIGHTS.personality * persComp +
    WEIGHTS.actions * actComp +
    WEIGHTS.synergy * synBoost +
    WEIGHTS.duplicate * dupPen +
    WEIGHTS.exclusion * exclPen
  );
}

/**
 * Softmax sampling with temperature. Returns indices of picked cards.
 * Without replacement (no duplicates in same offer).
 */
function softmaxSample(scores, n, rng, temperature = DEFAULT_TEMPERATURE) {
  const picked = [];
  const available = scores.map((s, i) => ({ score: s, idx: i }));
  for (let k = 0; k < n && available.length > 0; k++) {
    const maxScore = Math.max(...available.map((a) => a.score));
    const expScores = available.map((a) => Math.exp((a.score - maxScore) / temperature));
    const sumExp = expScores.reduce((x, y) => x + y, 0);
    const probs = expScores.map((e) => e / sumExp);
    // Cumulative sample
    const r = rng();
    let cum = 0;
    let pickIdx = probs.length - 1;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) {
        pickIdx = i;
        break;
      }
    }
    picked.push(available[pickIdx].idx);
    available.splice(pickIdx, 1);
  }
  return picked;
}

/**
 * Main API: build offer from candidate pool + context.
 *
 * @param {Array<object>} pool — array of card definitions
 * @param {object} context
 * @param {number} [context.rollBucket=10] — d20 roll bucket
 * @param {object} [context.personality] — { mbti_type, ennea_top_themes }
 * @param {object} [context.recentActions] — { actionName: count }
 * @param {Array<string>} [context.dominantTags] — build dominant tag set
 * @param {object} [context.acquiredCounts] — { cardId: count }
 * @param {Array<string>} [context.rosterTags] — roster exclusion tags
 * @param {number} [context.seed] — deterministic RNG
 * @param {number} [context.offerSize=3]
 * @param {number} [context.temperature=0.7]
 * @returns {{ offers: Array<{card, score, components}>, skip_available: boolean }}
 */
function buildOffer(pool, context = {}) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return { offers: [], skip_available: false };
  }
  const offerSize = context.offerSize || DEFAULT_OFFER_SIZE;
  const temperature = context.temperature || DEFAULT_TEMPERATURE;
  const rng = createRng(context.seed);

  const ctx = {
    rollBucket: context.rollBucket ?? 10,
    personality: context.personality || {},
    recentActions: context.recentActions || {},
    dominantTags: context.dominantTags || [],
    acquiredCounts: context.acquiredCounts || {},
    rosterTags: context.rosterTags || [],
  };

  const scores = pool.map((c) => scoreCard(c, ctx));
  const sampledIdx = softmaxSample(scores, offerSize, rng, temperature);
  const offers = sampledIdx.map((i) => {
    const c = pool[i];
    return {
      card: c,
      score: scores[i],
      components: {
        base: BASE_BY_RARITY[c.rarity || 'common'] || 1.0,
        roll: rollComponent(c, ctx.rollBucket),
        personality: personalityComponent(c, ctx.personality),
        actions: actionComponent(c, ctx.recentActions),
        synergy: synergyBoost(c, ctx.dominantTags),
        duplicate_penalty: duplicatePenalty(c, ctx.acquiredCounts),
        exclusion_penalty: exclusionPenalty(c, ctx.rosterTags),
      },
    };
  });

  return {
    offers,
    skip_available: true,
    skip_fragment_delta: 0, // 2026-04-26: orphan currency disable — re-abilita a 1 quando nest sink (M10+) live
  };
}

module.exports = {
  buildOffer,
  scoreCard,
  rollComponent,
  personalityComponent,
  actionComponent,
  synergyBoost,
  duplicatePenalty,
  exclusionPenalty,
  softmaxSample,
  createRng,
  WEIGHTS,
  BASE_BY_RARITY,
  DEFAULT_TEMPERATURE,
  DEFAULT_OFFER_SIZE,
};
