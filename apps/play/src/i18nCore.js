// =============================================================================
// i18n loader core -- SPEC-N PR-3 (apps/play). Pure ESM, no JSON import (testable
// under node:test via dynamic import). The JSON-bound entry lives in i18n.js.
//
// NF1 (ratified): il loader vive frontend (apps/play). Fallback = IT (sorgente
// autorata completa; EN ~5% -> un EN player vede IT, non key grezze).
// Interpolation: Mustache {{var}} (matches data/i18n + parity validator).
//   NF4 ({var} normalize) e' un follow-up PR-4 (atomico con mission-console).
// =============================================================================

const MUSTACHE_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Resolve a dot-notation key (es. "ui.confirm") against a locale bundle.
 * Returns the string value, or undefined if missing / not a leaf string.
 */
export function resolveKey(bundle, key) {
  if (!bundle || typeof bundle !== 'object') return undefined;
  const parts = String(key).split('.');
  let cur = bundle;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Replace {{var}} tokens with params[var]. Tokens whose param is missing are
 * left untouched (visible in dev -> flags a missing param).
 */
export function interpolate(str, params) {
  if (typeof str !== 'string' || !params || typeof params !== 'object') return str;
  return str.replace(MUSTACHE_RE, (m, k) =>
    params[k] !== undefined && params[k] !== null ? String(params[k]) : m,
  );
}

/**
 * Build a t() bound to a messages map { [locale]: bundle }.
 * t(key, params?, locale?) -> resolved + interpolated string, or the key if missing.
 * Fallback order: requested locale -> fallbackLocale (default 'it').
 */
export function createT(messages, opts = {}) {
  const msgs = messages && typeof messages === 'object' ? messages : {};
  const defaultLocale = opts.defaultLocale || 'it';
  const fallbackLocale = opts.fallbackLocale || 'it';
  return function t(key, params, locale) {
    const loc = locale || defaultLocale;
    let val = resolveKey(msgs[loc], key);
    if (val === undefined && fallbackLocale !== loc) {
      val = resolveKey(msgs[fallbackLocale], key);
    }
    if (val === undefined) return key;
    return interpolate(val, params);
  };
}
