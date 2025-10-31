import { describe, it } from 'node:test';
import assert from 'assert';
import { createEventsScheduler } from '../../services/eventsScheduler/index.js';
import {
  createEventsAnalytics,
  EVENT_JOIN,
  EVENT_COMPLETE,
  EVENT_PURCHASE,
} from '../../analytics/events';

describe('Dynamic events — scheduler e telemetria', () => {
  it('gestisce timeline multi-fuso e registra telemetria end-to-end', () => {
    const now = () => new Date('2024-02-10T08:00:00Z');

    const scheduler = createEventsScheduler({
      timezone: 'Europe/Rome',
      now,
      manualFallback: [
        {
          id: 'fallback-briefing',
          title: 'Briefing di emergenza',
          start: '2024-02-10T08:30',
          durationMinutes: 45,
          timezone: 'UTC',
          metadata: { description: 'Contingency plan attivo.' },
        },
      ],
    });

    const events = [
      {
        id: 'raid-alba',
        title: 'Raid Alba Nebula',
        start: '2024-02-10T10:00',
        durationMinutes: 120,
        metadata: {
          description: 'Invasione coordinata sui bastioni orbitali.',
          rewards: ['Sigillo Zenith', '7500 crediti'],
        },
        tags: ['raid', 'premium'],
        phases: [
          { id: 'setup', label: 'Preparazione', offsetMinutes: 0, durationMinutes: 30 },
          { id: 'assault', label: 'Assalto', offsetMinutes: 30, durationMinutes: 60 },
          { id: 'recover', label: 'Recupero', offsetMinutes: 90, durationMinutes: 30 },
        ],
      },
      {
        id: 'raid-crepuscolo',
        title: 'Raid Crepuscolo',
        start: '2024-02-10T18:30',
        durationMinutes: 90,
        timezone: 'Europe/London',
        phases: [
          { id: 'intel', label: 'Intelligence', offsetMinutes: 0, durationMinutes: 20 },
          { id: 'breach', label: 'Breach', offsetMinutes: 20, durationMinutes: 40 },
        ],
      },
    ];

    scheduler.load(events);

    const timeline = scheduler.getTimeline();
    assert.strictEqual(timeline.length, 2, 'La timeline deve includere due eventi programmati');
    assert.strictEqual(timeline[0].id, 'raid-alba');
    assert.strictEqual(
      timeline[0].isoStart,
      '2024-02-10T09:00:00.000Z',
      'L\'inizio deve essere convertito in UTC rispettando il fuso orario globale',
    );
    assert.strictEqual(timeline[0].phases?.length, 3, 'Devono essere presenti tre fasi');
    assert.strictEqual(
      timeline[0].phases?.[1].isoStart,
      '2024-02-10T09:30:00.000Z',
      'La fase di assalto deve essere calcolata con offset corretto',
    );
    assert.strictEqual(timeline[1].isoStart, '2024-02-10T18:30:00.000Z');
    assert.strictEqual(timeline[1].timezone, 'Europe/London');

    const active = scheduler.getActiveEvents('2024-02-10T09:45:00Z');
    assert.strictEqual(active.length, 1, 'Un evento deve essere attivo alle 09:45Z');
    assert.strictEqual(active[0].id, 'raid-alba');

    const next = scheduler.getNextEvent('2024-02-10T12:30:00Z');
    assert.ok(next, 'Deve esistere un evento successivo');
    assert.strictEqual(next?.id, 'raid-crepuscolo');

    scheduler.setTimezone('Invalid/Timezone');
    const fallbackTimeline = scheduler.getTimeline();
    assert.strictEqual(scheduler.isUsingFallback(), true, 'Con fuso invalido deve attivarsi il fallback');
    assert.strictEqual(fallbackTimeline.length, 1, 'Il fallback deve contenere un evento');
    assert.strictEqual(fallbackTimeline[0].id, 'fallback-briefing');
    assert.strictEqual(
      fallbackTimeline[0].isoStart,
      '2024-02-10T08:30:00.000Z',
      'Il fallback deve rispettare il proprio fuso orario',
    );

    scheduler.setTimezone('Europe/Rome');
    scheduler.load(events);

    const recorded: Array<{ event: string; payload: Record<string, unknown> }> = [];
    const analytics = createEventsAnalytics({
      track(eventName, payload) {
        recorded.push({ event: eventName, payload: payload ?? {} });
      },
    });

    const raidAlba = scheduler.getActiveEvents('2024-02-10T09:45:00Z')[0];
    const raidPhase = raidAlba.phases?.find((phase) => phase.id === 'assault');

    analytics.recordJoin({
      eventId: raidAlba.id,
      playerId: 'scout-09',
      partySize: 3,
      joinMethod: 'matchmaking',
      phaseId: raidPhase?.id,
      timestamp: '2024-02-10T09:45:00Z',
    });

    analytics.recordCompletion({
      eventId: raidAlba.id,
      playerId: 'scout-09',
      result: 'victory',
      durationMs: 7_200_000,
      rewards: ['Sigillo Zenith'],
      timestamp: '2024-02-10T11:05:00Z',
    });

    analytics.recordPurchase({
      eventId: raidAlba.id,
      playerId: 'scout-09',
      sku: 'bundle_xp_boost',
      currency: 'eur',
      amount: 4.989,
      quantity: 2,
      source: 'timeline',
      timestamp: '2024-02-10T09:50:00Z',
    });

    assert.strictEqual(recorded.length, 3, 'Devono essere registrati tre eventi');

    const join = recorded[0];
    assert.strictEqual(join.event, EVENT_JOIN);
    assert.strictEqual(join.payload.eventId, 'raid-alba');
    assert.strictEqual(join.payload.playerId, 'scout-09');
    assert.strictEqual(join.payload.partySize, 3);
    assert.strictEqual(join.payload.joinMethod, 'matchmaking');
    assert.strictEqual(join.payload.phaseId, 'assault');
    assert.strictEqual(join.payload.timestamp, new Date('2024-02-10T09:45:00Z').toISOString());

    const completion = recorded[1];
    assert.strictEqual(completion.event, EVENT_COMPLETE);
    assert.strictEqual(completion.payload.result, 'victory');
    assert.strictEqual(completion.payload.durationMs, 7_200_000);
    assert.deepStrictEqual(completion.payload.rewards, ['Sigillo Zenith']);

    const purchase = recorded[2];
    assert.strictEqual(purchase.event, EVENT_PURCHASE);
    assert.strictEqual(purchase.payload.currency, 'EUR');
    assert.strictEqual(purchase.payload.amount, 4.99);
    assert.strictEqual(purchase.payload.quantity, 2);

    const exported = scheduler.toJSON();
    assert.strictEqual(exported.events.length, 2, 'La serializzazione deve mantenere gli eventi');
    assert.strictEqual(exported.manualFallback.length, 1, 'La serializzazione deve includere il fallback');
    assert.strictEqual(exported.timezone, 'Europe/Rome');
  });
});
