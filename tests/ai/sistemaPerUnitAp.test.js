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
const { createApLedger } = require('../../apps/backend/services/combat/apLedger');

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
  id,
  controlled_by: 'sistema',
  hp: 10,
  max_hp: 10,
  ap: 2,
  ap_max: 2,
  mod: 2,
  dc: 12,
  attack_range: 1,
  initiative: 10,
  position: { x, y },
  status: {},
  ai_profile: 'aggressive',
  damage: { min: 1, max: 3 },
  ...over,
});
const pg = (id, x, y) => ({
  id,
  controlled_by: 'player',
  hp: 12,
  max_hp: 12,
  ap: 2,
  ap_max: 2,
  mod: 2,
  dc: 12,
  attack_range: 1,
  initiative: 12,
  position: { x, y },
  status: {},
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

// --- Il declare-side deve prezzare dal ledger, non da Manhattan grezzo. ---
// La risoluzione (sessionRoundBridge, ramo action.type === 'move') addebita
// SEMPRE resolveMoveApCost = max(1, dist - move_bonus_bonus), ricalcolato
// server-side. Se la dichiarazione prezza la dist grezza, il gate di budget e
// l'addebito divergono. Le unita' Sistema ricevono move_bonus_bonus davvero:
// il loop Ennea (bridge, `for (const unit of session.units)`) non filtra fazione.
//
// stepTowards reale muove 1 casella -> dist=1 -> max(1, 1-bonus) === 1 === dist:
// le due formule COINCIDONO e la divergenza resta invisibile in prod. Lo step
// iniettato qui salta 2 caselle, che e' il "budget-v2 multi-tile" gia' promesso
// dal commento sul campo ap_cost. E' li' che la divergenza morde.
function declareWithMultiTileStep(session_) {
  const jumpTwo = (from, to) => {
    const next = { ...from };
    if (from.x !== to.x) next.x += from.x < to.x ? 2 : -2;
    return next;
  };
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards: jumpTwo,
    manhattanDistance: manhattan,
    gridSize: 16,
  });
  return declare(session_);
}

test('ON: move multi-tile prezzato dal ledger -- move_bonus sconta il gate', () => {
  withFlag('true', () => {
    const actor = sis('s1', 6, 5, { ap_remaining: 1, move_bonus_bonus: 1 });
    const { intents } = declareWithMultiTileStep(session([actor, pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 1, 'max(1, 2-1) = 1 AP <= budget 1 -> il move e affordabile');
    assert.equal(mine[0].action.type, 'move');
    const led = createApLedger({ manhattanDistance: manhattan, gridSize: 16 });
    assert.equal(
      mine[0].action.ap_cost,
      led.resolveMoveApCost(actor, { x: 6, y: 5 }, mine[0].action.move_to),
      'ap_cost dichiarato == quello che la risoluzione addebitera',
    );
  });
});

// Caratterizzazione: perche' la divergenza NON ha mai morso in prod. stepTowards
// muove 1 casella, quindi dist=1 e max(1, 1 - bonus) === 1 === dist qualunque sia
// il move_bonus. Se un domani il passo diventa multi-tile, questo test resta verde
// ma quello sopra e' l'unico che cattura la regressione: non cancellarlo.
test('ON: passo singolo -- ledger e Manhattan coincidono (percio prod era salvo)', () => {
  withFlag('true', () => {
    const actor = sis('s1', 4, 5, { ap_remaining: 2, move_bonus_bonus: 1 });
    const { intents } = declareFor(session([actor, pg('p1', 2, 5)]));
    const move = intents.find((i) => i.unit_id === 's1' && i.action.type === 'move');
    assert.ok(move, 'approach a 2 celle -> move');
    assert.equal(manhattan({ x: 4, y: 5 }, move.action.move_to), 1, 'stepTowards = 1 casella');
    assert.equal(move.action.ap_cost, 1, 'max(1, 1-1) = 1 = dist grezza: nessuna divergenza');
  });
});
