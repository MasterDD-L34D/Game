import { computed, reactive } from 'vue';

import type { NebulaDataset, NebulaSpecies } from '../types/nebula';

const CACHE_KEY = 'nebula-atlas-demo-cache-v1';

type LoadOptions = {
  force?: boolean;
};

const datasetState = reactive<NebulaDataset>({
  id: 'nebula-atlas',
  title: 'Nebula Atlas',
  summary: '',
  releaseWindow: '',
  curator: '',
  metrics: {
    species: 0,
    biomes: 0,
    encounters: 0,
  },
  highlights: [],
  species: [],
  biomes: [],
  encounters: [],
});

let loadPromise: Promise<NebulaDataset> | null = null;

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (error) {
    console.warn('[atlasDataset] impossibile accedere a localStorage', error);
  }
  return null;
}

function safeClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      console.warn('[atlasDataset] structuredClone non disponibile', error);
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normaliseNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normaliseDataset(payload: NebulaDataset): NebulaDataset {
  const clone = safeClone(payload);
  const highlights = Array.isArray(clone.highlights) ? [...clone.highlights] : [];
  const species = Array.isArray(clone.species) ? clone.species : [];
  const biomes = Array.isArray(clone.biomes) ? clone.biomes : [];
  const encounters = Array.isArray(clone.encounters) ? clone.encounters : [];
  const metrics = typeof clone.metrics === 'object' && clone.metrics !== null ? clone.metrics : {};

  return {
    ...clone,
    id: clone.id || 'nebula-atlas',
    title: clone.title || 'Nebula Atlas',
    summary: clone.summary || '',
    releaseWindow: typeof clone.releaseWindow === 'string' ? clone.releaseWindow : '',
    curator: typeof clone.curator === 'string' ? clone.curator : '',
    metrics: {
      ...metrics,
      species: normaliseNumber(metrics.species, species.length),
      biomes: normaliseNumber(metrics.biomes, biomes.length),
      encounters: normaliseNumber(metrics.encounters, encounters.length),
    },
    highlights,
    species,
    biomes,
    encounters,
  };
}

function hydrateDataset(payload: NebulaDataset) {
  const normalised = normaliseDataset(payload);
  Object.assign(datasetState, normalised);
}

function readCachedDataset(): NebulaDataset | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as NebulaDataset;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return normaliseDataset(parsed);
  } catch (error) {
    console.warn('[atlasDataset] cache demo non valida, si procede alla pulizia', error);
    try {
      storage.removeItem(CACHE_KEY);
    } catch (cleanupError) {
      console.warn('[atlasDataset] impossibile pulire la cache demo', cleanupError);
    }
    return null;
  }
}

function persistDataset(payload: NebulaDataset) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[atlasDataset] impossibile salvare la cache demo', error);
  }
}

async function importDemoDataset(): Promise<NebulaDataset> {
  const module = await import('../data/atlasDemoDataset');
  const dataset = (module.atlasDemoDataset || module.default) as NebulaDataset;
  return normaliseDataset(dataset);
}

export async function ensureAtlasDatasetLoaded(options: LoadOptions = {}): Promise<NebulaDataset> {
  if (loadPromise && !options.force) {
    return loadPromise;
  }

  const loader = (async () => {
    if (!options.force) {
      const cached = readCachedDataset();
      if (cached) {
        hydrateDataset(cached);
        return datasetState;
      }
    }

    const dataset = await importDemoDataset();
    hydrateDataset(dataset);
    persistDataset(dataset);
    return datasetState;
  })();

  loadPromise = loader.catch((error) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

export async function preloadAtlasDataset(): Promise<void> {
  if (loadPromise) {
    try {
      await loadPromise;
    } catch {
      /* ignorato */
    }
    return;
  }

  if (readCachedDataset()) {
    return;
  }

  try {
    const dataset = await importDemoDataset();
    persistDataset(dataset);
  } catch (error) {
    console.warn('[atlasDataset] prefetch dataset demo fallito', error);
  }
}

export const atlasDataset = datasetState;

export const atlasTotals = computed(() => ({
  species: datasetState.metrics?.species ?? datasetState.species.length,
  biomes: datasetState.metrics?.biomes ?? datasetState.biomes.length,
  encounters: datasetState.metrics?.encounters ?? datasetState.encounters.length,
}));

export const atlasActiveSpecies = computed<NebulaSpecies[]>(() =>
  datasetState.species.filter(
    (entry) => entry.readiness && !entry.readiness.toLowerCase().includes('richiede'),
  ),
);

export const atlasPendingApprovals = computed(() =>
  datasetState.encounters.filter(
    (encounter) =>
      typeof encounter.readiness === 'string' &&
      encounter.readiness.toLowerCase().includes('approvazione'),
  ),
);
