// Tests for crossEventEngine — TKT-WORLDGEN-GAPB (2026-05-29).
//
// Consumes cross_events.yaml (seasonal cross-biome events) and computes a FLAT
// pressure offset for a session's biome + season (Rimworld temperature-offset
// pattern, not an ecological sim). Real-data cases mirror cross_events.yaml:
//   ondata-termica  -> to BADLANDS,                  season summer, pressure 2
//   brinastorm      -> to FORESTA_TEMPERATA+BADLANDS, season winter, pressure 1
//   tempesta-ferrosa-> to FORESTA_TEMPERATA+DESERTO_CALDO, season autumn, pressure 2
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  getActiveCrossEvents,
  getCrossEventPressureDelta,
  _resetCache,
} = require('../../apps/backend/services/worldgen/crossEventEngine');

test('crossEventEngine: no biome or season -> no events', () => {
  assert.deepEqual(getActiveCrossEvents(null, 'summer'), []);
  assert.deepEqual(getActiveCrossEvents('badlands', null), []);
  assert.equal(getCrossEventPressureDelta(null, null).pressure_delta, 0);
});

test('crossEventEngine: real data badlands + summer -> ondata-termica (delta 2)', () => {
  _resetCache();
  const r = getCrossEventPressureDelta('badlands', 'summer');
  assert.equal(r.pressure_delta, 2);
  assert.ok(r.events.includes('evento-ondata-termica'));
  assert.ok(r.hazards.includes('thermal_stress'));
});

test('crossEventEngine: real data badlands + winter -> brinastorm (delta 1)', () => {
  _resetCache();
  const r = getCrossEventPressureDelta('badlands', 'winter');
  assert.equal(r.pressure_delta, 1);
  assert.ok(r.events.includes('evento-brinastorm'));
});

test('crossEventEngine: real data badlands + autumn -> no matching event (delta 0)', () => {
  _resetCache();
  // tempesta-ferrosa (autumn) targets FORESTA_TEMPERATA + DESERTO_CALDO, not BADLANDS.
  const r = getCrossEventPressureDelta('badlands', 'autumn');
  assert.equal(r.pressure_delta, 0);
  assert.deepEqual(r.events, []);
});

test('crossEventEngine: real data foresta_temperata + autumn -> tempesta-ferrosa (delta 2)', () => {
  _resetCache();
  const r = getCrossEventPressureDelta('foresta_temperata', 'autumn');
  assert.equal(r.pressure_delta, 2);
  assert.ok(r.events.includes('evento-tempesta-ferrosa'));
});

test('crossEventEngine: real data badlands + spring -> nothing (delta 0)', () => {
  _resetCache();
  const r = getCrossEventPressureDelta('badlands', 'spring');
  assert.equal(r.pressure_delta, 0);
});

test('crossEventEngine: case-insensitive biome + season match', () => {
  _resetCache();
  const r = getCrossEventPressureDelta('BADLANDS', 'Summer');
  assert.equal(r.pressure_delta, 2);
});

test('crossEventEngine: injected events (pure, no I/O)', () => {
  const events = [
    {
      species_id: 'ev-a',
      season: 'summer',
      to_nodes: ['BADLANDS'],
      pressure_delta: 3,
      hazard_modifier: 'h1',
    },
    {
      species_id: 'ev-b',
      season: 'summer',
      to_nodes: ['CRYOSTEPPE'],
      pressure_delta: 5,
    },
  ];
  const active = getActiveCrossEvents('badlands', 'summer', { events });
  assert.equal(active.length, 1);
  assert.equal(active[0].species_id, 'ev-a');
  const r = getCrossEventPressureDelta('badlands', 'summer', { events });
  assert.equal(r.pressure_delta, 3);
  assert.deepEqual(r.hazards, ['h1']);
});

test('crossEventEngine: multiple active events sum pressure_delta', () => {
  const events = [
    { species_id: 'ev-a', season: 'summer', to_nodes: ['BADLANDS'], pressure_delta: 2 },
    { species_id: 'ev-b', season: 'summer', to_nodes: ['BADLANDS'], pressure_delta: 3 },
  ];
  const r = getCrossEventPressureDelta('badlands', 'summer', { events });
  assert.equal(r.pressure_delta, 5);
  assert.equal(r.events.length, 2);
});

module.exports = {};
