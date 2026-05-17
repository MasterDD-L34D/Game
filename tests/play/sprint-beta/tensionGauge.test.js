// Sprint β Visual UX 2026-04-28 — Frostpunk chromatic tension gauge.
//
// Pattern donor: docs/research/2026-04-27-strategy-games-design-extraction.md §3.
// Pressure 0..100 → cool blue (#3a4a8c) → warm red (#a83232) gradient.
// Vignette alpha 0.0 (calm) → 0.4 (apex). Integrato con #1905 Gris pressure
// palette (no fragmentation, default §4.D-design-3).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadRender() {
  return import('../../../apps/play/src/render.js');
}

describe('tensionGaugeColor — gradient cool→warm', () => {
  test('pressure 0 → cool blue baseline (#3a4a8c)', async () => {
    const { tensionGaugeColor } = await loadRender();
    const c = tensionGaugeColor(0);
    assert.equal(c.toLowerCase(), '#3a4a8c');
  });

  test('pressure 100 → warm red baseline (#a83232)', async () => {
    const { tensionGaugeColor } = await loadRender();
    const c = tensionGaugeColor(100);
    assert.equal(c.toLowerCase(), '#a83232');
  });

  test('pressure 50 → midpoint blend (R/G/B between cold + warm)', async () => {
    const { tensionGaugeColor } = await loadRender();
    const c = tensionGaugeColor(50);
    // Lerp midpoint of (#3a4a8c → #a83232)
    // R: 0x3a + (0xa8-0x3a)*0.5 = 0x71, G: 0x4a+(0x32-0x4a)*0.5 = 0x3e, B similar
    assert.match(c, /^#[0-9a-f]{6}$/i);
    // Spot-check: hue should be neither pure blue nor pure red
    assert.notEqual(c.toLowerCase(), '#3a4a8c');
    assert.notEqual(c.toLowerCase(), '#a83232');
  });

  test('pressure clamping (negative + >100)', async () => {
    const { tensionGaugeColor } = await loadRender();
    assert.equal(tensionGaugeColor(-50).toLowerCase(), '#3a4a8c');
    assert.equal(tensionGaugeColor(200).toLowerCase(), '#a83232');
    assert.equal(tensionGaugeColor(NaN).toLowerCase(), '#3a4a8c');
  });
});

describe('tensionVignetteAlpha — quadratic curve 0.0 → 0.4', () => {
  test('pressure 0 → alpha 0.0 (calm, no overlay)', async () => {
    const { tensionVignetteAlpha } = await loadRender();
    assert.equal(tensionVignetteAlpha(0), 0);
  });

  test('pressure 100 → alpha 0.4 (apex max)', async () => {
    const { tensionVignetteAlpha } = await loadRender();
    assert.equal(tensionVignetteAlpha(100), 0.4);
  });

  test('pressure 50 → alpha ~0.1 (quadratic curve, NOT linear 0.2)', async () => {
    const { tensionVignetteAlpha } = await loadRender();
    const a = tensionVignetteAlpha(50);
    // 0.5^2 * 0.4 = 0.1
    assert.ok(Math.abs(a - 0.1) < 0.01, `expected ~0.1, got ${a}`);
  });

  test('curve è monotona crescente (no jump)', async () => {
    const { tensionVignetteAlpha } = await loadRender();
    const samples = [0, 10, 25, 50, 75, 100];
    let prev = -1;
    for (const p of samples) {
      const a = tensionVignetteAlpha(p);
      assert.ok(a >= prev, `monotone fail at pressure=${p}: ${a} < ${prev}`);
      prev = a;
    }
  });

  test('alpha range bounded [0, 0.4]', async () => {
    const { tensionVignetteAlpha } = await loadRender();
    for (let p = -50; p <= 200; p += 25) {
      const a = tensionVignetteAlpha(p);
      assert.ok(a >= 0 && a <= 0.4, `alpha out of bounds at p=${p}: ${a}`);
    }
  });

  test('non-numeric input → alpha 0 (safe default)', async () => {
    const { tensionVignetteAlpha } = await loadRender();
    assert.equal(tensionVignetteAlpha(NaN), 0);
    assert.equal(tensionVignetteAlpha(undefined), 0);
    assert.equal(tensionVignetteAlpha(null), 0);
    assert.equal(tensionVignetteAlpha('texty'), 0);
  });
});
