"""Hydration encounter + party -> CombatState iniziale.

Produce uno stato iniziale di combattimento conforme a
``packages/contracts/schemas/combat.schema.json`` a partire da:

- un encounter statico (shape: biome/tb/groups[]/party_vc, come in
  ``docs/examples/encounter_caverna.txt``),
- una party composition (lista di dict con id/species_id/trait_ids),
- il catalog delle mechanics caricato da
  ``packs/evo_tactics_pack/data/balance/trait_mechanics.yaml``.

Le derivazioni numeriche sono ancorate al balance di riferimento
(``docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md``) e al
sistema d20 di ``docs/10-SISTEMA_TATTICO.md``: HP/Armor dei nemici sono
derivati da ``power`` dei gruppi, AP.max e' fisso a 2, lo stress parte
da 0.0 (float 0-1), e le resistenze di ciascuna unita' vengono aggregate
sommando i ``modifier_pct`` per canale dai trait attivi, con clamp
``[-100, +100]``.

Il modulo e' puro: nessun I/O globale, nessun randomness. Il parametro
``seed`` viene conservato nello stato ma non consumato all'hydration
(il resolver della Fase 5 lo usera' con ``namespaced_rng``).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

import yaml

# Lazy-safe: resolver.py does not import hydration, so direct import is safe.
# ADR-2026-04-19 locks merge_resistances as the single convertitore
# species-scale (100-neutral) -> delta format consumed by apply_resistance.
from rules.resolver import merge_resistances

#: Range di clamp per le resistenze aggregate (coerente con
#: ``combat.schema.json#/$defs/resistance_entry`` che ammette ``[-100, 100]``).
RESISTANCE_MIN = -100
RESISTANCE_MAX = 100

#: AP massimi di default. Fonte: ``docs/10-SISTEMA_TATTICO.md`` ("2 AP").
DEFAULT_AP_MAX = 2

#: Valori baseline per unita' party. Il Balancer umano potra' sostituirli
#: con formule specie-specifiche in un prossimo pass.
DEFAULT_PARTY_HP = 50
DEFAULT_PARTY_ARMOR = 4
DEFAULT_PARTY_INITIATIVE = 12

#: Tier di default per unita' party (keystone = unita' giocatore "matura").
#: Il resolver usa ``tier`` nel calcolo della CD ``10 + target.tier + defense_mod``.
DEFAULT_PARTY_TIER = 3

#: Range del tier consentito dallo schema combat (``combat_unit.tier``).
TIER_MIN = 1
TIER_MAX = 6

#: Pool PT iniziale di ogni unita' (Fase 7 - PT + Parry).
DEFAULT_PT_POOL = 0

#: Reazioni per turno di default (parry/counter/overwatch condivisi su un
#: solo slot). Il doc ``docs/10-SISTEMA_TATTICO.md`` dichiara "2 AP + Reazioni"
#: senza numero esplicito; la convenzione piu' conservativa e' 1.
DEFAULT_REACTIONS_MAX = 1


def derive_tier_from_power(power: int) -> int:
    """Deriva il tier di un'unita' ostile dal ``power`` del gruppo encounter.

    Formula: ``clamp((power // 3) + 1, 1, 5)``. Ancorata al Frattura draft
    (Polpo Araldo Sinaptico, tier 3 keystone, e' coerente con power ~7).

    Mapping:

    - power 0-2 -> tier 1 (minion)
    - power 3-5 -> tier 2 (bridge)
    - power 6-8 -> tier 3 (keystone)
    - power 9-11 -> tier 4
    - power 12+ -> tier 5 (apex)
    """

    return _clamp((int(power) // 3) + 1, TIER_MIN, 5)


def load_active_effects_registry() -> Dict[str, Any]:
    """A1: carica active_effects.yaml e lo rende disponibile per il resolver.

    Il registry viene allegato allo state da hydrate_encounter() cosi'
    che resolver.py possa valutare trait effects senza caricamenti extra.
    """
    try:
        from trait_effects import load_active_effects
        return load_active_effects()
    except Exception:
        return {}


def _resolve_inheritance(
    traits: Dict[str, Any], defaults: Dict[str, Any]
) -> Dict[str, Any]:
    """O1 pattern: risolve `inherits:` depth-first merge.

    Se un trait ha ``inherits: <class>``, i campi mancanti vengono
    copiati dalla classe in ``_defaults``. Campi espliciti sovrascrivono.
    """
    resolved: Dict[str, Any] = {}
    for trait_id, entry in traits.items():
        if not isinstance(entry, Mapping):
            resolved[trait_id] = entry
            continue
        parent_key = entry.get("inherits")
        if parent_key and parent_key in defaults:
            merged = dict(defaults[parent_key])
            for k, v in entry.items():
                if k == "inherits":
                    continue
                merged[k] = v
            resolved[trait_id] = merged
        else:
            resolved[trait_id] = dict(entry)
    return resolved


def load_trait_mechanics(path: Path) -> Dict[str, Any]:
    """Carica ``trait_mechanics.yaml`` e restituisce il dict ``{trait_id: entry}``.

    Il file atteso e' ``packs/evo_tactics_pack/data/balance/trait_mechanics.yaml``
    con shape validata da ``traitMechanics.schema.json``.

    Supporta O1 pattern: ``_defaults`` per classi trait + ``inherits:`` per
    ereditare baseline da una classe.
    """

    with open(path, encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    traits = data.get("traits") if isinstance(data, Mapping) else None
    if not isinstance(traits, Mapping):
        raise ValueError(
            f"trait_mechanics atteso dict con chiave 'traits', trovato: {type(data).__name__}"
        )
    defaults = data.get("_defaults") or {}
    if defaults and isinstance(defaults, Mapping):
        return _resolve_inheritance(dict(traits), dict(defaults))
    return dict(traits)


def aggregate_resistances(
    trait_ids: Iterable[str],
    catalog: Mapping[str, Any],
) -> List[Dict[str, Any]]:
    """Somma ``modifier_pct`` per canale sui trait attivi.

    Canali con somma zero vengono esclusi dall'output (noise reduction).
    Il risultato e' una lista di ``{channel, modifier_pct}`` ordinata per
    canale, con ``modifier_pct`` clampato in ``[-100, 100]``. Trait_id
    sconosciuti al catalog vengono ignorati silenziosamente.
    """

    totals: Dict[str, int] = {}
    for trait_id in trait_ids:
        entry = catalog.get(trait_id)
        if not isinstance(entry, Mapping):
            continue
        for res in entry.get("resistances") or []:
            channel = res.get("channel")
            mod = res.get("modifier_pct")
            if not isinstance(channel, str) or not isinstance(mod, int):
                continue
            totals[channel] = totals.get(channel, 0) + mod

    return [
        {
            "channel": channel,
            "modifier_pct": _clamp(total, RESISTANCE_MIN, RESISTANCE_MAX),
        }
        for channel, total in sorted(totals.items())
        if total != 0
    ]


def load_species_resistances(path: Path) -> Dict[str, Any]:
    """Carica ``species_resistances.yaml`` e restituisce il dict completo.

    Shape atteso (ADR-2026-04-19):

    .. code-block:: yaml

        version: "0.1.0"
        species_archetypes:
          corazzato:
            label: "Corazzato"
            resistances: {fisico: 80, taglio: 80, psionico: 120, ...}
          ...
        default_archetype: adattivo

    I valori ``pct`` sono in scala **100-neutral**: ``80`` = 20% resist,
    ``120`` = 20% vuln. Solo ``merge_resistances`` li converte in delta.
    """

    with open(path, encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    if not isinstance(data, Mapping):
        raise ValueError(
            f"species_resistances atteso dict root, trovato: {type(data).__name__}"
        )
    return dict(data)


def get_archetype_resistances(
    archetype_id: Optional[str],
    species_resistances_data: Optional[Mapping[str, Any]],
) -> Optional[Dict[str, int]]:
    """Estrae il dict ``{channel: pct}`` (100-neutral) per un archetipo.

    Se ``archetype_id`` e' ``None`` o non matcha, usa ``default_archetype``
    definito nel YAML (default ``adattivo`` se assente). Se anche il default
    non esiste, ritorna ``None`` (nessun baseline species applicato).
    """
    if not species_resistances_data:
        return None
    archetypes = species_resistances_data.get("species_archetypes") or {}
    if not isinstance(archetypes, Mapping):
        return None

    lookup_id = archetype_id if archetype_id in archetypes else None
    if lookup_id is None:
        default_id = species_resistances_data.get("default_archetype", "adattivo")
        lookup_id = default_id if default_id in archetypes else None
    if lookup_id is None:
        return None

    entry = archetypes.get(lookup_id)
    if not isinstance(entry, Mapping):
        return None
    resistances = entry.get("resistances")
    if not isinstance(resistances, Mapping):
        return None
    return {str(ch): int(pct) for ch, pct in resistances.items()}


def _resistances_with_species(
    trait_ids: Iterable[str],
    catalog: Mapping[str, Any],
    species_archetype: Optional[Mapping[str, int]],
) -> List[Dict[str, Any]]:
    """Compone resistenze species (100-neutral) + trait (delta).

    Se ``species_archetype`` e' ``None``, fallback puro a
    ``aggregate_resistances`` (backward compat: pre-ADR-2026-04-19).

    Se presente, raccoglie il trait list raw dalle entry del catalog
    (NON somma pre-clamp) e delega a ``merge_resistances`` che:

    1. Converte species 100-neutral -> delta (``merged[ch] = 100 - pct``)
    2. Somma trait delta
    3. Ritorna lista ``{channel, modifier_pct}`` in formato delta.

    Il clamp finale ``[-100, 100]`` viene applicato qui per coerenza con
    ``aggregate_resistances`` e ``combat.schema.json#/$defs/resistance_entry``.
    """
    if species_archetype is None:
        return aggregate_resistances(trait_ids, catalog)

    trait_resistances: List[Dict[str, Any]] = []
    for trait_id in trait_ids:
        entry = catalog.get(trait_id)
        if not isinstance(entry, Mapping):
            continue
        for res in entry.get("resistances") or []:
            channel = res.get("channel")
            mod = res.get("modifier_pct")
            if not isinstance(channel, str) or not isinstance(mod, int):
                continue
            trait_resistances.append({"channel": channel, "modifier_pct": mod})

    merged = merge_resistances(trait_resistances, species_archetype)
    # Clamp finale + sort + noise reduction (zero filter) in linea con
    # aggregate_resistances. merge_resistances non applica clamp.
    return [
        {
            "channel": entry["channel"],
            "modifier_pct": _clamp(
                int(entry["modifier_pct"]), RESISTANCE_MIN, RESISTANCE_MAX
            ),
        }
        for entry in sorted(merged, key=lambda r: r["channel"])
        if int(entry.get("modifier_pct", 0)) != 0
    ]


def build_party_unit(
    unit_id: str,
    species_id: str,
    trait_ids: Sequence[str],
    catalog: Mapping[str, Any],
    *,
    hp: int = DEFAULT_PARTY_HP,
    armor: int = DEFAULT_PARTY_ARMOR,
    initiative: int = DEFAULT_PARTY_INITIATIVE,
    tier: int = DEFAULT_PARTY_TIER,
    species_archetype: Optional[Mapping[str, int]] = None,
) -> Dict[str, Any]:
    """Costruisce un ``CombatUnit`` per un membro party.

    I valori di default sono baseline piatti; il chiamante puo' sovrascrivere
    ``hp``, ``armor``, ``initiative`` e ``tier`` per calibrare singole unita'.

    ``species_archetype`` (ADR-2026-04-19, M5-#1b wire) e' il dict
    ``{channel: pct}`` in scala 100-neutral per l'archetipo della specie
    (es. ``{fisico: 80, psionico: 120, ...}``). Se presente, le resistenze
    finali sono composte come species-baseline + trait-delta via
    ``merge_resistances``. Se ``None``, fallback backward-compat a
    ``aggregate_resistances`` (trait-only).
    """

    return {
        "id": unit_id,
        "species_id": species_id,
        "side": "party",
        "tier": _clamp(int(tier), TIER_MIN, TIER_MAX),
        "hp": {"current": hp, "max": hp},
        "ap": {"current": DEFAULT_AP_MAX, "max": DEFAULT_AP_MAX},
        "armor": armor,
        "initiative": initiative,
        "stress": 0.0,
        "statuses": [],
        "resistances": _resistances_with_species(trait_ids, catalog, species_archetype),
        "trait_ids": list(trait_ids),
        "pt": DEFAULT_PT_POOL,
        "reactions": {"current": DEFAULT_REACTIONS_MAX, "max": DEFAULT_REACTIONS_MAX},
    }


def build_hostile_unit_from_group(
    unit_id: str,
    species_id: str,
    group: Mapping[str, Any],
    trait_ids: Sequence[str],
    catalog: Mapping[str, Any],
    *,
    species_archetype: Optional[Mapping[str, int]] = None,
) -> Dict[str, Any]:
    """Costruisce un ``CombatUnit`` ostile dai dati di un ``group`` encounter.

    Derivazioni numeriche da ``group['power']`` (ancorate al Frattura draft):

    - ``hp = 40 + power * 10`` (power 7 ~ 110 HP tier 3-keystone,
      power 4 ~ 80 HP tier 2-bridge)
    - ``armor = clamp(2 + power // 2, 2, 12)`` (range osservato 2-11)
    - ``initiative = 8 + power``

    ``species_archetype`` (ADR-2026-04-19, M5-#1b wire): vedi
    ``build_party_unit`` per semantica. Fallback backward-compat se ``None``.
    """

    power = int(group.get("power", 0))
    hp = 40 + power * 10
    armor = _clamp(2 + power // 2, 2, 12)
    initiative = 8 + power
    tier = derive_tier_from_power(power)

    return {
        "id": unit_id,
        "species_id": species_id,
        "side": "hostile",
        "tier": tier,
        "hp": {"current": hp, "max": hp},
        "ap": {"current": DEFAULT_AP_MAX, "max": DEFAULT_AP_MAX},
        "armor": armor,
        "initiative": initiative,
        "stress": 0.0,
        "statuses": [],
        "resistances": _resistances_with_species(trait_ids, catalog, species_archetype),
        "trait_ids": list(trait_ids),
        "pt": DEFAULT_PT_POOL,
        "reactions": {"current": DEFAULT_REACTIONS_MAX, "max": DEFAULT_REACTIONS_MAX},
    }


def hydrate_encounter(
    encounter: Mapping[str, Any],
    party: Sequence[Mapping[str, Any]],
    catalog: Mapping[str, Any],
    seed: str,
    session_id: str,
    encounter_id: Optional[str] = None,
    hostile_species_ids: Optional[Sequence[str]] = None,
    hostile_trait_ids: Optional[Sequence[Sequence[str]]] = None,
    species_resistances_data: Optional[Mapping[str, Any]] = None,
    party_archetypes: Optional[Sequence[Optional[str]]] = None,
    hostile_archetypes: Optional[Sequence[Optional[str]]] = None,
) -> Dict[str, Any]:
    """Produce un ``CombatState`` iniziale da encounter + party + catalog.

    ``hostile_species_ids`` e ``hostile_trait_ids`` permettono di
    specificare quali specie e trait assegnare ai gruppi ostili dell'encounter.
    Se assenti o incompleti, ai gruppi restanti viene assegnato un placeholder
    ``hostile_<role>`` senza trait_ids. Nessun RNG e' consumato qui: il seed
    viene propagato al ``CombatState`` per l'uso futuro del resolver.

    **ADR-2026-04-19 (M5-#1b wire)**: parametri species_archetype:

    - ``species_resistances_data``: dict caricato da
      ``load_species_resistances()`` (species_resistances.yaml shape).
      Se ``None``, nessun baseline species applicato (backward compat).
    - ``party_archetypes`` / ``hostile_archetypes``: liste parallele a
      ``party`` e ai ``groups`` dell'encounter, contengono archetype_id
      (es. ``"corazzato"``) o ``None`` (fallback su ``default_archetype``).
      Quando ``species_resistances_data`` e' None, questi sono ignorati.
    """

    units: List[Dict[str, Any]] = []

    party_archetypes_list = list(party_archetypes or [])
    hostile_archetypes_list = list(hostile_archetypes or [])

    for index, member in enumerate(party):
        archetype_id = (
            party_archetypes_list[index]
            if index < len(party_archetypes_list)
            else None
        )
        species_archetype_dict = get_archetype_resistances(
            archetype_id, species_resistances_data
        )
        units.append(
            build_party_unit(
                unit_id=str(member["id"]),
                species_id=str(member["species_id"]),
                trait_ids=list(member.get("trait_ids") or []),
                catalog=catalog,
                species_archetype=species_archetype_dict,
            )
        )

    hostile_species_ids = list(hostile_species_ids or [])
    hostile_trait_ids = list(hostile_trait_ids or [])

    groups = encounter.get("groups") or []
    for index, group in enumerate(groups):
        unit_id = f"hostile-{index + 1:02d}"
        species_id = (
            hostile_species_ids[index]
            if index < len(hostile_species_ids)
            else f"hostile_{group.get('role', 'unknown')}"
        )
        traits = (
            list(hostile_trait_ids[index])
            if index < len(hostile_trait_ids)
            else []
        )
        archetype_id = (
            hostile_archetypes_list[index]
            if index < len(hostile_archetypes_list)
            else None
        )
        species_archetype_dict = get_archetype_resistances(
            archetype_id, species_resistances_data
        )
        units.append(
            build_hostile_unit_from_group(
                unit_id=unit_id,
                species_id=species_id,
                group=group,
                trait_ids=traits,
                catalog=catalog,
                species_archetype=species_archetype_dict,
            )
        )

    sorted_units = sorted(units, key=lambda u: (-int(u["initiative"]), str(u["id"])))
    initiative_order = [u["id"] for u in sorted_units]

    # A1: attach active_effects registry per resolver trait evaluation
    active_fx = load_active_effects_registry()

    return {
        "session_id": session_id,
        "seed": seed,
        "encounter_id": encounter_id,
        "turn": 1,
        "initiative_order": initiative_order,
        "active_unit_id": initiative_order[0],
        "units": units,
        "vc": encounter.get("party_vc"),
        "log": [],
        "_active_effects_registry": active_fx,
    }


def _clamp(value: int, lo: int, hi: int) -> int:
    if value < lo:
        return lo
    if value > hi:
        return hi
    return value


__all__ = [
    "RESISTANCE_MIN",
    "RESISTANCE_MAX",
    "DEFAULT_AP_MAX",
    "DEFAULT_PARTY_HP",
    "DEFAULT_PARTY_ARMOR",
    "DEFAULT_PARTY_INITIATIVE",
    "DEFAULT_PARTY_TIER",
    "DEFAULT_PT_POOL",
    "DEFAULT_REACTIONS_MAX",
    "TIER_MIN",
    "TIER_MAX",
    "aggregate_resistances",
    "build_hostile_unit_from_group",
    "build_party_unit",
    "derive_tier_from_power",
    "get_archetype_resistances",
    "hydrate_encounter",
    "load_active_effects_registry",
    "load_species_resistances",
    "load_trait_mechanics",
    "_resolve_inheritance",
]
