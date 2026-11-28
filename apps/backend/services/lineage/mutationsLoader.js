// 2026-05-10 sera Sprint Q+ Q-3 — MUTATION_LIST canonical loader.
// Caches data/core/mutations/canonical_list.yaml read-only memoized.
//
// Consumer: propagateLineage.js (Q-3 engine) + future Godot v2 cross-stack
// (via JSON export TBD).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CANONICAL_PATH = path.resolve(
  __dirname,
  '../../../../data/core/mutations/canonical_list.yaml',
);

const CANONICAL_IDS = new Set([
  'armatura_residua',
  'tendine_rapide',
  'cuore_doppio',
  'vista_predatore',
  'lingua_chimica',
  'memoria_ferita',
]);

let _cache = null;

function loadMutationsCanonical() {
  if (_cache) return _cache;
  if (!fs.existsSync(CANONICAL_PATH)) {
    return { schema_version: 'unknown', mutations: {} };
  }
  try {
    const raw = fs.readFileSync(CANONICAL_PATH, 'utf8');
    _cache = yaml.load(raw) || { mutations: {} };
    return _cache;
  } catch (err) {
    console.warn('[mutationsLoader] load failed:', err.message);
    return { schema_version: 'error', mutations: {} };
  }
}

function isCanonicalMutation(id) {
  return CANONICAL_IDS.has(String(id));
}

function listCanonicalIds() {
  return Array.from(CANONICAL_IDS);
}

function _resetCache() {
  _cache = null;
}

module.exports = { loadMutationsCanonical, isCanonicalMutation, listCanonicalIds, _resetCache };
