# Piano di integrazione — `incoming/lavoro_da_classificare`

Questo documento raccoglie le azioni operative per completare la revisione e
l'import del pacchetto Evo‑Tactics presente nella cartella
`incoming/lavoro_da_classificare/`. L'obiettivo è convertire il materiale grezzo
in contributi pronti per il branch principale del repository.

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

| Batch | Scope | Destinazione finale | Dipendenze | Bloccanti |
| --- | --- | --- | --- | --- |
| `documentation` | `docs/`, `README*`, guide in PDF/DOCX | `docs/evo-tactics/` + `docs/security/` + `docs/guides/` | Nessuna, solo revisione contenuti | Conversione dei DOCX/PDF in Markdown stabile |
| `data-models` | `templates/*.schema.json`, `data/aliases/*.json` | `schemas/` e `data/core/species/aliases.json` | Richiede conferma campi con gameplay | Allineare enum/field con versioni in `schemas/` |
| `species_ecotypes` | `species/*.json`, `ecotypes/*.json`, `species_catalog.md/json` | Nuova cartella `data/external/evo/species/` + indice in `data/external/evo/species_catalog.json` | Dipende da `data-models` | Validazione contro schema v2, aggiornare alias |
| `traits` | `traits/*.json`, `traits_aggregate.json`, `trait_review.*`, `trait_merge_proposals.md` | `data/external/evo/traits/` + merge in `data/core/traits/glossary.json` | Dipende da `data-models` | Duplicati vs. glossario esistente, conflitti ID `TR-*` |
| `tooling` | `scripts/*.py`, `scripts/validate.sh`, `setup_backlog.py`, `species_summary_script.py` | `incoming/scripts/` + `tools/automation/` (nuova) | Nessuna | Configurare variabili ambiente, evitare duplicati con `incoming/scripts` |
| `ops_ci` | `workflows/*.yml`, `ops/site-audit/*`, `security.yml`, `init_security_checks.sh` | `.github/workflows/`, `ops/site-audit/` (armonizzare con esistente) | Dipende da `tooling` | Verificare compatibilità CI esistente, segreti GitHub |
| `frontend` | `tests/playwright/*`, `lighthouserc.json`, `proposed_sitemap.xml`, `proposed_routes.csv`, `mockup_evo_tactics.png` | `tests/playwright/evo/`, `config/lighthouse/` | Dipende da `ops_ci` | Richiede assets frontend aggiornati |

## Note sui duplicati

* La gerarchia `home/oai/share/evo_tactics_game_creatures_traits_package/`
  duplica quasi tutto il contenuto principale. Durante la revisione mantenere
  solo la copia in radice e segnare nel file `inventario.yml` le voci duplicate
  come "archiviate" una volta validata l'equivalenza.
* `backlog/backlog_tasks_example.yaml` coincide con il file a livello radice:
  usiamo la copia radice come sorgente e rimuoviamo la duplicata a import
  completato.

## Automazioni disponibili

* `scripts/validate.sh` — esegue la validazione JSON Schema per specie e trait
  usando `ajv`. Da spostare in `incoming/scripts/validate_evo_pack.sh` con
  percorsi aggiornati.
* `trait_review.py` e `species_summary_script.py` — generano report CSV/Markdown
  allineati con l'inventario; prevedere un target `make traits-review` nella
  radice del progetto per integrarli in CI.
* `setup_backlog.py` — automatizza la creazione di project board/issue GitHub.
  Richiede token personale; valutare se convertirlo in comando `just` o script
  `npm` per facilitare gli stakeholder.
* Workflow in `workflows/` — replicano pipeline (schema-validate, e2e,
  lighthouse, security). Confrontarli con `.github/workflows/` e migrare le
  sezioni mancanti.
* `tools/automation/evo_batch_runner.py` — orchestration script che permette di
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

* Nuovi dataset `data/external/evo/` con specie e trait normalizzati.
* Documentazione consolidata sotto `docs/evo-tactics/` e `docs/security/`.
* Workflow CI aggiornati in `.github/workflows/` e Playwright test installati.
* Report aggiornati nella directory `reports/` con link dal `README.md`.

Tenendo traccia di questi passi è possibile completare l'integrazione della
cartella senza ulteriori interventi manuali esterni.
