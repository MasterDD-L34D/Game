// 2026-04-27 Bundle B.4 — Wildfrost counter HUD (collectCounters helper).
//
// Test pure helper export da apps/play/src/render.js:
//   - collectCounters(unit) → Array<{ kind, label, tint, key }>
//
// drawCounterBadge richiede CanvasRenderingContext2D — non testabile DOM-free.
// Smoke visual = launcher live (fuori scope test). Logic gating + priority
// + overflow guard testati via collectCounters direttamente.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadRender() {
  return import('../../apps/play/src/render.js');
}

describe('collectCounters — Bundle B.4 priority + overflow', () => {
  test('unit senza counter → array vuoto', async () => {
    const { collectCounters } = await loadRender();
    assert.deepEqual(collectCounters({}), []);
    assert.deepEqual(collectCounters({ status: {}, ability_cooldowns: {} }), []);
  });

  test('ability_cooldowns map → 1 badge per cd > 0', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({
      ability_cooldowns: { fireball: 2, heal: 3, expired_ability: 0 },
    });
    assert.equal(result.length, 2);
    assert.ok(result.every((c) => c.kind === 'cd'));
    assert.deepEqual(result.map((c) => c.label).sort(), ['2', '3']);
  });

  test('reaction_cooldown_remaining > 0 → 1 badge cd kind', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({ reaction_cooldown_remaining: 1 });
    assert.equal(result.length, 1);
    assert.equal(result[0].kind, 'cd');
    assert.equal(result[0].label, '1');
    assert.equal(result[0].key, 'rx');
  });

  test('status numerica > 0 → status badge', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({ status: { panic: 2, rage: 3, expired: 0 } });
    assert.equal(result.length, 2);
    assert.ok(result.every((c) => c.kind === 'status'));
  });

  test('mixed inputs preservano priority order (cd → rx → status)', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({
      ability_cooldowns: { fireball: 2 },
      reaction_cooldown_remaining: 1,
      status: { panic: 3 },
    });
    assert.equal(result.length, 3);
    assert.equal(result[0].kind, 'cd');
    assert.equal(result[1].key, 'rx');
    assert.equal(result[2].kind, 'status');
  });

  test('overflow > 3 counter ancora presenti in array (drawCounterBadge troncherà a 3 + indicator)', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({
      ability_cooldowns: { a: 1, b: 2, c: 3, d: 4 },
      status: { panic: 1, rage: 1 },
    });
    // Tutti 6 raccolti: caller (drawCounterBadge) applica MAX=3 + overflow indicator.
    assert.equal(result.length, 6);
  });

  test('valori non finiti / non numerici filtrati out', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({
      ability_cooldowns: { x: 'foo', y: NaN, z: -1, ok: 2 },
      status: { panic: null, rage: undefined, focused: 1 },
    });
    // Solo x:'foo' (NaN), y:NaN, z:-1 filtrati; ok:2 + focused:1 mantenuti.
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((c) => c.key).sort(), ['focused', 'ok']);
  });

  test('ability_cooldowns array invece di object → ignorato (defensive)', async () => {
    const { collectCounters } = await loadRender();
    const result = collectCounters({ ability_cooldowns: [1, 2, 3] });
    assert.deepEqual(result, []);
  });
});
