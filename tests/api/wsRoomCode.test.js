// Wave 3 #4 (audit 2026-04-24 §4) — Room-code alphabet regex purity test.
//
// Verifica `generateRoomCode()` produce SOLO consonanti BCDFGHJKLMNPQRSTVWXZ
// (20 char canonical, ZERO vocali, ZERO Y per evitare parole sense). Test
// statistical su N codes per copertura distribuzione.
//
// Ref: apps/backend/services/network/wsSession.js:40 ROOM_CODE_ALPHABET.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateRoomCode,
  ROOM_CODE_ALPHABET,
} = require('../../apps/backend/services/network/wsSession');

const ROOM_CODE_REGEX = /^[BCDFGHJKLMNPQRSTVWXZ]{4}$/;
const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Y'];

test('ROOM_CODE_ALPHABET has 20 consonants, zero vowels (incl. Y)', () => {
  assert.equal(ROOM_CODE_ALPHABET.length, 20, 'alphabet must be exactly 20 chars');
  for (const v of VOWELS) {
    assert.ok(
      !ROOM_CODE_ALPHABET.includes(v),
      `alphabet must not contain vowel ${v}, found in: ${ROOM_CODE_ALPHABET}`,
    );
  }
  // Verify uppercase only
  assert.equal(ROOM_CODE_ALPHABET, ROOM_CODE_ALPHABET.toUpperCase());
  // Verify each char unique (no duplicates)
  const set = new Set(ROOM_CODE_ALPHABET.split(''));
  assert.equal(set.size, 20, 'alphabet must have 20 unique chars');
});

test('generateRoomCode produces 4-char codes matching alphabet regex', () => {
  // Single-shot smoke
  const code = generateRoomCode();
  assert.ok(
    ROOM_CODE_REGEX.test(code),
    `code "${code}" does not match alphabet regex ${ROOM_CODE_REGEX}`,
  );
});

test('generateRoomCode 1000 samples — 100% match alphabet, no vowels', () => {
  // Statistical purity: 1000 samples × 4 char = 4000 char total. With 20-char
  // alphabet uniform random, P(zero vowels in 4000 char) approx 1 (alphabet has zero).
  // Failure indicates alphabet drift / RNG broken / regex broken.
  const N = 1000;
  const failed = [];
  const charFreq = {};
  for (let i = 0; i < N; i += 1) {
    const code = generateRoomCode();
    if (!ROOM_CODE_REGEX.test(code)) {
      failed.push(code);
    }
    for (const ch of code) {
      charFreq[ch] = (charFreq[ch] || 0) + 1;
    }
  }
  assert.deepEqual(failed, [], `${failed.length}/${N} codes failed regex: ${failed.slice(0, 5)}`);

  // Verify NO vowel appears across all 4000 chars
  for (const v of VOWELS) {
    assert.equal(charFreq[v] || 0, 0, `vowel ${v} appeared ${charFreq[v]} times in ${N} codes`);
  }

  // Verify all 20 alphabet chars used at least once (RNG distribution sanity).
  // With 4000 char + 20 alphabet uniform, expected ~200 per char. Floor 1
  // catches RNG dead-spots.
  const alphabetChars = ROOM_CODE_ALPHABET.split('');
  const unused = alphabetChars.filter((c) => !charFreq[c]);
  assert.deepEqual(unused, [], `alphabet chars unused in ${N} samples: ${unused.join(',')}`);
});

test('generateRoomCode produces uppercase only, no spaces, no punctuation', () => {
  for (let i = 0; i < 100; i += 1) {
    const code = generateRoomCode();
    assert.equal(code, code.toUpperCase(), `code "${code}" contains lowercase`);
    assert.ok(!/\s/.test(code), `code "${code}" contains whitespace`);
    assert.ok(!/[^A-Z]/.test(code), `code "${code}" contains non-letter char`);
    assert.equal(code.length, 4, `code "${code}" has wrong length ${code.length}`);
  }
});
