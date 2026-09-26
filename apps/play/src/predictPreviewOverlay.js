// Sprint 8 (Surface-DEAD #1) — predict_combat hover preview.
//
// Engine LIVE: POST /api/session/predict ritorna analytic enumeration su d20
// con hit_pct + crit_pct + fumble_pct + avg_pt + expected_damage + elevation
// modifier (apps/backend/routes/sessionHelpers.js predictCombat).
//
// Surface DEAD pre-Sprint 8: il client non chiamava mai questa route.
//
// Surface NEW: quando il player ha selezionato un'unità player E hover sopra
// un nemico vivo, fetch async la prediction e iniettala nella tooltip.
// Decision aid in <300ms, prima di committare l'attacco.
//
// Pure transforms in formatPredictionRow + colorBandForHit (testabili senza
// canvas/jsdom). Async cache via Map<key, Promise> evita flood backend
// (mousemove fires 60Hz; cache scoped per session+actor+target tuple).

'use strict';

const _cache = new Map();

// Pure: hit% → semantic band per HUD coloring.
//   ≥65 → high (green)
//   35-64 → medium (amber)
//   <35  → low (red)
//   null/NaN → unknown (gray)
export function colorBandForHit(hitPct) {
  if (hitPct === null || hitPct === undefined) return 'unknown';
  const n = Number(hitPct);
  if (!Number.isFinite(n)) return 'unknown';
  if (n >= 65) return 'high';
  if (n >= 35) return 'medium';
  return 'low';
}

// Pure: prediction object → HTML string row pronto per innerHTML injection.
// Mai inserire HTML utente — questa funzione produce solo numeri sicuri.
export function formatPredictionRow(prediction, opts = {}) {
  if (!prediction || typeof prediction !== 'object') {
    return '<div class="tt-predict tt-predict-error">Prediction non disponibile</div>';
  }
  const hitPct = Number(prediction.hit_pct);
  const critPct = Number(prediction.crit_pct);
  const expDmg = Number(prediction.expected_damage);
  const elevMul = Number(prediction.elevation_multiplier);
  const band = colorBandForHit(hitPct);
  const hitTxt = Number.isFinite(hitPct) ? `${Math.round(hitPct)}%` : '?';
  const dmgTxt = Number.isFinite(expDmg) ? expDmg.toFixed(1) : '?';
  const critTxt = Number.isFinite(critPct) ? `${Math.round(critPct)}%` : '?';
  const elevHint =
    Number.isFinite(elevMul) && Math.abs(elevMul - 1) > 0.01
      ? ` · elev ×${elevMul.toFixed(2)}`
      : '';
  const titleAttr = opts.title || `Predict d20 — ${prediction.simulations || 20} faces`;
  return (
    `<div class="tt-predict tt-predict-${band}" title="${titleAttr}">` +
    `⚔ <strong>${hitTxt}</strong> hit · ~${dmgTxt} dmg · ${critTxt} crit${elevHint}` +
    `</div>`
  );
}

// Stable cache key — prevent thrashing on rapid mousemove.
function cacheKey(sessionId, actorId, targetId) {
  return `${sessionId}::${actorId}::${targetId}`;
}

// Async cached fetcher. Subsequent calls with same key return the same promise
// (memoization). Caller injects `fetcher` (e.g. api.predict) for testability.
export function getPrediction(sessionId, actorId, targetId, fetcher) {
  if (!sessionId || !actorId || !targetId) {
    return Promise.resolve(null);
  }
  if (typeof fetcher !== 'function') {
    return Promise.resolve(null);
  }
  const key = cacheKey(sessionId, actorId, targetId);
  if (_cache.has(key)) return _cache.get(key);
  const promise = Promise.resolve()
    .then(() => fetcher(sessionId, actorId, targetId))
    .then((res) => {
      // Normalize: api.* returns {ok, data} envelope OR raw object — accept both.
      if (res && typeof res === 'object' && 'ok' in res) {
        return res.ok ? res.data : null;
      }
      return res || null;
    })
    .catch(() => null);
  _cache.set(key, promise);
  return promise;
}

export function clearPredictionCache() {
  _cache.clear();
}

// Cache size — exposed for tests.
export function _cacheSize() {
  return _cache.size;
}
