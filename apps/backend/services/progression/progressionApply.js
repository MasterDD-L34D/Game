// M13 P3 Phase B — apply progression perks to units at session start.
// ADR-2026-04-24-p3-character-progression Phase B addendum (pending).
//
// Two-phase application:
//   1. Load-time (session /start): mutate unit base stats via effectiveStats()
//      + attach _perk_passives + _perk_ability_mods for runtime lookup.
//   2. Runtime (attack resolve): computePerkDamageBonus(actor, target, ctx)
//      checks actor._perk_passives for top-5 tags against combat context.
//
// Mutation is idempotent (guard via _progression_applied flag).
// Graceful no-op if unit has no progression state in store.

'use strict';

const { ProgressionEngine } = require('./progressionEngine');
const { createProgressionStore } = require('./progressionStore');
// SG pool cap — perk SG earns must clamp to sgTracker POOL_MAX (Codex P2 #2524).
const { POOL_MAX: SG_POOL_MAX } = require('../combat/sgTracker');

let _defaultEngine = null;
let _defaultStore = null;

function getDefaultEngine() {
  if (!_defaultEngine) _defaultEngine = new ProgressionEngine();
  return _defaultEngine;
}

function getDefaultStore() {
  if (!_defaultStore) _defaultStore = createProgressionStore();
  return _defaultStore;
}

// Exposed for tests to inject mocks + for session /start to pass its own engine/store.
function resetDefaults() {
  _defaultEngine = null;
  _defaultStore = null;
}

/**
 * Apply progression perks to all player units in-place. Caller owns units
 * array; this function mutates each player unit to include perk bonuses.
 *
 * @param {Array<object>} units — session units array
 * @param {object} opts
 * @param {ProgressionEngine} [opts.engine]
 * @param {object} [opts.store]
 * @param {string|null} [opts.campaignId]
 * @returns {{ applied: Array<{ unit_id, bonuses, passive_count, ability_mod_count }>, skipped: number }}
 */
function applyProgressionToUnits(units, opts = {}) {
  const engine = opts.engine || getDefaultEngine();
  const store = opts.store || getDefaultStore();
  const campaignId = opts.campaignId ?? null;
  const applied = [];
  let skipped = 0;

  if (!Array.isArray(units)) return { applied, skipped: 0 };

  for (const unit of units) {
    if (!unit || unit.controlled_by !== 'player' || !unit.id) {
      skipped += 1;
      continue;
    }
    if (unit._progression_applied) {
      skipped += 1;
      continue;
    }
    const state = store.get(campaignId, unit.id);
    if (!state) {
      skipped += 1;
      continue;
    }

    const bonuses = engine.effectiveStats(state);
    const passives = engine.listPassives(state);
    const abilityMods = engine.listAbilityMods(state);

    // Apply stat bonuses additively to unit.
    // hp_max bonuses also increase current hp so unit starts fresh.
    if (bonuses.hp_max) {
      unit.hp_max = Number(unit.hp_max || unit.hp || 0) + bonuses.hp_max;
      unit.hp = Number(unit.hp || 0) + bonuses.hp_max;
    }
    if (bonuses.ap) unit.ap = Number(unit.ap || 0) + bonuses.ap;
    if (bonuses.attack_mod) unit.mod = Number(unit.mod || 0) + bonuses.attack_mod;
    if (bonuses.defense_mod) unit.dc = Number(unit.dc || 0) + bonuses.defense_mod;
    if (bonuses.initiative) unit.initiative = Number(unit.initiative || 0) + bonuses.initiative;
    if (bonuses.attack_range) {
      unit.attack_range = Number(unit.attack_range || 1) + bonuses.attack_range;
    }

    unit._perk_passives = passives;
    unit._perk_ability_mods = abilityMods;
    unit._progression_applied = true;

    applied.push({
      unit_id: unit.id,
      bonuses,
      passive_count: passives.length,
      ability_mod_count: abilityMods.length,
    });
  }

  // Sprint Spore Moderate (ADR-2026-04-26 §S6) — hydrate _archetype_passives
  // for ALL units (player + sistema) post perk application. Bingo state is
  // pure-derived from applied_mutations[]: zero side effect when zero mutations.
  // Wrapped in try/catch: missing module / catalog error must NOT block session
  // start (back-compat con sessioni pre-Spore).
  try {
    const { applyMutationBingoToUnit } = require('../mutations/mutationEngine');
    const { loadMutationCatalog } = require('../mutations/mutationCatalogLoader');
    const catalog = loadMutationCatalog();
    for (const unit of units) {
      if (!unit || typeof unit !== 'object') continue;
      applyMutationBingoToUnit(unit, catalog);
    }
  } catch {
    // Non-blocking: skip archetype hydration on error.
  }

  return { applied, skipped };
}

/**
 * Compute perk damage bonus at attack resolve time. Checks top-5 passive tags
 * against the combat context. Additive delta to base damage.
 *
 * @param {object} actor — attacker unit
 * @param {object} target — defender unit
 * @param {object} ctx — { units?, hpBefore?, hpAfter?, isFirstStrike?, baseDamage? }
 * @returns {{ bonus: number, applied: Array<{ tag, amount, source_perk_id }> }}
 */
function computePerkDamageBonus(actor, target, ctx = {}) {
  const out = { bonus: 0, applied: [] };
  const passives = Array.isArray(actor?._perk_passives) ? actor._perk_passives : [];
  if (passives.length === 0) return out;
  const units = Array.isArray(ctx.units) ? ctx.units : [];

  for (const p of passives) {
    let gain = 0;
    switch (p.tag) {
      case 'flank_bonus': {
        // +N damage if actor attacks a target adjacent to at least one ally of actor.
        const hasAllyAdjacent = units.some(
          (u) =>
            u &&
            u.id !== actor.id &&
            u.controlled_by === actor.controlled_by &&
            Number(u.hp) > 0 &&
            u.position &&
            target.position &&
            Math.abs(u.position.x - target.position.x) +
              Math.abs(u.position.y - target.position.y) ===
              1,
        );
        if (hasAllyAdjacent) gain = Number(p.payload?.damage) || 0;
        break;
      }
      case 'first_strike_bonus': {
        if (ctx.isFirstStrike) gain = Number(p.payload?.damage) || 0;
        break;
      }
      case 'execution_bonus': {
        const threshold = Number(p.payload?.threshold) || 0.25;
        const hpMax = Number(target.hp_max || target.hp || 1);
        const hpNow = Number(target.hp || 0);
        if (hpMax > 0 && hpNow / hpMax < threshold) {
          gain = Number(p.payload?.damage) || 0;
        }
        break;
      }
      case 'isolated_target_bonus': {
        // Target with no allies adjacent → bonus damage.
        const hasAllyAdjacentToTarget = units.some(
          (u) =>
            u &&
            u.id !== target.id &&
            u.controlled_by === target.controlled_by &&
            Number(u.hp) > 0 &&
            u.position &&
            target.position &&
            Math.abs(u.position.x - target.position.x) +
              Math.abs(u.position.y - target.position.y) ===
              1,
        );
        if (!hasAllyAdjacentToTarget) gain = Number(p.payload?.damage) || 0;
        break;
      }
      case 'long_range_bonus': {
        const minD = Number(p.payload?.min_distance) || 3;
        if (
          actor.position &&
          target.position &&
          Math.abs(actor.position.x - target.position.x) +
            Math.abs(actor.position.y - target.position.y) >=
            minD
        ) {
          gain = Number(p.payload?.damage) || 0;
        }
        break;
      }
      default:
        break;
    }
    if (gain > 0) {
      out.bonus += gain;
      out.applied.push({ tag: p.tag, amount: gain, source_perk_id: p.source_perk_id });
    }
  }
  return out;
}

/**
 * Apply on-kill perk effects to the killer. Category B (TKT-JOB-PHASEC).
 * Mutates actor in place. Called from the kill hook in performAttack
 * (routes/session.js), gated on the final killOccurred — the live combat path
 * the /round/execute priority_queue flow traverses (so the buff is not inert in
 * band-verify).
 *
 * Decay model: sessionRoundBridge end-of-round blanket-zeros attack_mod_bonus
 * when status.attack_mod_buff expires. So the temporary buff rides
 * attack_mod_bonus + status.attack_mod_buff (decays); the permanent buff rides
 * actor.mod (base stat, never decayed). resolveAttack sums mod + attack_mod_bonus,
 * so both reach the d20 roll.
 *
 * - eternal_kill_buff (STALKER capstone st_r6_eternal_hunt): permanent +attack_mod
 *   per kill via actor.mod. Supersedes the temporary buff when an actor has both.
 * - kill_buff_attack (STALKER st_r5_killer_focus): temporary +attack_mod for
 *   payload.duration rounds via attack_mod_bonus + status.attack_mod_buff.
 *
 * @param {object} actor — the unit that scored the kill (reads actor._perk_passives)
 * @returns {{ applied: Array<object> }}
 */
function applyPerkKillEffects(actor) {
  const out = { applied: [] };
  const passives = Array.isArray(actor?._perk_passives) ? actor._perk_passives : [];
  if (passives.length === 0) return out;

  // TKT-JOB-PHASEC slice 3 — first_kill_pe_bonus: earn PE on the first kill of
  // the encounter (guarded by _first_kill_pe_done). Independent of the attack
  // buffs below, so it runs before the eternal/temp early-return.
  const firstKillPe = passives.find((p) => p.tag === 'first_kill_pe_bonus');
  if (firstKillPe && !actor._first_kill_pe_done) {
    const amt = Number(firstKillPe.payload?.pe) || 0;
    if (amt !== 0) {
      actor.pe = Number(actor.pe || 0) + amt;
      actor._first_kill_pe_done = true;
      out.applied.push({
        tag: 'first_kill_pe_bonus',
        pe: amt,
        source_perk_id: firstKillPe.source_perk_id,
      });
    }
  }

  const eternal = passives.find((p) => p.tag === 'eternal_kill_buff');
  if (eternal) {
    const amt = Number(eternal.payload?.attack_mod) || 0;
    if (amt !== 0) {
      actor.mod = Number(actor.mod || 0) + amt; // permanent base bump, no decay
      out.applied.push({
        tag: 'eternal_kill_buff',
        attack_mod: amt,
        mode: 'permanent',
        source_perk_id: eternal.source_perk_id,
      });
    }
    return out; // eternal supersedes the temporary buff
  }

  const temp = passives.find((p) => p.tag === 'kill_buff_attack');
  if (temp) {
    const amt = Number(temp.payload?.attack_mod) || 0;
    const dur = Number(temp.payload?.duration) || 0;
    if (amt !== 0 && dur > 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) + amt;
      if (!actor.status || typeof actor.status !== 'object') actor.status = {};
      // Arm/refresh the decay counter to the longer of current vs new window.
      actor.status.attack_mod_buff = Math.max(Number(actor.status.attack_mod_buff) || 0, dur);
      out.applied.push({
        tag: 'kill_buff_attack',
        attack_mod: amt,
        duration: dur,
        mode: 'temporary',
        source_perk_id: temp.source_perk_id,
      });
    }
  }
  return out;
}

/**
 * Compute multiplicative / DR-bypass perk modifiers at attack resolve time.
 * Complements computePerkDamageBonus (which is additive-only). Category A
 * (TKT-JOB-PHASEC) expansion perks live here.
 *
 * @param {object} actor — attacker unit (reads actor._perk_passives)
 * @param {object} target — defender unit (reserved for future per-target tags)
 * @param {object} ctx — { isFirstStrike?, rng? }
 * @returns {{ multiplier: number, ignoreDr: boolean, applied: Array<object> }}
 */
function computePerkCombatModifiers(actor, target, ctx = {}) {
  const out = { multiplier: 1, ignoreDr: false, applied: [] };
  const passives = Array.isArray(actor?._perk_passives) ? actor._perk_passives : [];
  if (passives.length === 0) return out;
  const rng = typeof ctx.rng === 'function' ? ctx.rng : Math.random;

  for (const p of passives) {
    switch (p.tag) {
      case 'random_double_dmg_chance': {
        // ABERRANT (ab_r3_chaos_attack): each attack has payload.chance to x2.
        const chance = Number(p.payload?.chance) || 0;
        if (chance > 0 && rng() < chance) {
          out.multiplier *= 2;
          out.applied.push({ tag: p.tag, multiplier: 2, source_perk_id: p.source_perk_id });
        }
        break;
      }
      case 'apex_first_strike': {
        // STALKER capstone (st_r6_apex_predator): first strike ignores full DR.
        if (ctx.isFirstStrike && p.payload?.ignore_dr) {
          out.ignoreDr = true;
          out.applied.push({ tag: p.tag, ignore_dr: true, source_perk_id: p.source_perk_id });
        }
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/**
 * Compute perk DEFENSE bonus at attack resolve time — raises the defender's
 * effective DC. Sibling of computePerkDamageBonus (offensive). Slice 1
 * (TKT-JOB-PHASEC C-G prereq). Handles aura-type passives emitted by ALLIES
 * (reads OTHER units' _perk_passives) — distinct from the offensive helpers
 * which read the actor's own passives.
 *
 * @param {object} defender — the unit being attacked
 * @param {object} ctx — { units?: Array<object> }
 * @returns {{ bonus: number, applied: Array<{ tag, amount, source_perk_id, source_unit_id }> }}
 */
function computePerkDefenseBonus(defender, ctx = {}) {
  const out = { bonus: 0, applied: [] };
  if (!defender || !defender.position) return out;
  const units = Array.isArray(ctx.units) ? ctx.units : [];

  // Aura passives: an ally carrying the tag grants the bonus to allies in range.
  for (const ally of units) {
    if (!ally || ally.id === defender.id) continue;
    if (ally.controlled_by !== defender.controlled_by) continue;
    if (Number(ally.hp) <= 0) continue;
    if (!ally.position) continue;
    const passives = Array.isArray(ally._perk_passives) ? ally._perk_passives : [];
    for (const p of passives) {
      if (p.tag !== 'aura_defense_2tile') continue;
      const range = Number(p.payload?.range) || 2;
      const dist =
        Math.abs(ally.position.x - defender.position.x) +
        Math.abs(ally.position.y - defender.position.y);
      if (dist <= range) {
        const amt = Number(p.payload?.defense_mod) || 0;
        if (amt !== 0) {
          out.bonus += amt;
          out.applied.push({
            tag: 'aura_defense_2tile',
            amount: amt,
            source_perk_id: p.source_perk_id,
            source_unit_id: ally.id,
          });
        }
      }
    }
  }

  // Self defensive passives on the defender, conditioned on combat state.
  const selfPassives = Array.isArray(defender._perk_passives) ? defender._perk_passives : [];
  for (const p of selfPassives) {
    if (p.tag === 'defense_after_silent') {
      // Exact "turn after silent_step" window, armed by the use-hook into
      // _camo_silent_from/_to (= [useRound+1, useRound+duration]) and compared to
      // ctx.round. No _last_ability_id reliance (Codex #2524: that field was stale
      // on basic-attack turns) and no round-bridge decay (no priority_queue trap).
      const round = ctx.round;
      const from = Number(defender._camo_silent_from);
      const to = Number(defender._camo_silent_to);
      if (
        round != null &&
        Number.isFinite(from) &&
        Number.isFinite(to) &&
        round >= from &&
        round <= to
      ) {
        const amt = Number(p.payload?.defense_mod) || 0;
        if (amt !== 0) {
          out.bonus += amt;
          out.applied.push({
            tag: 'defense_after_silent',
            amount: amt,
            source_perk_id: p.source_perk_id,
            source_unit_id: defender.id,
          });
        }
      }
    }
  }
  return out;
}

/**
 * Apply on-ability-use perk effects (TKT-JOB-PHASEC slice 4, Cat F event-pure
 * subset, OQ-F verdict A). Twin of applyPerkKillEffects but keyed on a
 * SUCCESSFUL ability use — called post-2xx from executeAbility.
 *
 * - sg_on_mutation_burst (ABERRANT ab_r5_sg_synergy): earn SG on mutation_burst,
 *   capped to one earn per round (payload.cap_per_round = 1; tracked via
 *   _sg_on_mb_round). AP economy bounds repeats anyway.
 * - phenotype_baseline_heal (ab_r3_self_healing_chaos): flat heal on
 *   phenotype_shift, capped at max_hp.
 *
 * @param {object} actor — the unit that used the ability (reads _perk_passives)
 * @param {string} abilityId — the ability_id just resolved
 * @param {object} ctx — { round? } current round number for per-round caps
 * @returns {{ applied: Array<object> }}
 */
function applyPerkAbilityUseEffects(actor, abilityId, ctx = {}) {
  const out = { applied: [] };
  const passives = Array.isArray(actor?._perk_passives) ? actor._perk_passives : [];
  if (passives.length === 0 || !abilityId) return out;
  const round = ctx.round;

  for (const p of passives) {
    if (p.tag === 'sg_on_mutation_burst' && abilityId === 'mutation_burst') {
      if (actor._sg_on_mb_round !== round) {
        const amt = Number(p.payload?.sg) || 0;
        const before = Number(actor.sg || 0);
        if (amt !== 0 && before < SG_POOL_MAX) {
          actor.sg = Math.min(SG_POOL_MAX, before + amt);
          actor._sg_on_mb_round = round;
          out.applied.push({
            tag: 'sg_on_mutation_burst',
            sg: actor.sg - before,
            source_perk_id: p.source_perk_id,
          });
        }
      }
    } else if (p.tag === 'phenotype_baseline_heal' && abilityId === 'phenotype_shift') {
      const heal = Number(p.payload?.heal) || 0;
      if (heal !== 0) {
        const maxHp = Number(actor.max_hp || actor.hp || 0);
        const before = Number(actor.hp || 0);
        actor.hp = maxHp > 0 ? Math.min(maxHp, before + heal) : before + heal;
        out.applied.push({
          tag: 'phenotype_baseline_heal',
          heal: actor.hp - before,
          source_perk_id: p.source_perk_id,
        });
      }
    } else if (p.tag === 'defense_after_silent' && abilityId === 'silent_step') {
      // Arm the camo window: +defense_mod for `duration` rounds starting the turn
      // AFTER silent_step. Read by computePerkDefenseBonus against ctx.round.
      const dur = Number(p.payload?.duration) || 1;
      if (round != null) {
        actor._camo_silent_from = round + 1;
        actor._camo_silent_to = round + dur;
        out.applied.push({
          tag: 'defense_after_silent',
          armed_from: actor._camo_silent_from,
          armed_to: actor._camo_silent_to,
          source_perk_id: p.source_perk_id,
        });
      }
    }
  }
  return out;
}

/**
 * Refund the AP spent on a mutation_burst that scored a KO — the correct rebuild
 * of mutation_chain_on_kill (TKT-JOB-PHASEC, Codex #2524). Called from
 * executeDrainAttack AFTER the AP deduction (fixes the P1 timing where the kill
 * hook ran before the spend) and only for mutation_burst's own kill (fixes the P2
 * stale-_last_ability_id attribution). Once per encounter (_mutation_chain_done).
 * The refund enables an immediate free re-cast.
 *
 * @param {object} actor — the unit whose mutation_burst scored the KO
 * @param {number} costAp — the AP just spent (refunded, capped at actor.ap)
 * @returns {{ applied: Array<object> }}
 */
function applyMutationChainRefund(actor, costAp) {
  const out = { applied: [] };
  const passives = Array.isArray(actor?._perk_passives) ? actor._perk_passives : [];
  const mc = passives.find((p) => p.tag === 'mutation_chain_on_kill');
  if (!mc || actor._mutation_chain_done) return out;
  const apMax = Number(actor.ap || actor.ap_remaining || 0);
  const before = Number(actor.ap_remaining || 0);
  actor.ap_remaining = Math.min(apMax, before + (Number(costAp) || 0));
  actor._mutation_chain_done = true;
  out.applied.push({
    tag: 'mutation_chain_on_kill',
    ap_refunded: actor.ap_remaining - before,
    source_perk_id: mc.source_perk_id,
  });
  return out;
}

/**
 * Grant XP to all player survivors. Used by campaign advance hook.
 *
 * @param {Array<object>} units
 * @param {number} amount — XP per unit
 * @param {object} opts — { engine, store, campaignId }
 * @returns {Array<{ unit_id, amount, level_before, level_after, leveled_up }>}
 */
function grantXpToSurvivors(units, amount, opts = {}) {
  const engine = opts.engine || getDefaultEngine();
  const store = opts.store || getDefaultStore();
  const campaignId = opts.campaignId ?? null;
  const out = [];

  if (!Array.isArray(units) || !Number.isFinite(Number(amount))) return out;
  const amt = Math.max(0, Number(amount));
  if (amt <= 0) return out;

  for (const unit of units) {
    if (!unit || unit.controlled_by !== 'player' || !unit.id) continue;
    if (Number(unit.hp ?? 0) <= 0) continue; // survivors only

    let state = store.get(campaignId, unit.id);
    if (!state) {
      // Auto-seed if no progression state yet (uses unit.job).
      if (!unit.job) continue;
      state = engine.seed(unit.id, unit.job);
      state = store.set(campaignId, unit.id, state);
    }
    const result = engine.applyXp(state, amt);
    store.set(campaignId, unit.id, result.unit);
    out.push({
      unit_id: unit.id,
      amount: amt,
      level_before: result.level_before,
      level_after: result.level_after,
      leveled_up: result.leveled_up,
    });
  }
  return out;
}

module.exports = {
  applyProgressionToUnits,
  computePerkDamageBonus,
  computePerkCombatModifiers,
  computePerkDefenseBonus,
  applyPerkKillEffects,
  applyPerkAbilityUseEffects,
  applyMutationChainRefund,
  grantXpToSurvivors,
  resetDefaults,
  // Test seam: the module-default store is the singleton the session /start
  // route reads (applyProgressionToUnits with no injected store). Exposing the
  // getters lets integration tests seed it so a real /round/execute kill drives
  // _perk_passives -> performAttack kill hook -> applyPerkKillEffects end-to-end.
  getDefaultEngine,
  getDefaultStore,
};
