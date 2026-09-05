const DEFAULT_CATALOG_ENDPOINTS = {
  biomes: 'api/v1/catalog/biomes',
  ecosystem: 'api/v1/catalog/ecosystem',
  species: 'api/v1/catalog/species',
};

function ensureTrailingSlash(value) {
  if (!value) return value;
  return value.endsWith('/') ? value : `${value}/`;
}

function normaliseBase(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return ensureTrailingSlash(trimmed);
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // structuredClone not supported for this type, fallback below
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function readQueryOverride(windowRef) {
  if (!windowRef || !windowRef.location || typeof windowRef.location.search !== 'string') {
    return null;
  }
  try {
    const params = new URLSearchParams(windowRef.location.search);
    const candidate =
      params.get('api-base') ||
      params.get('catalog-api-base') ||
      params.get('catalog-base') ||
      params.get('evo-api-base');
    return normaliseBase(candidate);
  } catch (error) {
    console.warn("Impossibile analizzare l'override API base dalla query string", error);
    return null;
  }
}

function readMetaOverride(documentRef) {
  if (!documentRef || typeof documentRef.querySelector !== 'function') {
    return null;
  }
  const selectors = [
    'meta[name="evo-api-base"]',
    'meta[name="evo-tactics-api-base"]',
    'meta[name="catalog-api-base"]',
  ];
  for (const selector of selectors) {
    try {
      const content = documentRef.querySelector(selector)?.getAttribute('content');
      const normalised = normaliseBase(content);
      if (normalised) {
        return normalised;
      }
    } catch (error) {
      console.warn("Impossibile leggere il meta tag per l'override API base", selector, error);
    }
  }
  return null;
}

function readWindowOverride(windowRef) {
  if (!windowRef) return null;
  const candidates = [windowRef.__EVO_TACTICS_API_BASE__, windowRef.EVO_TACTICS_API_BASE];
  for (const value of candidates) {
    const normalised = normaliseBase(typeof value === 'function' ? value() : value);
    if (normalised) {
      return normalised;
    }
  }
  return null;
}

function resolveEndpointUrl(base, path) {
  if (typeof path !== 'string') {
    throw new Error('Percorso endpoint non valido');
  }
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error('Percorso endpoint vuoto');
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (base) {
    try {
      return new URL(trimmed, base).toString();
    } catch (error) {
      console.warn('Impossibile costruire URL endpoint', trimmed, base, error);
    }
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed}`;
}

function unwrapList(payload, keys) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function unwrapBiomes(payload) {
  return unwrapList(payload, ['biomes', 'biomi', 'data', 'results', 'items']);
}

function unwrapSpecies(payload) {
  return unwrapList(payload, ['species', 'data', 'results', 'items']);
}

function unwrapEcosystem(payload) {
  if (!payload) {
    return { biomi: [], connessioni: [] };
  }
  let result = payload;
  if (payload.ecosystem) {
    result = payload.ecosystem;
  } else if (payload.ecosistema) {
    result = payload.ecosistema;
  }
  const cloned = { ...result };
  cloned.biomi = Array.isArray(cloned.biomi) ? cloned.biomi : [];
  cloned.connessioni = Array.isArray(cloned.connessioni) ? cloned.connessioni : [];
  return cloned;
}

function flattenBiomeSpecies(biomes) {
  if (!Array.isArray(biomes) || !biomes.length) {
    return [];
  }
  const map = new Map();
  biomes.forEach((biome) => {
    if (!biome) return;
    const biomeId = biome.id;
    const speciesList = Array.isArray(biome.species) ? biome.species : [];
    speciesList.forEach((entry) => {
      if (!entry || !entry.id) return;
      const existing = map.get(entry.id);
      if (existing) {
        const biomesSet = new Set(existing.biomes || []);
        if (biomeId) {
          biomesSet.add(biomeId);
        }
        existing.biomes = Array.from(biomesSet);
        return;
      }
      const cloned = deepClone(entry);
      const biomesArray = Array.isArray(cloned.biomes) ? cloned.biomes.slice() : [];
      if (biomeId && !biomesArray.includes(biomeId)) {
        biomesArray.push(biomeId);
      }
      cloned.biomes = biomesArray;
      map.set(cloned.id, cloned);
    });
  });
  return Array.from(map.values());
}

const EMBEDDED_MINIMAL_CATALOG = {
  generated_at: '2024-01-01T00:00:00.000Z',
  ecosistema: {
    label: 'Rete sintetica dimostrativa',
    biomi: [
      {
        id: 'fallback-canopy',
        label: 'Canopy Aurora',
        biome_profile: 'canopy_demo',
        weight: 0.6,
      },
      {
        id: 'fallback-lagoon',
        label: 'Laguna Rifugio',
        biome_profile: 'lagoon_demo',
        weight: 0.4,
      },
    ],
    connessioni: [
      {
        from: 'fallback-canopy',
        to: 'fallback-lagoon',
        type: 'corridor',
        intensity: 0.5,
        notes: 'Connessione di cortesia tra i biomi embedded.',
      },
    ],
  },
  biomi: [
    {
      id: 'fallback-canopy',
      label: 'Canopy Aurora',
      summary: 'Habitat di cortesia per sessioni offline e test rapidi.',
      biome_class: 'canopy_demo',
      biome_profile: 'canopy_demo',
      species: [
        {
          id: 'aurora-scout',
          display_name: 'Scout Aurora',
          role_trofico: 'ricognitore_supporto',
          functional_tags: ['ricognizione', 'supporto_mobile'],
          flags: {
            apex: false,
            keystone: false,
            bridge: true,
            threat: false,
            event: false,
          },
          balance: { threat_tier: 'T1' },
        },
        {
          id: 'canopy-warden',
          display_name: 'Guardiano della Canopy',
          role_trofico: 'predatore_secondario',
          functional_tags: ['difesa', 'sentinella'],
          flags: {
            apex: true,
            keystone: true,
            bridge: false,
            threat: false,
            event: false,
          },
          balance: { threat_tier: 'T2' },
        },
      ],
    },
    {
      id: 'fallback-lagoon',
      label: 'Laguna Rifugio',
      summary: 'Bioma anfibio modulare caricato localmente come backup.',
      biome_class: 'lagoon_demo',
      biome_profile: 'lagoon_demo',
      species: [
        {
          id: 'tidal-sentinel',
          display_name: 'Sentinella delle Maree',
          role_trofico: 'sentinella_anfibia',
          functional_tags: ['controllo', 'supporto'],
          flags: {
            apex: false,
            keystone: true,
            bridge: false,
            threat: false,
            event: false,
          },
          balance: { threat_tier: 'T2' },
        },
        {
          id: 'lagoon-charger',
          display_name: 'Caricatore della Laguna',
          role_trofico: 'assaltatore',
          functional_tags: ['pressione', 'mobilita'],
          flags: {
            apex: false,
            keystone: false,
            bridge: false,
            threat: true,
            event: false,
          },
          balance: { threat_tier: 'T1' },
        },
      ],
    },
  ],
  species: [
    {
      id: 'aurora-scout',
      display_name: 'Scout Aurora',
      role_trofico: 'ricognitore_supporto',
      functional_tags: ['ricognizione', 'supporto_mobile'],
      flags: {
        apex: false,
        keystone: false,
        bridge: true,
        threat: false,
        event: false,
      },
      biomes: ['fallback-canopy'],
      balance: { threat_tier: 'T1' },
    },
    {
      id: 'canopy-warden',
      display_name: 'Guardiano della Canopy',
      role_trofico: 'predatore_secondario',
      functional_tags: ['difesa', 'sentinella'],
      flags: {
        apex: true,
        keystone: true,
        bridge: false,
        threat: false,
        event: false,
      },
      biomes: ['fallback-canopy'],
      balance: { threat_tier: 'T2' },
    },
    {
      id: 'tidal-sentinel',
      display_name: 'Sentinella delle Maree',
      role_trofico: 'sentinella_anfibia',
      functional_tags: ['controllo', 'supporto'],
      flags: {
        apex: false,
        keystone: true,
        bridge: false,
        threat: false,
        event: false,
      },
      biomes: ['fallback-lagoon'],
      balance: { threat_tier: 'T2' },
    },
    {
      id: 'lagoon-charger',
      display_name: 'Caricatore della Laguna',
      role_trofico: 'assaltatore',
      functional_tags: ['pressione', 'mobilita'],
      flags: {
        apex: false,
        keystone: false,
        bridge: false,
        threat: true,
        event: false,
      },
      biomes: ['fallback-lagoon'],
      balance: { threat_tier: 'T1' },
    },
  ],
};

export function getEmbeddedCatalogData() {
  return deepClone(EMBEDDED_MINIMAL_CATALOG);
}

export function createEmbeddedCatalogSnapshot(options = {}) {
  const data = getEmbeddedCatalogData();
  if (!options?.preserveGeneratedAt) {
    data.generated_at = new Date().toISOString();
  }
  const apiBase = normaliseBase(options?.apiBase);
  return {
    data,
    context: {
      resolvedBase: null,
      docsBase: null,
      catalogUrl: 'embedded://catalog/minimal',
      apiBase,
      resolveDocHref: (relativePath) => relativePath,
      resolvePackHref: (relativePath) => relativePath,
      source: 'embedded',
    },
  };
}

export function createCatalogDataSource(options = {}) {
  const {
    baseUrl,
    defaultBase,
    fetchImpl = globalThis.fetch,
    windowRef = typeof window !== 'undefined' ? window : undefined,
    documentRef = typeof document !== 'undefined' ? document : undefined,
    endpoints: endpointOverrides = {},
  } = options;

  const endpoints = { ...DEFAULT_CATALOG_ENDPOINTS, ...endpointOverrides };
  let cachedBase = undefined;

  const getBaseCandidates = () =>
    [
      readQueryOverride(windowRef),
      readMetaOverride(documentRef),
      normaliseBase(baseUrl),
      readWindowOverride(windowRef),
      normaliseBase(defaultBase),
    ].filter(Boolean);

  const getBase = () => {
    if (cachedBase !== undefined) {
      return cachedBase;
    }
    const candidates = getBaseCandidates();
    cachedBase = candidates.length ? candidates[0] : null;
    return cachedBase;
  };

  const buildUrl = (path) => resolveEndpointUrl(getBase(), path);

  const fetchSection = async (path, signal) => {
    if (typeof fetchImpl !== 'function') {
      throw new Error("fetch non disponibile nell'ambiente corrente");
    }
    const url = buildUrl(path);
    const response = await fetchImpl(url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} per ${url}`);
    }
    return { data: await response.json(), url };
  };

  const loadCatalog = async (loadOptions = {}) => {
    const { signal } = loadOptions;
    const biomesResponse = await fetchSection(endpoints.biomes, signal);
    const ecosystemResponse = await fetchSection(endpoints.ecosystem, signal);
    const speciesResponse = await fetchSection(endpoints.species, signal);

    const biomesList = unwrapBiomes(biomesResponse.data);
    if (!Array.isArray(biomesList) || !biomesList.length) {
      throw new Error('Il servizio catalogo non ha restituito biomi validi.');
    }
    const speciesListRaw = unwrapSpecies(speciesResponse.data);
    const speciesList =
      Array.isArray(speciesListRaw) && speciesListRaw.length
        ? speciesListRaw
        : flattenBiomeSpecies(biomesList);
    if (!speciesList.length) {
      throw new Error('Il servizio catalogo non ha restituito specie valide.');
    }
    const ecosystem = unwrapEcosystem(ecosystemResponse.data);

    const data = {
      generated_at: new Date().toISOString(),
      biomi: deepClone(biomesList),
      ecosistema: deepClone(ecosystem),
      species: deepClone(speciesList),
    };

    const context = {
      resolvedBase: null,
      docsBase: null,
      catalogUrl: biomesResponse.url,
      apiBase: getBase(),
      resolveDocHref: (relativePath) => relativePath,
      resolvePackHref: (relativePath) => relativePath,
      sources: {
        biomes: biomesResponse.url,
        ecosystem: ecosystemResponse.url,
        species: speciesResponse.url,
      },
    };

    return { data, context };
  };

  return {
    loadCatalog,
    getBase,
    getResolvedEndpoints: () => ({ ...endpoints }),
  };
}

export { ensureTrailingSlash, normaliseBase };
