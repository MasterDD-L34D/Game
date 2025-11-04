type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface GeneratorCatalogContext {
  resolvedBase: string | null;
  docsBase: string | null;
  catalogUrl: string | null;
  apiBase?: string | null;
  resolveDocHref(relativePath: string): string;
  resolvePackHref(relativePath: string): string;
}

export interface FetchCatalogOptions {
  candidates?: string[];
  fetchImpl?: FetchImplementation;
  signal?: AbortSignal;
}

export interface CatalogFetchResult {
  data: unknown;
  context: GeneratorCatalogContext;
}

export interface FetchResourceOptions {
  context?: GeneratorCatalogContext | null;
  candidates: string[];
  fetchImpl?: FetchImplementation;
  signal?: AbortSignal;
}

export interface ResourceFetchResult<T> {
  data: T | null;
  url: string | null;
  fromFallback: boolean;
}

export interface FetchSpeciesOptions {
  context?: GeneratorCatalogContext | null;
  speciesId?: string | null;
  fetchImpl?: FetchImplementation;
  signal?: AbortSignal;
}

function ensureTrailingSlash(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return value.endsWith('/') ? value : `${value}/`;
}

function resolveRelative(path: string, base: string | null | undefined): string {
  if (!base) {
    return path;
  }
  try {
    return new URL(path, base).toString();
  } catch (primaryError) {
    try {
      if (typeof window !== 'undefined' && typeof window.location?.href === 'string') {
        const absoluteBase = new URL(base, window.location.href).toString();
        return new URL(path, absoluteBase).toString();
      }
    } catch (secondaryError) {
      console.warn('Impossibile normalizzare la base relativa', base, secondaryError);
    }
    console.warn('Impossibile risolvere il percorso relativo', path, base, primaryError);
    const separator = base.endsWith('/') ? '' : '/';
    return `${base}${separator}${path}`;
  }
}

async function fetchJson<T>(
  url: string,
  fetchImpl: FetchImplementation,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchImpl(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function createContext(base: string): GeneratorCatalogContext {
  const resolvedBase = ensureTrailingSlash(base);
  let docsBase: string | null = null;
  try {
    const resolvedDocs = resolveRelative('docs/catalog/', resolvedBase);
    docsBase = ensureTrailingSlash(resolvedDocs);
  } catch (error) {
    console.warn('Impossibile determinare la base documenti del pack', error);
    docsBase = null;
  }

  const resolveDocHref = (relativePath: string): string => {
    if (docsBase) {
      return resolveRelative(relativePath, docsBase);
    }
    return resolveRelative(relativePath, resolvedBase);
  };

  const resolvePackHref = (relativePath: string): string =>
    resolveRelative(relativePath, resolvedBase);

  return {
    resolvedBase,
    docsBase,
    catalogUrl: resolveDocHref('catalog_data.json'),
    resolveDocHref,
    resolvePackHref,
  };
}

async function fetchFromCandidates<T>(
  options: FetchResourceOptions,
): Promise<ResourceFetchResult<T>> {
  const { context, candidates, fetchImpl = globalThis.fetch, signal } = options;
  if (typeof fetchImpl !== 'function') {
    return { data: null, url: null, fromFallback: false };
  }

  const tried = new Set<string>();
  let lastError: unknown = null;

  const resolveCandidate = (candidate: string): string => {
    if (context?.resolveDocHref) {
      try {
        return context.resolveDocHref(candidate);
      } catch (error) {
        console.warn('Impossibile risolvere la risorsa tramite resolveDocHref', candidate, error);
      }
    }
    if (context?.resolvePackHref) {
      try {
        return context.resolvePackHref(candidate);
      } catch (error) {
        console.warn('Impossibile risolvere la risorsa tramite resolvePackHref', candidate, error);
      }
    }
    if (context?.resolvedBase) {
      return resolveRelative(candidate, context.resolvedBase);
    }
    return candidate;
  };

  for (const candidate of candidates) {
    if (!candidate) continue;
    const url = resolveCandidate(candidate);
    if (!url || tried.has(url)) continue;
    tried.add(url);
    try {
      const data = await fetchJson<T>(url, fetchImpl, signal);
      return { data, url, fromFallback: candidate.startsWith('../') || candidate.startsWith('./') };
    } catch (error) {
      lastError = error;
      console.warn('Tentativo di caricamento risorsa fallito', url, error);
    }
  }

  if (lastError) {
    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError ?? 'Errore sconosciuto'));
  }
  return { data: null, url: null, fromFallback: false };
}

function localAsset(relativePath: string): string | null {
  try {
    return new URL(relativePath, import.meta.url).toString();
  } catch (error) {
    console.warn('Impossibile calcolare il percorso locale', relativePath, error);
    return null;
  }
}

export async function fetchCatalog(options: FetchCatalogOptions = {}): Promise<CatalogFetchResult> {
  const { candidates = [], fetchImpl = globalThis.fetch, signal } = options;
  if (typeof fetchImpl !== 'function') {
    throw new Error("fetch non disponibile nell'ambiente corrente");
  }

  let lastError: unknown = null;

  for (const base of candidates) {
    if (!base) continue;
    try {
      const context = createContext(base);
      const catalogUrl = resolveRelative('docs/catalog/catalog_data.json', context.resolvedBase);
      const data = await fetchJson<unknown>(catalogUrl, fetchImpl, signal);
      context.catalogUrl = catalogUrl;
      return { data, context };
    } catch (error) {
      lastError = error;
      console.warn('Tentativo di caricamento del catalogo fallito', base, error);
    }
  }

  const manualFallback = localAsset('../../docs/evo-tactics-pack/catalog_data.json');
  if (manualFallback) {
    try {
      const data = await fetchJson<unknown>(manualFallback, fetchImpl, signal);
      const context = createContext('../../docs/evo-tactics-pack/');
      context.catalogUrl = manualFallback;
      return { data, context };
    } catch (error) {
      lastError = error;
      console.warn('Caricamento del catalogo dal fallback locale fallito', error);
    }
  }

  const message =
    "Impossibile caricare il catalogo del pack da alcuna sorgente candidata. Controlla la connessione o l'URL di base.";
  if (lastError instanceof Error) {
    const composed = new Error(message, { cause: lastError });
    throw composed;
  }
  throw new Error(message);
}

export async function fetchTraitRegistry(
  options: FetchResourceOptions,
): Promise<ResourceFetchResult<Record<string, unknown>>> {
  const fallback = localAsset('../../docs/evo-tactics-pack/env-traits.json');
  const candidates = [...options.candidates];
  if (fallback) {
    candidates.push(fallback);
  }
  const result = await fetchFromCandidates<Record<string, unknown>>({
    ...options,
    candidates,
  });
  if (fallback && result.url === fallback) {
    return { ...result, fromFallback: true };
  }
  return result;
}

export async function fetchTraitReference(
  options: FetchResourceOptions,
): Promise<ResourceFetchResult<Record<string, unknown>>> {
  const fallback = localAsset('../../docs/evo-tactics-pack/trait-reference.json');
  const candidates = [...options.candidates];
  if (fallback) {
    candidates.push(fallback);
  }
  const result = await fetchFromCandidates<Record<string, unknown>>({
    ...options,
    candidates,
  });
  if (fallback && result.url === fallback) {
    return { ...result, fromFallback: true };
  }
  return result;
}

export async function fetchTraitGlossary(
  options: FetchResourceOptions,
): Promise<ResourceFetchResult<Record<string, unknown>>> {
  const fallback = localAsset('../../docs/evo-tactics-pack/trait-glossary.json');
  const candidates = [...options.candidates];
  if (fallback) {
    candidates.push(fallback);
  }
  const result = await fetchFromCandidates<Record<string, unknown>>({
    ...options,
    candidates,
  });
  if (fallback && result.url === fallback) {
    return { ...result, fromFallback: true };
  }
  return result;
}

export async function fetchHazardRegistry(
  options: FetchResourceOptions,
): Promise<ResourceFetchResult<Record<string, unknown>>> {
  const fallback = localAsset('../../docs/evo-tactics-pack/hazards.json');
  const candidates = [...options.candidates];
  if (fallback) {
    candidates.push(fallback);
  }
  const result = await fetchFromCandidates<Record<string, unknown>>({
    ...options,
    candidates,
  });
  if (fallback && result.url === fallback) {
    return { ...result, fromFallback: true };
  }
  return result;
}

export async function fetchSpecies(
  options: FetchSpeciesOptions,
): Promise<ResourceFetchResult<unknown>> {
  const { context, speciesId, fetchImpl = globalThis.fetch, signal } = options;
  const baseCandidates: string[] = [];
  if (speciesId) {
    const normalized = speciesId.replace(/\.json$/i, '');
    baseCandidates.push(`docs/catalog/species/${normalized}.json`);
    baseCandidates.push(`data/species/${normalized}.json`);
  } else {
    baseCandidates.push('docs/catalog/species/index.json');
    baseCandidates.push('docs/catalog/species.json');
  }
  const fallback = localAsset('../../docs/evo-tactics-pack/species-index.json');
  if (fallback) {
    baseCandidates.push(fallback);
  }

  try {
    const result = await fetchFromCandidates<unknown>({
      context,
      candidates: baseCandidates,
      fetchImpl,
      signal,
    });
    if (fallback && result.url === fallback) {
      return { ...result, fromFallback: true };
    }
    return result;
  } catch (error) {
    console.warn('Impossibile caricare le informazioni sulle specie richieste', speciesId, error);
    return { data: null, url: null, fromFallback: false };
  }
}
