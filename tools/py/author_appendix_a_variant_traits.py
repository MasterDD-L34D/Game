#!/usr/bin/env python3
"""author_appendix_a_variant_traits.py -- complete the 9 appendix-A `*_2` traits.

The 9 `*_2` files were empty external-import skeletons (data_origin appendix_a_canvas,
all `da_definire`). The canvas source is not in the repo. Per master-dd: author them as
DISTINCT variant-traits, grounded in real biology via deep-research (workflow wf_bc250b40:
8 primary/secondary sources -- Royal Society, NCBI/PMC, J.Exp.Biology, Wiley, Pack-hunter).
Each `_2` becomes a distinct variant of its base family. Claude-authored prose -> flagged
`design_stub: true` (pending master-dd ratify, like the lore HITL gate).

Writes the served DB file + index.json.traits entry + glossary.json.traits entry.
Run: python tools/py/author_appendix_a_variant_traits.py [--write]
"""
import argparse
import json
import os

# id base (the _2 is appended), category dir, famiglia, slot_profile (core/comp),
# label_it, label_en, desc_it (ASCII-safe), desc_en, cite.
V = [
    dict(base="artigli_sette_vie", cat="locomotorio", fam="Locomotorio/Prensile",
         core="locomotorio", comp="prensile",
         lit="Artigli a Sette Vie -- Aggancio-Trazione", len_="Seven-Way Talons -- Hook-and-Pull",
         dit="Variante da scavo aggancio-e-trazione: artigli ottimizzati per agganciare e tirare il substrato (profilo retrattore-spalla + flessore-gomito), distinta dalla presa stabile della variante base.",
         den="Hook-and-pull digging variant: talons tuned to hook and haul the substrate (shoulder-retractor + elbow-flexor profile), distinct from the base steady-grip.",
         cite="Wiley J.Anat. joa.13815 (forelimb-digging biomechanics, 3 archetypes)"),
    dict(base="coda_frusta_cinetica", cat="locomotorio", fam="Locomotorio/Difensivo",
         core="locomotorio", comp="difensivo",
         lit="Coda Frusta Cinetica -- Trabucco", len_="Kinetic Whip-Tail -- Trebuchet",
         dit="Variante a trabucco: la coda agisce come catapulta a contrappeso (vertebre anteriori rigide, posteriori flessibili) per un colpo d'area che stordisce piu' bersagli vicini.",
         den="Trebuchet variant: the tail acts as a counterweight catapult (stiff anterior / flexible posterior vertebrae) for an area strike that stuns several nearby targets.",
         cite="Royal Society RSOS 231473 + NCBI PMC3707734 (thresher-shark tail-whip)"),
    dict(base="criostasi_adattiva", cat="metabolico", fam="Metabolico/Difensivo",
         core="metabolico", comp="difensivo",
         lit="Criostasi Adattiva -- Torpore Controllato", len_="Adaptive Cryostasis -- Controlled Torpor",
         dit="Variante a torpore controllato: ingresso reversibile in stasi metabolica per sopravvivere al gelo estremo, riducendo il consumo e proteggendo i tessuti.",
         den="Controlled-torpor variant: reversible entry into metabolic stasis to survive extreme cold, cutting expenditure and protecting tissue.",
         cite="general cryoprotection / torpor physiology (research angle: physiology and buoyancy)"),
    dict(base="focus_frazionato", cat="strategia", fam="Strategico/Psionico",
         core="strategia", comp="psionico",
         lit="Focus Frazionato -- Attenzione Divisa", len_="Fractional Focus -- Divided Attention",
         dit="Variante ad attenzione divisa: tracciamento simultaneo di due bersagli separati (un canale all'attacco, uno alla difesa), come il camaleonte (tracking monoculare doppio) e i cefalopodi (attenzione visiva lateralizzata).",
         den="Divided-attention variant: simultaneous tracking of two separate targets (one channel offence, one defence), like chameleon dual monocular tracking and cephalopod lateralized visual attention.",
         cite="JEB chameleon eye-movements 218/13 + NCBI PMC10664291 (cephalopod lateralized attention)"),
    dict(base="risonanza_di_branco", cat="supporto", fam="Supporto/Coordinativo",
         core="supporto", comp="coordinazione",
         lit="Risonanza di Branco -- Segnalazione Sincronizzata", len_="Pack Resonance -- Synchronized Signaling",
         dit="Variante a segnalazione sincronizzata: emissione coordinata di segnali che allineano il gruppo, aumentando la coesione e la reattivita' collettiva.",
         den="Synchronized-signaling variant: coordinated signal emission that aligns the group, raising cohesion and collective responsiveness.",
         cite="Pack-hunter collective coordination (Wikipedia, secondary)"),
    dict(base="sacche_galleggianti_ascensoriali", cat="idrostatico", fam="Idrostatico/Locomotorio",
         core="idrostatico", comp="locomotorio",
         lit="Sacche Galleggianti -- Controllo Assetto", len_="Buoyancy Sacs -- Trim Control",
         dit="Variante a controllo d'assetto: regolazione fine del galleggiamento via sacche di gas per gestire quota e stabilita', analoga a vescica natatoria / pneumatoforo.",
         den="Trim-control variant: fine buoyancy regulation via gas sacs to manage altitude and stability, analogous to a swim bladder / pneumatophore.",
         cite="gas-sac buoyancy physiology (research angle: physiology and buoyancy)"),
    dict(base="scheletro_idro_regolante", cat="strutturale", fam="Strutturale/Omeostatico",
         core="strutturale", comp="omeostatico",
         lit="Scheletro Idro-Regolante -- Idrostato Muscolare", len_="Hydro-Regulating Skeleton -- Muscular Hydrostat",
         dit="Variante a idrostato muscolare: struttura priva di scheletro rigido che si irrigidisce o deforma via co-contrazione multiassiale dei muscoli antagonisti, regolando il bilancio idrico interno.",
         den="Muscular-hydrostat variant: a skeleton-less structure that stiffens or deforms via multi-axial co-contraction of antagonistic muscles, regulating internal water balance.",
         cite="JEB jeb245295 (cephalopod muscular hydrostats)"),
    dict(base="struttura_elastica_amorfa", cat="strutturale", fam="Strutturale/Locomotorio",
         core="strutturale", comp="locomotorio",
         lit="Struttura Elastica Amorfa -- Fibre Super-Coiled", len_="Amorphous Elastic Structure -- Super-Coiled Fibers",
         dit="Variante a fibre super-coiled: matrice connettivale con fibre elastiche super-avvolte per accumulo passivo di energia e controllo della rigidita', assorbendo gli impatti.",
         den="Super-coiled-fiber variant: a connective matrix with super-coiled elastic fibers for passive energy storage and stiffness control, absorbing impacts.",
         cite="JEB jeb245295 (cephalopod super-coiled elastic fibers)"),
    dict(base="tattiche_di_branco", cat="strategia", fam="Strategico/Tattico",
         core="strategia", comp="coordinazione",
         lit="Tattiche di Branco -- Ruoli Specializzati", len_="Pack Tactics -- Specialized Roles",
         dit="Variante a ruoli specializzati: il gruppo assume ruoli distinti (spingitore, bloccante, inseguitore, imboscatore) per la caccia coordinata, come leoni (centri/ali), delfini (driver/barriera) e scimpanze' Tai.",
         den="Specialized-roles variant: the group takes distinct roles (driver, blocker, chaser, ambusher) for coordinated hunting, like lions (centres/wings), dolphins (driver/barrier) and Tai chimps.",
         cite="Pack-hunter role specialization (Wikipedia, secondary)"),
]


def db_entry(v, tid):
    return {
        "schema_version": "2.0",
        "id": tid,
        "label": f"i18n:traits.{tid}.label",
        "famiglia_tipologia": v["fam"],
        "fattore_mantenimento_energetico": "Basso (Passivo)",
        "tier": "T1",
        "slot_profile": {"core": v["core"], "complementare": v["comp"]},
        "slot": [],
        "sinergie": [],
        "conflitti": [],
        "mutazione_indotta": f"i18n:traits.{tid}.mutazione_indotta",
        "uso_funzione": f"i18n:traits.{tid}.uso_funzione",
        "spinta_selettiva": f"i18n:traits.{tid}.spinta_selettiva",
        "debolezza": f"i18n:traits.{tid}.debolezza",
        "data_origin": "appendix_a_variant_deep_research_grounded",
        "completion_flags": {"design_stub": True},
    }


def index_entry(v, tid):
    return {
        "schema_version": "2.0",
        "conflitti": [],
        "debolezza": f"i18n:traits.{tid}.debolezza",
        "famiglia_tipologia": v["fam"],
        "fattore_mantenimento_energetico": "Basso (Passivo)",
        "id": tid,
        "label": v["lit"],
        "mutazione_indotta": f"i18n:traits.{tid}.mutazione_indotta",
        "slot": [],
        "sinergie": [],
        "slot_profile": {"core": v["core"], "complementare": v["comp"]},
        "spinta_selettiva": f"i18n:traits.{tid}.spinta_selettiva",
        "tier": "T1",
        "uso_funzione": f"i18n:traits.{tid}.uso_funzione",
        # Keep parity with db_entry: per-file JSONs carry these fields and
        # index.json must mirror them so validators / completion-dashboards agree.
        "data_origin": "appendix_a_variant_deep_research_grounded",
        "completion_flags": {"design_stub": True},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    idx_p, gl_p = "data/traits/index.json", "data/core/traits/glossary.json"
    idx = json.load(open(idx_p, encoding="utf-8"))
    gl = json.load(open(gl_p, encoding="utf-8"))
    for v in V:
        tid = v["base"] + "_2"
        dbp = os.path.join("data/traits", v["cat"], tid + ".json")
        if a.write:
            with open(dbp, "w", encoding="utf-8", newline="") as f:
                json.dump(db_entry(v, tid), f, ensure_ascii=False, indent=2)
                f.write("\n")
            idx["traits"][tid] = index_entry(v, tid)
            gl["traits"][tid] = {
                "label_it": v["lit"], "label_en": v["len_"],
                "description_it": v["dit"] + " Rif. " + v["cite"] + ".",
                "description_en": v["den"] + " Ref. " + v["cite"] + ".",
            }
        print(("wrote " if a.write else "[dry] ") + dbp)
    if a.write:
        json.dump(idx, open(idx_p, "w", encoding="utf-8", newline=""), ensure_ascii=False, indent=2)
        open(idx_p, "a", encoding="utf-8", newline="").write("\n")
        json.dump(gl, open(gl_p, "w", encoding="utf-8", newline=""), ensure_ascii=False, indent=2)
        open(gl_p, "a", encoding="utf-8", newline="").write("\n")
        print("updated index.json + glossary.json (+9 each)")
    print(f"{'wrote' if a.write else 'would write'} {len(V)} variant traits")


if __name__ == "__main__":
    main()
