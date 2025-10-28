# Manifest Biomi

Questo documento elenca i biomi menzionati nei canvas progettuali, nei dataset delle specie e negli strumenti di generazione, fornendo un identificatore canonico da utilizzare in `data/biomes.yaml` e nelle integrazioni future.

## Convenzioni
- **ID canonico**: chiave `snake_case` utilizzata nei dataset YAML.
- **Alias**: varianti già presenti nei dataset legacy (per esempio classi o chiavi storiche). Gli alias attivi sono tracciati in `data/biome_aliases.yaml`.
- **Fonti**: file che menzionano esplicitamente il bioma o lo utilizzano per vincolare specie/eventi.
- I campi introdotti nella nuova struttura YAML possono temporaneamente contenere i placeholder `TODO` / `TBD` finché non vengono definiti contenuti finali.

## Biomi principali (EVO Tactics Pack)

| ID | Nome di riferimento | Alias | Fonti principali | Note |
| --- | --- | --- | --- | --- |
| `badlands` | Badlands Ferro-Magnetiche | `Badlands` | `data/biomes.yaml`, `packs/evo_tactics_pack/data/ecosystems/badlands.biome.yaml`, `packs/evo_tactics_pack/data/species/badlands/evento-tempesta-ferrosa.yaml` | Tempeste ferrose e archetipi magnetotattici.【F:data/biomes.yaml†L65-L96】【F:packs/evo_tactics_pack/data/ecosystems/badlands.biome.yaml†L1-L39】【F:packs/evo_tactics_pack/data/species/badlands/evento-tempesta-ferrosa.yaml†L1-L29】 |
| `deserto_caldo` | Deserto Caldo Aurorale | `Deserto Caldo` | `data/biomes.yaml`, `packs/evo_tactics_pack/data/ecosystems/deserto_caldo.ecosystem.yaml`, `packs/evo_tactics_pack/data/species/deserto_caldo/thermo-raptor.yaml` | Dune fotoniche e convogli ionizzati.【F:data/biomes.yaml†L259-L289】【F:packs/evo_tactics_pack/data/ecosystems/deserto_caldo.ecosystem.yaml†L1-L25】【F:packs/evo_tactics_pack/data/species/deserto_caldo/thermo-raptor.yaml†L1-L38】 |
| `foresta_temperata` | Foresta Temperata Umida | `Foresta temperata umida`, `Foresta Temperata` | `data/biomes.yaml`, `packs/evo_tactics_pack/data/ecosystems/foresta_temperata.biome.yaml`, `packs/evo_tactics_pack/data/species/foresta_temperata/lupus-temperatus.yaml` | Boschi piovosi con canopy stratificato e archetipi stealth.【F:data/biomes.yaml†L384-L418】【F:packs/evo_tactics_pack/data/ecosystems/foresta_temperata.biome.yaml†L1-L27】【F:packs/evo_tactics_pack/data/species/foresta_temperata/lupus-temperatus.yaml†L1-L32】 |
| `cryosteppe` | Cryosteppe Risonanti | – | `data/biomes.yaml`, `packs/evo_tactics_pack/data/species/cryosteppe/evento-brinastorm.yaml` | Steppe di permafrost con aurora instabile e convogli biotech.【F:data/biomes.yaml†L226-L258】【F:packs/evo_tactics_pack/data/species/cryosteppe/evento-brinastorm.yaml†L1-L32】 |

## Ambienti aggiuntivi catalogati

| ID | Nome di riferimento | Alias | Fonti principali | Note |
| --- | --- | --- | --- | --- |
| `abisso_vulcanico` | Abisso Vulcanico | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Camini abissali e shock termici estremi.【F:data/biomes.yaml†L1-L33】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L1-L41】 |
| `atollo_obsidiana` | Atollo Obsidiana | – | `data/biomes.yaml`, `appendici/C-CANVAS_NPG_BIOMI.txt` | Maree magnetiche e shard storm ad alto rischio.【F:data/biomes.yaml†L34-L64】【F:appendici/C-CANVAS_NPG_BIOMI.txt†L31-L35】 |
| `caldera_glaciale` | Caldera Glaciale | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Geyser criogenici e cristalli instabili.【F:data/biomes.yaml†L97-L128】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L17-L42】 |
| `canopia_ionica` | Canopia Ionica | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Foreste sospese con campi elettrostatici.【F:data/biomes.yaml†L129-L159】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L23-L48】 |
| `canyons_risonanti` | Canyons Risonanti | – | `data/biomes.yaml`, `appendici/C-CANVAS_NPG_BIOMI.txt` | Duelli sonori e tunnel armonici.【F:data/biomes.yaml†L160-L190】【F:appendici/C-CANVAS_NPG_BIOMI.txt†L19-L38】 |
| `caverna` | Caverna Risonante | `caverna_risonante` | `data/biomes.yaml`, `docs/examples/encounter_caverna.txt` | Ecosistemi sotterranei eco-sintonizzati.【F:data/biomes.yaml†L191-L225】【F:docs/examples/encounter_caverna.txt†L1-L47】 |
| `dorsale_termale_tropicale` | Dorsale Termale Tropicale | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Correnti bioluminescenti e fumarole instabili.【F:data/biomes.yaml†L290-L320】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L23-L48】 |
| `foresta_acida` | Foresta Acida | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Piogge corrosive e culti simbiotici.【F:data/biomes.yaml†L321-L352】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L17-L42】 |
| `foresta_miceliale` | Foresta Miceliale | – | `data/biomes.yaml`, `appendici/C-CANVAS_NPG_BIOMI.txt` | Rete fungina bioluminescente.【F:data/biomes.yaml†L353-L383】【F:appendici/C-CANVAS_NPG_BIOMI.txt†L39-L47】 |
| `laguna_bioreattiva` | Laguna Bioreattiva | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Maree catalitiche e reagenti instabili.【F:data/biomes.yaml†L419-L449】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L23-L48】 |
| `mangrovieto_cinetico` | Mangrovieto Cinetico | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Radici mobili e motori tidal-tech.【F:data/biomes.yaml†L450-L480】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L23-L48】 |
| `mezzanotte_orbitale` | Mezzanotte Orbitale | – | `data/biomes.yaml`, `appendici/C-CANVAS_NPG_BIOMI.txt` | Stazione orbitale in crisi con allarmi a cascata.【F:data/biomes.yaml†L481-L512】【F:appendici/C-CANVAS_NPG_BIOMI.txt†L48-L65】 |
| `palude` | Palude Tossica | – | `data/biomes.yaml`, `docs/examples/encounter_palude.txt` | Miasmi corrosivi e culti simbiotici.【F:data/biomes.yaml†L513-L544】【F:docs/examples/encounter_palude.txt†L1-L47】 |
| `pianura_salina_iperarida` | Pianura Salina Iperarida | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Specchi salini che amplificano miraggi e radiazioni.【F:data/biomes.yaml†L545-L575】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L17-L42】 |
| `reef_luminescente` | Reef Luminescente | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Barriere sintetiche e correnti fotoniche.【F:data/biomes.yaml†L576-L606】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L23-L48】 |
| `savana` | Savana Ionizzata | `savanna` | `data/biomes.yaml`, `docs/examples/encounter_savana.txt` | Dune fotoniche e clan erranti.【F:data/biomes.yaml†L607-L640】【F:docs/examples/encounter_savana.txt†L1-L47】 |
| `steppe_algoritmiche` | Steppe Algoritmiche | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Pianure IA con branchi dronici.【F:data/biomes.yaml†L641-L672】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L23-L48】 |
| `stratosfera_tempestosa` | Stratosfera Tempestosa | – | `data/biomes.yaml`, `packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` | Piattaforme aerostatiche tra fulmini supersonici.【F:data/biomes.yaml†L673-L704】【F:packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml†L17-L42】 |

## Alias legacy

Gli alias attivi sono mantenuti in `data/biome_aliases.yaml` e coprono le varianti storiche più comuni (`Foresta temperata umida`, `Deserto Caldo`, `Badlands`, `savanna`, ecc.). Aggiornare il file insieme a nuove integrazioni per evitare regressioni nei validatori.【F:data/biome_aliases.yaml†L1-L27】

## Sorgenti verificate
- Canvas C — NPG Reattivi, Biomi & Director.【F:appendici/C-CANVAS_NPG_BIOMI.txt†L1-L65】
- Dataset specie (`data/species.yaml`) e catalogo esteso EVO Tactics.【F:data/species.yaml†L1-L87】【F:docs/catalog/species_trait_matrix.json†L1-L202】
- Dataset biomi (`data/biomes.yaml`) e fixture minimal correlate.【F:data/biomes.yaml†L1-L732】【F:data/test-fixtures/minimal/data/biomes.yaml†L1-L8】
- Esempi di encounter generati in `docs/examples/`.【F:docs/examples/encounter_savana.txt†L1-L47】【F:docs/examples/encounter_caverna.txt†L1-L47】【F:docs/examples/encounter_palude.txt†L1-L47】
