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
const { computeStatusModifiers } = require('../../../apps/backend/services/combat/statusModifiers');

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

// Il furto di frenzy NON e' un guadagno netto: chi lo ruba eredita la guardia
// abbassata. Lo spec lo afferma; qui lo si dimostra sul motore vero, non sulla
// status-map. computeStatusModifiers legge lo STESSO status sui due lati.
test('furto: chi ruba frenzy eredita -1 difesa quando e bersagliato', () => {
  const thief = { id: 'a1', controlled_by: 'player', traits: [GHIANDOLE_TRAIT], status: {} };
  const enemy = { id: 't1', controlled_by: 'sistema', traits: [], status: { frenzy: 2 } };
  stealBuff({ actor: thief, target: enemy });
  assert.equal(thief.status.frenzy, 1);

  // il ladro ora ATTACCA: +1 attacco
  const onOffense = computeStatusModifiers(thief, enemy, []);
  assert.equal(onOffense.attackDelta, 1);

  // il ladro ora e' BERSAGLIATO: -1 difesa (l'esposizione ereditata)
  const onDefense = computeStatusModifiers(enemy, thief, []);
  assert.equal(onDefense.defenseDelta, -1);

  // e la preda non ha piu' ne' l'uno ne' l'altro
  const preyNow = computeStatusModifiers(enemy, thief, []);
  assert.equal(preyNow.attackDelta, 0);
});

// Cap di durata. Gli altri due push-site di _pendingStatusApplies in session.js
// (:1295-1302 on_hit_status, :1545) clampano via STATUS_DURATION_CAPS; il furto deve
// fare lo stesso. `normaliseUnit` copia `input.status` dal payload di /start
// (sessionHelpers.js:65), e applyMoraleStatus e' Math.max senza cap: senza clamp un
// client puo' seminare frenzy:100 su un nemico e rubarne 50 turni, contro il cap
// canonico di 5. Il dimezzamento NON e' un cap: attenuate(100) = 50.
test('furto: la durata concessa rispetta il cap canonico dello status', () => {
  const actor = carrier();
  const target = prey({ frenzy: 100 });
  const out = stealBuff({ actor, target, caps: { frenzy: 5 } });
  assert.equal(out.granted_turns, 5);
  assert.equal(actor.status.frenzy, 5);
});

test('furto: sotto il cap, il dimezzamento resta intatto', () => {
  const actor = carrier();
  const target = prey({ frenzy: 4 });
  const out = stealBuff({ actor, target, caps: { frenzy: 5 } });
  assert.equal(out.granted_turns, 2); // ceil(4/2), non toccato dal cap
});

test('furto: status senza cap -> comportamento invariato', () => {
  const actor = carrier();
  const target = prey({ linked: 100 });
  const out = stealBuff({ actor, target, caps: { frenzy: 5 } });
  assert.equal(out.granted_turns, 50); // `linked` non e' in STATUS_DURATION_CAPS
});

test('furto: caps omesso -> nessun clamp (retro-compat)', () => {
  const actor = carrier();
  const target = prey({ frenzy: 100 });
  assert.equal(stealBuff({ actor, target }).granted_turns, 50);
});

test('furto: actor === target non auto-cancella lo status', () => {
  const u = { id: 'a1', traits: [GHIANDOLE_TRAIT], status: { linked: 4 } };
  const out = stealBuff({ actor: u, target: u });
  assert.equal(out.stato, 'linked');
  assert.equal(u.status.linked, 2); // rimosso e riapplicato dimezzato, non cancellato
});

test('furto: preda con status non-oggetto -> null, nessun throw', () => {
  const actor = carrier();
  assert.equal(stealBuff({ actor, target: { id: 't1', status: null } }), null);
  assert.equal(stealBuff({ actor, target: { id: 't2', status: ['linked'] } }), null);
});

test('furto: turns negativi o frazionari', () => {
  const actor = carrier();
  assert.equal(stealBuff({ actor, target: prey({ linked: -3 }) }), null);
  const a2 = carrier();
  stealBuff({ actor: a2, target: prey({ linked: 2.5 }) });
  assert.equal(a2.status.linked, 2); // ceil(2.5/2) = 2
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

// Guardia di fazione. La route di attacco NON valida la fazione del bersaglio
// (session.js: `session.units.find((u) => u.id === body.target_id)`), quindi un
// attacco puo' colpire un alleato. Senza questa guardia il tratto di SABOTAGGIO
// deruberebbe un compagno di squadra. Stesso criterio di computeTelepathicReveal,
// che salta le unita' della stessa fazione.
test('furto: nessun furto da un alleato (stessa fazione)', () => {
  const actor = { id: 'a1', controlled_by: 'player', traits: [GHIANDOLE_TRAIT], status: {} };
  const ally = { id: 't1', controlled_by: 'player', traits: [], status: { linked: 4 } };
  assert.equal(stealBuff({ actor, target: ally }), null);
  assert.equal(ally.status.linked, 4);
  assert.deepEqual(actor.status, {});
});

test('furto: ruba da una fazione avversa', () => {
  const actor = { id: 'a1', controlled_by: 'player', traits: [GHIANDOLE_TRAIT], status: {} };
  const enemy = { id: 't1', controlled_by: 'sistema', traits: [], status: { linked: 4 } };
  assert.equal(stealBuff({ actor, target: enemy }).stato, 'linked');
  assert.equal(actor.status.linked, 2);
});

// Fazione assente su una delle due unita' (fixture legacy, sim units): non si puo'
// dimostrare che siano alleate -> il furto procede. Conserva i test esistenti.
test('furto: fazione mancante -> non blocca il furto', () => {
  const actor = { id: 'a1', traits: [GHIANDOLE_TRAIT], status: {} };
  const target = { id: 't1', traits: [], status: { linked: 4 } };
  assert.equal(stealBuff({ actor, target }).stato, 'linked');
});

// STEALABLE e' esposto come copia: l'ordine E' il design, un consumatore non deve
// poterlo riordinare o svuotare a runtime cambiando il tratto ovunque.
test('whitelist: STEALABLE e una copia difensiva, non larray vivo', () => {
  const mod = require('../../../apps/backend/services/combat/ghiandoleMnemoniche');
  const first = mod.STEALABLE;
  first.length = 0; // tentativo di sabotaggio
  assert.deepEqual(mod.STEALABLE[0], 'frenzy');

  // e il furto continua a funzionare dopo il tentativo
  const actor = carrier();
  const target = prey({ frenzy: 2 });
  assert.equal(stealBuff({ actor, target }).stato, 'frenzy');
});

test('hasTrait: accetta stringhe e oggetti {id}', () => {
  assert.equal(hasTrait({ traits: [GHIANDOLE_TRAIT] }, GHIANDOLE_TRAIT), true);
  assert.equal(hasTrait({ traits: [{ id: GHIANDOLE_TRAIT }] }, GHIANDOLE_TRAIT), true);
  assert.equal(hasTrait({ traits: [] }, GHIANDOLE_TRAIT), false);
});
