// OD-013 Path B — narrativeEngine MBTI integration test.
//
// Scope: verify the additive integration helpers exposed by
// `services/narrative/narrativeEngine.js`:
//   - tagDialogueLineWithMbti: wraps a line with `<mbti axis="X">...</mbti>`
//     when axisLetters provided; passthrough otherwise.
//   - extractMbtiAxisFromTags: parses `mbti:X` tags from ink tag arrays.
//
// Pass-through verification: storylets without MBTI tags emit text
// invariato (zero breaking change). Lazy import + try/catch graceful on
// helper failure documented but not hit here (palette ships with repo).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  tagDialogueLineWithMbti,
  extractMbtiAxisFromTags,
  _resetMbtiPaletteCache,
} = require('../../services/narrative/narrativeEngine');

test('tagDialogueLineWithMbti: wraps text with single MBTI axis', () => {
  _resetMbtiPaletteCache();
  const out = tagDialogueLineWithMbti('Sento il vento', ['F']);
  assert.equal(out, '<mbti axis="F">Sento il vento</mbti>');
});

test('tagDialogueLineWithMbti: nested wrap for multiple axes (T outer, F inner)', () => {
  const out = tagDialogueLineWithMbti('logico ma triste', ['T', 'F']);
  assert.equal(out, '<mbti axis="T"><mbti axis="F">logico ma triste</mbti></mbti>');
});

test('tagDialogueLineWithMbti: empty axisLetters → passthrough invariato', () => {
  assert.equal(tagDialogueLineWithMbti('plain dialogue', []), 'plain dialogue');
  assert.equal(tagDialogueLineWithMbti('plain dialogue', null), 'plain dialogue');
  assert.equal(tagDialogueLineWithMbti('plain dialogue', undefined), 'plain dialogue');
});

test('tagDialogueLineWithMbti: empty / non-string text → safe fallback', () => {
  assert.equal(tagDialogueLineWithMbti('', ['F']), '');
  assert.equal(tagDialogueLineWithMbti(null, ['F']), '');
  assert.equal(tagDialogueLineWithMbti(undefined, ['F']), '');
  assert.equal(tagDialogueLineWithMbti(123, ['F']), '');
});

test('tagDialogueLineWithMbti: unknown axis letters silently dropped', () => {
  assert.equal(tagDialogueLineWithMbti('test', ['Z', 'Q']), 'test');
  assert.equal(tagDialogueLineWithMbti('test', ['Z', 'F']), '<mbti axis="F">test</mbti>');
});

test('extractMbtiAxisFromTags: parses `mbti:X` prefix tags', () => {
  assert.deepEqual(extractMbtiAxisFromTags(['mbti:F']), ['F']);
  assert.deepEqual(extractMbtiAxisFromTags(['mbti:T', 'mbti:F']), ['T', 'F']);
});

test('extractMbtiAxisFromTags: ignores non-MBTI / malformed tags', () => {
  assert.deepEqual(extractMbtiAxisFromTags(['scene:start', 'speaker:hero']), []);
  assert.deepEqual(extractMbtiAxisFromTags(['mbti:Z', 'mbti:', 'mbti']), []);
  assert.deepEqual(extractMbtiAxisFromTags(['mbti:F ', ' mbti:F']), []); // strict match
});

test('extractMbtiAxisFromTags: mixed valid + invalid tags', () => {
  const tags = ['scene:intro', 'mbti:F', 'speaker:guard', 'mbti:T'];
  assert.deepEqual(extractMbtiAxisFromTags(tags), ['F', 'T']);
});

test('extractMbtiAxisFromTags: null / empty / non-array → []', () => {
  assert.deepEqual(extractMbtiAxisFromTags(null), []);
  assert.deepEqual(extractMbtiAxisFromTags(undefined), []);
  assert.deepEqual(extractMbtiAxisFromTags([]), []);
  assert.deepEqual(extractMbtiAxisFromTags('mbti:F'), []);
});

test('integration: extract → tag chain (typical ink storylet flow)', () => {
  const inkText = 'Posso fidarmi di voi.';
  const inkTags = ['scene:debrief', 'mbti:F'];
  const axes = extractMbtiAxisFromTags(inkTags);
  const tagged = tagDialogueLineWithMbti(inkText, axes);
  assert.equal(tagged, '<mbti axis="F">Posso fidarmi di voi.</mbti>');
});

test('integration: storylet without MBTI tags → text invariato (backward compat)', () => {
  const inkText = 'La porta si apre lentamente.';
  const inkTags = ['scene:start', 'sfx:door_open'];
  const axes = extractMbtiAxisFromTags(inkTags);
  const tagged = tagDialogueLineWithMbti(inkText, axes);
  assert.equal(tagged, 'La porta si apre lentamente.');
});
