const DEFAULT_ENDPOINT = '/api/quality/suggestions/apply';

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error("fetch non disponibile nell'ambiente corrente");
}

export async function applyQualitySuggestion(suggestion, options = {}) {
  if (!suggestion || typeof suggestion !== 'object') {
    throw new Error("Suggerimento non valido per l'applicazione");
  }
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const fetchImpl = ensureFetch();
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion }),
  });
  if (!response.ok) {
    let message = 'Errore applicazione suggerimento';
    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.error) {
        message = errorBody.error;
      }
    } catch (error) {
      message = await response.text();
    }
    throw new Error(message || 'Errore applicazione suggerimento');
  }
  return response.json();
}
