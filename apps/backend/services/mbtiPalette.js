// OD-013 Path B — MBTI dialogue color codes (diegetic).
//
// Palette loader + tag helpers. ADDITIVE only: nessuna rottura della
// pipeline narrative esistente. Le linee di dialogo possono opzionalmente
// includere segmenti tipo `<mbti axis="E">testo</mbti>` per essere
// colorate al render frontend (gated da Path A reveal).
//
// Sorgente palette: `data/core/personality/mbti_axis_palette.yaml` (8 lettere
// E/I/S/N/T/F/J/P → hex color + label IT + axis pair).
//
// Il loader è memoized + try/catch non-blocking: malformed YAML → palette
// vuota, no crash. Front-end deve degradare a plain text se palette
// missing (axis non trovata).
//
// WCAG AA: 4.5:1 contrast vs sfondo. Riferimento sfondo: bianco #ffffff
// (testo dark-on-light) — palette costruita per garantirlo. La utility
// `wcagContrastRatio(fg, bg)` permette test deterministici.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PALETTE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'personality',
  'mbti_axis_palette.yaml',
);

const VALID_LETTERS = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

let _cachedPalette = null;
let _cachedPath = null;

/**
 * Carica e memoizza il palette MBTI. Su errore → ritorna palette vuoto
 * `{}` e logga warn (non blocking). La cache è invalidata cambiando path.
 *
 * @param {string} [yamlPath] override path (testing).
 * @param {{ warn?: Function }} [logger] logger override.
 * @returns {Object<string, {color: string, label: string, axis: string}>}
 */
function loadMbtiPalette(yamlPath = DEFAULT_PALETTE_PATH, logger = console) {
  if (_cachedPalette && _cachedPath === yamlPath) return _cachedPalette;
  let palette = {};
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.palette &&
      typeof parsed.palette === 'object'
    ) {
      for (const letter of VALID_LETTERS) {
        const entry = parsed.palette[letter];
        if (!entry || typeof entry !== 'object') continue;
        if (typeof entry.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(entry.color)) continue;
        palette[letter] = {
          color: entry.color.toLowerCase(),
          label: typeof entry.label === 'string' ? entry.label : letter,
          axis: typeof entry.axis === 'string' ? entry.axis : null,
        };
      }
    }
  } catch (err) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[mbtiPalette] load fallito (${yamlPath}): ${err.message}`);
    }
    palette = {};
  }
  _cachedPalette = palette;
  _cachedPath = yamlPath;
  return palette;
}

/** Reset cache (per test). */
function _resetPaletteCache() {
  _cachedPalette = null;
  _cachedPath = null;
}

/**
 * Lookup colore per lettera MBTI. Unknown → null.
 *
 * @param {string} letter — una di E/I/S/N/T/F/J/P.
 * @param {object} [opts]
 * @param {string} [opts.yamlPath]
 * @returns {string | null} hex color (#rrggbb) o null.
 */
function colorForAxis(letter, opts = {}) {
  if (typeof letter !== 'string' || !VALID_LETTERS.has(letter)) return null;
  const palette = loadMbtiPalette(opts.yamlPath);
  const entry = palette[letter];
  return entry ? entry.color : null;
}

/**
 * Wrappa testo in un tag inline `<mbti axis="X">...</mbti>` per ogni
 * lettera fornita. Se più lettere, produce nesting deterministico
 * outer→inner nell'ordine di axisLetters.
 *
 * Esempi:
 *   mbtiTaggedLine('Sento freddo', ['F']) → '<mbti axis="F">Sento freddo</mbti>'
 *   mbtiTaggedLine('Logico ma triste', []) → 'Logico ma triste' (plain)
 *   mbtiTaggedLine('', ['T']) → '' (empty preserved)
 *
 * Lettere unknown silently dropped (non-blocking). Testo vuoto → plain.
 *
 * @param {string} text
 * @param {string[]} axisLetters
 * @returns {string}
 */
function mbtiTaggedLine(text, axisLetters) {
  if (typeof text !== 'string') return '';
  if (!Array.isArray(axisLetters) || axisLetters.length === 0) return text;
  const valid = axisLetters.filter((l) => typeof l === 'string' && VALID_LETTERS.has(l));
  if (valid.length === 0) return text;
  if (text.length === 0) return '';
  let out = text;
  // outer→inner: prima lettera = outer wrap. Ricostruisco da inner a outer.
  for (let i = valid.length - 1; i >= 0; i -= 1) {
    out = `<mbti axis="${valid[i]}">${out}</mbti>`;
  }
  return out;
}

/**
 * Calcola WCAG 2.x contrast ratio fra due colori hex `#rrggbb`.
 * Ritorna numero ≥1; range tipico 1..21. WCAG AA normal text → ≥4.5.
 *
 * @param {string} fg hex `#rrggbb`
 * @param {string} bg hex `#rrggbb`
 * @returns {number}
 */
function wcagContrastRatio(fg, bg) {
  const lFg = relativeLuminance(fg);
  const lBg = relativeLuminance(bg);
  if (lFg === null || lBg === null) return 1;
  const [light, dark] = lFg > lBg ? [lFg, lBg] : [lBg, lFg];
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

module.exports = {
  loadMbtiPalette,
  colorForAxis,
  mbtiTaggedLine,
  wcagContrastRatio,
  _resetPaletteCache,
  VALID_LETTERS: Array.from(VALID_LETTERS),
  DEFAULT_PALETTE_PATH,
};
