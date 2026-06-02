'use strict';
// Greedy Nido meta policy (fase-1b-2). MVP: recruit one NPC per cleared chapter.
//
// NPC model (routes/meta.js + metaProgression.js): getOrCreate -> ANY id is
// recruitable; `affinity_at_recruit >= 1` bypasses the canonical gate
// (affinity>=0 & trust>=2), codifying the "defeat-then-recruit" emergent flow
// (meta.js:172-197). Grounded: wesnoth recruit/retain economy
// (docs/guide/games-source-index.md) + the §8 decision method (manuali GM:
// allocare la "scorta" dove massimizza il valore-per-soglia).
//
// Structured so chooseMatings / spendAffinity slot in next (fase-1b-3) without
// touching the runner's call shape.

function chooseRecruits({ step } = {}) {
  return [`recruit_s${step}`];
}

module.exports = { chooseRecruits };
