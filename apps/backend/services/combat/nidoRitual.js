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
//                story) AND -- when the wire site enables it -- grant a MECHANICAL
//                trait derived deterministically from the scar location via the
//                PROPOSED SCAR_TRAIT_MAP (verdetto master-dd 2026-06-23 = trait
//                meccanico, non solo narrativo). The grant is OFF by default (flag
//                SCAR_TRANSFORM_TRAIT_GRANT_ENABLED at the wire site) + fail-closed:
//                no map / unmapped location / id not in the active_effects SoT set
//                -> narrative-only = band-neutral. The map values + bands are
//                RATIFIED-PROVISIONAL (master-dd + N=40 before flip).
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

// PROPOSED scar->trait map (verdetto master-dd 2026-06-23). Failure-as-lore: the
// wound at a location hardens into a thematic trait. Keyed by woundSystem location
// (LOCATION_STAT: torso=defense, arti_anteriori=attack, arti_posteriori=mobility,
// testa=accuracy). `testa` is intentionally UNMAPPED -> fail-closed until master-dd
// maps it. Values are real active_effects ids but RATIFIED-PROVISIONAL: master-dd
// confirms/replaces each mapping + runs N=40 before SCAR_TRANSFORM_TRAIT_GRANT_ENABLED
// is flipped on. Always validated at grant time against the injected SoT id set
// (never trusts the map alone).
const SCAR_TRAIT_MAP = Object.freeze({
  torso: 'pelle_elastomera', // defense scar -> resilient skin
  arti_anteriori: 'martello_osseo', // attack scar -> bone hammer
  arti_posteriori: 'zampe_a_molla', // mobility scar -> spring legs
});

/**
 * Derive the mechanical trait a transformed scar grants, or null (fail-closed).
 * Pure: the caller injects the PROPOSED map + the valid-id set (active_effects SoT).
 * Returns null when there is no map, the location is unmapped, or the mapped id is
 * not in validTraitIds (so a stale/typo'd map can never grant a non-existent trait).
 *
 * @param scar          a grave scar ({ location, ... })
 * @param map           location -> trait_id (e.g. SCAR_TRAIT_MAP)
 * @param validTraitIds Set or array of trait ids known to active_effects (SoT)
 */
function deriveScarTrait(scar, map, validTraitIds) {
  if (!scar || !scar.location || !map || typeof map !== 'object') return null;
  const traitId = map[scar.location];
  if (!traitId) return null;
  const known =
    validTraitIds instanceof Set
      ? validTraitIds.has(traitId)
      : Array.isArray(validTraitIds) && validTraitIds.includes(traitId);
  return known ? traitId : null;
}

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
  const out = { transformed: true, scar: { ...scar }, mark, unit_id: unit.id };
  // SPEC-E mechanical grant (OFF by default at the wire site). Only set when the
  // caller injects BOTH the map and the SoT id set; fail-closed otherwise ->
  // band-neutral (narrative-only). The wire site applies the id to the campaign
  // per-creature trait store (acquiredTraitsByCreature) + chronicle.
  const grantedTrait = deriveScarTrait(scar, opts.scarTraitMap, opts.validTraitIds);
  if (grantedTrait) out.granted_trait = grantedTrait;
  return out;
}

module.exports = {
  graveWoundsOf,
  findScar,
  healScar,
  transformScar,
  deriveScarMark,
  deriveScarTrait,
  SCAR_TRAIT_MAP,
};
