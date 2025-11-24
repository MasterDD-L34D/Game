# REF_REPO_SOURCES_OF_TRUTH – Canonico dati core

Versione: 0.5
Data: 2025-12-30
Owner: agente **archivist** (supporto: trait-curator, species-curator, biome-ecosystem-curator)
Stato: PATCHSET-00 PROPOSTA – censimento sorgenti di verità

---

## Obiettivi

- Identificare le sorgenti di verità per trait, specie, biomi/ecosistemi e schemi correlati.
- Stabilire la relazione tra dati strutturati (`data/core/**`, `data/ecosystems/**`, `data/traits/**`) e documentazione (`traits/**`, `docs/**`).
- Definire lo standard di convalida (schema **ALIENA**, metriche UCUM) e i validatori da applicare ai core.

## Stato attuale

- I dataset core sono distribuiti fra `data/core/**`, `data/ecosystems/**`, `data/traits/**`, `biomes/**` e documentazione descrittiva in `traits/**` e `docs/`.
- Non esiste ancora una tabella unica che dichiari, per dominio, il file o la cartella canonica e la relativa versione.
- I validatori/schema-checker esistono ma non sono centralizzati in un elenco e potrebbero riferirsi a snapshot legacy.
- La compatibilità con ALIENA è un requisito implicito, non ancora verificato campo per campo.

## Rischi

- Duplicati o versioni divergenti tra core e documentazione possono generare pack incoerenti.
- Validatori obsoleti potrebbero accettare dati non conformi allo schema aggiornato o rifiutare core validi.
- Assenza di owner per dominio (trait/specie/biomi) rallenta il triage e l’allineamento con altre pipeline.

## Dipendenze

- Schema ALIENA e metriche UCUM per i controlli di struttura e unità di misura.
- `REF_PACKS_AND_DERIVED` per garantire che i pack derivino solo dai core canonici.
- `REF_TOOLING_AND_CI` per legare i validatori ai percorsi core e alla CI.
- Coordinamento con `REF_INCOMING_CATALOG` per evitare che materiale non classificato entri come sorgente di verità.

## Prerequisiti di governance

- Owner umano formalizzato per la custodia dei core (trait/specie/biomi) e registrato nel log di attività.
- Branch dedicati per eventuali patch correttive su PATCHSET-00, separati dalle pipeline di feature.
- Registrazione in `logs/agent_activity.md` di revisioni, approvazioni e triage sulle sorgenti di verità.

## Prossimi passi

1. Redigere una tabella per dominio (trait, specie, biomi/ecosistemi) che indichi percorso canonico, formato e owner.
2. Elencare i validatori/schema-checker disponibili, specificando input atteso e posizione degli schemi.
3. Eseguire un check rapido di conformità ad ALIENA/UCUM sui core per identificare gap critici (solo report, nessuna modifica dati).
4. Mappare dove la documentazione riporta copie manuali dei cataloghi e segnare quali voci devono diventare derivate/rigenerate.
5. Collegare la tabella alle regole di derivazione dei pack in `REF_PACKS_AND_DERIVED` e alle pipeline CI in `REF_TOOLING_AND_CI`.

---

## Percorsi canonici e criteri di verità

| Dominio                   | Core canonico                                                                                                                 | Derived/pack ammessi                                                                                                                           | Criterio di verità (core vs derived)                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trait                     | `data/core/traits/glossary.json` (anagrafica), `data/core/traits/biome_pools.json` (pool ambientali)                          | Cataloghi pack (`packs/evo_tactics_pack/docs/catalog/*.json`), report QA (`data/derived/analysis/trait_*`), descrittivi `traits/**`            | Core = unica sorgente id/slug e pool validati via ALIENA/UCUM; derived devono essere rigenerati dai core e riportare versione/timestamp; documentazione è derivata e non fa testo.   |
| Specie                    | `data/core/species.yaml`, `data/core/species/aliases.json`                                                                    | Dataset pack (`packs/evo_tactics_pack/data/species.yaml`), snapshot/mock (`data/derived/mock/**/species.yaml`)                                 | Core = unica lista specie e alias; derived ammessi solo se generati da core (o arricchiti) e marcati con checksum sorgente; alias pack devono riflettere `aliases.json`.             |
| Biomi/Ecosistemi/Foodweb  | `data/core/biomes.yaml`, `data/core/biome_aliases.yaml`, `data/ecosystems/*.ecosystem.yaml`, `biomes/terraforming_bands.yaml` | Pack ecosistemi/foodweb (`packs/evo_tactics_pack/data/ecosystems/*.yaml`, `data/foodwebs/*.yaml`), report analisi (`data/derived/analysis/**`) | Core = biomi e bande di terraformazione validati ALIENA; ecosistemi pack devono essere sincronizzati con core (specie/biomi) e annotare script/versione usata; report solo derivati. |
| Telemetria/funzioni gioco | `data/core/telemetry.yaml`, `data/core/game_functions.yaml`, `data/core/mating.yaml`, missioni (`data/core/missions/*.yaml`)  | Mock/snapshot (`data/derived/mock/**`), report progression (`data/derived/analysis/progression/*.json` / `*.csv`)                              | Core = parametri e missioni ufficiali; derived usabili per QA solo se rigenerati da core con log comando; mock sono derivati e non modificano la verità dei core.                    |

**Regola generale**: il core è verità unica (ALIENA/UCUM + validator repo). Tutto ciò che vive fuori da `data/core/**` è derivato o documentazione; va rigenerato dai core e accompagnato da timestamp/versione git e log del comando usato. Nessuna modifica manuale ai derived senza backport nei core.

---

## Changelog

- 2025-12-30: versione 0.5 – intestazione riallineata al report v0.5, confermata la numerazione 01A–03B e il perimetro delle sorgenti canoniche.
- 2025-12-17: versione 0.3 – design completato, perimetro documentazione consolidato, numerazione 01A–03B bloccata e richiamo alle fasi GOLDEN_PATH; prerequisiti di governance esplicitati (owner umano, branch dedicati, logging su `logs/agent_activity.md`).
- 2025-11-23: struttura iniziale e linee guida di censimento (archivist).
