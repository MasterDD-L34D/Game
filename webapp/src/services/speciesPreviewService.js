const DEFAULT_ENDPOINT = '/api/generation/species/batch';

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error('fetch non disponibile nell\'ambiente corrente');
}

function normaliseEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .filter((entry) => entry && Array.isArray(entry.trait_ids) && entry.trait_ids.length)
    .map((entry) => ({
      trait_ids: entry.trait_ids,
      biome_id: entry.biome_id ?? null,
      seed: entry.seed ?? null,
      base_name: entry.base_name ?? null,
      request_id: entry.request_id ?? null,
      fallback_trait_ids: entry.fallback_trait_ids,
    }));
}

export async function requestSpeciesPreviewBatch(entries, options = {}) {
  const batch = normaliseEntries(entries);
  if (!batch.length) {
    return { previews: [], errors: [] };
  }
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const fetchImpl = ensureFetch();
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || 'Errore richiesta anteprime specie');
  }
  const payload = await response.json();
  const previews = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.previews)
      ? payload.previews
      : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  return { previews, errors };
}
