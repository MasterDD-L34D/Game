// Sprint 8 (Surface-DEAD #1) — predict_combat hover preview overlay.
//
// Pure transforms (formatPredictionRow + colorBandForHit) e cache async
// (getPrediction + clearPredictionCache). Nessun canvas/jsdom — il test
// inietta un fetcher mock per validare il flow async + memoization.

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/predictPreviewOverlay.js');
}

beforeEach(async () => {
  const { clearPredictionCache } = await loadModule();
  clearPredictionCache();
});

describe('colorBandForHit — semantic band', () => {
  test('>= 65 → high', async () => {
    const { colorBandForHit } = await loadModule();
    assert.equal(colorBandForHit(65), 'high');
    assert.equal(colorBandForHit(80), 'high');
    assert.equal(colorBandForHit(100), 'high');
  });

  test('35-64 → medium', async () => {
    const { colorBandForHit } = await loadModule();
    assert.equal(colorBandForHit(35), 'medium');
    assert.equal(colorBandForHit(50), 'medium');
    assert.equal(colorBandForHit(64), 'medium');
  });

  test('< 35 → low', async () => {
    const { colorBandForHit } = await loadModule();
    assert.equal(colorBandForHit(34), 'low');
    assert.equal(colorBandForHit(10), 'low');
    assert.equal(colorBandForHit(0), 'low');
  });

  test('null/NaN/string → unknown', async () => {
    const { colorBandForHit } = await loadModule();
    assert.equal(colorBandForHit(null), 'unknown');
    assert.equal(colorBandForHit(undefined), 'unknown');
    assert.equal(colorBandForHit(NaN), 'unknown');
    assert.equal(colorBandForHit('not-a-number'), 'unknown');
  });
});

describe('formatPredictionRow — pure HTML formatter', () => {
  test('high band — typical hit', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow({
      hit_pct: 75,
      crit_pct: 5,
      expected_damage: 4.2,
      simulations: 20,
    });
    assert.ok(html.includes('tt-predict-high'));
    assert.ok(html.includes('<strong>75%</strong>'));
    assert.ok(html.includes('~4.2 dmg'));
    assert.ok(html.includes('5% crit'));
  });

  test('medium band — borderline hit', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow({ hit_pct: 50, crit_pct: 5, expected_damage: 2.0 });
    assert.ok(html.includes('tt-predict-medium'));
    assert.ok(html.includes('<strong>50%</strong>'));
  });

  test('low band — risky hit', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow({ hit_pct: 20, crit_pct: 5, expected_damage: 0.4 });
    assert.ok(html.includes('tt-predict-low'));
  });

  test('elevation modifier surfaces hint when significant', async () => {
    const { formatPredictionRow } = await loadModule();
    const elev = formatPredictionRow({
      hit_pct: 60,
      crit_pct: 5,
      expected_damage: 3.0,
      elevation_multiplier: 1.3,
    });
    assert.ok(elev.includes('elev ×1.30'));
    const flat = formatPredictionRow({
      hit_pct: 60,
      crit_pct: 5,
      expected_damage: 3.0,
      elevation_multiplier: 1,
    });
    assert.ok(!flat.includes('elev'));
    const downhill = formatPredictionRow({
      hit_pct: 60,
      crit_pct: 5,
      expected_damage: 2.5,
      elevation_multiplier: 0.85,
    });
    assert.ok(downhill.includes('elev ×0.85'));
  });

  test('null prediction → error placeholder', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow(null);
    assert.ok(html.includes('tt-predict-error'));
    assert.ok(html.includes('Prediction non disponibile'));
  });

  test('non-object → error placeholder', async () => {
    const { formatPredictionRow } = await loadModule();
    assert.ok(formatPredictionRow('garbage').includes('tt-predict-error'));
    assert.ok(formatPredictionRow(undefined).includes('tt-predict-error'));
    assert.ok(formatPredictionRow(123).includes('tt-predict-error'));
  });

  test('missing fields → ? placeholders, no crash', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow({});
    assert.ok(html.includes('?'));
    assert.ok(html.includes('tt-predict'));
  });

  test('output is HTML string with tt-predict class', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow({ hit_pct: 60, crit_pct: 5, expected_damage: 2.5 });
    assert.equal(typeof html, 'string');
    assert.ok(html.startsWith('<div class="tt-predict'));
    assert.ok(html.endsWith('</div>'));
  });

  test('opts.title overrides default tooltip title', async () => {
    const { formatPredictionRow } = await loadModule();
    const html = formatPredictionRow(
      { hit_pct: 60, crit_pct: 5, expected_damage: 2.5 },
      { title: 'Custom hover hint' },
    );
    assert.ok(html.includes('title="Custom hover hint"'));
  });
});

describe('getPrediction — async memoized fetch', () => {
  test('null inputs → resolves null without calling fetcher', async () => {
    const { getPrediction } = await loadModule();
    let called = 0;
    const fetcher = () => {
      called += 1;
      return Promise.resolve({ hit_pct: 50 });
    };
    assert.equal(await getPrediction(null, 'a', 't', fetcher), null);
    assert.equal(await getPrediction('s', null, 't', fetcher), null);
    assert.equal(await getPrediction('s', 'a', null, fetcher), null);
    assert.equal(called, 0);
  });

  test('non-function fetcher → resolves null gracefully', async () => {
    const { getPrediction } = await loadModule();
    assert.equal(await getPrediction('s', 'a', 't', null), null);
    assert.equal(await getPrediction('s', 'a', 't', undefined), null);
    assert.equal(await getPrediction('s', 'a', 't', 'not-a-fn'), null);
  });

  test('happy path — fetcher returns prediction object', async () => {
    const { getPrediction } = await loadModule();
    const fetcher = () => Promise.resolve({ hit_pct: 75, expected_damage: 4 });
    const p = await getPrediction('s1', 'p_scout', 'e_nomad_1', fetcher);
    assert.equal(p.hit_pct, 75);
    assert.equal(p.expected_damage, 4);
  });

  test('memoization — same key returns same promise (1 fetch)', async () => {
    const { getPrediction } = await loadModule();
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.resolve({ hit_pct: 50 });
    };
    const p1 = getPrediction('s1', 'a', 't', fetcher);
    const p2 = getPrediction('s1', 'a', 't', fetcher);
    const p3 = getPrediction('s1', 'a', 't', fetcher);
    assert.equal(p1, p2, 'same promise instance returned');
    assert.equal(p2, p3);
    await Promise.all([p1, p2, p3]);
    assert.equal(calls, 1, 'fetcher invoked exactly once');
  });

  test('different tuples → independent fetches', async () => {
    const { getPrediction } = await loadModule();
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.resolve({ hit_pct: 50 });
    };
    await getPrediction('s1', 'a', 't1', fetcher);
    await getPrediction('s1', 'a', 't2', fetcher);
    await getPrediction('s1', 'b', 't1', fetcher);
    await getPrediction('s2', 'a', 't1', fetcher);
    assert.equal(calls, 4);
  });

  test('unwraps {ok, data} envelope from api.* helpers', async () => {
    const { getPrediction } = await loadModule();
    const fetcher = () => Promise.resolve({ ok: true, data: { hit_pct: 88 } });
    const p = await getPrediction('s', 'a', 't', fetcher);
    assert.equal(p.hit_pct, 88);
  });

  test('envelope ok=false → null', async () => {
    const { getPrediction } = await loadModule();
    const fetcher = () => Promise.resolve({ ok: false, status: 400 });
    const p = await getPrediction('s', 'a', 't', fetcher);
    assert.equal(p, null);
  });

  test('fetcher rejects → resolves null (graceful)', async () => {
    const { getPrediction } = await loadModule();
    const fetcher = () => Promise.reject(new Error('network down'));
    const p = await getPrediction('s', 'a', 't', fetcher);
    assert.equal(p, null);
  });

  test('clearPredictionCache resets memoization', async () => {
    const { getPrediction, clearPredictionCache, _cacheSize } = await loadModule();
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      return Promise.resolve({ hit_pct: 60 });
    };
    await getPrediction('s', 'a', 't', fetcher);
    assert.equal(_cacheSize(), 1);
    clearPredictionCache();
    assert.equal(_cacheSize(), 0);
    await getPrediction('s', 'a', 't', fetcher);
    assert.equal(calls, 2, 'fetcher re-invoked after cache clear');
  });
});
