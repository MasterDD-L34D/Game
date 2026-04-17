// Hardcore encounter — ADR-2026-04-17 co-op 4→8 scaling.
//
// tutorial_06_hardcore: "Cattedrale dell'Apex"
// Party: 8 schierati (modulation full o quartet_hardcore), grid 10x10.
// Enemy: 1 BOSS apex + 2 elite hunter + 3 minion nomad = 6.
// Difficulty 6/5 (boss + swarm). pressure_start 85 → Apex tier.
//
// Baseline calibration target (atteso post batch N=30):
//   win_rate ~15-25% (BOSS hardcore, player deve coordinarsi 8-way)
//   turns avg ~14-18
//   K/D ratio player ~0.6-0.9
//
// PR4.b tune (2026-04-18): batch N=30 ha mostrato wr 100% / K/D 4.0, fuori
// banda. Applicate Iter 1+2+3 (HP +55%, stats +1 mod/dc, pressure_start
// 75→85). Ref: docs/playtest/2026-04-18-hardcore-06-calibration.md.
//
// PR4.c tune (2026-04-18): Iter 1 validation N=10 wr 100% (migliorato ma
// ancora fuori band). Iter 2: HP enemy totale 64→92 (pari a player pool),
// BOSS attack_range 2→3. Stima wr 30-50% post-Iter 2.
//
// Iter 2 actual N=10: wr 80%/timeout 20%. Dmg_taken stagnante 28 → HP-only
// non basta. Iter 3 focus lethality: BOSS ap 3→4 mod +5→+7, Elite/Minion
// ap +1 mod +1. Damage_bonus slot non ancora usato (TBD in services/rules).

'use strict';

const HARDCORE_SCENARIO_06 = {
  id: 'enc_tutorial_06_hardcore',
  name: "Cattedrale dell'Apex",
  biome_id: 'rovine_planari',
  difficulty_rating: 6,
  estimated_turns: 16,
  grid_size: 10,
  objective: 'elimination',
  objective_text:
    'Sconfiggi il BOSS Apex e i suoi 5 guardiani. Party 8 unità vs 6 nemici asimmetrici: coordina focus-fire e combo squadSync per superare la pressione massima.',
  briefing_pre:
    "Le rovine risuonano del passo pesante dell'Apex. Due elite cacciatori pattugliano i fianchi, tre predoni bloccano i corridoi. Party al completo (8 schierati): ogni PG conta, il focus-fire moltiplica il danno, il BOSS non perdona errori di posizionamento.",
  briefing_post:
    "L'Apex è caduto. La cattedrale si quieta. Avete dimostrato che 8 mani battono una mandibola.",
  hazard_tiles: [
    { x: 4, y: 4, damage: 1, type: 'rovine_instabili' },
    { x: 5, y: 5, damage: 1, type: 'rovine_instabili' },
    { x: 3, y: 6, damage: 1, type: 'rovine_instabili' },
  ],
  sistema_pressure_start: 95, // Apex tier (>=90): 4 intents/round, swarm unlocked
  recommended_modulation: 'full', // 8p × 1 PG → grid 10x10 auto
};

function buildHardcoreUnits06() {
  const players = [];
  // 8 player PG — mix specie/job per composition leggibile.
  // 4 skirmisher (ranged dmg) + 2 vanguard (tank frontline) + 2 support.
  const playerLayouts = [
    { id: 'p_scout_1', job: 'skirmisher', pos: [0, 2], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_2', job: 'skirmisher', pos: [0, 4], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_3', job: 'skirmisher', pos: [0, 6], hp: 10, mod: 3, dc: 12 },
    { id: 'p_scout_4', job: 'skirmisher', pos: [0, 8], hp: 10, mod: 3, dc: 12 },
    { id: 'p_tank_1', job: 'vanguard', pos: [1, 3], hp: 14, mod: 2, dc: 14 },
    { id: 'p_tank_2', job: 'vanguard', pos: [1, 7], hp: 14, mod: 2, dc: 14 },
    { id: 'p_support_1', job: 'skirmisher', pos: [1, 1], hp: 11, mod: 3, dc: 13 },
    { id: 'p_support_2', job: 'skirmisher', pos: [1, 5], hp: 11, mod: 3, dc: 13 },
  ];
  for (const pl of playerLayouts) {
    players.push({
      id: pl.id,
      species: 'dune_stalker',
      job: pl.job,
      traits: pl.job === 'vanguard' ? ['pelle_elastomera'] : ['zampe_a_molla'],
      hp: pl.hp,
      ap: 2, // SoT canonical
      mod: pl.mod,
      dc: pl.dc,
      guardia: pl.job === 'vanguard' ? 2 : 1,
      position: { x: pl.pos[0], y: pl.pos[1] },
      controlled_by: 'player',
      facing: 'E',
    });
  }

  const enemies = [
    // BOSS Apex (center-right) — HP alto, crit bonus, attack_range 3.
    // PR4.b: hp 14→22 mod 4→5 dc 14→15. PR4.c Iter 2: hp 22→30 rng 2→3.
    // PR4.c Iter 3: ap 3→4, mod +5→+7 (+10% hit, +crit).
    {
      id: 'e_apex_boss',
      species: 'apex_predatore',
      job: 'vanguard',
      traits: ['martello_osseo', 'ferocia'],
      hp: 30,
      ap: 4,
      mod: 7,
      dc: 15,
      guardia: 2,
      attack_range: 3,
      position: { x: 6, y: 5 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
    // 2 elite hunter — PR4.b: hp 7→10 mod/dc +1. PR4.c Iter2: hp 10→14. Iter3: ap 2→3 mod +4→+5. Iter4: pos x 7→5.
    {
      id: 'e_elite_hunter_1',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: [],
      hp: 14,
      ap: 3,
      mod: 5,
      dc: 14,
      guardia: 1,
      attack_range: 2,
      position: { x: 5, y: 2 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
    {
      id: 'e_elite_hunter_2',
      species: 'cacciatore_corazzato',
      job: 'vanguard',
      traits: [],
      hp: 14,
      ap: 3,
      mod: 5,
      dc: 14,
      guardia: 1,
      attack_range: 2,
      position: { x: 5, y: 8 },
      controlled_by: 'sistema',
      ai_profile: 'aggressive',
      facing: 'W',
    },
    // 3 minion nomad — PR4.b: hp 4→6 mod/dc +1. PR4.c Iter2: hp 6→8. Iter3: ap 2→3 mod +3→+4.
    {
      id: 'e_minion_1',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 8,
      ap: 3,
      mod: 4,
      dc: 12,
      guardia: 0,
      attack_range: 1,
      position: { x: 4, y: 4 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_minion_2',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 8,
      ap: 3,
      mod: 4,
      dc: 12,
      guardia: 0,
      attack_range: 1,
      position: { x: 4, y: 6 },
      controlled_by: 'sistema',
      facing: 'W',
    },
    {
      id: 'e_minion_3',
      species: 'predoni_nomadi',
      job: 'skirmisher',
      traits: [],
      hp: 8,
      ap: 3,
      mod: 4,
      dc: 12,
      guardia: 0,
      attack_range: 1,
      position: { x: 7, y: 5 },
      controlled_by: 'sistema',
      facing: 'W',
    },
  ];

  return [...players, ...enemies];
}

module.exports = {
  HARDCORE_SCENARIO_06,
  buildHardcoreUnits06,
};
