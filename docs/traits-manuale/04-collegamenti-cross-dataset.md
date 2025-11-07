# Collegamenti a specie, eventi e regole ambientali

Le tabelle dei trait dialogano con matrici dedicate che mappano sinergie, requisiti e suggerimenti dinamici. Questa sezione riassume come leggere e mantenere i collegamenti principali.

## Matrice specie & eventi

Il file `docs/catalog/species_trait_matrix.json` collega 74 specie e 5 eventi ecologici ai trait canonici, per un totale di 219 trait unici referenziati fra blocchi core, opzionali e sinergie.【661b50†L4-L15】 Ogni voce espone biome di riferimento, morfotipo, capability richieste e lista di trait obbligatori/opzionali, come illustrato dall'evento "Banshee Risonante" qui sotto.【F:docs/catalog/species_trait_matrix.json†L1-L66】

| Campo | Contenuto | Note operative |
| --- | --- | --- |
| `core_traits` | Trait indispensabili per specie/eventi (es. adattamento volo, metabolismo dedicato). | Devono restare sincronizzati con `data/traits/index.json` quando si rinomina o si rimuove un tratto.【F:docs/catalog/species_trait_matrix.json†L3-L33】 |
| `optional_traits` | Trait consigliati o situazionali, spesso ripetuti per enfatizzare sinergie narrative. | Aggiornare i riferimenti incrociati nelle schede trait (`sinergie`, `species_affinity`).【F:docs/catalog/species_trait_matrix.json†L20-L33】【F:data/traits/index.json†L246-L288】 |
| `environment_focus` | Bioma o condizione primaria dell'evento/specie. | Allineare con `requisiti_ambientali` e `biome_tags` per evitare discrepanze durante il coverage report.【F:docs/catalog/species_trait_matrix.json†L15-L17】【F:data/traits/index.json†L17-L34】 |
| `required_capabilities` | Capability tecniche per spawn/missione. | Validare con `scripts/trait_audit.py --check` quando si introducono nuove capability o si modificano gli slot.【F:docs/catalog/species_trait_matrix.json†L28-L31】 |

Le specie seguono la stessa struttura, aggiungendo ruoli ecosistemici (`role`) e riferimenti diretti ai file YAML dei pack, che fungono da fonte verità per generare baseline e coverage.【F:docs/catalog/species_trait_matrix.json†L234-L320】 Quando si aggiorna un trait, assicurarsi che eventuali riferimenti in questa matrice vengano sincronizzati (rinominando slug o ricalcolando i trait consigliati).

## Regole ambientali

Le regole ambientali definite in `packs/evo_tactics_pack/docs/catalog/env_traits.json` forniscono suggerimenti automatici di trait in base a biomi, hazard, morfotipi o condizioni climatiche. Il dataset contiene 33 regole e riutilizza il glossario dei trait per mantenere coerenza terminologica.【35aebf†L1-L14】【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L1-L118】

| Trigger (`when`) | Suggerimenti (`suggest`) | Note |
| --- | --- | --- |
| `biome_class = foresta_temperata` | `peli_idrofobici`, bonus `res_cold +1`, bias `warden`/`skirmisher` | Garantire che i trait suggeriti abbiano `has_biome = true` e slot coerenti con le unità assegnate.【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L5-L20】 |
| `koppen_in = {Cfb, Cfa}` | `pelli_fitte`, abilita `guard_stance` | Utilizzare per scenari climatici senza bioma specifico ma con codici Köppen.【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L22-L36】 |
| `hazard_any = pendenze_instabili` | Richiede capability `jump_bonus`/`pathing_bonus` | Aggiungere i trait nel catalogo solo dopo aver verificato sinergia con le capability richieste.【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L38-L48】 |
| `hazard_any = magnetic_patches` | Suggerisce `enzimi_chelanti`, abilita `trap_detect_ion` | Cross-check con `usage_tags` difensivi per evitare sovrapposizioni con i trait offensivi.【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L95-L118】 |

Quando si estendono le regole ambientali, ricordarsi di:

1. Aggiornare o aggiungere i trait nel catalogo principale (`data/traits/index.json`) mantenendo `data_origin` coerente.
2. Rigenerare baseline e coverage (`python tools/py/build_trait_baseline.py`, `python tools/py/report_trait_coverage.py`) per verificare impatti su missioni e pacchetti.
3. Documentare i nuovi trigger nella matrice specie/eventi se introducono sinergie dedicate.
