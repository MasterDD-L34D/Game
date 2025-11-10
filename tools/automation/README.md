# Automazione Evo-Tactics

Questo spazio è riservato agli script che verranno spostati dal pacchetto
`incoming/lavoro_da_classificare/scripts/`. Gli script dovranno rispettare le
linee guida esistenti nel repository (licenza SPDX, permessi `+x` quando
necessario, lint con `ruff`/`eslint`).

## Runner dei batch

Il comando `tools/automation/evo_batch_runner.py` permette di pianificare o
eseguire automaticamente i comandi registrati in
`incoming/lavoro_da_classificare/tasks.yml`.

```bash
# Elencare i batch disponibili
python tools/automation/evo_batch_runner.py list

# Visualizzare i task del batch `documentation`
python tools/automation/evo_batch_runner.py plan --batch documentation

# Eseguire (o fare dry-run) dei comandi associati al batch
python tools/automation/evo_batch_runner.py run --batch data-models --execute
```

I comandi che contengono placeholder (`<...>`) vengono saltati e marcati come
interventi manuali. Per evitare che un singolo fallimento interrompa l'intero
batch, è possibile passare `--ignore-errors`.

## Step di preparazione

1. Trasferire gli script mantenendo la distinzione tra shell e Python.
2. Aggiornare i path interni per puntare alle nuove directory (`data/external/evo`).
3. Integrare i nuovi target nel `Makefile` (`evo-validate`, `evo-backlog`).
4. Documentare eventuali dipendenze aggiuntive in `docs/tooling/evo.md`.

Finché gli script non vengono migrati, utilizzare questa cartella come
segnaposto per evitare conflitti di merge.
