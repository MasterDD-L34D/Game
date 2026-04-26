// 2026-04-26 — Encounter YAML loader (PCG G1 fix).
//
// Carica `docs/planning/encounters/*.yaml` come encounter runtime opt-in.
// Sblocca: objectiveEvaluator (5 obj non-elim), biomeSpawnBias initial waves,
// conditions runtime, narrative ink wiring. Templates erano orphaned.
//
// API:
//   loadEncounter(encounterId)  → encounter object | null
//   listEncounters()            → array string IDs disponibili
//   _resetCache()               → testing only
//
// Wire: `apps/backend/routes/session.js /start` legge `body.encounter_id`.
// Se YAML trovato + parse OK → usa quello; altrimenti fallback a JS scenario.
// Zero breaking change su scenari hardcoded esistenti.

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ENCOUNTER_DIR = path.resolve(__dirname, '../../../../docs/planning/encounters');

let _cache = null;
let _availableIds = null;

function _loadAll() {
  if (_cache) return _cache;
  _cache = {};
  _availableIds = [];
  let files = [];
  try {
    files = fs.readdirSync(ENCOUNTER_DIR).filter((f) => f.endsWith('.yaml'));
  } catch (err) {
    console.warn('[encounterLoader] dir not found:', ENCOUNTER_DIR, err.message);
    return _cache;
  }
  for (const fname of files) {
    try {
      const raw = fs.readFileSync(path.join(ENCOUNTER_DIR, fname), 'utf-8');
      const parsed = yaml.load(raw);
      if (parsed && parsed.encounter_id) {
        _cache[parsed.encounter_id] = parsed;
        _availableIds.push(parsed.encounter_id);
      }
    } catch (err) {
      console.warn('[encounterLoader] parse failed:', fname, err.message);
    }
  }
  return _cache;
}

function loadEncounter(encounterId) {
  if (!encounterId || typeof encounterId !== 'string') return null;
  const all = _loadAll();
  return all[encounterId] || null;
}

function listEncounters() {
  _loadAll();
  return _availableIds ? [..._availableIds] : [];
}

function _resetCache() {
  _cache = null;
  _availableIds = null;
}

module.exports = { loadEncounter, listEncounters, _resetCache };
