---
title: Howler.js audio middleware (OD-028)
status: shipped
verdict_date: 2026-05-14
verdict_by: claude-code-aistation
workstream: evo-tactics
language: it
tags: [audio, howler, middleware, OD-028, ai-station]
---

# Howler.js audio middleware

OD-028 ai-station re-verdict 2026-05-14: adopt Howler.js (MIT, ~5KB minified) come middleware audio. Sblocca P6/UX surface audio "terziaria" senza scope creep.

## Why middleware (not Web Audio direct)

Verdetto precedente "Web Audio direct skip middleware" lasciava audio terziaria perché:

- Sprite/loop/fade-out logic = 200-500 LOC boilerplate per ogni sound asset
- Cross-browser (iOS Safari WebGL gesture restriction) richiede workaround manuale
- Sample format compat (mp3/webm/ogg) richiede fallback chain manuale

Howler.js (MIT, 5KB) risolve tutto questo built-in. Adopt = +20 LOC wrapper, no scope creep.

## Architecture

```
apps/play/src/
├── sfx.js          ← Web Audio synth (existing, 94 LOC, 9 presets) — UNCHANGED
└── audio.js        ← middleware facade (NEW, ~120 LOC)
                       ├── re-exports sfx.* (synth presets)
                       ├── playSample(id, { src, volume, loop }) → Howl
                       ├── stopSample(id) / unloadAllSamples()
                       ├── setAudioMuted() / isAudioMuted() (unified)
                       └── lazy-load: zero dep until window.Howl loaded
```

## Usage

### Synth presets (no change for existing call sites)

```js
import { sfx } from './sfx.js'; // existing path still works
sfx.hit();
sfx.win();
```

### Sample playback (new, opt-in)

```js
import { audio, playSample, setAudioMuted } from './audio.js';

// Play a sample file (Howler lazy-loaded if window.Howl available)
audio.playSample('skiv_pulse', { src: '/assets/audio/skiv_pulse.webm', volume: 0.6 });

// Or direct
playSample('echolocation', { src: '/assets/audio/echo.mp3', loop: true });

// Mute everything (synth + samples)
setAudioMuted(true);
```

## Loading Howler.js

### Option A — CDN (zero npm dep, recommended for Phase A)

Add to `apps/play/index.html` before `main.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/howler@2/dist/howler.min.js"></script>
```

Audio middleware auto-detects `window.Howl` and uses it. If absent, `playSample` is a graceful no-op + single console warning.

### Option B — npm bundle (Phase B post-asset commission)

```bash
cd apps/play
npm install howler
```

Then in `audio.js` top:

```js
import { Howl, Howler } from 'howler';
window.Howl = Howl;
window.Howler = Howler;
```

## Fallback semantics

- `window.Howl` absent → `playSample` returns `null`, single console warning, no throw
- Howl load fail (404 / CORS / decode error) → `playSample` returns `null`, console warning, sentinel cached (no retry storm)
- `setAudioMuted` always works on synth; only affects Howler if loaded

## When to use samples vs synth

| Use case                               | Choice                                   |
| -------------------------------------- | ---------------------------------------- |
| Combat feedback (hit/miss/crit)        | synth (`sfx.*`) — instant, deterministic |
| UI clicks / selection                  | synth — instant                          |
| Ambient biome loop                     | sample (Howler `loop: true`)             |
| Skiv echolocation pulse                | sample (designed asset)                  |
| Cinematic stinger (debrief win/defeat) | sample (composer-authored)               |
| Dialogue voice line                    | sample (Howler)                          |

## Cross-stack

Godot v2 client uses native `AudioStreamPlayer` (no port required). Howler middleware = browser-side only (Play web client + Phone composer HTML5).

## License

Howler.js v2.x — MIT License — https://github.com/goldfire/howler.js

## Test coverage

`tests/play/audio-middleware.test.js` (8 tests):

- facade surface validation
- graceful no-op when Howler absent
- invalid id handling
- Howl load+play happy path
- mute toggle propagation
- cache reuse + unload
- stopSample safety on unknown id

## Verdict + cross-link

- ai-station re-analysis: `vault/docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md`
- Decision record: `docs/governance/open-decisions/OD-024-031-verdict-record.md`
- ai-station methodology: TASK_EXECUTION_PROTOCOL Phase 0-7 + CHANGE_BUDGET Envelope A (~2h, additive, no breaking)
