---
title: Stato QA – EVO
doc_status: generated
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---
# Stato QA – EVO

## Validazione specie incoming

- Comando: `AJV=./node_modules/.bin/ajv incoming/scripts/validate.sh`
- Esito: validati con successo tutti i 10 JSON specie in `incoming/species/` rispetto a `incoming/templates/species.schema.json`.
- Note: nessun file trait presente in `incoming/traits/`, il che ha prodotto solo un avviso informativo dal validatore.
- Output sintetico: `✅ Validazione completata`

## Verifica collegamenti documentazione

- Comando: `npm run docs:lint`
- Esito: `tools/check_site_links.py` non ha rilevato collegamenti interni rotti nella directory `docs/`.
- Azioni residue: nessuna.
