const fs = require('node:fs/promises');
const path = require('node:path');
const { getMongoDatabase, checkMongoHealth } = require('../db/mongo');
const { buildCatalogMap } = require('../../../services/generation/speciesBuilder');

function normaliseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }
  return [];
}

async function readJsonFile(filePath, fallback = {}) {
  try {
    const buffer = await fs.readFile(filePath, 'utf8');
    return JSON.parse(buffer);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

function mapGlossaryFromTraits(docs) {
  const traits = {};
  docs.forEach((doc) => {
    const id = doc && (doc._id || doc.id || doc.trait_id);
    if (!id) return;
    const labels = doc.labels || {};
    const descriptions = doc.descriptions || {};
    traits[id] = {
      label_it: labels.it || labels.IT || labels['it-IT'] || labels.en || id,
      label_en: labels.en || labels.EN || labels['en-US'] || labels.it || id,
      description_it:
        descriptions.it || descriptions.IT || descriptions['it-IT'] || descriptions.en || null,
      description_en:
        descriptions.en || descriptions.EN || descriptions['en-US'] || descriptions.it || null,
    };
  });
  return { traits };
}

function mapCatalogFromTraits(docs) {
  const traits = {};
  docs.forEach((doc) => {
    if (!doc) return;
    const id = doc._id || doc.id || doc.trait_id;
    if (!id) return;
    const reference = doc.reference || {};
    traits[id] = {
      label: reference.label || (doc.labels && (doc.labels.it || doc.labels.en)) || id,
      tier: reference.tier ?? null,
      families: reference.families ?? [],
      energy_profile: reference.energy_profile || null,
      usage: reference.usage || null,
      selective_drive: reference.selective_drive || null,
      mutation: reference.mutation || null,
      synergies: reference.synergies ?? [],
      conflicts: reference.conflicts ?? [],
      environments: reference.environments ?? [],
      weakness: reference.weakness || null,
      usage_tags: doc.usage_tags ?? reference.usage_tags ?? [],
      species_affinity: doc.species_affinity ?? reference.species_affinity ?? [],
      completion_flags: doc.completion_flags ?? reference.completion_flags ?? {},
    };
  });
  return buildCatalogMap({ traits });
}

function injectPoolMetadata(payload) {
  if (!payload || typeof payload !== 'object') {
    return { pools: [] };
  }

  const manifestMetadata =
    payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  const schemaVersion =
    manifestMetadata.schema_version ??
    (Object.prototype.hasOwnProperty.call(payload, 'schema_version')
      ? payload.schema_version
      : null);
  const updatedAt =
    manifestMetadata.updated_at ??
    (Object.prototype.hasOwnProperty.call(payload, 'updated_at') ? payload.updated_at : null);

  const pools = Array.isArray(payload.pools) ? payload.pools : [];
  const poolsWithMetadata = pools.map((pool) => {
    if (!pool || typeof pool !== 'object') {
      return pool;
    }
    const metadata = { ...(pool.metadata || {}) };
    if (schemaVersion && !metadata.schema_version) {
      metadata.schema_version = schemaVersion;
    }
    if (updatedAt && !metadata.updated_at) {
      metadata.updated_at = updatedAt;
    }
    return {
      ...pool,
      metadata,
    };
  });

  return { ...payload, pools: poolsWithMetadata };
}

function mapBiomePool(doc) {
  if (!doc) return null;
  const traits = doc.traits || {};
  const templates = Array.isArray(doc.role_templates) ? doc.role_templates : [];
  return {
    id: doc._id || doc.id,
    label: doc.label || null,
    summary: doc.summary || null,
    climate_tags: normaliseList(doc.climate_tags),
    size: doc.size || null,
    hazard: doc.hazard || null,
    ecology: doc.ecology || null,
    traits: {
      core: normaliseList(traits.core),
      support: normaliseList(traits.support),
    },
    role_templates: templates.map((entry) => ({
      role: entry.role,
      label: entry.label || null,
      summary: entry.summary || null,
      functional_tags: normaliseList(entry.functional_tags),
      preferred_traits: normaliseList(entry.preferred_traits),
      tier: entry.tier ?? null,
    })),
    metadata: doc.metadata || undefined,
  };
}

async function loadBiomePoolsFromMongo(db) {
  const cursor = db.collection('biome_pools').find({});
  const docs = await cursor.toArray();
  const pools = docs.map(mapBiomePool).filter(Boolean);
  return injectPoolMetadata({ pools });
}

async function loadTraitGlossaryFromMongo(db) {
  const cursor = db.collection('traits').find({}, { projection: { labels: 1, descriptions: 1 } });
  const docs = await cursor.toArray();
  return mapGlossaryFromTraits(docs);
}

async function loadTraitCatalogFromMongo(db) {
  const cursor = db.collection('traits').find(
    {},
    {
      projection: {
        labels: 1,
        reference: 1,
        usage_tags: 1,
        species_affinity: 1,
        completion_flags: 1,
      },
    },
  );
  const docs = await cursor.toArray();
  return mapCatalogFromTraits(docs);
}

function createCatalogService(options = {}) {
  const dataRoot = options.dataRoot || path.resolve(__dirname, '..', '..', 'data');
  const traitGlossaryPath =
    options.traitGlossaryPath || path.join(dataRoot, 'core', 'traits', 'glossary.json');
  const biomePoolsPath =
    options.biomePoolsPath || path.join(dataRoot, 'core', 'traits', 'biome_pools.json');
  const traitCatalogPath =
    options.traitCatalogPath ||
    path.resolve(__dirname, '..', '..', 'docs', 'catalog', 'catalog_data.json');
  const logger = options.logger || console;
  const useMongo = options.useMongo !== false;
  const mongoOptions = options.mongo || {};

  let cache = null;
  let cacheSource = null;

  async function loadFromMongo() {
    const db = await getMongoDatabase(mongoOptions);
    const [glossary, pools, catalog] = await Promise.all([
      loadTraitGlossaryFromMongo(db),
      loadBiomePoolsFromMongo(db),
      loadTraitCatalogFromMongo(db),
    ]);
    return { traitGlossary: glossary, biomePools: pools, traitCatalog: catalog, source: 'mongo' };
  }

  async function loadFromDisk() {
    const [glossary, pools, catalogPayload] = await Promise.all([
      readJsonFile(traitGlossaryPath, { traits: {} }),
      readJsonFile(biomePoolsPath, { pools: [] }),
      readJsonFile(traitCatalogPath, { traits: {} }),
    ]);
    const biomePools = injectPoolMetadata(pools);
    const traitCatalog = buildCatalogMap(catalogPayload);
    return { traitGlossary: glossary, biomePools, traitCatalog, source: 'local' };
  }

  async function ensureData() {
    if (cache) {
      return cache;
    }
    if (useMongo) {
      try {
        cache = await loadFromMongo();
        cacheSource = cache.source;
        return cache;
      } catch (error) {
        logger.warn('[catalog] caricamento da MongoDB fallito, uso fallback locale', {
          error: error && error.message ? error.message : error,
        });
      }
    }
    cache = await loadFromDisk();
    cacheSource = cache.source;
    return cache;
  }

  async function loadTraitGlossary() {
    const data = await ensureData();
    return data.traitGlossary;
  }

  async function loadBiomePools() {
    const data = await ensureData();
    return data.biomePools;
  }

  async function loadTraitCatalog() {
    const data = await ensureData();
    return data.traitCatalog;
  }

  async function reload() {
    cache = null;
    cacheSource = null;
    return ensureData();
  }

  async function ensureReady() {
    const data = await ensureData();
    return {
      source: cacheSource,
      traitCount: data.traitCatalog instanceof Map ? data.traitCatalog.size : 0,
      poolCount: Array.isArray(data.biomePools?.pools) ? data.biomePools.pools.length : 0,
    };
  }

  async function healthCheck() {
    if (!useMongo) {
      return { ok: true, source: 'local' };
    }
    const result = await checkMongoHealth(mongoOptions);
    if (!result.ok) {
      return { ok: false, source: 'mongo', error: result.error };
    }
    return { ok: true, source: 'mongo' };
  }

  function getSource() {
    return cacheSource;
  }

  return {
    loadTraitGlossary,
    loadBiomePools,
    loadTraitCatalog,
    reload,
    ensureReady,
    healthCheck,
    getSource,
  };
}

module.exports = {
  createCatalogService,
  mapGlossaryFromTraits,
  mapCatalogFromTraits,
  mapBiomePool,
};
