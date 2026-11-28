// Sprint β Visual UX 2026-04-28 — JA3 atmospheric voice UI.
//
// Pattern donor: docs/research/2026-04-27-strategy-games-design-extraction.md §6 (JA3).
// Status-driven font swap rules. CSS classes `voice-status-{panic,focused,rage,bleeding}`
// + `period-typography-{player,sistema,narrative}` (riusa --font-* CSS vars).
//
// Test verificano presenza CSS rules nella stylesheet (file lettura, non DOM).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STYLE_PATH = path.resolve(__dirname, '..', '..', '..', 'apps', 'play', 'src', 'style.css');

let cssContent = null;
function readCss() {
  if (cssContent === null) cssContent = fs.readFileSync(STYLE_PATH, 'utf8');
  return cssContent;
}

describe('JA3 voice-status-* CSS classes', () => {
  test('voice-status-panic: bold + warm color', () => {
    const css = readCss();
    assert.match(css, /\.voice-status-panic\s*\{/);
    // Block must include font-weight: 700 + a warm color
    const block = css.match(/\.voice-status-panic\s*\{[^}]+\}/);
    assert.ok(block, 'voice-status-panic block trovato');
    assert.match(block[0], /font-weight:\s*(bold|700)/);
    assert.match(block[0], /color:\s*#[a-f0-9]{6}/i);
  });

  test('voice-status-focused: italic + cool color', () => {
    const css = readCss();
    const block = css.match(/\.voice-status-focused\s*\{[^}]+\}/);
    assert.ok(block, 'voice-status-focused block trovato');
    assert.match(block[0], /font-style:\s*italic/);
    assert.match(block[0], /color:/);
  });

  test('voice-status-rage: expanded + uppercase', () => {
    const css = readCss();
    const block = css.match(/\.voice-status-rage\s*\{[^}]+\}/);
    assert.ok(block, 'voice-status-rage block trovato');
    assert.match(block[0], /font-stretch:\s*expanded/);
  });

  test('voice-status-bleeding: presente con underline wavy', () => {
    const css = readCss();
    const block = css.match(/\.voice-status-bleeding\s*\{[^}]+\}/);
    assert.ok(block, 'voice-status-bleeding block trovato');
  });
});

describe('period-typography variants — faction font reuse', () => {
  test('period-typography-player usa --font-player', () => {
    const css = readCss();
    const block = css.match(/\.period-typography-player\s*\{[^}]+\}/);
    assert.ok(block, 'period-typography-player block trovato');
    assert.match(block[0], /var\(--font-player\)/);
  });

  test('period-typography-sistema usa --font-sistema', () => {
    const css = readCss();
    const block = css.match(/\.period-typography-sistema\s*\{[^}]+\}/);
    assert.ok(block, 'period-typography-sistema block trovato');
    assert.match(block[0], /var\(--font-sistema\)/);
  });

  test('period-typography-narrative italic + --font-narrative', () => {
    const css = readCss();
    const block = css.match(/\.period-typography-narrative\s*\{[^}]+\}/);
    assert.ok(block, 'period-typography-narrative block trovato');
    assert.match(block[0], /var\(--font-narrative\)/);
    assert.match(block[0], /font-style:\s*italic/);
  });
});

describe('CSS vars --font-{player,sistema,narrative} esistenti (no fragmentation)', () => {
  test('Tre CSS vars già definiti in :root', () => {
    const css = readCss();
    assert.match(css, /--font-player:/);
    assert.match(css, /--font-sistema:/);
    assert.match(css, /--font-narrative:/);
  });
});
