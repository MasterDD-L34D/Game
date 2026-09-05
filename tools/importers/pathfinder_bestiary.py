"""ETL per normalizzare il bestiario Pathfinder 1e sui nostri assi trait."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = PROJECT_ROOT / "incoming" / "pathfinder" / "bestiary1e_index.csv"
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "external" / "pathfinder_bestiary_1e.json"

AXES: tuple[str, ...] = (
    "threat",
    "defense",
    "mobility",
    "perception",
    "magic",
    "social",
    "stealth",
    "environment",
    "versatility",
)

BIOLOGY_KEYS: tuple[str, ...] = (
    "needs_food",
    "needs_water",
    "breathes",
    "has_growth_cycle",
    "life_cycle",
)


@dataclass(frozen=True)
class CreatureRow:
    name: str
    type: str
    subtype: str
    environment_tags: Sequence[str]
    movement: dict[str, float]
    special_abilities: Sequence[str]
    cr: float

    @classmethod
    def from_dict(cls, row: dict[str, str]) -> "CreatureRow":
        name = row.get("name", "").strip()
        ctype = row.get("type", "").strip().lower()
        subtype = row.get("subtype", "").strip().lower()
        env_tags = _split_multi(row.get("environment_tags", ""))
        movement = _parse_movement(row.get("movement", ""))
        specials = _split_multi(row.get("special_abilities", ""))
        cr = float(row.get("cr", "0") or 0)
        return cls(name, ctype, subtype, env_tags, movement, specials, cr)


# ---------------------------------------------------------------------------
# Parser utilities
# ---------------------------------------------------------------------------

def _split_multi(raw: str) -> list[str]:
    values: list[str] = []
    for part in raw.replace("|", ";").split(";"):
        item = part.strip()
        if item:
            values.append(item.lower())
    return values


def _parse_movement(raw: str) -> dict[str, float]:
    payload: dict[str, float] = {}
    for entry in raw.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        if ":" in entry:
            mode, value = entry.split(":", 1)
            try:
                payload[mode.strip().lower()] = float(value)
            except ValueError:
                continue
        else:
            try:
                payload["walk"] = float(entry)
            except ValueError:
                continue
    return payload


def _slugify(value: str) -> str:
    cleaned = [ch.lower() if ch.isalnum() else "-" for ch in value.strip()]
    slug = "".join(cleaned)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _format_list(items: Sequence[str], fallback: str) -> str:
    if not items:
        return fallback
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " e " + items[-1]


# ---------------------------------------------------------------------------
# Trait axis normalisation helpers
# ---------------------------------------------------------------------------

def _cr_to_threat(cr: float) -> float:
    # Pathfinder CR raramente supera 20 nel materiale SRD
    capped = min(max(cr, 0.0), 20.0)
    return round(capped / 20.0, 3)


def _defense_score(creature: CreatureRow) -> float:
    score = 0.2
    type_boost = {
        "dragon": 0.35,
        "undead": 0.3,
        "construct": 0.3,
        "outsider": 0.25,
        "giant": 0.2,
        "animal": 0.15,
    }
    score += type_boost.get(creature.type, 0.1)
    keywords = {
        "damage reduction": 0.25,
        "incorporeal": 0.2,
        "regeneration": 0.25,
        "stone skin": 0.2,
        "ferocity": 0.1,
    }
    for ability in creature.special_abilities:
        for key, value in keywords.items():
            if key in ability:
                score += value
    if creature.subtype in {"earth", "air", "fire", "water"}:
        score += 0.05
    return round(min(score, 1.0), 3)


def _mobility_score(creature: CreatureRow) -> float:
    speeds = list(creature.movement.values()) or [0.0]
    max_speed = max(speeds)
    base = max_speed / 150.0  # 150 ft rappresenta creature molto rapide
    modes_bonus = 0.05 * max(len(creature.movement) - 1, 0)
    if "fly" in creature.movement:
        modes_bonus += 0.15
    if "swim" in creature.movement or "climb" in creature.movement:
        modes_bonus += 0.05
    return round(min(base + modes_bonus, 1.0), 3)


def _perception_score(creature: CreatureRow) -> float:
    base = 0.2
    perception_keywords = {
        "darkvision": 0.15,
        "blindsense": 0.2,
        "blindsight": 0.25,
        "scent": 0.2,
        "tremorsense": 0.2,
        "true seeing": 0.3,
    }
    for ability in creature.special_abilities:
        for key, boost in perception_keywords.items():
            if key in ability:
                base += boost
    if "underground" in creature.environment_tags or creature.type in {"dragon", "outsider"}:
        base += 0.1
    return round(min(base, 1.0), 3)


def _magic_score(creature: CreatureRow) -> float:
    base = 0.1
    if creature.type in {"dragon", "outsider", "undead", "construct"}:
        base += 0.25
    if creature.subtype in {"air", "fire", "cold", "shadow", "incorporeal"}:
        base += 0.1
    magic_keywords = {
        "spell-like": 0.3,
        "spells": 0.25,
        "spellcasting": 0.3,
        "breath": 0.15,
        "frightful presence": 0.15,
    }
    for ability in creature.special_abilities:
        for key, boost in magic_keywords.items():
            if key in ability:
                base += boost
    return round(min(base, 1.0), 3)


def _social_score(creature: CreatureRow) -> float:
    base = 0.1
    if creature.type in {"humanoid", "giant", "fey"}:
        base += 0.25
    if creature.subtype in {"goblinoid", "orc", "human", "air"}:
        base += 0.1
    social_keywords = {
        "telepathy": 0.25,
        "language": 0.1,
        "leadership": 0.2,
        "frightful presence": 0.1,
        "rock throwing": 0.05,
    }
    for ability in creature.special_abilities:
        for key, boost in social_keywords.items():
            if key in ability:
                base += boost
    return round(min(base, 1.0), 3)


def _stealth_score(creature: CreatureRow) -> float:
    base = 0.05
    stealth_keywords = {
        "stealth": 0.3,
        "invisibility": 0.3,
        "shadow": 0.25,
        "incorporeal": 0.2,
        "scent": -0.05,  # animali da branco difficilmente furtivi
    }
    for ability in creature.special_abilities:
        for key, boost in stealth_keywords.items():
            if key in ability:
                base += boost
    if "urban" in creature.environment_tags or "underground" in creature.environment_tags:
        base += 0.1
    return round(max(0.0, min(base, 1.0)), 3)


def _environment_score(creature: CreatureRow) -> float:
    diversity = len(set(creature.environment_tags))
    base = diversity / 6.0
    if creature.type in {"animal", "magical beast", "plant"}:
        base += 0.1
    if "volcanic" in creature.environment_tags or "cavern" in creature.environment_tags:
        base += 0.05
    return round(min(base, 1.0), 3)


def _versatility_score(creature: CreatureRow) -> float:
    ability_component = min(len(creature.special_abilities) / 6.0, 0.6)
    mobility_component = min(len(creature.movement) / 4.0, 0.2)
    env_component = min(len(creature.environment_tags) / 6.0, 0.2)
    combined = ability_component + mobility_component + env_component
    return round(min(combined, 1.0), 3)


def compute_axes(creature: CreatureRow) -> dict[str, float]:
    return {
        "threat": _cr_to_threat(creature.cr),
        "defense": _defense_score(creature),
        "mobility": _mobility_score(creature),
        "perception": _perception_score(creature),
        "magic": _magic_score(creature),
        "social": _social_score(creature),
        "stealth": _stealth_score(creature),
        "environment": _environment_score(creature),
        "versatility": _versatility_score(creature),
    }


# ---------------------------------------------------------------------------
# Visual e tratti biologici
# ---------------------------------------------------------------------------

def _visual_description(creature: CreatureRow) -> str:
    type_block = creature.type or "creatura"
    subtype = f" {creature.subtype}" if creature.subtype else ""
    env_tags = [tag for tag in creature.environment_tags if tag]
    env_text = _format_list(env_tags[:3], "ambienti differenti")
    env_sentence = f"Si incontra soprattutto in ambienti {env_text}."

    movement_modes = []
    for mode, speed in creature.movement.items():
        if speed:
            movement_modes.append(f"{mode} ({int(speed)} ft)")
    movement_text = _format_list(movement_modes[:3], "spostamenti limitati")
    movement_sentence = f"Si muove tramite {movement_text}."

    abilities = [ability for ability in creature.special_abilities if ability]
    ability_text = _format_list(abilities[:3], "tratti naturali tipici del suo genere")
    ability_sentence = f"Tra le sue capacità più note figurano {ability_text}."

    return (
        f"{creature.name} è una {type_block}{subtype} con presenza immediatamente riconoscibile. "
        f"{env_sentence} {movement_sentence} {ability_sentence}"
    )


def _biology_profile(creature: CreatureRow) -> dict[str, object]:
    profile: dict[str, object] = {
        "needs_food": True,
        "needs_water": True,
        "breathes": True,
        "has_growth_cycle": True,
        "life_cycle": "Segue un ciclo vitale biologico: nascita, crescita, riproduzione e morte.",
    }

    type_overrides: dict[str, dict[str, object]] = {
        "construct": {
            "needs_food": False,
            "needs_water": False,
            "breathes": False,
            "has_growth_cycle": False,
            "life_cycle": "Viene costruita o animata artificialmente e non possiede un ciclo vitale biologico.",
        },
        "undead": {
            "needs_food": False,
            "needs_water": False,
            "breathes": False,
            "has_growth_cycle": False,
            "life_cycle": "È mantenuta dall'energia negativa; viene creata tramite rituali o infezioni, non attraverso nascita naturale.",
        },
        "elemental": {
            "needs_food": False,
            "needs_water": False,
            "breathes": False,
            "has_growth_cycle": False,
            "life_cycle": "È un'incarnazione elementale priva di metabolismo e ciclo riproduttivo tradizionale.",
        },
        "ooze": {
            "needs_food": True,
            "needs_water": True,
            "breathes": False,
            "has_growth_cycle": True,
            "life_cycle": "Cresce inglobando nutrienti e può riprodursi per scissione o gemmazione.",
        },
        "plant": {
            "needs_food": True,
            "needs_water": True,
            "breathes": True,
            "has_growth_cycle": True,
            "life_cycle": "Si sviluppa come organismo vegetale, propagandosi tramite semi, spore o propaguli.",
        },
        "vermin": {
            "needs_food": True,
            "needs_water": True,
            "breathes": True,
            "has_growth_cycle": True,
            "life_cycle": "Depone uova o larve e compie metamorfosi fino allo stadio adulto.",
        },
        "dragon": {
            "needs_food": True,
            "needs_water": True,
            "breathes": True,
            "has_growth_cycle": True,
            "life_cycle": "Nasce da un uovo, cresce per secoli e si riproduce come specie ovipara.",
        },
    }

    overrides = type_overrides.get(creature.type)
    if overrides:
        profile.update(overrides)

    if creature.subtype in {"aquatic", "water"}:
        profile["needs_water"] = True
        profile["life_cycle"] = (
            "Abita ambienti acquatici; il suo ciclo vitale è adattato all'acqua con fasi di nascita, crescita e riproduzione in tali habitat."
        )

    return profile


def _genetic_traits(creature: CreatureRow, biology: dict[str, object]) -> list[str]:
    traits: list[str] = []

    if biology.get("has_growth_cycle"):
        traits.append("ciclo_vitale_completo")
    else:
        traits.append("ciclo_vitale_anomalo")

    if biology.get("needs_food"):
        traits.append("metabolismo_attivo")
    else:
        traits.append("metabolismo_sostentato")

    if biology.get("breathes"):
        traits.append("respirazione_biologica")
    else:
        traits.append("assenza_respirazione")

    if creature.type in {"dragon", "magical beast", "animal"}:
        traits.append("fisiologia_predatoria")
    if creature.type in {"construct", "undead"}:
        traits.append("origine_artificiale")
    if creature.subtype in {"aquatic", "water"}:
        traits.append("adattamento_acquatico")
    if "fly" in creature.movement:
        traits.append("adattamento_volo")

    return traits


# ---------------------------------------------------------------------------
# Core ETL pipeline
# ---------------------------------------------------------------------------

def load_index(path: Path = DEFAULT_INPUT) -> list[CreatureRow]:
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = [CreatureRow.from_dict(row) for row in reader]
    return rows


def transform_creatures(rows: Iterable[CreatureRow]) -> list[dict]:
    records: list[dict] = []
    for creature in rows:
        axes = compute_axes(creature)
        visual = _visual_description(creature)
        biology = _biology_profile(creature)
        genetics = _genetic_traits(creature, biology)
        record = {
            "id": _slugify(creature.name),
            "name": creature.name,
            "type": creature.type,
            "subtype": creature.subtype,
            "cr": creature.cr,
            "environment_tags": list(creature.environment_tags),
            "movement": creature.movement,
            "special_abilities": list(creature.special_abilities),
            "axes": axes,
            "visual_description": visual,
            "biology": biology,
            "genetic_traits": genetics,
        }
        records.append(record)
    return records


def build_dataset(
    input_path: Path = DEFAULT_INPUT, output_path: Path = DEFAULT_OUTPUT
) -> dict:
    rows = load_index(input_path)
    creatures = transform_creatures(rows)
    payload = {
        "meta": {
            "source": str(input_path.relative_to(PROJECT_ROOT)),
            "record_count": len(creatures),
            "axes": AXES,
        },
        "creatures": creatures,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    return payload


if __name__ == "__main__":  # pragma: no cover - entry point manuale
    build_dataset()
