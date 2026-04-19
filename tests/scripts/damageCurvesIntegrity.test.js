// CI guard damage_curves.yaml integrity (M7-#2 ADR-2026-04-20).
//
// Validation rules:
// 1. target_bands per class non-overlapping su defeat_rate
// 2. enemy_damage_multiplier monotonic crescente tutorial → boss
// 3. enrage_threshold_hp ∈ [0,1] o null
// 4. Tutte le required keys presenti per schema

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CURVES_PATH = path.join(REPO_ROOT, 'data', 'core', 'balance', 'damage_curves.yaml');

function loadCurves() {
  const raw = fs.readFileSync(CURVES_PATH, 'utf8');
  return yaml.load(raw);
}

test('damage_curves.yaml file exists + valid YAML', () => {
  assert.ok(fs.existsSync(CURVES_PATH), `Missing: ${CURVES_PATH}`);
  const data = loadCurves();
  assert.ok(data, 'YAML parsed null');
  assert.equal(typeof data, 'object');
});

test('required top-level keys present', () => {
  const data = loadCurves();
  for (const key of [
    'version',
    'schema_version',
    'encounter_classes',
    'enemy_tiers',
    'player_classes',
  ]) {
    assert.ok(data[key] !== undefined, `missing top-level key: ${key}`);
  }
});

test('encounter_classes: 5 classes (tutorial, tutorial_advanced, standard, hardcore, boss)', () => {
  const data = loadCurves();
  const classes = Object.keys(data.encounter_classes);
  for (const required of ['tutorial', 'tutorial_advanced', 'standard', 'hardcore', 'boss']) {
    assert.ok(classes.includes(required), `missing class: ${required}`);
  }
});

test('encounter_classes: each has target_bands with 3 rate ranges', () => {
  const data = loadCurves();
  for (const [cls, def] of Object.entries(data.encounter_classes)) {
    assert.ok(def.target_bands, `${cls}: missing target_bands`);
    for (const rate of ['win_rate', 'defeat_rate', 'timeout_rate']) {
      const band = def.target_bands[rate];
      assert.ok(Array.isArray(band), `${cls}.${rate}: should be [min, max]`);
      assert.equal(band.length, 2, `${cls}.${rate}: expected [min, max]`);
      assert.ok(band[0] >= 0 && band[0] <= 1, `${cls}.${rate} min out of [0,1]`);
      assert.ok(band[1] >= 0 && band[1] <= 1, `${cls}.${rate} max out of [0,1]`);
      assert.ok(band[1] > band[0], `${cls}.${rate}: max must be > min`);
    }
  }
});

test('enemy_damage_multiplier monotonic crescente', () => {
  const data = loadCurves();
  const order = ['tutorial', 'tutorial_advanced', 'standard', 'hardcore', 'boss'];
  let prev = 0;
  for (const cls of order) {
    const m = data.encounter_classes[cls].enemy_damage_multiplier;
    assert.ok(m >= prev, `${cls} multiplier ${m} not >= previous ${prev} (order violation)`);
    prev = m;
  }
});

test('boss_enrage_threshold_hp ∈ [0,1] or null', () => {
  const data = loadCurves();
  for (const [cls, def] of Object.entries(data.encounter_classes)) {
    const t = def.boss_enrage_threshold_hp;
    if (t === null || t === undefined) continue;
    assert.ok(t >= 0 && t <= 1, `${cls}.boss_enrage_threshold_hp ${t} out of [0,1]`);
  }
});

test('enemy_tiers: minion/elite/boss with required stats', () => {
  const data = loadCurves();
  for (const tier of ['minion', 'elite', 'boss']) {
    const def = data.enemy_tiers[tier];
    assert.ok(def, `missing tier: ${tier}`);
    for (const key of ['base_mod', 'hp_baseline', 'base_dc']) {
      assert.ok(Number.isFinite(def[key]), `${tier}.${key} must be number`);
    }
  }
});

test('enemy_tiers.boss has enrage_mod_bonus', () => {
  const data = loadCurves();
  assert.ok(
    Number.isFinite(data.enemy_tiers.boss.enrage_mod_bonus),
    'boss.enrage_mod_bonus required',
  );
});

test('player_classes: 7 jobs with required stats', () => {
  const data = loadCurves();
  const requiredJobs = [
    'vanguard',
    'warden',
    'invoker',
    'skirmisher',
    'ranger',
    'artificer',
    'harvester',
  ];
  for (const job of requiredJobs) {
    const def = data.player_classes[job];
    assert.ok(def, `missing job: ${job}`);
    for (const key of [
      'hp_baseline',
      'mod_baseline',
      'dc_baseline',
      'ap_baseline',
      'resistance_archetype',
    ]) {
      assert.ok(def[key] !== undefined, `${job}.${key} required`);
    }
  }
});

test('player_classes resistance_archetype values ∈ known archetypes', () => {
  const data = loadCurves();
  const known = new Set(['corazzato', 'bioelettrico', 'psionico', 'termico', 'adattivo']);
  for (const [job, def] of Object.entries(data.player_classes)) {
    assert.ok(
      known.has(def.resistance_archetype),
      `${job}.resistance_archetype ${def.resistance_archetype} not in known set`,
    );
  }
});
