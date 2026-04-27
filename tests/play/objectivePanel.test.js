// Sprint 9 (Surface-DEAD #5) — Objective HUD top-bar.
//
// Pure transforms (formatProgress + formatObjectiveBar + statusForEvaluation)
// + side-effect renderObjectiveBar via fake DOM container. No canvas/jsdom.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/objectivePanel.js');
}

describe('labelForObjectiveType', () => {
  test('canonical types → IT label', async () => {
    const { labelForObjectiveType } = await loadModule();
    assert.equal(labelForObjectiveType('elimination'), 'Elimina i nemici');
    assert.equal(labelForObjectiveType('capture_point'), 'Tieni la zona');
    assert.equal(labelForObjectiveType('escort'), 'Scorta il bersaglio');
    assert.equal(labelForObjectiveType('sabotage'), 'Sabotaggio');
    assert.equal(labelForObjectiveType('survival'), 'Sopravvivi');
    assert.equal(labelForObjectiveType('escape'), 'Fuggi');
  });

  test('unknown type → caps fallback', async () => {
    const { labelForObjectiveType } = await loadModule();
    assert.equal(labelForObjectiveType('hold_the_line'), 'HOLD THE LINE');
  });

  test('null/undefined → em-dash placeholder', async () => {
    const { labelForObjectiveType } = await loadModule();
    assert.equal(labelForObjectiveType(null), '—');
    assert.equal(labelForObjectiveType(undefined), '—');
  });
});

describe('iconForObjectiveType', () => {
  test('canonical types → emoji', async () => {
    const { iconForObjectiveType } = await loadModule();
    assert.equal(iconForObjectiveType('elimination'), '⚔');
    assert.equal(iconForObjectiveType('capture_point'), '🚩');
    assert.equal(iconForObjectiveType('escort'), '🛡');
    assert.equal(iconForObjectiveType('escape'), '🏃');
  });

  test('unknown type → 📌 fallback', async () => {
    const { iconForObjectiveType } = await loadModule();
    assert.equal(iconForObjectiveType('weird'), '📌');
    assert.equal(iconForObjectiveType(null), '📌');
  });
});

describe('statusForEvaluation', () => {
  test('completed → win', async () => {
    const { statusForEvaluation } = await loadModule();
    assert.equal(statusForEvaluation({ completed: true, failed: false }), 'win');
  });

  test('failed → loss', async () => {
    const { statusForEvaluation } = await loadModule();
    assert.equal(statusForEvaluation({ completed: false, failed: true }), 'loss');
  });

  test('neither → active', async () => {
    const { statusForEvaluation } = await loadModule();
    assert.equal(statusForEvaluation({ completed: false, failed: false }), 'active');
  });

  test('null/non-object → unknown', async () => {
    const { statusForEvaluation } = await loadModule();
    assert.equal(statusForEvaluation(null), 'unknown');
    assert.equal(statusForEvaluation(undefined), 'unknown');
    assert.equal(statusForEvaluation('garbage'), 'unknown');
  });
});

describe('formatProgress — aligned with real backend payload keys', () => {
  test('elimination — sistema + player counts (backend keys)', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(
      formatProgress('elimination', { sistema: 1, player: 2 }),
      'Sistema vivi: 1 · PG: 2',
    );
    assert.equal(
      formatProgress('elimination', { sistema: 0, player: 3 }),
      'Sistema vivi: 0 · PG: 3',
    );
  });

  test('elimination — empty progress → defaults to 0/0', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(formatProgress('elimination', {}), 'Sistema vivi: 0 · PG: 0');
  });

  test('capture_point — turns_held / target_turns + units_in_zone', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(
      formatProgress('capture_point', { turns_held: 2, target_turns: 5, units_in_zone: 1 }),
      '2/5 round in zona · 1 PG dentro',
    );
    assert.equal(
      formatProgress('capture_point', { turns_held: 0, target_turns: 5, units_in_zone: 0 }),
      '0 PG in zona',
    );
  });

  test('survival — turns_survived / target', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(formatProgress('survival', { turns_survived: 3, target: 8 }), 'Round 3/8');
    assert.equal(formatProgress('survival', { turns_survived: 5 }), 'Round 5');
  });

  test('escape — units_escaped / units_alive', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(formatProgress('escape', { units_escaped: 2, units_alive: 4 }), '2/4 fuggiti');
  });

  test('escort — escort_hp + extracted', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(
      formatProgress('escort', { escort_hp: 8, extracted: false }),
      'Bersaglio HP 8 · in viaggio',
    );
    assert.equal(
      formatProgress('escort', { escort_hp: 8, extracted: true }),
      'Bersaglio HP 8 · in zona estrazione',
    );
    assert.equal(
      formatProgress('escort', { escort_hp: 0, extracted: false }),
      'Bersaglio KO · in viaggio',
    );
  });

  test('sabotage — sabotage_progress / required + units_in_zone', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(
      formatProgress('sabotage', { sabotage_progress: 1, required: 3, units_in_zone: 2 }),
      '1/3 round in zona · 2 PG dentro',
    );
  });

  test('unknown type / null progress → empty (graceful)', async () => {
    const { formatProgress } = await loadModule();
    assert.equal(formatProgress('unknown', { foo: 1 }), '');
    assert.equal(formatProgress('elimination', null), '');
    assert.equal(formatProgress(null, null), '');
  });
});

describe('formatObjectiveBar', () => {
  test('full payload — elimination active', async () => {
    const { formatObjectiveBar } = await loadModule();
    const html = formatObjectiveBar({
      objective: { type: 'elimination' },
      evaluation: {
        completed: false,
        failed: false,
        progress: { sistema: 1, player: 2 },
      },
    });
    assert.ok(html.includes('⚔'));
    assert.ok(html.includes('Elimina i nemici'));
    assert.ok(html.includes('Sistema vivi: 1'));
    assert.ok(!html.includes('obj-status-win'));
    assert.ok(!html.includes('obj-status-loss'));
  });

  test('completed → status badge win', async () => {
    const { formatObjectiveBar } = await loadModule();
    const html = formatObjectiveBar({
      objective: { type: 'elimination' },
      evaluation: { completed: true, failed: false, progress: {} },
    });
    assert.ok(html.includes('obj-status-win'));
    assert.ok(html.includes('COMPLETATO'));
  });

  test('failed → status badge loss', async () => {
    const { formatObjectiveBar } = await loadModule();
    const html = formatObjectiveBar({
      objective: { type: 'survival' },
      evaluation: { completed: false, failed: true, progress: { turns_survived: 5, target: 8 } },
    });
    assert.ok(html.includes('obj-status-loss'));
    assert.ok(html.includes('FALLITO'));
  });

  test('null payload → empty placeholder', async () => {
    const { formatObjectiveBar } = await loadModule();
    assert.ok(formatObjectiveBar(null).includes('obj-empty'));
    assert.ok(formatObjectiveBar(undefined).includes('obj-empty'));
  });

  test('payload without objective.type → "no objective" copy', async () => {
    const { formatObjectiveBar } = await loadModule();
    const html = formatObjectiveBar({ objective: null });
    assert.ok(html.includes('Nessun obiettivo'));
  });

  test('escapes HTML in label fallback', async () => {
    const { formatObjectiveBar } = await loadModule();
    // Unknown type triggers caps fallback. Inject XSS-like char.
    const html = formatObjectiveBar({
      objective: { type: '<script>alert(1)</script>' },
      evaluation: { completed: false, failed: false, progress: {} },
    });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;'));
  });
});

describe('renderObjectiveBar — DOM side effect', () => {
  function fakeContainer() {
    const classList = new Set();
    return {
      innerHTML: '',
      classList: {
        add: (...c) => c.forEach((x) => classList.add(x)),
        remove: (...c) => c.forEach((x) => classList.delete(x)),
        contains: (x) => classList.has(x),
        _set: classList,
      },
    };
  }

  test('null containerEl → no crash', async () => {
    const { renderObjectiveBar } = await loadModule();
    renderObjectiveBar(null, { objective: { type: 'elimination' } });
    // assert no throw
    assert.ok(true);
  });

  test('null payload → hide + clear', async () => {
    const { renderObjectiveBar } = await loadModule();
    const c = fakeContainer();
    c.innerHTML = '<span>old</span>';
    renderObjectiveBar(c, null);
    assert.equal(c.innerHTML, '');
    assert.ok(c.classList.contains('obj-hidden'));
  });

  test('payload without objective.type → hide + clear', async () => {
    const { renderObjectiveBar } = await loadModule();
    const c = fakeContainer();
    renderObjectiveBar(c, { objective: null });
    assert.ok(c.classList.contains('obj-hidden'));
  });

  test('full payload — renders + adds status class', async () => {
    const { renderObjectiveBar } = await loadModule();
    const c = fakeContainer();
    renderObjectiveBar(c, {
      objective: { type: 'elimination' },
      evaluation: {
        completed: false,
        failed: false,
        progress: { sistema: 1, player: 2 },
      },
    });
    assert.ok(!c.classList.contains('obj-hidden'));
    assert.ok(c.classList.contains('obj-status-active'));
    assert.ok(c.innerHTML.includes('Elimina i nemici'));
  });

  test('completed → adds obj-status-win class', async () => {
    const { renderObjectiveBar } = await loadModule();
    const c = fakeContainer();
    renderObjectiveBar(c, {
      objective: { type: 'elimination' },
      evaluation: { completed: true, failed: false, progress: {} },
    });
    assert.ok(c.classList.contains('obj-status-win'));
    assert.ok(!c.classList.contains('obj-status-active'));
  });

  test('failed → adds obj-status-loss class + drops prior status', async () => {
    const { renderObjectiveBar } = await loadModule();
    const c = fakeContainer();
    // First render active.
    renderObjectiveBar(c, {
      objective: { type: 'survival' },
      evaluation: { completed: false, failed: false, progress: { turns_survived: 1, target: 8 } },
    });
    assert.ok(c.classList.contains('obj-status-active'));
    // Then render loss.
    renderObjectiveBar(c, {
      objective: { type: 'survival' },
      evaluation: { completed: false, failed: true, progress: { turns_survived: 1, target: 8 } },
    });
    assert.ok(c.classList.contains('obj-status-loss'));
    assert.ok(!c.classList.contains('obj-status-active'));
  });
});
