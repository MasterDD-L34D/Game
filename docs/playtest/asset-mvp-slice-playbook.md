---
title: Asset MVP Slice Playbook — step-by-step 14h roadmap
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - 'docs/core/43-ASSET-SOURCING.md'
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md'
---

# Asset MVP Slice Playbook — 14h roadmap

> Step-by-step playbook per acquisire MVP visual slice Evo-Tactics via pipeline zero-cost (ADR-2026-04-18 zero-cost-asset-policy). Target: P0 palette master + P0 20 icon + P1 3 biomi (savana + caverna + foresta_acida).

## Prerequisiti

1. Libresprite installato (https://libresprite.github.io) OR Piskel online (https://www.piskelapp.com)
2. Optional: account Retro Diffusion Premium ($10-25/mo per biomi custom) — ONLY se community asset gap
3. Account freesound.org (opzionale, per audio futuro)
4. Browser per community libraries

## Task breakdown — 14h totali

### P0 — Foundation (5h)

#### Task P0.1 — Palette master `.ase` (3h user hands-on)

**Input**: `docs/core/41-ART-DIRECTION.md §Palette matrix 9 biomi shipping` + `docs/core/42-STYLE-GUIDE-UI.md §Colors`

**Output**: `data/art/palette_master.ase` (Libresprite native) + `data/art/palette_master.png` (PNG indexed export)

**Steps**:

1. Apri Libresprite → `File → New → 32×32 px + RGB color mode`
2. Crea 32 swatch pixel per ogni colore master:
   - 10 funzionali universali (blu/rosso/giallo/bianco/cyan/verde/arancio/yellow/verde-chiaro/AoE-semi)
   - 22 sub-palette biomi (3 principali per bioma × 9 biomi = ~22 unique considerando sovrapposizioni)
3. `Sprite → Color Mode → Indexed` con palette 32 colori
4. Save: `data/art/palette_master.ase`
5. Export: `File → Export → palette_master.png` (indexed PNG)
6. Commit: `data: add palette master 32 colori Evo-Tactics (M3.8 FU-A)`

**Time**: 3h (inclusive learning curve se Libresprite first time)

#### Task P0.2 — UI icon set Game-icons.net (2h curation)

**Input**: https://game-icons.net + `docs/core/42-STYLE-GUIDE-UI.md §Icon grid`

**Output**: `data/art/icons/*.svg` (20+ icon) + entries `CREDITS.md` con author attribution

**Icon target (20 minimum)**:

| Categoria     | Icon                                                           | Uso                     |
| ------------- | -------------------------------------------------------------- | ----------------------- |
| Faction       | player-marker, enemy-marker, neutral-marker                    | Outline unit            |
| Action        | sword-attack, movement-arrow, skip-turn, guard-shield          | Player intent           |
| Status buff   | speed-boost, attack-boost, shield-up, heal-cross               | Status icone sopra unit |
| Status debuff | slow-down, attack-down, shield-down, poison, bleeding, stunned | Status icone            |
| Ability       | fireball, frost-lance, poison-cloud, heal-wave, rally-flag     | Ability cast preview    |
| UI            | menu-burger, close-x, settings-gear, back-arrow, info-i        | UI generic              |

**Steps**:

1. Browse https://game-icons.net
2. Per ogni icon target: search + download SVG
3. Rename con naming convention: `<categoria>_<name>.svg` (es. `faction_player-marker.svg`)
4. Save in `data/art/icons/`
5. **Attribution obbligatoria**: compila riga `CREDITS.md §UI icons §Game-icons.net` con "Icon Name by Author (game-icons.net, CC-BY 3.0)"
6. Commit: `data: add 20+ UI icons from Game-icons.net (M3.8 FU-B)`

**Time**: 2h

### P1 — 3 biomi shipping (9h)

#### Task P1.1 — Savana tileset 32×32 (2h community-only)

**Input**: Kenney.nl "Roguelike/RPG Pack" OR "Tiny Dungeon" + `41-AD §savana palette`

**Output**: `data/art/tilesets/savana/*.png` (indexed 32×32 tile set)

**Steps**:

1. Scarica Kenney pack pertinente (CC0, no attribution)
2. In Libresprite: `File → Import` selected tiles (grass, earth, rock, bush)
3. Apply palette lock via `Sprite → Color Mode → Indexed → Palette → palette_master.ase §savana`
4. Manual pixel cleanup: remove artifact, conforma 32×32 grid
5. Save: `data/art/tilesets/savana/{grass,earth,rock,bush}.png` (PNG-8 indexed)
6. Commit: `data: add savana tileset 32x32 (Kenney CC0 + palette lock)`

**Time**: 2h

#### Task P1.2 — Caverna_sotterranea tileset (2h community-only)

**Input**: Kenney + PixelFrog (CC0) + `41-AD §caverna palette`

**Output**: `data/art/tilesets/caverna_sotterranea/*.png`

**Steps**: analoghi P1.1. Target tile: stone, moss, water, crystal (bioluminescenza cyan).

**Time**: 2h

#### Task P1.3 — Foresta_acida tileset (4h AI gap-fill)

**Input**: OGA community "toxic forest" search + AI gap-fill Retro Diffusion (opzionale) + `41-AD §foresta_acida palette`

**Output**: `data/art/tilesets/foresta_acida/*.png`

**Steps**:

1. Search OGA "toxic forest" filter CC0 — download eventuali tile matching
2. Gap-fill AI (se community insufficient):
   - Login Retro Diffusion Premium
   - Prompt: `toxic acid forest tile, pixel art, 32x32, limited palette 16 colors, poison green dominant, mud brown, sporangia yellow, top-down 3/4 view, clean outlines, stylized pixel`
   - Generate 5-10 variations
   - Select best 3-4
3. **Human authorship layer** (OBBLIGATORIO):
   - Download AI outputs
   - In Libresprite: palette lock a `palette_master.ase §foresta_acida`
   - Manual cleanup: ridisegno edge, rimozione AI artifact, pixel refinement
   - Compositional decision: tile boundary 32×32 strict, integer alignment
4. **Provenance log** in CREDITS.md (se AI used):
   ```
   | foresta_acida_grass_01 | Retro Diffusion | "toxic acid forest..." | 2026-04-18 | 30min |
   ```
5. Commit: `data: add foresta_acida tileset 32x32 (OGA + AI gap-fill + palette lock)`

**Time**: 4h (1h search + 1h AI generate + 2h cleanup)

#### Task P1.4 — Quality validation (1h)

**Steps**:

1. Run `python3 tools/py/styleguide_lint.py --strict` → verify palette hex consistency
2. Visual inspection: apri ogni tile in Libresprite, verifica palette lock
3. Export preview screenshot per documentazione
4. Commit screenshot in `docs/playtest/asset-mvp-slice-preview.md` (nuovo)

**Time**: 1h

## Roadmap totale

| Fase       | Task                   |  Tempo  | Blocker                                |
| ---------- | ---------------------- | :-----: | -------------------------------------- |
| P0.1       | Palette master `.ase`  |   3h    | User tempo (Libresprite learning)      |
| P0.2       | 20+ UI icon Game-icons |   2h    | -                                      |
| P1.1       | Savana tileset         |   2h    | -                                      |
| P1.2       | Caverna tileset        |   2h    | -                                      |
| P1.3       | Foresta_acida tileset  |   4h    | Retro Diffusion subscription opzionale |
| P1.4       | Quality validation     |   1h    | -                                      |
| **Totale** | MVP slice              | **14h** | -                                      |

## Success criteria

- [ ] `palette_master.ase` committed + `palette_master.png` indexed export
- [ ] 20+ icon SVG in `data/art/icons/` con attribution in CREDITS.md
- [ ] 3 biomi tileset (savana + caverna + foresta_acida) in `data/art/tilesets/<biome>/`
- [ ] Tutti asset palette-locked (verificato via styleguide_lint.py)
- [ ] `CREDITS.md` popolato con provenance ogni asset (AI + community)
- [ ] Preview screenshot in docs/playtest

## Post-MVP slice priorities (FU)

Dopo MVP slice completato:

1. Enemy sprite set 4 specie base (20h+)
2. Player character sprite 4 specie + 4 evo (15h+)
3. Biomi P2-P3 (foresta_miceliale, rovine_planari, reef_luminescente, frattura_abissale_sinaptica, abisso_vulcanico, steppe_algoritmiche)
4. Particle effect 9 biomi
5. Audio MVP (da ADR audio-direction-placeholder §roadmap zero-cost)

## Risk mitigation

| Risk                                  | Mitigation                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Libresprite learning curve            | Start con P0.2 (SVG icon download-only) per familiarizzarsi, poi P0.1 palette |
| Palette coerenza cross-bioma          | Lock a master via `Sprite → Color Mode → Indexed` OGNI volta, mai skip        |
| AI output qualità bassa               | Iter prompt (5-10 generation per tile), selection umana + cleanup manuale     |
| Community asset shortage bioma custom | Fallback AI gap-fill, documentato provenance                                  |
| Retro Diffusion ToS change 2026-Q2+   | Audit 2026-07-18 (90gg), fallback SDXL+LoRA local                             |
| Attribution drift CREDITS.md stale    | Enforce pre-commit: ogni asset add = CREDITS update                           |

## Cross-references

- `docs/core/43-ASSET-SOURCING.md` — pipeline canonical
- `docs/core/41-ART-DIRECTION.md` §Palette matrix 9 biomi shipping
- `docs/core/42-STYLE-GUIDE-UI.md` §Icon grid
- `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`
- `CREDITS.md` provenance log
- `tools/py/styleguide_lint.py` lint consistency

## Execution log template (da popolare durante MVP slice)

```markdown
### Task P0.1 — Palette master (YYYY-MM-DD)

- Start: HH:MM
- End: HH:MM
- Outcome: [success / partial / blocked]
- Issues: [list]
- Commit: [SHA]
```

Da aggiungere sotto ogni task quando eseguito.
