// M13 P3 — YAML loader for progression (xp_curve + perks).
// ADR-2026-04-24-p3-character-progression (pending).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_XP_PATH = path.resolve(__dirname, '../../../../data/core/progression/xp_curve.yaml');
const DEFAULT_PERKS_PATH = path.resolve(__dirname, '../../../../data/core/progression/perks.yaml');

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

function loadPerks(p = DEFAULT_PERKS_PATH) {
  if (_perksCache && _perksCache.__path === p) return _perksCache;
  const raw = fs.readFileSync(p, 'utf-8');
  const data = yaml.load(raw);
  data.__path = p;
  _perksCache = data;
  return data;
}

function resetProgressionCache() {
  _xpCache = null;
  _perksCache = null;
}

module.exports = { loadXpCurve, loadPerks, resetProgressionCache };
