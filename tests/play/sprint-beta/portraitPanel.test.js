// Sprint β Visual UX 2026-04-28 — CK3 portrait-as-status panel.
//
// Pattern donor: docs/research/2026-04-27-strategy-games-design-extraction.md §6 (CK3).
// Static portrait per MBTI form (16 base) + emoji-overlay per status (panic/rage/
// focused/bleeding). Sub-panel mounted in characterPanel via slot.
//
// Pure helpers testabili senza jsdom (HTML markup string returned).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadPanel() {
  return import('../../../apps/play/src/portraitPanel.js');
}

describe('resolvePortraitPath — 16 MBTI canonical', () => {
  test('INTJ → portraits/INTJ.png', async () => {
    const { resolvePortraitPath } = await loadPanel();
    assert.equal(resolvePortraitPath('INTJ'), '/assets/portraits/INTJ.png');
  });

  test('case-insensitive (esfp == ESFP)', async () => {
    const { resolvePortraitPath } = await loadPanel();
    assert.equal(resolvePortraitPath('esfp'), '/assets/portraits/ESFP.png');
  });

  test('non-MBTI → default fallback path', async () => {
    const { resolvePortraitPath } = await loadPanel();
    assert.equal(resolvePortraitPath('NOT_REAL'), '/assets/portraits/default.png');
    assert.equal(resolvePortraitPath(''), '/assets/portraits/default.png');
    assert.equal(resolvePortraitPath(null), '/assets/portraits/default.png');
    assert.equal(resolvePortraitPath(undefined), '/assets/portraits/default.png');
  });

  test('tutti i 16 MBTI hanno path univoco', async () => {
    const { resolvePortraitPath, __testHelpers } = await loadPanel();
    const paths = __testHelpers.MBTI_FORMS.map((f) => resolvePortraitPath(f));
    const unique = new Set(paths);
    assert.equal(unique.size, 16, 'devono esistere 16 path univoci');
  });
});

describe('resolveStatusOverlay — priority panic > rage > bleeding > stunned > focused > confused', () => {
  test('panic ha priorità su tutti gli altri', async () => {
    const { resolveStatusOverlay } = await loadPanel();
    const r = resolveStatusOverlay({ panic: 1, rage: 2, focused: 1, bleeding: 1 });
    assert.equal(r.key, 'panic');
    assert.equal(r.emoji, '😱');
  });

  test('rage > bleeding > focused', async () => {
    const { resolveStatusOverlay } = await loadPanel();
    assert.equal(resolveStatusOverlay({ rage: 1, focused: 1 }).key, 'rage');
    assert.equal(resolveStatusOverlay({ bleeding: 1, focused: 1 }).key, 'bleeding');
    assert.equal(resolveStatusOverlay({ stunned: 1, focused: 1 }).key, 'stunned');
    assert.equal(resolveStatusOverlay({ focused: 1, confused: 1 }).key, 'focused');
  });

  test('confused unico → confused', async () => {
    const { resolveStatusOverlay } = await loadPanel();
    assert.equal(resolveStatusOverlay({ confused: 1 }).key, 'confused');
  });

  test('status vuoto / null → null overlay', async () => {
    const { resolveStatusOverlay } = await loadPanel();
    assert.equal(resolveStatusOverlay({}), null);
    assert.equal(resolveStatusOverlay(null), null);
    assert.equal(resolveStatusOverlay(undefined), null);
  });

  test('status con valore 0 → ignored (no overlay)', async () => {
    const { resolveStatusOverlay } = await loadPanel();
    assert.equal(resolveStatusOverlay({ panic: 0, rage: 0 }), null);
  });

  test('non-numeric truthy value → triggered (es. true / "active")', async () => {
    const { resolveStatusOverlay } = await loadPanel();
    assert.equal(resolveStatusOverlay({ rage: true }).key, 'rage');
    assert.equal(resolveStatusOverlay({ focused: 'active' }).key, 'focused');
  });
});

describe('buildPortraitMarkup — HTML output', () => {
  test('null unit → empty placeholder', async () => {
    const { buildPortraitMarkup } = await loadPanel();
    const html = buildPortraitMarkup(null);
    assert.match(html, /portrait-empty/);
    assert.match(html, /Nessun PG/);
  });

  test('unit con MBTI → src include path corretto', async () => {
    const { buildPortraitMarkup } = await loadPanel();
    const html = buildPortraitMarkup({ id: 'u1', mbti_type: 'INTJ' });
    assert.match(html, /\/assets\/portraits\/INTJ\.png/);
    assert.match(html, /portrait-panel/);
  });

  test('unit con status panic → emoji overlay 😱 + classe panic', async () => {
    const { buildPortraitMarkup } = await loadPanel();
    const html = buildPortraitMarkup({
      id: 'u1',
      mbti_type: 'ENFP',
      status: { panic: 2 },
    });
    assert.match(html, /portrait-emotion panic/);
    assert.match(html, /😱/);
  });

  test('multi-status → primo per priority vince (rage over focused)', async () => {
    const { buildPortraitMarkup } = await loadPanel();
    const html = buildPortraitMarkup({
      id: 'u1',
      mbti_type: 'ENTJ',
      status: { focused: 1, rage: 1 },
    });
    assert.match(html, /portrait-emotion rage/);
    assert.match(html, /😡/);
    assert.doesNotMatch(html, /portrait-emotion focused/);
  });

  test('idempotent: stesso unit input → stesso output (no hidden state)', async () => {
    const { buildPortraitMarkup } = await loadPanel();
    const unit = { id: 'u1', mbti_type: 'ISTP', status: { bleeding: 1 } };
    const a = buildPortraitMarkup(unit);
    const b = buildPortraitMarkup(unit);
    assert.equal(a, b);
  });

  test('XSS guard: angle brackets in mbti stripped', async () => {
    const { buildPortraitMarkup } = await loadPanel();
    const html = buildPortraitMarkup({ id: 'u1', mbti_type: '<script>x</script>' });
    assert.doesNotMatch(html, /<script>/);
  });

  test('renderPortraitPanel + clearPortraitPanel — null root no-op', async () => {
    const { renderPortraitPanel, clearPortraitPanel } = await loadPanel();
    // Should not throw on null root
    renderPortraitPanel(null, { id: 'u1', mbti_type: 'INTJ' });
    clearPortraitPanel(null);
    assert.ok(true, 'no throw');
  });
});
