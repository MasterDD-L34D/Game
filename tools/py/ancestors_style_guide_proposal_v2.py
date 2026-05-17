#!/usr/bin/env python3
"""
Ancestors style guide compliance + rename proposal generator — v2 (Phase 2).

Phase 2 decisions applied (master-dd, 2026-04-27 sera):
- Q1 = b: convention `_<code_suffix>` (es. `pause_reflex_fr_01`), marchio Evo-Tactics, NO `_NN`.
- Q2 = B: tutti 297 entries hanno `label_it` valorizzato (full editorial pass IT).
- Q3 = B: italianize ID base (`ancestor_autocontrollo_*` invece di `ancestor_self_control_*`).

Input  : reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv (297 rows, immutable)
Output : data/core/ancestors/ancestors_rename_proposal_v2.yaml (297 entries, full IT)

Style guide: docs/core/00E-NAMING_STYLEGUIDE.md
- ID: snake_case ASCII (`ancestor_<branch_it>_<name_it>_<code_suffix>`)
- label_it: italiano Title Case (full editorial pass — NO untranslated)
- label_en: english Title Case (preserve wiki canonical)
- description_it/en: short prose
- branch (slug IT): snake_case (es. `autocontrollo`, `medicina_preventiva`)
- legacy_code: codice wiki originale preservato
- genetic: bool (Yes/No -> True/False)
- license: CC BY-NC-SA 3.0 (Fandom)

Usage : python tools/py/ancestors_style_guide_proposal_v2.py
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
    ROOT, "reports", "incoming", "ancestors",
    "ancestors_neurons_dump_v07_wiki_recovery.csv",
)
MANIFEST_PATH = os.path.join(
    ROOT, "reports", "incoming", "ancestors",
    "ancestors_neurons_manifest_v07.json",
)
OUTPUT_PATH = os.path.join(
    ROOT, "data", "core", "ancestors", "ancestors_rename_proposal_v2.yaml"
)

# ------------------------------------------------------------------ branch slug map IT (Q3 italianized)
BRANCH_SLUG_IT = {
    "Ambulation": "deambulazione",
    "Ardipithecus Ramidus": "ardipithecus_ramidus",  # latin scientific name preserved
    "Attack": "attacco",
    "Australopithecus Afarensis": "australopithecus_afarensis",  # latin preserved
    "Communication": "comunicazione",
    "Dexterity": "destrezza",
    "Dodge": "schivata",
    "Intelligence": "intelligenza",
    "Metabolism": "metabolismo",
    "Motricity": "motricita",
    "Omnivore": "onnivoro",
    "Orrorin Tugenensis": "orrorin_tugenensis",  # latin preserved
    "Preventive Medication": "medicina_preventiva",
    "Self-Control": "autocontrollo",
    "Senses": "sensi",
    "Settlement": "insediamento",
    "Swim": "nuoto",
    "Therapeutic Medication": "medicina_terapeutica",
}

BRANCH_LABEL_IT = {
    "Ambulation": "Deambulazione",
    "Ardipithecus Ramidus": "Ardipithecus Ramidus",
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

# ------------------------------------------------------------------ neuron name dictionary (full editorial pass IT)
# Coverage: 154/154 unique names → IT. Style: italiano canonico, voice "fantastico bio-plausibile".
NAME_IT_FULL = {
    # === Ambulation (resistance / movement) ===
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

    # === Self-Control ===
    "Tachypsychia": "Tachipsichia",
    "Temporal Distortion": "Distorsione Temporale",
    "Perceptual Time Dilation": "Dilatazione Temporale Percettiva",
    "Internal Process Speed": "Velocita' di Elaborazione Interna",
    "Determination": "Determinazione",
    "Released Strength": "Forza Liberata",
    "Acute Stress Response": "Risposta Acuta allo Stress",
    "Locus of Control": "Locus di Controllo",
    "Autotelic Personality": "Personalita' Autotelica",

    # === Attack ===
    "Fight Response": "Risposta di Combattimento",
    "Counter Maneuver": "Contromanovra",
    "Startle Response": "Risposta di Soprassalto",
    "Group Defense": "Difesa di Gruppo",

    # === Dodge ===
    "Flee Response": "Risposta di Fuga",
    "Evasive Action": "Azione Evasiva",
    "Withdrawal Reflex": "Riflesso di Ritiro",
    "Ataraxia": "Atarassia",
    "Group Preservation": "Preservazione di Gruppo",
    "Infundibular Pathway": "Via Infundibolare",

    # === Communication ===
    "Kinesics": "Cinesica",
    "Self Empowerment": "Auto-Rafforzamento",
    "Body Language": "Linguaggio del Corpo",
    "Group Unity": "Unita' del Gruppo",
    "Mirror Neuron": "Neurone Specchio",
    "Imitation": "Imitazione",
    "Attachment Need": "Bisogno di Attaccamento",
    "Deimatic Behavior": "Comportamento Deimatico",
    "Induced Fear": "Paura Indotta",
    "Danger Perception": "Percezione del Pericolo",
    "Dominant Species": "Specie Dominante",
    "Social Confidence": "Sicurezza Sociale",
    "Willpower": "Forza di Volonta'",

    # === Senses ===
    "Olfaction": "Olfatto",
    "Odorant Identification": "Identificazione Odoranti",
    "Odorant Chemotopy": "Chemotopia Odoranti",
    "Threat Chemotopy": "Chemotopia delle Minacce",
    "Threat Localization": "Localizzazione delle Minacce",
    "Olfactory Memory": "Memoria Olfattiva",
    "Chemoreceptor Acuity": "Acuita' Chemorecettiva",
    "Sound Detection": "Rilevamento Sonoro",
    "Sound Awareness": "Consapevolezza Sonora",
    "Sound Localization": "Localizzazione Sonora",
    "Sound Localization Speed": "Velocita' di Localizzazione Sonora",
    "Interaural Time Difference": "Differenza Temporale Interaurale",
    "Echoic Memory": "Memoria Ecoica",
    "Sensory Transduction Speed": "Velocita' di Trasduzione Sensoriale",
    "Iconic Memory": "Memoria Iconica",
    "Form Recognition": "Riconoscimento delle Forme",
    "Spatial Perception": "Percezione Spaziale",
    "Wayfinding": "Orientamento nello Spazio",
    "Orientation": "Orientamento",
    "Perception": "Percezione",
    "Sensory Memory": "Memoria Sensoriale",
    "Memory": "Memoria",
    "Long Term Memory": "Memoria a Lungo Termine",
    "Vestibular System": "Sistema Vestibolare",
    "Equilibrioception": "Equilibriocezione",
    "Postural Balance": "Equilibrio Posturale",
    "Stability Control": "Controllo della Stabilita'",
    "Medial-Lateral Stability": "Stabilita' Medio-Laterale",
    "Orthostasis & Senses": "Ortostasi e Sensi",
    "Contextual Orthostatis": "Ortostasi Contestuale",
    "Proprioception": "Propriocezione",
    "Proprioceptor Efficiency": "Efficienza dei Propriocettori",
    "Kinesthetic Sense": "Senso Cinestesico",

    # === Dexterity ===
    "Controlling Strength": "Forza di Controllo",
    "Manual Dexterity": "Destrezza Manuale",
    "Fine Motor Skill": "Abilita' Motoria Fine",
    "Gross Motor Skill": "Abilita' Motoria Grossolana",
    "Motor Skill": "Abilita' Motoria",
    "Grasp Control": "Controllo della Presa",
    "Item Manipulation": "Manipolazione Oggetti",
    "Handling": "Manipolazione",
    "Stripping": "Spogliazione",
    "Building": "Costruzione",
    "Building Efficiency": "Efficienza di Costruzione",
    "Thrusting Aim": "Mira di Affondo",
    "True Aim": "Mira Vera",
    "True Grip": "Presa Vera",
    "Carrying Ability": "Capacita' di Trasporto",
    "Applied Force": "Forza Applicata",
    "Upper Body Strength": "Forza degli Arti Superiori",
    "Stroke Force": "Forza di Bracciata",
    "Bipedalism": "Bipedismo",
    "Speed": "Velocita'",

    # === Intelligence (Ardipithecus + Australopithecus + Orrorin) ===
    "Cognitive Inhibition": "Inibizione Cognitiva",
    "Cognitive Control": "Controllo Cognitivo",
    "Inhibitory Control": "Controllo Inibitorio",
    "Attentional Control": "Controllo Attentivo",
    "Mesolimbic Pathway": "Via Mesolimbica",
    "Mesocortical Pathway": "Via Mesocorticale",
    "Nigrostriatal Pathway": "Via Nigrostriatale",
    "Dopaminergic Pathways": "Vie Dopaminergiche",
    "Life Expectancy": "Aspettativa di Vita",
    "Encephalization": "Encefalizzazione",
    "Hyperfocus": "Iperfocalizzazione",
    "Evaluation Speed": "Velocita' di Valutazione",

    # === Therapeutic / Preventive Medication ===
    "Healing Injury": "Guarigione delle Ferite",
    "Trauma Relief": "Sollievo dal Trauma",
    "Trauma Relief Efficiency": "Efficienza del Sollievo dal Trauma",
    "Trauma Prevention": "Prevenzione del Trauma",
    "Trauma Resistance": "Resistenza al Trauma",
    "Internal Clotting Efficiency": "Efficienza della Coagulazione Interna",
    "External Clotting Efficiency": "Efficienza della Coagulazione Esterna",
    "Laceration Tolerance": "Tolleranza alle Lacerazioni",
    "Laceration Prevention": "Prevenzione delle Lacerazioni",
    "Bleeding Resistance": "Resistenza al Sanguinamento",
    "Metabolic Detoxification": "Detossificazione Metabolica",
    "Detoxification Efficiency": "Efficienza della Detossificazione",
    "Hydration-Detoxification Efficiency": "Efficienza Idratazione-Detossificazione",
    "Xenobiotic Metabolism": "Metabolismo Xenobiotico",
    "Xenobiotic Resistance": "Resistenza Xenobiotica",
    "Venom Elimination": "Eliminazione del Veleno",
    "Venom Resistance": "Resistenza al Veleno",
    "Venom Tolerance": "Tolleranza al Veleno",
    "Toxin Immunity": "Immunita' alle Tossine",
    "Food Poison Elimination": "Eliminazione del Cibo Avvelenato",
    "Food Poisoning Resistance": "Resistenza all'Avvelenamento da Cibo",
    "Food Poisoning Tolerance": "Tolleranza all'Avvelenamento da Cibo",
    "Nociceptors Tolerance": "Tolleranza dei Nocicettori",
    "Endorphins Efficiency": "Efficienza delle Endorfine",
    "Analgesia": "Analgesia",
    "Analeptic Ability": "Abilita' Analettica",
    "Prophylactic Ability": "Abilita' Profilattica",
    "Vitamin K Efficiency": "Efficienza Vitamina K",
    "Anabolism": "Anabolismo",
    "Anabolism-Water": "Anabolismo Idrico",

    # === Settlement / Sleep ===
    "Sleep - Healing Efficiency": "Sonno - Efficienza Curativa",
    "Sleep Recovery": "Recupero del Sonno",
    "Deep Sleep": "Sonno Profondo",
    "Well Rested Boost": "Bonus Ben Riposato",

    # === Swim ===
    "Aquatic Locomotion": "Locomozione Acquatica",
    "Swim Endurance": "Resistenza al Nuoto",
    "Hydro-Dynamics": "Idrodinamica",

    # === Metabolism / Omnivore ===
    "Metabolic Efficiency": "Efficienza Metabolica",
    "Nutrient Absorption": "Assorbimento dei Nutrienti",
    "Omnivorous": "Onnivoro",
    "Eumycota Food Acclimatization": "Acclimatazione ai Funghi (Eumycota)",
    "Mammal Food Acclimatization": "Acclimatazione al Cibo dei Mammiferi",
    "Oviparous Food Acclimatization": "Acclimatazione al Cibo Oviparo",
    "Zygote Food Acclimatization": "Acclimatazione al Cibo Zigotico",

    # === Thermo-regulation ===
    "Thermo Regulation": "Termoregolazione",
    "Thermoreceptors Efficiency": "Efficienza dei Termocettori",
    "Preoptic Area Efficiency": "Efficienza dell'Area Preottica",
    "Hypothalamic Nucleus Efficiency": "Efficienza del Nucleo Ipotalamico",
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
    """Convert wiki code (e.g. 'CO 01', 'BB AB 14', 'BB SX 01-2') to ID-safe suffix."""
    s = code.strip().lower().replace("-", "_")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s


def name_to_label_it(name_en: str) -> str:
    """Map English neuron name to Italian Title Case label.
    Full editorial pass — every name should resolve via NAME_IT_FULL or sub-token replace.
    """
    if name_en in NAME_IT_FULL:
        return NAME_IT_FULL[name_en]

    # Composite name: try substring replacement (longest first)
    out = name_en
    sorted_keys = sorted(NAME_IT_FULL.keys(), key=len, reverse=True)
    replaced_any = False
    for k in sorted_keys:
        if k in out:
            out = out.replace(k, NAME_IT_FULL[k])
            replaced_any = True

    if replaced_any:
        return out

    # NOT REACHED if dictionary is complete; flag visibly for user editorial review
    return f"[TODO_IT] {name_en}"


def name_to_slug_it(name_en: str) -> str:
    """ASCII snake_case slug from Italian translation (Q3: italianize ID base)."""
    label_it = name_to_label_it(name_en)
    # strip [TODO_IT] flag for slug (use EN slug fallback)
    if label_it.startswith("[TODO_IT]"):
        return slugify(name_en)
    return slugify(label_it)


def derive_changes(code: str, name: str, has_legacy_label: bool) -> list[str]:
    changes = ["snake_case_id", "italianize_label_full", "italianize_id_base",
               "add_label_en", "add_branch_slug_it", "preserve_legacy_code"]
    if " " in code:
        changes.append("normalize_code_spaces")
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
        clean = [ln for ln in f if not ln.lstrip().startswith("#")]
    reader = csv.DictReader(clean)
    for r in reader:
        rows.append(r)

    print(f"loaded {len(rows)} rows from CSV", file=sys.stderr)
    if len(rows) != manifest["total_entries"]:
        print(f"WARN: row count {len(rows)} != manifest total {manifest['total_entries']}",
              file=sys.stderr)

    proposals = []
    seen_id_count: dict[str, int] = {}
    untranslated_names: set = set()

    for r in rows:
        code = r["code"].strip()
        branch = r["branch"].strip()
        name = r["name"].strip()
        genetic = r["genetic"].strip()
        effect = r["effect_short"].strip()
        trigger = r.get("unlock_trigger_hint", "").strip()
        sources = r.get("sources", "").strip()

        branch_slug_it = BRANCH_SLUG_IT.get(branch)
        if not branch_slug_it:
            print(f"ERROR unknown branch: {branch}", file=sys.stderr)
            return 2

        # Q3 italianize ID base: name slug from IT label, branch slug IT
        name_slug_it = name_to_slug_it(name)
        suffix = code_suffix(code)

        # Canonical id: ancestor_<branch_it>_<name_it>_<code_suffix>
        new_id = f"ancestor_{branch_slug_it}_{name_slug_it}_{suffix}"

        # safety - register dup count
        seen_id_count[new_id] = seen_id_count.get(new_id, 0) + 1
        if seen_id_count[new_id] > 1:
            new_id = f"{new_id}_d{seen_id_count[new_id]}"

        label_it = name_to_label_it(name)
        if label_it.startswith("[TODO_IT]"):
            untranslated_names.add(name)
        label_en = name

        if effect:
            desc_it = effect
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
            "branch": branch_slug_it,
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

    if untranslated_names:
        print(f"\nWARN: {len(untranslated_names)} untranslated names:", file=sys.stderr)
        for n in sorted(untranslated_names):
            print(f"  - {n}", file=sys.stderr)

    # ---- write YAML manually (UTF-8 explicit) ----
    today = _dt.date.today().isoformat()
    lines = []
    lines.append("# Ancestors rename proposal v2 — Phase 2 apply (marchio Evo-Tactics)")
    lines.append("# Generated: %s" % today)
    lines.append("# Source CSV : reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv")
    lines.append("# Source SHA : %s" % manifest["csv_sha256"])
    lines.append("# Style guide: docs/core/00E-NAMING_STYLEGUIDE.md")
    lines.append("# License    : CC BY-NC-SA 3.0 (Fandom default)")
    lines.append("# Phase 2 decisions (master-dd 2026-04-27 sera):")
    lines.append("#   Q1 = b: convention `_<code_suffix>` (NO _NN) — marchio Evo-Tactics")
    lines.append("#   Q2 = B: full editorial pass IT (tutti i 297 hanno label_it)")
    lines.append("#   Q3 = B: italianize ID base (ancestor_autocontrollo_*)")
    lines.append("# DO NOT modify CSV originals — they are immutable wiki provenance.")
    lines.append("")
    lines.append("schema_version: 2")
    lines.append("style_guide_version: \"00E v2026-04-16\"")
    lines.append("phase: 2")
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
    lines.append("untranslated_count: %d" % len(untranslated_names))
    lines.append("")
    lines.append("ancestors_rename_proposal:")

    def yqs(s: str) -> str:
        if s is None:
            return "\"\""
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

    print("OUTPUT: %s" % OUTPUT_PATH, file=sys.stderr)
    print("entries: %d" % len(proposals), file=sys.stderr)
    by_branch: dict[str, int] = {}
    for p in proposals:
        by_branch[p["branch"]] = by_branch.get(p["branch"], 0) + 1
    print("branches: %s" % json.dumps(by_branch, indent=2), file=sys.stderr)
    print("untranslated_label_it: %d/%d" % (len(untranslated_names), len(proposals)), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
