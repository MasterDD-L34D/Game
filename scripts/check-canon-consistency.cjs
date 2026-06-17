// Canon-consistency checker (G3) -- cross-entity semantic gate beyond schema.
// Spec: docs/superpowers/specs/2026-06-17-canon-consistency-checker-design.md
// Rule-registry: each rule is a pure (index) -> Violation[]. Driven by TDD.
'use strict';

// Violation: { rule, severity, entity, ref, message }

function rulePromotionLadderMonotonic(index) {
  const violations = [];
  const ladder = (index.promotions && index.promotions.tier_ladder) || [];
  const thresholds = (index.promotions && index.promotions.thresholds) || {};
  let prev = -Infinity;
  for (const tier of ladder) {
    const th = thresholds[tier];
    if (!th || th.kills_min == null) continue; // base/unthresholded tiers skip
    if (th.kills_min <= prev) {
      violations.push({
        rule: 'promotion-ladder-monotonic',
        severity: 'error',
        entity: tier,
        ref: `kills_min=${th.kills_min}`,
        message: `kills_min ${th.kills_min} for '${tier}' is not strictly greater than the previous tier (${prev})`,
      });
    }
    prev = th.kills_min;
  }
  return violations;
}

function ruleBiomeRefs(index) {
  const violations = [];
  const biomeIds = index.biomeIds || new Set();
  for (const sp of index.species || []) {
    const aff = sp.biome_affinity;
    if (typeof aff === 'string' && aff && !biomeIds.has(aff)) {
      violations.push({
        rule: 'biome-refs',
        severity: 'error',
        entity: sp.species_id,
        ref: aff,
        message: `species '${sp.species_id}' biome_affinity '${aff}' not in biomes.yaml`,
      });
    }
  }
  for (const c of index.packCreatures || []) {
    for (const b of c.biomes || []) {
      if (!biomeIds.has(b)) {
        violations.push({
          rule: 'biome-refs',
          severity: 'error',
          entity: c.id,
          ref: b,
          message: `pack creature '${c.id}' biome '${b}' not in biomes.yaml`,
        });
      }
    }
  }
  return violations;
}

function ruleJobBiasEnum(index) {
  const violations = [];
  const jobIds = index.jobIds || new Set();
  for (const c of index.packCreatures || []) {
    for (const j of c.jobs_bias || []) {
      if (!jobIds.has(j)) {
        violations.push({
          rule: 'job-bias-enum',
          severity: 'error',
          entity: c.id,
          ref: j,
          message: `pack creature '${c.id}' jobs_bias '${j}' not in jobs.yaml`,
        });
      }
    }
  }
  return violations;
}

function ruleSynergyConflictClosure(index) {
  const violations = [];
  const slugs = index.glossarySlugs || new Set();
  for (const t of index.indexTraits || []) {
    const id = t.id;
    for (const s of t.sinergie || []) {
      if (!slugs.has(s)) {
        violations.push({
          rule: 'synergy-conflict-closure',
          severity: 'error',
          entity: id,
          ref: s,
          message: `trait '${id}' synergy '${s}' not in glossary`,
        });
      }
    }
    for (const c of t.conflitti || []) {
      if (c === id) {
        violations.push({
          rule: 'synergy-conflict-closure',
          severity: 'error',
          entity: id,
          ref: c,
          message: `trait '${id}' lists itself as a conflict`,
        });
      } else if (!slugs.has(c)) {
        violations.push({
          rule: 'synergy-conflict-closure',
          severity: 'error',
          entity: id,
          ref: c,
          message: `trait '${id}' conflict '${c}' not in glossary`,
        });
      }
    }
  }
  return violations;
}

// Union of trait slugs referenced by canon: catalog trait_refs + pack genetic_traits
// (core/optional/synergy) + index synergy/conflict edges.
function referencedTraitSlugs(index) {
  const refs = new Set();
  for (const sp of index.species || []) {
    for (const r of sp.trait_refs || []) refs.add(r);
  }
  for (const c of index.packCreatures || []) {
    const g = c.genetic_traits || {};
    for (const k of ['core', 'optional', 'synergy']) {
      for (const r of g[k] || []) refs.add(r);
    }
  }
  for (const t of index.indexTraits || []) {
    for (const s of t.sinergie || []) refs.add(s);
    for (const c of t.conflitti || []) refs.add(c);
  }
  return refs;
}

function ruleI18nCoverage(index) {
  const violations = [];
  const gt = index.glossaryTraits || {};
  // Scope = referenced traits that exist in glossary but lack a label.
  // (A referenced slug absent from glossary is an existence issue -- rule-3 /
  //  the existing trait_refs guard -- not an i18n-coverage concern.)
  for (const slug of referencedTraitSlugs(index)) {
    const entry = gt[slug];
    if (!entry) continue;
    if (!entry.label_it || !entry.label_en) {
      violations.push({
        rule: 'i18n-coverage',
        severity: 'error',
        entity: slug,
        ref: null,
        message: `referenced trait '${slug}' missing label_it or label_en in glossary`,
      });
    }
  }
  return violations;
}

// Rule registry. Add/remove a rule by editing this array.
const RULES = [
  { id: 'biome-refs', severity: 'error', run: ruleBiomeRefs },
  { id: 'job-bias-enum', severity: 'error', run: ruleJobBiasEnum },
  { id: 'synergy-conflict-closure', severity: 'error', run: ruleSynergyConflictClosure },
  { id: 'promotion-ladder-monotonic', severity: 'error', run: rulePromotionLadderMonotonic },
  { id: 'i18n-coverage', severity: 'error', run: ruleI18nCoverage },
];

function runRules(index) {
  const out = [];
  for (const rule of RULES) {
    for (const v of rule.run(index)) out.push(v);
  }
  return out;
}

function violationKey(v) {
  return `${v.rule}::${v.entity}::${v.ref}`;
}

function partitionByBaseline(violations, baseline) {
  const baselineKeys = new Set((baseline || []).map((b) => `${b.rule}::${b.entity}::${b.ref}`));
  const newViolations = [];
  const baselinedViolations = [];
  for (const v of violations) {
    if (baselineKeys.has(violationKey(v))) baselinedViolations.push(v);
    else newViolations.push(v);
  }
  return { newViolations, baselinedViolations };
}

// ---- Index loader (real canon files) ----------------------------------------
function loadCanonIndex({ datasetRoot }) {
  const fs = require('node:fs');
  const path = require('node:path');
  const yaml = require('js-yaml');
  const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(datasetRoot, rel), 'utf8'));
  const readYaml = (rel) => yaml.load(fs.readFileSync(path.join(datasetRoot, rel), 'utf8'));

  const catalog = readJson('data/core/species/species_catalog.json').catalog || [];
  const biomes = readYaml('packs/evo_tactics_pack/data/biomes.yaml').biomes || {};
  const jobs = readYaml('data/core/jobs.yaml').jobs || {};
  const promotions = readYaml('data/core/promotions/promotions.yaml') || {};
  const glossaryTraits = readJson('data/core/traits/glossary.json').traits || {};
  const indexTraitsRaw = readJson('data/traits/index.json').traits || {};
  const indexTraits = Object.entries(indexTraitsRaw).map(([id, t]) => ({
    id,
    sinergie: t.sinergie || [],
    conflitti: t.conflitti || [],
  }));

  // Pack creature YAMLs (recursive). Skip non-creature stubs gracefully (rules
  // ignore absent fields); collect id + biomes + jobs_bias + genetic_traits.
  const packDir = path.join(datasetRoot, 'packs/evo_tactics_pack/data/species');
  const packCreatures = [];
  const walk = fs.readdirSync(packDir, { recursive: true });
  for (const rel of walk) {
    if (!String(rel).endsWith('.yaml')) continue;
    const full = path.join(packDir, String(rel));
    let d;
    try {
      d = yaml.load(fs.readFileSync(full, 'utf8'));
    } catch {
      continue;
    }
    if (!d || typeof d !== 'object') continue;
    packCreatures.push({
      id: d.id || String(rel),
      biomes: d.biomes || [],
      jobs_bias: d.jobs_bias || [],
      genetic_traits: d.genetic_traits || {},
    });
  }

  return {
    species: catalog,
    packCreatures,
    biomeIds: new Set(Object.keys(biomes)),
    jobIds: new Set(Object.keys(jobs)),
    glossaryTraits,
    glossarySlugs: new Set(Object.keys(glossaryTraits)),
    indexTraits,
    promotions,
  };
}

function summarize(violations) {
  const byRule = {};
  for (const v of violations) byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  return { total: violations.length, byRule };
}

function checkCanonConsistency({ datasetRoot, baselinePath }) {
  const fs = require('node:fs');
  const index = loadCanonIndex({ datasetRoot });
  const violations = runRules(index);
  let baseline = [];
  if (baselinePath && fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')).baseline || [];
  }
  const { newViolations, baselinedViolations } = partitionByBaseline(violations, baseline);
  return {
    violations,
    newViolations,
    baselinedViolations,
    summary: { all: summarize(violations), new: summarize(newViolations) },
  };
}

module.exports = {
  rulePromotionLadderMonotonic,
  ruleBiomeRefs,
  ruleJobBiasEnum,
  ruleSynergyConflictClosure,
  ruleI18nCoverage,
  runRules,
  partitionByBaseline,
  violationKey,
  loadCanonIndex,
  checkCanonConsistency,
  RULES,
};

// ---- CLI --------------------------------------------------------------------
if (require.main === module) {
  const fs = require('node:fs');
  const path = require('node:path');
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const val = (f, d) => {
    const i = args.indexOf(f);
    return i >= 0 && args[i + 1] ? args[i + 1] : d;
  };
  const datasetRoot = path.resolve(val('--dataset-root', process.cwd()));
  const baselinePath = path.resolve(
    val('--baseline', path.join(datasetRoot, 'data/core/canon-consistency-baseline.json')),
  );

  const index = loadCanonIndex({ datasetRoot });
  const violations = runRules(index);

  if (has('--write-baseline')) {
    const baseline = violations.map((v) => ({ rule: v.rule, entity: v.entity, ref: v.ref }));
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          generated_at: null,
          note: 'Accepted known violations -- gate enforces NO NEW. Shrink as debt closes.',
          baseline,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `[canon-consistency] wrote baseline: ${baseline.length} entries -> ${baselinePath}`,
    );
    process.exit(0);
  }

  const { newViolations, summary } = checkCanonConsistency({ datasetRoot, baselinePath });
  console.log(
    `[canon-consistency] total=${summary.all.total} baselined=${summary.all.total - summary.new.total} new=${summary.new.total}`,
  );
  console.log(`  by-rule (all): ${JSON.stringify(summary.all.byRule)}`);
  if (newViolations.length) {
    console.error(
      `::error::canon-consistency: ${newViolations.length} NEW violation(s) (not in baseline):`,
    );
    for (const v of newViolations.slice(0, 50)) {
      console.error(`  [${v.rule}] ${v.entity} -> ${v.ref}: ${v.message}`);
    }
    process.exit(1);
  }
  console.log('[canon-consistency] OK -- no new violations.');
  process.exit(0);
}
