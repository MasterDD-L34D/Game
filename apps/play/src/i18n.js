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
// data/i18n = sorgente unica (ADR-2026-06-08 QA3). Oggi solo `common.json`
// (10 namespace dentro); lo split per-namespace = PR-5.
import itCommon from '../../../data/i18n/it/common.json';
import enCommon from '../../../data/i18n/en/common.json';

const MESSAGES = { it: itCommon, en: enCommon };

const DEFAULT_LOCALE = (typeof window !== 'undefined' && window.__EVO_LOCALE__) || 'it';

export const t = createT(MESSAGES, { defaultLocale: DEFAULT_LOCALE, fallbackLocale: 'it' });

export { createT, resolveKey, interpolate } from './i18nCore.js';
export { MESSAGES };
