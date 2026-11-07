const test = require('node:test');
const assert = require('node:assert/strict');

const { combatSchema } = require('../../packages/contracts');
const {
  createSchemaValidator,
  SchemaValidationError,
} = require('../../apps/backend/middleware/schemaValidator');

const COMBAT_SCHEMA_ID = 'contracts://combat/state';
const ACTION_SCHEMA_ID = 'contracts://combat/action';

function buildValidator() {
  const validator = createSchemaValidator();
  validator.registerSchema(COMBAT_SCHEMA_ID, combatSchema);
  const actionSubschema = {
    $schema: combatSchema.$schema,
    $id: 'https://contracts.game.local/combat.action.schema.json',
    ...combatSchema.$defs.action,
    $defs: combatSchema.$defs,
  };
  validator.registerSchema(ACTION_SCHEMA_ID, actionSubschema);
  return validator;
}

function buildMinimalUnit(overrides = {}) {
  return {
    id: 'party-alpha',
    species_id: 'anguis_magnetica',
    side: 'party',
    tier: 3,
    hp: { current: 18, max: 18 },
    ap: { current: 2, max: 2 },
    armor: 4,
    initiative: 12,
    stress: 0,
    statuses: [],
    resistances: [],
    trait_ids: ['integumento_bipolare'],
    pt: 0,
    reactions: { current: 1, max: 1 },
    ...overrides,
  };
}

function buildMinimalState(overrides = {}) {
  return {
    session_id: 'demo-session-1',
    seed: 'demo',
    encounter_id: null,
    turn: 1,
    initiative_order: ['party-alpha', 'hostile-01'],
    active_unit_id: 'party-alpha',
    units: [
      buildMinimalUnit(),
      buildMinimalUnit({
        id: 'hostile-01',
        species_id: 'aetherloom_stalker',
        side: 'hostile',
        initiative: 9,
      }),
    ],
    vc: null,
    log: [],
    ...overrides,
  };
}

test('combat schema accetta uno stato minimo valido', () => {
  const validator = buildValidator();
  assert.doesNotThrow(() => validator.validate(COMBAT_SCHEMA_ID, buildMinimalState()));
});

test('combat schema accetta stato con party_vc completa, status attivi e turn log', () => {
  const validator = buildValidator();
  const state = buildMinimalState({
    turn: 3,
    vc: {
      aggro: 'mid',
      cohesion: 'high',
      setup: 'mid',
      explore: 'low',
      risk: 'mid',
    },
    units: [
      buildMinimalUnit({
        statuses: [
          {
            id: 'bleeding',
            intensity: 2,
            remaining_turns: 3,
            source_unit_id: 'hostile-01',
            source_action_id: 'act-001',
          },
        ],
      }),
      buildMinimalUnit({
        id: 'hostile-01',
        species_id: 'aetherloom_stalker',
        side: 'hostile',
        hp: { current: 6, max: 12 },
        initiative: 9,
      }),
    ],
    log: [
      {
        turn: 1,
        action: {
          id: 'act-001',
          type: 'attack',
          actor_id: 'party-alpha',
          target_id: 'hostile-01',
          ability_id: null,
          ap_cost: 1,
          channel: 'electric',
        },
        roll: {
          natural: 18,
          modifier: 4,
          total: 22,
          dc: 14,
          success: true,
          mos: 8,
          damage_step: 2,
          pt_gained: 2,
          pp_gained: 0,
          is_crit: false,
          is_fumble: false,
        },
        damage_applied: 6,
        statuses_applied: [
          {
            id: 'bleeding',
            intensity: 2,
            remaining_turns: 3,
            source_unit_id: 'party-alpha',
            source_action_id: 'act-001',
          },
        ],
        statuses_expired: [],
      },
    ],
  });
  assert.doesNotThrow(() => validator.validate(COMBAT_SCHEMA_ID, state));
});

test('combat schema rifiuta stato senza campi obbligatori', () => {
  const validator = buildValidator();
  const broken = buildMinimalState();
  delete broken.session_id;
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, broken),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta status con id fuori dall enum dei 5 status supportati', () => {
  const validator = buildValidator();
  const state = buildMinimalState({
    units: [
      buildMinimalUnit({
        statuses: [{ id: 'frozen', intensity: 1, remaining_turns: 2 }],
      }),
      buildMinimalUnit({ id: 'hostile-01', side: 'hostile' }),
    ],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta roll_result con naturale fuori range d20', () => {
  const validator = buildValidator();
  const state = buildMinimalState({
    log: [
      {
        turn: 1,
        action: {
          id: 'act-001',
          type: 'attack',
          actor_id: 'party-alpha',
          target_id: 'hostile-01',
          ap_cost: 1,
        },
        roll: {
          natural: 21,
          modifier: 0,
          total: 21,
          dc: 12,
          success: true,
          mos: 9,
          damage_step: 2,
          pt_gained: 2,
          is_crit: true,
          is_fumble: false,
        },
      },
    ],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('action schema valida una attack action con target_id', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-010',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
  };
  assert.doesNotThrow(() => validator.validate(ACTION_SCHEMA_ID, action));
});

test('action schema rifiuta attack action senza target_id (vincolo condizionale)', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-011',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: null,
    ap_cost: 1,
  };
  assert.throws(
    () => validator.validate(ACTION_SCHEMA_ID, action),
    (error) => error instanceof SchemaValidationError,
  );
});

test('action schema rifiuta ability action senza ability_id (vincolo condizionale)', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-012',
    type: 'ability',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 2,
  };
  assert.throws(
    () => validator.validate(ACTION_SCHEMA_ID, action),
    (error) => error instanceof SchemaValidationError,
  );
});

test('action schema accetta move action senza target', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-013',
    type: 'move',
    actor_id: 'party-alpha',
    target_id: null,
    ap_cost: 1,
  };
  assert.doesNotThrow(() => validator.validate(ACTION_SCHEMA_ID, action));
});

test('combat schema accetta unit con stress float 0-1 e resistances percentuali', () => {
  const validator = buildValidator();
  const state = buildMinimalState({
    units: [
      buildMinimalUnit({
        stress: 0.5,
        armor: 5,
        resistances: [
          { channel: 'elettrico', modifier_pct: 20 },
          { channel: 'psionico', modifier_pct: 10 },
          { channel: 'fuoco', modifier_pct: -15 },
        ],
      }),
      buildMinimalUnit({
        id: 'hostile-01',
        species_id: 'aetherloom_stalker',
        side: 'hostile',
        armor: 11,
        stress: 0.75,
      }),
    ],
  });
  assert.doesNotThrow(() => validator.validate(COMBAT_SCHEMA_ID, state));
});

test('combat schema rifiuta stress fuori range 0-1', () => {
  const validator = buildValidator();
  const state = buildMinimalState({
    units: [
      buildMinimalUnit({ stress: 1.5 }),
      buildMinimalUnit({ id: 'hostile-01', side: 'hostile' }),
    ],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta resistance entry senza modifier_pct', () => {
  const validator = buildValidator();
  const state = buildMinimalState({
    units: [
      buildMinimalUnit({ resistances: [{ channel: 'elettrico' }] }),
      buildMinimalUnit({ id: 'hostile-01', side: 'hostile' }),
    ],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta unit senza armor (campo ora obbligatorio)', () => {
  const validator = buildValidator();
  const brokenUnit = buildMinimalUnit();
  delete brokenUnit.armor;
  const state = buildMinimalState({
    units: [brokenUnit, buildMinimalUnit({ id: 'hostile-01', side: 'hostile' })],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta unit senza tier (campo ora obbligatorio)', () => {
  const validator = buildValidator();
  const brokenUnit = buildMinimalUnit();
  delete brokenUnit.tier;
  const state = buildMinimalState({
    units: [brokenUnit, buildMinimalUnit({ id: 'hostile-01', side: 'hostile' })],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta unit senza pt (campo obbligatorio Fase 2-quater)', () => {
  const validator = buildValidator();
  const brokenUnit = buildMinimalUnit();
  delete brokenUnit.pt;
  const state = buildMinimalState({
    units: [brokenUnit, buildMinimalUnit({ id: 'hostile-01', side: 'hostile' })],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('combat schema rifiuta unit senza reactions (campo obbligatorio Fase 2-quater)', () => {
  const validator = buildValidator();
  const brokenUnit = buildMinimalUnit();
  delete brokenUnit.reactions;
  const state = buildMinimalState({
    units: [brokenUnit, buildMinimalUnit({ id: 'hostile-01', side: 'hostile' })],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, state),
    (error) => error instanceof SchemaValidationError,
  );
});

test('action schema accetta attack con pt_spend perforazione', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-pt-01',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
    pt_spend: { type: 'perforazione', amount: 2 },
  };
  assert.doesNotThrow(() => validator.validate(ACTION_SCHEMA_ID, action));
});

test('action schema rifiuta pt_spend con type non supportato', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-pt-02',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
    pt_spend: { type: 'spinte', amount: 3 },
  };
  assert.throws(
    () => validator.validate(ACTION_SCHEMA_ID, action),
    (error) => error instanceof SchemaValidationError,
  );
});

test('action schema accetta attack con parry_response opt-in', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-parry-01',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
    parry_response: { attempt: true, parry_bonus: 0 },
  };
  assert.doesNotThrow(() => validator.validate(ACTION_SCHEMA_ID, action));
});

test('combat schema rifiuta tier fuori range 1-6', () => {
  const validator = buildValidator();
  const stateZero = buildMinimalState({
    units: [buildMinimalUnit({ tier: 0 }), buildMinimalUnit({ id: 'hostile-01', side: 'hostile' })],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, stateZero),
    (error) => error instanceof SchemaValidationError,
  );
  const stateSeven = buildMinimalState({
    units: [buildMinimalUnit({ tier: 7 }), buildMinimalUnit({ id: 'hostile-01', side: 'hostile' })],
  });
  assert.throws(
    () => validator.validate(COMBAT_SCHEMA_ID, stateSeven),
    (error) => error instanceof SchemaValidationError,
  );
});

test('action schema accetta attack action con damage_dice XdY+Z', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-020',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
    channel: 'elettrico',
    damage_dice: { count: 1, sides: 8, modifier: 3 },
  };
  assert.doesNotThrow(() => validator.validate(ACTION_SCHEMA_ID, action));
});

test('action schema accetta boss attack 2d12+6 dal Frattura draft', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-021',
    type: 'attack',
    actor_id: 'leviatano-risonante',
    target_id: 'party-alpha',
    ap_cost: 1,
    channel: 'gravita',
    damage_dice: { count: 2, sides: 12, modifier: 6 },
  };
  assert.doesNotThrow(() => validator.validate(ACTION_SCHEMA_ID, action));
});

test('action schema rifiuta damage_dice con facce non standard', () => {
  const validator = buildValidator();
  const action = {
    id: 'act-022',
    type: 'attack',
    actor_id: 'party-alpha',
    target_id: 'hostile-01',
    ap_cost: 1,
    damage_dice: { count: 1, sides: 7, modifier: 0 },
  };
  assert.throws(
    () => validator.validate(ACTION_SCHEMA_ID, action),
    (error) => error instanceof SchemaValidationError,
  );
});
