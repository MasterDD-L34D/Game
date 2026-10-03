#!/usr/bin/env python3
"""Validatore schema export telemetria/QA."""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Set

try:
    import yaml  # type: ignore
except ImportError as exc:  # pragma: no cover - dipendenza documentata in requirements
    raise SystemExit("PyYAML non disponibile: installa i requisiti con `pip install PyYAML`." ) from exc


PRIORITY_VALUES = {"critical", "high", "medium", "low"}
STATUS_VALUES = {"open", "triaged", "in_progress", "blocked", "resolved", "closed"}
ROADMAP_RE = re.compile(r"^RM-\d+\b")
SUMMARY_MAX_LEN = 140


@dataclass(frozen=True)
class RecipientWindow:
    label: str
    days: Sequence[str]
    start: str
    end: str


@dataclass(frozen=True)
class RecipientGroup:
    group_id: str
    recipients: Sequence[str]
    windows: Sequence[RecipientWindow]


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Confronta l'export QA con lo schema atteso.")
    parser.add_argument(
        "--export",
        required=True,
        help="Percorso del file export (JSON o YAML)."
    )
    parser.add_argument(
        "--recipients",
        default="config/drive/recipients.yaml",
        help="Configurazione gruppi destinatari (default: config/drive/recipients.yaml)."
    )
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Non considerare errore un export senza record."
    )
    return parser.parse_args(argv)


def load_structured_file(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    suffix = path.suffix.lower()
    with path.open("r", encoding="utf-8") as fh:
        if suffix in {".yaml", ".yml"}:
            return yaml.safe_load(fh)
        if suffix == ".json":
            return json.load(fh)
    raise ValueError(f"Formato non supportato per {path} (attesi JSON/YAML)")


def load_telemetry_catalog(path: Path) -> Mapping[str, Any]:
    data = load_structured_file(path)
    if not isinstance(data, Mapping):
        raise ValueError(f"{path}: struttura YAML principale non è una mappa")
    return data


def load_recipient_groups(path: Path) -> Mapping[str, RecipientGroup]:
    raw = load_structured_file(path)
    timezone = raw.get("timezone") if isinstance(raw, Mapping) else None
    if not isinstance(raw, Mapping) or "groups" not in raw:
        raise ValueError(f"{path}: struttura attesa `groups` non trovata")

    result: dict[str, RecipientGroup] = {}
    for entry in raw.get("groups", []):
        if not isinstance(entry, Mapping):
            raise ValueError(f"{path}: elemento groups non è una mappa")
        group_id = str(entry.get("id", "")).strip()
        if not group_id:
            raise ValueError(f"{path}: gruppo senza id")
        if group_id in result:
            raise ValueError(f"{path}: gruppo duplicato {group_id}")
        recipients = entry.get("recipients", [])
        if not isinstance(recipients, Sequence) or not recipients:
            raise ValueError(f"{path}: gruppo {group_id} privo di recipients")
        recipients_normalized = [str(item).strip() for item in recipients if str(item).strip()]
        if not recipients_normalized:
            raise ValueError(f"{path}: gruppo {group_id} recipients vuoto")

        windows_data = entry.get("schedule", [])
        windows: List[RecipientWindow] = []
        for raw_window in windows_data:
            if not isinstance(raw_window, Mapping):
                raise ValueError(f"{path}: schedule {group_id} deve essere una mappa")
            label = str(raw_window.get("label", "")).strip() or "window"
            days = raw_window.get("days", [])
            if not isinstance(days, Sequence) or not days:
                raise ValueError(f"{path}: schedule {group_id}/{label} richiede `days`")
            start = str(raw_window.get("start", "")).strip()
            end = str(raw_window.get("end", "")).strip()
            if not _valid_time(start) or not _valid_time(end):
                raise ValueError(f"{path}: orari non validi in schedule {group_id}/{label}")
            if start >= end:
                raise ValueError(f"{path}: start >= end in schedule {group_id}/{label}")
            windows.append(RecipientWindow(label, tuple(days), start, end))

        result[group_id] = RecipientGroup(group_id, tuple(recipients_normalized), tuple(windows))

    # timezone not used directly but ensures config dichiarata
    if not timezone:
        raise ValueError(f"{path}: campo timezone mancante")
    return result


def _valid_time(value: str) -> bool:
    return bool(re.fullmatch(r"^\d{2}:\d{2}$", value))


def normalize_records(raw) -> List[Mapping[str, object]]:
    if raw is None:
        return []
    if isinstance(raw, Sequence) and not isinstance(raw, (str, bytes)):
        return [item for item in raw if isinstance(item, Mapping)]
    if isinstance(raw, Mapping):
        if "records" in raw and isinstance(raw["records"], Sequence):
            return [item for item in raw["records"] if isinstance(item, Mapping)]
        if "entries" in raw and isinstance(raw["entries"], Sequence):
            return [item for item in raw["entries"] if isinstance(item, Mapping)]
    raise ValueError("Formato export non riconosciuto: atteso array o chiave records/entries")


def diff_export_vs_telemetry(
    records: Sequence[Mapping[str, object]],
    telemetry_catalog: Mapping[str, Any]
) -> List[str]:
    indices = _mapping_keys_lower(telemetry_catalog.get("indices"))
    telemetry_section = telemetry_catalog.get("telemetry")
    hud_breakdown = telemetry_section.get("hud_breakdown") if isinstance(telemetry_section, Mapping) else {}
    roles = _mapping_keys_lower(hud_breakdown.get("roles") if isinstance(hud_breakdown, Mapping) else None)
    rarities = _mapping_keys_lower(hud_breakdown.get("rarities") if isinstance(hud_breakdown, Mapping) else None)

    telemetry_targets = telemetry_catalog.get("telemetry_targets")
    target_groups = _mapping_keys_lower(telemetry_targets)
    target_entries: Set[str] = set()
    if isinstance(telemetry_targets, Mapping):
        for value in telemetry_targets.values():
            target_entries.update(_mapping_keys_lower(value))

    referenced: Dict[str, Set[str]] = {
        "indices": set(),
        "roles": set(),
        "rarities": set(),
        "target_groups": set(),
        "target_entries": set(),
    }

    for record in records:
        text_tokens = _collect_record_tokens(record)
        referenced["indices"].update(_find_mentions(text_tokens, indices))
        referenced["roles"].update(_find_mentions(text_tokens, roles))
        referenced["rarities"].update(_find_mentions(text_tokens, rarities))
        referenced["target_groups"].update(_find_mentions(text_tokens, target_groups))
        referenced["target_entries"].update(_find_mentions(text_tokens, target_entries))

    differences: List[str] = []
    differences.extend(_build_diff_message("indici", indices, referenced["indices"]))
    differences.extend(_build_diff_message("ruoli HUD", roles, referenced["roles"]))
    differences.extend(_build_diff_message("rarità HUD", rarities, referenced["rarities"]))
    differences.extend(_build_diff_message("target di telemetria", target_groups, referenced["target_groups"]))
    differences.extend(_build_diff_message("target granulari", target_entries, referenced["target_entries"]))
    return differences


def _mapping_keys_lower(value: Any) -> Set[str]:
    if not isinstance(value, Mapping):
        return set()
    result = set()
    for key in value.keys():
        key_str = str(key).strip()
        if key_str:
            result.add(key_str.lower())
    return result


def _collect_record_tokens(record: Mapping[str, object]) -> Iterable[str]:
    tokens: List[str] = []
    for field in ("summary", "detailed_description", "component_tag"):
        value = record.get(field)
        if isinstance(value, str) and value:
            tokens.append(value.lower())

    routing = record.get("routing")
    if isinstance(routing, Mapping):
        notes = routing.get("notes")
        if isinstance(notes, str) and notes:
            tokens.append(notes.lower())
        groups = routing.get("recipient_groups")
        if isinstance(groups, Sequence) and not isinstance(groups, (str, bytes)):
            tokens.extend(str(item).lower() for item in groups)

    evidence = record.get("evidence_links")
    if isinstance(evidence, Sequence) and not isinstance(evidence, (str, bytes)):
        tokens.extend(str(item).lower() for item in evidence)

    return tokens


def _find_mentions(tokens: Iterable[str], keywords: Set[str]) -> Set[str]:
    found: Set[str] = set()
    if not keywords:
        return found
    for token in tokens:
        for keyword in keywords:
            if keyword and keyword in token:
                found.add(keyword)
    return found


def _build_diff_message(label: str, expected: Set[str], referenced: Set[str]) -> List[str]:
    messages: List[str] = []
    missing = sorted(expected - referenced)
    unexpected = sorted(referenced - expected)
    if missing:
        messages.append(f"{label.capitalize()} senza riferimenti nell'export: {', '.join(missing)}")
    if unexpected:
        messages.append(f"{label.capitalize()} non definiti in data/core/telemetry.yaml ma citati nell'export: {', '.join(unexpected)}")
    return messages


def validate_records(records: Sequence[Mapping[str, object]], groups: Mapping[str, RecipientGroup]) -> List[str]:
    errors: List[str] = []
    for idx, record in enumerate(records):
        prefix = f"record[{idx}]"
        errors.extend(_validate_required_fields(prefix, record))
        errors.extend(_validate_types(prefix, record))
        errors.extend(_validate_values(prefix, record))
        errors.extend(_validate_routing(prefix, record, groups))
    return errors


def _validate_required_fields(prefix: str, record: Mapping[str, object]) -> List[str]:
    required = [
        "source",
        "summary",
        "event_timestamp",
        "owner",
        "priority",
        "status",
        "component_tag",
        "roadmap_milestone",
        "evidence_links",
    ]
    errors = []
    for key in required:
        if key not in record:
            errors.append(f"{prefix}: campo obbligatorio mancante `{key}`")
    return errors


def _validate_types(prefix: str, record: Mapping[str, object]) -> List[str]:
    errors: List[str] = []
    if not isinstance(record.get("summary"), str):
        errors.append(f"{prefix}: summary deve essere stringa")
    if not isinstance(record.get("owner"), str):
        errors.append(f"{prefix}: owner deve essere stringa")
    if not isinstance(record.get("component_tag"), str):
        errors.append(f"{prefix}: component_tag deve essere stringa")
    evidence = record.get("evidence_links")
    if not isinstance(evidence, Sequence) or isinstance(evidence, (str, bytes)):
        errors.append(f"{prefix}: evidence_links deve essere lista di stringhe")
    else:
        for link in evidence:
            if not isinstance(link, str) or not link.strip():
                errors.append(f"{prefix}: evidence_links contiene valore non valido")
    routing = record.get("routing")
    if routing is not None and not isinstance(routing, Mapping):
        errors.append(f"{prefix}: routing deve essere una mappa se presente")
    description = record.get("detailed_description")
    if description is not None and not isinstance(description, str):
        errors.append(f"{prefix}: detailed_description deve essere stringa se presente")
    return errors


def _validate_values(prefix: str, record: Mapping[str, object]) -> List[str]:
    errors: List[str] = []
    summary = str(record.get("summary", ""))
    if len(summary) > SUMMARY_MAX_LEN:
        errors.append(f"{prefix}: summary supera {SUMMARY_MAX_LEN} caratteri")
    event_ts = str(record.get("event_timestamp", ""))
    try:
        datetime.fromisoformat(event_ts.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{prefix}: event_timestamp non è ISO 8601")
    priority = str(record.get("priority", "")).lower()
    if priority not in PRIORITY_VALUES:
        errors.append(f"{prefix}: priority `{priority}` non è tra {sorted(PRIORITY_VALUES)}")
    status = str(record.get("status", "")).lower()
    if status not in STATUS_VALUES:
        errors.append(f"{prefix}: status `{status}` non è tra {sorted(STATUS_VALUES)}")
    milestone = str(record.get("roadmap_milestone", ""))
    if not ROADMAP_RE.match(milestone):
        errors.append(f"{prefix}: roadmap_milestone `{milestone}` non rispetta pattern RM-<numero>")
    component_tag = str(record.get("component_tag", ""))
    if not re.fullmatch(r"^[a-z0-9._-]+$", component_tag):
        errors.append(f"{prefix}: component_tag `{component_tag}` deve essere slug (a-z0-9._-)")
    return errors


def _validate_routing(prefix: str, record: Mapping[str, object], groups: Mapping[str, RecipientGroup]) -> List[str]:
    routing = record.get("routing")
    if routing is None:
        return []
    errors: List[str] = []
    groups_list = routing.get("recipient_groups") if isinstance(routing, Mapping) else None
    if groups_list is None:
        return errors
    if not isinstance(groups_list, Sequence) or isinstance(groups_list, (str, bytes)):
        errors.append(f"{prefix}: routing.recipient_groups deve essere lista")
        return errors
    for gid in groups_list:
        gid_str = str(gid).strip()
        if gid_str not in groups:
            errors.append(f"{prefix}: recipient_group `{gid_str}` non configurato in recipients.yaml")
    return errors


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    export_path = Path(args.export)
    recipients_path = Path(args.recipients)
    telemetry_path = Path("data/core/telemetry.yaml")

    try:
        groups = load_recipient_groups(recipients_path)
        raw_export = load_structured_file(export_path)
        records = normalize_records(raw_export)
        telemetry_catalog = load_telemetry_catalog(telemetry_path)
    except Exception as exc:  # pragma: no cover - gestione errori CLI
        sys.stderr.write(f"Errore: {exc}\n")
        return 2

    if not records:
        message = "Nessun record trovato nell'export."
        if args.allow_empty:
            print(message)
            return 0
        sys.stderr.write(message + "\n")
        return 1

    errors = validate_records(records, groups)
    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        return 1

    print(f"{len(records)} record conformi allo schema telemetry-export.")
    differences = diff_export_vs_telemetry(records, telemetry_catalog)
    if differences:
        print("Diff telemetry/export:")
        for line in differences:
            print(f"- {line}")
    else:
        print("Diff telemetry/export: nessuna discrepanza individuata rispetto a data/core/telemetry.yaml.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
