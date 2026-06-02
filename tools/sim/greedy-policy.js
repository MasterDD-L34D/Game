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
// Structured so chooseMatings / spendAffinity slot in next (fase-1b-3b) without
// touching the runner's call shape.

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

module.exports = { chooseRecruits, RECRUIT_SPECIES_POOL };
