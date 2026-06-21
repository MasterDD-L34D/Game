#!/usr/bin/env python3
# encoding-non-ascii-ok: vendored upstream evo-swarm linter (ADR-0042); emoji in
# report labels + Italian provenance comments preserved for upstream-sync parity.
# Sync source: MasterDD-L34D/evo-swarm scripts/verify-swarm-claims.py.
"""Verifica i claim degli artifact swarm contro Game canonical data.

Driver: post run #5 (2026-05-07 sera) la prima distillation verso Game
([Game#2108]) ha rivelato 7/13 claim hallucinated nello swarm output.
Pattern: lo swarm prende nomi reali (specie, trait, biomi) e ne combina
attributi/strutture non supportati dal canonical Game. `co02_validation.complete`
valida la struttura JSON, non la fedeltà al canonical.

Questo script è il primo gate automatico contro hallucination per la
pipeline swarm→Game.

Categorie verificate:
  C1. Specie nominate: esistono in `data/core/species*.yaml`?
  C2. Trait nominati come "trait": esistono in `data/core/traits/glossary.json`?
  C3. Biomi nominati: esistono in `data/core/biomes*.yaml` (entry primaria) o
      `biome_aliases.yaml` (solo alias)?
  C4. Confusione default_parts vs trait: i nomi che lo swarm chiama "trait"
      sono effettivamente trait o sono `default_parts.*` (body parts) di una
      specie? Esempio noto: `echolocation` e `sand_digest` sono parts di
      `dune_stalker`, non trait.

Il script estrae le menzioni dai field `summary`, `response.findings`,
`response.proposal`, `response.gaps` di ogni artifact JSON.

Uso:
    python scripts/verify-swarm-claims.py <artifact.json>
    python scripts/verify-swarm-claims.py camel-agents/artifacts/  # batch
    python scripts/verify-swarm-claims.py <path> --json            # output strutturato
    python scripts/verify-swarm-claims.py <path> --strict          # exit 1 se hallucinated

Exit codes:
    0  → tutti i claim verificati o solo PARTIAL/PROPOSED
    2  → ≥1 HALLUCINATED rilevato (avviso, non error)
    1  → errore parse / file non trovato (con --strict anche su HALLUCINATED)

Limitazioni:
  - Match per token preciso, no fuzzy. Aliasing manuale via legacy_slug.
  - Non fa contextual semantic check (es: "X adatto a Y bioma" vs canonical
    biome_affinity); solo presence/category check.
  - Skip artifact non-JSON o senza field response/summary.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
CURATED_STOPWORDS_FILE = REPO_ROOT / "scripts" / "data" / "verify_stopwords.txt"

# Tier 2.b — E.R.M.E.S. (Game-Godot-v2) sistema role_gap canonical
DEFAULT_ERMES_REPO_NT = Path(r"C:\dev\Game-Godot-v2")
DEFAULT_ERMES_REPO_NIX = Path.home() / "dev" / "Game-Godot-v2"
ERMES_GD_FILE = "scripts/session/ermes_role_gap.gd"
ERMES_CANONICAL_ROLES = frozenset({"guerriero", "tessitore", "esploratore", "custode"})


def _default_game_repo() -> Path:
    """Risolvi Game repo path. Mirrora orchestrator.py:_resolve_path_env."""
    env_val = os.environ.get("EVOSWARM_GAME_REPO", "").strip()
    if env_val:
        return Path(env_val).expanduser()
    if os.name == "nt":
        return Path(r"C:\dev\Game")
    return Path.home() / "dev" / "Game"


def _default_ermes_repo() -> Path:
    """Risolvi Game-Godot-v2 repo path (canonical ERMES source)."""
    env_val = os.environ.get("EVOSWARM_ERMES_REPO", "").strip()
    if env_val:
        return Path(env_val).expanduser()
    if os.name == "nt":
        return DEFAULT_ERMES_REPO_NT
    return DEFAULT_ERMES_REPO_NIX


# ── Tier 1 — fuzzy + display_name match helpers ─────────────────


def _normalize_for_match(token: str) -> set[str]:
    """Genera variants normalizzate del token per matching tollerante.

    Driver: Tier 1 L_FUZZY — lo swarm a volte usa variants minori di nomi
    canonical (`dune-stalker` vs `dune_stalker`, `Dune Stalker` display, ecc).
    Esempio variants per 'Dune Stalker':
      {'dune stalker', 'dune_stalker', 'dune-stalker'}
    """
    base = token.lower().strip()
    if not base:
        return set()
    variants = {base}
    # snake/kebab swap
    if "_" in base:
        variants.add(base.replace("_", "-"))
    if "-" in base:
        variants.add(base.replace("-", "_"))
    # spaces -> underscore/dash
    if " " in base:
        nb = base.replace(" ", "_")
        variants.add(nb)
        variants.add(base.replace(" ", "-"))
        # apply swap recursivamente
        if "-" in nb:
            variants.add(nb.replace("-", "_"))
    return variants


def _levenshtein_within(a: str, b: str, max_dist: int) -> bool:
    """Levenshtein distance early-exit. Returns True se dist <= max_dist.

    Implementazione DP O(len(a) * len(b)) ma con early-exit per riga
    (se min(row) > max_dist, non puo' più migliorare → False).
    """
    if a == b:
        return True
    la, lb = len(a), len(b)
    if abs(la - lb) > max_dist:
        return False
    if la == 0 or lb == 0:
        return max(la, lb) <= max_dist
    prev = list(range(lb + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * lb
        row_min = curr[0]
        for j, cb in enumerate(b, 1):
            cost = 0 if ca == cb else 1
            curr[j] = min(
                prev[j] + 1,        # deletion
                curr[j - 1] + 1,    # insertion
                prev[j - 1] + cost, # substitution
            )
            if curr[j] < row_min:
                row_min = curr[j]
        if row_min > max_dist:
            return False
        prev = curr
    return prev[-1] <= max_dist


def _fuzzy_match(token: str, canonical_set: set[str], max_dist: int = 2) -> str | None:
    """Trova best fuzzy match in canonical_set (Levenshtein <= max_dist).

    Solo per token >= 8 char per evitare match troppo permissivi su short.
    Returns canonical name matched, o None.
    """
    if len(token) < 8:
        return None
    best = None
    for cand in canonical_set:
        if abs(len(cand) - len(token)) > max_dist:
            continue
        if _levenshtein_within(token, cand, max_dist):
            best = cand
            break
    return best


def _lookup_with_normalize(token: str, canonical_set: set[str]) -> str | None:
    """Lookup tollerante: matchato se qualunque variante del token e' in canonical.

    Returns the actual canonical name found, o None.
    """
    for variant in _normalize_for_match(token):
        if variant in canonical_set:
            return variant
    return None


# ── Game canonical loaders ───────────────────────────────────────


def load_canonical_index(game_repo: Path) -> dict[str, set[str]]:
    """Indicizza Game canonical in dict di set per lookup O(1).

    Returns dict con keys:
      - 'species': nomi specie (id + legacy_slug)
      - 'biomes_primary': biomi entry primaria in biomes*.yaml
      - 'biomes_alias': nomi presenti solo in biome_aliases.yaml
      - 'traits': trait ids unioned over glossary.json + active_effects.yaml + index.json
      - 'traits_data': id -> full trait data dict unioned over the 3 sources
      - 'parts_known': nomi noti come default_parts (echolocation, sand_digest, …)
      - 'display_names': normalized display_name → canonical_id (Tier 1)
      - 'field_names': field name YAML/JSON usati come stopwords (Tier 3)
      - 'meta': diagnostic info
    """
    out: dict[str, Any] = {
        "species": set(),
        "biomes_primary": set(),
        "biomes_alias": set(),
        "biome_alias_canonical": {},  # alias(lower) -> canonical biome id(lower); value-compare (OD-007 P2)
        "traits": set(),
        "parts_known": set(),
        "field_names": set(),
        "display_names": {},  # Tier 1 — normalized display_name -> canonical id
        "species_biome_affinity": {},  # id -> biome_affinity canonical (asse A)
        "species_data": {},  # id -> full data dict for ALIENA axes I/L/E/N/A2
        "traits_data": {},  # id -> full trait data dict unioned over 3 sources
        "meta": {"yaml_available": False, "files_loaded": []},
    }
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError:
        out["meta"]["error"] = "yaml not installed; run: pip install pyyaml"
        return out
    out["meta"]["yaml_available"] = True

    core_dir = game_repo / "data" / "core"
    if not core_dir.is_dir():
        out["meta"]["error"] = f"Game data/core/ non trovata: {core_dir}"
        return out

    # Specie + default_parts + biome_affinity
    for path in sorted(core_dir.glob("species*.yaml")):
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:
            out["meta"].setdefault("yaml_parse_warnings", []).append(f"{path.name}: {exc}")
            continue
        if not data:
            continue
        items = data.get("species_examples") or data.get("species") or (
            data if isinstance(data, list) else []
        )
        out["meta"]["files_loaded"].append(path.name)
        for it in items or []:
            if not isinstance(it, dict):
                continue
            sid = it.get("id")
            legacy = it.get("legacy_slug")
            if sid:
                out["species"].add(sid)
            if legacy:
                out["species"].add(legacy)
            if sid and "biome_affinity" in it:
                out["species_biome_affinity"][sid] = it["biome_affinity"]
            # Tier 2.a full ALIENA axes — harvest full species data dict
            if sid:
                out["species_data"][sid] = {
                    "biome_affinity": it.get("biome_affinity"),  # asse A
                    "default_parts": it.get("default_parts") or {},  # asse I
                    "trait_plan": it.get("trait_plan") or {},  # asse L
                    "sentience_tier": it.get("sentience_tier"),  # asse N
                    "clade_tag": it.get("clade_tag"),  # asse N
                    "estimated_weight": it.get("estimated_weight"),  # asse I
                    "weight_budget": it.get("weight_budget"),  # asse I
                    "synergy_hints": it.get("synergy_hints") or [],  # asse E
                    "display_name": it.get("display_name"),  # narrative
                }
            # Tier 1 — harvest display names per matching tollerante
            for dn_key in ("display_name", "display_name_it", "display_name_en"):
                dn = it.get(dn_key)
                if dn and isinstance(dn, str) and sid:
                    for variant in _normalize_for_match(dn):
                        if variant and len(variant) >= 4:
                            out["display_names"][variant] = sid
            # default_parts harvest
            parts = it.get("default_parts") or {}
            if isinstance(parts, dict):
                for v in parts.values():
                    if isinstance(v, str):
                        out["parts_known"].add(v)
                    elif isinstance(v, list):
                        for x in v:
                            if isinstance(x, str):
                                out["parts_known"].add(x)

    # Specie da data/core/species/ (subdir) -- species_catalog.json (key 'catalog').
    # Game canonical tiene le specie qui, non in species*.yaml a livello core_dir;
    # additivo al glob sopra (backward-compat).
    catalog_path = core_dir / "species" / "species_catalog.json"
    if catalog_path.exists():
        try:
            cat_data = json.loads(catalog_path.read_text(encoding="utf-8-sig"))
        except Exception:
            cat_data = None
        entries = (cat_data or {}).get("catalog") if isinstance(cat_data, dict) else None
        if entries:
            out["meta"]["files_loaded"].append(catalog_path.name)
        for it in entries or []:
            if not isinstance(it, dict):
                continue
            sid = it.get("species_id") or it.get("id")
            if sid:
                out["species"].add(sid)
            legacy = it.get("legacy_slug")
            if legacy:
                out["species"].add(legacy)
            if sid and it.get("biome_affinity") is not None:
                out["species_biome_affinity"][sid] = it["biome_affinity"]
            if sid and sid not in out["species_data"]:
                # asse L: catalog usa 'trait_refs' (lista); legacy yaml usava
                # 'trait_plan' dict {core, optional, synergies}. Normalizza la
                # lista in trait_plan.core cosi l'asse L resta funzionale.
                trait_plan = it.get("trait_plan")
                if not isinstance(trait_plan, dict):
                    refs = it.get("trait_refs")
                    trait_plan = {"core": list(refs)} if isinstance(refs, list) and refs else {}
                out["species_data"][sid] = {
                    "biome_affinity": it.get("biome_affinity"),  # asse A
                    "default_parts": it.get("default_parts") or {},  # asse I
                    "trait_plan": trait_plan,  # asse L
                    # catalog usa 'sentience_index'; legacy yaml usava 'sentience_tier'
                    "sentience_tier": it.get("sentience_tier") or it.get("sentience_index"),  # asse N
                    "clade_tag": it.get("clade_tag"),  # asse N
                }
            # default_parts harvest (parts_known) -- asse I lookup
            parts = it.get("default_parts") or {}
            if isinstance(parts, dict):
                for v in parts.values():
                    if isinstance(v, str):
                        out["parts_known"].add(v)
                    elif isinstance(v, list):
                        for x in v:
                            if isinstance(x, str):
                                out["parts_known"].add(x)

    # Biomi
    def _harvest_biome_dict(d: dict) -> None:
        """Aggiunge a biomes_primary i biomi entries che hanno biome_class.

        Supporta sia top-level dict di biomi sia mapping nested 'biomes': {id: {...}}.
        """
        for k, v in d.items():
            if not isinstance(v, dict):
                continue
            if "biome_class" in v:
                out["biomes_primary"].add(k)
                if v.get("legacy_slug"):
                    out["biomes_primary"].add(v["legacy_slug"])

    for path in sorted(core_dir.glob("biomes*.yaml")):
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:
            out["meta"].setdefault("yaml_parse_warnings", []).append(f"{path.name}: {exc}")
            continue
        if not data:
            continue
        out["meta"]["files_loaded"].append(path.name)
        if isinstance(data, dict):
            # Top-level: dict di biomi diretti, OPPURE wrapper con 'biomes' key
            _harvest_biome_dict(data)
            nested = data.get("biomes")
            if isinstance(nested, dict):
                _harvest_biome_dict(nested)
            elif isinstance(nested, list):
                for it in nested:
                    if isinstance(it, dict):
                        if it.get("id"):
                            out["biomes_primary"].add(it["id"])
                        if it.get("legacy_slug"):
                            out["biomes_primary"].add(it["legacy_slug"])
            # biome_examples list pattern
            items = data.get("biome_examples") or []
            for it in items or []:
                if isinstance(it, dict):
                    if it.get("id"):
                        out["biomes_primary"].add(it["id"])
                    if it.get("legacy_slug"):
                        out["biomes_primary"].add(it["legacy_slug"])

    # biome_aliases (solo alias). Schema reale: {aliases: {<alias>: {canonical, ...}}}.
    # OD-007 (2026-06-20): pre-fix si iterava il TOP-LEVEL -> harvestava solo la chiave
    # wrapper 'aliases' (sentinel phantom) e NON i veri alias nested -> le forme alias
    # (savanna, deserto_caldo, caverna_risonante, sinaptic_trench, ...) sparivano dal set
    # resolvibile -> false-reject (classe alias-resolution #2813). Si legge la mappa
    # nested `aliases:`; fallback a top-level se lo schema fosse flat (difensivo).
    aliases_path = core_dir / "biome_aliases.yaml"
    if aliases_path.exists():
        try:
            data = yaml.safe_load(aliases_path.read_text(encoding="utf-8")) or {}
            out["meta"]["files_loaded"].append(aliases_path.name)
            alias_map = data.get("aliases", data) if isinstance(data, dict) else {}
            if isinstance(alias_map, dict):
                for k, v in alias_map.items():
                    if k not in out["biomes_primary"]:
                        out["biomes_alias"].add(k)
                    # alias -> canonical map: an alias biome form (es. savanna) deve
                    # VERIFY contro il suo canonical (savana) nel value-compare, non
                    # essere marcato contradicted (OD-007 P2, codex bot #128).
                    canon_target = v.get("canonical") if isinstance(v, dict) else None
                    if isinstance(canon_target, str) and canon_target:
                        out["biome_alias_canonical"][str(k).lower()] = canon_target.lower()
        except Exception as exc:
            out["meta"].setdefault("yaml_parse_warnings", []).append(f"{aliases_path.name}: {exc}")

    # Trait field-value harvest (P2 follow-up to the trait-id union below). The
    # `traits` set is membership-only; the entity-grounding gate also needs the
    # FULL trait data dict so a trait field-value canonical_ref (e.g.
    # `<...>#zampe_a_molla.tier` claim T1) resolves to the real value instead of
    # the membership sentinel 'exists' (codex bot review, PR #125). Fields are
    # unioned across the three sources with fill-missing precedence: glossary
    # (labels/descriptions) -> active_effects (tier/category runtime mechanic) ->
    # index (slot/sinergie + tier fallback). First source to define a field wins;
    # only keys under each `traits:` mapping are harvested (never sibling scalars).
    def _merge_trait_data(traits_map: Any) -> None:
        if not isinstance(traits_map, dict):
            return
        for tid, tdata in traits_map.items():
            if not isinstance(tdata, dict):
                continue
            bucket = out["traits_data"].setdefault(tid, {})
            for fk, fv in tdata.items():
                if fk not in bucket or bucket[fk] is None:
                    bucket[fk] = fv

    # Trait reali (glossary.json)
    glossary_path = core_dir / "traits" / "glossary.json"
    if glossary_path.exists():
        try:
            data = json.loads(glossary_path.read_text(encoding="utf-8-sig"))
            out["meta"]["files_loaded"].append(glossary_path.name)
            # Glossary può essere dict di trait o avere wrapping. Probabile root-dict.
            # Reserved keys are wrappers/metadata, NOT trait ids: excluded from the
            # root-dict traits_data harvest (scalars are excluded by isinstance).
            glossary_reserved = {"traits", "sources"}
            if isinstance(data, dict):
                # Heuristic: top-level keys che assomigliano a trait names (kebab/snake_case)
                for k, v in data.items():
                    if isinstance(v, dict) and len(k) > 2:
                        out["traits"].add(k)
                        # Root-dict format (top-level trait id -> metadata): merge
                        # glossary-only fields (label_it/descriptions) too, so a
                        # field-value ref resolves instead of falling to unverified.
                        if k not in glossary_reserved:
                            _merge_trait_data({k: v})
                # Anche cerca chiave 'traits' wrapping
                if "traits" in data and isinstance(data["traits"], dict):
                    out["traits"].update(data["traits"].keys())
                    _merge_trait_data(data["traits"])  # labels/descriptions (1st)
        except Exception as exc:
            out["meta"].setdefault("json_parse_warnings", []).append(f"{glossary_path.name}: {exc}")

    # Trait sources UNION (P2 fix, harsh-review 2026-06-19).
    # glossary.json is the descriptive metadata source, but a trait can be
    # canonical while authored only in the runtime-mechanic file
    # (data/core/traits/active_effects.yaml) or the descriptive index
    # (data/traits/index.json), without being back-filled into glossary.json.
    # The entity-grounding gate (is_invented_entity) reads this `traits` set, so
    # a glossary-only harvest would FALSELY flag such a trait invented and hard-
    # reject a legit swarm artifact. UNION the trait-id keys from all three
    # sources so the gate stops depending on the back-fill invariant. Only the
    # keys under each `traits` mapping are harvested (sibling scalar keys like
    # schema_version/version are NOT trait ids).
    active_effects_path = core_dir / "traits" / "active_effects.yaml"
    if active_effects_path.exists():
        try:
            ae_data = yaml.safe_load(active_effects_path.read_text(encoding="utf-8"))
            if isinstance(ae_data, dict) and isinstance(ae_data.get("traits"), dict):
                out["traits"].update(ae_data["traits"].keys())
                _merge_trait_data(ae_data["traits"])  # tier/category runtime (2nd)
                out["meta"]["files_loaded"].append(active_effects_path.name)
        except Exception as exc:
            out["meta"].setdefault("yaml_parse_warnings", []).append(
                f"{active_effects_path.name}: {exc}")

    # index.json lives in data/traits/ (sibling of data/core/, not under it).
    trait_index_path = game_repo / "data" / "traits" / "index.json"
    if trait_index_path.exists():
        try:
            idx_data = json.loads(trait_index_path.read_text(encoding="utf-8-sig"))
            if isinstance(idx_data, dict) and isinstance(idx_data.get("traits"), dict):
                out["traits"].update(idx_data["traits"].keys())
                _merge_trait_data(idx_data["traits"])  # slot/sinergie + tier fb (3rd)
                out["meta"]["files_loaded"].append(trait_index_path.name)
        except Exception as exc:
            out["meta"].setdefault("json_parse_warnings", []).append(
                f"{trait_index_path.name}: {exc}")

    # Tier 3 — field names harvest per stopword automatica.
    # Eseguito DOPO aver popolato species/biomes/traits/parts_known così posso
    # subtrarli: se una key dict è ANCHE una entity canonical, NON è una
    # field name (è una key di registry). Esempio: glossary.json ha key
    # 'impulsi_bioluminescenti' che è SIA una field name del dict SIA un trait
    # canonical. Vince entity (rimosso da field_names).
    raw_fields = harvest_field_names(core_dir)
    raw_fields -= out["species"]
    raw_fields -= out["biomes_primary"]
    raw_fields -= out["biomes_alias"]
    raw_fields -= out["traits"]
    raw_fields -= out["parts_known"]
    out["field_names"] = raw_fields

    return out


# ── Tier 3 — field name harvest + curated stopwords ─────────────


def harvest_field_names(core_dir: Path, max_depth: int = 5) -> set[str]:
    """Estrae nomi di field YAML/JSON da Game canonical come stopwords automatiche.

    Walka i file `data/core/**` ed estrae le keys dei dict (entity-shaped tipo
    snake/kebab). Esempio: `default_parts`, `biome_affinity`, `trait_plan`,
    `legacy_slug`, ecc. Sono nomi di SCHEMA, non di entity, quindi diventano
    automaticamente stopwords.

    Driver: Tier 3 L_FALSEPOS — riduce false-positive HALLUCINATED su token
    che lo swarm menziona come riferimento a struttura dati, non come entity.
    """
    fields: set[str] = set()
    if not core_dir.is_dir():
        return fields
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError:
        return fields

    def _walk(obj: Any, depth: int = 0) -> None:
        if depth > max_depth:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(k, str) and ("_" in k or "-" in k):
                    fields.add(k.lower())
                _walk(v, depth + 1)
        elif isinstance(obj, list):
            # Cap a 100 elementi per evitare costo O(N²) su biome_pools etc.
            for item in obj[:100]:
                _walk(item, depth + 1)

    for path in core_dir.rglob("*.yaml"):
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            _walk(data)
        except Exception:
            continue
    for path in core_dir.rglob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
            _walk(data)
        except Exception:
            continue
    return fields


def load_curated_stopwords(path: Path = CURATED_STOPWORDS_FILE) -> set[str]:
    """Legge whitelist stopwords curated da scripts/data/verify_stopwords.txt.

    Formato: 1 token per riga, lowercase, # comment + linee vuote ignorate.
    """
    out: set[str] = set()
    if not path.exists():
        return out
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            tok = line.strip()
            if not tok or tok.startswith("#"):
                continue
            out.add(tok.lower())
    except Exception:
        pass
    return out


# Pre-load curated stopwords (cached) — letto una volta per processo
_CURATED_STOPWORDS_CACHE: set[str] | None = None


def _curated_stopwords() -> set[str]:
    global _CURATED_STOPWORDS_CACHE
    if _CURATED_STOPWORDS_CACHE is None:
        _CURATED_STOPWORDS_CACHE = load_curated_stopwords()
    return _CURATED_STOPWORDS_CACHE


# ── Tier 2.a — A.L.I.E.N.A. relational check helpers ────────────


# Asse A — Ambiente — Pattern: "specie X adatta a/in bioma Y" o varianti
# Cattura: <species_id> ... <prep> ... <biome_id> entro proximity finestra
_ALIENA_SPECIES_BIOME_PATTERNS = [
    # "specie X in bioma Y" o "X in Y"
    re.compile(r"\b(?P<species>[a-z][a-z0-9_-]+)\s+(?:in|a|per|di|adatt[ao]\s+(?:a|al|alla))\s+(?P<biome>[a-z][a-z0-9_-]+)\b", re.IGNORECASE),
    # "specie/<species> ... bioma <biome>"
    re.compile(r"specie\s+(?P<species>[a-z][a-z0-9_-]+)[^\.]*?biom[ae]\s+(?P<biome>[a-z][a-z0-9_-]+)", re.IGNORECASE),
]


def extract_species_biome_tuples(artifact: dict, canonical: dict) -> list[tuple[str, str]]:
    """Estrae tuple (species_id, claimed_biome_id) dall'artifact.

    Usa pattern regex + co-occurrence proximity (50 char). Filtra solo coppie
    dove species_id è in canonical species e claimed_biome è kebab/snake-shape
    (potenziale biome name).

    Returns sorted list di (species, biome) unique tuples.
    """
    text_parts: list[str] = []
    text_parts.append(artifact.get("summary", "") or "")
    text_parts.append(artifact.get("trigger_reason", "") or "")
    response_raw = artifact.get("response", "")
    resp = None
    if isinstance(response_raw, str):
        try:
            resp = json.loads(response_raw)
        except Exception:
            pass
    elif isinstance(response_raw, dict):
        resp = response_raw
    if isinstance(resp, dict):
        for key in ("summary", "proposal", "trigger_reason", "next_action"):
            v = resp.get(key)
            if isinstance(v, str):
                text_parts.append(v)
        for key in ("findings", "gaps"):
            v = resp.get(key)
            if isinstance(v, list):
                text_parts.extend(item for item in v if isinstance(item, str))

    blob = re.sub(r"\s+", " ", " ".join(text_parts)).lower()
    species_set = canonical.get("species", set())
    if not species_set:
        return []

    tuples: set[tuple[str, str]] = set()

    # Strategia A: per ogni species, scan window proximity per token kebab/snake
    # multi-segment (catch abisso_vulcanico, foresta_miceliale, ecc).
    # Strategia B: per ogni species, scan window proximity per CANONICAL BIOME
    # SET (biomes_primary + biomes_alias), inclusi single-word (savana, caverna).
    # Strategia A poteva mancare biomi single-word; B aggiunge robustezza.
    PROXIMITY = 80
    candidate_biome_re = re.compile(r"\b([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b")
    biomes_known = (
        canonical.get("biomes_primary", set()) | canonical.get("biomes_alias", set())
    )

    for species in species_set:
        # Cerca occorrenze species nel blob
        for m in re.finditer(r"\b" + re.escape(species) + r"\b", blob):
            s_start = m.start()
            window_start = max(0, s_start - PROXIMITY)
            window_end = min(len(blob), s_start + PROXIMITY + len(species))
            window = blob[window_start:window_end]

            # Strategia A — kebab/snake multi-segment via regex
            for cm in candidate_biome_re.finditer(window):
                cand = cm.group(1)
                if cand == species:
                    continue
                if cand in canonical.get("species", set()):
                    continue
                if cand in canonical.get("traits", set()):
                    continue
                if cand in canonical.get("parts_known", set()):
                    continue
                tuples.add((species, cand))

            # Strategia B — biomi canonical (incl single-word) per membership
            for biome in biomes_known:
                if biome == species:
                    continue
                # Word-boundary match per evitare partial (savana ≠ savanale)
                if re.search(r"\b" + re.escape(biome) + r"\b", window):
                    tuples.add((species, biome))

    return sorted(tuples)


# ── Tier 4 — canonical_refs explicit citation (post Game OD-022) ─


def parse_canonical_ref(ref: str) -> tuple[str, str, str] | None:
    """Parse canonical_ref string into (file_part, entity_id, field).

    Format atteso: '<file_path>#<entity_id>.<field>' (anchor dotted).
    Esempi:
      'data/core/species.yaml#dune_stalker.biome_affinity'
      'data/core/species.yaml#dune_stalker.default_parts.metabolism'
      'data/core/biomes.yaml#abisso_vulcanico.biome_class'

    Returns (file, entity, field) o None se malformed (no `#` o no `.`).
    """
    if not isinstance(ref, str) or "#" not in ref:
        return None
    file_part, anchor = ref.split("#", 1)
    if "." not in anchor:
        return None
    # First dot separa entity da field path; il field può essere nested.
    entity, field = anchor.split(".", 1)
    if not entity or not field:
        return None
    return file_part, entity, field


def lookup_canonical_value(file_part: str, entity: str, field: str,
                             canonical: dict) -> Any:
    """Risolve canonical_ref → valore canonical via canonical dict already loaded.

    Supporta:
    - species refs (biome_affinity, default_parts.{...}, trait_plan.{...},
      sentience_tier, synergy_hints, display_name)
    - biome refs (membership only — biome canonical/alias)
    - trait refs (tier/category/label_*/sinergie/... via traits_data nested path;
      membership sentinel only for field == 'id' / 'exists')

    Returns valore canonical o None se entity/field missing.
    """
    file_part = file_part.lower()
    species_data = canonical.get("species_data", {}) if isinstance(canonical, dict) else {}

    # Species refs (data/core/species*.yaml#<id>.<field[.subfield]>)
    if "species" in file_part:
        species = species_data.get(entity)
        if not isinstance(species, dict):
            return None
        # Nested field path navigation (es. default_parts.metabolism)
        parts = field.split(".")
        cur: Any = species
        for p in parts:
            if isinstance(cur, dict):
                cur = cur.get(p)
            elif isinstance(cur, list):
                # Lista non navigabile via key — return list
                return cur
            else:
                return None
            if cur is None:
                return None
        return cur

    # Biome refs (data/core/biomes*.yaml#<id>.<field>)
    if "biomes" in file_part:
        biomes_primary = canonical.get("biomes_primary", set())
        biomes_alias = canonical.get("biomes_alias", set())
        if entity in biomes_primary:
            return entity if field == "id" else "primary"
        if entity in biomes_alias:
            return entity if field == "id" else "alias"
        return None

    # Trait refs (data/core/traits/{glossary.json,active_effects.yaml} or
    # data/traits/index.json #<trait_id>.<field[.subfield]>). Mirror the species
    # branch: navigate the unioned traits_data dict for real field values; fall
    # back to a membership sentinel ONLY for field == 'id' / 'exists'. An
    # unresolved field on a present trait returns None (-> 'unverified', never a
    # spurious 'contradicted' vs the old 'exists' sentinel -- the P2 bug fixed
    # here, codex bot review PR #125).
    if "trait" in file_part:
        traits = canonical.get("traits", set())
        traits_data = canonical.get("traits_data", {}) if isinstance(canonical, dict) else {}
        is_member = entity in traits or entity in traits_data
        if field == "id":
            return entity if is_member else None
        if field == "exists":
            return "exists" if is_member else None
        tdata = traits_data.get(entity)
        if isinstance(tdata, dict):
            parts = field.split(".")
            cur = tdata
            for p in parts:
                if isinstance(cur, dict):
                    cur = cur.get(p)
                elif isinstance(cur, list):
                    # Lista non navigabile via key -- return list (membership a valle)
                    return cur
                else:
                    return None
                if cur is None:
                    return None
            return cur
        return None

    return None


# Exact set of fields whose value-compare goes through biome alias->canonical
# canonicalization. Exact-match (not substring) so a field merely CONTAINING
# "biome_affinity" (e.g. "biome_affinity_note") never enters the alias branch
# -- closes a latent over-reach in the OD-007 P2 fix (inert today because
# lookup_canonical_value has no such navigable field, but defensive).
_BIOME_ALIAS_FIELDS = frozenset({"biome_affinity", "biome"})


def verify_canonical_ref(ref: str, claim: Any, canonical: dict) -> tuple[str, str]:
    """Verify una canonical_ref claim vs canonical.

    Returns (status, note).
    Status:
      'verified' — claim == canonical_value (normalized)
      'contradicted' — canonical_value esiste ma diverso
      'unverified' — entity/field missing in canonical
      'malformed_ref' — ref non parsabile
    """
    parsed = parse_canonical_ref(ref)
    if parsed is None:
        return ("malformed_ref",
                f"ref `{ref}` non parsabile (atteso: <file>#<entity>.<field>)")
    file_part, entity, field = parsed
    canonical_val = lookup_canonical_value(file_part, entity, field, canonical)
    if canonical_val is None:
        return ("unverified",
                f"[canonical_ref] `{ref}` entity/field missing in canonical")
    # String match con normalize tollerante
    if isinstance(claim, str) and isinstance(canonical_val, str):
        # OD-007 P2: per i campi biome una forma alias (savanna) deve VERIFY contro
        # il suo canonical (savana), non essere marcata contradicted. Canonicalizza
        # claim e canonical_val via la mappa alias->canonical PRIMA del compare.
        # Scoped a biome_affinity/biome (exact set) per non sovra-applicare ad
        # altri campi -- vedi _BIOME_ALIAS_FIELDS.
        if field in _BIOME_ALIAS_FIELDS:
            bmap = canonical.get("biome_alias_canonical", {}) if isinstance(canonical, dict) else {}
            claim_c = bmap.get(claim.lower(), claim)
            canon_c = bmap.get(canonical_val.lower(), canonical_val)
            if _normalize_for_match(claim_c) & _normalize_for_match(canon_c):
                return ("verified",
                        f"[canonical_ref] `{ref}` claim `{claim}` resolves to "
                        f"canonical `{canonical_val}` via biome alias")
        claim_norm = _normalize_for_match(claim)
        canon_norm = _normalize_for_match(canonical_val)
        if claim_norm & canon_norm:
            return ("verified",
                    f"[canonical_ref] `{ref}` claim `{claim}` matches canonical")
        return ("contradicted",
                f"[canonical_ref] `{ref}` claim `{claim}` ≠ canonical `{canonical_val}`")
    # List membership (es. claim "echolocation" vs canonical_val [echolocation])
    if isinstance(canonical_val, list):
        if claim in canonical_val:
            return ("verified",
                    f"[canonical_ref] `{ref}` claim `{claim}` ∈ canonical list")
        return ("contradicted",
                f"[canonical_ref] `{ref}` claim `{claim}` ∉ canonical list "
                f"({sorted(str(x) for x in canonical_val)[:5]})")
    # Equality fallback
    if claim == canonical_val:
        return ("verified",
                f"[canonical_ref] `{ref}` claim equals canonical")
    return ("contradicted",
            f"[canonical_ref] `{ref}` claim `{claim}` ≠ canonical `{canonical_val}`")


def is_invented_entity(ref: str, canonical: dict) -> bool:
    """True iff the ref's entity is ABSENT from a NON-EMPTY loaded canon set of its
    kind (trait/species/biome). Guarded: an empty set (partial/failed canon load) ->
    False (fail-open, never mass-reject). Tolerant match via _normalize_for_match so
    a present entity is never falsely flagged on case/separator variants.

    Companion to verify_canonical_ref: catches pure-invention refs that verify_
    canonical_ref classifies merely 'unverified' (lookup miss). Run-5 corpus items
    3-6 (echolocation/sand_digest as trait; thermal_resistance/substrate_grip).
    """
    parsed = parse_canonical_ref(ref)
    if parsed is None:
        return False
    file_part, entity, _field = parsed
    fp = file_part.lower()
    variants = _normalize_for_match(entity)
    if not variants:
        return False

    def _absent(coll: Any) -> bool:
        if not coll:
            return False  # empty/partial canon -> not invented (fail-open)
        keys = set(coll.keys()) if isinstance(coll, dict) else set(coll)
        if not keys:
            return False
        keys_lower = {str(k).lower() for k in keys}
        return not (variants & keys) and not (variants & keys_lower)

    if "trait" in fp:
        return _absent(canonical.get("traits"))
    if "species" in fp:
        return _absent(canonical.get("species_data") or canonical.get("species"))
    if "biome" in fp:
        biomes = set(canonical.get("biomes_primary") or set()) | set(canonical.get("biomes_alias") or set())
        return _absent(biomes)
    return False


def extract_canonical_refs_from_artifact(artifact: dict) -> list[dict]:
    """Estrae lista canonical_refs dall'artifact response (se presente).

    Format atteso (CO-02 schema v0.3):
      response.canonical_refs = [
        {"ref": "<path>#<entity>.<field>", "claim": <value>},
        ...
      ]

    Returns lista di dict normalizzati con keys ('ref', 'claim').
    Vuota se field non presente o malformato (no error, fallback a Tier 2.a regex).
    """
    response_raw = artifact.get("response", "")
    resp = None
    if isinstance(response_raw, str):
        try:
            resp = json.loads(response_raw)
        except Exception:
            return []
    elif isinstance(response_raw, dict):
        resp = response_raw
    if not isinstance(resp, dict):
        return []
    refs = resp.get("canonical_refs") or resp.get("canonical_ref")
    if not isinstance(refs, list):
        return []
    out: list[dict] = []
    for r in refs:
        if isinstance(r, dict) and "ref" in r:
            out.append({"ref": r["ref"], "claim": r.get("claim")})
        elif isinstance(r, str) and "=" in r:
            # Format alternativo: 'data/core/species.yaml#dune.biome=savana'
            ref_part, claim = r.rsplit("=", 1)
            out.append({"ref": ref_part.strip(), "claim": claim.strip()})
    return out


# ── Tier 2.a — A.L.I.E.N.A. axes I/L/E/N/A2 ────────────────────


# Asse N — Norme socioculturali — Pattern: "specie X tier T<N>"
_ALIENA_TIER_RE = re.compile(
    r"\b([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b[^\.]{0,80}?\btier\s+(t\d+)\b",
    re.IGNORECASE,
)


def extract_species_tier_tuples(artifact: dict, canonical: dict) -> list[tuple[str, str]]:
    """Asse N — estrae tuple (species, claimed_tier) dall'artifact.

    Pattern: "<species_id> ... tier T<N>" entro proximity 80 char.
    """
    blob = _normalize_artifact_text(artifact)
    species_set = canonical.get("species", set())
    tuples: set[tuple[str, str]] = set()
    for m in _ALIENA_TIER_RE.finditer(blob):
        species_cand = m.group(1)
        tier_cand = m.group(2).upper()
        if species_cand in species_set:
            tuples.add((species_cand, tier_cand))
    return sorted(tuples)


def verify_species_tier_relation(species: str, claimed_tier: str,
                                  canonical: dict) -> tuple[str, str]:
    """Asse N — cross-check claim 'specie X tier T<N>' vs canonical.

    Returns (status, note).
    """
    species_data = canonical.get("species_data", {})
    canonical_tier = species_data.get(species, {}).get("sentience_tier")
    if canonical_tier is None:
        return ("unverified",
                f"[asse N] `{species}` no sentience_tier in canonical")
    claimed_norm = claimed_tier.upper().strip()
    canonical_norm = str(canonical_tier).upper().strip()
    if claimed_norm == canonical_norm:
        return ("verified",
                f"[asse N] `{species}` sentience_tier {canonical_tier} matchato")
    return ("contradicted",
            f"[asse N] `{species}` claim tier `{claimed_tier}` ma canonical "
            f"sentience_tier = `{canonical_tier}`")


# Asse I — Impianto morfo-fisiologico — Pattern: "specie X (part|metabolism|
# sense|locomotion|offense|defense) <part>". NB: 'trait' NON incluso qui per
# evitare overlap con asse L (trait_plan). "trait foo" → asse L; "metabolism
# foo" → asse I.
_ALIENA_PART_RE = re.compile(
    r"\b([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b[^\.]{0,80}?\b(?:default_parts|part|parts|metabolism|sense|senses|locomotion|offense|defense)\b\s+([a-z][a-z0-9_-]{3,})"
)


def extract_species_part_tuples(artifact: dict, canonical: dict) -> list[tuple[str, str]]:
    """Asse I — estrae tuple (species, claimed_part) dall'artifact.

    Pattern: "specie ... part/trait <part_name>" o varianti.
    """
    blob = _normalize_artifact_text(artifact)
    species_set = canonical.get("species", set())
    tuples: set[tuple[str, str]] = set()
    for m in _ALIENA_PART_RE.finditer(blob):
        species_cand = m.group(1)
        part_cand = m.group(2)
        if species_cand in species_set:
            tuples.add((species_cand, part_cand))
    return sorted(tuples)


def verify_species_part_relation(species: str, claimed_part: str,
                                   canonical: dict) -> tuple[str, str]:
    """Asse I — cross-check claim 'specie X usa parts Y' vs canonical.

    Returns (status, note).
    """
    species_data = canonical.get("species_data", {})
    parts_dict = species_data.get(species, {}).get("default_parts") or {}
    if not parts_dict:
        return ("unverified",
                f"[asse I] `{species}` no default_parts in canonical")
    # Flatten parts: collect tutti i values (str + list)
    all_parts: set[str] = set()
    for v in parts_dict.values():
        if isinstance(v, str):
            all_parts.add(v)
        elif isinstance(v, list):
            all_parts.update(x for x in v if isinstance(x, str))
    claimed_lower = claimed_part.lower()
    if claimed_lower in all_parts:
        return ("verified",
                f"[asse I] `{species}` default_parts include `{claimed_part}`")
    # Check anche se è un trait_plan element (Asse L overlap)
    return ("contradicted",
            f"[asse I] `{species}` claim part `{claimed_part}` NON in "
            f"default_parts canonical (parts: {', '.join(sorted(all_parts))})")


# Asse L — Linee evolutive (trait_plan) — Pattern: "specie X ha trait Y"
_ALIENA_TRAIT_RE = re.compile(
    r"\b([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b[^\.]{0,60}?\btrait\s+([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b"
)


def extract_species_trait_tuples(artifact: dict, canonical: dict) -> list[tuple[str, str]]:
    """Asse L — estrae tuple (species, claimed_trait) dall'artifact.

    Pattern: "specie ... trait <trait_name>" entro proximity.
    """
    blob = _normalize_artifact_text(artifact)
    species_set = canonical.get("species", set())
    tuples: set[tuple[str, str]] = set()
    for m in _ALIENA_TRAIT_RE.finditer(blob):
        species_cand = m.group(1)
        trait_cand = m.group(2)
        if species_cand in species_set:
            tuples.add((species_cand, trait_cand))
    return sorted(tuples)


def verify_species_trait_relation(species: str, claimed_trait: str,
                                    canonical: dict) -> tuple[str, str]:
    """Asse L — cross-check claim 'specie X trait Y' vs canonical trait_plan.

    Returns (status, note). Considera trait_plan.{core, optional, synergies}.
    """
    species_data = canonical.get("species_data", {})
    trait_plan = species_data.get(species, {}).get("trait_plan") or {}
    if not trait_plan:
        return ("unverified",
                f"[asse L] `{species}` no trait_plan in canonical")
    all_traits: set[str] = set()
    for sub in ("core", "optional", "synergies"):
        items = trait_plan.get(sub) or []
        if isinstance(items, list):
            all_traits.update(x for x in items if isinstance(x, str))
    claimed_lower = claimed_trait.lower()
    if claimed_lower in all_traits:
        return ("verified",
                f"[asse L] `{species}` trait_plan include `{claimed_trait}`")
    return ("contradicted",
            f"[asse L] `{species}` claim trait `{claimed_trait}` NON in "
            f"trait_plan canonical (core+optional+synergies)")


# Asse E — Ecologia (synergy_hints) — Pattern: "specie X synergy <synergy>"
_ALIENA_SYNERGY_RE = re.compile(
    r"\b([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b[^\.]{0,60}?\bsynerg(?:y|ia|ie)\s+([a-z][a-z0-9_-]+(?:_[a-z0-9_-]+)+)\b",
    re.IGNORECASE,
)


def extract_species_synergy_tuples(artifact: dict, canonical: dict) -> list[tuple[str, str]]:
    """Asse E — estrae tuple (species, claimed_synergy) dall'artifact."""
    blob = _normalize_artifact_text(artifact)
    species_set = canonical.get("species", set())
    tuples: set[tuple[str, str]] = set()
    for m in _ALIENA_SYNERGY_RE.finditer(blob):
        species_cand = m.group(1).lower()
        synergy_cand = m.group(2).lower()
        if species_cand in species_set:
            tuples.add((species_cand, synergy_cand))
    return sorted(tuples)


def verify_species_synergy_relation(species: str, claimed_synergy: str,
                                      canonical: dict) -> tuple[str, str]:
    """Asse E — cross-check claim 'specie X synergy Y' vs canonical synergy_hints."""
    species_data = canonical.get("species_data", {})
    synergies = species_data.get(species, {}).get("synergy_hints") or []
    if not synergies:
        return ("unverified",
                f"[asse E] `{species}` no synergy_hints in canonical")
    claimed_lower = claimed_synergy.lower()
    if claimed_lower in [s.lower() for s in synergies if isinstance(s, str)]:
        return ("verified",
                f"[asse E] `{species}` synergy_hints include `{claimed_synergy}`")
    return ("contradicted",
            f"[asse E] `{species}` claim synergy `{claimed_synergy}` NON in "
            f"synergy_hints canonical ({', '.join(sorted(str(s) for s in synergies))})")


# Asse A2 — Ancoraggio narrativo — Pattern: "specie X display name 'Y'"
# Il check qui e' principalmente sul display_name normalizzato. Lo swarm
# spesso usa varianti narrative che divergono dal canonical display_name.
def extract_species_display_tuples(artifact: dict, canonical: dict) -> list[tuple[str, str]]:
    """Asse A2 — estrae tuple (species_id, claimed_display) dall'artifact.

    Pattern: capitalized phrases vicino a species_id mention.
    """
    text_parts: list[str] = []
    text_parts.append(artifact.get("summary", "") or "")
    response_raw = artifact.get("response", "")
    if isinstance(response_raw, str):
        try:
            resp = json.loads(response_raw)
            if isinstance(resp, dict):
                for key in ("summary", "proposal"):
                    v = resp.get(key)
                    if isinstance(v, str):
                        text_parts.append(v)
        except Exception:
            pass

    blob_normalized = re.sub(r"\s+", " ", " ".join(text_parts))
    blob_lower = blob_normalized.lower()
    species_set = canonical.get("species", set())
    tuples: set[tuple[str, str]] = set()
    PROXIMITY = 100

    for species in species_set:
        for m in re.finditer(r"\b" + re.escape(species) + r"\b", blob_lower):
            s_start = m.start()
            window_start = max(0, s_start - PROXIMITY)
            window_end = min(len(blob_normalized), s_start + PROXIMITY + len(species))
            # Cerca capitalized phrase nel window (case-sensitive blob)
            window = blob_normalized[window_start:window_end]
            for phrase_match in _PHRASE_RE.finditer(window):
                phrase = phrase_match.group(1)
                tuples.add((species, phrase))
    return sorted(tuples)


def verify_species_display_relation(species: str, claimed_display: str,
                                      canonical: dict) -> tuple[str, str]:
    """Asse A2 — cross-check claim narrative phrase ↔ display_name canonical.

    Status:
      verified — phrase matches canonical display_name (normalized)
      partial — phrase exists ma è una variante non-canonical
      unverified — canonical no display_name
    """
    species_data = canonical.get("species_data", {})
    canonical_display = species_data.get(species, {}).get("display_name")
    if not canonical_display:
        return ("unverified",
                f"[asse A2] `{species}` no display_name in canonical")
    claimed_norm = _normalize_for_match(claimed_display)
    canonical_norm = _normalize_for_match(canonical_display)
    if claimed_norm & canonical_norm:
        return ("verified",
                f"[asse A2] `{species}` display_name `{canonical_display}` matchato")
    # Phrase diversa — non strettamente CONTRADICTED perche' display name
    # multilingue/varianti ammessi. Marcata partial con info canonical.
    return ("partial",
            f"[asse A2] `{species}` phrase `{claimed_display}` ≠ canonical "
            f"display_name `{canonical_display}` (potenziale variante narrative)")


# Helper condiviso per harvest text da artifact con whitespace normalize
def _normalize_artifact_text(artifact: dict) -> str:
    """Estrae blob testuale normalizzato da artifact (summary + response.*)."""
    text_parts: list[str] = []
    text_parts.append(artifact.get("summary", "") or "")
    text_parts.append(artifact.get("trigger_reason", "") or "")
    response_raw = artifact.get("response", "")
    resp = None
    if isinstance(response_raw, str):
        try:
            resp = json.loads(response_raw)
        except Exception:
            pass
    elif isinstance(response_raw, dict):
        resp = response_raw
    if isinstance(resp, dict):
        for key in ("summary", "proposal", "trigger_reason", "next_action"):
            v = resp.get(key)
            if isinstance(v, str):
                text_parts.append(v)
        for key in ("findings", "gaps"):
            v = resp.get(key)
            if isinstance(v, list):
                text_parts.extend(item for item in v if isinstance(item, str))
    return re.sub(r"\s+", " ", " ".join(text_parts)).lower()


def verify_species_biome_relation(species: str, claimed_biome: str,
                                    canonical: dict) -> tuple[str, str]:
    """Asse A — cross-check claim 'species X adatta a biome Y' vs canonical.

    Returns (status_key, note) con uno di:
      'verified'    — claimed_biome == canonical biome_affinity
      'contradicted' — canonical biome_affinity esiste ma diverso (HALLUCINATION)
      'unverified'  — canonical non ha biome_affinity per species
    """
    affinity_map = canonical.get("species_biome_affinity", {})
    canonical_biome = affinity_map.get(species)
    if canonical_biome is None:
        return ("unverified",
                f"[asse A] `{species}` no biome_affinity in canonical species data")
    # Normalize per match tollerante
    claimed_normalized = _normalize_for_match(claimed_biome)
    canonical_normalized = _normalize_for_match(canonical_biome)
    if claimed_normalized & canonical_normalized:
        return ("verified",
                f"[asse A] `{species}` biome_affinity `{canonical_biome}` matchato")
    # Filtro false-positive: il regex cattura kebab/snake adjacent ma se il
    # claimed_biome NON e' un biome noto canonical, downgrade a UNVERIFIED
    # (e' probabilmente un trait/synergy/altro, non una claim biome reale).
    biomes_known = (
        canonical.get("biomes_primary", set()) | canonical.get("biomes_alias", set())
    )
    biomes_known_normalized: set[str] = set()
    for b in biomes_known:
        biomes_known_normalized |= _normalize_for_match(b)
    if not (claimed_normalized & biomes_known_normalized):
        return ("unverified",
                f"[asse A] `{claimed_biome}` non e' un biome canonical noto "
                f"(possibile false-positive del extractor regex)")
    return ("contradicted",
            f"[asse A] `{species}` claim biome `{claimed_biome}` ma canonical "
            f"biome_affinity = `{canonical_biome}`")


# ── Tier 2.b — E.R.M.E.S. role coherence helpers ────────────────


# Regex per estrarre BIOME_ROLE_DEMANDS dal file GDScript canonical.
# Pattern del file:
#   const BIOME_ROLE_DEMANDS: Dictionary = {
#       "savana": {"esploratore": 1, "guerriero": 1},
#       ...
#   }
_ERMES_BLOCK_RE = re.compile(
    r"const\s+BIOME_ROLE_DEMANDS\s*:\s*Dictionary\s*=\s*\{(.*?)^\}",
    re.DOTALL | re.MULTILINE,
)
_ERMES_ENTRY_RE = re.compile(r'"([\w_-]+)":\s*\{([^\}]*)\}')
_ERMES_ROLE_RE = re.compile(r'"([\w_-]+)":\s*(\d+)')


def parse_ermes_demands(ermes_repo: Path) -> dict[str, dict[str, int]]:
    """Parse BIOME_ROLE_DEMANDS dal file GDScript canonical.

    Driver: Tier 2.b L_SEMANTIC ERMES — single-source-of-truth è
    `Game-Godot-v2/scripts/session/ermes_role_gap.gd`. Parser leggero
    via regex (no full GDScript AST).

    Returns dict[bioma_id -> dict[role_id -> demand_count]] o empty se
    file non trovato o pattern non matchato.
    """
    gd_path = ermes_repo / ERMES_GD_FILE
    if not gd_path.exists():
        return {}
    try:
        text = gd_path.read_text(encoding="utf-8")
    except Exception:
        return {}
    block_match = _ERMES_BLOCK_RE.search(text)
    if not block_match:
        return {}
    block = block_match.group(1)
    out: dict[str, dict[str, int]] = {}
    for entry_match in _ERMES_ENTRY_RE.finditer(block):
        biome = entry_match.group(1)
        role_block = entry_match.group(2)
        roles: dict[str, int] = {}
        for rm in _ERMES_ROLE_RE.finditer(role_block):
            role = rm.group(1)
            try:
                roles[role] = int(rm.group(2))
            except ValueError:
                continue
        if biome and roles:
            out[biome] = roles
    return out


def extract_role_biome_tuples(artifact: dict, demands: dict) -> list[tuple[str, str]]:
    """Estrae tuple (role, biome) co-citate nell'artifact.

    Heuristica: per ogni coppia (role, biome) noto, controlla che entrambi
    appaiano nel testo entro proximity ridotta (60 char).

    Conservative: meglio pochi tuple precisi che molti spurious.
    """
    text_parts: list[str] = []
    text_parts.append(artifact.get("summary", "") or "")
    text_parts.append(artifact.get("trigger_reason", "") or "")
    response_raw = artifact.get("response", "")
    resp = None
    if isinstance(response_raw, str):
        try:
            resp = json.loads(response_raw)
        except Exception:
            pass
    elif isinstance(response_raw, dict):
        resp = response_raw
    if isinstance(resp, dict):
        for key in ("summary", "proposal", "next_action", "trigger_reason"):
            v = resp.get(key)
            if isinstance(v, str):
                text_parts.append(v)
        for key in ("findings", "gaps"):
            v = resp.get(key)
            if isinstance(v, list):
                text_parts.extend(item for item in v if isinstance(item, str))

    blob = re.sub(r"\s+", " ", " ".join(text_parts)).lower()
    tuples: set[tuple[str, str]] = set()
    biomes = list(demands.keys())
    PROXIMITY = 60  # char distance — conservative
    for role in ERMES_CANONICAL_ROLES:
        # Cerca occorrenze del role nel blob
        for role_match in re.finditer(r"\b" + re.escape(role) + r"\b", blob):
            r_start = role_match.start()
            window_start = max(0, r_start - PROXIMITY)
            window_end = min(len(blob), r_start + PROXIMITY)
            window = blob[window_start:window_end]
            for biome in biomes:
                if biome in window:
                    tuples.add((role, biome))
    return sorted(tuples)


def verify_role_coherence(role: str, biome: str, demands: dict) -> tuple[str, str]:
    """Cross-check role+biome contro ERMES BIOME_ROLE_DEMANDS.

    Returns (status_key, note).
    Status keys:
      'role_demand_match' — ruolo in demand del bioma
      'role_overrep_risk' — ruolo non in demand (over-rep risk)
      'biome_unknown' — bioma non in ERMES list (e separatamente non in
                       biomes_primary di Game canonical, gia' verificato a parte)
    """
    if biome not in demands:
        return ("biome_unknown", f"biome `{biome}` non in ERMES BIOME_ROLE_DEMANDS")
    demand = demands[biome]
    if role in demand:
        return (
            "role_demand_match",
            f"ruolo `{role}` in demand `{biome}` (count {demand[role]})",
        )
    in_demand = ", ".join(sorted(demand.keys())) or "(empty)"
    return (
        "role_overrep_risk",
        f"ruolo `{role}` NON in demand `{biome}` (demand: {in_demand})",
    )


# ── Artifact mention extraction ──────────────────────────────────

# Token regex: kebab-snake naming, min 4 char per filtrare rumore
_TOKEN_RE = re.compile(r"\b[a-z][a-z0-9_-]{3,}\b")
# Tier 1 — phrase regex: 2-3 capitalized words tipo "Dune Stalker" o
# "Polpo Araldo Sinaptico" → matcha display_name in artifact narrative.
# Estratti come snake_case lowercased per lookup display_names dict.
_PHRASE_RE = re.compile(r"\b([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,2})\b")


def extract_mentions(artifact: dict, extra_stopwords: set[str] | None = None) -> set[str]:
    """Estrae nomi candidati da artifact summary + response.* fields.

    Restituisce set di token unici lowercased. Non distingue category — la
    classificazione viene fatta dopo via canonical lookup.

    Args:
        artifact: artifact JSON dict.
        extra_stopwords: stopword aggiuntive (Tier 3) tipicamente field_names
                         da Game canonical. Mergiata con stopwords inline +
                         curated whitelist da verify_stopwords.txt.
    """
    text_parts: list[str] = []
    text_parts.append(artifact.get("summary", "") or "")
    text_parts.append(artifact.get("trigger_reason", "") or "")
    response_raw = artifact.get("response", "")
    if isinstance(response_raw, str):
        try:
            resp = json.loads(response_raw)
        except Exception:
            resp = None
    elif isinstance(response_raw, dict):
        resp = response_raw
    else:
        resp = None
    if isinstance(resp, dict):
        for key in ("summary", "proposal", "trigger_reason", "next_action"):
            v = resp.get(key)
            if isinstance(v, str):
                text_parts.append(v)
        for key in ("findings", "gaps", "target_files"):
            v = resp.get(key)
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, str):
                        text_parts.append(item)
    text_parts.extend(artifact.get("target_files") or [])

    raw_blob = " ".join(text_parts)
    # Normalizza whitespace: collassa qualunque sequenza ws (inclusi \n, \t)
    # in singolo spazio per evitare token cross-line spurious dal LLM output.
    normalized = re.sub(r"\s+", " ", raw_blob)
    blob = normalized.lower()
    tokens = set(_TOKEN_RE.findall(blob))
    # Tier 1 — bigram/trigram capture per display_name phrase matching
    for phrase in _PHRASE_RE.findall(normalized):
        # Es: 'Dune Stalker' → 'dune_stalker'
        tokens.add(phrase.lower().replace(" ", "_"))
    # Drop very common stopwords / generic terms (inline base layer)
    stopwords = {
        # Italian common words
        "questo", "questa", "questi", "queste", "essere", "avere",
        "sono", "viene", "vengono", "anche", "nuovo", "nuova", "nuovi",
        "nuove", "altri", "altre", "altro", "altra", "ogni", "tutti",
        "tutto", "tutta", "tutte", "sopra", "sotto", "stesso", "stessa",
        "esempio", "secondo", "primo", "prima", "ultimo", "ultima",
        # Generic dev/data terms
        "data", "core", "yaml", "json", "file", "files",
        "agent", "agente", "agenti", "specie", "trait", "tratto",
        "bioma", "biomi", "system", "systema", "design", "designer",
        "current", "context", "verify", "verificare",
    }
    # Tier 3 — merge curated whitelist (verify_stopwords.txt) +
    # field_names harvested da Game canonical (passati via extra_stopwords)
    stopwords |= _curated_stopwords()
    if extra_stopwords:
        stopwords |= extra_stopwords
    return tokens - stopwords


# ── Verification ─────────────────────────────────────────────────


def verify_artifact(artifact: dict, canonical: dict[str, set[str]],
                    fuzzy: bool = False,
                    ermes_demands: dict | None = None) -> dict:
    """Cross-check mentions vs canonical, ritorna verification report.

    Categories per ogni mention:
      VERIFIED — esiste come category dichiarata o coerente
      PARTIAL  — esiste ma in categoria/contesto diverso (alias-only biome,
                 display_name match, fuzzy match)
      HALLUCINATED — non esiste in canonical
      AMBIGUOUS — token generico, non classificabile
      ROLE_DEMAND_MATCH — Tier 2.b: ruolo proposto in ERMES demand bioma
      ROLE_OVERREP_RISK — Tier 2.b: ruolo proposto NON in demand bioma
      BIOME_UNKNOWN — Tier 2.b: bioma proposto non in ERMES (e canonical)

    Tier 1 fuzzy: se fuzzy=True, attiva Levenshtein <= 2 fallback per
    token >= 8 char. Default off per determinismo (test reproducibility).

    Tier 2.b ermes_demands: se passato (dict da parse_ermes_demands), attiva
    role coherence check. None default = skip ERMES axis.
    """
    # Tier 3 — usa field_names da canonical come stopwords addizionali
    field_stopwords = canonical.get("field_names", set()) if isinstance(canonical, dict) else set()
    mentions = extract_mentions(artifact, extra_stopwords=field_stopwords)
    by_status = {
        "verified": [], "partial": [], "hallucinated": [], "ambiguous": [],
        # Tier 2.a — relational check status (specie ↔ bioma_affinity)
        "contradicted": [], "unverified": [],
        # Tier 2.b — role coherence status
        "role_demand_match": [], "role_overrep_risk": [], "biome_unknown": [],
        # Tier 4 — canonical_ref explicit citation status
        "malformed_ref": [],
    }

    display_names = canonical.get("display_names", {}) if isinstance(canonical, dict) else {}

    for tok in sorted(mentions):
        # Tier 1 — exact match o normalized match (snake/kebab swap)
        match = _check_canonical(tok, canonical)
        if match:
            by_status[match[0]].append((tok, match[1]))
            continue

        # Tier 1 — display_name match (es: 'dune stalker' display → dune_stalker)
        for variant in _normalize_for_match(tok):
            if variant in display_names:
                canonical_id = display_names[variant]
                by_status["partial"].append(
                    (tok, f"display_name match → canonical id `{canonical_id}`")
                )
                break
        else:
            # Tier 1 — fuzzy fallback (Levenshtein) if --fuzzy enabled
            if fuzzy and len(tok) >= 8 and _looks_like_entity(tok):
                fz = _fuzzy_match(tok, canonical.get("species", set()))
                if fz:
                    by_status["partial"].append((tok, f"fuzzy match (Lev≤2) → species `{fz}`"))
                    continue
                fz = _fuzzy_match(tok, canonical.get("traits", set()))
                if fz:
                    by_status["partial"].append((tok, f"fuzzy match (Lev≤2) → trait `{fz}`"))
                    continue
                fz = _fuzzy_match(tok, canonical.get("biomes_primary", set()))
                if fz:
                    by_status["partial"].append((tok, f"fuzzy match (Lev≤2) → biome `{fz}`"))
                    continue
            if _looks_like_entity(tok):
                by_status["hallucinated"].append((tok, "no match in canonical"))
            # else ignored as generic word

    # Tier 4 — canonical_refs explicit citation (preferred over Tier 2.a regex).
    # Lo swarm può popolare un campo `canonical_refs` in response per dichiarare
    # esplicitamente quali canonical paths la sua claim si riferisce. Eliminate
    # ambiguity del regex tuple extraction (Tier 2.a) e del pattern hallucinate-
    # by-association (post Game OD-022 root cause analysis).
    canonical_refs = extract_canonical_refs_from_artifact(artifact)
    has_explicit_refs = bool(canonical_refs)
    if has_explicit_refs:
        for r in canonical_refs:
            ref_path = r.get("ref", "")
            claim = r.get("claim")
            status_key, note = verify_canonical_ref(ref_path, claim, canonical)
            tuple_token = f"ref:{ref_path}"
            by_status[status_key].append((tuple_token, note))

    # Tier 2.a — A.L.I.E.N.A. relational check (6 assi). Sempre on quando
    # canonical ha species_data popolato. Se canonical_refs sono presenti
    # (Tier 4), l'extraction regex resta utile per cattura claim non
    # esplicitamente referenced — ma la PRIORITY è ai canonical_refs.
    species_data = canonical.get("species_data") or {}
    has_relational_data = bool(species_data) or bool(canonical.get("species_biome_affinity"))
    if has_relational_data:
        # Asse A — Ambiente (specie ↔ biome_affinity)
        for species, claimed_biome in extract_species_biome_tuples(artifact, canonical):
            status_key, note = verify_species_biome_relation(species, claimed_biome, canonical)
            by_status[status_key].append((f"{species}→{claimed_biome}", note))
        # Asse N — Norme (specie ↔ sentience_tier)
        for species, claimed_tier in extract_species_tier_tuples(artifact, canonical):
            status_key, note = verify_species_tier_relation(species, claimed_tier, canonical)
            by_status[status_key].append((f"{species}@{claimed_tier}", note))
        # Asse I — Impianto (specie ↔ default_parts)
        for species, claimed_part in extract_species_part_tuples(artifact, canonical):
            status_key, note = verify_species_part_relation(species, claimed_part, canonical)
            by_status[status_key].append((f"{species}.{claimed_part}", note))
        # Asse L — Linee evolutive (specie ↔ trait_plan)
        for species, claimed_trait in extract_species_trait_tuples(artifact, canonical):
            status_key, note = verify_species_trait_relation(species, claimed_trait, canonical)
            by_status[status_key].append((f"{species}+trait:{claimed_trait}", note))
        # Asse E — Ecologia (specie ↔ synergy_hints)
        for species, claimed_syn in extract_species_synergy_tuples(artifact, canonical):
            status_key, note = verify_species_synergy_relation(species, claimed_syn, canonical)
            by_status[status_key].append((f"{species}+syn:{claimed_syn}", note))
        # Asse A2 — Ancoraggio narrativo (specie ↔ display_name)
        for species, claimed_display in extract_species_display_tuples(artifact, canonical):
            status_key, note = verify_species_display_relation(species, claimed_display, canonical)
            by_status[status_key].append((f"{species}~\"{claimed_display}\"", note))

    # Tier 2.b — ERMES role coherence check (opt-in via ermes_demands)
    if ermes_demands:
        for role, biome in extract_role_biome_tuples(artifact, ermes_demands):
            status_key, note = verify_role_coherence(role, biome, ermes_demands)
            tuple_token = f"{role}+{biome}"
            by_status[status_key].append((tuple_token, note))

    score_total = sum(len(v) for v in by_status.values())
    score_verified = len(by_status["verified"])
    score_hallucinated = len(by_status["hallucinated"])
    score_partial = len(by_status["partial"])
    # Tier 2.a — score aggregati per relational
    score_contradicted = len(by_status["contradicted"])
    score_unverified = len(by_status["unverified"])
    # Tier 2.b — score aggregati per role coherence
    score_role_match = len(by_status["role_demand_match"])
    score_role_overrep = len(by_status["role_overrep_risk"])
    score_biome_unknown = len(by_status["biome_unknown"])
    # Tier 4 — score canonical_refs (malformed_ref flagged separately)
    score_malformed_ref = len(by_status["malformed_ref"])
    canonical_refs_count = len(canonical_refs) if has_explicit_refs else 0

    return {
        "artifact": artifact.get("agent", "?") + "_cycle_" + str(artifact.get("cycle", "?")),
        "by_status": by_status,
        "score_total": score_total,
        "score_verified": score_verified,
        "score_partial": score_partial,
        "score_hallucinated": score_hallucinated,
        "score_contradicted": score_contradicted,
        "score_unverified": score_unverified,
        "score_role_match": score_role_match,
        "score_role_overrep": score_role_overrep,
        "score_biome_unknown": score_biome_unknown,
        "score_malformed_ref": score_malformed_ref,
        "canonical_refs_count": canonical_refs_count,
        "has_explicit_refs": has_explicit_refs,
    }


def _check_canonical(token: str, canonical: dict) -> tuple[str, str] | None:
    """Lookup token contro canonical sets (con normalize Tier 1).

    Returns (status_key, note) o None se nessun match.
    """
    species = canonical.get("species", set())
    traits = canonical.get("traits", set())
    biomes_p = canonical.get("biomes_primary", set())
    biomes_a = canonical.get("biomes_alias", set())
    parts = canonical.get("parts_known", set())

    if _lookup_with_normalize(token, species):
        return ("verified", "species")
    if _lookup_with_normalize(token, traits):
        return ("verified", "trait (glossary)")
    if _lookup_with_normalize(token, biomes_p):
        return ("verified", "biome (primary)")
    if _lookup_with_normalize(token, biomes_a):
        return ("partial", "biome (alias-only, no primary entry)")
    if _lookup_with_normalize(token, parts):
        return ("partial", "default_parts (NOT a trait)")
    return None


def _looks_like_entity(token: str) -> bool:
    """Heuristic conservative: only snake_case o kebab-case sono entity-shaped.

    Game data convention: tutti i nomi canonical sono kebab- o snake-case
    (dune_stalker, abisso_vulcanico, impulsi_bioluminescenti, ecc).
    Single-word italiani/inglesi senza separator sono filtrati come ambigui
    per ridurre false-positive rumore. Trade-off accettato: perdiamo qualche
    halluc single-word (es 'thermal_resistance' lo prendiamo, ma 'geothermal'
    no), in cambio output 10x più leggibile.

    Tier 3 strengthening: token kebab-case 2-segment corto (es. `co-02`,
    `e-mail`, `ad-hoc`) tendono a essere noise. Richiediamo uno dei due:
    - 2+ separatori (3+ segmenti — quasi sempre entity reale, es.
      `polpo_araldo_sinaptico`)
    - lunghezza totale ≥ 8 char (dust-cutoff per filtri minori)
    Combined con curated stopwords (verify_stopwords.txt) cattura il resto.
    """
    if "_" not in token and "-" not in token:
        return False
    sep_count = token.count("_") + token.count("-")
    if sep_count >= 2:
        return True
    # Single separator: richiede lunghezza distintiva
    return len(token) >= 8


# ── Reporting ────────────────────────────────────────────────────


def render_markdown(reports: list[dict]) -> str:
    if not reports:
        return "# Verify swarm claims\n\nNo artifact processed.\n"
    lines = ["# Verify swarm claims — verification report\n"]
    overall = {
        "verified": 0, "partial": 0, "hallucinated": 0,
        "contradicted": 0, "unverified": 0,
        "role_demand_match": 0, "role_overrep_risk": 0, "biome_unknown": 0,
    }
    for r in reports:
        overall["verified"] += r["score_verified"]
        overall["partial"] += r["score_partial"]
        overall["hallucinated"] += r["score_hallucinated"]
        overall["contradicted"] += r.get("score_contradicted", 0)
        overall["unverified"] += r.get("score_unverified", 0)
        overall["role_demand_match"] += r.get("score_role_match", 0)
        overall["role_overrep_risk"] += r.get("score_role_overrep", 0)
        overall["biome_unknown"] += r.get("score_biome_unknown", 0)
    total = overall["verified"] + overall["partial"] + overall["hallucinated"]
    lines.append("## Overall\n")
    if total > 0:
        lines.append(f"- ✅ VERIFIED:     {overall['verified']:3d} / {total} ({overall['verified']*100//total}%)")
        lines.append(f"- ⚠️ PARTIAL:      {overall['partial']:3d} / {total} ({overall['partial']*100//total}%)")
        lines.append(f"- ❌ HALLUCINATED: {overall['hallucinated']:3d} / {total} ({overall['hallucinated']*100//total}%)")
    else:
        lines.append("- (nessuna mention classificata)")
    rel_total = overall["contradicted"] + overall["unverified"]
    if rel_total > 0:
        lines.append("\n### A.L.I.E.N.A. relational check (Tier 2.a)")
        lines.append(f"- 🚫 CONTRADICTED: {overall['contradicted']:3d}  (claim relazionale ≠ canonical)")
        lines.append(f"- ⏳ UNVERIFIED:   {overall['unverified']:3d}  (canonical no info per validare)")

    role_total = overall["role_demand_match"] + overall["role_overrep_risk"] + overall["biome_unknown"]
    if role_total > 0:
        lines.append("\n### ERMES role coherence (Tier 2.b)")
        lines.append(f"- 🎯 ROLE_DEMAND_MATCH: {overall['role_demand_match']:3d}")
        lines.append(f"- ⚠️ ROLE_OVERREP_RISK: {overall['role_overrep_risk']:3d}")
        lines.append(f"- ❓ BIOME_UNKNOWN:     {overall['biome_unknown']:3d}")
    lines.append("\n## Per artifact\n")
    for r in reports:
        lines.append(f"### {r['artifact']}\n")
        scores_line = (
            f"- Verified: {r['score_verified']}, Partial: {r['score_partial']}, "
            f"Hallucinated: {r['score_hallucinated']}"
        )
        if r.get("score_role_match", 0) + r.get("score_role_overrep", 0) + r.get("score_biome_unknown", 0):
            scores_line += (
                f" | ERMES: match={r.get('score_role_match', 0)} "
                f"overrep={r.get('score_role_overrep', 0)} "
                f"biome_unk={r.get('score_biome_unknown', 0)}"
            )
        lines.append(scores_line + "\n")
        labeled = [
            ("verified", "✅ VERIFIED"),
            ("partial", "⚠️ PARTIAL"),
            ("hallucinated", "❌ HALLUCINATED"),
            ("contradicted", "🚫 CONTRADICTED"),
            ("unverified", "⏳ UNVERIFIED"),
            ("role_demand_match", "🎯 ROLE_DEMAND_MATCH"),
            ("role_overrep_risk", "⚠️ ROLE_OVERREP_RISK"),
            ("biome_unknown", "❓ BIOME_UNKNOWN"),
            ("malformed_ref", "🔴 MALFORMED_REF"),
        ]
        for status, label in labeled:
            items = r["by_status"].get(status, [])
            if items:
                lines.append(f"**{label}**:\n")
                for tok, note in items:
                    lines.append(f"  - `{tok}` — {note}")
                lines.append("")
    return "\n".join(lines) + "\n"


# ── Main ─────────────────────────────────────────────────────────


# ── Markdown front-end (Game CI: lint design-doc / PR prose, not only JSON) ──
# The upstream tool consumed artifact-shaped JSON only. To gate Game design docs
# / PR bodies that cite canonical entities, this adapter wraps markdown prose
# into the SAME artifact dict verify_artifact already consumes -- no new
# verification path, just a new input front-end.

_FRONTMATTER_RE = re.compile(r"\A---\r?\n.*?\r?\n---\r?\n", re.DOTALL)
_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```", re.DOTALL)


def _strip_frontmatter(text: str) -> str:
    """Rimuove un blocco YAML frontmatter iniziale (--- ... ---) se presente."""
    return _FRONTMATTER_RE.sub("", text, count=1)


def build_artifact_from_markdown(text: str, name: str = "doc") -> dict:
    """Adatta contenuto markdown (design doc / PR body) a un artifact dict.

    Il body (post-frontmatter) diventa `summary`, cosi' la prose-extraction
    (mentions + A.L.I.E.N.A. relational, assi A/N/I/L/E/A2) gira sul testo.
    Qualunque fenced block ```json``` con una lista di {ref, claim} (o un dict
    che contiene `canonical_refs`) viene promosso a `response.canonical_refs`
    per il check esplicito Tier 4. Mirror del contratto artifact JSON.
    """
    body = _strip_frontmatter(text or "")
    artifact: dict[str, Any] = {"agent": name, "cycle": 0, "summary": body}
    canonical_refs: list[dict] = []
    for m in _JSON_FENCE_RE.finditer(body):
        try:
            parsed = json.loads(m.group(1))
        except Exception:
            continue
        candidates = parsed if isinstance(parsed, list) else (
            parsed.get("canonical_refs") if isinstance(parsed, dict) else None
        )
        if not isinstance(candidates, list):
            continue
        for item in candidates:
            if isinstance(item, dict) and "ref" in item:
                canonical_refs.append({"ref": item["ref"], "claim": item.get("claim")})
    if canonical_refs:
        artifact["response"] = json.dumps({"canonical_refs": canonical_refs})
    return artifact


def load_artifact(path: Path) -> dict | None:
    """Carica un artifact da file. JSON -> dict; Markdown -> via adapter prose.

    Returns dict, o None se il file non e' parsabile (caller logga SKIP).
    """
    if path.suffix.lower() in (".md", ".markdown"):
        try:
            text = path.read_text(encoding="utf-8-sig")
        except Exception:
            return None
        return build_artifact_from_markdown(text, name=path.stem)
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def collect_artifacts(target: Path, include_md: bool = False) -> list[Path]:
    if target.is_file():
        return [target]
    if target.is_dir():
        paths = list(target.glob("*.json"))
        if include_md:
            paths += list(target.glob("*.md"))
            paths += list(target.glob("*.markdown"))
        return sorted(paths)
    return []


def main(argv: list[str] | None = None) -> int:
    # Force UTF-8 stdout (Windows console defaults to cp1252 which choca su emoji)
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("target", help="artifact JSON file o directory")
    parser.add_argument("--game-repo", default=str(_default_game_repo()),
                        help="path al Game repo (default: $EVOSWARM_GAME_REPO o C:\\dev\\Game)")
    parser.add_argument("--json", action="store_true", help="output strutturato")
    parser.add_argument("--strict", action="store_true",
                        help="exit 1 anche su hallucinated (default exit 2 = warning)")
    parser.add_argument("--fuzzy", action="store_true",
                        help="Tier 1: abilita Levenshtein <=2 fallback (per token >=8 char). "
                             "Default off per determinismo. display_name match e' sempre on.")
    parser.add_argument("--ermes-repo", default=str(_default_ermes_repo()),
                        help="Tier 2.b: path al repo Game-Godot-v2 contenente "
                             "scripts/session/ermes_role_gap.gd canonical. "
                             "Se vuoto/non trovato, ERMES role coherence check skip.")
    parser.add_argument("--no-ermes", action="store_true",
                        help="Skippa Tier 2.b ERMES role coherence check anche con --ermes-repo.")
    parser.add_argument("--include-md", action="store_true",
                        help="Includi file .md/.markdown nel glob di una directory (oltre a "
                             ".json). Per linting design-doc / PR prose via markdown adapter. "
                             "Un singolo file .md passato come target e' sempre gestito.")
    parser.add_argument("--advisory", action="store_true",
                        help="Modo advisory: stampa il report ma esci sempre 0 (warn non "
                             "blocking). Per il tier markdown durante il rollout (tuning "
                             "false-positive prima del flip a --strict).")
    args = parser.parse_args(argv)

    target = Path(args.target)
    artifact_paths = collect_artifacts(target, include_md=args.include_md)
    if not artifact_paths:
        print(f"ERR: {target} non trovato o nessun artifact", file=sys.stderr)
        return 1

    canonical = load_canonical_index(Path(args.game_repo).resolve())
    if "error" in canonical["meta"]:
        print(f"WARN canonical load: {canonical['meta']['error']}", file=sys.stderr)

    # Tier 2.b — load ERMES BIOME_ROLE_DEMANDS da Game-Godot-v2 (opt-in)
    ermes_demands = None
    if not args.no_ermes:
        ermes_repo = Path(args.ermes_repo).expanduser().resolve()
        if ermes_repo.is_dir():
            ermes_demands = parse_ermes_demands(ermes_repo)
            if not ermes_demands:
                print(f"WARN ERMES parse: {ermes_repo}/{ERMES_GD_FILE} non parsato",
                      file=sys.stderr)
        else:
            print(f"WARN ERMES repo non trovato: {ermes_repo} — skip Tier 2.b",
                  file=sys.stderr)

    reports = []
    skipped = 0
    for path in artifact_paths:
        artifact = load_artifact(path)
        if artifact is None:
            skipped += 1
            print(f"SKIP {path.name}: non parsabile come artifact JSON o markdown",
                  file=sys.stderr)
            continue
        report = verify_artifact(artifact, canonical, fuzzy=args.fuzzy,
                                 ermes_demands=ermes_demands)
        report["source_path"] = str(path)
        reports.append(report)

    if args.json:
        # Convert tuples to lists for JSON serialization
        for r in reports:
            for k, items in r["by_status"].items():
                r["by_status"][k] = [list(t) for t in items]
        print(json.dumps({
            "canonical_meta": canonical["meta"],
            "reports": reports,
        }, ensure_ascii=False, indent=2))
    else:
        print(render_markdown(reports))

    # Blocking buckets = the two "definitely wrong vs canon" verdicts:
    #   - hallucinated: entity-shaped token absent from a non-empty canon set
    #     (pure invention).
    #   - contradicted: an explicit canonical_ref or A.L.I.E.N.A. relation whose
    #     value DIFFERS from canon -- the flagship hallucinate-by-association
    #     mode (dune_stalker.biome_affinity=abisso_vulcanico vs canon savana).
    # Upstream gated on hallucinated only, letting contradicted slip; the Game
    # entity-grounding gate must catch both. partial/unverified never block.
    blocking = any(
        r["score_hallucinated"] > 0 or r.get("score_contradicted", 0) > 0
        for r in reports
    )
    if args.advisory:
        return 0
    # --strict means EVERY targeted file must be verified AND clean. A file the
    # linter could not parse (skipped) is an un-verified gap, not a pass: fail it
    # instead of silently green-lighting unparsable committed content.
    if args.strict and skipped:
        print(f"::error::--strict: {skipped} file non verificabili (skip) -- "
              f"non parsabili come artifact JSON o markdown", file=sys.stderr)
        return 1
    if blocking:
        return 1 if args.strict else 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
