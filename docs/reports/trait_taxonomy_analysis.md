# Analisi tassonomia trait

## 1. Esportazione e dataset di riferimento
- Script dedicato: `tools/py/export_trait_taxonomy.py` raccoglie tutti i 174 trait dell'indice, normalizza famiglie, slot e requisiti ambientali e genera sia un CSV consultabile sia un riepilogo JSON con le statistiche di supporto.【F:tools/py/export_trait_taxonomy.py†L1-L138】
- Output principali:
  - `reports/trait_index_export.csv` — elenco completo con macro/micro famiglia, tier, slot, biomi e fonti ambientali per ogni tratto.【F:tools/py/export_trait_taxonomy.py†L31-L114】
  - `reports/trait_index_summary.json` — riepilogo quantitativo utilizzato per le analisi successive.【F:tools/py/export_trait_taxonomy.py†L116-L134】

## 2. Pattern osservati (tag, specie, ambienti)
### Tag funzionali
- Le famiglie macro più popolose sono Sensoriale (21), Locomotorio/Tegumentario/Simbiotico (19 ciascuna) e Strutturale (17), a indicare un bilanciamento quasi uniforme tra percezione, movimento e protezione.【F:reports/trait_index_summary.json†L1-L39】
- A livello micro emergono cluster Difensivo (21), Tattico (16) e un nucleo di specializzazioni Analitico/Mobilità/Adattivo (14 ciascuno), suggerendo che i “tag” funzionali esistenti sono già utili per segmentazioni tematiche.【F:reports/trait_index_summary.json†L81-L117】
- I profili slot core completano il quadro: sensoriale (21), locomotorio (20), simbiotico (19) e strategia (18) dominano la distribuzione, con un ventaglio ampio di slot complementari per protezione, analisi e assalto (14–15 occorrenze).【F:reports/trait_index_summary.json†L251-L360】

### Specie
- L’indice non espone riferimenti espliciti alle specie: nessun campo collega direttamente un tratto a specie o cladi, e il riepilogo mette in evidenza 12 trait privi di metadati ambientali/expansion, ma non esistono campi “species”.【F:reports/trait_index_summary.json†L645-L686】
- Le correlazioni specie↔trait risiedono invece nei cataloghi specie (es. `dune-stalker.yaml` associa trait core e opzionali), che andrebbero incrociati per introdurre tassonomie basate sulla specie.【F:packs/evo_tactics_pack/data/species/badlands/dune-stalker.yaml†L1-L60】

### Ambienti
- Il vincolo `biome_class` è presente nella maggior parte dei trait: caverna_risonante (23), abisso_vulcanico (13), caldera_glaciale (12) e dorsale_termale_tropicale/foresta_acida (11) guidano la distribuzione.【F:reports/trait_index_summary.json†L491-L538】
- Dodici trait sono privi di bioma/expansion, segnalando “buchi” da colmare prima di usare il dato per filtri ambientali affidabili.【F:reports/trait_index_summary.json†L659-L686】
- Il metadato `expansion` è quasi sempre valorizzato su `coverage_q4_2025` (117) o `controllo_psionico` (50), utile per distinguere il pacchetto di provenienza del tratto.【F:reports/trait_index_summary.json†L645-L656】

## 3. Dimensioni di raggruppamento consigliate
1. **Bioma** — già copre la maggioranza del catalogo e descrive il contesto ambientale operativo; utile per filtri narrativi e per bilanciare scenari di missione.【F:reports/trait_index_summary.json†L491-L538】
2. **Specie** — da costruire incrociando il catalogo trait con i file specie (core/optional traits, morph budget). Permette di organizzare loadout raccomandati e verificare copertura delle specie giocabili.【F:packs/evo_tactics_pack/data/species/badlands/dune-stalker.yaml†L1-L60】
3. **Utilizzo in gioco** — derivabile dai campi `slot_core` e `slot_complementare`; consente di raggruppare per ruolo tattico (es. percezione, mobilità, assalto) supportando configuratori e bilanciamento party.【F:reports/trait_index_summary.json†L251-L360】

## 4. Tassonomie proposte (criteri, esempi, impatto)
### Biomi
- **Criteri**: raggruppare per `biome_class` primario; se assente usare expansion o richiedere compilazione.
- **Esempi**: `ali_membrana_sonica` → caverna_risonante; `antenne_flusso_mareale` → laguna_bioreattiva.【F:reports/trait_index_export.csv†L2-L8】
- **Impatto dati**: richiede completare i 12 trait senza bioma; abilita query ambientali e validazioni di copertura scenario.【F:reports/trait_index_summary.json†L659-L686】

### Specie
- **Criteri**: collegare trait agli ID specie che li usano (core/opzionali/suggeriti) attingendo a `derived_from_environment.suggested_traits` e `genetic_traits` nei file specie.【F:packs/evo_tactics_pack/data/species/badlands/dune-stalker.yaml†L37-L60】
- **Esempi**: Dune Stalker richiede `artigli_sette_vie`, `coda_frusta_cinetica`, `scheletro_idro_regolante`, `struttura_elastica_amorfa` come core.【F:packs/evo_tactics_pack/data/species/badlands/dune-stalker.yaml†L37-L60】
- **Impatto dati**: serve tabella ponte trait↔specie per audit di copertura e per suggerimenti automatici nei configuratori.

### Utilizzo in gioco
- **Criteri**: usare `slot_core` come ruolo principale e `slot_complementare` come sottoruolo; raggruppare in macro categorie (es. percezione, controllo, supporto energetico) basate sulla frequenza attuale.【F:reports/trait_index_summary.json†L251-L360】
- **Esempi**: `Ali Fulminee` (core sensoriale, complemento analitico), `Antenne Dustsense` (core metabolico, complemento energia).【F:reports/trait_index_export.csv†L2-L5】
- **Impatto dati**: consente viste orientate al design (ruoli di party, sinergie) e controlli automatici di saturazione di slot in build.

## 5. Campi aggiuntivi raccomandati
- `biome_tags`: array di biomi secondari/affinità per coprire trait multi-ambiente e migliorare ricerche fuzzy.【F:reports/trait_index_summary.json†L491-L538】
- `species_affinity`: elenco di ID specie con peso (core, opzionale, suggerito) per abilitare filtri e validazioni incrociate.【F:packs/evo_tactics_pack/data/species/badlands/dune-stalker.yaml†L37-L60】
- `usage_tags`: sintesi normalizzata del ruolo tattico (es. `scout`, `breaker`, `tank`) derivata da `slot_core`/`slot_complementare` per semplificare UI e analytics.【F:reports/trait_index_summary.json†L251-L360】
- `data_origin`: consolidare `meta.expansion` in un campo di primo livello per distinguere bundle/pacchetti in modo coerente tra trait con e senza requisiti ambientali.【F:reports/trait_index_summary.json†L645-L686】
- `completion_flags`: booleani (`has_biome`, `has_species_link`) per individuare lacune editoriali nei workflow automatici.【F:reports/trait_index_summary.json†L659-L686】
