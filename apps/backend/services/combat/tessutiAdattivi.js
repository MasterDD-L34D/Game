// apps/backend/services/combat/tessutiAdattivi.js
//
// tessuti_adattivi (creature-trait mechanics slice 4, trait 11 -- rakshasa).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// Adaptive tissue (Hades Stubborn Roots). When the carrier takes a hit of >= 2
// damage of a given damage CHANNEL, the tissue adapts: it gains
// `adattamento_<channel>` (a +15% resist to that channel for 3 rounds, read at the
// resistance-apply step) and heals 1. At most 2 channels can be adapted at once;
// re-taking damage of an already-adapted channel just refreshes its duration and
// does not count against the cap. A 3rd new channel is rejected while 2 are active.
//
// Detection runs post-hit (after HP is subtracted), so the channel that triggers
// the adaptation does NOT resist on the triggering hit -- only on subsequent hits
// (spec: take dmg -> adapt -> resist next time). The +15% is applied as a
// resistanceEngine delta in a SEPARATE pass at the apply step (computeTessutiResist
// Delta), NOT folded into the frozen `target._resistances` cache.
//
// `adattamento_<channel>` rides the object-map status + the universal 1/round decay
// (3 -> 0), so it is NOT in PERSISTENT_STATUS_KEYS (it must lapse). It is resistance-
// only and is NOT read by computeStatusModifiers.
//
// Pure (mutates target.status + target.hp). Band-neutral: no sim unit carries
// tessuti_adattivi, so applyTessutiAdaptation returns null and the resist delta is
// empty for every existing unit.

'use strict';

const TESSUTI_TRAIT = 'tessuti_adattivi';
const TESSUTI_DMG_THRESHOLD = 2;
const ADATTAMENTO_PREFIX = 'adattamento_';
const RESIST_PCT = 15;
const ADATTAMENTO_TURNS = 3;
const MAX_CHANNELS = 2;
const HEAL = 1;

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

function activeChannelKeys(status) {
  return Object.keys(status).filter(
    (k) => k.startsWith(ADATTAMENTO_PREFIX) && Number(status[k]) > 0,
  );
}

/**
 * On-taking-damage adaptation. Fires when the carrier takes >= threshold damage of
 * `channel`. Sets/refreshes adattamento_<channel> + heals 1 (capped at max_hp).
 * Rejects a NEW channel once MAX_CHANNELS are active.
 *
 * @param {object} opts
 * @param {object} opts.target      the carrier that took damage (mutated)
 * @param {string} opts.channel     the damage channel
 * @param {number} opts.damageDealt damage taken on this hit
 * @returns {{self_status, channel, healed} | null}
 */
function applyTessutiAdaptation({ target, channel, damageDealt }) {
  if (!target || typeof target !== 'object') return null;
  if (!channel || typeof channel !== 'string') return null;
  if (!hasTrait(target, TESSUTI_TRAIT)) return null;
  if (!(Number(damageDealt) >= TESSUTI_DMG_THRESHOLD)) return null;
  if (!(Number(target.hp) > 0)) return null; // a downed unit does not adapt
  if (!target.status || typeof target.status !== 'object') target.status = {};

  const key = ADATTAMENTO_PREFIX + channel;
  const alreadyActive = Number(target.status[key]) > 0;
  if (!alreadyActive && activeChannelKeys(target.status).length >= MAX_CHANNELS) {
    return null; // cap reached and this is a new channel
  }

  // Refresh-up (a fresh full-duration adaptation).
  target.status[key] = ADATTAMENTO_TURNS;

  // Heal 1, capped at max_hp (no overheal).
  const max = Number(target.max_hp || target.hp || 0);
  const before = Number(target.hp);
  if (max > before) target.hp = Math.min(max, before + HEAL);
  const healed = Number(target.hp) - before;

  return { self_status: key, channel, healed };
}

/**
 * Apply-zone read: the +15% resist delta for an adapted channel, as a
 * resistanceEngine delta list. Empty when the channel is not adapted (no-op).
 *
 * @param {object} target
 * @param {string} channel
 * @returns {Array<{channel, modifier_pct}>}
 */
function computeTessutiResistDelta(target, channel) {
  const st = target && target.status;
  if (!st || typeof st !== 'object' || !channel) return [];
  if (Number(st[ADATTAMENTO_PREFIX + channel]) > 0) {
    return [{ channel, modifier_pct: RESIST_PCT }];
  }
  return [];
}

module.exports = {
  applyTessutiAdaptation,
  computeTessutiResistDelta,
  hasTrait,
  TESSUTI_TRAIT,
  TESSUTI_DMG_THRESHOLD,
  ADATTAMENTO_PREFIX,
  RESIST_PCT,
  ADATTAMENTO_TURNS,
  MAX_CHANNELS,
  HEAL,
};
