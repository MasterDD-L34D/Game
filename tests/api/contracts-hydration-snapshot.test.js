const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { combatSchema } = require('../../packages/contracts');
const {
  createSchemaValidator,
  SchemaValidationError,
} = require('../../apps/backend/middleware/schemaValidator');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOT_PATH = path.join(REPO_ROOT, 'tests', 'snapshots', 'hydration_caverna.json');

const SCHEMA_ID = 'contracts://combat/state';

function buildValidator() {
  const validator = createSchemaValidator();
  validator.registerSchema(SCHEMA_ID, combatSchema);
  return validator;
}

function loadSnapshot() {
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
}

test('hydration snapshot valida contro combat.schema.json (cross-lang integrity)', () => {
  const validator = buildValidator();
  const state = loadSnapshot();
  assert.doesNotThrow(
    () => validator.validate(SCHEMA_ID, state),
    'lo snapshot hydration_caverna.json (frozen pre-Phase-3-removal) deve essere accettato dal combat schema',
  );
});

test('hydration snapshot ha 7 unita (3 party + 4 hostile) coerenti con encounter_caverna', () => {
  const state = loadSnapshot();
  assert.equal(state.units.length, 7);
  const party = state.units.filter((u) => u.side === 'party');
  const hostile = state.units.filter((u) => u.side === 'hostile');
  assert.equal(party.length, 3);
  assert.equal(hostile.length, 4);
});

test('hydration snapshot aggrega correttamente resistances per canale', () => {
  const state = loadSnapshot();
  const party02 = state.units.find((u) => u.id === 'party-02');
  assert.ok(party02, 'party-02 presente');
  // mantello_meteoritico: fisico +20, fuoco +20
  // sangue_piroforico: fuoco +10 (post nerf #1869 — was +20 pre-balance audit)
  // Atteso aggregato: fisico 20, fuoco 30
  const byChannel = Object.fromEntries(party02.resistances.map((r) => [r.channel, r.modifier_pct]));
  assert.equal(byChannel.fisico, 20);
  assert.equal(byChannel.fuoco, 30);
});

test('hydration snapshot propaga canale ionico (criostasi_adattiva) su party-03', () => {
  // Balance audit 2026-04-25: canale `gelo` rimappato a `ionico` canonico.
  const state = loadSnapshot();
  const party03 = state.units.find((u) => u.id === 'party-03');
  assert.ok(party03, 'party-03 presente');
  const hasIonico = party03.resistances.some((r) => r.channel === 'ionico');
  assert.ok(hasIonico, 'criostasi_adattiva deve propagare il canale ionico (ex-gelo)');
});

test('hydration snapshot hostile derivati da power: power 7 -> hp 110 armor 5 init 15', () => {
  const state = loadSnapshot();
  const h01 = state.units.find((u) => u.id === 'hostile-01');
  assert.ok(h01);
  assert.equal(h01.hp.max, 110);
  assert.equal(h01.armor, 5);
  assert.equal(h01.initiative, 15);
});

test('hydration snapshot hostile power 4 -> hp 80 armor 4 init 12', () => {
  const state = loadSnapshot();
  const h04 = state.units.find((u) => u.id === 'hostile-04');
  assert.ok(h04);
  assert.equal(h04.hp.max, 80);
  assert.equal(h04.armor, 4);
  assert.equal(h04.initiative, 12);
});

test('hydration snapshot initiative_order ordinato desc con tiebreak alfabetico', () => {
  const state = loadSnapshot();
  // Verifica che l'ordine rifletta l'iniziativa desc
  const idToInit = Object.fromEntries(state.units.map((u) => [u.id, u.initiative]));
  for (let i = 1; i < state.initiative_order.length; i += 1) {
    const prev = state.initiative_order[i - 1];
    const curr = state.initiative_order[i];
    assert.ok(
      idToInit[prev] > idToInit[curr] || (idToInit[prev] === idToInit[curr] && prev < curr),
      `ordine errato tra ${prev} (init ${idToInit[prev]}) e ${curr} (init ${idToInit[curr]})`,
    );
  }
});
