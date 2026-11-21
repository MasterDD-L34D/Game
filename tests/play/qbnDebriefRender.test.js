// Sprint 10 (Surface-DEAD #7) — QBN narrative event diegetic render.
//
// Pure transforms (formatNarrativeEventCard) + side-effect (renderNarrativeEvent
// via fake DOM section + card containers). No canvas/jsdom.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/qbnDebriefRender.js');
}

describe('formatNarrativeEventCard — pure HTML formatter', () => {
  test('null/non-object payload → empty string', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    assert.equal(formatNarrativeEventCard(null), '');
    assert.equal(formatNarrativeEventCard(undefined), '');
    assert.equal(formatNarrativeEventCard('garbage'), '');
    assert.equal(formatNarrativeEventCard(42), '');
  });

  test('all-empty fields → empty string (no card to show)', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    assert.equal(formatNarrativeEventCard({}), '');
    assert.equal(formatNarrativeEventCard({ id: '', title_it: '', body_it: '' }), '');
  });

  test('full payload — title + body + choices + meta', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({
      id: 'evt_dawn_choice',
      title_it: 'Alba sul valico',
      body_it: 'Le creature si allontanano. Una sceglie di restare con voi.',
      choices: [
        { id: 'accept', label_it: 'Accetta il legame' },
        { id: 'refuse', label_it: 'Lasciala libera' },
      ],
      eligible_count: 4,
    });
    assert.ok(html.includes('data-event-id="evt_dawn_choice"'));
    assert.ok(html.includes('Alba sul valico'));
    assert.ok(html.includes('Le creature si allontanano'));
    assert.ok(html.includes('data-choice-id="accept"'));
    assert.ok(html.includes('Accetta il legame'));
    assert.ok(html.includes('Lasciala libera'));
    assert.ok(html.includes('4 eventi possibili'));
  });

  test('title only — no body, no choices', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({ id: 'x', title_it: 'Solo titolo' });
    assert.ok(html.includes('Solo titolo'));
    assert.ok(!html.includes('db-qbn-body'));
    assert.ok(!html.includes('db-qbn-choices'));
  });

  test('body only — no title surface', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({ id: 'x', body_it: 'Solo corpo' });
    assert.ok(html.includes('Solo corpo'));
    assert.ok(!html.includes('db-qbn-title'));
  });

  test('legacy keys: title + body (no _it suffix) accepted', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({ id: 'x', title: 'Hello', body: 'World' });
    assert.ok(html.includes('Hello'));
    assert.ok(html.includes('World'));
  });

  test('escapes HTML in title/body/choice labels (XSS safety)', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({
      id: 'x',
      title_it: '<script>alert(1)</script>',
      body_it: 'Pre <b>bold</b> post',
      choices: [{ id: 'c1', label_it: '<img src=x>' }],
    });
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<b>bold</b>'));
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&lt;b&gt;'));
  });

  test('choices without label fall back a id then ordinal', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({
      id: 'x',
      title_it: 't',
      choices: [{ id: 'first' }, {}],
    });
    assert.ok(html.includes('first'));
    assert.ok(html.includes('Opzione 2'));
  });

  test('choices array empty / missing → no choices block', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({ id: 'x', title_it: 't', choices: [] });
    assert.ok(!html.includes('db-qbn-choices'));
    const html2 = formatNarrativeEventCard({ id: 'x', title_it: 't' });
    assert.ok(!html2.includes('db-qbn-choices'));
  });

  test('eligible_count non-finite → no meta line', async () => {
    const { formatNarrativeEventCard } = await loadModule();
    const html = formatNarrativeEventCard({
      id: 'x',
      title_it: 't',
      eligible_count: 'NaN',
    });
    assert.ok(!html.includes('eventi possibili'));
  });
});

describe('renderNarrativeEvent — DOM side effect', () => {
  function fakeEl() {
    return { innerHTML: '', style: { display: '' } };
  }

  test('null section/card → no-op (no crash)', async () => {
    const { renderNarrativeEvent } = await loadModule();
    renderNarrativeEvent(null, null, { id: 'x', title_it: 't' });
    assert.ok(true);
    renderNarrativeEvent(fakeEl(), null, { id: 'x', title_it: 't' });
    assert.ok(true);
    renderNarrativeEvent(null, fakeEl(), { id: 'x', title_it: 't' });
    assert.ok(true);
  });

  test('null payload → hide section + clear card', async () => {
    const { renderNarrativeEvent } = await loadModule();
    const sec = fakeEl();
    const card = fakeEl();
    card.innerHTML = '<div>old</div>';
    renderNarrativeEvent(sec, card, null);
    assert.equal(sec.style.display, 'none');
    assert.equal(card.innerHTML, '');
  });

  test('all-empty payload → hide section + clear card', async () => {
    const { renderNarrativeEvent } = await loadModule();
    const sec = fakeEl();
    const card = fakeEl();
    renderNarrativeEvent(sec, card, {});
    assert.equal(sec.style.display, 'none');
  });

  test('full payload → reveal section + populate card', async () => {
    const { renderNarrativeEvent } = await loadModule();
    const sec = fakeEl();
    sec.style.display = 'none';
    const card = fakeEl();
    renderNarrativeEvent(sec, card, {
      id: 'evt_x',
      title_it: 'Titolo',
      body_it: 'Corpo',
    });
    assert.equal(sec.style.display, '');
    assert.ok(card.innerHTML.includes('Titolo'));
    assert.ok(card.innerHTML.includes('Corpo'));
  });

  test('idempotent — calling twice with same payload yields same innerHTML', async () => {
    const { renderNarrativeEvent } = await loadModule();
    const sec = fakeEl();
    const card = fakeEl();
    const payload = { id: 'x', title_it: 't', body_it: 'b' };
    renderNarrativeEvent(sec, card, payload);
    const first = card.innerHTML;
    renderNarrativeEvent(sec, card, payload);
    assert.equal(card.innerHTML, first);
  });
});
