#!/usr/bin/env node
/**
 * A.L.I.E.N.A. Codex authoring-gate validator (SPEC-H HA2).
 *
 * HA2 is the authoring gate for the 6-dimension A.L.I.E.N.A. method
 * (docs/design/evo-tactics-aliena-enforcement-lore.md sez.5). HA2 was ratified
 * 2026-06-08 as HYBRID: HARD on PRESENCE of the 6 dimensions + their content,
 * SOFT (warn) on editorial-rubric quality.
 *
 *   HARD (error)  -- every data/codex/{id}.yaml entry declares all 6 keys
 *     (A_ambiente / L_linee_evolutive / I_impianto / E_ecologia / N_norme_socio /
 *     A_ancoraggio_narrativo) and each has non-empty `content`.
 *   SOFT (warn)   -- content length outside the 100-500 char TV-readable band
 *     (max re-derived from the real corpus, 2026-06-18 audit); A_ancoraggio lacks
 *     a narrative hook (story_hook_it / lore_seed_it /
 *     sistema_relation); unlock.triggers empty; the id matches no sistema/enemy
 *     species in any canonical roster (orphan -- can never unlock through play).
 *
 * Namespace cross-check (SPEC-K, HA2 follow-up): the unlock hook
 * (apps/play/src/main.js) reveals an entry only when a `controlled_by==='sistema'`
 * unit's species slug (`species_id || species`) EQUALS the entry id. So an entry
 * whose id is in no roster is dead content. collectInPlaySpecies() unions the two
 * authored roster sources -- scenario builders (apps/backend/services/{tutorial,
 * hardcore}Scenario.js, non-player units) + encounters (data/encounters/*.yaml
 * groups[].species_hint) -- and the orphan check warns (SOFT) when an id is
 * missing. It runs ONLY against the canonical data/codex (a custom --codex dir is
 * a fixture with no roster context, so the cross-check is skipped there).
 *
 * This guard checks PRESENCE + quality of the authored data; it does NOT impose a
 * coherence-score spawn threshold (anti-pattern, sez.5 -- the strength knob stays
 * a continuous runtime value). The scorer's runtime-read fields
 * (narrative_hooks / lore_ref / narrative_tag) live on the species/spawn entries,
 * not these codex files; that species-side runtime-field check is a separate
 * follow-up (orthogonal to this id<->roster namespace check).
 *
 * Usage:
 *   node tools/js/validate_codex_aliena.js [--codex DIR] [--strict]
 *
 * Exit codes:
 *   0: pass (0 errors; warnings allowed unless --strict)
 *   1: errors, or warnings in --strict mode
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

let yaml;
try {
  yaml = require('js-yaml');
} catch {
  console.error('ERROR: js-yaml not installed. Run: npm install');
  process.exit(1);
}

// The 6 canonical A.L.I.E.N.A. dimension keys (schema codex 2026-04-27).
const ALIENA_DIMENSION_KEYS = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

// SOFT TV-readable length band. Spec sez.5 says 100-300, but the 2026-06-18 audit
// showed the real authored corpus (dune_stalker dimensions 368-493 char) sits well
// over that ceiling -- the band warned on 100% of real content (zero signal +
// --strict footgun). CONTENT_MAX re-derived from the corpus to 500 (the actual
// TV-readable ceiling); master-dd ratified. CONTENT_MIN keeps the spec floor.
const CONTENT_MIN = 100;
const CONTENT_MAX = 500;

function parseArgs(argv) {
  const out = { codexDir: 'data/codex', strict: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--codex' && argv[i + 1]) {
      out.codexDir = argv[++i];
    } else if (argv[i] === '--strict') {
      out.strict = true;
    }
  }
  return out;
}

// The two canonical roster modules (non-player units carry `species`/`species_id`).
const SCENARIO_REL_PATHS = [
  'apps/backend/services/tutorialScenario',
  'apps/backend/services/hardcoreScenario',
];

// Collect the set of species slugs that appear as a NON-PLAYER combatant in any
// canonical roster -- the universe a codex entry id must be in to ever unlock
// through play. Best-effort: a source that fails to load degrades to a note, not
// a crash (the orphan check is skipped only if BOTH sources yield nothing).
//
// Returns { species: Set<string>, sources: { scenario, encounters }, notes: [] }.
function collectInPlaySpecies(repoRoot) {
  const species = new Set();
  const sources = { scenario: false, encounters: false };
  const notes = [];

  // 1) Scenario builders -- require the module + run every build*() factory, keep
  //    units whose controlled_by !== 'player' (the sistema/enemy roster).
  for (const rel of SCENARIO_REL_PATHS) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const mod = require(path.resolve(repoRoot, rel));
      for (const [key, val] of Object.entries(mod)) {
        if (typeof val !== 'function' || !/^build/.test(key)) continue;
        let units;
        try {
          units = val();
        } catch {
          continue; // a factory that needs args -> skip, do not crash the gate
        }
        if (!Array.isArray(units)) continue;
        for (const u of units) {
          if (!u || u.controlled_by === 'player') continue;
          const slug = u.species_id || u.species;
          if (slug) {
            species.add(String(slug));
            sources.scenario = true;
          }
        }
      }
    } catch (err) {
      notes.push(`scenario roster ${rel} unavailable: ${err.message}`);
    }
  }

  // 2) Encounters -- data/encounters/*.yaml groups[].species_hint (these rosters
  //    are non-party by construction; the party is a separate field).
  const encDir = path.resolve(repoRoot, 'data/encounters');
  try {
    if (fs.existsSync(encDir)) {
      const encFiles = fs
        .readdirSync(encDir)
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
      for (const f of encFiles) {
        let parsed;
        try {
          parsed = yaml.load(fs.readFileSync(path.join(encDir, f), 'utf8'));
        } catch {
          continue;
        }
        const groups = parsed && Array.isArray(parsed.groups) ? parsed.groups : [];
        for (const g of groups) {
          const slug = g && g.species_hint;
          if (slug) {
            species.add(String(slug));
            sources.encounters = true;
          }
        }
      }
    } else {
      notes.push(`encounter roster dir not found: ${encDir}`);
    }
  } catch (err) {
    notes.push(`encounter roster source unavailable: ${err.message}`);
  }

  return { species, sources, notes };
}

// The canonical species spec source (per-species pack YAML). Filenames hyphenate
// (lithoconstructus-inhibens.yaml) while ids underscore, so resolution keys on the
// in-file `id`, not the filename.
const SPECIES_PACK_REL = 'packs/evo_tactics_pack/data/species';

// Pack species ids are inconsistent: some underscore (lithoconstructus_inhibens),
// some hyphen (sentinella-radice), while codex entry ids are always underscore.
// Normalize hyphens -> underscores on BOTH the map key and the lookup so the
// coherence gate covers hyphen-id species (Codex P1, PR #3090 follow-up) instead
// of silently skipping them.
function normSpeciesId(id) {
  return String(id == null ? '' : id).replace(/-/g, '_');
}

// Build a Map<id, resistance_archetype> from the pack species specs. Best-effort:
// a species file that fails to parse degrades to skip, not a crash. Returns an
// empty Map if the pack dir is absent (coherence then has nothing to check).
function loadSpeciesArchetypes(repoRoot) {
  const map = new Map();
  const root = path.resolve(repoRoot, SPECIES_PACK_REL);
  if (!fs.existsSync(root)) return map;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (/\.ya?ml$/.test(ent.name)) {
        let parsed;
        try {
          parsed = yaml.load(fs.readFileSync(full, 'utf8'));
        } catch {
          continue;
        }
        if (parsed && typeof parsed === 'object' && parsed.id) {
          const arch = parsed.resistance_archetype;
          map.set(normSpeciesId(parsed.id), arch == null ? null : String(arch));
        }
      }
    }
  }
  return map;
}

// Extract the resistance_archetype value from an L_linee_evolutive key_facts list.
// The value is a single token; some entries append a provenance suffix
// (e.g. 'adattivo (predoni-nomadi.yaml:3)'), so only the leading token counts.
// Returns the token, or null if no resistance_archetype key_fact is present.
function parseKeyFactArchetype(keyFacts) {
  if (!Array.isArray(keyFacts)) return null;
  for (const item of keyFacts) {
    const m = /^resistance_archetype\s*:\s*(\S+)/.exec(String(item).trim());
    if (m) return m[1];
  }
  return null;
}

// Coherence check (HARD): a type:species codex entry declares the species archetype
// in two spots -- lore_vars.archetype and the L_linee_evolutive resistance_archetype
// key_fact. Both MUST match the CURRENT species resistance_archetype. This catches
// the PR #3087 failure mode: a species archetype remapped (strutturale -> adattivo,
// #3080) after the codex was promoted (#3076), leaving the lore stale & silent.
// Returns an array of error strings (one per desynced spot); empty when coherent or
// when neither spot is authored. `speciesArchetype` is the canonical value.
function checkArchetypeCoherence(entry, speciesArchetype) {
  const errors = [];
  if (!entry || typeof entry !== 'object') return errors;
  const id = entry.id || '(unknown)';
  const canon = String(speciesArchetype);

  const loreVar = entry.lore_vars && entry.lore_vars.archetype;
  if (typeof loreVar === 'string' && loreVar.trim() && loreVar.trim() !== canon) {
    errors.push(
      `${id}: lore_vars.archetype '${loreVar.trim()}' != species resistance_archetype '${canon}' (codex lore stale vs species canon -- see PR #3087)`,
    );
  }

  const L = (entry.aliena_dimensions || {}).L_linee_evolutive || {};
  const kfArch = parseKeyFactArchetype(L.key_facts);
  if (kfArch && kfArch !== canon) {
    errors.push(
      `${id}: L_linee_evolutive resistance_archetype key_fact '${kfArch}' != species resistance_archetype '${canon}' (codex lore stale vs species canon -- see PR #3087)`,
    );
  }
  return errors;
}

// Validate a single parsed codex file. Pushes into errors/warnings (mutated).
// `universe` (optional Set<string>): when provided, the entry id is cross-checked
// against the in-play species set and an orphan id warns (SOFT). null/undefined
// skips the cross-check (fixture mode -- no roster context).
// `speciesArchetypes` (optional Map<id, resistance_archetype>): when provided, a
// type:species entry whose id resolves to a species with a defined archetype is
// hard-checked for codex<->species archetype coherence (PR #3087 guard). An
// unresolved id is out of scope here (the namespace SOFT check owns orphans).
function validateEntry(file, parsed, errors, warnings, universe = null, speciesArchetypes = null) {
  const entry = parsed && parsed.codex_entry;
  if (!entry || typeof entry !== 'object') {
    errors.push(`${file}: missing top-level codex_entry`);
    return { id: file, dims: 0 };
  }
  const id = entry.id || file;
  if (!entry.id) errors.push(`${file}: codex_entry.id is required`);

  const dims = entry.aliena_dimensions || {};
  let present = 0;
  for (const key of ALIENA_DIMENSION_KEYS) {
    const dim = dims[key];
    if (!dim || typeof dim !== 'object') {
      errors.push(`${id}: missing A.L.I.E.N.A. dimension '${key}'`);
      continue;
    }
    const content = typeof dim.content === 'string' ? dim.content.trim() : '';
    if (!content) {
      errors.push(`${id}: dimension '${key}' has no content`);
      continue;
    }
    present += 1;
    // SOFT: TV-readable length band (100-500, corpus-derived -- see CONTENT_MAX).
    if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) {
      warnings.push(
        `${id}: dimension '${key}' content length ${content.length} outside ${CONTENT_MIN}-${CONTENT_MAX} char band`,
      );
    }
  }

  // SOFT: A_ancoraggio should carry a narrative hook (the diegetic anchor the
  // runtime ancoraggio sub-score rewards).
  const anc = dims.A_ancoraggio_narrativo || {};
  const hasHook = Boolean(anc.story_hook_it || anc.lore_seed_it || anc.sistema_relation);
  if (anc && typeof anc === 'object' && anc.content && !hasHook) {
    warnings.push(
      `${id}: A_ancoraggio_narrativo lacks a narrative hook (story_hook_it / lore_seed_it / sistema_relation)`,
    );
  }

  // SOFT: unlock triggers should be authored (QBN unlock, sez.7).
  const triggers = entry.unlock && entry.unlock.triggers;
  if (!Array.isArray(triggers) || triggers.length === 0) {
    warnings.push(`${id}: unlock.triggers is empty (entry can never unlock)`);
  }

  // SOFT (SPEC-K namespace): the unlock hook keys on a sistema unit's species
  // slug, so an id absent from every roster can never unlock through play.
  // `codex_archive: true` opts an entry out -- retired-creature lore (#3038) is
  // intentionally absent from every current roster (kept as readable archive,
  // surfaced outside the encounter-unlock path), so the orphan warn is not a
  // dead-content signal for it.
  if (universe && entry.id && !entry.codex_archive && !universe.has(String(entry.id))) {
    warnings.push(
      `${id}: id matches no sistema/enemy species in any scenario or encounter roster -> cannot unlock through play (orphan entry)`,
    );
  }

  // HARD (PR #3087 guard): codex<->species archetype coherence. Only when the
  // type:species id resolves to a species with a defined resistance_archetype.
  if (speciesArchetypes && entry.type === 'species' && entry.id) {
    const speciesArch = speciesArchetypes.get(normSpeciesId(entry.id));
    if (speciesArch != null && String(speciesArch).trim() !== '') {
      for (const e of checkArchetypeCoherence(entry, String(speciesArch))) errors.push(e);
    }
  }

  return { id, dims: present };
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const codexDir = path.resolve(repoRoot, args.codexDir);

  if (!fs.existsSync(codexDir)) {
    console.error(`ERROR: codex dir not found: ${codexDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(codexDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  if (!files.length) {
    console.log(`[codex-aliena] no codex entries found in ${codexDir}`);
    process.exit(0);
  }

  const errors = [];
  const warnings = [];
  const rows = [];

  // Namespace cross-check (SPEC-K) runs ONLY against the canonical data/codex (the
  // default dir). A custom --codex dir is a fixture with no roster context, so an
  // "orphan" there would be meaningless noise -> universe stays null (skip).
  const defaultDir = path.resolve(repoRoot, 'data/codex');
  let universe = null;
  if (codexDir === defaultDir) {
    const collected = collectInPlaySpecies(repoRoot);
    for (const note of collected.notes) warnings.push(`roster source: ${note}`);
    if (collected.sources.scenario || collected.sources.encounters) {
      universe = collected.species;
    } else {
      warnings.push('namespace cross-check skipped: no roster source produced any species');
    }
  }

  // Archetype-coherence (PR #3087 guard) resolves against the canonical pack
  // species specs, independent of which codex dir is under test -- a fixture that
  // reuses a real species id is checked against that species' current archetype.
  const speciesArchetypes = loadSpeciesArchetypes(repoRoot);

  for (const file of files.sort()) {
    let parsed;
    try {
      parsed = yaml.load(fs.readFileSync(path.join(codexDir, file), 'utf8'));
    } catch (err) {
      errors.push(`${file}: YAML parse error: ${err.message}`);
      continue;
    }
    rows.push(validateEntry(file, parsed, errors, warnings, universe, speciesArchetypes));
  }

  console.log('[codex-aliena] A.L.I.E.N.A. authoring-gate audit (HA2)');
  console.log('  entry'.padEnd(34) + 'dims_present');
  for (const r of rows) {
    console.log('  ' + String(r.id).padEnd(32) + `${r.dims}/6`);
  }
  console.log(
    `[codex-aliena] files=${files.length} errors=${errors.length} warnings=${warnings.length}`,
  );
  for (const e of errors) console.log(`  ERROR: ${e}`);
  for (const w of warnings) console.log(`  WARN:  ${w}`);

  if (errors.length) process.exit(1);
  if (warnings.length && args.strict) process.exit(1);
  process.exit(0);
}

module.exports = {
  ALIENA_DIMENSION_KEYS,
  CONTENT_MIN,
  CONTENT_MAX,
  parseArgs,
  collectInPlaySpecies,
  normSpeciesId,
  loadSpeciesArchetypes,
  parseKeyFactArchetype,
  checkArchetypeCoherence,
  validateEntry,
};

if (require.main === module) main();
