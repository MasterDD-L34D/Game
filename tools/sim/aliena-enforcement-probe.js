'use strict';
// SPEC-H HA1 aliena_enforcement strength probe (Tier-3 N=40 lane, N2).
//
// HA1 = the soft-enforcement flip: when policy.aliena_enforcement = {enabled,
// strength>0}, reinforcement spawn weights are modulated by each pool entry's
// ALIENA coherence aggregate -- factor = max(0.0001, 1 - strength*(1 - aggregate))
// (biomeSpawnBias.js:261). strength is a continuous knob [0,1], default 0 (off).
//
// VERIFY-FIRST FINDING (the reason this is NOT a combat-band sweep):
// On a REAL well-authored pool every entry scores the SAME coherence aggregate
// (bare reinforcement_pool entries: no affixes/tags/narrative -> identical p/e/n),
// so the factor is UNIFORM and the relative spawn weights are UNCHANGED at any
// strength -> enforcement is INERT on current content -> the flip is band-safe by
// construction (it changes nothing in real play). A naive combat N=40 on the
// badlands pilot would read "band-neutral" for the WRONG reason (no differential
// effect), masking the no-op (an I3-style illusory result). So this probe instead
// (1) PROVES the real-pool no-op deterministically and (2) demonstrates the
// re-weighting on a synthetic coherence-VARIED pool so master-dd can pick the
// guardrail strength.
//
// Usage: node tools/sim/aliena-enforcement-probe.js

const fs = require('fs');
const yaml = require('js-yaml');
const { applyBiomeBias } = require('../../apps/backend/services/combat/biomeSpawnBias');
const { scoreAlienaCoherence } = require('../../apps/backend/services/authorial/alienaCoherence');

const STRENGTHS = [0, 0.25, 0.5, 0.75, 1.0];

function loadBadlands() {
  const biomes = yaml.load(fs.readFileSync('data/core/biomes.yaml', 'utf8'));
  const b = biomes.biomes || biomes;
  return b.badlands || (Array.isArray(b) ? b.find((x) => x.id === 'badlands') : null);
}

function weightsAt(pool, biome, canonicalPool, strength) {
  const out = applyBiomeBias(pool, biome, {
    canonicalPool,
    alienaEnforcement: strength > 0 ? { enabled: true, strength } : null,
  });
  return out.map((e) => ({ id: e.id || e.unit_id, weight: Number(e.weight.toFixed(4)) }));
}

function main() {
  const badlands = loadBadlands();
  if (!badlands) throw new Error('badlands biomeConfig not found');

  // --- (1) Real pool no-op proof: the authored badlands pilot reinforcement pool.
  const enc = yaml.load(
    fs.readFileSync('docs/planning/encounters/enc_badlands_foodweb_pilot_01.yaml', 'utf8'),
  );
  const realPool = (enc.reinforcement_pool || []).map((e) => ({
    id: e.unit_id,
    weight: e.weight || 1,
  }));
  const realCanon = realPool.map((e) => ({ id: e.id }));
  const realAggs = realPool.map(
    (e) => scoreAlienaCoherence({ ...e }, badlands, { canonicalPool: realCanon }).aggregate,
  );
  const realUniform = new Set(realAggs).size === 1;

  // --- (2) Synthetic coherence-VARIED pool. HIGH = in canonicalPool + narrative
  // anchored; LOW = not in canonical + no narrative. Same base weight so strength=0
  // is the 1:1 baseline; the divergence at strength>0 is purely the aliena factor.
  const variedPool = [
    { id: 'coherent_native', weight: 1, narrative_hooks: ['endemic to the ferrous flats'] },
    { id: 'incoherent_alien', weight: 1 },
  ];
  const variedCanon = [{ id: 'coherent_native' }];
  const aggH = scoreAlienaCoherence(variedPool[0], badlands, {
    canonicalPool: variedCanon,
  }).aggregate;
  const aggL = scoreAlienaCoherence(variedPool[1], badlands, {
    canonicalPool: variedCanon,
  }).aggregate;

  const rows = STRENGTHS.map((s) => {
    const w = weightsAt(variedPool, badlands, variedCanon, s);
    const wH = w.find((x) => x.id === 'coherent_native').weight;
    const wL = w.find((x) => x.id === 'incoherent_alien').weight;
    return {
      strength: s,
      coherent_weight: wH,
      incoherent_weight: wL,
      incoherent_share: Number((wL / (wH + wL)).toFixed(4)),
      suppression_pct: Number(((1 - wL / wH) * 100 || 0).toFixed(1)),
    };
  });

  console.log(
    JSON.stringify(
      {
        probe: 'aliena_enforcement_strength',
        real_pool: {
          scenario: 'enc_badlands_foodweb_pilot_01',
          aggregates: realAggs,
          uniform: realUniform,
          verdict: realUniform
            ? 'INERT on real pool (uniform coherence) -> flip band-safe by construction'
            : 'real pool has varied coherence -> enforcement would re-weight',
        },
        synthetic_varied_pool: {
          coherent_aggregate: aggH,
          incoherent_aggregate: aggL,
          sweep: rows,
        },
      },
      null,
      2,
    ),
  );
}

main();
