// Minimal animation layer — interpolated unit positions + damage popups.

const ANIM_MS = 200; // move tween duration
const POPUP_MS = 900;

const movers = new Map(); // unit_id → { fromX, fromY, toX, toY, start }
const popups = []; // [{ x, y, text, color, start }]

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
  return movers.size > 0 || popups.length > 0;
}
