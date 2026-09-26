// AncientBeast wiki cross-link slug bridge — Sprint 3 §II (2026-04-27).
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #6 AncientBeast.
// Pattern: Beast Showcase wiki style — cross-link tra catalog wiki + runtime species.
//
// Match Evo-Tactics (ADR-2026-05-15 Phase 4b refactor 2026-05-15):
//   runtime: data/core/species/species_catalog.json (canonical post Phase 1+2)
//   wiki:    packs/evo_tactics_pack/docs/catalog/species/<slug>.json
//   index:   packs/evo_tactics_pack/docs/catalog/species-index.json
//   legacy fallback: data/core/species.yaml (DEPRECATED, kept Phase 4c transition)
//
// API:
//   getWikiSlug(speciesId) → slug | null
//   getWikiUrl(speciesId, opts?) → URL string for client navigation
//   getWikiEntry(speciesId) → catalog JSON | null
//   listLinkedSpecies() → [{ id, slug, has_catalog, has_runtime }]
//
// Slug normalization rules (Evo runtime ↔ AncientBeast-style catalog):
//   1. species_catalog.json `species_id` underscore_case (es. dune_stalker)
//   2. catalog wiki uses kebab-case (es. dune-stalker)
//   3. legacy_slug field (preserved via ETL Phase 4b) overrides mapping
//
// Wire opportunity: codexPanel "Specie" tab (future), characterPanel external
// link button, audit dashboard cross-ref.

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ADR-2026-05-15 Phase 4b — canonical single SOT.
const SPECIES_CATALOG_PATH = path.resolve(
  __dirname,
  '../../../../data/core/species/species_catalog.json',
);
// Legacy fallback (DEPRECATED Phase 4c removal pending).
const SPECIES_INDEX = path.resolve(__dirname, '../../../../data/core/species.yaml');
const CATALOG_INDEX = path.resolve(
  __dirname,
  '../../../../packs/evo_tactics_pack/docs/catalog/species-index.json',
);
const CATALOG_DIR = path.resolve(
  __dirname,
  '../../../../packs/evo_tactics_pack/docs/catalog/species',
);

let _runtimeCache = null;
let _catalogCache = null;

/**
 * Normalize id underscore_case → catalog kebab-case.
 * @param {string} id
 * @returns {string}
 */
function toKebabSlug(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
}

function loadRuntimeSpecies() {
  if (_runtimeCache) return _runtimeCache;
  _runtimeCache = new Map();
  // PRIMARY: species_catalog.json (canonical post ADR-2026-05-15 Phase 4b).
  try {
    const raw = fs.readFileSync(SPECIES_CATALOG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data?.catalog) ? data.catalog : [];
    for (const entry of list) {
      if (!entry || !entry.species_id) continue;
      // Normalize catalog entry to runtime-compatible shape (id + legacy_slug).
      _runtimeCache.set(entry.species_id, {
        id: entry.species_id,
        legacy_slug: entry.legacy_slug || null,
        clade_tag: entry.clade_tag || null,
        sentience_index: entry.sentience_index || null,
        // Spread other catalog fields for forward-compat consumers
        ...entry,
      });
    }
    if (_runtimeCache.size > 0) return _runtimeCache;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[wikiLinkBridge] catalog load failed:', err.message);
    }
  }

  // FALLBACK: legacy species.yaml (back-compat Phase 4c transition).
  try {
    const raw = fs.readFileSync(SPECIES_INDEX, 'utf-8');
    const data = yaml.load(raw);
    const list = Array.isArray(data?.species) ? data.species : [];
    for (const entry of list) {
      if (!entry || !entry.id) continue;
      _runtimeCache.set(entry.id, entry);
    }
  } catch (err) {
    console.warn('[wikiLinkBridge] runtime species fallback load failed:', err.message);
  }
  return _runtimeCache;
}

function loadCatalogIndex() {
  if (_catalogCache) return _catalogCache;
  try {
    const raw = fs.readFileSync(CATALOG_INDEX, 'utf-8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data?.species) ? data.species : [];
    _catalogCache = new Map();
    for (const entry of list) {
      if (!entry || !entry.id) continue;
      _catalogCache.set(entry.id, entry);
    }
  } catch (err) {
    console.warn('[wikiLinkBridge] catalog index load failed:', err.message);
    _catalogCache = new Map();
  }
  return _catalogCache;
}

/**
 * Resolve wiki slug for a runtime species id.
 * Priority: legacy_slug → toKebabSlug(id).
 * Returns null if neither runtime species exists nor catalog matches.
 *
 * @param {string} speciesId runtime id (data/core/species.yaml)
 * @returns {string|null}
 */
function getWikiSlug(speciesId) {
  if (!speciesId) return null;
  const runtime = loadRuntimeSpecies();
  const catalog = loadCatalogIndex();
  const entry = runtime.get(speciesId);
  // Try legacy_slug first (explicit override).
  if (entry && entry.legacy_slug && catalog.has(entry.legacy_slug)) {
    return entry.legacy_slug;
  }
  // Try kebab-case auto.
  const kebab = toKebabSlug(speciesId);
  if (catalog.has(kebab)) return kebab;
  // Try id as-is (case where catalog already uses underscore).
  if (catalog.has(speciesId)) return speciesId;
  return null;
}

/**
 * Build wiki URL for client navigation (relative path to catalog HTML).
 * Frontend can use this to render <a href> buttons next to species names.
 *
 * @param {string} speciesId
 * @param {object} [opts]
 * @param {string} [opts.basePath='/docs/evo-tactics-pack/catalog/species'] - URL prefix
 * @param {string} [opts.ext='.json'] - extension served (.html for static, .json for data)
 * @returns {string|null}
 */
function getWikiUrl(speciesId, opts = {}) {
  const slug = getWikiSlug(speciesId);
  if (!slug) return null;
  const base = opts.basePath || '/docs/evo-tactics-pack/catalog/species';
  const ext = opts.ext || '.json';
  return `${base}/${slug}${ext}`;
}

/**
 * Load full catalog JSON for a species (read-through; not cached deeply).
 *
 * @param {string} speciesId
 * @returns {object|null}
 */
function getWikiEntry(speciesId) {
  const slug = getWikiSlug(speciesId);
  if (!slug) return null;
  try {
    const fpath = path.join(CATALOG_DIR, `${slug}.json`);
    if (!fs.existsSync(fpath)) return null;
    return JSON.parse(fs.readFileSync(fpath, 'utf-8'));
  } catch (err) {
    console.warn('[wikiLinkBridge] entry load failed:', speciesId, err.message);
    return null;
  }
}

/**
 * List all species with link audit metadata. Useful for governance reporting.
 *
 * @returns {Array<{id:string, slug:string|null, has_catalog:boolean, has_runtime:boolean}>}
 */
function listLinkedSpecies() {
  const runtime = loadRuntimeSpecies();
  const catalog = loadCatalogIndex();
  const allIds = new Set([...runtime.keys(), ...catalog.keys()]);
  const out = [];
  for (const id of allIds) {
    const slug = getWikiSlug(id);
    out.push({
      id,
      slug,
      has_catalog: slug ? catalog.has(slug) : catalog.has(id),
      has_runtime: runtime.has(id),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function _resetCache() {
  _runtimeCache = null;
  _catalogCache = null;
}

module.exports = {
  getWikiSlug,
  getWikiUrl,
  getWikiEntry,
  listLinkedSpecies,
  toKebabSlug,
  _resetCache,
};
