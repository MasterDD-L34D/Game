// apps/backend/services/combat/losBlockers.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CFG_PATH = path.join(__dirname, '../../../../data/core/balance/los.yaml');

// Normalize a raw parsed los config into the internal shape. Pure + shape-guarded:
// a malformed blocker_terrain_types (non-array) falls back to no blockers instead
// of silently corrupting (a scalar string would otherwise become a char-set).
function _normalizeConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const list = Array.isArray(cfg.blocker_terrain_types) ? cfg.blocker_terrain_types : [];
  return {
    blockers: new Set(list.map(String)),
    unitsBlock: cfg.units_block_los === true,
  };
}

let _cfg = null;
function _config() {
  if (_cfg) return _cfg;
  let raw = {};
  try {
    raw = yaml.load(fs.readFileSync(CFG_PATH, 'utf8'));
  } catch (err) {
    // Soft-fail to a safe default (no blockers): a missing/malformed canonical LOS
    // config must not 500 the attack path -- flag-ON degrades to band-neutral.
    console.warn(
      `[losBlockers] failed to load ${CFG_PATH}: ${err.message}; using no-blocker default`,
    );
  }
  _cfg = _normalizeConfig(raw);
  return _cfg;
}

function _resetCache() {
  _cfg = null;
}

function terrainBlocksLos(type) {
  if (!type) return false;
  return _config().blockers.has(String(type));
}
function unitsBlockLos() {
  return _config().unitsBlock;
}

module.exports = { terrainBlocksLos, unitsBlockLos, _normalizeConfig, _resetCache };
