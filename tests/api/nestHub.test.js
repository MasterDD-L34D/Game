// OD-001 Path A Sprint A — nestHub helper unit tests.
//
// DOM-free helpers only (TAB_IDS, filterSquadMembers, filterMatingEligible,
// switchTab guard). Browser integration covered manually via preview_verify.
//
// Pattern clonato da tests/api/formsPanelInfer.test.js.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Dynamic import of ESM module (apps/play/src is browser-side ESM).
async function loadHub() {
  return import('../../apps/play/src/nestHub.js');
}

test('nestHub exports 5 canonical tab ids: squad / mating / mutations / lineage / codex', async () => {
  const { __nestHubInternal } = await loadHub();
  assert.deepEqual(__nestHubInternal.TAB_IDS, ['squad', 'mating', 'mutations', 'lineage', 'codex']);
});

test('filterSquadMembers returns only NPCs with recruited:true', async () => {
  const { filterSquadMembers } = await loadHub();
  const npcs = [
    { npc_id: 'a', recruited: true },
    { npc_id: 'b', recruited: false },
    { npc_id: 'c', recruited: true, mated: true },
    { npc_id: 'd' }, // no recruited flag
    null, // garbage entry
  ];
  const out = filterSquadMembers(npcs);
  assert.equal(out.length, 2);
  assert.equal(out[0].npc_id, 'a');
  assert.equal(out[1].npc_id, 'c');
});

test('filterSquadMembers returns [] for non-array input', async () => {
  const { filterSquadMembers } = await loadHub();
  assert.deepEqual(filterSquadMembers(null), []);
  assert.deepEqual(filterSquadMembers(undefined), []);
  assert.deepEqual(filterSquadMembers({}), []);
  assert.deepEqual(filterSquadMembers([]), []);
});

test('filterMatingEligible: recruited + non-mated + cooldown<=0', async () => {
  const { filterMatingEligible } = await loadHub();
  const npcs = [
    { npc_id: 'a', recruited: true, mated: false, mating_cooldown: 0 }, // ✓
    { npc_id: 'b', recruited: false, mated: false, mating_cooldown: 0 }, // ✗ not recruited
    { npc_id: 'c', recruited: true, mated: true, mating_cooldown: 0 }, // ✗ already mated
    { npc_id: 'd', recruited: true, mated: false, mating_cooldown: 2 }, // ✗ cooldown
    { npc_id: 'e', recruited: true, mated: false }, // ✓ undefined cooldown = 0
  ];
  const out = filterMatingEligible(npcs);
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((n) => n.npc_id),
    ['a', 'e'],
  );
});

test('escapeHtml escapes &, <, >, "', async () => {
  const { __nestHubInternal } = await loadHub();
  const { escapeHtml } = __nestHubInternal;
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('switchTab guards against non-canonical tab ids (silent no-op)', async () => {
  const { switchTab, __nestHubInternal } = await loadHub();
  // No throw on invalid input — function is a guard.
  assert.doesNotThrow(() => switchTab('invalid_tab'));
  assert.doesNotThrow(() => switchTab(null));
  assert.doesNotThrow(() => switchTab(undefined));
  // Valid inputs also no-throw (no DOM in node-test env, switchTab returns early).
  for (const id of __nestHubInternal.TAB_IDS) {
    assert.doesNotThrow(() => switchTab(id));
  }
});
