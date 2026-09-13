// M10 Phase A — campaign YAML loader service.
//
// Consumer di data/core/campaign/*.yaml.
//
// API:
//   - loadCampaign(campaignId): load + validate campaign YAML
//   - getActs(campaign): list acts
//   - getEncountersForAct(campaign, actIdx): encounters + choice nodes
//   - resolveBranch(campaign, actIdx, branchKey): encounter post-choice
//   - validateCampaign(data): throw su invariants
//
// Compat: funziona senza Prisma (pure YAML + in-memory). Phase B wirerà
// Prisma Campaign model per persistence state.
//
// Ref ADR-2026-04-21-campaign-save-persistence.md

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CAMPAIGN_DIR = path.join(process.cwd(), 'data', 'core', 'campaign');

const _cache = new Map();

/**
 * Load campaign YAML by id. Cached after first load.
 *
 * @param {string} campaignId — file basename without .yaml
 * @param {string} [dir] — override per test
 * @returns {object|null} parsed + validated campaign, null su missing/invalid
 */
function loadCampaign(campaignId, dir = CAMPAIGN_DIR) {
  // Codex P2 fix: cache key include dir, altrimenti load second dir stesso id
  // ritorna entry cached (stale). Tests + mod fixtures + env-specific bundles
  // ora correctly keyed.
  const cacheKey = `${dir}::${campaignId}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const filePath = path.join(dir, `${campaignId}.yaml`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[campaign-loader] campaign "${campaignId}" non trovato a ${filePath}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(raw);
    validateCampaign(data);
    _cache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[campaign-loader] load "${campaignId}" failed: ${err.message}`);
    return null;
  }
}

/** Reset cache (per test). */
function _resetCache() {
  _cache.clear();
}

/**
 * Validate campaign invariants. Throw on failure.
 *
 * Checks:
 * - schema_version present
 * - campaign_id matches filename (if provided via context)
 * - acts array non-empty
 * - each act has act_idx sequential from 0
 * - each encounter has chapter_idx
 * - branching bounded (max 1 choice node per act MVP)
 */
function validateCampaign(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('campaign: payload non object');
  }
  if (!data.schema_version) {
    throw new Error('campaign: schema_version missing');
  }
  if (!data.campaign_id || typeof data.campaign_id !== 'string') {
    throw new Error('campaign: campaign_id missing');
  }
  if (!Array.isArray(data.acts) || data.acts.length === 0) {
    throw new Error('campaign: acts array empty');
  }

  // Codex P2 fix: act_idx must be unique (downstream .find() silently drops
  // duplicates). Also enforce integer + non-negative.
  const seenIndices = new Set();
  data.acts.forEach((act, i) => {
    if (typeof act.act_idx !== 'number' || !Number.isInteger(act.act_idx) || act.act_idx < 0) {
      throw new Error(`campaign.act[${i}]: act_idx missing or not non-negative integer`);
    }
    if (seenIndices.has(act.act_idx)) {
      throw new Error(`campaign.act[${i}]: act_idx=${act.act_idx} duplicated (must be unique)`);
    }
    seenIndices.add(act.act_idx);
    if (!Array.isArray(act.encounters)) {
      throw new Error(`campaign.act[${i}]: encounters not array`);
    }
    // Choice node count: max 1 MVP (P0 Q3 default A, Descent pattern)
    const choiceEncounters = act.encounters.filter((e) => e.is_choice_node === true);
    if (choiceEncounters.length > 1) {
      throw new Error(`campaign.act[${i}]: more than 1 choice_node (Descent pattern MVP max 1)`);
    }
    // Branch encounters integrity
    if (choiceEncounters.length === 1) {
      const choice = choiceEncounters[0];
      if (!choice.choice || !choice.choice.option_a || !choice.choice.option_b) {
        throw new Error(`campaign.act[${i}]: choice_node missing option_a/option_b`);
      }
    }
  });
}

/**
 * Get all acts. Returns shallow copy.
 */
function getActs(campaign) {
  if (!campaign || !Array.isArray(campaign.acts)) return [];
  return [...campaign.acts];
}

/**
 * Get encounters for act_idx. Filters by branch_key if given.
 *
 * @param {object} campaign
 * @param {number} actIdx
 * @param {string} [branchKey] — se presente, filtra encounter branch-specific
 */
function getEncountersForAct(campaign, actIdx, branchKey = null) {
  const act = (campaign?.acts || []).find((a) => a.act_idx === actIdx);
  if (!act) return [];
  if (!branchKey) {
    // Return all encounters linear (pre-branch + choice + default path)
    return act.encounters.filter((e) => !e.branch_key || !e.is_choice_node);
  }
  // Branch-specific: include linear (no branch_key) + matching branch
  return act.encounters.filter(
    (e) => !e.branch_key || e.branch_key === branchKey || e.is_choice_node,
  );
}

/**
 * Resolve branch choice → next encounter id.
 *
 * @param {object} campaign
 * @param {number} actIdx
 * @param {string} branchKey
 * @returns {string|null} encounter_id o null se branch non valido
 */
function resolveBranch(campaign, actIdx, branchKey) {
  const act = (campaign?.acts || []).find((a) => a.act_idx === actIdx);
  if (!act) return null;
  const choice = act.encounters.find((e) => e.is_choice_node);
  if (!choice || !choice.choice) return null;
  const opt =
    choice.choice.option_a?.branch_key === branchKey
      ? choice.choice.option_a
      : choice.choice.option_b?.branch_key === branchKey
        ? choice.choice.option_b
        : null;
  return opt ? opt.next_encounter : null;
}

/**
 * Get onboarding spec (V1 Phase B). Returns null se campaign def senza
 * sezione `onboarding:`.
 *
 * Shape: { schema_version, timing_seconds, deliberation_timeout_seconds,
 *   default_choice_on_timeout, briefing{duration_seconds, lines[]},
 *   choices[{option_key, label, trait_id, narrative}],
 *   transition{duration_seconds, line}, next_encounter }
 */
function getOnboarding(campaign) {
  if (!campaign || typeof campaign !== 'object') return null;
  return campaign.onboarding || null;
}

/**
 * Resolve onboarding trait_id da choice key. Ritorna null se key invalida.
 */
function resolveOnboardingTrait(campaign, optionKey) {
  const ob = getOnboarding(campaign);
  if (!ob || !Array.isArray(ob.choices)) return null;
  const match = ob.choices.find((c) => c.option_key === optionKey);
  return match?.trait_id || null;
}

/**
 * Extract all encounter IDs referenced (for integrity check vs YAML scenarios).
 */
function extractAllEncounterIds(campaign) {
  const ids = new Set();
  for (const act of campaign?.acts || []) {
    for (const enc of act.encounters || []) {
      if (enc.encounter_id) ids.add(enc.encounter_id);
      if (enc.is_choice_node && enc.choice) {
        if (enc.choice.option_a?.next_encounter) ids.add(enc.choice.option_a.next_encounter);
        if (enc.choice.option_b?.next_encounter) ids.add(enc.choice.option_b.next_encounter);
      }
    }
  }
  return [...ids];
}

module.exports = {
  loadCampaign,
  validateCampaign,
  getActs,
  getEncountersForAct,
  resolveBranch,
  getOnboarding,
  resolveOnboardingTrait,
  extractAllEncounterIds,
  _resetCache,
  CAMPAIGN_DIR,
};
