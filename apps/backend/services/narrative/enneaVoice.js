// Ennea Voice palette — Type 5 (Architetto) + Type 7 (Esploratore).
//
// Pure evaluator: no I/O lato chiamante eccetto YAML load. Mirrora il pattern di
// innerVoice.js. Selector usa vcSnapshot.ennea_archetypes (computeEnneaArchetypes
// in vcScoring.js) per filtrare i triggered, poi pesca random da palette per
// beat_id e archetype_id. Caller emette telemetry `ennea_voice_type_used` se la
// linea viene effettivamente consumata.
//
// Card: docs/museum/cards/enneagramma-mechanics-registry.md
// Spec: BACKLOG.md TKT-MUSEUM-SKIV-VOICES.

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VOICES_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'narrative',
  'ennea_voices',
);

// Mapping vcSnapshot ennea_archetypes[].id (canonical "Architetto(5)") -> file basename.
// 9/9 archetype coverage post BACKLOG TKT-MUSEUM-SKIV-VOICES + extension 2026-05-05.
const FILE_BY_ARCHETYPE = {
  'Riformatore(1)': 'type_1.yaml',
  'Coordinatore(2)': 'type_2.yaml',
  'Conquistatore(3)': 'type_3.yaml',
  'Individualista(4)': 'type_4.yaml',
  'Architetto(5)': 'type_5.yaml',
  'Lealista(6)': 'type_6.yaml',
  'Esploratore(7)': 'type_7.yaml',
  'Cacciatore(8)': 'type_8.yaml',
  'Stoico(9)': 'type_9.yaml',
};

let _cache = null;

function _loadAll({ filesDir = VOICES_DIR, force = false } = {}) {
  if (_cache && !force) return _cache;
  const palettes = {};
  for (const [archetypeId, filename] of Object.entries(FILE_BY_ARCHETYPE)) {
    const fullPath = path.join(filesDir, filename);
    if (!fs.existsSync(fullPath)) continue;
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = yaml.load(raw) || {};
    palettes[archetypeId] = {
      schema_version: parsed.schema_version || '0.0.0',
      archetype_id: parsed.archetype_id || archetypeId,
      ennea_type: parsed.ennea_type || null,
      canonical_name_it: parsed.canonical_name_it || archetypeId,
      voice_persona: parsed.voice_persona || '',
      beats: parsed.beats || {},
    };
  }
  _cache = { palettes };
  return _cache;
}

function _resetVoiceCache() {
  _cache = null;
}

// Deterministic-friendly RNG: seed via opts.rand (() => [0,1)) o Math.random.
function _pickRandom(arr, rand = Math.random) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const idx = Math.floor(rand() * arr.length);
  return arr[Math.min(idx, arr.length - 1)];
}

// Filtra triggered + supportati. Ritorna array di archetype_id candidati.
function getCandidateArchetypes(enneaArchetypes) {
  if (!Array.isArray(enneaArchetypes)) return [];
  const candidates = [];
  for (const entry of enneaArchetypes) {
    if (!entry || !entry.triggered) continue;
    if (FILE_BY_ARCHETYPE[entry.id]) candidates.push(entry.id);
  }
  return candidates;
}

// Selector core. Ritorna { archetype_id, line_id, text } | null.
//   ennea_archetypes — vcSnapshot ennea_archetypes array (or null)
//   beat_id          — string (combat_attack_committed | exploration_new_tile | ...)
//   opts.rand        — RNG override (deterministic test)
//   opts.priority    — array di archetype_id per tiebreak (default ordine candidates)
//   opts.catalog     — catalog precaricato (test hook)
function selectEnneaVoice(enneaArchetypes, beatId, opts = {}) {
  if (typeof beatId !== 'string' || !beatId) return null;
  const catalog = opts.catalog || _loadAll();
  const rand = typeof opts.rand === 'function' ? opts.rand : Math.random;

  const candidates = getCandidateArchetypes(enneaArchetypes);
  if (candidates.length === 0) return null;

  // Priorità deterministic: opts.priority ordina, altrimenti primo candidato.
  let ordered = candidates;
  if (Array.isArray(opts.priority) && opts.priority.length) {
    ordered = [...opts.priority.filter((a) => candidates.includes(a)), ...candidates].filter(
      (a, i, arr) => arr.indexOf(a) === i,
    );
  }

  for (const archetypeId of ordered) {
    const palette = catalog.palettes[archetypeId];
    if (!palette) continue;
    const beat = palette.beats?.[beatId];
    if (!beat || !Array.isArray(beat.lines) || beat.lines.length === 0) continue;
    const pick = _pickRandom(beat.lines, rand);
    if (!pick || !pick.id || !pick.text) continue;
    return {
      archetype_id: archetypeId,
      ennea_type: palette.ennea_type,
      beat_id: beatId,
      line_id: pick.id,
      text: pick.text,
    };
  }
  return null;
}

// Build telemetry event payload da selectEnneaVoice result.
//   actor_id — unit id (string)
//   selection — output di selectEnneaVoice
function buildVoiceTelemetryEvent(actorId, selection, opts = {}) {
  if (!selection || !selection.archetype_id || !selection.line_id) return null;
  return {
    event_type: 'ennea_voice_type_used',
    actor_id: actorId || null,
    archetype_id: selection.archetype_id,
    ennea_type: selection.ennea_type ?? null,
    beat_id: selection.beat_id,
    line_id: selection.line_id,
    turn: opts.turn ?? null,
    timestamp: opts.timestamp || new Date().toISOString(),
  };
}

// Lista beat_id supportati (union su tutti i palette).
function listSupportedBeats(opts = {}) {
  const catalog = opts.catalog || _loadAll();
  const set = new Set();
  for (const palette of Object.values(catalog.palettes)) {
    for (const k of Object.keys(palette.beats || {})) set.add(k);
  }
  return Array.from(set);
}

// Lista archetype_id supportati (chi ha YAML caricato).
function listSupportedArchetypes(opts = {}) {
  const catalog = opts.catalog || _loadAll();
  return Object.keys(catalog.palettes);
}

module.exports = {
  VOICES_DIR,
  FILE_BY_ARCHETYPE,
  _loadAll,
  _resetVoiceCache,
  getCandidateArchetypes,
  selectEnneaVoice,
  buildVoiceTelemetryEvent,
  listSupportedBeats,
  listSupportedArchetypes,
};
