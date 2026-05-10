// 2026-05-10 TKT-MUT-AUTO-TRIGGER Phase 2+3+4 (ADR-2026-05-10).
//
// Phase 2: parser whitelist 12 kinds machine-readable.
// Phase 3: per-unit per-round evaluator service.
// Phase 4: surface — emit mutation_unlocked event in raw event log
//   (action_type='mutation_unlock') + CLI debug log.
//
// Caller: apps/backend/services/sessionRoundBridge.js
//   applyEndOfRoundSideEffects → loop units → evaluateMutationTriggers
//
// Idempotent: re-call same state → empty delta (already-unlocked filtered).
// Performance: per-unit per-round, evaluates only mutations with prereq
// satisfied (skip locked-by-tier path).
//
// 2026-05-10 verdict completista+ottimizzatore:
//   Q1 Phase scope = B (full backend Phase 1+2+3, surface CLI/log)
//   Q2 Trigger kinds = Full (12 kinds whitelist post auto-extract)
//   Q3 Default unlock UX = Hybrid (auto tier 1, confirm tier 2-3)
//   Q4 Cumulative cross-session = Schema migration deferred (separate PR)
//
// Status implementation:
//   - status_apply_count       ✅ implemented
//   - biome_turn_count         ✅ implemented
//   - damage_taken_high_mos    ✅ implemented
//   - kill_streak              ✅ implemented
//   - mutation_chain           ✅ implemented
//   - cumulative_turns_biome   ✅ implemented (Phase 5 ship — Prisma migration 0007 done)
//   - damage_taken_channel     ✅ implemented
//   - ally_killed_adjacent     ✅ implemented (Phase 5 partial 2026-05-10 — kill+attack event match + position adjacency)
//   - ally_adjacent_turns      ⏳ deferred Phase 6 (richiede per-turn proximity tracker, Prisma migration 0008+)
//   - assisted_kill_count      ✅ implemented (Phase 5 partial 2026-05-10 — assist event filter)
//   - sistema_signal_active    ✅ implemented
//   - trait_active_cumulative  ⏳ deferred Phase 6 (cross-encounter aggregate, Prisma migration 0009+)
//
// Phase 5 implementation count: 10/12 kinds. Residue 2/12 require Prisma
// schema migration (per-turn proximity tracker + cross-encounter trait
// aggregate) — defer ADR + master-dd grant gate.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CATALOG_PATH = path.resolve(
  __dirname,
  '../../../../data/core/mutations/mutation_catalog.yaml',
);

let _cachedCatalog = null;

function _loadCatalog() {
  if (_cachedCatalog) return _cachedCatalog;
  if (!fs.existsSync(CATALOG_PATH)) return null;
  try {
    const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
    const data = yaml.load(raw);
    _cachedCatalog = data?.mutations || {};
    return _cachedCatalog;
  } catch (err) {
    console.warn('[mutation-trigger] catalog load failed:', err.message);
    return null;
  }
}

function _resetCache() {
  _cachedCatalog = null;
}

// Hybrid auto-acquire policy (Q3): tier 1 auto-acquire, tier 2-3 confirm.
function _shouldAutoAcquire(mutation) {
  return Number(mutation?.tier) <= 1;
}

// Phase 2 kind evaluator — per-condition.
function _evaluateCondition(condition, unit, session) {
  if (!condition || typeof condition !== 'object' || !condition.kind) {
    return { triggered: false, reason: 'invalid_condition' };
  }
  const kind = condition.kind;
  const events = Array.isArray(session?.events) ? session.events : [];
  const unitId = unit?.id;
  switch (kind) {
    case 'status_apply_count': {
      const status = condition.status;
      const threshold = Number(condition.threshold) || 0;
      const window = condition.window || 'encounter';
      // Count apply_status events targeting this unit (or sourced by this unit if source_trait specified).
      const filterUnit = condition.source_trait ? 'actor_id' : 'target_id';
      const count = events.filter((e) => {
        if (e.action_type !== 'apply_status') return false;
        if (e[filterUnit] !== unitId) return false;
        if (e.status !== status) return false;
        // Window filter: cumulative ignores window, encounter/session same per-session.
        return true;
      }).length;
      return { triggered: count >= threshold, count, threshold };
    }
    case 'biome_turn_count': {
      const biomeClass = condition.biome_class;
      const threshold = Number(condition.threshold) || 0;
      const sistemaPressureMin = Number(condition.sistema_pressure_min) || 0;
      // Match biome_class against session.scenario_id biome lookup.
      const sessionBiomeClass = session?.scenario_biome_class || null;
      if (biomeClass !== 'any' && sessionBiomeClass !== biomeClass) {
        return { triggered: false, reason: 'biome_mismatch' };
      }
      const turn = Number(session?.turn) || 0;
      if (turn < threshold) return { triggered: false, turn, threshold };
      const pressure = Number(session?.sistema_pressure) || 0;
      if (pressure < sistemaPressureMin) return { triggered: false, pressure, sistemaPressureMin };
      return { triggered: true, turn, pressure };
    }
    case 'damage_taken_high_mos': {
      const mosThreshold = Number(condition.mos_threshold) || 0;
      const count = Number(condition.count) || 0;
      const side = condition.side || 'target';
      const elevationMin = Number(condition.elevation_min) || 0;
      // Count attack events where this unit was on `side` and MoS >= threshold.
      const filtered = events.filter((e) => {
        if (e.action_type !== 'attack') return false;
        if (side === 'target' && e.target_id !== unitId) return false;
        if (side === 'actor' && e.actor_id !== unitId) return false;
        if (Number(e.mos || 0) < mosThreshold) return false;
        if (elevationMin > 0 && Number(e.elevation || 0) < elevationMin) return false;
        return true;
      });
      return { triggered: filtered.length >= count, count: filtered.length, threshold: count };
    }
    case 'kill_streak': {
      const targetCount = Number(condition.count) || 0;
      const noDamageBetween = condition.no_damage_taken_between === true;
      // Count consecutive kill events by this unit, optionally without damage_taken between.
      let streak = 0;
      let maxStreak = 0;
      for (const e of events) {
        if (e.action_type === 'kill' && e.actor_id === unitId) {
          streak += 1;
          maxStreak = Math.max(maxStreak, streak);
        } else if (noDamageBetween && e.action_type === 'damage_taken' && e.target_id === unitId) {
          streak = 0; // reset on damage taken
        }
      }
      return { triggered: maxStreak >= targetCount, maxStreak, threshold: targetCount };
    }
    case 'mutation_chain': {
      const prereq = condition.prereq_mutation_id;
      const applied = Array.isArray(unit?.applied_mutations) ? unit.applied_mutations : [];
      return { triggered: applied.includes(prereq), prereq };
    }
    case 'damage_taken_channel': {
      const channel = condition.channel;
      const count = Number(condition.count) || 0;
      const filtered = events.filter((e) => {
        if (e.action_type !== 'attack') return false;
        if (e.target_id !== unitId) return false;
        return e.damage_channel === channel;
      });
      return { triggered: filtered.length >= count, count: filtered.length, threshold: count };
    }
    case 'sistema_signal_active': {
      const signalId = condition.signal_id;
      const signals = Array.isArray(session?.warning_signals) ? session.warning_signals : [];
      return { triggered: signals.includes(signalId), signalId };
    }
    case 'cumulative_turns_biome': {
      // 2026-05-10 TKT-MUT Q4 Phase 5 ship — Prisma migration 0007 done.
      // unit.cumulative_biome_turns: { "<biome_class>": <int_cross_session> }.
      const biomeClass = condition.biome_class;
      const threshold = Number(condition.threshold) || 0;
      const turns = Number(unit?.cumulative_biome_turns?.[biomeClass]) || 0;
      return { triggered: turns >= threshold, turns, threshold, biomeClass };
    }
    case 'ally_killed_adjacent': {
      // Phase 5 partial 2026-05-10. Match kill events ally-actor + position
      // adjacency vs unit.position. species_filter: 'same' = ally.species ==
      // unit.species. Adjacency = Manhattan distance <= 1 from attack.position_to
      // (where target died) — unit was witness/participant of nearby kill.
      const speciesFilter = condition.species_filter || null;
      const threshold = Number(condition.threshold) || 0;
      const unitTeam = unit?.team || 'players';
      const unitSpecies = unit?.species || null;
      const ux = Number(unit?.position?.x);
      const uy = Number(unit?.position?.y);
      if (!Number.isFinite(ux) || !Number.isFinite(uy)) {
        return { triggered: false, reason: 'unit_position_missing' };
      }
      const allUnits = Array.isArray(session?.units) ? session.units : [];
      const allyIds = new Set(
        allUnits
          .filter((u) => u && u.id !== unitId && (u.team || 'players') === unitTeam)
          .map((u) => u.id),
      );
      // Build attack event index by (actor_id, target_id, turn) for position lookup.
      const attackByKey = new Map();
      for (const e of events) {
        if (e.action_type === 'attack' && e.position_to) {
          attackByKey.set(`${e.actor_id}|${e.target_id}|${e.turn}`, e);
        }
      }
      let count = 0;
      for (const e of events) {
        if (e.action_type !== 'kill') continue;
        if (!allyIds.has(e.actor_id)) continue;
        // species_filter: same → killer.species == unit.species.
        if (speciesFilter === 'same' && unitSpecies && e.actor_species !== unitSpecies) continue;
        // Lookup attack position; fallback skip if missing (older events).
        const attack = attackByKey.get(`${e.actor_id}|${e.target_id}|${e.turn}`);
        if (!attack || !attack.position_to) continue;
        const tx = Number(attack.position_to.x);
        const ty = Number(attack.position_to.y);
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
        const dist = Math.abs(ux - tx) + Math.abs(uy - ty);
        if (dist <= 1) count += 1;
      }
      return { triggered: count >= threshold, count, threshold, speciesFilter };
    }
    case 'assisted_kill_count': {
      // Phase 5 partial 2026-05-10. Filter assist events sourced by this unit.
      // Assist events già emessi via emitKillAndAssists (apps/backend/routes/session.js).
      const threshold = Number(condition.threshold) || 0;
      // window: cumulative (default) | encounter | session.
      // Currently session.events spans cumulative — window filter is no-op
      // until per-encounter scoping shipped (defer Phase 6).
      const count = events.filter(
        (e) => e.action_type === 'assist' && e.actor_id === unitId,
      ).length;
      return { triggered: count >= threshold, count, threshold };
    }
    // 2026-05-10 — kinds residue Phase 6 (require Prisma migration 0008+).
    case 'ally_adjacent_turns':
    case 'trait_active_cumulative':
      return { triggered: false, reason: 'kind_deferred_phase_6', kind };
    default:
      return { triggered: false, reason: 'unknown_kind', kind };
  }
}

/**
 * Phase 3 — main evaluator API.
 * @param {object} unit - unit object with id + applied_mutations + traits
 * @param {object} session - session state with events, turn, sistema_pressure, scenario_id
 * @param {object} [opts]
 * @returns {{ unlocked: string[], skipped: string[], details: object }}
 */
function evaluateMutationTriggers(unit, session, opts = {}) {
  if (!unit || typeof unit !== 'object') {
    return { unlocked: [], skipped: [], details: {} };
  }
  const catalog = _loadCatalog();
  if (!catalog) return { unlocked: [], skipped: [], details: {} };
  const alreadyUnlocked = new Set(
    Array.isArray(unit.unlocked_mutations) ? unit.unlocked_mutations : [],
  );
  const alreadyApplied = new Set(
    Array.isArray(unit.applied_mutations) ? unit.applied_mutations : [],
  );
  const unlocked = [];
  const skipped = [];
  const details = {};
  for (const [mutationId, mutation] of Object.entries(catalog)) {
    if (alreadyUnlocked.has(mutationId) || alreadyApplied.has(mutationId)) continue;
    // Skip mutations without trigger_conditions (mutation_chain only path or no auto-trigger).
    if (!Array.isArray(mutation.trigger_conditions) || mutation.trigger_conditions.length === 0) {
      continue;
    }
    // Prereq trait check: mutation prerequisites.traits must all be in unit.traits.
    const prereqTraits = mutation.prerequisites?.traits || [];
    const unitTraits = Array.isArray(unit.traits) ? unit.traits : [];
    const traitsOk = prereqTraits.every((t) => unitTraits.includes(t));
    if (!traitsOk) {
      skipped.push(mutationId);
      details[mutationId] = { reason: 'prereq_trait_missing', prereqTraits };
      continue;
    }
    // Prereq mutations check.
    const prereqMutations = mutation.prerequisites?.mutations || [];
    const mutationsOk = prereqMutations.every((m) => alreadyApplied.has(m));
    if (!mutationsOk) {
      skipped.push(mutationId);
      details[mutationId] = { reason: 'prereq_mutation_missing', prereqMutations };
      continue;
    }
    // Evaluate ANY clause: any condition satisfied → unlock.
    const conditionResults = mutation.trigger_conditions.map((c) =>
      _evaluateCondition(c, unit, session),
    );
    const anyTriggered = conditionResults.some((r) => r.triggered);
    if (anyTriggered) {
      unlocked.push(mutationId);
      details[mutationId] = {
        triggered: true,
        tier: mutation.tier,
        auto_acquire: _shouldAutoAcquire(mutation),
        conditions: conditionResults,
      };
    } else {
      skipped.push(mutationId);
      details[mutationId] = { reason: 'no_condition_triggered', conditions: conditionResults };
    }
  }
  return { unlocked, skipped, details };
}

/**
 * Phase 4 surface — emit mutation_unlocked event into session raw event log.
 * Call after evaluateMutationTriggers, push event for each unlocked.
 * @param {object} session - session with events array
 * @param {string} unitId
 * @param {string[]} unlocked - mutation_ids unlocked this round
 * @param {object} details - per-mutation triggered details
 */
function emitUnlockEvents(session, unitId, unlocked, details = {}) {
  if (!session || !Array.isArray(session.events)) return;
  for (const mutationId of unlocked) {
    const detail = details[mutationId] || {};
    const event = {
      action_type: 'mutation_unlock',
      turn: Number(session.turn) || 0,
      actor_id: unitId,
      mutation_id: mutationId,
      tier: detail.tier || null,
      auto_acquire: detail.auto_acquire === true,
      ts: new Date().toISOString(),
    };
    session.events.push(event);
    // CLI debug log.
    console.log(
      `[mutation-trigger] unit=${unitId} unlocked=${mutationId} tier=${event.tier} auto=${event.auto_acquire}`,
    );
  }
}

/**
 * Phase 3 wrapper: evaluate + emit + apply auto-acquire (Q3 hybrid).
 * Hybrid policy: tier 1 auto-applied to unit.applied_mutations; tier 2-3
 * pushed to unit.unlocked_mutations (player-confirm pending dialog).
 */
function evaluateAndApply(unit, session, opts = {}) {
  const result = evaluateMutationTriggers(unit, session, opts);
  if (result.unlocked.length === 0) return result;
  if (!Array.isArray(unit.applied_mutations)) unit.applied_mutations = [];
  if (!Array.isArray(unit.unlocked_mutations)) unit.unlocked_mutations = [];
  for (const mutationId of result.unlocked) {
    const detail = result.details[mutationId];
    if (detail?.auto_acquire) {
      unit.applied_mutations.push(mutationId);
    } else {
      unit.unlocked_mutations.push(mutationId);
    }
  }
  emitUnlockEvents(session, unit.id, result.unlocked, result.details);
  return result;
}

module.exports = {
  evaluateMutationTriggers,
  evaluateAndApply,
  emitUnlockEvents,
  _resetCache,
  _loadCatalog,
};
