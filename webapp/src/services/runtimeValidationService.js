const DEFAULT_ENDPOINT = '/api/validators/runtime';

function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  throw new Error("fetch non disponibile nell'ambiente corrente");
}

async function postRuntime(kind, payload, options = {}) {
  if (!kind) {
    throw new Error("Parametro 'kind' richiesto per la validazione runtime");
  }
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const fetchImpl = ensureFetch();
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || 'Errore validazione runtime');
  }
  const body = await response.json();
  return body && body.result ? body.result : body;
}

export async function validateSpeciesBatch(entries, context = {}, options = {}) {
  const payload = {
    entries: Array.isArray(entries) ? entries : [],
    biomeId: context.biomeId || null,
  };
  return postRuntime('species', payload, options);
}

export async function validateBiome(biome, context = {}, options = {}) {
  const payload = {
    biome: biome || null,
    defaultHazard: context.defaultHazard || null,
  };
  return postRuntime('biome', payload, options);
}

export async function validateFoodweb(foodweb, options = {}) {
  const payload = { foodweb: foodweb || null };
  return postRuntime('foodweb', payload, options);
}
