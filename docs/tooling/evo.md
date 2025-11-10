# Tooling Evo

Questa pagina descrive i flussi di lavoro disponibili per supportare le attività
Evo-Tactics nel repository.

## Runner dei batch

- Script: `python tools/automation/evo_batch_runner.py`
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

L'output operativo viene inviato su stderr tramite il logger condiviso
`tools.automation.evo_batch_runner`, mentre gli elenchi e i piani restano su
stdout per facilitare piping/reportistica.

## Lint degli schemi JSON

- Script: `python tools/automation/evo_schema_lint.py [percorso]`
- Obiettivo: validare la struttura degli schemi JSON Evo utilizzando le stesse
  regole del batch runner.
- Comportamento:
  - Cerca ricorsivamente i file `.json` nella directory indicata (default
    `schemas/evo`).
  - Esegue `jsonschema.validator_for` con un archivio condiviso di documenti per
    risolvere i riferimenti locali.
  - Riporta i risultati con gli indicatori ✅/❌ sul logger
    `tools.automation.evo_schema_lint` (usare `--verbose` per il debug).

Il comando è disponibile anche tramite `make evo-lint` (supporta la variabile
`path=<percorso>` per restringere il controllo a un sottoinsieme di file).

## Make target di supporto

I flussi di lavoro descritti sono esposti nel `Makefile` tramite:

- `make evo-plan batch=<nome>`: mostra il piano del batch specificato.
- `make evo-run batch=<nome> flags="--execute --auto"`: esegue i comandi con le
  opzioni desiderate.
- `make evo-lint [path=...]`: lancia il lint sugli schemi.

I target legacy `evo-batch-plan` ed `evo-batch-run` restano disponibili come
alias per compatibilità (internamente delegano alle nuove ricette).
