'use strict';
// A13 N=40 evidence harness -- encounter_id -> biome_id resolver (sim-side).
//
// The full-loop runner needs the biome of each chapter's encounter so it can thread
// `biome_id` (+ campaign_id) into /api/session/start and exercise the SPEC-P A13
// wound write/read path. Metadata source = the SAME dirs as encounterThreat
// (docs/planning/encounters/ live first, then encounters-draft/) -- read-only,
// no API surface change, zero impact on combat's encounterLoader.
//
// Mirrors encounterThreat's cache + graceful-skip shape (+ _resetCache test seam).

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_DIRS = [
  path.resolve(__dirname, '../../docs/planning/encounters'),
  path.resolve(__dirname, '../../docs/planning/encounters-draft'),
];

let _cache = null; // Map<encounter_id, biome_id|null>

function _norm(v) {
  return String(v == null ? '' : v).trim();
}

function _load(dirs) {
  if (_cache) return _cache;
  _cache = new Map();
  for (const dir of dirs) {
    let files;
    try {
      files = fs.readdirSync(dir).filter((f) => f.startsWith('enc_') && f.endsWith('.yaml'));
    } catch {
      continue; // dir absent -> skip
    }
    for (const fname of files) {
      let enc;
      try {
        enc = yaml.load(fs.readFileSync(path.join(dir, fname), 'utf8'));
      } catch {
        continue; // malformed -> skip
      }
      if (!enc || !enc.encounter_id) continue;
      const id = _norm(enc.encounter_id);
      if (_cache.has(id)) continue; // earlier dir wins on collision
      _cache.set(id, enc.biome_id ? _norm(enc.biome_id) : null);
    }
  }
  return _cache;
}

/**
 * Resolve an encounter's biome_id. Null when the encounter is unknown, has no
 * biome_id, or the metadata cannot be read (the runner then simply skips the
 * A13 threading for that chapter -- never a crash).
 */
function biomeForEncounter(encounterId, opts = {}) {
  const id = _norm(encounterId);
  if (!id) return null;
  const map = _load(Array.isArray(opts.dirs) ? opts.dirs : DEFAULT_DIRS);
  return map.get(id) || null;
}

function _resetCache() {
  _cache = null;
}

module.exports = { biomeForEncounter, _resetCache, DEFAULT_DIRS };
