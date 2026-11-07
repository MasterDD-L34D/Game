// Sprint 7 (B.1.8 #3) — Disco Elysium passive→active skill check popup.
//
// Pure unit tests on buildSkillCheckPayload + side-effect tests on
// renderSkillCheckPopups via injected pushPopup spy. No canvas/jsdom.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/skillCheckPopup.js');
}

describe('formatTraitLabel — Disco-style uppercase tag', () => {
  test('snake_case → SPACED UPPERCASE', async () => {
    const { formatTraitLabel } = await loadModule();
    assert.equal(formatTraitLabel('artigli_sette_vie'), 'ARTIGLI SETTE VIE');
    assert.equal(formatTraitLabel('serpente_di_terra'), 'SERPENTE DI TERRA');
  });

  test('null/undefined/empty → empty string', async () => {
    const { formatTraitLabel } = await loadModule();
    assert.equal(formatTraitLabel(null), '');
    assert.equal(formatTraitLabel(undefined), '');
    assert.equal(formatTraitLabel(''), '');
  });

  test('whitespace trimmed', async () => {
    const { formatTraitLabel } = await loadModule();
    assert.equal(formatTraitLabel('  thermal_armor  '), 'THERMAL ARMOR');
  });
});

describe('buildSkillCheckPayload — pure transform', () => {
  test('non-array input → empty array', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    assert.deepEqual(buildSkillCheckPayload(null), []);
    assert.deepEqual(buildSkillCheckPayload(undefined), []);
    assert.deepEqual(buildSkillCheckPayload({}), []);
    assert.deepEqual(buildSkillCheckPayload('not-array'), []);
  });

  test('empty array → empty payload', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    assert.deepEqual(buildSkillCheckPayload([]), []);
  });

  test('filters out triggered=false entries', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const traitEffects = [
      { trait: 'artigli_sette_vie', triggered: false, effect: 'none' },
      { trait: 'thermal_armor', triggered: true, effect: 'damage_reduction' },
      { trait: 'denti_seghettati', triggered: false, effect: 'deferred_status' },
    ];
    const out = buildSkillCheckPayload(traitEffects);
    assert.equal(out.length, 1);
    assert.equal(out[0].trait_id, 'thermal_armor');
    assert.equal(out[0].label, 'THERMAL ARMOR');
  });

  test('passes through triggered=true with effect tag', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const traitEffects = [{ trait: 'zampe_a_molla', triggered: true, effect: 'extra_damage' }];
    const out = buildSkillCheckPayload(traitEffects);
    assert.deepEqual(out, [
      { trait_id: 'zampe_a_molla', label: 'ZAMPE A MOLLA', effect_tag: 'extra_damage' },
    ]);
  });

  test('effect="none" → effect_tag null', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const out = buildSkillCheckPayload([{ trait: 'foo', triggered: true, effect: 'none' }]);
    assert.equal(out.length, 1);
    assert.equal(out[0].effect_tag, null);
  });

  test('dedupe: same trait surfaced twice → 1 popup', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const traitEffects = [
      { trait: 'thermal_armor', triggered: true, effect: 'damage_reduction' },
      { trait: 'thermal_armor', triggered: true, effect: 'damage_reduction' },
    ];
    const out = buildSkillCheckPayload(traitEffects);
    assert.equal(out.length, 1);
  });

  test('skipTraits opt filters known noisy traits', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const traitEffects = [
      { trait: 'noisy_trait', triggered: true, effect: 'none' },
      { trait: 'show_me', triggered: true, effect: 'extra_damage' },
    ];
    const out = buildSkillCheckPayload(traitEffects, { skipTraits: ['noisy_trait'] });
    assert.equal(out.length, 1);
    assert.equal(out[0].trait_id, 'show_me');
  });

  test('skipTraits accepts Set input', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const out = buildSkillCheckPayload([{ trait: 'a', triggered: true, effect: 'x' }], {
      skipTraits: new Set(['a']),
    });
    assert.deepEqual(out, []);
  });

  test('missing trait id → entry skipped (no crash)', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    const out = buildSkillCheckPayload([
      { triggered: true, effect: 'x' },
      { trait: '', triggered: true, effect: 'y' },
      { trait: 'real', triggered: true, effect: 'z' },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].trait_id, 'real');
  });

  test('mixed actor + target trait_effects (pre-Sprint 7 backend payload)', async () => {
    const { buildSkillCheckPayload } = await loadModule();
    // Mirrors apps/backend/services/traitEffects.js evaluateAttackTraits output
    // which collects actor-side + target-side traits in the same array.
    const traitEffects = [
      { trait: 'zampe_a_molla', triggered: true, effect: 'extra_damage' }, // actor
      { trait: 'denti_seghettati', triggered: false, effect: 'deferred_status' }, // actor
      { trait: 'thermal_armor', triggered: true, effect: 'damage_reduction' }, // target
    ];
    const out = buildSkillCheckPayload(traitEffects);
    assert.equal(out.length, 2);
    assert.equal(out[0].trait_id, 'zampe_a_molla');
    assert.equal(out[1].trait_id, 'thermal_armor');
  });
});

describe('renderSkillCheckPopups — side effect orchestration', () => {
  test('no actor → 0 popups (no crash)', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = (x, y, t, c) => calls.push({ x, y, t, c });
    const n = renderSkillCheckPopups(
      { trait_effects: [{ trait: 'a', triggered: true, effect: 'x' }] },
      null,
      fn,
    );
    assert.equal(n, 0);
    assert.equal(calls.length, 0);
  });

  test('actor without position → 0 popups', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = (x, y, t, c) => calls.push({ x, y, t, c });
    const n = renderSkillCheckPopups(
      { trait_effects: [{ trait: 'a', triggered: true, effect: 'x' }] },
      { id: 'u1' },
      fn,
    );
    assert.equal(n, 0);
    assert.equal(calls.length, 0);
  });

  test('non-function pushPopupFn → 0 popups (graceful)', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const n = renderSkillCheckPopups(
      { trait_effects: [{ trait: 'a', triggered: true, effect: 'x' }] },
      { id: 'u1', position: { x: 3, y: 4 } },
      null,
    );
    assert.equal(n, 0);
  });

  test('1 triggered trait → 1 immediate popup with bracket text', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = (x, y, t, c) => calls.push({ x, y, t, c });
    const n = renderSkillCheckPopups(
      { trait_effects: [{ trait: 'artigli_sette_vie', triggered: true, effect: 'extra_damage' }] },
      { id: 'u1', position: { x: 5, y: 6 } },
      fn,
      { delayMs: 0 },
    );
    assert.equal(n, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].x, 5);
    assert.equal(calls[0].y, 6);
    assert.equal(calls[0].t, '[ARTIGLI SETTE VIE]');
    assert.equal(typeof calls[0].c, 'string');
  });

  test('first popup fires immediately, subsequent popups via setTimeout', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = (x, y, t, c) => calls.push({ x, y, t, c });
    const n = renderSkillCheckPopups(
      {
        trait_effects: [
          { trait: 'a', triggered: true, effect: 'x' },
          { trait: 'b', triggered: true, effect: 'y' },
          { trait: 'c', triggered: true, effect: 'z' },
        ],
      },
      { id: 'u1', position: { x: 0, y: 0 } },
      fn,
      { delayMs: 1 },
    );
    assert.equal(n, 3);
    // Only the first popup fires synchronously; others are scheduled.
    assert.equal(calls.length, 1);
    assert.equal(calls[0].t, '[A]');
    // Wait for staggered timeouts to flush.
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(calls.length, 3);
    assert.equal(calls[1].t, '[B]');
    assert.equal(calls[2].t, '[C]');
  });

  test('y offset increases per popup (stack visually)', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = (x, y, t) => calls.push({ y, t });
    renderSkillCheckPopups(
      {
        trait_effects: [
          { trait: 'a', triggered: true, effect: 'x' },
          { trait: 'b', triggered: true, effect: 'y' },
        ],
      },
      { id: 'u1', position: { x: 0, y: 5 } },
      fn,
      { delayMs: 1 },
    );
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(calls.length, 2);
    assert.ok(calls[1].y < calls[0].y, 'second popup must be higher (lower y)');
  });

  test('no triggered traits → 0 popups, fn never called', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = () => calls.push(1);
    const n = renderSkillCheckPopups(
      {
        trait_effects: [
          { trait: 'a', triggered: false, effect: 'none' },
          { trait: 'b', triggered: false, effect: 'deferred_status' },
        ],
      },
      { id: 'u1', position: { x: 0, y: 0 } },
      fn,
    );
    assert.equal(n, 0);
    assert.equal(calls.length, 0);
  });

  test('null event → 0 popups', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const fn = () => {};
    assert.equal(renderSkillCheckPopups(null, { position: { x: 0, y: 0 } }, fn), 0);
  });

  test('opts.color overrides default popup color', async () => {
    const { renderSkillCheckPopups } = await loadModule();
    const calls = [];
    const fn = (x, y, t, c) => calls.push(c);
    renderSkillCheckPopups(
      { trait_effects: [{ trait: 'a', triggered: true, effect: 'x' }] },
      { id: 'u1', position: { x: 0, y: 0 } },
      fn,
      { color: '#abcdef' },
    );
    assert.equal(calls[0], '#abcdef');
  });
});
