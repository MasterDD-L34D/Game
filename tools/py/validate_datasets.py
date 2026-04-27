#!/usr/bin/env python3
"""Validator per i dataset YAML sotto data/."""
from __future__ import annotations

import importlib.util
import json
import re
import sys
import os
from pathlib import Path
from typing import Iterable, List, Tuple

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover
    sys.stderr.write("Errore: installa PyYAML (`pip install pyyaml`).\n")
    sys.exit(2)

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEFAULT_PACK_VALIDATOR = (
    Path(__file__).resolve().parents[2]
    / "packs"
    / "evo_tactics_pack"
    / "tools"
    / "py"
    / "run_all_validators.py"
)

FORMULA_ALLOWED_RE = re.compile(r"^[A-Za-z0-9_\s\-+*/().,:><=&|!'\"]+$")


def main() -> int:
    errors: List[str] = []
    info_messages: List[str] = []

    errors.extend(validate_biomes())
    errors.extend(validate_mating())
    errors.extend(validate_packs())
    errors.extend(validate_ecosystem_pack(info_messages))
    errors.extend(validate_telemetry())
    errors.extend(validate_species_ecology())

    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        return 1

    for message in info_messages:
        print(message)
    print("Tutti i dataset YAML sono validi.")
    return 0


def load_yaml(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _data_dir() -> Path:
    override = os.environ.get("GAME_CLI_DATA_ROOT")
    if override:
        return Path(override)
    return DEFAULT_DATA_DIR


def _core_data_dir() -> Path:
    data_dir = _data_dir()
    candidate = data_dir / "core"
    return candidate if candidate.exists() else data_dir


def _pack_validator_path() -> Path:
    pack_root = os.environ.get("GAME_CLI_PACK_ROOT")
    if pack_root:
        return Path(pack_root) / "tools" / "py" / "run_all_validators.py"

    override = os.environ.get("GAME_CLI_PACK_VALIDATOR")
    if override:
        return Path(override)

    return DEFAULT_PACK_VALIDATOR


def pack_validator_path() -> Path:
    """Restituisce il percorso al validator del pack ecosistemi."""

    return _pack_validator_path()


def validate_biomes() -> List[str]:
    path = _core_data_dir() / "biomes.yaml"
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

            hazard = payload.get("hazard")
            if not isinstance(hazard, dict):
                errors.append(f"{path}: biome '{biome}' -> 'hazard' deve essere una mappa")
            else:
                if not hazard.get("description"):
                    errors.append(f"{path}: biome '{biome}' -> 'hazard.description' obbligatoria")
                if "severity" not in hazard:
                    errors.append(f"{path}: biome '{biome}' -> 'hazard.severity' mancante")
                stress_mod = hazard.get("stress_modifiers")
                if stress_mod is not None and not isinstance(stress_mod, dict):
                    errors.append(
                        f"{path}: biome '{biome}' -> 'hazard.stress_modifiers' deve essere una mappa"
                    )

            npc_archetypes = payload.get("npc_archetypes")
            if not isinstance(npc_archetypes, dict):
                errors.append(
                    f"{path}: biome '{biome}' -> 'npc_archetypes' deve essere una mappa"
                )
            else:
                for key in ("primary", "support"):
                    if key not in npc_archetypes:
                        errors.append(
                            f"{path}: biome '{biome}' -> 'npc_archetypes.{key}' mancante"
                        )
                    elif not isinstance(npc_archetypes.get(key), list):
                        errors.append(
                            f"{path}: biome '{biome}' -> 'npc_archetypes.{key}' deve essere lista"
                        )

            stresswave = payload.get("stresswave")
            if not isinstance(stresswave, dict):
                errors.append(f"{path}: biome '{biome}' -> 'stresswave' deve essere una mappa")
            else:
                for key in ("baseline", "escalation_rate"):
                    if key not in stresswave:
                        errors.append(
                            f"{path}: biome '{biome}' -> 'stresswave.{key}' mancante"
                        )
                    else:
                        value = stresswave.get(key)
                        if not isinstance(value, (int, float)):
                            errors.append(
                                f"{path}: biome '{biome}' -> 'stresswave.{key}' deve essere numerico"
                            )
                thresholds = stresswave.get("event_thresholds")
                if not isinstance(thresholds, dict) or not thresholds:
                    errors.append(
                        f"{path}: biome '{biome}' -> 'stresswave.event_thresholds' deve essere mappa non vuota"
                    )
                else:
                    for name, value in thresholds.items():
                        if not isinstance(value, (int, float)):
                            errors.append(
                                f"{path}: biome '{biome}' -> 'stresswave.event_thresholds.{name}' deve essere numerico"
                            )

            narrative = payload.get("narrative")
            if not isinstance(narrative, dict):
                errors.append(f"{path}: biome '{biome}' -> 'narrative' deve essere una mappa")
            else:
                if not narrative.get("tone"):
                    errors.append(
                        f"{path}: biome '{biome}' -> 'narrative.tone' obbligatoria"
                    )
                hooks = narrative.get("hooks")
                if not isinstance(hooks, list) or not hooks:
                    errors.append(
                        f"{path}: biome '{biome}' -> 'narrative.hooks' deve essere lista non vuota"
                    )

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
    path = _core_data_dir() / "mating.yaml"
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
    path = _data_dir() / "packs.yaml"
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
    available_packs: set = set()
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
            pack_name = row.get("pack")
            if isinstance(pack_name, str) and row.get("combo"):
                available_packs.add(pack_name)
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

    job_bias = data.get("job_bias")
    if job_bias is not None:
        if not isinstance(job_bias, dict):
            errors.append(f"{path}: 'job_bias' deve essere una mappa se presente")
        else:
            if "default" not in job_bias:
                errors.append(f"{path}: 'job_bias' deve includere la chiave 'default'")
            for job, packs in job_bias.items():
                if not isinstance(packs, list) or not packs:
                    errors.append(
                        f"{path}: job_bias.{job} deve essere una lista non vuota"
                    )
                    continue
                for pack in packs:
                    if not isinstance(pack, str) or not pack:
                        errors.append(
                            f"{path}: job_bias.{job} contiene valore non valido: {pack!r}"
                        )
                    elif pack not in available_packs:
                        errors.append(
                            f"{path}: job_bias.{job} fa riferimento a pack assente ({pack})"
                        )

    return errors


def _load_pack_validator_module():
    validator_path = _pack_validator_path()
    if not validator_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(
        "evo_tactics_pack.run_all_validators", validator_path
    )
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def validate_ecosystem_pack(info_messages: List[str]) -> List[str]:
    try:
        module = _load_pack_validator_module()
    except Exception as exc:  # pragma: no cover - propagato come errore runtime
        return [
            "packs/evo_tactics_pack: impossibile caricare il validator ecosistemi",
            str(exc),
        ]

    if module is None or not hasattr(module, "run_validators"):
        return []

    try:
        payload, has_failures = module.run_validators(  # type: ignore[attr-defined]
            json_out=None,
            html_out=None,
            emit_stdout=False,
        )
    except Exception as exc:  # pragma: no cover - eventuali errori runtime vengono loggati
        return [
            "packs/evo_tactics_pack: esecuzione validator fallita",
            str(exc),
        ]

    reports = payload.get("reports", []) if isinstance(payload, dict) else []
    errors: List[str] = []
    warning_count = 0

    for report in reports:
        stdout = report.get("stdout", "") if isinstance(report, dict) else ""
        stderr = report.get("stderr", "") if isinstance(report, dict) else ""
        cmd = report.get("cmd") if isinstance(report, dict) else ""
        code = int(report.get("code", 0)) if isinstance(report, dict) else 0
        warning_count += stdout.count("WARNING:")
        if code != 0:
            detail_parts = [stdout.strip(), stderr.strip()]
            detail = "\n".join(part for part in detail_parts if part)
            message = (
                "packs/evo_tactics_pack: validator fallito "
                f"({cmd}) [exit {code}]."
            )
            if detail:
                message += f"\n{detail}"
            errors.append(message)

    if not errors and reports:
        total = len(reports)
        info_messages.append(
            "packs/evo_tactics_pack: {total} controlli eseguiti — {warnings} avvisi.".format(
                total=total,
                warnings=warning_count,
            )
        )

    if has_failures and not errors:
        errors.append("packs/evo_tactics_pack: validator con errori non specificati")

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
    path = _core_data_dir() / "telemetry.yaml"
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


# === Species ecology cross-ref validator (ADR-2026-05-02) ==================
# Loads species.yaml + species_expansion.yaml, collects all valid species_id,
# then walks every entry's `ecology` block and verifies:
#   1. orphan check: prey_of/preys_on/competes_with/scavenges_from/
#      mutualism_with[].species_id all reference an existing id.
#   2. self-ref forbidden in any of those lists.
#   3. bidirectional consistency:
#        A.preys_on -> B  =>  B.prey_of -> A
#        A.competes_with -> B  =>  B.competes_with -> A (warn-only on miss).
# Errors are returned as flat strings; bidirectional asymmetry is a warning
# during backfill phase (logged via stderr but not fatal).

ECOLOGY_LIST_FIELDS = (
    "prey_of",
    "preys_on",
    "competes_with",
    "scavenges_from",
)


def _collect_species_entries() -> List[Tuple[str, dict, Path]]:
    """Return list of (species_id, entry_dict, source_path) across core species files."""
    core_dir = _core_data_dir()
    entries: List[Tuple[str, dict, Path]] = []

    species_path = core_dir / "species.yaml"
    if species_path.exists():
        data = load_yaml(species_path) or {}
        for entry in data.get("species", []) or []:
            sid = entry.get("id") if isinstance(entry, dict) else None
            if sid:
                entries.append((sid, entry, species_path))

    expansion_path = core_dir / "species_expansion.yaml"
    if expansion_path.exists():
        data = load_yaml(expansion_path) or {}
        for entry in data.get("species_examples", []) or []:
            sid = entry.get("id") if isinstance(entry, dict) else None
            if sid:
                entries.append((sid, entry, expansion_path))

    return entries


def validate_species_ecology() -> List[str]:
    """Cross-ref check su blocchi ecology (ADR-2026-05-02)."""
    errors: List[str] = []
    entries = _collect_species_entries()
    if not entries:
        return errors  # nothing to validate, datasets missing handled elsewhere

    valid_ids = {sid for sid, _, _ in entries}

    # Pass 1: orphan check + self-ref + collect edges for bidirectional pass
    preys_edges: List[Tuple[str, str]] = []  # (predator, prey)
    competes_edges: List[Tuple[str, str]] = []  # (a, b) unordered

    for sid, entry, path in entries:
        ecology = entry.get("ecology") if isinstance(entry, dict) else None
        if not ecology:
            continue
        if not isinstance(ecology, dict):
            errors.append(f"{path}: species '{sid}' ecology deve essere mappa")
            continue

        for field in ECOLOGY_LIST_FIELDS:
            refs = ecology.get(field, []) or []
            if not isinstance(refs, list):
                errors.append(
                    f"{path}: species '{sid}' ecology.{field} deve essere lista"
                )
                continue
            for ref in refs:
                if not isinstance(ref, str):
                    errors.append(
                        f"{path}: species '{sid}' ecology.{field} contiene non-stringa: {ref!r}"
                    )
                    continue
                if ref == sid:
                    errors.append(
                        f"{path}: species '{sid}' ecology.{field} non puo' contenere se stessa"
                    )
                    continue
                if ref not in valid_ids:
                    errors.append(
                        f"{path}: species '{sid}' ecology.{field} -> '{ref}' (orphan: id non esistente)"
                    )
                    continue
                if field == "preys_on":
                    preys_edges.append((sid, ref))
                elif field == "competes_with":
                    competes_edges.append((sid, ref))

        # mutualism_with: list of objects with species_id
        muts = ecology.get("mutualism_with", []) or []
        if not isinstance(muts, list):
            errors.append(
                f"{path}: species '{sid}' ecology.mutualism_with deve essere lista"
            )
        else:
            for idx, mut in enumerate(muts):
                if not isinstance(mut, dict):
                    errors.append(
                        f"{path}: species '{sid}' ecology.mutualism_with[{idx}] deve essere mappa"
                    )
                    continue
                target = mut.get("species_id")
                if not isinstance(target, str) or not target:
                    errors.append(
                        f"{path}: species '{sid}' mutualism_with[{idx}] manca species_id valido"
                    )
                    continue
                if target == sid:
                    errors.append(
                        f"{path}: species '{sid}' mutualism_with[{idx}] non puo' riferirsi a se stessa"
                    )
                elif target not in valid_ids:
                    errors.append(
                        f"{path}: species '{sid}' mutualism_with[{idx}].species_id -> '{target}' (orphan)"
                    )
                mut_type = mut.get("type")
                if mut_type not in {"direct", "indirect", "obligate", "facultative"}:
                    errors.append(
                        f"{path}: species '{sid}' mutualism_with[{idx}].type invalido: {mut_type!r}"
                    )

        # pack_size sanity
        pack = ecology.get("pack_size")
        if pack is not None:
            if not isinstance(pack, dict):
                errors.append(f"{path}: species '{sid}' ecology.pack_size deve essere mappa")
            else:
                pmin = pack.get("min")
                pmax = pack.get("max")
                if not isinstance(pmin, int) or pmin < 1:
                    errors.append(f"{path}: species '{sid}' ecology.pack_size.min deve essere int>=1")
                if not isinstance(pmax, int) or pmax < 1:
                    errors.append(f"{path}: species '{sid}' ecology.pack_size.max deve essere int>=1")
                if isinstance(pmin, int) and isinstance(pmax, int) and pmax < pmin:
                    errors.append(
                        f"{path}: species '{sid}' ecology.pack_size: max ({pmax}) < min ({pmin})"
                    )

        # trophic_tier enum
        tier = ecology.get("trophic_tier")
        if tier is not None and tier not in {
            "producer", "primary_consumer", "secondary_consumer",
            "tertiary_consumer", "apex", "decomposer", "scavenger", "omnivore"
        }:
            errors.append(
                f"{path}: species '{sid}' ecology.trophic_tier invalido: {tier!r}"
            )

    # Pass 2: bidirectional consistency
    # Build prey_of map per species
    prey_of_map: dict = {}
    for sid, entry, _ in entries:
        ecology = entry.get("ecology") if isinstance(entry, dict) else None
        if isinstance(ecology, dict):
            prey_of_map[sid] = set(ecology.get("prey_of", []) or [])
        else:
            prey_of_map[sid] = set()

    for predator, prey in preys_edges:
        if predator not in prey_of_map.get(prey, set()):
            errors.append(
                f"ecology bidirectional violation: '{predator}'.preys_on -> '{prey}', "
                f"ma '{prey}'.prey_of non include '{predator}'"
            )

    return errors


if __name__ == "__main__":
    sys.exit(main())
