#!/usr/bin/env python3
"""Audit curated datasets and raw incoming assets.

This script verifies that the core data files exist and expose the
expected schema surface. It also scans the incoming drop-folder for
probable duplicates (e.g. copies suffixed with ``(1)``) so the team can
triage them before integration.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Sequence

try:
    import yaml  # type: ignore
except ModuleNotFoundError as exc:  # pragma: no cover - dependency guard
    raise SystemExit("PyYAML is required to run this audit") from exc


REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class DatasetRule:
    path: Path
    fmt: str
    required_keys: Sequence[str] = ()
    schema_version: str | None = None
    version_path: Sequence[str] = ()
    dependencies: Sequence[Path] = ()
    description: str = ""

    def absolute_path(self) -> Path:
        return REPO_ROOT / self.path

    def dependency_paths(self) -> Iterable[Path]:
        for dependency in self.dependencies:
            yield REPO_ROOT / dependency


EXPECTED_DATASETS: tuple[DatasetRule, ...] = (
    DatasetRule(
        path=Path("data/derived/analysis/trait_baseline.yaml"),
        fmt="yaml",
        required_keys=("schema_version", "source", "summary", "traits"),
        schema_version="1.0",
        dependencies=(
            Path("packs/evo_tactics_pack/docs/catalog/env_traits.json"),
            Path("data/traits/index.json"),
            Path("data/core/traits/glossary.json"),
        ),
        description="Trait baseline compiled from catalog + glossary references.",
    ),
    DatasetRule(
        path=Path("data/derived/analysis/trait_coverage_report.json"),
        fmt="json",
        required_keys=("schema_version", "generated_at", "sources", "summary"),
        schema_version="1.0",
        dependencies=(
            Path("packs/evo_tactics_pack/docs/catalog/env_traits.json"),
            Path("data/traits/index.json"),
            Path("data/core/traits/glossary.json"),
            Path("packs/evo_tactics_pack/data/species"),
        ),
        description="Coverage metrics computed by ETL pipeline.",
    ),
    DatasetRule(
        path=Path("data/derived/analysis/trait_coverage_matrix.csv"),
        fmt="csv",
        required_keys=("trait_id", "label_it", "label_en", "biome"),
        dependencies=(
            Path("data/traits/index.json"),
            Path("packs/evo_tactics_pack/data/species"),
        ),
        description="Flattened matrix backing dashboard exports.",
    ),
    DatasetRule(
        path=Path("data/derived/analysis/trait_env_mapping.json"),
        fmt="json",
        required_keys=("environment_only", "pi_traits"),
        description="Crosswalk between environment-driven and PI traits.",
    ),
    DatasetRule(
        path=Path("data/derived/analysis/trait_gap_report.json"),
        fmt="json",
        required_keys=("schema_version", "generated_at", "sources", "summary"),
        schema_version="1.0",
        description="Gap analysis comparing ETL and reference registries.",
    ),
    DatasetRule(
        path=Path("data/core/traits/glossary.json"),
        fmt="json",
        required_keys=("schema_version", "updated_at", "sources", "traits"),
        schema_version="1.0",
        description="Canonical PI trait glossary consumed by tooling.",
    ),
    DatasetRule(
        path=Path("data/core/traits/biome_pools.json"),
        fmt="json",
        required_keys=("schema_version", "pools"),
        schema_version="1.0",
        description="Biome trait pools used for synthetic biomes.",
    ),
    DatasetRule(
        path=Path("data/packs.yaml"),
        fmt="yaml",
        required_keys=("pi_shop", "random_general_d20", "forms"),
        description="Pack tables for MBTI forms and PI shop economy.",
    ),
    DatasetRule(
        path=Path("data/core/species.yaml"),
        fmt="yaml",
        required_keys=("catalog",),
        description="Slot catalog + synergies for species builder.",
    ),
    DatasetRule(
        path=Path("data/core/biomes.yaml"),
        fmt="yaml",
        required_keys=("biomes",),
        description="Canonical biome definitions and hazard knobs.",
    ),
    DatasetRule(
        path=Path("data/core/biome_aliases.yaml"),
        fmt="yaml",
        required_keys=("aliases",),
        description="Legacy biome alias resolution table.",
    ),
    DatasetRule(
        path=Path("data/core/mating.yaml"),
        fmt="yaml",
        required_keys=("compat_forme",),
        description="Forma compatibility matrix for matchmaking.",
    ),
    DatasetRule(
        path=Path("data/core/game_functions.yaml"),
        fmt="yaml",
        required_keys=("functions",),
        description="Idea Intake functional taxonomy.",
    ),
    DatasetRule(
        path=Path("data/core/telemetry.yaml"),
        fmt="yaml",
        required_keys=("telemetry", "indices", "telemetry_targets"),
        description="Telemetry weights and PE economy knobs.",
    ),
    DatasetRule(
        path=Path("data/core/hud/layout.yaml"),
        fmt="yaml",
        required_keys=("version", "overlays"),
        version_path=("version",),
        description="HUD overlay layout for smart alerts.",
    ),
    DatasetRule(
        path=Path("data/core/missions/skydock_siege.yaml"),
        fmt="yaml",
        required_keys=("skydock_siege",),
        version_path=("skydock_siege", "revision"),
        description="Mission tuning log derived from telemetry.",
    ),
    DatasetRule(
        path=Path("data/external/pathfinder_bestiary_1e.json"),
        fmt="json",
        required_keys=("meta", "creatures"),
        version_path=("meta", "source"),
        dependencies=(Path("incoming/pathfinder/bestiary1e_index.csv"),),
        description="Normalized Pathfinder SRD statblocks.",
    ),
    DatasetRule(
        path=Path("data/external/auto_external_sources.yaml"),
        fmt="yaml",
        required_keys=("sources",),
        description="Manifest of auxiliary fetchable sources.",
    ),
    DatasetRule(
        path=Path("data/external/chatgpt_sources.yaml"),
        fmt="yaml",
        required_keys=("sources",),
        description="ChatGPT sync configuration.",
    ),
    DatasetRule(
        path=Path("data/external/drive/approved_assets.json"),
        fmt="json",
        required_keys=("version", "generatedAt", "summary", "assets"),
        schema_version=None,
        description="Drive sync manifest for approved assets.",
    ),
    DatasetRule(
        path=Path("packs/evo_tactics_pack/data/core/species.yaml"),
        fmt="yaml",
        required_keys=("meta", "global_rules"),
        version_path=("meta", "version"),
        description="Pack-level species catalog meta + global rules.",
    ),
    DatasetRule(
        path=Path("data/traits/index.json"),
        fmt="json",
        required_keys=("schema_version", "trait_glossary", "traits"),
        schema_version="2.0",
        description="Authoritative trait registry for the pack.",
    ),
    DatasetRule(
        path=Path("packs/evo_tactics_pack/docs/catalog/trait_glossary.json"),
        fmt="json",
        required_keys=("schema_version", "updated_at", "traits"),
        schema_version="1.0",
        description="Localized trait glossary distributed with the pack.",
    ),
    DatasetRule(
        path=Path("packs/evo_tactics_pack/docs/catalog/env_traits.json"),
        fmt="json",
        required_keys=("schema_version", "trait_glossary", "rules"),
        schema_version="1.0",
        description="Biome/trait recommendation rules for the pack.",
    ),
    DatasetRule(
        path=Path("packs/evo_tactics_pack/docs/catalog/catalog_data.json"),
        fmt="json",
        required_keys=("generated_at", "ecosistema"),
        description="Bundle summary for Evo Tactics ecosystem pack.",
    ),
    DatasetRule(
        path=Path("incoming/pathfinder/bestiary1e_index.csv"),
        fmt="csv",
        required_keys=("name", "type", "environment_tags"),
        description="Source index for Pathfinder bestiary ETL.",
    ),
)


def load_structured(path: Path, fmt: str):
    with path.open("r", encoding="utf-8") as handle:
        if fmt == "json":
            return json.load(handle)
        if fmt == "yaml":
            return yaml.safe_load(handle)
        if fmt == "csv":
            reader = csv.reader(handle)
            try:
                header = next(reader)
            except StopIteration:
                return []
            return header
    raise ValueError(f"Unsupported format: {fmt}")


def get_nested(mapping, keys: Sequence[str]):
    value = mapping
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return None
    return value


def audit_dataset(rule: DatasetRule) -> tuple[list[str], dict]:
    issues: list[str] = []
    path = rule.absolute_path()
    status = "ok"
    summary: dict = {
        "path": str(rule.path),
        "format": rule.fmt,
        "description": rule.description,
        "expected_schema": rule.schema_version,
        "dependencies": [str(dep) for dep in rule.dependencies],
        "issues": issues,
    }
    detected_schema: str | None = None
    detected_version: str | None = None
    if not path.exists():
        issues.append(f"Missing file: {rule.path}")
        status = "missing"
        summary["status"] = status
        return issues, summary

    try:
        data = load_structured(path, rule.fmt)
    except Exception as exc:  # pragma: no cover - runtime guard
        issues.append(f"{rule.path}: failed to parse ({exc})")
        status = "error"
        summary["status"] = status
        return issues, summary

    if rule.fmt in {"json", "yaml"}:
        if not isinstance(data, dict):
            issues.append(f"{rule.path}: expected mapping, found {type(data).__name__}")
        else:
            for key in rule.required_keys:
                if key not in data:
                    issues.append(f"{rule.path}: missing key '{key}'")
            if rule.schema_version is not None:
                detected_schema = data.get("schema_version")
                if detected_schema != rule.schema_version:
                    issues.append(
                        f"{rule.path}: schema_version={detected_schema!r}, expected {rule.schema_version!r}"
                    )
            else:
                detected_schema = data.get("schema_version")
            if rule.version_path:
                found = get_nested(data, rule.version_path)
                if found in (None, ""):
                    pretty = ".".join(rule.version_path)
                    issues.append(f"{rule.path}: missing version info at '{pretty}'")
                else:
                    detected_version = str(found)
    elif rule.fmt == "csv":
        header = data
        expected_columns = set(rule.required_keys)
        actual_columns = set(header)
        missing = expected_columns - actual_columns
        if missing:
            issues.append(
                f"{rule.path}: missing CSV columns {', '.join(sorted(missing))}"
            )
    else:
        issues.append(f"{rule.path}: unsupported format '{rule.fmt}'")

    for dependency in rule.dependency_paths():
        if not dependency.exists():
            issues.append(
                f"{rule.path}: dependency missing → {dependency.relative_to(REPO_ROOT)}"
            )

    if issues:
        if status == "ok":
            status = "error"
    summary["status"] = status
    if detected_schema is not None:
        summary["detected_schema"] = detected_schema
    if detected_version is not None:
        summary["detected_version"] = detected_version
    summary["issues"] = list(issues)
    return issues, summary


DUPLICATE_STRIP_RE = re.compile(r"\s*\(\d+\)$")


def canonical_filename(path: Path) -> str:
    stem = DUPLICATE_STRIP_RE.sub("", path.stem)
    return f"{stem.lower()}{path.suffix.lower()}"


def find_duplicates(folders: Iterable[Path]) -> dict[str, list[Path]]:
    collisions: dict[str, list[Path]] = {}
    for folder in folders:
        if not folder.exists():
            continue
        for candidate in folder.rglob("*"):
            if candidate.is_file():
                key = canonical_filename(candidate)
                collisions.setdefault(key, []).append(candidate)
    return {key: paths for key, paths in collisions.items() if len(paths) > 1}


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--incoming", action="store_true", help="Check incoming/ for duplicate payloads"
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Write a JSON summary of the audit to the specified path",
    )
    args = parser.parse_args(argv)

    problems: list[str] = []
    dataset_summaries: list[dict] = []
    for rule in EXPECTED_DATASETS:
        issues, summary = audit_dataset(rule)
        problems.extend(issues)
        dataset_summaries.append(summary)

    duplicate_entries: list[dict] = []
    if args.incoming:
        duplicates = find_duplicates([REPO_ROOT / "incoming"])
        for key, paths in sorted(duplicates.items()):
            formatted = ", ".join(str(path.relative_to(REPO_ROOT)) for path in paths)
            problems.append(f"Duplicate candidate '{key}': {formatted}")
            duplicate_entries.append(
                {
                    "key": key,
                    "paths": [str(path.relative_to(REPO_ROOT)) for path in paths],
                }
            )

    if args.report:
        report_payload = {
            "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            "status": "ok" if not problems else "error",
            "datasets": dataset_summaries,
        }
        if args.incoming:
            report_payload["incoming_duplicates"] = duplicate_entries
        report_path = args.report
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps(report_payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    if problems:
        print("Data health issues detected:", file=sys.stderr)
        for issue in problems:
            print(f" - {issue}", file=sys.stderr)
        return 1

    print("All dataset checks passed.")
    if args.incoming:
        print("No duplicate candidates detected in incoming/.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
