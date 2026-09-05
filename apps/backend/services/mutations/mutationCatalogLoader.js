// M14 Path A — Mutation catalog loader (unit-self post-encounter mutation framework).
//
// Carica `data/core/mutations/mutation_catalog.yaml` (30 entries shipped 2026-04-25)
// con js-yaml. Ritorna oggetto `{catalog, byId, byCategory, byTier}` memoized.
// Esporta helper `listEligibleForUnit(unit, ctx)` che filtra per
// `prerequisites.traits ⊆ unit.trait_ids` e (se presenti) `prerequisites.mutations ⊆ unit.applied_mutations`.
//
// Decoupled da V3 mating per design semantics (vedi card M-007 + handoff
// 2026-04-25). Questa è la facciata read-only del catalog: non scrive PE/PI,
// non muta unit. La mutazione runtime live in `routes/mutations.js` apply.
//
// Pattern: lazy load + try/catch non-blocking (ritorna {} su YAML malformato
// o file missing per evitare boot failure backend).
//
// Cross-ref:
// - data/core/mutations/mutation_catalog.yaml (30 entries)
// - apps/backend/services/forms/formEvolution.js (M12.A engine pattern)
// - docs/planning/2026-04-25-mutation-system-design.md (design doc)

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const yaml = require('js-yaml');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_CATALOG_PATH = path.join(
  ROOT_DIR,
  'data',
  'core',
  'mutations',
  'mutation_catalog.yaml',
);

let _cached = null;

/**
 * Carica il catalogo mutazioni da YAML, memoizzato.
 *
 * Non-blocking: se file missing o YAML malformato, ritorna struttura vuota
 * `{ catalog: {}, byId: {}, byCategory: {}, byTier: {}, error?: string }`.
 *
 * @param {object} [opts]
 * @param {string} [opts.catalogPath] — override path (default: data/core/mutations/mutation_catalog.yaml)
 * @param {boolean} [opts.refresh=false] — bypass cache
 * @returns {{catalog: object, byId: object, byCategory: object, byTier: object, error?: string, schema_version?: string}}
 */
function loadMutationCatalog(opts = {}) {
  const refresh = Boolean(opts.refresh);
  const catalogPath = opts.catalogPath || DEFAULT_CATALOG_PATH;

  if (!refresh && _cached && _cached._path === catalogPath) {
    return _cached;
  }

  try {
    if (!fs.existsSync(catalogPath)) {
      const empty = _emptyResult({
        error: `catalog_file_missing: ${catalogPath}`,
        _path: catalogPath,
      });
      _cached = empty;
      return empty;
    }
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const doc = yaml.load(raw);
    if (!doc || typeof doc !== 'object' || !doc.mutations || typeof doc.mutations !== 'object') {
      const empty = _emptyResult({ error: 'catalog_yaml_invalid_shape', _path: catalogPath });
      _cached = empty;
      return empty;
    }

    const catalog = doc.mutations;
    const byId = {};
    const byCategory = {};
    const byTier = {};

    for (const [id, entry] of Object.entries(catalog)) {
      if (!entry || typeof entry !== 'object') continue;
      const enriched = { id, ...entry };
      byId[id] = enriched;
      const cat = entry.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(enriched);
      const tier = String(entry.tier ?? 'unknown');
      if (!byTier[tier]) byTier[tier] = [];
      byTier[tier].push(enriched);
    }

    const result = {
      catalog,
      byId,
      byCategory,
      byTier,
      schema_version: doc.schema_version || null,
      generated_at: doc.generated_at || null,
      _path: catalogPath,
    };
    _cached = result;
    return result;
  } catch (err) {
    const empty = _emptyResult({
      error: `catalog_load_failed: ${err.message}`,
      _path: catalogPath,
    });
    _cached = empty;
    return empty;
  }
}

function _emptyResult(extra = {}) {
  return {
    catalog: {},
    byId: {},
    byCategory: {},
    byTier: {},
    schema_version: null,
    generated_at: null,
    ...extra,
  };
}

/**
 * Lookup diretto per id mutazione.
 * @param {string} id
 * @returns {object|null}
 */
function getMutation(id) {
  if (!id || typeof id !== 'string') return null;
  const { byId } = loadMutationCatalog();
  return byId[id] || null;
}

/**
 * Filtra mutazioni eligible per unit dato:
 *   - prerequisites.traits ⊆ unit.trait_ids
 *   - prerequisites.mutations ⊆ unit.applied_mutations (se presente)
 *
 * Non controlla pe/pi cost qui (display-only, charging deferred a M13.P3).
 *
 * @param {object} unit — { trait_ids?: string[], applied_mutations?: string[] }
 * @param {object} [ctx] — riservato future evoluzioni (biome, mbti, ecc.)
 * @returns {Array<object>} mutazioni eligible (ognuna include `id`)
 */
function listEligibleForUnit(unit, _ctx = {}) {
  const { byId } = loadMutationCatalog();
  const unitTraits = new Set(Array.isArray(unit?.trait_ids) ? unit.trait_ids : []);
  const unitMutations = new Set(
    Array.isArray(unit?.applied_mutations) ? unit.applied_mutations : [],
  );

  const eligible = [];
  for (const [id, entry] of Object.entries(byId)) {
    const prereqs = entry.prerequisites || {};
    const reqTraits = Array.isArray(prereqs.traits) ? prereqs.traits : [];
    const reqMutations = Array.isArray(prereqs.mutations) ? prereqs.mutations : [];

    const traitsOk = reqTraits.every((t) => unitTraits.has(t));
    const mutationsOk = reqMutations.every((m) => unitMutations.has(m));
    // Skip if mutation already applied (no double-apply).
    if (unitMutations.has(id)) continue;

    if (traitsOk && mutationsOk) eligible.push(entry);
  }
  return eligible;
}

/**
 * Reset cache — usato dai test per forzare reload.
 */
function _resetCacheForTest() {
  _cached = null;
}

module.exports = {
  loadMutationCatalog,
  getMutation,
  listEligibleForUnit,
  DEFAULT_CATALOG_PATH,
  _resetCacheForTest,
};
