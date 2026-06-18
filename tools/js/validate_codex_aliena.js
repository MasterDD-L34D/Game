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
 *   SOFT (warn)   -- content length outside the spec's 100-300 char TV-readable
 *     band; A_ancoraggio lacks a narrative hook (story_hook_it / lore_seed_it /
 *     sistema_relation); unlock.triggers empty.
 *
 * This guard checks PRESENCE + quality of the authored data; it does NOT impose a
 * coherence-score spawn threshold (anti-pattern, sez.5 -- the strength knob stays
 * a continuous runtime value). The scorer's runtime-read fields
 * (narrative_hooks / lore_ref / narrative_tag) live on the species/spawn entries,
 * not these codex files; the cross-file species-side check is a follow-up.
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

// Spec sez.5: each dimension content is 100-300 char, TV-readable (SOFT band).
const CONTENT_MIN = 100;
const CONTENT_MAX = 300;

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

// Validate a single parsed codex file. Pushes into errors/warnings (mutated).
function validateEntry(file, parsed, errors, warnings) {
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
    // SOFT: TV-readable length band (spec sez.5: 100-300 char).
    if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) {
      warnings.push(
        `${id}: dimension '${key}' content length ${content.length} outside 100-300 char band`,
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

  for (const file of files.sort()) {
    let parsed;
    try {
      parsed = yaml.load(fs.readFileSync(path.join(codexDir, file), 'utf8'));
    } catch (err) {
      errors.push(`${file}: YAML parse error: ${err.message}`);
      continue;
    }
    rows.push(validateEntry(file, parsed, errors, warnings));
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

main();
