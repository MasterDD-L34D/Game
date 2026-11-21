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

test('wound_location_weights (OD-058 D2) present + matches woundSystem.DEFAULT_LOCATION_WEIGHTS', () => {
  const data = loadCurves();
  const woundSystem = require(
    path.join(REPO_ROOT, 'apps', 'backend', 'services', 'combat', 'woundSystem'),
  );
  const w = data.wound_location_weights;
  assert.ok(w && typeof w === 'object', 'missing wound_location_weights section');
  // SPEC-D2 §4: torso heaviest (large target), testa lightest (hard/critical hit).
  assert.ok(w.torso > w.testa, 'torso weight must exceed testa');
  // Drift guard: YAML data-of-record must equal the in-code default/fallback.
  assert.deepEqual(w, woundSystem.DEFAULT_LOCATION_WEIGHTS);
});

// -- scenario_overrides + encounter_class guards (fleet-verify 2026-07-03) --
// The monotonic gate above validates only the canonical difficulty ladder.
// Three knobs were previously UN-gated: per-scenario
// enemy_damage_multiplier_override (scenario_overrides.*), cross-class step
// size, and the base enemy_damage_multiplier on the ADAPTER classes
// (badlands*/foresta_pilot) that sit OUTSIDE the ladder -- so a typo (edm 25),
// a silent >boss-ceiling override, or an over-tuned adapter could ship green.
// These guards are ADDITIVE and change zero data values: the DELIBERATE OD-032
// exceptions are encoded in explicit allowlists so a NEW, unexplained
// cliff/override fails CI while the calibrated ones keep passing.

const OVERRIDE_FLOOR = 1.0; // tutorial baseline; a multiplier below is suspect
const OVERRIDE_HARD_MAX = 3.0; // sanity ceiling; above = almost certainly a typo/regression
// Cliff cap sits below the real standard->hardcore step (1.8/1.2 = x1.5, the
// OD-032 wall) so that wall MUST be allowlisted, while ordinary ~x1.1 ladder
// steps pass unlisted. Any NEW step above this needs a conscious allowlist entry.
const LADDER_CLIFF_MAX_RATIO = 1.3;
const CANONICAL_LADDER = ['tutorial', 'tutorial_advanced', 'standard', 'hardcore', 'boss'];
// Adapter/pilot scenarios: non-oracle encounters whose difficulty is carried by
// the roster, NOT by a ladder position -- deliberately outside the monotonic +
// cliff checks. A NEW adapter class must be added here consciously (the
// classification-completeness test below fails otherwise).
const ADAPTER_CLASSES = new Set([
  'badlands',
  'badlands_ambient',
  'badlands_elite',
  'foresta_pilot',
]);
// OD-032: the standard->hardcore wall (1.2 -> 1.8, +50%) is a deliberate,
// N=40/N=100-calibrated difficulty spike tied to the turn_limit_defeat timer.
const ALLOWED_LADDER_CLIFFS = new Set(['standard->hardcore']);
// OD-032 / PR #2753 follow-up: hc07 edm 2.5 (> boss ceiling 2.0) is a re-center
// validated at N=100 seed 424242 (WR 42% in-band). Any OTHER override above the
// boss ceiling must be added here consciously (and carry a rationale).
const ALLOWED_OVERRIDES_ABOVE_CEILING = new Set(['enc_tutorial_07_hardcore_pod_rush']);

function collectEdmOverrides(data) {
  const out = [];
  for (const [id, def] of Object.entries(data.scenario_overrides ?? {})) {
    if (def && def.enemy_damage_multiplier_override !== undefined) {
      out.push({ id, value: def.enemy_damage_multiplier_override, rationale: def.rationale });
    }
  }
  return out;
}

test('scenario_overrides: every enemy_damage_multiplier_override within sanity band', () => {
  const data = loadCurves();
  for (const { id, value } of collectEdmOverrides(data)) {
    assert.equal(typeof value, 'number', `${id}: override must be numeric`);
    assert.ok(
      value >= OVERRIDE_FLOOR && value <= OVERRIDE_HARD_MAX,
      `${id}: override ${value} outside sanity band [${OVERRIDE_FLOOR}, ${OVERRIDE_HARD_MAX}] (typo/regression?)`,
    );
  }
});

test('scenario_overrides: any override above the boss ceiling must be allowlisted + carry a rationale', () => {
  const data = loadCurves();
  const bossCeiling = data.encounter_classes.boss.enemy_damage_multiplier;
  for (const { id, value, rationale } of collectEdmOverrides(data)) {
    if (value > bossCeiling) {
      assert.ok(
        ALLOWED_OVERRIDES_ABOVE_CEILING.has(id),
        `${id}: override ${value} exceeds boss ceiling ${bossCeiling} and is NOT allowlisted -- add it to ALLOWED_OVERRIDES_ABOVE_CEILING with justification, or lower the value`,
      );
      assert.ok(
        typeof rationale === 'string' && rationale.trim().length > 0,
        `${id}: over-ceiling override ${value} must document a rationale`,
      );
    }
  }
});

test('encounter_classes: every enemy_damage_multiplier within sanity band (canonical + adapter)', () => {
  const data = loadCurves();
  for (const [cls, def] of Object.entries(data.encounter_classes)) {
    const m = def.enemy_damage_multiplier;
    assert.equal(typeof m, 'number', `${cls}: enemy_damage_multiplier must be numeric`);
    assert.ok(
      m >= OVERRIDE_FLOOR && m <= OVERRIDE_HARD_MAX,
      `${cls}: enemy_damage_multiplier ${m} outside sanity band [${OVERRIDE_FLOOR}, ${OVERRIDE_HARD_MAX}] (typo/regression?)`,
    );
  }
});

test('encounter_classes: every class is either canonical-ladder or a declared adapter', () => {
  const data = loadCurves();
  for (const cls of Object.keys(data.encounter_classes)) {
    assert.ok(
      CANONICAL_LADDER.includes(cls) || ADAPTER_CLASSES.has(cls),
      `${cls}: unclassified encounter_class -- add it to CANONICAL_LADDER (gated by the cliff test) or ADAPTER_CLASSES (roster-carried, ungated) so a new class cannot silently escape both`,
    );
  }
});

test('encounter_classes: no un-allowlisted damage cliff across the canonical ladder', () => {
  const data = loadCurves();
  for (let i = 1; i < CANONICAL_LADDER.length; i += 1) {
    const from = CANONICAL_LADDER[i - 1];
    const to = CANONICAL_LADDER[i];
    const prev = data.encounter_classes[from].enemy_damage_multiplier;
    const curr = data.encounter_classes[to].enemy_damage_multiplier;
    const ratio = curr / prev;
    if (ratio > LADDER_CLIFF_MAX_RATIO) {
      assert.ok(
        ALLOWED_LADDER_CLIFFS.has(`${from}->${to}`),
        `${from}->${to}: multiplier jump ${prev} -> ${curr} (x${ratio.toFixed(2)}) exceeds cliff cap x${LADDER_CLIFF_MAX_RATIO} and is NOT allowlisted -- add '${from}->${to}' to ALLOWED_LADDER_CLIFFS with justification, or smooth the step`,
      );
    }
  }
});
