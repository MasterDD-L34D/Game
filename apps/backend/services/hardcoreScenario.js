// Hardcore encounter — ADR-2026-04-17 co-op 4→8 scaling.
//
// tutorial_06_hardcore: "Cattedrale dell'Apex"
// Party: 8 schierati (modulation full o quartet_hardcore), grid 10x10.
// Enemy: 1 BOSS apex + 2 elite hunter + 3 minion nomad = 6 (iter 2).
// Difficulty 6/5 (BOSS-focused + swarm). pressure_start 85 → Apex tier rapido.
//
// Calibration history:
//   iter 0 (PR #1534): boss hp 14, 2 elite hp 7, pressure 75. N=13 → 84.6% win.
//     Vedi docs/playtest/2026-04-18-hardcore-06-calibration.md.
//   iter 1 (PR #1542): boss hp 14→22 guardia +1, +1 elite (3 totali) hp 7→9.
//     N=30 validation → 96.7% win. PEGGIO. Damage spread non funziona vs 8p.
//     Vedi docs/playtest/2026-04-18-hardcore-06-iter1-validation.md.
//   iter 2 (this): rimuovi 3° elite, BOSS single-source massicciamente buffed
//     (hp 22→40 +82%, mod 4→5, guardia 3→4, range 2→3, +trait ondata_psichica
//     AOE on crit). Hazard tile damage 1→2. pressure 75→85. Damage CONCENTRATO.
//
// Target iter 2: win 30-50% (band larga, hardcore challenging non impossible).
// Iter 3 conditional (>60% ancora): aggiungi mini-boss + AP player ridotto round 1.

'use strict';

const HARDCORE_SCENARIO_06 = {
  id: 'enc_tutorial_06_hardcore',
  name: "Cattedrale dell'Apex",
  biome_id: 'rovine_planari',
  // M7-#2 Phase C: hardcore class (multiplier 1.4x + enrage 40% HP)
  encounter_class: 'hardcore',
  difficulty_rating: 6,
  estimated_turns: 16,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text:
    'Sconfiggi il BOSS Apex (hp 40, AOE psichica su crit) e i suoi 5 guardiani. Party 8 unità vs 6 nemici: il BOSS singolo regge focus-fire 8-way, attenti alle pozze instabili (2 dmg/turn).',
  briefing_pre:
    "Le rovine risuonano del passo pesante dell'Apex. L'aria vibra di pressione psichica — ogni colpo critico del BOSS sprigiona un'onda che ferisce a distanza. Due elite cacciatori difendono i fianchi, tre predoni bloccano i corridoi. Le pozze di rovine instabili (2 dmg/turn) sono trappole mortali. Party al completo (8 schierati): focus-fire totale sul BOSS, ma cura la posizione.",
  briefing_post:
    "L'Apex è caduto. La cattedrale si quieta. Avete dimostrato che 8 mani battono una mandibola.",
  hazard_tiles: [
    // Iter 2: damage 1→2 (player muore in 5-7 turn fermo su tile, era 10-14)
    { x: 4, y: 4, damage: 2, type: 'rovine_instabili' },
    { x: 5, y: 5, damage: 2, type: 'rovine_instabili' },
    { x: 3, y: 6, damage: 2, type: 'rovine_instabili' },
  ],
  // Iter 2 (post N=30 iter 1 → 96.7% win): pressure 75→85 per portare AI a
  // tier Apex piu rapidamente (4 intents/round). Vedi
  // docs/playtest/2026-04-18-hardcore-06-iter1-validation.md
  sistema_pressure_start: 85,
  recommended_modulation: 'full', // 8p × 1 PG → grid 10x10 auto
  // M13 P6 (ADR-2026-04-24 iter3) — mission timer Long War 2 pattern.
  // Hardcore 06 iter2 turtle deadlock (96.7% win) → timer forza commitment.
  // 15 round = ~45-60s real-time per engagement. Expire → escalate_pressure +30
  // (tier jump Critical→Apex finale) + spawn 2 extra enemy via pod activation.
  // Strategia: player che kite senza pressing loses win window.
  mission_timer: {
    enabled: true,
    turn_limit: 15,
    soft_warning_at: 3,
    on_expire: 'escalate_pressure',
    on_expire_payload: {
      pressure_delta: 30,
      extra_spawns: 2,
    },
  },
};

function buildHardcoreUnits06() {
  const players = [];
  // 8 player PG — mix specie/job per composition leggibile.
  // 2 skirmisher + 2 ranger (ranged dmg) + 2 vanguard (tank frontline) + 2 warden (support).
  const playerLayouts = [
    { id: 'p_scout_1', job: 'skirmisher', pos: [0, 2], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_2', job: 'ranger', pos: [0, 4], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_3', job: 'ranger', pos: [0, 6], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_4', job: 'skirmisher', pos: [0, 8], hp: 10, mod: 3, dc: 12 },
    { id: 'p_tank_1', job: 'vanguard', pos: [1, 3], hp: 14, mod: 2, dc: 14 },
    { id: 'p_tank_2', job: 'vanguard', pos: [1, 7], hp: 14, mod: 2, dc: 14 },
    { id: 'p_support_1', job: 'warden', pos: [1, 1], hp: 11, mod: 3, dc: 13 },
    { id: 'p_support_2', job: 'warden', pos: [1, 5], hp: 11, mod: 3, dc: 13 },
  ];
  // pcg-level-design-illuminator P0 emergence fix: species variety.
  // Pre: tutti i 8 player = `dune_stalker` (emergence 🔴 LOW).
  // Post: species-job pairing canonica → 3+ specie distinte in composition.
  // Ref: docs/qa/2026-04-26-pcg-level-design-illuminator-smoke.md
  const SPECIES_BY_JOB = {
    skirmisher: 'dune_stalker', // arid/agile baseline
    vanguard: 'umbroid_lurker', // shadow/tanky archetype
    ranger: 'echo_seer', // psionic scout
    warden: 'mud_sentinel', // defensive support
  };
  const TRAITS_BY_JOB = {
    skirmisher: ['zampe_a_molla'],
    vanguard: ['pelle_elastomera'],
    ranger: ['spore_psichiche_silenziate'],
    warden: ['struttura_elastica_amorfa'],
  };
  for (const pl of playerLayouts) {
    const species = SPECIES_BY_JOB[pl.job] || 'dune_stalker';
    players.push({
      id: pl.id,
      species,
      job: pl.job,
      traits: TRAITS_BY_JOB[pl.job] || ['zampe_a_molla'],
      hp: pl.hp,
      ap: 2, // SoT canonical
      mod: pl.mod,
      dc: pl.dc,
      guardia: pl.job === 'vanguard' ? 2 : 1,
      position: { x: pl.pos[0], y: pl.pos[1] },
      controlled_by: 'player',
      facing: 'E',
      elevation: 0, // ground floor, cathedral nave
    });
  }

  const enemies = [
    // BOSS Apex (center-right) — HP alto, crit bonus, attack_range 2.
    // Iter 0 (PR #1534): hp 14 mod 4 dc 14 guardia 2.
    // Iter 1 (PR #1542 N=13 → 84.6% win): hp 14→22, guardia 2→3, +1 elite.
    //   N=30 validation → 96.7% win. PEGGIO. Damage spread su 4 target consente
    //   aggro rotation. Tune sbagliato direzionalmente.
    // Iter 2 (post N=30 → 96.7% win): rimuovi 3° elite, BOSS single-source
    //   damage massicciamente buffed (hp +82%, mod +1, guardia +1, range +1).
    //   Strategia: damage CONCENTRATO su tank player vs spread.
    {
      id: 'e_apex_boss',
      species: 'apex_predatore',
      job: 'vanguard',
      traits: ['martello_osseo', 'ferocia', 'ondata_psichica'],
      hp: 40,
      ap: 3,
      mod: 3, // M14-C iter4: mod 5→3. Elevation +30% + mod 5 → 0% win iter0+3.
      dc: 14,
      guardia: 4,
      attack_range: 3,
      position: { x: 8, y: 5 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
      // M14-C: BOSS sul palco/altare rialzato. Elevation +1 → +30% dmg vs ground.
      // iter4: mod 3 + elev 1.3x ≈ mod 4 flat — compensa danno elevato.
      elevation: 1,
    },
    // 3 elite hunter — flanking + mid (iter 1: +1 elite + hp 7→9).
    // Spread aggro, force player split focus-fire.
    {
      id: 'e_elite_hunter_1',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: [],
      hp: 9,
      ap: 2,
      mod: 3,
      dc: 13,
      guardia: 1,
      attack_range: 2,
      position: { x: 7, y: 2 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
      // M14-C iter3 (2026-04-26): elevation 1→0. Iter0+elevation dava 0% win
      // (BOSS+2 elite +30% dmg ribaltava turtle-deadlock). Solo BOSS mantiene
      // quota per preservare la tensione narrativa "altare rialzato".
      elevation: 0,
    },
    {
      id: 'e_elite_hunter_2',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: [],
      hp: 9,
      ap: 2,
      mod: 3,
      dc: 13,
      guardia: 1,
      attack_range: 2,
      position: { x: 7, y: 8 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
      // M14-C iter3 (2026-04-26): elevation 1→0 (come elite 1).
      elevation: 0,
    },
    // Iter 2: e_elite_hunter_3 RIMOSSO. Damage concentrato su BOSS singolo
    // (boss hp 22→40 +82%) > damage spread su 3 elite. Aggro rotation player
    // troppo facile con 4 target distinti.
    // 3 minion nomad — fragili ma numerosi, mod 2 hp 4.
    {
      id: 'e_minion_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 4,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 1,
      position: { x: 6, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_minion_2',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 4,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 1,
      position: { x: 6, y: 6 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_minion_3',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 4,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 1,
      position: { x: 9, y: 5 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];

  return [...players, ...enemies];
}

// Iter 5 Option A (addendum 2026-04-18): variant quartet 4p.
// Rimuove asimmetria focus-fire 8v6 (full modulation) che plateaued wr a 80-90%.
// Quartet 4p test batch N=10: wr 10% (in band target 15-25%), K/D median 0.5.
// Boss hp 40→22 compromise: full quartet (boss hp 40) = wr 0% overshoot.
// Ref: docs/playtest/2026-04-18-hardcore-06-addendum-iter2-4.md §17 Option A.
function buildHardcoreUnits06Quartet() {
  const full = buildHardcoreUnits06();
  const players = full.filter((u) => u.controlled_by === 'player').slice(0, 4);
  const enemies = full
    .filter((u) => u.controlled_by === 'sistema')
    .map((e) => (e.id === 'e_apex_boss' ? { ...e, hp: 22 } : e));
  return [...players, ...enemies];
}

const HARDCORE_SCENARIO_06_QUARTET = {
  ...HARDCORE_SCENARIO_06,
  id: 'enc_tutorial_06_hardcore_quartet',
  name: "Cattedrale dell'Apex (Quartet 4p)",
  objective_text:
    'Iter 5 variant: 4 PG vs BOSS Apex + 5 guardiani. Quartet modulation bilancia focus-fire (target win_rate 15-25%).',
  recommended_modulation: 'quartet',
};

// M13 P6 (ADR-2026-04-24) — hardcore 07 "Assalto Spietato".
// Long War 2 pattern: timer stringente + pod activation reinforcement.
// Strategia: NO BOSS tanky da focus-fire. 4 pod da 2 enemy ciascuno + timer 10
// rounds. Pod si attivano a tier Alert/Escalated via reinforcementSpawner.
// Player must clear + extract before timer expires. Turtle loses.
//
// Target win rate: 30-50% (band hardcore challenging).
// Iter 0 calibration (this PR): 4 pod × 2 minion + 1 elite spawn cap 4,
// timer 10 → expire = escalate +30 pressure (Apex tier).

const HARDCORE_SCENARIO_07_POD_RUSH = {
  id: 'enc_tutorial_07_hardcore_pod_rush',
  name: 'Assalto Spietato',
  biome_id: 'rovine_planari',
  encounter_class: 'hardcore',
  difficulty_rating: 7,
  estimated_turns: 10,
  grid_size: 10,
  objective: { type: 'elimination' },
  objective_text:
    '10 round per eliminare la pattuglia + 3 pod reinforcement. Timer expire → pressure escalate (Apex). No boss: damage distribuito, priority decisioni conteggia più di burst. Party 4 PG quartet.',
  briefing_pre:
    "La pattuglia è solo il vanguard. Sensori rilevano 3 pod lungo i corridoi laterali: si attivano progressivamente a tier Alert+ (2 unità × pod). 10 round per aprirsi un varco — se l'alarm resta acceso oltre il limite, l'Apex Sistema invia rinforzi ondata finale. Non turtle: muovi, apri, incidi.",
  briefing_post: "Il corridoio è libero. L'Apex ancora ignora la tua presenza.",
  hazard_tiles: [
    { x: 3, y: 3, damage: 2, type: 'rovine_instabili' },
    { x: 6, y: 6, damage: 2, type: 'rovine_instabili' },
  ],
  sistema_pressure_start: 60,
  recommended_modulation: 'quartet',
  mission_timer: {
    enabled: true,
    turn_limit: 8, // M14-C iter2 (2026-04-25 sera): 10→8 dopo N=10 90% WR. Stringe finestra.
    soft_warning_at: 3,
    on_expire: 'escalate_pressure',
    on_expire_payload: { pressure_delta: 30, extra_spawns: 3 },
  },
  // M14-C iter1 (2026-04-26): iter0 con elevation patrol → 100% win. Party
  // chiude la pattuglia in 10 round prima che reinforcement triggeri. Knobs:
  // min_tier Alert→Calm (pressure_start 60 sempre Alert, quindi più avanti a Calm
  // in caso di mercy decay), cooldown 2→1 (spawn ogni round eligible).
  // M14-C iter2 (2026-04-25 sera): iter1 N=10 → 90% WR (target 30-50%). Knobs:
  // cooldown 1→0 (spawn immediato), min_distance 4→2 (spawn più vicino).
  reinforcement_policy: {
    enabled: true,
    min_tier: 'Calm',
    cooldown_rounds: 0,
    max_total_spawns: 8, // 6→8 totali (più pressione)
    min_distance_from_pg: 2, // 4→2 spawn più vicino al party
  },
  reinforcement_pool: [
    {
      unit_id: 'cacciatore_corazzato',
      hp: 8,
      mod: 3,
      dc: 12,
      ai_profile: 'aggressive',
      weight: 2,
      max_spawns: 3,
    },
    {
      unit_id: 'predone_agile',
      hp: 6,
      mod: 2,
      dc: 11,
      ai_profile: 'aggressive',
      weight: 3,
      max_spawns: 3,
    },
  ],
  reinforcement_entry_tiles: [
    [9, 0],
    [9, 9],
    [0, 0],
    [0, 9],
  ],
};

function buildHardcoreUnits07() {
  // pcg-level-design-illuminator P0 emergence fix: species variety (4 distinti).
  const SPECIES_BY_JOB = {
    skirmisher: 'dune_stalker',
    vanguard: 'umbroid_lurker',
    ranger: 'echo_seer',
    warden: 'mud_sentinel',
  };
  const TRAITS_BY_JOB = {
    skirmisher: ['zampe_a_molla'],
    vanguard: ['pelle_elastomera'],
    ranger: ['spore_psichiche_silenziate'],
    warden: ['struttura_elastica_amorfa'],
  };
  const players = [
    { id: 'p_scout_1', job: 'skirmisher', pos: [1, 3], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_2', job: 'ranger', pos: [1, 6], hp: 10, mod: 3, dc: 12 },
    { id: 'p_tank_1', job: 'vanguard', pos: [2, 4], hp: 14, mod: 2, dc: 14 },
    { id: 'p_support_1', job: 'warden', pos: [2, 5], hp: 11, mod: 2, dc: 13 },
  ].map((pl) => ({
    id: pl.id,
    species: SPECIES_BY_JOB[pl.job] || 'dune_stalker',
    job: pl.job,
    traits: TRAITS_BY_JOB[pl.job] || ['zampe_a_molla'],
    hp: pl.hp,
    ap: 2,
    mod: pl.mod,
    dc: pl.dc,
    guardia: pl.job === 'vanguard' ? 2 : 1,
    position: { x: pl.pos[0], y: pl.pos[1] },
    controlled_by: 'player',
    facing: 'E',
    // M14-C: party parte a ground, corridoi di ingresso.
    elevation: 0,
  }));

  // Vanguard pattern: 3 initial enemies, rest come from pod reinforcement.
  const enemies = [
    {
      id: 'e_patrol_leader',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: ['martello_osseo'],
      hp: 18, // M14-C iter2 (2026-04-25 sera): 15→18 dopo N=10 90% WR. Patrol regge altri 1-2 round.
      ap: 2,
      mod: 3,
      dc: 13,
      guardia: 2,
      attack_range: 2,
      position: { x: 6, y: 4 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
      // M14-C: vedetta su torre di osservazione. +1 elevation = AP patrol hits hard.
      elevation: 1,
    },
    {
      id: 'e_patrol_scout_1',
      species: 'predone_agile',
      job: 'skirmisher',
      traits: ['denti_seghettati'],
      hp: 6,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 1,
      position: { x: 7, y: 2 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
    {
      id: 'e_patrol_scout_2',
      species: 'predone_agile',
      job: 'skirmisher',
      traits: [],
      hp: 6,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 1,
      position: { x: 7, y: 7 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
    // M14-C iter1: +1 predone centrale per anticipare pressure sul party
    // (iter0 100% win → 4v3 troppo generoso prima che reinforcement triggeri).
    {
      id: 'e_patrol_scout_3',
      species: 'predone_agile',
      job: 'skirmisher',
      traits: [],
      hp: 6,
      ap: 2,
      mod: 2,
      dc: 11,
      guardia: 0,
      attack_range: 1,
      position: { x: 5, y: 4 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
  ];
  return [...players, ...enemies];
}

module.exports = {
  HARDCORE_SCENARIO_06,
  HARDCORE_SCENARIO_06_QUARTET,
  HARDCORE_SCENARIO_07_POD_RUSH,
  buildHardcoreUnits06,
  buildHardcoreUnits06Quartet,
  buildHardcoreUnits07,
};
