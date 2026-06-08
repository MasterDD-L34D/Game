// apps/play i18n loader core -- SPEC-N PR-3 (t() + fallback IT + {{var}} interp).
// Pure ESM module (no JSON import) -> dynamic-import from CJS test (tests/play pattern).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../apps/play/src/i18nCore.js');
}

const MESSAGES = {
  it: {
    ui: { confirm: 'Conferma', greet: 'Ciao {{name}}' },
    combat: { turns: 'Sopravvivi {{n}} turni' },
  },
  en: { ui: { confirm: 'Confirm' } },
};

describe('createT', () => {
  test('resolves key in the current locale', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'en', fallbackLocale: 'it' });
    assert.equal(t('ui.confirm'), 'Confirm');
  });

  test('falls back to IT when key missing in locale (NF1)', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'en', fallbackLocale: 'it' });
    assert.equal(t('ui.greet', { name: 'X' }), 'Ciao X');
  });

  test('default fallbackLocale is it even if unspecified (NF1)', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'en' });
    assert.equal(t('ui.greet', { name: 'Y' }), 'Ciao Y');
  });

  test('interpolates {{var}} params', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'it' });
    assert.equal(t('combat.turns', { n: 3 }), 'Sopravvivi 3 turni');
  });

  test('explicit locale arg overrides default', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'en', fallbackLocale: 'it' });
    assert.equal(t('ui.confirm', null, 'it'), 'Conferma');
  });

  test('missing key returns the key itself', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'it' });
    assert.equal(t('nope.not_here'), 'nope.not_here');
  });

  test('leaves {{var}} untouched when param absent', async () => {
    const { createT } = await load();
    const t = createT(MESSAGES, { defaultLocale: 'it' });
    assert.equal(t('ui.greet'), 'Ciao {{name}}');
  });
});

describe('resolveKey / interpolate', () => {
  test('resolveKey walks dot-path, returns undefined for non-string/missing', async () => {
    const { resolveKey } = await load();
    assert.equal(resolveKey(MESSAGES.it, 'ui.confirm'), 'Conferma');
    assert.equal(resolveKey(MESSAGES.it, 'ui'), undefined); // object, not string
    assert.equal(resolveKey(MESSAGES.it, 'ui.nope'), undefined);
    assert.equal(resolveKey(null, 'x'), undefined);
  });

  test('interpolate handles multiple + numeric params', async () => {
    const { interpolate } = await load();
    assert.equal(interpolate('{{a}}/{{b}}', { a: 1, b: 2 }), '1/2');
    assert.equal(interpolate('no params', null), 'no params');
  });
});
