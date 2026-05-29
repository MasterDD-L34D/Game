// §21 ALIENA runtime DIAGNOSTIC layer -- pure scorer.
//
// Computes a 3-dimensional ALIENA coherence score (0..1) for runtime
// decisions (start: spawn). Sub-scores adapted from ALIENA appendice rubrica
// (docs/appendici/ALIENA_documento_integrato.md) -- runtime-relevant pillars
// only (plausibilita + coerenza eco-morfo-culturale + ancoraggio narrativo).
// Authoring-only criteria (originalita/giustificazioni/comunicazione) skipped.
//
// DIAGNOSTIC mode: no enforcement, no block. Caller emits telemetry.
// Start-values per L-069 pattern; lock = playtest data.
//
// Authority: vault SoT §21 (runtime-layer gap) + ALIENA appendice integrato.
'use strict';

const biomeSpawnBias = require('../combat/biomeSpawnBias');

const ALIENA_WEIGHTS = Object.freeze({
  plausibilita: 0.4,
  coerenza_eco: 0.4,
  ancoraggio_narrativo: 0.2,
});

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function _entryId(e) {
  if (!e) return null;
  return e.id || e.unit_id || null;
}

function _scorePlausibilita(entry, biomeConfig, canonicalPool) {
  const eid = _entryId(entry);
  if (!eid) return 0;
  const pool = Array.isArray(canonicalPool) ? canonicalPool : [];
  const inPool = pool.some((p) => p && _entryId(p) === eid);
  if (inPool) return 1.0;
  const roleTemplates = (biomeConfig && biomeConfig.role_templates) || [];
  try {
    const m = biomeSpawnBias.matchRoleTemplate(entry, roleTemplates);
    if (m && m.matched) return 0.5;
  } catch {
    /* best-effort: missing data -> 0 */
  }
  return 0;
}

function _scoreCoerenzaEco(entry, biomeConfig) {
  try {
    const s = biomeSpawnBias.biomeMatchScore(entry, biomeConfig);
    return clamp01(s);
  } catch {
    return 0;
  }
}

function _scoreAncoraggioNarrativo(entry) {
  if (!entry) return 0.5;
  const hooks = Array.isArray(entry.narrative_hooks) ? entry.narrative_hooks : null;
  if (hooks && hooks.length > 0) return 1.0;
  if (typeof entry.lore_ref === 'string' && entry.lore_ref) return 1.0;
  if (typeof entry.narrative_tag === 'string' && entry.narrative_tag) return 1.0;
  return 0.5;
}

/**
 * Score an entry's ALIENA coherence vs a biome decision context.
 * @param {object} entry -- spawn pool entry (id, tags, role, narrative_*)
 * @param {object} biomeConfig -- biome (id, affixes, role_templates)
 * @param {object} [opts] -- { canonicalPool: [{id}] }
 * @returns {{aggregate:number, sub_scores:{plausibilita,coerenza_eco,ancoraggio_narrativo}, weights:object}}
 */
function scoreAlienaCoherence(entry, biomeConfig, opts) {
  opts = opts || {};
  const canonicalPool = opts.canonicalPool || [];
  const p = clamp01(_scorePlausibilita(entry, biomeConfig, canonicalPool));
  const e = clamp01(_scoreCoerenzaEco(entry, biomeConfig));
  const n = clamp01(_scoreAncoraggioNarrativo(entry));
  const aggregate = clamp01(
    p * ALIENA_WEIGHTS.plausibilita +
      e * ALIENA_WEIGHTS.coerenza_eco +
      n * ALIENA_WEIGHTS.ancoraggio_narrativo,
  );
  return {
    aggregate: Math.round(aggregate * 10000) / 10000,
    sub_scores: {
      plausibilita: Math.round(p * 10000) / 10000,
      coerenza_eco: Math.round(e * 10000) / 10000,
      ancoraggio_narrativo: Math.round(n * 10000) / 10000,
    },
    weights: ALIENA_WEIGHTS,
  };
}

module.exports = { scoreAlienaCoherence, ALIENA_WEIGHTS };
