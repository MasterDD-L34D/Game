# OD-026 — Godot `biome_focus_changed` telemetry sync

## What this is

`data/derived/atlas-telemetry/biome-focus.jsonl` is the **real, deterministic**
`biome_focus_changed` signal export captured from the Godot client
(`Game-Godot-v2`). It is consumed by `tools/sim/telemetry-bridge.js`, which
merges it into the playtest-2 telemetry stream so
`tools/py/playtest_2_analyzer.py` can populate
`od026_atlas.biome_focus_events` — the field that completes the advertised
playtest schema-coverage **7/7**.

`biome_focus_changed` is a **client-only UI signal**: the backend sim never
emits it. Without this committed export the analyzer field stays empty.

## Why it is committed (not fetched live)

The original OD-026 implementation reused the OD-042-A skiv-monitor pattern:
fetch the producer's JSONL over `raw.githubusercontent.com`. That works for
skiv-monitor only because its producer repo is **public**.

`Game-Godot-v2` is a **private** repo. `raw.githubusercontent.com` serves
**only public repos** and ignores auth → the live fetch returned **404
forever in production**. The bridge's graceful-skip then silently emitted
`[]`, so the advertised "7/7" was actually **6.5/7 in production with no
error** (dangerous silent degradation).

The data is small (6 lines, 875 bytes) and **deterministic**: the Godot GUT
test drives 3 fixed pilot biomes × 2 surfaces, so the output is fixed and
reproducible. Committing the real captured bytes into this **public** repo
is honest, version-controlled, and removes the private-repo network
dependency entirely. It is **not** fabricated and **not** a stub.

## How to regenerate (when atlas pilot biomes change)

1. In `Game-Godot-v2`, run the GUT export test:
   `test_biome_focus_telemetry_export.gd`
   (it writes `data/derived/atlas-telemetry/biome-focus.jsonl`).
2. Copy that file **byte-for-byte** into this repo at the same path:
   `data/derived/atlas-telemetry/biome-focus.jsonl`.
   Quick path with a PAT that has Contents read on the private repo:

   ```sh
   gh api repos/MasterDD-L34D/Game-Godot-v2/contents/data/derived/atlas-telemetry/biome-focus.jsonl \
     --jq '.content' | base64 -d > data/derived/atlas-telemetry/biome-focus.jsonl
   ```
3. Commit the change. The bridge picks it up automatically (local-first
   read, no code change needed).

## Transport contract (telemetry-bridge.js)

- **Default**: read the committed local file
  `data/derived/atlas-telemetry/biome-focus.jsonl` (no network).
- **Optional override**: set `GODOT_BIOME_FOCUS_URL` to a reachable URL to
  fetch remotely instead. If the override is unreachable, the bridge falls
  back to the local committed file.
- **Graceful skip**: file missing / unreadable / all lines malformed →
  emit `[]`, log a WARN, never fatal, never fabricate.
- `SKIP_GODOT_BIOME_FOCUS=1` disables the merge entirely (unchanged).
