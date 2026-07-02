// M10 Phase C — campaign engine pure functions.
//
// Pure logic extractable (no store mutation, no I/O):
//   - computeProgress(campaign, def): % completion basato su chapter
//   - getCurrentEncounter(campaign, def): encounter attuale da state
//   - getNextEncounter(campaign, def): next post-advance logic
//   - canAdvance(campaign): può advance?
//   - canChoose(campaign, def): choice_node reachable?
//   - getBranchPath(campaign): history binary choices
//   - summariseCampaign(campaign, def): full UI state snapshot
//
// Usage:
//   const engine = require('./campaignEngine');
//   const summary = engine.summariseCampaign(campaign, defDoc);
//   res.json(summary); // frontend consumes
//
// Ref ADR-2026-04-21.

'use strict';

/**
 * Count total non-choice encounter entries in def (for progress calc).
 * Exclude choice_node entries (not "playable", just branch markers).
 */
function _totalPlayableEncounters(def) {
  if (!def || !Array.isArray(def.acts)) return 0;
  let total = 0;
  for (const act of def.acts) {
    const enc = act.encounters || [];
    total += enc.filter((e) => !e.is_choice_node && e.encounter_id).length;
  }
  return total;
}

/**
 * Compute % completion.
 * Pure: non muta campaign.
 *
 * Formula: (chapters.filter(victory).length / totalPlayable) clamped [0, 1].
 * finalState=completed → 1.0 forced. abandoned → whatever achieved (not 1.0).
 */
function computeProgress(campaign, def) {
  if (!campaign) return 0.0;
  if (campaign.finalState === 'completed') return 1.0;
  const total = _totalPlayableEncounters(def);
  if (total === 0) return 0.0;
  const completed = (campaign.chapters || []).filter((c) => c.outcome === 'victory').length;
  return Math.min(1.0, Math.max(0.0, completed / total));
}

/**
 * Get current encounter entry from def based on campaign.currentAct + chapter.
 * Factoring in branch_key if reached.
 */
function getCurrentEncounter(campaign, def) {
  if (!campaign || !def) return null;
  const act = (def.acts || []).find((a) => a.act_idx === campaign.currentAct);
  if (!act) return null;
  const branchKey = getBranchPath(campaign).slice(-1)[0] || null;
  const encounters = act.encounters || [];
  // Match chapter_idx + branch (if in branch, filter)
  const candidates = encounters.filter((e) => {
    if (e.chapter_idx !== campaign.currentChapter) return false;
    if (!e.branch_key) return true; // linear
    return e.branch_key === branchKey;
  });
  return candidates[0] || null;
}

/**
 * Peek next encounter (post-hypothetical-victory) without mutating state.
 * Returns {next_encounter_id, choice_required, next_act} object.
 */
function getNextEncounter(campaign, def) {
  if (!campaign || !def) return { next_encounter_id: null };
  const act = (def.acts || []).find((a) => a.act_idx === campaign.currentAct);
  if (!act) return { next_encounter_id: null };
  const nextChapterIdx = campaign.currentChapter + 1;
  const branchKey = getBranchPath(campaign).slice(-1)[0] || null;
  const encounters = act.encounters || [];
  const pathEncounters = branchKey
    ? encounters.filter((e) => !e.branch_key || e.branch_key === branchKey || e.is_choice_node)
    : encounters;
  const nextEntry = pathEncounters.find((e) => e.chapter_idx === nextChapterIdx);

  if (nextEntry?.is_choice_node) {
    return {
      next_encounter_id: null,
      choice_required: true,
      choice_node: nextEntry.choice,
    };
  }
  if (nextEntry) {
    return { next_encounter_id: nextEntry.encounter_id };
  }
  // Check next act
  const nextActIdx = campaign.currentAct + 1;
  const nextAct = (def.acts || []).find((a) => a.act_idx === nextActIdx);
  if (!nextAct) {
    return { next_encounter_id: null, campaign_completed: true };
  }
  const firstEnc = (nextAct.encounters || []).find((e) => !e.is_choice_node);
  return {
    next_encounter_id: firstEnc?.encounter_id || null,
    next_act: nextActIdx,
  };
}

/**
 * Can campaign be advanced? False se finalizzata.
 */
function canAdvance(campaign) {
  if (!campaign) return false;
  return !campaign.finalState;
}

/**
 * Is current chapter a choice_node requiring player input?
 */
function canChoose(campaign, def) {
  if (!canAdvance(campaign)) return false;
  if (!def) return false;
  const act = (def.acts || []).find((a) => a.act_idx === campaign.currentAct);
  if (!act) return false;
  const currentEnc = (act.encounters || []).find((e) => e.chapter_idx === campaign.currentChapter);
  return !!(currentEnc && currentEnc.is_choice_node);
}

/**
 * Extract branch path history (array binary choice keys).
 */
function getBranchPath(campaign) {
  if (!campaign || !Array.isArray(campaign.branchChoices)) return [];
  return [...campaign.branchChoices];
}

/**
 * Full summary for UI. Composable output per frontend.
 *
 * @returns {object} { campaign, current_encounter, next_encounter,
 *                     progress, can_advance, can_choose, branch_path,
 *                     completion_status }
 */
function summariseCampaign(campaign, def) {
  if (!campaign) return null;
  const currentEnc = getCurrentEncounter(campaign, def);
  const next = getNextEncounter(campaign, def);
  const progress = computeProgress(campaign, def);
  const completion_status = campaign.finalState
    ? campaign.finalState
    : progress >= 1.0
      ? 'completed'
      : 'in_progress';
  return {
    campaign,
    current_encounter: currentEnc
      ? {
          encounter_id: currentEnc.encounter_id || null,
          chapter_idx: currentEnc.chapter_idx,
          act_idx: campaign.currentAct,
          narrative_pre: currentEnc.narrative_pre || null,
          narrative_post: currentEnc.narrative_post || null,
          is_choice_node: !!currentEnc.is_choice_node,
          choice: currentEnc.choice || null,
        }
      : null,
    next_encounter: next,
    progress,
    can_advance: canAdvance(campaign),
    can_choose: canChoose(campaign, def),
    branch_path: getBranchPath(campaign),
    completion_status,
  };
}

module.exports = {
  computeProgress,
  getCurrentEncounter,
  getNextEncounter,
  canAdvance,
  canChoose,
  getBranchPath,
  summariseCampaign,
  _totalPlayableEncounters,
};
