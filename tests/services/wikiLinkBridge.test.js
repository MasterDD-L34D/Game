// Unit test for AncientBeast wiki cross-link slug bridge — Sprint 3 §II.
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #6 AncientBeast.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getWikiSlug,
  getWikiUrl,
  getWikiEntry,
  listLinkedSpecies,
  toKebabSlug,
  _resetCache,
} = require('../../apps/backend/services/species/wikiLinkBridge');

test('toKebabSlug normalizes underscore_case to kebab-case', () => {
  assert.equal(toKebabSlug('dune_stalker'), 'dune-stalker');
  assert.equal(toKebabSlug('SAND_BURROWER'), 'sand-burrower');
  assert.equal(toKebabSlug(''), '');
  assert.equal(toKebabSlug(null), '');
});

test('getWikiSlug resolves dune_stalker → dune-stalker (catalog hit)', () => {
  _resetCache();
  const slug = getWikiSlug('dune_stalker');
  assert.equal(slug, 'dune-stalker', 'kebab-case match in catalog');
});

test('getWikiSlug returns null for unknown species', () => {
  _resetCache();
  const slug = getWikiSlug('totally_imaginary_xyz_zzz');
  assert.equal(slug, null);
});

test('getWikiSlug returns null for empty input', () => {
  assert.equal(getWikiSlug(''), null);
  assert.equal(getWikiSlug(null), null);
});

test('getWikiUrl builds runtime URL for dune_stalker', () => {
  _resetCache();
  const url = getWikiUrl('dune_stalker');
  assert.match(url || '', /dune-stalker\.json$/);
});

test('getWikiUrl uses custom basePath + ext', () => {
  _resetCache();
  const url = getWikiUrl('dune_stalker', { basePath: '/wiki', ext: '.html' });
  assert.equal(url, '/wiki/dune-stalker.html');
});

test('getWikiEntry returns full catalog JSON for dune_stalker', () => {
  _resetCache();
  const entry = getWikiEntry('dune_stalker');
  assert.ok(entry, 'catalog entry should exist');
  assert.equal(typeof entry, 'object');
});

test('getWikiEntry returns null for unknown species', () => {
  _resetCache();
  assert.equal(getWikiEntry('unknown_xyz'), null);
});

test('listLinkedSpecies returns audit array sorted by id', () => {
  _resetCache();
  const list = listLinkedSpecies();
  assert.ok(Array.isArray(list));
  assert.ok(list.length > 0, 'should have at least 1 entry');
  for (const entry of list) {
    assert.ok(typeof entry.id === 'string');
    assert.ok(typeof entry.has_runtime === 'boolean');
    assert.ok(typeof entry.has_catalog === 'boolean');
  }
  // Sorted check
  const ids = list.map((e) => e.id);
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(ids, sorted);
});

test('listLinkedSpecies includes dune_stalker as fully linked', () => {
  _resetCache();
  const list = listLinkedSpecies();
  const dune = list.find((e) => e.id === 'dune_stalker');
  assert.ok(dune, 'dune_stalker present');
  assert.equal(dune.has_runtime, true);
  assert.equal(dune.has_catalog, true);
  assert.equal(dune.slug, 'dune-stalker');
});
