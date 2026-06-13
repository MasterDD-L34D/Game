#!/usr/bin/env python3
"""Pipeline di rigenerazione per Evo Tactics Pack.

Sequenza predefinita allineata a `docs/planning/REF_TOOLING_AND_CI.md`:

1) sync dati core -> pack (specie, biomi, mating, telemetry);
2) derivazione suggerimenti trait ambientali e cross-biome;
3) aggiornamento catalogo pack;
4) build distributivo statico (preview dist);
5) validatori del pack con report HTML/JSON;
6) generatori deterministici dei derived opzionali (analysis, minimal fixture);
7) log operativi opzionali per `logs/agent_activity.md`.
"""

from __future__ import annotations

import argparse
import os
import hashlib
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_CORE_ROOT = Path("data/core")
DEFAULT_PACK_ROOT = Path("packs/evo_tactics_pack")
REPO_ROOT = Path(__file__).resolve().parent.parent


class PipelineError(RuntimeError):
    """Errore in uno step della pipeline."""


def run_command(command: list[str], cwd: Path | None = None) -> None:
    print(f"$ {' '.join(str(part) for part in command)}")
    env = dict(os.environ)
    env.setdefault("PYTHONHASHSEED", "0")
    result = subprocess.run(command, cwd=cwd, check=False, env=env)
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
    out_dir = pack_root / "out" / "patches"
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
        run_command(command, cwd=REPO_ROOT)
        print(f"✔ Derivati env_traits per {ecosystem.name} -> {target_dir}")


def derive_crossbiome_traits(pack_root: Path) -> None:
    network = pack_root / "data" / "ecosystems" / "network" / "meta_network_alpha.yaml"
    if not network.exists():
        raise PipelineError(f"Network meta mancante: {network}")

    out_dir = pack_root / "out" / "patches" / "network"
    out_dir.mkdir(parents=True, exist_ok=True)

    command = [
        "python",
        str(pack_root / "tools" / "py" / "derive_crossbiome_traits_v1_0.py"),
        str(network),
        str(out_dir),
    ]
    run_command(command, cwd=REPO_ROOT)
    print(f"✔ Patch cross-biome generate in {out_dir}")


def update_catalog(pack_root: Path) -> None:
    run_command(["node", "scripts/update_evo_pack_catalog.js", "--pack-root", str(pack_root)], cwd=REPO_ROOT)
    run_command(["node", "scripts/sync_evo_pack_assets.js", "--pack-root", str(pack_root)], cwd=REPO_ROOT)


def build_dist(pack_root: Path) -> None:
    run_command(["node", "scripts/build_evo_tactics_pack_dist.mjs", "--pack-root", str(pack_root)], cwd=REPO_ROOT)


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
    run_command(command, cwd=REPO_ROOT)


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _snapshot_tree(root: Path) -> tuple[str, list[str]]:
    entries: list[str] = []
    for file_path in sorted(root.rglob("*")):
        if file_path.is_file():
            rel = file_path.relative_to(root)
            entries.append(f"{_hash_file(file_path)}  {rel}")
    digest = hashlib.sha256("\n".join(entries).encode("utf-8")).hexdigest()
    return digest, entries


def _write_catalog_checksums(pack_root: Path) -> tuple[str, Path]:
    catalog_root = pack_root / "docs" / "catalog"
    if not catalog_root.exists():
        raise PipelineError(f"Catalogo non trovato: {catalog_root}")

    checksum, entries = _snapshot_tree(catalog_root)
    manifest_dir = pack_root / "out" / "catalog"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / "catalog_checksums.sha256"

    header = [
        "# catalog/asset sha256 manifest",
        f"timestamp: {datetime.now(timezone.utc).isoformat()}",
        f"pack_root: {pack_root}",
        f"catalog_root: {catalog_root}",
        f"git_commit: {_git_rev()}",
        f"catalog_checksum: {checksum}",
        "",
    ]

    manifest_path.write_text("\n".join(header + entries) + "\n", encoding="utf-8")
    print(f"✔ Manifest cataloghi/asset scritto in {manifest_path}")
    return checksum, manifest_path


def _git_rev() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return "UNKNOWN"
    return result.stdout.strip()


def sync_core_with_report(core_root: Path, pack_root: Path) -> Path:
    print("▶ Sync core -> pack (post-validator)")
    sync_core(core_root, pack_root)

    data_root = pack_root / "data"
    checksum, entries = _snapshot_tree(data_root)

    out_dir = pack_root / "out" / "validation"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / "core_sync.sha256"

    header = [
        "# core → pack sync manifest",
        f"timestamp: {datetime.now(timezone.utc).isoformat()}",
        f"core_root: {core_root}",
        f"pack_root: {pack_root}",
        f"git_commit: {_git_rev()}",
        f"data_checksum: {checksum}",
        "",
    ]
    report_path.write_text("\n".join(header + entries) + "\n", encoding="utf-8")

    print(f"✔ Sync core -> pack completato ({report_path})")
    return report_path


def generate_analysis(core_root: Path, pack_root: Path) -> None:
    run_command(
        [
            "python",
            "scripts/generate_derived_analysis.py",
            "--core-root",
            str(core_root),
            "--pack-root",
            str(pack_root),
            "--update-readme",
        ],
        cwd=REPO_ROOT,
    )


def generate_minimal_fixture() -> None:
    run_command(
        [
            "python",
            "scripts/generate_minimal_fixture.py",
            "--root",
            str(Path("data/derived/test-fixtures/minimal")),
            "--update-readme",
        ],
        cwd=REPO_ROOT,
    )


def append_activity_log(
    log_path: Path,
    tag: str,
    core_root: Path,
    pack_root: Path,
    steps: list[str],
    checksums: dict[str, str] | None = None,
) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    header = f"## {timestamp} – Pipeline pack/derived (dev-tooling)"
    note_parts = list(steps)
    if checksums:
        checksum_str = ", ".join(f"{key}={value}" for key, value in checksums.items())
        note_parts.append(f"checksums: {checksum_str}")
    note = "; ".join(note_parts)
    body = (
        f"- Step: `[{tag}] owner=dev-tooling (approvatore Master DD); "
        f"core_root={core_root}; pack_root={pack_root}; rischio=medio (rigenerazione pack/derived); "
        f"note={note}; refs=docs/planning/REF_TOOLING_AND_CI.md`"
    )

    payload = f"{header}\n{body}\n"
    existing = log_path.read_text(encoding="utf-8") if log_path.exists() else "# Agent activity log\n\n"
    if existing.endswith("\n"):
        updated = existing + payload + "\n"
    else:
        updated = existing + "\n" + payload + "\n"
    log_path.write_text(updated, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core-root", type=Path, default=DEFAULT_CORE_ROOT)
    parser.add_argument("--pack-root", type=Path, default=DEFAULT_PACK_ROOT)
    parser.add_argument(
        "--skip-build", action="store_true", help="Salta la build del distributivo"
    )
    parser.add_argument(
        "--skip-env", action="store_true", help="Salta la derivazione env traits"
    )
    parser.add_argument(
        "--skip-cross", action="store_true", help="Salta la derivazione cross-biome"
    )
    parser.add_argument(
        "--skip-validators",
        action="store_true",
        help="Salta l'esecuzione dei validator del pack",
    )
    parser.add_argument(
        "--sync-validate-only",
        action="store_true",
        help="Esegui solo sync core→pack e validator (più sync post-validator)",
    )
    parser.add_argument(
        "--with-analysis",
        action="store_true",
        help="Rigenera i derived di analysis (coverage/progression) con README",
    )
    parser.add_argument(
        "--with-minimal-fixture",
        action="store_true",
        help="Rigenera la fixture deterministica minimal con manifest/README",
    )
    parser.add_argument(
        "--log-activity",
        action="store_true",
        help="Appende un entry standard a logs/agent_activity.md",
    )
    parser.add_argument(
        "--log-tag",
        default=None,
        help="Tag da usare nell'entry di logs/agent_activity.md (default auto)",
    )
    args = parser.parse_args()

    core_root = args.core_root.resolve()
    pack_root = args.pack_root.resolve()
    tag = args.log_tag or f"PIPELINE-EVO-PACK-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"

    executed_steps: list[str] = []
    checksums: dict[str, str] = {}

    if args.sync_validate_only:
        args.skip_env = True
        args.skip_cross = True
        args.skip_build = True
        args.with_analysis = False
        args.with_minimal_fixture = False

    print(f"▶ Sync core -> pack ({core_root} → {pack_root})")
    sync_core(core_root, pack_root)
    executed_steps.append("sync core→pack (species/biomes/mating/telemetry)")

    if not args.skip_env:
        print("▶ Derivazione env_traits")
        derive_env_traits(pack_root)
        executed_steps.append("derive env traits")

    if not args.skip_cross:
        print("▶ Derivazione cross-biome")
        derive_crossbiome_traits(pack_root)
        executed_steps.append("derive cross-biome")

    if not args.sync_validate_only:
        print("▶ Aggiornamento catalogo pack")
        update_catalog(pack_root)
        executed_steps.append("cataloghi pack")

        catalog_checksum, manifest_path = _write_catalog_checksums(pack_root)
        executed_steps.append("manifest checksum cataloghi/asset")
        checksums["catalog+asset"] = f"{catalog_checksum} (manifest={manifest_path})"

    if not args.skip_build:
        print("▶ Build distributivo pack")
        build_dist(pack_root)
        executed_steps.append("build dist pack")

    if not args.skip_validators:
        print("▶ Validator pack")
        run_validators(pack_root)
        executed_steps.append("validator pack")

        sync_core_with_report(core_root, pack_root)
        executed_steps.append("sync core→pack post-validator (manifest sha256)")

    if args.with_analysis:
        print("▶ Derived analysis (coverage/progression)")
        generate_analysis(core_root, pack_root)
        executed_steps.append("derived analysis")

    if args.with_minimal_fixture:
        print("▶ Fixture di test minimal")
        generate_minimal_fixture()
        executed_steps.append("fixture minimal deterministica")

    if args.log_activity:
        print("▶ Log operativo")
        append_activity_log(
            REPO_ROOT / "logs" / "agent_activity.md",
            tag,
            core_root,
            pack_root,
            executed_steps,
            checksums,
        )

    print("✔ Pipeline completata")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
