// TKT-P4-DIALOGUE-COLORS — renderMbtiTaggedHtml forceReveal option tests.
//
// Pre-P4: <mbti> color spans only rendered when the axis is in
// mbtiRevealed.revealed[] (Path A gating). Debrief personality voices (ennea +
// inner) ARE the reveal moment, so they must color-code unconditionally via the
// additive { forceReveal: true } option. WCAG AA preserved (palette mirror).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/dialogueRender.js');
}

describe('renderMbtiTaggedHtml — forceReveal option (TKT-P4-DIALOGUE-COLORS)', () => {
  test('without forceReveal, unrevealed axis stays plain (no color leak)', async () => {
    const { renderMbtiTaggedHtml } = await loadModule();
    const html = renderMbtiTaggedHtml('<mbti axis="T">La logica guida.</mbti>', null);
    assert.ok(html.includes('La logica guida.'));
    assert.ok(!html.includes('mbti-axis-T'), 'no color span when not revealed');
    assert.ok(!html.includes('style="color:'), 'no inline color when not revealed');
  });

  test('forceReveal colorizes every tagged axis regardless of reveal state', async () => {
    const { renderMbtiTaggedHtml } = await loadModule();
    const html = renderMbtiTaggedHtml('<mbti axis="T">La logica guida.</mbti>', null, {
      forceReveal: true,
    });
    assert.ok(html.includes('mbti-axis-T'), 'color class applied (WCAG AA via CSS)');
    assert.ok(html.includes('data-mbti-axis="T"'), 'axis data attr present');
    assert.ok(html.includes('La logica guida.'));
  });

  test('forceReveal still escapes inner HTML (XSS safety)', async () => {
    const { renderMbtiTaggedHtml } = await loadModule();
    const html = renderMbtiTaggedHtml('<mbti axis="F"><script>alert(1)</script></mbti>', null, {
      forceReveal: true,
    });
    assert.ok(!html.includes('<script>'), 'no live script tag');
    assert.ok(html.includes('&lt;script&gt;'), 'inner escaped');
    assert.ok(html.includes('mbti-axis-F'), 'still colorized');
  });

  test('forceReveal escapes plain text outside tags', async () => {
    const { renderMbtiTaggedHtml } = await loadModule();
    const html = renderMbtiTaggedHtml('prima <mbti axis="N">visione</mbti> <b>dopo</b>', null, {
      forceReveal: true,
    });
    assert.ok(html.includes('&lt;b&gt;dopo&lt;/b&gt;'), 'outside-tag HTML escaped');
    assert.ok(html.includes('mbti-axis-N'));
  });
});
