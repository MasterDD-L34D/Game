// Gate-5 #2716 — Overcharge first-use diegetic hint (web surface).
//
// Pure transforms (overchargeHintLabel + shouldShowOverchargeHint) +
// side-effect maybeShowOverchargeHint via fake DOM document. Mirrors the
// biomeChip.test.js harness (node:test + dynamic ESM import).

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/overchargeHint.js');
}

function fakeDoc() {
  const appended = [];
  return {
    appended,
    body: {
      appendChild(el) {
        appended.push(el);
      },
    },
    createElement(tag) {
      const el = {
        tagName: tag,
        className: '',
        textContent: '',
        attrs: {},
        setAttribute(k, v) {
          el.attrs[k] = v;
        },
        remove() {
          const i = appended.indexOf(el);
          if (i >= 0) appended.splice(i, 1);
        },
      };
      return el;
    },
  };
}

function world(overrides = {}) {
  return { session_id: 'sess-1', overcharge_used_this_run: false, ...overrides };
}

describe('overchargeHintLabel', () => {
  test('IT diegetic wording, never the raw i18n key, no raw numbers', async () => {
    const { overchargeHintLabel } = await loadModule();
    const label = overchargeHintLabel();
    assert.ok(label.includes('Sistema reagisce'), `diegetic IT wording, got: ${label}`);
    assert.ok(!label.includes('overcharge_hint'), 'must never leak the i18n key');
    assert.ok(!/\d/.test(label), 'ER3 doctrine: no raw numbers in the telegraph');
  });
});

describe('shouldShowOverchargeHint — pure transition detector', () => {
  test('false -> true transition (same session) → true', async () => {
    const { shouldShowOverchargeHint } = await loadModule();
    const prev = world({ overcharge_used_this_run: false });
    const next = world({ overcharge_used_this_run: true });
    assert.equal(shouldShowOverchargeHint(prev, next), true);
  });

  test('no prev snapshot (first fetch / rejoin) → false', async () => {
    const { shouldShowOverchargeHint } = await loadModule();
    assert.equal(shouldShowOverchargeHint(null, world({ overcharge_used_this_run: true })), false);
    assert.equal(
      shouldShowOverchargeHint(undefined, world({ overcharge_used_this_run: true })),
      false,
    );
  });

  test('already used in prev snapshot → false (moment passed)', async () => {
    const { shouldShowOverchargeHint } = await loadModule();
    const prev = world({ overcharge_used_this_run: true });
    const next = world({ overcharge_used_this_run: true });
    assert.equal(shouldShowOverchargeHint(prev, next), false);
  });

  test('never used → false', async () => {
    const { shouldShowOverchargeHint } = await loadModule();
    assert.equal(shouldShowOverchargeHint(world(), world()), false);
  });

  test('null/missing world → false', async () => {
    const { shouldShowOverchargeHint } = await loadModule();
    assert.equal(shouldShowOverchargeHint(world(), null), false);
  });

  test('session_id mismatch (mid-loop session switch) → false', async () => {
    const { shouldShowOverchargeHint } = await loadModule();
    const prev = world({ session_id: 'sess-old', overcharge_used_this_run: false });
    const next = world({ session_id: 'sess-new', overcharge_used_this_run: true });
    assert.equal(shouldShowOverchargeHint(prev, next), false);
  });
});

describe('maybeShowOverchargeHint — once per run, toast side-effect', () => {
  beforeEach(async () => {
    const { _resetOverchargeHintForTest } = await loadModule();
    _resetOverchargeHintForTest();
  });

  test('first transition → appends toast with class + diegetic label, returns true', async () => {
    const { maybeShowOverchargeHint } = await loadModule();
    const doc = fakeDoc();
    const prev = world({ overcharge_used_this_run: false });
    const next = world({ overcharge_used_this_run: true });
    assert.equal(maybeShowOverchargeHint(prev, next, doc), true);
    assert.equal(doc.appended.length, 1);
    const el = doc.appended[0];
    assert.equal(el.className, 'overcharge-hint-toast');
    assert.ok(el.textContent.includes('Sistema reagisce'), `got: ${el.textContent}`);
    assert.equal(el.attrs.role, 'status', 'a11y live-region role');
  });

  test('second transition same session → false, no double toast', async () => {
    const { maybeShowOverchargeHint } = await loadModule();
    const doc = fakeDoc();
    const prev = world({ overcharge_used_this_run: false });
    const next = world({ overcharge_used_this_run: true });
    assert.equal(maybeShowOverchargeHint(prev, next, doc), true);
    assert.equal(maybeShowOverchargeHint(prev, next, doc), false);
    assert.equal(doc.appended.length, 1, 'no duplicate toast');
  });

  test('new run (different session_id) → hint fires again', async () => {
    const { maybeShowOverchargeHint } = await loadModule();
    const doc = fakeDoc();
    assert.equal(
      maybeShowOverchargeHint(
        world({ session_id: 'run-1' }),
        world({ session_id: 'run-1', overcharge_used_this_run: true }),
        doc,
      ),
      true,
    );
    assert.equal(
      maybeShowOverchargeHint(
        world({ session_id: 'run-2' }),
        world({ session_id: 'run-2', overcharge_used_this_run: true }),
        doc,
      ),
      true,
    );
    assert.equal(doc.appended.length, 2, 'one toast per run');
  });

  test('no transition → false, nothing rendered', async () => {
    const { maybeShowOverchargeHint } = await loadModule();
    const doc = fakeDoc();
    assert.equal(maybeShowOverchargeHint(world(), world(), doc), false);
    assert.equal(doc.appended.length, 0);
  });

  test('headless (no document) → still marks shown, no crash', async () => {
    const { maybeShowOverchargeHint } = await loadModule();
    const prev = world({ overcharge_used_this_run: false });
    const next = world({ overcharge_used_this_run: true });
    assert.equal(maybeShowOverchargeHint(prev, next, null), true);
    // Once marked, a fake doc afterwards must NOT re-render for the same run.
    const doc = fakeDoc();
    assert.equal(maybeShowOverchargeHint(prev, next, doc), false);
    assert.equal(doc.appended.length, 0);
  });
});
