// Meta-network preview THREAT resolver — TKT-WORLDGEN-GAPC (rich route-choice telegraph).
//
// Resolves an encounter's threat metadata (difficulty_rating + encounter_class + peak enemy
// tier + initial spawn count) so the fase-3 Godot route-choice UI can telegraph each
// destination Into-the-Breach style. Metadata source = docs/planning/encounters/ (live combat)
// UNION docs/planning/encounters-draft/ (node-encounter proposals NOT promoted to live combat).
//
// METADATA-ONLY: reading the draft dir here does NOT route the drafts into combat. Combat's
// encounterLoader (apps/backend/services/combat/encounterLoader.js) stays encounters/-only, so
// the ratified completion bands are untouched. (Promoting the drafts to live combat crashes
// completion -- 7 sequential gating fights vs the one-attempt-per-mission cap -- see PR #2593;
// the preview only needs the THREAT NUMBERS, not the live fight.)
//
// Pure-ish: filesystem read on first call (cached) + _resetCache test seam. Mirrors
// metaNetworkResolver's cache + graceful-warn shape.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// Live combat encounters first, then the not-yet-promoted node-encounter proposals. On an id
// collision the live dir wins (scanned first). A dir that is absent or a malformed file is
// skipped gracefully (-> that id resolves to null = no telegraph, never a crash).
const DIRS = [
  path.resolve(__dirname, '../../../../docs/planning/encounters'),
  path.resolve(__dirname, '../../../../docs/planning/encounters-draft'),
];

const TIER_RANK = { base: 0, elite: 1, apex: 2 };
const RANK_TIER = ['base', 'elite', 'apex'];

let _cache = null; // Map<encounter_id, threat>

function _norm(v) {
  return String(v == null ? '' : v).trim();
}

function _load() {
  if (_cache) return _cache;
  _cache = new Map();
  for (const dir of DIRS) {
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
      if (_cache.has(id)) continue; // live dir scanned first -> wins on collision
      _cache.set(id, _deriveThreat(enc));
    }
  }
  return _cache;
}

// Threat telegraph from the encounter shape: difficulty (1-5) + class + the PEAK enemy tier
// across ALL waves (the scariest unit you will face) + the initial spawn count (the wave with
// the smallest turn_trigger).
function _deriveThreat(enc) {
  const waves = Array.isArray(enc.waves) ? enc.waves : [];
  let maxRank = 0;
  for (const w of waves) {
    for (const u of Array.isArray(w.units) ? w.units : []) {
      const r = TIER_RANK[u.tier] ?? 0;
      if (r > maxRank) maxRank = r;
    }
  }
  const wave1 = waves.length
    ? [...waves].sort((a, b) => (a.turn_trigger || 0) - (b.turn_trigger || 0))[0]
    : null;
  const wave1Count = wave1
    ? (Array.isArray(wave1.units) ? wave1.units : []).reduce(
        (n, u) => n + (Number(u.count) || 0),
        0,
      )
    : 0;
  const dr = Number(enc.difficulty_rating);
  return {
    difficulty_rating: Number.isFinite(dr) ? dr : null,
    encounter_class: enc.encounter_class || 'standard',
    max_tier: RANK_TIER[maxRank],
    wave1_count: wave1Count,
  };
}

// Threat metadata for an encounter id, or null (missing / unknown / bad input).
function encounterThreat(encounterId) {
  if (!encounterId) return null;
  const t = _load().get(_norm(encounterId));
  return t || null;
}

// Additive: each candidate (selectNextNodes shape, carries encounter_id) gains a `threat`
// field (the metadata, or null). Non-array input returned as-is (back-compat). Does NOT mutate
// the input candidates.
function enrichCandidatesWithThreat(candidates) {
  if (!Array.isArray(candidates)) return candidates;
  return candidates.map((c) => ({ ...c, threat: encounterThreat(c && c.encounter_id) }));
}

function _resetCache() {
  _cache = null;
}

module.exports = { encounterThreat, enrichCandidatesWithThreat, _resetCache };
