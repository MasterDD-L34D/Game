// Unit test for AI War Defender's Advantage modifier.
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #10 AI War.
// Sprint 1 §II (autonomous plan 2026-04-27).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDefenderAdvantage,
  DEFENDER_ADVANTAGE_BONUS,
} = require('../../apps/backend/services/combat/defenderAdvantageModifier');

test('player attacks SIS defender → bonus active', () => {
  const attacker = { controlled_by: 'player' };
  const target = { controlled_by: 'sistema', role: 'defender' };
  const r = getDefenderAdvantage(attacker, target);
  assert.equal(r.active, true);
  assert.equal(r.bonus, DEFENDER_ADVANTAGE_BONUS);
  assert.match(r.reason, /defensive_role:defender/);
});

test('player attacks SIS tank → bonus active', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'player' },
    { controlled_by: 'sistema', role: 'tank' },
  );
  assert.equal(r.active, true);
  assert.equal(r.bonus, 1);
});

test('player attacks SIS guardian → bonus active', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'player' },
    { controlled_by: 'sistema', role: 'guardian' },
  );
  assert.equal(r.active, true);
});

test('player attacks SIS attacker (no defensive role) → no bonus', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'player' },
    { controlled_by: 'sistema', role: 'attacker' },
  );
  assert.equal(r.active, false);
  assert.equal(r.bonus, 0);
});

test('player attacks SIS on terrain cover ≥ 0.5 → bonus active', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'player' },
    { controlled_by: 'sistema', role: 'attacker' },
    { cover: 0.5 },
  );
  assert.equal(r.active, true);
  assert.match(r.reason, /terrain_cover:0\.5/);
});

test('player attacks SIS on light cover (0.25) → no bonus', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'player' },
    { controlled_by: 'sistema', role: 'attacker' },
    { cover: 0.25 },
  );
  assert.equal(r.active, false);
});

test('SIS attacks player → no bonus (asymmetric: only player→SIS gated)', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'sistema' },
    { controlled_by: 'player', role: 'tank' },
  );
  assert.equal(r.active, false);
  assert.match(r.reason, /attacker_not_player/);
});

test('player attacks player (friendly fire / coop) → no bonus', () => {
  const r = getDefenderAdvantage(
    { controlled_by: 'player' },
    { controlled_by: 'player', role: 'tank' },
  );
  assert.equal(r.active, false);
  assert.match(r.reason, /target_not_sistema/);
});

test('missing units → safe no-op', () => {
  const r = getDefenderAdvantage(null, null);
  assert.equal(r.active, false);
  assert.match(r.reason, /missing/);
});
