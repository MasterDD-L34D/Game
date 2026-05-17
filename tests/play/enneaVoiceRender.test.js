// 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND — ennea voice debrief render tests.
//
// Pure transforms (formatVoiceLine + formatVoiceList) + side-effect
// (renderEnneaVoices via fake DOM section + list containers). No jsdom.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/enneaVoiceRender.js');
}

describe('formatVoiceLine — pure HTML formatter', () => {
  test('null/non-object payload → empty string', async () => {
    const { formatVoiceLine } = await loadModule();
    assert.equal(formatVoiceLine(null), '');
    assert.equal(formatVoiceLine(undefined), '');
    assert.equal(formatVoiceLine('garbage'), '');
    assert.equal(formatVoiceLine(42), '');
  });

  test('missing archetype_id or text → empty string', async () => {
    const { formatVoiceLine } = await loadModule();
    assert.equal(formatVoiceLine({ archetype_id: 'Architetto(5)' }), '');
    assert.equal(formatVoiceLine({ text: 'lonely' }), '');
    assert.equal(formatVoiceLine({ archetype_id: '', text: 'a' }), '');
  });

  test('unknown archetype_id → empty string (no meta)', async () => {
    const { formatVoiceLine } = await loadModule();
    const html = formatVoiceLine({ archetype_id: 'Unknown(99)', text: 'x' });
    assert.equal(html, '');
  });

  test('full payload Type 5 — archetype + beat + text rendered', async () => {
    const { formatVoiceLine } = await loadModule();
    const html = formatVoiceLine({
      actor_id: 'p_a',
      archetype_id: 'Architetto(5)',
      ennea_type: 5,
      beat_id: 'victory_solo',
      line_id: 'v5_vct_clean',
      text: 'Esecuzione pulita. Modello validato.',
    });
    assert.ok(html.includes('data-actor-id="p_a"'));
    assert.ok(html.includes('archetype-5'));
    assert.ok(html.includes('Architetto'));
    assert.ok(html.includes('Vittoria'));
    assert.ok(html.includes('Esecuzione pulita. Modello validato.'));
  });

  test('all 9 archetypes have palette mapping', async () => {
    const { formatVoiceLine, _internals } = await loadModule();
    const allArchetypes = Object.keys(_internals.ARCHETYPE_META);
    assert.equal(allArchetypes.length, 9);
    for (const archetype of allArchetypes) {
      const html = formatVoiceLine({ archetype_id: archetype, text: 'x' });
      assert.ok(html.length > 0, `archetype ${archetype} should render`);
      assert.ok(html.includes(_internals.ARCHETYPE_META[archetype].cls));
    }
  });

  test('beat_id mapping IT — known beats translate to label', async () => {
    const { formatVoiceLine, _internals } = await loadModule();
    assert.equal(_internals.BEAT_LABEL_IT.victory_solo, 'Vittoria');
    assert.equal(_internals.BEAT_LABEL_IT.defeat_critical, 'Sconfitta');
    const html = formatVoiceLine({
      archetype_id: 'Cacciatore(8)',
      beat_id: 'defeat_critical',
      text: 'tear',
    });
    assert.ok(html.includes('Sconfitta'));
  });

  test('unknown beat_id falls back to raw beat_id (no exception)', async () => {
    const { formatVoiceLine } = await loadModule();
    const html = formatVoiceLine({
      archetype_id: 'Stoico(9)',
      beat_id: 'mystery_beat',
      text: 'silence',
    });
    assert.ok(html.includes('mystery_beat'));
  });

  test('escapes HTML in text + actor_id (XSS safety)', async () => {
    const { formatVoiceLine } = await loadModule();
    const html = formatVoiceLine({
      actor_id: 'p_<script>',
      archetype_id: 'Riformatore(1)',
      text: '<img src=x onerror=alert(1)>',
    });
    // XSS safety: raw HTML tags must be escaped (no live <script>, <img>).
    // Literal "onerror=alert(1)" can survive as inert text — what matters
    // is that the surrounding <...> is escaped so the browser parses it
    // as text-content, not active markup.
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src'));
    assert.ok(html.includes('&lt;script&gt;') || html.includes('p_&lt;'));
    assert.ok(html.includes('&lt;img'));
  });
});

describe('formatVoiceList — pure HTML list', () => {
  test('null/empty array → empty string', async () => {
    const { formatVoiceList } = await loadModule();
    assert.equal(formatVoiceList(null), '');
    assert.equal(formatVoiceList([]), '');
    assert.equal(formatVoiceList('garbage'), '');
  });

  test('mixed valid + invalid filters silently', async () => {
    const { formatVoiceList } = await loadModule();
    const html = formatVoiceList([
      { archetype_id: 'Architetto(5)', text: 'A' },
      null,
      { archetype_id: 'Unknown(99)', text: 'B' }, // filtered (no meta)
      { archetype_id: 'Lealista(6)', text: 'C' },
    ]);
    assert.ok(html.includes('"A"'));
    assert.ok(!html.includes('"B"'));
    assert.ok(html.includes('"C"'));
  });
});

describe('renderEnneaVoices — DOM side effect (fake nodes)', () => {
  function makeFake() {
    return { style: { display: 'block' }, innerHTML: '' };
  }

  test('null payload → section hidden + listEl cleared', async () => {
    const { renderEnneaVoices } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    section.style.display = 'block';
    list.innerHTML = 'stale';
    renderEnneaVoices(section, list, null);
    assert.equal(section.style.display, 'none');
    assert.equal(list.innerHTML, '');
  });

  test('valid payload → section visible + innerHTML populated', async () => {
    const { renderEnneaVoices } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    section.style.display = 'none';
    renderEnneaVoices(section, list, [
      { archetype_id: 'Esploratore(7)', text: 'Avanti, sempre.', actor_id: 'p_b' },
    ]);
    assert.equal(section.style.display, '');
    assert.ok(list.innerHTML.includes('Esploratore'));
    assert.ok(list.innerHTML.includes('Avanti, sempre.'));
  });

  test('idempotent — second call replaces innerHTML', async () => {
    const { renderEnneaVoices } = await loadModule();
    const section = makeFake();
    const list = makeFake();
    renderEnneaVoices(section, list, [{ archetype_id: 'Riformatore(1)', text: 'Primo.' }]);
    renderEnneaVoices(section, list, [{ archetype_id: 'Cacciatore(8)', text: 'Secondo.' }]);
    assert.ok(!list.innerHTML.includes('Primo.'));
    assert.ok(list.innerHTML.includes('Secondo.'));
  });

  test('null section/list refs → no throw', async () => {
    const { renderEnneaVoices } = await loadModule();
    assert.doesNotThrow(() => renderEnneaVoices(null, null, []));
    assert.doesNotThrow(() => renderEnneaVoices(null, { innerHTML: '' }, []));
  });
});
