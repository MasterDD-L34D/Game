#!/usr/bin/env python3
"""Validator per i dataset YAML sotto data/."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterable, List, Tuple

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover
    sys.stderr.write("Errore: installa PyYAML (`pip install pyyaml`).\n")
    sys.exit(2)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"

FORMULA_ALLOWED_RE = re.compile(r"^[A-Za-z0-9_\s\-+*/().,:><=&|!'\"]+$")


def main() -> int:
    errors: List[str] = []
    errors.extend(validate_biomes())
    errors.extend(validate_mating())
    errors.extend(validate_packs())
    errors.extend(validate_telemetry())

    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        return 1
    print("Tutti i dataset YAML sono validi.")
    return 0


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def validate_biomes() -> List[str]:
    path = DATA_DIR / "biomes.yaml"
    data = load_yaml(path)
    errors: List[str] = []

    required_keys = {"biomes", "vc_adapt", "mutations", "frequencies"}
    missing = required_keys.difference(data.keys())
    if missing:
        errors.append(f"{path}: chiavi mancanti {sorted(missing)}")

    biomes = data.get("biomes", {})
    if not isinstance(biomes, dict) or not biomes:
        errors.append(f"{path}: 'biomes' deve essere una mappa non vuota")
    else:
        for biome, payload in biomes.items():
            if not isinstance(payload, dict):
                errors.append(f"{path}: biome '{biome}' non è una mappa")
                continue
            for field in ("diff_base", "mod_biome", "affixes"):
                if field not in payload:
                    errors.append(f"{path}: biome '{biome}' manca '{field}'")
            if "affixes" in payload and not isinstance(payload["affixes"], list):
                errors.append(f"{path}: biome '{biome}' -> 'affixes' deve essere lista")

    mutations = data.get("mutations", {})
    if not isinstance(mutations, dict):
        errors.append(f"{path}: 'mutations' deve essere una mappa")
    else:
        for table, expected_len in (("t0_table_d12", 12), ("t1_table_d8", 8)):
            values = mutations.get(table)
            if not isinstance(values, list) or len(values) != expected_len:
                errors.append(
                    f"{path}: '{table}' deve essere lista di lunghezza {expected_len}"
                )

    frequencies = data.get("frequencies", {})
    if not isinstance(frequencies, dict):
        errors.append(f"{path}: 'frequencies' deve essere una mappa")
    else:
        for name, weights in frequencies.items():
            if not isinstance(weights, dict):
                errors.append(f"{path}: 'frequencies.{name}' deve essere una mappa")
                continue
            if set(weights.keys()) != {"t0", "t1", "none"}:
                errors.append(f"{path}: 'frequencies.{name}' deve avere chiavi t0,t1,none")
    return errors


def validate_mating() -> List[str]:
    path = DATA_DIR / "mating.yaml"
    data = load_yaml(path)
    errors: List[str] = []

    required_keys = {
        "compat_forme",
        "compat_ennea",
        "actions_appeal",
        "nest_standards",
        "hybrid_rules",
    }
    missing = required_keys.difference(data.keys())
    if missing:
        errors.append(f"{path}: chiavi mancanti {sorted(missing)}")

    compat_forme = data.get("compat_forme", {})
    if not isinstance(compat_forme, dict):
        errors.append(f"{path}: 'compat_forme' deve essere una mappa")
    else:
        for mbti, entry in compat_forme.items():
            if mbti.upper() != mbti:
                errors.append(f"{path}: chiave MBTI '{mbti}' deve essere MAIUSCOLA")
            if not isinstance(entry, dict):
                errors.append(f"{path}: compat_forme.{mbti} deve essere una mappa")
                continue
            for field in ("likes", "neutrals", "dislikes", "base_scores"):
                if field not in entry:
                    errors.append(f"{path}: compat_forme.{mbti} manca '{field}'")
            for bucket in ("likes", "neutrals", "dislikes"):
                if bucket in entry and not isinstance(entry[bucket], list):
                    errors.append(
                        f"{path}: compat_forme.{mbti}.{bucket} deve essere una lista"
                    )
            if "base_scores" in entry and not isinstance(entry["base_scores"], dict):
                errors.append(
                    f"{path}: compat_forme.{mbti}.base_scores deve essere una mappa"
                )

    compat_ennea = data.get("compat_ennea", {})
    seen_ennea: set = set()
    if not isinstance(compat_ennea, dict):
        errors.append(f"{path}: 'compat_ennea' deve essere una mappa")
    else:
        for ident, entry in compat_ennea.items():
            if not ident:
                errors.append(f"{path}: compat_ennea contiene identificatore vuoto")
                continue
            if ident in seen_ennea:
                errors.append(f"{path}: identificatore enneagramma duplicato '{ident}'")
            seen_ennea.add(ident)
            if not isinstance(entry, dict):
                errors.append(f"{path}: compat_ennea.{ident} deve essere una mappa")

    actions = data.get("actions_appeal", {})
    if not isinstance(actions, dict):
        errors.append(f"{path}: 'actions_appeal' deve essere una mappa")
    else:
        for action, score in actions.items():
            if not re.fullmatch(r"[a-z0-9_]+", action):
                errors.append(f"{path}: azione '{action}' deve essere snake_case")
            if not isinstance(score, int):
                errors.append(f"{path}: score di '{action}' deve essere intero")

    nests = data.get("nest_standards", {})
    if not isinstance(nests, dict):
        errors.append(f"{path}: 'nest_standards' deve essere una mappa")

    hybrids = data.get("hybrid_rules", {})
    if not isinstance(hybrids, dict):
        errors.append(f"{path}: 'hybrid_rules' deve essere una mappa")

    return errors


def validate_packs() -> List[str]:
    path = DATA_DIR / "packs.yaml"
    data = load_yaml(path)
    errors: List[str] = []

    required_keys = {"pi_shop", "random_general_d20", "forms"}
    missing = required_keys.difference(data.keys())
    if missing:
        errors.append(f"{path}: chiavi mancanti {sorted(missing)}")

    pi_shop = data.get("pi_shop", {})
    if not isinstance(pi_shop, dict) or "costs" not in pi_shop:
        errors.append(f"{path}: 'pi_shop.costs' è obbligatorio")

    random_table = data.get("random_general_d20", [])
    ranges = []
    if not isinstance(random_table, list):
        errors.append(f"{path}: 'random_general_d20' deve essere una lista")
    else:
        for idx, row in enumerate(random_table):
            if not isinstance(row, dict):
                errors.append(f"{path}: random_general_d20[{idx}] deve essere una mappa")
                continue
            r = row.get("range")
            if not isinstance(r, str):
                errors.append(f"{path}: random_general_d20[{idx}] range mancante")
                continue
            try:
                ranges.append((idx, r, parse_range(r)))
            except ValueError as exc:
                errors.append(f"{path}: random_general_d20[{idx}] {exc}")
        errors.extend(validate_ranges(path, ranges))

    forms = data.get("forms", {})
    if not isinstance(forms, dict) or not forms:
        errors.append(f"{path}: 'forms' deve essere una mappa non vuota")
    else:
        for form, payload in forms.items():
            if form.upper() != form:
                errors.append(f"{path}: forma '{form}' deve essere MAIUSCOLA")
            if not isinstance(payload, dict):
                errors.append(f"{path}: forms.{form} deve essere una mappa")
                continue
            for pack_name in ("A", "B", "C"):
                if pack_name not in payload:
                    errors.append(f"{path}: forms.{form} manca il pacchetto '{pack_name}'")
            bias = payload.get("bias_d12")
            if not isinstance(bias, dict):
                errors.append(f"{path}: forms.{form}.bias_d12 deve essere mappa")

    return errors


def validate_ranges(path: Path, ranges: Iterable[Tuple[int, str, Tuple[int, int]]]) -> List[str]:
    errors: List[str] = []
    sorted_ranges = sorted(ranges, key=lambda item: item[2][0])
    previous_end = 0
    for idx, raw, (start, end) in sorted_ranges:
        if start < 1 or end > 20 or start > end:
            errors.append(f"{path}: range '{raw}' non valido (deve essere tra 1 e 20)")
            continue
        if start <= previous_end:
            errors.append(
                f"{path}: range '{raw}' sovrapposto al precedente (fine {previous_end})"
            )
        previous_end = max(previous_end, end)
    return errors


def parse_range(raw: str) -> Tuple[int, int]:
    try:
        if "-" in raw:
            start, end = raw.split("-", 1)
            return int(start), int(end)
        value = int(raw)
        return value, value
    except ValueError as exc:  # pragma: no cover - input controllato in validazione
        raise ValueError(f"Range non numerico: {raw}") from exc


def validate_telemetry() -> List[str]:
    path = DATA_DIR / "telemetry.yaml"
    data = load_yaml(path)
    errors: List[str] = []

    required_keys = {"telemetry", "indices", "mbti_axes", "ennea_themes", "pe_economy"}
    missing = required_keys.difference(data.keys())
    if missing:
        errors.append(f"{path}: chiavi mancanti {sorted(missing)}")

    telemetry = data.get("telemetry", {})
    if not isinstance(telemetry, dict):
        errors.append(f"{path}: 'telemetry' deve essere una mappa")

    indices = data.get("indices", {})
    if not isinstance(indices, dict):
        errors.append(f"{path}: 'indices' deve essere una mappa")

    axes = data.get("mbti_axes", {})
    if not isinstance(axes, dict):
        errors.append(f"{path}: 'mbti_axes' deve essere una mappa")
    else:
        for axis, payload in axes.items():
            formula = payload.get("formula") if isinstance(payload, dict) else None
            if not isinstance(formula, str) or not FORMULA_ALLOWED_RE.match(formula):
                errors.append(f"{path}: formula asse '{axis}' contiene caratteri non ammessi")

    themes = data.get("ennea_themes", [])
    seen_ids: set = set()
    if not isinstance(themes, list):
        errors.append(f"{path}: 'ennea_themes' deve essere una lista")
    else:
        for idx, entry in enumerate(themes):
            if not isinstance(entry, dict):
                errors.append(f"{path}: ennea_themes[{idx}] deve essere una mappa")
                continue
            ident = entry.get("id")
            if not ident:
                errors.append(f"{path}: ennea_themes[{idx}] manca l'id")
                continue
            if ident in seen_ids:
                errors.append(f"{path}: ennea theme duplicato '{ident}'")
            else:
                seen_ids.add(ident)

    return errors


if __name__ == "__main__":
    sys.exit(main())
