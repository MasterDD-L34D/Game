// OD-025 smoke test — verify Promotions cross-stack stack is LIVE (NOT orphan).
//
// PR #2260 audit L7c row claimed "Promotions COMPLETE ORPHAN" (engine=0 LOC,
// routes=0, test=0). This smoke test is the verification gate per ai-station
// re-verdict 2026-05-14: REJECT framing "demolish", revise TKT-ECO-B7 to
// "verify-only smoke 0.5h". See docs/governance/open-decisions/
// OD-024-031-verdict-record.md.
//
// Cross-stack reality (verified 2026-05-13):
//   - apps/backend/services/progression/promotionEngine.js — 302 LOC LIVE
//   - apps/backend/routes/session.js:208 imports evaluatePromotion + applyPromotion
//   - Routes /api/session/:id/promotion-eligibility + /api/session/:id/promote
//   - Godot v2 stack: PromotionEngine.gd #226 + PromotionPanel #243 +
//                     caller wire #252 + D2-C Postgres mirror #2259+#253+#254+#256
//
// This smoke locks the engine + route wire so future drift gets caught.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ENGINE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'backend',
  'services',
  'progression',
  'promotionEngine.js',
);
const ROUTES_PATH = path.join(REPO_ROOT, 'apps', 'backend', 'routes', 'session.js');

test('promotionEngine file exists with non-trivial implementation', () => {
  assert.ok(fs.existsSync(ENGINE_PATH), 'promotionEngine.js must exist');
  const src = fs.readFileSync(ENGINE_PATH, 'utf8');
  const lineCount = src.split('\n').length;
  assert.ok(
    lineCount >= 250,
    `promotionEngine.js should be ≥250 LOC (audit L7c FALSE claim of 0 LOC), got ${lineCount}`,
  );
});

test('promotionEngine exports canonical 7-function surface', () => {
  const engine = require(ENGINE_PATH);
  const expected = [
    'loadPromotionConfig',
    'resetCache',
    'computeUnitMetrics',
    'evaluatePromotion',
    'applyPromotion',
    'currentTier',
    'nextTier',
    'FALLBACK_CONFIG',
  ];
  for (const name of expected) {
    assert.ok(name in engine, `promotionEngine must export ${name}`);
  }
  assert.equal(typeof engine.evaluatePromotion, 'function');
  assert.equal(typeof engine.applyPromotion, 'function');
});

test('evaluatePromotion + applyPromotion happy path (FALLBACK_CONFIG)', () => {
  const engine = require(ENGINE_PATH);
  // Synthetic unit eligible for veteran via FALLBACK_CONFIG thresholds
  // (veteran: kills_min:3, objectives_min:1).
  const unit = {
    id: 'unit-smoke-1',
    job_id: 'guerriero',
    promotion_tier: 'base',
    hp: 20,
    max_hp: 20,
    attack_mod: 2,
  };
  const eventLog = [
    {
      action_type: 'attack',
      actor_id: 'unit-smoke-1',
      target_id: 'enemy-a',
      killed: true,
      turn: 1,
    },
    {
      action_type: 'attack',
      actor_id: 'unit-smoke-1',
      target_id: 'enemy-b',
      killed: true,
      turn: 2,
    },
    {
      action_type: 'attack',
      actor_id: 'unit-smoke-1',
      target_id: 'enemy-c',
      killed: true,
      turn: 3,
    },
    {
      action_type: 'objective_complete',
      actor_id: 'unit-smoke-1',
      objective_id: 'obj-1',
      result: 'ok',
      turn: 4,
    },
  ];
  const eligibility = engine.evaluatePromotion(unit, eventLog);
  assert.ok(eligibility, 'evaluatePromotion must return result object');
  assert.equal(eligibility.eligible, true, `unit should be eligible: ${eligibility.reason}`);
  assert.equal(eligibility.next_tier, 'veteran', 'next_tier should be veteran');
  assert.equal(eligibility.metrics.kills, 3, 'metrics.kills should match event log');
  assert.equal(eligibility.metrics.objectives, 1, 'metrics.objectives should match event log');

  const result = engine.applyPromotion(unit, 'veteran');
  assert.equal(result.ok, true, `applyPromotion should succeed: ${result.error || 'no-error'}`);
  assert.equal(unit.promotion_tier, 'veteran', 'unit.promotion_tier should be updated');
  assert.ok(unit.max_hp > 20, `max_hp should be increased, got ${unit.max_hp}`);
  assert.ok(unit.attack_mod > 2, `attack_mod should be increased, got ${unit.attack_mod}`);
  assert.equal(unit.ability_tier_unlocked, 'r2', 'ability_unlock_tier should be set');
});

test('session.js routes wire promotion endpoints (NOT orphan)', () => {
  const src = fs.readFileSync(ROUTES_PATH, 'utf8');
  assert.match(
    src,
    /require\(['"]\.\.\/services\/progression\/promotionEngine['"]\)/,
    'session.js must require promotionEngine from progression sub-dir (audit L7c missed this path)',
  );
  assert.match(
    src,
    /\{\s*evaluatePromotion,\s*applyPromotion\s*\}/,
    'session.js must destructure evaluatePromotion + applyPromotion',
  );
  assert.match(
    src,
    /\/:id\/promotion-eligibility/,
    'session.js must mount /api/session/:id/promotion-eligibility',
  );
  assert.match(src, /\/:id\/promote/, 'session.js must mount /api/session/:id/promote');
});

test('FALLBACK_CONFIG has canonical 5-tier ladder (post OD-025-B2)', () => {
  // 2026-05-14 ai-station drift fix: FALLBACK_CONFIG bumped v0.1.0 → v0.2.0
  // to align with promotions.yaml v0.2.0 + Godot v2 mirror. Previous 3-tier
  // assertion was stale relative to canonical YAML.
  const engine = require(ENGINE_PATH);
  const cfg = engine.FALLBACK_CONFIG;
  assert.ok(Array.isArray(cfg.tier_ladder), 'tier_ladder must be array');
  assert.deepEqual(
    cfg.tier_ladder,
    ['base', 'veteran', 'captain', 'elite', 'master'],
    'canonical ladder 5-tier (base→veteran→captain→elite→master) per OD-025-B2',
  );
  assert.ok(cfg.thresholds.veteran, 'veteran threshold defined');
  assert.ok(cfg.thresholds.captain, 'captain threshold defined');
  assert.ok(cfg.thresholds.elite, 'elite threshold defined (OD-025-B2)');
  assert.ok(cfg.thresholds.master, 'master threshold defined (OD-025-B2)');
});
