'use strict';
// Greedy Nido meta policy. MVP: recruit one NPC per cleared chapter.
//
// NPC model (routes/meta.js + metaProgression.js): getOrCreate -> ANY id is
// recruitable; `affinity_at_recruit >= 1` bypasses the canonical gate
// (affinity>=0 & trust>=2), codifying the "defeat-then-recruit" emergent flow
// (meta.js:172-197). Grounded: wesnoth recruit/retain economy
// (docs/guide/games-source-index.md) + the §8 decision method (manuali GM:
// allocare la "scorta" dove massimizza il valore-per-soglia).
//
// fase-1b-3a: each recruit now carries a SPECIES so the runner can resolve faithful
// combat stats (recruit-resolver.js -> ecologyCombatAdapter.deriveCombatStats) and
// the recruited unit actually fights the next mission. Species cycle deterministically
// through the badlands canonical pool (5 real species, diverse role_class).
//
// fase-1b-3b: chooseCourtship + chooseMating exercise the Nido ECONOMY (earn
// affinity/trust -> canonical recruit gate, NOT the bypass) and BREEDING (mating
// roll -> offspring). These run on the default meta store (the affinity/trust
// endpoints ignore campaign_id), separate from the campaign-scoped combat-recruit
// above, so the courtship NPCs prove the economy/breeding seams without disturbing
// the unit that actually fights.

const RECRUIT_SPECIES_POOL = [
  'dune-stalker', // T3 predatore_terziario_apex -> APEX
  'nano-rust-bloom', // T3 minaccia_microbica -> HAZARD
  'ferrocolonia-magnetotattica', // T2 predatore_regolatore_simbionte -> PREDATOR
  'sand-burrower', // T1 erbivoro_primario -> PREY
  'rust-scavenger', // T1 ingegneri_ecosistema -> SUPPORT
];

function chooseRecruits({ step } = {}) {
  const speciesId = RECRUIT_SPECIES_POOL[(step - 1) % RECRUIT_SPECIES_POOL.length];
  return [{ npcId: `recruit_s${step}`, speciesId }];
}

// Courtship NPCs live on the DEFAULT meta store (the affinity/trust endpoints ignore
// campaign_id), so their ids MUST be scoped per run -- otherwise a second full-loop sim
// on the same process finds them already-recruited (gate_not_met), breaking repeated
// playtest batches (Codex #2566 P2). runId = the per-run campaign id (crypto.randomUUID).
function courtshipId(runId, step) {
  return runId ? `courtship_${runId}_s${step}` : `courtship_s${step}`;
}

// One courtship NPC per chapter. Deltas earn the canonical recruit gate
// (metaProgression: RECRUIT_AFFINITY_MIN=0, RECRUIT_TRUST_MIN=2) so the AI can
// recruit WITHOUT the affinity_at_recruit bypass -> proves the affinity economy.
function chooseCourtship({ step, runId } = {}) {
  const speciesId = RECRUIT_SPECIES_POOL[(step - 1) % RECRUIT_SPECIES_POOL.length];
  return { npcId: courtshipId(runId, step), speciesId, affinityDelta: 1, trustDelta: 2 };
}

// Mating pair (squad-mate offspring roll). Needs two courtship NPCs, so it starts from
// step 2 and pairs the previous + current courtship NPC (same runId scope) ->
// deterministic, distinct parents, accumulating offspring.
function chooseMating({ step, runId } = {}) {
  if (!(step >= 2)) return null;
  return { parentA: courtshipId(runId, step - 1), parentB: courtshipId(runId, step) };
}

module.exports = { chooseRecruits, chooseCourtship, chooseMating, RECRUIT_SPECIES_POOL };
