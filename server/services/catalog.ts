export interface CatalogServiceOptions {
  dataRoot?: string;
  traitGlossaryPath?: string;
  biomePoolsPath?: string;
  traitCatalogPath?: string;
  logger?: Pick<Console, 'warn'>;
  useMongo?: boolean;
  mongo?: Record<string, unknown>;
}

export interface CatalogService {
  loadTraitGlossary: () => Promise<Record<string, unknown>>;
  loadBiomePools: () => Promise<{ pools: unknown[] }>;
  loadTraitCatalog: () => Promise<unknown>;
  reload: () => Promise<Record<string, unknown>>;
  ensureReady: () => Promise<{ source: string | null; traitCount: number; poolCount: number }>;
  healthCheck: () => Promise<{ ok: boolean; source: string; error?: unknown }>;
  getSource: () => string | null;
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
