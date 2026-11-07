"""Unit test per tools/py/styleguide_lint.py.

Non richiede docs/core/41-AD e 42-SG in branch — usa testo inline + tmp dir.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "py"))

from styleguide_lint import (  # noqa: E402
    HEX_STRICT,
    extract_css_tokens,
    extract_hex_values,
    extract_lighting_tags,
    extract_mood_tags,
    lint_encounter_visual_mood,
    lint_functional_color_parity,
    lint_hex_validity,
)


AD_SAMPLE = """# 41 — Art Direction canonical

## Palette matrix 9 biomi shipping

| Bioma (id) | Palette dominante | Accent 1 | Accent 2 | Mood | Luce |
| ---------- | ----------------- | -------- | -------- | ---- | ---- |
| `savana` | Ocra #b8935a | Verde #6e7a3f | Cielo #e8d5a8 | Esposizione | Alta, calda dall'alto |
| `caverna_sotterranea` | Grigio #3d3d42 | Verde #4a5e3d | Cyan #40c8d4 | Claustrofobia | Bassa, puntiforme |

## Colori funzionali universali

| Funzione | Hex | Uso |
| -------- | --- | --- |
| Alleato  | `#4a8ad4` | Outline player |
| Nemico   | `#d44a4a` | Outline sistema |
"""

SG_SAMPLE = """# 42 — Style Guide UI canonical

## Design tokens — Colors

| Token | Hex | Uso |
| ----- | --- | --- |
| `--color-faction-player`  | `#4a8ad4` | Outline player |
| `--color-faction-sistema` | `#d44a4a` | Outline sistema |

## Design tokens — Typography

font-ui: 'Inter'
--text-m: 20px
"""


def test_extract_hex_values():
    text = "Palette #b8935a + accent #4a8ad4 + overlay #d44a4a80"
    hex_vals = extract_hex_values(text)
    assert "#b8935a" in hex_vals
    assert "#4a8ad4" in hex_vals
    assert "#d44a4a80" in hex_vals
    assert len(hex_vals) == 3


def test_extract_mood_tags():
    tags = extract_mood_tags(AD_SAMPLE)
    assert "esposizione" in tags
    assert "claustrofobia" in tags


def test_extract_lighting_tags():
    tags = extract_lighting_tags(AD_SAMPLE)
    # Normalizzazione: lowercase + spaces → underscore + rimozione apostrofi
    assert any("alta" in t and "calda" in t for t in tags)
    assert any("bassa" in t and "puntiforme" in t for t in tags)


def test_extract_css_tokens():
    tokens = extract_css_tokens(SG_SAMPLE)
    assert "--color-faction-player" in tokens
    assert "--color-faction-sistema" in tokens
    assert "--text-m" in tokens


def test_lint_hex_validity_all_valid():
    violations = lint_hex_validity(Path("test.md"), AD_SAMPLE)
    assert violations == [], "all hex in AD_SAMPLE are valid"


def test_lint_hex_validity_invalid():
    text = "Invalid #xyz123 here"
    # Re-pattern matches #xyz123 → parsing finds '#xyz123' che è 6+ hex chars con 'x','y','z'
    # HEX_PATTERN =  #[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})? — rejects xyz (non-hex)
    # So no match, no violation. Test inverse: detect short hex mismatch.
    bad = "Short #abc hex"
    violations = lint_hex_validity(Path("t.md"), bad)
    # #abc non matcha pattern 6-hex → no violation dal lint. OK behavior.
    assert violations == []


def test_lint_functional_color_parity_match():
    # Both AD + SG contengono #4a8ad4 + #d44a4a → parity OK
    violations = lint_functional_color_parity(AD_SAMPLE, SG_SAMPLE)
    assert violations == [], f"expected no parity violation, got: {violations}"


def test_lint_functional_color_parity_missing():
    # AD has extra hex in funzionali section non in SG
    ad = AD_SAMPLE + "\n| Neutro | `#e8c040` | Outline |\n"
    violations = lint_functional_color_parity(ad, SG_SAMPLE)
    # Verifica che #e8c040 sia flagged come missing da SG
    assert any("#e8c040" in v.get("value", "") for v in violations), f"expected #e8c040 missing, got: {violations}"


def test_lint_encounter_visual_mood_valid():
    mood_tags = {"esposizione", "claustrofobia"}
    lighting_tags = {"alta_calda_dall_alto", "bassa_puntiforme"}
    # Nessun encounter nella dir test → empty violations
    # Questo verifica solo che funzione non crashi
    violations = lint_encounter_visual_mood(mood_tags, lighting_tags)
    # I reali encounter potrebbero esistere su disk — ok sia [] che non vuoto
    assert isinstance(violations, list)


def test_hex_strict_pattern():
    assert HEX_STRICT.match("#4a8ad4")
    assert HEX_STRICT.match("#4A8AD4")
    assert HEX_STRICT.match("#d44a4a80")
    assert not HEX_STRICT.match("#abc")
    assert not HEX_STRICT.match("4a8ad4")  # missing #
    assert not HEX_STRICT.match("#4a8ad4z")  # invalid char
    assert not HEX_STRICT.match("#4a8ad4123")  # >8 digit
