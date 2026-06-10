// Gate-5 #2716 / ER3 -- publishWorld forwards overcharge_used_this_run to phones.
//
// The Godot phone mirror (Game-Godot-v2 #466 / PR #467, PhoneComposerView._on_state
// -> PhoneOverchargeHint) detects the witnessed false->true transition of
// `overcharge_used_this_run` between two WS `state` snapshots of the same session.
// The host web client is the only WS publisher: if the trimmed payload built in
// refresh()'s lobbyBridge.publishWorld call drops the field, phones can never
// witness the transition and the diegetic hint stays dead (Engine LIVE /
// Surface DEAD).
//
// main.js is the DOM-bound Vite entry (cannot be imported under node:test), so
// this pins the executable payload wire via bounded source slice + comment
// stripping -- same harness as abilityPanelW8O2Guard.test.js.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MAIN = path.join(ROOT, 'apps', 'play', 'src', 'main.js');
const HINT = path.join(ROOT, 'apps', 'play', 'src', 'overchargeHint.js');

// Strip comments so a commented-out copy of the wire cannot satisfy the guard
// (same rationale as abilityPanelW8O2Guard.test.js, Codex P2 #2577).
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

describe('publishWorld overcharge wire (Gate-5 #2716, Godot mirror Game-Godot-v2#467)', () => {
  test('host publishWorld payload forwards overcharge_used_this_run from state.world', () => {
    const src = fs.readFileSync(MAIN, 'utf8');
    const start = src.indexOf('lobbyBridge.publishWorld({');
    assert.notEqual(
      start,
      -1,
      'lobbyBridge.publishWorld({ call not found in apps/play/src/main.js',
    );

    // Bounded window over the payload object literal: big enough to cover the
    // whole trimmed payload, small enough not to match unrelated code below.
    const code = stripComments(src.slice(start, start + 600));
    assert.match(
      code,
      /overcharge_used_this_run:\s*!!state\.world\?\.overcharge_used_this_run/,
      'publishWorld payload must forward overcharge_used_this_run (coerced bool) ' +
        'so phone clients witness the false->true transition and fire the ' +
        'diegetic hint (PhoneOverchargeHint, Game-Godot-v2 PR #467).',
    );
  });

  test('payload key matches the detector field read by overchargeHint.js (contract parity)', () => {
    const hint = stripComments(fs.readFileSync(HINT, 'utf8'));
    assert.match(
      hint,
      /\bovercharge_used_this_run\b/,
      'overchargeHint.js no longer reads overcharge_used_this_run -- a field ' +
        'rename must be coordinated across publishWorld, the web hint and the ' +
        'Godot phone mirror (they share the same WS state contract).',
    );
  });
});
