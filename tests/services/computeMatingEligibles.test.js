// Sprint 12 (Surface-DEAD #4) — backend mating eligibles helper.
//
// Pure helper: filtra pair survivors player team + cap pairs + opzionale
// metaTracker.canMate() gate. Zero side effects, zero IO.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  computeMatingEligibles,
  filterPlayerSurvivors,
  pairCombinations,
  DEFAULT_MAX_PAIRS,
  DEFAULT_OFFSPRING_PER_PAIR,
} = require('../../apps/backend/services/mating/computeMatingEligibles');

const playerUnit = (id, overrides = {}) => ({
  id,
  name: id.toUpperCase(),
  hp: 10,
  controlled_by: 'player',
  ...overrides,
});

const enemyUnit = (id, overrides = {}) => ({
  id,
  name: id.toUpperCase(),
  hp: 10,
  controlled_by: 'sistema',
  ...overrides,
});

describe('filterPlayerSurvivors', () => {
  test('keeps player team alive units', () => {
    const units = [playerUnit('a'), playerUnit('b'), enemyUnit('e1')];
    const out = filterPlayerSurvivors(units);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map((u) => u.id).sort(), ['a', 'b']);
  });

  test('drops dead units (hp <= 0)', () => {
    const units = [
      playerUnit('a', { hp: 0 }),
      playerUnit('b', { hp: 5 }),
      playerUnit('c', { hp: -3 }),
    ];
    const out = filterPlayerSurvivors(units);
    assert.deepEqual(
      out.map((u) => u.id),
      ['b'],
    );
  });

  test('drops enemy/sistema team', () => {
    const units = [enemyUnit('e1'), enemyUnit('e2', { controlled_by: 'sistema' })];
    const out = filterPlayerSurvivors(units);
    assert.deepEqual(out, []);
  });

  test('accepts ally controlled_by + team aliases', () => {
    const units = [
      { id: 'a', hp: 5, controlled_by: 'ally' },
      { id: 'b', hp: 5, team: 'player' },
      { id: 'c', hp: 5, team: 'ally' },
    ];
    const out = filterPlayerSurvivors(units);
    assert.equal(out.length, 3);
  });

  test('null/undefined/empty/garbage → []', () => {
    assert.deepEqual(filterPlayerSurvivors(null), []);
    assert.deepEqual(filterPlayerSurvivors(undefined), []);
    assert.deepEqual(filterPlayerSurvivors([]), []);
    assert.deepEqual(filterPlayerSurvivors([null, undefined, {}, { hp: 5 }]), []);
  });
});

describe('pairCombinations', () => {
  test('n=0/1 → empty', () => {
    assert.deepEqual(pairCombinations([]), []);
    assert.deepEqual(pairCombinations([{ id: 'a' }]), []);
  });

  test('n=2 → 1 pair', () => {
    const pairs = pairCombinations([{ id: 'a' }, { id: 'b' }]);
    assert.equal(pairs.length, 1);
    assert.deepEqual([pairs[0][0].id, pairs[0][1].id], ['a', 'b']);
  });

  test('n=4 → 6 combinations (n choose 2)', () => {
    const pairs = pairCombinations([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
    assert.equal(pairs.length, 6);
    // Combinations not permutations: each pair is unordered, no duplicates.
    const keys = pairs.map(([a, b]) => `${a.id}_${b.id}`).sort();
    assert.deepEqual(keys, ['a_b', 'a_c', 'a_d', 'b_c', 'b_d', 'c_d']);
  });
});

describe('computeMatingEligibles', () => {
  test('victory path: 2 survivors → 1 pair eligible', () => {
    const out = computeMatingEligibles(
      [playerUnit('a'), playerUnit('b'), enemyUnit('e1', { hp: 0 })],
      'savana',
    );
    assert.equal(out.length, 1);
    assert.deepEqual(out[0], {
      parent_a_id: 'a',
      parent_b_id: 'b',
      parent_a_name: 'A',
      parent_b_name: 'B',
      biome_id: 'savana',
      can_mate: true,
      expected_offspring_count: DEFAULT_OFFSPRING_PER_PAIR,
    });
  });

  test('single survivor → empty (need 2 for pair-bond)', () => {
    const out = computeMatingEligibles([playerUnit('a')], 'savana');
    assert.deepEqual(out, []);
  });

  test('zero survivors → empty', () => {
    const out = computeMatingEligibles([], 'savana');
    assert.deepEqual(out, []);
  });

  test('null/undefined units → empty (graceful)', () => {
    assert.deepEqual(computeMatingEligibles(null, 'savana'), []);
    assert.deepEqual(computeMatingEligibles(undefined, null), []);
  });

  test('null biome → biome_id null in output (no crash)', () => {
    const out = computeMatingEligibles([playerUnit('a'), playerUnit('b')], null);
    assert.equal(out.length, 1);
    assert.equal(out[0].biome_id, null);
  });

  test('cap respects maxPairs option', () => {
    const survivors = [playerUnit('a'), playerUnit('b'), playerUnit('c'), playerUnit('d')]; // 4 choose 2 = 6 pairs uncapped
    const out = computeMatingEligibles(survivors, 'savana', { maxPairs: 2 });
    assert.equal(out.length, 2);
  });

  test('default cap = 6 (DEFAULT_MAX_PAIRS)', () => {
    // 5 units → 10 pairs uncapped → cap to 6
    const survivors = ['a', 'b', 'c', 'd', 'e'].map((id) => playerUnit(id));
    const out = computeMatingEligibles(survivors, 'savana');
    assert.equal(out.length, DEFAULT_MAX_PAIRS);
  });

  test('metaTracker gate: canMate=false on a → pair excluded', () => {
    const tracker = {
      canMate: (id) => id !== 'a', // a fails gate
    };
    const out = computeMatingEligibles([playerUnit('a'), playerUnit('b')], 'savana', {
      metaTracker: tracker,
    });
    assert.deepEqual(out, []);
  });

  test('metaTracker gate: canMate=true both → pair included', () => {
    const tracker = { canMate: () => true };
    const out = computeMatingEligibles([playerUnit('a'), playerUnit('b')], 'savana', {
      metaTracker: tracker,
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].can_mate, true);
  });

  test('metaTracker malformed (throws) → graceful default permissive', () => {
    const tracker = {
      canMate: () => {
        throw new Error('boom');
      },
    };
    const out = computeMatingEligibles([playerUnit('a'), playerUnit('b')], 'savana', {
      metaTracker: tracker,
    });
    // Throw caught → entry.can_mate stays default true → included.
    assert.equal(out.length, 1);
    assert.equal(out[0].can_mate, true);
  });

  test('metaTracker async (Promise) → rejected fail-closed (P2 fix)', () => {
    // Async trackers like createMetaStore return Promises. Boolean(Promise) === true
    // would silently surface blocked pairs as eligible. Helper must reject non-boolean.
    const asyncTracker = {
      canMate: async () => false, // Promise<false> — should be rejected
    };
    const out = computeMatingEligibles([playerUnit('a'), playerUnit('b')], 'savana', {
      metaTracker: asyncTracker,
    });
    // can_mate=false → pair excluded from surfaced list.
    assert.deepEqual(out, []);
  });

  test('metaTracker non-boolean (number/undefined/object) → rejected fail-closed', () => {
    const trackers = [
      { canMate: () => 1 }, // truthy non-boolean
      { canMate: () => undefined },
      { canMate: () => ({}) },
      { canMate: () => null },
    ];
    for (const t of trackers) {
      const out = computeMatingEligibles([playerUnit('a'), playerUnit('b')], 'savana', {
        metaTracker: t,
      });
      assert.deepEqual(out, [], `tracker returning ${typeof t.canMate()} should fail closed`);
    }
  });

  test('uses parent name fallback to id when name missing', () => {
    const out = computeMatingEligibles(
      [
        { id: 'a', hp: 5, controlled_by: 'player' }, // no name
        { id: 'b', hp: 5, controlled_by: 'player' },
      ],
      'savana',
    );
    assert.equal(out[0].parent_a_name, 'a');
    assert.equal(out[0].parent_b_name, 'b');
  });
});
