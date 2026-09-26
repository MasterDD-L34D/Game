'use strict';
// fase-2c mbtiPolicy: a pluggable meta-policy whose Nido choices are guided by MBTI
// temperament -> lets the full-loop band-batch test P4 (temperament) in the meta-loop.
// Same contract as greedy-policy (chooseRecruits / chooseCourtship / chooseMating); the
// divergence is WHICH species each temperament prioritises: the Keirsey group maps to a
// role_class ordering of the canonical badlands recruit pool. Grounded: Triangle Strategy
// recruit-gating + Disco Elysium micro-reactivity (docs/guide/games-source-index.md).
// Deterministic, no RNG -> two runs of the same type make identical choices.

const { RECRUIT_SPECIES_POOL, courtshipId } = require('./greedy-policy');
// Canonical pool tagged by role_class -- shared with meta-band-aggregator (roster
// composition) so both agree on ecological roles (single source).
const { SPECIES_ROLE } = require('./species-roles');

// Keirsey temperament -> role_class priority. Each temperament weights the roster
// differently: Analyst (NT) power-first, Diplomat (NF) cohesion-first, Sentinel (SJ)
// stability-first, Explorer (SP) variety/opportunistic-first.
const TEMPERAMENT_PRIORITY = {
  NT: ['APEX', 'PREDATOR', 'HAZARD', 'SUPPORT', 'PREY'],
  NF: ['SUPPORT', 'PREY', 'PREDATOR', 'APEX', 'HAZARD'],
  SJ: ['SUPPORT', 'PREDATOR', 'APEX', 'PREY', 'HAZARD'],
  SP: ['HAZARD', 'PREY', 'APEX', 'SUPPORT', 'PREDATOR'],
};

// fase-2c routing: Keirsey temperament -> meta-network edge-type preference. Each
// temperament favours a different traversal STYLE at a multi-candidate branch -> the route
// becomes policy-sensitive (P4) without changing WHICH nodes are eligible. NT/SJ favour the
// direct corridor; NF the ecological trophic_spillover; SP the opportunistic seasonal_bridge.
const ROUTE_EDGE_PRIORITY = {
  NT: ['corridor', 'seasonal_bridge', 'trophic_spillover'],
  NF: ['trophic_spillover', 'corridor', 'seasonal_bridge'],
  SJ: ['corridor', 'trophic_spillover', 'seasonal_bridge'],
  SP: ['seasonal_bridge', 'trophic_spillover', 'corridor'],
};

// 4-letter MBTI -> Keirsey group. Malformed input falls back to NT (never throws).
function temperamentOf(mbti) {
  const t = String(mbti || '').toUpperCase();
  if (t[1] === 'N') return t[2] === 'F' ? 'NF' : 'NT';
  if (t[1] === 'S') return t[3] === 'P' ? 'SP' : 'SJ';
  return 'NT';
}

// Reorder the canonical pool by the temperament's role priority. Stable sort (V8): species
// with equal rank (e.g. an unknown role) keep their pool order.
function orderedPool(mbti) {
  const priority = TEMPERAMENT_PRIORITY[temperamentOf(mbti)];
  const rank = (sp) => {
    const idx = priority.indexOf(SPECIES_ROLE[sp]);
    return idx === -1 ? priority.length : idx;
  };
  return [...RECRUIT_SPECIES_POOL].sort((a, b) => rank(a) - rank(b));
}

// A well-formed MBTI type: [E/I][N/S][T/F][J/P].
const VALID_MBTI = /^[EI][NS][TF][JP]$/;

// Build a policy bound to one MBTI type. Implements the same seam as greedy-policy, so it
// drops into runFullLoop({ policy }) / applyNidoEconomy({ policy }) unchanged. A mistyped
// type is NORMALIZED to the default archetype (INTJ) so the recorded `.mbti` label always
// reflects the temperament actually played -- never a fake 'XXXX' in provenance/reports
// (Codex #2569 P2). orderedPool already falls back to NT for anything unrecognised.
function makeMbtiPolicy(mbtiType = 'INTJ') {
  const raw = String(mbtiType || 'INTJ').toUpperCase();
  const mbti = VALID_MBTI.test(raw) ? raw : 'INTJ';
  const pool = orderedPool(mbti);
  const speciesForStep = (step) => pool[(step - 1) % pool.length];
  return {
    mbti,
    chooseRecruits({ step } = {}) {
      return [{ npcId: `recruit_s${step}`, speciesId: speciesForStep(step) }];
    },
    // Routing pick: reorder the eligible candidates by this temperament's edge-type
    // preference, then take the first. A stable sort (V8) keeps selectNextNodes' weight-desc
    // order within an equal edge-type rank, so the choice stays deterministic.
    chooseRoute({ candidates } = {}) {
      if (!Array.isArray(candidates) || !candidates.length) return null;
      const priority = ROUTE_EDGE_PRIORITY[temperamentOf(mbti)];
      const rank = (c) => {
        const idx = priority.indexOf(c.edge_type);
        return idx === -1 ? priority.length : idx;
      };
      return [...candidates].sort((a, b) => rank(a) - rank(b))[0].node_id;
    },
    // Same gate-satisfying deltas as greedy (RECRUIT_AFFINITY_MIN=0, RECRUIT_TRUST_MIN=2);
    // temperament changes the courted SPECIES, not the gate, so the earned-recruit economy
    // stays exercised. runId scopes ids per run (Codex #2566 P2).
    chooseCourtship({ step, runId } = {}) {
      return {
        npcId: courtshipId(runId, step),
        speciesId: speciesForStep(step),
        affinityDelta: 1,
        trustDelta: 2,
      };
    },
    chooseMating({ step, runId } = {}) {
      if (!(step >= 2)) return null;
      return { parentA: courtshipId(runId, step - 1), parentB: courtshipId(runId, step) };
    },
  };
}

module.exports = { makeMbtiPolicy, temperamentOf, orderedPool, TEMPERAMENT_PRIORITY, SPECIES_ROLE };
