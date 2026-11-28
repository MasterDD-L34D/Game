// Minion runtime helpers — TKT-JOB-PHASEC slice B5 (OQ-MINION verdict V4).
//
// End-of-round minion effects that are cleaner to unit-test in isolation than
// inside the (un-exposed) sessionRoundBridge.applyEndOfRoundSideEffects closure.

'use strict';

/**
 * minion_resurrect_chance (BEASTMASTER bm_r6 capstone "Undying Pack"): at end of
 * round, each dead minion whose LIVING owner carries the perk has `chance` to
 * revive in place at `hp_on_revive` (1). One roll per minion (`_resurrect_done`
 * marks success OR failure so a minion is never re-rolled). Mutates session.units
 * (minion.hp) and returns the revive events for the caller to emit.
 *
 * Band-neutral: no sim unit is a minion. NOTE the priority_queue calibration path
 * skips applyEndOfRoundSideEffects entirely, so this is inert there (fine — the
 * beastmaster is absent from every band scenario).
 *
 * @param {object} session — { units }
 * @param {() => number} rng — 0..1 source (the bridge's closure rng)
 * @returns {Array<{ minion_id, owner_id, hp_after }>}
 */
function applyMinionResurrect(session, rng) {
  const events = [];
  const units = Array.isArray(session && session.units) ? session.units : [];
  const roll = typeof rng === 'function' ? rng : Math.random;
  for (const unit of units) {
    if (!unit || !unit.is_minion || Number(unit.hp || 0) > 0 || unit._resurrect_done) continue;
    const owner = units.find((u) => u && u.id === unit.owner_id && Number(u.hp || 0) > 0);
    if (!owner) continue;
    const perk = Array.isArray(owner._perk_passives)
      ? owner._perk_passives.find((p) => p && p.tag === 'minion_resurrect_chance')
      : null;
    if (!perk) continue;
    unit._resurrect_done = true; // one roll per minion (success or fail)
    const chance = Number(perk.payload && perk.payload.chance) || 0;
    if (chance > 0 && roll() < chance) {
      const revHp = Number(perk.payload && perk.payload.hp_on_revive) || 1;
      unit.hp = Math.max(1, revHp);
      events.push({ minion_id: unit.id, owner_id: owner.id, hp_after: unit.hp });
    }
  }
  return events;
}

module.exports = { applyMinionResurrect };
