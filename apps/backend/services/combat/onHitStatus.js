// Combat parity GAP-1 (2026-06-07) — on_hit_status producer hook.
//
// Ports STEP 3 `on_hit_status` from the removed Python resolver
// (services/rules/resolver.py @ commit d0c86c60~1, lines ~840-870) into the
// live Node attack resolver. The Python engine was deprecated (kill-python-
// rules-engine ADR) but this auto-status-on-hit trigger was never re-wired:
// the data lived in trait_mechanics.yaml and the decay/consumer side already
// existed (sessionRoundBridge.js integer-key decay + statusModifiers.js /
// session.js status readers), but no producer applied the status on hit.
//
// Behaviour (faithful to the Python STEP 3):
//   On a SUCCESSFUL hit, for each ATTACKER trait that carries an
//   `on_hit_status` block { status_id, trigger_dc, duration, intensity },
//   the TARGET rolls a saving throw d20 + target.tier vs trigger_dc.
//   If the save FAILS (roll + tier < trigger_dc) the status is applied to
//   the target: target.status[status_id] = max(existing, duration).
//
// The d20 helper mirrors session.js performAttack (Math.floor(rng() * 20) + 1)
// and uses the seedable pseudoRng provider so calibration runs stay
// deterministic; production (unseeded) delegates to Math.random.
//
// Pure module: no I/O in applyOnHitStatuses (the mechanics registry is passed
// in). loadTraitMechanicsRegistry() is the cached YAML loader used by the
// production caller; it mirrors traitEffects.loadActiveTraitRegistry.
//
// API:
//   applyOnHitStatuses(actor, target, { rng?, mechanicsRegistry })
//     -> { applied: [{ status_id, duration, intensity, trigger_dc,
//                       save_roll, save_total, trait_id }] }
//   loadTraitMechanicsRegistry(yamlPath?, logger?) -> { traitId: mechanics }
//   DEFAULT_TRAIT_MECHANICS_PATH

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { defaultRng } = require('./pseudoRng');

// Canonical location of trait_mechanics.yaml (the SOT for on_hit_status).
// Mirrors resistanceEngine.DEFAULT_SPECIES_RESISTANCES_PATH (process.cwd()
// + packs/evo_tactics_pack/data/balance/...).
const DEFAULT_TRAIT_MECHANICS_PATH = path.join(
  process.cwd(),
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'trait_mechanics.yaml',
);

let _registryCache = null;

/**
 * Load trait_mechanics.yaml -> map { traitId: mechanicsEntry }. Cached after
 * first read (the file is static at runtime). Soft-fail: a missing/broken file
 * yields {} so the resolver degrades to no-op (no status applied), never
 * throwing on the hit path. Mirrors traitEffects.loadActiveTraitRegistry.
 *
 * @param {string} [yamlPath]
 * @param {{log: Function, warn: Function}} [logger]
 * @returns {Object} traits map
 */
function loadTraitMechanicsRegistry(yamlPath = DEFAULT_TRAIT_MECHANICS_PATH, logger = console) {
  if (_registryCache !== null && yamlPath === DEFAULT_TRAIT_MECHANICS_PATH) {
    return _registryCache;
  }
  let traits = {};
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    traits = parsed && typeof parsed === 'object' ? parsed.traits || {} : {};
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[on-hit-status] ${yamlPath} non trovato, on_hit_status in modalita' no-op`);
    } else {
      logger.warn(`[on-hit-status] errore caricamento ${yamlPath}:`, (err && err.message) || err);
    }
    traits = {};
  }
  if (yamlPath === DEFAULT_TRAIT_MECHANICS_PATH) {
    _registryCache = traits;
  }
  return traits;
}

/** Test/boot hook: drop the cached registry so a reload re-reads the file. */
function _resetCache() {
  _registryCache = null;
}

/**
 * Roll a d20 using the same convention as session.js performAttack:
 * Math.floor(rng() * 20) + 1 -> integer in [1, 20].
 */
function rollD20(rng) {
  return Math.floor(rng() * 20) + 1;
}

/**
 * Apply on_hit_status triggers for a successful hit. Caller MUST gate this on
 * `result.hit` (only fires on a successful hit, matching the Python STEP 3).
 *
 * For each id in actor.traits, look up its on_hit_status block in
 * mechanicsRegistry. Roll the target's save (d20 + target.tier) vs trigger_dc;
 * on FAIL (total < trigger_dc) set target.status[status_id] = max(existing,
 * duration). Statuses decay 1/round via sessionRoundBridge.
 *
 * Pure aside from the in-place mutation of target.status (the documented
 * effect). Never throws; degrades to no-op on malformed input.
 *
 * @param {object} actor  attacker (reads actor.traits)
 * @param {object} target defender (reads target.tier, mutates target.status)
 * @param {{ rng?: Function, mechanicsRegistry: Object }} opts
 * @returns {{ applied: Array<object> }}
 */
function applyOnHitStatuses(actor, target, opts = {}) {
  const applied = [];
  if (!actor || !target) return { applied };

  const rng = typeof opts.rng === 'function' ? opts.rng : defaultRng;
  const registry =
    opts.mechanicsRegistry && typeof opts.mechanicsRegistry === 'object'
      ? opts.mechanicsRegistry
      : loadTraitMechanicsRegistry();

  const traitIds = Array.isArray(actor.traits) ? actor.traits : [];
  if (traitIds.length === 0) return { applied };

  const tier = Number.isFinite(Number(target.tier)) ? Number(target.tier) : 1;

  for (const traitId of traitIds) {
    const entry = registry[traitId];
    if (!entry || typeof entry !== 'object') continue;
    const onHit = entry.on_hit_status;
    if (!onHit || typeof onHit !== 'object') continue;

    const statusId = String(onHit.status_id || '').trim();
    if (!statusId) continue;
    const triggerDc = Number.isFinite(Number(onHit.trigger_dc)) ? Number(onHit.trigger_dc) : 10;
    const duration = Number.isFinite(Number(onHit.duration)) ? Number(onHit.duration) : 1;

    // Target saving throw: d20 + tier vs trigger_dc. Fail (total < DC) -> apply.
    const saveRoll = rollD20(rng);
    const saveTotal = saveRoll + tier;
    if (saveTotal >= triggerDc) continue; // save succeeds -> no status

    if (!target.status || typeof target.status !== 'object') target.status = {};
    const current = Number(target.status[statusId]) || 0;
    target.status[statusId] = Math.max(current, duration);

    applied.push({
      trait_id: traitId,
      status_id: statusId,
      duration,
      intensity: Number.isFinite(Number(onHit.intensity)) ? Number(onHit.intensity) : 1,
      trigger_dc: triggerDc,
      save_roll: saveRoll,
      save_total: saveTotal,
    });
  }

  return { applied };
}

module.exports = {
  applyOnHitStatuses,
  loadTraitMechanicsRegistry,
  DEFAULT_TRAIT_MECHANICS_PATH,
  _resetCache,
};
