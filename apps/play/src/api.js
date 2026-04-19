// API client — proxy /api → backend (vedi vite.config.js).
// Mirror shape di tools/js/play.js ma per browser.

// W8-emergency (bug #5): wrap fetch in try/catch. Browser TypeError "Failed to fetch"
// (network drop, backend restart, CORS) previously crashed callers without handle.
// Now returns networkError flag so UI can retry + display friendly message.
async function jsonFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      errorMessage: err?.message || String(err),
    };
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, data };
}

// W8e — Retry helper for transient network errors (research pass 3 finding #7).
// Wraps jsonFetch with 1 retry after delay when networkError flag is set.
// Used for idempotent POST endpoints (declare-intent/commit-round are re-declarable
// server-side via latest-wins).
async function jsonFetchRetry(path, opts = {}, { retries = 1, delayMs = 400 } = {}) {
  let attempt = 0;
  let result = await jsonFetch(path, opts);
  while (result.networkError && attempt < retries) {
    attempt += 1;
    await new Promise((r) => setTimeout(r, delayMs));
    result = await jsonFetch(path, opts);
  }
  return result;
}

export const api = {
  scenario: (id) => jsonFetch(`/api/tutorial/${encodeURIComponent(id)}`),
  start: (units, opts = {}) =>
    jsonFetch('/api/session/start', {
      method: 'POST',
      body: JSON.stringify({ units, ...opts }),
    }),
  state: (sid) => jsonFetch(`/api/session/state?session_id=${encodeURIComponent(sid)}`),
  action: (body) =>
    jsonFetch('/api/session/action', { method: 'POST', body: JSON.stringify(body) }),
  endTurn: (sid) =>
    jsonFetch('/api/session/turn/end', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  // ADR-2026-04-15 round model endpoints (wired M4 A.1).
  // Flow: beginPlanning → N × declareIntent → commitRound(auto_resolve=true)
  beginPlanning: (sid) =>
    jsonFetch('/api/session/round/begin-planning', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  declareIntent: (sid, actorId, action) =>
    // W8e — retry on network drop (idempotent server-side: latest-wins per unit).
    jsonFetchRetry('/api/session/declare-intent', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, actor_id: actorId, action }),
    }),
  clearIntent: (sid, actorId) =>
    jsonFetch(`/api/session/clear-intent/${encodeURIComponent(actorId)}`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  commitRound: (sid, autoResolve = true) =>
    jsonFetch('/api/session/commit-round', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid, auto_resolve: autoResolve }),
    }),
  vc: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/vc`),
  replay: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/replay`),
  modulations: () => jsonFetch('/api/party/modulations'),
  partyConfig: () => jsonFetch('/api/party/config'),
};
