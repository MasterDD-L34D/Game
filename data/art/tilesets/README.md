# Evo-Tactics Tilesets

Pixel art 32×32 tile per biomi shipping. Due fonti principali:

## Fonte 1 — Procedural generated (Python PIL)

Script: `tools/py/art/generate_tile.py`. Output: PNG-8 indexed palette-locked.

**Licenza**: MIT, custom algorithm human-authored (© 2026 Master DD). Zero AI, zero community derivative.

### Inventario corrente

| Biome | Tile | Path | Pattern |
|-------|------|------|---------|
| savana | grass_01 | `savana/grass_01.png` | Base ocra + scattered grass + dark patches |
| caverna_sotterranea | stone_01 | `caverna_sotterranea/stone_01.png` | Grigio + cracks + bioluminescenza accent |
| foresta_acida | moss_01 | `foresta_acida/moss_01.png` | Verde veleno + spore giallo accent |

### Genera nuovo tile

```bash
python3 tools/py/art/generate_tile.py --biome savana --variant grass
python3 tools/py/art/generate_tile.py --all  # demo set 3 biomi
```

### Pattern disponibili

- `grass` — scattered grass tufts + dark dirt (biomi aperti)
- `stone` — cracks + bioluminescent spots (biomi chiusi/cavern)
- `moss` — dense mid + sporangia clusters (biomi organici)

### Aggiungere nuovo pattern

In `tools/py/art/generate_tile.py`:
1. Implementa `pattern_<name>(palette, rng) -> list[list[tuple]]` (32×32 pixel, palette-locked)
2. Aggiungi in `PATTERNS` dict
3. Run `python3 tools/py/art/generate_tile.py --biome <b> --variant <name>`
4. Commit output + update questo README

### Aggiungere nuovo biome palette

In `BIOME_PALETTES`:
1. Segui schema `base_dark + base_mid + base_light + accent` (4 colori)
2. Deriva hex da `docs/core/41-ART-DIRECTION.md §Palette matrix`
3. Test: `python3 tools/py/art/generate_tile.py --biome <new> --variant <existing>`

### Deterministic RNG

Ogni tile generato con seed hash `biome_variant` → output riproducibile. Stesso comando produce sempre stesso PNG.

## Fonte 2 — Community CC0 (Kenney, OGA)

Vedi `docs/playtest/kenney-community-asset-guide.md` per step-by-step download.

Quando usati, popolare tabella in `CREDITS.md §Tileset + sprite §Community CC0` con pack name + link + author.

## Palette lock verification

Lint check: `python3 tools/py/styleguide_lint.py --strict` verifica hex consistency con `42-STYLE-GUIDE-UI.md`.

## Riferimenti

- `docs/core/41-ART-DIRECTION.md` §Palette matrix 9 biomi
- `docs/core/42-STYLE-GUIDE-UI.md` §Color tokens
- `docs/core/43-ASSET-SOURCING.md` §Palette master
- `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`
- `CREDITS.md` provenance log
