// Action 6 (ADR-2026-04-28 §Action 6) — ambitionHud frontend test.
//
// Pure helpers (formatAmbitionLabel + formatAmbitionHud) +
// side-effect renderAmbitionHud via fake DOM container.

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/ambitionHud.js');
}

function fakeContainer() {
  const classList = new Set();
  const children = [];
  function makeStub(id) {
    const stub = {
      _id: id,
      classList: {
        _set: new Set(),
        add: (...c) => c.forEach((x) => stub.classList._set.add(x)),
        contains: (x) => stub.classList._set.has(x),
      },
    };
    children.push(stub);
    return stub;
  }
  return {
    innerHTML: '',
    classList: {
      add: (...c) => c.forEach((x) => classList.add(x)),
      remove: (...c) => c.forEach((x) => classList.delete(x)),
      contains: (x) => classList.has(x),
    },
    querySelector: (sel) => {
      const m = sel.match(/\[data-ambition-id="([^"]+)"\]/);
      if (!m) return null;
      const id = m[1];
      const existing = children.find((c) => c._id === id);
      return existing || makeStub(id);
    },
    _children: children,
  };
}

describe('formatAmbitionLabel', () => {
  test('substitutes {progress} + {progress_target} placeholders', async () => {
    const { formatAmbitionLabel } = await loadModule();
    const a = {
      progress: 2,
      progress_target: 5,
      ui_overlay: { format: '🤝 {progress}/{progress_target} incontri' },
    };
    assert.equal(formatAmbitionLabel(a), '🤝 2/5 incontri');
  });

  test('default format when ui_overlay missing', async () => {
    const { formatAmbitionLabel } = await loadModule();
    const a = { progress: 3, progress_target: 5 };
    const label = formatAmbitionLabel(a);
    assert.ok(label.includes('3'));
    assert.ok(label.includes('5'));
  });

  test('null/undefined ambition → empty string', async () => {
    const { formatAmbitionLabel } = await loadModule();
    assert.equal(formatAmbitionLabel(null), '');
    assert.equal(formatAmbitionLabel(undefined), '');
  });
});

describe('formatAmbitionHud — pure HTML formatter', () => {
  test('list of 1 ambition → pill HTML with label', async () => {
    const { formatAmbitionHud } = await loadModule();
    const html = formatAmbitionHud([
      {
        ambition_id: 'skiv_pulverator_alliance',
        progress: 1,
        progress_target: 5,
        ui_overlay: { format: '🤝 {progress}/{progress_target}' },
        choice_ready: false,
      },
    ]);
    assert.ok(html.includes('ambition-pill'));
    assert.ok(html.includes('1/5'));
    assert.ok(html.includes('skiv_pulverator_alliance'));
    assert.ok(!html.includes('ambition-cta'));
  });

  test('choice_ready=true → ambition-ready class + CTA', async () => {
    const { formatAmbitionHud } = await loadModule();
    const html = formatAmbitionHud([
      {
        ambition_id: 'a1',
        progress: 5,
        progress_target: 5,
        ui_overlay: { format: '{progress}/{progress_target}' },
        choice_ready: true,
      },
    ]);
    assert.ok(html.includes('ambition-ready'));
    assert.ok(html.includes('Rituale'));
  });

  test('empty list → empty string', async () => {
    const { formatAmbitionHud } = await loadModule();
    assert.equal(formatAmbitionHud([]), '');
    assert.equal(formatAmbitionHud(null), '');
    assert.equal(formatAmbitionHud(undefined), '');
  });
});

describe('renderAmbitionHud — DOM side effect', () => {
  beforeEach(async () => {
    const { _resetAmbitionHudState } = await loadModule();
    _resetAmbitionHudState();
  });

  test('null containerEl → no crash', async () => {
    const { renderAmbitionHud } = await loadModule();
    renderAmbitionHud(null, []);
    assert.ok(true);
  });

  test('empty list → hide + clear', async () => {
    const { renderAmbitionHud } = await loadModule();
    const c = fakeContainer();
    c.innerHTML = '<span>old</span>';
    renderAmbitionHud(c, []);
    assert.equal(c.innerHTML, '');
    assert.ok(c.classList.contains('ambition-hidden'));
  });

  test('non-empty list → reveal + populate innerHTML', async () => {
    const { renderAmbitionHud } = await loadModule();
    const c = fakeContainer();
    c.classList.add('ambition-hidden');
    renderAmbitionHud(c, [
      {
        ambition_id: 'a1',
        progress: 2,
        progress_target: 5,
        ui_overlay: { format: '{progress}/{progress_target}' },
        choice_ready: false,
      },
    ]);
    assert.ok(!c.classList.contains('ambition-hidden'));
    assert.ok(c.innerHTML.includes('2/5'));
    assert.ok(c.innerHTML.includes('a1'));
  });

  test('idempotent — render twice same input yields same innerHTML', async () => {
    const { renderAmbitionHud, _resetAmbitionHudState } = await loadModule();
    _resetAmbitionHudState();
    const c = fakeContainer();
    const ambitions = [
      {
        ambition_id: 'a1',
        progress: 2,
        progress_target: 5,
        ui_overlay: { format: '{progress}/{progress_target}' },
        choice_ready: false,
      },
    ];
    renderAmbitionHud(c, ambitions);
    const first = c.innerHTML;
    renderAmbitionHud(c, ambitions);
    assert.equal(c.innerHTML, first);
  });

  test('progress increment → applies ambition-pulse class to pill', async () => {
    const { renderAmbitionHud, _resetAmbitionHudState } = await loadModule();
    _resetAmbitionHudState();
    const c = fakeContainer();
    renderAmbitionHud(c, [
      {
        ambition_id: 'a1',
        progress: 1,
        progress_target: 5,
        ui_overlay: { format: '{progress}/{progress_target}' },
        choice_ready: false,
      },
    ]);
    // Increment progress → pulse should be added.
    renderAmbitionHud(c, [
      {
        ambition_id: 'a1',
        progress: 2,
        progress_target: 5,
        ui_overlay: { format: '{progress}/{progress_target}' },
        choice_ready: false,
      },
    ]);
    const pill = c.querySelector('[data-ambition-id="a1"]');
    assert.ok(pill, 'pill query stub should resolve');
    assert.ok(pill.classList.contains('ambition-pulse'));
  });
});
