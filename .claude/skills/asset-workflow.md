---
name: asset-workflow
description: Orchestrate asset creation workflow Path 1+2+3+4 (Kenney+modify / AI+human / reference+redraw / audio process). Trigger su "asset workflow", "Skiv asset", "Path 1|2|3", "crea icona|sprite|SFX|portrait", "recipe Skiv", "echolocation pulse", "wounded perma", `/asset-workflow`. Pulls workflow doc + workspace HANDOFF recipes + MANIFEST.json. Origine sessione 2026-04-29 workspace 184GB cataloged + 32136 file license-classified.
---

# /asset-workflow

**Quando invocare**: user chiede _"crea/genera asset / icona / sprite / portrait / SFX / animation / Skiv recipe / Path 1|2|3 / asset workflow"_.

**Quando NON invocare**: bug-fix puntuale code asset-rendering (no creazione), playtest live (no asset gen during runtime), ADR/research doc (separate scope).

## Pre-requisito: leggi workflow canonical

PRIMA di procedere, leggi in ordine:

1. [`docs/guide/asset-creation-workflow.md`](../../docs/guide/asset-creation-workflow.md) — Path 1+2+3 canonical workflow shipping
2. `~/Documents/evo-tactics-refs/HANDOFF.md` — recipes Skiv asset class + restore guide
3. `~/Documents/evo-tactics-refs/SKIV_REFS_EXTRACTED.md` — filename-level extracted assets
4. (opzionale se specific file) `~/Documents/evo-tactics-refs/MANIFEST.json` — 32136 file searchable

Se workspace local NON esiste su questo PC: bootstrap via `git clone https://github.com/MasterDD-L34D/evo-tactics-refs-meta.git ~/Documents/evo-tactics-refs` + run `robust_download.py urls-*.txt` → ~2h bandwidth.

## Flow operativo

### Step 1 — Identify asset target

Match user request to category:

- **Portrait HUD / sprite creature** → 32x32 / 64x64 / 128x128 RGBA PNG
- **Animation sprite sheet** → multi-frame strip @ N×height
- **Tile / tileset biome** → 16x16 / 32x32 grid
- **Ability icon** → 24x24 / 32x32 / 48x48 RGBA
- **FX overlay** (echolocation, status) → animated PNG strip o GIF
- **Audio** → idle vocal / combat roar / footstep / ambient / music

### Step 2 — Pick path

| Path                                       | Quando                           | Speed    | Indemnification                      |
| ------------------------------------------ | -------------------------------- | -------- | ------------------------------------ |
| **Path 1** Kenney/CC0 base + modify        | Asset standard riconoscibili     | 5-30min  | CC0 explicit modify+commercial OK    |
| **Path 2** AI Retro Diffusion + human edit | Custom non disponibile CC0       | 10-60min | Retro Diffusion enterprise ToS       |
| **Path 3** Reference legali + redraw fresh | Anatomy complessi, posing custom | 1-2h     | Original work, idea/expression       |
| **Path 4** Audio process                   | Vocal/SFX/music                  | 10-30min | Sonniss royalty-free perpetual o CC0 |

### Step 3 — Find source asset (workspace local)

Scan `~/Documents/evo-tactics-refs/references/` per match:

```bash
# Skiv-feline 32x32 sprite
ls ~/Documents/evo-tactics-refs/references/pixel-art-retro/denzi/.../monsters/cat/

# Wolf rigged 3D
ls ~/Documents/evo-tactics-refs/references/3d-models/quaternius-animals/.../FBX/Wolf.fbx

# Sand desert tile
ls ~/Documents/evo-tactics-refs/references/textures-pbr/ambientcg-sand/

# Skiv echolocation SFX
ls ~/Documents/evo-tactics-refs/references/sound-fx/skiv-audio-kit/vocals/sand-spell.flac

# MANIFEST query (file-level search)
python -c "
import json
m = json.load(open('~/Documents/evo-tactics-refs/MANIFEST.json'))
matches = [f for f in m['files'] if 'wolf' in f['path'].lower() and f['ext'] == '.fbx']
"
```

### Step 4 — Tool orchestration

| Need                   | Tool                                 | Path                                                                          |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Pixel art edit/animate | Pixelorama (preferred) o LibreSprite | `~/Documents/evo-tactics-refs/tools-install/pixelorama/.../Pixelorama.exe`    |
| Audio edit/mix         | Audacity                             | `~/Documents/evo-tactics-refs/tools-install/audacity/.../Audacity.exe`        |
| Normal map gen 2D      | Laigter                              | `~/Documents/evo-tactics-refs/tools-install/laigter/.../laigter.exe`          |
| 3D viewer (no install) | https://3dviewer.net                 | browser drag .fbx/.blend/.dae                                                 |
| 3D model edit          | Blender (manual install 300MB)       | not auto-installed                                                            |
| Format convert         | Noesis                               | `~/Documents/evo-tactics-refs/tools-install/noesis/Noesis64.exe`              |
| Procedural tile/biome  | WaveFunctionCollapse mxgmn           | `~/Documents/evo-tactics-refs/tools-install/wfc/.../WaveFunctionCollapse.exe` |

### Step 5 — Output staging + provenance

1. Save WIP in `~/Documents/evo-tactics-refs/output-staging/<asset-slug>/`
2. Compile session log da template: `~/Documents/evo-tactics-refs/session-logs/<YYYY-MM-DD>-<asset>.md`
3. Anti-pattern check (NO trace, NO paint-over, NO AI img2img da proprietary, NO style-replication living artist)
4. Copy final → `Game/assets/<category>/<file>.png`
5. Update `Game/CREDITS.md` provenance entry:
   ```
   - Asset: <name>
   - Source: <Kenney pack X / Retro Diffusion enterprise / original work inspired by ...>
   - Modifications: <palette swap, layer composition, ...>
   - License: <CC0 / Sonniss royalty-free / Retro Diffusion enterprise>
   - Path: assets/<category>/<file>.png
   - Date: <YYYY-MM-DD>
   ```
6. Commit branch repo Game con message standard: `assets: add <name> (<path-source>)`.

## Recipes Skiv-direct (vedi HANDOFF.md per full)

### Skiv portrait HUD 64x64 (Path 1, ~10min)

```
1. Pixelorama → open ~/Documents/evo-tactics-refs/references/pixel-art-retro/skiv-desert-pack/All/Wild Animals/Fox/Fox_Idle.png
2. Slice frame 1 (36x36 base)
3. Scale 36→64 nearest-neighbor
4. Palette swap → Skiv canon (sandy/dust/bone)
5. Add dorsal stripes + ridge marker
6. Export → output-staging/skiv-portrait-64.png
```

### Skiv echolocation pulse SFX 800ms (Path 4)

```
1. Audacity → ~/Documents/evo-tactics-refs/references/sound-fx/skiv-audio-kit/vocals/sand-spell.flac
2. Trim to 800ms one-shot
3. EQ high-pass 2kHz (cyan tone)
4. Reverb tail short
5. Export → Game/assets/audio/skiv-echolocation-pulse.wav
6. CREDITS: HF OGA-CC0 sand-spell.flac (CC0)
```

### Skiv run cycle 36x36 sprite sheet (Path 1, ~30min)

```
1. Pixelorama → Fox_Run.png (384x36, 10 frame)
2. Slice into 10 frames
3. Modify palette + dorsal markers consistent across frames
4. Export PNG strip 384x36
5. Game/assets/catalog/skiv-run-cycle.png
```

### Skiv combat roar (Path 4)

```
1. Audacity → ~/Documents/evo-tactics-refs/references/sound-fx/skiv-audio-kit/creature-pack/80-CC0-creature/roar_01.ogg
2. Layer with whoosh-impact/Punch-Elem Whoosh1 01.wav
3. Mix + master normalize -3dB
4. Export → Game/assets/audio/skiv-attack-roar.wav
```

## Anti-pattern (vedi ADR-2026-04-18 + workflow doc)

- ❌ Commit reference asset locali a repo (DMCA fastlane on public repo)
- ❌ Trace su sprite proprietary (anche layer separato)
- ❌ Paint-over fan-rip / spriters-resource / vg-resource / models-resource
- ❌ AI img2img da asset proprietary
- ❌ Style prompt che cita artisti viventi
- ❌ Skip provenance log `CREDITS.md`

## Cross-ref

- ADR zero-cost: [`docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`](../../docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md)
- Policy canonical: [`docs/core/43-ASSET-SOURCING.md`](../../docs/core/43-ASSET-SOURCING.md)
- Workflow shipping: [`docs/guide/asset-creation-workflow.md`](../../docs/guide/asset-creation-workflow.md)
- Skiv canonical: [`docs/skiv/CANONICAL.md`](../../docs/skiv/CANONICAL.md)
- Workspace handoff: `~/Documents/evo-tactics-refs/HANDOFF.md`
- Backup meta repo: https://github.com/MasterDD-L34D/evo-tactics-refs-meta
- Memory: [`reference_asset_workspace.md`](~/.claude/projects/C--Users-VGit-Desktop-Game/memory/reference_asset_workspace.md)
