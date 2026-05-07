import { test, expect } from '@playwright/test';
import {
  sampleCanvasGrid,
  countNonEmptyCells,
  colorMatchesApprox,
} from './lib/canvasGrid.js';

// Canvas visual regression smoke (Tier 1 #3 adoption post 2026-05-07).
//
// Validates phone HTML5 canvas rendering pipeline at 4x4 grid coordinate
// level. Catches gross regressions (canvas blank, wrong viewport,
// rendering pipeline broken) without pixel-perfect snapshot brittleness.
//
// Cross-ref:
//   - tools/ts/tests/playwright/phone/lib/canvasGrid.ts (helper API)
//   - docs/playtest/AGENT_DRIVEN_WORKFLOW.md Pattern B
//   - https://dev.to/fonzi/testing-html5-canvas-with-canvasgrid-and-playwright-5h4c

const PHONE_PATH = '/phone/';
const CANVAS_SELECTOR = 'canvas';

test.describe('phone canvas — visual baseline', () => {
  test('canvas mounts with non-zero dimensions', async ({ page }) => {
    await page.goto(PHONE_PATH, { waitUntil: 'load' });
    // Godot HTML5 splash screen renders within ~5s on dev hardware
    await page.waitForFunction(
      (sel) => {
        const c = document.querySelector(sel) as HTMLCanvasElement | null;
        return !!c && c.width > 0 && c.height > 0;
      },
      CANVAS_SELECTOR,
      { timeout: 30_000 },
    );
    const dims = await page.evaluate((sel) => {
      const c = document.querySelector(sel) as HTMLCanvasElement;
      return { width: c.width, height: c.height };
    }, CANVAS_SELECTOR);
    expect(dims.width).toBeGreaterThan(100);
    expect(dims.height).toBeGreaterThan(100);
  });

  test('canvas renders content post-load (lobby form OR splash)', async ({ page }) => {
    await page.goto(PHONE_PATH, { waitUntil: 'load' });
    // Wait for Godot to finish init + first paint past splash
    await page.waitForFunction(
      (sel) => {
        const c = document.querySelector(sel) as HTMLCanvasElement | null;
        return !!c && c.width > 0 && c.height > 0;
      },
      CANVAS_SELECTOR,
      { timeout: 30_000 },
    );
    // Wait for splash to fade + composer to render — empirically ~18s
    // for cold load. Local dev faster (~8s).
    await page.waitForTimeout(20_000);

    const grid = await sampleCanvasGrid(page, CANVAS_SELECTOR, {
      rows: 4,
      cols: 4,
      emptyThreshold: 5,
    });

    // Baseline: at least 50% of cells should have rendered content (form
    // text, splash logo, etc.). Total black canvas = render pipeline broken.
    const nonEmpty = countNonEmptyCells(grid);
    expect(nonEmpty).toBeGreaterThan(8);

    // Top-left cell often contains lobby form heading "Inserisci il codice
    // della stanza" OR Godot splash text — should be non-black.
    expect(grid[0]?.[0]?.isEmpty).toBe(false);
  });
});

test.describe('phone canvas — color sampling utilities', () => {
  test('colorMatchesApprox tolerance reasonable', () => {
    // Pure unit-level check on helper utility (no page interaction).
    const cell = {
      avg: { r: 100, g: 200, b: 50, a: 255 },
      width: 10,
      height: 10,
      isEmpty: false,
    };
    expect(colorMatchesApprox(cell, { r: 100, g: 200, b: 50 })).toBe(true);
    expect(colorMatchesApprox(cell, { r: 90, g: 195, b: 60 }, 15)).toBe(true);
    expect(colorMatchesApprox(cell, { r: 0, g: 0, b: 0 }, 30)).toBe(false);
  });
});
