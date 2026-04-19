// API client — proxy /api → backend (vedi vite.config.js).
// Mirror shape di tools/js/play.js ma per browser.

async function jsonFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, data };
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
    jsonFetch('/api/session/declare-intent', {
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
