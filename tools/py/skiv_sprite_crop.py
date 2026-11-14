"""Skiv sprite crop pipeline — slice sprite sheet into per-phase PNG.

Source: TL_Creatures.png CC0 by GrafxKid (256x352 RGB).
Output: 5 cropped sprites mapped to lifecycle phases.

CC0 license: no attribution required, but author preference honored.

Usage:
    python tools/py/skiv_sprite_crop.py
    # → apps/play/public/skiv/raster/{hatchling,juvenile,mature,apex,legacy}.png

Mapping note: TL_Creatures.png contains assorted creatures in grid layout.
This script assumes 8x11 grid (32x32 each). Hand-pick rows/cols below per
phase aesthetic match. Tweak `PHASE_GRID` to swap slices without re-edit.

Idempotent: skips files already present unless --force.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Dict, Tuple

THIS = Path(__file__).resolve()
ROOT = THIS.parent.parent.parent
SHEET = ROOT / "apps" / "play" / "public" / "skiv" / "raster" / "TL_Creatures.png"
OUT_DIR = ROOT / "apps" / "play" / "public" / "skiv" / "raster"

# 8 cols × 11 rows = 88 sprites total in TL_Creatures.png 256x352.
SPRITE_W = 32
SPRITE_H = 32

# Phase → (col, row) in sprite sheet. Hand-pick per aesthetic match.
# Skiv = lizard/reptile-ish — pick most fitting tiles.
PHASE_GRID: Dict[str, Tuple[int, int]] = {
    "hatchling": (0, 0),  # small/cute creature top-left
    "juvenile": (1, 1),   # mid-row, slightly bigger
    "mature": (2, 3),     # central, predator-shape
    "apex": (4, 5),       # darker tones, intimidating
    "legacy": (6, 9),     # bottom-right, spectral feel
}


def crop_phase(img, col: int, row: int):
    """Crop 32×32 tile at (col, row) from sprite sheet."""
    x0 = col * SPRITE_W
    y0 = row * SPRITE_H
    return img.crop((x0, y0, x0 + SPRITE_W, y0 + SPRITE_H))


def upscale(tile, factor: int = 4):
    """Nearest-neighbor upscale to keep pixel-art crisp."""
    from PIL import Image
    return tile.resize((tile.width * factor, tile.height * factor),
                       Image.NEAREST)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Skiv sprite crop pipeline")
    parser.add_argument("--force", action="store_true", help="Overwrite existing")
    parser.add_argument("--scale", type=int, default=4, help="Upscale factor (1=raw 32x32)")
    args = parser.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass

    if not SHEET.exists():
        print(f"[crop] ERROR sheet not found: {SHEET}")
        return 1

    try:
        from PIL import Image
    except ImportError:
        print("[crop] ERROR Pillow not installed. Install: pip install Pillow")
        return 2

    img = Image.open(SHEET).convert("RGBA")
    print(f"[crop] loaded sheet {SHEET.name} {img.width}x{img.height}")
    if img.width < SPRITE_W * 8 or img.height < SPRITE_H * 11:
        print(f"[crop] WARN sheet smaller than expected (8x11 grid)")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    crop_count = 0
    skip_count = 0
    for phase, (col, row) in PHASE_GRID.items():
        out_path = OUT_DIR / f"{phase}.png"
        if out_path.exists() and not args.force:
            print(f"[crop] skip {phase}.png (exists, use --force)")
            skip_count += 1
            continue
        try:
            tile = crop_phase(img, col, row)
        except Exception as e:
            print(f"[crop] ERROR cropping {phase}: {e}")
            continue
        if args.scale > 1:
            tile = upscale(tile, args.scale)
        tile.save(out_path, "PNG")
        print(f"[crop] saved {phase}.png ({tile.width}x{tile.height})")
        crop_count += 1

    print(f"[crop] DONE. cropped={crop_count} skipped={skip_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
