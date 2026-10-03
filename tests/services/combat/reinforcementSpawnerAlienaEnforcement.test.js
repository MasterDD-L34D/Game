// §21 ALIENA enforcement integration — reinforcementSpawner threads
// policy.aliena_enforcement into pickPoolEntry/applyBiomeBias. Default-OFF.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const { tick } = require('../../../apps/backend/services/combat/reinforcementSpawner');

function mockSession(overrides = {}) {
  return {
    pressure: 30, // Alert → budget 1
    round: 3,
    turn: 3,
    grid: { width: 10, height: 10 },
    units: [
      { id: 'p1', controlled_by: 'player', position: [0, 0], hp: 10 },
      { id: 'p2', controlled_by: 'player', position: [1, 0], hp: 10 },
    ],
    ...overrides,
  };
}

// Two-entry pool with sharply different ALIENA coherence so enforcement
// measurably reshapes the weighted pick distribution.
function enfEncounter(policyOverrides = {}) {
  return {
    biome_id: 'spore_field',
    affixes: ['spore_diluite'],
    reinforcement_pool: [
      {
        unit_id: 'coherent',
        weight: 1,
        max_spawns: 5,
        tags: ['spore', 'fungal'],
        narrative_hooks: ['bloom'],
        role: 'apex',
      },
      { unit_id: 'incoherent', weight: 1, max_spawns: 5, tags: ['neutral'] },
    ],
    reinforcement_entry_tiles: [
      [9, 9],
      [8, 9],
      [9, 8],
    ],
    reinforcement_policy: {
      enabled: true,
      min_tier: 'Alert',
      cooldown_rounds: 0,
      max_total_spawns: 10,
      ...policyOverrides,
    },
  };
}

// rng=0.78: baseline total 3.5 → r=2.73 > coherent(2.5) → picks 'incoherent';
// enforced total 3.0 → r=2.34 < coherent(2.5) → picks 'coherent'. Clean flip.
const RNG_FLIP = () => 0.78;

test('enforcement strength=1 reshapes pick vs default-OFF baseline (same rng)', () => {
  const baseRes = tick(mockSession(), enfEncounter(), { rng: RNG_FLIP });
  assert.equal(baseRes.budget_used, 1, 'baseline spawns 1');
  assert.equal(baseRes.spawned[0].unit_id, 'incoherent', 'baseline rng picks incoherent');

  const enfRes = tick(
    mockSession(),
    enfEncounter({ aliena_enforcement: { enabled: true, strength: 1 } }),
    {
      rng: RNG_FLIP,
    },
  );
  assert.equal(enfRes.budget_used, 1, 'enforced spawns 1');
  assert.equal(
    enfRes.spawned[0].unit_id,
    'coherent',
    'enforcement down-weights incoherent → coherent picked at same rng',
  );
});

test('enforcement enabled: tick completes without throwing, budget respected', () => {
  const session = mockSession();
  let res;
  assert.doesNotThrow(() => {
    res = tick(session, enfEncounter({ aliena_enforcement: { enabled: true, strength: 1 } }), {
      rng: () => 0.999,
    });
  });
  assert.equal(res.budget_used, 1, 'Alert tier budget honored under enforcement');
  assert.equal(res.spawned.length, 1);
  assert.ok(['coherent', 'incoherent'].includes(res.spawned[0].unit_id));
});

test('default-OFF golden: aliena_enforcement absent → same spawn as baseline (same rng)', () => {
  const rng = () => 0.42;
  const baseline = tick(mockSession(), enfEncounter(), { rng });
  const disabledFalse = tick(
    mockSession(),
    enfEncounter({ aliena_enforcement: { enabled: false } }),
    {
      rng,
    },
  );
  const strengthZero = tick(
    mockSession(),
    enfEncounter({ aliena_enforcement: { enabled: true, strength: 0 } }),
    { rng },
  );
  assert.equal(
    baseline.spawned[0].unit_id,
    disabledFalse.spawned[0].unit_id,
    'enabled:false = no-op',
  );
  assert.equal(baseline.spawned[0].unit_id, strengthZero.spawned[0].unit_id, 'strength:0 = no-op');
});
