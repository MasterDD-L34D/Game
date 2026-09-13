// coopStore.getFormPulses -- SPEC-M FP->VC plumb: resolve a branco's Form Pulse
// map by campaign_id (run.id) so the combat session can feed it to vcScoring.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');

function mkStore() {
  return createCoopStore({ lobby: { getRoom: () => ({ hostId: 'h' }) } });
}

test('getFormPulses: returns the orchestrator formPulses for matching campaign run.id', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  orch.formPulses = new Map([['p1', { axes: { solitary_swarm: 1 } }]]);
  const fp = store.getFormPulses('camp1');
  assert.ok(fp instanceof Map);
  assert.equal(fp.get('p1').axes.solitary_swarm, 1);
});

test('getFormPulses: null for unknown campaign id', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  assert.equal(store.getFormPulses('does_not_exist'), null);
});

test('getFormPulses: null for falsy id', () => {
  const store = mkStore();
  assert.equal(store.getFormPulses(null), null);
  assert.equal(store.getFormPulses(''), null);
});

test('getFormPulses: null when matching orch has no formPulses', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  orch.formPulses = null;
  assert.equal(store.getFormPulses('camp1'), null);
});
