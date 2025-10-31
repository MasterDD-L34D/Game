import { isStaticDeployment } from './apiEndpoints.js';

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

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetchImpl richiesto per fetchJsonWithFallback');
  }

  let remoteResponse;
  try {
    remoteResponse = await fetchImpl(url, requestInit);
    if (!remoteResponse.ok) {
      throw await createHttpError(remoteResponse, errorMessage, buildErrorMessage);
    }
    const data = await parse(remoteResponse);
    return { data, source: 'remote', response: remoteResponse };
  } catch (error) {
    const remoteError = toError(error, errorMessage || 'Richiesta remota fallita');
    if (!allowFallback || !fallbackUrl) {
      throw remoteError;
    }
    try {
      const fallbackRequest = { cache: 'no-store', ...fallbackInit };
      const fallbackResponse = await fetchImpl(fallbackUrl, fallbackRequest);
      if (!fallbackResponse.ok) {
        throw await createHttpError(
          fallbackResponse,
          fallbackErrorMessage || 'Fallback non disponibile',
          buildFallbackErrorMessage || buildErrorMessage,
        );
      }
      const data = await parse(fallbackResponse);
      return { data, source: 'fallback', response: fallbackResponse, error: remoteError };
    } catch (fallbackError) {
      const fallbackErr = toError(fallbackError, fallbackErrorMessage || 'Fallback non disponibile');
      if (!fallbackErr.cause) {
        fallbackErr.cause = remoteError;
      }
      throw fallbackErr;
    }
  }
}

export const __internals__ = {
  toError,
  createHttpError,
};
