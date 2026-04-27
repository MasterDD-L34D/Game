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

test('trait_mechanics.yaml contiene tutti e 33 i core trait di traits_inventory.json', () => {
  const catalog = loadCatalog();
  const coreIds = loadCoreTraitIds();
  assert.equal(coreIds.length, 33, 'traits_inventory.json deve esporre 33 core');
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
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        cost_ap: 1,
        resistances: [],
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
        attack_mod: 0,
        defense_mod: 0,
        damage_step: -1,
        cost_ap: 1,
        resistances: [],
        active_effects: [],
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
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        cost_ap: 1,
        resistances: [],
        active_effects: [],
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

  // Post nerf 2026-04-25 #1869: sangue_piroforico ridotto a damage_step 0 +
  // resistance fuoco 10 (era 20). Resta breaker per attack_mod >=1 ma damage
  // step lasciato a 0 dopo audit dominance — quindi escluso dal damage_step
  // invariant check.
  const breakerTraitsAttack = ['artigli_sette_vie', 'sangue_piroforico', 'frusta_fiammeggiante'];
  const breakerTraitsDamageStep = ['artigli_sette_vie', 'frusta_fiammeggiante'];
  for (const id of breakerTraitsAttack) {
    assert.ok(t[id], `breaker trait ${id} presente`);
    assert.ok(
      t[id].attack_mod >= 1,
      `breaker ${id}: attack_mod >= 1 (attuale ${t[id].attack_mod})`,
    );
  }
  for (const id of breakerTraitsDamageStep) {
    assert.ok(
      t[id].damage_step >= 1,
      `breaker ${id}: damage_step >= 1 (attuale ${t[id].damage_step})`,
    );
  }

  const tankSampleTraits = [
    'struttura_elastica_amorfa',
    'cute_resistente_sali',
    'carapace_fase_variabile',
  ];
  for (const id of tankSampleTraits) {
    assert.ok(t[id], `tank trait ${id} presente`);
    assert.ok(
      t[id].defense_mod >= 1,
      `tank ${id}: defense_mod >= 1 (attuale ${t[id].defense_mod})`,
    );
  }

  const t3 = t.mantello_meteoritico;
  assert.ok(t3, 'mantello_meteoritico presente');
  assert.equal(
    t3.defense_mod,
    2,
    'mantello_meteoritico e T3 tank: defense_mod deve essere promosso a 2',
  );
});

test('trait_mechanics.yaml rispetta cost_ap derivato da fattore_mantenimento_energetico', () => {
  const catalog = loadCatalog();
  const t = catalog.traits;
  // Balance audit 2026-04-25: artigli_sette_vie cost_ap 1→2 (EV/AP outlier, dominance fix).
  assert.equal(t.artigli_sette_vie.cost_ap, 2, 'Balance audit 2026-04-25: bumped 1→2');
  assert.equal(t.scheletro_idro_regolante.cost_ap, 2, 'Medio -> 2');
  assert.equal(t.criostasi_adattiva.cost_ap, 3, 'Alto -> 3');
});

test('Fase 8: spore_psichiche_silenziate ha on_hit_status e on_hit_stress_delta popolati', () => {
  const catalog = loadCatalog();
  const spore = catalog.traits.spore_psichiche_silenziate;
  assert.ok(spore, 'spore_psichiche_silenziate presente');
  assert.ok(spore.on_hit_status, 'on_hit_status presente');
  assert.equal(spore.on_hit_status.status_id, 'disorient');
  assert.ok(typeof spore.on_hit_stress_delta === 'number' && spore.on_hit_stress_delta > 0);
});

test('traitMechanics schema rifiuta on_hit_status con status_id non canonico', () => {
  const validator = buildValidator();
  const broken = {
    schema_version: '0.2.0',
    traits: {
      bad_trait: {
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        cost_ap: 1,
        resistances: [],
        active_effects: [],
        on_hit_status: {
          status_id: 'frozen',
          duration: 2,
          intensity: 1,
          trigger_dc: 12,
        },
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
        attack_mod: 0,
        defense_mod: 0,
        damage_step: 0,
        cost_ap: 1,
        resistances: [],
        active_effects: [],
        on_hit_stress_delta: 1.5,
      },
    },
  };
  assert.throws(
    () => validator.validate(SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('Fase 3-bis: coda_frusta_cinetica e hybrid (attack 1, defense 1, damage 0)', () => {
  const catalog = loadCatalog();
  const coda = catalog.traits.coda_frusta_cinetica;
  assert.ok(coda, 'coda_frusta_cinetica presente');
  assert.equal(coda.attack_mod, 1, 'hybrid: attack_mod == 1');
  assert.equal(coda.defense_mod, 1, 'hybrid: defense_mod == 1');
  assert.equal(coda.damage_step, 0, 'hybrid: damage_step == 0 (no double-dip)');
});

test('Fase 3-bis: mobility discount selettivo solo per FME Alto', () => {
  const catalog = loadCatalog();
  const t = catalog.traits;
  assert.equal(
    t.nucleo_ovomotore_rotante.cost_ap,
    2,
    'nucleo_ovomotore_rotante: FME Alto con discount mobility -> 3-1=2',
  );
  assert.equal(
    t.respiro_a_scoppio.cost_ap,
    2,
    'respiro_a_scoppio: FME Alto con discount mobility -> 3-1=2',
  );
  assert.equal(
    t.zoccoli_risonanti_steppe.cost_ap,
    1,
    'zoccoli_risonanti_steppe: FME Basso gia al floor, no discount',
  );
  assert.equal(
    t.criostasi_adattiva.cost_ap,
    3,
    'criostasi_adattiva: defensive non mobility, FME Alto invariato',
  );
});

test('Fase 3-bis: damage_step cap <= 2 per tutti i 30 core', () => {
  const catalog = loadCatalog();
  const violations = Object.entries(catalog.traits)
    .filter(([, entry]) => entry.damage_step > 2)
    .map(([id, entry]) => `${id}: damage_step=${entry.damage_step}`);
  assert.deepEqual(
    violations,
    [],
    `damage_step deve essere <= 2 per tutti i core (cap framework). Violazioni: ${violations.join(', ')}`,
  );
});

test('Fase 3-bis: resistances presenti e coerenti (permissivo)', () => {
  const catalog = loadCatalog();
  const withRes = Object.entries(catalog.traits).filter(
    ([, entry]) => Array.isArray(entry.resistances) && entry.resistances.length > 0,
  );
  assert.ok(
    withRes.length >= 8,
    `almeno 8 trait dovrebbero avere resistances (pass Balancer 3-bis ne ha popolate 10). Trovati: ${withRes.length}`,
  );
  const allChannels = withRes.flatMap(([, entry]) => entry.resistances.map((r) => r.channel));
  // Balance audit 2026-04-25: canali non-canonici (gelo/cryo/acido) rimossi.
  // Sprint 6 (2026-04-27): aggiunti earth/wind/dark (AncientBeast Tier S #6 residuo).
  // Tutti i channel devono essere nella lista canonica species_resistances.yaml:9.
  const CANONICAL_CHANNELS = new Set([
    'elettrico',
    'psionico',
    'fisico',
    'fuoco',
    'gravita',
    'mentale',
    'taglio',
    'ionico',
    'earth',
    'wind',
    'dark',
  ]);
  const nonCanonical = allChannels.filter((ch) => !CANONICAL_CHANNELS.has(ch));
  assert.deepEqual(
    nonCanonical,
    [],
    `tutti i channel devono essere canonici. Drift trovati: ${nonCanonical.join(', ')}`,
  );
  for (const [id, entry] of withRes) {
    for (const res of entry.resistances) {
      assert.ok(
        typeof res.channel === 'string' && res.channel.length > 0,
        `${id}: ogni resistance deve avere channel valido`,
      );
      assert.ok(
        Number.isInteger(res.modifier_pct) && res.modifier_pct >= -100 && res.modifier_pct <= 100,
        `${id}: modifier_pct deve essere intero in [-100, 100]`,
      );
    }
  }
});
