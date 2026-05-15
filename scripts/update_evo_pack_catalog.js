#!/usr/bin/env node

/**
 * Regenerates the Evo Tactics pack catalog with the enriched structure
 * expected by the web generator. The script augments the base catalog
 * with biome metadata, detailed species information and produces
 * species-level registry files for on-demand loading.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PACK_ROOT = path.join(REPO_ROOT, 'packs', 'evo_tactics_pack');

function parseArgs(argv) {
  const args = { packRoot: DEFAULT_PACK_ROOT, metaEcosystem: null };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--pack-root' && argv[index + 1]) {
      args.packRoot = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (current === '--meta-ecosystem' && argv[index + 1]) {
      args.metaEcosystem = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return args;
}

const { packRoot, metaEcosystem } = parseArgs(process.argv.slice(2));
const PACK_ROOT = packRoot;
const PACK_DOCS_DIR = path.join(PACK_ROOT, 'docs', 'catalog');
const CATALOG_PATH = path.join(PACK_DOCS_DIR, 'catalog_data.json');
const META_ECOSYSTEM_PATH =
  metaEcosystem || path.join(PACK_ROOT, 'data', 'ecosistemi', 'meta_ecosistema_alpha.yaml');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function titleCase(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function uniqueSorted(array) {
  return Array.from(new Set(array.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function relativeFromCatalog(targetPath) {
  const relative = path.relative(PACK_DOCS_DIR, targetPath);
  return relative.split(path.sep).join('/');
}

function normaliseHazards(events) {
  const list = uniqueSorted(Array.isArray(events) ? events : []);
  if (!list.length) {
    return null;
  }
  let severity = 'low';
  if (list.length >= 5) {
    severity = 'high';
  } else if (list.length >= 3) {
    severity = 'medium';
  }
  return { severity, tags: list };
}

function deriveBiomeMetrics(data) {
  const terrain = data?.ecosistema?.morfologia?.forme_terreno;
  const resources = data?.ecosistema?.servizi_ecosistemici?.approvvigionamento;
  const zoneCount = Array.isArray(terrain) ? terrain.length : null;
  const resourceRichness = Array.isArray(resources) ? resources.length : null;
  if (zoneCount === null && resourceRichness === null) {
    return null;
  }
  const metrics = {};
  if (zoneCount !== null) metrics.zoneCount = zoneCount;
  if (resourceRichness !== null) metrics.resourceRichness = resourceRichness;
  return metrics;
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cleanObject(entry)).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      const cleaned = cleanObject(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  if (value === undefined) {
    return undefined;
  }
  return value;
}

function extractSpeciesSummary(entry) {
  return cleanObject({
    id: entry.id,
    display_name: entry.display_name,
    role_trofico: entry.role_trofico,
    functional_tags: entry.functional_tags,
    flags: entry.flags,
    biomes: entry.biomes,
    balance: entry.balance,
    morphotype: entry.morphotype ?? null,
    jobs_bias: entry.jobs_bias ?? null,
    hazards_expected: entry.hazards_expected ?? null,
    playable_unit: entry.playable_unit ?? null,
    path: entry.path,
  });
}

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error('catalog_data.json non trovato.');
  }

  const catalog = readJson(CATALOG_PATH);
  const ecosystemMeta = loadYaml(META_ECOSYSTEM_PATH);

  const biomeMetaById = new Map();
  const biomeDetailsById = new Map();

  const metaBiomes = ecosystemMeta?.ecosistema?.biomi ?? [];
  metaBiomes.forEach((entry) => {
    const filePath = path.resolve(REPO_ROOT, entry.path);
    if (!fs.existsSync(filePath)) {
      return;
    }
    const biomeId = path.basename(entry.path).replace(/\.biome\.yaml$/, '');
    biomeMetaById.set(biomeId, entry);
    const biomeYaml = loadYaml(filePath) ?? {};
    const label = biomeYaml?.ecosistema?.metadati?.nome ?? titleCase(entry.biome_id ?? biomeId);
    const description = biomeYaml?.ecosistema?.bioma?.note ?? null;
    const hazards = biomeYaml?.ecosistema?.clima?.estremi_e_rischi?.eventi ?? [];
    const hazard = normaliseHazards(hazards);
    const metrics = deriveBiomeMetrics(biomeYaml);
    biomeDetailsById.set(biomeId, {
      label,
      description,
      hazard,
      metrics,
    });
  });

  if (Array.isArray(catalog?.ecosistema?.biomi)) {
    catalog.ecosistema.biomi = catalog.ecosistema.biomi.map((entry) => {
      const biomeId = entry?.id ?? '';
      const meta = biomeMetaById.get(biomeId) ?? null;
      const details = biomeDetailsById.get(biomeId) ?? null;
      return cleanObject({
        ...entry,
        label: details?.label ?? titleCase(biomeId),
        network_id: meta?.id ?? null,
        biome_profile: meta?.biome_id ?? null,
        weight: meta?.weight ?? null,
      });
    });
  }

  const speciesDetails = new Map();
  const nowIso = new Date().toISOString();

  const enrichSpecies = (species) => {
    if (!species?.path) {
      return cleanObject(species);
    }
    const speciesPath = path.resolve(path.dirname(CATALOG_PATH), species.path);
    if (!fs.existsSync(speciesPath)) {
      return cleanObject(species);
    }
    const speciesYaml = loadYaml(speciesPath) ?? {};
    const hazards = speciesYaml?.environment_affinity?.hazards_expected ?? [];
    const jobsBias = speciesYaml?.derived_from_environment?.jobs_bias ?? [];
    const enriched = {
      ...species,
      display_name:
        species.display_name ?? speciesYaml?.display_name ?? titleCase(species.id ?? 'specie'),
      balance: cleanObject(speciesYaml?.balance ?? species.balance ?? null) ?? null,
      playable_unit: speciesYaml?.playable_unit ?? false,
      morphotype: speciesYaml?.morphotype ?? null,
      vc: cleanObject(speciesYaml?.vc ?? null) ?? null,
      spawn_rules: cleanObject(speciesYaml?.spawn_rules ?? null) ?? null,
      environment_affinity: cleanObject(speciesYaml?.environment_affinity ?? null) ?? null,
      hazards_expected: uniqueSorted(hazards),
      derived_from_environment: cleanObject(speciesYaml?.derived_from_environment ?? null) ?? null,
      jobs_bias: uniqueSorted(jobsBias),
      telemetry: cleanObject(speciesYaml?.telemetry ?? null) ?? null,
      genetic_traits: cleanObject(speciesYaml?.genetic_traits ?? null) ?? null,
      services_links: cleanObject(speciesYaml?.services_links ?? null) ?? null,
      description: speciesYaml?.description ?? null,
      receipt: cleanObject(speciesYaml?.receipt ?? null) ?? null,
      last_synced_at: nowIso,
    };
    speciesDetails.set(enriched.id, cleanObject(enriched));
    return cleanObject(enriched);
  };

  if (Array.isArray(catalog?.species)) {
    catalog.species = catalog.species.map((entry) => enrichSpecies(entry));
  }

  if (Array.isArray(catalog?.biomi)) {
    catalog.biomi = catalog.biomi.map((biome) => {
      const biomeId = biome?.id ?? '';
      const details = biomeDetailsById.get(biomeId) ?? null;
      const manifest = { ...(biome?.manifest ?? {}) };
      const manifestPath = path.join(PACK_ROOT, 'data', 'ecosystems', `${biomeId}.manifest.yaml`);
      if (fs.existsSync(manifestPath)) {
        manifest.path = relativeFromCatalog(manifestPath);
      }
      const updatedSpecies = Array.isArray(biome?.species)
        ? biome.species.map((sp) => speciesDetails.get(sp.id) ?? enrichSpecies(sp))
        : [];
      return cleanObject({
        ...biome,
        label: details?.label ?? titleCase(biomeId),
        description: details?.description ?? null,
        hazard: details?.hazard ?? null,
        metrics: details?.metrics ?? null,
        manifest,
        species: updatedSpecies,
      });
    });
  }

  catalog.generated_at = nowIso;

  writeJson(CATALOG_PATH, cleanObject(catalog));

  // Generate species registry files.
  const speciesOutputDir = path.join(PACK_DOCS_DIR, 'species');
  fs.mkdirSync(speciesOutputDir, { recursive: true });

  const speciesSummaries = [];
  for (const [speciesId, data] of speciesDetails.entries()) {
    writeJson(path.join(speciesOutputDir, `${speciesId}.json`), data);
    speciesSummaries.push(extractSpeciesSummary(data));
  }

  speciesSummaries.sort((a, b) => a.id.localeCompare(b.id));

  const speciesIndex = {
    schema_version: '1.0',
    generated_at: nowIso,
    total_species: speciesSummaries.length,
    species: speciesSummaries,
  };

  writeJson(path.join(speciesOutputDir, 'index.json'), speciesIndex);

  // Fallback index for docs/public mirrors.
  writeJson(path.join(PACK_DOCS_DIR, 'species-index.json'), speciesIndex);

  // ADR-2026-05-15 Phase 4d Scope A — emit canonical index from species_catalog.json
  // (53 species single SOT post Phase 1-4c.7). Parallel to species-index.json
  // (Pack v2 subset 21). Game-Database build-time import opt-in via separate
  // configuration to consume canonical 53-entry shape.
  // Catalog schema v0.4.x — see tools/etl/merge_pack_v2_species.py.
  const CANONICAL_CATALOG_PATH = path.join(
    REPO_ROOT,
    'data',
    'core',
    'species',
    'species_catalog.json',
  );
  if (fs.existsSync(CANONICAL_CATALOG_PATH)) {
    const canonical = readJson(CANONICAL_CATALOG_PATH);
    const catalogEntries = Array.isArray(canonical.catalog) ? canonical.catalog : [];
    const canonicalIndex = {
      schema_version: canonical.version || '0.4.x',
      generated_at: nowIso,
      source: 'data/core/species/species_catalog.json',
      total_species: catalogEntries.length,
      stats: canonical.stats || {},
      // ADR-2026-05-15 Phase 4d Scope A — exposing full 53 canonical entries
      // with rich schema (clade_tag, role_tags, ecology, default_parts,
      // biome_affinity, legacy_slug, genus, epithet, sentience_index).
      species: catalogEntries.map((entry) => ({
        species_id: entry.species_id,
        legacy_slug: entry.legacy_slug,
        scientific_name: entry.scientific_name,
        common_names: entry.common_names || [],
        display_name_it: (entry.common_names && entry.common_names[0]) || entry.scientific_name,
        classification: entry.classification || {},
        clade_tag: entry.clade_tag,
        role_tags: entry.role_tags || [],
        ecotypes: entry.ecotypes || [],
        biome_affinity: entry.biome_affinity,
        sentience_index: entry.sentience_index,
        risk_profile: entry.risk_profile || {},
        functional_signature: entry.functional_signature || '',
        visual_description: entry.visual_description || '',
        interactions: entry.interactions || {},
        ecology: entry.ecology || null,
        pack_size: entry.pack_size || null,
        default_parts: entry.default_parts || null,
        trait_refs: entry.trait_refs || [],
        genus: entry.genus,
        epithet: entry.epithet,
        source: entry.source,
        lifecycle_yaml: entry.lifecycle_yaml,
      })),
      catalog_synergies: canonical.catalog_synergies || [],
    };
    writeJson(path.join(PACK_DOCS_DIR, 'species-canonical-index.json'), canonicalIndex);
  } else {
    console.warn(
      '[evo-pack-catalog] species_catalog.json not found, skipping Phase 4d Scope A canonical mirror emit',
    );
  }
}

main();
