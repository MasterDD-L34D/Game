"""Utility per allineare i tratti PI con le regole ambientali."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Mapping

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
PACKS_PATH = REPO_ROOT / "data" / "packs.yaml"
ENV_RULES_PATH = (
    REPO_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "tools"
    / "config"
    / "registries"
    / "env_to_traits.yaml"
)
TRAIT_REFERENCE_PATHS = [
    REPO_ROOT / "data" / "traits" / "index.json",
    REPO_ROOT / "docs" / "evo-tactics-pack" / "trait-reference.json",
]
MAPPING_OUTPUT_PATH = REPO_ROOT / "data" / "analysis" / "trait_env_mapping.json"


TRAIT_FIELD_ORDER = [
    "label",
    "famiglia_tipologia",
    "fattore_mantenimento_energetico",
    "tier",
    "slot",
    "slot_profile",
    "sinergie",
    "conflitti",
    "requisiti_ambientali",
    "mutazione_indotta",
    "uso_funzione",
    "spinta_selettiva",
    "debolezza",
    "sinergie_pi",
]


@dataclass
class PIContext:
    """Rappresenta un contesto PI in cui appare un tratto."""

    source: str
    slot: str | None
    form: str | None
    pack: str | None
    range_: str | None
    combo: list[str]


PI_TRAIT_METADATA: Mapping[str, Mapping[str, str]] = {
    "pianificatore": {
        "label": "Pianificatore",
        "uso_funzione": "Coordina finestre di danno e difesa, mantenendo la squadra allineata al piano PI.",
        "famiglia_tipologia": "Strategico/Comando",
        "mutazione_indotta": "Protocollo decisionale adattivo con buffer informativi dedicati.",
        "spinta_selettiva": "Squadre che devono mantenere priorità multiple su turni lunghi.",
        "fattore_mantenimento_energetico": "Medio (Analisi continua di stato squadre)",
        "debolezza": "Rigidità tattica se gli input di telemetria arrivano in ritardo.",
    },
    "risonanza_di_branco": {
        "label": "Risonanza di Branco",
        "uso_funzione": "Amplifica buff condivisi sincronizzando i timer di squadra.",
        "famiglia_tipologia": "Supporto/Armonico",
        "mutazione_indotta": "Reticolo empatico che collega i canali PI cooperativi.",
        "spinta_selettiva": "Forme che eccellono in difesa coordinata e scudi sovrapposti.",
        "fattore_mantenimento_energetico": "Basso (Richiede mantenimento empatico)",
        "debolezza": "Stress elevato se la coesione cala sotto i target di telemetria.",
    },
    "focus_frazionato": {
        "label": "Focus Frazionato",
        "uso_funzione": "Permette di gestire due ingaggi paralleli senza perdere efficienza.",
        "famiglia_tipologia": "Tattico/Controllo",
        "mutazione_indotta": "Processore di priorità multi-thread per bersagli e obiettivi.",
        "spinta_selettiva": "Comunicazioni piatte dove occorre coprire minacce su più fronti.",
        "fattore_mantenimento_energetico": "Medio (Dividere l'attenzione su più canali)",
        "debolezza": "Rischio di overload mentale se tilt e aggro salgono oltre le soglie HUD.",
    },
    "ghiandola_caustica": {
        "label": "Ghiandola Caustica",
        "uso_funzione": "Sblocco early di danni da acido per rompere armature leggere.",
        "famiglia_tipologia": "Offensivo/Chimico",
        "mutazione_indotta": "Sintesi rapida di composti caustici nei moduli d'attacco.",
        "spinta_selettiva": "Squadre che devono rispondere a guardie situazionali al turno 1-2.",
        "fattore_mantenimento_energetico": "Medio (Produzione reagenti)",
        "debolezza": "Gestione accurata delle riserve per non calare sotto i budget PE previsto.",
    },
    "zampe_a_molla": {
        "label": "Zampe a Molla",
        "uso_funzione": "Dash esplosivi per mantenere il ritmo di ingaggio o disimpegno.",
        "famiglia_tipologia": "Mobilità/Cinetico",
        "mutazione_indotta": "Arti potenziati con ammortizzatori ad alta compressione.",
        "spinta_selettiva": "Metagame con forte pressione di aggro e necessità di riposizionamento.",
        "fattore_mantenimento_energetico": "Basso (Carica elastica a turni alterni)",
        "debolezza": "Perdita di valore su mappe con spazi stretti o controllo setup elevato.",
    },
    "empatia_coordinativa": {
        "label": "Empatia Coordinativa",
        "uso_funzione": "Collega cooldown difensivi e cura quando la squadra entra in finestra rischio.",
        "famiglia_tipologia": "Supporto/Empatico",
        "mutazione_indotta": "Circuiti sensorio-emotivi collegati al feed HUD PI.",
        "spinta_selettiva": "Turni lunghi con rischio alto in cui serve mitigare tilt e HP critici.",
        "fattore_mantenimento_energetico": "Medio (Feedback costante dai compagni)",
        "debolezza": "Richiede squadra disciplinata; cade in efficacia se pick rate Warden scende.",
    },
    "pathfinder": {
        "label": "Pathfinder",
        "uso_funzione": "Ottimizza esplorazione e controllo mappe multi-bioma.",
        "famiglia_tipologia": "Esplorazione/Tattico",
        "mutazione_indotta": "Suite sensoriale orientata a scouting e lettura minacce.",
        "spinta_selettiva": "Missioni con indice explore alto e opzioni opzionali da capitalizzare.",
        "fattore_mantenimento_energetico": "Basso (Sincronizzazione con HUD di esplorazione)",
        "debolezza": "Valore ridotto in scenari a corridoio o con tilt già stabilizzato.",
    },
    "tattiche_di_branco": {
        "label": "Tattiche di Branco",
        "uso_funzione": "Coordina prese e focus bersaglio condividendo segnali di priorità.",
        "famiglia_tipologia": "Strategico/Supporto",
        "mutazione_indotta": "Canale condiviso per marcature e ingaggi simultanei.",
        "spinta_selettiva": "Squadre che puntano a style bonus tramite assist e controllo spazio.",
        "fattore_mantenimento_energetico": "Medio (Broadcast continuo di segnali)",
        "debolezza": "Richiede formazione stabile; cala se la coesione precipita sotto il target.",
    },
    "random": {
        "label": "Trait Random",
        "uso_funzione": "Slot jolly per testing o pareggiare budget PI quando serve varietà.",
        "famiglia_tipologia": "Flessibile/Generico",
        "mutazione_indotta": "Selezione casuale da pool controllata per esperimenti di build.",
        "spinta_selettiva": "Draft rapidi o recuperi quando il tavolo necessita sorprese adattive.",
        "fattore_mantenimento_energetico": "Variabile (Dipende dal tratto estratto)",
        "debolezza": "Bassa affidabilità: richiede slot aggiuntivi per mitigare risultati sfavorevoli.",
    },
}


def slugify(name: str) -> str:
    """Normalizza un identificatore in snake_case."""

    name = name.replace("'", "")
    name = re.sub(r"[^\w]+", "_", name, flags=re.UNICODE)
    name = re.sub(r"_+", "_", name)
    return name.strip("_").lower()


def ensure_list(value: Iterable | None) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return list(value)


def order_trait_fields(data: Mapping[str, object]) -> dict[str, object]:
    """Restituisce una copia ordinata secondo la struttura originale del catalogo."""

    ordered: dict[str, object] = {}
    for key in TRAIT_FIELD_ORDER:
        if key in data:
            ordered[key] = data[key]

    for key, value in data.items():
        if key not in ordered:
            ordered[key] = value

    return ordered


def load_packs() -> Mapping:
    return yaml.safe_load(PACKS_PATH.read_text(encoding="utf-8"))


def gather_pi_usage(data: Mapping) -> dict[str, dict[str, object]]:
    usage: dict[str, dict[str, object]] = defaultdict(
        lambda: {"tiers": set(), "contexts": []}
    )

    def register(item: str, context: PIContext) -> None:
        if not item.startswith("trait_"):
            return
        if ":" not in item:
            return
        prefix, raw_name = item.split(":", 1)
        slug = slugify(raw_name)
        tier_value = prefix.split("_")[1].upper()
        entry = usage[slug]
        entry["tiers"].add(tier_value)
        entry["contexts"].append({
            "context": context,
            "tier": tier_value,
        })

    random_tables = {k: v for k, v in data.items() if isinstance(v, list)}
    for table, entries in random_tables.items():
        for entry in entries:
            combo = ensure_list(entry.get("combo"))
            context = PIContext(
                source=table,
                slot=None,
                form=None,
                pack=entry.get("pack"),
                range_=entry.get("range"),
                combo=combo,
            )
            for item in combo:
                register(item, context)

    forms_section = data.get("forms", {})
    if isinstance(forms_section, Mapping):
        for form_id, packs in forms_section.items():
            if not isinstance(packs, Mapping):
                continue
            for slot, combo in packs.items():
                context = PIContext(
                    source="form",
                    slot=str(slot),
                    form=str(form_id),
                    pack=None,
                    range_=None,
                    combo=ensure_list(combo),
                )
                for item in context.combo:
                    register(item, context)

    return usage


def load_env_rules() -> list[Mapping]:
    data = yaml.safe_load(ENV_RULES_PATH.read_text(encoding="utf-8"))
    return ensure_list(data.get("rules"))


def build_env_index(rules: Iterable[Mapping]) -> dict[str, list[Mapping]]:
    index: dict[str, list[Mapping]] = defaultdict(list)
    for rule in rules:
        for trait in ensure_list(rule.get("suggest", {}).get("traits")):
            index[trait].append(rule)
    return index


def infer_tier(env_rules: list[Mapping]) -> str | None:
    tier = None
    for rule in env_rules:
        category = (rule.get("meta") or {}).get("category")
        if category == "biomi_estremi":
            return "T3"
        if tier != "T2" and (
            rule.get("hazard_any")
            or rule.get("require_capability_any")
            or (rule.get("when") or {}).get("hazard_any")
        ):
            tier = "T2"
        elif tier is None:
            tier = "T1"
    return tier


def serialize_env_requirements(env_rules: list[Mapping]) -> list[Mapping]:
    serialized = []
    for rule in env_rules:
        serialized.append(
            {
                "fonte": "env_to_traits",
                "condizioni": rule.get("when", {}),
                "meta": rule.get("meta", {}),
                "capacita_richieste": ensure_list(rule.get("require_capability_any")),
            }
        )
    return serialized


def build_pi_summary(
    contexts: list[dict[str, object]], trait_slug: str | None
) -> dict[str, object]:
    total = len(contexts)
    slots: set[str] = set()
    forms: set[str] = set()
    tables: set[tuple[str, str | None, str | None]] = set()
    co_occurrence: set[str] = set()

    for item in contexts:
        ctx: PIContext = item["context"]
        if ctx.slot:
            slots.add(ctx.slot)
        if ctx.pack:
            slots.add(ctx.pack)
        if ctx.form:
            forms.add(ctx.form)
        if ctx.source != "form":
            tables.add((ctx.source, ctx.pack, ctx.range_))
        for entry in ctx.combo:
            if entry.startswith("trait_") and ":" in entry:
                _, raw = entry.split(":", 1)
                if trait_slug and slugify(raw) == trait_slug:
                    continue
            if entry.startswith("trait_"):
                continue
            co_occurrence.add(entry)

    return {
        "combo_totale": total,
        "co_occorrenze": sorted(co_occurrence),
        "forme": sorted(forms),
        "tabelle_random": [
            {"tabella": src, "pack": pack, "range": range_}
            for src, pack, range_ in sorted(tables)
        ],
        "slots": sorted(slots),
    }


def upgrade_trait_catalog() -> None:
    packs = load_packs()
    pi_usage = gather_pi_usage(packs)
    env_rules = load_env_rules()
    env_index = build_env_index(env_rules)

    if not MAPPING_OUTPUT_PATH.parent.exists():
        MAPPING_OUTPUT_PATH.parent.mkdir(parents=True)

    mapping_summary = {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pi_traits": sorted(pi_usage.keys()),
        "environment_traits": sorted(env_index.keys()),
    }
    mapping_summary["overlap"] = sorted(
        set(mapping_summary["pi_traits"]).intersection(mapping_summary["environment_traits"])
    )
    mapping_summary["pi_only"] = sorted(
        set(mapping_summary["pi_traits"]) - set(mapping_summary["environment_traits"])
    )
    mapping_summary["environment_only"] = sorted(
        set(mapping_summary["environment_traits"]) - set(mapping_summary["pi_traits"])
    )

    usage_dump = {}
    for trait, info in pi_usage.items():
        summary = build_pi_summary(info["contexts"], trait)
        usage_dump[trait] = {
            "tier": sorted(info["tiers"]),
            "combo_totale": summary["combo_totale"],
            "forme": summary["forme"],
            "slots": summary["slots"],
            "co_occorrenze": summary["co_occorrenze"],
            "tabelle_random": summary["tabelle_random"],
        }

    mapping_summary["pi_usage"] = usage_dump

    MAPPING_OUTPUT_PATH.write_text(
        json.dumps(mapping_summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    for path in TRAIT_REFERENCE_PATHS:
        data = json.loads(path.read_text(encoding="utf-8"))
        data["schema_version"] = "2.0"
        traits = data.get("traits", {})

        for trait_id, meta in PI_TRAIT_METADATA.items():
            if trait_id not in traits:
                traits[trait_id] = {
                    "sinergie": [],
                    "conflitti": [],
                }
            traits[trait_id].update(meta)

        ordered_traits: dict[str, dict[str, object]] = {}
        for trait_id in sorted(traits):
            info = traits[trait_id]
            slug = trait_id
            contexts = pi_usage.get(slug, {"contexts": [], "tiers": set()})
            env_rules_for_trait = env_index.get(trait_id, [])

            tier_candidates = set(contexts.get("tiers", set()))
            env_tier = infer_tier(env_rules_for_trait)
            if env_tier:
                tier_candidates.add(env_tier)

            tier_value = None
            if "T3" in tier_candidates:
                tier_value = "T3"
            elif "T2" in tier_candidates:
                tier_value = "T2"
            elif "T1" in tier_candidates:
                tier_value = "T1"

            summary = build_pi_summary(contexts.get("contexts", []), slug)

            info["tier"] = tier_value
            info["slot"] = summary["slots"]
            info["sinergie_pi"] = {
                "combo_totale": summary["combo_totale"],
                "co_occorrenze": summary["co_occorrenze"],
                "forme": summary["forme"],
                "tabelle_random": summary["tabelle_random"],
            }
            info["requisiti_ambientali"] = serialize_env_requirements(env_rules_for_trait)

            ordered_traits[trait_id] = order_trait_fields(info)

        data["traits"] = ordered_traits

        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    upgrade_trait_catalog()
