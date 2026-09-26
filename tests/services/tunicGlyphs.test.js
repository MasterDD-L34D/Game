// Unit test for Tunic decipher Codex glyph progression.
//
// Source: docs/research/2026-04-27-indie-concept-rubabili.md (Tunic).
// Decision: docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §H.4.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const tunic = require('../../apps/backend/services/codex/tunicGlyphs');

test('initial state is empty', () => {
  tunic._resetState();
  const s = tunic.getCodexState('camp1');
  assert.deepEqual(s.unlocked, []);
  assert.deepEqual(s.counters, {});
});

test('incrementCounter triggers unlock at threshold', () => {
  tunic._resetState();
  const r1 = tunic.incrementCounter('camp1', 'attacks_executed', 4);
  assert.deepEqual(r1.unlocked_new, [], 'no unlock below threshold');
  assert.equal(r1.counter, 4);
  const r2 = tunic.incrementCounter('camp1', 'attacks_executed', 1);
  assert.deepEqual(r2.unlocked_new, ['glyph_attacco'], 'unlocks at threshold 5');
  assert.equal(r2.counter, 5);
});

test('listGlyphsForCampaign distinguishes unlocked vs locked', () => {
  tunic._resetState();
  tunic.incrementCounter('camp2', 'attacks_executed', 5);
  const glyphs = tunic.listGlyphsForCampaign('camp2');
  const attacco = glyphs.find((g) => g.id === 'glyph_attacco');
  const difesa = glyphs.find((g) => g.id === 'glyph_difesa');
  assert.equal(attacco.unlocked, true);
  assert.ok(attacco.description, 'unlocked has description');
  assert.equal(difesa.unlocked, false);
  assert.equal(difesa.description, null, 'locked has null description');
});

test('campaigns isolated', () => {
  tunic._resetState();
  tunic.incrementCounter('campA', 'attacks_executed', 5);
  const sA = tunic.getCodexState('campA');
  const sB = tunic.getCodexState('campB');
  assert.equal(sA.unlocked.length, 1);
  assert.equal(sB.unlocked.length, 0);
});

test('getPage shows glyph state per campaign', () => {
  tunic._resetState();
  tunic.incrementCounter('campC', 'attacks_executed', 5);
  const page = tunic.getPage('page_predazione', 'campC');
  assert.ok(page);
  assert.equal(page.id, 'page_predazione');
  assert.equal(page.glyphs_referenced.length, 2);
  const attacco = page.glyphs_referenced.find((g) => g.id === 'glyph_attacco');
  const difesa = page.glyphs_referenced.find((g) => g.id === 'glyph_difesa');
  assert.equal(attacco.unlocked, true);
  assert.equal(difesa.unlocked, false);
});

test('getPage returns null for unknown page', () => {
  tunic._resetState();
  assert.equal(tunic.getPage('page_inexistent', 'camp'), null);
});

test('multiple events accumulate independently', () => {
  tunic._resetState();
  tunic.incrementCounter('camp3', 'mutations_applied', 1);
  tunic.incrementCounter('camp3', 'biomes_visited', 3);
  const s = tunic.getCodexState('camp3');
  assert.equal(s.counters.mutations_applied, 1);
  assert.equal(s.counters.biomes_visited, 3);
  assert.equal(s.unlocked.length, 2, 'glyph_evoluzione + glyph_mistero');
});
