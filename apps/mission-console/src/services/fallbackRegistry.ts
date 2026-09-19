export interface FallbackLogger {
  log?: (event: string, payload?: Record<string, unknown>) => void;
}

export interface FallbackEventConfig {
  event?: string;
  level?: string;
  message?: string;
  metaBuilder?: (payload: unknown) => Record<string, unknown> | undefined;
}

export interface ResolveWithFallbackOptions<T extends Record<string, unknown>> {
  attemptPrimary: () => Promise<T>;
  attemptFallback?: (error?: Error) => Promise<T> | null;
  preferFallbackFirst?: boolean;
  logger?: FallbackLogger | null;
  scope?: string;
  events?: Record<string, FallbackEventConfig> & {
    primaryStart?: FallbackEventConfig;
    primarySuccess?: FallbackEventConfig;
    primaryFailure?: FallbackEventConfig;
    fallbackStart?: FallbackEventConfig;
    fallbackSuccess?: FallbackEventConfig;
    fallbackFailure?: FallbackEventConfig;
    fallbackFirstFailure?: FallbackEventConfig;
    fallbackPreferred?: FallbackEventConfig;
  };
}

export type FallbackResolution<T extends Record<string, unknown>> = T & {
  source: 'remote' | 'fallback';
  error: Error | null;
};

function normaliseError(value: unknown, fallbackKey?: string): Error {
  if (value instanceof Error) {
    if (fallbackKey && !value.message) {
      value.message = fallbackKey;
    }
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  const error = new Error(fallbackKey || 'errors.generic');
  Object.defineProperty(error, 'cause', { value, enumerable: false, configurable: true });
  return error;
}

function emitLog(
  logger: FallbackLogger | null | undefined,
  scope: string,
  event: FallbackEventConfig | undefined,
  extras: Record<string, unknown> = {},
) {
  if (!logger || typeof logger.log !== 'function' || !event?.event) {
    return;
  }
  logger.log(event.event, {
    scope,
    level: event.level ?? 'info',
    message: event.message,
    ...extras,
  });
}

function buildMeta(
  event: FallbackEventConfig | undefined,
  payload: unknown,
): Record<string, unknown> | undefined {
  if (!event?.metaBuilder) {
    return undefined;
  }
  try {
    return event.metaBuilder(payload);
  } catch (error) {
    return undefined;
  }
}

export async function resolveWithFallback<T extends Record<string, unknown>>({
  attemptPrimary,
  attemptFallback,
  preferFallbackFirst = false,
  logger = null,
  scope = 'flow',
  events = {},
}: ResolveWithFallbackOptions<T>): Promise<FallbackResolution<T>> {
  const runAttempt = async (label: 'primary' | 'fallback', handler: () => Promise<T>) => {
    const startEvent = events[`${label}Start`];
    emitLog(logger, scope, startEvent, {});
    const result = await handler();
    const successEvent = events[`${label}Success`];
    emitLog(logger, scope, successEvent, {
      meta: buildMeta(successEvent, result),
    });
    return result;
  };

  const runFallback = async (primaryError: Error): Promise<FallbackResolution<T>> => {
    if (!attemptFallback) {
      throw primaryError;
    }
    const fallbackHandler = () => attemptFallback(primaryError) as Promise<T>;
    try {
      emitLog(logger, scope, events.fallbackStart, {
        meta: buildMeta(events.fallbackStart, primaryError),
      });
      const fallbackResult = await fallbackHandler();
      emitLog(logger, scope, events.fallbackSuccess, {
        meta: buildMeta(events.fallbackSuccess, fallbackResult),
      });
      return Object.assign({}, fallbackResult, {
        source: 'fallback' as const,
        error: primaryError,
      });
    } catch (fallbackError) {
      const normalised = normaliseError(fallbackError, events.fallbackFailure?.message);
      if (primaryError && !('cause' in normalised)) {
        Object.defineProperty(normalised, 'cause', {
          value: primaryError,
          configurable: true,
        });
      }
      emitLog(logger, scope, events.fallbackFailure, {});
      throw normalised;
    }
  };

  if (preferFallbackFirst && attemptFallback) {
    emitLog(logger, scope, events.fallbackPreferred, {});
    try {
      const fallbackResult = await attemptFallback();
      emitLog(logger, scope, events.fallbackSuccess, {
        meta: buildMeta(events.fallbackSuccess, fallbackResult),
      });
      return Object.assign({}, fallbackResult, {
        source: 'fallback' as const,
        error: null,
      });
    } catch (fallbackPreferredError) {
      emitLog(logger, scope, events.fallbackFirstFailure, {
        meta: buildMeta(events.fallbackFirstFailure, fallbackPreferredError),
      });
    }
  }

  try {
    const primaryResult = await runAttempt('primary', attemptPrimary);
    return Object.assign({}, primaryResult, {
      source: 'remote' as const,
      error: null,
    });
  } catch (primaryError) {
    const error = normaliseError(primaryError, events.primaryFailure?.message);
    emitLog(logger, scope, events.primaryFailure, {
      meta: buildMeta(events.primaryFailure, error),
    });
    return runFallback(error);
  }
}

export const __internals__ = {
  normaliseError,
  emitLog,
  buildMeta,
};
