// apps/backend/services/worldgen/desertoCaldoHazardScenario.js
//
// Move terrain-cost substrate -- "Bocche Vulcaniche" hazard scenario (2026-06-29).
//
// A mixed, volo-graded roster that crosses a full-height lava(x=3)+roccia(x=4) wall on
// an 8x8 grid, so the substrate's g1/g2/g3 flight grades are EXERCISED in AI play. Path B:
// volo grade is set EXPLICITLY per unit (volo_grade + adattamento_volo) -- independent of
// the still-open per-species lift (#3061) and registry-free (normaliseUnit whitelists both).
// Ground units are heavy-profile (corazzato) so they pay the full wall (lava/roccia 2.0).
//
// Sized to RESOLVE (winnable, like move-terrain-hazard-probe.js) -- NOT the adapter-derived
// pilot rosters that deadlock. Pairs with the loadable encounter file of the same id
// (docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml carries the terrain
// for the encounter_id path; this module carries the AI roster).
//
// NOT in the gated canonical-suite oracle manifest (mirrors badlands/foresta pilot scenarios).

'use strict';

const VOLO_TRAIT = 'adattamento_volo';

// Full-height lava(x=3)+roccia(x=4) wall on 8x8 -> no detour. Mirrors the encounter file
// grid.terrain_features so roster + terrain share ONE source across probe and tests.
function buildTerrain() {
  const t = [];
  for (let y = 0; y < 8; y += 1) {
    t.push({ x: 3, y, type: 'lava' });
    t.push({ x: 4, y, type: 'roccia' });
  }
  return t;
}

const TERRAIN = buildTerrain();

const SCENARIO = {
  encounter_id: 'enc_deserto_caldo_bocche_vulcaniche_01',
  name: 'Bocche Vulcaniche -- Muro di Lava',
  biome_id: 'deserto_caldo',
  grid_size: 8,
  objective: { type: 'elimination' },
};

function _flyer(id, species, grade, controlled_by, position, initiative) {
  return {
    id,
    species,
    job: 'skirmisher',
    hp: 18,
    max_hp: 18,
    ap: 3,
    mod: 6,
    dc: 11,
    attack_range: 2,
    initiative,
    position,
    controlled_by,
    traits: [VOLO_TRAIT],
    volo_grade: grade,
    status: {},
  };
}

function _ground(id, species, controlled_by, position, initiative) {
  return {
    id,
    species,
    job: 'vanguard',
    morphotype: 'corazzato',
    hp: 20,
    max_hp: 20,
    ap: 3,
    mod: 6,
    dc: 12,
    attack_range: 1,
    initiative,
    position,
    controlled_by,
    traits: [],
    status: {},
  };
}

// Mixed both-sides roster. Players (left, x<3) close on the sistema (right, x>4); both
// factions field a flyer + a ground unit, so the flag-delta is carried by the ground
// units (flyers are grade-exempt) while the g1/g2/g3 spread is exercised across the wall.
function buildUnits() {
  return [
    // Player faction
    _flyer('p_noctule', 'noctule_termico', 3, 'player', { x: 0, y: 2 }, 16),
    _ground('p_corazza', 'corazza_deserto', 'player', { x: 0, y: 4 }, 14),
    // Sistema faction
    _flyer('e_echo', 'echo_wing', 1, 'sistema', { x: 7, y: 2 }, 13),
    _flyer('e_aurora', 'aurora_gull', 2, 'sistema', { x: 7, y: 3 }, 12),
    _ground('e_scavenger', 'rust-scavenger', 'sistema', { x: 7, y: 5 }, 10),
  ];
}

module.exports = { SCENARIO, TERRAIN, buildUnits, VOLO_TRAIT };
