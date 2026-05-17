import { describe, it } from 'node:test';
import assert from 'assert';
import {
  ServiceActorSessionsClient,
  SERVICE_ACTOR_SESSIONS_ENDPOINT,
  type ServiceActorSession,
} from '../../src/api/serviceActorSessions';

const sampleSession: ServiceActorSession = {
  id: 'session-001',
  actor: 'ingestor',
  status: 'active',
  createdAt: '2025-11-22T10:00:00.000Z',
  updatedAt: '2025-11-22T10:00:00.000Z',
  expiresAt: '2025-11-22T11:00:00.000Z',
  metadata: { region: 'eu-west' },
};

describe('ServiceActorSessionsClient', () => {
  it('crea una sessione inviando la richiesta al percorso previsto', async () => {
    const captured: Array<{ url: string; init?: RequestInit }> = [];
    const fetchStub: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      captured.push({ url, init });
      return {
        ok: true,
        status: 201,
        json: async () => sampleSession,
      } as unknown as Response;
    };

    const client = new ServiceActorSessionsClient({
      baseUrl: 'https://api.example.com/actors/sessions',
      fetch: fetchStub,
    });

    const result = await client.createSession({
      actor: 'ingestor',
      ttlSeconds: 900,
      metadata: { scope: 'full' },
    });

    assert.strictEqual(result.id, sampleSession.id);
    assert.strictEqual(captured.length, 1, 'deve essere eseguita una sola richiesta');
    assert.strictEqual(captured[0].url, 'https://api.example.com/actors/sessions');
    assert.strictEqual(captured[0].init?.method, 'POST');
    assert.deepStrictEqual(JSON.parse(String(captured[0].init?.body)), {
      actor: 'ingestor',
      ttlSeconds: 900,
      metadata: { scope: 'full' },
    });
  });

  it('recupera e valida una sessione esistente', async () => {
    const fetchStub: typeof fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => sampleSession,
      }) as unknown as Response;

    const client = new ServiceActorSessionsClient({
      baseUrl: 'https://api.example.com/sessions',
      fetch: fetchStub,
    });

    const result = await client.getSession('session-001');
    assert.strictEqual(result.actor, 'ingestor');
    assert.strictEqual(result.status, 'active');
    assert.strictEqual(result.updatedAt, sampleSession.updatedAt);
  });

  it('invia heartbeat e interpreta il payload restituito', async () => {
    const capturedUrls: string[] = [];
    const fetchStub: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      capturedUrls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...sampleSession, status: 'heartbeat', expiresAt: null }),
      } as unknown as Response;
    };

    const client = new ServiceActorSessionsClient({
      fetch: fetchStub,
      baseUrl: SERVICE_ACTOR_SESSIONS_ENDPOINT,
    });

    const result = await client.heartbeat('session-002', {
      ttlSeconds: 120,
      metadata: { shards: 2 },
    });

    assert.strictEqual(result.status, 'heartbeat');
    assert.strictEqual(result.expiresAt, null);
    assert.strictEqual(capturedUrls[0], `${SERVICE_ACTOR_SESSIONS_ENDPOINT}/session-002/heartbeat`);
  });

  it('applica il filtro actor quando elenca le sessioni', async () => {
    const captured: string[] = [];
    const fetchStub: typeof fetch = async (input) => {
      captured.push(typeof input === 'string' ? input : (input as URL | Request).toString());
      return {
        ok: true,
        status: 200,
        json: async () => [sampleSession],
      } as unknown as Response;
    };

    const client = new ServiceActorSessionsClient({ fetch: fetchStub });
    const result = await client.listSessions('ingestor');

    assert.strictEqual(result.length, 1);
    assert.ok(captured[0].includes('?actor=ingestor'));
  });

  it('propaga errori su risposte non valide o mancanza di fetch', async () => {
    const originalFetch = globalThis.fetch;
    // Forza il costruttore a non trovare un fetch disponibile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = undefined;
    const invalidClient = () =>
      new ServiceActorSessionsClient({ fetch: undefined as unknown as typeof fetch });
    assert.throws(invalidClient, /fetch disponibile/);
    (globalThis as any).fetch = originalFetch;

    const fetchStub: typeof fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ foo: 'bar' }),
      }) as unknown as Response;

    const client = new ServiceActorSessionsClient({ fetch: fetchStub });
    await assert.rejects(() => client.getSession('missing'), /Risposta sessione non valida/);
  });
});
