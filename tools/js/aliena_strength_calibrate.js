'use strict';
// ALIENA enforcement strength calibration harness (#5 follow-up).
//
// DETERMINISTIC: drives the real scoreAlienaCoherence + applyBiomeBias weight
// modulation across a strength sweep on a controlled coherence gradient
// (on-biome roster vs off-biome intruders), to inform the (data-deferred)
// `policy.aliena_enforcement.strength` value WITHOUT requiring playtest
// telemetry. The "data" is the scorer's own response curve.
//
// Run: node tools/js/aliena_strength_calibrate.js [biomeId]
// Programmatic: const { calibrate } = require(...); calibrate({ biomeId }).

const { applyBiomeBias } = require('../../apps/backend/services/combat/biomeSpawnBias');
const { scoreAlienaCoherence } = require('../../apps/backend/services/authorial/alienaCoherence');
const poolLoader = require('../../apps/backend/services/combat/biomePoolLoader');

const STRENGTH_SWEEP = [0, 0.25, 0.5, 0.75, 1.0];
const INTRUDER_AGG_MAX = 0.34; // aggregate below this = off-biome intruder.

// Representative affix per biome climate (AFFIX_TAG_AFFINITIES vocabulary).
function affixForBiome(pool) {
  const climate = (pool && pool.climate_tags) || [];
  if (climate.includes('frozen')) return 'cryo';
  if (climate.includes('thermal') || climate.includes('fire')) return 'termico';
  if (climate.includes('spore')) return 'spore_dense';
  if (climate.includes('light')) return 'luminescente';
  return 'cryo';
}

// A unit tag that matches the given affix (from AFFIX_TAG_AFFINITIES).
const AFFIX_SAMPLE_TAG = {
  cryo: 'ice',
  termico: 'fire',
  spore_dense: 'spore',
  luminescente: 'light',
};

// Controlled gradient: 3 on-biome roster (canonical) + 2 off-biome intruders.
function buildGradient(sampleTag) {
  return [
    { id: 'roster_apex', tags: [sampleTag], narrative_tag: 'apex_lore', weight: 1 },
    { id: 'roster_support', tags: [sampleTag], weight: 1 },
    { id: 'roster_lore', narrative_tag: 'wanderer', weight: 1 },
    { id: 'intruder_offtag', tags: ['__offbiome__'], weight: 1 },
    { id: 'intruder_bare', weight: 1 },
  ];
}

function calibrate(opts = {}) {
  const biomeId = opts.biomeId || 'cryosteppe_convergence';
  const sweep = Array.isArray(opts.strengthSweep) ? opts.strengthSweep : STRENGTH_SWEEP;
  const pool = poolLoader.getPoolById(biomeId) || { id: biomeId, climate_tags: ['frozen'] };
  const affix = affixForBiome(pool);
  const sampleTag = AFFIX_SAMPLE_TAG[affix] || affix;
  const biomeConfig = {
    biome_id: biomeId,
    affixes: [affix],
    role_templates: Array.isArray(pool.role_templates) ? pool.role_templates : [],
  };
  const entries = buildGradient(sampleTag);
  const canonicalPool = entries
    .filter((e) => e.id.startsWith('roster_'))
    .map((e) => ({ id: e.id }));

  // Coherence aggregate per entry (strength-independent) -> intruder classification.
  const aggById = {};
  for (const e of entries) {
    aggById[e.id] = scoreAlienaCoherence(e, biomeConfig, { canonicalPool }).aggregate;
  }
  const isIntruder = (id) => aggById[id] < INTRUDER_AGG_MAX;

  const rows = sweep.map((strength) => {
    const out = applyBiomeBias(entries, biomeConfig, {
      alienaEnforcement: strength > 0 ? { strength } : undefined,
      canonicalPool,
    });
    let total = 0;
    let intruder = 0;
    for (const e of out) {
      const w = Number(e.weight) || 0;
      total += w;
      if (isIntruder(e.id)) intruder += w;
    }
    return {
      strength,
      total_weight: Math.round(total * 1000) / 1000,
      intruder_share: total > 0 ? Math.round((intruder / total) * 10000) / 10000 : 0,
    };
  });

  const off = rows.find((r) => r.strength === 0) || rows[0];
  const full = rows.find((r) => r.strength === 1) || rows[rows.length - 1];
  const half = rows.find((r) => r.strength === 0.5);
  const ppOff = off.intruder_share * 100;
  const ppHalf = half ? half.intruder_share * 100 : null;
  const ppFull = full.intruder_share * 100;
  const recommendation =
    `Off (strength=0): intruder spawn-share ${ppOff.toFixed(1)}% (existing biome-bias only). ` +
    (ppHalf !== null
      ? `strength=0.5 -> ${ppHalf.toFixed(1)}% (${(ppOff - ppHalf).toFixed(1)}pp suppression). `
      : '') +
    `strength=1.0 -> ${ppFull.toFixed(1)}% (${(ppOff - ppFull).toFixed(1)}pp, full coherence-coupling). ` +
    `Recommend strength=0.5 as conservative default to enable; refine with live telemetry (endpoint D).`;

  return { biomeId, affix, aggById, rows, recommendation };
}

function main() {
  const biomeId = process.argv[2] || 'cryosteppe_convergence';
  const res = calibrate({ biomeId });
  console.log(`ALIENA strength calibration -- biome=${res.biomeId} affix=${res.affix}`);
  console.log('aggregates:', JSON.stringify(res.aggById));
  console.log('strength | total_weight | intruder_share');
  for (const r of res.rows) {
    console.log(
      `  ${r.strength.toFixed(2)}   | ${String(r.total_weight).padStart(8)} | ${(r.intruder_share * 100).toFixed(1)}%`,
    );
  }
  console.log('\nRecommendation:\n  ' + res.recommendation);
}

if (require.main === module) main();

module.exports = { calibrate, STRENGTH_SWEEP, affixForBiome };
