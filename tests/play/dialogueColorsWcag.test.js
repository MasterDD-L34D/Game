// TKT-P4-DIALOGUE-COLORS — frontend WCAG AA gate (mirror tests/services/mbtiPalette.test.js).
//
// The debrief personality voices (ennea + inner) render their MBTI color via the
// .mbti-axis-X CSS classes in dialogueRender.css. Those classes MUST stay WCAG
// AA (>=4.5:1) against the light voice-card background, and MUST stay in sync
// with the canonical palette (data/core/personality/mbti_axis_palette.yaml,
// proven WCAG-on-white by the backend test) to avoid drift.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  loadMbtiPalette,
  wcagContrastRatio,
  _resetPaletteCache,
} = require('../../apps/backend/services/mbtiPalette');

const CSS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'apps', 'play', 'src', 'dialogueRender.css'),
  'utf8',
);

const LETTERS = ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'];

// Voice cards render on a light background (#ffffff) — the palette is built
// WCAG-AA dark-on-light (see mbti_axis_palette.yaml header). debriefPanel.css
// gives .db-ennea-voice / .db-inner-voice a white card to honor this.
const CARD_BG = '#ffffff';

function cssColor(letter) {
  const re = new RegExp(`\\.mbti-axis-${letter}\\s*\\{[^}]*color:\\s*(#[0-9a-fA-F]{6})`, 'i');
  const m = CSS.match(re);
  return m ? m[1].toLowerCase() : null;
}

test('dialogueRender.css defines all 8 axis color classes', () => {
  for (const letter of LETTERS) {
    assert.ok(cssColor(letter), `.mbti-axis-${letter} color missing`);
  }
});

test('every axis color is WCAG AA (>=4.5:1) on the light voice card', () => {
  for (const letter of LETTERS) {
    const color = cssColor(letter);
    const ratio = wcagContrastRatio(color, CARD_BG);
    assert.ok(
      ratio >= 4.5,
      `${letter} (${color}) contrast ${ratio.toFixed(2)} < AA 4.5 on ${CARD_BG}`,
    );
  }
});

test('CSS axis colors stay in sync with canonical mbti_axis_palette.yaml (no drift)', () => {
  _resetPaletteCache();
  const palette = loadMbtiPalette();
  for (const letter of LETTERS) {
    assert.equal(
      cssColor(letter),
      palette[letter].color.toLowerCase(),
      `${letter} CSS color drifted from canonical palette`,
    );
  }
  _resetPaletteCache();
});
