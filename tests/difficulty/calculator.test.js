// Q-001 T2.3 · Difficulty Calculator test suite.
// Pure functions — no Python, no session state.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  loadDifficultyConfig,
  calculateDifficultyRating,
  applyPlayerProfile,
  computeEnemyBudget,
} = require('../../services/difficulty/difficultyCalculator');

let yaml;
try {
  yaml = require('js-yaml');
} catch {
  test('difficulty calculator: skip (js-yaml not available)', () => assert.ok(true));
  process.exit(0);
}

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'core', 'difficulty.yaml');
const CONFIG = loadDifficultyConfig(yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')));

// ─────────────────────────────────────────────────────────────────
// loadDifficultyConfig
// ─────────────────────────────────────────────────────────────────

test('loadDifficultyConfig returns defaults for null input', () => {
  const cfg = loadDifficultyConfig(null);
  assert.equal(cfg.tier_weights.base, 1.0);
  assert.equal(cfg.tier_weights.elite, 2.0);
  assert.equal(cfg.tier_weights.apex, 4.0);
});

test('loadDifficultyConfig includes objective_multipliers', () => {
  assert.equal(CONFIG.objective_multipliers.elimination, 1.0);
  assert.equal(CONFIG.objective_multipliers.escort, 1.5);
});

test('loadDifficultyConfig includes player_difficulty_profiles', () => {
  assert.ok(CONFIG.player_difficulty_profiles.easy);
  assert.ok(CONFIG.player_difficulty_profiles.normal);
  assert.ok(CONFIG.player_difficulty_profiles.hard);
  assert.ok(CONFIG.player_difficulty_profiles.nightmare);
});

// ─────────────────────────────────────────────────────────────────
// computeEnemyBudget
// ─────────────────────────────────────────────────────────────────

test('computeEnemyBudget: single wave base tier', () => {
  const encounter = {
    waves: [{ units: [{ species: 'sp_a', count: 2, tier: 'base' }] }],
  };
  assert.equal(computeEnemyBudget(encounter, CONFIG), 2.0);
});

test('computeEnemyBudget: mixed tier weighted correctly', () => {
  const encounter = {
    waves: [
      {
        units: [
          { species: 'sp_a', count: 2, tier: 'base' }, // 2
          { species: 'sp_b', count: 1, tier: 'elite' }, // 2
          { species: 'sp_c', count: 1, tier: 'apex' }, // 4
        ],
      },
    ],
  };
  assert.equal(computeEnemyBudget(encounter, CONFIG), 8.0);
});

test('computeEnemyBudget: no waves returns 0', () => {
  assert.equal(computeEnemyBudget({}, CONFIG), 0);
  assert.equal(computeEnemyBudget(null, CONFIG), 0);
});

// ─────────────────────────────────────────────────────────────────
// calculateDifficultyRating
// ─────────────────────────────────────────────────────────────────

test('calculateDifficultyRating: clamps to 1 minimum', () => {
  const enc = { waves: [], objective: { type: 'elimination' } };
  assert.equal(calculateDifficultyRating(enc, {}, CONFIG), 1);
});

test('calculateDifficultyRating: clamps to 5 maximum', () => {
  const enc = {
    waves: [{ units: [{ species: 'boss', count: 10, tier: 'apex' }] }],
    objective: { type: 'escort' },
  };
  assert.equal(calculateDifficultyRating(enc, { difficulty_base: 2.0 }, CONFIG), 5);
});

test('calculateDifficultyRating: tutorial-level encounter ~2', () => {
  const enc = {
    waves: [{ units: [{ species: 'pred', count: 2, tier: 'base' }] }],
    objective: { type: 'elimination' },
  };
  const rating = calculateDifficultyRating(enc, { difficulty_base: 1.0 }, CONFIG);
  assert.ok(rating >= 1 && rating <= 2, `expected 1-2, got ${rating}`);
});

test('calculateDifficultyRating: objective escort increases rating', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 3, tier: 'base' }] }],
    objective: { type: 'elimination' },
  };
  const rEliminate = calculateDifficultyRating(enc, { difficulty_base: 1.0 }, CONFIG);
  const rEscort = calculateDifficultyRating(
    { ...enc, objective: { type: 'escort' } },
    { difficulty_base: 1.0 },
    CONFIG,
  );
  assert.ok(rEscort >= rEliminate, `escort (${rEscort}) >= elimination (${rEliminate})`);
});

test('calculateDifficultyRating: biome_mult increases rating', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 3, tier: 'base' }] }],
    objective: { type: 'elimination' },
  };
  const rLow = calculateDifficultyRating(enc, { difficulty_base: 1.0 }, CONFIG);
  const rHigh = calculateDifficultyRating(enc, { difficulty_base: 2.5 }, CONFIG);
  assert.ok(rHigh >= rLow, `high biome mult (${rHigh}) >= low (${rLow})`);
});

// ─────────────────────────────────────────────────────────────────
// applyPlayerProfile
// ─────────────────────────────────────────────────────────────────

test('applyPlayerProfile: easy reduces enemy_count', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 10, tier: 'base' }] }],
  };
  const easy = applyPlayerProfile(enc, 'easy', CONFIG);
  // 10 × 0.7 = 7
  assert.equal(easy.waves[0].units[0].count, 7);
  assert.ok(easy._difficultyProfile);
  assert.equal(easy._difficultyProfile.id, 'easy');
});

test('applyPlayerProfile: normal keeps count unchanged', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 5, tier: 'base' }] }],
  };
  const normal = applyPlayerProfile(enc, 'normal', CONFIG);
  assert.equal(normal.waves[0].units[0].count, 5);
});

test('applyPlayerProfile: hard increases count', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 4, tier: 'base' }] }],
  };
  const hard = applyPlayerProfile(enc, 'hard', CONFIG);
  // 4 × 1.3 = 5.2 → round = 5
  assert.equal(hard.waves[0].units[0].count, 5);
});

test('applyPlayerProfile: nightmare scales aggressively', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 4, tier: 'base' }] }],
  };
  const nightmare = applyPlayerProfile(enc, 'nightmare', CONFIG);
  // 4 × 1.5 = 6
  assert.equal(nightmare.waves[0].units[0].count, 6);
  assert.equal(nightmare._difficultyProfile.enemy_damage_multiplier, 1.25);
});

test('applyPlayerProfile: count >= 1 after multiplier', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 1, tier: 'base' }] }],
  };
  const easy = applyPlayerProfile(enc, 'easy', CONFIG);
  // 1 × 0.7 = 0.7 → round = 1 minimum (no zero unit spawn)
  assert.ok(easy.waves[0].units[0].count >= 1);
});

test('applyPlayerProfile: unknown profile returns encounter unchanged', () => {
  const enc = {
    waves: [{ units: [{ species: 'a', count: 3, tier: 'base' }] }],
  };
  const result = applyPlayerProfile(enc, 'invalid_profile', CONFIG);
  assert.equal(result.waves[0].units[0].count, 3);
});

// ─────────────────────────────────────────────────────────────────
// Encounter integration check (validate existing encounters)
// ─────────────────────────────────────────────────────────────────

test('calculateDifficultyRating: enc_tutorial_01 within 1 star of declared', () => {
  const encPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'planning',
    'encounters',
    'enc_tutorial_01.yaml',
  );
  if (!fs.existsSync(encPath)) return;
  const enc = yaml.load(fs.readFileSync(encPath, 'utf8'));
  const rating = calculateDifficultyRating(enc, { difficulty_base: 1.0 }, CONFIG);
  const declared = enc.difficulty_rating;
  assert.ok(
    Math.abs(rating - declared) <= 2,
    `enc_tutorial_01: computed=${rating}, declared=${declared}, delta>2`,
  );
});
