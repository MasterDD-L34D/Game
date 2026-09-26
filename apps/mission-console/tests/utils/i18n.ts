import { createI18n } from 'vue-i18n';

import en from '../../src/locales/en.json';
import it from '../../src/locales/it.json';

export function createI18nForTests(locale: 'en' | 'it' = 'it') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, it },
  });
}
