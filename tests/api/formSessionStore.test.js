// M12 Phase B — formSessionStore unit tests.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createFormSessionStore } = require('../../apps/backend/services/forms/formSessionStore');

test('store.seedUnit initializes state with defaults', () => {
  const store = createFormSessionStore();
  const state = store.seedUnit('sess1', 'u1', { pe: 10 });
  assert.equal(state.id, 'u1');
  assert.equal(state.pe, 10);
  assert.equal(state.current_form_id, null);
  assert.equal(state.evolve_count, 0);
  assert.ok(state.updated_at > 0);
});

test('store.getUnitState returns clone (safe to mutate caller-side)', () => {
  const store = createFormSessionStore();
  store.seedUnit('sess1', 'u1', { pe: 10 });
  const a = store.getUnitState('sess1', 'u1');
  a.pe = 999;
  const b = store.getUnitState('sess1', 'u1');
  assert.equal(b.pe, 10);
});

test('store.applyDelta mutates + bumps evolve_count', () => {
  const store = createFormSessionStore();
  store.seedUnit('sess1', 'u1', { pe: 10 });
  const updated = store.applyDelta('sess1', 'u1', {
    new_form_id: 'INTJ',
    pe_after: 2,
    round: 3,
  });
  assert.equal(updated.current_form_id, 'INTJ');
  assert.equal(updated.pe, 2);
  assert.equal(updated.last_evolve_round, 3);
  assert.equal(updated.evolve_count, 1);
  assert.ok(updated.last_delta);
});

test('store.listSession returns scoped entries only', () => {
  const store = createFormSessionStore();
  store.seedUnit('sess1', 'u1', { pe: 5 });
  store.seedUnit('sess1', 'u2', { pe: 7 });
  store.seedUnit('sess2', 'uX', { pe: 9 });
  const s1 = store.listSession('sess1');
  const s2 = store.listSession('sess2');
  assert.equal(s1.length, 2);
  assert.equal(s2.length, 1);
  assert.equal(s2[0].id, 'uX');
});

test('store.clearSession removes only matching prefix', () => {
  const store = createFormSessionStore();
  store.seedUnit('sess1', 'u1', {});
  store.seedUnit('sess2', 'u2', {});
  const removed = store.clearSession('sess1');
  assert.equal(removed, 1);
  assert.equal(store.size(), 1);
  assert.equal(store.listSession('sess2').length, 1);
});

test('store throws on missing session_id / unit_id', () => {
  const store = createFormSessionStore();
  assert.throws(() => store.setUnitState('', 'u1', {}), /required/);
  assert.throws(() => store.setUnitState('sess1', '', {}), /required/);
});
