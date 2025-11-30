#!/usr/bin/env python3
"""Pipeline di rigenerazione per Evo Tactics Pack.

Esegue in sequenza:
1) sync dati core -> pack (specie, biomi, mating, telemetry);
2) derivazione suggerimenti trait ambientali;
3) aggiornamento catalogo pack;
4) build distributivo statico;
5) validatori del pack con report HTML/JSON.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


DEFAULT_CORE_ROOT = Path("data/core")
DEFAULT_PACK_ROOT = Path("packs/evo_tactics_pack")


class PipelineError(RuntimeError):
    """Errore in uno step della pipeline."""


def run_command(command: list[str], cwd: Path | None = None) -> None:
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode != 0:
        raise PipelineError(f"Comando fallito ({result.returncode}): {' '.join(command)}")


def copy_tree(source: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)


def sync_core(core_root: Path, pack_root: Path) -> None:
    mapping: dict[Path, Path] = {
        core_root / "species.yaml": pack_root / "data" / "species.yaml",
        core_root / "species": pack_root / "data" / "species",
        core_root / "biomes.yaml": pack_root / "data" / "biomes.yaml",
        core_root / "biome_aliases.yaml": pack_root / "data" / "biome_aliases.yaml",
        core_root / "telemetry.yaml": pack_root / "data" / "telemetry.yaml",
        core_root / "mating.yaml": pack_root / "data" / "mating.yaml",
    }
    for source, target in mapping.items():
        if not source.exists():
            raise PipelineError(f"Sorgente non trovata: {source}")
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            copy_tree(source, target)
        else:
            shutil.copy2(source, target)
        print(f"✔ Sync {source} -> {target}")


def derive_env_traits(pack_root: Path) -> None:
    registries_dir = pack_root / "tools" / "config" / "registries"
    species_dir = pack_root / "data" / "species"
    out_dir = pack_root / "out" / "env_traits"
    out_dir.mkdir(parents=True, exist_ok=True)

    ecosystem_dir = pack_root / "data" / "ecosystems"
    ecosystem_files = sorted(ecosystem_dir.glob("*.ecosystem.yaml"))
    if not ecosystem_files:
        raise PipelineError(f"Nessun ecosistema trovato in {ecosystem_dir}")

    for ecosystem in ecosystem_files:
        stem = ecosystem.stem.split(".")[0]
        species_candidate = species_dir / stem
        species_root = species_candidate if species_candidate.exists() else species_dir
        target_dir = out_dir / stem
        target_dir.mkdir(parents=True, exist_ok=True)
        command = [
            "python",
            str(pack_root / "tools" / "py" / "derive_env_traits_v1_0.py"),
            str(ecosystem),
            str(species_root),
            str(registries_dir),
            str(target_dir),
        ]
        run_command(command)
        print(f"✔ Derivati env_traits per {ecosystem.name} -> {target_dir}")


def update_catalog(pack_root: Path) -> None:
    run_command(["node", "scripts/update_evo_pack_catalog.js"])
    run_command(["node", "scripts/sync_evo_pack_assets.js"])


def build_dist(pack_root: Path) -> None:
    run_command(["node", "scripts/build_evo_tactics_pack_dist.mjs"])


def run_validators(pack_root: Path) -> None:
    out_dir = pack_root / "out" / "validation"
    out_dir.mkdir(parents=True, exist_ok=True)
    json_out = out_dir / "last_report.json"
    html_out = out_dir / "last_report.html"
    command = [
        "python",
        str(pack_root / "tools" / "py" / "run_all_validators.py"),
        "--json-out",
        str(json_out),
        "--html-out",
        str(html_out),
    ]
    run_command(command)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core-root", type=Path, default=DEFAULT_CORE_ROOT)
    parser.add_argument("--pack-root", type=Path, default=DEFAULT_PACK_ROOT)
    parser.add_argument(
        "--skip-build", action="store_true", help="Salta la build del distributivo"
    )
    parser.add_argument(
        "--skip-validators",
        action="store_true",
        help="Salta l'esecuzione dei validator del pack",
    )
    args = parser.parse_args()

    core_root = args.core_root.resolve()
    pack_root = args.pack_root.resolve()

    print(f"▶ Sync core -> pack ({core_root} → {pack_root})")
    sync_core(core_root, pack_root)

    print("▶ Derivazione env_traits")
    derive_env_traits(pack_root)

    print("▶ Aggiornamento catalogo pack")
    update_catalog(pack_root)

    if not args.skip_build:
        print("▶ Build distributivo pack")
        build_dist(pack_root)

    if not args.skip_validators:
        print("▶ Validator pack")
        run_validators(pack_root)

    print("✔ Pipeline completata")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
