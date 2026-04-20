// M10 Phase B — campaign routes.
//
// Endpoints (ADR-2026-04-21):
//   POST /api/campaign/start   — create new campaign session
//   GET  /api/campaign/state   — fetch current state (?id=<uuid>)
//   POST /api/campaign/advance — advance to next encounter post outcome
//   POST /api/campaign/choose  — apply binary branch choice (Descent pattern)
//   POST /api/campaign/end     — finalize campaign (complete/abandon)
//   GET  /api/campaign/list    — list campaigns for player (?player_id=)
//
// Payload shape canonical:
//   POST /start       { player_id, campaign_def_id? }
//   GET  /state       ?id=<uuid>
//   POST /advance     { id, outcome: 'victory'|'defeat'|'timeout', pe_earned?, pi_earned? }
//   POST /choose      { id, branch_key: 'cave_path' | 'ruins_path' }
//   POST /end         { id, final_state: 'completed' | 'abandoned' }
//   GET  /list        ?player_id=<id>

'use strict';

const express = require('express');
const {
  createCampaign,
  getCampaign,
  listCampaignsForPlayer,
  updateCampaign,
  recordChapter,
} = require('../services/campaign/campaignStore');
const {
  loadCampaign: loadCampaignDef,
  getEncountersForAct,
  resolveBranch,
} = require('../services/campaign/campaignLoader');
const { summariseCampaign } = require('../services/campaign/campaignEngine');

function createCampaignRouter(options = {}) {
  const router = express.Router();

  // POST /api/campaign/start
  router.post('/campaign/start', (req, res) => {
    const { player_id, campaign_def_id } = req.body || {};
    if (!player_id || typeof player_id !== 'string') {
      return res.status(400).json({ error: 'player_id richiesto (string)' });
    }
    const defId = campaign_def_id || 'default_campaign_mvp';
    const defDoc = loadCampaignDef(defId);
    if (!defDoc) {
      return res.status(404).json({ error: `campaign def "${defId}" non trovato` });
    }
    const campaign = createCampaign(player_id, defId);
    const firstAct = defDoc.acts[0];
    const firstEnc = (firstAct?.encounters || []).find((e) => !e.is_choice_node);
    return res.status(201).json({
      campaign,
      next_encounter_id: firstEnc?.encounter_id || null,
      campaign_def: {
        name: defDoc.name,
        narrative_hook: defDoc.narrative_hook,
        total_acts: defDoc.total_acts,
      },
    });
  });

  // GET /api/campaign/state
  router.get('/campaign/state', (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id query param richiesto' });
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    return res.json({ campaign });
  });

  // GET /api/campaign/list
  router.get('/campaign/list', (req, res) => {
    const playerId = req.query.player_id;
    if (!playerId) return res.status(400).json({ error: 'player_id query param richiesto' });
    const campaigns = listCampaignsForPlayer(playerId);
    return res.json({ campaigns, count: campaigns.length });
  });

  // M10 Phase C: GET /api/campaign/summary — UI state snapshot via engine
  router.get('/campaign/summary', (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id query param richiesto' });
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    const defDoc = loadCampaignDef(campaign.campaignDefId);
    if (!defDoc) return res.status(500).json({ error: 'campaign def mancante' });
    const summary = summariseCampaign(campaign, defDoc);
    return res.json(summary);
  });

  // POST /api/campaign/advance
  router.post('/campaign/advance', (req, res) => {
    const { id, outcome, pe_earned, pi_earned } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id richiesto' });
    if (!['victory', 'defeat', 'timeout'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome deve essere victory|defeat|timeout' });
    }
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    if (campaign.finalState) {
      return res.status(409).json({ error: `campaign già finalizzata (${campaign.finalState})` });
    }

    const defDoc = loadCampaignDef(campaign.campaignDefId);
    if (!defDoc) return res.status(500).json({ error: 'campaign def mancante' });

    const act = defDoc.acts.find((a) => a.act_idx === campaign.currentAct);
    if (!act) return res.status(500).json({ error: 'act corrente non trovato in def' });

    // Find current encounter in act via chapter_idx
    const currentEncEntry = (act.encounters || []).find(
      (e) => e.chapter_idx === campaign.currentChapter,
    );
    const currentEncId = currentEncEntry?.encounter_id || null;

    // Record chapter outcome
    const lastBranch =
      campaign.branchChoices.length > 0
        ? campaign.branchChoices[campaign.branchChoices.length - 1]
        : null;
    recordChapter(id, {
      chapterIdx: campaign.currentChapter,
      actIdx: campaign.currentAct,
      encounterId: currentEncId,
      outcome,
      peEarned: pe_earned,
      piEarned: pi_earned,
      branchChosen: lastBranch,
    });

    // Compute next state
    let updated;
    if (outcome !== 'victory') {
      // Defeat/timeout: pause campaign (not finalize). Player can retry same encounter.
      updated = updateCampaign(id, {}); // just bump updatedAt
      return res.json({
        campaign: updated,
        next_encounter_id: currentEncId, // retry same
        retry: true,
      });
    }

    // Victory: advance chapter
    const nextChapterIdx = campaign.currentChapter + 1;
    const allEncounters = act.encounters || [];
    const branchKey = lastBranch;
    // Filter encounters for current branch path (if branch started)
    const pathEncounters = branchKey
      ? getEncountersForAct(defDoc, campaign.currentAct, branchKey)
      : allEncounters;
    const nextEncEntry = pathEncounters.find((e) => e.chapter_idx === nextChapterIdx);

    // If next is choice_node, surface it
    if (nextEncEntry?.is_choice_node) {
      updated = updateCampaign(id, { currentChapter: nextChapterIdx });
      return res.json({
        campaign: updated,
        next_encounter_id: null,
        choice_required: true,
        choice_node: nextEncEntry.choice,
      });
    }

    // If no next encounter in act → check next act
    if (!nextEncEntry) {
      const nextActIdx = campaign.currentAct + 1;
      const nextAct = defDoc.acts.find((a) => a.act_idx === nextActIdx);
      if (!nextAct) {
        // Campaign completed
        updated = updateCampaign(id, {
          finalState: 'completed',
          completionPct: 1.0,
          currentChapter: nextChapterIdx,
        });
        return res.json({ campaign: updated, next_encounter_id: null, campaign_completed: true });
      }
      // Advance to next act
      const firstEncNextAct = (nextAct.encounters || []).find((e) => !e.is_choice_node);
      updated = updateCampaign(id, {
        currentAct: nextActIdx,
        currentChapter: firstEncNextAct?.chapter_idx || 1,
      });
      return res.json({
        campaign: updated,
        next_encounter_id: firstEncNextAct?.encounter_id || null,
        act_advanced: true,
      });
    }

    // Normal advance in same act
    updated = updateCampaign(id, { currentChapter: nextChapterIdx });
    return res.json({
      campaign: updated,
      next_encounter_id: nextEncEntry.encounter_id,
    });
  });

  // POST /api/campaign/choose
  router.post('/campaign/choose', (req, res) => {
    const { id, branch_key } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id richiesto' });
    if (!branch_key) return res.status(400).json({ error: 'branch_key richiesto' });
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    if (campaign.finalState) {
      return res.status(409).json({ error: `campaign già finalizzata (${campaign.finalState})` });
    }

    const defDoc = loadCampaignDef(campaign.campaignDefId);
    if (!defDoc) return res.status(500).json({ error: 'campaign def mancante' });

    const nextEncId = resolveBranch(defDoc, campaign.currentAct, branch_key);
    if (!nextEncId) {
      return res
        .status(400)
        .json({ error: `branch_key "${branch_key}" invalido per act ${campaign.currentAct}` });
    }

    // Find encounter chapter_idx for next branch encounter
    const act = defDoc.acts.find((a) => a.act_idx === campaign.currentAct);
    const nextEncEntry = (act.encounters || []).find(
      (e) => e.encounter_id === nextEncId && e.branch_key === branch_key,
    );

    const updated = updateCampaign(id, {
      branchChoices: [...campaign.branchChoices, branch_key],
      currentChapter: nextEncEntry?.chapter_idx || campaign.currentChapter + 1,
    });

    return res.json({
      campaign: updated,
      next_encounter_id: nextEncId,
      branch_key,
    });
  });

  // POST /api/campaign/end
  router.post('/campaign/end', (req, res) => {
    const { id, final_state } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id richiesto' });
    if (!['completed', 'abandoned'].includes(final_state)) {
      return res.status(400).json({ error: 'final_state deve essere completed|abandoned' });
    }
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    if (campaign.finalState) {
      return res.status(409).json({ error: `già finalizzata (${campaign.finalState})` });
    }
    const updated = updateCampaign(id, {
      finalState: final_state,
      completionPct: final_state === 'completed' ? 1.0 : campaign.completionPct,
    });
    return res.json({ campaign: updated });
  });

  return router;
}

module.exports = { createCampaignRouter };
