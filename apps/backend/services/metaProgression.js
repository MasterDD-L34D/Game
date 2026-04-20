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

/**
 * D1: Creates a meta progression tracker for a party/campaign.
 * In-memory state — persist externally if needed.
 */
function createMetaTracker() {
  const npcs = new Map();
  const nest = { level: 0, biome: null, requirements_met: false };

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

  function recruit(npcId) {
    if (!canRecruit(npcId)) return { success: false, reason: 'gate_not_met' };
    const npc = getOrCreate(npcId);
    npc.recruited = true;
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

  async function getOrCreateRelation(npcId) {
    if (!usePrisma) return null;
    const existing = await prisma.npcRelation.findUnique({
      where: { campaignId_npcId: { campaignId, npcId } },
    });
    if (existing) return existing;
    return prisma.npcRelation.create({
      data: { campaignId, npcId },
    });
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

  async function recruit(npcId) {
    if (!usePrisma) return fallback.recruit(npcId);
    const rel = await getOrCreateRelation(npcId);
    if (rel.affinity < RECRUIT_AFFINITY_MIN || rel.trust < RECRUIT_TRUST_MIN || rel.recruited) {
      return { success: false, reason: 'gate_not_met' };
    }
    const updated = await prisma.npcRelation.update({
      where: { id: rel.id },
      data: { recruited: true },
    });
    return { success: true, npc: toNpcShape(updated) };
  }

  async function getNestRecord() {
    if (!usePrisma) return null;
    const existing = await prisma.nestState.findUnique({ where: { campaignId } });
    if (existing) return existing;
    return prisma.nestState.create({
      data: { campaignId, level: 0, biome: null, requirementsMet: false },
    });
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
    // meta
    _mode: usePrisma ? 'prisma' : 'in-memory',
  };
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
};
