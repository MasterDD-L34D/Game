export interface CatalogServiceOptions {
  dataRoot?: string;
  traitGlossaryPath?: string;
  biomePoolsPath?: string;
  traitCatalogPath?: string;
  /**
   * Game-Database HTTP integration (Alternative B of ADR-2026-04-14).
   * When httpEnabled is false (default) the service reads everything from
   * local files. When true, the trait glossary is fetched from
   * `${httpBase}/api/traits/glossary` with TTL caching and a local-file
   * fallback on any failure.
   */
  httpEnabled?: boolean;
  httpBase?: string | null;
  httpTimeoutMs?: number;
  httpTtlMs?: number;
  httpFetch?: typeof fetch;
  logger?: Pick<Console, 'warn' | 'log' | 'error'>;
}

export type CatalogSource = 'local' | 'http' | 'local-fallback' | 'error';

export interface CatalogService {
  loadTraitGlossary: () => Promise<Record<string, unknown>>;
  loadBiomePools: () => Promise<{ pools: unknown[] }>;
  loadTraitCatalog: () => Promise<unknown>;
  reload: () => Promise<Record<string, unknown>>;
  ensureReady: () => Promise<{ source: CatalogSource; traitCount: number; poolCount: number }>;
  healthCheck: () => Promise<{
    ok: boolean;
    source: CatalogSource;
    httpBase?: string | null;
    error?: unknown;
  }>;
  getSource: () => CatalogSource;
}

const implementation = require('./catalog.js') as {
  createCatalogService: (options?: CatalogServiceOptions) => CatalogService;
  mapGlossaryFromTraits: (docs: Array<Record<string, any>>) => Record<string, any>;
  mapCatalogFromTraits: (docs: Array<Record<string, any>>) => unknown;
  mapBiomePool: (doc: Record<string, any>) => Record<string, any> | null;
};

export const createCatalogService = implementation.createCatalogService;
export const mapGlossaryFromTraits = implementation.mapGlossaryFromTraits;
export const mapCatalogFromTraits = implementation.mapCatalogFromTraits;
export const mapBiomePool = implementation.mapBiomePool;
