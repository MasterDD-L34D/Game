from __future__ import annotations

import csv
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
ROLL_OUT_DIR = REPO_ROOT / "reports" / "evo" / "rollout"


def _read_header(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        return next(reader)


@pytest.mark.parametrize(
    ("filename", "expected"),
    [
        (
            "traits_gap.csv",
            [
                "slug",
                "status",
                "name_mismatch",
                "tier_mismatch",
                "synergy_mismatch",
                "env_mismatch",
                "legacy_flag_mismatch",
                "external_code",
                "external_label",
                "external_tier",
                "external_synergies",
                "external_envs",
                "legacy_label",
                "legacy_tier",
                "legacy_synergies",
                "legacy_envs",
                "duplicate_flag",
                "merge_conflict_flag",
            ],
        ),
        (
            "traits_external_sync.csv",
            ["slug", "label_it", "label_en", "tier", "external_code", "status"],
        ),
        (
            "traits_normalized.csv",
            [
                "source",
                "slug",
                "trait_code",
                "label",
                "tier",
                "legacy_flag",
                "data_origin",
                "sinergie",
                "env_biomes",
            ],
        ),
    ],
)
def test_rollout_csv_headers(filename: str, expected: list[str]) -> None:
    header = _read_header(ROLL_OUT_DIR / filename)
    assert header == expected


@pytest.mark.parametrize(
    "filename",
    [
        "traits_gap.csv",
        "traits_external_sync.csv",
        "traits_normalized.csv",
    ],
)
def test_rollout_reports_have_rows(filename: str) -> None:
    with (ROLL_OUT_DIR / filename).open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        first_row = next(reader, None)
    assert header is not None
    assert first_row is not None

