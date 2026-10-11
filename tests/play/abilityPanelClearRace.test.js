// Regression: clearAbilities() must invalidate an in-flight renderAbilities()
// await. Bug class "barra si e buggata" (W8/W8O): token guards render-vs-render
// but NOT render-vs-clear. If unit is deselected/dies during loadJobDetail
// fetch latency, clearAbilities() wipes the panel but the in-flight render
// (token still latest) resurrects abilities for the gone unit.
//
// Fix originally landed PR #2321 (W8O-2), regressed by Jules PR #2327
// rewrite that dropped the token-bump. This file = re-applied + test
// restored (2026-05-20).
//
// No jsdom: minimal fake DOM + deferred fetch to interleave clear during await.

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function fakeEl() {
  return {
    _cls: new Set(),
    innerHTML: '',
    textContent: '',
    dataset: {},
    classList: {
      add: function (c) {
        /* bound below */
      },
      remove: function (c) {},
      contains: function (c) {
        return false;
      },
      toggle: function (c, on) {},
    },
    appendChild() {},
    addEventListener() {},
  };
}

function wireEl(el) {
  el.classList.add = (c) => el._cls.add(c);
  el.classList.remove = (c) => el._cls.delete(c);
  el.classList.contains = (c) => el._cls.has(c);
  el.classList.toggle = (c, on) => {
    if (on) el._cls.add(c);
    else el._cls.delete(c);
  };
  return el;
}

describe('abilityPanel clear-vs-inflight-render race (W8O-2 regression guard)', () => {
  let titleEl, container, deferred;

  beforeEach(() => {
    titleEl = wireEl(fakeEl());
    container = wireEl(fakeEl());
    let appended = [];
    container.appendChild = (row) => {
      appended.push(row);
      container._rows = appended;
    };

    globalThis.document = {
      getElementById: (id) =>
        id === 'abilities-title' ? titleEl : id === 'abilities' ? container : null,
      createElement: () => wireEl(fakeEl()),
    };

    // fetch: /api/jobs (module preload) resolves immediately empty;
    // /api/jobs/<id> returns a DEFERRED promise we control (the await window).
    deferred = null;
    globalThis.fetch = (url) => {
      if (url === '/api/jobs') {
        return Promise.resolve({ json: () => Promise.resolve({ jobs: [] }) });
      }
      return new Promise((resolve) => {
        deferred = () =>
          resolve({
            json: () => Promise.resolve({ abilities: [{ ability_id: 'a1', name: 'Strike' }] }),
          });
      });
    };
  });

  test('clearAbilities() during loadJobDetail await must keep panel cleared', async () => {
    const mod = await import('../../apps/play/src/abilityPanel.js');
    const unit = { id: 'u1', job: 'warrior', ap_remaining: 5 };

    const p = mod.renderAbilities(unit, {}, () => {}); // not awaited: in-flight
    // unit deselected/dead mid-flight -> caller takes else branch:
    mod.clearAbilities();
    assert.equal(container.innerHTML, '', 'clear should empty container');

    deferred(); // loadJobDetail resolves AFTER the explicit clear
    await p;

    // BUG (pre-fix): in-flight render resurrects abilities for the gone unit.
    assert.equal(
      container._rows ? container._rows.length : 0,
      0,
      'in-flight render must NOT append rows after clearAbilities()',
    );
    assert.ok(
      titleEl._cls.has('hidden-empty'),
      'title must remain hidden-empty after clear (not re-shown by stale render)',
    );
  });
});
