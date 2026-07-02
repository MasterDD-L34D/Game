// D1+D2: Meta progression — recruit, trust, mating, nest.
//
// Gestisce NPC affinity/trust tracking + mating outcome.
// Two entry points:
//   - createMetaTracker(): sync, in-memory (legacy; baseline tests).
//   - createMetaStore({ prisma, campaignId }): async adapter (Prisma + in-memory fallback).
//
// Gate: recruit requires affinity >= 0 AND trust >= 2.
// Gate: mating requires trust >= 3 + nest requirements.
//
// Fonte: Final Design Freeze v0.9 §20-21
// ADR: docs/adr/ADR-2026-04-21-meta-progression-prisma.md

'use strict';

const {
  computeOffspringEpigenome,
  deriveEpigeneticMemory,
  epigenomeBiasStrength,
  computeFragmentGrant,
  computeSpeciesMean,
} = require('./genetics/epigenome');

// Gate thresholds (§20.2)
const RECRUIT_AFFINITY_MIN = 0;
const RECRUIT_TRUST_MIN = 2;
const MATING_TRUST_MIN = 3;

// Affinity range: -2..+2 (§20.1)
const AFFINITY_MIN = -2;
const AFFINITY_MAX = 2;
// Trust range: 0..5
const TRUST_MIN = 0;
const TRUST_MAX = 5;

const MATING_THRESHOLD = 12; // DC base

// K-04 (SPEC-K device-authority): pure recruit/mating gate eval over a plain
// NPC row + nest state. Keeps the gates in ONE place (the constants above) so
// they can be surfaced server-side on the /npg list. The Godot phone Nido view
// used to recompute these gates client-side, duplicating the thresholds
// verbatim (drift risk on re-tune) -- enriching /npg lets the device read the
// gate the server owns. Matches the can_recruit flag already returned by
// POST /affinity|/trust and the canRecruit()/canMate() store methods.
function evalNpcGates(npc = {}, nest = {}) {
  const affinity = Number(npc.affinity) || 0;
  const trust = Number(npc.trust) || 0;
  const recruited = Boolean(npc.recruited);
  const mated = Boolean(npc.mated);
  const cooldown = Number(npc.mating_cooldown) || 0;
  const nestReady = Boolean(nest && nest.requirements_met);
  const can_recruit = affinity >= RECRUIT_AFFINITY_MIN && trust >= RECRUIT_TRUST_MIN && !recruited;
  const can_mate = recruited && trust >= MATING_TRUST_MIN && !mated && cooldown <= 0 && nestReady;
  return { can_recruit, can_mate };
}

/**
 * D1: Creates a meta progression tracker for a party/campaign.
 * In-memory state — persist externally if needed.
 */
function createMetaTracker() {
  const npcs = new Map();
  const nest = { level: 0, biome: null, requirements_met: false };
  const offspringRegistry = []; // Sprint C — list of offspring spec from rollMatingOffspring

  function getOrCreate(npcId) {
    if (!npcs.has(npcId)) {
      npcs.set(npcId, {
        npc_id: npcId,
        affinity: 0,
        trust: 0,
        recruited: false,
        mated: false,
        mating_cooldown: 0,
      });
    }
    return npcs.get(npcId);
  }

  function updateAffinity(npcId, delta) {
    const npc = getOrCreate(npcId);
    npc.affinity = clamp(npc.affinity + delta, AFFINITY_MIN, AFFINITY_MAX);
    return npc;
  }

  function updateTrust(npcId, delta) {
    const npc = getOrCreate(npcId);
    npc.trust = clamp(npc.trust + delta, TRUST_MIN, TRUST_MAX);
    return npc;
  }

  function canRecruit(npcId) {
    const npc = getOrCreate(npcId);
    return npc.affinity >= RECRUIT_AFFINITY_MIN && npc.trust >= RECRUIT_TRUST_MIN && !npc.recruited;
  }

  function recruit(npcId, speciesId) {
    if (!canRecruit(npcId)) return { success: false, reason: 'gate_not_met' };
    const npc = getOrCreate(npcId);
    npc.recruited = true;
    if (speciesId && !npc.species_id) npc.species_id = speciesId;
    return { success: true, npc };
  }

  function canMate(npcId) {
    const npc = getOrCreate(npcId);
    return (
      npc.recruited &&
      npc.trust >= MATING_TRUST_MIN &&
      !npc.mated &&
      npc.mating_cooldown <= 0 &&
      nest.requirements_met
    );
  }

  /**
   * D2: Roll mating check. Uses MBTI compatibility from mating.yaml.
   *
   * @param {string} npcId
   * @param {object} partyMember — { mbti_type, trait_ids }
   * @param {object} compatTable — MBTI compat from mating.yaml
   * @param {function} rng — () => [0,1)
   * @returns {{ success, roll, modifier, threshold, offspring_traits? }}
   */
  function rollMating(npcId, partyMember, compatTable = {}, rng = Math.random) {
    if (!canMate(npcId)) return { success: false, reason: 'gate_not_met' };

    const npc = getOrCreate(npcId);
    const { roll, modifier, total, threshold, success, offspringTraits } = computeMatingRoll({
      npcMbti: npc.mbti_type,
      npcTraits: npc.trait_ids,
      npcTrust: npc.trust,
      partyMember,
      compatTable,
      rng,
    });

    if (success) {
      npc.mated = true;
      return {
        success: true,
        roll,
        modifier,
        total,
        threshold,
        offspring_traits: offspringTraits,
        seed_generated: 1,
      };
    }

    npc.mating_cooldown = 1;
    return { success: false, roll, modifier, total, threshold, reason: 'roll_failed' };
  }

  function setNest(biome, requirementsMet = true) {
    nest.biome = biome;
    nest.level = 1;
    nest.requirements_met = requirementsMet;
    return nest;
  }

  function tickCooldowns() {
    for (const npc of npcs.values()) {
      if (npc.mating_cooldown > 0) npc.mating_cooldown -= 1;
    }
  }

  function listNpcs() {
    return [...npcs.values()];
  }

  function getNest() {
    return { ...nest };
  }

  // Sprint C — squad-mate offspring roll (MHS 3-tier).
  // Distinct from `rollMating(npcId, partyMember)` (NPC pair-bond DC roll).
  function rollOffspring({ parentA, parentB, biomeId, context = {} } = {}) {
    const result = rollMatingOffspring({ parentA, parentB, biomeId, context });
    if (result.success && result.offspring) {
      offspringRegistry.push({ ...result.offspring, created_at: Date.now() });
    }
    return result;
  }

  function listOffspring() {
    return offspringRegistry.map((o) => ({ ...o }));
  }

  function addOffspring(offspring) {
    if (!offspring || typeof offspring !== 'object') return null;
    const entry = { ...offspring, added_at: Date.now() };
    offspringRegistry.push(entry);
    return entry;
  }

  return {
    updateAffinity,
    updateTrust,
    canRecruit,
    recruit,
    canMate,
    rollMating,
    setNest,
    tickCooldowns,
    listNpcs,
    getNest,
    rollOffspring,
    listOffspring,
    addOffspring,
  };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ─── Shared mating roll logic (used by both tracker and store) ──────────

function computeMatingRoll({ npcMbti, npcTraits, npcTrust, partyMember, compatTable, rng }) {
  const roll = Math.floor(rng() * 20) + 1;

  let modifier = 0;
  const playerType = partyMember.mbti_type || 'NEUTRA';
  const npcType = npcMbti || 'NEUTRA';
  const compat = compatTable[playerType];
  if (compat) {
    if ((compat.likes || []).includes(npcType)) modifier += 3;
    else if ((compat.dislikes || []).includes(npcType)) modifier -= 3;
  }

  modifier += npcTrust - MATING_TRUST_MIN;

  const total = roll + modifier;
  const success = total >= MATING_THRESHOLD;

  let offspringTraits = [];
  if (success) {
    const parentTraits = partyMember.trait_ids || [];
    const npcTraitsList = Array.isArray(npcTraits) ? npcTraits : parseJsonArray(npcTraits);
    const allTraits = [...new Set([...parentTraits, ...npcTraitsList])];
    const offspringCount = Math.min(3, allTraits.length);
    const available = [...allTraits];
    for (let i = 0; i < offspringCount && available.length > 0; i++) {
      const idx = Math.floor(rng() * available.length);
      offspringTraits.push(available.splice(idx, 1)[0]);
    }
  }

  return { roll, modifier, total, threshold: MATING_THRESHOLD, success, offspringTraits };
}

function parseJsonArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Sprint C — Offspring rollMating (MHS 3-tier visual feedback) ────────
//
// Pattern Monster Hunter Stories 3 genetics: offspring inherits 2 gene slots
// (one per parent, weighted by inheritance_weight) + 1 environmental mutation
// pulled from biome filter. Tier (no-glow/gold/rainbow) determines visual
// feedback + bonus traits for offspring.
//
// Mating mutation = Layer 2 (offspring) ≠ Layer 1 self-encounter mutation
// (M14 mutation_catalog). Layer 2 uses Layer 1 catalog filtered by biome
// where mating happened.
//
// Refs:
// - data/core/mating.yaml § gene_slots inheritance_rules
// - data/core/mutations/mutation_catalog.yaml (M14, biome_boost field)
// - docs/core/Mating-Reclutamento-Nido.md § Ereditarietà & Mutazioni

const TIER_NO_GLOW = 'no-glow';
const TIER_GOLD = 'gold';
const TIER_RAINBOW = 'rainbow';

const TIER_VISUAL_HINTS = {
  [TIER_NO_GLOW]: { border_color: '#2a3040', glow: false, particles: false, sfx: 'tier_common' },
  [TIER_GOLD]: { border_color: '#ffd180', glow: true, particles: false, sfx: 'tier_gold' },
  [TIER_RAINBOW]: {
    border_color: 'rainbow',
    glow: true,
    particles: true,
    sfx: 'tier_rainbow',
  },
};

/**
 * Deterministic lineage_id from two parent ids.
 * Format: lineage_<8-hex-prefix> derived from sorted-pair hash so order
 * doesn't matter (parent_a + parent_b == parent_b + parent_a).
 */
function makeLineageId(parentAId, parentBId) {
  const a = String(parentAId || '');
  const b = String(parentBId || '');
  const pair = [a, b].sort().join('|');
  // FNV-1a-like 32-bit folding hash (deterministic, no external deps).
  let h = 0x811c9dc5;
  for (let i = 0; i < pair.length; i++) {
    h ^= pair.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = h.toString(16).padStart(8, '0');
  return `lineage_${hex}`;
}

/**
 * Pick gene slots inherited from each parent.
 * Each parent contributes 1 slot, weighted by slot inheritance_weight if available.
 *
 * @param {object} parentA — { id, gene_slots?: Array<{slot_id, value}> }
 * @param {object} parentB
 * @param {object} geneSlotsSchema — data/core/mating.yaml gene_slots
 * @param {function} rng
 * @returns {Array<{from: string, slot_id, value, label_it?, category}>}
 */
function inheritGeneSlots(parentA, parentB, geneSlotsSchema = {}, rng = Math.random) {
  const inherited = [];
  for (const [parentLabel, parent] of [
    ['parent_a', parentA],
    ['parent_b', parentB],
  ]) {
    const slots = Array.isArray(parent?.gene_slots) ? parent.gene_slots : [];
    if (slots.length === 0) {
      // No gene_slots on parent — fallback to a synthetic slot derived from parent id.
      inherited.push({
        from: parentLabel,
        slot_id: 'corpo',
        value: parent?.id || parentLabel,
        category: 'struttura',
      });
      continue;
    }
    // Weighted random pick by inheritance_weight (default 0.5 if missing).
    const weights = slots.map((s) => {
      const meta = lookupSlotMeta(geneSlotsSchema, s.slot_id);
      return Math.max(0.05, Number(meta?.inheritance_weight ?? 0.5));
    });
    const totalW = weights.reduce((a, b) => a + b, 0);
    let pick = rng() * totalW;
    let chosenIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        chosenIdx = i;
        break;
      }
    }
    const slot = slots[chosenIdx];
    const meta = lookupSlotMeta(geneSlotsSchema, slot.slot_id);
    inherited.push({
      from: parentLabel,
      slot_id: slot.slot_id,
      value: slot.value,
      label_it: meta?.label_it || slot.slot_id,
      category: meta?.category || 'struttura',
    });
  }
  return inherited;
}

function lookupSlotMeta(geneSlotsSchema, slotId) {
  const cats = geneSlotsSchema?.categories || {};
  for (const [catKey, cat] of Object.entries(cats)) {
    const slots = cat?.slots || [];
    for (const s of slots) {
      if (s.id === slotId) {
        return { ...s, category: catKey };
      }
    }
  }
  return null;
}

/**
 * Pick 1 environmental mutation filtered by biome_id_at_mating.
 *
 * Strategy:
 *   1. If mutationCatalog is provided AND has entries with biome_boost matching:
 *      pick weighted-random from those (prefer rare > advanced > base by tier).
 *   2. Otherwise fallback: pick from biomeTraitsPool (random trait id).
 *
 * Returns: { id, type: 'mutation'|'trait', tier: 0|1|2|null, biome_id, source }.
 */
function pickEnvironmentalMutation({
  biomeId,
  mutationCatalog = null,
  biomeTraitsPool = [],
  rng = Math.random,
}) {
  // Prefer real mutation catalog entries matching biome.
  if (mutationCatalog && typeof mutationCatalog === 'object') {
    const byId = mutationCatalog.byId || {};
    const matches = [];
    for (const [id, entry] of Object.entries(byId)) {
      const boostList = Array.isArray(entry?.biome_boost) ? entry.biome_boost : [];
      if (biomeId && boostList.includes(biomeId)) {
        matches.push({ id, entry });
      }
    }
    if (matches.length > 0) {
      const picked = matches[Math.floor(rng() * matches.length)];
      const tier = Number(picked.entry?.tier ?? 1);
      return {
        id: picked.id,
        type: 'mutation',
        tier,
        biome_id: biomeId || null,
        source: 'mutation_catalog',
        name_it: picked.entry?.name_it || picked.id,
      };
    }
  }
  // Fallback: random trait from biome pool.
  if (Array.isArray(biomeTraitsPool) && biomeTraitsPool.length > 0) {
    const traitId = biomeTraitsPool[Math.floor(rng() * biomeTraitsPool.length)];
    return {
      id: traitId,
      type: 'trait',
      tier: null,
      biome_id: biomeId || null,
      source: 'biome_trait_pool',
      name_it: traitId,
    };
  }
  // Empty fallback (no catalog + no pool).
  return {
    id: null,
    type: 'none',
    tier: null,
    biome_id: biomeId || null,
    source: 'fallback_empty',
    name_it: null,
  };
}

/**
 * Compute offspring tier (no-glow / gold / rainbow).
 *
 * Rules (MHS pattern):
 * - GOLD: gene_slot match (both inherited slots have same slot_id).
 * - RAINBOW: environmental_mutation tier === 2 (rare in mutation_catalog).
 * - NO-GLOW: default common offspring.
 *
 * Stochastic edge:
 * - If neither match, tier remains no-glow (~70%); roll a small random for
 *   rainbow/gold downgrade tolerance is unnecessary because gates are deterministic.
 */
function computeOffspringTier({ inheritedSlots, environmentalMutation }) {
  const a = inheritedSlots?.[0];
  const b = inheritedSlots?.[1];
  const slotMatch = Boolean(a && b && a.slot_id === b.slot_id);
  const mutTier = Number(environmentalMutation?.tier ?? -1);
  const isRareMutation = environmentalMutation?.type === 'mutation' && mutTier >= 2;

  if (isRareMutation) return TIER_RAINBOW;
  if (slotMatch) return TIER_GOLD;
  return TIER_NO_GLOW;
}

function tierBonusTraits(tier) {
  if (tier === TIER_GOLD) return 1;
  if (tier === TIER_RAINBOW) return 2;
  return 0;
}

// RECON-04b (Fase-1 Spore, G2) -- complexity-budget formula.
// Fallback cost for applied ids lacking a catalog mp_cost (e.g. bonus trait
// ids): modal mp_cost of the catalog (master-dd ratified 2026-05-26, Option A).
const FALLBACK_BONUS_COST = 8;

/**
 * Compute offspring genetic complexity = Sigma mp_cost over the applied set
 * [environmental_mutation.id, ...tier_bonus_traits]. Ids resolving in the
 * mutation catalog contribute their mp_cost; non-catalog ids contribute
 * FALLBACK_BONUS_COST. Inherited gene slots are structural (NOT counted).
 *
 * @param {object} offspring -- { environmental_mutation?: {id}, tier_bonus_traits?: string[] }
 * @param {object|null} catalog -- loadMutationCatalog() output ({byId}) or null
 * @returns {number} total complexity
 */
function computeOffspringComplexity(offspring, catalog) {
  const byId = catalog && typeof catalog === 'object' ? catalog.byId || {} : {};
  const applied = [];
  const envId =
    offspring && offspring.environmental_mutation && offspring.environmental_mutation.id;
  if (envId) applied.push(envId);
  const bonus = Array.isArray(offspring && offspring.tier_bonus_traits)
    ? offspring.tier_bonus_traits
    : [];
  for (const b of bonus) applied.push(b);
  let sum = 0;
  for (const id of applied) {
    const entry = byId[id];
    const mp = entry && entry.mp_cost != null ? Number(entry.mp_cost) : FALLBACK_BONUS_COST;
    sum += Number.isFinite(mp) ? mp : FALLBACK_BONUS_COST;
  }
  return sum;
}

// Fase-2 (Spore S5) -- hybrid fusion engine (mechanism-only; rules content =
// master-dd authoring debt). hybrid_rules shape (mating.yaml):
//   { <category>: { "<traitA> + <traitB>": "<resultTrait>" } }
function parseHybridRules(hybridRules) {
  const out = [];
  if (!hybridRules || typeof hybridRules !== 'object') return out;
  for (const [category, rules] of Object.entries(hybridRules)) {
    if (!rules || typeof rules !== 'object') continue;
    for (const [pairKey, result] of Object.entries(rules)) {
      const parts = String(pairKey)
        .split('+')
        .map((x) => x.trim())
        .filter(Boolean);
      if (parts.length === 2 && typeof result === 'string' && result) {
        out.push({ category, a: parts[0], b: parts[1], result });
      }
    }
  }
  return out;
}

/**
 * Pure hybrid fusion: given a flat trait-id array + hybrid_rules, replace any
 * present "A + B" pair with its result trait (greedy, first-match-wins). Returns
 * a new trait set + fusion log. Inert when hybridRules absent/empty.
 *
 * @param {string[]} traitIds
 * @param {object} [hybridRules]
 * @returns {{ traits: string[], fusions: Array<{category:string,pair:[string,string],result:string}> }}
 */
function applyHybridFusion(traitIds, hybridRules) {
  const present = new Set(
    Array.isArray(traitIds) ? traitIds.filter((t) => typeof t === 'string' && t) : [],
  );
  const fusions = [];
  for (const r of parseHybridRules(hybridRules)) {
    if (present.has(r.a) && present.has(r.b)) {
      present.delete(r.a);
      present.delete(r.b);
      present.add(r.result);
      fusions.push({ category: r.category, pair: [r.a, r.b], result: r.result });
    }
  }
  return { traits: Array.from(present), fusions };
}

/**
 * Sprint C — Roll mating offspring spec.
 *
 * Distinct from `rollMating(npcId, partyMember)` (NPC pair-bond MBTI compat
 * d20 check). This is the **squad-mate roll**: parent_a + parent_b are two
 * creatures of the player's squad, biome at mating decides environmental
 * mutation flavor, output is full offspring spec with tier visual feedback.
 *
 * @param {object} input
 * @param {object} input.parentA — { id, mbti_type?, trait_ids?, gene_slots? }
 * @param {object} input.parentB — { id, mbti_type?, trait_ids?, gene_slots? }
 * @param {string} input.biomeId
 * @param {object} [input.context]
 * @param {object} [input.context.geneSlotsSchema] — data/core/mating.yaml gene_slots
 * @param {object} [input.context.mutationCatalog] — optional M14 catalog (loadMutationCatalog())
 * @param {Array<string>} [input.context.biomeTraitsPool]
 * @param {function} [input.context.rng]
 * @returns {object} offspring spec + tier + visual_hints
 */
function rollMatingOffspring({ parentA, parentB, biomeId, context = {} } = {}) {
  if (!parentA || !parentB) {
    throw new Error('rollMatingOffspring: parentA and parentB required');
  }
  if (parentA.id && parentB.id && parentA.id === parentB.id) {
    return {
      success: false,
      reason: 'self_mate_prevented',
      offspring: null,
      tier: null,
      visual_hints: null,
    };
  }
  const rng = typeof context.rng === 'function' ? context.rng : Math.random;
  const geneSlotsSchema = context.geneSlotsSchema || {};
  const mutationCatalog = context.mutationCatalog || null;
  const biomeTraitsPool = Array.isArray(context.biomeTraitsPool) ? context.biomeTraitsPool : [];

  const lineageId = makeLineageId(parentA.id, parentB.id);
  const inheritedSlots = inheritGeneSlots(parentA, parentB, geneSlotsSchema, rng);
  const environmentalMutation = pickEnvironmentalMutation({
    biomeId,
    mutationCatalog,
    biomeTraitsPool,
    rng,
  });
  const tier = computeOffspringTier({ inheritedSlots, environmentalMutation });
  const bonusTraits = tierBonusTraits(tier);

  // Compose bonus traits list from union of parent trait pools, picked random,
  // exclusive of duplicates already in environmental_mutation.id.
  const parentTraitsAll = [
    ...new Set([
      ...(Array.isArray(parentA.trait_ids) ? parentA.trait_ids : []),
      ...(Array.isArray(parentB.trait_ids) ? parentB.trait_ids : []),
    ]),
  ].filter((t) => t !== environmentalMutation?.id);

  const bonus = [];
  const available = [...parentTraitsAll];
  for (let i = 0; i < bonusTraits && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    bonus.push(available.splice(idx, 1)[0]);
  }

  // RECON-04b (G2, ADR-2026-04-26) -- complexity-budget enforce at offspring
  // materialization. Drop random bonus traits (preserve inherited slots) until
  // Sigma c <= C_max. env-only floor (mp_cost <= 15) is always <= C_max=30.
  const C_MAX = Number(process.env.OFFSPRING_C_MAX) || 30;
  const droppedBonus = [];
  let complexity = computeOffspringComplexity(
    { environmental_mutation: environmentalMutation, tier_bonus_traits: bonus },
    mutationCatalog,
  );
  for (let _iter = 0; complexity > C_MAX && bonus.length > 0 && _iter < 5; _iter++) {
    const dropIdx = Math.floor(rng() * bonus.length);
    droppedBonus.push(bonus.splice(dropIdx, 1)[0]);
    complexity = computeOffspringComplexity(
      { environmental_mutation: environmentalMutation, tier_bonus_traits: bonus },
      mutationCatalog,
    );
  }

  // Fase-2 hybrid fusion (mechanism-only; inert until real hybrid_rules injected
  // via context.hybridRules). Non-destructive: surfaces fusions as metadata, does
  // NOT mutate tier_bonus_traits (zero interaction with complexity-budget).
  const hybridTraitSet = [
    ...bonus,
    ...(environmentalMutation && environmentalMutation.type === 'trait' && environmentalMutation.id
      ? [environmentalMutation.id]
      : []),
  ];
  const { fusions: hybridFusions } = applyHybridFusion(hybridTraitSet, context.hybridRules || null);

  const offspring = {
    lineage_id: lineageId,
    gene_slots: inheritedSlots,
    environmental_mutation: environmentalMutation,
    tier_bonus_traits: bonus,
    tier,
    complexity,
    complexity_budget: { c_max: C_MAX, formula: 'mp_cost_sum_fallback8', dropped: droppedBonus },
    hybrid_fusions: hybridFusions,
    predicted_lifecycle_phase: 'hatchling',
    parent_a_id: parentA.id || null,
    parent_b_id: parentB.id || null,
    biome_id_at_mating: biomeId || null,
  };

  // Sprint δ Meta Systemic — CK3 DNA chain encoding (opt-in).
  // When context.useGeneEncoder=true, derive offspring DNA chain linking
  // parent DNA (preserves cross-generation lineage). Additive only.
  if (context.useGeneEncoder === true) {
    try {
      const { encode } = require('./meta/geneEncoder');
      const offspringMutationSet = [
        ...(offspring.environmental_mutation?.id ? [offspring.environmental_mutation.id] : []),
        ...bonus,
      ];
      // Prefer parentA.dna_chain if available, else parentB
      const parentDna = parentA.dna_chain || parentB.dna_chain || null;
      offspring.dna_chain = encode({
        lineage_id: lineageId,
        applied_mutations: offspringMutationSet,
        parent_dna: parentDna,
      });
    } catch (_err) {
      // Defensive: encoder optional, never block mating roll
      offspring.dna_chain = null;
    }
  }

  // Fase-3 Epigenome (Lamarck-lite). Opt-in: requires context.epigenomeConfig
  // + at least one parent epigenome. Pure: attaches offspring.epigenome,
  // .epigenetic_memory, .epigenome_fragment_grant (caller applies the fragment
  // side-effect at the route boundary). Fully inert otherwise (back-compat).
  if (context.epigenomeConfig && (parentA.epigenome || parentB.epigenome)) {
    const epiCfg = context.epigenomeConfig;
    const speciesMean = context.speciesMean || { utility: 0.5, liberty: 0.5, morality: 0.5 };
    const offspringEpi = computeOffspringEpigenome(
      parentA.epigenome,
      parentB.epigenome,
      speciesMean,
      epiCfg,
    );
    const epiMemory = deriveEpigeneticMemory(
      offspringEpi,
      speciesMean,
      epiCfg.axis_memory_map,
      epiCfg.min_bias_expression,
    );
    const parentBias = epigenomeBiasStrength(parentA.epigenome, parentB.epigenome, speciesMean);
    offspring.epigenome = offspringEpi;
    offspring.epigenetic_memory = epiMemory;
    offspring.epigenome_fragment_grant = computeFragmentGrant(
      parentBias,
      epiCfg.fragment_grant_threshold,
      epiCfg.fragment_grant_amount,
    );
    // Discrete expression on the narrative slot: if a memory expressed, surface
    // it as memoria_ambientale (else stays pure-biome = absent).
    if (epiMemory.memory_id) {
      offspring.memoria_ambientale = {
        source: 'epigenome',
        memory_id: epiMemory.memory_id,
        axis: epiMemory.axis,
        direction: epiMemory.direction,
      };
    }
  }

  return {
    success: true,
    offspring,
    tier,
    visual_hints: TIER_VISUAL_HINTS[tier],
  };
}

// Note: Sprint C exports are appended at the bottom of this file (after the
// canonical `module.exports = { ... }` block) to avoid being overwritten.

// ─── L06 adapter: Prisma + in-memory fallback ────────────────────────────

/**
 * Detect if Prisma client exposes the meta progression delegates.
 * Stub client (see db/prisma.js) doesn't expose npcRelation → fallback.
 */
function prismaSupportsMeta(prisma) {
  return Boolean(
    prisma &&
    prisma.npcRelation &&
    typeof prisma.npcRelation.findUnique === 'function' &&
    typeof prisma.npcRelation.upsert === 'function',
  );
}

/**
 * Async adapter. Preserves API shape of createMetaTracker but all ops async.
 * When prisma unavailable → delegates to in-memory tracker.
 *
 * @param {object} opts
 * @param {object} [opts.prisma] — Prisma client (from db/prisma.js)
 * @param {string|null} [opts.campaignId] — scope NPC relations per-campaign; null = legacy global
 */
function createMetaStore({ prisma, campaignId = null } = {}) {
  const usePrisma = prismaSupportsMeta(prisma);
  const fallback = usePrisma ? null : createMetaTracker();

  // G4 #2746 Codex P2 — Postgres unique on nullable campaign_id does NOT
  // reject a second NULL row, so the global-store findFirst+create race can
  // produce duplicates (unlike the non-null findUnique+create race, which
  // fails loudly with P2002). Mitigation: serialize first-creation in-process
  // (single backend process serves these routes) and order reads by createdAt
  // so any stray duplicate is never read again (oldest row = canonical).
  const GLOBAL_ROW_ORDER = [{ createdAt: 'asc' }, { id: 'asc' }];
  const _globalRelCreate = new Map(); // npcId → in-flight create promise
  let _globalNestCreate = null;

  async function getOrCreateRelation(npcId) {
    if (!usePrisma) return null;
    if (campaignId !== null) {
      const existing = await prisma.npcRelation.findUnique({
        where: { campaignId_npcId: { campaignId, npcId } },
      });
      if (existing) return existing;
      return prisma.npcRelation.create({
        data: { campaignId, npcId },
      });
    }
    // G4 #2746 — compound unique (campaignId, npcId) has campaignId String?:
    // the real Prisma client rejects findUnique with a null member
    // (PrismaClientValidationError). Global store must use findFirst.
    const existing = await prisma.npcRelation.findFirst({
      where: { campaignId: null, npcId },
      orderBy: GLOBAL_ROW_ORDER,
    });
    if (existing) return existing;
    let pending = _globalRelCreate.get(npcId);
    if (!pending) {
      pending = prisma.npcRelation
        .create({ data: { campaignId: null, npcId } })
        .finally(() => _globalRelCreate.delete(npcId));
      _globalRelCreate.set(npcId, pending);
    }
    return pending;
  }

  function toNpcShape(relation) {
    return {
      npc_id: relation.npcId,
      affinity: relation.affinity,
      trust: relation.trust,
      recruited: relation.recruited,
      mated: relation.mated,
      mating_cooldown: relation.matingCooldown,
      mbti_type: relation.mbtiType || undefined,
      species_id: relation.speciesId || undefined,
      trait_ids: parseJsonArray(relation.traitIds),
    };
  }

  async function updateAffinity(npcId, delta) {
    if (!usePrisma) return fallback.updateAffinity(npcId, delta);
    const rel = await getOrCreateRelation(npcId);
    const before = rel.affinity;
    const after = clamp(before + delta, AFFINITY_MIN, AFFINITY_MAX);
    const updated = await prisma.npcRelation.update({
      where: { id: rel.id },
      data: {
        affinity: after,
        affinityLogs: { create: { delta, before, after } },
      },
    });
    return toNpcShape(updated);
  }

  async function updateTrust(npcId, delta) {
    if (!usePrisma) return fallback.updateTrust(npcId, delta);
    const rel = await getOrCreateRelation(npcId);
    const before = rel.trust;
    const after = clamp(before + delta, TRUST_MIN, TRUST_MAX);
    const updated = await prisma.npcRelation.update({
      where: { id: rel.id },
      data: {
        trust: after,
        trustLogs: { create: { delta, before, after } },
      },
    });
    return toNpcShape(updated);
  }

  async function canRecruit(npcId) {
    if (!usePrisma) return fallback.canRecruit(npcId);
    const rel = await getOrCreateRelation(npcId);
    return rel.affinity >= RECRUIT_AFFINITY_MIN && rel.trust >= RECRUIT_TRUST_MIN && !rel.recruited;
  }

  async function recruit(npcId, speciesId) {
    if (!usePrisma) return fallback.recruit(npcId, speciesId);
    const rel = await getOrCreateRelation(npcId);
    if (rel.affinity < RECRUIT_AFFINITY_MIN || rel.trust < RECRUIT_TRUST_MIN || rel.recruited) {
      return { success: false, reason: 'gate_not_met' };
    }
    const data = { recruited: true };
    if (speciesId && !rel.speciesId) data.speciesId = speciesId;
    const updated = await prisma.npcRelation.update({
      where: { id: rel.id },
      data,
    });
    return { success: true, npc: toNpcShape(updated) };
  }

  async function getNestRecord() {
    if (!usePrisma) return null;
    if (campaignId !== null) {
      const existing = await prisma.nestState.findUnique({ where: { campaignId } });
      if (existing) return existing;
      return prisma.nestState.create({
        data: { campaignId, level: 0, biome: null, requirementsMet: false },
      });
    }
    // G4 #2746 — NestState.campaignId is String? @unique: real client rejects
    // findUnique({ where: { campaignId: null } }). See getOrCreateRelation for
    // the null-row duplicate rationale (Codex P2).
    const existing = await prisma.nestState.findFirst({
      where: { campaignId: null },
      orderBy: GLOBAL_ROW_ORDER,
    });
    if (existing) return existing;
    if (!_globalNestCreate) {
      _globalNestCreate = prisma.nestState
        .create({ data: { campaignId: null, level: 0, biome: null, requirementsMet: false } })
        .finally(() => {
          _globalNestCreate = null;
        });
    }
    return _globalNestCreate;
  }

  async function canMate(npcId) {
    if (!usePrisma) return fallback.canMate(npcId);
    const rel = await getOrCreateRelation(npcId);
    const nest = await getNestRecord();
    return (
      rel.recruited &&
      rel.trust >= MATING_TRUST_MIN &&
      !rel.mated &&
      rel.matingCooldown <= 0 &&
      Boolean(nest?.requirementsMet)
    );
  }

  async function rollMating(npcId, partyMember, compatTable = {}, rng = Math.random) {
    if (!usePrisma) return fallback.rollMating(npcId, partyMember, compatTable, rng);

    const rel = await getOrCreateRelation(npcId);
    const nest = await getNestRecord();
    const gateOk =
      rel.recruited &&
      rel.trust >= MATING_TRUST_MIN &&
      !rel.mated &&
      rel.matingCooldown <= 0 &&
      Boolean(nest?.requirementsMet);
    if (!gateOk) return { success: false, reason: 'gate_not_met' };

    const { roll, modifier, total, threshold, success, offspringTraits } = computeMatingRoll({
      npcMbti: rel.mbtiType,
      npcTraits: rel.traitIds,
      npcTrust: rel.trust,
      partyMember,
      compatTable,
      rng,
    });

    if (success) {
      await prisma.npcRelation.update({
        where: { id: rel.id },
        data: {
          mated: true,
          matingEvents: {
            create: {
              success: true,
              roll,
              modifier,
              total,
              threshold,
              offspringTraits: JSON.stringify(offspringTraits),
              seedGenerated: 1,
            },
          },
        },
      });
      return {
        success: true,
        roll,
        modifier,
        total,
        threshold,
        offspring_traits: offspringTraits,
        seed_generated: 1,
      };
    }

    await prisma.npcRelation.update({
      where: { id: rel.id },
      data: {
        matingCooldown: 1,
        matingEvents: {
          create: {
            success: false,
            roll,
            modifier,
            total,
            threshold,
            reason: 'roll_failed',
          },
        },
      },
    });
    return { success: false, roll, modifier, total, threshold, reason: 'roll_failed' };
  }

  async function setNest(biome, requirementsMet = true) {
    if (!usePrisma) return fallback.setNest(biome, requirementsMet);
    const existing = await getNestRecord();
    const updated = await prisma.nestState.update({
      where: { id: existing.id },
      data: { biome: biome || 'default', level: 1, requirementsMet },
    });
    return {
      level: updated.level,
      biome: updated.biome,
      requirements_met: updated.requirementsMet,
    };
  }

  async function tickCooldowns() {
    if (!usePrisma) return fallback.tickCooldowns();
    await prisma.npcRelation.updateMany({
      where: { campaignId, matingCooldown: { gt: 0 } },
      data: { matingCooldown: { decrement: 1 } },
    });
  }

  async function listNpcs() {
    if (!usePrisma) return fallback.listNpcs();
    const rows = await prisma.npcRelation.findMany({ where: { campaignId } });
    return rows.map(toNpcShape);
  }

  async function getNest() {
    if (!usePrisma) return fallback.getNest();
    const nest = await getNestRecord();
    return {
      level: nest?.level ?? 0,
      biome: nest?.biome ?? null,
      requirements_met: Boolean(nest?.requirementsMet),
    };
  }

  // Sprint C — Offspring registry. No Prisma model yet (P0 follow-up
  // ADR-2026-04-21-meta-progression-prisma adds it). When usePrisma=false,
  // delegate to fallback tracker so we have a single in-memory source of truth.
  // When usePrisma=true, use this _offspringMem until Prisma model lands.
  const _offspringMem = [];

  async function rollOffspring(input = {}) {
    if (!usePrisma) return fallback.rollOffspring(input);
    const result = rollMatingOffspring(input);
    if (result.success && result.offspring) {
      _offspringMem.push({ ...result.offspring, created_at: Date.now() });
    }
    return result;
  }

  async function listOffspring() {
    if (!usePrisma) return fallback.listOffspring();
    return _offspringMem.map((o) => ({ ...o }));
  }

  async function addOffspring(offspring) {
    if (!usePrisma) return fallback.addOffspring(offspring);
    if (!offspring || typeof offspring !== 'object') return null;
    const entry = { ...offspring, added_at: Date.now() };
    _offspringMem.push(entry);
    return entry;
  }

  return {
    updateAffinity,
    updateTrust,
    canRecruit,
    recruit,
    canMate,
    rollMating,
    setNest,
    tickCooldowns,
    listNpcs,
    getNest,
    rollOffspring,
    listOffspring,
    addOffspring,
    // meta
    _mode: usePrisma ? 'prisma' : 'in-memory',
  };
}

// ─── Sprint D — Lineage chain + Tribe emergent ───────────────────────────
//
// Tribe NON è layer aggiuntivo. È conseguenza emergente catena Nido →
// offspring con `lineage_id` → catena multi-generazionale → N units stesso
// lineage = tribù implicita. (Memory: feedback_tribe_lineage_emergent_breakthrough)
//
// Sprint C estende `rollMating()` per emettere offspring con shape:
//   { unit_id, lineage_id, parents: [a,b], born_at_session, born_at_biome }
// Quel record va passato a `recordOffspring()` qui per popolare il registry.
//
// Schema offspring entry:
//   {
//     unit_id:         string  (immutable, primary key)
//     lineage_id:      string  (hash combined parents da Sprint C; root may share)
//     parents:         [string, string] | []  (root units = [])
//     generation:      number  (0 = root founder, 1 = first offspring, ...)
//     born_at_session: string | null
//     born_at_biome:   string | null
//   }
//
// Tribe = group con >= TRIBE_MIN_MEMBERS (3) units stesso lineage_id.
// Lone wolf = unit con <3 lineage members → getTribeForUnit returns null.
//
// In-memory registry: cross-session persistence non goal in Sprint D.
// Future: migrate to Prisma quando model `Lineage`+`Offspring` shipped.

const TRIBE_MIN_MEMBERS = 3;

// Shared registry (process-scoped). Sprint C deve invocare recordOffspring()
// dopo ogni mating successo per popolare il grafo.
const _offspringRegistry = new Map(); // unit_id → entry
const LINEAGE_REGISTRY_MAX_PER_CAMPAIGN = 1000; // FIFO cap per campaign (anti-unbounded-growth)

/**
 * Resetta lo store di lignaggio. Solo per test.
 * @internal
 */
function _resetLineageRegistry() {
  _offspringRegistry.clear();
}

/**
 * Registra un'unità nel grafo di lignaggio.
 *
 * Idempotent su unit_id (overwrite). Sprint C → chiamare dopo ogni successo
 * di rollMating per ogni offspring. Anche root units (parents = []) possono
 * essere registrati come founder.
 *
 * @param {object} entry — schema descritto sopra
 * @returns {object} entry normalizzata
 */
function recordOffspring(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('recordOffspring: entry object required');
  }
  if (!entry.unit_id || typeof entry.unit_id !== 'string') {
    throw new TypeError('recordOffspring: entry.unit_id (string) required');
  }
  const parents = Array.isArray(entry.parents) ? entry.parents.filter(Boolean) : [];
  const normalized = {
    unit_id: entry.unit_id,
    lineage_id: entry.lineage_id || entry.unit_id, // fallback: unit_id stesso = solo lignaggio
    parents,
    generation: Number.isFinite(entry.generation) ? entry.generation : parents.length === 0 ? 0 : 1,
    born_at_session: entry.born_at_session || null,
    born_at_biome: entry.born_at_biome || null,
    epigenome: entry.epigenome && typeof entry.epigenome === 'object' ? entry.epigenome : null,
    campaign_id:
      typeof entry.campaign_id === 'string' && entry.campaign_id ? entry.campaign_id : null,
    created_at: Number.isFinite(entry.created_at) ? entry.created_at : Date.now(),
  };
  _offspringRegistry.set(normalized.unit_id, normalized);
  // Anti-unbounded-growth: cap entries per campaign, evict oldest by created_at.
  if (normalized.campaign_id) {
    const sameCampaign = [];
    for (const e of _offspringRegistry.values()) {
      if (e.campaign_id === normalized.campaign_id) sameCampaign.push(e);
    }
    if (sameCampaign.length > LINEAGE_REGISTRY_MAX_PER_CAMPAIGN) {
      sameCampaign.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
      const evict = sameCampaign.length - LINEAGE_REGISTRY_MAX_PER_CAMPAIGN;
      for (let i = 0; i < evict; i++) _offspringRegistry.delete(sameCampaign[i].unit_id);
    }
  }
  return normalized;
}

/**
 * Ritorna la catena di lignaggio per un dato lineage_id.
 *
 * Output: array di units ordinato per `generation` ascending (root → leaves).
 * Tie-break: insertion order preservato (Map iteration).
 *
 * @param {string} lineageId
 * @returns {Array<object>} — units con quel lineage_id, ordinati per generation
 */
function _registryEntries(campaignId) {
  const out = [];
  for (const e of _offspringRegistry.values()) {
    if (!campaignId || e.campaign_id === campaignId) out.push(e);
  }
  return out;
}

function getLineageChain(lineageId, campaignId) {
  if (!lineageId) return [];
  const members = [];
  for (const entry of _registryEntries(campaignId)) {
    if (entry.lineage_id === lineageId) members.push(entry);
  }
  members.sort((a, b) => (a.generation ?? 0) - (b.generation ?? 0));
  return members;
}

/**
 * Ritorna la lista delle tribe emergent.
 *
 * Tribe = lineage_id con >= TRIBE_MIN_MEMBERS units. Per ogni tribe ritorna:
 *   - tribe_id (= lineage_id)
 *   - members_count
 *   - primary_biome (most common biome among members; null se tutti null)
 *   - oldest_generation (max generation reached in chain)
 *   - lineage_root_unit_id (founder = unit con parents.length === 0;
 *     fallback unit con generation minima)
 *
 * @returns {Array<object>}
 */
function getTribesEmergent(opts = {}) {
  const _speciesMean = opts.speciesMean || { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const _divThreshold = Number.isFinite(opts.divergenceThreshold) ? opts.divergenceThreshold : 0.15;
  const campaignId = opts.campaignId || null;
  // Group by lineage_id.
  const byLineage = new Map();
  for (const entry of _registryEntries(campaignId)) {
    const lid = entry.lineage_id;
    if (!byLineage.has(lid)) byLineage.set(lid, []);
    byLineage.get(lid).push(entry);
  }

  const tribes = [];
  for (const [lineageId, members] of byLineage.entries()) {
    if (members.length < TRIBE_MIN_MEMBERS) continue;

    // primary_biome = most common biome among members.
    const biomeCounts = new Map();
    for (const m of members) {
      if (!m.born_at_biome) continue;
      biomeCounts.set(m.born_at_biome, (biomeCounts.get(m.born_at_biome) || 0) + 1);
    }
    let primaryBiome = null;
    let primaryCount = 0;
    for (const [biome, count] of biomeCounts.entries()) {
      if (count > primaryCount) {
        primaryBiome = biome;
        primaryCount = count;
      }
    }

    // oldest_generation = max generation index (tribe maturity proxy).
    let oldestGeneration = 0;
    for (const m of members) {
      if ((m.generation ?? 0) > oldestGeneration) oldestGeneration = m.generation ?? 0;
    }

    // lineage_root_unit_id = founder (parents=[]) o unit con generation min.
    let root = members.find((m) => Array.isArray(m.parents) && m.parents.length === 0);
    if (!root) {
      root = members.reduce(
        (acc, m) => ((m.generation ?? 0) < (acc.generation ?? 0) ? m : acc),
        members[0],
      );
    }

    // Fase-3 -- emergent speciation by epigenetic divergence. Tribe mean
    // epigenome vs species mean; beyond threshold = distinct "specie-forma".
    const tribeMean = computeSpeciesMean(members);
    let epigeneticDivergence = 0;
    for (const axis of ['utility', 'liberty', 'morality']) {
      const tv = Number.isFinite(tribeMean[axis]) ? tribeMean[axis] : 0.5;
      const sv = Number.isFinite(_speciesMean[axis]) ? _speciesMean[axis] : 0.5;
      epigeneticDivergence = Math.max(epigeneticDivergence, Math.abs(tv - sv));
    }
    epigeneticDivergence = Math.round(epigeneticDivergence * 1000) / 1000;

    tribes.push({
      tribe_id: lineageId,
      members_count: members.length,
      primary_biome: primaryBiome,
      oldest_generation: oldestGeneration,
      lineage_root_unit_id: root?.unit_id ?? null,
      epigenetic_divergence: epigeneticDivergence,
      is_distinct_form: epigeneticDivergence >= _divThreshold,
    });
  }

  // Sort: most members first (descending), tie-break alphabetic tribe_id.
  tribes.sort((a, b) => {
    if (b.members_count !== a.members_count) return b.members_count - a.members_count;
    return a.tribe_id.localeCompare(b.tribe_id);
  });
  return tribes;
}

/**
 * Ritorna la tribe info per un dato unit_id.
 *
 * Lone wolf (unit non in registry, o tribe con <3 membri) → null.
 *
 * @param {string} unitId
 * @returns {object|null}
 */
function getTribeForUnit(unitId) {
  if (!unitId) return null;
  const entry = _offspringRegistry.get(unitId);
  if (!entry) return null;
  const tribes = getTribesEmergent({ campaignId: entry.campaign_id || null });
  return tribes.find((t) => t.tribe_id === entry.lineage_id) || null;
}

/**
 * Snapshot del registry. Read-only utility per debug/UI.
 *
 * @returns {Array<object>}
 */
function listLineageEntries(campaignId) {
  return _registryEntries(campaignId).map((e) => ({ ...e, parents: [...(e.parents || [])] }));
}

module.exports = {
  createMetaTracker,
  createMetaStore,
  prismaSupportsMeta,
  RECRUIT_AFFINITY_MIN,
  RECRUIT_TRUST_MIN,
  MATING_TRUST_MIN,
  AFFINITY_MIN,
  AFFINITY_MAX,
  TRUST_MIN,
  TRUST_MAX,
  MATING_THRESHOLD,
  // Sprint D — lineage + tribe emergent
  TRIBE_MIN_MEMBERS,
  LINEAGE_REGISTRY_MAX_PER_CAMPAIGN,
  recordOffspring,
  getLineageChain,
  getTribesEmergent,
  getTribeForUnit,
  listLineageEntries,
  _resetLineageRegistry,
};

// ─── Sprint C — additive exports (offspring roll + tier visual feedback) ──
// Appended after the canonical export block so existing keys aren't shadowed.
// Sprint D and other parallel sprints can also use this additive pattern.
module.exports.makeLineageId = makeLineageId;
module.exports.inheritGeneSlots = inheritGeneSlots;
module.exports.pickEnvironmentalMutation = pickEnvironmentalMutation;
module.exports.computeOffspringTier = computeOffspringTier;
module.exports.rollMatingOffspring = rollMatingOffspring;
module.exports.applyHybridFusion = applyHybridFusion;
module.exports.computeOffspringComplexity = computeOffspringComplexity;
module.exports.TIER_NO_GLOW = TIER_NO_GLOW;
module.exports.TIER_GOLD = TIER_GOLD;
module.exports.TIER_RAINBOW = TIER_RAINBOW;
module.exports.TIER_VISUAL_HINTS = TIER_VISUAL_HINTS;

// K-04 (SPEC-K) — server-side recruit/mating gate eval for /npg enrichment.
module.exports.evalNpcGates = evalNpcGates;
