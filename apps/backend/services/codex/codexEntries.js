// SPEC-H — A.L.I.E.N.A. 6-dim Codex entries loader.
//
// Serves the diegetic Codex content authored in data/codex/{id}.yaml. The 6-dim
// schema (A.L.I.E.N.A.) is SHARED with the authoring gate (one source, no
// prose-vs-data divergence — hades-schema doc 2026-04-27).
//
// SPEC-H sez.8 invariant: the coherence SCORE is `secret` (engine-only,
// computed separately by services/authorial/alienaCoherence.js — it is NOT in
// these YAML files). This loader surfaces only PUBLIC lore, and enforces that
// structurally: getCodexEntry returns a PROJECTED clone with only an allowlist
// of known public keys (fail-closed) so a future authored entry cannot leak a
// novel score-bearing field (2026-06-18 audit hardening).
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
// role_templates / species roster). So HA5 derives a codex-NATIVE proxy from the
// entry's own authored 6-dim data, reusing the method's frozen 3-dim weights
// (.4 / .4 / .2). The raw proxy stays internal; only the band descriptor surfaces.
//
// 2026-06-18 audit (master-dd ratified): the proxy actually measures AUTHORING
// COMPLETENESS (which dimensions carry content + cross_ref + a narrative hook),
// NOT ecological fit -- a content-rich species drops band purely by removing
// link arrays, with no prose change. So the descriptors are ARCHIVAL-completeness
// in-world language ("scheda completa/parziale/frammentaria"), honest about what
// the proxy reads. They are NOT an ecological-belonging claim ("endemica" was
// misleading -- renamed). Bands: >=0.66 completa / >=0.33 parziale / else frammentaria.
const PRESENCE_BANDS = [
  { min: 0.66, descriptor: 'scheda completa' },
  { min: 0.33, descriptor: 'scheda parziale' },
  { min: 0, descriptor: 'scheda frammentaria' },
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

// SECRET invariant (sez.8) enforced structurally: the codex YAML is served only
// through this allowlist. Any top-level key NOT listed here is dropped before
// serialization (fail-closed), so a future entry that embeds a score-bearing
// field under a novel key (alien_fit, coerenza_eco, ...) cannot leak. All six
// listed keys are public lore (2026-06-18 audit hardening).
const PUBLIC_ENTRY_KEYS = [
  'id',
  'type',
  'display_name_it',
  'display_name_en',
  'subtitle_it',
  'unlock',
  'aliena_dimensions',
  'skiv_instance_note',
  'variants',
  'traits_core',
  'traits_optional',
  'synergies',
];

// Project an entry to the public allowlist + deep-clone, so the served object
// (a) carries no unrecognized field and (b) cannot mutate the process-wide cache.
function projectPublicEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = {};
  for (const k of PUBLIC_ENTRY_KEYS) {
    if (k in entry) out[k] = entry[k];
  }
  return structuredClone(out);
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
// skipped, never throws (a single bad authoring file must not 500 the Codex) --
// but the skip is now OBSERVABLE (structured warn), since the HA2 validator is
// the only other thing that would catch it (2026-06-18 audit). `force` bypasses
// the process cache (mirrors codexState.loadCodexPages) for in-process reload.
function loadCodexEntries(force = false) {
  if (_cache && !force) return _cache;
  const entries = [];
  for (const dir of candidateDirs()) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8');
        const parsed = yaml.load(raw);
        const entry = parsed && parsed.codex_entry;
        if (entry && entry.id) {
          entries.push(entry);
        } else {
          console.warn(
            JSON.stringify({
              evt: 'codex_entry_skip',
              file,
              reason: entry ? 'missing codex_entry.id' : 'no codex_entry',
            }),
          );
        }
      } catch (err) {
        console.warn(JSON.stringify({ evt: 'codex_entry_skip', file, reason: err.message }));
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
    // presence_descriptor is detail-only (the list view never renders it) -- not
    // serialized on summaries to avoid carrying it into the locked/obscured
    // sidebar context (2026-06-18 audit P3).
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

// Detail entry: allowlisted + deep-cloned (fail-closed secret guard + no cache
// mutation). presenceDescriptor still resolves -- aliena_dimensions is public.
function getCodexEntry(id) {
  const found = loadCodexEntries().find((e) => e.id === id);
  if (!found) return null;
  return projectPublicEntry(found);
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
