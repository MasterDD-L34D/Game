// TKT-P2 Brigandine seasonal — Phase B content loader unit tests.
//
// Covers loader API: loadSeasons, getSeason, loadPhases, getPhase,
// getSeasonEvents, _resetCache. Validates modifiers + hazards shape contract
// + alignment with seasonalEngine canonical season/phase ids.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadSeasons,
  getSeason,
  loadPhases,
  getPhase,
  getSeasonEvents,
  _resetCache,
} = require('../../apps/backend/services/campaign/seasonalContentLoader');

const { SEASONS, PHASES } = require('../../apps/backend/services/campaign/seasonalEngine');

test('seasonalContentLoader: loadSeasons returns 4 seasons no error', () => {
  _resetCache();
  const seasons = loadSeasons();
  assert.equal(seasons.length, 4, `expected 4 seasons, got ${seasons.length}`);
  const ids = seasons.map((s) => s.id).sort();
  assert.deepEqual(ids, [...SEASONS].sort(), 'season ids match engine canonical');
});

test('seasonalContentLoader: getSeason by id returns parsed object', () => {
  _resetCache();
  const spring = getSeason('spring');
  assert.ok(spring, 'spring exists');
  assert.equal(spring.id, 'spring');
  assert.equal(spring.display_name_it, 'Primavera');
  assert.ok(spring.modifiers, 'modifiers present');
  assert.ok(Array.isArray(spring.hazards), 'hazards array');
  assert.equal(getSeason('nonexistent'), null);
  assert.equal(getSeason(null), null);
});

test('seasonalContentLoader: loadPhases returns 2 phases no error', () => {
  _resetCache();
  const phases = loadPhases();
  assert.equal(phases.length, 2, `expected 2 phases, got ${phases.length}`);
  const ids = phases.map((p) => p.id).sort();
  assert.deepEqual(ids, ['battle_phase', 'organization_phase']);
});

test('seasonalContentLoader: getPhase by id returns parsed object', () => {
  _resetCache();
  const org = getPhase('organization_phase');
  assert.ok(org, 'organization_phase exists');
  assert.equal(org.combat_enabled, false);
  assert.ok(Array.isArray(org.available_actions));
  assert.ok(org.available_actions.includes('recruit'));

  const battle = getPhase('battle_phase');
  assert.ok(battle, 'battle_phase exists');
  assert.equal(battle.combat_enabled, true);
  assert.ok(battle.available_actions.includes('engage'));
});

test('seasonalContentLoader: getSeasonEvents spring returns events_pool', () => {
  _resetCache();
  const events = getSeasonEvents('spring');
  assert.ok(events.length >= 2, `expected >=2 spring events, got ${events.length}`);
  for (const ev of events) {
    assert.ok(ev.id, 'event has id');
    assert.ok(ev.trigger, 'event has trigger');
    assert.ok(typeof ev.weight === 'number', 'weight numeric');
  }
});

test('seasonalContentLoader: modifiers shape (resource_yield + recruit_pool_delta numeric)', () => {
  _resetCache();
  for (const seasonId of SEASONS) {
    const s = getSeason(seasonId);
    assert.ok(s, `season ${seasonId} loaded`);
    assert.ok(
      typeof s.modifiers.resource_yield === 'number',
      `${seasonId}.modifiers.resource_yield numeric`,
    );
    assert.ok(
      typeof s.modifiers.encounter_rate === 'number',
      `${seasonId}.modifiers.encounter_rate numeric`,
    );
    assert.ok(
      typeof s.modifiers.recruit_pool_delta === 'number',
      `${seasonId}.modifiers.recruit_pool_delta numeric`,
    );
  }
});

test('seasonalContentLoader: hazards shape (array with type + intensity)', () => {
  _resetCache();
  for (const seasonId of SEASONS) {
    const s = getSeason(seasonId);
    assert.ok(Array.isArray(s.hazards), `${seasonId} hazards array`);
    assert.ok(s.hazards.length >= 1, `${seasonId} hazards >=1`);
    for (const h of s.hazards) {
      assert.ok(h.type, `${seasonId} hazard type present`);
      assert.ok(typeof h.intensity === 'number', `${seasonId} hazard intensity numeric`);
      assert.ok(Array.isArray(h.affected_biomes), `${seasonId} affected_biomes array`);
    }
  }
});

test('seasonalContentLoader: cache reset works (force reload bypass)', () => {
  _resetCache();
  const a = loadSeasons();
  const b = loadSeasons(); // cached
  assert.equal(a, b, 'cache returns same reference');
  _resetCache();
  const c = loadSeasons();
  assert.notEqual(a, c, 'reset invalidates cache');
});

test('seasonalContentLoader: phase ids align with engine PHASES canonical', () => {
  _resetCache();
  const phases = loadPhases();
  const phaseEngineIds = phases
    .map((p) => {
      // YAML id ends with '_phase'; engine canonical is bare 'organization'|'battle'.
      return p.id.replace(/_phase$/, '');
    })
    .sort();
  assert.deepEqual(
    phaseEngineIds,
    [...PHASES].sort(),
    'phase yaml ids align with engine canonical after suffix strip',
  );
});
