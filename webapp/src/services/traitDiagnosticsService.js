const DEFAULT_ENDPOINT = '/api/traits/diagnostics';

function resolveFetch() {
  if (typeof fetch === 'function') return fetch;
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error('fetch non disponibile per trait diagnostics');
}

export async function fetchTraitDiagnostics(options = {}) {
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const refresh = options.refresh ? '?refresh=true' : '';
  const fetchImpl = resolveFetch();
  const response = await fetchImpl(`${endpoint}${refresh}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Errore caricamento trait diagnostics (${response.status})`);
  }
  const payload = await response.json();
  const diagnostics = payload?.diagnostics || payload || {};
  return {
    diagnostics,
    meta: payload?.meta || {},
  };
}

export const __internals__ = { resolveFetch };
