// Canvas grid visual regression helper (Tier 1 #3 adoption post 2026-05-07).
//
// Asserts HTML5 canvas regions via NxM grid coordinates without pixel-perfect
// snapshot brittleness. Use cases:
//   - Skiv echolocation pulse rendering (cyan #66d1fb in expected radius)
//   - CT bar visual lookahead 3 turni (color sequence per cell)
//   - Range overlay shape detection (cerchio pixel pattern)
//   - Phase indicator color (e.g., onboarding=blue, character_create=green)
//
// API:
//   const grid = await sampleCanvasGrid(page, '#canvas', { rows: 4, cols: 4 });
//   expect(grid[0][0].avg.r).toBeGreaterThan(100); // top-left red dominant
//   expect(grid[2][2]).toBeNonBlack();             // center has content
//
// Cross-ref:
//   - docs/playtest/AGENT_DRIVEN_WORKFLOW.md Pattern B (Playwright)
//   - https://dev.to/fonzi/testing-html5-canvas-with-canvasgrid-and-playwright-5h4c

import type { Page } from '@playwright/test';

export type GridCellSample = {
  /** Average RGBA across all pixels in the cell. */
  avg: { r: number; g: number; b: number; a: number };
  /** Cell pixel dimensions (canvas-space). */
  width: number;
  height: number;
  /** True if cell is fully transparent or pure black (#000 alpha=0). */
  isEmpty: boolean;
};

export type CanvasGridOptions = {
  rows: number;
  cols: number;
  /** Tolerance for "empty" detection — cells with avg sum below this are treated as empty. Default 5. */
  emptyThreshold?: number;
};

/**
 * Sample HTML5 canvas via getImageData inside page context. Returns NxM
 * grid of RGBA averages per cell.
 *
 * Throws if canvas selector doesn't exist OR returns 0x0 size.
 *
 * Note: works on Godot HTML5 canvas (#canvas) only when canvas isn't
 * cross-origin tainted. WebGL contexts require `preserveDrawingBuffer:true`
 * OR readPixels equivalent. Godot 4.6 HTML5 export sets this flag by default.
 */
export async function sampleCanvasGrid(
  page: Page,
  canvasSelector: string,
  options: CanvasGridOptions,
): Promise<GridCellSample[][]> {
  const { rows, cols, emptyThreshold = 5 } = options;
  if (rows < 1 || cols < 1) {
    throw new Error(`canvasGrid: rows=${rows} cols=${cols} must be >= 1`);
  }

  const result = await page.evaluate(
    ({ selector, rows: r, cols: c, emptyThreshold: et }) => {
      const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
      if (!canvas) {
        throw new Error(`canvasGrid: selector ${selector} not found`);
      }
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error(
          `canvasGrid: ${selector} dimensions ${canvas.width}x${canvas.height} (canvas not rendered)`,
        );
      }
      // Try 2d context first; if WebGL-backed, fall back to drawImage to a 2d
      // shadow canvas (Godot HTML5 typically WebGL). readPixels would also
      // work but adds GL boilerplate; drawImage roundtrip simpler.
      const cellW = Math.floor(canvas.width / c);
      const cellH = Math.floor(canvas.height / r);
      const shadow = document.createElement('canvas');
      shadow.width = canvas.width;
      shadow.height = canvas.height;
      const sctx = shadow.getContext('2d');
      if (!sctx) {
        throw new Error('canvasGrid: shadow 2d context unavailable');
      }
      try {
        sctx.drawImage(canvas, 0, 0);
      } catch (err) {
        throw new Error(
          `canvasGrid: drawImage failed (canvas may be tainted): ${(err as Error).message}`,
        );
      }
      const grid: Array<
        Array<{
          avg: { r: number; g: number; b: number; a: number };
          width: number;
          height: number;
          isEmpty: boolean;
        }>
      > = [];
      for (let row = 0; row < r; row += 1) {
        const rowSamples: typeof grid[number] = [];
        for (let col = 0; col < c; col += 1) {
          const x = col * cellW;
          const y = row * cellH;
          const data = sctx.getImageData(x, y, cellW, cellH).data;
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let sumA = 0;
          const pixelCount = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            sumR += data[i]!;
            sumG += data[i + 1]!;
            sumB += data[i + 2]!;
            sumA += data[i + 3]!;
          }
          const avgR = sumR / pixelCount;
          const avgG = sumG / pixelCount;
          const avgB = sumB / pixelCount;
          const avgA = sumA / pixelCount;
          rowSamples.push({
            avg: { r: avgR, g: avgG, b: avgB, a: avgA },
            width: cellW,
            height: cellH,
            isEmpty: avgR + avgG + avgB < et && avgA < et,
          });
        }
        grid.push(rowSamples);
      }
      return grid;
    },
    { selector: canvasSelector, rows, cols, emptyThreshold },
  );
  return result as GridCellSample[][];
}

/**
 * Convenience: count cells in a sampled grid that are non-empty (have rendered content).
 */
export function countNonEmptyCells(grid: GridCellSample[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (!cell.isEmpty) count += 1;
    }
  }
  return count;
}

/**
 * Convenience: assert RGB average matches expected within tolerance (per channel).
 */
export function colorMatchesApprox(
  cell: GridCellSample,
  expected: { r: number; g: number; b: number },
  tolerance = 30,
): boolean {
  return (
    Math.abs(cell.avg.r - expected.r) <= tolerance &&
    Math.abs(cell.avg.g - expected.g) <= tolerance &&
    Math.abs(cell.avg.b - expected.b) <= tolerance
  );
}
