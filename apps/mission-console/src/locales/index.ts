import { createI18n } from 'vue-i18n';
import { watch } from 'vue';

import en from './en.json';
import it from './it.json';

export const LOCALE_STORAGE_KEY = 'mission-console:locale';
export const DEFAULT_LOCALE = 'it';
export const FALLBACK_LOCALE = 'en';

export const SUPPORTED_LOCALES = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'English' },
] as const;

type SupportedLocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

const messages = {
  en,
  it,
};

function resolveInitialLocale(): SupportedLocaleCode {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const persisted = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (persisted && (persisted === 'it' || persisted === 'en')) {
    return persisted;
  }

  const navigatorLocale = window.navigator?.languages?.[0] || window.navigator?.language;
  if (navigatorLocale) {
    if (navigatorLocale.toLowerCase().startsWith('it')) {
      return 'it';
    }
    if (navigatorLocale.toLowerCase().startsWith('en')) {
      return 'en';
    }
  }

  return DEFAULT_LOCALE;
}

export function createI18nInstance() {
  const initialLocale = resolveInitialLocale();

  const i18n = createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: FALLBACK_LOCALE,
    messages,
  });

  if (typeof window !== 'undefined') {
    const { locale } = i18n.global;
    watch(
      locale,
      (value) => {
        if (value === 'it' || value === 'en') {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
        }
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('lang', value);
        }
      },
      { immediate: true },
    );
  }

  return i18n;
}

export type AppMessages = typeof messages;
export type AppLocale = keyof AppMessages;
