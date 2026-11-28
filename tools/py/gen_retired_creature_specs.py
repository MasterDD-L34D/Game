#!/usr/bin/env python3
"""gen_retired_creature_specs.py -- one-shot salvage scaffolder (item 2a).

Emits honest-stub gameplay-spec YAMLs for the 13 ratified retired creatures into
packs/evo_tactics_pack/data/species/<biome>/<id>.yaml, mirroring the resonant-claw-hunter
template. Identity (id/name/biome) = ratified table; trait kit = recovered from the stale
species_affinity.json (ground-truth, NOT fabricated); the heuristic fields (vc / spawn /
telemetry / hazards) are HONEST STUBS marked `design_stub: true` -- master-dd / the calib
pass refines them. Lore is NOT authored here (HITL via codex_aliena_lore_gen). The
promote-into-catalog step is the owner-gated ETL (salvage item 4); these files are inert
source until then.

Run: python tools/py/gen_retired_creature_specs.py [--write]
"""
import argparse
import os

# id, display_name, biome (CANONICAL, 4 remapped from non-canon), role_trofico, morphotype,
# resistance_archetype, danger (1-5), sentient (T3+), functional_tags, jobs_bias,
# required_capabilities, core_kit, synergy_kit (signature traits from `other`).
CREATURES = [
    dict(id="heliopteryx_radians", name="Aliradiante solare", biome="savana",
         role="predatore_secondario", morph="alato_veliero", archetype="adattivo", danger=2,
         sentient=False, tags=["volatore_sociale", "supporto_radiante"], jobs=["support", "skirmisher"],
         caps=["flight", "aura_support"],
         core=["adattamento_volo", "aura_scudo_radianza", "ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["ali_solari_fotoni", "empatia_coordinativa", "risonanza_di_branco"]),
    dict(id="pyroflagellum_meteoriticum", name="Flagello igneo", biome="abisso_vulcanico",
         role="predatore_terziario", morph="alato_corazzato", archetype="strutturale", danger=4,
         sentient=False, tags=["bruiser_volante", "incendiario"], jobs=["vanguard", "bruiser"],
         caps=["flight", "fire_lash"],
         core=["adattamento_volo", "frusta_fiammeggiante", "mantello_meteoritico", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["armatura_pietra_planare", "artigli_sette_vie", "carapace_fase_variabile"]),
    dict(id="sonovespera_lamentans", name="Vespero sonoro", biome="canyons_risonanti",
         role="predatore_secondario", morph="alato_spettrale", archetype="adattivo", danger=3,
         sentient=False, tags=["volatore_risonante", "controller_sonoro"], jobs=["controller", "skirmisher"],
         caps=["flight", "tremorsense", "sonic_pulse"],
         core=["adattamento_volo", "ali_fono_risonanti", "risonanza_di_branco", "spore_psichiche_silenziate", "metabolismo_sostentato"],
         synergy=["eco_sismico", "intangibilita_parziale", "voce_spettrale"]),
    dict(id="tellurmordax_phasicus", name="Tellumordace di fase", biome="badlands",
         role="predatore_terziario", morph="scavatore_corazzato", archetype="strutturale", danger=4,
         sentient=False, tags=["scavatore", "imboscata_corazzata"], jobs=["bruiser", "vanguard"],
         caps=["burrow", "ambush", "phase_shift"],
         core=["fisiologia_predatoria", "ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["carapace_fase_variabile", "coda_frusta_cinetica", "armatura_pietra_planare", "scheletro_idro_regolante"]),
    dict(id="auroserpens_photonicus", name="Auroserpe", biome="canopia_ionica",
         role="predatore_secondario", morph="serpentiforme_alato", archetype="adattivo", danger=3,
         sentient=True, tags=["volatore_sociale", "coordinatore_empatico"], jobs=["support", "controller"],
         caps=["flight", "empathic_link"],
         core=["adattamento_volo", "ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["ali_solari_fotoni", "empatia_coordinativa", "ghiandole_nettare_memetico", "risonanza_di_branco"]),
    dict(id="lithoconstructus_inhibens", name="Litoautoma inibitore", biome="caverna",
         role="guardiano_artificiale", morph="costrutto_corazzato", archetype="strutturale", danger=4,
         sentient=False, tags=["costrutto", "soppressore_di_campo"], jobs=["tank", "controller"],
         caps=["field_suppression", "weak_point"],
         core=["armatura_pietra_planare", "origine_artificiale", "metabolismo_sostentato", "ciclo_vitale_anomalo"],
         synergy=["carapace_fase_variabile", "matrice_antimagia", "nuclei_di_controllo"]),
    dict(id="amorphovenator_magneticus", name="Sondatore amorfo", biome="reef_luminescente",
         role="predatore_secondario", morph="amorfo", archetype="adattivo", danger=2,
         sentient=False, tags=["predatore_amorfo", "scout_magnetico"], jobs=["scout", "skirmisher"],
         caps=["amorphous", "magnetoreception"],
         core=["filamenti_digestivi_compattanti", "olfatto_risonanza_magnetica", "struttura_elastica_amorfa"],
         synergy=["lamelle_termoforetiche", "scheletro_idro_regolante"]),
    dict(id="rotabrachium_ferox", name="Rotabraccio", biome="abisso_vulcanico",
         role="predatore_apex", morph="multi_arto_rotante", archetype="strutturale", danger=5,
         sentient=False, tags=["percussore", "multi_arto"], jobs=["bruiser", "vanguard"],
         caps=["spin_assault", "fire_lash"],
         core=["nucleo_ovomotore_rotante", "frusta_fiammeggiante", "mantello_meteoritico", "metabolismo_attivo", "respirazione_biologica", "focus_frazionato"],
         synergy=["artigli_sette_vie", "coda_frusta_cinetica", "empatia_coordinativa"]),
    dict(id="aerostatocyon_altivolans", name="Aerostato ascendente", biome="stratosfera_tempestosa",
         role="filtratore_aereo", morph="fluttuatore", archetype="adattivo", danger=2,
         sentient=False, tags=["fluttuatore_alta_quota", "osservatore"], jobs=["scout", "support"],
         caps=["levitation", "altitude_climb"],
         core=["sacche_galleggianti_ascensoriali", "occhi_cristallo_modulare", "olfatto_risonanza_magnetica", "focus_frazionato"],
         synergy=["criostasi_adattiva", "eco_interno_riflesso"]),
    dict(id="filtrophagus_custos", name="Filtrofago sentinella", biome="palude",
         role="spazzino_sentinella", morph="bipede_filtratore", archetype="adattivo", danger=3,
         sentient=False, tags=["spazzino", "sentinella_difensiva"], jobs=["tank", "support"],
         caps=["filter_feeding", "status_cleanse"],
         core=["ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["filtri_bioattivi", "membrane_osmotiche", "proboscide_polifaga", "carapace_fase_variabile"]),
    dict(id="cryptopennatus_psionicus", name="Esploratore di chioma", biome="canopia_ionica",
         role="esploratore", morph="aliante_mimetico", archetype="adattivo", danger=2,
         sentient=True, tags=["aliante", "scout_psionico"], jobs=["scout", "skirmisher"],
         caps=["glide", "camouflage", "psionic_silence"],
         core=["mimetismo_cromatico_passivo", "sacche_galleggianti_ascensoriali", "struttura_elastica_amorfa", "focus_frazionato", "pathfinder"],
         synergy=["ali_fono_risonanti", "spore_psichiche_silenziate", "occhi_cristallo_modulare"]),
    dict(id="illusiopardus_psionicus", name="Mascheraio illusorio", biome="foresta_temperata",
         role="predatore_terziario", morph="felino_psionico", archetype="adattivo", danger=4,
         sentient=True, tags=["illusionista", "duellante_psionico"], jobs=["skirmisher", "controller"],
         caps=["illusion", "psionic_duel"],
         core=["ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["artigli_psionici", "maschera_illusoria", "tessuti_adattivi", "empatia_coordinativa"]),
    dict(id="radiciforma_ancorans", name="Ancora radicale", biome="foresta_miceliale",
         role="flora_ancorata", morph="flora_radicata", archetype="strutturale", danger=3,
         sentient=False, tags=["flora_ancorata", "broadcaster_difensivo"], jobs=["tank", "support"],
         caps=["anchor", "aura_broadcast"],
         core=["ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"],
         synergy=["corteccia_memetica", "pigmenti_aurorali", "radici_ancora_planare", "reti_capillari_radici", "armatura_pietra_planare"]),
]

# danger 1-5 -> threat_tier / rarity (honest mapping; refine in calib).
THREAT = {1: "T1", 2: "T1", 3: "T2", 4: "T2", 5: "T3"}
RARITY = {1: "R1", 2: "R2", 3: "R2", 4: "R3", 5: "R3"}
# Map heuristic role words onto the 7 canonical jobs (jobs.yaml): skirmisher, vanguard,
# warden, artificer, invoker, ranger, harvester. The canon-consistency gate enforces this.
JOB_MAP = {
    "skirmisher": "skirmisher", "vanguard": "vanguard", "bruiser": "vanguard",
    "tank": "warden", "support": "warden", "controller": "invoker",
    "scout": "ranger", "harvester": "harvester",
}


def canonical_jobs(jobs):
    out = []
    for j in jobs:
        cj = JOB_MAP.get(j, j)
        if cj not in out:
            out.append(cj)
    return out


def _load_glossary_ids():
    import json
    gl = json.load(open("data/core/traits/glossary.json", encoding="utf-8"))
    if isinstance(gl, dict) and "traits" in gl and isinstance(gl["traits"], dict):
        return set(gl["traits"].keys())
    return set(gl.keys()) if isinstance(gl, dict) else set()


GLOSSARY_IDS = _load_glossary_ids()


def gameplay_kit(c):
    """The glossary-covered kit. Universal physiology (ciclo_vitale_*/metabolismo_*/
    respirazione_biologica/...) and any trait without a glossary entry are dropped --
    every species trait_id ref MUST have a glossary entry (test-enforced). The signature
    gameplay traits (the recovered `synergy` + `core` minus physiology) become the kit;
    `core` = glossary-covered signature, deduped, order-preserving."""
    seen = []
    for t in list(c["core"]) + list(c["synergy"]):
        if t in GLOSSARY_IDS and t not in seen:
            seen.append(t)
    return seen


def yaml_list(items, indent):
    pad = " " * indent
    return "\n".join(f"{pad}- {it}" for it in items)


def spec_yaml(c):
    sentient = "true" if c["sentient"] else "false"
    kit = gameplay_kit(c)
    suggested = kit[:3]
    core_block = yaml_list(kit, 2)
    synergy_block = yaml_list([], 2)
    tags_block = yaml_list(c["tags"], 0)
    jobs = canonical_jobs(c["jobs"])
    jobs_block = yaml_list(jobs, 0)
    jobs_block2 = yaml_list(jobs, 2)
    caps_block = yaml_list(c["caps"], 2)
    sugg_block = yaml_list(suggested, 2)
    return f"""id: {c['id']}
schema_version: '1.7'
resistance_archetype: {c['archetype']}
display_name: {c['name']}
biomes:
- {c['biome']}
role_trofico: {c['role']}
functional_tags:
{tags_block}
flags:
  apex: {"true" if c["danger"] >= 5 else "false"}
  keystone: false
  sentient: {sentient}
  bridge: false
  threat: true
  event: false
balance:
  rarity: {RARITY[c['danger']]}
  threat_tier: {THREAT[c['danger']]}
  encounter_role: threat
playable_unit: false
morphotype: {c['morph']}
vc:
  aggro: 0.5
  risk: 0.5
  cohesion: 0.5
  setup: 0.5
  explore: 0.5
  tilt: 0.5
spawn_rules:
  orario:
  - diurno
  meteo:
  - sereno
  densita: low
environment_affinity:
  biome_class: {c['biome']}
  koppen: []
  hazards_expected: []
  multibiome: []
hazards_expected: []
derived_from_environment:
  suggested_traits:
{sugg_block}
  optional_traits: []
  required_capabilities:
{caps_block}
  jobs_bias:
{jobs_block2}
jobs_bias:
{jobs_block}
telemetry:
  expected_pick_rate: 0.1
  spawn_weight: 0.15
genetic_traits:
  core:
{core_block}
  optional: []
  synergy: []
services_links: []
description: i18n:species.{c['id']}.description
design_stub: true
receipt:
  source: PTPF.v1.0
  author: claude-code-salvage
  date: '2026-06-23'
  note: 'retired-creature salvage item 2a; identity ratified + kit from species_affinity; heuristic fields are honest stubs (vc/spawn/telemetry/koppen) pending calib; lore via codex_aliena_lore_gen HITL'
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    base = "packs/evo_tactics_pack/data/species"
    for c in CREATURES:
        d = os.path.join(base, c["biome"])
        path = os.path.join(d, c["id"].replace("_", "-") + ".yaml")
        if args.write:
            os.makedirs(d, exist_ok=True)
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(spec_yaml(c))
            print("written:", path)
        else:
            print("[dry]", path)
    print(f"{'wrote' if args.write else 'would write'} {len(CREATURES)} specs")


if __name__ == "__main__":
    main()
