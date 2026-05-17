// Sprint β Visual UX 2026-04-28 — Phoenix Point free-aim body-part overlay.
//
// Pattern donor: docs/research/2026-04-27-strategy-games-design-extraction.md §7.
// 3 zone (head 25% / torso 50% / legs 25%) con hit % visualizzati.
// Streak bonus (Sprint α pseudoRng) modifica head bias se streak ≥ 2.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadRender() {
  return import('../../../apps/play/src/render.js');
}

describe('bodyPartHitPercent — distribution baseline + streak bias', () => {
  test('streak 0 → distribution baseline (head 30, torso 55, legs 15)', async () => {
    const { bodyPartHitPercent } = await loadRender();
    const p = bodyPartHitPercent({ streak: 0 });
    assert.equal(p.head, 30);
    assert.equal(p.torso, 55);
    assert.equal(p.legs, 15);
  });

  test('streak 2 → head bias +5pp', async () => {
    const { bodyPartHitPercent } = await loadRender();
    const baseline = bodyPartHitPercent({ streak: 0 });
    const boosted = bodyPartHitPercent({ streak: 2 });
    assert.ok(
      boosted.head > baseline.head,
      `boosted head (${boosted.head}) > baseline (${baseline.head})`,
    );
  });

  test('streak 4 → head bias additivo (+10pp totale vs baseline)', async () => {
    const { bodyPartHitPercent } = await loadRender();
    const baseline = bodyPartHitPercent({ streak: 0 });
    const high = bodyPartHitPercent({ streak: 4 });
    // streak ≥4 ha head 30+5+5=40 (pre-normalize)
    assert.ok(high.head > baseline.head + 5, `high head (${high.head}) > baseline+5`);
  });

  test('sum = 100 (normalized)', async () => {
    const { bodyPartHitPercent } = await loadRender();
    for (const s of [0, 1, 2, 3, 4, 5, 10]) {
      const p = bodyPartHitPercent({ streak: s });
      const sum = p.head + p.torso + p.legs;
      assert.equal(sum, 100, `streak=${s} sum=${sum}`);
    }
  });

  test('opzioni vuote / undefined → baseline safe', async () => {
    const { bodyPartHitPercent } = await loadRender();
    const a = bodyPartHitPercent();
    const b = bodyPartHitPercent({});
    assert.deepEqual(a, b);
    assert.equal(a.head, 30);
  });
});

describe('bodyPartZones — bounding box ratios canonical', () => {
  test('head 25% top, torso 50% mid, legs 25% bottom', async () => {
    const { bodyPartZones } = await loadRender();
    const z = bodyPartZones();
    assert.deepEqual(z.head, [0.0, 0.25]);
    assert.deepEqual(z.torso, [0.25, 0.75]);
    assert.deepEqual(z.legs, [0.75, 1.0]);
  });

  test('zone coverage = 100% (no gap, no overlap)', async () => {
    const { bodyPartZones } = await loadRender();
    const z = bodyPartZones();
    assert.equal(z.head[1], z.torso[0], 'head end == torso start');
    assert.equal(z.torso[1], z.legs[0], 'torso end == legs start');
    assert.equal(z.head[0], 0, 'head start = 0');
    assert.equal(z.legs[1], 1, 'legs end = 1');
  });
});
