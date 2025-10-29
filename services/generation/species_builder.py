"""Species builder utilities for synthetic generation.

This module centralises trait catalog loading and provides helpers to
assemble coherent species blueprints starting from trait identifiers.

The implementation intentionally mirrors the heuristics used by the
runtime generator so that unit tests can validate both the narrative
consistency and the mechanical outputs without relying on browser-only
logic.
"""
from __future__ import annotations

import json
import hashlib
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG_PATH = REPO_ROOT / "docs" / "catalog" / "catalog_data.json"
DEFAULT_MATRIX_PATH = REPO_ROOT / "docs" / "catalog" / "species_trait_matrix.json"
DEFAULT_TRAIT_REFERENCE_PATH = (
    REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "trait_reference.json"
)
DEFAULT_TRAIT_GLOSSARY_PATH = REPO_ROOT / "data" / "traits" / "glossary.json"
DEFAULT_INVENTORY_PATH = REPO_ROOT / "docs" / "catalog" / "traits_inventory.json"
DEFAULT_PATHFINDER_DATASET_PATH = REPO_ROOT / "data" / "external" / "pathfinder_bestiary_1e.json"


@dataclass(slots=True)
class TraitUsage:
    """Represents how a trait is referenced across catalog datasets."""

    core: List[str] = field(default_factory=list)
    optional: List[str] = field(default_factory=list)
    synergy: List[str] = field(default_factory=list)

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Sequence[str]]) -> "TraitUsage":
        return cls(
            core=sorted(set(str(item) for item in mapping.get("core", []) if item)),
            optional=sorted(set(str(item) for item in mapping.get("optional", []) if item)),
            synergy=sorted(set(str(item) for item in mapping.get("synergy", []) if item)),
        )

    def to_payload(self) -> Dict[str, List[str]]:
        return {"core": self.core, "optional": self.optional, "synergy": self.synergy}


@dataclass(slots=True)
class TraitProfile:
    """Normalized view over a single trait."""

    id: str
    label: str
    tier: Optional[str]
    families: List[str]
    energy_profile: Optional[str]
    usage: Optional[str]
    selective_drive: Optional[str]
    mutation: Optional[str]
    synergies: List[str]
    conflicts: List[str]
    environments: List[str]
    weakness: Optional[str]
    dataset_sources: List[str]
    usage_map: TraitUsage

    def to_payload(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "tier": self.tier,
            "families": self.families,
            "energy_profile": self.energy_profile,
            "usage": self.usage,
            "selective_drive": self.selective_drive,
            "mutation": self.mutation,
            "synergies": self.synergies,
            "conflicts": self.conflicts,
            "environments": self.environments,
            "weakness": self.weakness,
            "dataset_sources": self.dataset_sources,
            "usage_map": self.usage_map.to_payload(),
        }


def _load_json(path: Path) -> Mapping[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _normalise_sequence(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        result: List[str] = []
        for item in value:
            if isinstance(item, str) and item.strip():
                result.append(item.strip())
        return result
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _split_families(value: Optional[str]) -> List[str]:
    if not value:
        return []
    parts = [segment.strip() for segment in str(value).replace("\\", "/").split("/")]
    return [part for part in parts if part]


def _parse_environment_requirements(entries: Any) -> List[str]:
    if not isinstance(entries, list):
        return []
    environments: List[str] = []
    for entry in entries:
        if not isinstance(entry, Mapping):
            continue
        conditions = entry.get("condizioni") or entry.get("conditions")
        if isinstance(conditions, Mapping):
            biome = conditions.get("biome_class")
            if isinstance(biome, str) and biome:
                environments.append(biome)
        biome = entry.get("biome")
        if isinstance(biome, str) and biome:
            environments.append(biome)
    return sorted(set(environments))


def build_trait_catalog_map(
    *,
    catalog_path: Path = DEFAULT_CATALOG_PATH,
    trait_reference_path: Path = DEFAULT_TRAIT_REFERENCE_PATH,
    trait_glossary_path: Path = DEFAULT_TRAIT_GLOSSARY_PATH,
    trait_matrix_path: Path = DEFAULT_MATRIX_PATH,
    inventory_path: Path = DEFAULT_INVENTORY_PATH,
) -> Dict[str, TraitProfile]:
    """Aggregate trait information from the available datasets."""

    if not trait_reference_path.exists():
        raise FileNotFoundError(f"Trait reference not found: {trait_reference_path}")

    reference = _load_json(trait_reference_path)
    glossary = _load_json(trait_glossary_path) if trait_glossary_path.exists() else {}
    matrix = _load_json(trait_matrix_path) if trait_matrix_path.exists() else {}
    inventory = _load_json(inventory_path) if inventory_path.exists() else {}

    glossary_traits = glossary.get("traits") if isinstance(glossary, Mapping) else {}
    resources = inventory.get("resources") if isinstance(inventory, Mapping) else []
    resource_paths = []
    for item in resources or []:
        if isinstance(item, Mapping):
            path = item.get("path")
            if isinstance(path, str):
                resource_paths.append(path)

    reference_traits = reference.get("traits") if isinstance(reference, Mapping) else {}

    usage_map: Dict[str, Dict[str, List[str]]] = {}

    def _register_usage(kind: str, trait_id: str, species_id: str) -> None:
        if not trait_id or not species_id:
            return
        usage_map.setdefault(trait_id, {"core": [], "optional": [], "synergy": []})
        bucket = usage_map[trait_id].setdefault(kind, [])
        if species_id not in bucket:
            bucket.append(species_id)

    for bucket_key in ("species", "events"):
        entries = matrix.get(bucket_key) if isinstance(matrix, Mapping) else {}
        if not isinstance(entries, Mapping):
            continue
        for species_id, payload in entries.items():
            if not isinstance(payload, Mapping):
                continue
            for trait_id in _normalise_sequence(payload.get("core_traits")):
                _register_usage("core", trait_id, species_id)
            for trait_id in _normalise_sequence(payload.get("optional_traits")):
                _register_usage("optional", trait_id, species_id)
            for trait_id in _normalise_sequence(payload.get("synergy_traits")):
                _register_usage("synergy", trait_id, species_id)

    catalog_traits: Dict[str, TraitProfile] = {}

    for trait_id, raw in reference_traits.items():
        if not isinstance(raw, Mapping):
            continue
        glossary_entry = glossary_traits.get(trait_id) if isinstance(glossary_traits, Mapping) else {}
        label = None
        if isinstance(glossary_entry, Mapping):
            label = glossary_entry.get("label_it") or glossary_entry.get("label_en")
        label = label or raw.get("label") or trait_id

        profile = TraitProfile(
            id=str(trait_id),
            label=str(label),
            tier=str(raw.get("tier")) if raw.get("tier") else None,
            families=_split_families(raw.get("famiglia_tipologia")),
            energy_profile=str(raw.get("fattore_mantenimento_energetico"))
            if raw.get("fattore_mantenimento_energetico")
            else None,
            usage=str(raw.get("uso_funzione")) if raw.get("uso_funzione") else None,
            selective_drive=str(raw.get("spinta_selettiva")) if raw.get("spinta_selettiva") else None,
            mutation=str(raw.get("mutazione_indotta")) if raw.get("mutazione_indotta") else None,
            synergies=_normalise_sequence(raw.get("sinergie")),
            conflicts=_normalise_sequence(raw.get("conflitti")),
            environments=_parse_environment_requirements(raw.get("requisiti_ambientali")),
            weakness=str(raw.get("debolezza")) if raw.get("debolezza") else None,
            dataset_sources=sorted(set(resource_paths)),
            usage_map=TraitUsage.from_mapping(usage_map.get(trait_id, {})),
        )
        catalog_traits[trait_id] = profile

    if catalog_path:
        catalog_payload = {
            "generated_at": None,
            "traits": {trait_id: profile.to_payload() for trait_id, profile in catalog_traits.items()},
            "sources": {
                "trait_reference": str(trait_reference_path.relative_to(REPO_ROOT)),
                "trait_matrix": str(trait_matrix_path.relative_to(REPO_ROOT))
                if trait_matrix_path.exists()
                else None,
                "trait_glossary": str(trait_glossary_path.relative_to(REPO_ROOT))
                if trait_glossary_path.exists()
                else None,
                "inventory": str(inventory_path.relative_to(REPO_ROOT))
                if inventory_path.exists()
                else None,
            },
        }
        catalog_path.parent.mkdir(parents=True, exist_ok=True)
        with catalog_path.open("w", encoding="utf-8") as handle:
            json.dump(catalog_payload, handle, ensure_ascii=False, indent=2, sort_keys=True)

    return catalog_traits


class TraitCatalog:
    """In-memory catalog accessor."""

    def __init__(self, traits: Mapping[str, TraitProfile]):
        self._traits: Dict[str, TraitProfile] = dict(traits)

    @classmethod
    def load(cls, path: Path = DEFAULT_CATALOG_PATH) -> "TraitCatalog":
        if path.exists():
            payload = _load_json(path)
            traits_payload = payload.get("traits") if isinstance(payload, Mapping) else {}
            traits: Dict[str, TraitProfile] = {}
            for trait_id, raw in traits_payload.items():
                if not isinstance(raw, Mapping):
                    continue
                traits[trait_id] = TraitProfile(
                    id=trait_id,
                    label=str(raw.get("label") or trait_id),
                    tier=str(raw.get("tier")) if raw.get("tier") else None,
                    families=_normalise_sequence(raw.get("families")),
                    energy_profile=str(raw.get("energy_profile"))
                    if raw.get("energy_profile")
                    else None,
                    usage=str(raw.get("usage")) if raw.get("usage") else None,
                    selective_drive=str(raw.get("selective_drive")) if raw.get("selective_drive") else None,
                    mutation=str(raw.get("mutation")) if raw.get("mutation") else None,
                    synergies=_normalise_sequence(raw.get("synergies")),
                    conflicts=_normalise_sequence(raw.get("conflicts")),
                    environments=_normalise_sequence(raw.get("environments")),
                    weakness=str(raw.get("weakness")) if raw.get("weakness") else None,
                    dataset_sources=_normalise_sequence(raw.get("dataset_sources")),
                    usage_map=TraitUsage.from_mapping(raw.get("usage_map", {})),
                )
            if traits:
                return cls(traits)
        # fall-back to build from scratch
        traits = build_trait_catalog_map()
        return cls(traits)

    def get(self, trait_id: str) -> Optional[TraitProfile]:
        return self._traits.get(trait_id)

    def require(self, trait_id: str) -> TraitProfile:
        profile = self.get(trait_id)
        if not profile:
            raise KeyError(f"Trait '{trait_id}' non presente nel catalogo")
        return profile

    def traits(self, trait_ids: Iterable[str]) -> List[TraitProfile]:
        result: List[TraitProfile] = []
        for trait_id in trait_ids:
            profile = self.get(trait_id)
            if profile:
                result.append(profile)
        return result


FAMILY_KEYWORDS = {
    "Locomotorio": "locomotor",
    "Prensile": "prehensile",
    "Strutturale": "structural",
    "Difensivo": "defensive",
    "Sensoriale": "sensorial",
    "Nervoso": "neural",
    "Metabolico": "metabolic",
    "Supporto": "support",
    "Empatico": "social",
    "Cognitivo": "cognitive",
    "Offensivo": "offensive",
    "Biotico": "biotic",
}

BEHAVIOUR_KEYWORDS = {
    "coordin": "coordinated",
    "pred": "predatory",
    "difes": "defensive",
    "support": "supportive",
    "simbi": "symbiotic",
    "migraz": "migratory",
    "arramp": "climber",
    "vol": "aerial",
    "echo": "echolocator",
    "dispers": "disperser",
    "scav": "scavenger",
}

ENERGY_ORDER = ["basso", "medio", "alto", "estremo"]


def _normalise_energy(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value_lower = value.lower()
    for token in ("basso", "medio", "alto", "estremo"):
        if token in value_lower:
            return token
    return value_lower.strip()


def _score_energy(values: Iterable[str]) -> Optional[str]:
    picked: Optional[str] = None
    for value in values:
        normalised = _normalise_energy(value)
        if not normalised:
            continue
        if picked is None:
            picked = normalised
            continue
        if ENERGY_ORDER.index(normalised) > ENERGY_ORDER.index(picked):
            picked = normalised
    return picked


def _tier_value(tier: Optional[str]) -> Optional[int]:
    if not tier:
        return None
    for prefix in ("T", "t"):
        if tier.startswith(prefix):
            try:
                return int(tier[1:])
            except ValueError:
                return None
    try:
        return int(tier)
    except (TypeError, ValueError):
        return None


def _rarity_from_traits(traits: Sequence[TraitProfile]) -> str:
    high_tiers = sum(1 for trait in traits if (_tier_value(trait.tier) or 1) >= 3)
    if high_tiers >= 3:
        return "R4"
    if high_tiers == 2:
        return "R3"
    if high_tiers == 1:
        return "R2"
    return "R1"


def _threat_from_traits(traits: Sequence[TraitProfile]) -> str:
    values = [value for value in (_tier_value(trait.tier) for trait in traits) if value]
    if not values:
        return "T1"
    avg = sum(values) / len(values)
    tier = min(5, max(1, int(round(avg))))
    return f"T{tier}"


def _synergy_score(traits: Sequence[TraitProfile]) -> float:
    if not traits:
        return 0.0
    total = 0
    for trait in traits:
        overlap = sum(1 for candidate in traits if candidate.id in trait.synergies)
        total += overlap
    return round(total / (len(traits) * max(len(traits) - 1, 1)), 3)


def _clamp_score(value: float | int | None) -> float:
    try:
        numeric = float(value) if value is not None else 0.0
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(round(numeric, 3), 1.0))


class PathfinderTraitFormula:
    """Heuristics that derive Evo Tactics trait buckets from Pathfinder data."""

    _ABILITY_KEYWORDS: Sequence[tuple[Sequence[str], str, str]] = (
        (("aura", "angel", "radiant"), "aura_scudo_radianza", "core"),
        (("detect thoughts", "telepathy", "empathy"), "empatia_coordinativa", "core"),
        (("wail", "chorus", "lament"), "risonanza_di_branco", "core"),
        (("multiweapon", "multiattack", "whirlwind"), "focus_frazionato", "core"),
        (("whip",), "frusta_fiammeggiante", "core"),
        (("flaming body", "inferno", "meteoric"), "mantello_meteoritico", "core"),
        (("poison", "disease", "filth"), "lamelle_termoforetiche", "optional"),
        (("constrict", "tendrils", "coil"), "artigli_sette_vie", "optional"),
        (("phase", "dimension", "ethereal"), "carapace_fase_variabile", "optional"),
    )

    _TYPE_TRAITS: Mapping[str, Sequence[tuple[str, str]]] = {
        "construct": (("armatura_pietra_planare", "core"),),
        "undead": (("risonanza_di_branco", "core"),),
        "aberration": (("carapace_fase_variabile", "optional"),),
        "outsider": (("empatia_coordinativa", "optional"),),
    }

    _SUBTYPE_TRAITS: Sequence[tuple[str, Sequence[tuple[str, str]]]] = (
        ("angel", (("aura_scudo_radianza", "core"),)),
        ("demon", (("mantello_meteoritico", "core"), ("frusta_fiammeggiante", "core"))),
        ("rakshasa", (("empatia_coordinativa", "core"),)),
        ("incorporeal", (("risonanza_di_branco", "core"),)),
    )

    _MOVEMENT_TRAITS: Mapping[str, tuple[str, str]] = {
        "burrow": ("carapace_fase_variabile", "optional"),
        "fly": ("focus_frazionato", "synergy"),
    }

    _ENVIRONMENT_TRAITS: Sequence[tuple[str, str, str]] = (
        ("planar", "armatura_pietra_planare", "optional"),
        ("ash", "mantello_meteoritico", "optional"),
        ("ruins", "armatura_pietra_planare", "optional"),
    )

    _PROFILE_OVERRIDES: Mapping[str, Mapping[str, Sequence[str]]] = {
        "solar": {"core": ("aura_scudo_radianza", "empatia_coordinativa"), "synergy": ("risonanza_di_branco",)},
        "balor": {"core": ("mantello_meteoritico", "frusta_fiammeggiante"), "optional": ("carapace_fase_variabile",)},
        "marilith": {"core": ("focus_frazionato",), "optional": ("artigli_sette_vie",)},
        "rakshasa": {"core": ("empatia_coordinativa",), "synergy": ("risonanza_di_branco",)},
        "treant": {"optional": ("armatura_pietra_planare",), "synergy": ("risonanza_di_branco",)},
        "otyugh": {"core": ("lamelle_termoforetiche",), "optional": ("carapace_fase_variabile",)},
        "banshee": {"core": ("risonanza_di_branco",),},
        "stone-golem": {"core": ("armatura_pietra_planare",),},
        "adamantine-golem": {"core": ("armatura_pietra_planare",),},
        "couatl": {"core": ("empatia_coordinativa",), "synergy": ("risonanza_di_branco",)},
        "bulette": {"core": ("carapace_fase_variabile",), "optional": ("armatura_pietra_planare",)},
    }

    def extract(
        self, entry: Mapping[str, Any], *, fallback_traits: Sequence[str] = ()
    ) -> Dict[str, List[str]]:
        """Return normalized trait buckets."""

        buckets: Dict[str, List[str]] = {"core": [], "optional": [], "synergy": []}
        trait_location: Dict[str, str] = {}
        bucket_priority = {"core": 3, "optional": 2, "synergy": 1}

        def _register(bucket: str, trait_id: str) -> None:
            if not trait_id:
                return
            current_bucket = trait_location.get(trait_id)
            if current_bucket:
                if bucket_priority[bucket] <= bucket_priority[current_bucket]:
                    return
                buckets[current_bucket] = [t for t in buckets[current_bucket] if t != trait_id]
            buckets[bucket].append(trait_id)
            trait_location[trait_id] = bucket

        base_traits = entry.get("genetic_traits")
        if isinstance(base_traits, Sequence):
            for trait_id in base_traits:
                if isinstance(trait_id, str):
                    _register("core", trait_id)

        type_field = str(entry.get("type") or "").lower()
        for trait_id, bucket in self._TYPE_TRAITS.get(type_field, ()):  
            _register(bucket, trait_id)

        subtype_field = str(entry.get("subtype") or "").lower()
        for keyword, trait_specs in self._SUBTYPE_TRAITS:
            if keyword in subtype_field:
                for trait_id, bucket in trait_specs:
                    _register(bucket, trait_id)

        movement_entry = entry.get("movement")
        if isinstance(movement_entry, Mapping):
            for key, (trait_id, bucket) in self._MOVEMENT_TRAITS.items():
                if key in movement_entry:
                    _register(bucket, trait_id)

        ability_text = " ".join(str(item).lower() for item in entry.get("special_abilities", []) if item)
        for keywords, trait_id, bucket in self._ABILITY_KEYWORDS:
            if any(keyword in ability_text for keyword in keywords):
                _register(bucket, trait_id)

        environment_text = " ".join(str(tag).lower() for tag in entry.get("environment_tags", []) if tag)
        for keyword, trait_id, bucket in self._ENVIRONMENT_TRAITS:
            if keyword in environment_text:
                _register(bucket, trait_id)

        profile_id = str(entry.get("id") or "").lower()
        overrides = self._PROFILE_OVERRIDES.get(profile_id, {})
        for bucket, traits in overrides.items():
            for trait_id in traits:
                _register(bucket, trait_id)

        for trait_id in fallback_traits:
            if isinstance(trait_id, str):
                _register("optional", trait_id)

        return buckets


class PathfinderProfileTranslator:
    """Translate Pathfinder statblocks into runtime-ready blueprints."""

    def __init__(
        self,
        dataset_path: Path = DEFAULT_PATHFINDER_DATASET_PATH,
        *,
        trait_formula: PathfinderTraitFormula | None = None,
    ) -> None:
        self.dataset_path = dataset_path
        self._index: Dict[str, Mapping[str, Any]] | None = None
        self.trait_formula = trait_formula or PathfinderTraitFormula()

    def _load_dataset(self) -> Dict[str, Mapping[str, Any]]:
        if self._index is None:
            payload = _load_json(self.dataset_path)
            creatures = payload.get("creatures") if isinstance(payload, Mapping) else []
            index: Dict[str, Mapping[str, Any]] = {}
            if isinstance(creatures, list):
                for entry in creatures:
                    if isinstance(entry, Mapping) and entry.get("id"):
                        index[str(entry["id"])] = dict(entry)
            self._index = index
        return self._index

    def get_profile(self, profile_id: str) -> Mapping[str, Any]:
        dataset = self._load_dataset()
        try:
            return dataset[str(profile_id)]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"Profilo Pathfinder '{profile_id}' non trovato") from exc

    @staticmethod
    def _threat_tier_from_score(score: float | int | None) -> str:
        numeric = _clamp_score(score)
        tier = max(1, min(5, int(round(numeric * 4)) + 1))
        return f"T{tier}"

    @staticmethod
    def _rarity_from_score(score: float | int | None) -> str:
        numeric = _clamp_score(score)
        if numeric >= 0.85:
            return "R4"
        if numeric >= 0.65:
            return "R3"
        if numeric >= 0.4:
            return "R2"
        return "R1"

    @staticmethod
    def _role_from_entry(entry: Mapping[str, Any]) -> str:
        type_field = str(entry.get("type") or "").lower()
        if type_field in {"dragon", "magical beast", "outsider", "aberration"}:
            return "predatore_terziario_apex"
        if type_field in {"plant", "ooze", "vermin"}:
            return "ingegneri_ecosistema"
        if type_field in {"construct", "undead"}:
            return "minaccia_microbica"
        return "evento_ecologico"

    @staticmethod
    def _vc_from_axes(axes: Mapping[str, Any]) -> Dict[str, float]:
        threat = _clamp_score(axes.get("threat"))
        defense = _clamp_score(axes.get("defense"))
        mobility = _clamp_score(axes.get("mobility"))
        perception = _clamp_score(axes.get("perception"))
        magic = _clamp_score(axes.get("magic"))
        social = _clamp_score(axes.get("social"))
        stealth = _clamp_score(axes.get("stealth"))
        environment = _clamp_score(axes.get("environment"))
        versatility = _clamp_score(axes.get("versatility"))
        return {
            "aggro": threat,
            "risk": _clamp_score(1.0 - defense),
            "cohesion": social,
            "setup": max(magic, versatility),
            "explore": max(mobility, environment),
            "tilt": max(perception, stealth),
        }

    @staticmethod
    def _summary_from_entry(entry: Mapping[str, Any]) -> str:
        abilities = entry.get("special_abilities")
        if isinstance(abilities, list) and abilities:
            head = ", ".join(str(item) for item in abilities[:3])
            return f"Capacità chiave: {head}"
        return str(entry.get("visual_description") or "Profilo importato dal bestiario Pathfinder")

    def build_blueprint(
        self,
        profile_id: str,
        *,
        biome_id: str | None = None,
        fallback_traits: Sequence[str] = (),
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        entry = self.get_profile(profile_id)
        axes = entry.get("axes") if isinstance(entry, Mapping) else {}
        vc = self._vc_from_axes(axes if isinstance(axes, Mapping) else {})
        threat_tier = self._threat_tier_from_score(axes.get("threat") if isinstance(axes, Mapping) else None)
        rarity = self._rarity_from_score(axes.get("versatility") if isinstance(axes, Mapping) else None)
        trait_buckets = self.trait_formula.extract(entry, fallback_traits=fallback_traits)
        traits = ["pathfinder", *trait_buckets["core"]]

        abilities = [ability for ability in entry.get("special_abilities", []) if ability]
        environment_tags = [tag for tag in entry.get("environment_tags", []) if tag]
        functional_tags = [
            tag
            for tag in (
                "pathfinder",
                str(entry.get("type") or "").lower(),
                str(entry.get("subtype") or "").lower(),
            )
            if tag
        ]

        blueprint: Dict[str, Any] = {
            "id": f"pathfinder-{entry.get('id')}",
            "display_name": str(entry.get("name") or entry.get("id") or "Creatura Pathfinder"),
            "summary": self._summary_from_entry(entry),
            "description": str(entry.get("visual_description") or ""),
            "role_trofico": self._role_from_entry(entry),
            "functional_tags": functional_tags,
            "biomes": [biome_id] if biome_id else [],
            "vc": vc,
            "playable_unit": False,
            "spawn_rules": {"densita": "moderata"},
            "balance": {
                "threat_tier": threat_tier,
                "rarity": rarity,
                "encounter_role": "ambient",
            },
            "statistics": {
                "threat_tier": threat_tier,
                "rarity": rarity,
                "energy_profile": None,
                "synergy_score": _clamp_score(axes.get("versatility") if isinstance(axes, Mapping) else None),
            },
            "traits": {
                "core": traits,
                "derived": trait_buckets["optional"],
                "conflicts": trait_buckets["synergy"],
            },
            "morphology": {
                "families": [str(entry.get("type") or "").lower()],
                "adaptations": entry.get("genetic_traits") or [],
                "environments": environment_tags,
            },
            "behavior": {"tags": ["pathfinder"], "drives": abilities[:2]},
            "special_abilities": abilities,
            "environment_affinity": {
                "biome_class": biome_id or "pathfinder_unknown",
                "source_tags": environment_tags,
            },
            "derived_from_environment": {
                "suggested_traits": trait_buckets["core"],
                "optional_traits": trait_buckets["optional"],
                "synergy_traits": ["pathfinder", *trait_buckets["synergy"]],
            },
            "source_dataset": {
                "id": "pathfinder",
                "profile_id": profile_id,
                "cr": entry.get("cr"),
                "axes": axes,
            },
        }

        meta = {
            "dataset_id": "pathfinder",
            "profile_id": profile_id,
            "source_cr": entry.get("cr"),
            "source_axes": axes,
        }

        return blueprint, meta



class SpeciesBuilder:
    """Generate species blueprints from trait identifiers."""

    def __init__(self, catalog: TraitCatalog):
        self.catalog = catalog

    def _derive_morphology(self, traits: Sequence[TraitProfile]) -> Dict[str, Any]:
        families = []
        adaptations: List[str] = []
        for trait in traits:
            for family in trait.families:
                for keyword, tag in FAMILY_KEYWORDS.items():
                    if keyword.lower() in family.lower():
                        families.append(tag)
                        break
                else:
                    families.append(family.lower())
            if trait.mutation:
                adaptations.append(trait.mutation)
            if trait.weakness:
                adaptations.append(f"Precauzione: {trait.weakness}")
        environments = sorted({env for trait in traits for env in trait.environments})
        return {
            "families": sorted(set(families)),
            "adaptations": adaptations,
            "environments": environments,
        }

    def _derive_behaviour(self, traits: Sequence[TraitProfile]) -> Dict[str, Any]:
        tags: List[str] = []
        drives: List[str] = []
        for trait in traits:
            for field in (trait.usage, trait.selective_drive):
                if not field:
                    continue
                drives.append(field)
                lowered = field.lower()
                for token, label in BEHAVIOUR_KEYWORDS.items():
                    if token in lowered and label not in tags:
                        tags.append(label)
        return {
            "tags": tags,
            "drives": drives,
        }

    def _compose_summary(self, traits: Sequence[TraitProfile]) -> str:
        labels = [trait.label for trait in traits[:3]]
        return ", ".join(labels)

    def _compose_description(
        self,
        traits: Sequence[TraitProfile],
        morphology: Mapping[str, Any],
        behaviour: Mapping[str, Any],
    ) -> str:
        if not traits:
            return "Specie sintetica generata da trait sconosciuti."
        lead = f"Sintesi genetica focalizzata su {traits[0].label}"
        if len(traits) > 1:
            lead += f" e {traits[1].label}"
        morpho = ""
        families = morphology.get("families") or []
        if families:
            morpho = f" con impronta morfologica {', '.join(families)}"
        behaviour_tags = behaviour.get("tags") or []
        if behaviour_tags:
            morpho += f"; comportamento {', '.join(behaviour_tags)}"
        environments = morphology.get("environments") or []
        env_part = (
            f" Ottimizzata per biomi: {', '.join(environments)}."
            if environments
            else " Ottimizzata per biomi vari."
        )
        return f"{lead}{morpho}.{env_part}"

    def build(
        self,
        trait_ids: Sequence[str],
        *,
        seed: Optional[int | str] = None,
        base_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        profiles = self.catalog.traits(trait_ids)
        if not profiles:
            raise ValueError("Impossibile generare specie: nessun tratto riconosciuto")

        rng = random.Random()
        if seed is not None:
            rng.seed(seed)

        morphology = self._derive_morphology(profiles)
        behaviour = self._derive_behaviour(profiles)
        energy = _score_energy(trait.energy_profile for trait in profiles if trait.energy_profile)
        threat = _threat_from_traits(profiles)
        rarity = _rarity_from_traits(profiles)
        synergy_score = _synergy_score(profiles)
        summary = self._compose_summary(profiles)
        description = self._compose_description(profiles, morphology, behaviour)

        display_name = base_name or profiles[0].label
        if len(profiles) > 1:
            blend = rng.choice(profiles[1:]).label
            display_name = f"{display_name} / {blend}"

        derived_traits = sorted({trait for profile in profiles for trait in profile.synergies})
        conflicting = sorted({trait for profile in profiles for trait in profile.conflicts})

        identifier_seed = f"{display_name}-{threat}-{rarity}-{rng.random():.4f}"
        digest = hashlib.sha1(identifier_seed.encode("utf-8")).hexdigest()
        identifier = "synthetic-" + digest[:10]

        return {
            "id": identifier,
            "display_name": display_name,
            "summary": summary,
            "description": description,
            "morphology": morphology,
            "behavior": behaviour,
            "statistics": {
                "threat_tier": threat,
                "rarity": rarity,
                "energy_profile": energy,
                "synergy_score": synergy_score,
            },
            "traits": {
                "core": [profile.id for profile in profiles],
                "derived": derived_traits,
                "conflicts": conflicting,
            },
        }


def load_builder() -> SpeciesBuilder:
    catalog = TraitCatalog.load()
    return SpeciesBuilder(catalog)


__all__ = [
    "SpeciesBuilder",
    "TraitCatalog",
    "TraitProfile",
    "TraitUsage",
    "build_trait_catalog_map",
    "load_builder",
    "PathfinderTraitFormula",
    "PathfinderProfileTranslator",
]
