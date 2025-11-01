#!/usr/bin/env python3
"""Generate draft trait files from external appendices and YAML drops.

The importer converts the curated notes stored in ``appendici/*.txt`` and the
incoming ``sensienti_traits_v0.1.yaml`` manifest into JSON stubs located in
``data/traits/_drafts``. Each stub follows the canonical trait schema so the
team can iterate on the content without breaking validation tooling.

Usage example::

    python tools/py/import_external_traits.py \
        --appendix-dir appendici \
        --incoming incoming/sensienti_traits_v0.1.yaml \
        --output-dir data/traits/_drafts

Re-running the command wipes previously generated files inside the target
folder to keep the drafts deterministic.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_APPENDIX_DIR = REPO_ROOT / "appendici"
DEFAULT_INCOMING_PATH = REPO_ROOT / "incoming" / "sensienti_traits_v0.1.yaml"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "data" / "traits" / "_drafts"
TRAIT_INDEX_PATH = REPO_ROOT / "data" / "traits" / "index.json"


@dataclass(frozen=True)
class TraitSeed:
    """Canonical representation of a draft trait extracted from external sources."""

    trait_id: str
    label: str
    tier: str
    description: str
    usage: str
    impetus: str
    data_origin: str


def slugify(value: str) -> str:
    """Create a normalized slug similar to the catalog ID conventions."""

    normalized = unicodedata.normalize("NFKD", value)
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = without_marks.lower()
    replaced = "".join(ch if ch.isalnum() else "_" for ch in lowered)
    while "__" in replaced:
        replaced = replaced.replace("__", "_")
    return replaced.strip("_")


def load_existing_trait_ids() -> set[str]:
    if not TRAIT_INDEX_PATH.exists():
        return set()
    try:
        payload = json.loads(TRAIT_INDEX_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set()
    traits = payload.get("traits", {})
    if not isinstance(traits, dict):
        return set()
    return set(traits)


def parse_front_matter(path: Path) -> Tuple[Dict[str, object], Sequence[str]]:
    """Extract YAML front matter metadata and the remaining body lines."""

    raw_lines = path.read_text(encoding="utf-8").splitlines()
    if not raw_lines or raw_lines[0].strip() != "---":
        return {}, raw_lines

    body_start = None
    for idx in range(1, len(raw_lines)):
        if raw_lines[idx].strip() == "---":
            body_start = idx + 1
            break

    if body_start is None:
        return {}, raw_lines

    metadata_block = "\n".join(raw_lines[1 : body_start - 1])
    metadata = yaml.safe_load(metadata_block) if metadata_block.strip() else {}
    return metadata or {}, raw_lines[body_start:]


APPENDIX_LINE_RE = re.compile(r"^- \*\*(?P<header>[^*]+)\*\*:\s*(?P<body>.+)$")
TIER_RE = re.compile(r"tier\s*(?P<value>[0-9])", flags=re.IGNORECASE)


def extract_names(body: str) -> List[str]:
    """Return probable trait names from the textual bullet payload."""

    sentence = body.split(".")[0]
    normalized = sentence.replace("+", ",")
    candidates: List[str] = []
    for chunk in normalized.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        subparts = re.split(r"\s+e\s+", chunk)
        for part in subparts:
            cleaned = part.strip("*- ")
            if not cleaned:
                continue
            if cleaned.lower().startswith("core tier"):
                continue
            if cleaned.lower().startswith("opzionali tier"):
                continue
            if cleaned.lower().startswith("sinergie tier"):
                continue
            candidates.append(cleaned)
    return candidates


def iter_appendix_seeds(directory: Path) -> Iterable[TraitSeed]:
    for appendix_path in sorted(directory.glob("*.txt")):
        metadata, body_lines = parse_front_matter(appendix_path)
        source_label = str(metadata.get("versione") or appendix_path.stem)
        body_text = "\n".join(body_lines)
        for line in body_text.splitlines():
            line = line.strip()
            if not line:
                continue
            match = APPENDIX_LINE_RE.match(line)
            if not match:
                continue
            header = match.group("header").strip()
            body = match.group("body").strip()
            tier_match = TIER_RE.search(header)
            if not tier_match:
                continue
            tier_value = tier_match.group("value")
            tier = f"T{tier_value}"
            section_name = re.sub(r"\s*[-—]\s*", " ", header).strip()
            for name in extract_names(body):
                label = name
                trait_id = slugify(label)
                description = f"Estratto da {source_label} — sezione {section_name}."
                usage = (
                    f"Bozza generata automaticamente dalla fonte {appendix_path.name}. "
                    f"Controllare requisiti e slot per '{label}'."
                )
                impetus = (
                    f"Origine esterna: {source_label}. Validare integrazione prima del catalogo."
                )
                data_origin = f"appendix::{appendix_path.name}"
                yield TraitSeed(trait_id, label, tier, description, usage, impetus, data_origin)



def _strip_notes_block(text: str) -> str:
    lines = text.splitlines()
    result: List[str] = []
    skip = False
    indent_level = 0
    for line in lines:
        stripped = line.lstrip()
        if not skip and stripped.startswith("notes:"):
            skip = True
            indent_level = len(line) - len(stripped)
            continue
        if skip:
            current_indent = len(line) - len(stripped)
            if stripped and current_indent > indent_level:
                continue
            skip = False
        result.append(line)
    return "\n".join(result)


def _load_yaml_payload(path: Path) -> Dict[str, object] | None:
    raw_text = path.read_text(encoding="utf-8")
    cleaned_text = _strip_notes_block(raw_text)
    loaded = yaml.safe_load(cleaned_text)
    if isinstance(loaded, dict):
        return loaded
    return None


def iter_yaml_seeds(path: Path) -> Iterable[TraitSeed]:
    if not path.exists():
        return
    payload = _load_yaml_payload(path)
    if not payload:
        return
    namespace = str(payload.get("namespace") or path.stem)
    tiers = payload.get("tiers", {})
    if not isinstance(tiers, dict):
        return

    for tier_key, tier_data in tiers.items():
        if not isinstance(tier_data, dict):
            continue
        tier_match = re.match(r"T(?P<num>[0-9])", tier_key, flags=re.IGNORECASE)
        if tier_match:
            tier = f"T{tier_match.group('num')}"
        else:
            tier = "T1"
        label_info = tier_data.get("label") or tier_key
        requires = tier_data.get("requires_neurons") or []
        if isinstance(requires, list):
            requires_list = [str(item).strip() for item in requires if str(item).strip()]
        else:
            requires_list = []
        grants = tier_data.get("grants_traits") or []
        if not isinstance(grants, list):
            continue
        for entry in grants:
            if isinstance(entry, dict):
                [(trait_key, trait_desc)] = list(entry.items())
                trait_desc_str = str(trait_desc)
            else:
                trait_key = str(entry)
                trait_desc_str = ""
            label = trait_key.replace("_", " ")
            label = " ".join(part.capitalize() for part in label.split())
            trait_id = slugify(trait_key)
            description = trait_desc_str or (
                f"Import da {namespace} ({label_info})."
            )
            usage_parts = [
                f"Tier {label_info} ({tier}).",
            ]
            if requires_list:
                usage_parts.append(
                    "Richiede neuroni: " + ", ".join(requires_list)
                )
            usage = " ".join(usage_parts)
            impetus = f"Origine esterna: {namespace}. Validare allineamento con catalogo principale."
            data_origin = f"incoming::{path.name}::{tier_key}"
            yield TraitSeed(trait_id, label, tier, description, usage, impetus, data_origin)


def ensure_unique_ids(seeds: Iterable[TraitSeed], existing_ids: set[str]) -> List[TraitSeed]:
    seen = set(existing_ids)
    unique: List[TraitSeed] = []
    for seed in seeds:
        trait_id = seed.trait_id or slugify(seed.label)
        base_id = trait_id
        counter = 2
        while trait_id in seen:
            trait_id = f"{base_id}_{counter}"
            counter += 1
        seen.add(trait_id)
        if trait_id != seed.trait_id:
            seed = TraitSeed(
                trait_id=trait_id,
                label=seed.label,
                tier=seed.tier,
                description=seed.description,
                usage=seed.usage,
                impetus=seed.impetus,
                data_origin=seed.data_origin,
            )
        unique.append(seed)
    return unique


def build_payload(seed: TraitSeed) -> Dict[str, object]:
    return {
        "id": seed.trait_id,
        "label": seed.label,
        "famiglia_tipologia": "TODO/import_esterno",
        "fattore_mantenimento_energetico": "Da definire (import esterno)",
        "tier": seed.tier,
        "slot": [],
        "slot_profile": {
            "core": "da_definire",
            "complementare": "da_definire",
        },
        "sinergie": [],
        "conflitti": [],
        "mutazione_indotta": seed.description,
        "uso_funzione": seed.usage,
        "spinta_selettiva": seed.impetus,
        "completion_flags": {"external_source": True},
        "data_origin": seed.data_origin,
    }


def write_drafts(output_dir: Path, seeds: Sequence[TraitSeed]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for existing in sorted(output_dir.glob("*.json")):
        existing.unlink()
    for seed in seeds:
        payload = build_payload(seed)
        path = output_dir / f"{seed.trait_id}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_import(args: argparse.Namespace) -> Tuple[int, Path, List[Path]]:
    appendix_dir = Path(args.appendix_dir or DEFAULT_APPENDIX_DIR)
    incoming_path = Path(args.incoming or DEFAULT_INCOMING_PATH)
    output_dir = Path(args.output_dir or DEFAULT_OUTPUT_DIR)

    seeds: List[TraitSeed] = []
    seeds.extend(iter_appendix_seeds(appendix_dir))
    seeds.extend(iter_yaml_seeds(incoming_path))

    existing_ids = load_existing_trait_ids()
    unique_seeds = ensure_unique_ids(seeds, existing_ids)
    write_drafts(output_dir, unique_seeds)
    written_paths = [output_dir / f"{seed.trait_id}.json" for seed in unique_seeds]
    return len(unique_seeds), output_dir, written_paths


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--appendix-dir", help="Directory contenente i canvas da cui estrarre i tratti")
    parser.add_argument("--incoming", help="Manifest YAML con i tratti esterni da importare")
    parser.add_argument("--output-dir", help="Directory destinazione per i draft generati")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    count, output_dir, paths = run_import(args)
    rel_output = output_dir.relative_to(REPO_ROOT)
    print(f"Generati {count} draft in {rel_output}")
    for path in paths:
        print(f" - {path.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
