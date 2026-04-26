// Sprint C — nestHub Mating tab unit tests.
//
// Coverage (DOM-free helpers):
//   - humanizeLineageId formatting
//   - escapeText / escapeAttr safety
//   - STATE shape with matingTab + getSquadCreatures provider
//
// Browser/DOM rendering verified via preview_verify manual smoke (Phase 2).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

async function loadPanel() {
  return import('../../apps/play/src/nestHub.js');
}

test('humanizeLineageId: lineage_a1b2c3d4 → Lineage A1B2-C3D4', async () => {
  const { __nestHubInternal } = await loadPanel();
  assert.equal(__nestHubInternal.humanizeLineageId('lineage_a1b2c3d4'), 'Lineage A1B2-C3D4');
});

test('humanizeLineageId: empty/null → "—"', async () => {
  const { __nestHubInternal } = await loadPanel();
  assert.equal(__nestHubInternal.humanizeLineageId(null), '—');
  assert.equal(__nestHubInternal.humanizeLineageId(''), '—');
  assert.equal(__nestHubInternal.humanizeLineageId(undefined), '—');
});

test('humanizeLineageId: non-matching format passthrough', async () => {
  const { __nestHubInternal } = await loadPanel();
  // Doesn't match /^lineage_[0-9a-f]+$/ → returns unchanged
  assert.equal(__nestHubInternal.humanizeLineageId('not_lineage_123'), 'not_lineage_123');
});

test('escapeText: HTML special chars escaped', async () => {
  const { __nestHubInternal } = await loadPanel();
  assert.equal(__nestHubInternal.escapeText('<script>'), '&lt;script&gt;');
  assert.equal(__nestHubInternal.escapeText('a & b'), 'a &amp; b');
  assert.equal(__nestHubInternal.escapeText(null), '');
});

test('escapeAttr: also escapes double quotes', async () => {
  const { __nestHubInternal } = await loadPanel();
  assert.equal(__nestHubInternal.escapeAttr('hello "world"'), 'hello &quot;world&quot;');
  assert.equal(__nestHubInternal.escapeAttr('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test('STATE shape: includes matingTab + getSquadCreatures provider', async () => {
  const { __nestHubInternal } = await loadPanel();
  const s = __nestHubInternal.STATE;
  assert.equal(typeof s.getSquadCreatures, 'function');
  assert.equal(typeof s.matingTab, 'object');
  assert.equal(s.matingTab.parentAId, null);
  assert.equal(s.matingTab.parentBId, null);
  assert.equal(s.matingTab.rolledThisSession, false);
  assert.ok(['overview', 'mating', 'lineage'].includes(s.activeTab));
});
