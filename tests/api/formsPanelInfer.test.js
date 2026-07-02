// M12 Phase C — formsPanel helper unit tests.
// Only the DOM-free export `inferVcAxes` is tested here (panel rendering
// requires jsdom; browser integration covered by preview_verify manually).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Dynamic import of ESM module.
async function loadPanel() {
  return import('../../apps/play/src/formsPanel.js');
}

test('inferVcAxes normalizes mbti_axes.{E_I,S_N,T_F,J_P}.value to {value}', async () => {
  const { inferVcAxes } = await loadPanel();
  const vc = {
    mbti_axes: {
      E_I: { value: 0.75 },
      S_N: { value: 0.35 },
      T_F: { value: 0.8 },
      J_P: { value: 0.75 },
    },
  };
  const out = inferVcAxes(vc);
  assert.equal(out.mbti_axes.E_I.value, 0.75);
  assert.equal(out.mbti_axes.S_N.value, 0.35);
  assert.equal(out.mbti_axes.T_F.value, 0.8);
  assert.equal(out.mbti_axes.J_P.value, 0.75);
});

test('inferVcAxes accepts shorthand axes: number form', async () => {
  const { inferVcAxes } = await loadPanel();
  const out = inferVcAxes({ axes: { E_I: 0.6, S_N: 0.4, T_F: 0.7, J_P: 0.3 } });
  assert.equal(out.mbti_axes.E_I.value, 0.6);
  assert.equal(out.mbti_axes.T_F.value, 0.7);
});

test('inferVcAxes falls back to 0.5 for missing axes', async () => {
  const { inferVcAxes } = await loadPanel();
  const out = inferVcAxes({});
  assert.equal(out.mbti_axes.E_I.value, 0.5);
  assert.equal(out.mbti_axes.S_N.value, 0.5);
  assert.equal(out.mbti_axes.T_F.value, 0.5);
  assert.equal(out.mbti_axes.J_P.value, 0.5);
});

test('inferVcAxes fills only missing axes, preserves provided', async () => {
  const { inferVcAxes } = await loadPanel();
  const out = inferVcAxes({
    mbti_axes: {
      T_F: { value: 0.9 },
      // E_I / S_N / J_P missing
    },
  });
  assert.equal(out.mbti_axes.T_F.value, 0.9);
  assert.equal(out.mbti_axes.E_I.value, 0.5);
  assert.equal(out.mbti_axes.S_N.value, 0.5);
  assert.equal(out.mbti_axes.J_P.value, 0.5);
});

test('inferVcAxes returns new object (does not mutate input)', async () => {
  const { inferVcAxes } = await loadPanel();
  const vc = { mbti_axes: { E_I: { value: 0.1 } } };
  inferVcAxes(vc);
  assert.deepEqual(vc, { mbti_axes: { E_I: { value: 0.1 } } });
});
