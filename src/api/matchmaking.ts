export interface SkillBracket {
  readonly min?: number;
  readonly max?: number;
}

export interface MatchmakingFilter {
  readonly region?: string;
  readonly mode?: string;
  readonly teamSize?: number;
  readonly crossplay?: boolean;
  readonly skillBracket?: SkillBracket;
}

export interface MatchmakingSummary {
  readonly id: string;
  readonly region: string;
  readonly mode: string;
  readonly playersInQueue: number;
  readonly averageWaitTime: number;
  readonly updatedAt: string;
}

export interface MatchmakingClientOptions {
  readonly baseUrl?: string;
  readonly cacheTtlMs?: number;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
}

interface CacheEntry {
  expiresAt: number;
  payload: MatchmakingSummary[];
}

export type FlattenedFilters = Record<string, string | number | boolean>;

export const MATCHMAKING_ENDPOINT = '/api/matchmaking';

export const DEFAULT_CACHE_TTL_MS = 30_000;

const serializeBoolean = (value: boolean): string => (value ? 'true' : 'false');

export function flattenFilters(filters: MatchmakingFilter = {}): FlattenedFilters {
  const normalized: FlattenedFilters = {};
  if (filters.region) {
    normalized.region = filters.region;
  }
  if (filters.mode) {
    normalized.mode = filters.mode;
  }
  if (filters.teamSize !== undefined) {
    normalized.teamSize = filters.teamSize;
  }
  if (filters.crossplay !== undefined) {
    normalized.crossplay = serializeBoolean(filters.crossplay);
  }
  const bracket = filters.skillBracket;
  if (bracket?.min !== undefined) {
    normalized.skillMin = bracket.min;
  }
  if (bracket?.max !== undefined) {
    normalized.skillMax = bracket.max;
  }
  return normalized;
}

const buildQueryString = (filters: MatchmakingFilter): string => {
  const params = new URLSearchParams();
  Object.entries(flattenFilters(filters)).forEach(([key, value]) => {
    params.append(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

const isMatchmakingSummaryArray = (value: unknown): value is MatchmakingSummary[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof (entry as MatchmakingSummary).id === 'string' &&
        typeof (entry as MatchmakingSummary).region === 'string' &&
        typeof (entry as MatchmakingSummary).mode === 'string' &&
        typeof (entry as MatchmakingSummary).playersInQueue === 'number' &&
        typeof (entry as MatchmakingSummary).averageWaitTime === 'number' &&
        typeof (entry as MatchmakingSummary).updatedAt === 'string',
    )
  );
};

export class MatchmakingClient {
  private readonly baseUrl: string;
  private readonly cacheTtlMs: number;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: MatchmakingClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? MATCHMAKING_ENDPOINT;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.fetcher = options.fetch ?? (globalThis.fetch?.bind(globalThis) as typeof fetch);
    if (!this.fetcher) {
      throw new Error("MatchmakingClient richiede un'implementazione fetch disponibile.");
    }
    this.now = options.now ?? (() => Date.now());
  }

  private getCacheKey(filters: MatchmakingFilter): string {
    return JSON.stringify(flattenFilters(filters));
  }

  clearCache(filters?: MatchmakingFilter): void {
    if (!filters) {
      this.cache.clear();
      return;
    }
    this.cache.delete(this.getCacheKey(filters));
  }

  async fetchSummaries(filters: MatchmakingFilter = {}): Promise<MatchmakingSummary[]> {
    const key = this.getCacheKey(filters);
    const currentTime = this.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > currentTime) {
      return cached.payload;
    }

    const url = `${this.baseUrl}${buildQueryString(filters)}`;
    const response = await this.fetcher(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Richiesta matchmaking fallita con status ${response.status}`);
    }

    const payload = await response.json();
    if (!isMatchmakingSummaryArray(payload)) {
      throw new Error('Risposta matchmaking non valida.');
    }

    const immutablePayload = payload.map((entry) => ({ ...entry }));

    this.cache.set(key, {
      expiresAt: currentTime + this.cacheTtlMs,
      payload: immutablePayload,
    });

    return immutablePayload;
  }
}

export default MatchmakingClient;
