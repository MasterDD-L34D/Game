// SPEC-H — A.L.I.E.N.A. 6-dim Codex entries loader.
//
// Serves the diegetic Codex content authored in data/codex/{id}.yaml. The 6-dim
// schema (A.L.I.E.N.A.) is SHARED with the authoring gate (one source, no
// prose-vs-data divergence — hades-schema doc 2026-04-27).
//
// SPEC-H sez.8 invariant: the coherence SCORE is `secret` (engine-only,
// computed separately by services/authorial/alienaCoherence.js — it is NOT in
// these YAML files). This loader therefore surfaces only PUBLIC lore. The HA5
// diegetic proxy (qualitative descriptor derived from the secret score) is a
// follow-up and is deliberately NOT computed here.
//
// Unlock-state is client-side (localStorage `evo:codex-seen-{id}`, SPEC-H sez.8
// = private). This module serves entry CONTENT + unlock METADATA (triggers /
// locked_preview); per-player unlock progress is not tracked server-side.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// The 6 canonical A.L.I.E.N.A. dimensions (authoring gate + Codex share these).
const ALIENA_DIMENSION_KEYS = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

// Worktree vs deployed path candidates (mirror routes/meta.js + services/codex).
function candidateDirs() {
  return [
    path.resolve(__dirname, '../../../../data/codex'),
    path.resolve(process.cwd(), 'data/codex'),
  ];
}

let _cache = null;

// Load + parse every data/codex/*.yaml entry. Best-effort: a malformed file is
// skipped, never throws (a single bad authoring file must not 500 the Codex).
function loadCodexEntries() {
  if (_cache) return _cache;
  const entries = [];
  for (const dir of candidateDirs()) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8');
        const parsed = yaml.load(raw);
        const entry = parsed && parsed.codex_entry;
        if (entry && entry.id) entries.push(entry);
      } catch {
        /* skip malformed entry — best-effort */
      }
    }
    if (entries.length) break; // first candidate dir that yields entries wins
  }
  _cache = entries;
  return entries;
}

// Sidebar summary: id + display + type + unlock metadata (no full sections).
function summarize(entry) {
  const unlock = entry.unlock || {};
  return {
    id: entry.id,
    type: entry.type || 'species',
    display_name_it: entry.display_name_it || entry.id,
    display_name_en: entry.display_name_en || '',
    subtitle_it: entry.subtitle_it || '',
    unlock: {
      triggers: Array.isArray(unlock.triggers) ? unlock.triggers : [],
      threshold: Number.isFinite(unlock.threshold) ? unlock.threshold : 1,
      locked_preview: unlock.locked_preview || '',
    },
  };
}

function listCodexEntries() {
  return loadCodexEntries().map(summarize);
}

function getCodexEntry(id) {
  return loadCodexEntries().find((e) => e.id === id) || null;
}

// Test hook — clears the in-process cache (no production caller).
function _resetCache() {
  _cache = null;
}

module.exports = {
  ALIENA_DIMENSION_KEYS,
  loadCodexEntries,
  listCodexEntries,
  getCodexEntry,
  _resetCache,
};
