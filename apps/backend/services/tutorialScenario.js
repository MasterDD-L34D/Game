// Primo scenario giocabile: enc_tutorial_01 "Primi Passi nella Savana"
//
// Hardcoded unit factory — il session engine non ha un encounter loader
// runtime. Questo modulo colma il gap per il primo playtest end-to-end.
//
// Grid remappata da 8×8 (YAML) a 6×6 (GRID_SIZE costante).
// Terrain (heights, covers) ignorato — session engine non ha terrain system.
// AI profile "defensive" non mappato — AI usa policy default.

'use strict';

const TUTORIAL_SCENARIO = {
  id: 'enc_tutorial_01',
  name: 'Primi Passi nella Savana',
  biome_id: 'savana',
  difficulty_rating: 1,
  estimated_turns: 6,
  grid_size: 6,
  objective: 'elimination',
  objective_text: 'Sconfiggi tutte le unità nemiche.',
  briefing_pre:
    'Due predoni nomadi hanno preso posizione nella savana. Avvicinati con cautela e eliminali.',
  briefing_post: 'Le sentinelle sono cadute. La via è libera — per ora.',
};

function buildTutorialUnits() {
  return [
    // --- Player units ---
    {
      id: 'p_scout',
      species: 'dune_stalker',
      job: 'skirmisher',
      traits: ['zampe_a_molla'],
      hp: 10,
      ap: 3,
      mod: 3,
      dc: 12,
      guardia: 1,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      facing: 'E',
    },
    {
      id: 'p_tank',
      species: 'dune_stalker',
      job: 'vanguard',
      traits: ['pelle_elastomera'],
      hp: 12,
      ap: 3,
      mod: 2,
      dc: 13,
      guardia: 1,
      position: { x: 1, y: 3 },
      controlled_by: 'player',
      facing: 'E',
    },
    // --- Enemy units (predoni_nomadi, difficulty 1/5) ---
    // v0.2 balance patch: hp 5→3, mod 2→1 to reach ~80% tutorial win rate
    {
      id: 'e_nomad_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 2,
      mod: 1,
      dc: 11,
      guardia: 0,
      position: { x: 3, y: 2 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_nomad_2',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 2,
      mod: 1,
      dc: 11,
      guardia: 0,
      position: { x: 3, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];
}

module.exports = { TUTORIAL_SCENARIO, buildTutorialUnits };
