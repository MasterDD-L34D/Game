import {
  TRAIT_DATA_ENDPOINT,
  fetchTraitsFromMonorepo,
  getSampleTraits,
} from '../data/traits.sample';
import type { Trait, TraitIndexEntry } from '../types/trait';
import { cloneTrait, cloneTraits, synchroniseTraitPresentation } from '../utils/trait-helpers';

export const FALLBACK_CACHE_TTL_MS = 60_000;

type TraitCacheSource = 'remote' | 'fallback' | 'mock';

interface TraitCacheEntry {
  traits: Trait[];
  source: TraitCacheSource;
  timestamp: number;
}

export class TraitDataService {
  private cache: TraitCacheEntry | null = null;
  private fallbackExpiry: number | null = null;
  private readonly useRemoteSource: boolean;
  private readonly endpointOverride?: string;
  private readonly tokenEndpoint?: string;
  private readonly staticToken: string | null = null;
  private readonly locationOrigin: string | null = null;
  private lastError: Error | null = null;
  private authToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private tokenRefreshPromise: Promise<string | null> | null = null;
  private readonly traitMeta: Map<string, { etag: string | null; version: string | null }> = new Map();

  static $inject = ['$q'];

  constructor(private readonly $q: any) {
    const source = (import.meta.env.VITE_TRAIT_DATA_SOURCE ?? '').toLowerCase();
    this.useRemoteSource = source === 'remote';

    const endpoint = import.meta.env.VITE_TRAIT_DATA_URL;
    if (typeof endpoint === 'string' && endpoint.trim().length > 0) {
      this.endpointOverride = endpoint.trim();
    }

    const tokenEndpoint = import.meta.env.VITE_TRAIT_DATA_TOKEN_URL;
    if (typeof tokenEndpoint === 'string' && tokenEndpoint.trim().length > 0) {
      this.tokenEndpoint = tokenEndpoint.trim();
    }

    const staticToken = import.meta.env.VITE_TRAIT_DATA_TOKEN;
    if (typeof staticToken === 'string' && staticToken.trim().length > 0) {
      this.staticToken = staticToken.trim();
    }

    if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
      this.locationOrigin = window.location.origin;
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.location?.origin === 'string') {
      this.locationOrigin = globalThis.location.origin;
    } else {
      this.locationOrigin = null;
    }
  }

  getTraits(options?: { forceRemote?: boolean }): Promise<Trait[]> {
    const forceRemote = options?.forceRemote ?? false;

    if (this.cache && this.isCacheUsable(forceRemote)) {
      return this.$q.resolve(cloneTraits(this.cache.traits));
    }

    return this.$q.when(this.loadTraits()).then((traits) => cloneTraits(traits));
  }

  refreshTraitsFromRemote(): Promise<Trait[]> {
    return this.getTraits({ forceRemote: true });
  }

  invalidateCache(): void {
    this.cache = null;
    this.fallbackExpiry = null;
    this.traitMeta.clear();
  }

  getCacheSource(): TraitCacheSource | null {
    return this.cache?.source ?? null;
  }

  isUsingFallback(): boolean {
    return this.cache?.source === 'fallback';
  }

  getTraitById(id: string): Promise<Trait | null> {
    if (!id || id.trim() === '') {
      return this.$q.resolve(null);
    }

    const resolveFromCache = (): Trait | null => {
      if (!this.cache) {
        return null;
      }
      const cached = this.cache.traits.find((item) => item.id === id);
      return cached ? cloneTrait(cached) : null;
    };

    if (!this.useRemoteSource) {
      return this.getTraits().then(() => resolveFromCache());
    }

    return this.$q
      .when(this.fetchTraitDetailFromApi(id))
      .then((result) => {
        if (result) {
          return cloneTrait(result);
        }
        return resolveFromCache();
      })
      .catch((error: Error) => {
        console.warn('Impossibile recuperare il tratto remoto, uso cache locale', error);
        return resolveFromCache();
      });
  }

  saveTrait(updatedTrait: Trait): Promise<Trait> {
    const traitCopy = cloneTrait(updatedTrait);
    synchroniseTraitPresentation(traitCopy);

    const persist = async (): Promise<{ trait?: Trait; meta?: { etag: string | null; version: string | null } } | void> => {
      if (!this.useRemoteSource) {
        return;
      }

      const endpoint = this.endpointOverride ?? TRAIT_DATA_ENDPOINT;
      const target = this.buildRemoteMutationEndpoint(endpoint, traitCopy.id);

      if (!target) {
        throw new Error('Endpoint remoto non configurato per il salvataggio dei tratti.');
      }

      const payload = this.createMutationPayload(traitCopy);
      const headers = this.buildMutationHeaders(traitCopy.id);
      headers['Content-Type'] = 'application/json';

      const response = await this.fetchWithAuth(target, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 412 || response.status === 428) {
        await this.handleConcurrencyFailure(traitCopy.id, response);
      }

      if (!response.ok) {
        throw await this.buildRemoteError(response, traitCopy.id);
      }

      const result = await this.parseMutationResponse(response, traitCopy.id);
      if (result) {
        return result;
      }
    };

    return this.$q
      .when(persist())
      .then((result) => {
        this.lastError = null;
        const finalTrait = result?.trait ?? traitCopy;
        if (result?.meta) {
          this.updateTraitMeta(finalTrait.id, result.meta);
        }
        this.updateLocalCache(finalTrait);
        return cloneTrait(finalTrait);
      })
      .catch((error: Error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.lastError = err;
        return this.$q.reject(err);
      });
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  private async loadTraits(): Promise<Trait[]> {
    if (!this.useRemoteSource) {
      return this.updateCache(getSampleTraits(), 'mock');
    }

    try {
      const endpoint = this.endpointOverride ?? TRAIT_DATA_ENDPOINT;
      const traits = await fetchTraitsFromMonorepo(endpoint);
      this.lastError = null;
      return this.updateCache(traits, 'remote');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.lastError = err;
      const fallback = getSampleTraits();
      return this.updateCache(fallback, 'fallback');
    }
  }

  private updateCache(traits: Trait[], source: TraitCacheSource): Trait[] {
    const canonical = cloneTraits(traits);
    this.cache = {
      traits: canonical,
      source,
      timestamp: Date.now(),
    };
    this.fallbackExpiry = source === 'fallback' ? Date.now() + FALLBACK_CACHE_TTL_MS : null;
    return cloneTraits(this.cache.traits);
  }

  private updateLocalCache(trait: Trait): void {
    if (!this.cache) {
      const source: TraitCacheSource = this.useRemoteSource ? 'remote' : 'mock';
      this.cache = { traits: [cloneTrait(trait)], source, timestamp: Date.now() };
      this.fallbackExpiry = source === 'fallback' ? Date.now() + FALLBACK_CACHE_TTL_MS : null;
      return;
    }

    const updated = cloneTrait(trait);
    const index = this.cache.traits.findIndex((item) => item.id === updated.id);
    if (index >= 0) {
      this.cache.traits.splice(index, 1, updated);
    } else {
      this.cache.traits.push(updated);
    }
    this.cache.timestamp = Date.now();
    if (this.cache.source === 'fallback') {
      this.fallbackExpiry = Date.now() + FALLBACK_CACHE_TTL_MS;
    }
  }

  private isCacheUsable(forceRemote: boolean): boolean {
    if (!this.cache) {
      return false;
    }

    if (forceRemote) {
      return false;
    }

    if (this.cache.source === 'fallback') {
      if (this.fallbackExpiry === null) {
        return false;
      }
      return Date.now() <= this.fallbackExpiry;
    }

    return true;
  }

  private buildRemoteMutationEndpoint(baseEndpoint: string, id: string): string | null {
    if (!baseEndpoint || typeof baseEndpoint !== 'string') {
      return null;
    }

    const trimmed = baseEndpoint.trim();
    if (!trimmed) {
      return null;
    }

    const safeId = encodeURIComponent(id);
    const queryIndex = trimmed.indexOf('?');
    const query = queryIndex >= 0 ? trimmed.slice(queryIndex) : '';
    const cleanQuery = query && !query.startsWith('?') ? `?${query}` : query;
    const apiPath = `/api/traits/${safeId}`;

    if (this.isAbsoluteUrl(trimmed)) {
      try {
        const base = new URL(trimmed);
        const target = new URL(apiPath, `${base.protocol}//${base.host}`);
        target.search = cleanQuery;
        return target.toString();
      } catch (error) {
        console.warn('Impossibile costruire endpoint mutazione assoluto', error);
        return null;
      }
    }

    if (trimmed.startsWith('/')) {
      return `${apiPath}${cleanQuery}`;
    }

    if (this.locationOrigin) {
      try {
        const base = new URL(trimmed, this.locationOrigin);
        const target = new URL(apiPath, this.locationOrigin);
        target.search = cleanQuery || base.search;
        return target.toString();
      } catch (error) {
        console.warn('Impossibile costruire endpoint mutazione relativo', error);
      }
    }

    return `${apiPath}${cleanQuery}`;
  }

  private isAbsoluteUrl(candidate: string): boolean {
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate);
  }

  private createMutationPayload(trait: Trait): Record<string, unknown> {
    const payload = JSON.parse(JSON.stringify(trait)) as Record<string, unknown>;
    const storedMeta = this.traitMeta.get(trait.id);
    if (storedMeta && (storedMeta.etag || storedMeta.version)) {
      const existingMeta =
        payload.meta && typeof payload.meta === 'object' && payload.meta !== null
          ? (payload.meta as Record<string, unknown>)
          : {};
      payload.meta = {
        ...existingMeta,
        ...(storedMeta.etag ? { etag: storedMeta.etag } : {}),
        ...(storedMeta.version ? { version: storedMeta.version } : {}),
      };
    }
    return payload;
  }

  private buildMutationHeaders(id: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const storedMeta = this.traitMeta.get(id);
    if (storedMeta?.etag) {
      headers['If-Match'] = storedMeta.etag;
    }
    if (storedMeta?.version) {
      headers['X-Trait-Version'] = storedMeta.version;
    }
    return headers;
  }

  private async parseMutationResponse(
    response: Response,
    id: string,
  ): Promise<{ trait?: Trait; meta?: { etag: string | null; version: string | null }} | null> {
    try {
      const payload = await response.json();
      const meta = payload?.meta ?? null;
      const remoteTrait = payload?.trait ?? null;
      const result: { trait?: Trait; meta?: { etag: string | null; version: string | null } } = {};
      if (meta) {
        result.meta = {
          etag: typeof meta.etag === 'string' && meta.etag.trim() ? meta.etag.trim() : null,
          version:
            typeof meta.version === 'string' && meta.version.trim() ? meta.version.trim() : null,
        };
      }
      const normalisedTrait = this.normaliseRemoteTrait(remoteTrait, id);
      if (normalisedTrait) {
        result.trait = normalisedTrait;
      }
      if (result.trait || result.meta) {
        return result;
      }
      return null;
    } catch (error) {
      console.warn('Impossibile analizzare la risposta della mutazione', error);
      return null;
    }
  }

  private normaliseRemoteTrait(raw: unknown, fallbackId: string): Trait | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    if ((raw as Trait).entry && typeof (raw as Trait).entry === 'object') {
      const trait = cloneTrait(raw as Trait);
      return synchroniseTraitPresentation(trait);
    }

    const entry = raw as TraitIndexEntry;
    const signatureMoves = Array.isArray(entry?.sinergie) ? [...entry.sinergie] : [];
    const trait: Trait = {
      id: typeof entry.id === 'string' && entry.id ? entry.id : fallbackId,
      name: typeof entry.label === 'string' ? entry.label : fallbackId,
      description:
        typeof entry.uso_funzione === 'string' && entry.uso_funzione
          ? entry.uso_funzione
          : typeof entry.mutazione_indotta === 'string'
            ? entry.mutazione_indotta
            : '',
      archetype: typeof entry.famiglia_tipologia === 'string' ? entry.famiglia_tipologia : '',
      playstyle: typeof entry.spinta_selettiva === 'string' ? entry.spinta_selettiva : '',
      signatureMoves,
      entry: {
        ...(entry as TraitIndexEntry),
        sinergie: [...signatureMoves],
      },
    };

    return synchroniseTraitPresentation(trait);
  }

  private updateTraitMeta(
    id: string,
    meta: { etag: string | null; version: string | null } | null | undefined,
  ): void {
    if (!id) {
      return;
    }
    const etag = meta?.etag && meta.etag.trim() ? meta.etag.trim() : null;
    const version = meta?.version && meta.version.trim() ? meta.version.trim() : null;
    if (!etag && !version) {
      this.traitMeta.delete(id);
      return;
    }
    this.traitMeta.set(id, { etag, version });
  }

  private async fetchTraitDetailFromApi(id: string): Promise<Trait | null> {
    const endpoint = this.endpointOverride ?? TRAIT_DATA_ENDPOINT;
    const target = this.buildRemoteMutationEndpoint(endpoint, id);
    if (!target) {
      return null;
    }

    const response = await this.fetchWithAuth(target, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw await this.buildRemoteError(response, id);
    }

    try {
      const payload = await response.json();
      if (payload?.meta) {
        this.updateTraitMeta(id, {
          etag:
            typeof payload.meta.etag === 'string' && payload.meta.etag.trim()
              ? payload.meta.etag.trim()
              : null,
          version:
            typeof payload.meta.version === 'string' && payload.meta.version.trim()
              ? payload.meta.version.trim()
              : null,
        });
      }

      if (payload?.trait) {
        const trait = this.normaliseRemoteTrait(payload.trait, id);
        if (trait) {
          this.updateLocalCache(trait);
          return trait;
        }
      }
    } catch (error) {
      console.warn('Impossibile analizzare il dettaglio remoto del tratto', error);
    }

    return null;
  }

  private async fetchWithAuth(url: string, init: RequestInit): Promise<Response> {
    if (typeof fetch !== 'function') {
      throw new Error('Fetch API non disponibile per completare il salvataggio remoto.');
    }

    const firstAttemptHeaders = this.mergeHeaders(init.headers);
    const token = await this.ensureAuthToken();
    if (token) {
      firstAttemptHeaders['Authorization'] = `Bearer ${token}`;
    }

    const firstResponse = await fetch(url, { ...init, headers: firstAttemptHeaders });
    if (firstResponse.status !== 401) {
      return firstResponse;
    }

    await this.refreshAuthToken(true);
    const retryHeaders = this.mergeHeaders(init.headers);
    const refreshedToken = await this.ensureAuthToken();
    if (refreshedToken) {
      retryHeaders['Authorization'] = `Bearer ${refreshedToken}`;
    }
    return fetch(url, { ...init, headers: retryHeaders });
  }

  private mergeHeaders(headers: RequestInit['headers']): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) {
      return result;
    }

    if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        if (key && value) {
          result[String(key)] = String(value);
        }
      });
      return result;
    }

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        if (key && value) {
          result[key] = value;
        }
      });
      return result;
    }

    Object.entries(headers as Record<string, string>).forEach(([key, value]) => {
      if (key && value) {
        result[key] = value;
      }
    });
    return result;
  }

  private async ensureAuthToken(): Promise<string | null> {
    try {
      return await this.refreshAuthToken(false);
    } catch (error) {
      console.warn('Impossibile aggiornare il token di autenticazione', error);
      return null;
    }
  }

  private async refreshAuthToken(force: boolean): Promise<string | null> {
    if (this.staticToken) {
      this.authToken = this.staticToken;
      this.tokenExpiresAt = null;
      return this.authToken;
    }

    if (!force && this.authToken) {
      if (this.tokenExpiresAt === null || this.tokenExpiresAt - Date.now() > 5_000) {
        return this.authToken;
      }
    }

    if (!this.tokenEndpoint) {
      this.authToken = null;
      this.tokenExpiresAt = null;
      return null;
    }

    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    const request = this.requestAuthToken().then(
      (result) => {
        const token = result?.token ?? null;
        this.authToken = token;
        this.tokenExpiresAt = result?.expiresAt ?? null;
        return token;
      },
      (error) => {
        this.authToken = null;
        this.tokenExpiresAt = null;
        throw error;
      },
    );

    this.tokenRefreshPromise = request;
    try {
      return await request;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async requestAuthToken(): Promise<{ token: string | null; expiresAt: number | null }> {
    if (!this.tokenEndpoint) {
      return { token: null, expiresAt: null };
    }

    if (typeof fetch !== 'function') {
      throw new Error('Fetch API non disponibile per il recupero del token.');
    }

    let response: Response;
    try {
      response = await fetch(this.tokenEndpoint, { method: 'POST' });
    } catch (error) {
      throw new Error(`Impossibile recuperare il token di autenticazione: ${String(error)}`);
    }

    if (!response.ok) {
      throw new Error(`Recupero token fallito con stato ${response.status}.`);
    }

    try {
      const payload = await response.json();
      const tokenCandidate =
        typeof payload?.token === 'string'
          ? payload.token
          : typeof payload?.access_token === 'string'
            ? payload.access_token
            : null;
      const expiresAt = this.resolveTokenExpiry(payload);
      return { token: tokenCandidate, expiresAt };
    } catch (error) {
      console.warn('Impossibile interpretare la risposta del token', error);
      return { token: null, expiresAt: null };
    }
  }

  private resolveTokenExpiry(payload: unknown): number | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const record = payload as Record<string, unknown>;
    const expiresAt = record.expiresAt ?? record.expires_at ?? null;
    if (typeof expiresAt === 'string') {
      const parsed = Date.parse(expiresAt);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof expiresAt === 'number') {
      if (expiresAt > 1_000_000_000_000) {
        return expiresAt;
      }
      return Date.now() + expiresAt * 1000;
    }
    const expiresIn = record.expiresIn ?? record.expires_in ?? null;
    if (typeof expiresIn === 'number') {
      return Date.now() + expiresIn * 1000;
    }
    if (typeof expiresIn === 'string') {
      const parsed = Number(expiresIn);
      if (!Number.isNaN(parsed)) {
        return Date.now() + parsed * 1000;
      }
    }
    return null;
  }

  private async handleConcurrencyFailure(id: string, response: Response): Promise<never> {
    let message = `Il salvataggio remoto è fallito con stato ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload?.error && typeof payload.error === 'string') {
        message = payload.error;
      }
      if (payload?.meta) {
        this.updateTraitMeta(id, {
          etag:
            typeof payload.meta.etag === 'string' && payload.meta.etag.trim()
              ? payload.meta.etag.trim()
              : null,
          version:
            typeof payload.meta.version === 'string' && payload.meta.version.trim()
              ? payload.meta.version.trim()
              : null,
        });
      }
    } catch (error) {
      console.warn('Impossibile interpretare la risposta di conflitto', error);
    }

    await this.syncTraitWithServer(id);
    throw new Error(message);
  }

  private async syncTraitWithServer(id: string): Promise<void> {
    try {
      await this.fetchTraitDetailFromApi(id);
    } catch (error) {
      console.warn('Impossibile sincronizzare il tratto dopo un conflitto', error);
    }
  }

  private async buildRemoteError(response: Response, id: string): Promise<Error> {
    let message = `Il salvataggio remoto è fallito con stato ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload?.error && typeof payload.error === 'string') {
        message = payload.error;
      }
    } catch (error) {
      console.warn('Impossibile leggere il messaggio di errore remoto', error);
    }
    await this.syncTraitWithServer(id);
    return new Error(message);
  }
}

export const registerTraitDataService = (module: any): void => {
  module.service('TraitDataService', TraitDataService);
};
