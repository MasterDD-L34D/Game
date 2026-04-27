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
  recordPermanentFlag,
  getPermanentFlag,
} = require('../services/campaign/campaignStore');
const {
  loadCampaign: loadCampaignDef,
  getEncountersForAct,
  resolveBranch,
  getOnboarding,
  resolveOnboardingTrait,
} = require('../services/campaign/campaignLoader');
const { summariseCampaign } = require('../services/campaign/campaignEngine');
const { grantXpToSurvivors } = require('../services/progression/progressionApply');
const { loadXpCurve } = require('../services/progression/progressionLoader');

// M12 Phase D — evolve opportunity trigger threshold (ADR-2026-04-23 addendum).
// Victory + pe_earned >= PE_EVOLVE_TRIGGER_THRESHOLD → response.evolve_opportunity=true.
// Consumed frontend-side (formsPanel auto-open) + lobby campaign mirror.
const PE_EVOLVE_TRIGGER_THRESHOLD = 8;

// Sprint 1 §V (2026-04-27) — Disco Elysium day pacing flavor.
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #9 Disco.
// Pattern: campaign progress shown as narrative "Day N of Aurora" beat.
// Computed: currentChapter (0-indexed) → "Giorno N di Aurora" (1-indexed).
// Variant text per ranges (early/mid/late) per atmospheric variation.
function formatDayPacing(chapterIdx, currentAct) {
  const day = Math.max(1, Number(chapterIdx) + 1);
  const act = Math.max(1, Number(currentAct) + 1);
  // Variants Disco-style: short title + flavor sub-line.
  let title;
  let flavor;
  if (day <= 2) {
    title = `Giorno ${day} di Aurora`;
    flavor = 'Sole basso, sabbia che si scuote dai sogni.';
  } else if (day <= 5) {
    title = `Giorno ${day} di Aurora`;
    flavor = 'Le ombre si allungano verso pattern non ancora letti.';
  } else if (day <= 9) {
    title = `Giorno ${day} di Aurora — Atto ${act}`;
    flavor = 'Il bioma riconosce la creatura. Anche viceversa.';
  } else {
    title = `Giorno ${day} di Aurora — Atto ${act}`;
    flavor = 'Il vento porta tracce di altre creature passate qui.';
  }
  return { day, act, title, flavor };
}

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

    // Sprint Spore Moderate (ADR-2026-04-26 §S3) — MP grant post-encounter.
    // Pure compute: ritorna mp_grants array nel response, NON muta unit
    // (caller frontend è responsabile di apply su roster locale).
    // Caller può passare encounter_meta { tier, kill_with_status, biome_match }.
    let mpGrants = [];
    if (outcome === 'victory' && Array.isArray(survivors) && survivors.length > 0) {
      try {
        const { accrueEncounter } = require('../services/mutations/mpTracker');
        const meta = req.body?.encounter_meta || {};
        for (const s of survivors) {
          if (!s || typeof s !== 'object') continue;
          // Pure shadow unit: don't mutate caller, just compute earned.
          const shadow = { mp: Number(s.mp || 0), mp_earned_total: 0 };
          const r = accrueEncounter(shadow, {
            tier: Number(meta.tier || 1),
            kill_with_status: Boolean(meta.kill_with_status),
            biome_affinity_match: Boolean(meta.biome_match),
          });
          if (r.earned > 0) {
            mpGrants.push({
              unit_id: s.id || null,
              earned: r.earned,
              new_pool: r.new_pool,
              sources: r.sources,
              capped: r.capped,
            });
          }
        }
      } catch (err) {
        mpGrants = [];
      }
    }
    const mpGrantsPayload = { mp_grants: mpGrants };

    // Sprint 1 §V — Disco day pacing flavor (campaign narrative beat).
    const dayPacing = formatDayPacing(campaign.currentChapter, campaign.currentAct);
    const dayPacingPayload = { day_pacing: dayPacing };

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
        ...mpGrantsPayload,
        ...dayPacingPayload,
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
        ...mpGrantsPayload,
        ...dayPacingPayload,
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
          ...mpGrantsPayload,
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
        ...mpGrantsPayload,
        ...dayPacingPayload,
      });
    }

    // Normal advance in same act
    updated = updateCampaign(id, { currentChapter: nextChapterIdx });
    return res.json({
      campaign: updated,
      next_encounter_id: nextEncEntry.encounter_id,
      ...evolveFlags,
      ...xpGrantsPayload,
      ...mpGrantsPayload,
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

  // Sprint 3 §III (2026-04-27) — Wildermyth choice→permanent flag.
  // POST /api/campaign/flag/record { id, key, value?, narrative?, source_chapter? }
  router.post('/campaign/flag/record', (req, res) => {
    const { id, key, value, narrative, source_chapter, source_act } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id richiesto' });
    if (!key || typeof key !== 'string')
      return res.status(400).json({ error: 'key richiesto (string)' });
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    const updated = recordPermanentFlag(id, {
      key,
      value: value !== undefined ? value : true,
      narrative: narrative || null,
      source_chapter: source_chapter ?? null,
      source_act: source_act ?? null,
    });
    return res.json({
      campaign_id: id,
      flag: updated.permanentFlags.find((f) => f.key === key),
      total_flags: updated.permanentFlags.length,
    });
  });

  // GET /api/campaign/:id/flags — list all permanent flags
  router.get('/campaign/:id/flags', (req, res) => {
    const id = req.params.id;
    const campaign = getCampaign(id);
    if (!campaign) return res.status(404).json({ error: 'campaign non trovato' });
    return res.json({
      campaign_id: id,
      flags: campaign.permanentFlags || [],
      total: (campaign.permanentFlags || []).length,
    });
  });

  // GET /api/campaign/:id/flag/:key — query single flag
  router.get('/campaign/:id/flag/:key', (req, res) => {
    const flag = getPermanentFlag(req.params.id, req.params.key);
    if (!flag) {
      return res.status(404).json({
        error: `flag '${req.params.key}' non trovato per campaign '${req.params.id}'`,
      });
    }
    return res.json({ campaign_id: req.params.id, flag });
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
