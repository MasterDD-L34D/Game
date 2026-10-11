// V2 Tri-Sorgente — skip fragment accumulator (per-campaign).
//
// Skip → +1 Frammento Genetico. Future M10+ nest integration:
//   Frammenti spendibili per recruit/reroll/seed generation.
//
// In-memory store (adapter pattern). Future: Prisma CampaignFragments table.

'use strict';

const _store = new Map(); // campaignId → { count, history[] }

function _ensure(campaignId) {
  if (!_store.has(campaignId)) {
    _store.set(campaignId, { count: 0, history: [] });
  }
  return _store.get(campaignId);
}

/**
 * Add N fragments via skip. Returns new total.
 */
function addFragments(campaignId, amount = 1, meta = {}) {
  if (!campaignId) return null;
  const entry = _ensure(campaignId);
  entry.count += Number(amount) || 0;
  entry.history.push({
    delta: Number(amount) || 0,
    reason: meta.reason || 'skip_offer',
    ts: new Date().toISOString(),
    ...meta,
  });
  return entry.count;
}

/**
 * Spend N fragments. Returns false if insufficient.
 */
function spendFragments(campaignId, amount = 1, meta = {}) {
  if (!campaignId) return false;
  const entry = _ensure(campaignId);
  const need = Number(amount) || 0;
  if (entry.count < need) return false;
  entry.count -= need;
  entry.history.push({
    delta: -need,
    reason: meta.reason || 'spend',
    ts: new Date().toISOString(),
    ...meta,
  });
  return true;
}

function getFragments(campaignId) {
  if (!campaignId) return null;
  const entry = _store.get(campaignId);
  return entry ? { count: entry.count, history: [...entry.history] } : { count: 0, history: [] };
}

function _resetStore() {
  _store.clear();
}

module.exports = { addFragments, spendFragments, getFragments, _resetStore };
