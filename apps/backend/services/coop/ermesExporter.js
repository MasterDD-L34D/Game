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

// W5.5 — per-biome canonical role demands. Mirror Godot v2
// `scripts/session/ermes_role_gap.gd` BIOME_ROLE_DEMANDS verbatim.
// Cross-repo parity: any edit here MUST land in Godot side too.
const BIOME_ROLE_DEMANDS = Object.freeze({
  savana: { esploratore: 1, guerriero: 1 },
  caverna: { esploratore: 1, custode: 1 },
  atollo_obsidiana: { tessitore: 1, esploratore: 1 },
  foresta_temperata: { tessitore: 1, custode: 1 },
  badlands: { guerriero: 1, esploratore: 1 },
  foresta_miceliale: { tessitore: 2 },
  abisso_vulcanico: { guerriero: 1, esploratore: 1 },
  reef_luminescente: { esploratore: 1, tessitore: 1 },
  caldera_glaciale: { custode: 1, guerriero: 1 },
  pianura_salina_iperarida: { esploratore: 2 },
  mezzanotte_orbitale: { tessitore: 1, esploratore: 1 },
  frattura_abissale_sinaptica: { tessitore: 1, custode: 1 },
  foresta_acida: { custode: 1, tessitore: 1 },
});

const FALLBACK_DEMAND = Object.freeze({});

let _cachedReport = null;
let _cachedPath = null;
let _cachedMissing = false;

// ADR-2026-05-29 TKT-BR-04: schema v1.0.0 check on report load.
// Accepted versions: '1.0.0' (multi-biome ADR-2026-05-29) + null/undefined (legacy
// static fallback fixtures pre-bump). Mismatched non-null version -> log warn +
// treat as missing (consumer falls back to STATIC_FALLBACKS / NEUTRAL_FALLBACK).
const ACCEPTED_REPORT_SCHEMA_VERSIONS = new Set(['1.0.0', null, undefined]);

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
    // ADR-2026-05-29 TKT-BR-04 schema gate.
    if (data && data.schema_version && !ACCEPTED_REPORT_SCHEMA_VERSIONS.has(data.schema_version)) {
      console.warn(
        `[ermesExporter] schema_version mismatch: got ${data.schema_version}, want 1.0.0 -- falling back`,
      );
      _cachedMissing = true;
      _cachedReport = null;
      return null;
    }
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

/**
 * W5.5 — Compute role_gap = party_count[role] - biome_demand[role].
 *
 * Mirror of Godot v2 `scripts/session/ermes_role_gap.gd` ErmesRoleGap.compute.
 * Pure function. Cross-repo parity: identical input → identical output.
 *
 * @param {Array<string|object>} partyJobs — Array of job_id strings OR
 *   Array of player dicts with .job_id field
 * @param {string} biomeId — biome slug (unknown → fallback empty demand)
 * @returns {object} Dict[role_id → int delta]
 */
function computeRoleGap(partyJobs, biomeId) {
  const partyCounts = _countPartyRoles(partyJobs || []);
  const demand = BIOME_ROLE_DEMANDS[biomeId] || FALLBACK_DEMAND;
  const gap = {};
  // Roles in demand → compute delta.
  for (const roleId of Object.keys(demand)) {
    const demanded = Number(demand[roleId]) || 0;
    const present = Number(partyCounts[roleId] || 0);
    gap[roleId] = present - demanded;
  }
  // Roles in party but not in demand → positive over-rep.
  for (const roleId of Object.keys(partyCounts)) {
    if (!(roleId in demand)) {
      gap[roleId] = Number(partyCounts[roleId]);
    }
  }
  return gap;
}

function _countPartyRoles(partyJobs) {
  const out = {};
  for (const entry of partyJobs) {
    let roleId = '';
    if (typeof entry === 'string') {
      roleId = entry;
    } else if (entry && typeof entry === 'object') {
      roleId = String(entry.job_id || '');
    }
    if (!roleId) continue;
    out[roleId] = (out[roleId] || 0) + 1;
  }
  return out;
}

/**
 * 2026-05-20 — list all 13 biome → role demand mappings (mirror A6
 * `listStarterBiomas` pattern, gap-fill da Explore quick-win discovery).
 * Used by readonly diagnostic route + frontend onboarding hint surface.
 *
 * @returns {Array<{biome_id: string, roles_demanded: object, total_slots: number}>}
 */
function listBiomeRoleDemands() {
  return Object.entries(BIOME_ROLE_DEMANDS).map(([biome_id, roles_demanded]) => ({
    biome_id,
    roles_demanded: { ...roles_demanded },
    total_slots: Object.values(roles_demanded).reduce((sum, n) => sum + (Number(n) || 0), 0),
  }));
}

// ADR-2026-05-29 TKT-BR-04: bucket-aware export consumer.
// Reads data/core/balance/ermes_bucket_thresholds.yaml (TKT-BR-05) + maps
// continuous eco_pressure_score / mutation_bias.* / encounter_bias.* to discrete
// bucket bands (low/med/high). Used by applyErmesBiomeTraitCosts (TKT-BR-06).
const DEFAULT_BUCKETS_PATH = path.resolve(
  __dirname,
  '../../../../data/core/balance/ermes_bucket_thresholds.yaml',
);
let _cachedBuckets = null;
let _cachedBucketsPath = null;

function _loadBuckets(p = DEFAULT_BUCKETS_PATH) {
  if (_cachedBuckets && _cachedBucketsPath === p) return _cachedBuckets;
  if (!fs.existsSync(p)) return null;
  try {
    const yaml = require('js-yaml');
    const data = yaml.load(fs.readFileSync(p, 'utf8'));
    if (!data || typeof data !== 'object') return null;
    _cachedBuckets = data;
    _cachedBucketsPath = p;
    return data;
  } catch (err) {
    console.warn('[ermesExporter] _loadBuckets failed:', err && err.message);
    return null;
  }
}

function _bandFor(value, bucketDef) {
  if (typeof value !== 'number' || !bucketDef) return null;
  for (const [name, def] of Object.entries(bucketDef)) {
    if (!def || !Array.isArray(def.range) || def.range.length < 2) continue;
    const [lo, hi] = def.range;
    if (value >= lo && value < hi) return { band: name, def };
  }
  // Fallback to high band if value >= last range start.
  if (bucketDef.high && bucketDef.high.range && value >= bucketDef.high.range[0]) {
    return { band: 'high', def: bucketDef.high };
  }
  if (bucketDef.low) return { band: 'low', def: bucketDef.low };
  return null;
}

function getErmesBucketed(biomeId, opts = {}) {
  const ermes = getErmesForBiome(biomeId, opts);
  const buckets = _loadBuckets(opts.bucketsPath);
  if (!buckets || !buckets.buckets) return { ...ermes, buckets: {}, caps: null, guards: null };
  const out = {};
  // eco_pressure_score (top-level key in report)
  if (buckets.buckets.eco_pressure_score && typeof ermes.eco_pressure_score === 'number') {
    const banded = _bandFor(ermes.eco_pressure_score, buckets.buckets.eco_pressure_score);
    if (banded) out.eco_pressure_score = banded;
  }
  // For mutation_bias.* / encounter_bias.* the report (multi-biome v1.0.0) nests
  // these under biome record; legacy static fallback may not have them.
  // Consumer should fetch report separately via _loadReport for those fields.
  return {
    ...ermes,
    buckets: out,
    caps: buckets.caps || null,
    guards: buckets.guards || null,
  };
}

function _resetBucketsCache() {
  _cachedBuckets = null;
  _cachedBucketsPath = null;
}

module.exports = {
  getErmesForBiome,
  getErmesBucketed,
  computeRoleGap,
  listBiomeRoleDemands,
  BIOME_ROLE_DEMANDS,
  STATIC_FALLBACKS,
  NEUTRAL_FALLBACK,
  ACCEPTED_REPORT_SCHEMA_VERSIONS,
  DEFAULT_BUCKETS_PATH,
  _resetCache,
  _resetBucketsCache,
  DEFAULT_REPORT_PATH,
};
