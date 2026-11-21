// Sprint D — Lineage chain + Tribe emergent (OD-001 Path A 4/4).
//
// Tribe = lineage_id chain con >= 3 members. Pure unit tests; in-memory
// registry (process-scoped). Sprint C consumer wire (rollMating →
// recordOffspring) coperto altrove.
//
// Reference: feedback_tribe_lineage_emergent_breakthrough.md.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TRIBE_MIN_MEMBERS,
  recordOffspring,
  getLineageChain,
  getTribesEmergent,
  getTribeForUnit,
  listLineageEntries,
  _resetLineageRegistry,
} = require('../../apps/backend/services/metaProgression');

function reset() {
  _resetLineageRegistry();
}

// ─── Constants ──────────────────────────────────────────────────────────

test('Sprint D: TRIBE_MIN_MEMBERS = 3', () => {
  assert.equal(TRIBE_MIN_MEMBERS, 3);
});

// ─── recordOffspring ────────────────────────────────────────────────────

test('Sprint D: recordOffspring throws when entry missing unit_id', () => {
  reset();
  assert.throws(() => recordOffspring({}), /unit_id/);
  assert.throws(() => recordOffspring(null), /entry object/);
  assert.throws(() => recordOffspring({ unit_id: 123 }), /unit_id/);
});

test('Sprint D: recordOffspring normalizes parents=[] → generation=0 (founder)', () => {
  reset();
  const founder = recordOffspring({ unit_id: 'u_root', lineage_id: 'lin_alpha', parents: [] });
  assert.equal(founder.generation, 0);
  assert.deepEqual(founder.parents, []);
  assert.equal(founder.lineage_id, 'lin_alpha');
});

test('Sprint D: recordOffspring uses unit_id as fallback lineage_id', () => {
  reset();
  const lone = recordOffspring({ unit_id: 'u_solo' });
  assert.equal(lone.lineage_id, 'u_solo');
  assert.equal(lone.generation, 0);
});

test('Sprint D: recordOffspring is idempotent (overwrite by unit_id)', () => {
  reset();
  recordOffspring({ unit_id: 'u_x', lineage_id: 'lin_a', generation: 0 });
  recordOffspring({ unit_id: 'u_x', lineage_id: 'lin_a', generation: 1 });
  const all = listLineageEntries();
  assert.equal(all.length, 1);
  assert.equal(all[0].generation, 1);
});

// ─── getLineageChain ────────────────────────────────────────────────────

test('Sprint D: getLineageChain returns [] for unknown lineage', () => {
  reset();
  assert.deepEqual(getLineageChain('lin_nonexistent'), []);
  assert.deepEqual(getLineageChain(''), []);
  assert.deepEqual(getLineageChain(null), []);
});

test('Sprint D: getLineageChain single-gen (parent + 1 offspring)', () => {
  reset();
  recordOffspring({
    unit_id: 'u_parent_a',
    lineage_id: 'lin_beta',
    parents: [],
    generation: 0,
    born_at_session: 's1',
    born_at_biome: 'savana',
  });
  recordOffspring({
    unit_id: 'u_off_1',
    lineage_id: 'lin_beta',
    parents: ['u_parent_a', 'u_parent_b'],
    generation: 1,
    born_at_session: 's1',
    born_at_biome: 'savana',
  });
  const chain = getLineageChain('lin_beta');
  assert.equal(chain.length, 2);
  assert.equal(chain[0].generation, 0);
  assert.equal(chain[1].generation, 1);
  assert.equal(chain[0].unit_id, 'u_parent_a');
});

test('Sprint D: getLineageChain multi-gen sorts by generation ascending', () => {
  reset();
  // Insert out-of-order to test sort
  recordOffspring({
    unit_id: 'u_g2_1',
    lineage_id: 'lin_g',
    parents: ['u_g1_1', 'x'],
    generation: 2,
  });
  recordOffspring({ unit_id: 'u_root', lineage_id: 'lin_g', parents: [], generation: 0 });
  recordOffspring({
    unit_id: 'u_g1_1',
    lineage_id: 'lin_g',
    parents: ['u_root', 'y'],
    generation: 1,
  });
  recordOffspring({
    unit_id: 'u_g3_1',
    lineage_id: 'lin_g',
    parents: ['u_g2_1', 'z'],
    generation: 3,
  });
  const chain = getLineageChain('lin_g');
  assert.equal(chain.length, 4);
  assert.deepEqual(
    chain.map((c) => c.generation),
    [0, 1, 2, 3],
  );
});

// ─── getTribesEmergent ──────────────────────────────────────────────────

test('Sprint D: getTribesEmergent returns [] when registry empty', () => {
  reset();
  assert.deepEqual(getTribesEmergent(), []);
});

test('Sprint D: tribe threshold — 2 members = no tribe', () => {
  reset();
  recordOffspring({ unit_id: 'u_a', lineage_id: 'lin_pair', parents: [], generation: 0 });
  recordOffspring({ unit_id: 'u_b', lineage_id: 'lin_pair', parents: ['u_a', 'x'], generation: 1 });
  assert.deepEqual(getTribesEmergent(), []);
});

test('Sprint D: tribe threshold — 3 members = tribe emerges', () => {
  reset();
  recordOffspring({
    unit_id: 'u_root',
    lineage_id: 'lin_trio',
    parents: [],
    generation: 0,
    born_at_biome: 'foresta_pluviale',
  });
  recordOffspring({
    unit_id: 'u_off_1',
    lineage_id: 'lin_trio',
    parents: ['u_root', 'x'],
    generation: 1,
    born_at_biome: 'foresta_pluviale',
  });
  recordOffspring({
    unit_id: 'u_off_2',
    lineage_id: 'lin_trio',
    parents: ['u_root', 'y'],
    generation: 1,
    born_at_biome: 'savana',
  });
  const tribes = getTribesEmergent();
  assert.equal(tribes.length, 1);
  const t = tribes[0];
  assert.equal(t.tribe_id, 'lin_trio');
  assert.equal(t.members_count, 3);
  assert.equal(t.lineage_root_unit_id, 'u_root');
  assert.equal(t.oldest_generation, 1);
  // Most common biome among members = foresta_pluviale (2 vs savana 1).
  assert.equal(t.primary_biome, 'foresta_pluviale');
});

test('Sprint D: tribe primary_biome detects most-common biome', () => {
  reset();
  // 3 offspring same lineage, biome distribution: savana 2, deserto 1 → savana wins.
  recordOffspring({
    unit_id: 'u1',
    lineage_id: 'lin_b',
    parents: [],
    generation: 0,
    born_at_biome: 'deserto',
  });
  recordOffspring({
    unit_id: 'u2',
    lineage_id: 'lin_b',
    parents: ['u1', 'x'],
    generation: 1,
    born_at_biome: 'savana',
  });
  recordOffspring({
    unit_id: 'u3',
    lineage_id: 'lin_b',
    parents: ['u1', 'y'],
    generation: 1,
    born_at_biome: 'savana',
  });
  const tribes = getTribesEmergent();
  assert.equal(tribes.length, 1);
  assert.equal(tribes[0].primary_biome, 'savana');
});

test('Sprint D: tribe primary_biome=null when all members biome=null', () => {
  reset();
  for (let i = 1; i <= 3; i++) {
    recordOffspring({
      unit_id: `u_${i}`,
      lineage_id: 'lin_blank',
      parents: i === 1 ? [] : ['u_1', 'x'],
      generation: i === 1 ? 0 : 1,
      born_at_biome: null,
    });
  }
  const t = getTribesEmergent()[0];
  assert.equal(t.primary_biome, null);
});

test('Sprint D: getTribesEmergent sorts by members_count desc', () => {
  reset();
  // Tribe small: 3 members
  for (let i = 1; i <= 3; i++) {
    recordOffspring({
      unit_id: `s${i}`,
      lineage_id: 'lin_small',
      parents: i === 1 ? [] : ['s1', 'x'],
      generation: i === 1 ? 0 : 1,
    });
  }
  // Tribe big: 5 members
  for (let i = 1; i <= 5; i++) {
    recordOffspring({
      unit_id: `b${i}`,
      lineage_id: 'lin_big',
      parents: i === 1 ? [] : ['b1', 'x'],
      generation: i === 1 ? 0 : 1,
    });
  }
  const tribes = getTribesEmergent();
  assert.equal(tribes.length, 2);
  assert.equal(tribes[0].tribe_id, 'lin_big');
  assert.equal(tribes[0].members_count, 5);
  assert.equal(tribes[1].tribe_id, 'lin_small');
});

test('Sprint D: tribe oldest_generation = max gen in chain', () => {
  reset();
  recordOffspring({ unit_id: 'r', lineage_id: 'lin_d', parents: [], generation: 0 });
  recordOffspring({ unit_id: 'g1', lineage_id: 'lin_d', parents: ['r', 'x'], generation: 1 });
  recordOffspring({ unit_id: 'g4', lineage_id: 'lin_d', parents: ['g1', 'y'], generation: 4 });
  const t = getTribesEmergent()[0];
  assert.equal(t.oldest_generation, 4);
});

// ─── getTribeForUnit ────────────────────────────────────────────────────

test('Sprint D: getTribeForUnit returns null for unknown unit', () => {
  reset();
  assert.equal(getTribeForUnit('u_phantom'), null);
  assert.equal(getTribeForUnit(''), null);
  assert.equal(getTribeForUnit(null), null);
});

test('Sprint D: getTribeForUnit returns null for lone wolf (lineage <3 members)', () => {
  reset();
  recordOffspring({ unit_id: 'u_lone', lineage_id: 'lin_singleton', parents: [], generation: 0 });
  recordOffspring({
    unit_id: 'u_pair',
    lineage_id: 'lin_singleton',
    parents: ['u_lone', 'x'],
    generation: 1,
  });
  // Only 2 in this lineage — under threshold.
  assert.equal(getTribeForUnit('u_lone'), null);
  assert.equal(getTribeForUnit('u_pair'), null);
});

test('Sprint D: getTribeForUnit returns tribe info when lineage qualifies', () => {
  reset();
  recordOffspring({
    unit_id: 'a',
    lineage_id: 'lin_q',
    parents: [],
    generation: 0,
    born_at_biome: 'tundra',
  });
  recordOffspring({
    unit_id: 'b',
    lineage_id: 'lin_q',
    parents: ['a', 'x'],
    generation: 1,
    born_at_biome: 'tundra',
  });
  recordOffspring({
    unit_id: 'c',
    lineage_id: 'lin_q',
    parents: ['a', 'y'],
    generation: 1,
    born_at_biome: 'tundra',
  });
  const tribe = getTribeForUnit('b');
  assert.ok(tribe);
  assert.equal(tribe.tribe_id, 'lin_q');
  assert.equal(tribe.members_count, 3);
  assert.equal(tribe.primary_biome, 'tundra');
});
