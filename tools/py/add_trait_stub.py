#!/usr/bin/env python3
"""add_trait_stub.py -- atomic, deterministic trait-add through the iter (Phase 1.5).

Authoring a trait is CI-coupled to derived-sync: the per-trait DB file id must ALSO
appear -- as a full schema entry -- in data/traits/index.json (the aggregate the
trait_template_validator checks), and the glossary may need an entry. This helper
does that deterministic part in one step for a trait that already has an
active_effects mechanic (+ optional glossary entry):

  1. write data/traits/<dir>/<id>.json  (honest design-stub: derived label/tier/
     category/uso_funzione; design fields slot/sinergie/conflitti/mutazione_indotta/
     spinta_selettiva left EMPTY + completion_flags.design_stub=true -- NO fabrication)
  2. insert index.json.traits[<id>] = the same entry  (coverage)
  3. add a glossary entry when missing (interoception traits)

It does NOT run `npm run sync:evo-pack` -- run that afterwards to refresh the pack
mirror, then commit. Context: docs/guide/derived-artifacts-reproducibility.md +
docs/superpowers/plans/2026-06-22-derived-canon-salvage-roadmap.md.

DRY-RUN by default; --apply to write. Idempotent (existing id skipped, byte-stable).

Usage:
  python tools/py/add_trait_stub.py --id ferocia --id intimidatore        # dry-run
  python tools/py/add_trait_stub.py --id ferocia --apply
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    yaml = None

REPO_ROOT = Path(__file__).resolve().parents[2]

# active_effects category -> per-trait directory under data/traits/.
CATEGORY_DIR = {
    "fisiologico": "fisiologico",
    "sensoriale": "sensoriale",
    "mentale": "cognitivo",
    "comportamentale": "strategia",
    "traumatico": "offensivo",
    "neurologico": "nervoso",
    "difensivo": "difensivo",
}
# active_effects category -> famiglia_tipologia "Family/Subtype" (schema requires a slash).
CATEGORY_FAMIGLIA = {
    "fisiologico": "Fisiologico/Morfologia",
    "sensoriale": "Sensoriale/Percezione",
    "mentale": "Mentale/Cognizione",
    "comportamentale": "Comportamentale/Istinto",
    "traumatico": "Traumatico/Offesa",
    "neurologico": "Neurologico/Sistema nervoso",
    "difensivo": "Difensivo/Protezione",
}
TIER_ENERGY = {
    "T1": "Basso (passivo)",
    "T2": "Medio (situazionale)",
    "T3": "Medio (situazionale)",
    "T4": "Alto (sostenuto)",
    "T5": "Alto (sostenuto)",
    "T6": "Alto (sostenuto)",
}
# Statuses that live in active_effects but are NOT creature traits -- never authored.
NON_TRAITS = {"wounded_perma", "stordimento"}


def _first_sentence(text: str) -> str:
    text = " ".join((text or "").split())
    for sep in (". ", "; "):
        if sep in text:
            return text.split(sep)[0].strip().rstrip(".") + "."
    return text[:200].strip()


def build_stub_entry(trait_id: str, ae_entry: dict, glossary_entry: dict | None) -> dict:
    """Honest design-stub: derive what the registries provide, leave design empty."""
    ae_entry = ae_entry or {}
    cat = ae_entry.get("category", "")
    fam = CATEGORY_FAMIGLIA.get(cat) or (f"{cat.title()}/Generale" if cat else "Comportamentale/Generale")
    tier = ae_entry.get("tier", "T1")
    label = (glossary_entry or {}).get("label_it") or trait_id.replace("_", " ").title()
    desc = (glossary_entry or {}).get("description_it") or ae_entry.get("description_it") or ""
    return {
        "schema_version": "2.0",
        "id": trait_id,
        # All free-text fields are i18n refs -- the trait style guide (scripts/trait_style_check.js,
        # --fail-on error) mandates it, and all 263 existing traits do the same (the locale is
        # resolved elsewhere; the canonical IT/EN text lives in the glossary). The refs are the
        # design_stub markers; no prose is fabricated here.
        "label": f"i18n:traits.{trait_id}.label",
        "famiglia_tipologia": fam,
        "fattore_mantenimento_energetico": TIER_ENERGY.get(tier, "Medio (situazionale)"),
        "tier": tier,
        "slot": [],
        "sinergie": [],
        "conflitti": [],
        "mutazione_indotta": f"i18n:traits.{trait_id}.mutazione_indotta",
        "uso_funzione": f"i18n:traits.{trait_id}.uso_funzione",
        "spinta_selettiva": f"i18n:traits.{trait_id}.spinta_selettiva",
        "data_origin": "gap1_salvage_2026_06_22",  # slug (^[a-z0-9_]+$)
        "completion_flags": {"design_stub": True},  # values must be boolean
    }


def _load_active_effects(path) -> dict:
    if yaml is None:  # pragma: no cover
        raise RuntimeError("PyYAML required")
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    out: dict = {}

    def harvest(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, dict) and any(x in v for x in ("effect", "effects", "mechanic", "tier")):
                    out[k] = v
                harvest(v)

    harvest(data)
    return out


def _write_json(path, payload) -> None:
    Path(path).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


def apply(trait_ids, *, traits_dir, index_path, glossary_path, active_effects_path) -> dict:
    ae_map = _load_active_effects(active_effects_path)
    index = json.loads(Path(index_path).read_text(encoding="utf-8"))
    glossary = json.loads(Path(glossary_path).read_text(encoding="utf-8"))
    index_traits = index.setdefault("traits", {})
    g_traits = glossary.setdefault("traits", {})

    res = {"written": [], "indexed": [], "glossary_added": [], "skipped": []}
    index_changed = glossary_changed = False

    for tid in trait_ids:
        if tid in NON_TRAITS:
            res["skipped"].append(tid)
            continue
        ae_e = ae_map.get(tid)
        if ae_e is None:
            res["skipped"].append(tid)  # not a resolver trait
            continue

        g_e = g_traits.get(tid)
        if g_e is None:
            label = tid.replace("_", " ").title()
            g_traits[tid] = {
                "label_it": label,
                "label_en": label,
                "description_it": _first_sentence(ae_e.get("description_it") or "") or label,
                "description_en": "",
            }
            res["glossary_added"].append(tid)
            glossary_changed = True
            g_e = g_traits[tid]

        entry = build_stub_entry(tid, ae_e, g_e)
        d = CATEGORY_DIR.get(ae_e.get("category", ""), ae_e.get("category") or "strategia")
        f = Path(traits_dir) / d / f"{tid}.json"

        wrote = False
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            _write_json(f, entry)
            res["written"].append(tid)
            wrote = True

        if tid not in index_traits:
            index_traits[tid] = entry
            res["indexed"].append(tid)
            index_changed = True
        elif not wrote:
            res["skipped"].append(tid)

    if index_changed:
        _write_json(index_path, index)
    if glossary_changed:
        _write_json(glossary_path, glossary)
    return res


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", action="append", default=[], help="trait id (repeatable)")
    ap.add_argument("--traits-dir", default=str(REPO_ROOT / "data/traits"))
    ap.add_argument("--index", default=str(REPO_ROOT / "data/traits/index.json"))
    ap.add_argument("--glossary", default=str(REPO_ROOT / "data/core/traits/glossary.json"))
    ap.add_argument("--active-effects", default=str(REPO_ROOT / "data/core/traits/active_effects.yaml"))
    ap.add_argument("--apply", action="store_true", help="write (default: dry-run)")
    args = ap.parse_args(argv)

    if not args.id:
        print("ERROR: pass at least one --id", file=sys.stderr)
        return 2
    if not args.apply:
        print(f"[dry-run] would add {len(args.id)} trait(s): {args.id}")
        print("Re-run with --apply, then `npm run sync:evo-pack` + commit.")
        return 0

    res = apply(
        args.id,
        traits_dir=args.traits_dir,
        index_path=args.index,
        glossary_path=args.glossary,
        active_effects_path=args.active_effects,
    )
    print(f"written: {res['written']}")
    print(f"indexed: {res['indexed']}")
    print(f"glossary_added: {res['glossary_added']}")
    print(f"skipped: {res['skipped']}")
    print("Next: `npm run sync:evo-pack` to refresh the pack mirror, then commit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
