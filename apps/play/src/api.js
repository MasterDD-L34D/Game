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
  start: (units) =>
    jsonFetch('/api/session/start', { method: 'POST', body: JSON.stringify({ units }) }),
  state: (sid) => jsonFetch(`/api/session/state?session_id=${encodeURIComponent(sid)}`),
  action: (body) =>
    jsonFetch('/api/session/action', { method: 'POST', body: JSON.stringify(body) }),
  endTurn: (sid) =>
    jsonFetch('/api/session/turn/end', {
      method: 'POST',
      body: JSON.stringify({ session_id: sid }),
    }),
  vc: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/vc`),
  replay: (sid) => jsonFetch(`/api/session/${encodeURIComponent(sid)}/replay`),
};
