#!/usr/bin/env node
/**
 * Encounter Difficulty Validator — Q-001 T2.3 PR-4 of 5
 *
 * Per ogni encounter YAML in docs/planning/encounters/*.yaml, calcola
 * difficulty_rating atteso usando services/difficulty/difficultyCalculator
 * e confronta con il field `difficulty_rating` hardcoded dal designer.
 *
 * Warning se drift > 1 star (tolleranza designer judgment).
 * Error se drift > 2 stars (likely mis-tuned).
 *
 * Usage:
 *   node tools/js/validate_encounter_difficulty.js [--encounters DIR] [--strict]
 *
 * Exit codes:
 *   0: pass (0 errors)
 *   1: errors (drift > 2)
 *   2: warnings only in --strict mode
 */

const fs = require('node:fs');
const path = require('node:path');

let yaml;
try {
  yaml = require('js-yaml');
} catch {
  console.error('ERROR: js-yaml not installed. Run: npm install');
  process.exit(1);
}

const {
  loadDifficultyConfig,
  calculateDifficultyRating,
} = require('../../services/difficulty/difficultyCalculator');

function parseArgs(argv) {
  const out = { encountersDir: 'docs/planning/encounters', strict: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--encounters' && argv[i + 1]) {
      out.encountersDir = argv[++i];
    } else if (argv[i] === '--strict') {
      out.strict = true;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const encDir = path.resolve(repoRoot, args.encountersDir);
  const cfgPath = path.resolve(repoRoot, 'data', 'core', 'difficulty.yaml');

  if (!fs.existsSync(encDir)) {
    console.error(`ERROR: encounters dir not found: ${encDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(cfgPath)) {
    console.error(`ERROR: difficulty config not found: ${cfgPath}`);
    process.exit(1);
  }

  const config = loadDifficultyConfig(yaml.load(fs.readFileSync(cfgPath, 'utf8')));

  const files = fs.readdirSync(encDir).filter((f) => f.startsWith('enc_') && f.endsWith('.yaml'));
  if (!files.length) {
    console.log(`[difficulty] no encounter files found in ${encDir}`);
    process.exit(0);
  }

  const errors = [];
  const warnings = [];
  const rows = [];

  for (const file of files.sort()) {
    const filePath = path.join(encDir, file);
    let enc;
    try {
      enc = yaml.load(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      errors.push(`${file}: YAML parse error: ${err.message}`);
      continue;
    }

    const declared = Number(enc.difficulty_rating);
    if (!Number.isInteger(declared) || declared < 1 || declared > 5) {
      errors.push(`${file}: missing or invalid difficulty_rating (${enc.difficulty_rating})`);
      continue;
    }

    // Biome lookup: default difficulty_base=1.0 (biome registry integration futura)
    const biomeData = { difficulty_base: 1.0 };
    const computed = calculateDifficultyRating(enc, biomeData, config);
    const delta = Math.abs(computed - declared);

    rows.push({ file, declared, computed, delta });

    if (delta > 2) {
      errors.push(`${file}: drift > 2 stars (declared=${declared}, computed=${computed})`);
    } else if (delta > 1) {
      warnings.push(`${file}: drift > 1 star (declared=${declared}, computed=${computed})`);
    }
  }

  console.log('[difficulty] encounter rating audit');
  console.log('  file'.padEnd(36) + 'declared  computed  delta');
  for (const r of rows) {
    console.log(
      '  ' +
        r.file.padEnd(34) +
        String(r.declared).padEnd(10) +
        String(r.computed).padEnd(10) +
        String(r.delta),
    );
  }
  console.log(
    `[difficulty] files=${files.length} errors=${errors.length} warnings=${warnings.length}`,
  );

  for (const e of errors) console.log(`  ERROR: ${e}`);
  for (const w of warnings) console.log(`  WARN:  ${w}`);

  if (errors.length) process.exit(1);
  if (warnings.length && args.strict) process.exit(1);
  process.exit(0);
}

main();
