// Action 7 (ADR-2026-04-28 §Action 7) — CT bar lookahead 3 turni.
//
// Pure transforms (statusPenalty + effectivePriority + computeCtBarLookahead +
// formatCtBarSlot + formatCtBar) + side-effect renderCtBar via fake DOM.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/ctBar.js');
}

describe('statusPenalty — pure', () => {
  test('no statuses → zero', async () => {
    const { statusPenalty } = await loadModule();
    assert.equal(statusPenalty([]), 0);
    assert.equal(statusPenalty(null), 0);
    assert.equal(statusPenalty(undefined), 0);
  });

  test('panic intensity scales penalty -2 each', async () => {
    const { statusPenalty } = await loadModule();
    assert.equal(statusPenalty([{ id: 'panic', intensity: 1 }]), 2);
    assert.equal(statusPenalty([{ id: 'panic', intensity: 2 }]), 4);
  });

  test('disorient intensity scales penalty -1 each', async () => {
    const { statusPenalty } = await loadModule();
    assert.equal(statusPenalty([{ id: 'disorient', intensity: 1 }]), 1);
    assert.equal(statusPenalty([{ id: 'disorient', intensity: 3 }]), 3);
  });

  test('rage/focused/stunned NOT penalized here', async () => {
    const { statusPenalty } = await loadModule();
    assert.equal(statusPenalty([{ id: 'rage', intensity: 5 }]), 0);
    assert.equal(statusPenalty([{ id: 'focused', intensity: 2 }]), 0);
    assert.equal(statusPenalty([{ id: 'stunned', intensity: 1 }]), 0);
  });

  test('mixed statuses sum correctly', async () => {
    const { statusPenalty } = await loadModule();
    const s = [
      { id: 'panic', intensity: 2 },
      { id: 'disorient', intensity: 1 },
      { id: 'rage', intensity: 5 },
    ];
    assert.equal(statusPenalty(s), 4 + 1);
  });
});

describe('effectivePriority — pure', () => {
  test('initiative no statuses → base value', async () => {
    const { effectivePriority } = await loadModule();
    assert.equal(effectivePriority({ initiative: 12 }), 12);
  });

  test('initiative + panic → reduced', async () => {
    const { effectivePriority } = await loadModule();
    assert.equal(
      effectivePriority({ initiative: 10, statuses: [{ id: 'panic', intensity: 2 }] }),
      6,
    );
  });

  test('null/undefined unit → 0', async () => {
    const { effectivePriority } = await loadModule();
    assert.equal(effectivePriority(null), 0);
    assert.equal(effectivePriority(undefined), 0);
    assert.equal(effectivePriority({}), 0);
  });
});

describe('computeCtBarLookahead — core slot ordering', () => {
  function mkUnit(id, init, opts = {}) {
    return {
      id,
      name: opts.name || id,
      initiative: init,
      hp: opts.hp == null ? 10 : opts.hp,
      controlled_by: opts.controlled_by || 'player',
      statuses: opts.statuses || [],
      archetype: opts.archetype || null,
    };
  }

  test('null/empty input → empty array', async () => {
    const { computeCtBarLookahead } = await loadModule();
    assert.deepEqual(computeCtBarLookahead(null), []);
    assert.deepEqual(computeCtBarLookahead({}), []);
    assert.deepEqual(computeCtBarLookahead({ units: [] }), []);
  });

  test('4 unit alive → 4 slot (current + 3 lookahead)', async () => {
    const { computeCtBarLookahead } = await loadModule();
    const view = {
      units: [mkUnit('skiv', 14), mkUnit('enemy1', 10), mkUnit('healer', 8), mkUnit('enemy2', 6)],
      active_unit: 'skiv',
    };
    const slots = computeCtBarLookahead(view, 3);
    assert.equal(slots.length, 4);
    assert.equal(slots[0].id, 'skiv');
    assert.equal(slots[0].isCurrent, true);
    assert.equal(slots[1].id, 'enemy1');
    assert.equal(slots[2].id, 'healer');
    assert.equal(slots[3].id, 'enemy2');
  });

  test('KO unit (hp=0) excluded from lookahead', async () => {
    const { computeCtBarLookahead } = await loadModule();
    const view = {
      units: [
        mkUnit('skiv', 14),
        mkUnit('enemy_dead', 12, { hp: 0 }),
        mkUnit('healer', 10),
        mkUnit('enemy_low', 8, { hp: 1 }),
      ],
      active_unit: 'skiv',
    };
    const slots = computeCtBarLookahead(view, 3);
    const ids = slots.map((s) => s.id);
    // KO unit must be filtered out
    assert.ok(!ids.includes('enemy_dead'));
    // Alive units present (3 alive)
    assert.ok(ids.includes('skiv'));
    assert.ok(ids.includes('healer'));
    assert.ok(ids.includes('enemy_low'));
    // 3 alive + lookahead=3 → 4 slot via ring wrap (current + 3 future)
    assert.equal(slots.length, 4);
  });

  test('panic status reduces unit slip to later slot', async () => {
    const { computeCtBarLookahead } = await loadModule();
    // skiv has init 12 — should beat enemy1 (init 10) normally,
    // but panic intensity 2 = -4 penalty → effective 8 (slips behind enemy1 + healer).
    const view = {
      units: [
        mkUnit('skiv', 12, { statuses: [{ id: 'panic', intensity: 2 }] }),
        mkUnit('enemy1', 10),
        mkUnit('healer', 9),
      ],
      active_unit: 'skiv',
    };
    const slots = computeCtBarLookahead(view, 3);
    // current = skiv (active forced first regardless of priority)
    assert.equal(slots[0].id, 'skiv');
    assert.equal(slots[0].isCurrent, true);
    // tail order ignores skiv → enemy1 (10) > healer (9), then wrap to skiv penalized 8.
    // slots[1] = enemy1, slots[2] = healer, slots[3] = wrap (only 3 unit total → wrap to enemy1 again).
    assert.equal(slots[1].id, 'enemy1');
    assert.equal(slots[2].id, 'healer');
  });

  test('lookahead default 3 → returns up to 4 entries (current + 3)', async () => {
    const { computeCtBarLookahead, DEFAULT_LOOKAHEAD } = await loadModule();
    assert.equal(DEFAULT_LOOKAHEAD, 3);
    const units = [
      mkUnit('a', 20),
      mkUnit('b', 15),
      mkUnit('c', 10),
      mkUnit('d', 5),
      mkUnit('e', 1),
    ];
    const slots = computeCtBarLookahead({ units, active_unit: 'a' });
    assert.equal(slots.length, 4);
  });

  test('lookahead 0 → only current actor', async () => {
    const { computeCtBarLookahead } = await loadModule();
    const view = {
      units: [mkUnit('a', 10), mkUnit('b', 5)],
      active_unit: 'a',
    };
    const slots = computeCtBarLookahead(view, 0);
    assert.equal(slots.length, 1);
    assert.equal(slots[0].id, 'a');
  });

  test('lookahead 5 with only 3 unit → wraps ring rotation', async () => {
    const { computeCtBarLookahead } = await loadModule();
    const view = {
      units: [mkUnit('a', 10), mkUnit('b', 8), mkUnit('c', 6)],
      active_unit: 'a',
    };
    const slots = computeCtBarLookahead(view, 5);
    assert.equal(slots.length, 6);
    assert.equal(slots[0].id, 'a');
    // tail rotates b,c,b,c,b
    assert.equal(slots[1].id, 'b');
    assert.equal(slots[2].id, 'c');
    assert.equal(slots[3].id, 'b');
  });

  test('no active_unit → highest priority becomes current', async () => {
    const { computeCtBarLookahead } = await loadModule();
    const view = {
      units: [mkUnit('low', 5), mkUnit('high', 20), mkUnit('mid', 10)],
    };
    const slots = computeCtBarLookahead(view, 3);
    assert.equal(slots[0].id, 'high');
    assert.equal(slots[0].isCurrent, true);
  });

  test('all units KO → empty array', async () => {
    const { computeCtBarLookahead } = await loadModule();
    const view = {
      units: [mkUnit('a', 10, { hp: 0 }), mkUnit('b', 5, { hp: 0 })],
      active_unit: 'a',
    };
    assert.deepEqual(computeCtBarLookahead(view), []);
  });
});

describe('formatCtBarSlot — pure HTML', () => {
  test('current slot includes pulse class', async () => {
    const { formatCtBarSlot } = await loadModule();
    const slot = {
      id: 's1',
      name: 'Skiv',
      controlled_by: 'player',
      hp: 10,
      initiative: 12,
      isCurrent: true,
      statuses: [],
    };
    const html = formatCtBarSlot(slot, 0);
    assert.ok(html.includes('ct-bar-current'));
    assert.ok(html.includes('ct-bar-player'));
    assert.ok(html.includes('Skiv'));
    assert.ok(html.includes('🟢'));
    assert.ok(html.includes('turno corrente'));
  });

  test('non-current slot has T+N tooltip + no pulse class', async () => {
    const { formatCtBarSlot } = await loadModule();
    const slot = {
      id: 'e1',
      name: 'Pulverator',
      controlled_by: 'sistema',
      hp: 8,
      initiative: 10,
      isCurrent: false,
      statuses: [],
    };
    const html = formatCtBarSlot(slot, 2);
    assert.ok(!html.includes('ct-bar-current'));
    assert.ok(html.includes('ct-bar-sistema'));
    assert.ok(html.includes('🔴'));
    assert.ok(html.includes('T+2'));
  });

  test('null/invalid slot → empty string', async () => {
    const { formatCtBarSlot } = await loadModule();
    assert.equal(formatCtBarSlot(null, 0), '');
    assert.equal(formatCtBarSlot(undefined, 0), '');
  });

  test('XSS escape on hostile name', async () => {
    const { formatCtBarSlot } = await loadModule();
    const slot = {
      id: 'x',
      name: '<script>x</script>',
      controlled_by: 'player',
      hp: 10,
      initiative: 5,
      isCurrent: false,
      statuses: [],
    };
    const html = formatCtBarSlot(slot, 1);
    assert.ok(!html.includes('<script>x</script>'));
    assert.ok(html.includes('&lt;'));
  });
});

describe('formatCtBar — full strip', () => {
  test('slots interleaved with arrow separators', async () => {
    const { formatCtBar } = await loadModule();
    const slots = [
      {
        id: 'a',
        name: 'A',
        controlled_by: 'player',
        hp: 10,
        initiative: 10,
        isCurrent: true,
        statuses: [],
      },
      {
        id: 'b',
        name: 'B',
        controlled_by: 'sistema',
        hp: 8,
        initiative: 8,
        isCurrent: false,
        statuses: [],
      },
      {
        id: 'c',
        name: 'C',
        controlled_by: 'sistema',
        hp: 6,
        initiative: 6,
        isCurrent: false,
        statuses: [],
      },
    ];
    const html = formatCtBar(slots);
    const arrowCount = (html.match(/ct-bar-arrow/g) || []).length;
    assert.equal(arrowCount, 2); // n-1 separators
    assert.ok(html.indexOf('A') < html.indexOf('B'));
    assert.ok(html.indexOf('B') < html.indexOf('C'));
  });

  test('empty slots → empty string', async () => {
    const { formatCtBar } = await loadModule();
    assert.equal(formatCtBar([]), '');
    assert.equal(formatCtBar(null), '');
  });
});

describe('renderCtBar — DOM side effect', () => {
  function fakeContainer() {
    const classList = new Set();
    const attrs = {};
    return {
      innerHTML: '',
      classList: {
        add: (...c) => c.forEach((x) => classList.add(x)),
        remove: (...c) => c.forEach((x) => classList.delete(x)),
        contains: (x) => classList.has(x),
      },
      setAttribute: (k, v) => {
        attrs[k] = v;
      },
      removeAttribute: (k) => {
        delete attrs[k];
      },
      _attrs: attrs,
    };
  }

  test('null containerEl → no crash', async () => {
    const { renderCtBar } = await loadModule();
    renderCtBar(null, { units: [{ id: 'a', initiative: 10, hp: 10 }] });
    assert.ok(true);
  });

  test('null sessionView → hide + clear', async () => {
    const { renderCtBar } = await loadModule();
    const c = fakeContainer();
    c.innerHTML = '<span>old</span>';
    c.setAttribute('title', 'old');
    renderCtBar(c, null);
    assert.equal(c.innerHTML, '');
    assert.ok(c.classList.contains('ct-bar-hidden'));
    assert.equal(c._attrs.title, undefined);
  });

  test('valid sessionView → reveal + populate + tooltip with order', async () => {
    const { renderCtBar } = await loadModule();
    const c = fakeContainer();
    c.classList.add('ct-bar-hidden');
    const view = {
      units: [
        { id: 'skiv', name: 'Skiv', initiative: 14, hp: 10, controlled_by: 'player', statuses: [] },
        { id: 'e1', name: 'Pulv', initiative: 10, hp: 8, controlled_by: 'sistema', statuses: [] },
      ],
      active_unit: 'skiv',
    };
    renderCtBar(c, view, 3);
    assert.ok(!c.classList.contains('ct-bar-hidden'));
    assert.ok(c.innerHTML.includes('Skiv'));
    assert.ok(c.innerHTML.includes('Pulv'));
    assert.ok(c._attrs.title.includes('Ordine turni'));
    assert.ok(c._attrs.title.includes('Skiv'));
  });

  test('all units KO → hide gracefully', async () => {
    const { renderCtBar } = await loadModule();
    const c = fakeContainer();
    const view = {
      units: [{ id: 'a', initiative: 10, hp: 0, controlled_by: 'player', statuses: [] }],
      active_unit: 'a',
    };
    renderCtBar(c, view, 3);
    assert.ok(c.classList.contains('ct-bar-hidden'));
    assert.equal(c.innerHTML, '');
  });

  test('post-action re-compute: skiv slips after panic applied', async () => {
    const { computeCtBarLookahead } = await loadModule();
    // Pre-action: skiv current, no panic → skiv first
    const pre = {
      units: [
        { id: 'skiv', name: 'Skiv', initiative: 12, hp: 10, controlled_by: 'player', statuses: [] },
        { id: 'e1', name: 'E1', initiative: 8, hp: 8, controlled_by: 'sistema', statuses: [] },
      ],
      active_unit: 'skiv',
    };
    const slotsPre = computeCtBarLookahead(pre, 3);
    assert.equal(slotsPre[0].id, 'skiv');
    // Post-action: e1 now active (skiv consumed), skiv panic'd → effective 12-4=8 = tied with e1.
    // Stable sort by id asc wins for tail; skiv should still appear after e1 in tail.
    const post = {
      units: [
        {
          id: 'skiv',
          name: 'Skiv',
          initiative: 12,
          hp: 10,
          controlled_by: 'player',
          statuses: [{ id: 'panic', intensity: 2 }],
        },
        { id: 'e1', name: 'E1', initiative: 8, hp: 8, controlled_by: 'sistema', statuses: [] },
      ],
      active_unit: 'e1',
    };
    const slotsPost = computeCtBarLookahead(post, 3);
    assert.equal(slotsPost[0].id, 'e1');
    assert.equal(slotsPost[0].isCurrent, true);
    // skiv now in tail (effective priority 8) — wraps in remaining slots.
    assert.ok(slotsPost.some((s) => s.id === 'skiv'));
  });
});
