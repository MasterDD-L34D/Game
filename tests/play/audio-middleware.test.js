// OD-028 ai-station — Howler.js audio middleware shape test.
//
// Pure shape + fallback behavior. Validates:
//   - audio.js exposes unified surface (sfx synth + Howler sample helpers).
//   - playSample/stopSample/unloadAllSamples are callable.
//   - When window.Howl is absent, playSample returns null (graceful no-op).
//   - When window.Howl is stubbed, playSample exercises the load+play path.
//   - setAudioMuted toggles both synth + Howler.mute (if available).
//
// Cross-link: docs/audio/howler-middleware-OD-028.md
//             docs/governance/open-decisions/OD-024-031-verdict-record.md

'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

async function freshModule() {
  // Invalidate require cache via dynamic import + bust query param.
  const tag = Date.now() + Math.random();
  return import(`../../apps/play/src/audio.js?bust=${tag}`);
}

describe('audio middleware surface', () => {
  let origWindow;
  let origConsoleWarn;

  beforeEach(() => {
    origWindow = global.window;
    origConsoleWarn = console.warn;
    console.warn = () => {};
    global.window = {};
  });

  afterEach(() => {
    global.window = origWindow;
    console.warn = origConsoleWarn;
  });

  test('exposes audio facade with synth + sample API', async () => {
    const mod = await freshModule();
    assert.ok(mod.audio, 'audio facade exported');
    // sfx synth presets re-exported
    assert.equal(typeof mod.audio.hit, 'function', 'sfx.hit re-exported');
    assert.equal(typeof mod.audio.win, 'function', 'sfx.win re-exported');
    // Howler middleware additions
    assert.equal(typeof mod.audio.playSample, 'function');
    assert.equal(typeof mod.audio.stopSample, 'function');
    assert.equal(typeof mod.audio.unloadAllSamples, 'function');
    assert.equal(typeof mod.audio.setMuted, 'function');
    assert.equal(typeof mod.audio.isMuted, 'function');
  });

  test('playSample returns null when Howler not loaded (graceful no-op)', async () => {
    const mod = await freshModule();
    const result = mod.playSample('test_id', { src: '/fake.mp3' });
    assert.equal(result, null, 'returns null without Howler');
  });

  test('playSample returns null for invalid id', async () => {
    const mod = await freshModule();
    assert.equal(mod.playSample(''), null);
    assert.equal(mod.playSample(null), null);
    assert.equal(mod.playSample(undefined), null);
  });

  test('playSample loads + plays when window.Howl available', async () => {
    let playCalls = 0;
    let loadedSrc = null;
    global.window.Howl = function FakeHowl(opts) {
      loadedSrc = opts.src;
      this.play = () => {
        playCalls += 1;
        return 42; // fake playback id
      };
      this.stop = () => {};
      this.unload = () => {};
    };
    const mod = await freshModule();
    const id1 = mod.playSample('skiv_pulse', { src: '/assets/audio/skiv_pulse.webm' });
    assert.equal(id1, 42, 'play returns Howler playback id');
    assert.equal(playCalls, 1);
    assert.deepEqual(loadedSrc, ['/assets/audio/skiv_pulse.webm'], 'src wrapped in array');
    // Second play reuses cached Howl
    const id2 = mod.playSample('skiv_pulse', { src: '/assets/audio/skiv_pulse.webm' });
    assert.equal(id2, 42);
    assert.equal(playCalls, 2, 'cached Howl instance reused');
  });

  test('playSample no-op when muted', async () => {
    global.window.Howl = function FakeHowl() {
      this.play = () => 99;
      this.stop = () => {};
    };
    const mod = await freshModule();
    mod.setAudioMuted(true);
    assert.equal(mod.playSample('any', { src: '/x.mp3' }), null);
    mod.setAudioMuted(false);
  });

  test('setAudioMuted toggles Howler.mute when available', async () => {
    let howlerMuteCalls = [];
    global.window.Howl = function FakeHowl() {
      this.play = () => 1;
    };
    global.window.Howler = {
      mute: (flag) => howlerMuteCalls.push(flag),
    };
    const mod = await freshModule();
    mod.setAudioMuted(true);
    mod.setAudioMuted(false);
    assert.deepEqual(howlerMuteCalls, [true, false]);
  });

  test('unloadAllSamples clears cache + calls unload on each Howl', async () => {
    let unloadCalls = 0;
    global.window.Howl = function FakeHowl() {
      this.play = () => 1;
      this.stop = () => {};
      this.unload = () => {
        unloadCalls += 1;
      };
    };
    const mod = await freshModule();
    mod.playSample('a', { src: '/a.mp3' });
    mod.playSample('b', { src: '/b.mp3' });
    mod.unloadAllSamples();
    assert.equal(unloadCalls, 2, 'both Howls unloaded');
  });

  test('stopSample is safe on unknown id', async () => {
    const mod = await freshModule();
    assert.doesNotThrow(() => mod.stopSample('never_loaded'));
  });
});
