#!/usr/bin/env python3
"""
Ancestors style guide compliance + rename proposal generator.

Input  : reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv (297 rows, immutable wiki source)
Output : data/core/ancestors/ancestors_rename_proposal_v1.yaml (297 entries, style-guide compliant proposal)

Style guide reference: docs/core/00E-NAMING_STYLEGUIDE.md
- ID: snake_case ASCII (`ancestor_<branch>_<name>_<code_suffix>`)
- label_it: italiano Title Case 2-4 parole
- label_en: english Title Case 2-4 parole (preserve original wiki name)
- description_it/en: short prose
- branch (slug): snake_case (es. `self_control`, `preventive_medication`)
- legacy_code: codice wiki originale preservato (CO 01, BB FR 04, etc.)
- genetic: bool (Yes/No -> True/False)
- license: CC BY-NC-SA 3.0 (Fandom)

Usage : python tools/py/ancestors_style_guide_proposal.py
"""

from __future__ import annotations

import csv
import datetime as _dt
import json
import os
import re
import sys
import unicodedata

# ------------------------------------------------------------------ paths
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CSV_PATH = os.path.join(
    ROOT,
    "reports",
    "incoming",
    "ancestors",
    "ancestors_neurons_dump_v07_wiki_recovery.csv",
)
MANIFEST_PATH = os.path.join(
    ROOT,
    "reports",
    "incoming",
    "ancestors",
    "ancestors_neurons_manifest_v07.json",
)
OUTPUT_PATH = os.path.join(
    ROOT, "data", "core", "ancestors", "ancestors_rename_proposal_v1.yaml"
)

# ------------------------------------------------------------------ branch slug map
BRANCH_SLUG = {
    "Ambulation": "ambulation",
    "Ardipithecus Ramidus": "ardipithecus_ramidus",
    "Attack": "attack",
    "Australopithecus Afarensis": "australopithecus_afarensis",
    "Communication": "communication",
    "Dexterity": "dexterity",
    "Dodge": "dodge",
    "Intelligence": "intelligence",
    "Metabolism": "metabolism",
    "Motricity": "motricity",
    "Omnivore": "omnivore",
    "Orrorin Tugenensis": "orrorin_tugenensis",
    "Preventive Medication": "preventive_medication",
    "Self-Control": "self_control",
    "Senses": "senses",
    "Settlement": "settlement",
    "Swim": "swim",
    "Therapeutic Medication": "therapeutic_medication",
}

# Italian translations for branch names (player-facing)
BRANCH_LABEL_IT = {
    "Ambulation": "Deambulazione",
    "Ardipithecus Ramidus": "Ardipithecus Ramidus",  # latin name preserved
    "Attack": "Attacco",
    "Australopithecus Afarensis": "Australopithecus Afarensis",
    "Communication": "Comunicazione",
    "Dexterity": "Destrezza",
    "Dodge": "Schivata",
    "Intelligence": "Intelligenza",
    "Metabolism": "Metabolismo",
    "Motricity": "Motricita'",
    "Omnivore": "Onnivoro",
    "Orrorin Tugenensis": "Orrorin Tugenensis",
    "Preventive Medication": "Medicina Preventiva",
    "Self-Control": "Autocontrollo",
    "Senses": "Sensi",
    "Settlement": "Insediamento",
    "Swim": "Nuoto",
    "Therapeutic Medication": "Medicina Terapeutica",
}

# Italian translations of common English neuron names (curated dictionary).
# Falls back to a generic IT->EN mirror when a name is not in the table.
NAME_IT_DICT = {
    # Ambulation
    "Endurance": "Resistenza",
    "Movement Endurance": "Resistenza al Movimento",
    "Climb Endurance": "Resistenza in Arrampicata",
    "Carrying Endurance": "Resistenza nel Trasporto",
    "Pain Endurance": "Resistenza al Dolore",
    "Ambulation Speed": "Velocita' di Deambulazione",
    "Lower Body Strength": "Forza degli Arti Inferiori",
    "Climb Speed": "Velocita' di Arrampicata",
    "Carrying Speed": "Velocita' nel Trasporto",
    "Pain Threshold": "Soglia del Dolore",
    # Self-Control
    "Tachypsychia": "Tachipsichia",
    "Temporal Distortion": "Distorsione Temporale",
    "Perceptual Time Dilation": "Dilatazione Temporale Percettiva",
    "Process Speed (Predator)": "Velocita' di Reazione (Predatori)",
    "Process Speed (Irascible)": "Velocita' di Reazione (Irascibili)",
    "Process Speed (Wildlife)": "Velocita' di Reazione (Fauna)",
    "Determination": "Determinazione",
    "Released Strength": "Forza Liberata",
    # Attack
    "Fight Response": "Risposta di Combattimento",
    "Counterattack (Predator)": "Contrattacco (Predatori)",
    "Counterattack (Irascible)": "Contrattacco (Irascibili)",
    "Counterattack (Wildlife)": "Contrattacco (Fauna)",
    "Startle Response": "Risposta di Soprassalto",
    "Group Defense": "Difesa di Gruppo",
    # Dodge
    "Flee Response": "Risposta di Fuga",
    "Evasive (Predator)": "Schivata (Predatori)",
    "Evasive (Irascible)": "Schivata (Irascibili)",
    "Evasive (Wildlife)": "Schivata (Fauna)",
    "Withdrawal Reflex": "Riflesso di Ritiro",
    "Ataraxia": "Atarassia",
    "Group Preservation": "Preservazione di Gruppo",
    "Infundibular Pathway": "Via Infundibolare",
    # Communication
    "Babbling Vocalization": "Vocalizzazione Balbettata",
    "Vocalization Volume": "Volume Vocale",
    "Vocalization Range": "Estensione Vocale",
    # Senses
    "Auditory Stimuli": "Stimoli Uditivi",
    "Hearing Acuity": "Acuita' Uditiva",
    "Olfactory Stimuli": "Stimoli Olfattivi",
    "Olfactory Acuity": "Acuita' Olfattiva",
    "Visual Stimuli": "Stimoli Visivi",
    "Visual Acuity": "Acuita' Visiva",
    "Smell Discrimination": "Discriminazione Olfattiva",
    "Sound Discrimination": "Discriminazione Uditiva",
    # Dexterity
    "Hand Dexterity": "Destrezza Manuale",
    "Tool Use": "Uso di Strumenti",
    "Precision Grip": "Presa di Precisione",
    "Stone Knapping": "Scheggiatura della Pietra",
    # Intelligence
    "Cognitive Inhibition": "Inibizione Cognitiva",
    "Mesolimbic Pathway": "Via Mesolimbica",
    "Dopaminergic Pathways": "Vie Dopaminergiche",
    "Life Expectancy": "Aspettativa di Vita",
    "Encephalization": "Encefalizzazione",
    "Hyperfocus": "Iperfocalizzazione",
    "Working Memory": "Memoria di Lavoro",
    "Long-term Memory": "Memoria a Lungo Termine",
    # Therapeutic / Preventive Medication
    "Healing Injury": "Guarigione Ferite",
    "Trauma Relief": "Sollievo dal Trauma",
    "Trauma Relief Efficiency": "Efficienza del Sollievo dal Trauma",
    "Internal Clotting Efficiency": "Efficienza della Coagulazione Interna",
    "Laceration Tolerance": "Tolleranza alle Lacerazioni",
    "Metabolic Detoxification": "Detossificazione Metabolica",
    "Venom Elimination": "Eliminazione del Veleno",
    "Food Poison Elimination": "Eliminazione del Cibo Avvelenato",
    "Detoxification Efficiency": "Efficienza della Detossificazione",
    "Nociceptors Tolerance": "Tolleranza dei Nocicettori",
    "Hydration-Detoxification Efficiency": "Efficienza Idratazione-Detossificazione",
    "Xenobiotic Metabolism": "Metabolismo Xenobiotico",
    # Settlement
    "Sleep - Healing Efficiency": "Sonno - Efficienza Curativa",
    # Swim
    "Aquatic Locomotion": "Locomozione Acquatica",
    "Swim Endurance": "Resistenza al Nuoto",
    "Hydro-Dynamics": "Idrodinamica",
    "Stroke Force": "Forza di Bracciata",
    # Metabolism
    "Metabolic Efficiency": "Efficienza Metabolica",
    "Caloric Storage": "Riserva Calorica",
    # Motricity / Omnivore catch-all (fallback by keyword in heuristic)
    "Carrying": "Trasporto",
}


def slugify(s: str) -> str:
    """ASCII snake_case slug from arbitrary text. Strict regex `^[a-z][a-z0-9_]*$`."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()
    s = re.sub(r"_+", "_", s)
    if not s or not s[0].isalpha():
        s = "x_" + s
    return s


def code_suffix(code: str) -> str:
    """Convert wiki code (e.g. 'CO 01', 'BB AB 14', 'BB SX 01-2') to ID-safe suffix.
    Examples:
      'CO 01'      -> 'co_01'
      'BB AB 14'   -> 'bb_ab_14'
      'BB SX 01-2' -> 'bb_sx_01_2'
    """
    s = code.strip().lower().replace("-", "_")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s


def name_to_label_it(name_en: str, branch: str) -> str:
    """Map English neuron name to Italian Title Case label.
    Falls back: keep latin scientific phrases, otherwise translate via dict
    + heuristic word-by-word mapping.
    """
    if name_en in NAME_IT_DICT:
        return NAME_IT_DICT[name_en]

    # heuristic: split on parenthesis/hyphen and translate each token if known
    out = name_en

    # apply common substring replacements (longer first)
    sorted_keys = sorted(NAME_IT_DICT.keys(), key=len, reverse=True)
    for k in sorted_keys:
        if k in out:
            out = out.replace(k, NAME_IT_DICT[k])

    # if result still all-ASCII English, keep as-is (will be flagged for review)
    return out


def derive_changes(code: str, name: str, has_legacy_label: bool) -> list[str]:
    changes = []
    if " " in code:
        changes.append("snake_case_id")
    if name in NAME_IT_DICT:
        changes.append("italianize_label")
    else:
        changes.append("italianize_label_partial")
    changes.append("add_label_en")
    changes.append("add_branch_slug")
    changes.append("preserve_legacy_code")
    if not has_legacy_label:
        changes.append("add_player_facing_layer")
    return changes


def main() -> int:
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: source CSV not found: {CSV_PATH}", file=sys.stderr)
        return 1

    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    rows = []
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        # skip leading commented lines (#)
        clean = [ln for ln in f if not ln.lstrip().startswith("#")]
    reader = csv.DictReader(clean)
    for r in reader:
        rows.append(r)

    print(f"loaded {len(rows)} rows from CSV", file=sys.stderr)
    if len(rows) != manifest["total_entries"]:
        print(
            f"WARN: row count {len(rows)} != manifest total {manifest['total_entries']}",
            file=sys.stderr,
        )

    # collect duplicates: same branch + same name + same effect_short -> append code suffix
    proposals = []
    seen_id_count: dict[str, int] = {}

    for r in rows:
        code = r["code"].strip()
        branch = r["branch"].strip()
        name = r["name"].strip()
        genetic = r["genetic"].strip()
        effect = r["effect_short"].strip()
        trigger = r.get("unlock_trigger_hint", "").strip()
        sources = r.get("sources", "").strip()

        branch_slug = BRANCH_SLUG.get(branch)
        if not branch_slug:
            print(f"ERROR unknown branch: {branch}", file=sys.stderr)
            return 2

        name_slug = slugify(name)
        suffix = code_suffix(code)

        # canonical id pattern: ancestor_<branch>_<name>_<code_suffix>
        # the code suffix guarantees uniqueness even when name collides
        new_id = f"ancestor_{branch_slug}_{name_slug}_{suffix}"

        # safety - register dup count
        seen_id_count[new_id] = seen_id_count.get(new_id, 0) + 1
        if seen_id_count[new_id] > 1:
            new_id = f"{new_id}_d{seen_id_count[new_id]}"

        label_it = name_to_label_it(name, branch)
        label_en = name  # preserve wiki canonical English

        # description: short, italianized
        if effect:
            desc_it = effect  # keep wiki text; final translation is editorial step
            desc_en = effect
        else:
            desc_it = ""
            desc_en = ""

        changes = derive_changes(code, name, has_legacy_label=False)
        if genetic == "Yes":
            changes.append("preserve_genetic_flag")

        prop = {
            "id_old": code,
            "id_new": new_id,
            "branch": branch_slug,
            "branch_label_it": BRANCH_LABEL_IT[branch],
            "branch_label_en": branch,
            "label_it": label_it,
            "label_en": label_en,
            "description_it": desc_it,
            "description_en": desc_en,
            "trigger_hint": trigger,
            "genetic": genetic == "Yes",
            "legacy_code": code,
            "license": "CC BY-NC-SA 3.0",
            "attribution": "ancestors.fandom.com (Fandom CC BY-NC-SA)",
            "sources": sources,
            "style_guide_changes": changes,
        }
        proposals.append(prop)

    # ---- write YAML manually (no PyYAML dep, fully UTF-8) ----
    today = _dt.date.today().isoformat()
    lines = []
    lines.append("# Ancestors rename proposal v1 — style guide compliance")
    lines.append("# Generated: %s" % today)
    lines.append("# Source CSV : reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv")
    lines.append("# Source SHA : %s" % manifest["csv_sha256"])
    lines.append("# Style guide: docs/core/00E-NAMING_STYLEGUIDE.md")
    lines.append("# License    : CC BY-NC-SA 3.0 (Fandom default)")
    lines.append("# DO NOT modify CSV originals — they are immutable wiki provenance.")
    lines.append("# This file is a PROPOSAL — review before applying.")
    lines.append("")
    lines.append("schema_version: 1")
    lines.append("style_guide_version: \"00E v2026-04-16\"")
    lines.append("source:")
    lines.append("  csv_path: reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv")
    lines.append("  csv_sha256: \"%s\"" % manifest["csv_sha256"])
    lines.append("  manifest: reports/incoming/ancestors/ancestors_neurons_manifest_v07.json")
    lines.append("  total_entries: %d" % manifest["total_entries"])
    lines.append("  scrape_date: \"%s\"" % manifest["scrape_date"])
    lines.append("provenance:")
    lines.append("  site: ancestors.fandom.com")
    lines.append("  method: \"MediaWiki API (action=query, prop=revisions)\"")
    lines.append("  license: \"CC BY-NC-SA 3.0\"")
    lines.append("counts:")
    for b, c in manifest["branches_count"].items():
        lines.append("  %s: %d" % (b.replace(" ", "_"), c))
    lines.append("counts_total: %d" % len(proposals))
    lines.append("genetic_count: %d" % sum(1 for p in proposals if p["genetic"]))
    lines.append("regular_count: %d" % sum(1 for p in proposals if not p["genetic"]))
    lines.append("")
    lines.append("ancestors_rename_proposal:")

    def yqs(s: str) -> str:
        """Quote string safely for YAML scalar value."""
        if s is None:
            return "\"\""
        # escape \ then "
        out = s.replace("\\", "\\\\").replace("\"", "\\\"")
        return "\"%s\"" % out

    for p in proposals:
        lines.append("  - id_old: %s" % yqs(p["id_old"]))
        lines.append("    id_new: %s" % p["id_new"])
        lines.append("    branch: %s" % p["branch"])
        lines.append("    branch_label_it: %s" % yqs(p["branch_label_it"]))
        lines.append("    branch_label_en: %s" % yqs(p["branch_label_en"]))
        lines.append("    label_it: %s" % yqs(p["label_it"]))
        lines.append("    label_en: %s" % yqs(p["label_en"]))
        if p["description_it"]:
            lines.append("    description_it: %s" % yqs(p["description_it"]))
        if p["description_en"]:
            lines.append("    description_en: %s" % yqs(p["description_en"]))
        if p["trigger_hint"]:
            lines.append("    trigger_hint: %s" % yqs(p["trigger_hint"]))
        lines.append("    genetic: %s" % ("true" if p["genetic"] else "false"))
        lines.append("    legacy_code: %s" % yqs(p["legacy_code"]))
        lines.append("    license: %s" % yqs(p["license"]))
        lines.append("    attribution: %s" % yqs(p["attribution"]))
        if p["sources"]:
            lines.append("    sources: %s" % yqs(p["sources"]))
        lines.append("    style_guide_changes: [%s]" % ", ".join(p["style_guide_changes"]))
    lines.append("")

    with open(OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))

    # also report stats
    print("OUTPUT: %s" % OUTPUT_PATH, file=sys.stderr)
    print("entries: %d" % len(proposals), file=sys.stderr)
    # branch counts
    by_branch: dict[str, int] = {}
    untranslated = 0
    for p in proposals:
        by_branch[p["branch"]] = by_branch.get(p["branch"], 0) + 1
        # detect untranslated label_it (still equals label_en after dict pass)
        if p["label_it"] == p["label_en"] and not any(
            ord(c) > 127 for c in p["label_it"]
        ):
            untranslated += 1
    print("branches: %s" % json.dumps(by_branch, indent=2), file=sys.stderr)
    print("untranslated_label_it: %d/%d" % (untranslated, len(proposals)), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
