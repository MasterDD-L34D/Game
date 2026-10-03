#!/usr/bin/env python3
"""Procedural tile generator — Evo-Tactics zero-cost asset pipeline.

Genera tile 32×32 PNG indexed procedurali usando:
- Palette master da `docs/core/42-STYLE-GUIDE-UI.md` + sub-palette bioma da 41-AD
- Pattern algorithms custom (noise-based, shape-based, no AI, no scraped training)
- Output: PNG-8 indexed palette-locked, ready per commit

Usage:
    python3 tools/py/art/generate_tile.py --biome savana --variant grass
    python3 tools/py/art/generate_tile.py --biome caverna --variant stone
    python3 tools/py/art/generate_tile.py --biome foresta_acida --variant moss
    python3 tools/py/art/generate_tile.py --all

Licenza output: MIT (custom algorithm, human-authored, © 2026 Master DD).
Zero AI, zero community derivative. Copyright pulito.
"""

import argparse
import hashlib
import random
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow required. Install: pip install Pillow", flush=True)
    sys.exit(2)


ROOT = Path(__file__).resolve().parent.parent.parent.parent
TILESETS_DIR = ROOT / "data" / "art" / "tilesets"

# Sub-palette per bioma derivata da docs/core/41-ART-DIRECTION.md §Palette matrix
# Ogni tupla = (RGB tuple, uso semantico)
BIOME_PALETTES = {
    "savana": {
        "base_dark": (139, 107, 61),    # #8b6b3d terra
        "base_mid": (184, 147, 90),      # #b8935a ocra
        "base_light": (232, 213, 168),   # #e8d5a8 cielo
        "accent": (110, 122, 63),        # #6e7a3f verde secco
    },
    "caverna_sotterranea": {
        "base_dark": (40, 40, 48),       # darker basalto
        "base_mid": (61, 61, 66),        # #3d3d42 grigio basalto
        "base_light": (90, 100, 105),    # lighter stone
        "accent": (64, 200, 212),        # #40c8d4 bioluminescenza cyan
    },
    "foresta_acida": {
        "base_dark": (61, 42, 21),       # #3d2a15 marrone scuro
        "base_mid": (90, 122, 58),       # #5a7a3a verde veleno
        "base_light": (196, 166, 40),    # #c4a628 giallo spore
        "accent": (140, 180, 100),       # verde chiaro
    },
    "foresta_miceliale": {
        "base_dark": (107, 74, 122),     # #6b4a7a viola fungo
        "base_mid": (150, 110, 155),     # lighter viola
        "base_light": (232, 224, 212),   # #e8e0d4 bianco osseo
        "accent": (200, 122, 154),       # #c87a9a rosa spore
    },
    "rovine_planari": {
        "base_dark": (60, 56, 50),       # darker pietra
        "base_mid": (94, 90, 82),        # #5e5a52 grigio pietra
        "base_light": (184, 147, 90),    # #b8935a oro sbiadito
        "accent": (74, 106, 138),        # #4a6a8a blu spettrale
    },
    "frattura_abissale_sinaptica": {
        "base_dark": (13, 30, 61),       # #0d1e3d blu profondo
        "base_mid": (40, 60, 120),       # mid blu
        "base_light": (64, 212, 232),    # #40d4e8 cyan elettrico
        "accent": (61, 30, 90),          # #3d1e5a viola profondo
    },
    "reef_luminescente": {
        "base_dark": (20, 80, 95),       # darker teal
        "base_mid": (30, 106, 122),      # #1e6a7a teal
        "base_light": (232, 168, 196),   # #e8a8c4 rosa corallo
        "accent": (240, 224, 64),        # #f0e040 giallo brillante
    },
    "abisso_vulcanico": {
        "base_dark": (30, 30, 34),       # #1e1e22 basalto
        "base_mid": (100, 40, 30),       # darker lava
        "base_light": (200, 58, 30),     # #c83a1e rosso lava
        "accent": (240, 106, 40),        # #f06a28 arancio magma
    },
    "steppe_algoritmiche": {
        "base_dark": (70, 74, 84),       # darker acciaio
        "base_mid": (106, 110, 120),     # #6a6e78 grigio acciaio
        "base_light": (240, 240, 244),   # #f0f0f4 bianco circuito
        "accent": (64, 200, 96),         # #40c860 verde matrix
    },
}

TILE_SIZE = 32


def deterministic_rng(biome: str, variant: str, seed_suffix: str = "") -> random.Random:
    """Genera RNG deterministico da biome+variant hash, per output riproducibile."""
    seed_str = f"{biome}_{variant}_{seed_suffix}"
    seed_int = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    return random.Random(seed_int)


def pattern_grass(palette: dict, rng: random.Random) -> list:
    """Pattern savana grass: base ocra con scattered grass tufts.
    Densita grass ~40% random, cluster 2-3 pixel."""
    pixels = [[palette["base_mid"]] * TILE_SIZE for _ in range(TILE_SIZE)]
    # Scatter dark patches (sparse dirt)
    for _ in range(int(TILE_SIZE * TILE_SIZE * 0.12)):
        x = rng.randint(0, TILE_SIZE - 1)
        y = rng.randint(0, TILE_SIZE - 1)
        pixels[y][x] = palette["base_dark"]
    # Grass tufts (clusters of 2-3 pixels)
    for _ in range(int(TILE_SIZE * TILE_SIZE * 0.08)):
        cx = rng.randint(1, TILE_SIZE - 2)
        cy = rng.randint(1, TILE_SIZE - 2)
        pixels[cy][cx] = palette["accent"]
        if rng.random() > 0.4:
            pixels[cy - 1][cx] = palette["accent"]
        if rng.random() > 0.6:
            pixels[cy][cx + 1] = palette["accent"]
    # Light highlights (sparse)
    for _ in range(int(TILE_SIZE * TILE_SIZE * 0.04)):
        x = rng.randint(0, TILE_SIZE - 1)
        y = rng.randint(0, TILE_SIZE - 1)
        pixels[y][x] = palette["base_light"]
    return pixels


def pattern_stone(palette: dict, rng: random.Random) -> list:
    """Pattern caverna stone: base grigio con crack + moss accent.
    Cluster crack dark + scattered bioluminescenza accent."""
    pixels = [[palette["base_mid"]] * TILE_SIZE for _ in range(TILE_SIZE)]
    # Dark cracks (lines 3-5 pixel long)
    for _ in range(6):
        x = rng.randint(2, TILE_SIZE - 3)
        y = rng.randint(2, TILE_SIZE - 3)
        length = rng.randint(3, 5)
        direction = rng.choice([(1, 0), (0, 1), (1, 1), (1, -1)])
        for i in range(length):
            nx = x + direction[0] * i
            ny = y + direction[1] * i
            if 0 <= nx < TILE_SIZE and 0 <= ny < TILE_SIZE:
                pixels[ny][nx] = palette["base_dark"]
    # Scattered light spots
    for _ in range(int(TILE_SIZE * TILE_SIZE * 0.05)):
        x = rng.randint(0, TILE_SIZE - 1)
        y = rng.randint(0, TILE_SIZE - 1)
        pixels[y][x] = palette["base_light"]
    # Bioluminescenza accent (sparse cyan glows)
    for _ in range(3):
        cx = rng.randint(2, TILE_SIZE - 3)
        cy = rng.randint(2, TILE_SIZE - 3)
        pixels[cy][cx] = palette["accent"]
    return pixels


def pattern_moss(palette: dict, rng: random.Random) -> list:
    """Pattern foresta_acida moss: base verde veleno con spore giallo accent.
    Dense mid + scattered accent sporangia."""
    pixels = [[palette["base_mid"]] * TILE_SIZE for _ in range(TILE_SIZE)]
    # Dark undergrowth
    for _ in range(int(TILE_SIZE * TILE_SIZE * 0.15)):
        x = rng.randint(0, TILE_SIZE - 1)
        y = rng.randint(0, TILE_SIZE - 1)
        pixels[y][x] = palette["base_dark"]
    # Sporangia clusters (accent 2-pixel clumps)
    for _ in range(8):
        cx = rng.randint(1, TILE_SIZE - 2)
        cy = rng.randint(1, TILE_SIZE - 2)
        pixels[cy][cx] = palette["base_light"]  # giallo spore
        if rng.random() > 0.3:
            pixels[cy + 1][cx] = palette["base_light"]
    # Light accent (bioluminescent highlights)
    for _ in range(int(TILE_SIZE * TILE_SIZE * 0.06)):
        x = rng.randint(0, TILE_SIZE - 1)
        y = rng.randint(0, TILE_SIZE - 1)
        pixels[y][x] = palette["accent"]
    return pixels


PATTERNS = {
    "grass": pattern_grass,
    "stone": pattern_stone,
    "moss": pattern_moss,
}


def palette_to_png(pixels: list, palette: dict, out_path: Path) -> None:
    """Converte 2D pixel list in PNG-8 indexed con palette lock."""
    # Build indexed palette (max 256 colors, but we use ~4-8)
    unique_colors = list({tuple(p) for row in pixels for p in row})
    # Ensure palette order stable
    unique_colors.sort()
    color_to_idx = {c: i for i, c in enumerate(unique_colors)}

    img = Image.new("P", (TILE_SIZE, TILE_SIZE))
    # Build palette bytes (flat RGB × 256 entries)
    palette_bytes = []
    for c in unique_colors:
        palette_bytes.extend(c)
    # Pad to 256 entries × 3 bytes
    while len(palette_bytes) < 256 * 3:
        palette_bytes.append(0)
    img.putpalette(palette_bytes)

    # Fill indexed pixels
    for y, row in enumerate(pixels):
        for x, color in enumerate(row):
            img.putpixel((x, y), color_to_idx[tuple(color)])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)


def generate(biome: str, variant: str) -> Path:
    if biome not in BIOME_PALETTES:
        raise ValueError(f"biome sconosciuto: {biome}. Disponibili: {list(BIOME_PALETTES)}")
    if variant not in PATTERNS:
        raise ValueError(f"variant sconosciuta: {variant}. Disponibili: {list(PATTERNS)}")

    palette = BIOME_PALETTES[biome]
    rng = deterministic_rng(biome, variant)
    pattern_fn = PATTERNS[variant]
    pixels = pattern_fn(palette, rng)

    out_path = TILESETS_DIR / biome / f"{variant}_01.png"
    palette_to_png(pixels, palette, out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--biome", help="Biome id (savana, caverna_sotterranea, ecc.)")
    ap.add_argument("--variant", help="Tile variant (grass/stone/moss)")
    ap.add_argument("--all", action="store_true", help="Genera demo set 3 biomi")
    args = ap.parse_args()

    if args.all:
        # Demo set: 3 biomi shipping con variant appropriato
        demos = [
            ("savana", "grass"),
            ("caverna_sotterranea", "stone"),
            ("foresta_acida", "moss"),
        ]
        for biome, variant in demos:
            out = generate(biome, variant)
            print(f"OK Generated: {out.relative_to(ROOT)}", flush=True)
        return 0

    if not args.biome or not args.variant:
        print("ERROR: --biome + --variant required (o --all)", flush=True)
        return 1

    out = generate(args.biome, args.variant)
    print(f"OK Generated: {out.relative_to(ROOT)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
