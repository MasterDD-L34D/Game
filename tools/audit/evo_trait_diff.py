#!/usr/bin/env python3
"""Audit tool per confrontare i trait Evo esterni con l'indice legacy."""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

try:
    import matplotlib.pyplot as plt
except ImportError as exc:  # pragma: no cover - dependency guard
    raise SystemExit(
        "matplotlib è richiesto per generare i grafici. "
        "Installa le dipendenze con `pip install -r requirements-dev.txt`."
    ) from exc

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTERNAL_TRAITS_DIR = REPO_ROOT / "data" / "external" / "evo" / "traits"
LEGACY_INDEX_PATH = REPO_ROOT / "data" / "traits" / "index.json"
DUPLICATES_REPORT = REPO_ROOT / "reports" / "traits" / "duplicates.csv"
MERGE_ANALYSIS_REPORT = REPO_ROOT / "reports" / "traits" / "merge_analysis.md"
OUTPUT_DIR = REPO_ROOT / "reports" / "evo" / "rollout"
NORMALIZED_OUTPUT = OUTPUT_DIR / "traits_normalized.csv"
DIFF_OUTPUT = OUTPUT_DIR / "traits_gap.csv"
GRAPH_OUTPUT = OUTPUT_DIR / "traits_gap.svg"

ENV_KEYS = ("biome_class", "biome_subclass", "environment")
LEGACY_DATA_ORIGINS = {"pathfinder_dataset", "controllo_psionico"}
TRAIT_CODE_PATTERN = re.compile(r"^TR-\d{4}$")


def slugify(value: str) -> str:
    """Crea uno slug normalizzato in minuscolo compatibile con gli ID trait."""
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_value).strip("_")
    return cleaned.lower()


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@dataclass
class TraitRecord:
    source: str
    slug: str
    label: str
    tier: Optional[str]
    legacy_flag: bool
    env_biomes: Tuple[str, ...]
    sinergie: Tuple[str, ...]
    trait_code: Optional[str] = None
    raw_synergy_refs: Tuple[str, ...] = tuple()
    data_origin: Optional[str] = None

    def to_row(self) -> Dict[str, str]:
        return {
            "source": self.source,
            "slug": self.slug,
            "trait_code": self.trait_code or "",
            "label": self.label,
            "tier": self.tier or "",
            "legacy_flag": "1" if self.legacy_flag else "0",
            "data_origin": self.data_origin or "",
            "sinergie": ";".join(self.sinergie),
            "env_biomes": ";".join(self.env_biomes),
        }


def extract_env_biomes(requirements: Sequence[dict]) -> Tuple[str, ...]:
    values = set()
    for requirement in requirements or []:
        condizioni = requirement.get("condizioni") or {}
        for key in ENV_KEYS:
            raw = condizioni.get(key)
            if isinstance(raw, str) and raw.strip():
                values.add(raw.strip())
    return tuple(sorted(values))


def load_external_traits(directory: Path) -> Tuple[List[TraitRecord], Dict[str, str]]:
    records: List[TraitRecord] = []
    code_to_slug: Dict[str, str] = {}
    seen_slugs: set[str] = set()

    def add_record(payload: dict, default_code: str) -> None:
        label = (payload.get("label") or "").strip()
        trait_code = payload.get("trait_code") or payload.get("id") or default_code
        slug_source: Optional[str]
        if trait_code and not TRAIT_CODE_PATTERN.match(trait_code):
            slug_source = trait_code
        elif payload.get("id"):
            slug_source = str(payload["id"])
        elif label:
            slug_source = label
        else:
            slug_source = trait_code
        slug = slugify(slug_source)
        if slug in seen_slugs:
            return
        seen_slugs.add(slug)
        code_to_slug[trait_code] = slug
        tier = payload.get("tier")
        requirements = payload.get("requisiti_ambientali") or []
        env_biomes = extract_env_biomes(requirements)
        sinergie_refs = tuple(
            code for code in (payload.get("sinergie") or []) if isinstance(code, str) and code.strip()
        )
        legacy_flag = False
        versioning = payload.get("versioning") or {}
        if isinstance(versioning, dict):
            status = str(versioning.get("status") or "").lower().strip()
            legacy_flag = status == "legacy" or bool(versioning.get("legacy"))
        record = TraitRecord(
            source="external_evo",
            slug=slug,
            label=label,
            tier=tier,
            legacy_flag=legacy_flag,
            env_biomes=env_biomes,
            sinergie=tuple(),  # placeholder until conversion
            trait_code=trait_code,
            raw_synergy_refs=sinergie_refs,
        )
        records.append(record)

    for path in sorted(directory.glob("*.json")):
        data = load_json(path)
        if isinstance(data, dict) and isinstance(data.get("traits"), list):
            for entry in data["traits"]:
                if isinstance(entry, dict):
                    add_record(entry, path.stem)
        elif isinstance(data, dict):
            add_record(data, path.stem)

    for record in records:
        converted: List[str] = []
        for ref in record.raw_synergy_refs:
            converted_slug = code_to_slug.get(ref)
            if converted_slug:
                converted.append(converted_slug)
            else:
                converted.append(slugify(ref))
        record.sinergie = tuple(sorted(dict.fromkeys(converted)))

    return records, code_to_slug


def load_legacy_traits(path: Path) -> List[TraitRecord]:
    data = load_json(path)
    traits = data.get("traits") or {}
    records: List[TraitRecord] = []
    for slug, payload in traits.items():
        if not isinstance(payload, dict):
            continue
        label = (payload.get("label") or "").strip()
        tier = payload.get("tier")
        requirements = payload.get("requisiti_ambientali") or []
        env_biomes = extract_env_biomes(requirements)
        sinergie = tuple(
            slugify(ref) for ref in (payload.get("sinergie") or []) if isinstance(ref, str) and ref.strip()
        )
        data_origin = payload.get("data_origin")
        normalized_origin = (data_origin or "").strip().lower()
        legacy_flag = bool(normalized_origin and normalized_origin in LEGACY_DATA_ORIGINS)
        record = TraitRecord(
            source="legacy_index",
            slug=slug,
            label=label,
            tier=tier,
            legacy_flag=legacy_flag,
            env_biomes=env_biomes,
            sinergie=tuple(sorted(dict.fromkeys(sinergie))),
            data_origin=data_origin,
        )
        records.append(record)
    return records


def read_duplicates(path: Path) -> Dict[str, dict]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return {row.get("label_key", ""): row for row in reader if row.get("label_key")}


MERGE_CODE_PATTERN = re.compile(r"TR-\d{4}")


def read_merge_conflicts(path: Path) -> Dict[str, set]:
    if not path.exists():
        return {"trait_codes": set(), "slugs": set()}
    content = path.read_text(encoding="utf-8")
    codes = set(MERGE_CODE_PATTERN.findall(content))
    slugs = {slugify(code) for code in codes}
    return {"trait_codes": codes, "slugs": slugs}


@dataclass
class DiffRow:
    slug: str
    status: str
    name_mismatch: bool = False
    tier_mismatch: bool = False
    synergy_mismatch: bool = False
    env_mismatch: bool = False
    legacy_flag_mismatch: bool = False
    external_code: str = ""
    external_label: str = ""
    external_tier: str = ""
    external_synergies: str = ""
    external_envs: str = ""
    legacy_label: str = ""
    legacy_tier: str = ""
    legacy_synergies: str = ""
    legacy_envs: str = ""
    duplicate_flag: bool = False
    merge_conflict_flag: bool = False

    def to_row(self) -> Dict[str, str]:
        return {
            "slug": self.slug,
            "status": self.status,
            "name_mismatch": "1" if self.name_mismatch else "0",
            "tier_mismatch": "1" if self.tier_mismatch else "0",
            "synergy_mismatch": "1" if self.synergy_mismatch else "0",
            "env_mismatch": "1" if self.env_mismatch else "0",
            "legacy_flag_mismatch": "1" if self.legacy_flag_mismatch else "0",
            "external_code": self.external_code,
            "external_label": self.external_label,
            "external_tier": self.external_tier,
            "external_synergies": self.external_synergies,
            "external_envs": self.external_envs,
            "legacy_label": self.legacy_label,
            "legacy_tier": self.legacy_tier,
            "legacy_synergies": self.legacy_synergies,
            "legacy_envs": self.legacy_envs,
            "duplicate_flag": "1" if self.duplicate_flag else "0",
            "merge_conflict_flag": "1" if self.merge_conflict_flag else "0",
        }


def compare_traits(
    external_traits: Sequence[TraitRecord],
    legacy_traits: Sequence[TraitRecord],
    duplicates: Dict[str, dict],
    merge_conflicts: Dict[str, set],
) -> List[DiffRow]:
    external_by_slug = {record.slug: record for record in external_traits}
    legacy_by_slug = {record.slug: record for record in legacy_traits}
    all_slugs = sorted(set(external_by_slug) | set(legacy_by_slug))

    rows: List[DiffRow] = []
    for slug in all_slugs:
        ext = external_by_slug.get(slug)
        legacy = legacy_by_slug.get(slug)
        duplicate_flag = slug in duplicates
        merge_flag = False
        if ext:
            merge_flag = (
                ext.trait_code in merge_conflicts["trait_codes"]
                or slug in merge_conflicts["slugs"]
            )
        elif slug in merge_conflicts["slugs"]:
            merge_flag = True

        if ext and legacy:
            name_mismatch = bool(ext.label and legacy.label and ext.label != legacy.label)
            tier_mismatch = (ext.tier or "") != (legacy.tier or "")
            synergy_mismatch = set(ext.sinergie) != set(legacy.sinergie)
            env_mismatch = set(ext.env_biomes) != set(legacy.env_biomes)
            legacy_flag_mismatch = ext.legacy_flag != legacy.legacy_flag
            status = "match"
            if any([name_mismatch, tier_mismatch, synergy_mismatch, env_mismatch, legacy_flag_mismatch]):
                status = "mismatch"
            row = DiffRow(
                slug=slug,
                status=status,
                name_mismatch=name_mismatch,
                tier_mismatch=tier_mismatch,
                synergy_mismatch=synergy_mismatch,
                env_mismatch=env_mismatch,
                legacy_flag_mismatch=legacy_flag_mismatch,
                external_code=ext.trait_code or "",
                external_label=ext.label,
                external_tier=ext.tier or "",
                external_synergies=";".join(ext.sinergie),
                external_envs=";".join(ext.env_biomes),
                legacy_label=legacy.label,
                legacy_tier=legacy.tier or "",
                legacy_synergies=";".join(legacy.sinergie),
                legacy_envs=";".join(legacy.env_biomes),
                duplicate_flag=duplicate_flag,
                merge_conflict_flag=merge_flag,
            )
        elif ext and not legacy:
            row = DiffRow(
                slug=slug,
                status="missing_in_index",
                external_code=ext.trait_code or "",
                external_label=ext.label,
                external_tier=ext.tier or "",
                external_synergies=";".join(ext.sinergie),
                external_envs=";".join(ext.env_biomes),
                duplicate_flag=duplicate_flag,
                merge_conflict_flag=merge_flag,
            )
        else:
            row = DiffRow(
                slug=slug,
                status="missing_in_external",
                legacy_label=legacy.label if legacy else "",
                legacy_tier=(legacy.tier or "") if legacy else "",
                legacy_synergies=";".join(legacy.sinergie) if legacy else "",
                legacy_envs=";".join(legacy.env_biomes) if legacy else "",
                duplicate_flag=duplicate_flag,
                merge_conflict_flag=merge_flag,
            )
        rows.append(row)
    return rows


def write_csv(path: Path, rows: Iterable[Dict[str, str]], fieldnames: Sequence[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def build_graph(diff_rows: Sequence[DiffRow], output_path: Path) -> None:
    status_counts = Counter(row.status for row in diff_rows)
    mismatch_keys = [
        "name_mismatch",
        "tier_mismatch",
        "synergy_mismatch",
        "env_mismatch",
        "legacy_flag_mismatch",
    ]
    mismatch_counts = Counter()
    for row in diff_rows:
        if row.status == "mismatch":
            for key in mismatch_keys:
                if getattr(row, key):
                    mismatch_counts[key] += 1

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    statuses = list(status_counts.keys()) or ["no_data"]
    status_values = [status_counts[key] for key in statuses]
    x_positions = range(len(statuses))
    axes[0].bar(x_positions, status_values, color="#005f73")
    axes[0].set_title("Stato confronto trait")
    axes[0].set_ylabel("Numero trait")
    axes[0].set_xticks(list(x_positions))
    axes[0].set_xticklabels(statuses, rotation=20, ha="right")

    mismatch_labels = [label.replace("_", "\n") for label in mismatch_keys]
    mismatch_values = [mismatch_counts.get(key, 0) for key in mismatch_keys]
    axes[1].bar(mismatch_labels, mismatch_values, color="#ee9b00")
    axes[1].set_title("Mismatch per attributo")
    axes[1].set_ylabel("Numero trait")

    fig.suptitle("Differenze indice legacy vs pacchetto Evo", fontsize=14)
    fig.tight_layout(rect=[0, 0.03, 1, 0.95])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    save_kwargs = {}
    suffix = output_path.suffix.lower()
    if suffix in {".svg", ".pdf"}:
        save_kwargs["format"] = suffix.lstrip(".")
    else:
        save_kwargs["dpi"] = 200

    fig.savefig(output_path, **save_kwargs)
    plt.close(fig)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--external",
        type=Path,
        default=EXTERNAL_TRAITS_DIR,
        help="Directory contenente i trait del pacchetto Evo",
    )
    parser.add_argument(
        "--index",
        type=Path,
        default=LEGACY_INDEX_PATH,
        help="Percorso dell'indice legacy (data/traits/index.json)",
    )
    parser.add_argument(
        "--normalized-output",
        type=Path,
        default=NORMALIZED_OUTPUT,
        help="Percorso file CSV per l'estratto normalizzato",
    )
    parser.add_argument(
        "--diff-output",
        type=Path,
        default=DIFF_OUTPUT,
        help="Percorso file CSV per il confronto",
    )
    parser.add_argument(
        "--graph-output",
        type=Path,
        default=GRAPH_OUTPUT,
        help="Percorso del grafico riepilogativo (SVG di default)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    external_traits, _ = load_external_traits(args.external)
    legacy_traits = load_legacy_traits(args.index)
    duplicates = read_duplicates(DUPLICATES_REPORT)
    merge_conflicts = read_merge_conflicts(MERGE_ANALYSIS_REPORT)

    normalized_rows = [record.to_row() for record in external_traits + legacy_traits]
    write_csv(
        args.normalized_output,
        normalized_rows,
        fieldnames=[
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
    )

    diff_rows = compare_traits(external_traits, legacy_traits, duplicates, merge_conflicts)
    write_csv(
        args.diff_output,
        [row.to_row() for row in diff_rows],
        fieldnames=[
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
    )

    build_graph(diff_rows, args.graph_output)

    print(f"Estratto normalizzato salvato in: {args.normalized_output.relative_to(REPO_ROOT)}")
    print(f"Confronto salvato in: {args.diff_output.relative_to(REPO_ROOT)}")
    print(f"Grafico salvato in: {args.graph_output.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
