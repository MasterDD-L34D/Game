// V2 Tri-Sorgente — YAML pool loader (cached).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const POOL_DIR = path.join(process.cwd(), 'data', 'core', 'rewards');
const _cache = new Map();

function loadPool(poolId = 'reward_pool_mvp', dir = POOL_DIR) {
  const cacheKey = `${dir}::${poolId}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);
  const filePath = path.join(dir, `${poolId}.yaml`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[reward-pool] pool "${poolId}" non trovato a ${filePath}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(raw);
    if (!data || !Array.isArray(data.cards)) {
      throw new Error('pool YAML malformed: cards array missing');
    }
    _cache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[reward-pool] load "${poolId}" failed: ${err.message}`);
    return null;
  }
}

function _resetCache() {
  _cache.clear();
}

module.exports = { loadPool, _resetCache };
