'use strict';

// Combat parity PART C — `disorient` naming reconcile.
//
// The trait_mechanics.yaml / schema enum + roundOrchestrator + ctBar +
// session.js computeIntentPriority all use the canonical status key
// `disorient`. The session.js performAttack attack-malus path historically
// read the divergent key `disoriented` (and STATUS_DURATION_CAPS / the AI
// debuff-preference readers used `disoriented` too), so a `disorient` status
// applied by the on_hit_status producer (PART A) would NOT trigger the -2
// attack malus. This suite pins the canonical key end to end:
//   1. the on_hit_status helper writes target.status.disorient (canonical);
//   2. session.js production source reads that same canonical key for the
//      attack malus + duration cap (regression guard against re-divergence);
//   3. the AI debuff-preference readers recognize the canonical key.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { applyOnHitStatuses } = require('../../../apps/backend/services/combat/onHitStatus');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SESSION_SRC = fs.readFileSync(
  path.join(REPO_ROOT, 'apps', 'backend', 'routes', 'session.js'),
  'utf8',
);
const POLICY_SRC = fs.readFileSync(
  path.join(REPO_ROOT, 'apps', 'backend', 'services', 'ai', 'policy.js'),
  'utf8',
);
const DECLARE_SRC = fs.readFileSync(
  path.join(REPO_ROOT, 'apps', 'backend', 'services', 'ai', 'declareSistemaIntents.js'),
  'utf8',
);

const MECHANICS = {
  spore_psichiche_silenziate: {
    on_hit_status: { status_id: 'disorient', duration: 2, intensity: 1, trigger_dc: 12 },
  },
};

test('on_hit_status applies the CANONICAL `disorient` key (not `disoriented`)', () => {
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const target = { id: 't1', tier: 1, status: {} };
  // value 0.45 -> roll 10 + tier 1 = 11 < 12 -> save fails -> apply.
  applyOnHitStatuses(actor, target, { rng: () => 0.45, mechanicsRegistry: MECHANICS });
  assert.equal(target.status.disorient, 2, 'canonical disorient key set');
  assert.equal(target.status.disoriented, undefined, 'divergent disoriented key NOT set');
});

test('the applied `disorient` status triggers the -2 attack malus (canonical key read)', () => {
  // Replicate the session.js performAttack attack-malus read using the CANONICAL
  // key, fed by the real producer. If session.js read `disoriented` the applied
  // status would be inert; this asserts the keys agree.
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const target = { id: 't1', tier: 1, status: {} };
  applyOnHitStatuses(actor, target, { rng: () => 0.45, mechanicsRegistry: MECHANICS });
  const disorientPenalty = Number(target.status?.disorient) > 0 ? 2 : 0;
  assert.equal(disorientPenalty, 2, 'disorient active -> -2 attack malus');
});

test('session.js performAttack reads canonical `disorient` for the attack malus', () => {
  // Regression guard: the malus must read actor.status.disorient, never the
  // divergent actor.status.disoriented.
  assert.match(
    SESSION_SRC,
    /actor\.status\?\.disorient\b(?!ed)/,
    'attack malus reads actor.status.disorient',
  );
  assert.doesNotMatch(
    SESSION_SRC,
    /\bdisoriented\b/,
    'no `disoriented` reference remains in session.js',
  );
});

test('STATUS_DURATION_CAPS keys the canonical `disorient`', () => {
  // The duration cap entry must be keyed `disorient` so on_hit_status statuses
  // are capped under the same key they are written/read with.
  // The table moved out of session.js into combat/statusDurationCaps.js: the drain in
  // combat/pendingStatusRemovals.js needs it and cannot import from a route.
  // Assert on the exported object instead of on source text -- stronger, and it no
  // longer breaks when the literal is relocated.
  const {
    STATUS_DURATION_CAPS,
  } = require('../../../apps/backend/services/combat/statusDurationCaps');
  assert.equal(STATUS_DURATION_CAPS.disorient, 1, 'STATUS_DURATION_CAPS has disorient: 1');
  assert.equal(STATUS_DURATION_CAPS.disoriented, undefined, 'no divergent `disoriented` key');
});

test('AI debuff-preference readers recognize the canonical `disorient` key', () => {
  assert.doesNotMatch(POLICY_SRC, /\bdisoriented\b/, 'policy.js uses canonical disorient');
  assert.doesNotMatch(
    DECLARE_SRC,
    /\bdisoriented\b/,
    'declareSistemaIntents.js uses canonical disorient',
  );
  assert.match(POLICY_SRC, /s\.disorient\b(?!ed)/, 'policy.js reads s.disorient');
  assert.match(DECLARE_SRC, /s\.disorient\b(?!ed)/, 'declareSistemaIntents.js reads s.disorient');
});
