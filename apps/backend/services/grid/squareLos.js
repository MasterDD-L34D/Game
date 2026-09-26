// apps/backend/services/grid/squareLos.js
'use strict';

// Pure square-grid line-of-sight. Integer-only (no `/`, no float) so a GDScript
// port produces byte-identical results on the shared golden-vectors.
// - endpoints EXCLUDED (a unit on/adjacent-to a blocker stays targetable)
// - symmetric: endpoints are canonicalized (lexicographic) before the walk
// - corner-rule: a ray grazing a lattice corner passes UNLESS both diagonal
//   cells at that corner block ("strict diagonal squeeze").
// blocksCellFn(x, y) -> bool. Returns true when the target is visible.

function lineOfSightClear(from, to, blocksCellFn) {
  // canonicalize endpoint order so clear(A,B) === clear(B,A)
  let a = from;
  let b = to;
  if (b.x < a.x || (b.x === a.x && b.y < a.y)) {
    a = to;
    b = from;
  }
  const x0 = a.x;
  const y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  if (x0 === x1 && y0 === y1) return true; // range-0

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy; // integer error term
  let x = x0;
  let y = y0;

  while (true) {
    const e2 = 2 * err;
    const stepX = e2 > -dy;
    const stepY = e2 < dx;
    if (stepX && stepY) {
      // diagonal step across a lattice corner: the two side cells are the
      // pre-step neighbours (x+sx, y) and (x, y+sy). Strict squeeze only.
      const aBlk = blocksCellFn(x + sx, y);
      const bBlk = blocksCellFn(x, y + sy);
      if (aBlk && bBlk) return false;
    }
    if (stepX) {
      err -= dy;
      x += sx;
    }
    if (stepY) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) break; // reached endpoint -> excluded
    if (blocksCellFn(x, y)) return false;
  }
  return true;
}

module.exports = { lineOfSightClear };
