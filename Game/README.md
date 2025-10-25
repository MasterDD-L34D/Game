# Evo-Tactics · Ecosystem Impl Pack v1.6

Build: 2025-10-25

**Novità (v1.6):**
- Schema **Ecosystem v1.0** con tutti i campi del tuo template.
- Validator ecosistema: struttura, range fisici, link a **species**, **foodweb** e **NPG**; regole `rules.at_least`.
- Esempio completo: foresta temperata (ecosystem + species minime + foodweb + npg).

**Comandi:**
```bash
python Game/tools/py/validate_ecosystem_v1_0.py Game/data/ecosystems/foresta_temperata.ecosystem.yaml Game/tools/config/validator_config.yaml
python Game/tools/py/validate_foodweb_v1_0.py       Game/data/foodwebs/foresta_temperata_foodweb.yaml Game/tools/config/validator_config.yaml
```


**Patch v1.6.1**:
- Ripristinato validator specie **full** (v1.5) con check aggiuntivo `mate_synergy`.
- Aggiunto `validate_foodweb_roles_v1_0.py` (sanity ruoli predatore/prede).
- Creato `ecosystems/foresta_temperata.manifest.yaml`.
- Il pack include ora tutti gli accorgimenti richiesti nel ciclo precedente.


## v1.7 — Ecosystem Interconnect
- Registries estesi (functional_groups, trophic_roles, biome_classes, climate_profiles, morphotypes, hazards, env_to_traits).
- Schema specie **v1.7** (affinità ambientale + suggerimenti derivati).
- Schema ecosistema **v1.1** (collegamento esplicito alle registries).
- Tools:
  - `validate_species_v1_7.py` (enum/affinità/derivations presence)
  - `validate_ecosystem_v1_1.py` (schema + registries presenti)
  - `derive_env_traits_v1_0.py` (patch suggerimenti tratti/capabilità dai fattori ambientali)
  - `reverse_engineer_taxonomy_v1_0.py` (report di coverage per espansione categorie)
- Output di esempio: `Game/out/patches/foresta_temperata/*.patch.yaml`.
