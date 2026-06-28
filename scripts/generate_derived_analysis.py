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
import sys
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CORE_ROOT = Path("data/core")
DEFAULT_PACK_ROOT = Path("packs/evo_tactics_pack")
ANALYSIS_ROOT = Path("data/derived/analysis")


def _repo_rel(path: Path) -> str:
    """Repo-relative, forward-slash path -- host-independent manifest stamps.

    The manifest must be byte-identical regardless of build host (Linux CI vs
    Windows dev) and absolute checkout location, so that ``regen == committed``
    holds. We therefore never store absolute or backslash paths.
    """
    candidate = Path(path)
    try:
        resolved = candidate.resolve()
    except OSError:
        resolved = candidate
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        # Already relative (or outside the repo) -> normalize separators only.
        return candidate.as_posix()
ANALYSIS_README = ANALYSIS_ROOT / "README.md"
OUTPUT_FILES: tuple[Path, ...] = (
    ANALYSIS_ROOT / "trait_coverage_report.json",
    ANALYSIS_ROOT / "trait_coverage_matrix.csv",
    ANALYSIS_ROOT / "trait_gap_report.json",
    ANALYSIS_ROOT / "trait_baseline.yaml",
    ANALYSIS_ROOT / "trait_env_mapping.json",
    ANALYSIS_ROOT / "progression" / "skydock_siege_xp.json",
    ANALYSIS_ROOT / "progression" / "skydock_siege_xp_summary.csv",
    ANALYSIS_ROOT / "progression" / "skydock_siege_xp_profiles.csv",
)


class GenerationError(RuntimeError):
    """Errore nella generazione dei report derived."""


def run_command(command: list[str], cwd: Path | None = None) -> None:
    env = dict(os.environ)
    env.setdefault("PYTHONHASHSEED", "0")
    # Force UTF-8 in child processes: on Windows the default cp1252 stdout makes a
    # child crash (exit 1) the moment it prints a non-ASCII char (e.g. an Italian
    # "non e' definito" registry warning), which previously broke this generator
    # only when run on a Windows dev box.
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    result = subprocess.run(command, cwd=cwd, check=False, env=env)
    if result.returncode != 0:
        raise GenerationError(f"Comando fallito ({result.returncode}): {' '.join(command)}")


def sha256sum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def generate_trait_coverage(pack_root: Path) -> None:
    env_traits = pack_root / "docs" / "catalog" / "env_traits.json"
    trait_reference = Path("data/traits/index.json")
    species_root = pack_root / "data" / "species"
    out_json = ANALYSIS_ROOT / "trait_coverage_report.json"
    out_csv = ANALYSIS_ROOT / "trait_coverage_matrix.csv"

    command = [
        sys.executable,
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
    _normalize_report(out_json)


def _normalize_path_fields(obj: object) -> None:
    """Recursively rewrite path-bearing string fields to repo-relative posix.

    The coverage report embeds the absolute ``--species-root`` paths (every
    foodweb ``source``) and the ``sources`` block using the OS separator, both of
    which are host-dependent (``C:\\...`` on Windows, ``/workspace/...`` on Linux)
    and break ``regen == committed`` on any other checkout. Normalize them so the
    committed report is host-independent.
    """
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str) and key == "source":
                obj[key] = _repo_rel(Path(value))
            elif key == "sources" and isinstance(value, dict):
                for sk, sv in value.items():
                    if isinstance(sv, str):
                        value[sk] = _repo_rel(Path(sv))
            else:
                _normalize_path_fields(value)
    elif isinstance(obj, list):
        for item in obj:
            _normalize_path_fields(item)


def _normalize_report(report_path: Path) -> None:
    """Make the coverage report byte-reproducible across hosts: drop the
    wall-clock ``generated_at`` (the only volatile field; provenance lives in git)
    and normalize host-dependent path fields to repo-relative posix. The CI
    coverage step reads only ``summary`` thresholds, so both edits are gate-neutral.
    """
    if not report_path.exists():
        return
    data = json.loads(report_path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data.pop("generated_at", None)
        _normalize_path_fields(data)
        report_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
            newline="\n",
        )


def _normalize_lf(path: Path) -> None:
    """Force LF line endings so the working-tree bytes match what Git stores
    (``.gitattributes`` pins ``eol=lf``). The manifest sha256 must hash these LF
    bytes, otherwise a verifier on a fresh clone (always LF) sees a different hash.
    """
    if not path.exists():
        return
    raw = path.read_bytes()
    if b"\r\n" in raw:
        path.write_bytes(raw.replace(b"\r\n", b"\n"))


def generate_progression(core_root: Path) -> None:
    mission = core_root / "missions" / "skydock_siege.yaml"
    out_dir = ANALYSIS_ROOT / "progression"
    command = [
        sys.executable,
        "tools/py/balance_progression.py",
        "--mission",
        str(mission),
        "--out-dir",
        str(out_dir),
    ]
    run_command(command)


def write_manifest(
    outputs: Iterable[Path],
    core_root: Path,
    pack_root: Path,
    command: str,
    log_tag: str | None,
) -> dict[str, object]:
    # All stamps are repo-relative + forward-slash so the manifest is byte-stable
    # across hosts. The build commit is intentionally NOT stored: it varies every
    # commit and would break ``regen == committed`` -- provenance lives in git log.
    manifest = {
        "core_root": _repo_rel(core_root),
        "pack_root": _repo_rel(pack_root),
        "command": command,
        "log_tag": log_tag,
        "artifacts": {},
    }

    for path in outputs:
        if path.exists():
            _normalize_lf(path)  # hash the LF bytes Git actually stores
            manifest["artifacts"][_repo_rel(path)] = sha256sum(path)

    target = ANALYSIS_ROOT / "manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return manifest


def render_readme(manifest: dict[str, object]) -> str:
    command = manifest.get("command", "")
    log_tag = manifest.get("log_tag") or "(aggiungi in logs/agent_activity.md)"
    checksum_rows = ["| File | sha256 |", "| --- | --- |"]
    artifacts: dict[str, str] = manifest.get("artifacts", {})  # type: ignore[assignment]
    for path in OUTPUT_FILES:
        rel = _repo_rel(path)  # same key write_manifest stores -> no more n/d rows
        checksum = artifacts.get(rel, "n/d")
        checksum_rows.append(f"| `{rel}` | `{checksum}` |")

    lines = [
        "# Derived analysis",
        "",
        "Report derivati rigenerabili dal core e dal pack Evo Tactics.",
        "",
        "## Ultima rigenerazione",
        "",
        f"- Comando: `{command}`",
        f"- Manifest con checksum: `{ANALYSIS_ROOT / 'manifest.json'}`",
        f"- Log operativo: `logs/agent_activity.md` → `[{log_tag}]`",
        "",
        "## Output attesi",
        "",
        "- `trait_coverage_report.json`",
        "- `trait_coverage_matrix.csv`",
        "- `trait_gap_report.json`",
        "- `trait_baseline.yaml`",
        "- `trait_env_mapping.json`",
        "- `progression/skydock_siege_xp.json`",
        "- `progression/skydock_siege_xp_summary.csv`",
        "- `progression/skydock_siege_xp_profiles.csv`",
        "",
        "## Checksum (sha256)",
        "",
        *checksum_rows,
    ]

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core-root", type=Path, default=DEFAULT_CORE_ROOT)
    parser.add_argument("--pack-root", type=Path, default=DEFAULT_PACK_ROOT)
    parser.add_argument("--log-tag", default=None, help="Tag di riferimento per logs/agent_activity.md")
    parser.add_argument(
        "--update-readme",
        action="store_true",
        help="Aggiorna data/derived/analysis/README.md con checksum/command",
    )
    args = parser.parse_args()

    core_root = args.core_root.resolve()
    pack_root = args.pack_root.resolve()
    log_tag = args.log_tag

    ANALYSIS_ROOT.mkdir(parents=True, exist_ok=True)

    print("[generate] coverage trait")
    generate_trait_coverage(pack_root)

    print("[generate] progression")
    generate_progression(core_root)

    command = (
        f"python scripts/generate_derived_analysis.py --core-root {_repo_rel(core_root)} "
        f"--pack-root {_repo_rel(pack_root)}"
    )
    if log_tag:
        command += f" --log-tag {log_tag}"
    if args.update_readme:
        command += " --update-readme"

    manifest = write_manifest(OUTPUT_FILES, core_root, pack_root, command, log_tag)

    if args.update_readme:
        ANALYSIS_README.write_text(
            render_readme(manifest), encoding="utf-8", newline="\n"
        )

    print("[ok] Report analysis aggiornati in data/derived/analysis")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
