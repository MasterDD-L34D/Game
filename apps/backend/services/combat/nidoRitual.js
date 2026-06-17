// =============================================================================
// SPEC-J sez.6 / fork J3 -- Nido wound rituals (heal / transform).
//
// Spec: docs/design/evo-tactics-lethal-wounds-rituals.md (sez.6; J3 ratified
// 2026-06-08 = opzione A: heal O transform, scelta del player).
//
// Operates on a creature's `grave` scars (woundSystem -- the cross-encounter
// scar that carries a stat-malus). Two outcomes:
//   - HEAL:      remove the scar (and its malus) -- a clean recovery at the Nido;
//   - TRANSFORM: remove the scar but crystallize it into a permanent narrative
//                mark (failure-as-lore: the wound becomes part of the creature's
//                story). The mark is derived deterministically from the scar (no
//                new content pool -> no content-ratify gate, deriveHeirloomName
//                pattern). The MECHANICAL trait/mutation grant is deferred (which
//                trait + effect = balance, SPEC-E follow-up); here transform is a
//                narrative record.
//
// Pure of I/O: mutates the unit (+ an optional persisted scar map) and returns a
// descriptor. The chronicle `scar_healed`/`scar_transformed` emission happens at
// the wire site. Never throws.
//
// NOT here (forward-work): the resource cost (SPEC-E E6). The campaign resource
// pool is Godot/client-owned (godotV2State), so cost-enforcement is not backend-
// ownable today -- a ritual endpoint trusts the caller to have paid.
// =============================================================================

'use strict';

const SEVERITY_GRAVE = 'grave';

/** All `grave` wounds (= scars) the unit currently carries. */
function graveWoundsOf(unit) {
  return unit && unit.status && Array.isArray(unit.status.wounds)
    ? unit.status.wounds.filter((w) => w && w.severity === SEVERITY_GRAVE)
    : [];
}

/** The grave scar at a given location, or null. lieve/media are NOT scars. */
function findScar(unit, location) {
  if (!unit || typeof unit !== 'object' || !location) return null;
  return graveWoundsOf(unit).find((w) => w.location === location) || null;
}

/**
 * Remove the grave scar at `location` from the unit's live wounds AND from the
 * persisted cross-encounter scar map (so it does not get restored at the next
 * encounter start). Other wounds (lieve/media, other locations) are untouched.
 */
function _removeGraveAt(unit, location, sessionMap) {
  if (unit.status && Array.isArray(unit.status.wounds)) {
    unit.status.wounds = unit.status.wounds.filter(
      (w) => !(w && w.severity === SEVERITY_GRAVE && w.location === location),
    );
  }
  if (sessionMap && typeof sessionMap === 'object' && Array.isArray(sessionMap[unit.id])) {
    sessionMap[unit.id] = sessionMap[unit.id].filter(
      (w) => !(w && w.severity === SEVERITY_GRAVE && w.location === location),
    );
  }
}

/**
 * Heal a scar: remove it (and its malus). Clean recovery.
 *
 * @param unit      the scarred creature
 * @param location  scar location (testa|torso|arti_anteriori|arti_posteriori)
 * @param opts      { sessionMap? } -- persisted cross-encounter scar map
 * @returns {{ healed:boolean, scar?:object, unit_id?:string, reason?:string }}
 */
function healScar(unit, location, opts = {}) {
  if (!unit || typeof unit !== 'object' || !unit.id) return { healed: false, reason: 'no_unit' };
  const scar = findScar(unit, location);
  if (!scar) return { healed: false, reason: 'no_scar' };
  _removeGraveAt(unit, location, opts.sessionMap);
  return { healed: true, scar: { ...scar }, unit_id: unit.id };
}

/**
 * Deterministic narrative mark derived from a scar (no RNG, no content pool).
 * The transform outcome that the chronicle / lineage can carry as failure-as-lore.
 */
function deriveScarMark(scar) {
  return {
    id: `scar_${scar.location}`,
    origin_location: scar.location,
    origin_stat: scar.stat || null,
  };
}

/**
 * Transform a scar into a permanent narrative mark (failure-as-lore). Removes the
 * scar's malus like a heal, but crystallizes it into a `mark`. Mechanical
 * trait/mutation grant = deferred (SPEC-E / balance).
 *
 * @param opts { sessionMap?, permanentMarks? } -- permanentMarks is an optional
 *             campaign-level array the mark is appended to (narrative record).
 * @returns {{ transformed:boolean, scar?:object, mark?:object, unit_id?:string, reason?:string }}
 */
function transformScar(unit, location, opts = {}) {
  if (!unit || typeof unit !== 'object' || !unit.id) {
    return { transformed: false, reason: 'no_unit' };
  }
  const scar = findScar(unit, location);
  if (!scar) return { transformed: false, reason: 'no_scar' };
  _removeGraveAt(unit, location, opts.sessionMap);
  const mark = deriveScarMark(scar);
  if (Array.isArray(opts.permanentMarks)) {
    opts.permanentMarks.push({ creature_id: unit.id, ...mark });
  }
  return { transformed: true, scar: { ...scar }, mark, unit_id: unit.id };
}

module.exports = {
  graveWoundsOf,
  findScar,
  healScar,
  transformScar,
  deriveScarMark,
};
