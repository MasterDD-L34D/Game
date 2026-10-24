"""Utilities to migrate trait data to the final sentience naming conventions.

The helper rewrites the legacy ``incoming_sensienti_*`` identifiers used in
`data/traits/_drafts` and refreshes the Italian locale entries so they reference
Proto‑Sentiente → Sapiente with the new milestone wording.

Run in dry-run mode (default) to inspect the changes; pass ``--apply`` to write
updates back to disk::

    python tools/migrations/traits_styleguide_migration.py \
      --traits-dir data/traits/_drafts \
      --locale-file locales/it/traits.json \
      --apply
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

LEGACY_ORIGINS = {
    "incoming_sensienti_traits_v0_1_t1_protosentiente": "incoming_sentience_traits_v1_0_t1_proto_sentiente",
    "incoming_sensienti_traits_v0_1_t2_presociale": "incoming_sentience_traits_v1_0_t2_pre_sociale",
    "incoming_sensienti_traits_v0_1_t3_emergente": "incoming_sentience_traits_v1_0_t3_emergente",
    "incoming_sensienti_traits_v0_1_t4_sociale": "incoming_sentience_traits_v1_0_t4_civico",
    "incoming_sensienti_traits_v0_1_t5_culturale": "incoming_sentience_traits_v1_0_t5_avanzato",
    "incoming_sensienti_traits_v0_1_t6_proto_umano": "incoming_sentience_traits_v1_0_t6_sapiente",
}

USAGE_STRINGS = {
    "interoception_seed": "Tier Proto‑Sentiente (T1). Milestone: Senses (core).",
    "startle_reflex": "Tier Proto‑Sentiente (T1). Milestone: Senses (core).",
    "balance_reflex": "Tier Pre‑Sociale (T2). Milestone: Senses mid; AB 01 Endurance.",
    "mimicry_basic": "Tier Pre‑Sociale (T2). Milestone: Senses mid; AB 01 Endurance.",
    "toolseed": "Tier Emergente (T3). Milestone: Senses mid+; AB 02–03 movement/carry.",
    "echoic_trace": "Tier Emergente (T3). Milestone: Senses mid+; AB 02–03 movement/carry.",
    "group_form": "Tier Civico (T4). Milestone: Sound Awareness/Chemotopy full; AB 05–09 climb/carry.",
    "teach_action": "Tier Civico (T4). Milestone: Sound Awareness/Chemotopy full; AB 05–09 climb/carry.",
    "craft_loop": "Tier Avanzato (T5). Milestone: Memorie echoic/iconic multiple; AB 11 pain.",
    "sheltering": "Tier Avanzato (T5). Milestone: Memorie echoic/iconic multiple; AB 11 pain.",
    "postural_endurance": "Tier Sapiente (T6). Milestone: Senses 37/37; Ambulation 26/26.",
    "executive_loop": "Tier Sapiente (T6). Milestone: Senses 37/37; Ambulation 26/26.",
}

SPINTA_TEMPLATE = (
    "Origine esterna: EvoTactics.Sentience. "
    "Validare allineamento con catalogo principale."
)


def iter_trait_files(directory: Path) -> Iterable[Path]:
    yield from sorted(directory.glob("*.json"))


def migrate_trait_file(path: Path, apply: bool) -> Tuple[bool, Dict[str, str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    original_origin = payload.get("data_origin")
    updated = False
    notes: Dict[str, str] = {}

    if isinstance(original_origin, str) and original_origin in LEGACY_ORIGINS:
        payload["data_origin"] = LEGACY_ORIGINS[original_origin]
        notes["data_origin"] = f"{original_origin} → {payload['data_origin']}"
        updated = True

    trait_id = payload.get("id")
    if isinstance(trait_id, str) and trait_id in USAGE_STRINGS:
        current_usage = payload.get("uso_funzione")
        desired_usage = USAGE_STRINGS[trait_id]
        if current_usage != desired_usage:
            payload["uso_funzione"] = desired_usage
            notes["uso_funzione"] = "updated milestone wording"
            updated = True
        current_spinta = payload.get("spinta_selettiva")
        if current_spinta != SPINTA_TEMPLATE:
            payload["spinta_selettiva"] = SPINTA_TEMPLATE
            notes["spinta_selettiva"] = "normalized namespace"
            updated = True

    if updated and apply:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return updated, notes


def migrate_locale_file(path: Path, apply: bool) -> Tuple[bool, List[str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries")
    if not isinstance(entries, dict):
        return False, []

    changed = False
    messages: List[str] = []
    for trait_id, usage in USAGE_STRINGS.items():
        entry = entries.get(trait_id)
        if not isinstance(entry, dict):
            continue
        old_usage = entry.get("uso_funzione")
        if old_usage != usage:
            entry["uso_funzione"] = usage
            messages.append(f"{trait_id}: uso_funzione")
            changed = True
        old_spinta = entry.get("spinta_selettiva")
        if old_spinta != SPINTA_TEMPLATE:
            entry["spinta_selettiva"] = SPINTA_TEMPLATE
            messages.append(f"{trait_id}: spinta_selettiva")
            changed = True

    if changed and apply:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed, messages


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--traits-dir", type=Path, default=Path("data/traits/_drafts"))
    parser.add_argument("--locale-file", type=Path, default=Path("locales/it/traits.json"))
    parser.add_argument("--apply", action="store_true", help="Scrive le modifiche sui file invece di stampare soltanto")
    args = parser.parse_args()

    total_updates = 0
    for trait_path in iter_trait_files(args.traits_dir):
        updated, notes = migrate_trait_file(trait_path, args.apply)
        if updated:
            total_updates += 1
            note_str = ", ".join(f"{key}: {value}" for key, value in notes.items())
            print(f"[traits] {trait_path}: {note_str}")

    locale_updated, locale_notes = migrate_locale_file(args.locale_file, args.apply)
    if locale_updated:
        total_updates += 1
        joined = ", ".join(locale_notes)
        print(f"[locale] {args.locale_file}: {joined}")

    if total_updates == 0:
        print("Nessuna modifica necessaria – i file sono già allineati.")
    elif not args.apply:
        print("Eseguire con --apply per scrivere le modifiche sopra elencate.")

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())
