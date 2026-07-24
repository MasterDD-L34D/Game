// =============================================================================
// i18n entry -- SPEC-N PR-3 (apps/play). Binds the loader core (i18nCore.js) to
// the canonical data/i18n bundles (QA3 SSOT). Vite bundles the JSON imports.
//
// Usage:  import { t } from './i18n.js';  t('ui.confirm');  t('combat.turns', { n: 3 });
//
// Locale: window.__EVO_LOCALE__ (runtime-config) || 'it'. Fallback always 'it' (NF1).
// Migrazione dei label-map hardcoded (biomeChip/ui/objectivePanel/...) a t() =
// PR-4 (NF3 incrementale) -- questo file e' solo il loader.
// =============================================================================

import { createT } from './i18nCore.js';
// data/i18n = sorgente unica (ADR-2026-06-08 QA3). `common.json` (10 namespace dentro)
// + `traits.json` (namespace `traits`, chiavi `traits.<id>.<campo>` = i platform placeholder
// `i18n:traits.<id>.<campo>` dei file in data/traits/); lo split del resto = PR-5.
// Import attributes (`with { type: 'json' }`) -- required by node ESM (test runner)
// and supported by Vite 8; without them node dynamic-import of any module importing
// this file throws ERR_IMPORT_ATTRIBUTE_MISSING (breaks the migrated modules' tests).
import itCommon from '../../../data/i18n/it/common.json' with { type: 'json' };
import enCommon from '../../../data/i18n/en/common.json' with { type: 'json' };
import itTraits from '../../../data/i18n/it/traits.json' with { type: 'json' };
import enTraits from '../../../data/i18n/en/traits.json' with { type: 'json' };

// Merge per-namespace: `_meta` di ogni bundle resta fuori (non e' una chiave traducibile,
// e un merge shallow lascerebbe vincere l'ultimo importato).
function mergeBundles(...bundles) {
  const out = {};
  for (const bundle of bundles) {
    for (const [namespace, value] of Object.entries(bundle)) {
      if (namespace.startsWith('_')) continue;
      out[namespace] = value;
    }
  }
  return out;
}

const MESSAGES = {
  it: mergeBundles(itCommon, itTraits),
  en: mergeBundles(enCommon, enTraits),
};

const DEFAULT_LOCALE = (typeof window !== 'undefined' && window.__EVO_LOCALE__) || 'it';

export const t = createT(MESSAGES, { defaultLocale: DEFAULT_LOCALE, fallbackLocale: 'it' });

export { createT, resolveKey, interpolate } from './i18nCore.js';
export { MESSAGES };
