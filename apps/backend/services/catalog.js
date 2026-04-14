const fs = require('node:fs/promises');
const path = require('node:path');
const { buildCatalogMap } = require('../../../services/generation/speciesBuilder');

const DEFAULT_HTTP_TIMEOUT_MS = 5000;
const DEFAULT_HTTP_TTL_MS = 5 * 60 * 1000;
const HTTP_GLOSSARY_PATH = '/api/traits/glossary';

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

async function fetchRemoteGlossary(httpBase, fetchFn, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${httpBase.replace(/\/$/, '')}${HTTP_GLOSSARY_PATH}`;
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response || !response.ok) {
      const status = response ? response.status : 'no-response';
      throw new Error(`game-database glossary HTTP ${status}`);
    }
    const payload = await response.json();
    const docs = Array.isArray(payload?.traits)
      ? payload.traits
      : Array.isArray(payload?.docs)
        ? payload.docs
        : Array.isArray(payload)
          ? payload
          : [];
    return mapGlossaryFromTraits(docs);
  } finally {
    clearTimeout(timer);
  }
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

function createCatalogService(options = {}) {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const dataRoot = options.dataRoot || path.join(repoRoot, 'data');
  const traitGlossaryPath =
    options.traitGlossaryPath || path.join(dataRoot, 'core', 'traits', 'glossary.json');
  const biomePoolsPath =
    options.biomePoolsPath || path.join(dataRoot, 'core', 'traits', 'biome_pools.json');
  const traitCatalogPath =
    options.traitCatalogPath || path.join(repoRoot, 'docs', 'catalog', 'catalog_data.json');

  // Game-Database HTTP integration (Alternative B of ADR-2026-04-14).
  // Default OFF: when httpEnabled is false, the service behaves exactly as
  // before and reads everything from local files. When ON, the trait glossary
  // is fetched from ${httpBase}${HTTP_GLOSSARY_PATH} with a TTL cache; on any
  // failure the local file is used as fallback and lastSource reflects that.
  const httpEnabled = Boolean(options.httpEnabled);
  const httpBase = options.httpBase || null;
  const httpTimeoutMs = Number.isFinite(options.httpTimeoutMs)
    ? options.httpTimeoutMs
    : DEFAULT_HTTP_TIMEOUT_MS;
  const httpTtlMs = Number.isFinite(options.httpTtlMs) ? options.httpTtlMs : DEFAULT_HTTP_TTL_MS;
  const httpFetch =
    options.httpFetch ||
    (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
  const logger = options.logger || console;

  let cache = null;
  let cacheExpiresAt = 0;
  let lastSource = null;

  async function loadGlossarySource() {
    if (httpEnabled && httpBase && httpFetch) {
      try {
        const remote = await fetchRemoteGlossary(httpBase, httpFetch, httpTimeoutMs);
        return { glossary: remote, source: 'http' };
      } catch (error) {
        logger.warn(
          '[catalog] game-database glossary HTTP fetch failed, falling back to local file:',
          error && error.message ? error.message : error,
        );
        const localGlossary = await readJsonFile(traitGlossaryPath, { traits: {} });
        return { glossary: localGlossary, source: 'local-fallback' };
      }
    }
    const localGlossary = await readJsonFile(traitGlossaryPath, { traits: {} });
    return { glossary: localGlossary, source: 'local' };
  }

  async function loadCatalog() {
    const [glossaryResult, pools, catalogPayload] = await Promise.all([
      loadGlossarySource(),
      readJsonFile(biomePoolsPath, { pools: [] }),
      readJsonFile(traitCatalogPath, { traits: {} }),
    ]);
    const biomePools = injectPoolMetadata(pools);
    const traitCatalog = buildCatalogMap(catalogPayload);
    lastSource = glossaryResult.source;
    return {
      traitGlossary: glossaryResult.glossary,
      biomePools,
      traitCatalog,
      source: glossaryResult.source,
    };
  }

  function isCacheValid() {
    if (!cache) return false;
    if (httpTtlMs <= 0) return false;
    return Date.now() < cacheExpiresAt;
  }

  async function ensureData() {
    if (isCacheValid()) {
      return cache;
    }
    cache = await loadCatalog();
    cacheExpiresAt = httpTtlMs > 0 ? Date.now() + httpTtlMs : 0;
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
    cacheExpiresAt = 0;
    return ensureData();
  }

  async function ensureReady() {
    const data = await ensureData();
    return {
      source: data.source || lastSource || 'local',
      traitCount: data.traitCatalog instanceof Map ? data.traitCatalog.size : 0,
      poolCount: Array.isArray(data.biomePools?.pools) ? data.biomePools.pools.length : 0,
    };
  }

  async function healthCheck() {
    if (!httpEnabled) {
      return { ok: true, source: 'local' };
    }
    try {
      const data = await ensureData();
      return {
        ok: true,
        source: data.source || lastSource || 'local',
        httpBase,
      };
    } catch (error) {
      return {
        ok: false,
        source: 'error',
        error: error && error.message ? error.message : String(error),
      };
    }
  }

  function getSource() {
    return lastSource || 'local';
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
