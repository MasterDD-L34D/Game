// M14-B 2026-04-25 — positional damage + attackQuadrant unit tests.
// Ref: docs/research/triangle-strategy-transfer-plan.md:186-209
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  attackQuadrant,
  computePositionalDamage,
} = require('../../apps/backend/routes/sessionHelpers');

function mkUnit({ x = 0, y = 0, facing = 'S', elevation } = {}) {
  const u = { position: { x, y }, facing };
  if (elevation !== undefined) u.elevation = elevation;
  return u;
}

test('attackQuadrant: rear matches target facing south, actor above', () => {
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const actor = mkUnit({ x: 3, y: 2 }); // behind target (north of S-facing)
  assert.equal(attackQuadrant(actor, target), 'rear');
});

test('attackQuadrant: front when actor on facing side', () => {
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const actor = mkUnit({ x: 3, y: 4 });
  assert.equal(attackQuadrant(actor, target), 'front');
});

test('attackQuadrant: flank on orthogonal side', () => {
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const actorE = mkUnit({ x: 4, y: 3 });
  const actorW = mkUnit({ x: 2, y: 3 });
  assert.equal(attackQuadrant(actorE, target), 'flank');
  assert.equal(attackQuadrant(actorW, target), 'flank');
});

test('attackQuadrant: facing N rotates rear to south-of-target', () => {
  const target = mkUnit({ x: 3, y: 3, facing: 'N' });
  const actor = mkUnit({ x: 3, y: 4 });
  assert.equal(attackQuadrant(actor, target), 'rear');
});

test('attackQuadrant: missing position → front (safe default)', () => {
  assert.equal(attackQuadrant({}, mkUnit()), 'front');
  assert.equal(attackQuadrant(mkUnit(), {}), 'front');
});

test('positional: baseline no elevation/flank → multiplier 1.0', () => {
  const actor = mkUnit({ x: 3, y: 4 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const res = computePositionalDamage({ actor, target, baseDamage: 10 });
  assert.equal(res.damage, 10);
  assert.equal(res.quadrant, 'front');
  assert.equal(res.multiplier, 1);
});

test('positional: flank attack → +15% damage (11 from 10 floor)', () => {
  const actor = mkUnit({ x: 4, y: 3 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const res = computePositionalDamage({ actor, target, baseDamage: 10 });
  assert.equal(res.quadrant, 'flank');
  assert.equal(res.damage, 11); // floor(10 * 1.15) = 11
  assert.equal(res.multiplier, 1.15);
});

test('positional: elevation above → +30%', () => {
  const actor = mkUnit({ x: 4, y: 3, elevation: 2 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S', elevation: 1 });
  const res = computePositionalDamage({ actor, target, baseDamage: 10 });
  assert.equal(res.elevation_delta, 1);
  // flank + elevation: 1.15 * 1.30 = 1.495 → floor(10 * 1.495) = 14
  assert.equal(res.damage, 14);
});

test('positional: elevation below → -15% penalty', () => {
  const actor = mkUnit({ x: 3, y: 4, elevation: 0 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S', elevation: 2 });
  const res = computePositionalDamage({ actor, target, baseDamage: 10 });
  assert.equal(res.quadrant, 'front');
  assert.equal(res.elevation_delta, -2);
  assert.equal(res.damage, 8); // floor(10 * 0.85) = 8
});

test('positional: zero base damage returns 0 + front quadrant', () => {
  const res = computePositionalDamage({ actor: mkUnit(), target: mkUnit(), baseDamage: 0 });
  assert.equal(res.damage, 0);
  assert.equal(res.multiplier, 1);
});

test('positional: multiplier capped at 2.0 (anti-oneshot)', () => {
  const actor = mkUnit({ x: 4, y: 3, elevation: 5 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S', elevation: 0 });
  const res = computePositionalDamage({
    actor,
    target,
    baseDamage: 10,
    elevationBonus: 1.5, // hypothetical enormous bonus
    flankBonus: 0.5,
    rearMultiplier: 0,
  });
  // 2.5 * 1.5 = 3.75 → cap 2.0 → damage = 20
  assert.ok(res.damage <= 20);
  assert.ok(res.multiplier <= 2);
});

test('positional: rear uses legacy flat (rearMultiplier=0 default, no double-apply)', () => {
  const actor = mkUnit({ x: 3, y: 2 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const res = computePositionalDamage({ actor, target, baseDamage: 10 });
  assert.equal(res.quadrant, 'rear');
  // rearMultiplier=0 default → no extra multiplier; legacy +1 backstab lives in session.js
  assert.equal(res.multiplier, 1);
  assert.equal(res.damage, 10);
});

test('positional: explicit rearMultiplier honored', () => {
  const actor = mkUnit({ x: 3, y: 2 });
  const target = mkUnit({ x: 3, y: 3, facing: 'S' });
  const res = computePositionalDamage({
    actor,
    target,
    baseDamage: 10,
    rearMultiplier: 0.5,
  });
  assert.equal(res.damage, 15);
});
