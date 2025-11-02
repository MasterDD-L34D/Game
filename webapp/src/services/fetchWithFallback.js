import { isStaticDeployment } from './apiEndpoints';
import {
  beginFetchDiagnostic,
  recordFallbackSuccess,
  recordFetchError,
  resolveFetchDiagnostic,
} from '../observability/diagnosticsStore.ts';

export function resolveFetchImplementation(fetchImpl) {
  if (typeof fetchImpl === 'function') {
    return fetchImpl;
  }
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error('fetch non disponibile nell\'ambiente corrente');
}

function toError(value, fallbackMessage = 'Richiesta fallita') {
  if (value instanceof Error) {
    return value;
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return new Error(String(value.message));
  }
  return new Error(typeof value === 'string' ? value : fallbackMessage);
}

async function createHttpError(response, defaultMessage, builder) {
  if (typeof builder === 'function') {
    const custom = await builder(response);
    if (custom) {
      if (custom instanceof Error) {
        return custom;
      }
      if (typeof custom === 'string') {
        return new Error(custom);
      }
    }
  }
  const statusMessage = defaultMessage ? `${defaultMessage} (${response.status})` : `Richiesta fallita (${response.status})`;
  try {
    const payload = await response.clone().json();
    if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      return new Error(payload.error.trim());
    }
  } catch (error) {
    // ignore JSON parsing errors
  }
  try {
    const text = await response.clone().text();
    if (text && text.trim()) {
      return new Error(text.trim());
    }
  } catch (error) {
    // ignore text parsing errors
  }
  return new Error(statusMessage);
}

export async function fetchJsonWithFallback(url, options = {}) {
  const {
    fetchImpl,
    requestInit = {},
    parse = (response) => response.json(),
    fallbackUrl,
    fallbackInit,
    allowFallback = isStaticDeployment(),
    errorMessage,
    fallbackErrorMessage,
    buildErrorMessage,
    buildFallbackErrorMessage,
  } = options;

  const fetchFn = resolveFetchImplementation(fetchImpl);

  const diagnosticId = beginFetchDiagnostic({
    url,
    method: requestInit.method,
    fallbackUrl,
    fallbackAllowed: allowFallback,
  });

  let remoteResponse;
  try {
    remoteResponse = await fetchFn(url, requestInit);
    if (!remoteResponse.ok) {
      throw await createHttpError(remoteResponse, errorMessage, buildErrorMessage);
    }
    const data = await parse(remoteResponse);
    resolveFetchDiagnostic(diagnosticId, {
      status: 'success',
      source: 'remote',
      message: 'Risposta remota ricevuta',
    });
    return { data, source: 'remote', response: remoteResponse };
  } catch (error) {
    const remoteError = toError(error, errorMessage || 'Richiesta remota fallita');
    resolveFetchDiagnostic(diagnosticId, {
      message: remoteError.message,
      error: remoteError.message,
      completed: false,
    });
    if (!allowFallback || !fallbackUrl) {
      recordFetchError(diagnosticId, remoteError.message, remoteError);
      throw remoteError;
    }
    try {
      const fallbackRequest = { cache: 'no-store', ...fallbackInit };
      const fallbackResponse = await fetchFn(fallbackUrl, fallbackRequest);
      if (!fallbackResponse.ok) {
        throw await createHttpError(
          fallbackResponse,
          fallbackErrorMessage || 'Fallback non disponibile',
          buildFallbackErrorMessage || buildErrorMessage,
        );
      }
      const data = await parse(fallbackResponse);
      recordFallbackSuccess(
        diagnosticId,
        `Risposta fallback (${fallbackResponse.status}) ricevuta per ${fallbackUrl}`,
      );
      return { data, source: 'fallback', response: fallbackResponse, error: remoteError };
    } catch (fallbackError) {
      const fallbackErr = toError(fallbackError, fallbackErrorMessage || 'Fallback non disponibile');
      if (!fallbackErr.cause) {
        fallbackErr.cause = remoteError;
      }
      recordFetchError(diagnosticId, fallbackErr.message, fallbackErr);
      throw fallbackErr;
    }
  }
}

export const __internals__ = {
  toError,
  createHttpError,
  resolveFetchImplementation,
};
