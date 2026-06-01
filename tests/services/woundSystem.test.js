// OD-058 D2 (2026-06-01) — wound location system tests.
//
// Source: vault SPEC-D2-wound-location-system-2026-05-26 (ratify master-dd 2026-06-01).
// Module: apps/backend/services/combat/woundSystem.js
// Supersedes woundedPerma HP-penalty + statusModifiers severity->attack-only with a
// hit-location -> stat-malus model. 4 fixed locations cover AP/def/atk/mobility,
// 3 severity tiers (lieve/media/grave), grave persists cross-encounter.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LOCATIONS,
  SEVERITIES,
  MAX_WOUNDS,
  DEFAULT_LOCATION_WEIGHTS,
  woundEffect,
  applyWound,
  computeWoundMaluses,
  initSessionMap,
  persistGraveWounds,
  restoreOnEncounterStart,
  clearEncounterWounds,
  clearSession,
  pickWeightedLocation,
} = require('../../apps/backend/services/combat/woundSystem');

// ── woundEffect: location -> stat mapping (SPEC §2 + §8.4 testa graduato) ──

test('woundEffect: torso -> defense_mod (-1 lieve, -2 grave)', () => {
  assert.deepEqual(woundEffect('torso', 'lieve'), { stat: 'defense_mod', malus: -1 });
  assert.deepEqual(woundEffect('torso', 'media'), { stat: 'defense_mod', malus: -1 });
  assert.deepEqual(woundEffect('torso', 'grave'), { stat: 'defense_mod', malus: -2 });
});

test('woundEffect: arti_anteriori -> attack_mod', () => {
  assert.deepEqual(woundEffect('arti_anteriori', 'lieve'), { stat: 'attack_mod', malus: -1 });
  assert.deepEqual(woundEffect('arti_anteriori', 'grave'), { stat: 'attack_mod', malus: -2 });
});

test('woundEffect: arti_posteriori -> mobility', () => {
  assert.deepEqual(woundEffect('arti_posteriori', 'lieve'), { stat: 'mobility', malus: -1 });
  assert.deepEqual(woundEffect('arti_posteriori', 'grave'), { stat: 'mobility', malus: -2 });
});

test('woundEffect: testa graduato — lieve/media = accuracy, grave = -1 AP (NON -2)', () => {
  // SPEC §8.4: testa NON -1 AP fisso; graduato: lieve/media = -mira (accuracy),
  // grave = -1 AP (copre AP solo al tier alto, -2 AP romperebbe il budget 2).
  assert.deepEqual(woundEffect('testa', 'lieve'), { stat: 'accuracy', malus: -1 });
  assert.deepEqual(woundEffect('testa', 'media'), { stat: 'accuracy', malus: -1 });
  assert.deepEqual(woundEffect('testa', 'grave'), { stat: 'ap', malus: -1 });
});

test('woundEffect: 4 locations cover the canonical stat set {ap, defense, attack, mobility}', () => {
  const graveStats = LOCATIONS.map((loc) => woundEffect(loc, 'grave').stat);
  for (const s of ['ap', 'defense_mod', 'attack_mod', 'mobility']) {
    assert.ok(graveStats.includes(s), `grave stat coverage missing: ${s}`);
  }
});

test('woundEffect: invalid location/severity throws (no silent wrong stat)', () => {
  assert.throws(() => woundEffect('coda', 'lieve'));
  assert.throws(() => woundEffect('torso', 'mortale'));
});

// ── applyWound: mutate unit.status.wounds ──

test('applyWound: pushes {location, severity, stat, malus} to unit.status.wounds', () => {
  const unit = { id: 'skiv', status: {} };
  const r = applyWound(unit, 'torso', 'lieve');
  assert.equal(r.applied, true);
  assert.deepEqual(r.wound, {
    location: 'torso',
    severity: 'lieve',
    stat: 'defense_mod',
    malus: -1,
  });
  assert.equal(unit.status.wounds.length, 1);
  assert.deepEqual(unit.status.wounds[0], r.wound);
});

test('applyWound: does NOT touch hp/max_hp (HP intact — fragilita via -defense, SPEC §7)', () => {
  const unit = { id: 'skiv', hp: 14, max_hp: 14, status: {} };
  applyWound(unit, 'torso', 'grave');
  assert.equal(unit.hp, 14);
  assert.equal(unit.max_hp, 14);
});

test('applyWound: multiple distinct wounds accumulate', () => {
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'lieve');
  applyWound(unit, 'arti_anteriori', 'media');
  assert.equal(unit.status.wounds.length, 2);
});

test('applyWound: cap MAX_WOUNDS total (death-spiral guard, SPEC §9)', () => {
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'lieve');
  applyWound(unit, 'arti_anteriori', 'lieve');
  applyWound(unit, 'arti_posteriori', 'lieve');
  const over = applyWound(unit, 'testa', 'lieve');
  assert.equal(MAX_WOUNDS, 3);
  assert.equal(over.applied, false);
  assert.equal(unit.status.wounds.length, 3);
});

test('applyWound: max 1 grave per location (SPEC §9)', () => {
  const unit = { id: 'skiv', status: {} };
  const a = applyWound(unit, 'torso', 'grave');
  const b = applyWound(unit, 'torso', 'grave');
  assert.equal(a.applied, true);
  assert.equal(b.applied, false);
  assert.equal(
    unit.status.wounds.filter((w) => w.location === 'torso' && w.severity === 'grave').length,
    1,
  );
});

test('applyWound: defensive — bad unit returns no-op', () => {
  assert.equal(applyWound(null, 'torso', 'lieve').applied, false);
  assert.equal(applyWound({}, 'torso', 'lieve').applied, false);
  assert.equal(applyWound({ id: 'x', status: {} }, 'bad', 'lieve').applied, false);
});

// ── computeWoundMaluses: read-path (sums by stat, SPEC §6) ──

test('computeWoundMaluses: zero deltas when no wounds', () => {
  assert.deepEqual(computeWoundMaluses({ id: 'x', status: {} }), {
    attack_mod: 0,
    defense_mod: 0,
    ap: 0,
    mobility: 0,
    accuracy: 0,
  });
});

test('computeWoundMaluses: sums maluses across wounds by stat', () => {
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'grave'); // defense_mod -2
  applyWound(unit, 'arti_anteriori', 'lieve'); // attack_mod -1
  const m = computeWoundMaluses(unit);
  assert.equal(m.defense_mod, -2);
  assert.equal(m.attack_mod, -1);
  assert.equal(m.ap, 0);
  assert.equal(m.mobility, 0);
});

test('computeWoundMaluses: testa grave contributes ap -1, two arti stack attack -2', () => {
  const unit = {
    id: 'skiv',
    status: {
      wounds: [
        { location: 'testa', severity: 'grave', stat: 'ap', malus: -1 },
        { location: 'arti_anteriori', severity: 'lieve', stat: 'attack_mod', malus: -1 },
        { location: 'arti_anteriori', severity: 'media', stat: 'attack_mod', malus: -1 },
      ],
    },
  };
  const m = computeWoundMaluses(unit);
  assert.equal(m.ap, -1);
  assert.equal(m.attack_mod, -2);
});

// ── cross-encounter persistence (grave only, SPEC §3 + §5) ──

test('persistGraveWounds: serializes only grave wounds to sessionMap', () => {
  const map = initSessionMap();
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'grave');
  applyWound(unit, 'arti_anteriori', 'lieve'); // encounter-scoped, NOT persisted
  const n = persistGraveWounds(unit, map);
  assert.equal(n, 1);
  assert.equal(map.skiv.length, 1);
  assert.equal(map.skiv[0].severity, 'grave');
});

test('clearEncounterWounds: removes lieve/media, keeps grave', () => {
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'grave');
  applyWound(unit, 'arti_anteriori', 'lieve');
  applyWound(unit, 'arti_posteriori', 'media');
  const removed = clearEncounterWounds(unit);
  assert.equal(removed, 2);
  assert.equal(unit.status.wounds.length, 1);
  assert.equal(unit.status.wounds[0].severity, 'grave');
});

test('restoreOnEncounterStart: re-adds persisted grave wounds, idempotent', () => {
  const map = initSessionMap();
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'grave');
  persistGraveWounds(unit, map);
  // new encounter: fresh unit, wounds cleared
  const fresh = { id: 'skiv', status: {} };
  const r1 = restoreOnEncounterStart(fresh, map);
  assert.equal(r1.restored, 1);
  assert.equal(fresh.status.wounds.length, 1);
  assert.equal(fresh.status.wounds[0].location, 'torso');
  // idempotent: second restore no double-add
  const r2 = restoreOnEncounterStart(fresh, map);
  assert.equal(r2.restored, 0);
  assert.equal(fresh.status.wounds.length, 1);
});

test('clearSession: wipes all persisted entries', () => {
  const map = initSessionMap();
  const unit = { id: 'skiv', status: {} };
  applyWound(unit, 'torso', 'grave');
  persistGraveWounds(unit, map);
  assert.equal(clearSession(map), 1);
  assert.deepEqual(map, {});
});

// ── weighted location roll (SPEC §4: torso heaviest, testa lightest) ──

test('DEFAULT_LOCATION_WEIGHTS: torso heaviest, testa lightest', () => {
  assert.ok(DEFAULT_LOCATION_WEIGHTS.torso > DEFAULT_LOCATION_WEIGHTS.testa);
  for (const loc of LOCATIONS) {
    assert.ok(DEFAULT_LOCATION_WEIGHTS[loc] > 0, `weight missing for ${loc}`);
  }
});

test('pickWeightedLocation: deterministic with injected roll01', () => {
  const w = { torso: 40, arti_anteriori: 25, arti_posteriori: 25, testa: 10 };
  // cumulative: torso [0,0.40) arti_ant [0.40,0.65) arti_post [0.65,0.90) testa [0.90,1)
  assert.equal(pickWeightedLocation(w, 0.0), 'torso');
  assert.equal(pickWeightedLocation(w, 0.39), 'torso');
  assert.equal(pickWeightedLocation(w, 0.4), 'arti_anteriori');
  assert.equal(pickWeightedLocation(w, 0.64), 'arti_anteriori');
  assert.equal(pickWeightedLocation(w, 0.65), 'arti_posteriori');
  assert.equal(pickWeightedLocation(w, 0.95), 'testa');
});

test('SEVERITIES + LOCATIONS canonical enums', () => {
  assert.deepEqual(SEVERITIES, ['lieve', 'media', 'grave']);
  assert.deepEqual(LOCATIONS, ['testa', 'torso', 'arti_anteriori', 'arti_posteriori']);
});
