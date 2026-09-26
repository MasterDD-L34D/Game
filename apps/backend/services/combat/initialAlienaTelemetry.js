// §21 ALIENA-C -- initial wave baseline telemetry helper. Emits a one-shot
// round=0 coherence snapshot for encounter.reinforcement_pool vs biome at
// session start. Pairs with ALIENA-B (reinforcementSpawner per-tick) to give
// a full temporal series anchored at the initial pool-vs-biome fit.
//
// Opt-in via encounter.reinforcement_policy.aliena_coherence_telemetry === true
// (same flag as ALIENA-B). Best-effort: never throws, never blocks session start.

'use strict';

const ALIENA_TELEMETRY_MAX = 500;

function ensureBuffer(session) {
  if (!Array.isArray(session.aliena_coherence_telemetry)) {
    session.aliena_coherence_telemetry = [];
  }
  return session.aliena_coherence_telemetry;
}

function _deriveBiomeConfig(encounter) {
  if (!encounter) return null;
  if (encounter.biome) return encounter.biome;
  if (!encounter.biome_id) return null;
  return {
    biome_id: encounter.biome_id,
    affixes: Array.isArray(encounter.affixes) ? encounter.affixes : [],
    npc_archetypes: encounter.npc_archetypes || null,
  };
}

function _emitPool(session, pool, biomeConfig, source) {
  const buffer = ensureBuffer(session);
  try {
    const { applyBiomeBias } = require('./biomeSpawnBias');
    applyBiomeBias(pool, biomeConfig, {
      canonicalPool: pool,
      emitAlienaCoherence: (sample) => {
        buffer.push({ ...sample, round: 0, source });
        if (buffer.length > ALIENA_TELEMETRY_MAX) buffer.shift();
      },
    });
  } catch {
    /* best-effort; never blocks session start */
  }
}

function _mapGroupsToPool(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((g) => g && g.species_hint)
    .map((g) => ({
      id: g.species_hint,
      role: g.role || null,
      tags: Array.isArray(g.trait_ids) ? g.trait_ids : [],
    }));
}

function emitInitial(session, encounter) {
  if (!session || !encounter) return;
  const policy = encounter.reinforcement_policy;
  if (!policy || policy.aliena_coherence_telemetry !== true) return;
  const biomeConfig = _deriveBiomeConfig(encounter);
  if (!biomeConfig) return;
  // ALIENA-C reinforcement_pool branch (round=0 baseline).
  const rPool = encounter.reinforcement_pool;
  if (Array.isArray(rPool) && rPool.length > 0) {
    _emitPool(session, rPool, biomeConfig, 'reinforcement_pool');
  }
  // ALIENA-E groups branch (initial-wave NPCs, parallel schema).
  const gPool = _mapGroupsToPool(encounter.groups);
  if (gPool.length > 0) {
    _emitPool(session, gPool, biomeConfig, 'groups');
  }
}

module.exports = { emitInitial, ALIENA_TELEMETRY_MAX };
