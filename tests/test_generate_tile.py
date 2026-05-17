"""Unit test per tools/py/art/generate_tile.py.

Verifica palette consistency, output shape, deterministic RNG.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "py" / "art"))

from generate_tile import (  # noqa: E402
    BIOME_PALETTES,
    PATTERNS,
    TILE_SIZE,
    deterministic_rng,
    generate,
    pattern_grass,
    pattern_moss,
    pattern_stone,
)


def test_tile_size_32():
    assert TILE_SIZE == 32


def test_biome_palettes_shape():
    for biome, pal in BIOME_PALETTES.items():
        assert "base_dark" in pal
        assert "base_mid" in pal
        assert "base_light" in pal
        assert "accent" in pal
        for key, rgb in pal.items():
            assert len(rgb) == 3, f"{biome}.{key} non RGB 3-tuple"
            for ch in rgb:
                assert 0 <= ch <= 255, f"{biome}.{key} channel out of range"


def test_patterns_available():
    assert "grass" in PATTERNS
    assert "stone" in PATTERNS
    assert "moss" in PATTERNS


def test_pattern_grass_output_shape():
    palette = BIOME_PALETTES["savana"]
    rng = deterministic_rng("savana", "grass")
    pixels = pattern_grass(palette, rng)
    assert len(pixels) == TILE_SIZE
    assert all(len(row) == TILE_SIZE for row in pixels)


def test_pattern_stone_output_shape():
    palette = BIOME_PALETTES["caverna_sotterranea"]
    rng = deterministic_rng("caverna_sotterranea", "stone")
    pixels = pattern_stone(palette, rng)
    assert len(pixels) == TILE_SIZE
    assert all(len(row) == TILE_SIZE for row in pixels)


def test_pattern_moss_output_shape():
    palette = BIOME_PALETTES["foresta_acida"]
    rng = deterministic_rng("foresta_acida", "moss")
    pixels = pattern_moss(palette, rng)
    assert len(pixels) == TILE_SIZE
    assert all(len(row) == TILE_SIZE for row in pixels)


def test_deterministic_rng_reproducible():
    rng1 = deterministic_rng("savana", "grass")
    rng2 = deterministic_rng("savana", "grass")
    # Same seed → same sequence
    seq1 = [rng1.randint(0, 100) for _ in range(10)]
    seq2 = [rng2.randint(0, 100) for _ in range(10)]
    assert seq1 == seq2


def test_deterministic_rng_different_biomes():
    rng_s = deterministic_rng("savana", "grass")
    rng_c = deterministic_rng("caverna_sotterranea", "grass")
    seq_s = [rng_s.randint(0, 100) for _ in range(10)]
    seq_c = [rng_c.randint(0, 100) for _ in range(10)]
    assert seq_s != seq_c


def test_palette_pixels_from_palette_only():
    """Verify all pixels in output pattern sono dal palette master (palette lock)."""
    palette = BIOME_PALETTES["savana"]
    rng = deterministic_rng("savana", "grass")
    pixels = pattern_grass(palette, rng)
    palette_colors = set(tuple(c) for c in palette.values())
    for row in pixels:
        for pixel in row:
            assert tuple(pixel) in palette_colors, f"pixel {pixel} not in palette"


def test_generate_creates_png(tmp_path, monkeypatch):
    """Integration smoke test: generate() writes PNG."""
    import generate_tile
    monkeypatch.setattr(generate_tile, "TILESETS_DIR", tmp_path)
    out_path = generate_tile.generate("savana", "grass")
    assert out_path.exists()
    assert out_path.suffix == ".png"
    assert out_path.stat().st_size > 0


def test_invalid_biome_raises():
    with pytest.raises(ValueError, match="biome sconosciuto"):
        generate("nonexistent_biome", "grass")


def test_invalid_variant_raises():
    with pytest.raises(ValueError, match="variant sconosciuta"):
        generate("savana", "nonexistent_variant")
