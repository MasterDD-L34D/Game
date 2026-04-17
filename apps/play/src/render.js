// Canvas 2D rendering — grid + units.

const CELL = 64; // pixel per cell
const COLORS = {
  grid: '#2a2a2a',
  gridAlt: '#303030',
  border: '#444',
  player: '#00b8d4',
  sistema: '#ff5252',
  dead: '#555',
  selected: '#ffcc00',
  target: '#ff9800',
  text: '#e8e8e8',
  hpFull: '#4caf50',
  hpWarn: '#ffc107',
  hpCrit: '#f44336',
};

export function fitCanvas(canvas, width, height) {
  canvas.width = width * CELL;
  canvas.height = height * CELL;
}

export function canvasToCell(canvas, ev, gridH) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((ev.clientX - rect.left) / rect.width) * (canvas.width / CELL));
  const yPx = Math.floor(((ev.clientY - rect.top) / rect.height) * (canvas.height / CELL));
  const y = gridH - 1 - yPx; // invert: canvas y 0 at top, game y 0 at bottom
  return { x, y };
}

function drawCell(ctx, x, yPx, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x * CELL, yPx * CELL, CELL, CELL);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x * CELL + 0.5, yPx * CELL + 0.5, CELL - 1, CELL - 1);
}

function drawUnit(ctx, unit, gridH, highlight = {}) {
  if (!unit.position) return;
  const { x, y } = unit.position;
  const yPx = gridH - 1 - y;
  const cx = x * CELL + CELL / 2;
  const cy = yPx * CELL + CELL / 2;
  const dead = unit.hp <= 0;
  const color = dead
    ? COLORS.dead
    : unit.controlled_by === 'player'
      ? COLORS.player
      : COLORS.sistema;

  // Body circle
  ctx.fillStyle = color;
  ctx.globalAlpha = dead ? 0.4 : 1;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Selected ring
  if (highlight.selected === unit.id) {
    ctx.strokeStyle = COLORS.selected;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Target ring
  if (highlight.target === unit.id) {
    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Active marker (yellow triangle above)
  if (highlight.active === unit.id) {
    ctx.fillStyle = COLORS.selected;
    ctx.beginPath();
    ctx.moveTo(cx, yPx * CELL + 4);
    ctx.lineTo(cx - 6, yPx * CELL + 14);
    ctx.lineTo(cx + 6, yPx * CELL + 14);
    ctx.closePath();
    ctx.fill();
  }

  // Unit label (first 2 chars)
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(unit.id.slice(0, 4), cx, cy);

  // HP bar below
  if (!dead) {
    const ratio = unit.hp / (unit.max_hp || unit.hp || 1);
    const barW = CELL * 0.6;
    const barX = cx - barW / 2;
    const barY = yPx * CELL + CELL - 8;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = ratio < 0.3 ? COLORS.hpCrit : ratio < 0.6 ? COLORS.hpWarn : COLORS.hpFull;
    ctx.fillRect(barX, barY, barW * ratio, 4);
  }
}

export function render(canvas, state, highlight = {}) {
  if (!state || !state.grid) return;
  const w = state.grid.width;
  const h = state.grid.height;
  if (canvas.width !== w * CELL || canvas.height !== h * CELL) fitCanvas(canvas, w, h);

  const ctx = canvas.getContext('2d');
  // Checkered grid
  for (let gy = 0; gy < h; gy += 1) {
    for (let gx = 0; gx < w; gx += 1) {
      const yPx = h - 1 - gy;
      const fill = (gx + gy) % 2 === 0 ? COLORS.grid : COLORS.gridAlt;
      drawCell(ctx, gx, yPx, fill);
    }
  }

  // Units
  for (const u of state.units || []) drawUnit(ctx, u, h, highlight);
}

export const CELL_SIZE = CELL;
