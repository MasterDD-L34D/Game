import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import en from '../src/locales/en.json';
import itLocale from '../src/locales/it.json';
import LanguageSelector from '../src/components/navigation/LanguageSelector.vue';
import { createI18nForTests } from './utils/i18n';

function collectKeys(input: unknown, prefix = ''): string[] {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return Object.entries(input as Record<string, unknown>)
      .flatMap(([key, value]) => collectKeys(value, prefix ? `${prefix}.${key}` : key))
      .sort();
  }
  return [prefix];
}

describe('localization setup', () => {
  it('keeps locale files in sync', () => {
    expect(collectKeys(en)).toEqual(collectKeys(itLocale));
  });

  it('renders language selector in Italian', () => {
    const wrapper = mount(LanguageSelector, {
      global: {
        plugins: [createI18nForTests('it')],
      },
    });

    expect(wrapper.text()).toContain('Lingua');
    const options = wrapper.findAll('option').map((option) => option.text());
    expect(options).toContain('Italiano');
    expect(options).toContain('Inglese');
  });

  it('renders language selector in English', () => {
    const wrapper = mount(LanguageSelector, {
      global: {
        plugins: [createI18nForTests('en')],
      },
    });

    expect(wrapper.text()).toContain('Language');
    const options = wrapper.findAll('option').map((option) => option.text());
    expect(options).toContain('Italian');
    expect(options).toContain('English');
  });
});
