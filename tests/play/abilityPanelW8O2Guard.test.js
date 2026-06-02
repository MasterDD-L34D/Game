// Regression guard -- anti-pattern #10 (silent fix+test drop).
//
// History: the W8O-2 clearAbilities token-bump fix first landed in PR #2321.
// A Jules rewrite (PR #2327, "rewrite ability panel condition") then removed
// BOTH the `_renderToken += 1` line AND its regression test
// (tests/play/abilityPanelClearRace.test.js) in a single commit. CI stayed
// GREEN: deleting a *.test.js never fails the `node --test tests/play/*.test.js`
// glob, and with the fix's own test gone nothing caught the resurrected
// "barra si e buggata" race. It was re-applied in PR #2336.
//
// This guard makes that exact silent drop go RED. It asserts:
//   1. the race regression test FILE still exists (so deleting it fails here), and
//   2. clearAbilities() still bumps the in-flight render token (the fix itself),
//      so dropping the fix fails here even if the race test is also dropped.
// Lives in tests/play so the existing CI glob picks it up automatically.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const ABILITY_PANEL = path.join(ROOT, 'apps', 'play', 'src', 'abilityPanel.js');
const RACE_TEST = path.join(ROOT, 'tests', 'play', 'abilityPanelClearRace.test.js');

describe('W8O-2 regression guard (anti-pattern #10: silent fix+test drop)', () => {
  test('the clearAbilities race regression test file still exists', () => {
    assert.ok(
      fs.existsSync(RACE_TEST),
      'tests/play/abilityPanelClearRace.test.js was removed -- a future rewrite must ' +
        'not silently drop the W8O-2 race guard (see PR #2327 regression, #2336 restore).',
    );
  });

  test('clearAbilities() still bumps the render token (the W8O-2 fix)', () => {
    const src = fs.readFileSync(ABILITY_PANEL, 'utf8');
    const start = src.indexOf('function clearAbilities');
    assert.notEqual(start, -1, 'clearAbilities() not found in apps/play/src/abilityPanel.js');

    // Window covering the clearAbilities() body (the token bump is its first
    // statement). Bounded slice keeps this robust to whatever follows.
    const region = src.slice(start, start + 600);
    assert.match(
      region,
      /_renderToken\s*(\+=\s*1|\+\+)|\+\+\s*_renderToken/,
      'clearAbilities() no longer invalidates the in-flight render token ' +
        '(_renderToken bump): this is the W8O-2 "barra si e buggata" resurrection ' +
        'fix (PR #2321 / #2336). Do not drop it.',
    );
  });
});
