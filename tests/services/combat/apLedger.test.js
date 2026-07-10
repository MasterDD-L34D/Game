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
  // NOTA: `Math.max(0, Number(action.ap_cost) || 0) || 1` -> ap_cost:0 e' falsy
  // in JS e ricade sul default 1 (comportamento legacy preservato: skip/pass non
  // hanno una server cost source). Il floor tocca solo il segno, non il default.
  assert.equal(ledger.resolveActionApCost({}, { type: 'skip', ap_cost: 0 }), 1);
  assert.equal(ledger.resolveActionApCost({}, { type: 'skip', ap_cost: 3 }), 3);
});

test('resolveActionApCost: ability sconosciuta floora a 1 (no undercharge)', () => {
  assert.equal(
    ledger.resolveActionApCost({}, { ability_id: 'nope_does_not_exist', ap_cost: 0 }),
    1,
  );
});

test('resolveActionApCost: skip con ap_cost negativo non rifonda AP (OWASP A04)', () => {
  // Il resolver fa Math.max(0, ap_remaining - cost): il floor e' sul RISULTATO,
  // non sul costo. Un cost negativo lo attraversa e diventa un credito
  // (ap_remaining + 100). Il floor va messo sul costo.
  const cost = ledger.resolveActionApCost({}, { type: 'skip', ap_cost: -100 });
  assert.ok(cost >= 0, `costo skip negativo non floorato: ${cost}`);
  assert.equal(cost, 1);
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

test('resolveIntentApCost: skip con ap_cost negativo non accredita il budget', () => {
  // Il gate declare-time somma i pending: un costo negativo qui e' un credito
  // che finanzia gli intent successivi dello stesso attore.
  assert.equal(ledger.resolveIntentApCost({}, { type: 'skip', ap_cost: -5 }), 0);
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

test('canAfford: uno skip a costo negativo non finanzia attacchi successivi', () => {
  // Exploit: pending = -100 + 1 = -99, quindi -99 + 1 <= 1 -> il gate passa e
  // l'attore dichiara 2 attacchi con 1 solo AP. Col floor: 1 + 1 = 2 > 1.
  const actor = { ap_remaining: 1, position: { x: 0, y: 0 } };
  const freeSkip = { type: 'skip', ap_cost: -100 };
  const attack = { type: 'attack' };
  assert.equal(ledger.canAfford(actor, [freeSkip, attack], attack), false);
});

test('apBreakdown: espone i numeri che AP_INSUFFICIENT deve stampare', () => {
  // validatePlayerIntent formatta "costo totale N (pending P + nuovo C), disponibili A".
  // Il breakdown e' l'unica fonte di quei 4 numeri: nessun ricalcolo lato route.
  const actor = { ap_remaining: 3, position: { x: 0, y: 0 } };
  const attack = { type: 'attack' };
  const b = ledger.apBreakdown(actor, [attack], attack);
  assert.deepEqual(b, { pending: 1, cost: 1, total: 2, available: 3, affordable: true });
});

test('apBreakdown: total = pending + cost, affordable = total <= available', () => {
  const actor = { ap_remaining: 2, position: { x: 0, y: 0 } };
  const attack = { type: 'attack' };
  const b = ledger.apBreakdown(actor, [attack, attack], attack);
  assert.equal(b.pending, 2);
  assert.equal(b.cost, 1);
  assert.equal(b.total, b.pending + b.cost);
  assert.equal(b.available, 2);
  assert.equal(b.affordable, false);
});

test('apBreakdown: prezza server-side i move e unwrappa gli intent wrapper', () => {
  // Stesse due garanzie di canAfford: il pending sum non si fida di ap_cost
  // client sui move in-grid, e un {unit_id, action} non viene prezzato 0.
  const actor = { ap_remaining: 5, position: { x: 0, y: 0 } };
  const move = { type: 'move', move_to: { x: 2, y: 0 }, ap_cost: 0 }; // costo server 2
  const wrapped = { unit_id: 'x', action: { type: 'attack' } };
  const b = ledger.apBreakdown(actor, [move, wrapped], { type: 'attack' });
  assert.equal(b.pending, 3); // 2 (move) + 1 (attack unwrappato)
  assert.equal(b.total, 4);
});

test('apBreakdown: una chiave `action` decoy su un attacco raw non lo declassa a 0', () => {
  // L'unwrap-insurance serve ai wrapper {unit_id, action}. Ma la route passa
  // azioni RAW, e su un'azione raw `.action` e' scritto dal client: se lo
  // scartiamo, un attacco (prezzo server 1) viene prezzato sull'inner (0).
  // L'unwrap non deve mai declassare un'azione gia' prezzabile (type/ability_id).
  const actor = { ap_remaining: 2, position: { x: 0, y: 0 } };
  const decoyAttack = { type: 'attack', action: true };
  const b = ledger.apBreakdown(actor, [decoyAttack, decoyAttack], { type: 'attack' });
  assert.equal(b.pending, 2, 'due attacchi decoy devono costare 2, non 0');
  assert.equal(b.affordable, false, '2 + 1 > 2 -> fail closed');
});

test('canAfford: attacchi decoy non si finanziano a vicenda', () => {
  const actor = { ap_remaining: 1, position: { x: 0, y: 0 } };
  const decoyAttack = { type: 'attack', action: { type: 'skip' } };
  assert.equal(ledger.canAfford(actor, [decoyAttack], { type: 'attack' }), false);
});

test('apBreakdown: il wrapper {unit_id, action} resta unwrappato (insurance intatta)', () => {
  // La guardia anti-decoy non deve rompere il caso per cui l'insurance esiste:
  // un wrapper non ha ne' type ne' ability_id, quindi va ancora scartato.
  const actor = { ap_remaining: 1, position: { x: 0, y: 0 } };
  const wrapped = { unit_id: 'x', action: { type: 'attack' } };
  const b = ledger.apBreakdown(actor, [wrapped], { type: 'attack' });
  assert.equal(b.pending, 1, "wrapper prezzato sull'attacco interno, non 0");
  assert.equal(b.affordable, false);
});

test('apBreakdown: fail-closed su actor null (available 0, non NaN)', () => {
  const b = ledger.apBreakdown(null, [], { type: 'attack' });
  assert.equal(b.available, 0);
  assert.equal(b.affordable, false);
});

test('canAfford: resta un wrapper booleano su apBreakdown.affordable', () => {
  // Anti-drift: se le due funzioni divergono, la ledger ha di nuovo due autorita'.
  const actor = { ap_remaining: 2, position: { x: 0, y: 0 } };
  const attack = { type: 'attack' };
  for (const declared of [[], [attack], [attack, attack]]) {
    assert.equal(
      ledger.canAfford(actor, declared, attack),
      ledger.apBreakdown(actor, declared, attack).affordable,
    );
  }
});
