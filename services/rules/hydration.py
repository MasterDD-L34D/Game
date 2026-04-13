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


def load_trait_mechanics(path: Path) -> Dict[str, Any]:
    """Carica ``trait_mechanics.yaml`` e restituisce il dict ``{trait_id: entry}``.

    Il file atteso e' ``packs/evo_tactics_pack/data/balance/trait_mechanics.yaml``
    con shape validata da ``traitMechanics.schema.json``.
    """

    with open(path, encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    traits = data.get("traits") if isinstance(data, Mapping) else None
    if not isinstance(traits, Mapping):
        raise ValueError(
            f"trait_mechanics atteso dict con chiave 'traits', trovato: {type(data).__name__}"
        )
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
) -> Dict[str, Any]:
    """Costruisce un ``CombatUnit`` per un membro party.

    I valori di default sono baseline piatti; il chiamante puo' sovrascrivere
    ``hp``, ``armor``, ``initiative`` e ``tier`` per calibrare singole unita'.
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
        "resistances": aggregate_resistances(trait_ids, catalog),
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
) -> Dict[str, Any]:
    """Costruisce un ``CombatUnit`` ostile dai dati di un ``group`` encounter.

    Derivazioni numeriche da ``group['power']`` (ancorate al Frattura draft):

    - ``hp = 40 + power * 10`` (power 7 ~ 110 HP tier 3-keystone,
      power 4 ~ 80 HP tier 2-bridge)
    - ``armor = clamp(2 + power // 2, 2, 12)`` (range osservato 2-11)
    - ``initiative = 8 + power``
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
        "resistances": aggregate_resistances(trait_ids, catalog),
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
) -> Dict[str, Any]:
    """Produce un ``CombatState`` iniziale da encounter + party + catalog.

    ``hostile_species_ids`` e ``hostile_trait_ids`` permettono di
    specificare quali specie e trait assegnare ai gruppi ostili dell'encounter.
    Se assenti o incompleti, ai gruppi restanti viene assegnato un placeholder
    ``hostile_<role>`` senza trait_ids. Nessun RNG e' consumato qui: il seed
    viene propagato al ``CombatState`` per l'uso futuro del resolver.
    """

    units: List[Dict[str, Any]] = []

    for member in party:
        units.append(
            build_party_unit(
                unit_id=str(member["id"]),
                species_id=str(member["species_id"]),
                trait_ids=list(member.get("trait_ids") or []),
                catalog=catalog,
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
        units.append(
            build_hostile_unit_from_group(
                unit_id=unit_id,
                species_id=species_id,
                group=group,
                trait_ids=traits,
                catalog=catalog,
            )
        )

    sorted_units = sorted(units, key=lambda u: (-int(u["initiative"]), str(u["id"])))
    initiative_order = [u["id"] for u in sorted_units]

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
    "hydrate_encounter",
    "load_trait_mechanics",
]
