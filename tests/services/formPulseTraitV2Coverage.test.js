'use strict';

// Form-Pulse trait v2 -- COVERAGE + cap-tier enforcement gate (spec 2026-06-23, PROPOSED).
// Plan: docs/planning/2026-06-23-aa01-form-pulse-trait-v2-coverage-matrix.md
//
// This is the master-dd ratify-condition gate for FORM_PULSE_TRAIT_V2_ENABLED: it locks the
// branco + minor pools against the engine-INERT / near-inert regression that the PR #2992 harsh
// review caught on the minor pool (and that the coverage audit then caught on 3 more poles the
// review missed). It enforces:
//   1. every branco + minor id EXISTS in active_effects.yaml,
//   2. every id is ENGINE-LIVE-RELIABLE (real runtime consumer, not elevation-near-inert, and
//      applies_to/kind side-consistent -- dr only target-side, extra_damage only actor-side),
//   3. CAP-TIER: every MINOR id is T1 (the minor stays "genuinely minor"),
//   4. branco and minor pools are disjoint (the minor is never a 2nd branco-combat trait),
//   5. the predicate actually discriminates -- the 4 OLD broken picks FAIL it.
//
// `isEngineLiveReliable` MIRRORS the engine's LIVE surface as of 2026-06-23. Sources of truth:
//   - apps/backend/services/traitEffects.js passesBasicTriggers (line ~307): rejects any
//     trigger.action_type !== 'attack'; evaluateSingleTrait handles extra_damage / attack_bonus /
//     damage_reduction / heal / apply_status (deferred) / triggers_on_ally_attack (deferred).
//   - evaluateMovementTraits: action_type 'movement' + buff_stat move_bonus.
//   - combat/passiveStatusApplier.js: action_type 'passive' + apply_status, Wave-A statuses only.
//   - There is NO consumer for action_type:passive + buff_stat (the inert class) and elevation
//     (`requires: posizione_sopraelevata`) fires ~never on flat maps (near-inert).
// If the engine later wires passive buff_stat, update this mirror in the SAME change.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROPOSED_BRANCO_TRAIT_MAPPING,
  PROPOSED_MINOR_TRAIT_MAPPING,
} = require('../../apps/backend/services/identity/brancoTraitEmergence');
const { loadActiveTraitRegistry } = require('../../apps/backend/services/traitEffects');
const { WAVE_A_STATUSES } = require('../../apps/backend/services/combat/passiveStatusApplier');

const SILENT = { log() {}, warn() {} };
const registry = loadActiveTraitRegistry(undefined, SILENT);

const ATTACK_LIVE_KINDS = new Set([
  'extra_damage',
  'attack_bonus',
  'damage_reduction',
  'apply_status',
  'heal',
]);

// Returns true iff `def` has a real runtime consumer AND is not elevation-near-inert.
function isEngineLiveReliable(def) {
  if (!def || typeof def !== 'object') return false;
  // (a) reactive ally-attack reactor (beastBondReaction) -- no effect.kind, top-level data.
  if (def.triggers_on_ally_attack) return true;
  const trigger = def.trigger || {};
  const effect = def.effect || {};
  const at = trigger.action_type;
  // (b) attack pipeline (action_type undefined or 'attack'), excluding elevation near-inert.
  if (at === undefined || at === 'attack') {
    if (trigger.requires === 'posizione_sopraelevata') return false; // fires ~never on flat maps
    if (!ATTACK_LIVE_KINDS.has(effect.kind)) return false;
    // applies_to/kind side consistency: evaluateAttackTraits consumes damage_reduction ONLY on the
    // target side and extra_damage/attack_bonus/heal ONLY on the actor side, so a kind/side mismatch
    // is engine-inert. apply_status fires from either side (evaluateStatusTraits scans both).
    const appliesTo = def.applies_to || 'actor';
    if (effect.kind === 'damage_reduction') return appliesTo === 'target';
    if (
      effect.kind === 'extra_damage' ||
      effect.kind === 'attack_bonus' ||
      effect.kind === 'heal'
    ) {
      return appliesTo === 'actor';
    }
    return true; // apply_status
  }
  // (c) movement pipeline (evaluateMovementTraits) -- only buff_stat move_bonus is wired.
  if (at === 'movement') return effect.kind === 'buff_stat' && effect.stat === 'move_bonus';
  // (d) passive apply_status, Wave-A statuses only (passiveStatusApplier).
  if (at === 'passive') return effect.kind === 'apply_status' && WAVE_A_STATUSES.has(effect.stato);
  // anything else (incl. action_type:passive + buff_stat = the inert class) has NO consumer.
  return false;
}

function poolIds(mapping) {
  return Object.values(mapping).flatMap((p) => [p['+'], p['-']]);
}

const BRANCO_IDS = poolIds(PROPOSED_BRANCO_TRAIT_MAPPING);
const MINOR_IDS = poolIds(PROPOSED_MINOR_TRAIT_MAPPING);

test('coverage: every branco + minor id EXISTS in active_effects.yaml', () => {
  for (const id of [...BRANCO_IDS, ...MINOR_IDS]) {
    assert.ok(registry[id], `trait ${id} must exist in active_effects.yaml`);
  }
});

test('coverage: every branco id is ENGINE-LIVE-RELIABLE (no inert / elevation-near-inert)', () => {
  for (const id of BRANCO_IDS) {
    assert.ok(
      isEngineLiveReliable(registry[id]),
      `branco trait ${id} must be engine-live-reliable`,
    );
  }
});

test('coverage: every minor id is ENGINE-LIVE-RELIABLE', () => {
  for (const id of MINOR_IDS) {
    assert.ok(isEngineLiveReliable(registry[id]), `minor trait ${id} must be engine-live-reliable`);
  }
});

test('CAP-TIER: every minor id is T1 (the minor stays genuinely minor)', () => {
  for (const id of MINOR_IDS) {
    assert.equal(registry[id].tier, 'T1', `minor trait ${id} must be T1 (cap-tier)`);
  }
});

test('branco and minor pools are DISJOINT (minor never a 2nd branco-combat trait)', () => {
  const branco = new Set(BRANCO_IDS);
  for (const id of MINOR_IDS) {
    assert.ok(!branco.has(id), `minor id ${id} must not reuse a branco id`);
  }
});

test('predicate DISCRIMINATES: the 4 OLD broken picks fail isEngineLiveReliable', () => {
  // These were the inert/near-inert picks the coverage audit replaced. The guard must reject them,
  // else it gives false confidence.
  for (const id of [
    'mimetismo_cromatico_passivo', // branco I  -- passive buff_stat = inert
    'empatia_coordinativa', //         branco F  -- passive buff_stat = inert
    'comunicazione_fotonica_coda_coda', // minor F -- passive buff_stat = inert
    'zampe_a_molla', //                branco Agile -- requires posizione_sopraelevata = near-inert
  ]) {
    assert.ok(registry[id], `${id} should still exist in the catalog`);
    assert.equal(
      isEngineLiveReliable(registry[id]),
      false,
      `${id} must FAIL the live-reliable gate`,
    );
  }
});
