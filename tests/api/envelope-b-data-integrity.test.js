// Envelope B bundle — data integrity smoke (OD-024 + OD-025-B2 + OD-027 + OD-029 + OD-031).
//
// ai-station Envelope B shipped 2026-05-14: 5 OD data-layer integrations.
// This test validates each integration via shape + content checks:
//   - OD-024: 4 traits interocettivi added to active_effects.yaml (tier T1)
//   - OD-025-B2: promotions.yaml extended ladder 3→5 tier (+elite/+master)
//   - OD-027: species_catalog.json schema canonical + 15 entries
//   - OD-029: neurons_bridge.csv expanded 13→50+ entries (Senses+Dexterity)
//   - OD-031: Pack v2-full-plus metadata merged in species_catalog.json
//
// Cross-link: docs/governance/open-decisions/OD-024-031-verdict-record.md

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('OD-024 — 4 traits interocettivi sensienza RFC v0.1', () => {
  const traitsPath = path.join(REPO_ROOT, 'data', 'core', 'traits', 'active_effects.yaml');
  const src = fs.readFileSync(traitsPath, 'utf8');

  test('propriocezione trait defined T1', () => {
    assert.match(src, /^ {2}propriocezione:/m);
    const block = src.match(/^ {2}propriocezione:[\s\S]*?(?=^ {2}\w|\Z)/m)?.[0] || '';
    assert.match(block, /tier:\s*T1/, 'propriocezione must be T1');
    assert.match(block, /category:\s*sensoriale/);
    assert.match(block, /log_tag:\s*proprioception_balance/);
  });

  test('equilibrio_vestibolare trait defined T1', () => {
    assert.match(src, /^ {2}equilibrio_vestibolare:/m);
    const block = src.match(/^ {2}equilibrio_vestibolare:[\s\S]*?(?=^ {2}\w|\Z)/m)?.[0] || '';
    assert.match(block, /tier:\s*T1/);
    assert.match(block, /log_tag:\s*vestibular_advantage/);
  });

  test('nocicezione trait defined T1 with ferito gate', () => {
    assert.match(src, /^ {2}nocicezione:/m);
    const block = src.match(/^ {2}nocicezione:[\s\S]*?(?=^ {2}\w|\Z)/m)?.[0] || '';
    assert.match(block, /tier:\s*T1/);
    assert.match(block, /requires:\s*ferito/);
    assert.match(block, /log_tag:\s*nociception_reactive/);
  });

  test('termocezione trait defined T1', () => {
    assert.match(src, /^ {2}termocezione:/m);
    // Extract from `termocezione:` to next 2-space header or EOF (JS regex lacks \z).
    const startIdx = src.indexOf('  termocezione:');
    const block = startIdx >= 0 ? src.slice(startIdx) : '';
    assert.match(block, /tier:\s*T1/);
    assert.match(block, /log_tag:\s*thermoception_resist/);
  });

  test('OD-024 comment block present', () => {
    assert.match(src, /OD-024/, 'active_effects.yaml must reference OD-024');
    assert.match(src, /interoception_traits|interocettivi/, 'RFC v0.1 reference present');
  });
});

describe('OD-025-B2 — promotion catalog +elite/+master', () => {
  const promPath = path.join(REPO_ROOT, 'data', 'core', 'promotions', 'promotions.yaml');
  const src = fs.readFileSync(promPath, 'utf8');

  test('version bumped to 0.2.0', () => {
    assert.match(src, /^version:\s*"0\.2\.0"/m);
  });

  test('tier_ladder extended 3→5 tier', () => {
    assert.match(src, /^ {2}- base$/m);
    assert.match(src, /^ {2}- veteran$/m);
    assert.match(src, /^ {2}- captain$/m);
    assert.match(src, /^ {2}- elite$/m);
    assert.match(src, /^ {2}- master$/m);
  });

  test('elite threshold + reward defined', () => {
    assert.match(src, /^ {2}elite:[\s\S]*?kills_min:\s*18/m);
    assert.match(src, /elite:[\s\S]*?ability_unlock_tier:\s*r4/);
    assert.match(src, /elite:[\s\S]*?defense_mod_bonus:\s*2/);
  });

  test('master threshold + reward defined', () => {
    assert.match(src, /^ {2}master:[\s\S]*?kills_min:\s*35/m);
    assert.match(src, /master:[\s\S]*?ability_unlock_tier:\s*r5/);
    assert.match(src, /master:[\s\S]*?crit_chance_bonus:\s*5/);
  });

  test('job_archetype_bias schema anchor present (4 jobs)', () => {
    assert.match(src, /job_archetype_bias:/);
    assert.match(src, /^ {2}guerriero:/m);
    assert.match(src, /^ {2}esploratore:/m);
    assert.match(src, /^ {2}tessitore:/m);
    assert.match(src, /^ {2}custode:/m);
  });
});

describe('OD-027 + OD-031 — species_catalog.json Pack v2 merge', () => {
  const catPath = path.join(REPO_ROOT, 'data', 'core', 'species', 'species_catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));

  test('version + provenance + stats present', () => {
    // ADR-2026-05-15 Q1 Option A version sequence:
    //   v0.2.0 (PR #2262 Envelope B initial 15 species)
    //   v0.3.0 (Phase 1+2 — 53 species single SOT post legacy absorb)
    //   v0.3.1 (Phase 3 Path Quick — heuristic enrichment 38 legacy entries)
    // Accept >= 0.3.0 per Phase 1+ canonical state.
    assert.match(
      catalog.version,
      /^0\.3\.\d+$/,
      `catalog version must be 0.3.x (got ${catalog.version})`,
    );
    assert.ok(catalog.merged_at);
    assert.ok(catalog.source_provenance);
    assert.ok(catalog.stats);
    assert.equal(typeof catalog.stats.total_species, 'number');
  });

  test('53 species merged (15 lifecycle + 38 legacy residue) — ADR-2026-05-15 Phase 1', () => {
    assert.equal(catalog.stats.total_species, 53);
    assert.equal(catalog.catalog.length, 53);
  });

  test('Pack v2-full-plus metadata merged (10 species)', () => {
    const pack = catalog.catalog.filter((e) => e.source === 'pack-v2-full-plus');
    assert.equal(pack.length, 10, 'expected 10 species merged from Pack v2-full-plus');
  });

  test('Frattura Abissale + dune_stalker as stubs (5 species)', () => {
    const stubs = catalog.catalog.filter((e) => e.source === 'game-canonical-stub');
    assert.equal(stubs.length, 5);
  });

  test('Legacy YAML residue absorbed (38 species) — ADR-2026-05-15 Phase 1', () => {
    const legacy = catalog.catalog.filter((e) => e.source === 'legacy-yaml-merge');
    assert.equal(
      legacy.length,
      38,
      'expected 38 species absorbed from species.yaml + species_expansion.yaml',
    );
  });

  test('every entry has sentience_index assigned', () => {
    for (const entry of catalog.catalog) {
      assert.match(
        entry.sentience_index,
        /^T[0-6]$/,
        `${entry.species_id} sentience_index must be T0-T6, got ${entry.sentience_index}`,
      );
    }
  });

  test('every entry has Pack v2-plus schema fields', () => {
    const requiredFields = [
      'species_id',
      'scientific_name',
      'common_names',
      'classification',
      'functional_signature',
      'visual_description',
      'risk_profile',
      'interactions',
      'constraints',
      'sentience_index',
      'ecotypes',
      'trait_refs',
      'lifecycle_yaml',
      'source',
    ];
    for (const entry of catalog.catalog) {
      for (const field of requiredFields) {
        assert.ok(field in entry, `${entry.species_id} missing ${field}`);
      }
    }
  });

  test('lifecycle_yaml path points to existing YAML (when present)', () => {
    // ADR-2026-05-15 Phase 1: legacy-yaml-merge entries (38 species) have
    // lifecycle_yaml=null since no per-species lifecycle file exists.
    // Only 15 species (pack-v2-full-plus + game-canonical-stub) require lifecycle.
    for (const entry of catalog.catalog) {
      if (entry.lifecycle_yaml === null) {
        // legacy-yaml-merge: lifecycle missing by design (Phase 3 master-dd review may add)
        assert.equal(
          entry.source,
          'legacy-yaml-merge',
          `${entry.species_id} null lifecycle requires legacy source`,
        );
        continue;
      }
      const yamlPath = path.join(REPO_ROOT, entry.lifecycle_yaml);
      assert.ok(
        fs.existsSync(yamlPath),
        `${entry.species_id} lifecycle_yaml ${entry.lifecycle_yaml} must exist`,
      );
    }
  });
});

describe('OD-029 — neurons_bridge.csv expansion 13→50+', () => {
  const csvPath = path.join(REPO_ROOT, 'data', 'core', 'ancestors', 'neurons_bridge.csv');
  const src = fs.readFileSync(csvPath, 'utf8');
  const lines = src.trim().split('\n');
  const header = lines[0];
  const rows = lines.slice(1);

  test('CSV header preserved (tier,hint,effect,notes,source)', () => {
    assert.equal(header, 'tier,hint_ancestors_node,effect_short,notes,source_slug');
  });

  test('entries expanded ≥50 (was 13 in vault RFC v0.1)', () => {
    assert.ok(rows.length >= 50, `expected ≥50 entries, got ${rows.length}`);
  });

  test('all 6 tiers T1-T6 represented', () => {
    const tiers = new Set(rows.map((r) => r.split(',')[0]));
    for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) {
      assert.ok(tiers.has(t), `tier ${t} missing`);
    }
  });

  test('Dexterity branch entries present', () => {
    const dexEntries = rows.filter((r) => r.includes('Dexterity') || r.includes('DE '));
    assert.ok(dexEntries.length >= 8, `expected ≥8 Dexterity entries, got ${dexEntries.length}`);
  });

  test('Senses branch full coverage', () => {
    const sensesEntries = rows.filter((r) => r.includes('Senses') || /S[ESO] \d/.test(r));
    assert.ok(
      sensesEntries.length >= 25,
      `expected ≥25 Senses entries, got ${sensesEntries.length}`,
    );
  });
});

describe('OD-031 — Pack v2 ETL script exists + reproducible', () => {
  const etlPath = path.join(REPO_ROOT, 'tools', 'etl', 'merge_pack_v2_species.py');

  test('ETL script committed', () => {
    assert.ok(fs.existsSync(etlPath), 'merge_pack_v2_species.py must be in tools/etl/');
  });

  test('ETL script has main + parse_args', () => {
    const src = fs.readFileSync(etlPath, 'utf8');
    assert.match(src, /def main\(\)/);
    assert.match(src, /def parse_args/);
    assert.match(src, /OD-031/, 'script references OD-031 verdict');
  });
});
