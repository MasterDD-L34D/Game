// SPEC-I ER7 (ratificato 2026-06-10, opzione A) -- A9 population tick:
// ecosistema che evolve cross-run come STATO DISCRETO per ruolo trofico
// (abundant/stable/depleted, MAI numeri continui -- anti-UO, museum worldgen-
// stack card). Avanza SOLO a season-tick con regole flat:
//   - bioma ferito A13 (biomeWounded) -> prey `depleted`
//   - run kill-heavy su apex (apexOverhunted) -> apex `depleted`
//   - apex depleted + prey non ferita -> prey `abundant` (trophic release)
//   - recovery dopo N season quiete
// Eventi local_extinction/population_boom = permanentFlags narrativi.
// Flag BIOME_POPULATION_ENABLED default ON (flip 2026-06-11, opt-out '!= false').
// Magnitudini (RECOVERY_SEASONS/ABUNDANCE_SEASONS) RATIFIED N=40.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STATES,
  TRACKED_ROLES,
  RECOVERY_SEASONS,
  ABUNDANCE_SEASONS,
  ER7_PILOT_BIOMES,
  isPilotBiome,
  isEnabled,
  initBiomePopulation,
  advanceBiomePopulation,
  depletedRoles,
  abundantRoles,
} = require('../../apps/backend/services/worldgen/biomePopulation');

test('isPilotBiome: badlands in scope, altri biomi fuori (gate scrittura segnali, Codex P2)', () => {
  assert.ok(ER7_PILOT_BIOMES.includes('badlands'));
  assert.equal(isPilotBiome('badlands'), true);
  assert.equal(isPilotBiome('abisso_vulcanico'), false);
  assert.equal(isPilotBiome('rovine_planari'), false);
  assert.equal(isPilotBiome(undefined), false);
});

test('isEnabled: flag default ON (flip 2026-06-11, opt-out)', (t) => {
  const saved = process.env.BIOME_POPULATION_ENABLED;
  delete process.env.BIOME_POPULATION_ENABLED;
  t.after(() => {
    if (saved === undefined) delete process.env.BIOME_POPULATION_ENABLED;
    else process.env.BIOME_POPULATION_ENABLED = saved;
  });
  assert.equal(isEnabled(), true);
});

test('isEnabled: opt-out OFF when env === "false"', (t) => {
  process.env.BIOME_POPULATION_ENABLED = 'false';
  t.after(() => delete process.env.BIOME_POPULATION_ENABLED);
  assert.equal(isEnabled(), false);
});

test('isEnabled: flag ON when env === "true"', (t) => {
  process.env.BIOME_POPULATION_ENABLED = 'true';
  t.after(() => delete process.env.BIOME_POPULATION_ENABLED);
  assert.equal(isEnabled(), true);
});

test('initBiomePopulation: every tracked role starts stable, seasons 0', () => {
  const pop = initBiomePopulation();
  for (const role of TRACKED_ROLES) {
    assert.equal(pop[role].state, STATES.STABLE);
    assert.equal(pop[role].seasons, 0);
  }
});

test('advance: no signals -> all roles stay stable, no events (idempotent)', () => {
  const { population, events } = advanceBiomePopulation(initBiomePopulation(), {});
  for (const role of TRACKED_ROLES) {
    assert.equal(population[role].state, STATES.STABLE);
  }
  assert.deepEqual(events, []);
});

test('advance: biomeWounded -> prey depleted + local_extinction event', () => {
  const { population, events } = advanceBiomePopulation(initBiomePopulation(), {
    biomeWounded: true,
  });
  assert.equal(population.prey.state, STATES.DEPLETED);
  assert.equal(population.prey.seasons, 0);
  assert.equal(population.apex.state, STATES.STABLE);
  assert.ok(events.some((e) => e.type === 'local_extinction' && e.role === 'prey'));
});

test('advance: apexOverhunted -> apex depleted + local_extinction event', () => {
  const { population, events } = advanceBiomePopulation(initBiomePopulation(), {
    apexOverhunted: true,
  });
  assert.equal(population.apex.state, STATES.DEPLETED);
  assert.ok(events.some((e) => e.type === 'local_extinction' && e.role === 'apex'));
});

test('advance: apex depleted + prey healthy -> prey abundant (trophic release) + population_boom', () => {
  // tick 1: deplete apex
  const step1 = advanceBiomePopulation(initBiomePopulation(), { apexOverhunted: true });
  assert.equal(step1.population.apex.state, STATES.DEPLETED);
  // tick 2: apex stays depleted (re-trigger), prey released -> abundant
  const step2 = advanceBiomePopulation(step1.population, { apexOverhunted: true });
  assert.equal(step2.population.prey.state, STATES.ABUNDANT);
  assert.ok(step2.events.some((e) => e.type === 'population_boom' && e.role === 'prey'));
});

test('advance: wound + overhunt same tick -> prey depleted (wound wins, no boom), apex depleted', () => {
  const { population, events } = advanceBiomePopulation(initBiomePopulation(), {
    apexOverhunted: true,
    biomeWounded: true,
  });
  assert.equal(population.apex.state, STATES.DEPLETED);
  assert.equal(population.prey.state, STATES.DEPLETED); // wound beats trophic release
  assert.ok(!events.some((e) => e.type === 'population_boom'));
});

test('advance: re-trigger of already-depleted role does NOT re-emit local_extinction (no spam)', () => {
  const step1 = advanceBiomePopulation(initBiomePopulation(), { biomeWounded: true });
  assert.ok(step1.events.some((e) => e.type === 'local_extinction' && e.role === 'prey'));
  const step2 = advanceBiomePopulation(step1.population, { biomeWounded: true });
  assert.equal(step2.population.prey.state, STATES.DEPLETED);
  assert.ok(!step2.events.some((e) => e.type === 'local_extinction' && e.role === 'prey'));
});

test('recovery: depleted role returns to stable after RECOVERY_SEASONS quiet ticks', () => {
  let pop = advanceBiomePopulation(initBiomePopulation(), { biomeWounded: true }).population;
  assert.equal(pop.prey.state, STATES.DEPLETED);
  // RECOVERY_SEASONS quiet ticks (no signal) -> recovers
  for (let i = 0; i < RECOVERY_SEASONS; i += 1) {
    pop = advanceBiomePopulation(pop, {}).population;
  }
  assert.equal(pop.prey.state, STATES.STABLE);
});

test('recovery: abundant prey decays to stable after apex recovers + ABUNDANCE_SEASONS', () => {
  // apex depleted long enough to recover; prey boomed while apex gone
  let pop = advanceBiomePopulation(initBiomePopulation(), { apexOverhunted: true }).population;
  pop = advanceBiomePopulation(pop, { apexOverhunted: true }).population; // prey -> abundant
  assert.equal(pop.prey.state, STATES.ABUNDANT);
  // stop overhunting: apex recovers after RECOVERY_SEASONS, then prey abundance decays
  for (let i = 0; i < RECOVERY_SEASONS + ABUNDANCE_SEASONS + 1; i += 1) {
    pop = advanceBiomePopulation(pop, {}).population;
  }
  assert.equal(pop.apex.state, STATES.STABLE);
  assert.equal(pop.prey.state, STATES.STABLE);
});

test('advance: pure -- does not mutate the input population', () => {
  const input = initBiomePopulation();
  advanceBiomePopulation(input, { biomeWounded: true });
  assert.equal(input.prey.state, STATES.STABLE); // input untouched
  assert.equal(input.prey.seasons, 0);
});

test('advance: undefined current -> initializes then applies signal', () => {
  const { population } = advanceBiomePopulation(undefined, { biomeWounded: true });
  assert.equal(population.prey.state, STATES.DEPLETED);
  assert.equal(population.apex.state, STATES.STABLE);
});

test('depletedRoles / abundantRoles: report current role states', () => {
  const step1 = advanceBiomePopulation(initBiomePopulation(), { apexOverhunted: true });
  const step2 = advanceBiomePopulation(step1.population, { apexOverhunted: true });
  assert.deepEqual(depletedRoles(step2.population), ['apex']);
  assert.deepEqual(abundantRoles(step2.population), ['prey']);
  assert.deepEqual(depletedRoles(null), []);
  assert.deepEqual(abundantRoles(undefined), []);
});

module.exports = {};
