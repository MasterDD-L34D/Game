// Cross-event seasonal pressure engine — TKT-WORLDGEN-GAPB (2026-05-29).
//
// Consumes packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml
// (seasonal cross-biome events) and computes a FLAT pressure offset for a
// session's biome + season. Closes the Engine-LIVE / Surface-DEAD gap:
// cross_events.yaml had ZERO runtime consumer before this.
//
// Pattern: Rimworld temperature-offset — a flat, bounded modifier, NOT an
// ecological simulation (avoids the Ultima Online runtime-foodweb trap; see
// docs/reports/2026-04-26-worldgen-pcg-audit.md).
//
// An event applies to a session when:
//   - the session biome_id is in the event's `to_nodes` (affected biomes), AND
//   - the event's `season` matches the session season.
// Matching is case-insensitive (to_nodes are uppercase node ids, biome_id is
// the lowercase slug). pressure_delta values sum across active events.
//
// API:
//   getActiveCrossEvents(biomeId, season, opts?) -> [event]
//   getCrossEventPressureDelta(biomeId, season, opts?) ->
//     { pressure_delta, hazards: [string], events: [event_id] }
//   _resetCache() — test seam.
//
// opts.events — injected event array (pure unit testing, skips file load).
// opts.path   — override yaml path.

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CROSS_EVENTS_PATH = path.resolve(
  __dirname,
  '../../../../packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml',
);

let _cache = null;

function _norm(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase();
}

function loadCrossEvents(opts = {}) {
  if (_cache && !opts.force && !opts.path && !opts.events) return _cache;
  const filePath = opts.path || CROSS_EVENTS_PATH;
  let events = [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw);
    events = Array.isArray(parsed && parsed.events) ? parsed.events : [];
  } catch (err) {
    console.warn('[crossEventEngine] load failed:', filePath, err.message);
    events = [];
  }
  if (!opts.path && !opts.events) _cache = events;
  return events;
}

function getActiveCrossEvents(biomeId, season, opts = {}) {
  if (!biomeId || !season) return [];
  const b = _norm(biomeId);
  const s = _norm(season);
  const events = Array.isArray(opts.events) ? opts.events : loadCrossEvents(opts);
  return events.filter((e) => {
    if (!e || _norm(e.season) !== s) return false;
    const targets = Array.isArray(e.to_nodes) ? e.to_nodes.map(_norm) : [];
    return targets.includes(b);
  });
}

function getCrossEventPressureDelta(biomeId, season, opts = {}) {
  const active = getActiveCrossEvents(biomeId, season, opts);
  let pressureDelta = 0;
  const hazards = [];
  const ids = [];
  for (const e of active) {
    const d = Number(e.pressure_delta);
    if (Number.isFinite(d)) pressureDelta += d;
    if (e.hazard_modifier) hazards.push(e.hazard_modifier);
    ids.push(e.species_id || e.id || 'unknown');
  }
  if (active.length > 0) {
    // Gate-5 surface: developer/replay-visible record of seasonal cross-events.
    try {
      console.log(
        JSON.stringify({
          component: 'cross-event-engine',
          biome_id: biomeId,
          season,
          events: ids,
          pressure_delta: pressureDelta,
          hazards,
        }),
      );
    } catch {
      /* logging best-effort */
    }
  }
  return { pressure_delta: pressureDelta, hazards, events: ids };
}

function _resetCache() {
  _cache = null;
}

module.exports = {
  loadCrossEvents,
  getActiveCrossEvents,
  getCrossEventPressureDelta,
  _resetCache,
  CROSS_EVENTS_PATH,
};
