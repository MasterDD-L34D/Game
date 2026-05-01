// W5-bb (cross-repo Godot v2 mirror) — ERMES eco_pressure exporter.
//
// Reads `prototypes/ermes_lab/outputs/latest_eco_pressure_report.json`
// when populated, falls back to per-biome static defaults.
//
// W5-bb MVP: file-based read + static fallback. Phase B (W5.5+) will
// wire ERMES lab runtime computation (currently prototype isolated).
//
// Output (W5 schema consumed by Godot v2 WorldSetupState.ermes):
//   {
//     eco_pressure_score: 0.62,        // float [0, 1]
//     bias: {                          // bias keys mapped to player-readable
//       predator_density: 0.7,
//       resource_scarcity: 0.55
//     }
//   }
//
// Doctrine: ERMES system name NEVER surfaces to player. Output is
// diegetic (eco_pressure_score → "Pressione ecosistemica: 62%").

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_REPORT_PATH = path.resolve(
  __dirname,
  '../../../../prototypes/ermes_lab/outputs/latest_eco_pressure_report.json',
);

// Per-biome ERMES static defaults (mirror sample JSON variants).
const STATIC_FALLBACKS = Object.freeze({
  savana: {
    eco_pressure_score: 0.62,
    bias: {
      predator_density: 0.7,
      resource_scarcity: 0.55,
    },
  },
  caverna: {
    eco_pressure_score: 0.78,
    bias: {
      ambush_risk: 0.65,
      echo_chain_disorient: 0.5,
    },
  },
  atollo_obsidiana: {
    eco_pressure_score: 0.45,
    bias: {
      magnetic_interference: 0.7,
      tide_unpredictability: 0.6,
    },
  },
  foresta_temperata: {
    eco_pressure_score: 0.32,
    bias: {
      canopy_ambush: 0.55,
      mist_disorient: 0.4,
    },
  },
  badlands: {
    eco_pressure_score: 0.55,
    bias: {
      magnetic_pull: 0.6,
      ruin_collapse: 0.5,
    },
  },
});

const NEUTRAL_FALLBACK = Object.freeze({
  eco_pressure_score: 0.5,
  bias: {},
});

let _cachedReport = null;
let _cachedPath = null;
let _cachedMissing = false;

function _loadReport(reportPath) {
  if (reportPath === _cachedPath) {
    if (_cachedMissing) return null;
    if (_cachedReport) return _cachedReport;
  }
  _cachedPath = reportPath;
  if (!fs.existsSync(reportPath)) {
    _cachedMissing = true;
    _cachedReport = null;
    return null;
  }
  try {
    const raw = fs.readFileSync(reportPath, 'utf8');
    if (!raw.trim()) {
      _cachedMissing = true;
      return null;
    }
    const data = JSON.parse(raw);
    _cachedMissing = false;
    _cachedReport = data;
    return data;
  } catch (_err) {
    _cachedMissing = true;
    _cachedReport = null;
    return null;
  }
}

function _resetCache() {
  _cachedReport = null;
  _cachedPath = null;
  _cachedMissing = false;
}

/**
 * Get ERMES eco_pressure data for a biome.
 *
 * @param {string} biomeId — biome slug
 * @param {object} [opts]
 * @param {string} [opts.reportPath] — override report path
 * @returns {object} {eco_pressure_score, bias} W5 schema
 */
function getErmesForBiome(biomeId, opts = {}) {
  if (!biomeId || typeof biomeId !== 'string') return { ...NEUTRAL_FALLBACK };
  const { reportPath = DEFAULT_REPORT_PATH } = opts;
  const report = _loadReport(reportPath);
  // Runtime report shape: { biomes: { savana: {eco_pressure_score, bias}, ... } }
  if (report && report.biomes && typeof report.biomes === 'object') {
    const biomeReport = report.biomes[biomeId];
    if (biomeReport && typeof biomeReport === 'object') {
      return {
        eco_pressure_score: Number(biomeReport.eco_pressure_score) || 0,
        bias:
          biomeReport.bias && typeof biomeReport.bias === 'object' ? { ...biomeReport.bias } : {},
      };
    }
  }
  // Static fallback per biome.
  if (STATIC_FALLBACKS[biomeId]) {
    return {
      eco_pressure_score: STATIC_FALLBACKS[biomeId].eco_pressure_score,
      bias: { ...STATIC_FALLBACKS[biomeId].bias },
    };
  }
  return { ...NEUTRAL_FALLBACK };
}

module.exports = {
  getErmesForBiome,
  STATIC_FALLBACKS,
  NEUTRAL_FALLBACK,
  _resetCache,
  DEFAULT_REPORT_PATH,
};
