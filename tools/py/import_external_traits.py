#!/usr/bin/env python3
"""Generate draft trait files from external appendices and YAML drops.

The importer converts the curated notes stored in ``appendici/*.txt`` and the
incoming ``sentience_traits_v1.0.yaml`` manifest into JSON stubs located in
``data/traits/_drafts``. Each stub follows the canonical trait schema so the
team can iterate on the content without breaking validation tooling.

Usage example::

    python tools/py/import_external_traits.py \
        --appendix-dir appendici \
        --incoming incoming/sentience_traits_v1.0.yaml \
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
from typing import Dict, Iterable, Iterator, List, Sequence, Tuple

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_APPENDIX_DIR = REPO_ROOT / "appendici"
DEFAULT_INCOMING_PATH = REPO_ROOT / "incoming" / "sentience_traits_v1.0.yaml"
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


@dataclass(frozen=True)
class GrantEntry:
    """Normalized representation of trait data defined inside the manifest."""

    trait_id: str
    description: str
    label: str | None = None
    usage: str | None = None
    impetus: str | None = None


def _stringify(value: object) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    return str(value)


def _extract_description(payload: Dict[str, object]) -> str:
    for key in ("description", "mutazione_indotta", "notes", "summary"):
        raw = payload.get(key)
        if raw:
            return _stringify(raw)
    return ""


def _extract_usage(payload: Dict[str, object]) -> str:
    for key in ("usage", "uso_funzione", "notes"):
        raw = payload.get(key)
        if raw:
            return _stringify(raw)
    return ""


def _extract_impetus(payload: Dict[str, object]) -> str:
    for key in ("impetus", "spinta_selettiva"):
        raw = payload.get(key)
        if raw:
            return _stringify(raw)
    return ""


def _normalize_grant_entries(data: object) -> List[GrantEntry]:
    entries: List[GrantEntry] = []
    if isinstance(data, dict):
        for trait_key, meta in data.items():
            if isinstance(meta, dict):
                trait_id = _stringify(meta.get("id") or trait_key)
                description = _extract_description(meta)
                label = _stringify(meta.get("label")) or None
                usage = _extract_usage(meta) or None
                impetus = _extract_impetus(meta) or None
            else:
                trait_id = _stringify(trait_key)
                description = _stringify(meta)
                label = None
                usage = None
                impetus = None
            trait_id = trait_id.strip()
            if not trait_id:
                continue
            entries.append(GrantEntry(trait_id, description, label, usage, impetus))
        return entries

    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                if "grants_traits" in item and len(item) == 2 and "tier" in item:
                    entries.extend(_normalize_grant_entries(item.get("grants_traits")))
                    continue
                if "id" in item or any(key in item for key in ("description", "mutazione_indotta")):
                    trait_id = _stringify(item.get("id")) or ""
                    if not trait_id:
                        # fall back to single-key mapping
                        if len(item) == 1:
                            [(trait_id, meta)] = list(item.items())
                            description = _stringify(meta)
                            entries.append(GrantEntry(_stringify(trait_id), description))
                        continue
                    trait_id = trait_id.strip()
                    if not trait_id:
                        continue
                    description = _extract_description(item)
                    label = _stringify(item.get("label")) or None
                    usage = _extract_usage(item) or None
                    impetus = _extract_impetus(item) or None
                    entries.append(GrantEntry(trait_id, description, label, usage, impetus))
                    continue
                if len(item) == 1:
                    [(trait_id, meta)] = list(item.items())
                    entries.append(GrantEntry(_stringify(trait_id), _stringify(meta)))
                    continue
            else:
                trait_id = _stringify(item).strip()
                if trait_id:
                    entries.append(GrantEntry(trait_id, ""))
        return entries

    if isinstance(data, GrantEntry):
        return [data]

    return entries


def _iter_grant_contexts(payload: object) -> Iterator[object]:
    stack: List[object] = [payload]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            for key, value in current.items():
                if key == "grants_traits":
                    yield value
                if isinstance(value, (dict, list)):
                    stack.append(value)
        elif isinstance(current, list):
            for item in current:
                if isinstance(item, (dict, list)):
                    stack.append(item)


def _tier_lookup_keys(tier_key: str, tier_data: Dict[str, object]) -> List[str]:
    keys: List[str] = []
    candidates = [tier_key]
    raw_id = tier_data.get("id") or tier_data.get("tier")
    if isinstance(raw_id, str):
        candidates.append(raw_id)
    raw_slug = tier_data.get("slug")
    if isinstance(raw_slug, str):
        candidates.append(raw_slug)
    raw_label = tier_data.get("label") or tier_data.get("name")
    if isinstance(raw_label, str):
        candidates.append(raw_label)
        if raw_id:
            candidates.append(f"{raw_id}_{raw_label}")
    normalized = []
    for candidate in candidates:
        if not isinstance(candidate, str):
            continue
        candidate = candidate.strip()
        if not candidate:
            continue
        normalized.append(candidate)
        slug_candidate = slugify(candidate)
        if slug_candidate and slug_candidate != candidate:
            normalized.append(slug_candidate)
    seen = set()
    ordered: List[str] = []
    for item in normalized:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def _resolve_grants_from_context(context: object, tier_keys: List[str]) -> List[GrantEntry]:
    if isinstance(context, dict):
        collected: List[GrantEntry] = []
        for key, value in context.items():
            key_str = _stringify(key).strip()
            if not key_str:
                continue
            key_variants = {key_str, slugify(key_str)}
            if any(variant and variant in tier_keys for variant in key_variants):
                entries = _normalize_grant_entries(value)
                if entries:
                    collected.extend(entries)
        return collected
    if isinstance(context, list):
        collected: List[GrantEntry] = []
        for item in context:
            if not isinstance(item, dict):
                continue
            item_keys: List[str] = []
            for attr in ("tier", "id", "slug", "code"):
                raw = item.get(attr)
                if isinstance(raw, str) and raw.strip():
                    raw = raw.strip()
                    item_keys.extend([raw, slugify(raw)])
            if not any(candidate and candidate in tier_keys for candidate in item_keys):
                continue
            for attr in ("grants_traits", "traits", "entries", "grants"):
                entries = _normalize_grant_entries(item.get(attr))
                if entries:
                    collected.extend(entries)
            if not collected:
                nested = _normalize_grant_entries(item)
                if nested:
                    collected.extend(nested)
        return collected
    return []


def _extract_grants_for_tier(payload: Dict[str, object], tier_key: str, tier_data: Dict[str, object]) -> List[GrantEntry]:
    direct_candidates = [
        tier_data.get("grants_traits"),
        tier_data.get("traits"),
    ]
    grants_section = tier_data.get("grants")
    if isinstance(grants_section, dict):
        direct_candidates.append(grants_section.get("traits"))
    elif isinstance(grants_section, list):
        direct_candidates.append(grants_section)

    for candidate in direct_candidates:
        entries = _normalize_grant_entries(candidate)
        if entries:
            return entries

    tier_keys = _tier_lookup_keys(tier_key, tier_data)
    for context in _iter_grant_contexts(payload):
        entries = _resolve_grants_from_context(context, tier_keys)
        if entries:
            return entries

    return []


def _normalize_tier_entries(raw_tiers: object) -> List[Tuple[str, Dict[str, object]]]:
    normalized: List[Tuple[str, Dict[str, object]]] = []
    if isinstance(raw_tiers, dict):
        for key, value in raw_tiers.items():
            if isinstance(value, dict):
                normalized.append((_stringify(key), value))
        return normalized
    if isinstance(raw_tiers, list):
        for idx, value in enumerate(raw_tiers):
            if not isinstance(value, dict):
                continue
            tier_key = _stringify(value.get("id") or value.get("slug") or f"tier_{idx+1}")
            if not tier_key:
                tier_key = f"tier_{idx+1}"
            normalized.append((tier_key, value))
        return normalized
    return normalized


def slugify(value: str) -> str:
    """Create a normalized slug similar to the catalog ID conventions."""

    normalized = unicodedata.normalize("NFKD", value)
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = without_marks.lower()
    replaced = "".join(ch if ch.isalnum() else "_" for ch in lowered)
    while "__" in replaced:
        replaced = replaced.replace("__", "_")
    return replaced.strip("_")


def build_data_origin(*parts: str) -> str:
    """Compose a schema-compliant ``data_origin`` tag from source fragments."""

    tokens = [slugify(part) for part in parts if part]
    tokens = [token for token in tokens if token]
    return "_".join(tokens) or "external"


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
                data_origin = build_data_origin("appendix", appendix_path.stem)
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
    tiers = _normalize_tier_entries(payload.get("tiers"))
    if not tiers:
        return

    for tier_key, tier_data in tiers:
        tier_match = None
        if isinstance(tier_key, str):
            tier_match = re.match(r"T(?P<num>[0-9])", tier_key, flags=re.IGNORECASE)
        if not tier_match:
            raw_id = tier_data.get("id")
            if isinstance(raw_id, str):
                tier_match = re.match(r"T(?P<num>[0-9])", raw_id, flags=re.IGNORECASE)
        if tier_match:
            tier = f"T{tier_match.group('num')}"
        else:
            tier = "T1"

        label_info = _stringify(tier_data.get("label") or tier_key or tier)
        requires = tier_data.get("requires_neurons") or tier_data.get("requires")
        requires_list: List[str] = []
        if isinstance(requires, list):
            for item in requires:
                value = _stringify(item).strip()
                if value:
                    requires_list.append(value)

        milestones_raw = tier_data.get("milestones") or []
        milestone_list: List[str] = []
        if isinstance(milestones_raw, list):
            for item in milestones_raw:
                value = _stringify(item).strip()
                if value:
                    milestone_list.append(value)

        grants = _extract_grants_for_tier(payload, tier_key, tier_data)
        if not grants:
            continue

        origin_parts: List[str] = []
        if isinstance(tier_key, str) and tier_key.strip():
            origin_parts.append(tier_key.strip())
        raw_id = tier_data.get("id")
        if isinstance(raw_id, str) and raw_id.strip() and raw_id not in origin_parts:
            origin_parts.append(raw_id.strip())
        raw_label = tier_data.get("label")
        if isinstance(raw_label, str) and raw_label.strip():
            origin_parts.append(raw_label.strip())
        if not origin_parts:
            origin_parts.append(tier)

        for entry in grants:
            trait_key = entry.trait_id
            label = entry.label or trait_key.replace("_", " ")
            label = " ".join(part.capitalize() for part in label.split())
            trait_id = slugify(trait_key)
            description = entry.description or (
                f"Import da {namespace} ({label_info})."
            )
            if entry.usage:
                usage = entry.usage
            else:
                usage_parts = [f"Tier {label_info} ({tier})."]
                if milestone_list:
                    usage_parts.append(
                        "Milestone: " + "; ".join(milestone_list)
                    )
                if requires_list:
                    usage_parts.append(
                        "Richiede neuroni: " + ", ".join(requires_list)
                    )
                usage = " ".join(usage_parts)
            impetus = entry.impetus or (
                f"Origine esterna: {namespace}. Validare allineamento con catalogo principale."
            )
            data_origin = build_data_origin("incoming", path.stem, *origin_parts)
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
    appendix_dir = (Path(args.appendix_dir).resolve() if args.appendix_dir else DEFAULT_APPENDIX_DIR)
    incoming_path = (Path(args.incoming).resolve() if args.incoming else DEFAULT_INCOMING_PATH)
    output_dir = (Path(args.output_dir).resolve() if args.output_dir else DEFAULT_OUTPUT_DIR)

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
