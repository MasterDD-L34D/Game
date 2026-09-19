// OD-058 D2 (2026-06-01) — wound location system.
//
// Source: vault SPEC-D2-wound-location-system-2026-05-26 (ratify master-dd 2026-06-01).
// Supersedes the two orphan models (woundedPerma HP-penalty + statusModifiers
// severity->attack-only) with a hit-location -> stat-malus model:
//   - 4 fixed locations cover the canonical stat set (AP / defense / attack / mobility);
//   - 3 severity tiers (lieve / media / grave) scale malus + persistence;
//   - only `grave` wounds persist cross-encounter (scar), like the old woundedPerma role.
//
// HP is left intact (SPEC §7): fragility now arrives via -defense, not raw HP cuts.
// Data model: unit.status.wounds = Array<{ location, severity, stat, malus }>.
//
// CUTOVER D3 COMPLETO (verdetti master-dd 2026-06-10, evidence #2714): flag
// WOUND_LOCATION_V2 default ON (opt-out 'false' = kill switch); write-trigger
// live in performAttack (crit -> lieve, KO -> grave, solo PG); persistence
// grave cross-encounter via woundsV2ByCampaign (session.lastMissionWounds);
// legacy woundedPerma (HP-penalty) gira SOLO in opt-out. Round-sync: status.wounds
// e' esente dal wipe (PERSISTENT_STATUS_KEYS, sessionRoundBridge).

'use strict';

// SPEC §2: 4 locations cover the canonical stat set {AP, defense, attack, mobility}.
const LOCATIONS = ['testa', 'torso', 'arti_anteriori', 'arti_posteriori'];

// SPEC §3: severity tiers.
const SEVERITIES = ['lieve', 'media', 'grave'];

// SPEC §9: death-spiral guard — cap total wounds + 1 grave per location.
const MAX_WOUNDS = 3;

// SPEC §4: random-weighted location. torso heaviest (big target), testa lightest
// (hard/critical hit). Authoritative table mirrored in
// data/core/balance/damage_curves.yaml (wound_location_weights); kept here as the
// in-code default / fallback.
const DEFAULT_LOCATION_WEIGHTS = Object.freeze({
  torso: 40,
  arti_anteriori: 25,
  arti_posteriori: 25,
  testa: 10,
});

// Base location -> primary stat. `testa` is special (graduato, see woundEffect).
const LOCATION_STAT = Object.freeze({
  testa: 'accuracy',
  torso: 'defense_mod',
  arti_anteriori: 'attack_mod',
  arti_posteriori: 'mobility',
});

// SPEC §3 + §8.1: magnitudo -1 / -1 / -2 (lieve/media/grave).
const SEVERITY_MALUS = Object.freeze({ lieve: -1, media: -1, grave: -2 });

// Stats that computeWoundMaluses aggregates (one delta per canonical stat + accuracy).
const MALUS_STATS = ['attack_mod', 'defense_mod', 'ap', 'mobility', 'accuracy'];

/**
 * Pure mapping location + severity -> { stat, malus }.
 *
 * SPEC §8.4 testa graduato: lieve/media penalize `accuracy` (-mira to-hit); only a
 * `grave` head wound costs -1 AP (NOT -2 — a -2 AP on a 2-AP budget would be unusable).
 *
 * @throws if location or severity is unknown (no silent wrong stat).
 */
function woundEffect(location, severity) {
  if (!LOCATIONS.includes(location)) {
    throw new Error(`woundSystem.woundEffect: invalid location "${location}"`);
  }
  if (!SEVERITIES.includes(severity)) {
    throw new Error(`woundSystem.woundEffect: invalid severity "${severity}"`);
  }
  if (location === 'testa' && severity === 'grave') {
    return { stat: 'ap', malus: -1 };
  }
  return { stat: LOCATION_STAT[location], malus: SEVERITY_MALUS[severity] };
}

function ensureWounds(unit) {
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  if (!Array.isArray(unit.status.wounds)) unit.status.wounds = [];
  return unit.status.wounds;
}

function currentWoundCount(unit) {
  return unit && unit.status && Array.isArray(unit.status.wounds) ? unit.status.wounds.length : 0;
}

/**
 * Apply a localized wound. Mutates unit.status.wounds (does NOT touch hp/max_hp).
 *
 * Caps (SPEC §9): at most MAX_WOUNDS total, at most 1 `grave` per location.
 *
 * @returns {{ applied: boolean, wound: object|null, total: number }}
 */
function applyWound(unit, location, severity, _opts = {}) {
  if (!unit || typeof unit !== 'object' || !unit.id) {
    return { applied: false, wound: null, total: 0 };
  }
  if (!LOCATIONS.includes(location) || !SEVERITIES.includes(severity)) {
    return { applied: false, wound: null, total: currentWoundCount(unit) };
  }
  const wounds = ensureWounds(unit);
  if (wounds.length >= MAX_WOUNDS) {
    return { applied: false, wound: null, total: wounds.length };
  }
  if (
    severity === 'grave' &&
    wounds.some((w) => w && w.location === location && w.severity === 'grave')
  ) {
    return { applied: false, wound: null, total: wounds.length };
  }
  const { stat, malus } = woundEffect(location, severity);
  const wound = { location, severity, stat, malus };
  wounds.push(wound);
  return { applied: true, wound, total: wounds.length };
}

/**
 * Read-path (SPEC §6). Sums wound maluses by stat. Returns a zeroed object when no
 * wounds. Generalizes the old computeWoundedPermaAttackPenalty (attack-only).
 *
 * @returns {{ attack_mod, defense_mod, ap, mobility, accuracy }}
 */
function computeWoundMaluses(unit) {
  const out = { attack_mod: 0, defense_mod: 0, ap: 0, mobility: 0, accuracy: 0 };
  const wounds = unit && unit.status && Array.isArray(unit.status.wounds) ? unit.status.wounds : [];
  for (const w of wounds) {
    if (w && typeof w.stat === 'string' && Object.prototype.hasOwnProperty.call(out, w.stat)) {
      out[w.stat] += Number(w.malus) || 0;
    }
  }
  return out;
}

/**
 * OD-058 D2 read-apply flag (issue #2531). The staged engine shipped with NO consumer
 * for computeWoundMaluses; behind this flag statusModifiers (attack/accuracy/defense)
 * and applyApRefill (ap) actually apply the maluses. Default OFF = status quo
 * Read per-call so probe arms can toggle it within one process.
 * D3 cutover (verdetto master-dd 2026-06-10, evidence #2714): default ON --
 * magnitudo -1/-1/-2 RATIFIED-PROVISIONAL (firma segnaletica, famiglia A13);
 * opt-out esplicito WOUND_LOCATION_V2=false (kill switch).
 */
function isReadApplyEnabled() {
  return process.env.WOUND_LOCATION_V2 !== 'false';
}

/**
 * Weighted location roll (SPEC §4) -- rng injectable (session RNG at the
 * caller, Codex #2450 pattern). Falls back to torso on degenerate rng.
 */
function rollLocation(rng) {
  const r = typeof rng === 'function' ? Number(rng()) : Math.random();
  const roll = Number.isFinite(r) ? Math.max(0, Math.min(0.999999, r)) : 0;
  return pickWeightedLocation(DEFAULT_LOCATION_WEIGHTS, roll);
}

/**
 * D3 write-trigger (verdetto master-dd 2026-06-10, Q2): crit -> `lieve`,
 * KO -> `grave`. Solo PG reali (player, non minion -- B5: i minion sono
 * expendable, mai scarred). Flag-aware (stesso kill switch del read-apply).
 * KO vince sul crit (un colpo critico che uccide = ferita grave).
 */
function maybeApplyCombatWound(unit, { isCritical = false, isKo = false, rng } = {}) {
  if (!isReadApplyEnabled()) return { applied: false, wound: null };
  if (!unit || unit.controlled_by !== 'player' || unit.is_minion) {
    return { applied: false, wound: null };
  }
  if (!isKo && !isCritical) return { applied: false, wound: null };
  const severity = isKo ? 'grave' : 'lieve';
  return applyWound(unit, rollLocation(rng), severity);
}

/** Empty cross-encounter map { [unit_id]: Array<grave wound> }. */
function initSessionMap() {
  return {};
}

/**
 * Serialize a unit's `grave` wounds into the session map (cross-encounter scar).
 * lieve/media are encounter-scoped and intentionally NOT persisted (SPEC §3/§5).
 *
 * @returns {number} count of grave wounds persisted
 */
function persistGraveWounds(unit, sessionMap) {
  if (!unit || typeof unit !== 'object' || !unit.id) return 0;
  if (!sessionMap || typeof sessionMap !== 'object') return 0;
  const wounds = unit.status && Array.isArray(unit.status.wounds) ? unit.status.wounds : [];
  const grave = wounds.filter((w) => w && w.severity === 'grave').map((w) => ({ ...w }));
  sessionMap[unit.id] = grave;
  return grave.length;
}

/**
 * Re-apply persisted grave wounds at encounter start. Idempotent: skips a grave wound
 * the unit already carries at that location (no double-add).
 *
 * @returns {{ restored: number }}
 */
function restoreOnEncounterStart(unit, sessionMap) {
  if (!unit || typeof unit !== 'object' || !unit.id) return { restored: 0 };
  if (!sessionMap || typeof sessionMap !== 'object') return { restored: 0 };
  const persisted = Array.isArray(sessionMap[unit.id]) ? sessionMap[unit.id] : [];
  const wounds = ensureWounds(unit);
  let restored = 0;
  for (const w of persisted) {
    if (!w || w.severity !== 'grave') continue;
    const exists = wounds.some((x) => x.location === w.location && x.severity === 'grave');
    if (exists) continue;
    wounds.push({ ...w });
    restored += 1;
  }
  return { restored };
}

/**
 * Heal encounter-scoped wounds (lieve/media) at encounter end; keep grave scars.
 *
 * @returns {number} count removed
 */
function clearEncounterWounds(unit) {
  if (!unit || !unit.status || !Array.isArray(unit.status.wounds)) return 0;
  const before = unit.status.wounds.length;
  unit.status.wounds = unit.status.wounds.filter((w) => w && w.severity === 'grave');
  return before - unit.status.wounds.length;
}

/**
 * D3 persistence (scar write): copy the unit's `grave` wounds into the
 * campaign-scoped map (mirror of the old woundedPerma role). Lieve/media
 * wounds are encounter-scoped and never persisted.
 */
function persistGraveWounds(unit, sessionMap) {
  if (!unit || !unit.id || !sessionMap || typeof sessionMap !== 'object') return 0;
  const graves = (
    unit.status && Array.isArray(unit.status.wounds) ? unit.status.wounds : []
  ).filter((w) => w && w.severity === 'grave');
  if (!graves.length) return 0;
  sessionMap[unit.id] = graves.map((w) => ({ ...w }));
  return graves.length;
}

/**
 * D3 persistence (scar restore at /start): re-inject persisted grave wounds
 * onto the unit (dedup per location via applyWound's own grave-per-location cap).
 */
function restoreGraveWounds(unit, sessionMap) {
  if (!unit || !unit.id || !sessionMap || typeof sessionMap !== 'object') return 0;
  const saved = sessionMap[unit.id];
  if (!Array.isArray(saved) || !saved.length) return 0;
  let restored = 0;
  for (const w of saved) {
    if (!w || w.severity !== 'grave') continue;
    const out = applyWound(unit, w.location, 'grave');
    if (out.applied) restored += 1;
  }
  return restored;
}

/** Wipe all persisted scars (e.g., on full heal / new playthrough). */
function clearSession(sessionMap) {
  if (!sessionMap || typeof sessionMap !== 'object') return 0;
  const keys = Object.keys(sessionMap);
  for (const k of keys) delete sessionMap[k];
  return keys.length;
}

/**
 * Pick a location from a weight map given a uniform roll in [0, 1). Iterates the weight
 * map's own key order (insertion order) so callers control the cumulative layout.
 * Deterministic — caller injects the roll (no Math.random here, for testability).
 */
function pickWeightedLocation(weights, roll01) {
  const map = weights && typeof weights === 'object' ? weights : DEFAULT_LOCATION_WEIGHTS;
  const keys = Object.keys(map).filter((k) => Number(map[k]) > 0);
  const total = keys.reduce((s, k) => s + Number(map[k]), 0);
  if (total <= 0) return LOCATIONS[0];
  let r = Math.max(0, Math.min(0.9999999, Number(roll01) || 0)) * total;
  for (const k of keys) {
    const w = Number(map[k]);
    if (r < w) return k;
    r -= w;
  }
  return keys[keys.length - 1];
}

module.exports = {
  LOCATIONS,
  SEVERITIES,
  MAX_WOUNDS,
  DEFAULT_LOCATION_WEIGHTS,
  LOCATION_STAT,
  SEVERITY_MALUS,
  MALUS_STATS,
  woundEffect,
  applyWound,
  rollLocation,
  maybeApplyCombatWound,
  persistGraveWounds,
  restoreGraveWounds,
  computeWoundMaluses,
  isReadApplyEnabled,
  initSessionMap,
  persistGraveWounds,
  restoreOnEncounterStart,
  clearEncounterWounds,
  clearSession,
  pickWeightedLocation,
};
