// apps/backend/services/combat/filtriBioattivi.js
//
// filtri_bioattivi (creature-trait mechanics slice 5, trait 6 -- otyugh).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//
// PASSIVE bio-filter (Subnautica filtering / Pathfinder otyugh): once per round the
// carrier filters out wound statuses -- it cleanses 1 bleeding + 1 fracture and
// heals 1 per status cleansed. Object-map shape; run at the end-of-round side-effects
// (alongside the passive-status refresh + coordinamento aura producer) -- "turn-start"
// realized as once-per-round (the carrier starts the next round cleaner). Flagged for
// master-dd: end-of-round vs strict turn-start (equivalent for a per-round cleanse).
//
// (The spec's ACTIVE mode -- 1 AP, 2-round cd, cleanse ALL negative statuses on an
// adjacent ally -- is DEFERRED: authoring it as a trait-granted ability needs the
// cleanse_status effect_type in packages/contracts/schemas/traitMechanics.schema.json
// [forbidden path] + a jobs.yaml re-baseline, both owner-gated [mirrors matrice
// Mode A]. Surfaced in the slice-5 PR.)
//
// Pure (mutates unit.status + unit.hp). Band-neutral: no sim unit carries
// filtri_bioattivi, so applyTurnStartCleanse returns null for every existing unit.

'use strict';

const FILTRI_TRAIT = 'filtri_bioattivi';
// The wound statuses the bio-filter clears, each with its parallel severity key.
const CLEANSE_STATUSES = ['bleeding', 'fracture'];
const HEAL_PER_CLEANSE = 1;

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

/**
 * Once-per-round bio-filter cleanse. For a filtri carrier, removes one tick each
 * of bleeding + fracture (with their severity companion keys) and heals 1 per
 * status cleansed (capped at max_hp). No-op (null) for a non-carrier, a downed
 * unit, or a unit with neither status.
 *
 * @param {object} unit (mutated: unit.status, unit.hp)
 * @returns {{cleansed: string[], healed: number} | null}
 */
function applyTurnStartCleanse(unit) {
  if (!unit || typeof unit !== 'object') return null;
  if (!hasTrait(unit, FILTRI_TRAIT)) return null;
  if (!(Number(unit.hp) > 0)) return null; // a downed unit does not filter
  const status = unit.status;
  if (!status || typeof status !== 'object') return null;

  const cleansed = [];
  for (const key of CLEANSE_STATUSES) {
    if (Number(status[key]) > 0) {
      delete status[key];
      delete status[`${key}_severity`];
      if (unit.status_intensity) delete unit.status_intensity[key];
      cleansed.push(key);
    }
  }
  if (cleansed.length === 0) return null;

  const max = Number(unit.max_hp || unit.hp || 0);
  const before = Number(unit.hp);
  if (max > before) unit.hp = Math.min(max, before + HEAL_PER_CLEANSE * cleansed.length);
  const healed = Number(unit.hp) - before;

  return { cleansed, healed };
}

module.exports = {
  applyTurnStartCleanse,
  hasTrait,
  FILTRI_TRAIT,
  CLEANSE_STATUSES,
  HEAL_PER_CLEANSE,
};
