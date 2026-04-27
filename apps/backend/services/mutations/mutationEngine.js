// Sprint Spore Moderate (ADR-2026-04-26) — mutation runtime engine.
//
// Pure helpers che orchestrano slot-conflict gating (Pattern S1),
// applicazione mutazione + emergenza ability (Pattern S2), spesa MP
// (Pattern S3), bingo 3×category passives (Pattern S6).
//
// Nessuna I/O. Unit e catalog passati come parametri. Caller decide
// se persistere risultato (immutable returns).
//
// Scope: prepara la facciata richiesta da /api/v1/mutations/apply.
// Ref: docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
//      docs/research/2026-04-26-spore-deep-extraction.md (S1+S2+S3+S6)

'use strict';

// 5 archetype bonus emergenti dal bingo 3-of-a-kind.
// ADR §S6 — 1 archetype per category, includes symbiotic (rare).
// Shape: archetype_id + 1 passive ability_token (consumato runtime
// in resolver / damage step quando esposto). Schema additive: questi
// passives NON sostituiscono ability esistenti, si applicano in addition.
const BINGO_ARCHETYPES = {
  physiological: {
    archetype: 'tank_plus',
    label_it: 'Predatore corazzato',
    label_en: 'Armored Predator',
    passive_token: 'archetype_tank_plus_dr1',
    description_it: '+1 DR (Damage Reduction) unconditional su ogni colpo subito.',
  },
  behavioral: {
    archetype: 'ambush_plus',
    label_it: 'Predatore d’imboscata',
    label_en: 'Ambush Specialist',
    passive_token: 'archetype_ambush_plus_init2',
    description_it: '+2 initiative quando attacco è critico o flank.',
  },
  sensorial: {
    archetype: 'scout_plus',
    label_it: 'Esploratore sensoriale',
    label_en: 'Sensory Scout',
    passive_token: 'archetype_scout_plus_sight2',
    description_it: '+2 sight range, ignora low-cover su targeting.',
  },
  environmental: {
    archetype: 'adapter_plus',
    label_it: 'Adattatore biomico',
    label_en: 'Biome Adapter',
    passive_token: 'archetype_adapter_plus_hazard',
    description_it: 'Immune a un hazard biome-locked (chosen at apply-time).',
  },
  symbiotic: {
    archetype: 'alpha_plus',
    label_it: 'Alpha simbiotico',
    label_en: 'Symbiotic Alpha',
    passive_token: 'archetype_alpha_plus_aff1',
    description_it: '+1 affinity passive a tutti gli alleati adiacenti.',
  },
};

const BINGO_THRESHOLD = 3;

/**
 * Verifica se applicare `mutationId` causerebbe un conflitto di body_slot.
 *
 * Per ADR §S1: max 1 mutation per body_slot canonical (mouth | appendage
 * | sense | tegument | back). Eccezione: body_slot=null (symbiotic) NON
 * partecipa al gating, multiple symbiotic possono coesistere.
 *
 * @param {object} unit  — { applied_mutations?: string[] }
 * @param {string} mutationId — id da applicare
 * @param {object} catalog — output di loadMutationCatalog() (almeno {byId})
 * @returns {{ conflict: boolean, conflicting_mutation_id?: string, slot?: string }}
 */
function checkSlotConflict(unit, mutationId, catalog) {
  const byId = catalog?.byId || {};
  const target = byId[mutationId];
  if (!target) return { conflict: false };
  const targetSlot = target.body_slot;
  // Symbiotic exception (ADR §S1): null slot ⇒ no gating
  if (targetSlot === null || targetSlot === undefined) return { conflict: false };

  const applied = Array.isArray(unit?.applied_mutations) ? unit.applied_mutations : [];
  for (const appliedId of applied) {
    if (appliedId === mutationId) continue;
    const otherEntry = byId[appliedId];
    if (!otherEntry) continue;
    if (otherEntry.body_slot === targetSlot) {
      return {
        conflict: true,
        conflicting_mutation_id: appliedId,
        slot: targetSlot,
      };
    }
  }
  return { conflict: false };
}

/**
 * Verifica budget MP sufficiente per applicare mutation.
 *
 * @param {object} unit  — { mp?: number }
 * @param {object} mutationEntry — entry catalog enriched
 * @returns {{ ok: boolean, required: number, available: number }}
 */
function checkMpBudget(unit, mutationEntry) {
  const required = Number(mutationEntry?.mp_cost ?? 0);
  const available = Number(unit?.mp ?? 0);
  return {
    ok: available >= required,
    required,
    available,
  };
}

/**
 * Applica mutation a unit (pure: ritorna copia aggiornata).
 *
 * Side-effect documentati nel return:
 * - trait_ids: trait_swap.remove[] tolti, add[] aggiunti
 * - applied_mutations: + mutationId (idempotent set)
 * - mp: -mp_cost (NON va sotto 0; se enforce flag, throw o return error)
 * - derived_ability emerge se entry.derived_ability_id presente
 *
 * Caller (route handler) sceglie se chiamare prima checkSlotConflict +
 * checkMpBudget. Questa funzione NON ri-controlla.
 *
 * @param {object} unit
 * @param {string} mutationId
 * @param {object} catalog — output loadMutationCatalog()
 * @param {object} [options]
 * @param {boolean} [options.deductMp=true] — toggle off per scenari free-grant
 * @returns {{ unit, derived_ability_id, mp_spent, applied_event }}
 */
function applyMutationPure(unit, mutationId, catalog, options = {}) {
  const byId = catalog?.byId || {};
  const entry = byId[mutationId];
  if (!entry) throw new Error(`mutation_not_found:${mutationId}`);

  const swap = entry.trait_swap || { add: [], remove: [] };
  const removeSet = new Set(Array.isArray(swap.remove) ? swap.remove : []);
  const addList = Array.isArray(swap.add) ? swap.add : [];
  const oldTraits = Array.isArray(unit.trait_ids) ? unit.trait_ids : [];
  const filteredTraits = oldTraits.filter((t) => !removeSet.has(t));
  const newTraits = [...filteredTraits];
  for (const t of addList) if (!newTraits.includes(t)) newTraits.push(t);

  const oldApplied = Array.isArray(unit.applied_mutations) ? unit.applied_mutations : [];
  const newApplied = oldApplied.includes(mutationId) ? oldApplied : [...oldApplied, mutationId];

  const deductMp = options.deductMp !== false;
  const mpCost = Number(entry.mp_cost ?? 0);
  const oldMp = Number(unit.mp ?? 0);
  const newMp = deductMp ? Math.max(0, oldMp - mpCost) : oldMp;

  const updatedUnit = {
    ...unit,
    trait_ids: newTraits,
    applied_mutations: newApplied,
    mp: newMp,
  };

  const derivedAbilityId = entry.derived_ability_id || null;
  if (derivedAbilityId) {
    const oldAbilities = Array.isArray(unit.abilities) ? unit.abilities : [];
    if (!oldAbilities.includes(derivedAbilityId)) {
      updatedUnit.abilities = [...oldAbilities, derivedAbilityId];
    }
  }

  return {
    unit: updatedUnit,
    derived_ability_id: derivedAbilityId,
    mp_spent: deductMp ? mpCost : 0,
    applied_event: {
      type: 'mutation_applied',
      mutation_id: mutationId,
      body_slot: entry.body_slot ?? null,
      category: entry.category ?? null,
      mp_cost: mpCost,
      added_traits: addList,
      removed_traits: Array.from(removeSet),
      derived_ability_id: derivedAbilityId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Computa bingo state per unit: count mutation per category, emit
 * archetype_*_plus passive se threshold raggiunto.
 *
 * Multi-bingo possibile (es. 3 physiological + 3 sensorial → 2 archetypes).
 * Contati solo applied_mutations attualmente presenti nel catalog.
 *
 * @param {object} unit  — { applied_mutations?: string[] }
 * @param {object} catalog — output loadMutationCatalog()
 * @returns {{ counts: object, archetypes: Array<object> }}
 */
function computeMutationBingo(unit, catalog) {
  const byId = catalog?.byId || {};
  const applied = Array.isArray(unit?.applied_mutations) ? unit.applied_mutations : [];
  const counts = {};
  for (const id of applied) {
    const entry = byId[id];
    if (!entry) continue;
    const cat = entry.category;
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const archetypes = [];
  for (const [cat, n] of Object.entries(counts)) {
    if (n >= BINGO_THRESHOLD) {
      const def = BINGO_ARCHETYPES[cat];
      if (def) {
        archetypes.push({
          category: cat,
          count: n,
          ...def,
        });
      }
    }
  }
  return { counts, archetypes };
}

/**
 * Hydrate unit con `_archetype_passives` derivati dal bingo state corrente.
 *
 * Parallelo a `unit._perk_passives` (M13.P3): array di passive_token consumati
 * runtime nel resolver damage step / sight calc. Idempotent — sostituisce
 * ogni call con valori freschi da computeMutationBingo.
 *
 * @param {object} unit — mutated in-place (campo `_archetype_passives` set)
 * @param {object} catalog — output loadMutationCatalog()
 * @returns {{ archetypes: Array, passive_tokens: string[] }}
 */
function applyMutationBingoToUnit(unit, catalog) {
  if (!unit || typeof unit !== 'object') return { archetypes: [], passive_tokens: [] };
  const bingo = computeMutationBingo(unit, catalog);
  const passive_tokens = bingo.archetypes.map((a) => a.passive_token);
  unit._archetype_passives = passive_tokens;
  unit._archetype_meta = bingo.archetypes.map((a) => ({
    archetype: a.archetype,
    category: a.category,
    passive_token: a.passive_token,
    label_it: a.label_it,
  }));
  return { archetypes: bingo.archetypes, passive_tokens };
}

// Sprint δ Meta Systemic — re-export swap helper from meta/ (MYZ pattern).
// Convenience: callers requiring mutationEngine can also access swap without
// double require.
let _swapAppliedMutation = null;
function swapAppliedMutation(...args) {
  if (!_swapAppliedMutation) {
    _swapAppliedMutation = require('../meta/mutationTreeSwap').swapAppliedMutation;
  }
  return _swapAppliedMutation(...args);
}

module.exports = {
  checkSlotConflict,
  checkMpBudget,
  applyMutationPure,
  computeMutationBingo,
  applyMutationBingoToUnit,
  swapAppliedMutation,
  BINGO_ARCHETYPES,
  BINGO_THRESHOLD,
};
