'use strict';

// SPEC-J PR2b -- the consent->death bridge seam. Proves the two subsystems
// compose: coopStore.getLethalConsentOutcome (PR2 consent) -> session.lethalConsent
// -> lethalDeath.applyLethalKoIfDead (PR1 death gate). This is exactly the glue
// the combat KO path runs (routes/session.js): read the coop outcome by
// campaign_id, populate session.lethalConsent, resolve the KO.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');
const lethalDeath = require('../../../apps/backend/services/combat/lethalDeath');

function withLethalEnv(value, fn) {
  const prev = process.env.LETHAL_MISSIONS_ENABLED;
  if (value === undefined) delete process.env.LETHAL_MISSIONS_ENABLED;
  else process.env.LETHAL_MISSIONS_ENABLED = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.LETHAL_MISSIONS_ENABLED;
    else process.env.LETHAL_MISSIONS_ENABLED = prev;
  }
}

function mkStoreWithRun(campaignId) {
  const store = createCoopStore({ lobby: { getRoom: () => ({ hostId: 'h' }) } });
  const orch = store.getOrCreate('ROOM1');
  orch.run = { id: campaignId };
  return { store, orch };
}

// The exact glue from routes/session.js performAttack KO path.
function bridgeAndResolve(store, session, target) {
  if (session.campaign_id) {
    const outcome = store.getLethalConsentOutcome(session.campaign_id);
    if (outcome) session.lethalConsent = { granted: outcome === 'granted' };
  }
  return lethalDeath.applyLethalKoIfDead(target, session);
}

test('bridge: all at-risk confirmed in coop -> KO of a player resolves to DEATH', () => {
  withLethalEnv('true', () => {
    const { store, orch } = mkStoreWithRun('camp1');
    orch.openLethalConsent(['p1', 'p2']);
    orch.confirmLethalConsent('p1');
    orch.confirmLethalConsent('p2'); // granted
    const session = { lethal: true, campaign_id: 'camp1', encounter_id: 'enc', turn: 3 };
    const target = { id: 'p1', controlled_by: 'player', is_minion: false, hp: 0, status: {} };
    const r = bridgeAndResolve(store, session, target);
    assert.equal(r.outcome, 'death');
    assert.equal(target.fallen, true);
  });
});

test('bridge: consent still pending in coop -> KO resolves to SOFT (anti-deadlock)', () => {
  withLethalEnv('true', () => {
    const { store, orch } = mkStoreWithRun('camp1');
    orch.openLethalConsent(['p1', 'p2']);
    orch.confirmLethalConsent('p1'); // p2 not yet -> pending -> soft
    const session = { lethal: true, campaign_id: 'camp1', encounter_id: 'enc', turn: 3 };
    const target = { id: 'p1', controlled_by: 'player', is_minion: false, hp: 0, status: {} };
    const r = bridgeAndResolve(store, session, target);
    assert.equal(r.outcome, 'soft');
    assert.notEqual(target.fallen, true);
  });
});

test('bridge: no coop consent round -> KO resolves to SOFT (no lethal context)', () => {
  withLethalEnv('true', () => {
    const { store } = mkStoreWithRun('camp1'); // run exists, no consent opened
    const session = { lethal: true, campaign_id: 'camp1', encounter_id: 'enc', turn: 3 };
    const target = { id: 'p1', controlled_by: 'player', is_minion: false, hp: 0, status: {} };
    const r = bridgeAndResolve(store, session, target);
    assert.equal(r.outcome, 'soft');
  });
});

test('bridge: kill switch OFF -> SOFT even with granted coop consent (band-neutral)', () => {
  withLethalEnv(undefined, () => {
    const { store, orch } = mkStoreWithRun('camp1');
    orch.openLethalConsent(['p1']);
    orch.confirmLethalConsent('p1'); // granted in coop
    const session = { lethal: true, campaign_id: 'camp1', encounter_id: 'enc', turn: 3 };
    const target = { id: 'p1', controlled_by: 'player', is_minion: false, hp: 0, status: {} };
    const r = bridgeAndResolve(store, session, target);
    assert.equal(r.outcome, 'soft');
    assert.equal(r.reason, 'lethal_disabled');
  });
});
