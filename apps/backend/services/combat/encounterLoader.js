// 2026-04-26 — Encounter YAML loader (PCG G1 fix).
//
// Carica `docs/planning/encounters/*.yaml` come encounter runtime opt-in.
// Sblocca: objectiveEvaluator (5 obj non-elim), biomeSpawnBias initial waves,
// conditions runtime, narrative ink wiring. Templates erano orphaned.
//
// API:
//   loadEncounter(encounterId, opts?)  → encounter object | null  (opts.graphMode unions encounters-draft/)
//   listEncounters(opts?)              → array string IDs disponibili  (opts.graphMode includes drafts)
//   _resetCache()                      → testing only
//
// Wire: `apps/backend/routes/session.js /start` legge `body.encounter_id`.
// Se YAML trovato + parse OK → usa quello; altrimenti fallback a JS scenario.
// Zero breaking change su scenari hardcoded esistenti.

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ENCOUNTER_DIR = path.resolve(__dirname, '../../../../docs/planning/encounters');
const ENCOUNTER_DRAFT_DIR = path.resolve(__dirname, '../../../../docs/planning/encounters-draft');

// GAP-C option-C C1: two caches. Static (encounters/ only) keeps the legacy behavior
// byte-identical; graph (encounters/ UNION encounters-draft/) is opt-in via
// loadEncounter(id, { graphMode: true }). The live dir is scanned first so it wins on an
// id collision (mirrors services/worldgen/encounterThreat.js). Static callers pass no
// opts -> drafts never enter combat -> the ratified static bands are untouched.
let _cacheStatic = null;
let _cacheGraph = null;
let _idsStatic = null;
let _idsGraph = null;

function _loadDirs(dirs) {
  const cache = {};
  const ids = [];
  for (const dir of dirs) {
    let files;
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'));
    } catch (err) {
      console.warn('[encounterLoader] dir not found:', dir, err.message);
      continue;
    }
    for (const fname of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, fname), 'utf-8');
        const parsed = yaml.load(raw);
        // First dir wins on collision: skip an id already loaded from an earlier (live) dir.
        if (parsed && parsed.encounter_id && !(parsed.encounter_id in cache)) {
          cache[parsed.encounter_id] = parsed;
          ids.push(parsed.encounter_id);
        }
      } catch (err) {
        console.warn('[encounterLoader] parse failed:', fname, err.message);
      }
    }
  }
  return { cache, ids };
}

function _loadStatic() {
  if (!_cacheStatic) {
    const r = _loadDirs([ENCOUNTER_DIR]);
    _cacheStatic = r.cache;
    _idsStatic = r.ids;
  }
  return _cacheStatic;
}

function _loadGraph() {
  if (!_cacheGraph) {
    const r = _loadDirs([ENCOUNTER_DIR, ENCOUNTER_DRAFT_DIR]);
    _cacheGraph = r.cache;
    _idsGraph = r.ids;
  }
  return _cacheGraph;
}

function loadEncounter(encounterId, opts = {}) {
  if (!encounterId || typeof encounterId !== 'string') return null;
  const all = opts.graphMode ? _loadGraph() : _loadStatic();
  return all[encounterId] || null;
}

function listEncounters(opts = {}) {
  if (opts.graphMode) {
    _loadGraph();
    return _idsGraph ? [..._idsGraph] : [];
  }
  _loadStatic();
  return _idsStatic ? [..._idsStatic] : [];
}

function _resetCache() {
  _cacheStatic = null;
  _cacheGraph = null;
  _idsStatic = null;
  _idsGraph = null;
}

module.exports = { loadEncounter, listEncounters, _resetCache };
