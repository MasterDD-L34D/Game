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
  // biomeIds is the lowercased set of {canonical ids UNION aliases} (loadCanonIndex);
  // resolve refs case-insensitively so alias/case variants are not false-positives.
  const biomeIds = index.biomeIds || new Set();
  const has = (ref) => biomeIds.has(String(ref).toLowerCase());
  for (const sp of index.species || []) {
    const aff = sp.biome_affinity;
    if (typeof aff === 'string' && aff && !has(aff)) {
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
      if (!has(b)) {
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

// Normalise a species id so the hyphen (roster/pack) vs underscore (canonical
// catalog) convention does not produce false positives. Lowercase + '-' -> '_'.
function normSpeciesId(id) {
  return String(id == null ? '' : id)
    .toLowerCase()
    .replace(/-/g, '_');
}

// Rule (Phase B / inv1): every deployed-roster species (catalog_data.json) must
// be present in the canonical catalog (species_catalog.json, by species_id or
// legacy_slug) OR be flagged as an event. Catches roster entries that drift away
// from the canonical taxonomy without an event exemption.
function ruleRosterSpeciesCanon(index) {
  const violations = [];
  const canon = index.canonicalIds || new Set(); // normalised species_id UNION legacy_slug
  for (const sp of index.deployedRoster || []) {
    if (sp && sp.event) continue; // event species are allowed without a canonical entry
    if (!canon.has(normSpeciesId(sp && sp.id))) {
      violations.push({
        rule: 'roster-species-canon',
        severity: 'error',
        entity: sp && sp.id,
        ref: 'species_catalog.json',
        message: `deployed roster species '${sp && sp.id}' is neither in the canonical catalog nor flagged as an event`,
      });
    }
  }
  return violations;
}

// Rule (Phase B / inv3): for every ecosystem defined on BOTH the core
// (data/ecosystems) and pack (packs/.../data/ecosystems) sides, the trofico
// species roster must match. Catches stale/ghost species lingering in one source
// after a rename or deprecation (e.g. legacy_slug refs in the pack roster).
function ruleEcosystemRosterParity(index) {
  const violations = [];
  const rosters = index.ecosystemRosters || {};
  for (const [eco, sides] of Object.entries(rosters)) {
    const core = sides && sides.core;
    const pack = sides && sides.pack;
    if (!core || !pack) continue; // only compare ecosystems present on both sides
    for (const s of pack) {
      if (!core.has(s)) {
        violations.push({
          rule: 'ecosystem-roster-parity',
          severity: 'error',
          entity: eco,
          ref: s,
          message: `ecosystem '${eco}' species '${s}' is in the pack roster but not the core roster`,
        });
      }
    }
    for (const s of core) {
      if (!pack.has(s)) {
        violations.push({
          rule: 'ecosystem-roster-parity',
          severity: 'error',
          entity: eco,
          ref: s,
          message: `ecosystem '${eco}' species '${s}' is in the core roster but not the pack roster`,
        });
      }
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
  { id: 'roster-species-canon', severity: 'error', run: ruleRosterSpeciesCanon },
  { id: 'ecosystem-roster-parity', severity: 'error', run: ruleEcosystemRosterParity },
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
  // Resolvable biome refs = canonical ids UNION declared aliases, lowercased
  // (biomes.yaml `aliases:`). A ref is valid if it matches an id OR an alias,
  // case-insensitively -- aliases are a documented reference mechanism.
  const biomeIds = new Set();
  for (const [key, b] of Object.entries(biomes)) {
    biomeIds.add(String(key).toLowerCase());
    for (const a of (b && b.aliases) || []) biomeIds.add(String(a).toLowerCase());
  }
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

  // Deployed roster (catalog_data.json species[]): id + event flag. Optional.
  let rosterDoc = {};
  try {
    rosterDoc = readJson('packs/evo_tactics_pack/docs/catalog/catalog_data.json');
  } catch {
    rosterDoc = {};
  }
  const deployedRoster = (Array.isArray(rosterDoc.species) ? rosterDoc.species : []).map((sp) => ({
    id: sp && sp.id,
    event: !!(sp && sp.flags && sp.flags.event),
  }));

  // Canonical species ids (species_id UNION legacy_slug), normalised for the
  // hyphen/underscore convention so roster refs resolve.
  const canonicalIds = new Set();
  for (const sp of catalog) {
    if (sp && sp.species_id) canonicalIds.add(normSpeciesId(sp.species_id));
    if (sp && sp.legacy_slug) canonicalIds.add(normSpeciesId(sp.legacy_slug));
  }

  // Ecosystem trofico rosters per id, on the core and pack sides.
  const flattenRoster = (doc) => {
    const set = new Set();
    const tr = doc && doc.ecosistema && doc.ecosistema.trofico;
    if (!tr) return set;
    const add = (arr) => {
      for (const s of arr || []) set.add(s);
    };
    add(tr.produttori);
    const cons = tr.consumatori || {};
    add(cons.primari);
    add(cons.secondari);
    add(cons.terziari);
    add(tr.decompositori);
    return set;
  };
  const collectRosters = (dir) => {
    const out = {};
    const abs = path.join(datasetRoot, dir);
    if (!fs.existsSync(abs)) return out;
    for (const name of fs.readdirSync(abs)) {
      if (!String(name).endsWith('.ecosystem.yaml')) continue;
      const ecoId = String(name).replace(/\.ecosystem\.yaml$/, '');
      try {
        out[ecoId] = flattenRoster(readYaml(path.join(dir, name)));
      } catch {
        /* skip unreadable */
      }
    }
    return out;
  };
  const coreRosters = collectRosters('data/ecosystems');
  const packRosters = collectRosters('packs/evo_tactics_pack/data/ecosystems');
  const ecosystemRosters = {};
  for (const id of new Set([...Object.keys(coreRosters), ...Object.keys(packRosters)])) {
    ecosystemRosters[id] = { core: coreRosters[id] || null, pack: packRosters[id] || null };
  }

  return {
    species: catalog,
    packCreatures,
    biomeIds,
    jobIds: new Set(Object.keys(jobs)),
    glossaryTraits,
    glossarySlugs: new Set(Object.keys(glossaryTraits)),
    indexTraits,
    promotions,
    deployedRoster,
    canonicalIds,
    ecosystemRosters,
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
  ruleRosterSpeciesCanon,
  ruleEcosystemRosterParity,
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
