// Canvas 2D rendering — grid + units + animations + status icons.

import { getInterpolatedPos, drawPopups, drawRays, getFlashAlpha, hasActiveAnims } from './anim.js';
import { getSpeciesDisplayIt } from './speciesNames.js';

// 2026-04-28 Visual upgrade Sprint D — Tile bioma loader.
// Cache Image() per bioma_id, fallback a null (drawCell ha checkered fallback).
// Asset placeholder generated via tools/py/generate_visual_assets.py.
// Path: /assets/tiles/<bioma>/tile_<variant>.png (32x32 PNG indexed).
const TILE_VARIANTS_PER_BIOMA = 3;
const _tileImageCache = new Map(); // key = `${bioma}-${variant}`, val = HTMLImageElement | null

function _loadTile(bioma, variant) {
  const key = `${bioma}-${variant}`;
  if (_tileImageCache.has(key)) return _tileImageCache.get(key);
  if (typeof Image === 'undefined') {
    _tileImageCache.set(key, null);
    return null;
  }
  const img = new Image();
  img.onerror = () => {
    // Asset missing — keep null in cache, drawCell falls back to checkered fill.
    _tileImageCache.set(key, null);
  };
  img.src = `/assets/tiles/${bioma}/tile_${variant}.png`;
  _tileImageCache.set(key, img);
  return img;
}

/** Resolve tile image for given biome + grid coord (deterministic variant pick).
 * @param {string|null|undefined} biomaId
 * @param {number} gx
 * @param {number} gy
 * @returns {HTMLImageElement|null}
 */
function resolveTileImg(biomaId, gx, gy) {
  if (!biomaId || typeof biomaId !== 'string') return null;
  // Hash xy → variant for stable but spread coverage (no flicker on re-render).
  const variant = Math.abs((gx * 37 + gy * 17) % TILE_VARIANTS_PER_BIOMA);
  const img = _loadTile(biomaId, variant);
  // Use only when fully loaded — else null (avoids drawImage on empty bitmap).
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

// W8O — CELL ora dinamico (responsive). Era const 64 → canvas sempre w*64 × h*64
// piccolo in viewport grande. User feedback: "la mappa occupa parte troppo piccola
// dello schermo, deve adattarsi mantenendo stesso numero quadretti".
// fitCanvas() compute CELL da container available space. getter pubblico per anim.
let CELL = 64;
export function getCellSize() {
  return CELL;
}
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

// W2.4 / W8c — Job/class color accent (outer ring oltre faction).
// MIRROR di CSS `:root --job-*` tokens (style.css). Source of truth = CSS.
// Canvas 2D API non supporta CSS custom properties → duplicazione necessaria.
// Any job color change MUST update both locations sync.
const JOB_COLORS = {
  vanguard: '#5d4037',
  tank: '#5d4037',
  skirmisher: '#7e57c2',
  scout: '#66bb6a',
  sniper: '#ffb300',
  ranged: '#ffb300',
  healer: '#29b6f6',
  support: '#29b6f6',
  controller: '#ab47bc',
  mage: '#ab47bc',
  boss: '#d32f2f',
};

// W8M — Job-to-shape map (silhouette profile per class). User feedback: "i pg
// e i SiS sono ancora meri pallini nei quali si leggono orribili scritte
// p-sc p-ta e-no". Replace circle con polygon per job differentiation.
// Reference 41-ART-DIRECTION.md: "job-to-shape mapping".
const JOB_SHAPE_MAP = {
  skirmisher: 'triangle_up', // offensive lean, forward-pointing
  assassin: 'triangle_up',
  vanguard: 'shield', // defensive wide base
  tank: 'shield',
  guardian: 'shield',
  scout: 'pentagon_low', // crouched low profile
  ranger: 'pentagon_low',
  sniper: 'rectangle_tall', // elongated ranged
  ranged: 'rectangle_tall',
  healer: 'hexagon_round', // soft supportive
  support: 'hexagon_round',
  artefice: 'hexagon_round',
  invocatore: 'star', // controller chaotic energy
  controller: 'star',
  mage: 'star',
  raccoglitore: 'hexagon_organic', // harvester balanced
  boss: 'shield', // scaled +50% applied via size param
};

function drawUnitBody(ctx, cx, cy, job, radius) {
  const shape = JOB_SHAPE_MAP[(job || '').toLowerCase()] || 'circle';
  ctx.beginPath();
  switch (shape) {
    case 'triangle_up': {
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius * 0.92, cy + radius * 0.6);
      ctx.lineTo(cx - radius * 0.92, cy + radius * 0.6);
      ctx.closePath();
      break;
    }
    case 'shield': {
      const w = radius * 1.0;
      const h = radius * 0.95;
      ctx.moveTo(cx - w, cy - h * 0.55);
      ctx.lineTo(cx + w, cy - h * 0.55);
      ctx.lineTo(cx + w, cy + h * 0.2);
      ctx.quadraticCurveTo(cx, cy + h * 1.1, cx - w, cy + h * 0.2);
      ctx.closePath();
      break;
    }
    case 'pentagon_low': {
      ctx.moveTo(cx, cy - radius * 0.85);
      ctx.lineTo(cx + radius * 0.95, cy - radius * 0.1);
      ctx.lineTo(cx + radius * 0.6, cy + radius * 0.85);
      ctx.lineTo(cx - radius * 0.6, cy + radius * 0.85);
      ctx.lineTo(cx - radius * 0.95, cy - radius * 0.1);
      ctx.closePath();
      break;
    }
    case 'rectangle_tall': {
      const w = radius * 0.6;
      const h = radius * 1.05;
      ctx.moveTo(cx - w, cy - h);
      ctx.lineTo(cx + w, cy - h);
      ctx.lineTo(cx + w, cy + h * 0.7);
      ctx.lineTo(cx, cy + h);
      ctx.lineTo(cx - w, cy + h * 0.7);
      ctx.closePath();
      break;
    }
    case 'hexagon_round':
    case 'hexagon_organic': {
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case 'star': {
      const points = 6;
      for (let i = 0; i < points * 2; i += 1) {
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.55;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    default:
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  }
}

// W3.1 — Range overlay tints (Wave 3 fix #5).
const RANGE_TINT = {
  move: 'rgba(0, 184, 212, 0.20)', // player blue, semi-trans
  moveBorder: 'rgba(0, 184, 212, 0.55)',
  attack: 'rgba(255, 82, 82, 0.28)', // sistema red
  attackBorder: 'rgba(255, 82, 82, 0.75)',
};

// Sprint 4 §II (2026-04-27) — Dead Space holographic AOE cone overlay.
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #11 Dead Space.
// Pattern: shimmer + scanline + edge-glow per area abilità non-projettile.
// Wire opportunity: ability cone telegraph (raggio + angle), AOE radius blast.
const HOLO_TINT = {
  fill: 'rgba(120, 220, 255, 0.18)', // ciano elettrico (Dead Space holo blue)
  edge: 'rgba(180, 240, 255, 0.85)',
  scanline: 'rgba(120, 220, 255, 0.45)',
};

/**
 * Sprint 4 §II — Dead Space holographic AOE preview.
 * Renders shimmer + scanline overlay on tiles array for ability telegraph.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number,y:number}>} tiles
 * @param {number} gridH
 * @param {object} [opts]
 * @param {number} [opts.scanlinePhase=0] - animation phase for shimmer (0..1)
 */
export function drawHolographicAoe(ctx, tiles, gridH, opts = {}) {
  if (!Array.isArray(tiles) || tiles.length === 0) return;
  const phase = Number(opts.scanlinePhase) || 0;
  ctx.save();
  // Layer 1: holo fill on each tile.
  ctx.fillStyle = HOLO_TINT.fill;
  for (const t of tiles) {
    if (!t) continue;
    const yPx = gridH - 1 - t.y;
    ctx.fillRect(t.x * CELL, yPx * CELL, CELL, CELL);
  }
  // Layer 2: scanline (horizontal sweep across covered tiles).
  const minY = Math.min(...tiles.map((t) => gridH - 1 - t.y));
  const maxY = Math.max(...tiles.map((t) => gridH - 1 - t.y));
  const scanY = (minY + (maxY - minY + 1) * phase) * CELL;
  ctx.strokeStyle = HOLO_TINT.scanline;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  // Find x range from tiles for scanline width.
  const minX = Math.min(...tiles.map((t) => t.x));
  const maxX = Math.max(...tiles.map((t) => t.x));
  ctx.beginPath();
  ctx.moveTo(minX * CELL, scanY);
  ctx.lineTo((maxX + 1) * CELL, scanY);
  ctx.stroke();
  ctx.setLineDash([]);
  // Layer 3: edge-glow per tile.
  ctx.strokeStyle = HOLO_TINT.edge;
  ctx.lineWidth = 1.5;
  for (const t of tiles) {
    if (!t) continue;
    const yPx = gridH - 1 - t.y;
    ctx.strokeRect(t.x * CELL + 1, yPx * CELL + 1, CELL - 2, CELL - 2);
  }
  ctx.restore();
}

// QW4 (2026-04-26) — Lifecycle phase visual mapping. Skiv (Arenavenator vagans /
// dune_stalker) è la creatura canonical: phases sono definite in
// data/core/species/dune_stalker_lifecycle.yaml ma il sistema è multi-creature
// ready (ogni unit con `lifecycle_phase` riceve scaling + tint + badge).
//
// Phases canoniche (5): hatchling → juvenile → mature → apex → legacy.
// NOTE: lifecycle YAML usa "mature" non "adult" (ref dune_stalker_lifecycle.yaml).
//
// Size scaling: cucciolo più piccolo, apex più grande. Legacy = retired (no growth).
// Tint: shift di hue lungo la curva di vita (grigio polvere → ocra → ossidiana
// → cristallo notturno → argento spettrale).
// Badge: 3 char abbrev top-right per scan TV-side (10-foot rule).
const LIFECYCLE_PHASE_STYLE = {
  hatchling: { sizeMul: 0.6, tint: '#bdbdbd', badge: 'HJG' }, // grigio polvere
  juvenile: { sizeMul: 0.8, tint: '#d9a45b', badge: 'JUV' }, // ocra striato
  mature: { sizeMul: 1.0, tint: '#7e57c2', badge: 'MTR' }, // ossidiana riflessa
  apex: { sizeMul: 1.15, tint: '#1565c0', badge: 'APX' }, // brina notturna
  legacy: { sizeMul: 1.0, tint: '#9e9e9e', badge: 'LGC' }, // argento spettrale
};

const LIFECYCLE_DEFAULT_STYLE = { sizeMul: 1.0, tint: null, badge: null };

export function getLifecyclePhaseStyle(phase) {
  if (!phase || typeof phase !== 'string') return LIFECYCLE_DEFAULT_STYLE;
  return LIFECYCLE_PHASE_STYLE[phase.toLowerCase()] || LIFECYCLE_DEFAULT_STYLE;
}

// Stadio Phase A (2026-04-27) — 10-stadi sub-divisione (I-X) refined scaling.
// Linear interpolation 0.55 → 1.20 over 10 stadi, badge = roman numeral.
// Backward-compat: se `stadio` mancante / fuori range, fallback a
// getLifecyclePhaseStyle(lifecycle_phase). Vedi docs/planning/2026-04-27-forme-10-stadi-naming-spec.md
// + data/core/species/dune_stalker_lifecycle.yaml § stadi.
const STADIO_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
// Tint progressivi mappati 2:1 sui 5 macro-fasi (early/late dello stesso macro condividono tint base).
const STADIO_TINT = [
  '#bdbdbd', // I  (hatchling early)
  '#bdbdbd', // II (hatchling late) — same tint, sizeMul differenzia
  '#d9a45b', // III (juvenile early)
  '#d9a45b', // IV  (juvenile late)
  '#7e57c2', // V  (mature early)
  '#7e57c2', // VI (mature late)
  '#1565c0', // VII (apex early)
  '#1565c0', // VIII (apex late)
  '#9e9e9e', // IX (legacy early)
  '#9e9e9e', // X  (legacy late)
];

/**
 * Returns size multiplier + tint + roman badge per a given stadio integer 1-10.
 * Linear interpolation: stadio 1 = 0.55, stadio 10 = 1.20 (delta 0.65 / 9 steps ≈ 0.0722).
 * Returns LIFECYCLE_DEFAULT_STYLE if stadio invalid (missing / non-int / out of 1-10 range).
 *
 * @param {number} stadio integer 1..10
 * @returns {{sizeMul: number, tint: string|null, badge: string|null}}
 */
export function getStadioStyle(stadio) {
  if (!Number.isInteger(stadio) || stadio < 1 || stadio > 10) {
    return LIFECYCLE_DEFAULT_STYLE;
  }
  const sizeMul = 0.55 + (stadio - 1) * (0.65 / 9);
  return {
    sizeMul: Math.round(sizeMul * 1000) / 1000,
    tint: STADIO_TINT[stadio - 1],
    badge: STADIO_ROMAN[stadio - 1],
  };
}

/**
 * Resolve unit visual style with backward-compat. Prefer `unit.stadio` (1-10
 * Phase A schema). Fallback `unit.lifecycle_phase` (5-fasi legacy) if stadio
 * missing. Both missing → default safe style.
 */
export function resolveUnitVisualStyle(unit) {
  if (!unit) return LIFECYCLE_DEFAULT_STYLE;
  if (Number.isInteger(unit.stadio)) {
    return getStadioStyle(unit.stadio);
  }
  return getLifecyclePhaseStyle(unit.lifecycle_phase);
}

// QW4 — Aspect token visual overlay. Token = mutation morphology marker
// (claws_glass, claws_glacial, scales_chameleon, ears_radar). Reso come
// piccolo glifo in alto-sinistra del corpo unit. Multi-creature: qualsiasi
// unit con `aspect_token` campo riceve overlay (token sconosciuto = no-op).
//
// Source of truth: data/core/species/dune_stalker_lifecycle.yaml § mutation_morphology.
const ASPECT_TOKEN_OVERLAY = {
  claws_glass: { glyph: '◆', color: '#b39ddb' }, // ossidiana trasparente
  claws_glacial: { glyph: '❄', color: '#90caf9' }, // brina permanente
  scales_chameleon: { glyph: '◐', color: '#a5d6a7' }, // bio-camo
  ears_radar: { glyph: '◊', color: '#80deea' }, // echolocation 3D
};

export function getAspectTokenOverlay(token) {
  if (!token || typeof token !== 'string') return null;
  return ASPECT_TOKEN_OVERLAY[token.toLowerCase()] || null;
}

// 2026-04-27 PR-Y1 — Hyper Light Drifter glyph alphabet (forma+colore = doppio canale).
// Pattern donor: docs/research/2026-04-27-indie-design-perfetto.md (HLD #4).
// Forma denota CATEGORIA status (mental/physical/temporary/buff). Colore denota URGENZA.
// Color-blind safe (P2 a11y compliance: 2 canali informativi).
//
// Categorie:
//   triangle = MENTAL (panic/confused/focused) — instabilita psichica
//   diamond  = PHYSICAL (bleeding/fracture/sbilanciato) — ferita fisica
//   star     = COMBAT_BUFF (rage/stunned/aggro_locked) — alterazione combat
//   circle   = SOCIAL (taunted_by) — manipolazione esterna
const STATUS_ICONS = {
  panic: { glyph: '!', bg: '#ff9800', shape: 'triangle' },
  rage: { glyph: '⚡', bg: '#f44336', shape: 'star' },
  stunned: { glyph: '★', bg: '#9c27b0', shape: 'star' },
  focused: { glyph: '◎', bg: '#03a9f4', shape: 'triangle' },
  confused: { glyph: '?', bg: '#ffc107', shape: 'triangle' },
  bleeding: { glyph: '☽', bg: '#e91e63', shape: 'diamond' },
  fracture: { glyph: '✕', bg: '#795548', shape: 'diamond' },
  sbilanciato: { glyph: '↯', bg: '#ffeb3b', shape: 'diamond' },
  taunted_by: { glyph: '⎯', bg: '#ffc107', shape: 'circle' },
  aggro_locked: { glyph: '◉', bg: '#ff5722', shape: 'star' },
  // Sprint 13 — Status engine wave A surface (7 ancestor statuses).
  // Consumer side wired in apps/backend/services/combat/statusModifiers.js;
  // producer side wired in apps/backend/services/combat/passiveStatusApplier.js.
  // Glyph shape coding: circle=persistent kin/sense, diamond=combat-trigger.
  linked: { glyph: '∞', bg: '#fdd835', shape: 'circle' },
  fed: { glyph: '◍', bg: '#8d6e63', shape: 'circle' },
  healing: { glyph: '✚', bg: '#4caf50', shape: 'circle' },
  attuned: { glyph: '⌬', bg: '#26c6da', shape: 'circle' },
  sensed: { glyph: '⊙', bg: '#ab47bc', shape: 'circle' },
  telepatic_link: { glyph: '⚹', bg: '#7e57c2', shape: 'star' },
  frenzy: { glyph: 'ᛞ', bg: '#ef5350', shape: 'diamond' },
};

export function fitCanvas(canvas, width, height) {
  // W8O — compute CELL from available container space. Keep grid N cells costant.
  // Min 40 (mobile), max 160 (widescreen 4K/ultrawide). Use min(container W, 78vh).
  // Playtest 2026-04-24: user segnala su 3436×1265 ultrawide canvas minuscolo
  // top-left + resto schermo vuoto. Cap 96 era TV-safe ma sprecato su desktop.
  const parent = canvas.parentElement;
  const containerW = parent ? parent.clientWidth : window.innerWidth;
  const containerH = window.innerHeight * 0.78;
  const byW = Math.floor(containerW / width);
  const byH = Math.floor(containerH / height);
  CELL = Math.max(40, Math.min(160, Math.min(byW, byH)));
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

// 2026-04-27 PR-Y1 — HLD shape helper. Disegna forma per categoria status.
function drawStatusShape(ctx, shape, cx, cy, radius) {
  ctx.beginPath();
  switch (shape) {
    case 'triangle': {
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius * 0.92, cy + radius * 0.6);
      ctx.lineTo(cx - radius * 0.92, cy + radius * 0.6);
      ctx.closePath();
      break;
    }
    case 'diamond': {
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius, cy);
      ctx.closePath();
      break;
    }
    case 'star': {
      const points = 5;
      for (let i = 0; i < points * 2; i += 1) {
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.5;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case 'circle':
    default:
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  }
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
    // 2026-04-27 PR-Y1 — HLD shape (forma=categoria) sostituisce circle uniforme.
    ctx.fillStyle = ic.bg;
    drawStatusShape(ctx, ic.shape || 'circle', ix + size / 2, iy + size / 2, size / 2);
    ctx.fill();
    // Stroke per separazione su tile colorato (white outline a11y compliance).
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = `bold ${Math.max(12, Math.round(CELL * 0.16))}px "SF Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ic.glyph, ix + size / 2, iy + size / 2 + 1);
  }
}

// 2026-04-27 Bundle B.4 — Wildfrost-style counter HUD badges.
//
// Disegna fino a 3 badge counter top-right del sprite tile (16x16 corner area).
// Background semi-transparent (#000a) + numero bianco bold. Mostra in priority
// order:
//   1. ability_cooldowns (object map { ability_id: turns_remaining })
//   2. reaction_cooldown_remaining (singolo numero)
//   3. status duration numerica (panic, rage, stunned, ...)
//
// Hide se counter <= 0 o expired. Anti-pattern guard: max 3 badge per unit
// (overflow indicator "+N" se più di 3).
//
// Ref Tactics Ogre HP bar pattern (PR #1901). Pattern source: Wildfrost
// counter HUD — vedi docs/research/2026-04-27-indie-meccaniche-perfette.md §2.
export function collectCounters(unit) {
  const counters = [];
  // 1. ability_cooldowns (object): { abilityId: turns }
  const cds = unit.ability_cooldowns;
  if (cds && typeof cds === 'object' && !Array.isArray(cds)) {
    for (const [abilityId, turns] of Object.entries(cds)) {
      const n = Number(turns);
      if (Number.isFinite(n) && n > 0) {
        counters.push({ kind: 'cd', label: String(n), tint: '#5b8def', key: abilityId });
      }
    }
  }
  // 2. reaction_cooldown_remaining (singolo)
  const rxCd = Number(unit.reaction_cooldown_remaining || 0);
  if (rxCd > 0) {
    counters.push({ kind: 'cd', label: String(rxCd), tint: '#7c4dff', key: 'rx' });
  }
  // 3. status durations numeriche (es. panic:2, rage:3, bleeding:1)
  const status = unit.status || {};
  for (const [key, val] of Object.entries(status)) {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) {
      counters.push({ kind: 'status', label: String(n), tint: '#ff7043', key });
    }
  }
  return counters;
}

function drawCounterBadge(ctx, unit, cx, yPxTop) {
  const counters = collectCounters(unit);
  if (counters.length === 0) return;
  const MAX = 3;
  const display = counters.slice(0, MAX);
  const overflow = counters.length - MAX;
  const size = Math.max(14, Math.round(CELL * 0.18));
  const gap = 2;
  // Top-right corner: stack vertically going down from top edge.
  // Right-align so badges don't collide with status icons (which start from cx + 18%).
  const startX = cx + CELL * 0.5 - size - 2;
  const startY = yPxTop + 2;
  ctx.save();
  ctx.font = `bold ${Math.max(9, Math.round(size * 0.62))}px "SF Mono", "Menlo", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < display.length; i++) {
    const c = display[i];
    const bx = startX;
    const by = startY + i * (size + gap);
    // Pill bg semi-transparent + tinted border per kind.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.66)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, size, size, 3);
    } else {
      ctx.rect(bx, by, size, size);
    }
    ctx.fill();
    ctx.strokeStyle = c.tint;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Counter number bianco bold.
    ctx.fillStyle = '#fff';
    ctx.fillText(c.label, bx + size / 2, by + size / 2 + 0.5);
  }
  // Overflow indicator "+N" (sotto al 3o badge).
  if (overflow > 0) {
    const bx = startX;
    const by = startY + MAX * (size + gap);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.66)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, size, size, 3);
    } else {
      ctx.rect(bx, by, size, size);
    }
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(`+${overflow}`, bx + size / 2, by + size / 2 + 0.5);
  }
  ctx.restore();
}

// QW4 — Lifecycle phase badge: pill scuro + abbrev (HJG/JUV/MTR/APX/LGC).
// Posizione: bottom-right del tile. Tint ring color come bg, white text + outline.
function drawLifecycleBadge(ctx, style, cx, yPxTop) {
  const label = style.badge;
  const fontSize = Math.max(9, Math.round(CELL * 0.11));
  ctx.save();
  ctx.font = `bold ${fontSize}px "SF Mono", "Menlo", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const padX = 4;
  const padY = 2;
  const textW = ctx.measureText(label).width;
  const badgeW = textW + padX * 2;
  const badgeH = fontSize + padY * 2;
  const bx = cx + CELL * 0.18;
  const by = yPxTop + CELL - badgeH - 4;
  // Pill bg (dark) + tint border
  ctx.fillStyle = 'rgba(15, 15, 15, 0.88)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, badgeW, badgeH, 4);
  } else {
    ctx.rect(bx, by, badgeW, badgeH);
  }
  ctx.fill();
  ctx.strokeStyle = style.tint || '#888';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // White text con outline nero (TV scan ready).
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, bx + padX, by + padY);
  ctx.restore();
}

// QW4 — Aspect token overlay glifo: piccolo marker top-left del tile per
// mutation morphology (claws_glass/glacial/scales_chameleon/ears_radar).
function drawAspectTokenOverlay(ctx, overlay, cx, yPxTop) {
  const size = Math.max(14, Math.round(CELL * 0.18));
  const ix = cx - CELL * 0.32;
  const iy = yPxTop + CELL * 0.55;
  ctx.save();
  // Disc bg semi-trans
  ctx.fillStyle = 'rgba(15, 15, 15, 0.78)';
  ctx.beginPath();
  ctx.arc(ix, iy, size / 2 + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = overlay.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Glyph
  ctx.fillStyle = overlay.color;
  ctx.font = `bold ${size - 2}px "SF Mono", "Menlo", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(overlay.glyph, ix, iy + 1);
  ctx.restore();
}

// W4.3 — Priority rank badge (resolution order 1..N) during resolve phase.
function drawPriorityBadge(ctx, rank, cx, yPxTop) {
  const size = 18;
  const ix = cx - CELL * 0.32;
  const iy = yPxTop + CELL * 0.08;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 204, 0, 0.92)';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ix, iy + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 12px "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(rank), ix, iy + size / 2 + 1);
  ctx.restore();
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

  // W8M — Body: job-shape silhouette (no more circles). Ring outer = jobColor,
  // interior = faction. Boss scale +50% per drawUnitBody ring/body.
  // QW4 (2026-04-26) — Lifecycle phase scaling: hatchling 0.6× → apex 1.15×.
  // Skiv visibility: phase visualmente leggibile da TV scan (10-foot rule).
  // Multi-creature ready: qualsiasi unit con `lifecycle_phase` campo riceve
  // scaling + tint + badge (token sconosciuto / phase mancante = fallback safe).
  const jobKey = (unit.job || unit.class || '').toString().toLowerCase();
  const isBoss = jobKey === 'boss' || unit.is_boss === true;
  // Stadio Phase A: prefer unit.stadio (1-10) for refined size scaling, fallback
  // to unit.lifecycle_phase (5-fasi legacy). Backward-compat granted by
  // resolveUnitVisualStyle helper.
  const lifecycleStyle = resolveUnitVisualStyle(unit);
  const sizeMul = (isBoss ? 1.5 : 1) * lifecycleStyle.sizeMul;
  const jobColor = JOB_COLORS[jobKey] || null;
  // Outer job ring
  if (!dead && jobColor) {
    ctx.fillStyle = jobColor;
    drawUnitBody(ctx, cx, cy, jobKey, CELL * 0.42 * sizeMul);
    ctx.fill();
  }
  // QW4 — Lifecycle phase tint ring (intermediate layer between job ring and
  // faction body). Visibile solo se phase nota; semi-trans per leggere job sotto.
  if (!dead && lifecycleStyle.tint) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = lifecycleStyle.tint;
    drawUnitBody(ctx, cx, cy, jobKey, CELL * 0.38 * sizeMul);
    ctx.fill();
    ctx.restore();
  }
  // Inner faction body
  ctx.fillStyle = color;
  ctx.globalAlpha = dead ? 0.4 : 1;
  drawUnitBody(ctx, cx, cy, jobKey, CELL * 0.33 * sizeMul);
  ctx.fill();
  ctx.globalAlpha = 1;

  // W2.3 — Flash overlay on hit/heal
  const flash = !dead ? getFlashAlpha(unit.id) : null;
  if (flash) {
    ctx.globalAlpha = flash.alpha;
    ctx.fillStyle = flash.color;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.42, 0, Math.PI * 2);
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

  // W8M — Label: species IT abbrev (3 char upper) instead of raw id. Outline
  // stroke nera per contrast su body color. User feedback: "scritte orribili
  // p-sc p-ta e-no" replaced with "PRE" (Predatore) / "PRE" (Predoni).
  const speciesIt = getSpeciesDisplayIt(unit.species);
  const abbrev = (speciesIt ? speciesIt : unit.id || '???')
    .replace(/[^\p{L}]/gu, '')
    .slice(0, 3)
    .toUpperCase();
  // 10-foot rule: dynamic font for species abbrev (min 14px, scale with CELL).
  ctx.font = `bold ${Math.max(14, Math.round(CELL * 0.18))}px "SF Mono", "Menlo", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeText(abbrev, cx, cy);
  ctx.fillStyle = '#fff';
  ctx.fillText(abbrev, cx, cy);

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
    // 2026-04-27 PR-Y2 — HP critico pulse animation (Dead Space diegetic UI pattern).
    // Quando ratio < 0.3 → HP bar pulsa rosso 1Hz. Alpha 0.6→1.0 sin wave.
    // Player vede subito chi sta morendo senza dover leggere numeri.
    let hpFillStyle;
    let hpAlpha = 1.0;
    if (ratio < 0.3) {
      hpFillStyle = COLORS.hpCrit;
      // Pulse 1Hz: ratio 0..1 mapped on Date.now() % 1000.
      const t = (Date.now() % 1000) / 1000;
      hpAlpha = 0.6 + Math.sin(t * Math.PI * 2) * 0.4; // 0.2..1.0
    } else {
      hpFillStyle = ratio < 0.6 ? COLORS.hpWarn : COLORS.hpFull;
    }
    ctx.save();
    ctx.globalAlpha = hpAlpha;
    ctx.fillStyle = hpFillStyle;
    ctx.fillRect(barX, barY, barW * ratio, 5);
    ctx.restore();
    // Outline rosso pulse per HP critico (extra visibility)
    if (ratio < 0.3) {
      ctx.strokeStyle = `rgba(244, 67, 54, ${hpAlpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, 7);
    }
    // Numeric value sopra bar (TV-first scan)
    ctx.fillStyle = '#fff';
    // 10-foot rule: HP numeric scales with CELL (min 12px, prev was 9px hard-fail TV).
    ctx.font = `bold ${Math.max(12, Math.round(CELL * 0.15))}px "SF Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const maxHp = unit.max_hp || unit.hp || 0;
    ctx.fillText(`${unit.hp}/${maxHp}`, cx, barY - 1);

    // 2026-04-26 P0 quick-win — Tactics Ogre AP indicator float sotto HP bar.
    // Pattern donor: Tactics Ogre Reborn ATB pip overhead unit (scan TV-first).
    // Source: docs/research/2026-04-26-tier-s-extraction-matrix.md (Tactics Ogre)
    // Mostra ap_remaining come pip discreti (es. ●●○ = 2/3 AP). Posizione
    // 4px sotto HP bar. Solo per unit player o sistema attivo (non KO).
    const apRemaining = Number(unit.ap_remaining ?? unit.ap ?? 0);
    const apMax = Number(unit.ap ?? 0);
    if (apMax > 0 && apMax <= 5) {
      const pipRadius = 2.5;
      const pipGap = 2;
      const pipsW = apMax * pipRadius * 2 + (apMax - 1) * pipGap;
      const pipsX = cx - pipsW / 2 + pipRadius;
      const pipsY = barY + 9;
      for (let i = 0; i < apMax; i += 1) {
        ctx.beginPath();
        ctx.arc(pipsX + i * (pipRadius * 2 + pipGap), pipsY, pipRadius, 0, Math.PI * 2);
        ctx.fillStyle = i < apRemaining ? '#ffcc00' : 'rgba(0,0,0,0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // Status icons (top-right)
  if (!dead) drawStatusIcons(ctx, unit, cx, yPx * CELL);

  // 2026-04-27 Bundle B.4 — counter badges (Wildfrost HUD).
  // Stacked top-right area, accanto agli status icon. ability_cooldowns +
  // reaction_cooldown_remaining + status duration. Skip se nessun counter.
  if (!dead) drawCounterBadge(ctx, unit, cx, yPx * CELL);

  // QW4 — Lifecycle phase badge (bottom-right, sotto al corpo). Skiv-style:
  // hatchling/juvenile/mature/apex/legacy abbrev su pill scuro.
  if (!dead && lifecycleStyle.badge) {
    drawLifecycleBadge(ctx, lifecycleStyle, cx, yPx * CELL);
  }

  // QW4 — Aspect token overlay (top-left). Mutation morphology marker
  // (claws_glass/claws_glacial/scales_chameleon/ears_radar). Glifo piccolo,
  // colore tematico. No-op se token assente o sconosciuto.
  if (!dead) {
    const aspectOverlay = getAspectTokenOverlay(unit.aspect_token);
    if (aspectOverlay) {
      drawAspectTokenOverlay(ctx, aspectOverlay, cx, yPx * CELL);
    }
  }

  // M4 P0.3 — SIS enemy intent icon (Slay the Spire pattern).
  // M8 Plan-Reveal P0 (ADR-2026-04-18): real intent icon da threat_preview
  // payload backend (/round/begin-planning). Fallback 'fist' se preview
  // assente (legacy flow o first-paint pre-begin-planning).
  if (!dead && unit.controlled_by === 'sistema') {
    const preview = Array.isArray(highlight.threatPreview) ? highlight.threatPreview : [];
    const row = preview.find((r) => r && r.actor_id === unit.id);
    const icon = (row && row.intent_icon) || 'fist';
    drawSisIntentIcon(ctx, unit, cx, yPx * CELL, icon);
  }

  // W4.3 — Resolution priority badge (visible during commit-round reveal phase).
  if (!dead && highlight.resolutionOrder) {
    const rank = highlight.resolutionOrder.get
      ? highlight.resolutionOrder.get(unit.id)
      : highlight.resolutionOrder[unit.id];
    if (rank) drawPriorityBadge(ctx, rank, cx, yPx * CELL);
  }
}

// M4 P0.3 — SIS intent icon above unit (fist=attack, arrow=move, shield=defend).
// 2026-04-26 ITB telegraph — threat tile overlay (semi-transparent rosso/giallo/blu per intent type).
// Schema row: { actor_id, intent_type, intent_icon, target_id, threat_tiles: [{x, y}, ...] }
// Colore: attack=rosso (kill zone), move=giallo (movement preview), defend/overwatch/skip=blu.
// Pulse: alpha oscilla 0.25-0.45 a 1Hz per attirare attenzione (Into the Breach pattern).
// 2026-04-27 PR-Y3 — ITB push/pull arrows helper (Tier A donor).
// Draw freccia direzionale da `from` (cella origine) a `to` (cella destinazione).
// Usato per intent move/approach/retreat: mostra dove SIS si sposta.
// Pattern donor: Into the Breach push/pull telegraph arrows.
function drawDirectionalArrow(ctx, fromX, fromY, toX, toY, color, gridH) {
  if (!Number.isFinite(fromX) || !Number.isFinite(fromY)) return;
  if (!Number.isFinite(toX) || !Number.isFinite(toY)) return;
  // Convert grid coords to canvas pixel center
  const fromYPx = (gridH - 1 - fromY) * CELL + CELL / 2;
  const fromXPx = fromX * CELL + CELL / 2;
  const toYPx = (gridH - 1 - toY) * CELL + CELL / 2;
  const toXPx = toX * CELL + CELL / 2;
  // Skip se same tile (no arrow needed)
  if (fromXPx === toXPx && fromYPx === toYPx) return;
  // Compute angle + arrow head size
  const dx = toXPx - fromXPx;
  const dy = toYPx - fromYPx;
  const angle = Math.atan2(dy, dx);
  const arrowHeadSize = Math.max(8, CELL * 0.18);
  // Shorten line so arrow head doesn't overlap dest center
  const shortenBy = arrowHeadSize * 0.6;
  const lineToX = toXPx - Math.cos(angle) * shortenBy;
  const lineToY = toYPx - Math.sin(angle) * shortenBy;
  // Line shaft
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromXPx, fromYPx);
  ctx.lineTo(lineToX, lineToY);
  ctx.stroke();
  // Arrow head triangle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toXPx, toYPx);
  ctx.lineTo(
    toXPx - arrowHeadSize * Math.cos(angle - Math.PI / 6),
    toYPx - arrowHeadSize * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toXPx - arrowHeadSize * Math.cos(angle + Math.PI / 6),
    toYPx - arrowHeadSize * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
  // White outline arrowhead per leggibilità su tile colorato
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawThreatTileOverlay(ctx, threatPreview, gridH, units) {
  const t = (Date.now() % 1000) / 1000; // 0..1 ciclico
  const pulse = 0.35 + Math.sin(t * Math.PI * 2) * 0.1; // 0.25..0.45
  // 2026-04-27 PR-Y3 — units lookup map per source position (per arrow from)
  const unitMap = new Map();
  if (Array.isArray(units)) {
    for (const u of units) {
      if (u && u.id) unitMap.set(u.id, u);
    }
  }
  for (const row of threatPreview) {
    if (!row || !Array.isArray(row.threat_tiles) || row.threat_tiles.length === 0) continue;
    let fill;
    let stroke;
    if (row.intent_type === 'attack') {
      fill = `rgba(244, 67, 54, ${pulse})`; // rosso #f44336
      stroke = 'rgba(244, 67, 54, 0.85)';
    } else if (
      row.intent_type === 'move' ||
      row.intent_type === 'approach' ||
      row.intent_type === 'retreat'
    ) {
      fill = `rgba(255, 170, 0, ${pulse * 0.7})`; // giallo
      stroke = 'rgba(255, 170, 0, 0.7)';
    } else {
      fill = `rgba(79, 195, 247, ${pulse * 0.55})`; // blu defensive
      stroke = 'rgba(79, 195, 247, 0.55)';
    }
    for (const tile of row.threat_tiles) {
      if (!tile || typeof tile.x !== 'number' || typeof tile.y !== 'number') continue;
      const yPx = gridH - 1 - tile.y;
      const px = tile.x * CELL;
      const py = yPx * CELL;
      ctx.fillStyle = fill;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4);

      // 2026-04-27 PR-Y2 — StS damage forecast inline su threat tile attack.
      // Pattern donor: Slay the Spire intent preview deterministico.
      // Mostra "−5" (expected_damage) + "62%" (hit_pct) sopra tile attaccata.
      // Solo per attack (skip move/defensive: payload non ha damage).
      if (row.intent_type === 'attack' && Number.isFinite(row.expected_damage)) {
        const tx = px + CELL / 2;
        const ty = py + CELL * 0.2;
        const dmgFontSize = Math.max(13, Math.round(CELL * 0.18));
        ctx.font = `bold ${dmgFontSize}px "SF Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Background pill scuro per leggibilità
        const dmgText = `−${row.expected_damage.toFixed(1)}`;
        const textW = ctx.measureText(dmgText).width;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(tx - textW / 2 - 4, ty - dmgFontSize / 2 - 2, textW + 8, dmgFontSize + 4);
        ctx.fillStyle = '#ff5555';
        ctx.fillText(dmgText, tx, ty);
        // Hit% sotto (smaller)
        if (Number.isFinite(row.hit_pct)) {
          const hitFontSize = Math.max(9, Math.round(CELL * 0.11));
          ctx.font = `${hitFontSize}px "SF Mono", monospace`;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillText(`${Math.round(row.hit_pct * 100)}%`, tx, ty + dmgFontSize - 2);
        }
      }
    }

    // 2026-04-27 PR-Y3 — ITB push/pull arrow per intent move/approach/retreat.
    // Da actor.position → tile destinazione (primo threat_tile).
    // Skip per attack (overlay rosso + damage forecast bastano).
    const isMoveIntent =
      row.intent_type === 'move' || row.intent_type === 'approach' || row.intent_type === 'retreat';
    if (isMoveIntent && row.threat_tiles[0]) {
      const actor = unitMap.get(row.actor_id);
      if (actor && actor.position) {
        drawDirectionalArrow(
          ctx,
          actor.position.x,
          actor.position.y,
          row.threat_tiles[0].x,
          row.threat_tiles[0].y,
          'rgba(255, 170, 0, 0.95)', // giallo intenso (movement intent)
          gridH,
        );
      }
    }
  }
}

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
  // 10-foot rule: intent glyph (min 13px, scale with CELL).
  ctx.font = `bold ${Math.max(13, Math.round(CELL * 0.17))}px "SF Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, ix, iy + size / 2 + 1);
}

// W3.1 — Range overlay: movimento (Manhattan <= AP) + attacco (Chebyshev <= range).
// Wave 3 fix #5: player no sapeva dove poteva muovere/attaccare senza trial-and-error.
function drawRangeOverlay(ctx, state, gridH, selectedId) {
  const unit = (state.units || []).find((u) => u.id === selectedId);
  if (!unit || !unit.position || unit.hp <= 0) return;
  const gridW = state.grid?.width || 0;
  const ap = Number(unit.ap ?? 0);
  const atkRange = Number(unit.range ?? unit.attack_range ?? 1);
  const ux = unit.position.x;
  const uy = unit.position.y;

  // Occupied cells (alive units) — block movement target.
  const occupied = new Set();
  for (const u of state.units || []) {
    if (u.hp > 0 && u.position) occupied.add(`${u.position.x},${u.position.y}`);
  }

  // Move range (Manhattan <= AP, escluse celle occupate).
  // W6.2a — AP cost label per tile.
  // W8h — Readability fix (user feedback run5): ciano su ciano era low contrast (WCAG fail).
  // Nuovo: dark badge pill + white text + shadow. Contrast ratio 18:1 (WCAG AAA).
  if (ap > 0) {
    ctx.save();
    ctx.font = 'bold 12px "SF Mono", "Menlo", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let gy = 0; gy < gridH; gy += 1) {
      for (let gx = 0; gx < gridW; gx += 1) {
        const d = Math.abs(gx - ux) + Math.abs(gy - uy);
        if (d === 0 || d > ap) continue;
        if (occupied.has(`${gx},${gy}`)) continue;
        const yPx = gridH - 1 - gy;
        // Tint fill + border (unchanged)
        ctx.fillStyle = RANGE_TINT.move;
        ctx.fillRect(gx * CELL, yPx * CELL, CELL, CELL);
        ctx.strokeStyle = RANGE_TINT.moveBorder;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gx * CELL + 2, yPx * CELL + 2, CELL - 4, CELL - 4);
        // AP badge — dark pill background (top-left).
        const label = `${d} AP`;
        const badgeW = ctx.measureText(label).width + 10;
        const badgeH = 18;
        const bx = gx * CELL + 4;
        const by = yPx * CELL + 4;
        ctx.fillStyle = 'rgba(15, 15, 15, 0.85)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx, by, badgeW, badgeH, 4);
        } else {
          ctx.rect(bx, by, badgeW, badgeH);
        }
        ctx.fill();
        ctx.strokeStyle = RANGE_TINT.moveBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
        // White text on dark bg — WCAG AAA.
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, bx + 5, by + 3);
      }
    }
    ctx.restore();
  }

  // Attack range: highlight enemy unit cells raggiungibili (Chebyshev).
  for (const other of state.units || []) {
    if (other.id === unit.id || !other.position || other.hp <= 0) continue;
    if (other.controlled_by === unit.controlled_by) continue;
    const dCheb = Math.max(Math.abs(other.position.x - ux), Math.abs(other.position.y - uy));
    if (dCheb > atkRange) continue;
    const yPx = gridH - 1 - other.position.y;
    ctx.save();
    ctx.fillStyle = RANGE_TINT.attack;
    ctx.fillRect(other.position.x * CELL, yPx * CELL, CELL, CELL);
    ctx.strokeStyle = RANGE_TINT.attackBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(other.position.x * CELL + 2, yPx * CELL + 2, CELL - 4, CELL - 4);
    ctx.restore();
  }
}

export function render(canvas, state, highlight = {}) {
  if (!state || !state.grid) return;
  const w = state.grid.width;
  const h = state.grid.height;
  // W8O — sempre refit (CELL dinamico risponde a viewport resize).
  fitCanvas(canvas, w, h);

  const ctx = canvas.getContext('2d');
  // 2026-04-28 Visual upgrade Sprint D — wire bioma tile loader.
  // resolveTileImg() returns cached PNG per (bioma, variant). Asset missing → null
  // → drawCell checkered fallback (back-compat preserved).
  const biomaId = state?.encounter?.biome_id || state?.biome_id || null;
  // Checkered grid (o tile PNG se asset loaded per bioma)
  for (let gy = 0; gy < h; gy += 1) {
    for (let gx = 0; gx < w; gx += 1) {
      const yPx = h - 1 - gy;
      const fill = (gx + gy) % 2 === 0 ? COLORS.grid : COLORS.gridAlt;
      const tileImg = resolveTileImg(biomaId, gx, yPx);
      drawCell(ctx, gx, yPx, fill, tileImg);
    }
  }

  // W3.1 — Range overlay BEFORE units (so unit rings/icons overlap on top).
  if (highlight.selected) drawRangeOverlay(ctx, state, h, highlight.selected);

  // 2026-04-26 ITB telegraph — threat tile overlay rosso/giallo per SIS pending intents.
  // Disegnato DOPO range overlay (player vede sue mosse possibili) e PRIMA delle unità.
  if (Array.isArray(highlight.threatPreview) && highlight.threatPreview.length > 0) {
    // PR-Y3: pass units per arrow source position lookup
    drawThreatTileOverlay(ctx, highlight.threatPreview, h, state.units || []);
  }

  // Sprint 4 §II (2026-04-27) — Dead Space holographic AOE telegraph.
  // Wire: ability cone preview pre-attack via highlight.aoePreview (array {x,y}).
  if (Array.isArray(highlight.aoePreview) && highlight.aoePreview.length > 0) {
    const phase = (Date.now() / 800) % 1; // ~1.25 Hz scanline sweep
    drawHolographicAoe(ctx, highlight.aoePreview, h, { scanlinePhase: phase });
  }

  // Units
  for (const u of state.units || []) drawUnit(ctx, u, h, highlight);

  // W2.3 — Attack rays (sopra unità, sotto popups)
  drawRays(ctx, CELL, h);

  // Damage popups on top
  drawPopups(ctx, CELL, h);
}

export function needsAnimFrame() {
  // Sprint 4 §II — keep animating when an AOE preview is active (scanline sweep).
  if (typeof window !== 'undefined' && window.__evoAoePreviewActive === true) return true;
  return hasActiveAnims();
}

export const CELL_SIZE = CELL;

// =============================================================================
// Sprint β Visual UX 2026-04-28 — strategy games extraction (Civ VI + Frostpunk
// + Phoenix Point patterns). 3 helper esposti per render layer + test puri.
// =============================================================================

// Civ VI 3-tier tooltip stratificato.
// Tier 1 @ 300ms (icon + name) → "what".
// Tier 2 @ 800ms (stats panel)  → "numbers".
// Tier 3 @ 1500ms (lore + flavor) → "why care".
export const TOOLTIP_TIER_DELAYS = {
  tier1: 300,
  tier2: 800,
  tier3: 1500,
};

/**
 * Pure: dato hover elapsed ms, ritorna il tier max visibile.
 * @param {number} elapsedMs
 * @returns {0|1|2|3} tier corrente (0 = nothing, 3 = full)
 */
export function tooltipTierForElapsed(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < TOOLTIP_TIER_DELAYS.tier1) return 0;
  if (elapsedMs < TOOLTIP_TIER_DELAYS.tier2) return 1;
  if (elapsedMs < TOOLTIP_TIER_DELAYS.tier3) return 2;
  return 3;
}

/**
 * Pure: build tooltip data per tier corrente (consumato da DOM layer).
 * @param {object} unit
 * @param {number} tier  0-3
 * @returns {{tier:number, name?:string, icon?:string, stats?:object, lore?:string}}
 */
export function buildTooltipData(unit, tier) {
  if (!unit || tier <= 0) return { tier: 0 };
  const out = { tier };
  if (tier >= 1) {
    out.name = unit.label || unit.id || '?';
    out.icon = unit.icon || '◆';
  }
  if (tier >= 2) {
    out.stats = {
      hp: unit.hp ?? null,
      hp_max: unit.hp_max ?? null,
      ap: unit.ap ?? null,
      attack: unit.attack ?? null,
      defense: unit.defense ?? null,
    };
  }
  if (tier >= 3) {
    out.lore = unit.flavor || unit.lore || unit.species_label_it || '';
  }
  return out;
}

// =============================================================================
// Frostpunk chromatic tension gauge (linked a Gris pressure tier palette).
// Pressure 0..100 → cool blue (#3a4a8c) → warm red (#a83232) gradient.
// Vignette alpha 0.0 (calm) → 0.4 (apex).
// =============================================================================

/**
 * Pure: interpolate 2 hex colors via linear blend.
 * @param {string} hexA  "#rrggbb"
 * @param {string} hexB
 * @param {number} t  0..1
 * @returns {string} blended hex
 */
function lerpHex(hexA, hexB, t) {
  const clamp = Math.max(0, Math.min(1, t));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * clamp);
  const g = Math.round(a.g + (b.g - a.g) * clamp);
  const bl = Math.round(a.b + (b.b - a.b) * clamp);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const TENSION_COLOR_COLD = '#3a4a8c';
const TENSION_COLOR_WARM = '#a83232';

/**
 * Pure: pressure (0..100) → gradient color.
 * @param {number} pressure
 * @returns {string} hex color
 */
export function tensionGaugeColor(pressure) {
  const p = Math.max(0, Math.min(100, Number(pressure) || 0));
  return lerpHex(TENSION_COLOR_COLD, TENSION_COLOR_WARM, p / 100);
}

/**
 * Pure: pressure (0..100) → vignette alpha (0.0..0.4).
 * Soglie: 0-30 calm (alpha 0.0..0.05), 30-60 alert (..0.15),
 *         60-85 critical (..0.28), 85-100 apex (..0.4).
 * @param {number} pressure
 * @returns {number} alpha 0..0.4
 */
export function tensionVignetteAlpha(pressure) {
  const p = Math.max(0, Math.min(100, Number(pressure) || 0));
  // Smooth curve quadratic per ambient feel (no jump).
  const t = p / 100;
  return Math.round(t * t * 0.4 * 1000) / 1000;
}

/**
 * Render-side: draw vignette overlay + gauge bar on canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {number} pressure  0..100
 */
export function drawTensionGauge(ctx, canvasW, canvasH, pressure) {
  const alpha = tensionVignetteAlpha(pressure);
  if (alpha <= 0.001) return;
  const color = tensionGaugeColor(pressure);
  ctx.save();
  // Radial vignette (corners darker → centro pulito).
  const gradient = ctx.createRadialGradient(
    canvasW / 2,
    canvasH / 2,
    Math.min(canvasW, canvasH) * 0.3,
    canvasW / 2,
    canvasH / 2,
    Math.max(canvasW, canvasH) * 0.7,
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  const rgb = hexToRgb(color);
  gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
}

// =============================================================================
// Phoenix Point free-aim body-part overlay.
// 3 zone: head 25% top, torso 50% mid, legs 25% bottom.
// Hit % deterministic da unit baseline + streak bonus opzionale.
// =============================================================================

/**
 * Pure: compute hit % distribution per zona body-part.
 * Default: head 30% (high-risk high-reward), torso 55% (default), legs 15%.
 * Streak bonus (Sprint α pseudoRng) modifica head bias di +5pp per streak ≥2.
 * @param {object} [opts]
 * @param {number} [opts.streak=0]  - consecutive hits/misses streak (Sprint α)
 * @param {number} [opts.attackRating=50]  - 0..100 attack rating (info)
 * @returns {{head:number, torso:number, legs:number}}
 */
export function bodyPartHitPercent(opts = {}) {
  const streak = Number(opts.streak) || 0;
  let head = 30;
  let torso = 55;
  let legs = 15;
  if (streak >= 2) {
    head += 5;
    torso -= 3;
    legs -= 2;
  }
  if (streak >= 4) {
    head += 5;
    torso -= 3;
    legs -= 2;
  }
  // Clamp + round + normalize sum to 100
  head = Math.max(0, Math.min(100, head));
  torso = Math.max(0, Math.min(100, torso));
  legs = Math.max(0, Math.min(100, legs));
  const sum = head + torso + legs;
  if (sum !== 100 && sum > 0) {
    const scale = 100 / sum;
    head = Math.round(head * scale);
    torso = Math.round(torso * scale);
    legs = 100 - head - torso;
  }
  return { head, torso, legs };
}

/**
 * Pure: bounding boxes 3 zone in normalized 0..1 vertical fractions.
 * Used by render layer to draw colored overlay sopra enemy unit cell.
 * @returns {{head:[number,number], torso:[number,number], legs:[number,number]}}
 */
export function bodyPartZones() {
  return {
    head: [0.0, 0.25],
    torso: [0.25, 0.75],
    legs: [0.75, 1.0],
  };
}

/**
 * Render-side: draw body-part overlay sopra enemy cell.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellX  game x
 * @param {number} cellYpx pixel y (top-left corner of cell)
 * @param {object} percentages  output da bodyPartHitPercent
 */
export function drawBodyPartOverlay(ctx, cellX, cellYpx, percentages) {
  if (!ctx || !percentages) return;
  const cell = CELL;
  const zones = bodyPartZones();
  const px = cellX * cell;
  const py = cellYpx;
  const colors = {
    head: 'rgba(255,80,80,0.45)',
    torso: 'rgba(255,200,80,0.4)',
    legs: 'rgba(120,200,255,0.4)',
  };
  ctx.save();
  for (const k of ['head', 'torso', 'legs']) {
    const [t0, t1] = zones[k];
    const zy = py + t0 * cell;
    const zh = (t1 - t0) * cell;
    ctx.fillStyle = colors[k];
    ctx.fillRect(px, zy, cell, zh);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, zy + 0.5, cell - 1, zh - 1);
    // Percentage label
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, Math.round(cell * 0.16))}px "SF Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentages[k]}%`, px + cell / 2, zy + zh / 2);
  }
  ctx.restore();
}

// =============================================================================
// Skiv Goal 2 (2026-04-28) — Echolocation visual fog-of-war pulse.
//
// Anti-pattern killed: Engine LIVE Surface DEAD. Trait `sensori_geomagnetici`
// + `default_parts.senses: [echolocation]` were silent on the player surface.
// This module exposes a self-animating pulse helper that the cell-hover
// pipeline can fire when the player hovers a target ≥500ms.
//
// Pure additive: no existing function is modified. Animations live in a
// process-local registry (`_echoPulses`) consumed by `drawEcholocationPulse`
// each frame. The render loop already calls `needsAnimFrame()` — we add a
// `hasActiveEchoPulse()` probe that callers may OR with that signal.
// =============================================================================

const ECHO_PULSE_DURATION_MS = 800;
const ECHO_PULSE_R_START = 40;
const ECHO_PULSE_R_END = 120;
const ECHO_PULSE_HOVER_THRESHOLD_MS = 500;
const ECHO_PULSE_COLOR = '#66d1fb';

const _echoPulses = []; // [{ targetId, x, y, startedAt }]
const _echoLastHover = new Map(); // actorId|targetId → timestamp first hover

/**
 * Hover threshold (ms) before pulse arms.
 */
export function getEcholocationHoverThresholdMs() {
  return ECHO_PULSE_HOVER_THRESHOLD_MS;
}

/**
 * Returns true if at least one echolocation pulse animation is active.
 * Callers should OR this with `needsAnimFrame()` to keep redraws ticking.
 */
export function hasActiveEchoPulse() {
  if (_echoPulses.length === 0) return false;
  const now = Date.now();
  for (const p of _echoPulses) {
    if (now - p.startedAt < ECHO_PULSE_DURATION_MS) return true;
  }
  return false;
}

/**
 * Trigger a pulse over `target`. Idempotent within the active window:
 * re-arming for the same target while a pulse is mid-flight is a no-op.
 *
 * @param {object} target — needs `id` + `position.{x,y}` (or `.x`,`.y`).
 */
export function armEcholocationPulse(target) {
  if (!target) return false;
  const id = target.id || `${target.x},${target.y}`;
  const x = Number(target.position ? target.position.x : target.x);
  const y = Number(target.position ? target.position.y : target.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const now = Date.now();
  // Drop expired entries, also dedupe live pulses for same target.
  for (let i = _echoPulses.length - 1; i >= 0; i -= 1) {
    const p = _echoPulses[i];
    if (now - p.startedAt >= ECHO_PULSE_DURATION_MS) {
      _echoPulses.splice(i, 1);
    } else if (p.targetId === id) {
      return false; // already pulsing
    }
  }
  _echoPulses.push({ targetId: id, x, y, startedAt: now });
  return true;
}

/**
 * Hover-debounce gate. Returns true on the call where `(actorId,targetId)`
 * has been continuously hovered ≥ threshold ms — the caller should then
 * fire `armEcholocationPulse(target)` (idempotent).
 *
 * @param {string} actorId — the echolocator id (player-controlled).
 * @param {string} targetId — the hovered enemy id.
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export function shouldArmPulseForHover(actorId, targetId, now) {
  if (!actorId || !targetId) return false;
  const t = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const key = `${actorId}|${targetId}`;
  const first = _echoLastHover.get(key);
  if (!first) {
    _echoLastHover.set(key, t);
    return false;
  }
  return t - first >= ECHO_PULSE_HOVER_THRESHOLD_MS;
}

/**
 * Reset hover tracker (called when hover leaves any target).
 */
export function resetEcholocationHover(actorId, targetId) {
  if (!actorId || !targetId) {
    _echoLastHover.clear();
    return;
  }
  _echoLastHover.delete(`${actorId}|${targetId}`);
}

/**
 * Clear all pulses + hover state. Test-only escape hatch.
 */
export function _resetEcholocationStateForTests() {
  _echoPulses.length = 0;
  _echoLastHover.clear();
}

/**
 * Self-attaching installer — wires `mousemove` on `canvas` to debounce hover,
 * arm pulse via `armEcholocationPulse`, and overlay `drawEcholocationPulse`
 * on top of the existing render(). This is the seam that closes the
 * Engine LIVE Surface DEAD anti-pattern for echolocation without modifying
 * any existing render.js function.
 *
 * Caller injects accessors so the installer stays decoupled from main.js
 * state shape. Idempotent: calling twice is a no-op (returns the same
 * teardown handle).
 *
 * @param {HTMLCanvasElement|null} canvas
 * @param {object} accessors
 * @param {() => object|null} accessors.getWorld — returns `state.world`.
 * @param {() => string|null} accessors.getSelectedActorId — currently
 *   selected (player-controlled) actor id. Pulse only arms if this actor
 *   has echolocation sense + the hovered unit is an enemy in range.
 * @returns {{ teardown: () => void } | null}
 */
export function installEcholocationOverlay(canvas, accessors) {
  if (!canvas || !accessors || typeof accessors.getWorld !== 'function') return null;
  if (canvas.__echolocationInstalled) return canvas.__echolocationInstalled;

  const onMove = (ev) => {
    const world = accessors.getWorld();
    if (!world || !world.grid) return;
    const { x, y } = canvasToCell(canvas, ev, world.grid.height);
    const units = Array.isArray(world.units) ? world.units : [];
    const target = units.find((u) => {
      if (!u || !u.position) return false;
      return Number(u.position.x) === x && Number(u.position.y) === y;
    });
    if (!target) {
      resetEcholocationHover();
      return;
    }
    const actorId =
      typeof accessors.getSelectedActorId === 'function' ? accessors.getSelectedActorId() : null;
    if (!actorId) return;
    const actor = units.find((u) => u && u.id === actorId);
    if (!actor) return;
    // Visibility map (from sessionHelpers tile_visibility) gates eligibility.
    const tv = world.tile_visibility || {};
    const entry = tv[actor.id];
    if (!entry || !entry.has_echolocation) return;
    // Ignore self-hover.
    if (target.id === actor.id) return;
    if (shouldArmPulseForHover(actor.id, target.id, Date.now())) {
      armEcholocationPulse(target);
    }
  };

  const onLeave = () => resetEcholocationHover();

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);

  // Overlay tick — runs at 60Hz while pulses are live, drawing on top of
  // the canvas without touching `render()`. Self-stops when no pulses.
  let rafHandle = null;
  const tick = () => {
    if (!hasActiveEchoPulse()) {
      rafHandle = null;
      return;
    }
    const ctx = canvas.getContext && canvas.getContext('2d');
    const world = accessors.getWorld();
    const gridH = world && world.grid ? world.grid.height : null;
    if (ctx) drawEcholocationPulse(ctx, { gridH });
    rafHandle = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(tick) : null;
  };

  // Light poll — when armEcholocationPulse pushes, animation kicks in.
  const armTimer = setInterval(() => {
    if (hasActiveEchoPulse() && rafHandle == null) {
      rafHandle = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(tick) : null;
    }
  }, 100);

  const handle = {
    teardown: () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      if (rafHandle != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafHandle);
      }
      clearInterval(armTimer);
      delete canvas.__echolocationInstalled;
    },
  };
  canvas.__echolocationInstalled = handle;
  return handle;
}

/**
 * Draw all active pulses onto `ctx`. Pure draw — caller invokes on each
 * `render()` after units/popups (top of canvas). Pulse is centered on the
 * target tile screen-space and animates from `R_START → R_END` over 800ms.
 *
 * Fog-of-war reveal layer: `revealedTiles` (array of `{x,y}` from
 * `getRevealedTiles` in the backend) are tinted cyan with a `?` glyph
 * pre-pulse, fading to transparent post-pulse. Tiles only render while
 * any pulse is live for the same target.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} [opts]
 * @param {number} [opts.gridH] — required for y-flip (canvas grid origin).
 * @param {Array<{x:number,y:number,targetId?:string}>} [opts.revealedTiles]
 */
export function drawEcholocationPulse(ctx, opts = {}) {
  if (!ctx || _echoPulses.length === 0) return;
  const now = Date.now();
  const gridH = Number.isFinite(Number(opts.gridH)) ? Number(opts.gridH) : null;
  const revealedTiles = Array.isArray(opts.revealedTiles) ? opts.revealedTiles : [];

  ctx.save();
  for (let i = _echoPulses.length - 1; i >= 0; i -= 1) {
    const pulse = _echoPulses[i];
    const elapsed = now - pulse.startedAt;
    if (elapsed >= ECHO_PULSE_DURATION_MS) {
      _echoPulses.splice(i, 1);
      continue;
    }
    const t = elapsed / ECHO_PULSE_DURATION_MS; // 0..1
    const radius = ECHO_PULSE_R_START + (ECHO_PULSE_R_END - ECHO_PULSE_R_START) * t;
    const alpha = 0.8 * (1 - t);
    // Target screen-space center. Y flipped if gridH provided.
    const yPx = gridH != null ? (gridH - 1 - pulse.y) * CELL : pulse.y * CELL;
    const cx = pulse.x * CELL + CELL / 2;
    const cy = yPx + CELL / 2;
    ctx.strokeStyle = ECHO_PULSE_COLOR;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Reveal layer: tiles tagged for THIS target (or untagged = first pulse).
    const matched = revealedTiles.filter((rt) => !rt.targetId || rt.targetId === pulse.targetId);
    if (matched.length > 0) {
      const fadeIn = Math.min(1, t * 2); // glyph appears in first 50%, fades after
      const glyphAlpha = t < 0.5 ? fadeIn : 1 - (t - 0.5) * 2;
      ctx.globalAlpha = Math.max(0, glyphAlpha) * 0.7;
      ctx.fillStyle = ECHO_PULSE_COLOR;
      const fontSize = Math.max(10, Math.round(CELL * 0.42));
      ctx.font = `bold ${fontSize}px "SF Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const rt of matched) {
        const ry = gridH != null ? (gridH - 1 - rt.y) * CELL : rt.y * CELL;
        const rcx = rt.x * CELL + CELL / 2;
        const rcy = ry + CELL / 2;
        // Tint background.
        ctx.globalAlpha = Math.max(0, glyphAlpha) * 0.18;
        ctx.fillStyle = ECHO_PULSE_COLOR;
        ctx.fillRect(rt.x * CELL, ry, CELL, CELL);
        // Glyph "?" pre-pulse → fades post.
        ctx.globalAlpha = Math.max(0, glyphAlpha) * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('?', rcx, rcy);
      }
    }
  }
  ctx.restore();
}
