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


# Creature archetype sprite palettes (body, accent, eye, shadow_ring)
# 8 archetype mappati a job catalog: vanguard/tank, skirmisher/assassin,
# scout/ranger, sniper/ranged, healer/support, controller/mage, boss, default.
CREATURE_OUT = ROOT / "apps" / "play" / "public" / "assets" / "creatures"

CREATURE_ARCHETYPES = {
    # Vanguard/tank — squat boxy body brown earth, thick limbs
    "vanguard": {
        "shape": "boxy",
        "body": (110, 80, 55),
        "accent": (165, 130, 80),
        "shadow": (60, 40, 25),
        "eye": (245, 230, 100),
    },
    # Skirmisher/assassin — lean angular purple
    "skirmisher": {
        "shape": "lean",
        "body": (95, 70, 145),
        "accent": (165, 120, 220),
        "shadow": (50, 35, 80),
        "eye": (255, 240, 130),
    },
    # Scout/ranger — agile narrow green
    "scout": {
        "shape": "agile",
        "body": (75, 130, 70),
        "accent": (140, 195, 100),
        "shadow": (40, 70, 35),
        "eye": (245, 220, 110),
    },
    # Sniper/ranged — tall slim ochre
    "sniper": {
        "shape": "tall",
        "body": (170, 120, 50),
        "accent": (220, 175, 90),
        "shadow": (95, 65, 25),
        "eye": (50, 50, 50),
    },
    # Healer/support — round soft cyan
    "healer": {
        "shape": "round",
        "body": (50, 145, 195),
        "accent": (140, 215, 240),
        "shadow": (25, 75, 110),
        "eye": (255, 255, 255),
    },
    # Controller/mage — diamond magenta
    "controller": {
        "shape": "diamond",
        "body": (155, 75, 175),
        "accent": (215, 135, 230),
        "shadow": (80, 35, 95),
        "eye": (255, 245, 145),
    },
    # Boss — large hulking crimson
    "boss": {
        "shape": "hulk",
        "body": (175, 45, 50),
        "accent": (230, 110, 95),
        "shadow": (90, 20, 25),
        "eye": (255, 240, 110),
    },
    # Default — neutral
    "default": {
        "shape": "round",
        "body": (130, 130, 130),
        "accent": (190, 190, 190),
        "shadow": (60, 60, 60),
        "eye": (240, 240, 240),
    },
}


def _put(pixels, x, y, color, size=32):
    if 0 <= x < size and 0 <= y < size:
        pixels[x, y] = color


def _mix(a, b, t):
    """Linear interp tra due RGB tuple (t in [0,1])."""
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def make_creature_sprite(palette: dict, *, size: int = 64) -> Image.Image:
    """Procedural pixel-art creature 64×64 (top-down ¾ view, RGBA transparent bg).

    Multi-tone shading (5 tier: shadow > body-dark > body > body-light > highlight),
    distinctive limbs + features per archetype, dithered edges, eye highlights.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = img.load()
    body = palette["body"]
    accent = palette["accent"]
    shadow = palette["shadow"]
    eye = palette["eye"]

    body_dark = _mix(body, shadow, 0.45)
    body_light = _mix(body, (255, 255, 255), 0.18)
    body_hl = _mix(body, (255, 255, 255), 0.42)
    accent_dark = _mix(accent, shadow, 0.4)
    accent_light = _mix(accent, (255, 255, 255), 0.25)

    body_t = body + (255,)
    body_dark_t = body_dark + (255,)
    body_light_t = body_light + (255,)
    body_hl_t = body_hl + (255,)
    shadow_t = shadow + (255,)
    accent_t = accent + (255,)
    accent_dark_t = accent_dark + (255,)
    accent_light_t = accent_light + (255,)
    eye_t = eye + (255,)
    eye_glint = (255, 255, 255, 230)

    cx = size // 2
    cy = size // 2 + 2
    shape = palette["shape"]

    def fill_ellipse(rx, ry, color, ox=0, oy=0):
        for dy in range(-ry, ry + 1):
            for dx in range(-rx, rx + 1):
                if (dx * dx) / max(rx * rx, 1) + (dy * dy) / max(ry * ry, 1) <= 1.0:
                    _put(pixels, cx + dx + ox, cy + dy + oy, color, size)

    def fill_diamond(rx, ry, color, ox=0, oy=0):
        for dy in range(-ry, ry + 1):
            wmax = int(rx * (1 - abs(dy) / ry)) if ry else 0
            for dx in range(-wmax, wmax + 1):
                _put(pixels, cx + dx + ox, cy + dy + oy, color, size)

    if shape == "boxy":
        # Vanguard: squat broad shoulders, helmet, gauntlets, tower-shield silhouette
        fill_ellipse(20, 12, body_t, 0, 4)  # torso
        fill_ellipse(18, 10, body_dark_t, 0, 14)  # belly shadow
        fill_ellipse(15, 7, body_t, 0, -10)  # helmet
        fill_ellipse(7, 4, body_dark_t, 0, -7)  # helmet brow shadow
        fill_ellipse(6, 4, accent_t, -16, 0)  # left pauldron
        fill_ellipse(6, 4, accent_t, 16, 0)  # right pauldron
        fill_ellipse(4, 3, accent_dark_t, -16, 2)
        fill_ellipse(4, 3, accent_dark_t, 16, 2)
        fill_ellipse(5, 8, body_dark_t, -12, 16)  # left leg
        fill_ellipse(5, 8, body_dark_t, 12, 16)  # right leg
        fill_ellipse(8, 12, accent_t, -22, 6)  # left tower-shield
        fill_ellipse(6, 9, accent_dark_t, -22, 7)
        fill_ellipse(5, 5, body_hl_t, -3, -8)  # helmet highlight
    elif shape == "lean":
        # Skirmisher: tall hooded assassin, twin blades, narrow waist
        fill_ellipse(7, 14, body_t, 0, 0)  # cloaked torso
        fill_ellipse(5, 10, body_dark_t, 0, 6)  # waist shadow
        fill_ellipse(11, 6, body_t, 0, -14)  # cowl/hood
        fill_ellipse(9, 4, body_dark_t, 0, -11)  # cowl interior shadow
        fill_diamond(2, 10, accent_t, -14, 4)  # left blade
        fill_diamond(2, 10, accent_t, 14, 4)  # right blade
        fill_ellipse(2, 1, accent_light_t, -14, -4)  # blade tip glint
        fill_ellipse(2, 1, accent_light_t, 14, -4)
        fill_ellipse(4, 6, body_dark_t, 0, 18)  # leg-tail wrap
        fill_ellipse(3, 2, body_hl_t, 2, -16)  # hood highlight
    elif shape == "agile":
        # Scout: 4-leg quadruped low profile, snout forward, tail
        fill_ellipse(15, 8, body_t, 0, 4)  # main body
        fill_ellipse(13, 6, body_dark_t, 0, 8)  # belly underside
        fill_ellipse(8, 5, body_t, 14, -2)  # head forward right
        fill_ellipse(6, 4, body_dark_t, 14, 1)  # snout shadow
        fill_ellipse(3, 2, accent_t, 22, -3)  # snout tip
        fill_ellipse(4, 3, accent_t, -18, 6)  # tail
        fill_ellipse(2, 5, body_dark_t, -10, 14)  # rear-left leg
        fill_ellipse(2, 5, body_dark_t, 10, 14)  # rear-right leg
        fill_ellipse(2, 4, body_dark_t, -2, 16)  # mid-leg
        fill_ellipse(3, 2, body_hl_t, 2, 0)  # back highlight
    elif shape == "tall":
        # Sniper: bipedal slim, rifle/quill on shoulder, narrow profile
        fill_ellipse(8, 22, body_t, 0, 0)  # tall torso
        fill_ellipse(6, 18, body_dark_t, 2, 2)  # right side shading
        fill_ellipse(7, 5, body_t, 0, -18)  # head
        fill_ellipse(4, 3, body_dark_t, 1, -16)  # head jaw shadow
        # Long quill/rifle on top
        fill_diamond(3, 14, accent_t, 4, -22)
        fill_ellipse(3, 2, accent_light_t, 4, -34)  # quill tip
        fill_ellipse(3, 6, body_dark_t, -7, 8)  # left thin leg
        fill_ellipse(3, 6, body_dark_t, 7, 8)  # right thin leg
        fill_ellipse(2, 8, body_dark_t, -7, 18)
        fill_ellipse(2, 8, body_dark_t, 7, 18)
        fill_ellipse(2, 4, body_hl_t, -2, -10)  # chest highlight
    elif shape == "round":
        # Healer: round soft creature, halo of flowers/orbs
        fill_ellipse(18, 18, body_t, 0, 2)  # round body
        fill_ellipse(16, 12, body_dark_t, 0, 8)  # belly shadow
        fill_ellipse(13, 13, body_light_t, 0, -3)  # upper highlight
        fill_ellipse(8, 8, body_hl_t, -3, -6)  # main highlight
        # 3 orbs floating around (healing aura)
        fill_ellipse(3, 3, accent_t, -16, -10)
        fill_ellipse(2, 2, accent_light_t, -16, -11)
        fill_ellipse(3, 3, accent_t, 16, -10)
        fill_ellipse(2, 2, accent_light_t, 16, -11)
        fill_ellipse(3, 3, accent_t, 0, -18)
        fill_ellipse(2, 2, accent_light_t, 0, -19)
    elif shape == "diamond":
        # Controller: levitating diamond core, runes, twin floating arms
        fill_diamond(15, 15, body_t)
        fill_diamond(11, 11, body_light_t, 0, -2)
        fill_diamond(7, 7, accent_t, 0, 0)  # inner accent
        fill_diamond(3, 3, accent_light_t, 0, -1)  # inner core glow
        # Floating side runes
        fill_ellipse(2, 2, accent_dark_t, -18, 0)
        fill_ellipse(2, 2, accent_dark_t, 18, 0)
        fill_ellipse(2, 2, accent_dark_t, 0, -18)
        fill_ellipse(2, 2, accent_dark_t, 0, 18)
        # Lateral magic streaks
        fill_ellipse(4, 1, accent_t, -12, 12)
        fill_ellipse(4, 1, accent_t, 12, 12)
    elif shape == "hulk":
        # Boss: massive crimson beast, horns, fangs, claws, big presence
        fill_ellipse(26, 18, body_t, 0, 4)  # massive body
        fill_ellipse(22, 12, body_dark_t, 0, 12)  # belly underside
        fill_ellipse(18, 8, body_t, 0, -12)  # head
        fill_ellipse(14, 5, body_dark_t, 0, -8)  # jaw shadow
        # Horns curved
        fill_ellipse(5, 8, accent_t, -14, -16)
        fill_ellipse(5, 8, accent_t, 14, -16)
        fill_ellipse(3, 4, accent_dark_t, -14, -14)
        fill_ellipse(3, 4, accent_dark_t, 14, -14)
        # Fangs (white triangles)
        fill_diamond(2, 3, (245, 235, 220, 255), -4, -4)
        fill_diamond(2, 3, (245, 235, 220, 255), 4, -4)
        # Claws (lateral)
        fill_diamond(3, 4, accent_dark_t, -22, 12)
        fill_diamond(3, 4, accent_dark_t, 22, 12)
        # Spine highlight
        fill_ellipse(3, 14, body_hl_t, 0, -4)
    else:
        fill_ellipse(16, 16, body_t)
        fill_ellipse(13, 11, body_light_t, 0, -2)

    # Eye highlights — vary per shape
    if shape == "tall":
        _put(pixels, cx - 2, cy - 16, eye_t, size)
        _put(pixels, cx + 2, cy - 16, eye_t, size)
        _put(pixels, cx - 2, cy - 17, eye_glint, size)
        _put(pixels, cx + 2, cy - 17, eye_glint, size)
    elif shape == "diamond":
        # Single cyclops-style eye in core
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if dx * dx + dy * dy <= 4:
                    _put(pixels, cx + dx, cy + dy, eye_t, size)
        _put(pixels, cx - 1, cy - 1, eye_glint, size)
    elif shape == "hulk":
        for dy in range(-2, 1):
            for dx in range(-2, 1):
                if dx * dx + dy * dy <= 3:
                    _put(pixels, cx - 7 + dx, cy - 8 + dy, eye_t, size)
                    _put(pixels, cx + 7 + dx, cy - 8 + dy, eye_t, size)
        _put(pixels, cx - 7, cy - 9, eye_glint, size)
        _put(pixels, cx + 7, cy - 9, eye_glint, size)
    elif shape == "agile":
        # Scout — eyes on head (forward right)
        _put(pixels, cx + 12, cy - 4, eye_t, size)
        _put(pixels, cx + 14, cy - 4, eye_t, size)
        _put(pixels, cx + 12, cy - 5, eye_glint, size)
    else:
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                if dx * dx + dy * dy <= 2:
                    _put(pixels, cx - 4 + dx, cy - 6 + dy, eye_t, size)
                    _put(pixels, cx + 4 + dx, cy - 6 + dy, eye_t, size)
        _put(pixels, cx - 4, cy - 7, eye_glint, size)
        _put(pixels, cx + 4, cy - 7, eye_glint, size)

    # Outline pass — pixel outline ombra dove c'è body adjacent al transparent.
    # Crea silhouette netta separata da bg (TV-first 10-foot rule).
    src = img.copy()
    src_pixels = src.load()
    for y in range(size):
        for x in range(size):
            if src_pixels[x, y][3] > 0:
                continue
            # Adjacent body pixel? → outline shadow
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < size and 0 <= ny < size and src_pixels[nx, ny][3] > 0:
                        _put(pixels, x, y, shadow_t, size)
                        break
                else:
                    continue
                break

    return img


def write_creatures() -> None:
    CREATURE_OUT.mkdir(parents=True, exist_ok=True)
    for archetype, palette in CREATURE_ARCHETYPES.items():
        sprite = make_creature_sprite(palette)
        sprite.save(CREATURE_OUT / f"{archetype}.png", "PNG", optimize=True)
    print(f"[creatures] generated {len(CREATURE_ARCHETYPES)} archetype sprites")


def main() -> None:
    write_tiles()
    write_portraits()
    write_creatures()


if __name__ == "__main__":
    main()
