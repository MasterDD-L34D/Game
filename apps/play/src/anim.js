// Minimal animation layer — interpolated unit positions + damage popups + flash + attack rays.

const ANIM_MS = 240; // move tween duration (slight boost per W2.3 visual clarity)
const POPUP_MS = 1100; // popup fade-out
const FLASH_MS = 320; // unit flash on hit
const RAY_MS = 280; // attack ray line

// W8b — Shared anim constants used by main.js (commit-round timing + SIS stagger).
export const ACTION_ANIM_STAGGER_MS = 350; // ms delay between staggered round actions
export const COMMIT_REVEAL_MS = 700; // ms commit reveal overlay duration

const movers = new Map(); // unit_id → { fromX, fromY, toX, toY, start }
const popups = []; // [{ x, y, text, color, start }]
const flashes = new Map(); // unit_id → { start, color }
const rays = []; // [{ fromX, fromY, toX, toY, color, start }]

export function recordMove(unitId, from, to) {
  if (!from || !to) return;
  if (from.x === to.x && from.y === to.y) return;
  movers.set(unitId, {
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    start: performance.now(),
  });
}

export function pushPopup(x, y, text, color = '#ff5252') {
  popups.push({ x, y, text: String(text), color, start: performance.now() });
}

// W2.3 — Flash unit on hit (red tint) o heal (green tint).
export function flashUnit(unitId, color = '#ff5252') {
  flashes.set(unitId, { start: performance.now(), color });
}

// W2.3 — Attack ray: linea animata attaccante → target, auto-expire.
export function attackRay(from, to, color = '#ffcc00') {
  if (!from || !to) return;
  rays.push({
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    color,
    start: performance.now(),
  });
}

export function getFlashAlpha(unitId) {
  const f = flashes.get(unitId);
  if (!f) return null;
  const t = (performance.now() - f.start) / FLASH_MS;
  if (t >= 1) {
    flashes.delete(unitId);
    return null;
  }
  // Double-pulse: 0→1→0→1→0
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  return { alpha: pulse * (1 - t), color: f.color };
}

export function drawRays(ctx, cellSize, gridH) {
  const now = performance.now();
  for (let i = rays.length - 1; i >= 0; i--) {
    const r = rays[i];
    const t = (now - r.start) / RAY_MS;
    if (t >= 1) {
      rays.splice(i, 1);
      continue;
    }
    const yPxFrom = gridH - 1 - r.fromY;
    const yPxTo = gridH - 1 - r.toY;
    const x1 = r.fromX * cellSize + cellSize / 2;
    const y1 = yPxFrom * cellSize + cellSize / 2;
    const x2 = r.toX * cellSize + cellSize / 2;
    const y2 = yPxTo * cellSize + cellSize / 2;
    // Progress fades from 1 → 0
    const alpha = 1 - t;
    // Line extends 0→1 of path
    const grow = Math.min(t * 2, 1); // burst fast then fade
    const endX = x1 + (x2 - x1) * grow;
    const endY = y1 + (y2 - y1) * grow;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    // Tip dot
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function getInterpolatedPos(unitId, currentPos) {
  const m = movers.get(unitId);
  if (!m) return currentPos;
  const t = (performance.now() - m.start) / ANIM_MS;
  if (t >= 1) {
    movers.delete(unitId);
    return currentPos;
  }
  const eased = 1 - Math.pow(1 - t, 2); // ease-out
  return {
    x: m.fromX + (m.toX - m.fromX) * eased,
    y: m.fromY + (m.toY - m.fromY) * eased,
  };
}

export function drawPopups(ctx, cellSize, gridH) {
  const now = performance.now();
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    const t = (now - p.start) / POPUP_MS;
    if (t >= 1) {
      popups.splice(i, 1);
      continue;
    }
    const yPx = gridH - 1 - p.y;
    const alpha = 1 - t;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.font = 'bold 18px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      p.text,
      p.x * cellSize + cellSize / 2,
      yPx * cellSize + cellSize / 2 - 14 - t * 30,
    );
    ctx.globalAlpha = 1;
  }
}

export function hasActiveAnims() {
  return movers.size > 0 || popups.length > 0 || flashes.size > 0 || rays.length > 0;
}
