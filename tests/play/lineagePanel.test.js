// Sprint 12 (Surface-DEAD #4) — Mating lifecycle wire frontend.
//
// Pure transforms (formatLineageCard + formatLineageList) +
// side-effect renderLineageEligibles via fake DOM stubs.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../apps/play/src/lineagePanel.js');
}

const baseEntry = {
  parent_a_id: 'pg_alice',
  parent_b_id: 'pg_bob',
  parent_a_name: 'Alice',
  parent_b_name: 'Bob',
  biome_id: 'savana',
  can_mate: true,
  expected_offspring_count: 1,
};

describe('formatLineageCard', () => {
  test('canonical entry → HTML with parent names + biome chip + offspring badge', async () => {
    const { formatLineageCard } = await loadModule();
    const html = formatLineageCard(baseEntry);
    assert.match(html, /db-lineage-card/);
    assert.match(html, /Alice/);
    assert.match(html, /Bob/);
    assert.match(html, /Savana/);
    assert.match(html, /\+1 offspring/);
    assert.match(html, /×/);
  });

  test('plural offspring label when count > 1', async () => {
    const { formatLineageCard } = await loadModule();
    const html = formatLineageCard({ ...baseEntry, expected_offspring_count: 3 });
    assert.match(html, /\+3 offsprings/);
  });

  test('null/undefined/empty entry → empty string', async () => {
    const { formatLineageCard } = await loadModule();
    assert.equal(formatLineageCard(null), '');
    assert.equal(formatLineageCard(undefined), '');
    assert.equal(formatLineageCard({}), '');
  });

  test('missing parent ids → empty string (drop malformed)', async () => {
    const { formatLineageCard } = await loadModule();
    assert.equal(formatLineageCard({ ...baseEntry, parent_a_id: '' }), '');
    assert.equal(formatLineageCard({ ...baseEntry, parent_b_id: null }), '');
  });

  test('XSS escape on parent names + ids', async () => {
    const { formatLineageCard } = await loadModule();
    const html = formatLineageCard({
      ...baseEntry,
      parent_a_id: 'pg_<script>',
      parent_a_name: '<img src=x onerror=alert(1)>',
      parent_b_name: 'Bob"&<>',
    });
    // No raw script/img tag in output
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
    // Entities present
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;img/);
    assert.match(html, /Bob&quot;&amp;&lt;&gt;/);
  });

  test('null biome_id → no biome chip rendered', async () => {
    const { formatLineageCard } = await loadModule();
    const html = formatLineageCard({ ...baseEntry, biome_id: null });
    assert.ok(!html.includes('db-lineage-biome'));
  });

  test('unknown biome → fallback Title Case label', async () => {
    const { formatLineageCard } = await loadModule();
    const html = formatLineageCard({ ...baseEntry, biome_id: 'xyz_zone' });
    assert.match(html, /Xyz Zone/);
  });

  test('falsy/zero/negative offspring count → fallback 1', async () => {
    const { formatLineageCard } = await loadModule();
    const h0 = formatLineageCard({ ...baseEntry, expected_offspring_count: 0 });
    assert.match(h0, /\+1 offspring/);
    const hNeg = formatLineageCard({ ...baseEntry, expected_offspring_count: -2 });
    assert.match(hNeg, /\+1 offspring/);
  });

  test('parent name fallback to id when missing', async () => {
    const { formatLineageCard } = await loadModule();
    const html = formatLineageCard({
      ...baseEntry,
      parent_a_name: '',
      parent_b_name: undefined,
    });
    assert.match(html, /pg_alice/);
    assert.match(html, /pg_bob/);
  });
});

describe('formatLineageList', () => {
  test('empty array → empty string', async () => {
    const { formatLineageList } = await loadModule();
    assert.equal(formatLineageList([]), '');
  });

  test('null/undefined → empty string', async () => {
    const { formatLineageList } = await loadModule();
    assert.equal(formatLineageList(null), '');
    assert.equal(formatLineageList(undefined), '');
  });

  test('multiple entries → concatenated cards', async () => {
    const { formatLineageList } = await loadModule();
    const html = formatLineageList([
      baseEntry,
      { ...baseEntry, parent_a_id: 'pg_carol', parent_a_name: 'Carol' },
    ]);
    const cardCount = (html.match(/db-lineage-card/g) || []).length;
    assert.equal(cardCount, 2);
    assert.match(html, /Alice/);
    assert.match(html, /Carol/);
  });

  test('skips malformed entries inline', async () => {
    const { formatLineageList } = await loadModule();
    const html = formatLineageList([
      baseEntry,
      null,
      { parent_a_id: '' }, // malformed
      { ...baseEntry, parent_a_name: 'Diana', parent_a_id: 'pg_diana' },
    ]);
    const cardCount = (html.match(/db-lineage-card/g) || []).length;
    assert.equal(cardCount, 2);
  });
});

describe('renderLineageEligibles', () => {
  function fakeEl() {
    return { style: { display: '' }, innerHTML: '' };
  }

  test('valid array → section visible + list innerHTML populated', async () => {
    const { renderLineageEligibles } = await loadModule();
    const section = fakeEl();
    const list = fakeEl();
    renderLineageEligibles(section, list, [baseEntry]);
    assert.equal(section.style.display, '');
    assert.match(list.innerHTML, /db-lineage-card/);
    assert.match(list.innerHTML, /Alice/);
  });

  test('empty array → section hidden + list cleared', async () => {
    const { renderLineageEligibles } = await loadModule();
    const section = { style: { display: '' }, innerHTML: '' };
    const list = { style: { display: '' }, innerHTML: '<old>' };
    renderLineageEligibles(section, list, []);
    assert.equal(section.style.display, 'none');
    assert.equal(list.innerHTML, '');
  });

  test('null payload → section hidden', async () => {
    const { renderLineageEligibles } = await loadModule();
    const section = fakeEl();
    const list = fakeEl();
    renderLineageEligibles(section, list, null);
    assert.equal(section.style.display, 'none');
  });

  test('all-malformed entries → section hidden (no cards)', async () => {
    const { renderLineageEligibles } = await loadModule();
    const section = fakeEl();
    const list = fakeEl();
    renderLineageEligibles(section, list, [{}, null, { parent_a_id: '' }]);
    assert.equal(section.style.display, 'none');
    assert.equal(list.innerHTML, '');
  });

  test('idempotent: two calls converge to same DOM state', async () => {
    const { renderLineageEligibles } = await loadModule();
    const section = fakeEl();
    const list = fakeEl();
    renderLineageEligibles(section, list, [baseEntry]);
    const firstHtml = list.innerHTML;
    renderLineageEligibles(section, list, [baseEntry]);
    assert.equal(list.innerHTML, firstHtml);
  });

  test('null section/list refs → no crash (defensive)', async () => {
    const { renderLineageEligibles } = await loadModule();
    renderLineageEligibles(null, null, [baseEntry]);
    renderLineageEligibles(undefined, undefined, []);
    // No assertion — just don't throw.
    assert.ok(true);
  });
});
