// tests/services/combat/pendingStatusRemovals.test.js
//
// Canale di rimozione simmetrico a session._pendingStatusApplies.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md (sez. 2b)
//
// Serve al furto di buff (ghiandole_mnemoniche): il canale di apply e' drenato con
// applyMoraleStatus = Math.max(cur,dur), che non sa rimuovere, e il rebuild
// tracked->dict di syncStatusesFromRoundState ripristinerebbe qualsiasi delete fatto
// a meta' attacco.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  drainStatusRemovals,
  drainPendingStatusEffects,
} = require('../../../apps/backend/services/combat/pendingStatusRemovals');

function unitsMap(units) {
  return new Map(units.map((u) => [String(u.id), u]));
}

test('drain: rimuove lo status e la sua intensity, lascia il resto', () => {
  const u = {
    id: 't1',
    hp: 10,
    status: { frenzy: 2, linked: 1 },
    status_intensity: { frenzy: 1 },
  };
  const session = { _pendingStatusRemovals: [{ unit_id: 't1', status: 'frenzy' }] };
  drainStatusRemovals(session, unitsMap([u]));
  assert.equal(u.status.frenzy, undefined);
  assert.equal(u.status_intensity.frenzy, undefined);
  assert.equal(u.status.linked, 1);
});

test('drain: svuota la coda e riporta quante rimozioni ha applicato', () => {
  const u = { id: 't1', hp: 10, status: { frenzy: 2 } };
  const session = { _pendingStatusRemovals: [{ unit_id: 't1', status: 'frenzy' }] };
  assert.equal(drainStatusRemovals(session, unitsMap([u])), 1);
  assert.deepEqual(session._pendingStatusRemovals, []);
});

// Best-effort: il drain non deve MAI bloccare un round. I tre casi sotto sono le vie
// per cui potrebbe lanciare.
test('drain: unita sconosciuta -> no-op, nessun throw', () => {
  const session = { _pendingStatusRemovals: [{ unit_id: 'ghost', status: 'frenzy' }] };
  assert.equal(drainStatusRemovals(session, unitsMap([])), 0);
  assert.deepEqual(session._pendingStatusRemovals, []);
});

test('drain: unita senza status -> no-op, nessun throw', () => {
  const u = { id: 't1', hp: 10 };
  const session = { _pendingStatusRemovals: [{ unit_id: 't1', status: 'frenzy' }] };
  assert.equal(drainStatusRemovals(session, unitsMap([u])), 0);
  assert.deepEqual(session._pendingStatusRemovals, []);
});

// ORDINE DEI DRAIN -- invariante load-bearing.
// syncStatusesFromRoundState drena le RIMOZIONI prima degli APPLIES. Se l'ordine
// fosse invertito, due ladri di fazione opposta che nello stesso round rubano lo
// stesso status se lo annichilirebbero a vicenda (entrambi guadagnano, poi entrambe
// le rimozioni cancellano). Con l'ordine corretto ciascuno perde il proprio e
// guadagna quello dell'altro. Stesso motivo per cui actor===target non si
// auto-cancella: rimuove, poi riapplica dimezzato.
//
// Il bridge e' una closure non esportata, quindi qui si riproduce la sua sequenza con
// il vero applyMoraleStatus.
const { applyMoraleStatus } = require('../../../apps/backend/services/combat/morale');

// La funzione VERA usata dal bridge, con il vero applyMoraleStatus.
const drainLikeBridge = (session, units) =>
  drainPendingStatusEffects(session, units, applyMoraleStatus);

test('ordine: furto reciproco non annichila il buff', () => {
  const a = { id: 'a', hp: 10, status: { frenzy: 2 } };
  const b = { id: 'b', hp: 10, status: { frenzy: 4 } };
  const session = {
    // a ruba a b (4 -> 2), b ruba ad a (2 -> 1)
    _pendingStatusApplies: [
      { unit_id: 'a', status: 'frenzy', duration: 2 },
      { unit_id: 'b', status: 'frenzy', duration: 1 },
    ],
    _pendingStatusRemovals: [
      { unit_id: 'b', status: 'frenzy' },
      { unit_id: 'a', status: 'frenzy' },
    ],
  };
  drainLikeBridge(session, unitsMap([a, b]));
  assert.equal(a.status.frenzy, 2, 'a deve conservare il frenzy rubato a b');
  assert.equal(b.status.frenzy, 1, 'b deve conservare il frenzy rubato ad a');
});

test('ordine: furto normale -> la preda perde, il ladro guadagna', () => {
  const thief = { id: 'a', hp: 10, status: {} };
  const preyUnit = { id: 'b', hp: 10, status: { linked: 4 } };
  const session = {
    _pendingStatusApplies: [{ unit_id: 'a', status: 'linked', duration: 2 }],
    _pendingStatusRemovals: [{ unit_id: 'b', status: 'linked' }],
  };
  drainLikeBridge(session, unitsMap([thief, preyUnit]));
  assert.equal(preyUnit.status.linked, undefined);
  assert.equal(thief.status.linked, 2);
});

test('drain: coda assente o vuota -> no-op', () => {
  const u = { id: 't1', hp: 10, status: { frenzy: 2 } };
  assert.equal(drainStatusRemovals({}, unitsMap([u])), 0);
  assert.equal(drainStatusRemovals({ _pendingStatusRemovals: [] }, unitsMap([u])), 0);
  assert.equal(u.status.frenzy, 2);
});
