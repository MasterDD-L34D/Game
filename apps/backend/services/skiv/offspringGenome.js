'use strict';

// SPEC-F B4 -- normalize an offspring (two shapes) into a companion-card genome.
//
// Two offspring sources exist:
//   RITUAL  (offspringStore record, /api/lineage/offspring-ritual):
//           { lineage_id, mutations, trait_inherited, biome_origin }
//   CROSSBREED (rollMatingOffspring result, /skiv/crossbreed/confirm response):
//           { lineage_id, gene_slots[{slot_id,value}], environmental_mutation{id,type,tier},
//             tier_bonus_traits[str], hybrid_fusions[obj], biome_id_at_mating }
// The crossbreed shape is NOT persisted, so promote accepts it in the request body.
//
// Genome projection (master-dd ratified 2026-07-01):
//   mutations (obj[], card cap 3) = environmental_mutation + hybrid_fusions (acquired changes)
//   cabinet.unlocked (str[])       = tier_bonus_traits + gene_slot ids (inherited/bonus loadout)
// Ritual shape is passed through (mutations as-is, cabinet.unlocked = trait_inherited).

function _isCrossbreedShape(o) {
  return Boolean(
    o && ('gene_slots' in o || 'tier_bonus_traits' in o || 'environmental_mutation' in o),
  );
}

/**
 * Normalize either offspring shape into { lineage_id, mutations, cabinet_unlocked,
 * biome_id, trait_ids }. Pure; never throws on missing fields (returns empties).
 */
function resolveOffspringGenome(offspring) {
  if (!offspring || typeof offspring !== 'object') {
    throw new TypeError('resolveOffspringGenome: offspring object required');
  }
  if (_isCrossbreedShape(offspring)) {
    const hybridFusions = Array.isArray(offspring.hybrid_fusions) ? offspring.hybrid_fusions : [];
    const mutations = [offspring.environmental_mutation, ...hybridFusions]
      .filter((m) => m && typeof m === 'object')
      .slice(0, 3);
    const geneSlotIds = (Array.isArray(offspring.gene_slots) ? offspring.gene_slots : [])
      .map((s) => (s && (s.slot_id || s.id)) || null)
      .filter((t) => typeof t === 'string' && t);
    const cabinetUnlocked = [
      ...(Array.isArray(offspring.tier_bonus_traits) ? offspring.tier_bonus_traits : []),
      ...geneSlotIds,
    ].filter((t) => typeof t === 'string' && t);
    return {
      lineage_id: offspring.lineage_id || null,
      mutations,
      cabinet_unlocked: cabinetUnlocked,
      biome_id: offspring.biome_id_at_mating || null,
      trait_ids: cabinetUnlocked,
    };
  }
  // Ritual (offspringStore) shape.
  const traitInherited = Array.isArray(offspring.trait_inherited) ? offspring.trait_inherited : [];
  return {
    lineage_id: offspring.lineage_id || null,
    mutations: Array.isArray(offspring.mutations) ? offspring.mutations : [],
    cabinet_unlocked: traitInherited,
    biome_id: offspring.biome_origin || null,
    trait_ids: traitInherited,
  };
}

module.exports = { resolveOffspringGenome };
