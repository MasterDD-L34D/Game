const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { traitMechanicsSchema } = require('../../packages/contracts');
const {
  createSchemaValidator,
  SchemaValidationError,
} = require('../../apps/backend/middleware/schemaValidator');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MECHANICS_PATH = path.join(
  REPO_ROOT,
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'trait_mechanics.yaml',
);
const INVENTORY_PATH = path.join(REPO_ROOT, 'docs', 'catalog', 'traits_inventory.json');

const SCHEMA_ID = 'contracts://trait-mechanics/catalog';

function loadCatalog() {
  const raw = fs.readFileSync(MECHANICS_PATH, 'utf8');
  return yaml.load(raw);
}

function loadCoreTraitIds() {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  return inventory.core_traits;
}

function buildValidator() {
  const validator = createSchemaValidator();
  validator.registerSchema(SCHEMA_ID, traitMechanicsSchema);
  return validator;
}

test('trait_mechanics.yaml esiste ed e parseabile', () => {
  const catalog = loadCatalog();
  assert.ok(catalog && typeof catalog === 'object');
  assert.equal(typeof catalog.schema_version, 'string');
  assert.ok(catalog.traits && typeof catalog.traits === 'object');
});

test('trait_mechanics.yaml valida contro traitMechanics schema', () => {
  const validator = buildValidator();
  const catalog = loadCatalog();
  assert.doesNotThrow(() => validator.validate(SCHEMA_ID, catalog));
});

test('trait_mechanics.yaml contiene tutti e 30 i core trait di traits_inventory.json', () => {
  const catalog = loadCatalog();
  const coreIds = loadCoreTraitIds();
  assert.equal(coreIds.length, 30, 'traits_inventory.json deve esporre 30 core');
  const present = Object.keys(catalog.traits);
  const missing = coreIds.filter((id) => !present.includes(id));
  assert.deepEqual(missing, [], `core trait mancanti nel layer: ${missing.join(', ')}`);
});

test('traitMechanics schema rifiuta entry con campo obbligatorio mancante', () => {
  const validator = buildValidator();
  const broken = {
    schema_version: '0.1.0',
    traits: {
      broken_entry: {
        trait_code: 'TR-9999',
        label: 'Broken',
        class: 'offensive',
        tier: 'T1',
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        damage_channel: null,
        resistances: {},
        on_hit_status: null,
        on_hit_stress_delta: 0.0,
        // note_balance mancante
      },
    },
  };
  assert.throws(
    () => validator.validate(SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('traitMechanics schema rifiuta damage_step negativo', () => {
  const validator = buildValidator();
  const broken = {
    schema_version: '0.1.0',
    traits: {
      broken_entry: {
        trait_code: 'TR-9999',
        label: 'Broken',
        class: 'offensive',
        tier: 'T1',
        attack_mod: 0,
        defense_mod: 0,
        damage_step: -1,
        damage_channel: null,
        resistances: {},
        on_hit_status: null,
        on_hit_stress_delta: 0.0,
        note_balance: 'test',
      },
    },
  };
  assert.throws(
    () => validator.validate(SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('traitMechanics schema rifiuta chiave trait con pattern invalido', () => {
  const validator = buildValidator();
  const broken = {
    schema_version: '0.1.0',
    traits: {
      'Bad-Key': {
        trait_code: 'TR-9999',
        label: 'Broken',
        class: 'offensive',
        tier: 'T1',
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        damage_channel: null,
        resistances: {},
        on_hit_status: null,
        on_hit_stress_delta: 0.0,
        note_balance: 'test',
      },
    },
  };
  assert.throws(
    () => validator.validate(SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('trait_mechanics.yaml rispetta le invarianti euristiche documentate nell ADR', () => {
  const catalog = loadCatalog();
  const t = catalog.traits;

  // Offensive traits (breaker): attack_mod >= 1 e damage_step >= 1
  const breakerTraits = [
    'rostro_emostatico_litico',
    'scheletro_idraulico_a_pistoni',
    'estroflessione_gastrica_acida',
  ];
  for (const id of breakerTraits) {
    assert.ok(t[id], `breaker trait ${id} presente`);
    assert.ok(
      t[id].attack_mod >= 1,
      `breaker ${id}: attack_mod >= 1 (attuale ${t[id].attack_mod})`,
    );
    assert.ok(
      t[id].damage_step >= 1,
      `breaker ${id}: damage_step >= 1 (attuale ${t[id].damage_step})`,
    );
  }

  // Defensive traits (tank): defense_mod >= 1
  const tankSampleTraits = [
    'scudo_gluteale_cheratinizzato',
    'membrana_plastica_continua',
    'cisti_di_ibernazione_minerale',
  ];
  for (const id of tankSampleTraits) {
    assert.ok(t[id], `tank trait ${id} presente`);
    assert.ok(
      t[id].defense_mod >= 1,
      `tank ${id}: defense_mod >= 1 (attuale ${t[id].defense_mod})`,
    );
  }

  const t3 = t.scudo_gluteale_cheratinizzato;
  assert.ok(t3, 'scudo_gluteale_cheratinizzato presente');
  assert.equal(
    t3.defense_mod,
    2,
    'scudo_gluteale_cheratinizzato e T3 tank: defense_mod deve essere promosso a 2',
  );
});

test('trait_mechanics.yaml rispetta tier coerente con valori combat', () => {
  const catalog = loadCatalog();
  const t = catalog.traits;
  // T4 offensive traits should have higher combined attack_mod + damage_step
  assert.equal(t.rostro_emostatico_litico.tier, 'T4');
  assert.ok(t.rostro_emostatico_litico.attack_mod + t.rostro_emostatico_litico.damage_step >= 3);
  // T2 utility should have low combat stats
  assert.equal(t.comunicazione_fotonica_coda_coda.tier, 'T2');
  assert.equal(t.comunicazione_fotonica_coda_coda.attack_mod, 0);
  assert.equal(t.comunicazione_fotonica_coda_coda.damage_step, 0);
});

test('Fase 8: rostro_emostatico_litico ha on_hit_status e on_hit_stress_delta popolati', () => {
  const catalog = loadCatalog();
  const rostro = catalog.traits.rostro_emostatico_litico;
  assert.ok(rostro, 'rostro_emostatico_litico presente');
  assert.ok(rostro.on_hit_status, 'on_hit_status presente');
  assert.equal(rostro.on_hit_status.name, 'sanguinamento');
  assert.ok(typeof rostro.on_hit_stress_delta === 'number' && rostro.on_hit_stress_delta > 0);
});

test('traitMechanics schema rifiuta on_hit_status con name non snake_case', () => {
  const validator = buildValidator();
  const broken = {
    schema_version: '0.2.0',
    traits: {
      bad_trait: {
        trait_code: 'TR-9999',
        label: 'Bad',
        class: 'offensive',
        tier: 'T1',
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        damage_channel: null,
        resistances: {},
        on_hit_status: {
          name: 'Bad-Name',
          dc: 12,
          duration_turns: 2,
        },
        on_hit_stress_delta: 0.0,
        note_balance: 'test',
      },
    },
  };
  assert.throws(
    () => validator.validate(SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('traitMechanics schema rifiuta on_hit_stress_delta fuori range [-1, 1]', () => {
  const validator = buildValidator();
  const broken = {
    schema_version: '0.2.0',
    traits: {
      bad_trait: {
        trait_code: 'TR-9999',
        label: 'Bad',
        class: 'offensive',
        tier: 'T1',
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        damage_channel: null,
        resistances: {},
        on_hit_status: null,
        on_hit_stress_delta: 1.5,
        note_balance: 'test',
      },
    },
  };
  assert.throws(
    () => validator.validate(SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('Fase 3-bis: ipertrofia_muscolare_massiva e hybrid (attack 1, defense 1, damage 1)', () => {
  const catalog = loadCatalog();
  const ipertrofia = catalog.traits.ipertrofia_muscolare_massiva;
  assert.ok(ipertrofia, 'ipertrofia_muscolare_massiva presente');
  assert.equal(ipertrofia.attack_mod, 1, 'hybrid: attack_mod == 1');
  assert.equal(ipertrofia.defense_mod, 1, 'hybrid: defense_mod == 1');
  assert.equal(ipertrofia.damage_step, 1, 'hybrid: damage_step == 1');
  assert.equal(ipertrofia.class, 'hybrid');
});

test('Fase 3-bis: mobility traits hanno defense_mod 1 e damage_step 0', () => {
  const catalog = loadCatalog();
  const t = catalog.traits;
  const mobilityTraits = Object.entries(t).filter(([, entry]) => entry.class === 'mobility');
  assert.ok(
    mobilityTraits.length >= 4,
    `almeno 4 mobility trait presenti (trovati: ${mobilityTraits.length})`,
  );
  for (const [id, entry] of mobilityTraits) {
    assert.equal(
      entry.defense_mod,
      1,
      `mobility ${id}: defense_mod == 1 (attuale ${entry.defense_mod})`,
    );
    assert.equal(
      entry.damage_step,
      0,
      `mobility ${id}: damage_step == 0 (attuale ${entry.damage_step})`,
    );
  }
});

test('Fase 3-bis: damage_step cap <= 2 per tutti i 30 core', () => {
  const catalog = loadCatalog();
  const violations = Object.entries(catalog.traits)
    .filter(([, entry]) => entry.damage_step > 2)
    .map(([id, entry]) => `${id}: damage_step=${entry.damage_step}`);
  assert.deepEqual(
    violations,
    [],
    `damage_step deve essere <= 2 per tutti i core (T4 offensive cap). Violazioni: ${violations.join(', ')}`,
  );
});

test('Fase 3-bis: resistances presenti e coerenti (permissivo)', () => {
  const catalog = loadCatalog();
  const withRes = Object.entries(catalog.traits).filter(
    ([, entry]) =>
      typeof entry.resistances === 'object' &&
      entry.resistances !== null &&
      Object.keys(entry.resistances).length > 0,
  );
  assert.ok(
    withRes.length >= 8,
    `almeno 8 trait dovrebbero avere resistances. Trovati: ${withRes.length}`,
  );
  const allChannels = withRes.flatMap(([, entry]) => Object.keys(entry.resistances));
  assert.ok(
    allChannels.includes('cryo'),
    "canale 'cryo' deve essere presente (pelage_idrorepellente_avanzato, cisti_di_ibernazione_minerale)",
  );
  for (const [id, entry] of withRes) {
    for (const [channel, modifierPct] of Object.entries(entry.resistances)) {
      assert.ok(
        typeof channel === 'string' && channel.length > 0,
        `${id}: ogni resistance deve avere channel valido`,
      );
      assert.ok(
        Number.isInteger(modifierPct) && modifierPct >= -100 && modifierPct <= 100,
        `${id}: modifier_pct deve essere intero in [-100, 100]`,
      );
    }
  }
});
