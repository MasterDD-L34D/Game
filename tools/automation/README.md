# Automazione Evo-Tactics

Questo spazio è riservato agli script che verranno spostati dal pacchetto
`incoming/lavoro_da_classificare/scripts/`. Gli script dovranno rispettare le
linee guida esistenti nel repository (licenza SPDX, permessi `+x` quando
necessario, lint con `ruff`/`eslint`).

## Step di preparazione

1. Trasferire gli script mantenendo la distinzione tra shell e Python.
2. Aggiornare i path interni per puntare alle nuove directory (`data/external/evo`).
3. Integrare i nuovi target nel `Makefile` (`evo-validate`, `evo-backlog`).
4. Documentare eventuali dipendenze aggiuntive in `docs/tooling/evo.md`.

Finché gli script non vengono migrati, utilizzare questa cartella come segnaposto
per evitare conflitti di merge.
