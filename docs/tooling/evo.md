# Tooling Evo

Questa pagina descrive i flussi di lavoro disponibili per supportare le attività
Evo-Tactics nel repository.

## Logging condiviso

Gli script in `tools/automation/` utilizzano un namespace comune per il logging
(`tools.automation`).  Il modulo di supporto espone l'helper
`tools.automation.configure_logging(verbose=..., logger=...)` che inizializza il
root logger con un formatter minimale e imposta il livello del logger passato.
Per ottenere un'istanza coerente è sufficiente dichiarare `LOGGER =
get_logger(__name__)`, che garantisce un nome uniforme anche quando lo script è
eseguito stand-alone. Tutte le utility riportate di seguito seguono questo
pattern e scrivono messaggi di stato/errore su stderr. Entrambi i tool espongono
un'opzione `--verbose` coerente, utile per esaminare i dettagli delle operazioni
(lo stesso flag può essere forzato nei target `make` tramite
`EVO_VERBOSE=true`).

## Runner dei batch

- Script: `python -m tools.automation.evo_batch_runner`
- Obiettivo: pianificare o eseguire i comandi registrati in
  `incoming/lavoro_da_classificare/tasks.yml`.
- Opzioni principali:
  - `list` per visualizzare i batch disponibili.
  - `plan --batch <nome>` per riepilogare i task (dry-run).
  - `run --batch <nome>` per eseguire i comandi (di default in dry-run; usare
    `--execute` per lanciarli, `--auto` per bypassare gli stati bloccanti,
    `--ignore-errors` per proseguire anche se un comando fallisce).
  - `--tasks-file` consente di puntare a un registro alternativo, mentre
    `--verbose` abilita il logging esteso.

L'output operativo viene inviato su stderr tramite il logger condiviso,
mentre gli elenchi e i piani restano su stdout per facilitare
piping/reportistica.

## Lint degli schemi JSON

- Script: `python -m tools.automation.evo_schema_lint [percorso]`
- Obiettivo: validare la struttura degli schemi JSON Evo utilizzando le stesse
  regole del batch runner.
- Comportamento:
  - Cerca ricorsivamente i file `.json` nella directory indicata (default
    `schemas/evo`).
  - Esegue `jsonschema.validator_for` con un archivio condiviso di documenti per
    risolvere i riferimenti locali.
  - Riporta i risultati con gli indicatori ✅/❌ sul logger
    `tools.automation.evo_schema_lint` (usare `--verbose` per il debug).

Il comando è disponibile anche tramite `make evo-lint` (variabili opzionali
`EVO_LINT_PATH=<percorso>` e `EVO_TASKS_FILE=<file>` per adattare l'ambiente).

## Validazione dei pacchetti incoming

- Script: `incoming/scripts/validate.sh`
- Obiettivo: eseguire la validazione AJV dei trait e delle specie provenienti
  dai drop `incoming/`.
- Variabili supportate:
  - `AJV` o `EVO_VALIDATE_AJV`: comando AJV da utilizzare (default `ajv`).
  - `EVO_TEMPLATES_DIR`: directory degli schemi (default
    `incoming/templates`).
  - `EVO_TRAITS_DIR`: directory dei trait JSON (default `incoming/traits`).
  - `EVO_SPECIES_DIR`: directory delle specie JSON (default `incoming/species`).
- Output: messaggi di stato su stdout/stderr; interruzione immediata in caso di
  errori di validazione. File mancanti producono un warning non bloccante.
- Target Makefile: `make evo-validate` propaga automaticamente le variabili di
  default, consentendo override (ad esempio
  `make evo-validate EVO_TRAITS_DIR=data/external/evo/traits`).

## Automazione backlog GitHub

- Script: `incoming/scripts/setup_backlog.py`
- Obiettivo: creare un project board e popolare le colonne/issue leggendo un
  file YAML.
- Variabili richieste:
  - `GITHUB_TOKEN`: token con permessi `repo` e `project`.
  - `EVO_BACKLOG_REPO`/`REPO`: repository di destinazione (`org/repo`).
  - `EVO_BACKLOG_FILE`/`BACKLOG_FILE`: percorso del backlog YAML.
- File YAML atteso: chiavi `project_name`, `columns` e `issues` (con titolo,
  body, label opzionali e colonna di destinazione).
- Target Makefile: `make evo-backlog EVO_BACKLOG_REPO=org/repo \
  EVO_BACKLOG_FILE=backlog.yaml` che reindirizza le variabili richieste allo
  script.

## Revisione dei trait

- Script: `incoming/scripts/trait_review.py`
- Obiettivo: produrre report CSV del glossario (modalità legacy) oppure
  generare un confronto con un set di trait in ingresso.
- Opzioni principali:
  - `--glossary` e `--outdir` per la modalità legacy.
  - `--input`, `--baseline` e `--out` per confrontare cartelle incoming con il
    glossario di riferimento.
- Target Makefile: `make traits-review` esegue la modalità legacy
  (`TRAITS_REVIEW_GLOSSARY`, `TRAITS_REVIEW_OUTDIR` sovrascrivibili). Passando
  `TRAITS_REVIEW_INPUT=/path TRAITS_REVIEW_OUT=report.csv` il target commuta
  automaticamente in modalità confronto.

## Make target di supporto

I flussi di lavoro descritti sono esposti nel `Makefile` tramite:

- `make evo-help`: riepilogo rapido dei target disponibili e delle variabili
  supportate.
- `make evo-list`: elenca i batch disponibili (variabile `EVO_TASKS_FILE`
  opzionale per puntare a un file alternativo).
- `make evo-plan EVO_BATCH=<nome>`: mostra il piano del batch specificato.
- `make evo-run EVO_BATCH=<nome> EVO_FLAGS="--execute --auto"`: esegue i
  comandi con le opzioni desiderate; usare `EVO_VERBOSE=true` per abilitare il
  logging esteso.
- `make evo-lint [EVO_LINT_PATH=...]`: lancia il lint sugli schemi
  (percorso personalizzabile).
- `make evo-validate [EVO_TRAITS_DIR=... EVO_SPECIES_DIR=...]`: valida i JSON
  incoming con AJV.
- `make evo-backlog EVO_BACKLOG_REPO=<org/repo> EVO_BACKLOG_FILE=<file.yaml>`:
  crea board e issue GitHub a partire dal backlog YAML.
- `make traits-review [TRAITS_REVIEW_INPUT=... TRAITS_REVIEW_OUT=...]`:
  genera report legacy o CSV di confronto dei trait.

Le variabili condivise `EVO_BATCH`, `EVO_FLAGS` ed `EVO_TASKS_FILE` sono
propagate anche nei target alias `evo-batch-plan` ed `evo-batch-run` per
compatibilità.

## Site audit

Per verificare la pubblicazione è disponibile la suite `ops/site-audit`, che
integra gli script ereditati tramite l'orchestratore
`python ops/site-audit/run_suite.py`. Il target `make audit` utilizza la suite
passando automaticamente `SITE_BASE_URL` (se definita) e replica la sequenza di
controlli usata in CI: sitemap, search index, redirect, link checker, report e
structured data. Sono disponibili variabili di tuning (`SITE_AUDIT_MAX_PAGES`,
`SITE_AUDIT_TIMEOUT`, `SITE_AUDIT_CONCURRENCY`) per adattare il crawling alle
esigenze locali o CI. Gli artefatti sono raccolti in `ops/site-audit/_out/`.

Quando `SITE_BASE_URL` non è impostata, gli step che richiedono lo scraping del
sito vengono saltati ma gli output generati localmente restano disponibili.
