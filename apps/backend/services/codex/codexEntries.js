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
const { ALIENA_WEIGHTS } = require('../authorial/alienaCoherence');

// The 6 canonical A.L.I.E.N.A. dimensions (authoring gate + Codex share these).
const ALIENA_DIMENSION_KEYS = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

// HA5 (sez.7, ratified 2026-06-08 = B): the Codex surfaces a DIEGETIC qualitative
// descriptor derived from a coherence assessment -- never the raw number (sez.8
// `secret`). The runtime scorer (alienaCoherence.js) operates on combat
// spawn-pool vs ecosystem-biome pairs, which do NOT align with a browse-time
// codex species in its narrative home biome (the canonical biomes carry no
// role_templates / species roster). So HA5 derives a codex-NATIVE coherence
// proxy from the entry's own authored 6-dim data, reusing the method's frozen
// 3-dim weights (plausibilita .4 / coerenza_eco .4 / ancoraggio .2). This
// measures AUTHORING coherence -- the right lens for a Codex. The raw proxy
// stays internal; only the band descriptor is surfaced. Bands ratified
// 2026-06-18 (master-dd): >=0.66 endemica / >=0.33 adattata / else inattesa.
const PRESENCE_BANDS = [
  { min: 0.66, descriptor: 'specie endemica' },
  { min: 0.33, descriptor: 'presenza adattata' },
  { min: 0, descriptor: 'presenza inattesa' },
];

function _dimContent(dims, key) {
  const d = dims[key];
  return d && typeof d.content === 'string' ? d.content.trim() : '';
}

function _dimHasCrossRef(dims, key) {
  const d = dims[key];
  return Boolean(d && Array.isArray(d.cross_ref) && d.cross_ref.length);
}

// Codex-native 3-dim coherence proxy in [0,1]. INTERNAL -- never serialized.
function _coherenceProxy(entry) {
  const dims = (entry && entry.aliena_dimensions) || {};

  // ancoraggio (.2): does A_ancoraggio carry a narrative hook? (mirror of the
  // scorer's _scoreAncoraggioNarrativo: hook -> 1.0, content-only -> 0.5).
  const anc = dims.A_ancoraggio_narrativo || {};
  const hasHook = Boolean(
    anc.story_hook_it || anc.lore_seed_it || anc.sistema_relation || anc.theme_it,
  );
  const n = _dimContent(dims, 'A_ancoraggio_narrativo') ? (hasHook ? 1.0 : 0.5) : 0;

  // plausibilita (.4): a declared home habitat consistent with a biome cross_ref.
  const eco = dims.E_ecologia || {};
  const habitat = eco.habitat_primary;
  const habitatGrounded =
    _dimHasCrossRef(dims, 'E_ecologia') || _dimHasCrossRef(dims, 'A_ambiente');
  let p = 0;
  if (habitat && habitatGrounded) p = 1.0;
  else if (habitat) p = 0.5;

  // coerenza_eco (.4): the bio-eco-morpho dimensions are grounded + cross-linked.
  const ecoDims = ['E_ecologia', 'I_impianto', 'L_linee_evolutive'];
  const grounded = ecoDims.filter((k) => _dimContent(dims, k) && _dimHasCrossRef(dims, k)).length;
  const e = grounded / ecoDims.length;

  return (
    p * ALIENA_WEIGHTS.plausibilita +
    e * ALIENA_WEIGHTS.coerenza_eco +
    n * ALIENA_WEIGHTS.ancoraggio_narrativo
  );
}

// HA5 diegetic descriptor (PUBLIC). The raw proxy value stays secret.
function presenceDescriptor(entry) {
  const v = _coherenceProxy(entry);
  for (const band of PRESENCE_BANDS) {
    if (v >= band.min) return band.descriptor;
  }
  return PRESENCE_BANDS[PRESENCE_BANDS.length - 1].descriptor;
}

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
    presence_descriptor: presenceDescriptor(entry),
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
  presenceDescriptor,
  _resetCache,
};
