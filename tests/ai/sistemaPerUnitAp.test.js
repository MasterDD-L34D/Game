// tests/ai/sistemaPerUnitAp.test.js -- dichiarazione a budget AP (spec sez. 4.2).
// Flag ON: ogni unita' Sistema dichiara fino al suo budget (mirror lookahead2:
// move, poi attack se in gittata dalla posizione POST-move). Flag OFF: 1 intent.
// La risoluzione e' per priorita', non per ordine di dichiarazione -> l'attack
// slot-2 si dichiara SOLO se in range dal move_to.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDeclareSistemaIntents,
  isPerUnitApEnabled,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { pickLowestHpEnemy, stepTowards } = require('../../apps/backend/routes/sessionHelpers');

const FLAG = 'SISTEMA_PER_UNIT_AP_ENABLED';
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}
function declareFor(session) {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance: manhattan,
    gridSize: 16,
  });
  return declare(session);
}
const sis = (id, x, y, over = {}) => ({
  id, controlled_by: 'sistema', hp: 10, max_hp: 10, ap: 2, ap_max: 2, mod: 2, dc: 12,
  attack_range: 1, initiative: 10, position: { x, y }, status: {},
  ai_profile: 'aggressive', damage: { min: 1, max: 3 }, ...over,
});
const pg = (id, x, y) => ({
  id, controlled_by: 'player', hp: 12, max_hp: 12, ap: 2, ap_max: 2, mod: 2, dc: 12,
  attack_range: 1, initiative: 12, position: { x, y }, status: {},
});
function session(units) {
  return { units, grid: { width: 16, height: 12 }, sistema_pressure: 50 };
}

test('isPerUnitApEnabled: default OFF, solo "true"', () => {
  withFlag(undefined, () => assert.equal(isPerUnitApEnabled(), false));
  withFlag('true', () => assert.equal(isPerUnitApEnabled(), true));
});

test('ON: target a 2 celle -> move + attack della stessa unita (<= 2 AP)', () => {
  withFlag('true', () => {
    const { intents } = declareFor(session([sis('s1', 4, 5), pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 2, 'move + attack slot-2');
    assert.equal(mine[0].action.type, 'move');
    assert.equal(mine[1].action.type, 'attack');
    const cost = mine.reduce((s, i) => s + Number(i.action.ap_cost || 0), 0);
    assert.ok(cost <= 2, `costo totale ${cost} <= budget 2`);
  });
});

test('ON: gia in gittata -> attack + attack, id univoci', () => {
  withFlag('true', () => {
    const { intents } = declareFor(session([sis('s1', 3, 5), pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 2);
    assert.ok(mine.every((i) => i.action.type === 'attack'));
    assert.notEqual(mine[0].action.id, mine[1].action.id, 'id univoci');
  });
});

test('ON: target lontano dal move_to -> SOLO move (niente attack a vuoto)', () => {
  withFlag('true', () => {
    // NOTA: x=5 (non 9) -- sessionHelpers.stepTowards() clampa senza bounds su
    // GRID_SIZE=6 legacy (ignora il gridSize:16 del test); x=9 avrebbe prodotto
    // uno "step" fantasma di 4 celle (9->5) collassando ap_cost oltre il budget
    // e mascherando l'assert (NO_AP invece di un move singolo). x=5 resta il
    // caso "target lontano dopo un passo singolo" senza toccare quel clamp.
    const { intents } = declareFor(session([sis('s1', 5, 5), pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 1, 'nessun attack fuori gittata post-move');
    assert.equal(mine[0].action.type, 'move');
  });
});

test('ON: ap_remaining 1 -> un intent; 0 -> zero intent con rule NO_AP', () => {
  withFlag('true', () => {
    const one = declareFor(session([sis('s1', 3, 5, { ap_remaining: 1 }), pg('p1', 2, 5)]));
    assert.equal(one.intents.filter((i) => i.unit_id === 's1').length, 1);
    const zero = declareFor(session([sis('s1', 3, 5, { ap_remaining: 0 }), pg('p1', 2, 5)]));
    assert.equal(zero.intents.filter((i) => i.unit_id === 's1').length, 0);
    const d = zero.decisions.find((x) => x.unit_id === 's1');
    assert.equal(d.rule, 'NO_AP');
  });
});

test('OFF: 1 intent per unita, come oggi', () => {
  const off = withFlag(undefined, () => declareFor(session([sis('s1', 4, 5), pg('p1', 2, 5)])));
  assert.equal(off.intents.filter((i) => i.unit_id === 's1').length, 1);
});
