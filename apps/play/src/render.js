// Canvas 2D rendering — grid + units + animations + status icons.

import { getInterpolatedPos, drawPopups, hasActiveAnims } from './anim.js';

// M4 step A — feature flag integration M3.9-M3.10 assets.
// Toggle via: localStorage.setItem('evo:new-art', 'true') + page reload.
// Default OFF = shapes base (current behavior). ON = SVG icon + PNG tile bg.
import playerIconUrl from '../../../data/art/icons/faction_player.svg?url';
import sistemaIconUrl from '../../../data/art/icons/faction_sistema.svg?url';
import neutralIconUrl from '../../../data/art/icons/faction_neutral.svg?url';
import savanaTileUrl from '../../../data/art/tilesets/savana/grass_01.png?url';
import cavernaTileUrl from '../../../data/art/tilesets/caverna_sotterranea/stone_01.png?url';
import forestaTileUrl from '../../../data/art/tilesets/foresta_acida/moss_01.png?url';

const NEW_ART_URLS = {
  icon: { player: playerIconUrl, sistema: sistemaIconUrl, neutral: neutralIconUrl },
  tile: {
    savana: savanaTileUrl,
    caverna_sotterranea: cavernaTileUrl,
    foresta_acida: forestaTileUrl,
  },
};

const imageCache = new Map();
function getImage(url) {
  if (!imageCache.has(url)) {
    const img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return imageCache.get(url);
}

// Preload tutti asset (fire-and-forget).
Object.values(NEW_ART_URLS.icon).forEach(getImage);
Object.values(NEW_ART_URLS.tile).forEach(getImage);

function useNewArt() {
  try {
    return localStorage.getItem('evo:new-art') === 'true';
  } catch {
    return false;
  }
}

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

const STATUS_ICONS = {
  panic: { glyph: '!', bg: '#ff9800' },
  rage: { glyph: '⚡', bg: '#f44336' },
  stunned: { glyph: '★', bg: '#9c27b0' },
  focused: { glyph: '◎', bg: '#03a9f4' },
  confused: { glyph: '?', bg: '#ffc107' },
  bleeding: { glyph: '☽', bg: '#e91e63' },
  fracture: { glyph: '✕', bg: '#795548' },
  sbilanciato: { glyph: '↯', bg: '#ffeb3b' },
  taunted_by: { glyph: '⎯', bg: '#ffc107' },
  aggro_locked: { glyph: '◉', bg: '#ff5722' },
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

function drawCell(ctx, x, yPx, fill, tileImg) {
  // M4 step A: tile bg PNG se flag ON + asset loaded.
  if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false; // pixel art preserve
    ctx.drawImage(tileImg, x * CELL, yPx * CELL, CELL, CELL);
  } else {
    ctx.fillStyle = fill;
    ctx.fillRect(x * CELL, yPx * CELL, CELL, CELL);
  }
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x * CELL + 0.5, yPx * CELL + 0.5, CELL - 1, CELL - 1);
}

function drawStatusIcons(ctx, unit, cx, yPxTop) {
  const status = unit.status || {};
  const icons = [];
  for (const [key, meta] of Object.entries(STATUS_ICONS)) {
    const val = status[key];
    if (val !== undefined && val !== null && (typeof val !== 'number' || val > 0)) {
      icons.push(meta);
    }
  }
  if (icons.length === 0) return;
  const size = 12;
  const gap = 2;
  const startX = cx + CELL * 0.18;
  for (let i = 0; i < icons.length && i < 4; i++) {
    const ic = icons[i];
    const ix = startX + i * (size + gap);
    const iy = yPxTop + 4;
    ctx.fillStyle = ic.bg;
    ctx.beginPath();
    ctx.arc(ix + size / 2, iy + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ic.glyph, ix + size / 2, iy + size / 2 + 1);
  }
}

function drawUnit(ctx, unit, gridH, highlight = {}) {
  if (!unit.position) return;
  // Interpolate position via anim module
  const interpolated = getInterpolatedPos(unit.id, unit.position);
  const x = interpolated.x;
  const y = interpolated.y;
  const yPx = gridH - 1 - y;
  const cx = x * CELL + CELL / 2;
  const cy = yPx * CELL + CELL / 2;
  const dead = unit.hp <= 0;
  const color = dead
    ? COLORS.dead
    : unit.controlled_by === 'player'
      ? COLORS.player
      : COLORS.sistema;

  // Body — M4 step A: SVG icon se flag ON + asset loaded, altrimenti circle fallback.
  const bodySize = CELL * 0.64;
  const bodyX = cx - bodySize / 2;
  const bodyY = cy - bodySize / 2;
  let drewIcon = false;
  if (useNewArt() && !dead) {
    const faction =
      unit.controlled_by === 'player'
        ? 'player'
        : unit.controlled_by === 'sistema'
          ? 'sistema'
          : 'neutral';
    const iconImg = getImage(NEW_ART_URLS.icon[faction]);
    if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
      ctx.drawImage(iconImg, bodyX, bodyY, bodySize, bodySize);
      drewIcon = true;
    }
  }
  if (!drewIcon) {
    ctx.fillStyle = color;
    ctx.globalAlpha = dead ? 0.4 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

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

  // Unit label — M4 step A fix: se SVG icon rendered, sposta label sotto
  // per non sovrapporre icon; altrimenti centered su body circle (legacy).
  const labelText = unit.id.slice(0, 4);
  if (drewIcon) {
    // Label sotto icon + background stripe per leggibilità su tile bg
    const labelY = cy + bodySize / 2 + 3;
    ctx.font = 'bold 10px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(labelText);
    const labelW = metrics.width + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx - labelW / 2, labelY - 1, labelW, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelText, cx, labelY);
  } else {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, cx, cy);
  }

  // HP bar — M4 P0.2: float sopra unit sprite (visibile da lontano TV-first).
  // Legacy: bar sotto tile. New: bar sopra testa + valore numerico chunky.
  if (!dead) {
    const ratio = unit.hp / (unit.max_hp || unit.hp || 1);
    const barW = CELL * 0.72;
    const barX = cx - barW / 2;
    const barY = yPx * CELL + 3;
    // Background dark per contrast
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 7);
    // Fill color coded
    ctx.fillStyle = ratio < 0.3 ? COLORS.hpCrit : ratio < 0.6 ? COLORS.hpWarn : COLORS.hpFull;
    ctx.fillRect(barX, barY, barW * ratio, 5);
    // Numeric value sopra bar (TV-first scan)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const maxHp = unit.max_hp || unit.hp || 0;
    ctx.fillText(`${unit.hp}/${maxHp}`, cx, barY - 1);
  }

  // Status icons (top-right)
  if (!dead) drawStatusIcons(ctx, unit, cx, yPx * CELL);

  // M4 P0.3 — SIS enemy intent icon (Slay the Spire pattern).
  // Stub euristico: SIS controlled_by='sistema' + HP>0 → fist icon (attack intent).
  // TODO ADR-04-18 Plan-Reveal: real intents da threat_preview payload backend.
  if (!dead && unit.controlled_by === 'sistema') {
    drawSisIntentIcon(ctx, unit, cx, yPx * CELL, 'fist');
  }
}

// M4 P0.3 — SIS intent icon above unit (fist=attack, arrow=move, shield=defend).
function drawSisIntentIcon(ctx, unit, cx, yPxTop, kind = 'fist') {
  const ix = cx + CELL * 0.25;
  const iy = yPxTop + CELL * 0.08;
  const size = 14;
  // Badge bg
  ctx.fillStyle = 'rgba(80,0,0,0.85)';
  ctx.beginPath();
  ctx.arc(ix, iy + size / 2, size / 2 + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff5252';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Glyph
  const glyph = kind === 'fist' ? '✊' : kind === 'move' ? '➜' : kind === 'shield' ? '🛡' : '?';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, ix, iy + size / 2 + 1);
}

// M4 step A: biome-to-tile mapping (PNG procedural da M3.10).
function resolveTileImg(state) {
  if (!useNewArt()) return null;
  const biome = state?.biome_id || state?.scenario?.biome_id || 'savana';
  const url = NEW_ART_URLS.tile[biome];
  if (!url) return null;
  return getImage(url);
}

export function render(canvas, state, highlight = {}) {
  if (!state || !state.grid) return;
  const w = state.grid.width;
  const h = state.grid.height;
  if (canvas.width !== w * CELL || canvas.height !== h * CELL) fitCanvas(canvas, w, h);

  const ctx = canvas.getContext('2d');
  const tileImg = resolveTileImg(state);
  // Checkered grid (o tile PNG se flag ON + asset loaded)
  for (let gy = 0; gy < h; gy += 1) {
    for (let gx = 0; gx < w; gx += 1) {
      const yPx = h - 1 - gy;
      const fill = (gx + gy) % 2 === 0 ? COLORS.grid : COLORS.gridAlt;
      drawCell(ctx, gx, yPx, fill, tileImg);
    }
  }

  // Units
  for (const u of state.units || []) drawUnit(ctx, u, h, highlight);

  // Damage popups on top
  drawPopups(ctx, CELL, h);
}

export function needsAnimFrame() {
  return hasActiveAnims();
}

export const CELL_SIZE = CELL;
