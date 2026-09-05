// 2026-05-30 P4 debrief wire — Engine LIVE / Surface DEAD fix.
//
// phaseCoordinator.js reads `bridge.lastDebrief` and routes it to the debrief
// panel P4 setters, but nothing in apps/play ever WROTE `bridge.lastDebrief`,
// so the backend debrief (ennea_voices / inner_voices / conviction_badges /
// ennea archetypes / narrative_event / mating_eligibles) stayed hidden in real
// play. This module owns the two pure halves of the wire so they stay unit
// testable — phaseCoordinator.js imports CSS and cannot load under node:test.
//
//   - pipeDebriefToPanel: route a debrief payload to the panel setters
//   - cacheDebriefOnBridge: write bridge.lastDebrief from a WS / response payload
//
// Payload shape = rewardEconomy.buildDebriefSummary() (the /api/session/end
// response.debrief, rebroadcast verbatim as the coop `debrief_payload` WS msg).

/**
 * Route a debrief payload onto the debrief panel API. Idempotent + fail-safe:
 * empty / null fields produce empty-state setter calls so the panel hides the
 * corresponding section instead of showing stale data.
 *
 * @param {object} dbApi   debrief panel api (from wireDebriefPanel)
 * @param {object|null} debriefPayload  buildDebriefSummary output (or null)
 * @param {string|null} playerId  current actor id (gates per-actor ennea archetypes)
 */
export function pipeDebriefToPanel(dbApi, debriefPayload, playerId) {
  if (!dbApi) return;
  const p = debriefPayload && typeof debriefPayload === 'object' ? debriefPayload : null;

  // Surface-DEAD #7 — QBN narrative event (null hides the journal card).
  if (dbApi.setNarrativeEvent) dbApi.setNarrativeEvent(p?.narrative_event || null);

  // Surface-DEAD #4 — mating/lineage eligibles (post-victory pair-bond cards).
  const matingEligibles = Array.isArray(p?.mating_eligibles) ? p.mating_eligibles : [];
  if (dbApi.setLineageEligibles) dbApi.setLineageEligibles(matingEligibles);

  // Ennea archetypes manifested for the current player (per-actor → needs id).
  // vc_summary.per_actor is keyed by the UNIT id, which in coop is
  // `pg_${player_id}` (characterToUnit). The phone bridge only knows the raw
  // player_id, so try the exact id first then the pg_ unit-id form — otherwise
  // real phone clients silently lose the archetype surface.
  const perActor = p?.vc_summary?.per_actor || null;
  const actorVc = playerId ? perActor?.[playerId] || perActor?.[`pg_${playerId}`] : null;
  const enneaArchetypes = actorVc?.ennea_archetypes || null;
  if (dbApi.setEnneaArchetypes) dbApi.setEnneaArchetypes(enneaArchetypes);

  // TKT-P4-ENNEA-VOICE-FRONTEND — 1 diegetic quote per actor.
  const enneaVoices = Array.isArray(p?.ennea_voices) ? p.ennea_voices : [];
  if (dbApi.setEnneaVoices) dbApi.setEnneaVoices(enneaVoices);

  // TKT-P4-DIALOGUE-COLORS — MBTI-tinted inner monologue per actor.
  const innerVoices = Array.isArray(p?.inner_voices) ? p.inner_voices : [];
  if (dbApi.setInnerVoices) dbApi.setInnerVoices(innerVoices);

  // TKT-P4-CONVICTION-BADGES — Triangle Strategy conviction badges (null hides).
  const convictionBadges = p?.mbti_surface?.conviction_badges || null;
  if (dbApi.setConvictionBadges) dbApi.setConvictionBadges(convictionBadges);
}

/**
 * Cache a debrief payload onto the lobby bridge so the phase coordinator can
 * read it when it switches to the debrief phase. Only writes for real object
 * payloads — a null/garbage payload never clobbers a previously cached debrief.
 *
 * @param {object} bridge  lobby bridge
 * @param {object|null} debriefPayload
 * @returns {object|null} the currently cached debrief (after the write)
 */
export function cacheDebriefOnBridge(bridge, debriefPayload) {
  if (!bridge) return null;
  if (debriefPayload && typeof debriefPayload === 'object') {
    bridge.lastDebrief = debriefPayload;
  }
  return bridge.lastDebrief || null;
}
