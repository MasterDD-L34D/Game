// Sprint 13 — Status engine wave A: passive ancestor trait wire.
//
// Engine LIVE (consumer side): apps/backend/services/combat/statusModifiers.js
// computeStatusModifiers + applyTurnRegen handle 7 statuses (linked, fed,
// healing, attuned, sensed, telepatic_link, frenzy) when unit.status[X] > 0.
//
// Surface DEAD (producer side): passive ancestor traits with `action_type:
// passive` are SKIPPED in passesBasicTriggers (traitEffects.js:226). Their
// effect.kind=apply_status entries never fire → unit.status[stato] stays 0
// → consumer machinery sees nothing → 297 ancestor batch ROI dead.
//
// This module wires the producer side: scan unit.traits, find passive
// apply_status entries, set unit.status[stato] to a sustained turn count.
// Idempotent + applies_to-aware (actor/target/passive). Called at session
// /start (initial wave) + at end-of-round (refresh wave for new traits
// gained mid-encounter via mating/lineage/recruit/evolve).
//
// Allowlist: only the 7 canonical statuses below are surfaced runtime.
// Other statuses can be authored in YAML but stay dormant until consumer
// wired in statusModifiers.js (next wave).

'use strict';

// 7 canonical statuses with consumer wired in statusModifiers.js (Wave A).
// Source: comment block at active_effects.yaml line 3286-3291.
const WAVE_A_STATUSES = new Set([
  'linked',
  'fed',
  'healing',
  'attuned',
  'sensed',
  'telepatic_link',
  'frenzy',
]);

// Statuses excluded from passive auto-apply: meant to be triggered only
// (rage variants, transient combat reactions). Even if YAML authors a
// passive ancestor with `effect.stato: frenzy`, this applier skips it
// to preserve canonical balance (frenzy = 2 turns rage, not always-on).
const PASSIVE_BLOCKLIST = new Set(['frenzy']);

// Default refresh value when YAML doesn't specify turns. Keeps passive
// effectively-permanent (decay loop in sessionRoundBridge decrements 1/turn,
// but 99 outlives any normal encounter ~10-20 rounds).
const PASSIVE_DEFAULT_TURNS = 99;

/**
 * Pure: collect canonical trait IDs from a unit. Tolerates traits as either
 * string array OR object array with .id field. Filters empties.
 */
function collectTraitIds(unit) {
  if (!unit || typeof unit !== 'object') return [];
  const raw = Array.isArray(unit.traits) ? unit.traits : [];
  const ids = [];
  for (const t of raw) {
    if (typeof t === 'string' && t.length > 0) ids.push(t);
    else if (t && typeof t === 'object' && typeof t.id === 'string' && t.id.length > 0) {
      ids.push(t.id);
    }
  }
  return ids;
}

/**
 * Pure: given a trait definition, returns the passive-status spec OR null
 * if the trait isn't a passive apply_status entry for a Wave A status.
 *
 * @param {object} definition Trait registry entry
 * @returns {{stato: string, turns: number, applies_to: string} | null}
 */
function passiveStatusSpec(definition) {
  if (!definition || typeof definition !== 'object') return null;
  const trigger = definition.trigger || {};
  if (trigger.action_type !== 'passive') return null;
  const effect = definition.effect || {};
  if (effect.kind !== 'apply_status') return null;
  const stato = String(effect.stato || '').trim();
  if (!stato || !WAVE_A_STATUSES.has(stato)) return null;
  if (PASSIVE_BLOCKLIST.has(stato)) return null;
  const turns = Number(effect.turns);
  return {
    stato,
    turns: Number.isFinite(turns) && turns > 0 ? turns : PASSIVE_DEFAULT_TURNS,
    applies_to: String(definition.applies_to || effect.target || 'actor'),
  };
}

/**
 * Apply passive ancestor statuses to a single unit. Mutates unit.status
 * in place. Refreshes existing values upward (max policy) so re-application
 * doesn't kill ongoing decay; never overrides a higher remaining count.
 *
 * Note: applies_to filter
 *   - 'actor'  / 'self' → applies to the unit owning the trait
 *   - 'target'           → still applied to self (passive permanent buff
 *                          modeled as self-status; defender-side effect
 *                          handled by computeStatusModifiers reading
 *                          target.status)
 *
 * @param {object} unit     Unit with traits array and (optional) status obj.
 * @param {object} registry Trait definition map (id → definition).
 * @returns {Array<{unit_id, trait, stato, turns_set, source}>}
 */
function applyPassiveAncestors(unit, registry) {
  if (!unit || typeof unit !== 'object' || !registry || typeof registry !== 'object') return [];
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  const events = [];
  const traitIds = collectTraitIds(unit);
  for (const traitId of traitIds) {
    const definition = registry[traitId];
    const spec = passiveStatusSpec(definition);
    if (!spec) continue;
    const current = Number(unit.status[spec.stato] || 0);
    if (current >= spec.turns) continue; // already at-or-above target — no-op
    unit.status[spec.stato] = spec.turns;
    events.push({
      unit_id: unit.id || null,
      trait: traitId,
      stato: spec.stato,
      turns_set: spec.turns,
      source: 'passive_ancestor',
    });
  }
  return events;
}

/**
 * Apply to all units in a roster. Useful at session /start + at round-end
 * (refresh after lineage/recruit/evolve mid-encounter).
 *
 * @param {Array} units    Session unit roster
 * @param {object} registry Trait definition map
 * @returns {Array<{unit_id, trait, stato, turns_set, source}>}
 */
function applyPassiveAncestorsToRoster(units, registry) {
  if (!Array.isArray(units)) return [];
  const events = [];
  for (const unit of units) {
    const result = applyPassiveAncestors(unit, registry);
    if (result.length > 0) events.push(...result);
  }
  return events;
}

module.exports = {
  applyPassiveAncestors,
  applyPassiveAncestorsToRoster,
  passiveStatusSpec,
  collectTraitIds,
  WAVE_A_STATUSES,
  PASSIVE_BLOCKLIST,
  PASSIVE_DEFAULT_TURNS,
};
