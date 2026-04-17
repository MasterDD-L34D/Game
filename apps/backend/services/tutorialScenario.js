// Scenari giocabili tutorial — hardcoded unit factory
//
// Il session engine non ha un encounter loader runtime. Questo modulo
// colma il gap per playtest end-to-end.
//
// Scenari attuali:
//   enc_tutorial_01 — "Primi Passi nella Savana" (2v2, range, ~8/10 win)
//   enc_tutorial_02 — "Pattuglia Asimmetrica" (2v3, mix tank+skirmisher)
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

const TUTORIAL_SCENARIO_02 = {
  id: 'enc_tutorial_02',
  name: 'Pattuglia Asimmetrica',
  biome_id: 'savana',
  difficulty_rating: 2,
  estimated_turns: 8,
  grid_size: 6,
  objective: 'elimination',
  objective_text: 'Sconfiggi tutta la pattuglia: due predoni e un cacciatore corazzato.',
  briefing_pre:
    'La pattuglia nomade questa volta include un cacciatore con corazza pesante. Coordina scout e tank: il danno asimmetrico premia chi sceglie il bersaglio giusto.',
  briefing_post: "La pattuglia è dissolta. Il cacciatore non e' bastato a tenerli insieme.",
};

const TUTORIAL_SCENARIO_03 = {
  id: 'enc_tutorial_03',
  name: 'Pozzo della Caverna Risonante',
  biome_id: 'caverna_risonante',
  difficulty_rating: 3,
  estimated_turns: 10,
  grid_size: 6,
  objective: 'elimination',
  objective_text:
    'Elimina i guardiani sotterranei. Attento alle fumarole tossiche: tile (2,2) e (3,3) infliggono danno a fine turno se occupate.',
  briefing_pre:
    'Una caverna risonante con due fumarole attive. Le creature locali resistono al gas; voi no. Posizionate con cura e usate combo per finire in fretta.',
  briefing_post: 'I guardiani sono caduti. Il riverbero della caverna si placa.',
  // Hazard tiles: lista coordinate dove unita' subisce danno a fine turno.
  // Letti da applyHazardDamage in handleTurnEndViaRound (futuro). Per ora
  // metadata visibile da /api/tutorial/enc_tutorial_03 per HUD/UI.
  hazard_tiles: [
    { x: 2, y: 2, damage: 1, type: 'fumarole_tossica' },
    { x: 3, y: 3, damage: 1, type: 'fumarole_tossica' },
  ],
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
    // v0.3 balance patch: mod 1→2, dc 11→12 — reduces win rate from 10/10 to ~8/10 (target band)
    {
      id: 'e_nomad_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 2,
      mod: 2,
      dc: 12,
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
      mod: 2,
      dc: 12,
      guardia: 0,
      position: { x: 3, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];
}

// enc_tutorial_02: introduce concetto di target priority asimmetrico.
// Player ha sempre 2 unita' (scout + tank). Nemici: 2 skirmisher + 1 cacciatore
// corazzato (alto HP, alto DC, danno medio). Scout deve concentrarsi sui
// fragili, tank tiene il cacciatore. Posizioni leggermente piu' larghe per
// dare scelta tattica.
function buildTutorialUnits02() {
  return [
    // Player units (stessi del tutorial 01)
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
    // 2 skirmisher fragili (target prioritario per scout)
    {
      id: 'e_nomad_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 2,
      mod: 2,
      dc: 12,
      guardia: 0,
      position: { x: 4, y: 1 },
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
      mod: 2,
      dc: 12,
      guardia: 0,
      position: { x: 4, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    // 1 cacciatore corazzato (target ideale per tank)
    // v0.2 patch: hp 8→6, dc 14→13, guardia 1→0 — target ~60-70% win rate (diff 2/5)
    {
      id: 'e_hunter',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: [],
      hp: 6,
      ap: 2,
      mod: 2,
      dc: 13,
      guardia: 0,
      position: { x: 3, y: 3 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];
}

// enc_tutorial_03: caverna risonante con hazard tiles (fumarole tossiche).
// Difficulty 3/5. Player vs 2 guardiani caverna. I tile hazard sono
// metadata: applicare danno e' wiring futuro nel turn/end handler.
function buildTutorialUnits03() {
  return [
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
      position: { x: 1, y: 1 },
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
      position: { x: 1, y: 4 },
      controlled_by: 'player',
      facing: 'E',
    },
    // Guardiani caverna: stat tier 3, alta DC, alto HP.
    // Guardiani caverna posizionati piu' avanti per ridurre tempo di approach.
    // v0.2 tuning: x=4→3, hp 5, dc 12.
    {
      id: 'e_guardiano_1',
      species: 'guardiano_caverna',
      job: 'vanguard',
      traits: [],
      hp: 5,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 2,
      position: { x: 2, y: 2 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_guardiano_2',
      species: 'guardiano_caverna',
      job: 'vanguard',
      traits: [],
      hp: 5,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 2,
      position: { x: 3, y: 3 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];
}

module.exports = {
  TUTORIAL_SCENARIO,
  TUTORIAL_SCENARIO_02,
  TUTORIAL_SCENARIO_03,
  buildTutorialUnits,
  buildTutorialUnits02,
  buildTutorialUnits03,
};
