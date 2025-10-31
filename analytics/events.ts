import type { AnalyticsAdapter } from './matchmaking';

export const EVENT_JOIN = 'events.join';
export const EVENT_COMPLETE = 'events.complete';
export const EVENT_PURCHASE = 'events.purchase';

export interface EventJoinPayload {
  eventId: string;
  playerId: string;
  partySize?: number;
  joinMethod?: string;
  phaseId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface EventCompletePayload {
  eventId: string;
  playerId: string;
  result: 'victory' | 'defeat' | 'abandon' | 'timeout';
  durationMs?: number;
  rewards?: string[];
  phaseId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface EventPurchasePayload {
  eventId: string;
  playerId: string;
  sku: string;
  currency: string;
  amount: number;
  quantity?: number;
  source?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface EventsAnalytics {
  recordJoin(payload: EventJoinPayload): void;
  recordCompletion(payload: EventCompletePayload): void;
  recordPurchase(payload: EventPurchasePayload): void;
}

const sanitizeMetadata = (metadata?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  return { ...metadata };
};

const sanitizeStringList = (values?: string[]): string[] | undefined => {
  if (!Array.isArray(values)) {
    return undefined;
  }
  return values.map((value) => String(value));
};

const normalizeTimestamp = (timestamp?: string): string | undefined => {
  if (!timestamp) {
    return undefined;
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
};

const normalizePartySize = (partySize?: number): number | undefined => {
  if (typeof partySize !== 'number' || !Number.isFinite(partySize)) {
    return undefined;
  }
  const rounded = Math.max(1, Math.round(partySize));
  return rounded;
};

const normalizeAmount = (amount: number): number | undefined => {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return undefined;
  }
  return Math.round(amount * 100) / 100;
};

const compact = <T extends Record<string, unknown>>(payload: T): T => {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>) as T;
};

export function createEventsAnalytics(adapter: AnalyticsAdapter): EventsAnalytics {
  const track = (eventName: string, payload: Record<string, unknown>): void => {
    adapter.track(eventName, payload);
  };

  return {
    recordJoin(payload: EventJoinPayload): void {
      track(
        EVENT_JOIN,
        compact({
          eventId: String(payload.eventId),
          playerId: String(payload.playerId),
          partySize: normalizePartySize(payload.partySize),
          joinMethod: payload.joinMethod ? String(payload.joinMethod) : undefined,
          phaseId: payload.phaseId ? String(payload.phaseId) : undefined,
          timestamp: normalizeTimestamp(payload.timestamp) ?? new Date().toISOString(),
          metadata: sanitizeMetadata(payload.metadata),
        }),
      );
    },
    recordCompletion(payload: EventCompletePayload): void {
      track(
        EVENT_COMPLETE,
        compact({
          eventId: String(payload.eventId),
          playerId: String(payload.playerId),
          result: String(payload.result),
          durationMs:
            typeof payload.durationMs === 'number' && Number.isFinite(payload.durationMs)
              ? payload.durationMs
              : undefined,
          rewards: sanitizeStringList(payload.rewards),
          phaseId: payload.phaseId ? String(payload.phaseId) : undefined,
          timestamp: normalizeTimestamp(payload.timestamp) ?? new Date().toISOString(),
          metadata: sanitizeMetadata(payload.metadata),
        }),
      );
    },
    recordPurchase(payload: EventPurchasePayload): void {
      track(
        EVENT_PURCHASE,
        compact({
          eventId: String(payload.eventId),
          playerId: String(payload.playerId),
          sku: String(payload.sku),
          currency: String(payload.currency).toUpperCase(),
          amount: normalizeAmount(payload.amount),
          quantity:
            typeof payload.quantity === 'number' && Number.isFinite(payload.quantity)
              ? Math.max(1, Math.round(payload.quantity))
              : 1,
          source: payload.source ? String(payload.source) : undefined,
          timestamp: normalizeTimestamp(payload.timestamp) ?? new Date().toISOString(),
          metadata: sanitizeMetadata(payload.metadata),
        }),
      );
    },
  };
}

export default createEventsAnalytics;
