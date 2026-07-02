// coopStore.getLethalConsentOutcome -- SPEC-J PR2b bridge: resolve a coop run's
// lethal-consent outcome by campaign_id (run.id) so the combat session (PR1
// death gate) can PULL it (mirror getFormPulses). 'granted' only when every
// at-risk player confirmed; 'soft' while pending/timed-out; null when no round.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');

function mkStore() {
  return createCoopStore({ lobby: { getRoom: () => ({ hostId: 'h' }) } });
}

test('getLethalConsentOutcome: granted when every at-risk player confirmed', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  orch.openLethalConsent(['p1', 'p2']);
  orch.confirmLethalConsent('p1');
  assert.equal(store.getLethalConsentOutcome('camp1'), 'soft'); // not all yet
  orch.confirmLethalConsent('p2');
  assert.equal(store.getLethalConsentOutcome('camp1'), 'granted');
});

test('getLethalConsentOutcome: soft while a round is pending', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  orch.openLethalConsent(['p1']);
  assert.equal(store.getLethalConsentOutcome('camp1'), 'soft');
});

test('getLethalConsentOutcome: null when no consent round is open (no context)', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  assert.equal(store.getLethalConsentOutcome('camp1'), null);
});

test('getLethalConsentOutcome: null for unknown campaign id / falsy id', () => {
  const store = mkStore();
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: 'camp1' };
  orch.openLethalConsent(['p1']);
  assert.equal(store.getLethalConsentOutcome('nope'), null);
  assert.equal(store.getLethalConsentOutcome(null), null);
  assert.equal(store.getLethalConsentOutcome(''), null);
});
