// TKT-P4-CONVICTION-BADGES — conviction badge debrief render tests.
//
// Engine LIVE: mbtiSurface.buildConvictionBadges / buildConvictionBadgesMap
// (Triangle Strategy pattern). Wired into rewardEconomy.buildDebriefSummary →
// debrief.mbti_surface.conviction_badges = { uid: [{ axis, letter, label,
// axis_label, color, color_name, confidence, value, delta }, ...], ... }.
//
// Surface DEAD pre-2026-05-30: the only renderer was an in-combat transient
// flash (characterPanel); the debrief panel never showed convictions. This adds
// a persistent debrief section.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/convictionBadgeRender.js');
}

const SAMPLE = {
  axis: 'T_F',
  letter: 'T',
  label: 'Pensiero',
  axis_label: 'Decisione',
  color: '#0e7490',
  color_name: 'teal',
  confidence: 0.85,
  value: 0.9,
  delta: null,
};

describe('formatConvictionBadge — pure HTML chip', () => {
  test('null/non-object → empty string', async () => {
    const { formatConvictionBadge } = await loadModule();
    assert.equal(formatConvictionBadge(null), '');
    assert.equal(formatConvictionBadge('x'), '');
    assert.equal(formatConvictionBadge(3), '');
  });

  test('missing letter AND axis_label → empty string', async () => {
    const { formatConvictionBadge } = await loadModule();
    assert.equal(formatConvictionBadge({ color: '#0e7490' }), '');
  });

  test('full badge → letter + axis_label + pole label + color', async () => {
    const { formatConvictionBadge } = await loadModule();
    const html = formatConvictionBadge(SAMPLE);
    assert.ok(html.includes('Decisione'), 'axis label');
    assert.ok(html.includes('Pensiero'), 'pole label');
    assert.ok(html.includes('>T<'), 'letter');
    assert.ok(html.includes('#0e7490'), 'color applied');
    assert.ok(html.includes('data-axis="T_F"'));
  });

  test('positive delta shown as scaled signed integer', async () => {
    const { formatConvictionBadge } = await loadModule();
    const html = formatConvictionBadge({ ...SAMPLE, delta: 0.12 });
    assert.ok(html.includes('+12'), 'delta scaled ×100 with sign');
  });

  test('invalid color is not injected as inline style (sanitized)', async () => {
    const { formatConvictionBadge } = await loadModule();
    const html = formatConvictionBadge({ ...SAMPLE, color: 'red;}</style><script>x' });
    assert.ok(!html.includes('<script>'), 'no script injection');
    assert.ok(!html.includes('color:red;}'), 'malformed color not used inline');
  });
});

describe('formatConvictionBadgeList — accepts map or flat array', () => {
  test('null/empty → empty string', async () => {
    const { formatConvictionBadgeList } = await loadModule();
    assert.equal(formatConvictionBadgeList(null), '');
    assert.equal(formatConvictionBadgeList([]), '');
    assert.equal(formatConvictionBadgeList({}), '');
  });

  test('per-actor map {uid:[badges]} → flattened render', async () => {
    const { formatConvictionBadgeList } = await loadModule();
    const html = formatConvictionBadgeList({
      p_a: [SAMPLE],
      p_b: [{ ...SAMPLE, axis: 'E_I', letter: 'E', axis_label: 'Energia sociale' }],
    });
    assert.ok(html.includes('Decisione'));
    assert.ok(html.includes('Energia sociale'));
  });

  test('flat array also accepted', async () => {
    const { formatConvictionBadgeList } = await loadModule();
    const html = formatConvictionBadgeList([SAMPLE]);
    assert.ok(html.includes('Decisione'));
  });
});

describe('renderConvictionBadges — DOM side effect (fake nodes)', () => {
  function makeFake() {
    return { style: { display: 'block' }, innerHTML: '' };
  }

  test('empty payload → section hidden + cleared', async () => {
    const { renderConvictionBadges } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    list.innerHTML = 'stale';
    renderConvictionBadges(section, list, {});
    assert.equal(section.style.display, 'none');
    assert.equal(list.innerHTML, '');
  });

  test('valid payload → section visible + populated', async () => {
    const { renderConvictionBadges } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    section.style.display = 'none';
    renderConvictionBadges(section, list, { p_a: [SAMPLE] });
    assert.equal(section.style.display, '');
    assert.ok(list.innerHTML.includes('Decisione'));
  });

  test('null refs → no throw', async () => {
    const { renderConvictionBadges } = await loadModule();
    assert.doesNotThrow(() => renderConvictionBadges(null, null, {}));
  });
});
