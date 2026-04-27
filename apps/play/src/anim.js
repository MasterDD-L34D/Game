// Minimal animation layer — interpolated unit positions + damage popups + flash + attack rays.

// W8O — FX durate bumped per visibilità (user: "combat oscuro e no ncodificato").
const ANIM_MS = 260; // move tween duration
const POPUP_MS = 1800; // popup fade-out (era 1100, troppo veloce)
const FLASH_MS = 480; // unit flash on hit (era 320)
const RAY_MS = 420; // attack ray line (era 280)

// Tier B Quick win — FF7R critical hit juice (zoom + slow-mo).
// Source: docs/research/2026-04-26-tier-b-extraction-matrix.md #12 FF7 Remake.
// Pattern: critical hit visual juice = double-duration flash + critical color
// (gold/cyan) + popup scale 1.5×. Slow-mo skipped (game-loop pause complex).
const FLASH_CRITICAL_MS = 720; // 1.5× standard flash for critical juice
const POPUP_CRITICAL_SCALE = 1.5; // popup font scale on critical (read in render.js)

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

// Tier B FF7R critical hit juice — extended flash + gold/cyan color.
// Use on critical hit detection (resolveAttack returns crit:true).
export function flashUnitCritical(unitId, color = '#ffcc00') {
  flashes.set(unitId, { start: performance.now(), color, critical: true });
}

// Tier B FF7R — push critical popup with 1.5× scale flag (rendered larger by render.js).
export function pushPopupCritical(x, y, text, color = '#ffcc00') {
  popups.push({
    x,
    y,
    text: String(text),
    color,
    start: performance.now(),
    critical: true,
  });
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
  // Tier B FF7R critical juice — extended flash duration for critical hits.
  const dur = f.critical ? FLASH_CRITICAL_MS : FLASH_MS;
  const t = (performance.now() - f.start) / dur;
  if (t >= 1) {
    flashes.delete(unitId);
    return null;
  }
  // Double-pulse: 0→1→0→1→0. Critical = triple-pulse for extra emphasis.
  const cycles = f.critical ? 3 : 2;
  const pulse = Math.sin(t * Math.PI * cycles) * 0.5 + 0.5;
  return { alpha: pulse * (1 - t), color: f.color, critical: !!f.critical };
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
    // W8O — font più grande (bump 18→26px) + stroke outline per contrast.
    // Tier B FF7R critical juice — 1.5× scale on critical hits.
    const fontSize = p.critical ? Math.round(26 * POPUP_CRITICAL_SCALE) : 26;
    ctx.font = `bold ${fontSize}px "SF Mono", monospace`;
    ctx.textAlign = 'center';
    const px = p.x * cellSize + cellSize / 2;
    const py = yPx * cellSize + cellSize / 2 - 18 - t * 40;
    ctx.lineWidth = p.critical ? 5 : 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(p.text, px, py);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, px, py);
    ctx.globalAlpha = 1;
  }
}

export function hasActiveAnims() {
  return movers.size > 0 || popups.length > 0 || flashes.size > 0 || rays.length > 0;
}
