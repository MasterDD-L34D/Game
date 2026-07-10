// tests/services/combat/ghiandoleMnemoniche.test.js
//
// ghiandole_mnemoniche -- furto di buff.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
//   Su un hit andato a segno il portatore strappa UN buff temporaneo alla preda
//   e ne indossa una copia attenuata (50% della durata, minimo 1).
//   Whitelist ordinata: frenzy, linked, sensed, coordinamento, risonanza_memetica.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  stealBuff,
  attenuate,
  hasTrait,
  GHIANDOLE_TRAIT,
  STEALABLE,
} = require('../../../apps/backend/services/combat/ghiandoleMnemoniche');

function carrier() {
  return { id: 'a1', traits: [GHIANDOLE_TRAIT], status: {} };
}
function prey(status) {
  return { id: 't1', traits: [], status: { ...status } };
}

test('furto: linked 4 -> la preda lo perde, il portatore lo guadagna con 2', () => {
  const actor = carrier();
  const target = prey({ linked: 4 });
  const out = stealBuff({ actor, target });
  assert.equal(out.stato, 'linked');
  assert.equal(target.status.linked, undefined);
  assert.equal(actor.status.linked, 2);
});

test('attenuate: dimezza per eccesso, con floor 1', () => {
  assert.equal(attenuate(4), 2);
  assert.equal(attenuate(3), 2);
  assert.equal(attenuate(1), 1);
  assert.equal(attenuate(0), 0);
  assert.equal(attenuate(undefined), 0);
});

test('furto: linked 1 -> il portatore lo guadagna con 1 (floor)', () => {
  const actor = carrier();
  const target = prey({ linked: 1 });
  stealBuff({ actor, target });
  assert.equal(actor.status.linked, 1);
});

// L'ordine della whitelist E' il design (spec decisione 2): se cambia, cambia come si
// gioca il tratto. Questo test lo blocca.
test('whitelist: frenzy e primo, risonanza_memetica ultimo', () => {
  assert.deepEqual(STEALABLE, [
    'frenzy',
    'linked',
    'sensed',
    'coordinamento',
    'risonanza_memetica',
  ]);
});

test('furto: un solo buff per colpo, il primo in whitelist', () => {
  const actor = carrier();
  const target = prey({ sensed: 4, linked: 4 });
  const out = stealBuff({ actor, target });
  assert.equal(out.stato, 'linked'); // linked precede sensed
  assert.equal(target.status.sensed, 4); // sensed resta alla preda
});

test('furto: frenzy ha priorita su linked', () => {
  const actor = carrier();
  const target = prey({ linked: 4, frenzy: 2 });
  const out = stealBuff({ actor, target });
  assert.equal(out.stato, 'frenzy');
  assert.equal(target.status.frenzy, undefined);
  assert.equal(target.status.linked, 4);
  assert.equal(actor.status.frenzy, 1);
});

test('furto: nucleo_intatto e telepatic_link non sono rubabili', () => {
  const actor = carrier();
  const target = prey({ nucleo_intatto: 99, telepatic_link: 2 });
  assert.equal(stealBuff({ actor, target }), null);
  assert.equal(target.status.nucleo_intatto, 99);
  assert.equal(target.status.telepatic_link, 2);
});

test('furto: senza il tratto, nessun effetto', () => {
  const actor = { id: 'a2', traits: [], status: {} };
  const target = prey({ linked: 4 });
  assert.equal(stealBuff({ actor, target }), null);
  assert.equal(target.status.linked, 4);
});

test('furto: preda senza buff -> null, nessuna mutazione', () => {
  const actor = carrier();
  const target = prey({});
  assert.equal(stealBuff({ actor, target }), null);
  assert.deepEqual(actor.status, {});
});

test('furto: status_intensity della preda viene ripulito', () => {
  const actor = carrier();
  const target = prey({ linked: 4 });
  target.status_intensity = { linked: 2 };
  stealBuff({ actor, target });
  assert.equal(target.status_intensity.linked, undefined);
});

test('furto: non abbassa un buff gia posseduto piu a lungo dal portatore', () => {
  const actor = carrier();
  actor.status.linked = 3;
  const target = prey({ linked: 2 }); // attenuato -> 1
  stealBuff({ actor, target });
  assert.equal(actor.status.linked, 3); // max(3, 1)
});

test('hasTrait: accetta stringhe e oggetti {id}', () => {
  assert.equal(hasTrait({ traits: [GHIANDOLE_TRAIT] }, GHIANDOLE_TRAIT), true);
  assert.equal(hasTrait({ traits: [{ id: GHIANDOLE_TRAIT }] }, GHIANDOLE_TRAIT), true);
  assert.equal(hasTrait({ traits: [] }, GHIANDOLE_TRAIT), false);
});
