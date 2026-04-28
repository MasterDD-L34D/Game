"""Generate procedural visual placeholder assets for apps/play.

Visual upgrade Sprint D 2026-04-28 — placeholder tile bioma + 16 MBTI portrait
prima dello swap con asset real (Kenney CC0 + LPC + custom pixel art).

Usage:
    python3 tools/py/generate_visual_assets.py

Output:
    apps/play/public/assets/tiles/<bioma>/<variant>.png  (32x32 indexed)
    apps/play/public/assets/portraits/<mbti>.png         (64x64 indexed)
"""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
TILE_OUT = ROOT / "apps" / "play" / "public" / "assets" / "tiles"
PORTRAIT_OUT = ROOT / "apps" / "play" / "public" / "assets" / "portraits"

# Bioma palette canonical da docs/core/41-ART-DIRECTION.md §palette matrix
# (semplificato per placeholder — full asset shipping = real pixel art).
BIOMA_PALETTE = {
    "savana": {
        "base": (138, 116, 70),
        "highlight": (170, 145, 90),
        "shadow": (95, 80, 50),
        "accent": (90, 110, 50),
    },
    "caverna": {
        "base": (60, 55, 55),
        "highlight": (90, 85, 85),
        "shadow": (35, 32, 32),
        "accent": (110, 100, 95),
    },
    "foresta_acida": {
        "base": (70, 95, 60),
        "highlight": (110, 145, 85),
        "shadow": (45, 65, 40),
        "accent": (155, 180, 90),
    },
    "tundra": {
        "base": (180, 195, 200),
        "highlight": (220, 230, 235),
        "shadow": (135, 150, 160),
        "accent": (95, 130, 165),
    },
    "deserto": {
        "base": (190, 165, 110),
        "highlight": (215, 195, 145),
        "shadow": (150, 125, 80),
        "accent": (160, 90, 60),
    },
    "palude": {
        "base": (75, 80, 55),
        "highlight": (105, 115, 75),
        "shadow": (50, 55, 35),
        "accent": (135, 105, 55),
    },
    "vulcanico": {
        "base": (75, 50, 45),
        "highlight": (130, 75, 50),
        "shadow": (45, 28, 25),
        "accent": (220, 110, 35),
    },
    "abissale": {
        "base": (35, 50, 75),
        "highlight": (60, 85, 115),
        "shadow": (20, 30, 50),
        "accent": (95, 140, 175),
    },
    "celeste": {
        "base": (115, 130, 175),
        "highlight": (170, 180, 215),
        "shadow": (75, 90, 130),
        "accent": (235, 220, 145),
    },
}


def make_tile(palette: dict, *, seed: int = 0, size: int = 32) -> Image.Image:
    """Procedural tile: base fill + dithered noise + 4-6 accent dots."""
    rng = random.Random(seed)
    img = Image.new("RGB", (size, size), palette["base"])
    pixels = img.load()
    # Dithered noise pattern (Bayer-like) for texture without external deps
    for y in range(size):
        for x in range(size):
            roll = rng.random()
            if roll < 0.18:
                pixels[x, y] = palette["highlight"]
            elif roll < 0.32:
                pixels[x, y] = palette["shadow"]
    # Accent dots (rocks / leaves / flora hints) scattered
    draw = ImageDraw.Draw(img)
    for _ in range(rng.randint(4, 7)):
        cx = rng.randint(2, size - 3)
        cy = rng.randint(2, size - 3)
        r = rng.randint(1, 2)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=palette["accent"])
    return img


def write_tiles() -> None:
    TILE_OUT.mkdir(parents=True, exist_ok=True)
    for bioma, palette in BIOMA_PALETTE.items():
        bdir = TILE_OUT / bioma
        bdir.mkdir(exist_ok=True)
        for variant in range(3):  # 3 varianti per bioma per evitare ripetizione visiva
            seed = abs(hash(f"{bioma}-{variant}")) % (2**32)
            tile = make_tile(palette, seed=seed)
            tile.save(bdir / f"tile_{variant}.png", "PNG", optimize=True)
    print(f"[tiles] generated {len(BIOMA_PALETTE)} biomi x 3 variants = {len(BIOMA_PALETTE) * 3} PNG")


# 16 MBTI palette (paired by axis dominance — Disco Elysium-inspired identity color)
MBTI_PALETTE = {
    # NT analytical — purple/violet
    "INTJ": ((40, 35, 65), (155, 130, 195)),
    "INTP": ((35, 45, 70), (135, 165, 215)),
    "ENTJ": ((55, 30, 50), (200, 130, 175)),
    "ENTP": ((45, 40, 30), (220, 200, 130)),
    # NF idealistic — gold/cream
    "INFJ": ((40, 35, 30), (210, 185, 140)),
    "INFP": ((50, 40, 50), (200, 165, 195)),
    "ENFJ": ((60, 40, 30), (220, 175, 125)),
    "ENFP": ((55, 45, 25), (240, 200, 110)),
    # SJ traditional — bronze/earth
    "ISTJ": ((35, 35, 40), (170, 170, 175)),
    "ISFJ": ((40, 35, 30), (190, 165, 135)),
    "ESTJ": ((55, 35, 25), (190, 130, 95)),
    "ESFJ": ((60, 45, 35), (215, 180, 145)),
    # SP adaptable — crimson/orange
    "ISTP": ((35, 30, 30), (155, 145, 140)),
    "ISFP": ((45, 35, 40), (200, 160, 175)),
    "ESTP": ((55, 30, 30), (210, 105, 95)),
    "ESFP": ((60, 35, 25), (235, 145, 90)),
}


def make_portrait(label: str, bg: tuple, fg: tuple, *, size: int = 64) -> Image.Image:
    """Procedural MBTI portrait: framed circle + 4-letter label.

    Placeholder until shipping LPC-style or AI-generated portrait per archetipo.
    """
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)
    # Inner circle (face slot) with grim-bg-elevated tone
    inner_pad = 6
    draw.ellipse(
        (inner_pad, inner_pad, size - inner_pad, size - inner_pad),
        fill=(45, 42, 46),
        outline=fg,
        width=2,
    )
    # Inner accent ring
    inner_ring = 12
    draw.ellipse(
        (inner_ring, inner_ring, size - inner_ring, size - inner_ring),
        outline=fg,
        width=1,
    )
    # MBTI label (centered)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) // 2, (size - th) // 2 - 1),
        label,
        fill=fg,
        font=font,
    )
    return img


def write_portraits() -> None:
    PORTRAIT_OUT.mkdir(parents=True, exist_ok=True)
    for mbti, (bg, fg) in MBTI_PALETTE.items():
        portrait = make_portrait(mbti, bg, fg)
        portrait.save(PORTRAIT_OUT / f"{mbti}.png", "PNG", optimize=True)
    print(f"[portraits] generated {len(MBTI_PALETTE)} MBTI portraits")


def main() -> None:
    write_tiles()
    write_portraits()


if __name__ == "__main__":
    main()
