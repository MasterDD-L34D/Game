'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { applyMinionResurrect } = require('../../apps/backend/services/combat/minionRuntime');

// TKT-JOB-PHASEC slice B5 minion_resurrect_chance (bm_r6 capstone, OQ-MINION V4) —
// at end-of-round, a dead minion whose (living) beastmaster owner has the perk has
// `chance` to revive in place at `hp_on_revive` (1). One roll per minion
// (_resurrect_done). Pure-ish (mutates session.units, returns the revive events);
// called from sessionRoundBridge.applyEndOfRoundSideEffects with the closure rng.

function perk(chance = 0.5) {
  return {
    tag: 'minion_resurrect_chance',
    payload: { chance, hp_on_revive: 1 },
    source_perk_id: 'bm_r6',
  };
}
function setup(ownerPerks) {
  const owner = { id: 'bm', controlled_by: 'player', hp: 10, _perk_passives: ownerPerks || [] };
  const minion = {
    id: 'm1',
    controlled_by: 'player',
    owner_id: 'bm',
    is_minion: true,
    hp: 0,
    max_hp: 5,
  };
  return { owner, minion, session: { units: [owner, minion], turn: 3 } };
}

test('applyMinionResurrect: revives a dead minion in place when the roll succeeds', () => {
  const { minion, session } = setup([perk(0.5)]);
  const events = applyMinionResurrect(session, () => 0.2); // 0.2 < 0.5 → success
  assert.strictEqual(minion.hp, 1, 'revived at hp_on_revive');
  assert.strictEqual(minion._resurrect_done, true);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].minion_id, 'm1');
});

test('applyMinionResurrect: leaves the minion dead when the roll fails (but marks it processed)', () => {
  const { minion, session } = setup([perk(0.5)]);
  const events = applyMinionResurrect(session, () => 0.9); // 0.9 >= 0.5 → fail
  assert.strictEqual(minion.hp, 0, 'stays dead');
  assert.strictEqual(minion._resurrect_done, true, 'one roll per minion');
  assert.strictEqual(events.length, 0);
});

test('applyMinionResurrect: does not re-roll an already-processed minion', () => {
  const { minion, session } = setup([perk(1.0)]);
  minion._resurrect_done = true;
  const events = applyMinionResurrect(session, () => 0);
  assert.strictEqual(minion.hp, 0, 'not revived again');
  assert.strictEqual(events.length, 0);
});

test('applyMinionResurrect: no perk → no revive', () => {
  const { minion, session } = setup([]);
  applyMinionResurrect(session, () => 0);
  assert.strictEqual(minion.hp, 0);
  assert.ok(!minion._resurrect_done);
});

test('applyMinionResurrect: a dead owner cannot resurrect', () => {
  const { owner, minion, session } = setup([perk(1.0)]);
  owner.hp = 0;
  applyMinionResurrect(session, () => 0);
  assert.strictEqual(minion.hp, 0, 'no living owner → no revive');
});

test('applyMinionResurrect: a living minion is untouched', () => {
  const { minion, session } = setup([perk(1.0)]);
  minion.hp = 3;
  const events = applyMinionResurrect(session, () => 0);
  assert.strictEqual(minion.hp, 3);
  assert.strictEqual(events.length, 0);
});
