// 2026-05-10 sera Sprint Q+ Q-9 — Lineage Ritual API client.
// Fetch MUTATION_LIST canonical + POST offspring-ritual.
// Backend routes: apps/backend/routes/lineage.js (Q-4).

'use strict';

const API_BASE = (typeof window !== 'undefined' && window.__API_BASE_URL__) || '';

export async function fetchMutationsCanonical() {
  const url = `${API_BASE}/api/v1/lineage/mutations/canonical`;
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`fetchMutationsCanonical: HTTP ${res.status}`);
  return res.json();
}

export async function postOffspringRitual({ session_id, parent_a_id, parent_b_id, mutations }) {
  const url = `${API_BASE}/api/v1/lineage/offspring-ritual`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ session_id, parent_a_id, parent_b_id, mutations }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `postOffspringRitual: HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function fetchLineageChain(lineageId) {
  const url = `${API_BASE}/api/v1/lineage/chain/${encodeURIComponent(lineageId)}`;
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (res.status === 404) return { lineage_id: lineageId, count: 0, offspring: [] };
  if (!res.ok) throw new Error(`fetchLineageChain: HTTP ${res.status}`);
  return res.json();
}
