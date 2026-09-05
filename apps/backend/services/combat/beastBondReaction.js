// Sprint 6 (2026-04-27) — Beast Bond reaction trigger.
//
// Pattern source: AncientBeast (FreezingMoon) — Tier S #6 residuo. Reference
// docs/research/2026-04-26-tier-s-extraction-matrix.md §6 line 230.
//
// Goal: estende squadCombo focus_fire (globale player-only) a per-creature
// trait. Quando un'unita' attacca, gli alleati con trait
// `triggers_on_ally_attack` ricevono un buff temporaneo atk/def.
//
// Pure module. Wired in routes/session.js performAttack post-resolveAttack.
// Surface: performAttack returns beast_bond_reactions[]; raw event
// action_type='beast_bond_triggered' emitted per reaction.
//
// Trait schema (data/core/traits/active_effects.yaml):
//   triggers_on_ally_attack:
//     range: <int>            # Manhattan max ally→holder, default 1
//     species_filter:         # 'same' | 'any' | 'pack:<species_id>'
//     atk_delta: <int>        # delta a holder.attack_mod_bonus
//     def_delta: <int>        # delta a holder.defense_mod_bonus
//     duration: <int>         # turni status[*_buff] (decay sessionRoundBridge)
//     log_tag: <string>       # opzionale, log surface
//
// API:
//   checkBeastBondReactions(actor, units, traitRegistry)
//     → array { holder_id, holder, trait_id, effect, log_tag }
//   applyBeastBondReactions(reactions)
//     → mutate holder.{attack_mod_bonus, defense_mod_bonus, status}
//   buildBeastBondEvents(reactions, attacker, session)
//     → array raw events ready for appendEvent

'use strict';

const DEFAULT_RANGE = 1;

function manhattan(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function isAlive(unit) {
  return unit && Number(unit.hp) > 0;
}

function speciesMatches(filter, attacker, holder) {
  if (!filter || filter === 'any') return true;
  if (filter === 'same') {
    return String(attacker.species || '') === String(holder.species || '') && !!attacker.species;
  }
  if (typeof filter === 'string' && filter.startsWith('pack:')) {
    const required = filter.slice('pack:'.length);
    return String(attacker.species || '') === required;
  }
  return false;
}

/**
 * Scan all units; for each ally of the attacker (same controlled_by, alive,
 * within Manhattan range, distinct from attacker) check if any of its traits
 * carries `triggers_on_ally_attack`. Each match becomes a reaction record.
 *
 * Pure: does not mutate any input.
 *
 * @param {object} attacker — { id, species, controlled_by, position }
 * @param {object[]} units — session.units
 * @param {object} traitRegistry — loaded active_effects map
 * @returns {Array<{ holder_id, holder, trait_id, effect, log_tag }>}
 */
function checkBeastBondReactions(attacker, units, traitRegistry) {
  if (!attacker || !Array.isArray(units) || !traitRegistry) return [];
  const reactions = [];
  for (const holder of units) {
    if (!holder || holder === attacker) continue;
    if (holder.id === attacker.id) continue;
    if (!isAlive(holder)) continue;
    if (holder.controlled_by !== attacker.controlled_by) continue;
    const traitIds = Array.isArray(holder.traits) ? holder.traits : [];
    if (traitIds.length === 0) continue;
    for (const traitId of traitIds) {
      const def = traitRegistry[traitId];
      if (!def || !def.triggers_on_ally_attack) continue;
      const cfg = def.triggers_on_ally_attack;
      const range = Number.isFinite(Number(cfg.range)) ? Number(cfg.range) : DEFAULT_RANGE;
      const dist = manhattan(holder.position, attacker.position);
      if (dist > range) continue;
      if (!speciesMatches(cfg.species_filter, attacker, holder)) continue;
      const atkDelta = Number(cfg.atk_delta || 0);
      const defDelta = Number(cfg.def_delta || 0);
      const duration = Number.isFinite(Number(cfg.duration)) ? Number(cfg.duration) : 1;
      if (atkDelta === 0 && defDelta === 0) continue;
      reactions.push({
        holder_id: holder.id,
        holder,
        trait_id: traitId,
        effect: { atk_delta: atkDelta, def_delta: defDelta, duration },
        log_tag: cfg.log_tag || `${traitId}_triggered`,
      });
    }
  }
  return reactions;
}

/**
 * Apply each reaction: mutate holder.attack_mod_bonus + defense_mod_bonus and
 * arm status[attack_mod_buff|defense_mod_buff] = max(current, duration). The
 * standard sessionRoundBridge decay (status==0 → bonus zeroed) reverts the
 * buff at end of round.
 *
 * Returns the same reaction list (for chaining), with `applied: true`.
 */
function applyBeastBondReactions(reactions) {
  if (!Array.isArray(reactions)) return [];
  for (const r of reactions) {
    if (!r || !r.holder || !r.effect) continue;
    const { holder, effect } = r;
    if (effect.atk_delta) {
      holder.attack_mod_bonus = Number(holder.attack_mod_bonus || 0) + effect.atk_delta;
      if (!holder.status) holder.status = {};
      const cur = Number(holder.status.attack_mod_buff) || 0;
      holder.status.attack_mod_buff = Math.max(cur, effect.duration);
    }
    if (effect.def_delta) {
      holder.defense_mod_bonus = Number(holder.defense_mod_bonus || 0) + effect.def_delta;
      if (!holder.status) holder.status = {};
      const cur = Number(holder.status.defense_mod_buff) || 0;
      holder.status.defense_mod_buff = Math.max(cur, effect.duration);
    }
    r.applied = true;
  }
  return reactions;
}

/**
 * Build raw events for telemetry/log. Caller is responsible for appendEvent.
 */
function buildBeastBondEvents(reactions, attacker, session) {
  if (!Array.isArray(reactions) || reactions.length === 0) return [];
  const ts = new Date().toISOString();
  const sessionId = session ? session.session_id : null;
  const turn = session ? Number(session.turn || 0) : 0;
  return reactions
    .filter((r) => r && r.applied)
    .map((r) => ({
      ts,
      session_id: sessionId,
      action_type: 'beast_bond_triggered',
      actor_id: attacker ? attacker.id : null,
      actor_species: attacker ? attacker.species : null,
      ally_id: r.holder_id,
      ally_species: r.holder ? r.holder.species : null,
      trait_id: r.trait_id,
      effect: { ...r.effect },
      log_tag: r.log_tag,
      turn,
    }));
}

module.exports = {
  checkBeastBondReactions,
  applyBeastBondReactions,
  buildBeastBondEvents,
};
