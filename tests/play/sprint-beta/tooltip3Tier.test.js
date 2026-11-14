// Sprint β Visual UX 2026-04-28 — Civ VI 3-tier tooltip stratificato.
//
// Pattern donor: docs/research/2026-04-27-strategy-games-design-extraction.md §1.
// Tier 1 @ 300ms (icon + name) → Tier 2 @ 800ms (stats) → Tier 3 @ 1500ms (lore).
// Pure helpers in render.js (tooltipTierForElapsed + buildTooltipData) testabili
// senza canvas/jsdom.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadRender() {
  return import('../../../apps/play/src/render.js');
}

describe('tooltipTierForElapsed — delay tiers (Civ VI canonical)', () => {
  test('elapsed < 300ms → tier 0 (nothing)', async () => {
    const { tooltipTierForElapsed } = await loadRender();
    assert.equal(tooltipTierForElapsed(0), 0);
    assert.equal(tooltipTierForElapsed(150), 0);
    assert.equal(tooltipTierForElapsed(299), 0);
  });

  test('elapsed >= 300ms && < 800ms → tier 1 (icon + name)', async () => {
    const { tooltipTierForElapsed } = await loadRender();
    assert.equal(tooltipTierForElapsed(300), 1);
    assert.equal(tooltipTierForElapsed(500), 1);
    assert.equal(tooltipTierForElapsed(799), 1);
  });

  test('elapsed >= 800ms && < 1500ms → tier 2 (stats panel)', async () => {
    const { tooltipTierForElapsed } = await loadRender();
    assert.equal(tooltipTierForElapsed(800), 2);
    assert.equal(tooltipTierForElapsed(1200), 2);
    assert.equal(tooltipTierForElapsed(1499), 2);
  });

  test('elapsed >= 1500ms → tier 3 (full + lore)', async () => {
    const { tooltipTierForElapsed } = await loadRender();
    assert.equal(tooltipTierForElapsed(1500), 3);
    assert.equal(tooltipTierForElapsed(5000), 3);
  });

  test('non-finite / negative → tier 0 (safe)', async () => {
    const { tooltipTierForElapsed } = await loadRender();
    assert.equal(tooltipTierForElapsed(-100), 0);
    assert.equal(tooltipTierForElapsed(NaN), 0);
    assert.equal(tooltipTierForElapsed(undefined), 0);
    assert.equal(tooltipTierForElapsed('not a number'), 0);
  });

  test('TOOLTIP_TIER_DELAYS canonical values (300/800/1500)', async () => {
    const { TOOLTIP_TIER_DELAYS } = await loadRender();
    assert.equal(TOOLTIP_TIER_DELAYS.tier1, 300);
    assert.equal(TOOLTIP_TIER_DELAYS.tier2, 800);
    assert.equal(TOOLTIP_TIER_DELAYS.tier3, 1500);
  });
});

describe('buildTooltipData — progressive disclosure per tier', () => {
  const sampleUnit = {
    id: 'u1',
    label: 'Sergente',
    icon: '🎖️',
    hp: 8,
    hp_max: 12,
    ap: 2,
    attack: 5,
    defense: 3,
    flavor: 'Veterano della prima ondata.',
  };

  test('tier 0 → empty (no name, no stats, no lore)', async () => {
    const { buildTooltipData } = await loadRender();
    const d = buildTooltipData(sampleUnit, 0);
    assert.equal(d.tier, 0);
    assert.equal(d.name, undefined);
    assert.equal(d.stats, undefined);
    assert.equal(d.lore, undefined);
  });

  test('tier 1 → name + icon only', async () => {
    const { buildTooltipData } = await loadRender();
    const d = buildTooltipData(sampleUnit, 1);
    assert.equal(d.tier, 1);
    assert.equal(d.name, 'Sergente');
    assert.equal(d.icon, '🎖️');
    assert.equal(d.stats, undefined);
    assert.equal(d.lore, undefined);
  });

  test('tier 2 → name + icon + stats panel (no lore)', async () => {
    const { buildTooltipData } = await loadRender();
    const d = buildTooltipData(sampleUnit, 2);
    assert.equal(d.tier, 2);
    assert.equal(d.name, 'Sergente');
    assert.deepEqual(d.stats, { hp: 8, hp_max: 12, ap: 2, attack: 5, defense: 3 });
    assert.equal(d.lore, undefined);
  });

  test('tier 3 → full disclosure (name + stats + lore)', async () => {
    const { buildTooltipData } = await loadRender();
    const d = buildTooltipData(sampleUnit, 3);
    assert.equal(d.tier, 3);
    assert.equal(d.name, 'Sergente');
    assert.equal(d.stats.hp, 8);
    assert.equal(d.lore, 'Veterano della prima ondata.');
  });

  test('null unit → empty tier 0 regardless of requested tier', async () => {
    const { buildTooltipData } = await loadRender();
    assert.deepEqual(buildTooltipData(null, 3), { tier: 0 });
    assert.deepEqual(buildTooltipData(undefined, 2), { tier: 0 });
  });

  test('unit senza label → fallback su id', async () => {
    const { buildTooltipData } = await loadRender();
    const d = buildTooltipData({ id: 'sis_01' }, 1);
    assert.equal(d.name, 'sis_01');
  });
});

// Test 12 (extra) — Stack disjoint = chiamare buildTooltipData con unit diversi
// non lascia residuo dello stato precedente (pure function check).
describe('tooltip stack disjoint (pure function isolation)', () => {
  test('chiamate consecutive con unit diversi sono indipendenti', async () => {
    const { buildTooltipData } = await loadRender();
    const a = buildTooltipData({ id: 'a', label: 'Alpha', hp: 5 }, 2);
    const b = buildTooltipData({ id: 'b', label: 'Beta', hp: 9 }, 2);
    assert.equal(a.name, 'Alpha');
    assert.equal(b.name, 'Beta');
    assert.equal(a.stats.hp, 5);
    assert.equal(b.stats.hp, 9);
  });
});
