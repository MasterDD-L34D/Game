// SPEC-N PR-5 (NF3) -- characterPanel i18n label helpers.
//
// axisLabel + enneaLabel + enneaDesc resolve from the data/i18n SSOT. IT values
// are byte-identical to the old AXIS_LABELS / ENNEA_META hardcoded maps (so the
// IT player sees no change); EN parity is covered by tests/i18n/parity.test.js.
// Pure helpers only -- no DOM, no api fetch exercised at import.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/characterPanel.js');
}

describe('axisLabel -- MBTI axis detail labels (i18n)', () => {
  test('canonical axes -> IT {label, lo, hi} byte-identical to old AXIS_LABELS', async () => {
    const { axisLabel } = await loadModule();
    assert.deepEqual(axisLabel('E_I'), {
      label: 'Energia sociale',
      lo: 'Estroversione',
      hi: 'Introversione',
    });
    assert.deepEqual(axisLabel('S_N'), {
      label: 'Percezione',
      lo: 'Intuizione',
      hi: 'Sensazione',
    });
    assert.deepEqual(axisLabel('T_F'), {
      label: 'Decisione',
      lo: 'Sentimento',
      hi: 'Pensiero',
    });
    assert.deepEqual(axisLabel('J_P'), {
      label: 'Stile',
      lo: 'Percezione',
      hi: 'Giudizio',
    });
  });
});

describe('enneaLabel / enneaDesc -- archetype labels + descriptions (i18n)', () => {
  test('id parens -> IT label byte-identical to old ENNEA_META', async () => {
    const { enneaLabel } = await loadModule();
    assert.equal(enneaLabel('Riformatore(1)'), 'Riformatore');
    assert.equal(enneaLabel('Architetto(5)'), 'Architetto');
    assert.equal(enneaLabel('Cacciatore(8)'), 'Cacciatore');
    assert.equal(enneaLabel('Stoico(9)'), 'Stoico');
  });

  test('id parens -> IT desc byte-identical to old ENNEA_META (ASCII subset)', async () => {
    const { enneaDesc } = await loadModule();
    assert.equal(enneaDesc('Riformatore(1)'), 'Setup metodico, alta precisione.');
    assert.equal(enneaDesc('Conquistatore(3)'), 'Aggressione e rischio.');
    assert.equal(enneaDesc('Stoico(9)'), 'Endurance sotto pressione.');
  });

  test('unknown / malformed id -> empty strings (graceful)', async () => {
    const { enneaLabel, enneaDesc } = await loadModule();
    assert.equal(enneaLabel('Unknown(99)'), ''); // 2-digit, no single-digit key
    assert.equal(enneaLabel('garbage'), ''); // no parens
    assert.equal(enneaLabel(null), '');
    assert.equal(enneaDesc('garbage'), '');
    assert.equal(enneaDesc(undefined), '');
  });
});
