// API client — proxy /api → backend (vedi vite.config.js).
// Mirror shape di tools/js/play.js ma per browser.

// W8-emergency (bug #5): wrap fetch in try/catch. Browser TypeError "Failed to fetch"
// (network drop, backend restart, CORS) previously crashed callers without handle.
// Now returns networkError flag so UI can retry + display friendly message.
async function jsonFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      errorMessage: err?.message || String(err),
    };
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, data };
}

// W8e — Retry helper for transient network errors (research pass 3 finding #7).
// Wraps jsonFetch with 1 retry after delay when networkError flag is set.
// Used for idempotent POST endpoints (declare-intent/commit-round are re-declarable
// server-side via latest-wins).
async function jsonFetchRetry(path, opts = {}, { retries = 1, delayMs = 400 } = {}) {
  let attempt = 0;
  let result = await jsonFetch(path, opts);
  while (result.networkError && attempt < retries) {
    attempt += 1;
    await new Promise((r) => setTimeout(r, delayMs));
    result = await jsonFetch(path, opts);
  }
  return result;
}

export const api = {
  scenario: (id) => jsonFetch(`/api/tutorial/${encodeURIComponent(id)}`),
  start: (units, opts = {}) =>
    jsonFetch('/api/session/start', {
      method: 'POST',
      body: JSON.stringify({ units, ...opts }),
    }),
  state: (sid) => jsonFetch(`/api/session/state?session_id=${encodeURIComponent(sid)}`),
  action: (body) =>
    jsonFetch('/api/session/action', { method: 'POST', body: JSON.stringify(body) }),
  endTurn: (sid) =>
    jsonFetch('/api/session/turn/end', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  // ADR-2026-04-15 round model endpoints (wired M4 A.1).
  // Flow: beginPlanning → N × declareIntent → commitRound(auto_resolve=true)
  beginPlanning: (sid) =>
    jsonFetch('/api/session/round/begin-planning', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  declareIntent: (sid, actorId, action) =>
    // W8e — retry on network drop (idempotent server-side: latest-wins per unit).
    jsonFetchRetry('/api/session/declare-intent', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, actor_id: actorId, action }),
    }),
  clearIntent: (sid, actorId) =>
    jsonFetch(`/api/session/clear-intent/${encodeURIComponent(actorId)}`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  // Bundle B.2 — Tactical Breach Wizards Undo libero (planning-phase only).
  undoAction: (sid, actorId) =>
    jsonFetch('/api/session/undo-action', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, actor_id: actorId }),
    }),
  // TKT-P6-FE — Rewind safety valve (3-snapshot buffer post-action).
  // Anti-frustration: 409 quando budget esaurito o buffer vuoto. Budget reset
  // a fine combat. Server append rewind audit event nel log.
  rewindAction: (sid) =>
    jsonFetch(`/api/session/${encodeURIComponent(sid)}/rewind`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  // Bundle B.3 — Tunic decipher Codex pages.
  codexPages: (sid) => jsonFetch(`/api/v1/codex/pages?session_id=${encodeURIComponent(sid || '')}`),
  codexDecipher: (sid, pageId, triggerData = {}) =>
    jsonFetch('/api/v1/codex/decipher', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, page_id: pageId, trigger_data: triggerData }),
    }),
  // Sprint 3 §I (2026-04-27) — Tunic glyph progression (campaign-scope).
  codexGlyphs: (campaignId) =>
    jsonFetch(`/api/codex/glyphs?campaign_id=${encodeURIComponent(campaignId || '')}`),
  codexGlyphIncrement: (campaignId, event, delta = 1) =>
    jsonFetch('/api/codex/glyphs/increment', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: campaignId, event, delta }),
    }),
  codexGlyphPage: (campaignId, pageId) =>
    jsonFetch(
      `/api/codex/page/${encodeURIComponent(pageId)}?campaign_id=${encodeURIComponent(campaignId || '')}`,
    ),
  commitRound: (sid, autoResolve = true) =>
    jsonFetch('/api/session/commit-round', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, auto_resolve: autoResolve }),
    }),
  vc: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/vc`),
  // Sprint 8 (Surface-DEAD #1): predict_combat hover preview.
  predict: (sid, actorId, targetId) =>
    jsonFetch('/api/session/predict', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, actor_id: actorId, target_id: targetId }),
    }),
  // Sprint 9 (Surface-DEAD #5): objective HUD live evaluation.
  objective: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/objective`),
  thoughts: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/thoughts`),
  // Sprint 6 (P4 Disco Tier S #9): explicit aliases + research/forget helpers.
  thoughtsList: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/thoughts`),
  thoughtsResearch: (sid, unitId, thoughtId, mode = 'rounds') =>
    jsonFetch(`/api/session/${encodeURIComponent(sid)}/thoughts/research`, {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, thought_id: thoughtId, mode }),
    }),
  thoughtsForget: (sid, unitId, thoughtId) =>
    jsonFetch(`/api/session/${encodeURIComponent(sid)}/thoughts/forget`, {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, thought_id: thoughtId }),
    }),
  // Skiv Goal 3 — thoughts ritual choice UI (P4 agency, Disco extension).
  // candidates: GET top-N ranked-by-vcSnapshot list pre-internalization.
  // ritualOpen: alias kept for potential future server-side staging hook.
  // ritualPick: irreversible pick → reuses /thoughts/research with mode=rounds.
  thoughtsCandidates: (sid, unitId, top = 3) =>
    jsonFetch(
      `/api/session/${encodeURIComponent(sid)}/thoughts/candidates?unit_id=${encodeURIComponent(
        unitId,
      )}&top=${encodeURIComponent(String(top))}`,
    ),
  thoughtsRitualOpen: (sid, unitId, top = 3) =>
    jsonFetch(
      `/api/session/${encodeURIComponent(sid)}/thoughts/candidates?unit_id=${encodeURIComponent(
        unitId,
      )}&top=${encodeURIComponent(String(top))}`,
    ),
  thoughtsRitualPick: (sid, unitId, thoughtId) =>
    jsonFetch(`/api/session/${encodeURIComponent(sid)}/thoughts/research`, {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, thought_id: thoughtId, mode: 'rounds' }),
    }),
  // Skiv Goal 4 — legacy death mutation choice ritual (P2 cross-gen agency).
  // Allenatore picks subset of applied_mutations to leave to next generation.
  // Backend propagates filtered subset + returns narrative beat (bond hearts
  // delta + Skiv canonical voice line). Default behavior preserved if caller
  // passes mutationsToLeave === all applied_mutations (back-compat).
  legacyRitualSubmit: (sid, unitId, mutationsToLeave, extra = {}) =>
    jsonFetch('/api/v1/lineage/legacy-ritual', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sid,
        unit_id: unitId,
        mutationsToLeave: Array.isArray(mutationsToLeave) ? mutationsToLeave : [],
        species_id: extra.species_id || extra.speciesId || null,
        biome_id: extra.biome_id || extra.biomeId || null,
        legacyUnit: extra.legacyUnit || null,
      }),
    }),
  replay: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/replay`),
  modulations: () => jsonFetch('/api/party/modulations'),
  partyConfig: () => jsonFetch('/api/party/config'),
  // M10 Phase D — Campaign API
  // V1 Onboarding Phase B — optional initialTraitChoice (option_a|b|c)
  campaignStart: (playerId, campaignDefId = 'default_campaign_mvp', initialTraitChoice = null) =>
    jsonFetch('/api/campaign/start', {
      method: 'POST',
      body: JSON.stringify({
        player_id: playerId,
        campaign_def_id: campaignDefId,
        ...(initialTraitChoice ? { initial_trait_choice: initialTraitChoice } : {}),
      }),
    }),
  campaignSummary: (id) => jsonFetch(`/api/campaign/summary?id=${encodeURIComponent(id)}`),
  campaignAdvance: (id, outcome, peEarned = 0, piEarned = 0, extra = {}) =>
    jsonFetch('/api/campaign/advance', {
      method: 'POST',
      body: JSON.stringify({
        id,
        outcome,
        pe_earned: peEarned,
        pi_earned: piEarned,
        ...extra,
      }),
    }),
  campaignChoose: (id, branchKey) =>
    jsonFetch('/api/campaign/choose', {
      method: 'POST',
      body: JSON.stringify({ id, branch_key: branchKey }),
    }),
  campaignEnd: (id, finalState = 'abandoned') =>
    jsonFetch('/api/campaign/end', {
      method: 'POST',
      body: JSON.stringify({ id, final_state: finalState }),
    }),
  campaignList: (playerId) =>
    jsonFetch(`/api/campaign/list?player_id=${encodeURIComponent(playerId)}`),
  // M12 Phase A+B+C — Forms / evolution engine.
  formsRegistry: () => jsonFetch('/api/v1/forms/registry'),
  formsGet: (id) => jsonFetch(`/api/v1/forms/${encodeURIComponent(id)}`),
  formsEvaluate: (body) =>
    jsonFetch('/api/v1/forms/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  formsOptions: (body) =>
    jsonFetch('/api/v1/forms/options', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  formsEvolve: (body) =>
    jsonFetch('/api/v1/forms/evolve', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  formsSessionList: (sid) => jsonFetch(`/api/v1/forms/session/${encodeURIComponent(sid)}`),
  formsSessionGet: (sid, unitId) =>
    jsonFetch(`/api/v1/forms/session/${encodeURIComponent(sid)}/${encodeURIComponent(unitId)}`),
  formsSessionSeed: (sid, unitId, body) =>
    jsonFetch(
      `/api/v1/forms/session/${encodeURIComponent(sid)}/${encodeURIComponent(unitId)}/seed`,
      {
        method: 'POST',
        body: JSON.stringify(body || {}),
      },
    ),
  formsSessionEvolve: (sid, unitId, body) =>
    jsonFetch(
      `/api/v1/forms/session/${encodeURIComponent(sid)}/${encodeURIComponent(unitId)}/evolve`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),
  formsSessionClear: (sid) =>
    jsonFetch(`/api/v1/forms/session/${encodeURIComponent(sid)}`, {
      method: 'DELETE',
    }),
  formsPackRoll: (body) =>
    jsonFetch('/api/v1/forms/pack/roll', {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  formsPackCosts: () => jsonFetch('/api/v1/forms/pack/costs'),
  // M13 P3 — Progression
  progressionRegistry: () => jsonFetch('/api/v1/progression/registry'),
  progressionJobPerks: (jobId) =>
    jsonFetch(`/api/v1/progression/jobs/${encodeURIComponent(jobId)}/perks`),
  progressionGet: (unitId, campaignId = null) => {
    const qs = campaignId ? `?campaign_id=${encodeURIComponent(campaignId)}` : '';
    return jsonFetch(`/api/v1/progression/${encodeURIComponent(unitId)}${qs}`);
  },
  progressionSeed: (unitId, body) =>
    jsonFetch(`/api/v1/progression/${encodeURIComponent(unitId)}/seed`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  progressionGrantXp: (unitId, body) =>
    jsonFetch(`/api/v1/progression/${encodeURIComponent(unitId)}/xp`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  progressionPickPerk: (unitId, body) =>
    jsonFetch(`/api/v1/progression/${encodeURIComponent(unitId)}/pick`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  progressionEffective: (unitId, campaignId = null) => {
    const qs = campaignId ? `?campaign_id=${encodeURIComponent(campaignId)}` : '';
    return jsonFetch(`/api/v1/progression/${encodeURIComponent(unitId)}/effective${qs}`);
  },
  progressionClearCampaign: (campaignId) =>
    jsonFetch(`/api/v1/progression/campaign/${encodeURIComponent(campaignId)}`, {
      method: 'DELETE',
    }),
  // M17 Co-op — run + character + world + debrief + combat end
  coopRunStart: (code, hostToken, scenarioStack = ['enc_tutorial_01']) =>
    jsonFetch('/api/coop/run/start', {
      method: 'POST',
      body: JSON.stringify({ code, host_token: hostToken, scenario_stack: scenarioStack }),
    }),
  coopCharacterCreate: (code, playerId, playerToken, spec) =>
    jsonFetch('/api/coop/character/create', {
      method: 'POST',
      body: JSON.stringify({
        code,
        player_id: playerId,
        player_token: playerToken,
        ...spec,
      }),
    }),
  coopState: (code) => jsonFetch(`/api/coop/state?code=${encodeURIComponent(code)}`),
  coopWorldConfirm: (code, hostToken, scenarioId) =>
    jsonFetch('/api/coop/world/confirm', {
      method: 'POST',
      body: JSON.stringify({ code, host_token: hostToken, scenario_id: scenarioId }),
    }),
  coopWorldVote: (code, playerId, playerToken, scenarioId, accept = true) =>
    jsonFetch('/api/coop/world/vote', {
      method: 'POST',
      body: JSON.stringify({
        code,
        player_id: playerId,
        player_token: playerToken,
        scenario_id: scenarioId,
        accept,
      }),
    }),
  coopDebriefChoice: (code, playerId, playerToken, choice) =>
    jsonFetch('/api/coop/debrief/choice', {
      method: 'POST',
      body: JSON.stringify({
        code,
        player_id: playerId,
        player_token: playerToken,
        choice,
      }),
    }),
  coopCombatEnd: (code, hostToken, payload = {}) =>
    jsonFetch('/api/coop/combat/end', {
      method: 'POST',
      body: JSON.stringify({ code, host_token: hostToken, ...payload }),
    }),
  // OD-001 Path A V3 Mating/Nido — 7 endpoint /api/meta/* (2026-04-26).
  metaNpgList: () => jsonFetch('/api/meta/npg'),
  metaAffinity: (npc_id, delta) =>
    jsonFetch('/api/meta/affinity', {
      method: 'POST',
      body: JSON.stringify({ npc_id, delta }),
    }),
  metaTrust: (npc_id, delta) =>
    jsonFetch('/api/meta/trust', {
      method: 'POST',
      body: JSON.stringify({ npc_id, delta }),
    }),
  // OD-001 Path A Sprint B (2026-04-26): debrief recruit wire.
  // Optional sourceSessionId + affinityAtRecruit unlock Wildermyth-style
  // direct recruit from debrief (defeated enemy → ally) bypassing the
  // affinity grind gate when affinityAtRecruit >= 1.
  metaRecruit: (npc_id, sourceSessionId = null, affinityAtRecruit = null) =>
    jsonFetch('/api/meta/recruit', {
      method: 'POST',
      body: JSON.stringify({
        npc_id,
        ...(sourceSessionId ? { source_session_id: sourceSessionId } : {}),
        ...(affinityAtRecruit !== null &&
        affinityAtRecruit !== undefined &&
        Number.isFinite(Number(affinityAtRecruit))
          ? { affinity_at_recruit: Number(affinityAtRecruit) }
          : {}),
      }),
    }),
  metaMating: (npc_id, party_member) =>
    jsonFetch('/api/meta/mating', {
      method: 'POST',
      body: JSON.stringify({ npc_id, party_member }),
    }),
  metaNestGet: () => jsonFetch('/api/meta/nest'),
  metaNestSetup: (biome, requirements_met = true) =>
    jsonFetch('/api/meta/nest/setup', {
      method: 'POST',
      body: JSON.stringify({ biome, requirements_met }),
    }),
  // OD-001 Path A Sprint D — lineage chain + tribe emergent (2026-04-26).
  // Tribe = lineage_id with >= 3 members (emergent from mating chain).
  metaLineageChain: (lineageId) => jsonFetch(`/api/meta/lineage/${encodeURIComponent(lineageId)}`),
  metaTribesEmergent: () => jsonFetch('/api/meta/tribes'),
  metaTribeForUnit: (unitId) => jsonFetch(`/api/meta/tribe/unit/${encodeURIComponent(unitId)}`),
  // QW-3 Spore Moderate — mutation registry/eligible/apply/bingo client.
  mutationsRegistry: () => jsonFetch('/api/v1/mutations/registry'),
  mutationsEligible: (unit) =>
    jsonFetch('/api/v1/mutations/eligible', { method: 'POST', body: JSON.stringify({ unit }) }),
  mutationsApply: (unit, mutation_id, session_id = null) =>
    jsonFetch('/api/v1/mutations/apply', {
      method: 'POST',
      body: JSON.stringify({ unit, mutation_id, session_id }),
    }),
  mutationsBingo: (unit) =>
    jsonFetch('/api/v1/mutations/bingo', { method: 'POST', body: JSON.stringify({ unit }) }),
  // Action 6 (ADR-2026-04-28 §Action 6) — Ambition long-arc campaign API.
  ambitionsActive: (sid) =>
    jsonFetch(`/api/campaign/ambitions/active?session_id=${encodeURIComponent(sid)}`),
  ambitionSeed: (sid, ambitionId) =>
    jsonFetch(`/api/campaign/ambitions/${encodeURIComponent(ambitionId)}/seed`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  ambitionProgress: (sid, ambitionId, encounterId, outcome) =>
    jsonFetch(`/api/campaign/ambitions/${encodeURIComponent(ambitionId)}/progress`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, encounter_id: encounterId, outcome }),
    }),
  ambitionChoiceRitual: (sid, ambitionId, choice, bondHearts = 0) =>
    jsonFetch(`/api/campaign/ambitions/${encodeURIComponent(ambitionId)}/choice-ritual`, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sid,
        choice,
        bond_hearts: Number(bondHearts) || 0,
      }),
    }),
  // Skiv-as-Monitor — git-event-driven creature feed (Phase 2 wire 2026-04-25).
  skivStatus: () => jsonFetch('/api/skiv/status'),
  skivFeed: (limit = 20) => jsonFetch(`/api/skiv/feed?limit=${encodeURIComponent(limit)}`),
  // /api/skiv/card returns text/plain ASCII; bypass jsonFetch json parse.
  skivCard: async () => {
    try {
      const res = await fetch('/api/skiv/card', { cache: 'no-store' });
      if (!res.ok) return { ok: false, status: res.status, text: '', networkError: false };
      const text = await res.text();
      return { ok: true, status: res.status, text };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        text: '',
        networkError: true,
        errorMessage: err?.message || String(err),
      };
    }
  },
};
