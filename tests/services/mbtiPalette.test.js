// OD-013 Path B — MBTI dialogue color codes test suite.
//
// Scope:
//   - loadMbtiPalette: 8 lettere caricate, malformed → empty graceful
//   - colorForAxis: lookup + unknown → null
//   - mbtiTaggedLine: wrap singolo / nested / empty / unknown letter
//   - WCAG AA: tutti gli 8 colori ≥4.5:1 vs #ffffff
//   - renderMbtiTaggedHtml: revealed → span wrap, hidden → plain
//   - Edge: tag non bilanciati → graceful escape
//
// Cross-import frontend helper (Node-friendly: dialogueRender.js è
// CommonJS-compatible).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadMbtiPalette,
  colorForAxis,
  mbtiTaggedLine,
  wcagContrastRatio,
  _resetPaletteCache,
  VALID_LETTERS,
} = require('../../apps/backend/services/mbtiPalette');

// dialogueRender è ESM (apps/play type: module). Carica via dynamic import
// dentro un setup wrapper sincronizzato. node:test supporta async test ma
// vogliamo top-level deterministico → usiamo `await import` lazy nei test.
let _dialogueRender = null;
async function dialogueRender() {
  if (!_dialogueRender) {
    _dialogueRender = await import('../../apps/play/src/dialogueRender.js');
  }
  return _dialogueRender;
}

test('loadMbtiPalette: returns 8 axes from YAML', () => {
  _resetPaletteCache();
  const palette = loadMbtiPalette();
  const keys = Object.keys(palette).sort();
  assert.deepEqual(keys, ['E', 'F', 'I', 'J', 'N', 'P', 'S', 'T']);
  for (const letter of keys) {
    const entry = palette[letter];
    assert.match(entry.color, /^#[0-9a-f]{6}$/, `${letter} hex valid`);
    assert.equal(typeof entry.label, 'string');
    assert.match(entry.axis, /^[EISTNFJP]_[EISTNFJP]$/, `${letter} axis pair valid`);
  }
});

test('colorForAxis: letter lookup returns hex', () => {
  _resetPaletteCache();
  assert.equal(colorForAxis('E'), '#b45309');
  assert.equal(colorForAxis('F'), '#be185d');
  assert.equal(colorForAxis('T'), '#0e7490');
});

test('colorForAxis: unknown letter → null', () => {
  _resetPaletteCache();
  assert.equal(colorForAxis('Z'), null);
  assert.equal(colorForAxis(''), null);
  assert.equal(colorForAxis(null), null);
  assert.equal(colorForAxis(undefined), null);
  assert.equal(colorForAxis(123), null);
});

test('mbtiTaggedLine: wraps with single axis letter', () => {
  const out = mbtiTaggedLine('Sento qualcosa', ['F']);
  assert.equal(out, '<mbti axis="F">Sento qualcosa</mbti>');
});

test('mbtiTaggedLine: nested wrap for multiple axes', () => {
  const out = mbtiTaggedLine('logico ma triste', ['T', 'F']);
  assert.equal(out, '<mbti axis="T"><mbti axis="F">logico ma triste</mbti></mbti>');
});

test('mbtiTaggedLine: empty axisLetters → plain text passthrough', () => {
  assert.equal(mbtiTaggedLine('plain', []), 'plain');
  assert.equal(mbtiTaggedLine('plain', null), 'plain');
});

test('mbtiTaggedLine: unknown letters silently dropped', () => {
  assert.equal(mbtiTaggedLine('test', ['Z', 'Q']), 'test');
  assert.equal(mbtiTaggedLine('test', ['Z', 'F']), '<mbti axis="F">test</mbti>');
});

test('mbtiTaggedLine: empty text preserved', () => {
  assert.equal(mbtiTaggedLine('', ['F']), '');
});

test('WCAG AA: all 8 palette colors ≥4.5:1 vs #ffffff', () => {
  _resetPaletteCache();
  const palette = loadMbtiPalette();
  for (const letter of Object.keys(palette)) {
    const ratio = wcagContrastRatio(palette[letter].color, '#ffffff');
    assert.ok(
      ratio >= 4.5,
      `${letter} (${palette[letter].color}) contrast ${ratio.toFixed(2)} < AA 4.5`,
    );
  }
});

test('wcagContrastRatio: known pairs', () => {
  // Black on white = 21:1 max
  assert.ok(wcagContrastRatio('#000000', '#ffffff') > 20);
  // Same color = 1:1
  assert.equal(wcagContrastRatio('#888888', '#888888'), 1);
  // Invalid input → 1
  assert.equal(wcagContrastRatio('not-a-color', '#fff'), 1);
});

test('loadMbtiPalette: malformed YAML → empty graceful, no crash', () => {
  _resetPaletteCache();
  const tmp = path.join(os.tmpdir(), `mbti-bad-${Date.now()}.yaml`);
  fs.writeFileSync(tmp, '::: not yaml :::\n  bad indent\n: foo', 'utf8');
  const captured = [];
  const palette = loadMbtiPalette(tmp, { warn: (m) => captured.push(m) });
  assert.deepEqual(palette, {});
  // warn può essere assente se la parse interna non lancia eccezione (yaml lib forgiving),
  // accettiamo entrambi i casi: vuoto è il contratto.
  fs.unlinkSync(tmp);
  _resetPaletteCache();
});

test('loadMbtiPalette: missing file → empty, warn called', () => {
  _resetPaletteCache();
  const captured = [];
  const palette = loadMbtiPalette('/nonexistent/path/palette.yaml', {
    warn: (m) => captured.push(m),
  });
  assert.deepEqual(palette, {});
  assert.equal(captured.length, 1);
  assert.match(captured[0], /load fallito/);
  _resetPaletteCache();
});

test('renderMbtiTaggedHtml: revealed axis → span wrap', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const mbtiRevealed = {
    revealed: [{ axis: 'T_F', letter: 'F', value: 0.8, confidence: 0.85 }],
    hidden: [],
  };
  const html = renderMbtiTaggedHtml('<mbti axis="F">caldo</mbti>', mbtiRevealed);
  assert.equal(html, '<span class="mbti-axis-F" data-mbti-axis="F">caldo</span>');
});

test('renderMbtiTaggedHtml: hidden axis → plain text (no leak)', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const mbtiRevealed = { revealed: [], hidden: [{ axis: 'T_F' }] };
  const html = renderMbtiTaggedHtml('<mbti axis="F">caldo</mbti>', mbtiRevealed);
  assert.equal(html, 'caldo');
});

test('renderMbtiTaggedHtml: null mbtiRevealed → all hidden (plain)', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const html = renderMbtiTaggedHtml('<mbti axis="T">logica</mbti>', null);
  assert.equal(html, 'logica');
});

test('renderMbtiTaggedHtml: mixed revealed + hidden segments', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const mbtiRevealed = {
    revealed: [{ axis: 'T_F', letter: 'F' }],
    hidden: [{ axis: 'E_I' }],
  };
  const text = '<mbti axis="F">caldo</mbti> e <mbti axis="E">socievole</mbti>';
  const html = renderMbtiTaggedHtml(text, mbtiRevealed);
  assert.equal(html, '<span class="mbti-axis-F" data-mbti-axis="F">caldo</span> e socievole');
});

test('renderMbtiTaggedHtml: unbalanced tags → graceful escape', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const mbtiRevealed = { revealed: [{ axis: 'T_F', letter: 'F' }] };
  const html = renderMbtiTaggedHtml('<mbti axis="F">unclosed', mbtiRevealed);
  assert.match(html, /&lt;mbti axis=&quot;F&quot;&gt;unclosed/);
});

test('renderMbtiTaggedHtml: plain text without tags passthrough (escaped)', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const html = renderMbtiTaggedHtml('Just plain text with <html>', null);
  assert.equal(html, 'Just plain text with &lt;html&gt;');
});

test('renderMbtiTaggedHtml: empty text → empty', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  assert.equal(renderMbtiTaggedHtml('', null), '');
  assert.equal(renderMbtiTaggedHtml(null, null), '');
});

test('renderMbtiTaggedHtml: HTML escape inside tag content', async () => {
  const { renderMbtiTaggedHtml } = await dialogueRender();
  const mbtiRevealed = { revealed: [{ axis: 'T_F', letter: 'T' }] };
  const html = renderMbtiTaggedHtml('<mbti axis="T">a<b&c</mbti>', mbtiRevealed);
  assert.equal(html, '<span class="mbti-axis-T" data-mbti-axis="T">a&lt;b&amp;c</span>');
});

test('isAxisRevealed: lookup by letter via LETTER_TO_AXIS', async () => {
  const { isAxisRevealed } = await dialogueRender();
  const mbtiRevealed = { revealed: [{ axis: 'T_F', letter: 'F' }] };
  assert.equal(isAxisRevealed('F', mbtiRevealed), true);
  assert.equal(isAxisRevealed('T', mbtiRevealed), true);
  assert.equal(isAxisRevealed('E', mbtiRevealed), false);
});

test('isAxisRevealed: missing payload → false', async () => {
  const { isAxisRevealed } = await dialogueRender();
  assert.equal(isAxisRevealed('F', null), false);
  assert.equal(isAxisRevealed('F', {}), false);
  assert.equal(isAxisRevealed('F', { revealed: [] }), false);
});

test('tagsAreBalanced: open/close even', async () => {
  const { tagsAreBalanced } = await dialogueRender();
  assert.equal(tagsAreBalanced('<mbti axis="F">x</mbti>'), true);
  assert.equal(tagsAreBalanced('plain'), true);
  assert.equal(tagsAreBalanced('<mbti axis="F">x'), false);
  assert.equal(tagsAreBalanced('x</mbti>'), false);
  assert.equal(tagsAreBalanced('<mbti axis="F"><mbti axis="T">x</mbti></mbti>'), true);
});

test('stripMbtiTags: removes tags preserving content', async () => {
  const { stripMbtiTags } = await dialogueRender();
  assert.equal(stripMbtiTags('<mbti axis="F">caldo</mbti>'), 'caldo');
  assert.equal(stripMbtiTags('plain'), 'plain');
  assert.equal(stripMbtiTags('<mbti axis="T">a</mbti> e <mbti axis="F">b</mbti>'), 'a e b');
});

test('LETTER_TO_AXIS: 8 letters mapped correctly', async () => {
  const { LETTER_TO_AXIS } = await dialogueRender();
  assert.equal(LETTER_TO_AXIS.E, 'E_I');
  assert.equal(LETTER_TO_AXIS.I, 'E_I');
  assert.equal(LETTER_TO_AXIS.S, 'S_N');
  assert.equal(LETTER_TO_AXIS.N, 'S_N');
  assert.equal(LETTER_TO_AXIS.T, 'T_F');
  assert.equal(LETTER_TO_AXIS.F, 'T_F');
  assert.equal(LETTER_TO_AXIS.J, 'J_P');
  assert.equal(LETTER_TO_AXIS.P, 'J_P');
});

test('VALID_LETTERS: matches between backend + frontend', async () => {
  const { LETTER_TO_AXIS } = await dialogueRender();
  const backend = new Set(VALID_LETTERS);
  const frontend = new Set(Object.keys(LETTER_TO_AXIS));
  for (const l of backend) assert.ok(frontend.has(l), `frontend missing ${l}`);
  for (const l of frontend) assert.ok(backend.has(l), `backend missing ${l}`);
});
