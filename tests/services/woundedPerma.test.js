// Skiv Goal 1 (2026-04-28) — wounded_perma persistent scar tests.
//
// Source: docs/planning/2026-04-27-skiv-personal-sprint-handoff.md §2 Goal 1.
// Module: apps/backend/services/combat/woundedPerma.js

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initSessionMap,
  applyWound,
  restoreOnEncounterStart,
  getActorState,
  clearSession,
  MAX_STACKS,
} = require('../../apps/backend/services/combat/woundedPerma');

test('init + applyWound: applica cicatrice -1 max_hp + status entry', () => {
  const sessionMap = initSessionMap();
  const skiv = { id: 'skiv', max_hp: 14, hp: 0, status: {} };
  const result = applyWound(skiv, sessionMap);

  assert.equal(result.applied, true);
  assert.equal(result.hp_penalty, 1);
  assert.equal(result.prior_max_hp, 14);
  assert.equal(result.stacks, 1);
  assert.equal(skiv.max_hp, 13);
  assert.deepEqual(skiv.status.wounded_perma, { hp_penalty: 1, stacks: 1 });
  assert.ok(sessionMap.skiv);
  assert.equal(sessionMap.skiv.hp_penalty, 1);
});

test('applyWound: cumulative stacking + cap MAX_STACKS', () => {
  const sessionMap = initSessionMap();
  const skiv = { id: 'skiv', max_hp: 14, hp: 14, status: {} };
  // 3 wounds → expected -3 max_hp (1+1+1), stacks 3
  for (let i = 0; i < MAX_STACKS; i++) {
    applyWound(skiv, sessionMap);
  }
  assert.equal(skiv.max_hp, 14 - MAX_STACKS);
  assert.equal(skiv.status.wounded_perma.stacks, MAX_STACKS);
  assert.equal(skiv.status.wounded_perma.hp_penalty, MAX_STACKS);

  // 4° wound: capped, applied=false, max_hp invariato
  const capped = applyWound(skiv, sessionMap);
  assert.equal(capped.applied, false);
  assert.equal(capped.stacks, MAX_STACKS);
  assert.equal(skiv.max_hp, 14 - MAX_STACKS); // no further drop
});

test('restoreOnEncounterStart: re-applica HP penalty cross-encounter', () => {
  const sessionMap = initSessionMap();
  // Simulate prior wound persisted
  sessionMap.skiv = { hp_penalty: 1, stacks: 1, applied_at: '2026-04-28T00:00:00Z' };
  const skivNewEncounter = { id: 'skiv', max_hp: 14, hp: 14, status: {} };
  const result = restoreOnEncounterStart(skivNewEncounter, sessionMap);

  assert.equal(result.restored, true);
  assert.equal(result.hp_penalty, 1);
  assert.equal(skivNewEncounter.max_hp, 13);
  assert.equal(skivNewEncounter.hp, 13);
  assert.deepEqual(skivNewEncounter.status.wounded_perma, { hp_penalty: 1, stacks: 1 });
});

test('restoreOnEncounterStart: idempotent — second call no-op (no double penalty)', () => {
  const sessionMap = initSessionMap();
  sessionMap.skiv = { hp_penalty: 1, stacks: 1, applied_at: '2026-04-28T00:00:00Z' };
  const skiv = { id: 'skiv', max_hp: 14, hp: 14, status: {} };
  restoreOnEncounterStart(skiv, sessionMap);
  assert.equal(skiv.max_hp, 13);
  // Second call: should NOT double-deduct
  const second = restoreOnEncounterStart(skiv, sessionMap);
  assert.equal(second.restored, false);
  assert.equal(skiv.max_hp, 13); // unchanged
});

test('persistence cross-encounter + getActorState + clearSession', () => {
  const sessionMap = initSessionMap();
  const skiv = { id: 'skiv', max_hp: 14, hp: 0, status: {} };
  applyWound(skiv, sessionMap);

  // getActorState reads sessionMap snapshot
  const state = getActorState({ id: 'skiv' }, sessionMap);
  assert.equal(state.wounded, true);
  assert.equal(state.hp_penalty, 1);

  const stateNoWound = getActorState({ id: 'vega' }, sessionMap);
  assert.equal(stateNoWound.wounded, false);

  // Cross-encounter: new unit instance, restore from sessionMap
  const skivNext = { id: 'skiv', max_hp: 14, hp: 14, status: {} };
  restoreOnEncounterStart(skivNext, sessionMap);
  assert.equal(skivNext.max_hp, 13);

  // clearSession wipes all entries (durata sessione end)
  const cleared = clearSession(sessionMap);
  assert.equal(cleared, 1);
  assert.deepEqual(sessionMap, {});

  // Post-clear: no restore applied
  const skivPostClear = { id: 'skiv', max_hp: 14, hp: 14, status: {} };
  const result = restoreOnEncounterStart(skivPostClear, sessionMap);
  assert.equal(result.restored, false);
  assert.equal(skivPostClear.max_hp, 14);
});
