// Canvas 2D rendering — grid + units + animations + status icons.

import { getInterpolatedPos, drawPopups, drawRays, getFlashAlpha, hasActiveAnims } from './anim.js';
import { getSpeciesDisplayIt } from './speciesNames.js';

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
    // 10-foot rule: dynamic min 12px, scale with CELL (Microsoft TV guidelines).
    ctx.font = `bold ${Math.max(12, Math.round(CELL * 0.16))}px "SF Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ic.glyph, ix + size / 2, iy + size / 2 + 1);
  }
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
    // Fill color coded
    ctx.fillStyle = ratio < 0.3 ? COLORS.hpCrit : ratio < 0.6 ? COLORS.hpWarn : COLORS.hpFull;
    ctx.fillRect(barX, barY, barW * ratio, 5);
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
function drawThreatTileOverlay(ctx, threatPreview, gridH) {
  const t = (Date.now() % 1000) / 1000; // 0..1 ciclico
  const pulse = 0.35 + Math.sin(t * Math.PI * 2) * 0.1; // 0.25..0.45
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
  // HOTFIX 2026-04-19: resolveTileImg() era definita in PR #1602 (USE_NEW_ART flag)
  // ma rimossa inavvertitamente da Wave 8O (#1626) canvas refactor. ReferenceError
  // in render() interrompeva redraw → units sidebar vuota + canvas non disegnato.
  // Fallback a null disabilita tile art (opt-in feature), drawCell già gestisce
  // tileImg falsy con checkered grid fallback (vedi drawCell line 189).
  const tileImg = null;
  // Checkered grid (o tile PNG se flag ON + asset loaded)
  for (let gy = 0; gy < h; gy += 1) {
    for (let gx = 0; gx < w; gx += 1) {
      const yPx = h - 1 - gy;
      const fill = (gx + gy) % 2 === 0 ? COLORS.grid : COLORS.gridAlt;
      drawCell(ctx, gx, yPx, fill, tileImg);
    }
  }

  // W3.1 — Range overlay BEFORE units (so unit rings/icons overlap on top).
  if (highlight.selected) drawRangeOverlay(ctx, state, h, highlight.selected);

  // 2026-04-26 ITB telegraph — threat tile overlay rosso/giallo per SIS pending intents.
  // Disegnato DOPO range overlay (player vede sue mosse possibili) e PRIMA delle unità.
  if (Array.isArray(highlight.threatPreview) && highlight.threatPreview.length > 0) {
    drawThreatTileOverlay(ctx, highlight.threatPreview, h);
  }

  // Units
  for (const u of state.units || []) drawUnit(ctx, u, h, highlight);

  // W2.3 — Attack rays (sopra unità, sotto popups)
  drawRays(ctx, CELL, h);

  // Damage popups on top
  drawPopups(ctx, CELL, h);
}

export function needsAnimFrame() {
  return hasActiveAnims();
}

export const CELL_SIZE = CELL;
