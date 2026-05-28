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

function emitInitial(session, encounter) {
  if (!session || !encounter) return;
  const policy = encounter.reinforcement_policy;
  if (!policy || policy.aliena_coherence_telemetry !== true) return;
  const pool = encounter.reinforcement_pool;
  if (!Array.isArray(pool) || pool.length === 0) return;
  let biomeConfig = encounter.biome || null;
  if (!biomeConfig && encounter.biome_id) {
    biomeConfig = {
      biome_id: encounter.biome_id,
      affixes: Array.isArray(encounter.affixes) ? encounter.affixes : [],
      npc_archetypes: encounter.npc_archetypes || null,
    };
  }
  if (!biomeConfig) return;
  const buffer = ensureBuffer(session);
  try {
    const { applyBiomeBias } = require('./biomeSpawnBias');
    applyBiomeBias(pool, biomeConfig, {
      canonicalPool: pool,
      emitAlienaCoherence: (sample) => {
        buffer.push({ ...sample, round: 0 });
        if (buffer.length > ALIENA_TELEMETRY_MAX) buffer.shift();
      },
    });
  } catch {
    /* best-effort; never blocks session start */
  }
}

module.exports = { emitInitial, ALIENA_TELEMETRY_MAX };
