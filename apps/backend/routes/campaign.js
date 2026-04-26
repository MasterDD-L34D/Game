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
  getOnboarding,
  getOnboardingV2,
  resolveOnboardingTrait,
} = require('../services/campaign/campaignLoader');
const {
  resolveBiome,
  VALID_LOCOMOTION,
  VALID_OFFENSE,
  VALID_DEFENSE,
  VALID_SENSES,
} = require('../services/imprint/biomeResolver');
const { summariseCampaign } = require('../services/campaign/campaignEngine');
const { grantXpToSurvivors } = require('../services/progression/progressionApply');
const { loadXpCurve } = require('../services/progression/progressionLoader');

// M12 Phase D — evolve opportunity trigger threshold (ADR-2026-04-23 addendum).
// Victory + pe_earned >= PE_EVOLVE_TRIGGER_THRESHOLD → response.evolve_opportunity=true.
// Consumed frontend-side (formsPanel auto-open) + lobby campaign mirror.
const PE_EVOLVE_TRIGGER_THRESHOLD = 8;

function computeEvolveOpportunity(outcome, peEarned) {
  const pe = Number(peEarned) || 0;
  const eligible = outcome === 'victory' && pe >= PE_EVOLVE_TRIGGER_THRESHOLD;
  return {
    evolve_opportunity: eligible,
    evolve_pe_threshold: PE_EVOLVE_TRIGGER_THRESHOLD,
    evolve_pe_earned: pe,
  };
}

function createCampaignRouter(options = {}) {
  const router = express.Router();

  // POST /api/campaign/start
  // Body: { player_id, campaign_def_id?, initial_trait_choice? }
  //   initial_trait_choice: 'option_a' | 'option_b' | 'option_c' | null
  //   → resolves trait via campaign.onboarding.choices[] (V1 Phase B).
  //   → applied to roster as acquiredTraits[] (shared branco).
  router.post('/campaign/start', (req, res) => {
    const { player_id, campaign_def_id, initial_trait_choice } = req.body || {};
    if (!player_id || typeof player_id !== 'string') {
      return res.status(400).json({ error: 'player_id richiesto (string)' });
    }
    const defId = campaign_def_id || 'default_campaign_mvp';
    const defDoc = loadCampaignDef(defId);
    if (!defDoc) {
      return res.status(404).json({ error: `campaign def "${defId}" non trovato` });
    }

    // V1 Onboarding Phase B — resolve trait da choice key. Se key invalida,
    // fallback su default_choice_on_timeout (option_a canonical). Se
    // campaign def senza onboarding section, skip (legacy campaigns).
    const onboarding = getOnboarding(defDoc);
    let onboardingChoice = null;
    let acquiredTraits = [];
    if (onboarding && Array.isArray(onboarding.choices) && onboarding.choices.length > 0) {
      const requested = typeof initial_trait_choice === 'string' ? initial_trait_choice : null;
      const validKeys = onboarding.choices.map((c) => c.option_key);
      const effectiveKey =
        requested && validKeys.includes(requested)
          ? requested
          : onboarding.default_choice_on_timeout || validKeys[0];
      const traitId = resolveOnboardingTrait(defDoc, effectiveKey);
      if (traitId) {
        onboardingChoice = { option_key: effectiveKey, trait_id: traitId };
        acquiredTraits = [traitId];
      }
    }

    const campaign = createCampaign(player_id, defId, { onboardingChoice, acquiredTraits });
    const firstAct = defDoc.acts[0];
    const firstEnc = (firstAct?.encounters || []).find((e) => !e.is_choice_node);
    return res.status(201).json({
      campaign,
      next_encounter_id: firstEnc?.encounter_id || null,
      campaign_def: {
        name: defDoc.name,
        narrative_hook: defDoc.narrative_hook,
        total_acts: defDoc.total_acts,
        onboarding: onboarding || null, // V1: UI consumer picker
      },
    });
  });

  // ─── L'Impronta v2 (CAP-14) — 4 player parallel choices su body parts ───
  //
  // POST /api/campaign/start/v2
  // Body: {
  //   players: [<playerId1>, <playerId2>, <playerId3>, <playerId4>], // 4 players
  //   campaign_def_id?: string,                                       // default 'default_campaign_mvp'
  //   choices: {
  //     p1: { locomotion: 'VELOCE'|'SILENZIOSA' },
  //     p2: { offense: 'PROFONDA'|'RAPIDA' },
  //     p3: { defense: 'DURA'|'FLESSIBILE' },
  //     p4: { senses: 'LONTANO'|'ACUTO' }
  //   }
  // }
  //
  // Aggregato per biomeResolver: 4-tuple choices flatten → biome_id + base_biome_id + applied_modulations.
  // Ritorna campaign object + biome resolution + next_encounter.
  router.post('/campaign/start/v2', (req, res) => {
    const { players, campaign_def_id, choices } = req.body || {};

    // Validation: 4 players required
    if (
      !Array.isArray(players) ||
      players.length !== 4 ||
      !players.every((p) => typeof p === 'string' && p.trim())
    ) {
      return res.status(400).json({ error: 'players richiesto (array di 4 string non vuoti)' });
    }
    if (!choices || typeof choices !== 'object') {
      return res.status(400).json({ error: 'choices richiesto (object {p1, p2, p3, p4})' });
    }

    // Validation: 4 axes required
    const aggregated = {};
    const axisExpected = { p1: 'locomotion', p2: 'offense', p3: 'defense', p4: 'senses' };
    const validators = {
      locomotion: VALID_LOCOMOTION,
      offense: VALID_OFFENSE,
      defense: VALID_DEFENSE,
      senses: VALID_SENSES,
    };
    for (const [slot, axis] of Object.entries(axisExpected)) {
      const slotChoice = choices[slot];
      if (!slotChoice || typeof slotChoice !== 'object') {
        return res.status(400).json({ error: `choices.${slot} richiesto (con ${axis})` });
      }
      const value = String(slotChoice[axis] || '').toUpperCase();
      if (!validators[axis].has(value)) {
        return res.status(400).json({
          error: `choices.${slot}.${axis} non valido: "${slotChoice[axis]}". Atteso: ${[...validators[axis]].join('|')}`,
        });
      }
      aggregated[axis] = value;
    }

    // Load campaign def + check onboarding_v2
    const defId = campaign_def_id || 'default_campaign_mvp';
    const defDoc = loadCampaignDef(defId);
    if (!defDoc) {
      return res.status(404).json({ error: `campaign def "${defId}" non trovato` });
    }
    const onboardingV2 = getOnboardingV2(defDoc);
    if (!onboardingV2) {
      return res.status(404).json({
        error: `campaign def "${defId}" non ha onboarding_v2 (use /api/campaign/start V1 per legacy)`,
      });
    }

    // Resolve biome via biomeResolver (CAP-11). Team composition = 4 player choices flatten.
    const teamComposition = [
      { ...aggregated, ...{ [axisExpected.p1]: aggregated.locomotion } },
      { ...aggregated, ...{ [axisExpected.p2]: aggregated.offense } },
      { ...aggregated, ...{ [axisExpected.p3]: aggregated.defense } },
      { ...aggregated, ...{ [axisExpected.p4]: aggregated.senses } },
    ];
    const biomeResult = resolveBiome(aggregated, { team_composition: teamComposition });

    // Create campaign with first player as primary owner (campaign-level concept).
    // Other 3 players associated via lobby/coop layer (out-of-scope V2 backend).
    const primaryPlayer = players[0];
    const campaign = createCampaign(primaryPlayer, defId, {
      onboardingChoice: { mode: 'imprint_v2', choices: aggregated },
      acquiredTraits: [],
    });

    const firstAct = defDoc.acts[0];
    const firstEnc = (firstAct?.encounters || []).find((e) => !e.is_choice_node);
    const transitionLine = (onboardingV2.transition?.line_template || '').replace(
      '{biome_name}',
      biomeResult.biome_id,
    );

    return res.status(201).json({
      campaign,
      players,
      choices: aggregated,
      biome: {
        biome_id: biomeResult.biome_id,
        base_biome_id: biomeResult.base_biome_id,
        applied_modulations: biomeResult.applied_modulations,
      },
      next_encounter_id: firstEnc?.encounter_id || null,
      transition_line: transitionLine,
      campaign_def: {
        name: defDoc.name,
        narrative_hook: defDoc.narrative_hook,
        total_acts: defDoc.total_acts,
        onboarding_v2: onboardingV2,
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
    const { id, outcome, pe_earned, pi_earned, survivors, xp_per_unit } = req.body || {};
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

    // M12 Phase D — evolve opportunity flag additive (victory + pe ≥ threshold).
    const evolveFlags = computeEvolveOpportunity(outcome, pe_earned);

    // M13 P3 Phase B — XP grant hook su victory. Caller passa survivors
    // opzionali (array unit objects o { id, job }); se omesso, skip grant.
    // xp_per_unit default da xp_curve.yaml (mission_victory = 12).
    let xpGrants = [];
    if (outcome === 'victory' && Array.isArray(survivors) && survivors.length > 0) {
      let amount = Number(xp_per_unit);
      if (!Number.isFinite(amount) || amount <= 0) {
        try {
          const curve = loadXpCurve();
          amount = Number(curve?.xp_grants?.mission_victory) || 12;
        } catch {
          amount = 12;
        }
      }
      try {
        xpGrants = grantXpToSurvivors(
          survivors.map((s) =>
            s && typeof s === 'object'
              ? { ...s, controlled_by: s.controlled_by || 'player', hp: s.hp ?? 1 }
              : null,
          ),
          amount,
          { campaignId: id },
        );
      } catch (err) {
        xpGrants = [];
      }
    }
    const xpGrantsPayload = { xp_grants: xpGrants };

    // Compute next state
    let updated;
    if (outcome !== 'victory') {
      // Defeat/timeout: pause campaign (not finalize). Player can retry same encounter.
      updated = updateCampaign(id, {}); // just bump updatedAt
      return res.json({
        campaign: updated,
        next_encounter_id: currentEncId, // retry same
        retry: true,
        ...evolveFlags,
        ...xpGrantsPayload,
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
        ...evolveFlags,
        ...xpGrantsPayload,
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
        return res.json({
          campaign: updated,
          next_encounter_id: null,
          campaign_completed: true,
          ...evolveFlags,
          ...xpGrantsPayload,
        });
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
        ...evolveFlags,
        ...xpGrantsPayload,
      });
    }

    // Normal advance in same act
    updated = updateCampaign(id, { currentChapter: nextChapterIdx });
    return res.json({
      campaign: updated,
      next_encounter_id: nextEncEntry.encounter_id,
      ...evolveFlags,
      ...xpGrantsPayload,
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

module.exports = {
  createCampaignRouter,
  computeEvolveOpportunity,
  PE_EVOLVE_TRIGGER_THRESHOLD,
};
