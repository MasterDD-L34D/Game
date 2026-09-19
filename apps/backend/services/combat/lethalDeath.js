// =============================================================================
// SPEC-J slice 1 -- lethal consent + death model.
//
// Spec: docs/design/evo-tactics-lethal-wounds-rituals.md (sez. 3, 5, 7; forks
// J1/J4/J5 ratified 2026-06-08, all opzione A; J2 closed by canon point-9).
//
// Default = SOFT-DEATH: a KO is NOT permadeath. The creature falls and recovers
// (the wound-roll on KO -> `grave` scar is already LIVE in woundSystem; SPEC-J
// does not touch it). A real death only happens when ALL of these hold:
//   1. LETHAL_MISSIONS_ENABLED === 'true'  (master kill switch, default OFF);
//   2. the mission is flagged lethal        (per-mission gate, default off, point-9);
//   3. per-player device consent is granted (SPEC-K 6.4 -- produced by the PR2
//      consent state-machine; ABSENT today -> falsy -> anti-deadlock soft fallback);
//   4. it is a KO of a real player creature  (minions are expendable, B5).
//
// This module is PURE of I/O: it decides the outcome and mutates the fallen
// unit's state. The chronicle `creature_fell` emission (failure-as-lore J5 +
// SPEC-D death beat) happens at the wire site so this stays unit-testable.
//
// Band impact: with the kill switch unset, resolveKoOutcome ALWAYS returns
// `soft` -> zero behavior change vs today (verify-first band-neutral by
// construction, no new sim path reached).
// =============================================================================

'use strict';

/**
 * Master kill switch. Opt-in (default OFF) -- opposite polarity to woundSystem's
 * opt-out, because lethal death is new + irreversible-in-fiction (a dead creature
 * leaves the roster). Flip = master-dd, only after the PR2 consent state-machine
 * is live and a lethal-mission N=40 / playtest sign-off.
 */
function isLethalEnabled() {
  return process.env.LETHAL_MISSIONS_ENABLED === 'true';
}

/**
 * Per-mission lethal gate (point-9: lethal is a property of the mission/node).
 * Strict boolean -- no string coercion, so a stray `lethal: 'false'` can never
 * arm a lethal mission by accident.
 */
function isMissionLethal(session) {
  return !!(session && session.lethal === true);
}

/**
 * Pure decision: does this KO produce a real death or the default soft-death?
 * Order of guards is the spec's fail-closed chain (any unmet condition -> soft).
 *
 * @param unit  the KO'd unit
 * @param ctx   { missionLethal:boolean, consentGranted:boolean, isKo:boolean }
 * @returns {{ outcome: 'soft'|'death', reason: string }}
 */
function resolveKoOutcome(unit, ctx = {}) {
  const { missionLethal = false, consentGranted = false, isKo = false } = ctx;
  if (!unit || typeof unit !== 'object') return { outcome: 'soft', reason: 'no_unit' };
  if (!isKo) return { outcome: 'soft', reason: 'not_ko' };
  if (unit.controlled_by !== 'player' || unit.is_minion) {
    return { outcome: 'soft', reason: 'not_player' };
  }
  if (!isLethalEnabled()) return { outcome: 'soft', reason: 'lethal_disabled' };
  if (!missionLethal) return { outcome: 'soft', reason: 'mission_not_lethal' };
  if (!consentGranted) return { outcome: 'soft', reason: 'no_consent' };
  return { outcome: 'death', reason: 'lethal_consented' };
}

/**
 * State change for a real death: the creature leaves the active roster. Mutates
 * the unit (fallen flag + hp 0 + alive false) and returns a public descriptor
 * for the failure-as-lore chronicle event (J5) / succession trigger (SPEC-E E2).
 * Idempotent + never throws (combat must not break on a death-bookkeeping slip).
 *
 * @param unit  the unit that fell
 * @param opts  { encounter_id?, turn? } -- context for the descriptor
 * @returns {{ fallen:boolean, already_fallen?:boolean, creature_id?, creature_name?,
 *             species_id?, biome_id?, lineage_id?, encounter_id?, turn? }}
 */
function markCreatureFallen(unit, opts = {}) {
  if (!unit || typeof unit !== 'object' || !unit.id) return { fallen: false };
  const alreadyFallen = !!unit.fallen;
  // Codex #2789 P2: the canonical marker is TOP-LEVEL (`unit.fallen`), NOT under
  // `unit.status`. syncStatusesFromRoundState (sessionRoundBridge) rebuilds
  // `unit.status` from the orchestrator status list and only whitelists
  // wounds/wounded_perma, so a `status.fallen` would be wiped after the next
  // round sync. Top-level unit fields are never rebuilt and publicSessionView
  // spreads `...u`, so clients + later consumers see `fallen`.
  unit.fallen = true;
  unit.alive = false;
  unit.hp = 0;
  const desc = {
    fallen: true,
    creature_id: unit.id,
    creature_name: unit.name || null,
    species_id: unit.species_id || null,
    biome_id: unit.biome_id || null,
    lineage_id: unit.lineage_id || null,
    encounter_id: opts.encounter_id || null,
    turn: Number.isFinite(Number(opts.turn)) ? Number(opts.turn) : null,
  };
  if (alreadyFallen) desc.already_fallen = true;
  return desc;
}

/**
 * Per-player device consent (SPEC-K 6.4). Shape produced by the PR2 consent
 * state-machine: `session.lethalConsent = { granted: boolean, ... }`. ABSENT
 * today -> falsy -> anti-deadlock soft fallback (sez. 5: fallback default = NON
 * parte lethal). Strict `=== true` so a half-built consent object never arms.
 */
function isConsentGranted(session) {
  return !!(session && session.lethalConsent && session.lethalConsent.granted === true);
}

/**
 * Resolve the encounter id for death provenance. Codex #2789 P2: /api/session/start
 * loads the YAML payload into `session.encounter` but never assigns
 * `session.encounter_id`, so reading that field alone yields null for YAML
 * encounters. Fall back to the stored payload's `encounter_id` / `id`.
 */
function resolveEncounterId(session) {
  if (!session || typeof session !== 'object') return null;
  if (session.encounter_id) return session.encounter_id;
  const enc = session.encounter;
  if (enc && typeof enc === 'object') return enc.encounter_id || enc.id || null;
  return null;
}

/**
 * Thin wire orchestrator, called from the combat KO path (routes/session.js,
 * right after maybeApplyCombatWound). Decides soft-death vs real death for a unit
 * that just dropped to <=0 HP and, on death, mutates the unit (fallen) + emits
 * the `creature_death` chronicle event (failure-as-lore J5 / succession trigger).
 *
 * Default-OFF + no consent producer today -> always returns `soft` -> the death
 * branch is never reached in current play (band-neutral by construction).
 *
 * The chronicle emit is best-effort (its own try/catch): a chronicle slip never
 * un-does the death nor breaks combat. The emitter is injectable for tests.
 *
 * @param target  the unit that took the hit
 * @param session combat session ({ lethal, lethalConsent, campaign_id, ... })
 * @param deps    { emitCreatureFell? } -- test injection
 * @returns {{ outcome:'soft'|'death', reason:string, fallen?:boolean }}
 */
function applyLethalKoIfDead(target, session, deps = {}) {
  if (!target || typeof target !== 'object' || Number(target.hp || 0) > 0) {
    return { outcome: 'soft', reason: 'not_ko' };
  }
  const outcome = resolveKoOutcome(target, {
    missionLethal: isMissionLethal(session),
    consentGranted: isConsentGranted(session),
    isKo: true,
  });
  if (outcome.outcome !== 'death') return outcome;
  const desc = markCreatureFallen(target, {
    encounter_id: resolveEncounterId(session),
    turn: session && session.turn,
  });
  try {
    const emit =
      deps.emitCreatureFell || require('../chronicle/chronicleEmitters').emitCreatureFell;
    emit({
      campaign_id: session && session.campaign_id,
      creature_id: desc.creature_id,
      creature_name: desc.creature_name,
      species_id: desc.species_id,
      biome_id: desc.biome_id || (session && session.biome_id) || null,
      lineage_id: desc.lineage_id,
      encounter_id: desc.encounter_id,
      turn: desc.turn,
    });
  } catch {
    /* chronicle best-effort -- a slip never un-does the death */
  }
  return { outcome: 'death', reason: outcome.reason, fallen: true };
}

module.exports = {
  isLethalEnabled,
  isMissionLethal,
  isConsentGranted,
  resolveKoOutcome,
  markCreatureFallen,
  applyLethalKoIfDead,
};
