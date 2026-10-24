// tests/services/senseReveal.test.js
//
// Skiv Goal 2 — Echolocation visual pulse pure helper tests.
//
// Covers:
//   1. base radius 1 (no trait) — 4 adjacent tiles revealed
//   2. trait `sensori_geomagnetici` bonus → radius 2 (Manhattan ≤2)
//   3. cooldown 2 round suppresses reveal
//   4. actor without `default_parts.senses[echolocation]` → empty array

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getRevealedTiles,
  markCooldown,
  BASE_RADIUS,
  BONUS_TRAIT_ID,
  COOLDOWN_ROUNDS,
} = require('../../apps/backend/services/combat/senseReveal');

function makeActor(overrides = {}) {
  return {
    id: 'p_skiv',
    hp: 14,
    default_parts: { senses: ['echolocation'] },
    trait_ids: [],
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeTarget(x = 4, y = 4) {
  return { id: 'e_pulverator', hp: 8, position: { x, y } };
}

// 1 — base radius
test('base radius 1: 4 Manhattan-adjacent tiles revealed (no bonus trait)', () => {
  const actor = makeActor();
  const target = makeTarget(4, 4);
  const tiles = getRevealedTiles(actor, target, { width: 8, height: 8, currentRound: 1 });
  // Manhattan radius 1 around (4,4) excluding center → 4 tiles.
  assert.equal(tiles.length, 4);
  const set = new Set(tiles.map((t) => `${t.x},${t.y}`));
  assert.ok(set.has('3,4'));
  assert.ok(set.has('5,4'));
  assert.ok(set.has('4,3'));
  assert.ok(set.has('4,5'));
  assert.equal(BASE_RADIUS, 1);
});

// 2 — trait bonus
test('trait sensori_geomagnetici bumps radius to 2 (Manhattan ring)', () => {
  const actor = makeActor({ trait_ids: [BONUS_TRAIT_ID] });
  const target = makeTarget(4, 4);
  const tiles = getRevealedTiles(actor, target, { width: 10, height: 10, currentRound: 1 });
  // Manhattan radius 2 around (4,4) excluding center.
  // Ring r=1 → 4 tiles, ring r=2 → 8 tiles, total = 12.
  assert.equal(tiles.length, 12);
  const set = new Set(tiles.map((t) => `${t.x},${t.y}`));
  // r=2 corners (Manhattan 2): (4±2,4) (4,4±2) + (3,3) (3,5) (5,3) (5,5)
  assert.ok(set.has('2,4'));
  assert.ok(set.has('6,4'));
  assert.ok(set.has('4,2'));
  assert.ok(set.has('4,6'));
  assert.ok(set.has('3,3'));
  assert.ok(set.has('5,5'));
  // Center never revealed.
  assert.ok(!set.has('4,4'));
});

// 3 — cooldown suppression
test('cooldown 2 round suppresses reveal until round elapses', () => {
  const actor = makeActor();
  const target = makeTarget(4, 4);
  // Round 3 — first pulse OK.
  const t1 = getRevealedTiles(actor, target, { width: 8, height: 8, currentRound: 3 });
  assert.equal(t1.length, 4);
  // Mark cooldown — until_round = 3 + 2 = 5
  markCooldown(actor, 3);
  assert.equal(actor._sense_reveal_cooldown_until_round, 3 + COOLDOWN_ROUNDS);
  // Round 4 still on cooldown.
  const t2 = getRevealedTiles(actor, target, { width: 8, height: 8, currentRound: 4 });
  assert.equal(t2.length, 0);
  // Round 5 reveal allowed again (currentRound >= until_round).
  const t3 = getRevealedTiles(actor, target, { width: 8, height: 8, currentRound: 5 });
  assert.equal(t3.length, 4);
});

// 4 — edge: no senses → empty
test('actor without echolocation sense → empty array', () => {
  const actor = makeActor({ default_parts: { senses: ['vision'] } });
  const target = makeTarget(4, 4);
  const tiles = getRevealedTiles(actor, target, { width: 8, height: 8, currentRound: 1 });
  assert.equal(tiles.length, 0);

  // Also: no default_parts at all.
  const naked = makeActor({ default_parts: undefined });
  assert.equal(getRevealedTiles(naked, target, { currentRound: 1 }).length, 0);

  // Also: no target.
  const ok = makeActor();
  assert.equal(getRevealedTiles(ok, null, { currentRound: 1 }).length, 0);

  // Also: target without position.
  assert.equal(getRevealedTiles(ok, { id: 'e' }, { currentRound: 1 }).length, 0);
});

// 5 — Gate 5 surface evidence: drawEcholocationPulse changes canvas state.
// Loads render.js via dynamic import (ESM, browser-targeted module) and
// asserts the draw helper records strokes/arcs on a stubbed 2D context.
test('drawEcholocationPulse records canvas operations when pulse armed', async () => {
  // Stub canvas 2D ctx — record method calls.
  const calls = [];
  const stubCtx = {
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    beginPath: () => calls.push(['beginPath']),
    arc: (...args) => calls.push(['arc', ...args]),
    stroke: () => calls.push(['stroke']),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
    set globalAlpha(v) {
      calls.push(['globalAlpha', v]);
    },
    set strokeStyle(v) {
      calls.push(['strokeStyle', v]);
    },
    set fillStyle(v) {
      calls.push(['fillStyle', v]);
    },
    set lineWidth(v) {
      calls.push(['lineWidth', v]);
    },
    set font(v) {
      calls.push(['font', v]);
    },
    set textAlign(v) {
      calls.push(['textAlign', v]);
    },
    set textBaseline(v) {
      calls.push(['textBaseline', v]);
    },
  };

  const renderMod = await import('../../apps/play/src/render.js');
  // Reset state for deterministic run.
  renderMod._resetEcholocationStateForTests();
  // No pulses → draw is a no-op (still calls save/restore? no — guard returns early).
  const before = calls.length;
  renderMod.drawEcholocationPulse(stubCtx, { gridH: 8 });
  assert.equal(calls.length, before, 'no-op when no pulses');

  // Arm a pulse on a target.
  const armed = renderMod.armEcholocationPulse({ id: 'e1', position: { x: 4, y: 4 } });
  assert.equal(armed, true);
  assert.equal(renderMod.hasActiveEchoPulse(), true);

  // Now draw — must produce stroke + arc operations.
  renderMod.drawEcholocationPulse(stubCtx, { gridH: 8 });
  const opNames = calls.map((c) => c[0]);
  assert.ok(opNames.includes('arc'), 'pulse circle drawn');
  assert.ok(opNames.includes('stroke'), 'stroke applied');
  assert.ok(opNames.includes('save'), 'save guard');
  assert.ok(opNames.includes('restore'), 'restore guard');
  // Color check — strokeStyle set to canonical cyan.
  const styleCalls = calls.filter((c) => c[0] === 'strokeStyle');
  assert.ok(
    styleCalls.some((c) => String(c[1]).toLowerCase() === '#66d1fb'),
    'strokeStyle cyan',
  );

  // Reveal layer kicks in when revealedTiles passed.
  calls.length = 0;
  renderMod.drawEcholocationPulse(stubCtx, {
    gridH: 8,
    revealedTiles: [
      { x: 3, y: 4 },
      { x: 5, y: 4 },
    ],
  });
  const ops = calls.map((c) => c[0]);
  assert.ok(ops.includes('fillText'), '"?" glyph drawn for revealed tiles');
  assert.ok(ops.includes('fillRect'), 'tile background tint drawn');

  // Cleanup.
  renderMod._resetEcholocationStateForTests();
});

// 6 — hover debounce gate
test('shouldArmPulseForHover requires threshold elapsed', async () => {
  const renderMod = await import('../../apps/play/src/render.js');
  renderMod._resetEcholocationStateForTests();
  const t0 = 1_000_000;
  // First call: opens window, returns false.
  assert.equal(renderMod.shouldArmPulseForHover('actor', 'tgt', t0), false);
  // Below threshold.
  assert.equal(renderMod.shouldArmPulseForHover('actor', 'tgt', t0 + 100), false);
  // Above threshold.
  assert.equal(renderMod.shouldArmPulseForHover('actor', 'tgt', t0 + 600), true);
  assert.ok(renderMod.getEcholocationHoverThresholdMs() >= 400);
  renderMod._resetEcholocationStateForTests();
});
