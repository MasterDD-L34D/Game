// tests/services/combat/apLedger.test.js -- apLedger = autorita' unica costi AP
// (estrazione dal closure di sessionRoundBridge, spec sistema-symmetry sez. 4.1).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { createApLedger } = require('../../../apps/backend/services/combat/apLedger');

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const ledger = createApLedger({ manhattanDistance: manhattan, gridSize: 16 });

test('resolveMoveApCost: max(1, dist - move_bonus)', () => {
  const actor = { move_bonus_bonus: 0 };
  assert.equal(ledger.resolveMoveApCost(actor, { x: 0, y: 0 }, { x: 3, y: 0 }), 3);
  assert.equal(
    ledger.resolveMoveApCost({ move_bonus_bonus: 2 }, { x: 0, y: 0 }, { x: 3, y: 0 }),
    1,
  );
  assert.equal(
    ledger.resolveMoveApCost({ move_bonus_bonus: 9 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    1,
  );
});

test('resolveActionApCost: attack canon 1, client value ignorato', () => {
  assert.equal(ledger.resolveActionApCost({}, { type: 'attack', ap_cost: -5 }), 1);
  // NOTA: `Number(action.ap_cost || 1)` nel corpo reale -> ap_cost:0 e' falsy in
  // JS e ricade sul default 1 (comportamento verbatim, non un bug da correggere
  // qui: skip/pass non hanno una server cost source, vedi commento sopra).
  assert.equal(ledger.resolveActionApCost({}, { type: 'skip', ap_cost: 0 }), 1);
  assert.equal(ledger.resolveActionApCost({}, { type: 'skip', ap_cost: 3 }), 3);
});

test('resolveActionApCost: ability sconosciuta floora a 1 (no undercharge)', () => {
  assert.equal(
    ledger.resolveActionApCost({}, { ability_id: 'nope_does_not_exist', ap_cost: 0 }),
    1,
  );
});

test('isValidGridDest: bounds', () => {
  assert.equal(ledger.isValidGridDest({ x: 15, y: 15 }), true);
  assert.equal(ledger.isValidGridDest({ x: 16, y: 0 }), false);
  assert.equal(ledger.isValidGridDest({ x: 'a', y: 0 }), false);
});

test('resolveIntentApCost: move in-grid usa costo server, off-grid tiene il client', () => {
  const actor = { position: { x: 0, y: 0 }, move_bonus_bonus: 0 };
  assert.equal(
    ledger.resolveIntentApCost(actor, { type: 'move', move_to: { x: 2, y: 0 }, ap_cost: 0 }),
    2,
  );
  assert.equal(
    ledger.resolveIntentApCost(actor, { type: 'move', move_to: { x: 99, y: 0 }, ap_cost: 0 }),
    0,
  );
});

test('canAfford: somma pending + candidata vs ap_remaining', () => {
  const actor = { ap_remaining: 2, position: { x: 0, y: 0 } };
  const attack = { type: 'attack' };
  assert.equal(ledger.canAfford(actor, [], attack), true);
  assert.equal(ledger.canAfford(actor, [attack], attack), true);
  assert.equal(ledger.canAfford(actor, [attack, attack], attack), false);
  assert.equal(ledger.canAfford({ ap: 1, position: { x: 0, y: 0 } }, [attack], attack), false);
});

test('canAfford: move in declaredActions prezzato lato server (non ap_cost client)', () => {
  const actor = { ap_remaining: 3, position: { x: 0, y: 0 } };
  const move = { type: 'move', move_to: { x: 2, y: 0 }, ap_cost: 0 }; // costo server 2
  const attack = { type: 'attack' };
  assert.equal(ledger.canAfford(actor, [move], attack), true); // 2 + 1 <= 3
  assert.equal(ledger.canAfford(actor, [move, attack], attack), false); // 2 + 1 + 1 > 3
});

test('canAfford: intent wrapper {unit_id, action} in declaredActions viene unwrappato', () => {
  // Senza l'unwrap-insurance il wrapper (niente type/ability_id) verrebbe
  // prezzato 0 e il gate fallirebbe OPEN: 0 + 1 <= 1 -> true. Con l'unwrap
  // l'attack interno conta 1: 1 + 1 = 2 > 1 -> false (fail closed).
  const actor = { ap_remaining: 1, position: { x: 0, y: 0 } };
  const wrapped = { unit_id: 'x', action: { type: 'attack' } };
  assert.equal(ledger.canAfford(actor, [wrapped], { type: 'attack' }), false);
});

test('canAfford: fail-closed su actor null o AP NaN', () => {
  // actor null -> apAvailable 0 -> 1 <= 0 false; NaN -> 1 <= NaN false.
  assert.equal(ledger.canAfford(null, [], { type: 'attack' }), false);
  assert.equal(ledger.canAfford({ ap_remaining: NaN }, [], { type: 'attack' }), false);
});
