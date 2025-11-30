#!/usr/bin/env python3
"""Rigenera i report di analysis (coverage + progression).

Il comando usa gli script esistenti del repository per produrre:
- data/derived/analysis/trait_coverage_report.json
- data/derived/analysis/trait_coverage_matrix.csv
- data/derived/analysis/progression/* (skydock siege)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

DEFAULT_CORE_ROOT = Path("data/core")
DEFAULT_PACK_ROOT = Path("packs/evo_tactics_pack")
ANALYSIS_ROOT = Path("data/derived/analysis")


class GenerationError(RuntimeError):
    """Errore nella generazione dei report derived."""


def run_command(command: list[str], cwd: Path | None = None) -> None:
    env = dict(os.environ)
    env.setdefault("PYTHONHASHSEED", "0")
    result = subprocess.run(command, cwd=cwd, check=False, env=env)
    if result.returncode != 0:
        raise GenerationError(f"Comando fallito ({result.returncode}): {' '.join(command)}")


def sha256sum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def current_commit() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


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


def write_manifest(
    outputs: list[Path],
    core_root: Path,
    pack_root: Path,
    command: str,
) -> None:
    manifest = {
        "core_root": str(core_root),
        "pack_root": str(pack_root),
        "command": command,
        "commit": current_commit(),
        "artifacts": {},
    }

    for path in outputs:
        if path.exists():
            manifest["artifacts"][str(path)] = sha256sum(path)

    target = ANALYSIS_ROOT / "manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


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

    outputs = [
        ANALYSIS_ROOT / "trait_coverage_report.json",
        ANALYSIS_ROOT / "trait_coverage_matrix.csv",
        ANALYSIS_ROOT / "trait_gap_report.json",
        ANALYSIS_ROOT / "trait_baseline.yaml",
        ANALYSIS_ROOT / "trait_env_mapping.json",
        ANALYSIS_ROOT / "progression" / "skydock_siege_xp.json",
        ANALYSIS_ROOT / "progression" / "skydock_siege_xp_summary.csv",
        ANALYSIS_ROOT / "progression" / "skydock_siege_xp_profiles.csv",
    ]

    command = (
        f"python scripts/generate_derived_analysis.py --core-root {core_root} "
        f"--pack-root {pack_root}"
    )
    write_manifest(outputs, core_root, pack_root, command)

    print("✔ Report analysis aggiornati in data/derived/analysis")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
