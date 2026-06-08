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
const {
  loadAmbition,
  progressAmbition,
  evaluateChoiceRitual,
  getActiveAmbitions,
  seedAmbition,
} = require('../services/campaign/ambitionService');
const { grantXpToSurvivors } = require('../services/progression/progressionApply');
const { loadXpCurve } = require('../services/progression/progressionLoader');

// TKT-P2 Brigandine seasonal — Phase C routes (engine Phase A #2251 + content Phase B #2252).
const seasonalEngine = require('../services/campaign/seasonalEngine');
const seasonalContentLoader = require('../services/campaign/seasonalContentLoader');

// TKT-WORLDGEN-GAPC MVP fase 1 — meta-network campaign routing (read-only).
// Surfaces the eligible next-node candidates (player-choice, Into the Breach)
// from the meta-network graph. Flag-gated OFF by default (META_NETWORK_ROUTING
// !== 'true'): the diagnostic endpoint returns enabled:false so existing
// campaign flow is untouched (band-safe / back-compat). Generative grammar +
// arc-conditions (data gate) are POST-MVP — see spec
// docs/superpowers/specs/2026-05-31-worldgen-gapc-meta-network-routing-design.md.
const metaNetworkResolver = require('../services/worldgen/metaNetworkResolver');
const {
  selectNextNodes,
  encounterForNode,
  isTerminal,
} = require('../services/worldgen/metaNetworkRouting');
const { enrichCandidatesWithThreat } = require('../services/worldgen/encounterThreat');

// Slice A/C (live routing): is graph-routed campaign flow active? Read at request time
// (the flag may flip between requests in tests). OFF (default) -> /start, /advance, /choose
// behave exactly as the static chain (band-safe, reversible).
function _metaRoutingOn() {
  return process.env.META_NETWORK_ROUTING === 'true';
}

// Case-insensitive node id compare (mirrors metaNetworkRouting._norm) for cleared-set
// membership + candidate validation.
function _normNode(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase();
}

// In-memory seasonal state Map<campaign_id, state>. Per POC. Resettable via
// _resetSeasonalState() per test isolation. Future iteration: integrate con
// campaignStore o Prisma write-through (pattern progressionStore).
const campaignSeasonalState = new Map();

function _resetSeasonalState() {
  campaignSeasonalState.clear();
}

function _getOrInitSeasonalState(campaignId) {
  if (!campaignSeasonalState.has(campaignId)) {
    campaignSeasonalState.set(campaignId, seasonalEngine.initialState());
  }
  return campaignSeasonalState.get(campaignId);
}

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
    const { player_id, campaign_def_id, initial_trait_choice, initial_trait_choices } =
      req.body || {};
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
    let acquiredTraitsByCreature = {};
    if (onboarding && Array.isArray(onboarding.choices) && onboarding.choices.length > 0) {
      const validKeys = onboarding.choices.map((c) => c.option_key);
      const defaultKey = onboarding.default_choice_on_timeout || validKeys[0];
      const resolveKey = (k) => (typeof k === 'string' && validKeys.includes(k) ? k : defaultKey);
      // MA1 (ADR-2026-06-08): per-creature choices map { creatureId: option_key }. Each
      // invalid key falls back to the default INDIVIDUALLY. Legacy single choice = shared.
      if (
        initial_trait_choices &&
        typeof initial_trait_choices === 'object' &&
        !Array.isArray(initial_trait_choices)
      ) {
        for (const [creatureId, key] of Object.entries(initial_trait_choices)) {
          const tid = resolveOnboardingTrait(defDoc, resolveKey(key));
          if (tid) acquiredTraitsByCreature[creatureId] = tid;
        }
        // backward-compat: acquiredTraits = union of per-creature traits.
        acquiredTraits = [...new Set(Object.values(acquiredTraitsByCreature))];
      } else {
        const effectiveKey = resolveKey(
          typeof initial_trait_choice === 'string' ? initial_trait_choice : null,
        );
        const traitId = resolveOnboardingTrait(defDoc, effectiveKey);
        if (traitId) {
          onboardingChoice = { option_key: effectiveKey, trait_id: traitId };
          acquiredTraits = [traitId];
        }
      }
    }

    const campaign = createCampaign(player_id, defId, {
      onboardingChoice,
      acquiredTraits,
      acquiredTraitsByCreature,
    });

    // Slice A (live routing, flag ON): a graph-routed run begins at the authored
    // start_node and serves its encounter from the graph; the static onboarding chain is
    // skipped. Falls through to the static response below when the flag is OFF or the
    // graph names no start_node (band-safe). currentNode/clearedNodes are additive fields.
    if (_metaRoutingOn()) {
      const graph = metaNetworkResolver.getNetwork();
      const startNode = graph && graph.start_node ? graph.start_node : null;
      if (startNode) {
        const updated = updateCampaign(campaign.id, { currentNode: startNode, clearedNodes: [] });
        return res.status(201).json({
          campaign: updated,
          next_encounter_id: encounterForNode(graph, startNode),
          campaign_def: {
            name: defDoc.name,
            narrative_hook: defDoc.narrative_hook,
            total_acts: defDoc.total_acts,
            onboarding: onboarding || null,
          },
        });
      }
    }

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
    // Slice A (Codex P2 #2582): in graph mode the campaign record still carries the static
    // currentChapter, so the engine summary would report the static tutorial encounter.
    // Override current_encounter with the current graph node's served encounter so a client
    // polling /summary sees what /advance actually serves. Flag OFF -> summary unchanged.
    if (_metaRoutingOn() && campaign.currentNode) {
      const graph = metaNetworkResolver.getNetwork();
      summary.current_encounter = {
        encounter_id: encounterForNode(graph, campaign.currentNode),
        node_id: campaign.currentNode,
        is_choice_node: false,
        choice: null,
      };
    }
    return res.json(summary);
  });

  // TKT-WORLDGEN-GAPC MVP fase 1 — GET /api/campaign/meta-network/next
  // Read-only diagnostic: the eligible next-node candidates (player-choice) from
  // a node on the meta-network graph. Flag-gated OFF by default — when
  // META_NETWORK_ROUTING !== 'true' it returns { enabled: false } and does NOT
  // touch campaign flow (band-safe / back-compat, Gate-5 surface without wiring
  // into /advance). Query: ?from=<NODE_ID>&cleared=A,B&allow_revisit=1&campaign_id=<id>&season=winter
  // Fase 2 (arc-conditions, Stage 1, ADR-2026-05-31): edges may carry a
  // `conditions:` block (season / prior_node_cleared) = Dormans lock-and-key. The
  // `season` query param feeds the evaluator (live source =
  // campaignSeasonalState.current_season). node->encounter resolution stays POST-MVP.
  router.get('/campaign/meta-network/next', (req, res) => {
    const enabled = process.env.META_NETWORK_ROUTING === 'true';
    if (!enabled) {
      return res.json({ enabled: false, reason: 'flag_off', candidates: [] });
    }
    const from = req.query.from;
    if (!from) return res.status(400).json({ error: 'from query param richiesto (node id)' });
    const graph = metaNetworkResolver.getNetwork();
    const clearedNodes =
      typeof req.query.cleared === 'string' && req.query.cleared.length > 0
        ? req.query.cleared.split(',').map((s) => s.trim())
        : [];
    const allowRevisit = req.query.allow_revisit === '1' || req.query.allow_revisit === 'true';
    // Fase 2 (arc-conditions, Stage 1): season feeds season-gated edges. Prefer the
    // LIVE campaign season (campaignSeasonalState, advanced via the seasonal routes)
    // when ?campaign_id= is supplied; ?season= is a diagnostic override. Read-only
    // .get() (NOT _getOrInitSeasonalState) so this diagnostic never creates seasonal
    // state for an arbitrary id. Absent/unknown -> undefined -> season-gated edges
    // fail-closed (band-safe).
    const seasonOverride = typeof req.query.season === 'string' ? req.query.season : undefined;
    const campaignId =
      typeof req.query.campaign_id === 'string' ? req.query.campaign_id.trim() : '';
    const liveSeason = campaignId
      ? campaignSeasonalState.get(campaignId)?.current_season
      : undefined;
    const season = seasonOverride ?? liveSeason;
    const routing = selectNextNodes(from, { graph, clearedNodes, allowRevisit, season });
    return res.json({
      enabled: true,
      network_id: graph ? graph.id : null,
      ...routing,
      // Rich preview (Into the Breach telegraph): each candidate gains `threat` (difficulty +
      // class + peak tier + spawn count) resolved from the encounter metadata. Additive +
      // read-only (combat untouched). Overrides the `...routing` candidates spread above.
      candidates: enrichCandidatesWithThreat(routing.candidates),
    });
  });

  // POST /api/campaign/advance
  router.post('/campaign/advance', (req, res) => {
    const { id, outcome, pe_earned, pi_earned, survivors, xp_per_unit, first_kill_actor_id } =
      req.body || {};
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

    // Slice A (live routing): in graph mode the "current" encounter is the one the current
    // graph node serves (not the static chapter), so recordChapter + the defeat/timeout
    // retry stay coherent. Flag OFF -> the static chapter encounter (byte-identical).
    const graphMode = _metaRoutingOn();
    const graph = graphMode ? metaNetworkResolver.getNetwork() : null;
    const graphNode = graphMode && graph ? campaign.currentNode || graph.start_node : null;

    // Find current encounter in act via chapter_idx
    const currentEncEntry = (act.encounters || []).find(
      (e) => e.chapter_idx === campaign.currentChapter,
    );
    const currentEncId =
      graphMode && graph
        ? encounterForNode(graph, graphNode)
        : currentEncEntry?.encounter_id || null;

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
          // V6 A3 — pass the debrief's first-kill actor so first_kill_pe_bonus lands.
          { campaignId: id, firstKillActorId: first_kill_actor_id },
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

    // Slice A (live routing, flag ON): traverse the graph instead of the static chain.
    // Flag OFF -> falls through to the static act.encounters logic below (byte-identical).
    if (graphMode && graph && graphNode) {
      const clearedNodes = Array.isArray(campaign.clearedNodes) ? [...campaign.clearedNodes] : [];
      if (!clearedNodes.some((c) => _normNode(c) === _normNode(graphNode))) {
        clearedNodes.push(graphNode);
      }
      const season = campaignSeasonalState.get(id)?.current_season;
      const route = selectNextNodes(graphNode, { graph, clearedNodes, season });
      // Terminal climax OR no eligible next-node -> finish the run (reuse completion path).
      if (isTerminal(graph, graphNode) || route.candidates.length === 0) {
        updated = updateCampaign(id, {
          finalState: 'completed',
          completionPct: 1.0,
          clearedNodes,
          currentNode: graphNode,
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
      // Exactly one eligible node -> auto-advance + serve its encounter.
      if (route.candidates.length === 1) {
        const nextNode = route.candidates[0].node_id;
        updated = updateCampaign(id, { currentNode: nextNode, clearedNodes });
        return res.json({
          campaign: updated,
          next_encounter_id: encounterForNode(graph, nextNode),
          ...evolveFlags,
          ...xpGrantsPayload,
          ...mpGrantsPayload,
          ...dayPacingPayload,
        });
      }
      // >1 eligible -> the players choose (co-op vote / solo / sim policy). Mark the node
      // cleared but DON'T advance currentNode; /choose resolves against fresh candidates.
      updated = updateCampaign(id, { clearedNodes, currentNode: graphNode });
      return res.json({
        campaign: updated,
        next_encounter_id: null,
        choice_required: true,
        route_choice: { candidates: enrichCandidatesWithThreat(route.candidates) },
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
    const { id, branch_key, node_id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id richiesto' });

    // Slice C (live routing, flag ON + node_id present): the players chose a graph route
    // node (co-op vote winner / solo pick / sim policy). Validate it is a current candidate
    // of the campaign's graph node, then advance to it. Handled BEFORE the branch_key
    // contract so the legacy path stays byte-identical when node_id is absent.
    if (_metaRoutingOn() && node_id != null) {
      const graphCampaign = getCampaign(id);
      if (!graphCampaign) return res.status(404).json({ error: 'campaign non trovato' });
      if (graphCampaign.finalState) {
        return res
          .status(409)
          .json({ error: `campaign finalizzata (${graphCampaign.finalState})` });
      }
      const graph = metaNetworkResolver.getNetwork();
      const graphNode = graphCampaign.currentNode || (graph && graph.start_node) || null;
      const season = campaignSeasonalState.get(id)?.current_season;
      const clearedNodes = Array.isArray(graphCampaign.clearedNodes)
        ? graphCampaign.clearedNodes
        : [];
      // Slice C victory-gate (Codex P2 #2582): a route choice is pending ONLY when the
      // current node was just cleared -- the >1-candidate /advance marks it cleared WITHOUT
      // advancing currentNode. Without this guard a client could /choose right after /start
      // (clearedNodes []) and skip the node's encounter, jumping to the terminal route.
      const clearedSet = new Set(clearedNodes.map(_normNode));
      if (!clearedSet.has(_normNode(graphNode))) {
        return res
          .status(409)
          .json({ error: `nessuna scelta di rotta pendente per il nodo ${graphNode}` });
      }
      const route = selectNextNodes(graphNode, { graph, clearedNodes, season });
      const chosen = route.candidates.find((c) => _normNode(c.node_id) === _normNode(node_id));
      if (!chosen) {
        return res
          .status(400)
          .json({ error: `node_id "${node_id}" non valido per il nodo ${graphNode}` });
      }
      const prevChoices = Array.isArray(graphCampaign.routeChoices)
        ? graphCampaign.routeChoices
        : [];
      const updated = updateCampaign(id, {
        currentNode: chosen.node_id,
        routeChoices: [...prevChoices, chosen.node_id],
      });
      return res.json({
        campaign: updated,
        next_encounter_id: encounterForNode(graph, chosen.node_id),
        node_id: chosen.node_id,
      });
    }

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

  // Action 6 (ADR-2026-04-28 §Action 6) — Ambition routes.
  // Long-arc campaign goal layer SOPRA session resolver. NO inline session.js edit.

  // GET /api/campaign/ambitions/active
  // Query: ?session_id=<sid>
  // Returns: { ambitions: [{ ambition_id, title_it, progress, progress_target, ... }] }
  router.get('/campaign/ambitions/active', (req, res) => {
    const sessionId = String(req.query?.session_id || '');
    if (!sessionId) return res.status(400).json({ error: 'session_id richiesto (query)' });
    const ambitions = getActiveAmbitions(sessionId);
    return res.json({ ambitions });
  });

  // POST /api/campaign/ambitions/:id/seed
  // Body: { session_id }
  // Idempotent — initialize progress entry per session.
  router.post('/campaign/ambitions/:id/seed', (req, res) => {
    const ambitionId = String(req.params?.id || '');
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id richiesto' });
    const ambition = loadAmbition(ambitionId);
    if (!ambition) return res.status(404).json({ error: `ambition "${ambitionId}" non trovato` });
    const entry = seedAmbition(session_id, ambitionId);
    return res.json({ ambition_id: ambitionId, progress: entry });
  });

  // POST /api/campaign/ambitions/:id/progress
  // Body: { session_id, encounter_id, outcome }
  router.post('/campaign/ambitions/:id/progress', (req, res) => {
    const ambitionId = String(req.params?.id || '');
    const { session_id, encounter_id, outcome } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id richiesto' });
    if (!encounter_id) return res.status(400).json({ error: 'encounter_id richiesto' });
    const result = progressAmbition(session_id, ambitionId, { encounter_id, outcome });
    if (result?.error) return res.status(404).json(result);
    return res.json(result);
  });

  // POST /api/campaign/ambitions/:id/choice-ritual
  // Body: { session_id, choice: 'fame_dominance'|'bond_proposal', bond_hearts? }
  router.post('/campaign/ambitions/:id/choice-ritual', (req, res) => {
    const ambitionId = String(req.params?.id || '');
    const { session_id, choice, bond_hearts } = req.body || {};
    if (!session_id) return res.status(400).json({ error: 'session_id richiesto' });
    if (!['fame_dominance', 'bond_proposal'].includes(choice)) {
      return res.status(400).json({ error: 'choice deve essere fame_dominance|bond_proposal' });
    }
    const result = evaluateChoiceRitual(session_id, ambitionId, choice, {
      bond_hearts: Number(bond_hearts) || 0,
    });
    if (result?.error) return res.status(409).json(result);
    return res.json(result);
  });

  // TKT-P2 Brigandine seasonal — Phase C endpoints.
  //
  // 6 endpoints expose macro-loop state + transitions + content metadata:
  //   GET  /api/campaign/seasonal/state           - current state for campaign_id
  //   POST /api/campaign/seasonal/advance-phase   - organization ↔ battle
  //   POST /api/campaign/seasonal/advance-season  - spring → summer → ... (+year wrap)
  //   GET  /api/campaign/seasonal/modifiers       - current season modifiers
  //   GET  /api/campaign/seasonal/phase-spec      - current phase actions + restrictions
  //   GET  /api/campaign/seasonal/events          - season events_pool (?season=<id>)
  //
  // State storage: in-memory Map (POC). campaign_id query/body param required.

  router.get('/campaign/seasonal/state', (req, res) => {
    const campaignId = String(req.query?.campaign_id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'campaign_id query param richiesto' });
    }
    const state = _getOrInitSeasonalState(campaignId);
    return res.json({ campaign_id: campaignId, state });
  });

  router.post('/campaign/seasonal/advance-phase', (req, res) => {
    const campaignId = String(req.body?.campaign_id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'campaign_id richiesto' });
    }
    const prev = _getOrInitSeasonalState(campaignId);
    try {
      const next = seasonalEngine.advancePhase(prev);
      campaignSeasonalState.set(campaignId, next);
      return res.json({ campaign_id: campaignId, state: next });
    } catch (err) {
      return res.status(500).json({ error: 'advance_phase_failed', detail: err.message });
    }
  });

  router.post('/campaign/seasonal/advance-season', (req, res) => {
    const campaignId = String(req.body?.campaign_id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'campaign_id richiesto' });
    }
    const prev = _getOrInitSeasonalState(campaignId);
    try {
      const next = seasonalEngine.advanceSeason(prev);
      campaignSeasonalState.set(campaignId, next);
      return res.json({ campaign_id: campaignId, state: next });
    } catch (err) {
      return res.status(500).json({ error: 'advance_season_failed', detail: err.message });
    }
  });

  router.get('/campaign/seasonal/modifiers', (req, res) => {
    const campaignId = String(req.query?.campaign_id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'campaign_id query param richiesto' });
    }
    const state = _getOrInitSeasonalState(campaignId);
    // Prefer YAML content (Phase B loader) for full hazards array; fallback engine POC.
    const yamlSeason = seasonalContentLoader.getSeason(state.current_season);
    if (yamlSeason) {
      return res.json({
        campaign_id: campaignId,
        season: state.current_season,
        modifiers: yamlSeason.modifiers,
        hazards: yamlSeason.hazards || [],
      });
    }
    const modifiers = seasonalEngine.getSeasonModifiers(state.current_season);
    return res.json({
      campaign_id: campaignId,
      season: state.current_season,
      modifiers,
      hazards: modifiers ? [{ type: modifiers.hazard, intensity: 0.5, affected_biomes: [] }] : [],
    });
  });

  router.get('/campaign/seasonal/phase-spec', (req, res) => {
    const campaignId = String(req.query?.campaign_id || '').trim();
    if (!campaignId) {
      return res.status(400).json({ error: 'campaign_id query param richiesto' });
    }
    const state = _getOrInitSeasonalState(campaignId);
    // Prefer YAML content (Phase B loader); fallback engine POC.
    const yamlPhase = seasonalContentLoader.getPhase(`${state.current_phase}_phase`);
    if (yamlPhase) {
      return res.json({
        campaign_id: campaignId,
        phase: state.current_phase,
        available_actions: yamlPhase.available_actions || [],
        restricted_actions: yamlPhase.restricted_actions || [],
        combat_enabled: yamlPhase.combat_enabled,
        auto_advance: yamlPhase.auto_advance,
      });
    }
    const spec = seasonalEngine.getCurrentPhaseSpec(state);
    return res.json({
      campaign_id: campaignId,
      phase: state.current_phase,
      available_actions: spec ? spec.actions : [],
      restricted_actions: [],
      combat_enabled: spec ? spec.combat_enabled : false,
      auto_advance: false,
    });
  });

  router.get('/campaign/seasonal/events', (req, res) => {
    const season = String(req.query?.season || '').trim();
    if (!season) {
      return res.status(400).json({ error: 'season query param richiesto' });
    }
    const events = seasonalContentLoader.getSeasonEvents(season);
    return res.json({ season, events, count: events.length });
  });

  // TKT-D2-C 2026-05-13 — Godot v2 CampaignState cross-stack sync endpoints.
  //
  //   GET /api/campaign/godot-v2/state?campaign_id=<id>
  //     → 200 { state: { campaign_id, wounds_by_unit, status_locks,
  //              last_encounter_id, promotion_tiers, conviction_axes,
  //              seasonal_state } }
  //     → 404 when no row for campaign_id (caller falls back to baseline)
  //
  //   PUT /api/campaign/godot-v2/state
  //     body: { campaign_id, wounds_by_unit?, status_locks?,
  //             last_encounter_id?, promotion_tiers?, conviction_axes?,
  //             seasonal_state? }
  //     → 200 { state: <persisted row> } (upsert by campaign_id)
  //     → 400 on missing campaign_id
  //
  // Write-through adapter: Godot v2 `scripts/session/campaign_state.gd`
  // serializes Resource → JSON, client PUTs full snapshot, backend stores
  // atomically. Read on encounter boot before local hydration when
  // network reachable; falls back to user://campaigns/<id>/state.json
  // on offline / 404. Schema mirror migration 0010.
  const godotV2State = require('../services/campaign/godotV2State');

  router.get('/campaign/godot-v2/state', async (req, res) => {
    try {
      const campaignId = String(req.query.campaign_id || '').trim();
      if (!campaignId) {
        return res.status(400).json({ error: 'campaign_id query param richiesto' });
      }
      const state = await godotV2State.getState(campaignId);
      if (!state) {
        return res.status(404).json({ error: 'not_found', campaign_id: campaignId });
      }
      return res.json({ state });
    } catch (err) {
      return res.status(500).json({ error: 'persist_read_failed', detail: String(err.message) });
    }
  });

  router.put('/campaign/godot-v2/state', async (req, res) => {
    try {
      const body = req.body || {};
      if (!String(body.campaign_id || '').trim()) {
        return res.status(400).json({ error: 'campaign_id body field richiesto' });
      }
      const state = await godotV2State.upsertState(body);
      return res.json({ state });
    } catch (err) {
      return res.status(500).json({ error: 'persist_write_failed', detail: String(err.message) });
    }
  });

  // M1 sub-proj 2 — read-only Sistema-memory mirror for the Godot v2 client.
  //   GET /api/campaign/sistema-state?campaign_id=<id>
  //     → 200 { state: { units_observed } }  (empty-safe {} when no row / stub)
  //     → 400 missing campaign_id
  // Thin read over the sub-proj 1 store; persistence failure is non-fatal.
  const { createSistemaStateStore } = require('../services/ai/sistemaStateStore');
  const { prisma: _sistemaPrisma } = require('../db/prisma');

  router.get('/campaign/sistema-state', async (req, res) => {
    try {
      const campaignId = String(req.query.campaign_id || '').trim();
      if (!campaignId) {
        return res.status(400).json({ error: 'campaign_id query param richiesto' });
      }
      const store = createSistemaStateStore(_sistemaPrisma);
      const state = await store.get(campaignId); // { units_observed }
      return res.json({ state });
    } catch (err) {
      return res.status(500).json({ error: 'persist_read_failed', detail: String(err.message) });
    }
  });

  // N2 roster-display -- read-only party roster mirror for the Godot v2 Nido
  // hub. GET /api/campaign/roster?campaign_id=<run.id> -> { roster: [rows] }.
  // Empty-safe ([] when no rows / stub / no DB); persistence failure is
  // non-fatal. Reuses the db/prisma singleton already required above.
  const { createRosterStore } = require('../services/campaign/rosterStore');

  router.get('/campaign/roster', async (req, res) => {
    try {
      const campaignId = String(req.query.campaign_id || '').trim();
      if (!campaignId) {
        return res.status(400).json({ error: 'campaign_id query param richiesto' });
      }
      const store = createRosterStore(_sistemaPrisma);
      const roster = await store.get(campaignId);
      return res.json({ roster });
    } catch (err) {
      return res.status(500).json({ error: 'persist_read_failed', detail: String(err.message) });
    }
  });

  return router;
}

module.exports = {
  createCampaignRouter,
  computeEvolveOpportunity,
  PE_EVOLVE_TRIGGER_THRESHOLD,
  _resetSeasonalState,
};
