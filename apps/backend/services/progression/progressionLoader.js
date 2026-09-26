// M13 P3 — YAML loader for progression (xp_curve + perks).
// ADR-2026-04-24-p3-character-progression (pending).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_XP_PATH = path.resolve(__dirname, '../../../../data/core/progression/xp_curve.yaml');
const DEFAULT_PERKS_PATH = path.resolve(__dirname, '../../../../data/core/progression/perks.yaml');
const DEFAULT_JOBS_EXPANSION_PATH = path.resolve(
  __dirname,
  '../../../../data/core/jobs_expansion.yaml',
);

let _xpCache = null;
let _perksCache = null;

function loadXpCurve(p = DEFAULT_XP_PATH) {
  if (_xpCache && _xpCache.__path === p) return _xpCache;
  const raw = fs.readFileSync(p, 'utf-8');
  const data = yaml.load(raw);
  data.__path = p;
  _xpCache = data;
  return data;
}

function loadPerks(p = DEFAULT_PERKS_PATH, expansionPath = DEFAULT_JOBS_EXPANSION_PATH) {
  const cacheKey = `${p}|${expansionPath || ''}`;
  if (_perksCache && _perksCache.__path === cacheKey) return _perksCache;
  const raw = fs.readFileSync(p, 'utf-8');
  const data = yaml.load(raw);
  if (expansionPath) {
    try {
      const expRaw = fs.readFileSync(expansionPath, 'utf-8');
      const expData = yaml.load(expRaw);
      if (expData && expData.perks && data.jobs) {
        for (const [jobId, levelMap] of Object.entries(expData.perks)) {
          if (data.jobs[jobId]) continue;
          data.jobs[jobId] = { perks: levelMap };
        }
      }
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
  data.__path = cacheKey;
  _perksCache = data;
  return data;
}

function resetProgressionCache() {
  _xpCache = null;
  _perksCache = null;
}

module.exports = {
  loadXpCurve,
  loadPerks,
  resetProgressionCache,
  DEFAULT_XP_PATH,
  DEFAULT_PERKS_PATH,
  DEFAULT_JOBS_EXPANSION_PATH,
};
