#!/usr/bin/env python3
"""Rigenera i report di analysis (coverage + progression).

Il comando usa gli script esistenti del repository per produrre:
- data/derived/analysis/trait_coverage_report.json
- data/derived/analysis/trait_coverage_matrix.csv
- data/derived/analysis/progression/* (skydock siege)
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

DEFAULT_CORE_ROOT = Path("data/core")
DEFAULT_PACK_ROOT = Path("packs/evo_tactics_pack")
ANALYSIS_ROOT = Path("data/derived/analysis")


class GenerationError(RuntimeError):
    """Errore nella generazione dei report derived."""


def run_command(command: list[str], cwd: Path | None = None) -> None:
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode != 0:
        raise GenerationError(f"Comando fallito ({result.returncode}): {' '.join(command)}")


def generate_trait_coverage(pack_root: Path) -> None:
    env_traits = pack_root / "docs" / "catalog" / "env_traits.json"
    trait_reference = Path("data/traits/index.json")
    species_root = pack_root / "data" / "species"
    out_json = ANALYSIS_ROOT / "trait_coverage_report.json"
    out_csv = ANALYSIS_ROOT / "trait_coverage_matrix.csv"

    command = [
        "python",
        "tools/py/report_trait_coverage.py",
        "--env-traits",
        str(env_traits),
        "--trait-reference",
        str(trait_reference),
        "--species-root",
        str(species_root),
        "--out-json",
        str(out_json),
        "--out-csv",
        str(out_csv),
    ]
    run_command(command)


def generate_progression(core_root: Path) -> None:
    mission = core_root / "missions" / "skydock_siege.yaml"
    out_dir = ANALYSIS_ROOT / "progression"
    command = [
        "python",
        "tools/py/balance_progression.py",
        "--mission",
        str(mission),
        "--out-dir",
        str(out_dir),
    ]
    run_command(command)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core-root", type=Path, default=DEFAULT_CORE_ROOT)
    parser.add_argument("--pack-root", type=Path, default=DEFAULT_PACK_ROOT)
    args = parser.parse_args()

    core_root = args.core_root.resolve()
    pack_root = args.pack_root.resolve()

    ANALYSIS_ROOT.mkdir(parents=True, exist_ok=True)

    print("▶ Generazione coverage trait")
    generate_trait_coverage(pack_root)

    print("▶ Generazione progression")
    generate_progression(core_root)

    print("✔ Report analysis aggiornati in data/derived/analysis")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
