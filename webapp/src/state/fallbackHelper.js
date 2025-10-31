function normaliseError(value, fallbackKey) {
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
  error.cause = value;
  return error;
}

export async function resolveWithFallback({
  attemptPrimary,
  attemptFallback,
  preferFallbackFirst = false,
  logger,
  scope = 'flow',
  events = {},
}) {
  const log = (event, details = {}) => {
    if (logger && typeof logger.log === 'function' && event) {
      logger.log(event, { scope, ...details });
    }
  };

  const runAttempt = async (label, attempt) => {
    log(events[`${label}Start`]?.event, {
      level: events[`${label}Start`]?.level || 'info',
      message: events[`${label}Start`]?.message,
    });
    const result = await attempt();
    log(events[`${label}Success`]?.event, {
      level: events[`${label}Success`]?.level || 'info',
      message: events[`${label}Success`]?.message,
      meta: events[`${label}Success`]?.metaBuilder
        ? events[`${label}Success`].metaBuilder(result)
        : undefined,
    });
    return result;
  };

  const runFallback = async (primaryError) => {
    if (!attemptFallback) {
      throw primaryError;
    }
    try {
      log(events.fallbackStart?.event, {
        level: events.fallbackStart?.level || 'warning',
        message: events.fallbackStart?.message,
        meta: events.fallbackStart?.metaBuilder
          ? events.fallbackStart.metaBuilder(primaryError)
          : undefined,
      });
      const fallbackResult = await attemptFallback(primaryError);
      log(events.fallbackSuccess?.event, {
        level: events.fallbackSuccess?.level || 'warning',
        message: events.fallbackSuccess?.message,
        meta: events.fallbackSuccess?.metaBuilder
          ? events.fallbackSuccess.metaBuilder(fallbackResult)
          : undefined,
      });
      return { ...fallbackResult, source: 'fallback', error: primaryError };
    } catch (fallbackError) {
      const error = normaliseError(fallbackError, events.fallbackFailure?.message);
      if (error && primaryError && !error.cause) {
        error.cause = primaryError;
      }
      log(events.fallbackFailure?.event, {
        level: events.fallbackFailure?.level || 'error',
        message: events.fallbackFailure?.message,
      });
      throw error;
    }
  };

  const preferFallbackEvent = preferFallbackFirst ? events.fallbackPreferred : null;
  if (preferFallbackEvent && attemptFallback) {
    log(preferFallbackEvent.event, {
      level: preferFallbackEvent.level || 'info',
      message: preferFallbackEvent.message,
    });
    try {
      const fallbackResult = await attemptFallback();
      log(events.fallbackSuccess?.event, {
        level: events.fallbackSuccess?.level || 'warning',
        message: events.fallbackSuccess?.message,
        meta: events.fallbackSuccess?.metaBuilder
          ? events.fallbackSuccess.metaBuilder(fallbackResult)
          : undefined,
      });
      return { ...fallbackResult, source: 'fallback', error: null };
    } catch (fallbackPreferredError) {
      log(events.fallbackFirstFailure?.event, {
        level: events.fallbackFirstFailure?.level || 'warning',
        message: events.fallbackFirstFailure?.message,
        meta: events.fallbackFirstFailure?.metaBuilder
          ? events.fallbackFirstFailure.metaBuilder(fallbackPreferredError)
          : undefined,
      });
    }
  }

  let primaryResult;
  try {
    primaryResult = await runAttempt('primary', attemptPrimary);
    return { ...primaryResult, source: 'remote', error: null };
  } catch (primaryError) {
    const normalisedError = normaliseError(primaryError, events.primaryFailure?.message);
    log(events.primaryFailure?.event, {
      level: events.primaryFailure?.level || 'error',
      message: events.primaryFailure?.message,
      meta: events.primaryFailure?.metaBuilder
        ? events.primaryFailure.metaBuilder(normalisedError)
        : undefined,
    });
    return runFallback(normalisedError);
  }
}

export const __internals__ = { normaliseError };
