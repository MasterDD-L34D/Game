import { describe, it } from 'node:test';
import assert from 'assert';
import { MatchmakingClient, type MatchmakingFilter } from '../../src/api/matchmaking';
import {
  createMatchmakingAnalytics,
  MATCHMAKING_FILTER_APPLIED,
  MATCHMAKING_FILTER_RESET,
} from '../../analytics/matchmaking';

describe('Matchmaking — combinazione filtri', () => {
  it('costruisce la query combinata e utilizza la cache per richieste identiche', async () => {
    let currentTime = 1000;
    const capturedUrls: string[] = [];
    const responsePayload = [
      {
        id: 'match-001',
        region: 'EU',
        mode: 'ranked',
        playersInQueue: 1540,
        averageWaitTime: 67,
        updatedAt: new Date().toISOString(),
      },
    ];

    const fetchStub: typeof fetch = async (input) => {
      const url =
        typeof input === 'string'
          ? input
          : typeof input === 'object' && input && 'url' in input
            ? String((input as { url: string }).url)
            : String(input);
      capturedUrls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => responsePayload,
      } as unknown as Response;
    };

    const client = new MatchmakingClient({
      fetch: fetchStub,
      cacheTtlMs: 5_000,
      now: () => currentTime,
    });

    const filters: MatchmakingFilter = {
      region: 'EU',
      mode: 'ranked',
      teamSize: 3,
      crossplay: false,
      skillBracket: { min: 1200, max: 1800 },
    };

    const first = await client.fetchSummaries(filters);
    assert.strictEqual(first.length, 1, 'il payload deve essere restituito');
    assert.strictEqual(capturedUrls.length, 1, 'la prima richiesta deve raggiungere la rete');
    assert.match(capturedUrls[0], /region=EU/, 'la query deve contenere il filtro regione');
    assert.match(capturedUrls[0], /mode=ranked/, 'la query deve contenere il filtro modalità');
    assert.match(capturedUrls[0], /teamSize=3/, 'la query deve includere la dimensione squadra');
    assert.match(capturedUrls[0], /crossplay=false/, 'la query deve includere cross-play');
    assert.match(capturedUrls[0], /skillMin=1200/, 'la query deve includere il minimo skill');
    assert.match(capturedUrls[0], /skillMax=1800/, 'la query deve includere il massimo skill');

    const second = await client.fetchSummaries(filters);
    assert.strictEqual(second.length, 1, 'la cache deve restituire gli stessi risultati');
    assert.strictEqual(capturedUrls.length, 1, 'la cache deve evitare richieste duplicate');

    currentTime += 10_000;
    const third = await client.fetchSummaries(filters);
    assert.strictEqual(third.length, 1, 'anche dopo la scadenza deve tornare dati validi');
    assert.strictEqual(
      capturedUrls.length,
      2,
      'dopo la scadenza deve essere effettuata una nuova richiesta',
    );
  });

  it('mantiene immutabile il payload restituito dalla cache', async () => {
    let currentTime = 1000;
    let fetchCount = 0;
    const responsePayload = [
      {
        id: 'match-002',
        region: 'NA',
        mode: 'casual',
        playersInQueue: 850,
        averageWaitTime: 42,
        updatedAt: new Date().toISOString(),
      },
    ];

    const fetchStub: typeof fetch = async () => {
      fetchCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => responsePayload,
      } as unknown as Response;
    };

    const client = new MatchmakingClient({
      fetch: fetchStub,
      cacheTtlMs: 5_000,
      now: () => currentTime,
    });

    const filters: MatchmakingFilter = { region: 'NA', mode: 'casual' };

    const first = await client.fetchSummaries(filters);
    assert.strictEqual(fetchCount, 1, 'la prima chiamata deve interrogare la rete');

    const firstEntry = first[0];
    assert.ok(firstEntry, 'la risposta iniziale deve contenere un elemento');
    first.pop();
    firstEntry.playersInQueue = 9999;

    const second = await client.fetchSummaries(filters);
    assert.strictEqual(fetchCount, 1, 'la seconda chiamata deve usare la cache');
    assert.notStrictEqual(second, first, 'la cache deve restituire un nuovo array');
    assert.strictEqual(
      second.length,
      responsePayload.length,
      'la risposta cache deve mantenere la stessa cardinalità dei dati originali',
    );
    assert.strictEqual(
      second[0].playersInQueue,
      responsePayload[0].playersInQueue,
      'la risposta cache deve contenere i dati originali',
    );

    second[0].playersInQueue = 1234;
    second.push({
      id: 'match-extra',
      region: 'NA',
      mode: 'casual',
      playersInQueue: 10,
      averageWaitTime: 5,
      updatedAt: responsePayload[0].updatedAt,
    });

    const third = await client.fetchSummaries(filters);
    assert.strictEqual(fetchCount, 1, 'le richieste successive devono continuare a usare la cache');
    assert.notStrictEqual(third, second, 'ogni chiamata deve restituire un nuovo array');
    assert.deepStrictEqual(
      third,
      responsePayload,
      'la mutazione della risposta cache non deve influenzare la cache interna',
    );
  });

  it('registra eventi analytics per filtri combinati e reset', () => {
    const recorded: Array<{ event: string; payload: Record<string, unknown> }> = [];
    const analytics = createMatchmakingAnalytics({
      track(eventName, payload) {
        recorded.push({ event: eventName, payload: payload ?? {} });
      },
    });

    analytics.recordFilterApplied({
      filters: {
        region: 'NA',
        mode: 'casual',
        crossplay: true,
        teamSize: 2,
        skillBracket: { min: 800, max: 1500 },
      },
      resultCount: 12,
      source: 'sidebar',
    });

    analytics.recordFilterReset({ source: 'sidebar' });

    assert.strictEqual(recorded.length, 2, 'devono essere registrati due eventi');
    assert.strictEqual(recorded[0].event, MATCHMAKING_FILTER_APPLIED);
    assert.deepStrictEqual(recorded[0].payload.filters, {
      region: 'NA',
      mode: 'casual',
      crossplay: 'true',
      teamSize: 2,
      skillMin: 800,
      skillMax: 1500,
    });
    assert.strictEqual(recorded[0].payload.resultCount, 12);
    assert.strictEqual(recorded[0].payload.source, 'sidebar');

    assert.strictEqual(recorded[1].event, MATCHMAKING_FILTER_RESET);
    assert.strictEqual(recorded[1].payload.source, 'sidebar');
  });
});
