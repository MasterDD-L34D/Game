// 2026-04-26 — statusModifiers wire verification.
// Audit balance-illuminator G-04 flagged "computeStatusModifiers wired only
// in single-action path, NOT in round bridge". Verification (grep): wire
// reuses performAttack helper (session.js:369), inherited by all round bridge
// callers (sessionRoundBridge.js:374, 852, 1122). applyTurnRegen wired in
// session.js:1903 + sessionRoundBridge.js:668 (applyEndOfRoundSideEffects).
//
// 68/433 ancestor traits depend on these names (linked/fed/healing/attuned/
// sensed/telepatic_link/frenzy). Tests below pin runtime behavior so future
// refactors cannot silently disconnect them.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeStatusModifiers,
  applyTurnRegen,
  computeWoundedPermaAttackPenalty,
  computeSlowDownPenalty,
  manhattanDistance,
} = require('../../apps/backend/services/combat/statusModifiers');

test('computeStatusModifiers: linked + ally adjacent → +1 attack', () => {
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    status: { linked: 2 },
  };
  const ally = {
    id: 'b',
    controlled_by: 'player',
    position: { x: 1, y: 0 },
    hp: 5,
  };
  const target = { id: 'enemy', controlled_by: 'sistema', status: {} };
  const r = computeStatusModifiers(actor, target, [actor, ally, target]);
  assert.equal(r.attackDelta, 1);
  assert.equal(r.defenseDelta, 0);
});

test('computeStatusModifiers: linked alone (no ally adjacent) → no bonus', () => {
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    status: { linked: 2 },
  };
  const target = { id: 'enemy', controlled_by: 'sistema', status: {} };
  const r = computeStatusModifiers(actor, target, [actor, target]);
  assert.equal(r.attackDelta, 0);
});

test('computeStatusModifiers: sensed → +1 attack', () => {
  const actor = { id: 'a', status: { sensed: 1 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
});

test('computeStatusModifiers: frenzy actor +1 atk, frenzy target -1 def', () => {
  const actor = { id: 'a', status: { frenzy: 2 } };
  const target = { id: 'b', status: { frenzy: 1 } };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
  assert.equal(r.defenseDelta, -1);
});

test('computeStatusModifiers: target attuned → +1 def', () => {
  const actor = { id: 'a', status: {} };
  const target = { id: 'b', status: { attuned: 2 } };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.defenseDelta, 1);
});

// GAP-3 (parity-sweep 2026-06-07) — sbilanciato defense-malus: shield_bash (jobs.yaml)
// writes target.status.sbilanciato but the resolver never read it (Python->Node
// regression; schema combat.schema.json: "sbilanciato -1 defense_mod, 1 turno").
test('computeStatusModifiers: target sbilanciato → -1 def (spinta/shield_bash exposure)', () => {
  const actor = { id: 'a', status: {} };
  const target = { id: 'b', status: { sbilanciato: 1 } };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.defenseDelta, -1);
  assert.ok(r.log.some((e) => e.status === 'sbilanciato' && e.side === 'target'));
});

test('computeStatusModifiers: telepatic_link → reveal log only, no stat', () => {
  const actor = { id: 'a', status: { telepatic_link: 3 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 0);
  assert.equal(r.defenseDelta, 0);
  assert.ok(r.log.some((e) => e.status === 'telepatic_link'));
});

test('applyTurnRegen: fed → +1 hp, cap max_hp', () => {
  const unit = { id: 'a', hp: 5, max_hp: 8, status: { fed: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 6);
});

test('applyTurnRegen: healing → +1 hp', () => {
  const unit = { id: 'a', hp: 3, max_hp: 8, status: { healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 4);
});

test('applyTurnRegen: fed + healing stack (+2 hp)', () => {
  const unit = { id: 'a', hp: 2, max_hp: 8, status: { fed: 2, healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 4);
});

test('applyTurnRegen: caps at max_hp', () => {
  const unit = { id: 'a', hp: 8, max_hp: 8, status: { fed: 2, healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 8);
});

test('applyTurnRegen: KO unit (hp<=0) skipped', () => {
  const unit = { id: 'a', hp: 0, max_hp: 8, status: { fed: 2, healing: 2 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 0);
});

test('applyTurnRegen: status not active (0 turns) → no regen', () => {
  const unit = { id: 'a', hp: 5, max_hp: 8, status: { fed: 0, healing: 0 } };
  applyTurnRegen(unit);
  assert.equal(unit.hp, 5);
});

test('manhattanDistance basic', () => {
  assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 7);
});

// ──────────────────────────────────────────────────────────────────────
// Action 5a — wounded_perma severity 3-tier attack_mod scaling
// ──────────────────────────────────────────────────────────────────────

test('Action 5a: wounded_perma severity light → 0 attack_mod (backward-compat)', () => {
  const unit = {
    id: 'a',
    status: { wounded_perma: { hp_penalty: 1, stacks: 1, severity: 'light' } },
  };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, 0);
  assert.equal(r.severity, 'light');
  assert.equal(r.active, true);
});

test('Action 5a: wounded_perma severity medium → -1 attack_mod', () => {
  const unit = {
    id: 'a',
    status: { wounded_perma: { hp_penalty: 2, stacks: 2, severity: 'medium' } },
  };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, -1);
  assert.equal(r.severity, 'medium');
});

test('Action 5a: wounded_perma severity severe → -2 attack_mod', () => {
  const unit = {
    id: 'a',
    status: { wounded_perma: { hp_penalty: 3, stacks: 3, severity: 'severe' } },
  };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, -2);
  assert.equal(r.severity, 'severe');
});

test('Action 5a: wounded_perma absent severity field → default light (NO regression)', () => {
  // Backward-compat: pre-Action-5a wounded_perma instances had no `severity` field.
  // Expectation: behaves as `light` → 0 penalty (zero surprise difficulty regression).
  const unit = { id: 'a', status: { wounded_perma: { hp_penalty: 1, stacks: 1 } } };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, 0);
  assert.equal(r.severity, 'light');
  assert.equal(r.active, true);
});

test('Action 5a: wounded_perma absent → no penalty + active=false', () => {
  const unit = { id: 'a', status: {} };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, 0);
  assert.equal(r.active, false);
});

test('OD-058 D2: yields to woundSystem when unit.status.wounds present (double-apply guard)', () => {
  // When the new location-based woundSystem carries wounds, the legacy wounded_perma
  // attack penalty must yield (return 0) so attack_mod is NOT penalized by BOTH systems.
  const unit = {
    id: 'a',
    status: {
      wounded_perma: { hp_penalty: 3, stacks: 3, severity: 'severe' },
      wounds: [{ location: 'arti_anteriori', severity: 'grave', stat: 'attack_mod', malus: -2 }],
    },
  };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, 0);
  assert.equal(r.active, false);
  assert.equal(r.superseded, true);
});

test('OD-058 D2: legacy wounded_perma still fires when no woundSystem wounds (empty array)', () => {
  const unit = {
    id: 'a',
    status: { wounded_perma: { hp_penalty: 2, stacks: 2, severity: 'medium' }, wounds: [] },
  };
  const r = computeWoundedPermaAttackPenalty(unit);
  assert.equal(r.penalty, -1);
  assert.equal(r.active, true);
});

test('Action 5a: computeStatusModifiers wires wounded_perma medium into attackDelta', () => {
  const actor = {
    id: 'a',
    status: { wounded_perma: { hp_penalty: 2, stacks: 2, severity: 'medium' } },
  };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, -1);
  assert.ok(r.log.some((e) => e.status === 'wounded_perma' && e.side === 'actor'));
});

test('Action 5a: computeStatusModifiers severe stacks with linked actor (-2 + +1 ally = -1)', () => {
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    status: { linked: 2, wounded_perma: { hp_penalty: 3, stacks: 3, severity: 'severe' } },
  };
  const ally = { id: 'b', controlled_by: 'player', position: { x: 1, y: 0 }, hp: 5 };
  const target = { id: 'enemy', controlled_by: 'sistema', status: {} };
  const r = computeStatusModifiers(actor, target, [actor, ally, target]);
  // linked +1 + wounded_perma severe -2 = -1 net
  assert.equal(r.attackDelta, -1);
});

// ──────────────────────────────────────────────────────────────────────
// Action 5b — slow_down trigger (panic / confused / bleeding≥medium / fracture≥medium)
// ──────────────────────────────────────────────────────────────────────

test('Action 5b: panic > 0 → slow_down trigger (-1 action_speed)', () => {
  const unit = { id: 'a', status: { panic: 2 } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.includes('panic'));
});

test('Action 5b: confused > 0 → slow_down trigger', () => {
  const unit = { id: 'a', status: { confused: 1 } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.includes('confused'));
});

test('Action 5b: bleeding medium severity → slow_down trigger', () => {
  const unit = { id: 'a', status: { bleeding: 2, bleeding_severity: 'medium' } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.some((t) => t.startsWith('bleeding:medium')));
});

test('Action 5b: bleeding minor severity → NO trigger (graffio neutral)', () => {
  const unit = { id: 'a', status: { bleeding: 2, bleeding_severity: 'minor' } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 0);
  assert.equal(r.triggers.length, 0);
});

test('Action 5b: bleeding major severity → slow_down trigger', () => {
  const unit = { id: 'a', status: { bleeding: 3, bleeding_severity: 'major' } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.some((t) => t.startsWith('bleeding:major')));
});

test('Action 5b: fracture medium severity → slow_down trigger', () => {
  const unit = { id: 'a', status: { fracture: 2, fracture_severity: 'medium' } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.some((t) => t.startsWith('fracture:medium')));
});

// Backward-compat: 2 test (bleeding senza severity = default minor NO trigger /
// fracture senza severity = default minor NO trigger).

test('Action 5b backward-compat: bleeding senza severity field → default minor, NO trigger', () => {
  const unit = { id: 'a', status: { bleeding: 2 } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 0);
});

test('Action 5b backward-compat: fracture senza severity field → default minor, NO trigger', () => {
  const unit = { id: 'a', status: { fracture: 2 } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 0);
});

test('Action 5b: combined panic + confused + bleeding-medium → cap a 1 tier (no stack)', () => {
  // Spec: trigger combinati NON cumulano. Cap -1 ("1 tier slower" canonical).
  const unit = {
    id: 'a',
    status: { panic: 1, confused: 1, bleeding: 2, bleeding_severity: 'medium' },
  };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.length >= 3);
});

test('Action 5b: clean unit → no trigger', () => {
  const unit = { id: 'a', status: {} };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 0);
});

// ──────────────────────────────────────────────────────────────────────
// OD-024 engine #1 — nocicezione "ritardi quando Ferito" (action-timing slow)
// ──────────────────────────────────────────────────────────────────────

test('OD-024: nocicezione + ferito (object-map bool) → slow_down 1 tier', () => {
  const unit = { id: 'a', traits: ['nocicezione'], status: { ferito: true } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.includes('nocicezione:ferito'));
});

test('OD-024: nocicezione + ferito (turns-remaining N) → slow_down', () => {
  const unit = { id: 'a', traits: ['nocicezione'], status: { ferito: 2 } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.includes('nocicezione:ferito'));
});

test('OD-024: nocicezione + ferito (array-shape status) → slow_down', () => {
  const unit = { id: 'a', traits: ['nocicezione'], status: ['ferito', 'stordito'] };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1);
  assert.ok(r.triggers.includes('nocicezione:ferito'));
});

test('OD-024: nocicezione WITHOUT ferito → no trigger', () => {
  const unit = { id: 'a', traits: ['nocicezione'], status: {} };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 0);
  assert.ok(!r.triggers.includes('nocicezione:ferito'));
});

test('OD-024: ferito WITHOUT nocicezione → no slow (ferito alone never slows)', () => {
  const unit = { id: 'a', traits: ['altro_tratto'], status: { ferito: true } };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 0);
});

test('OD-024: nocicezione+ferito + bleeding-medium → capped 1 tier (no cumulate)', () => {
  const unit = {
    id: 'a',
    traits: ['nocicezione'],
    status: { ferito: true, bleeding: 2, bleeding_severity: 'medium' },
  };
  const r = computeSlowDownPenalty(unit);
  assert.equal(r.amount, 1); // canonical cap, NOT 2
  assert.ok(r.triggers.includes('nocicezione:ferito'));
  assert.ok(r.triggers.some((t) => t.startsWith('bleeding:medium')));
});

test('Action 5b: computeStatusModifiers exports actorSlowDown flag + log entry', () => {
  const actor = { id: 'a', status: { panic: 1 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.actorSlowDown, true);
  assert.equal(r.targetSlowDown, false);
  assert.ok(r.log.some((e) => e.status === 'slow_down' && e.side === 'actor'));
});

// nuclei_di_controllo weak-point (creature-trait slice 2, trait 8): intact = +1 atk
// (offensive coordination node); broken (danno_nucleo) = +1 defense (hunkered).
test('nucleo_intatto (actor) -> +1 attackDelta', () => {
  const actor = { id: 'a', status: { nucleo_intatto: 99 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
  assert.ok(r.log.some((e) => e.status === 'nucleo_intatto' && e.side === 'actor'));
});

test('danno_nucleo (target) -> +1 defenseDelta (hunkered DR)', () => {
  const actor = { id: 'a', status: {} };
  const target = { id: 'b', status: { danno_nucleo: 99 } };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.defenseDelta, 1);
  assert.ok(r.log.some((e) => e.status === 'danno_nucleo' && e.side === 'target'));
});

test('nuclei: a broken nucleus no longer grants the attack aura', () => {
  const actor = { id: 'a', status: { danno_nucleo: 99 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 0, 'no +1 atk once broken');
});

// ally_aura_mark consumers (creature-trait slice 3): coordinamento (nuclei intact
// aura) and risonanza_memetica (corteccia single-use ripple) both grant +1 atk to
// the coordinated/resonating ally.
test('coordinamento (actor) -> +1 attackDelta', () => {
  const actor = { id: 'a', status: { coordinamento: 99 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
  assert.ok(r.log.some((e) => e.status === 'coordinamento' && e.side === 'actor'));
});

test('risonanza_memetica (actor) -> +1 attackDelta', () => {
  const actor = { id: 'a', status: { risonanza_memetica: 2 } };
  const target = { id: 'b', status: {} };
  const r = computeStatusModifiers(actor, target, []);
  assert.equal(r.attackDelta, 1);
  assert.ok(r.log.some((e) => e.status === 'risonanza_memetica' && e.side === 'actor'));
});
