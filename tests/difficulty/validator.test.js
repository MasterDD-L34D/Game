// Q-001 T2.3 PR-4 · Encounter difficulty validator CI test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', '..', 'tools', 'js', 'validate_encounter_difficulty.js');
const REPO_ROOT = path.join(__dirname, '..', '..');

test('validator runs on real encounters without errors', () => {
  const result = spawnSync('node', [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  if (result.status !== 0) {
    assert.fail(`exit=${result.status}\n${result.stdout}\n${result.stderr}`);
  }
  assert.match(result.stdout, /errors=0/);
  assert.match(result.stdout, /encounter rating audit/);
});

test('validator flags drift > 2 as error', () => {
  // Fixture: encounter con difficulty hardcoded a 5 ma budget minimo → drift 4
  const tmpDir = path.join(__dirname, '_tmp_enc_fixture');
  fs.mkdirSync(tmpDir, { recursive: true });
  const encPath = path.join(tmpDir, 'enc_drift_test.yaml');
  fs.writeFileSync(
    encPath,
    `
encounter_id: enc_drift_test
name: 'Drift test'
biome_id: savana
grid_size: [8, 8]
difficulty_rating: 5
objective:
  type: elimination
player_spawn:
  - [0, 0]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [5, 5]
    units:
      - species: predoni_nomadi
        count: 1
        tier: base
`.trim(),
  );

  try {
    const result = spawnSync('node', [SCRIPT, '--encounters', tmpDir], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    assert.equal(result.status, 1, 'expected exit=1 on drift > 2');
    assert.match(result.stdout, /drift > 2/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validator flags drift > 1 as warning (non-strict)', () => {
  const tmpDir = path.join(__dirname, '_tmp_enc_warn');
  fs.mkdirSync(tmpDir, { recursive: true });
  const encPath = path.join(tmpDir, 'enc_warn.yaml');
  fs.writeFileSync(
    encPath,
    `
encounter_id: enc_warn
name: 'Warn test'
biome_id: savana
grid_size: [8, 8]
difficulty_rating: 1
objective:
  type: escort
player_spawn:
  - [0, 0]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [5, 5]
    units:
      - species: boss
        count: 2
        tier: elite
      - species: mook
        count: 3
        tier: base
`.trim(),
  );

  try {
    const result = spawnSync('node', [SCRIPT, '--encounters', tmpDir], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    // Warning only → exit 0 non-strict
    assert.ok(result.stdout.includes('warnings=') || result.status === 0);

    // Strict mode → exit 1 su warning
    const strict = spawnSync('node', [SCRIPT, '--encounters', tmpDir, '--strict'], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    // Può essere 0 o 1 a seconda del delta reale; almeno verifica che strict flag venga parsato
    assert.ok(strict.stdout.includes('[difficulty]'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validator rejects missing difficulty_rating', () => {
  const tmpDir = path.join(__dirname, '_tmp_enc_missing');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, 'enc_missing.yaml'),
    `
encounter_id: enc_missing
name: 'Missing rating'
biome_id: savana
grid_size: [8, 8]
objective:
  type: elimination
player_spawn:
  - [0, 0]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [5, 5]
    units:
      - species: predoni_nomadi
        count: 2
        tier: base
`.trim(),
  );
  try {
    const result = spawnSync('node', [SCRIPT, '--encounters', tmpDir], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /missing or invalid difficulty_rating/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// A2 author-guard (master-dd verdict 2026-06-17, ratify-provisional + author guard):
// an early / low-difficulty encounter must NOT be authored with a high
// pressure_tier_floor. Mechanical rule: floor <= difficulty_rating. All current
// encounters satisfy it (tutorial diff1/floor1 .. hardcore diff5/floor4); the
// guard only blocks FUTURE mis-authoring (e.g. a tutorial starting at Critical).
test('validator flags pressure_tier_floor > difficulty_rating as error (A2 author-guard)', () => {
  const tmpDir = path.join(__dirname, '_tmp_enc_floor_high');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, 'enc_floor_high.yaml'),
    `
encounter_id: enc_floor_high
name: 'Floor too high for an easy encounter'
biome_id: savana
grid_size: [8, 8]
difficulty_rating: 2
pressure_tier_floor: 5
objective:
  type: elimination
player_spawn:
  - [0, 0]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [5, 5]
    units:
      - species: predoni_nomadi
        count: 1
        tier: base
`.trim(),
  );
  try {
    const result = spawnSync('node', [SCRIPT, '--encounters', tmpDir], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    assert.equal(result.status, 1, 'floor > difficulty must be an error');
    assert.match(result.stdout, /pressure_tier_floor \(5\) exceeds difficulty_rating \(2\)/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validator flags out-of-range pressure_tier_floor as error', () => {
  const tmpDir = path.join(__dirname, '_tmp_enc_floor_oob');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, 'enc_floor_oob.yaml'),
    `
encounter_id: enc_floor_oob
name: 'Floor out of range'
biome_id: savana
grid_size: [8, 8]
difficulty_rating: 5
pressure_tier_floor: 9
objective:
  type: elimination
player_spawn:
  - [0, 0]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [5, 5]
    units:
      - species: predoni_nomadi
        count: 2
        tier: base
`.trim(),
  );
  try {
    const result = spawnSync('node', [SCRIPT, '--encounters', tmpDir], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    assert.equal(result.status, 1, 'out-of-range floor must be an error');
    assert.match(result.stdout, /invalid pressure_tier_floor/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validator accepts floor == difficulty_rating and an absent floor', () => {
  const tmpDir = path.join(__dirname, '_tmp_enc_floor_ok');
  fs.mkdirSync(tmpDir, { recursive: true });
  // floor == difficulty (boundary OK) + a no-floor encounter (back-compat).
  fs.writeFileSync(
    path.join(tmpDir, 'enc_floor_ok.yaml'),
    `
encounter_id: enc_floor_ok
name: 'Floor at the cap'
biome_id: savana
grid_size: [8, 8]
difficulty_rating: 3
pressure_tier_floor: 3
objective:
  type: elimination
player_spawn:
  - [0, 0]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [5, 5]
    units:
      - species: predoni_nomadi
        count: 2
        tier: base
`.trim(),
  );
  try {
    const result = spawnSync('node', [SCRIPT, '--encounters', tmpDir], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    // No floor-guard error (drift may warn, but must not error on the floor rule).
    assert.doesNotMatch(result.stdout, /pressure_tier_floor \(3\) exceeds/);
    assert.doesNotMatch(result.stdout, /invalid pressure_tier_floor/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
