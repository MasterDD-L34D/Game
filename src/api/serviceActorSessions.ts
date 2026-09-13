export interface ServiceActorSession {
  readonly id: string;
  readonly actor: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
  readonly expiresAt?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

export interface CreateServiceActorSessionInput {
  readonly actor: string;
  readonly ttlSeconds?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface HeartbeatSessionInput {
  readonly ttlSeconds?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface ServiceActorSessionsClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export const SERVICE_ACTOR_SESSIONS_ENDPOINT = '/api/service-actors/sessions';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeNullableString = (value: unknown, field: string): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  throw new Error(`Campo ${field} non valido nella risposta sessione.`);
};

const normalizeNullableRecord = (
  value: unknown,
  field: string,
): Record<string, unknown> | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (isPlainObject(value)) return value;
  throw new Error(`Campo ${field} non valido nella risposta sessione.`);
};

function ensureSessionPayload(value: unknown): ServiceActorSession {
  if (!isPlainObject(value)) {
    throw new Error('Risposta sessione non valida.');
  }

  const { id, actor, status, createdAt, updatedAt, expiresAt, metadata } = value;

  if (typeof id !== 'string' || typeof actor !== 'string' || typeof status !== 'string') {
    throw new Error('Risposta sessione non valida.');
  }

  if (typeof createdAt !== 'string') {
    throw new Error('Risposta sessione non valida.');
  }

  return {
    id,
    actor,
    status,
    createdAt,
    updatedAt: normalizeNullableString(updatedAt, 'updatedAt'),
    expiresAt: normalizeNullableString(expiresAt, 'expiresAt'),
    metadata: normalizeNullableRecord(metadata, 'metadata'),
  };
}

const ensureSessionArray = (value: unknown): ServiceActorSession[] => {
  if (!Array.isArray(value)) {
    throw new Error('Risposta sessione non valida.');
  }
  return value.map(ensureSessionPayload);
};

const buildUrl = (baseUrl: string, suffix: string): string => {
  if (!suffix) return baseUrl;
  if (baseUrl.endsWith('/')) {
    return `${baseUrl}${suffix.replace(/^\//, '')}`;
  }
  return `${baseUrl}/${suffix.replace(/^\//, '')}`;
};

export class ServiceActorSessionsClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: ServiceActorSessionsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? SERVICE_ACTOR_SESSIONS_ENDPOINT;
    this.fetcher = options.fetch ?? (globalThis.fetch?.bind(globalThis) as typeof fetch);
    if (!this.fetcher) {
      throw new Error("ServiceActorSessionsClient richiede un'implementazione fetch disponibile.");
    }
  }

  async createSession(payload: CreateServiceActorSessionInput): Promise<ServiceActorSession> {
    const response = await this.fetcher(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Creazione sessione attore fallita con status ${response.status}`);
    }

    const body = await response.json();
    return ensureSessionPayload(body);
  }

  async getSession(sessionId: string): Promise<ServiceActorSession> {
    const url = buildUrl(this.baseUrl, sessionId);
    const response = await this.fetcher(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Recupero sessione attore fallito con status ${response.status}`);
    }

    const body = await response.json();
    return ensureSessionPayload(body);
  }

  async heartbeat(
    sessionId: string,
    payload: HeartbeatSessionInput = {},
  ): Promise<ServiceActorSession> {
    const url = buildUrl(this.baseUrl, `${sessionId}/heartbeat`);
    const response = await this.fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Heartbeat sessione attore fallito con status ${response.status}`);
    }

    const body = await response.json();
    return ensureSessionPayload(body);
  }

  async listSessions(actor?: string): Promise<ServiceActorSession[]> {
    const query = actor ? `?actor=${encodeURIComponent(actor)}` : '';
    const url = `${this.baseUrl}${query}`;
    const response = await this.fetcher(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Elenco sessioni attore fallito con status ${response.status}`);
    }

    const body = await response.json();
    return ensureSessionArray(body);
  }
}

export default ServiceActorSessionsClient;
