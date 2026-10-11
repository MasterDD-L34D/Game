// TKT-P2 Brigandine seasonal — Phase A engine unit tests.
//
// Cover acceptance criteria scope ticket §5 within Phase A bound:
//   - initialState baseline (AC1 campaign start primitives)
//   - Phase transitions organization↔battle (AC2/AC3 organization+battle phases)
//   - Season cycle spring→summer→autumn→winter→spring+year (year monotone)
//   - Phase metadata + season modifiers retrievable
//   - events_log append-only primitive (AC4 outcome aggregation primitive)
//   - Multi-year progression no state corruption (AC5 cumulative state hygiene)

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SEASONS,
  initialState,
  advancePhase,
  advanceSeason,
  getCurrentPhaseSpec,
  getSeasonModifiers,
  appendEvent,
} = require('../../apps/backend/services/campaign/seasonalEngine');

test('seasonalEngine: initialState returns year 1 spring organization', () => {
  const state = initialState();
  assert.equal(state.current_year, 1);
  assert.equal(state.current_season, 'spring');
  assert.equal(state.current_phase, 'organization');
  assert.equal(state.season_index, 0);
  assert.equal(state.phase_turn, 0);
  assert.deepEqual(state.events_log, []);
});

test('seasonalEngine: advancePhase organization → battle (same season)', () => {
  const s0 = initialState();
  const s1 = advancePhase(s0);
  assert.equal(s1.current_phase, 'battle');
  assert.equal(s1.current_season, 'spring');
  assert.equal(s1.current_year, 1);
  assert.equal(s1.season_index, 0);
  assert.equal(s1.phase_turn, 0);
});

test('seasonalEngine: advancePhase battle → organization + next season', () => {
  const s0 = initialState();
  const s1 = advancePhase(s0); // battle, spring
  const s2 = advancePhase(s1); // organization, summer
  assert.equal(s2.current_phase, 'organization');
  assert.equal(s2.current_season, 'summer');
  assert.equal(s2.season_index, 1);
  assert.equal(s2.current_year, 1);
});

test('seasonalEngine: advanceSeason spring → summer', () => {
  const s0 = initialState();
  const s1 = advanceSeason(s0);
  assert.equal(s1.current_season, 'summer');
  assert.equal(s1.season_index, 1);
  assert.equal(s1.current_year, 1);
});

test('seasonalEngine: advanceSeason winter → spring + year++ (wrap)', () => {
  let s = { ...initialState(), current_season: 'winter', season_index: 3 };
  s = advanceSeason(s);
  assert.equal(s.current_season, 'spring');
  assert.equal(s.season_index, 0);
  assert.equal(s.current_year, 2);
});

test('seasonalEngine: full year cycle 4 seasons → year++', () => {
  let s = initialState();
  for (let i = 0; i < SEASONS.length; i += 1) {
    s = advanceSeason(s);
  }
  // After 4 advances starting from spring: spring again, year 2.
  assert.equal(s.current_season, 'spring');
  assert.equal(s.current_year, 2);
  assert.equal(s.season_index, 0);
});

test('seasonalEngine: getSeasonModifiers spring returns expected shape', () => {
  const mod = getSeasonModifiers('spring');
  assert.ok(mod, 'spring modifiers exist');
  assert.equal(mod.resource_yield, 1.2);
  assert.equal(mod.encounter_rate, 0.9);
  assert.equal(mod.hazard, 'flood');
  assert.equal(mod.recruit_pool, 1);
});

test('seasonalEngine: getSeasonModifiers winter has reduced yield + recruit penalty', () => {
  const mod = getSeasonModifiers('winter');
  assert.ok(mod, 'winter modifiers exist');
  assert.ok(mod.resource_yield < 1.0, 'winter yield reduced');
  assert.ok(mod.encounter_rate > 1.0, 'winter encounter rate elevated');
  assert.equal(mod.recruit_pool, -1);
  assert.equal(mod.hazard, 'frost');
});

test('seasonalEngine: getCurrentPhaseSpec returns metadata matching current_phase', () => {
  const s0 = initialState();
  const spec0 = getCurrentPhaseSpec(s0);
  assert.equal(spec0.label, 'Organization Phase');
  assert.equal(spec0.combat_enabled, false);
  assert.ok(spec0.actions.includes('recruit'));

  const s1 = advancePhase(s0);
  const spec1 = getCurrentPhaseSpec(s1);
  assert.equal(spec1.label, 'Battle Phase');
  assert.equal(spec1.combat_enabled, true);
  assert.ok(spec1.actions.includes('engage'));
});

test('seasonalEngine: appendEvent stores in events_log with context enrichment', () => {
  const s0 = initialState();
  const s1 = appendEvent(s0, { type: 'recruit', payload: { unit_id: 'wolf_a' } });
  assert.equal(s1.events_log.length, 1);
  const ev = s1.events_log[0];
  assert.equal(ev.type, 'recruit');
  assert.equal(ev.year, 1);
  assert.equal(ev.season, 'spring');
  assert.equal(ev.phase, 'organization');
  assert.equal(ev.t, 0);
  assert.deepEqual(ev.payload, { unit_id: 'wolf_a' });
  // Pure: input not mutated.
  assert.equal(s0.events_log.length, 0);
});

test('seasonalEngine: multiple cycles 5 years no state corruption', () => {
  let s = initialState();
  // Cycle: each year = 4 advancePhase(battle→organization) + 4 advancePhase(organization→battle)
  // Simpler: 8 advancePhase calls per year (8 transitions total per year cycle).
  // Year 1 start: organization/spring. After 8 phase advances we should be back to
  // organization/spring of year 2.
  const TARGET_YEARS = 5;
  for (let y = 0; y < TARGET_YEARS; y += 1) {
    for (let i = 0; i < 8; i += 1) {
      s = advancePhase(s);
    }
  }
  assert.equal(s.current_year, 1 + TARGET_YEARS);
  assert.equal(s.current_season, 'spring');
  assert.equal(s.current_phase, 'organization');
  assert.equal(s.season_index, 0);

  // Append events along the way still safe.
  s = appendEvent(s, { type: 'year_recap', payload: { years_elapsed: TARGET_YEARS } });
  assert.equal(s.events_log.length, 1);
  assert.equal(s.events_log[0].year, 1 + TARGET_YEARS);
});
