#!/usr/bin/env python3
"""Generalize the A.L.I.E.N.A. lore generator to the catalog.

Given a species MASTER record (packs/.../species/**/<id>.yaml) + biomes.yaml,
build a complete codex DRAFT: id + unlock (triggers from used_in_encounters) +
lore_vars EXTRACTED from the species data + the 6 A.L.I.E.N.A. dimensions with
data-derived key_facts/cross_ref/game_impact + GENERATED content (via
codex_aliena_lore_gen) + lore_review_status: generated_pending_review.

This removes the hand-authored `lore_vars` step: the structured slots are
derived from the species' own fields (biome, role_trofico, morphotype, jobs_bias,
resistance_archetype, flags, balance). Fuzzy slots (lineage, social, hook) are
best-effort -> the human review refines them (the whole point: edit a draft, not
write from zero). DRAFT only: the promote gate refuses until reviewed.

Usage:
    PYTHONPATH=tools/py python tools/py/codex_draft_scaffold.py \
        packs/evo_tactics_pack/data/species/tutorial/guardiano-caverna.yaml \
        [--biomes data/core/biomes.yaml] [--grammar data/codex/_grammar/aliena_lore.json] \
        [--out-dir data/codex/_drafts] [--print]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import codex_aliena_lore_gen as gen  # noqa: E402

# rovine_planari is off-limits as a lore subject (canonical decision); prefer the
# next resolvable biome a species lists.
OFF_LIMITS_BIOMES = {"rovine_planari"}

ALIENA_DIMENSION_KEYS = gen.ALIENA_DIMENSION_KEYS


def _humanize(slug: object) -> str:
    return str(slug or "").replace("_", " ").strip()


def _norm(s: object) -> str:
    """Normalize a slug/display for matching: lower, _-and-space equivalent."""
    return str(s or "").lower().replace("_", " ").strip()


def _biomes(biomes_doc: Dict) -> Dict:
    return biomes_doc.get("biomes", biomes_doc) or {}


def build_biome_index(biomes_doc: Dict) -> Dict[str, str]:
    """Map every alias (key, legacy_slug, normalized display_name_it) -> key."""
    index: Dict[str, str] = {}
    for key, entry in _biomes(biomes_doc).items():
        if not isinstance(entry, dict):
            continue
        index.setdefault(_norm(key), key)
        if entry.get("legacy_slug"):
            index.setdefault(_norm(entry["legacy_slug"]), key)
        if entry.get("display_name_it"):
            index.setdefault(_norm(entry["display_name_it"]), key)
        if entry.get("label"):
            index.setdefault(_norm(entry["label"]), key)
    return index


def resolve_biome_entry(
    biomes_list: List[str], biomes_doc: Dict, index: Dict[str, str]
) -> Tuple[str, Dict]:
    """Return (biome_key, entry_dict) for the first resolvable, non-off-limits
    biome a species lists. Fallback: (first non-off-limits slug, {})."""
    biomes = _biomes(biomes_doc)
    for slug in biomes_list or []:
        if slug in OFF_LIMITS_BIOMES:
            continue
        key = index.get(_norm(slug))
        if key and key in biomes:
            return key, biomes[key]
    for slug in biomes_list or []:
        if slug not in OFF_LIMITS_BIOMES:
            return slug, {}
    return "", {}


def resolve_biome(
    biomes_list: List[str], biomes_doc: Dict, index: Dict[str, str]
) -> Tuple[str, str, str]:
    """Return (biome_key, display_name, trait). Thin wrapper over resolve_biome_entry."""
    key, entry = resolve_biome_entry(biomes_list, biomes_doc, index)
    if not key:
        return "", "il suo ambiente nativo", ""
    name = entry.get("display_name_it") or entry.get("label") or _humanize(key)
    return key, name, entry.get("summary") or ""


def _biome_narrative(entry: Dict, biome_name: str, subject_id: str) -> Dict[str, str]:
    """Pull the AUTHORED biome narrative (tone / hooks / affixes / npc_archetypes)
    -- the lore-gold the early extractor ignored. Best-effort with fallbacks."""
    narrative = entry.get("narrative") or {}
    tone = str(narrative.get("tone") or "").strip().rstrip(".") or "un ambiente ostile"
    hooks = narrative.get("hooks") or []
    if hooks:
        h = str(hooks[0]).strip().rstrip(".")
        biome_hook = (h[0].lower() + h[1:]) if h else f"sopravvivere in {biome_name}"
    else:
        biome_hook = f"sopravvivere in {biome_name}"
    affixes = [_humanize(a) for a in (entry.get("affixes") or []) if a]

    npc_raw = entry.get("npc_archetypes") or {}
    npc_list: List[str] = []
    if isinstance(npc_raw, dict):
        for v in npc_raw.values():
            npc_list.extend(v if isinstance(v, list) else [v])
    elif isinstance(npc_raw, list):
        npc_list = list(npc_raw)
    neighbors = [_humanize(n) for n in npc_list if n and n != subject_id][:3]

    return {
        "biome_tone": tone,
        "biome_hook": biome_hook,
        "affixes": ", ".join(affixes) or "pressioni ambientali",
        "neighbors": ", ".join(neighbors) or "predatori e prede del posto",
    }


def _strip_token(text: str, token: str) -> str:
    return " ".join(t for t in text.split() if t.lower() != token)


def extract_lore_vars(
    species: Dict, biomes_doc: Dict, lifecycle_doc: Optional[Dict] = None
) -> Dict[str, str]:
    """Derive the A.L.I.E.N.A. grammar slots from a species master record.

    For RICH (catalog) species, `species` carries trait_refs + visual_description
    and `lifecycle_doc` carries phases + mutation_morphology; those feed the rich
    slots (traits / visual / lifecycle_arc / mutations). For stubs they fall back."""
    index = build_biome_index(biomes_doc)
    biome_key, biome_entry = resolve_biome_entry(species.get("biomes") or [], biomes_doc, index)
    biome_name = (
        biome_entry.get("display_name_it")
        or biome_entry.get("label")
        or (_humanize(biome_key) if biome_key else "il suo ambiente nativo")
    )
    biome_trait = biome_entry.get("summary") or ""
    narrative_vars = _biome_narrative(biome_entry, biome_name, species.get("id"))

    tags = [str(t) for t in (species.get("functional_tags") or [])]
    morphotype = _humanize(species.get("morphotype"))
    archetype = str(species.get("resistance_archetype") or "adattivo")
    role = _strip_token(_humanize(species.get("role_trofico")), "tutorial")
    sentient = bool((species.get("flags") or {}).get("sentient"))

    is_raider = any("predone" in t for t in tags)
    is_umanoide = "umanoide" in morphotype or any("umanoide" in t for t in tags)
    is_apex = any(t in ("boss", "apex_creature", "apex") for t in tags)

    if is_raider:
        lineage = "razziatori umanoidi"
        social = "bande di razzia nomadi"
    elif is_apex:
        lineage = f"apici a morfologia {morphotype}"
        social = "presenza solitaria, non gregaria"
    elif is_umanoide:
        lineage = "stirpi umanoidi"
        social = "gruppi territoriali"
    else:
        lineage = f"forme a morfologia {morphotype}"
        social = "gruppi territoriali"

    threat_tier = str((species.get("balance") or {}).get("threat_tier") or "T1")
    subject = (species.get("display_name") or _humanize(species.get("id"))).lower()
    job = _humanize((species.get("jobs_bias") or [""])[0])

    # rich slots: trait_refs (each trait = a pressure) + authored visual_description
    # + lifecycle phases (evolutionary arc) + mutation_morphology. Fallbacks for stubs.
    traits = ", ".join(_humanize(t) for t in (species.get("trait_refs") or [])) or (
        "tratti adattivi non ancora documentati"
    )
    visual = str(species.get("visual_description") or "").strip()
    visual = (visual + ("" if visual.endswith(".") else ".")) if visual else f"un {morphotype}."
    lc = lifecycle_doc or {}
    phases = lc.get("phases") or {}
    phase_keys = list(phases.keys()) if isinstance(phases, dict) else [str(p) for p in phases]
    lifecycle_arc = ", ".join(_humanize(p) for p in phase_keys) or "un ciclo di adattamento continuo"
    muts = lc.get("mutation_morphology") or {}
    mut_keys = list(muts.keys()) if isinstance(muts, dict) else [str(m) for m in muts]
    mutations = ", ".join(_humanize(m) for m in mut_keys[:5]) or "nessuna mutazione documentata"

    return {
        "subject": subject,
        "biome_name": biome_name,
        "biome_trait": (biome_trait or "un ambiente che non perdona").rstrip(". "),
        "lineage": lineage,
        "archetype": archetype,
        "morphotype": morphotype,
        "job": job,
        "role": role,
        "threat_tier": threat_tier,
        "social": social,
        "sentience": "culturale" if sentient else "istintiva",
        "hook": f"un avversario {role or 'ostile'} ({threat_tier}) che affronti in {biome_name}",
        # apex-aware ecology stance (avoids "senza contendere l'apice" on a boss)
        "eco_stance": (
            "Domina la catena trofica: poche prede gli sfuggono."
            if is_apex
            else "Esercita pressione sulle prede senza contendere l'apice."
        ),
        # AUTHORED biome narrative (was ignored) -- improves A_ambiente voice +
        # gives A_ancoraggio a real hook + names the biome's other fauna.
        "biome_tone": narrative_vars["biome_tone"],
        "biome_hook": narrative_vars["biome_hook"],
        "affixes": narrative_vars["affixes"],
        "neighbors": narrative_vars["neighbors"],
        # rich (catalog + lifecycle); used by the *_rich grammar origins.
        "traits": traits,
        "visual": visual,
        "lifecycle_arc": lifecycle_arc,
        "mutations": mutations,
    }


def _facts(species: Dict, biome_key: str, biome_name: str) -> Dict[str, Dict]:
    """Build the 6 dimensions with data-derived key_facts/cross_ref/game_impact
    (content is filled later by the generator)."""
    sid = species["id"]
    cb = species.get("combat_baseline") or {}
    bal = species.get("balance") or {}
    enc = species.get("used_in_encounters") or []
    morpho = _humanize(species.get("morphotype"))
    role = _humanize(species.get("role_trofico"))
    job = _humanize((species.get("jobs_bias") or [""])[0])
    tags = ", ".join(str(t) for t in (species.get("functional_tags") or []))
    cb_line = " / ".join(f"{k} {v}" for k, v in cb.items()) if cb else "n/d"
    enc_line = ", ".join(enc) if enc else "n/d"

    return {
        "A_ambiente": {
            "heading": "Ambiente",
            "key_facts": [f"Bioma nativo: {biome_name}", f"Biomi: {', '.join(species.get('biomes') or [])}"],
            "cross_ref": [f"biome:{biome_key}"] if biome_key else [],
            "game_impact": f"Comparsa negli scontri: {enc_line}.",
        },
        "L_linee_evolutive": {
            "heading": "Linee evolutive",
            "key_facts": [
                f"resistance_archetype: {species.get('resistance_archetype')}",
                f"role_trofico: {species.get('role_trofico')}; sentient: {(species.get('flags') or {}).get('sentient')}",
            ]
            + ([f"trait_refs: {', '.join(species['trait_refs'])}"] if species.get("trait_refs") else []),
            "cross_ref": [f"species:{sid}"]
            + [f"trait:{t}" for t in (species.get("trait_refs") or [])],
            "game_impact": f"Archetipo {species.get('resistance_archetype')}.",
        },
        "I_impianto": {
            "heading": "Impianto morfo-fisiologico",
            "key_facts": [f"morphotype: {species.get('morphotype')}", f"combat_baseline: {cb_line}", f"jobs_bias: {job}"],
            "cross_ref": [f"species:{sid}"],
            "game_impact": f"Profilo da {job} ({morpho}).",
        },
        "E_ecologia": {
            "heading": "Ecologia",
            "key_facts": [f"role_trofico: {species.get('role_trofico')}", f"rarity {bal.get('rarity')} / threat_tier {bal.get('threat_tier')}"],
            "cross_ref": [f"biome:{biome_key}"] if biome_key else [],
            "game_impact": f"encounter_role: {bal.get('encounter_role')}.",
        },
        "N_norme_socio": {
            "heading": "Norme socio",
            "key_facts": [f"functional_tags: {tags}"],
            "cross_ref": [f"species:{sid}"],
            "game_impact": "Comportamento di gruppo/solitario secondo i tag.",
        },
        "A_ancoraggio_narrativo": {
            "heading": "Ancoraggio narrativo",
            "key_facts": [f"Comparsa: {enc_line}", "Voce codex sbloccabile via encounter_completed"],
            "cross_ref": [f"encounter:{e}" for e in enc],
            "game_impact": f"Unlock e2e: completare {enc[0] if enc else 'lo scontro'} sblocca questa voce.",
        },
    }


def scaffold_draft(
    species: Dict,
    biomes_doc: Dict,
    grammar: Dict,
    lifecycle_doc: Optional[Dict] = None,
    rich: bool = False,
) -> Dict:
    """Build a complete pending-review codex draft from a species record.

    rich=True (catalog species) weaves trait_refs/visual/lifecycle via the
    *_rich grammar origins."""
    sid = species["id"]
    index = build_biome_index(biomes_doc)
    biome_key, biome_name, _ = resolve_biome(species.get("biomes") or [], biomes_doc, index)
    lore_vars = extract_lore_vars(species, biomes_doc, lifecycle_doc)
    enc = species.get("used_in_encounters") or []
    bal = species.get("balance") or {}
    display = species.get("display_name") or _humanize(sid)

    draft = {
        "codex_entry": {
            "id": sid,
            "type": "species",
            "display_name_it": display,
            "display_name_en": species.get("display_name_en") or display,
            "subtitle_it": f"{display} -- {biome_name} ({bal.get('threat_tier', 'T1')})",
            "unlock": {
                "triggers": ["encounter_completed"],
                "threshold": 1,
                "locked_preview": f"{display}: sopravvivi a uno scontro per sbloccare il Codex.",
                "persistence": f"localStorage:evo:codex-seen-{sid}",
            },
            "lore_vars": lore_vars,
            "aliena_dimensions": _facts(species, biome_key, biome_name),
        }
    }
    contents = gen.generate_all(grammar, lore_vars, sid, rich=rich)
    gen.fill_draft(draft, contents)  # sets content + lore_review_status + scrubs score fields
    # Seed the A_ancoraggio narrative hook (HA2 SOFT expects story_hook_it there);
    # a starting point for the human review to refine.
    draft["codex_entry"]["aliena_dimensions"]["A_ancoraggio_narrativo"]["story_hook_it"] = lore_vars["hook"]
    return draft


def _load(path: str) -> Dict:
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


DEFAULT_CATALOG_PATH = "data/core/species/species_catalog.json"
DEFAULT_LIFECYCLE_DIR = "data/core/species"


def load_catalog(path: str = DEFAULT_CATALOG_PATH) -> Dict[str, Dict]:
    """species_catalog.json -> {species_id: entry}."""
    import json

    with open(path, encoding="utf-8") as fh:
        cat = json.load(fh).get("catalog") or []
    return {s.get("species_id"): s for s in cat if isinstance(s, dict) and s.get("species_id")}


def load_lifecycle(species_id: str, lifecycle_dir: str = DEFAULT_LIFECYCLE_DIR) -> Dict:
    """Load data/core/species/<id>_lifecycle.yaml if present, else {}."""
    p = Path(lifecycle_dir) / f"{species_id}_lifecycle.yaml"
    if p.exists():
        with open(p, encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    return {}


def catalog_to_species(entry: Dict) -> Dict:
    """Adapt a rich catalog entry to the species-dict shape extract_lore_vars
    expects, carrying trait_refs + visual_description for the rich slots."""
    role_tags = [str(t) for t in (entry.get("role_tags") or [])]
    sent = str(entry.get("sentience_index") or "")
    macro = (entry.get("classification") or {}).get("macro_class") or ""
    morpho = macro.split("/")[0].strip()  # "Cursore quadrupede / predatore apex" -> first
    is_apex = any("apex" in t for t in role_tags)
    names = entry.get("common_names") or []
    return {
        "id": entry.get("species_id"),
        "display_name": names[0] if names else _humanize(entry.get("species_id")),
        "biomes": [entry["biome_affinity"]] if entry.get("biome_affinity") else [],
        "role_trofico": role_tags[0] if role_tags else "",
        "morphotype": morpho,
        "resistance_archetype": "adattivo",
        "jobs_bias": [],
        "functional_tags": role_tags,
        "flags": {"sentient": sent in ("T3", "T4", "T5")},
        "balance": {"threat_tier": "T3" if is_apex else "T2"},
        "used_in_encounters": [],
        "trait_refs": entry.get("trait_refs") or [],
        "visual_description": entry.get("visual_description") or "",
    }


def scaffold_rich_draft(catalog_entry: Dict, lifecycle_doc: Dict, biomes_doc: Dict, grammar: Dict) -> Dict:
    """Scaffold a RICH draft from a catalog entry + its lifecycle (trait_refs +
    visual_description + lifecycle phases/mutations via the *_rich origins)."""
    species = catalog_to_species(catalog_entry)
    return scaffold_draft(species, biomes_doc, grammar, lifecycle_doc=lifecycle_doc, rich=True)


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Scaffold a codex A.L.I.E.N.A. draft from a species record")
    p.add_argument("species", nargs="?", help="path to a species master YAML (stub path)")
    p.add_argument("--catalog", metavar="SPECIES_ID", help="RICH mode: scaffold from species_catalog.json + <id>_lifecycle.yaml")
    p.add_argument("--biomes", default="data/core/biomes.yaml")
    p.add_argument("--grammar", default=gen.DEFAULT_GRAMMAR_PATH)
    p.add_argument("--out-dir", default="data/codex/_drafts")
    p.add_argument("--print", action="store_true", help="print to stdout instead of writing")
    args = p.parse_args(argv)

    biomes_doc = _load(args.biomes)
    grammar = gen.load_grammar(args.grammar)

    if args.catalog:
        catalog = load_catalog()
        entry = catalog.get(args.catalog)
        if not entry:
            print(f"ERROR: species_id '{args.catalog}' not in catalog", file=sys.stderr)
            return 2
        sid = args.catalog
        draft = scaffold_rich_draft(entry, load_lifecycle(sid), biomes_doc, grammar)
    else:
        if not args.species:
            print("ERROR: provide a species path or --catalog <species_id>", file=sys.stderr)
            return 2
        species = _load(args.species)
        sid = species.get("id")
        if not sid:
            print("ERROR: species record has no id", file=sys.stderr)
            return 2
        draft = scaffold_draft(species, biomes_doc, grammar)

    served = Path("data/codex") / f"{sid}.yaml"
    if served.exists():
        print(f"SKIP {sid}: already promoted (data/codex/{sid}.yaml exists)", file=sys.stderr)
        return 0

    if args.print:
        print(yaml.safe_dump(draft, allow_unicode=True, sort_keys=False, width=88))
        return 0

    out = Path(args.out_dir) / f"{sid}.yaml"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(
            "# Generated by tools/py/codex_draft_scaffold.py -- PENDING master-dd review.\n"
            "# lore_vars extracted from the species record; the 6 content: blocks are a\n"
            "# generated DRAFT. Edit the prose, set lore_review_status: human_reviewed (or\n"
            "# remove it), then `node tools/js/promote_codex_draft.js " + sid + "`.\n"
        )
        yaml.safe_dump(draft, fh, allow_unicode=True, sort_keys=False, width=88)
    print(f"WROTE {out} (pending review)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
