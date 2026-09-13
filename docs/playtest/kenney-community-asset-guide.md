---
title: Kenney community asset guide — zero-skill download & integrate
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - 'docs/core/43-ASSET-SOURCING.md'
  - 'docs/playtest/asset-mvp-slice-playbook.md'
  - 'CREDITS.md'
---

# Kenney community asset guide

> Step-by-step download + integrazione asset Kenney.nl (CC0, zero attribution, zero skill disegno required).

## Perché Kenney

- **CC0 puro**: no attribution, no viral, uso commerciale libero
- **Volume**: 40k+ asset, 180+ pack tematici
- **Qualità**: professionale, usati da migliaia di giochi indie
- **Formato**: PNG indexed tile già pronto
- **Tempo**: download 10-15 min + commit repo

## Pack consigliati per Evo-Tactics

Ricerca https://kenney.nl/assets filtering per tema + rilevanza biomi shipping:

### Tier 1 — MVP shipping (3 pack priority)

| Pack                   | URL                                         | Biome target           | Contenuto                   |
| ---------------------- | ------------------------------------------- | ---------------------- | --------------------------- |
| **Roguelike/RPG Pack** | https://kenney.nl/assets/roguelike-rpg-pack | savana, rovine_planari | 490+ tile + creature + UI   |
| **Tiny Dungeon**       | https://kenney.nl/assets/tiny-dungeon       | caverna_sotterranea    | 240+ tile dungeon + enemy   |
| **Pixel Platformer**   | https://kenney.nl/assets/pixel-platformer   | foresta_acida (base)   | 500+ tile foresta + oggetti |

### Tier 2 — Post-MVP expansion

| Pack                   | URL                                         | Biome target               |
| ---------------------- | ------------------------------------------- | -------------------------- |
| **Roguelike Dungeon**  | https://kenney.nl/assets/roguelike-dungeon  | caverna avanzata           |
| **Pixel Shmup**        | https://kenney.nl/assets/pixel-shmup        | steppe_algoritmiche sci-fi |
| **Fantasy UI Borders** | https://kenney.nl/assets/fantasy-ui-borders | UI panel cornici           |
| **Game Icons**         | https://kenney.nl/assets/game-icons         | icon complementari         |

## Workflow download (10 min per pack)

### Step 1 — Download

1. Apri URL pack da tabella sopra
2. Click "Download ZIP" (Kenney fornisce ZIP gratuito senza login)
3. Salva ZIP in cartella locale (es. `~/Downloads/kenney-roguelike-rpg.zip`)

### Step 2 — Extract + organize

```bash
# Unzip
unzip ~/Downloads/kenney-roguelike-rpg.zip -d /tmp/kenney-roguelike-rpg

# Ispeziona contenuto
ls /tmp/kenney-roguelike-rpg
# Tipicamente: Spritesheet/, Tiles/, PNG/, License.txt
```

### Step 3 — Select tile pertinenti

Kenney fornisce sprite sheet (una PNG grande) + tile individuali (folder `Tiles/` o `PNG/`).

Per Evo-Tactics shipping (32×32):

- Preferisci tile individuali 32×32 o multipli 16×16 (scale 2x)
- Tile type target: grass, dirt, rock, bush, water (savana); stone, moss, crystal, water (caverna); foliage, mud, spore (foresta_acida)

### Step 4 — Copy nel repo

```bash
# Savana (da Roguelike/RPG Pack)
cp /tmp/kenney-roguelike-rpg/Tiles/grass_01.png \
   C:/Users/VGit/Desktop/Game/data/art/tilesets/savana/grass_kenney_01.png

cp /tmp/kenney-roguelike-rpg/Tiles/dirt_01.png \
   C:/Users/VGit/Desktop/Game/data/art/tilesets/savana/dirt_kenney_01.png

# Caverna (da Tiny Dungeon)
cp /tmp/kenney-tiny-dungeon/Tiles/stone_01.png \
   C:/Users/VGit/Desktop/Game/data/art/tilesets/caverna_sotterranea/stone_kenney_01.png
```

**Naming convention**: `<type>_kenney_<NN>.png` per distinguere da procedurali (`<type>_<NN>.png`).

### Step 5 — Update CREDITS.md

Aggiungi sezione `CREDITS.md §Tileset + sprite §Community CC0 §Kenney.nl`:

```markdown
#### Pack usati

- **Roguelike/RPG Pack** (CC0) — https://kenney.nl/assets/roguelike-rpg-pack
  - `data/art/tilesets/savana/grass_kenney_01.png` — tile grass originale pack
  - `data/art/tilesets/savana/dirt_kenney_01.png` — tile dirt
- **Tiny Dungeon** (CC0) — https://kenney.nl/assets/tiny-dungeon
  - `data/art/tilesets/caverna_sotterranea/stone_kenney_01.png`
```

### Step 6 — Commit

```bash
cd C:/Users/VGit/Desktop/Game
git add data/art/tilesets/ CREDITS.md
git commit -m "data: add Kenney community tiles (Roguelike + Tiny Dungeon CC0)"
```

### Step 7 — Verify

Open 1 PNG in Windows Image Viewer / macOS Preview. Verify 32×32 e leggibile.

## Palette lock (opzionale, avanzato)

Kenney tile hanno palette propria. Per coerenza Evo-Tactics:

- **MVP-soft**: commit tile as-is (palette Kenney native, leggibile ma non matching 41-AD)
- **MVP-strict**: palette-lock via Libresprite a palette master Evo-Tactics (15 min/tile)

**Raccomandazione**: MVP-soft per iniziare, strict post-playtest se incoerenza visiva rilevata.

## Troubleshooting

| Problema                                      | Soluzione                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Pack download troppo grande (>100MB)          | Salva in `/tmp/`, copia solo tile necessari, cancella ZIP                                                |
| Kenney tile diversi size (16×16 invece 32×32) | Usa ImageMagick scale 2x: `convert in.png -filter point -resize 200% out.png` (integer upscale, no blur) |
| Palette tile non matcha Evo-Tactics 41-AD     | Opz A: accetta (MVP-soft). Opz B: Libresprite palette-lock (strict).                                     |
| License.txt file presente nel pack            | Verifica che sia CC0, NON CC-BY-SA. Kenney = sempre CC0 ma check.                                        |

## Alternativa: OpenGameArt (OGA)

Per asset custom non coperti da Kenney:

- https://opengameart.org — filtra per CC0
- Download per-asset (non pack)
- Attribution: se CC0 zero, se CC-BY list in CREDITS.md

Contributors consigliati CC0:

- **Buch** https://opengameart.org/users/buch — foresta, caverna
- **Surt** https://opengameart.org/users/surt — dungeon, rovine
- **PixelFrog** https://pixelfrog-assets.itch.io — caverna, platformer

## Integration con procedural

Kenney + procedural Python coexistono:

| Fonte      | Path naming            | Quando usare                                        |
| ---------- | ---------------------- | --------------------------------------------------- |
| Procedural | `<type>_01.png`        | Biomi custom (frattura, steppe), quick prototype    |
| Kenney     | `<type>_kenney_01.png` | Biomi standard (savana, caverna), alta qualità base |
| User edit  | `<type>_custom_01.png` | Post-edit Libresprite Kenney o procedural           |

Game code può consumare entrambi via same path convention.

## User effort totale MVP slice (C+A combo)

| Task                                            | Tempo       | Skill | Tool                 |
| ----------------------------------------------- | ----------- | :---: | -------------------- |
| A. Run `python3 generate_tile.py --all`         | 1 min       |   0   | Terminal             |
| C. Download Kenney 3 pack + copy tile + CREDITS | 45 min      |   0   | Browser + filesystem |
| **Totale MVP slice**                            | **~45 min** | **0** | -                    |

vs playbook originale M3.8 = 14h con Libresprite. **C+A combo cuts 95% time**.

## Post-MVP follow-up

1. Sprite player + enemy (Kenney character packs o AI Retro Diffusion)
2. UI screen HUD (Kenney Fantasy UI Borders + custom SVG icon from M3.9)
3. Particle effect (procedural Python + OGA particles)
4. Audio: deferred, guide separata post-MVP visuale

## Riferimenti

- `docs/core/43-ASSET-SOURCING.md` — pipeline canonical
- `docs/playtest/asset-mvp-slice-playbook.md` — playbook originale M3.8
- `tools/py/art/generate_tile.py` — procedural generator M3.10
- `data/art/tilesets/README.md` — tileset catalog + generate instructions
- `CREDITS.md` — attribution log
- Kenney license FAQ: https://kenney.nl/site/info
