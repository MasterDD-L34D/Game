// Trait flavor i18n -- il bundle `traits` deve essere risolvibile via t() come `common`.
// Senza questo wiring i placeholder `i18n:traits.<id>.<campo>` non hanno alcun consumatore
// a runtime e il testo curato resta invisibile al giocatore.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../apps/play/src/i18n.js');
}

describe('i18n traits namespace', () => {
  test('resolves a trait label in IT and EN', async () => {
    const { t } = await load();
    assert.equal(t('traits.denti_seghettati.label', null, 'it'), 'Denti Seghettati');
    assert.equal(t('traits.denti_seghettati.label', null, 'en'), 'Serrated Teeth');
  });
});
