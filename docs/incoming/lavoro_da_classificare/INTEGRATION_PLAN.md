# Piano di integrazione — `incoming/lavoro_da_classificare`

Questo documento raccoglie le azioni operative per completare la revisione e
l'import del pacchetto Evo‑Tactics presente nella cartella
`incoming/lavoro_da_classificare/`. L'obiettivo è convertire il materiale grezzo
in contributi pronti per il branch principale del repository.

**Owner di dominio (01B)**: archivist (Master DD) con supporto species-curator e
trait-curator per l'handoff di matrice core/derived e allineamento trait
sentience/enneagramma. Milestone: **01B** in modalità report-only.

**Decisione stato (catalogo 01B)**: mantenere questo piano attivo e
aggiornarlo nel perimetro 01B (report-only) invece di archiviarlo; la scelta è
registrata in `docs/planning/REF_REPO_MIGRATION_PLAN.md` e nel log attività.

**Patchset/branch attivi**: `patch/01B-core-derived-matrix` (handoff
species/trait-curator) e `patch/01A-docs-catalogo` per la sincronizzazione del
catalogo; loggare ogni avanzamento in `logs/agent_activity.md`.

## Obiettivi di alto livello

1. **Consolidare la documentazione** in `docs/` e allinearla con le guide
   ufficiali (How-To Trait, QA, policy di sicurezza).
2. **Allineare dati e schemi** di specie/ecotipi/trait con il formato stabile
   (JSON Schema v2, alias specie, dataset aggregati).
3. **Integrare gli script di tooling** (validazioni, backlog, report) nel
   toolchain già presente (`incoming/scripts`, `tools/`, workflow CI).
4. **Aggiornare workflow e test** Playwright per validare UI e reportistica.
5. **Tenere traccia dei duplicati** (es. copia in `home/oai/share/...`) per
   evitare import multipli nello stesso branch.

## Batches proposti

| Batch              | Scope                                                                                                              | Destinazione finale                                                                              | Dipendenze                           | Bloccanti                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------ |
| `documentation`    | `docs/`, `README*`, guide in PDF/DOCX                                                                              | `docs/evo-tactics/` + `docs/security/` + `docs/guides/`                                          | Nessuna, solo revisione contenuti    | Conversione dei DOCX/PDF in Markdown stabile                             |
| `data-models`      | `templates/*.schema.json`, `data/aliases/*.json`                                                                   | `schemas/` e `data/core/species/aliases.json`                                                    | Richiede conferma campi con gameplay | Allineare enum/field con versioni in `schemas/`                          |
| `species_ecotypes` | `species/*.json`, `ecotypes/*.json`, `species_catalog.md/json`                                                     | Nuova cartella `data/external/evo/species/` + indice in `data/external/evo/species_catalog.json` | Dipende da `data-models`             | Validazione contro schema v2, aggiornare alias                           |
| `traits`           | `traits/*.json`, `traits_aggregate.json`, `trait_review.*`, `trait_merge_proposals.md`                             | `data/external/evo/traits/` + merge in `data/core/traits/glossary.json`                          | Dipende da `data-models`             | Duplicati vs. glossario esistente, conflitti ID `TR-*`                   |
| `tooling`          | `scripts/*.py`, `scripts/validate.sh`, `setup_backlog.py`, `species_summary_script.py`                             | `incoming/scripts/` + `tools/automation/` (nuova)                                                | Nessuna                              | Configurare variabili ambiente, evitare duplicati con `incoming/scripts` |
| `ops_ci`           | `workflows/*.yml`, `ops/site-audit/*`, `security.yml`, `init_security_checks.sh`                                   | `.github/workflows/`, `ops/site-audit/` (armonizzare con esistente)                              | Dipende da `tooling`                 | Verificare compatibilità CI esistente, segreti GitHub                    |
| `frontend`         | `tests/playwright/*`, `lighthouserc.json`, `proposed_sitemap.xml`, `proposed_routes.csv`, `mockup_evo_tactics.png` | `tests/playwright/evo/`, `config/lighthouse/`                                                    | Dipende da `ops_ci`                  | Richiede assets frontend aggiornati                                      |

## Validazione per batch

### `documentation`

- **Scope/Destinazione**: confermati i target `docs/evo-tactics/`, `docs/security/`, `docs/guides/` con consolidamento di README e guide operative.
- **Dipendenze**: nessuna; può sbloccare altre squadre fornendo terminologia condivisa.
- **Blocchi/varianti**: conversione DOCX/PDF → Markdown stabile (preferire pandoc); verificare duplicati con `home/oai/share/...` e annotarli in `inventario.yml`.
- **Esito**: approvato con azione di conversione tracciata.

### `data-models`

- **Scope/Destinazione**: confermati `schemas/` e `data/core/species/aliases.json` come output; mantenere compatibilità con JSON Schema v2.
- **Dipendenze**: richiede conferma con gameplay per enum/field; propedeutico a `species_ecotypes` e `traits`.
- **Blocchi/varianti**: allineare enum e campi agli schemi presenti; prevedere migrazione dei template se emergono campi opzionali.
- **Esito**: approvazione condizionata al confronto rapido con gameplay owner.

### `species_ecotypes`

- **Scope/Destinazione**: nuova cartella `data/external/evo/species/` più indice `data/external/evo/species_catalog.json` confermati.
- **Dipendenze**: dipende da `data-models` (schema v2) e dagli alias specie aggiornati.
- **Blocchi/varianti**: eseguire validazione contro schema v2; aggiornare alias; usare report `species_analysis_report.md` per tracciare correzioni.
- **Esito**: approvato dopo validazione schema e alias.

### `traits`

- **Scope/Destinazione**: confermati `data/external/evo/traits/` e merge su `data/core/traits/glossary.json`.
- **Dipendenze**: dipende da `data-models` per campi/enum condivisi.
- **Blocchi/varianti**: rimuovere duplicati e conflitti ID `TR-*`; usare `trait_review.*` come fonte di confronto prima del merge.
- **Esito**: approvazione condizionata a deduplica e normalizzazione ID.

### `tooling`

- **Scope/Destinazione**: confermati `incoming/scripts/` e nuova `tools/automation/` per runner/validatori.
- **Dipendenze**: nessuna; fornisce base per `ops_ci`.
- **Blocchi/varianti**: verificare variabili ambiente e ridurre duplicati con script già presenti; prevedere target `make`/`just` per integrazione CI.
- **Esito**: approvato con hardening variabili e naming script.

### `ops_ci`

- **Scope/Destinazione**: `.github/workflows/` e `ops/site-audit/` da armonizzare.
- **Dipendenze**: richiede `tooling` per percorsi e script condivisi.
- **Blocchi/varianti**: controllare compatibilità con workflow esistenti e la presenza dei segreti GitHub; pianificare rollout graduale (workflow disabilitato → abilitato dopo smoke test).
- **Esito**: approvazione condizionata a smoke test e verifica segreti.

### `frontend`

- **Scope/Destinazione**: confermati `tests/playwright/evo/` e `config/lighthouse/`.
- **Dipendenze**: dipende da `ops_ci` (pipeline di esecuzione test) e dagli asset frontend aggiornati.
- **Blocchi/varianti**: assicurare che i mockup e le rotte proposte siano allineati al sitemap definitivo; validare asset di test prima del commit finale.
- **Esito**: approvato dopo allineamento asset e disponibilità pipeline.

## Sequenza di esecuzione raccomandata

1. `documentation` — sblocca terminologia e riferimenti condivisi.
2. `data-models` — stabilizza schema e alias di base.
3. `traits` — normalizza ID e glossary usando schema definitivo.
4. `species_ecotypes` — importa dataset validati e indicizza catalogo.
5. `tooling` — consolida script usati dai workflow successivi.
6. `ops_ci` — aggiorna workflow sfruttando gli script consolidati.
7. `frontend` — integra test e configurazioni dipendenti dalla CI.

## Esito della revisione

- Tutti i batch sono **approvati** con note esecutive; richiedono le azioni puntuali indicate nei blocchi/varianti prima del merge.
- Sequenza proposta coerente con dipendenze dichiarate; eventuale parallelizzazione: `documentation` può procedere in anticipo, mentre `traits` e `species_ecotypes` possono sovrapporsi dopo la chiusura di `data-models`.

## Note sui duplicati

- La gerarchia `home/oai/share/evo_tactics_game_creatures_traits_package/`
  duplica quasi tutto il contenuto principale. Durante la revisione mantenere
  solo la copia in radice e segnare nel file `inventario.yml` le voci duplicate
  come "archiviate" una volta validata l'equivalenza.
- `backlog/backlog_tasks_example.yaml` coincide con il file a livello radice:
  usiamo la copia radice come sorgente e rimuoviamo la duplicata a import
  completato.

## Automazioni disponibili

- `scripts/validate.sh` — esegue la validazione JSON Schema per specie e trait
  usando `ajv`. Da spostare in `incoming/scripts/validate_evo_pack.sh` con
  percorsi aggiornati.
- `trait_review.py` e `species_summary_script.py` — generano report CSV/Markdown
  allineati con l'inventario; prevedere un target `make traits-review` nella
  radice del progetto per integrarli in CI.
- `setup_backlog.py` — automatizza la creazione di project board/issue GitHub.
  Richiede token personale; valutare se convertirlo in comando `just` o script
  `npm` per facilitare gli stakeholder.
- Workflow in `workflows/` — replicano pipeline (schema-validate, e2e,
  lighthouse, security). Confrontarli con `.github/workflows/` e migrare le
  sezioni mancanti.
- `tools/automation/evo_batch_runner.py` — orchestration script che permette di
  lanciare in dry-run o in esecuzione reale i comandi definiti nei batch di
  `tasks.yml`. È disponibile anche un workflow GitHub manuale (`Run Evo Batch`)
  per avviare gli stessi step via UI, mantenendo traccia dell'esecuzione.

## Checklist operativa

1. Convalidare le strutture JSON con `scripts/validate.sh` allineando i path.
2. Documentare l'esito della verifica nel file `inventario.yml` (`stato:
validato`) per i blocchi completati.
3. Per ogni batch:
   - spostare i file nella destinazione indicata,
   - aprire PR dedicata con riferimento a `integration_batches.yml`,
   - aggiornare i report (`trait_review_report.md`, `species_analysis_report.md`).
4. Eliminare o archiviare `home/oai/share/...` quando la migrazione è conclusa.
5. Aggiornare la roadmap nel project board usando `setup_backlog.py` e il
   template `backlog_tasks_example.yaml`.
6. Aggiornare la matrice operativa (`TASKS_BREAKDOWN.md`, `tasks.yml`) per
   tracciare avanzamento, assegnatari e dipendenze.
7. Utilizzare le directory preparate nel repository (`docs/evo-tactics/`,
   `docs/security/`, `data/external/evo/`, `reports/evo/`,
   `incoming/archive/documents/`, `tools/automation/`, `docs/wireframes/evo/`)
   per depositare gli output dei batch evitando conflitti di path.

## Uscite attese per l'import finale

- Nuovi dataset `data/external/evo/` con specie e trait normalizzati.
- Documentazione consolidata sotto `docs/evo-tactics/` e `docs/security/`.
- Workflow CI aggiornati in `.github/workflows/` e Playwright test installati.
- Report aggiornati nella directory `reports/` con link dal `README.md`.

Tenendo traccia di questi passi è possibile completare l'integrazione della
cartella senza ulteriori interventi manuali esterni.
