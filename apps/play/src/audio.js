// Audio middleware — unified facade over Web Audio synth (sfx.js) + Howler.js
// sample playback (lazy-loaded, optional).
//
// OD-028 ai-station re-verdict 2026-05-14: adopt Howler.js middleware (MIT,
// ~5KB minified) to unblock audio surface. Previous default "Web Audio API
// direct" kept audio "terziaria" because adding sprite/loop/fade-out logic
// inline was infeasible. Middleware adoption finalizes audio as
// non-terziaria surface without scope creep.
//
// Design:
//   - sfx.* continues to use Web Audio synth (no asset files) — zero change
//     for existing call sites (main.js + UI panels).
//   - playSample(id, { src, volume?, loop? }) loads + caches a Howl instance
//     when window.Howl is available (loaded via CDN or future npm bundle).
//     Falls back to a no-op + console warning if Howler not loaded.
//   - Single mute toggle controls both synth + samples.
//
// Cross-link: docs/audio/howler-middleware-OD-028.md
//             docs/governance/open-decisions/OD-024-031-verdict-record.md

import { sfx, setMuted, isMuted } from './sfx.js';

const _howls = new Map(); // id → Howl instance (or sentinel 'unavailable')

function _hasHowler() {
  return typeof window !== 'undefined' && typeof window.Howl === 'function';
}

function _getOrCreateHowl(id, { src, volume = 1, loop = false }) {
  if (_howls.has(id)) {
    const cached = _howls.get(id);
    if (cached === 'unavailable') return null;
    return cached;
  }
  if (!_hasHowler()) {
    _howls.set(id, 'unavailable');
    // Single warning per missing Howler — avoid log spam.
    if (typeof console !== 'undefined' && !_getOrCreateHowl._warned) {
      console.warn(
        '[audio] Howler.js not loaded; playSample no-op. Add <script src="https://cdn.jsdelivr.net/npm/howler@2/dist/howler.min.js"> or npm install howler.',
      );
      _getOrCreateHowl._warned = true;
    }
    return null;
  }
  try {
    const howl = new window.Howl({
      src: Array.isArray(src) ? src : [src],
      volume,
      loop,
    });
    _howls.set(id, howl);
    return howl;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn(`[audio] Howler load failed for ${id}:`, err && err.message);
    }
    _howls.set(id, 'unavailable');
    return null;
  }
}

/**
 * Play a sample by id. First call loads + caches the Howl instance.
 * Returns the playback id (number from Howler) or null if unavailable / muted.
 *
 * Example:
 *   playSample('skiv_pulse', { src: '/assets/audio/skiv_pulse.webm', volume: 0.6 });
 */
export function playSample(id, opts = {}) {
  if (isMuted()) return null;
  if (!id || typeof id !== 'string') return null;
  const howl = _getOrCreateHowl(id, opts);
  if (!howl) return null;
  try {
    return howl.play();
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn(`[audio] play failed for ${id}:`, err && err.message);
    }
    return null;
  }
}

/**
 * Stop a previously-loaded sample (all instances). No-op if not loaded.
 */
export function stopSample(id) {
  const howl = _howls.get(id);
  if (!howl || howl === 'unavailable') return;
  try {
    howl.stop();
  } catch {
    /* swallow */
  }
}

/**
 * Unload all cached Howl instances. Call on scene/route teardown to free memory.
 */
export function unloadAllSamples() {
  for (const [, howl] of _howls) {
    if (howl && howl !== 'unavailable' && typeof howl.unload === 'function') {
      try {
        howl.unload();
      } catch {
        /* swallow */
      }
    }
  }
  _howls.clear();
}

/**
 * Mute everything (synth + samples).
 */
export function setAudioMuted(flag) {
  setMuted(flag);
  if (_hasHowler() && typeof window.Howler === 'object' && window.Howler.mute) {
    try {
      window.Howler.mute(!!flag);
    } catch {
      /* swallow */
    }
  }
}

export function isAudioMuted() {
  return isMuted();
}

// Re-export sfx synth API so call sites can switch to `import { audio } from './audio.js'`
// without breaking the existing import './sfx.js' path. Migration is opt-in.
export const audio = {
  ...sfx,
  playSample,
  stopSample,
  unloadAllSamples,
  setMuted: setAudioMuted,
  isMuted: isAudioMuted,
};
