import {
  TraitDetail,
  TraitDetailResponse,
  TraitEnvironment,
  TraitIndexDocument,
  TraitIndexEntry,
  TraitListItem,
  TraitListResponse,
  TraitDataSource,
  TraitValidationIssue,
  TraitValidationResult,
  traitIndexEntrySchema,
  traitIndexSchema,
} from '../models/traits';

interface TraitServiceConfig {
  environment: TraitEnvironment;
  remoteIndexUrl: string | null;
  remoteDetailUrlTemplate: string | null;
  remoteValidateUrl: string | null;
  mockIndexUrl: string;
  mockDetailUrlTemplate: string;
  authToken: string | null;
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
  const validateCandidate = env.VITE_TRAITS_VALIDATE_URL ?? '/api/traits/validate';
  const remoteValidateUrl = resolveWithApiBase(validateCandidate, apiBase);

  const mockIndexCandidate = env.VITE_TRAITS_MOCK_INDEX ?? 'data/traits/index.mock.json';
  const mockDetailCandidate = env.VITE_TRAITS_MOCK_DETAIL ?? 'data/traits/details/:id.json';

  const rawToken = env.VITE_TRAITS_AUTH_TOKEN;
  const authToken = rawToken && rawToken.trim() !== '' ? rawToken.trim() : null;

  return {
    environment,
    remoteIndexUrl,
    remoteDetailUrlTemplate,
    remoteValidateUrl,
    mockIndexUrl: resolveAssetPath(mockIndexCandidate, baseUrl),
    mockDetailUrlTemplate: resolveAssetPath(mockDetailCandidate, baseUrl),
    authToken,
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

  async validateTrait(entry: TraitIndexEntry): Promise<TraitValidationResult> {
    if (!this.config.remoteValidateUrl) {
      throw new TraitServiceError('Endpoint validazione non configurato', { source: 'remote' });
    }

    try {
      const body = { payload: entry, traitId: entry.id };
      const response = await this.postJson(
        this.config.remoteValidateUrl,
        body,
        this.config.authToken,
      );
      return this.normaliseValidationResponse(response.data);
    } catch (error) {
      if (error instanceof TraitServiceError) {
        throw error;
      }
      throw new TraitServiceError('Errore sconosciuto durante la validazione del tratto', {
        source: 'remote',
      });
    }
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

  private async postJson(
    url: string,
    body: unknown,
    token: string | null,
  ): Promise<{ data: unknown; status: number }> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['X-Trait-Editor-Token'] = token;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {}),
      });
      if (!response.ok) {
        const message = `Validazione tratto fallita (${response.status})`;
        throw new TraitServiceError(message, { status: response.status, source: 'remote' });
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
          : 'Errore di rete durante la validazione del tratto';
      throw new TraitServiceError(message, { source: 'remote' });
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

  private normaliseValidationResponse(payload: unknown): TraitValidationResult {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, issues: [] };
    }
    const raw = payload as Record<string, unknown>;
    const issues: TraitValidationIssue[] = [];
    const schemaErrors = Array.isArray(raw.errors) ? raw.errors : [];
    schemaErrors.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const pointer =
        typeof (entry as Record<string, unknown>).instancePath === 'string'
          ? ((entry as Record<string, unknown>).instancePath as string)
          : typeof (entry as Record<string, unknown>).dataPath === 'string'
            ? ((entry as Record<string, unknown>).dataPath as string)
            : '';
      const message =
        typeof (entry as Record<string, unknown>).message === 'string'
          ? ((entry as Record<string, unknown>).message as string)
          : 'Errore di validazione dello schema.';
      issues.push({
        id: `schema-${index}`,
        path: pointer,
        displayPath: this.formatValidationPath(pointer),
        message,
        severity: 'error',
        source: 'schema',
      });
    });

    const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
    suggestions.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const container = entry as Record<string, unknown>;
      const pointer = typeof container.path === 'string' ? container.path : '';
      const message =
        typeof container.message === 'string'
          ? container.message
          : 'Suggerimento disponibile.';
      const severity = this.normaliseSeverity(container.severity);
      const fix = this.normaliseFix(container.fix);
      issues.push({
        id: `style-${index}`,
        path: pointer,
        displayPath: this.formatValidationPath(pointer),
        message,
        severity,
        source: 'style',
        fix,
      });
    });

    const valid = Boolean(raw.valid);
    return { valid, issues };
  }

  private normaliseFix(raw: unknown): TraitValidationIssue['fix'] | undefined {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    const container = raw as Record<string, unknown>;
    const fix: TraitValidationIssue['fix'] = {};
    if (typeof container.type === 'string') {
      fix.type = container.type;
    }
    if (Object.prototype.hasOwnProperty.call(container, 'value')) {
      fix.value = container.value;
    }
    if (typeof container.note === 'string') {
      fix.note = container.note;
    }
    if (Object.prototype.hasOwnProperty.call(container, 'autoApplicable')) {
      fix.autoApplicable = Boolean(container.autoApplicable);
    }
    return Object.keys(fix).length > 0 ? fix : undefined;
  }

  private normaliseSeverity(value: unknown): TraitValidationIssue['severity'] {
    const label = typeof value === 'string' ? value.toLowerCase() : '';
    if (label === 'error') {
      return 'error';
    }
    if (label === 'warning') {
      return 'warning';
    }
    return 'suggestion';
  }

  private formatValidationPath(pointer: string): string {
    if (!pointer || pointer === '' || pointer === '/') {
      return 'payload';
    }
    const cleaned = pointer.startsWith('/') ? pointer.slice(1) : pointer;
    if (!cleaned) {
      return 'payload';
    }
    return cleaned
      .split('/')
      .map((segment) => this.decodePointerSegment(segment))
      .join(' › ');
  }

  private decodePointerSegment(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  private buildDetailResponse(
    entry: TraitIndexEntry,
    environment: TraitEnvironment,
    source: TraitDataSource,
    usedMock: boolean,
  ): TraitDetailResponse {
    const snapshot = this.cloneEntry(entry);
    const trait = this.convertEntryToDetail(snapshot);
    return {
      trait,
      rawEntry: snapshot,
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

  public toTraitDetail(entry: TraitIndexEntry): TraitDetail {
    return this.convertEntryToDetail(entry);
  }

  private convertEntryToDetail(entry: TraitIndexEntry): TraitDetail {
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

  private cloneEntry(entry: TraitIndexEntry): TraitIndexEntry {
    return JSON.parse(JSON.stringify(entry)) as TraitIndexEntry;
  }
}

export const registerTraitService = (module: any): void => {
  module.service('TraitService', TraitService);
};
