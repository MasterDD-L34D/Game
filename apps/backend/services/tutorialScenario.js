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
  // M7-#2 Phase C: tutorial class (multiplier 1.0x, no enrage)
  encounter_class: 'tutorial',
  difficulty_rating: 1,
  estimated_turns: 6,
  grid_size: 6,
  objective: { type: 'elimination' },
  objective_text: 'Sconfiggi tutte le unità nemiche.',
  briefing_pre:
    'Due predoni nomadi hanno preso posizione nella savana. Avvicinati con cautela e eliminali.',
  briefing_post: 'Le sentinelle sono cadute. La via è libera — per ora.',
  sistema_pressure_start: 0, // Calm: 1 intent/round, tutorial gentle
};

const TUTORIAL_SCENARIO_02 = {
  id: 'enc_tutorial_02',
  name: 'Pattuglia Asimmetrica',
  biome_id: 'savana',
  // M7-#2 Phase C: tutorial class (multiplier 1.0x, no enrage)
  encounter_class: 'tutorial',
  difficulty_rating: 2,
  estimated_turns: 8,
  grid_size: 6,
  objective: { type: 'elimination' },
  objective_text: 'Sconfiggi tutta la pattuglia: due predoni e un cacciatore corazzato.',
  briefing_pre:
    'La pattuglia nomade questa volta include un cacciatore con corazza pesante. Coordina scout e tank: il danno asimmetrico premia chi sceglie il bersaglio giusto.',
  briefing_post: "La pattuglia è dissolta. Il cacciatore non e' bastato a tenerli insieme.",
  sistema_pressure_start: 25, // Alert: 2 intents/round
};

const TUTORIAL_SCENARIO_03 = {
  id: 'enc_tutorial_03',
  name: 'Pozzo della Caverna Risonante',
  biome_id: 'caverna_risonante',
  // M7-#2 Phase C: tutorial_advanced class (multiplier 1.1x + enrage 25% HP)
  // Hazard tiles + guardiani tank → skill check tier-3
  encounter_class: 'tutorial_advanced',
  difficulty_rating: 3,
  estimated_turns: 10,
  grid_size: 6,
  objective: { type: 'elimination' },
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
  sistema_pressure_start: 50, // Escalated: 3 intents/round
};

const TUTORIAL_SCENARIO_05 = {
  id: 'enc_tutorial_05',
  name: "Solo contro l'Apex",
  biome_id: 'rovine_planari',
  // M7-#2 Phase C: boss class (multiplier 1.6x + enrage 50% HP) — apex solo fight
  encounter_class: 'boss',
  difficulty_rating: 5,
  estimated_turns: 14,
  grid_size: 6,
  objective: { type: 'elimination' },
  objective_text:
    "Sconfiggi l'apex predatore. Singolo nemico con HP altissimo, attacchi multipli e bonus su critico.",
  briefing_pre:
    'Le rovine planari celano un Apex: 1v2 a vostro favore, ma il suo HP e i bonus crit possono ribaltare ogni round. Cooperate o cadrete uno alla volta.',
  briefing_post: "L'Apex si dissolve nelle rovine. Avete fatto la storia.",
  hazard_tiles: [],
  sistema_pressure_start: 95, // Apex: 4 intents/round, BOSS pressione massima
};

const TUTORIAL_SCENARIO_04 = {
  id: 'enc_tutorial_04',
  name: 'Pozza Acida del Bosco',
  biome_id: 'foresta_acida',
  // M7-#2 Phase C: tutorial_advanced class (multiplier 1.1x + enrage 25% HP)
  // Bleeding + hazard + 2v3 → difficulty gap prima del boss (tutorial_05)
  encounter_class: 'tutorial_advanced',
  difficulty_rating: 4,
  estimated_turns: 12,
  grid_size: 6,
  objective: { type: 'elimination' },
  objective_text:
    'Sconfiggi i 3 guardiani della pozza. Attento al lanciere: il suo morso causa emorragia.',
  briefing_pre:
    'La pozza acida nasconde 3 guardiani: 2 corrieri rapidi e un lanciere con denti seghettati. Il bleeding accumula danno turno per turno: prioritizza il lanciere o tieni HP alto.',
  briefing_post: 'La pozza si calma. I corpi dei guardiani si dissolvono nel liquido.',
  hazard_tiles: [
    { x: 2, y: 1, damage: 1, type: 'pozza_acida' },
    { x: 3, y: 4, damage: 1, type: 'pozza_acida' },
    { x: 2, y: 3, damage: 1, type: 'pozza_acida' },
  ],
  sistema_pressure_start: 75, // Critical: 3 intents/round, swarm unlocked
};

function buildTutorialUnits() {
  return [
    // --- Player units ---
    // NOTE: tutorial_01 eccezione canonical: ap=3 (vs SoT ap_max=2) per
    // onboarding easy. Tutorial 02-05 allineati a ap=2. Vedi
    // docs/core/11-REGOLE_D20_TV.md §"AP budget canonico".
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
    // v0.8 final: hp asimmetrico 3/5 (scout 3 HP, tank 5 HP), mod 2.
    // Calibrazione iter:
    //   iter0 (hp 3/3 mod 2): 100%
    //   iter1 (hp 4/4 mod 2): 60% — troppo duro
    //   iter2 (hp 3/4 mod 2): mean 5x = 94%
    //   iter6 (hp 3/5 mod 2): mean 5x = 94% (accept)
    //   iter7 (hp 3/4 mod 3): mean 5x = 94% (no effect)
    // Conclusione: tutorial 01 è "primi passi" — band 90-95% accettabile come first-encounter-easy.
    // HP asimmetrico 3/5 mantenuto per distinzione narrativa scout/tank.
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
      hp: 5,
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
    // Player units (stessi del tutorial 01 ma ap=2 SoT canonical; 01 resta
    // ap=3 come "tutorial_easy" eccezione per onboarding).
    {
      id: 'p_scout',
      species: 'dune_stalker',
      job: 'skirmisher',
      traits: ['zampe_a_molla'],
      hp: 10,
      ap: 2,
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
      ap: 2,
      mod: 2,
      dc: 13,
      guardia: 1,
      position: { x: 1, y: 3 },
      controlled_by: 'player',
      facing: 'E',
    },
    // 2 skirmisher fragili (target prioritario per scout)
    // v0.9 final: nomads hp 3 (simmetrico) mod 3 (buff offense).
    // Calibrazione iter:
    //   iter0 (hp 3/3 mod 2, hunter 6): mean 100% → troppo facile
    //   iter1 (hp 4/4 mod 2, hunter 8): mean 40% → troppo duro
    //   iter5 (hp 3/3 mod 2, hunter 7): mean 10x = 50% → sotto band 60-70%
    //   iter_final (hp 3/3 mod 3, hunter 6): target mean 60-70%. Buff enemy offense,
    //     NON HP tank — player beve più damage, ma enemy muore rapido (= tutorial skill check).
    {
      id: 'e_nomad_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 2,
      mod: 3,
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
      mod: 3,
      dc: 12,
      guardia: 0,
      position: { x: 4, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    // 1 cacciatore corazzato (target ideale per tank)
    // v0.5 final: hp 6 (revert iter5 buff). iter0 (6): 100% | iter1 (8): 40% | iter5 (7): 50% aggregate.
    // Calibrazione col mod 3 nomadi: hunter hp 6 basta come offensive threat (cumulativo col buff nomadi).
    // v0.6 P6 human-balance: ai_profile=aggressive → Utility AI attivo (pressure umana rivelava SIS passivo).
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
      ai_profile: 'aggressive',
      facing: 'W',
    },
  ];
}

// enc_tutorial_03: caverna risonante con hazard tiles (fumarole tossiche).
// Difficulty 3/5. Player vs 2 guardiani caverna. I tile hazard sono
// metadata: applicare danno e' wiring futuro nel turn/end handler.
function buildTutorialUnits03() {
  return [
    // Player units — ap=2 SoT canonical (da tutorial 02 in poi).
    {
      id: 'p_scout',
      species: 'dune_stalker',
      job: 'skirmisher',
      traits: ['zampe_a_molla'],
      hp: 10,
      ap: 2,
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
      ap: 2,
      mod: 2,
      dc: 13,
      guardia: 1,
      position: { x: 1, y: 4 },
      controlled_by: 'player',
      facing: 'E',
    },
    // Guardiani caverna: stat tier 3, alta DC, alto HP.
    // v0.3 tuning: hp 5→4 — baseline 3/10 con 7 timeout, target 5-6/10. Ridotto HP per chiudere in tempo.
    // Posizioni invariate (x=2,y=2 e x=3,y=3) — vicino fumarole per forzare pathing.
    // v0.4 P6 human-balance: ai_profile=aggressive → Utility AI pressure tier Calm→Apex.
    {
      id: 'e_guardiano_1',
      species: 'guardiano_caverna',
      job: 'vanguard',
      traits: [],
      hp: 4,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 2,
      position: { x: 2, y: 2 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
    {
      id: 'e_guardiano_2',
      species: 'guardiano_caverna',
      job: 'vanguard',
      traits: [],
      hp: 4,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 2,
      position: { x: 3, y: 3 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      // M14-C: facing nord → attacchi da W/E sono flank (+15% dmg).
      // Elevation lasciato 0: tutorial 03 band win 50% è sensibile a +30%.
      facing: 'N',
    },
  ];
}

// enc_tutorial_04: foresta acida diff 4/5. 2v3 con un lanciere bleeding
// (trait denti_seghettati) + 3 hazard tiles distribuiti.
function buildTutorialUnits04() {
  return [
    // Player units — ap=2 SoT canonical.
    {
      id: 'p_scout',
      species: 'dune_stalker',
      job: 'skirmisher',
      traits: ['zampe_a_molla'],
      hp: 10,
      ap: 2,
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
      ap: 2,
      mod: 2,
      dc: 13,
      guardia: 1,
      position: { x: 1, y: 4 },
      controlled_by: 'player',
      facing: 'E',
    },
    // Lanciere bleeding: priority target (denti_seghettati causa emorragia
    // su hit). Player deve sceglire se ucciderlo subito o tankare il bleed.
    // v0.3 final (pre ap=2): hp 6 mod 3 → 20% win (sotto band 30-45%).
    // v0.5 post ap=2 (M3 validation): hp 6→5, compensare 33% meno AP player
    //   per riportare in band. Calibrazione iter: iter0 (hp 5 mod 3) 60% @ ap=3;
    //   @ ap=2 hp 5 atteso ~35-45% (band).
    // v0.4 P6 human-balance: ai_profile=aggressive → Utility AI per priority target behavior.
    {
      id: 'e_lanciere',
      species: 'guardiano_pozza',
      job: 'skirmisher',
      traits: ['denti_seghettati'],
      hp: 5,
      ap: 2,
      mod: 3,
      dc: 12,
      guardia: 0,
      attack_range: 2,
      position: { x: 3, y: 2 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      // M14-C: facing sud → player da W flanca, da nord attacca rear (con backstab).
      facing: 'S',
    },
    // Corriere 1: rapido ma fragile (hp 4→3 post ap=2).
    {
      id: 'e_corriere_1',
      species: 'guardiano_pozza',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 3,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 2,
      position: { x: 4, y: 0 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    // Corriere 2: stesso pattern (hp 4→3 post ap=2).
    {
      id: 'e_corriere_2',
      species: 'guardiano_pozza',
      job: 'skirmisher',
      traits: [],
      hp: 3,
      ap: 3,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 2,
      position: { x: 4, y: 5 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];
}

// enc_tutorial_05: BOSS FIGHT 1v2 contro Apex predator. Singolo enemy
// con HP altissimo, ferocia (crit kill resets), martello_osseo (bonus crit).
function buildTutorialUnits05() {
  return [
    // Player units — ap=2 SoT canonical anche per BOSS (asimmetria solo
    // su enemy stats, non via budget turn).
    {
      id: 'p_scout',
      species: 'dune_stalker',
      job: 'skirmisher',
      traits: ['zampe_a_molla'],
      hp: 12,
      ap: 2,
      mod: 4,
      dc: 13,
      guardia: 1,
      position: { x: 0, y: 2 },
      controlled_by: 'player',
      facing: 'E',
    },
    {
      id: 'p_tank',
      species: 'dune_stalker',
      job: 'vanguard',
      traits: ['pelle_elastomera'],
      hp: 14,
      ap: 2,
      mod: 3,
      dc: 14,
      guardia: 2,
      position: { x: 0, y: 3 },
      controlled_by: 'player',
      facing: 'E',
    },
    // BOSS: HP altissimo, mod 3, dc 14, traits offensivi.
    // v0.3 (pre ap=2): hp 9 → 40% win (band 15-30%, leggermente sopra).
    // v0.5 post ap=2 M3: hp 9→11 (+22%). Player ap ridotto da 3→2 rompe
    //   bilancio precedente — compensazione minima mantenendo band boss.
    // v0.4 P6 human-balance: ai_profile=aggressive → Utility AI mandatory per boss (coordina mosse).
    {
      id: 'e_apex',
      species: 'apex_predatore',
      job: 'vanguard',
      traits: ['martello_osseo', 'ferocia'],
      hp: 11,
      ap: 3,
      mod: 3,
      dc: 13,
      guardia: 1,
      attack_range: 2,
      position: { x: 5, y: 2 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
      // M14-C: elevation non aggiunta. Test N=10 mostrava 0/10 win (vs band 10-30%);
      // scenario già tarato ap=2 → elevation +30% boss invalida curve. Deferred
      // a iterazione post-playtest con HP/mod re-tune.
    },
  ];
}

module.exports = {
  TUTORIAL_SCENARIO,
  TUTORIAL_SCENARIO_02,
  TUTORIAL_SCENARIO_03,
  TUTORIAL_SCENARIO_04,
  TUTORIAL_SCENARIO_05,
  buildTutorialUnits,
  buildTutorialUnits02,
  buildTutorialUnits03,
  buildTutorialUnits04,
  buildTutorialUnits05,
};
