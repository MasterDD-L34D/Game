'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const itPath = path.join(__dirname, '../../data/i18n/it/common.json');
const enPath = path.join(__dirname, '../../data/i18n/en/common.json');

const getKeys = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, getKeys(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

test('new i18n keys for 4 panels resolve correctly and maintain en/it parity', () => {
  const itCommon = JSON.parse(fs.readFileSync(itPath, 'utf8'));
  const enCommon = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const namespaces = ['ability', 'forms', 'help', 'onboarding'];

  for (const ns of namespaces) {
    assert.ok(itCommon[ns], `IT missing namespace: ${ns}`);
    assert.ok(enCommon[ns], `EN missing namespace: ${ns}`);

    const itKeys = getKeys(itCommon[ns]);
    const enKeys = getKeys(enCommon[ns]);

    for (const key of Object.keys(itKeys)) {
      assert.ok(enKeys[key] !== undefined, `EN missing key: ${ns}.${key}`);
    }
    for (const key of Object.keys(enKeys)) {
      assert.ok(itKeys[key] !== undefined, `IT missing key: ${ns}.${key}`);
    }
  }
});
