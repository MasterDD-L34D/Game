// tests/ai/sistemaPerUnitActions.test.js -- falsifying experiment (OD-062 probe).
//
// Ipotesi sotto test (owner 2026-07-10): il ceiling WR 1.0 dei ratify N=40 NON e' un
// artefatto del driver AI-vs-AI ma il cap globale di intent del Sistema, che per
// costruzione tiene il Sistema sotto le 8 azioni/round del party
// (declareSistemaIntents.js INTENTS_ABS_CAP: "keeps Sistema below the party's 8").
//
// Flag SISTEMA_PER_UNIT_ACTIONS_ENABLED (default OFF): ON -> ogni unita' Sistema viva
// dichiara il suo intent (1/unita', mirror dell'AP ledger che gia' esiste per-unita'),
// il cap globale non gata piu' l'emissione. OFF -> byte-identical al pre-flag.
//
// NOTA DI SCOPE (dichiarata): ON = 1 intent per unita', NON 2 azioni/unita' come il
// party (4 PG x 2 AP). E' meta' del divario -- la meta' testabile senza toccare la
// risoluzione multi-azione. Il flag e' un probe, non una proposta di bilanciamento.
//
// Il flag e' letto a call-time (non a module-load) -> toggle per-test senza re-require.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDeclareSistemaIntents,
  isPerUnitActionsEnabled,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { pickLowestHpEnemy, stepTowards } = require('../../apps/backend/routes/sessionHelpers');

const FLAG = 'SISTEMA_PER_UNIT_ACTIONS_ENABLED';

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

const manhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function declareFor(session) {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: 16,
  });
  return declare(session);
}

const sis = (id, x, y) => ({
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

// Scenario = i 3 grid_sized a regime: wave-1 (3 unita') + 4 rinforzi appesi in coda,
// come li accoda il runtime. pressure 50 = Escalated -> cap tier 3.
function sessionAtRegime() {
  return {
    units: [
      sis('wave1_a', 12, 4),
      sis('wave1_b', 12, 5),
      sis('wave1_c', 12, 6),
      sis('reinf_1', 14, 3),
      sis('reinf_2', 14, 4),
      sis('reinf_3', 14, 7),
      sis('reinf_4', 14, 8),
      pg('p1', 2, 4),
      pg('p2', 2, 5),
      pg('p3', 3, 4),
      pg('p4', 3, 5),
    ],
    grid: { width: 16, height: 12 },
    sistema_pressure: 50,
  };
}

test('isPerUnitActionsEnabled: default OFF, solo "true" abilita', () => {
  withFlag(undefined, () => assert.equal(isPerUnitActionsEnabled(), false));
  withFlag('true', () => assert.equal(isPerUnitActionsEnabled(), true));
  withFlag('1', () => assert.equal(isPerUnitActionsEnabled(), false));
  withFlag('false', () => assert.equal(isPerUnitActionsEnabled(), false));
});

test('flag OFF: il cap globale morde -- i rinforzi in coda sono statue', () => {
  withFlag(undefined, () => {
    const { intents, decisions } = declareFor(sessionAtRegime());
    assert.equal(intents.length, 3, 'cap tier Escalated = 3 intent su 7 sistema vivi');
    const capped = decisions.filter((d) => d.rule === 'PRESSURE_CAP').map((d) => d.unit_id);
    assert.deepEqual(
      capped,
      ['reinf_1', 'reinf_2', 'reinf_3', 'reinf_4'],
      'lo skip segue l ordine di session.units: le prime vive agiscono, la coda no',
    );
  });
});

test('flag ON: ogni unita Sistema viva dichiara, zero PRESSURE_CAP', () => {
  withFlag('true', () => {
    const { intents, decisions } = declareFor(sessionAtRegime());
    assert.equal(intents.length, 7, '7 sistema vivi -> 7 intent (1 per unita)');
    assert.equal(
      decisions.filter((d) => d.rule === 'PRESSURE_CAP').length,
      0,
      'nessuna unita skippata dal cap',
    );
  });
});

test('flag ON: i morti restano esclusi (il flag toglie il cap, non la selezione vivi)', () => {
  withFlag('true', () => {
    const session = sessionAtRegime();
    session.units[0].hp = 0; // wave1_a morto
    const { intents } = declareFor(session);
    assert.equal(intents.length, 6, '6 sistema vivi su 7');
    assert.ok(
      !intents.some((i) => i.unit_id === 'wave1_a'),
      'un morto non dichiara nemmeno a flag ON',
    );
  });
});

test('flag OFF: roster piccolo (<= cap) identico a flag ON -- back-compat band-neutral', () => {
  const small = () => ({
    units: [
      sis('w1', 12, 4),
      sis('w2', 12, 5),
      sis('w3', 12, 6),
      pg('p1', 2, 4),
      pg('p2', 2, 5),
      pg('p3', 3, 4),
      pg('p4', 3, 5),
    ],
    grid: { width: 16, height: 12 },
    sistema_pressure: 50,
  });
  const off = withFlag(undefined, () => declareFor(small()));
  const on = withFlag('true', () => declareFor(small()));
  assert.equal(off.intents.length, 3);
  assert.deepEqual(
    on.intents,
    off.intents,
    'wave-1 (3 unita) == cap 3 -> il flag non cambia nulla: la divergenza nasce coi rinforzi',
  );
});
