// TKT-P4-DIALOGUE-COLORS — inner voice debrief render tests.
//
// Inner voices (Disco Elysium diegetic, 24 lines = 4 MBTI axes × 2 dir × 3
// tiers) are engine-LIVE (innerVoice.evaluateVoiceTriggers + inner_voices.yaml)
// but had ZERO debrief surface. This renders them color-coded per MBTI axis,
// mirroring enneaVoiceRender. Payload shape per voice:
//   { actor_id, voice_id, axis, direction, mbti_pole, tier, label, text }
// text is pre-wrapped backend-side: '<mbti axis="X">voice_it</mbti>'.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/innerVoiceRender.js');
}

describe('formatInnerVoiceLine — pure HTML formatter', () => {
  test('null/non-object payload → empty string', async () => {
    const { formatInnerVoiceLine } = await loadModule();
    assert.equal(formatInnerVoiceLine(null), '');
    assert.equal(formatInnerVoiceLine(undefined), '');
    assert.equal(formatInnerVoiceLine('garbage'), '');
    assert.equal(formatInnerVoiceLine(7), '');
  });

  test('missing text → empty string', async () => {
    const { formatInnerVoiceLine } = await loadModule();
    assert.equal(formatInnerVoiceLine({ mbti_pole: 'E', label: 'x' }), '');
    assert.equal(formatInnerVoiceLine({ text: '' }), '');
  });

  test('full payload → label + tier + color-coded quote', async () => {
    const { formatInnerVoiceLine } = await loadModule();
    const html = formatInnerVoiceLine({
      actor_id: 'p_a',
      voice_id: 'e_i_low_voice',
      axis: 'E_I',
      direction: 'low',
      mbti_pole: 'E',
      tier: 'voice',
      label: 'Voce estroversa',
      text: '<mbti axis="E">Insieme siamo più forti.</mbti>',
    });
    assert.ok(html.includes('data-actor-id="p_a"'));
    assert.ok(html.includes('Voce estroversa'), 'label rendered');
    assert.ok(html.includes('Insieme siamo più forti.'), 'quote text rendered');
    assert.ok(html.includes('mbti-axis-E'), 'color class applied (WCAG AA via CSS)');
  });

  test('escapes label + XSS-safe quote', async () => {
    const { formatInnerVoiceLine } = await loadModule();
    const html = formatInnerVoiceLine({
      mbti_pole: 'T',
      label: '<b>boom</b>',
      text: '<mbti axis="T"><script>alert(1)</script></mbti>',
    });
    assert.ok(!html.includes('<script>'), 'no live script');
    assert.ok(!html.includes('<b>boom</b>'), 'label escaped');
    assert.ok(html.includes('mbti-axis-T'), 'still colorized');
  });
});

describe('formatInnerVoiceList — pure HTML list', () => {
  test('null/empty array → empty string', async () => {
    const { formatInnerVoiceList } = await loadModule();
    assert.equal(formatInnerVoiceList(null), '');
    assert.equal(formatInnerVoiceList([]), '');
    assert.equal(formatInnerVoiceList('garbage'), '');
  });

  test('mixed valid + invalid filters silently', async () => {
    const { formatInnerVoiceList } = await loadModule();
    const html = formatInnerVoiceList([
      { mbti_pole: 'F', label: 'A', text: '<mbti axis="F">alpha</mbti>' },
      null,
      { label: 'B' }, // no text → filtered
      { mbti_pole: 'J', label: 'C', text: 'gamma' },
    ]);
    assert.ok(html.includes('alpha'));
    assert.ok(!html.includes('>B<'));
    assert.ok(html.includes('gamma'));
  });
});

describe('renderInnerVoices — DOM side effect (fake nodes)', () => {
  function makeFake() {
    return { style: { display: 'block' }, innerHTML: '' };
  }

  test('null payload → section hidden + listEl cleared', async () => {
    const { renderInnerVoices } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    list.innerHTML = 'stale';
    renderInnerVoices(section, list, null);
    assert.equal(section.style.display, 'none');
    assert.equal(list.innerHTML, '');
  });

  test('valid payload → section visible + populated', async () => {
    const { renderInnerVoices } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    section.style.display = 'none';
    renderInnerVoices(section, list, [
      { mbti_pole: 'N', label: 'Voce intuitiva', text: '<mbti axis="N">Vedo oltre.</mbti>' },
    ]);
    assert.equal(section.style.display, '');
    assert.ok(list.innerHTML.includes('Vedo oltre.'));
    assert.ok(list.innerHTML.includes('mbti-axis-N'));
  });

  test('null refs → no throw', async () => {
    const { renderInnerVoices } = await loadModule();
    assert.doesNotThrow(() => renderInnerVoices(null, null, []));
    assert.doesNotThrow(() => renderInnerVoices(null, { innerHTML: '' }, []));
  });
});
