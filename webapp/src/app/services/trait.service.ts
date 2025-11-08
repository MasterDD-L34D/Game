import {
  TraitDetail,
  TraitDetailResponse,
  TraitEnvironment,
  TraitIndexDocument,
  TraitIndexEntry,
  TraitListItem,
  TraitListResponse,
  TraitDataSource,
  traitIndexEntrySchema,
  traitIndexSchema,
} from '../models/traits';

interface TraitServiceConfig {
  environment: TraitEnvironment;
  remoteIndexUrl: string | null;
  remoteDetailUrlTemplate: string | null;
  mockIndexUrl: string;
  mockDetailUrlTemplate: string;
}

const HTTP_URL_PATTERN = /^https?:\/\//i;

function isAbsoluteUrl(value: string): boolean {
  return HTTP_URL_PATTERN.test(value);
}

function ensureTrailingSlash(value: string): string {
  if (!value || value === '/') {
    return value || '/';
  }
  return value.endsWith('/') ? value : `${value}/`;
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}

function resolveTraitEnvironment(rawEnv?: string, mode?: string): TraitEnvironment {
  const candidate = (rawEnv ?? mode ?? '').toLowerCase();
  if (candidate.startsWith('prod')) {
    return 'prod';
  }
  if (candidate === 'mock') {
    return 'mock';
  }
  if (candidate === 'test') {
    return 'mock';
  }
  return 'dev';
}

function resolveWithApiBase(candidate: string | undefined, apiBase: string | undefined): string | null {
  if (!candidate || candidate.trim() === '') {
    return null;
  }
  const value = candidate.trim();
  if (isAbsoluteUrl(value)) {
    return value;
  }
  if (value.startsWith('/')) {
    if (apiBase && apiBase.trim() !== '') {
      const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      return `${base}${value}`;
    }
    return value;
  }
  if (apiBase && apiBase.trim() !== '') {
    const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    return `${base}/${value}`;
  }
  return value;
}

function resolveAssetPath(candidate: string, baseUrl: string | undefined): string {
  if (isAbsoluteUrl(candidate)) {
    return candidate;
  }
  const normalisedBase = ensureTrailingSlash(baseUrl ?? '/');
  const normalisedCandidate = stripLeadingSlash(candidate);
  return `${normalisedBase}${normalisedCandidate}`;
}

const traitServiceConfig: TraitServiceConfig = (() => {
  const env = import.meta.env as Record<string, string | undefined>;
  const environment = resolveTraitEnvironment(env.VITE_TRAITS_ENV, env.MODE);
  const apiBase = env.VITE_API_BASE;
  const baseUrl = env.BASE_URL;

  const remoteIndexUrl = resolveWithApiBase(env.VITE_TRAITS_INDEX_URL, apiBase);
  const remoteDetailUrlTemplate = resolveWithApiBase(env.VITE_TRAITS_DETAIL_URL, apiBase);

  const mockIndexCandidate = env.VITE_TRAITS_MOCK_INDEX ?? 'data/traits/index.mock.json';
  const mockDetailCandidate = env.VITE_TRAITS_MOCK_DETAIL ?? 'data/traits/details/:id.json';

  return {
    environment,
    remoteIndexUrl,
    remoteDetailUrlTemplate,
    mockIndexUrl: resolveAssetPath(mockIndexCandidate, baseUrl),
    mockDetailUrlTemplate: resolveAssetPath(mockDetailCandidate, baseUrl),
  };
})();

export class TraitServiceError extends Error {
  public readonly status?: number;
  public readonly source?: TraitDataSource;

  constructor(message: string, options: { status?: number; source?: TraitDataSource } = {}) {
    super(message);
    this.name = 'TraitServiceError';
    this.status = options.status;
    this.source = options.source;
  }
}

interface FetchSuccess<T> {
  ok: true;
  data: T;
  source: TraitDataSource;
}

interface FetchFailure {
  ok: false;
  error: TraitServiceError;
}

export class TraitService {
  static $inject: string[] = [];

  private readonly config: TraitServiceConfig;
  private indexCache: TraitIndexDocument | null = null;

  constructor() {
    this.config = traitServiceConfig;
  }

  async listTraits(): Promise<TraitListResponse> {
    const environment = this.config.environment;
    const preferMock = environment === 'mock';
    let lastError: TraitServiceError | null = null;

    if (!preferMock && this.config.remoteIndexUrl) {
      const remote = await this.loadIndex(this.config.remoteIndexUrl, 'remote');
      if (remote.ok) {
        return this.buildListResponse(remote.data, environment, 'remote', false);
      }
      lastError = remote.error;
    }

    const fallbackSource: TraitDataSource = preferMock ? 'mock' : 'fallback';
    const fallback = await this.loadIndex(this.config.mockIndexUrl, fallbackSource);
    if (fallback.ok) {
      return this.buildListResponse(
        fallback.data,
        environment,
        fallbackSource,
        fallbackSource !== 'remote',
      );
    }

    throw lastError ?? fallback.error;
  }

  async getTraitById(traitId: string): Promise<TraitDetailResponse> {
    if (!traitId || traitId.trim() === '') {
      throw new TraitServiceError('ID tratto non valido');
    }

    const environment = this.config.environment;
    const preferMock = environment === 'mock';
    let lastError: TraitServiceError | null = null;

    if (!preferMock && this.config.remoteDetailUrlTemplate) {
      const remote = await this.loadDetail(this.config.remoteDetailUrlTemplate, traitId, 'remote');
      if (remote.ok) {
        return this.buildDetailResponse(remote.data, environment, 'remote', false);
      }
      lastError = remote.error;
    }

    const cached = this.getCachedTrait(traitId);
    if (cached) {
      return this.buildDetailResponse(
        cached,
        environment,
        preferMock ? 'mock' : 'fallback',
        preferMock || !this.config.remoteDetailUrlTemplate,
      );
    }

    const fallbackSource: TraitDataSource = preferMock ? 'mock' : 'fallback';
    const fallback = await this.loadDetail(this.config.mockDetailUrlTemplate, traitId, fallbackSource);
    if (fallback.ok) {
      return this.buildDetailResponse(
        fallback.data,
        environment,
        fallbackSource,
        fallbackSource !== 'remote',
      );
    }

    throw lastError ?? fallback.error;
  }

  private getCachedTrait(traitId: string): TraitIndexEntry | null {
    if (!this.indexCache) {
      return null;
    }
    return this.indexCache.traits[traitId] ?? null;
  }

  private async loadIndex(
    url: string,
    source: TraitDataSource,
  ): Promise<FetchSuccess<TraitIndexDocument> | FetchFailure> {
    try {
      const payload = await this.fetchJson(url, source);
      const parsed = traitIndexSchema.safeParse(payload.data);
      if (!parsed.success) {
        throw new TraitServiceError('Indice tratti non valido', { source });
      }
      this.indexCache = parsed.data;
      return { ok: true, data: parsed.data, source };
    } catch (error) {
      if (error instanceof TraitServiceError) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: new TraitServiceError('Errore sconosciuto durante il caricamento indice', { source }),
      };
    }
  }

  private async loadDetail(
    template: string,
    traitId: string,
    source: TraitDataSource,
  ): Promise<FetchSuccess<TraitIndexEntry> | FetchFailure> {
    const url = this.buildDetailUrl(template, traitId);
    try {
      const payload = await this.fetchJson(url, source);
      const parsed = traitIndexEntrySchema.safeParse(payload.data);
      if (!parsed.success) {
        throw new TraitServiceError('Dettaglio tratto non valido', { source });
      }
      return { ok: true, data: parsed.data, source };
    } catch (error) {
      if (error instanceof TraitServiceError) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: new TraitServiceError('Errore sconosciuto durante il caricamento tratto', { source }),
      };
    }
  }

  private buildDetailUrl(template: string, traitId: string): string {
    const token = encodeURIComponent(traitId);
    return template.replace(':id', token);
  }

  private async fetchJson(
    url: string,
    source: TraitDataSource,
  ): Promise<{ data: unknown; status: number }> {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        const message = `Richiesta ${source} fallita (${response.status})`;
        throw new TraitServiceError(message, { status: response.status, source });
      }
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      if (error instanceof TraitServiceError) {
        throw error;
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Errore di rete durante il caricamento dei dati dei tratti';
      throw new TraitServiceError(message, { source });
    }
  }

  private buildListResponse(
    document: TraitIndexDocument,
    environment: TraitEnvironment,
    source: TraitDataSource,
    usedMock: boolean,
  ): TraitListResponse {
    const traits = Object.values(document.traits)
      .map((entry) => this.toListItem(entry))
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));

    return {
      traits,
      schemaVersion: document.schema_version,
      glossaryPath: document.trait_glossary,
      environment,
      source,
      usedMock,
    };
  }

  private buildDetailResponse(
    entry: TraitIndexEntry,
    environment: TraitEnvironment,
    source: TraitDataSource,
    usedMock: boolean,
  ): TraitDetailResponse {
    const trait = this.toDetail(entry);
    return {
      trait,
      environment,
      source,
      usedMock,
    };
  }

  private toListItem(entry: TraitIndexEntry): TraitListItem {
    const usageTags = Array.isArray(entry.usage_tags) ? [...entry.usage_tags] : [];
    const searchable = [
      entry.label,
      entry.famiglia_tipologia,
      entry.uso_funzione,
      entry.spinta_selettiva,
      entry.mutazione_indotta,
      entry.debolezza,
      ...usageTags,
      ...(Array.isArray(entry.sinergie) ? entry.sinergie : []),
      ...(Array.isArray(entry.conflitti) ? entry.conflitti : []),
    ]
      .join(' ')
      .toLowerCase();

    return {
      id: entry.id,
      label: entry.label,
      tier: entry.tier,
      family: entry.famiglia_tipologia,
      coreRole: entry.slot_profile?.core ?? 'sconosciuto',
      complementaryRole: entry.slot_profile?.complementare ?? 'sconosciuto',
      usageTags,
      summary: entry.uso_funzione,
      searchText: searchable,
    };
  }

  private toDetail(entry: TraitIndexEntry): TraitDetail {
    const listItem = this.toListItem(entry);
    return {
      ...listItem,
      weakness: entry.debolezza,
      mutation: entry.mutazione_indotta,
      selectivePressure: entry.spinta_selettiva,
      function: entry.uso_funzione,
      synergies: Array.isArray(entry.sinergie) ? [...entry.sinergie] : [],
      conflicts: Array.isArray(entry.conflitti) ? [...entry.conflitti] : [],
      energyMaintenance: entry.fattore_mantenimento_energetico,
      dataOrigin: entry.data_origin,
      requirements: entry.requisiti_ambientali.map((req) => ({
        capacita_richieste: [...req.capacita_richieste],
        condizioni: { ...req.condizioni },
        fonte: req.fonte,
        meta: req.meta ? { ...req.meta } : undefined,
      })),
      speciesAffinity: entry.species_affinity.map((aff) => ({
        roles: [...aff.roles],
        species_id: aff.species_id,
        weight: aff.weight,
      })),
      completionFlags: { ...entry.completion_flags },
      synergyInsights: {
        co_occorrenze: [...entry.sinergie_pi.co_occorrenze],
        combo_totale: entry.sinergie_pi.combo_totale,
        forme: [...entry.sinergie_pi.forme],
        tabelle_random: [...entry.sinergie_pi.tabelle_random],
      },
      biomeTags: entry.biome_tags ? [...entry.biome_tags] : undefined,
    };
  }
}

export const registerTraitService = (module: any): void => {
  module.service('TraitService', TraitService);
};
