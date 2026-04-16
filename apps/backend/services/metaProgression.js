// D1+D2: Meta progression — recruit, trust, mating, nest.
//
// Gestisce NPC affinity/trust tracking + mating outcome.
// State in-memory (Map npcId → { affinity, trust, ... }).
// Gate: recruit requires affinity >= 0 AND trust >= 2.
// Gate: mating requires trust >= 3 + nest requirements.
//
// Fonte: Final Design Freeze v0.9 §20-21

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
    const roll = Math.floor(rng() * 20) + 1; // d20

    // MBTI compatibility modifier
    let modifier = 0;
    const playerType = partyMember.mbti_type || 'NEUTRA';
    const npcType = npc.mbti_type || 'NEUTRA';
    const compat = compatTable[playerType];
    if (compat) {
      if ((compat.likes || []).includes(npcType)) modifier += 3;
      else if ((compat.dislikes || []).includes(npcType)) modifier -= 3;
    }

    // Trust bonus
    modifier += npc.trust - MATING_TRUST_MIN;

    const total = roll + modifier;
    const threshold = 12; // DC 12 base
    const success = total >= threshold;

    if (success) {
      npc.mated = true;
      // Offspring trait combination: pick 2 from each parent
      const parentTraits = partyMember.trait_ids || [];
      const npcTraits = npc.trait_ids || [];
      const allTraits = [...new Set([...parentTraits, ...npcTraits])];
      const offspringCount = Math.min(3, allTraits.length);
      const offspringTraits = [];
      const available = [...allTraits];
      for (let i = 0; i < offspringCount && available.length > 0; i++) {
        const idx = Math.floor(rng() * available.length);
        offspringTraits.push(available.splice(idx, 1)[0]);
      }

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

    // Fail: cooldown 1 mission
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

module.exports = {
  createMetaTracker,
  RECRUIT_AFFINITY_MIN,
  RECRUIT_TRUST_MIN,
  MATING_TRUST_MIN,
  AFFINITY_MIN,
  AFFINITY_MAX,
  TRUST_MIN,
  TRUST_MAX,
};
