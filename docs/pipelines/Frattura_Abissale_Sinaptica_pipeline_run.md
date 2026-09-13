---
title: 'Frattura Abissale Sinaptica – Pipeline di validazione esecutiva'
description: 'Sequenza automatizzata derivata dal report finale/exec plan per eseguire controlli schema, coerenza trait/specie/bioma e tool trait.'
---

## Contesto

- Fonte: `docs/reports/Frattura_Abissale_Sinaptica_archivist_final.md` e `docs/pipelines/Frattura_Abissale_Sinaptica_execution_plan.md`.
- Obiettivo: fornire un run unico che esegue, in ordine, gli step di validazione e tooling per il pacchetto Frattura Abissale Sinaptica, senza scrivere dati.

## Comandi orchestrati

1. `python scripts/qa/frattura_abissale_validations.py` – check schema biomi/specie, presenza pool e trait temporanei, coerenza trait_plan/affinity.
2. `npm run style:check` – enforce naming/slot/style per i trait (può fallire su debito tecnico storico).
3. `python tools/traits/evaluate_internal.py --gap-report … --output /tmp/...` – eseguito solo se presente `reports/evo/rollout/traits_gap.csv`.
4. `python tools/traits/sync_missing_index.py --dry-run --source …` – eseguito solo se presente `reports/evo/rollout/traits_gap.csv`.

## Esecuzione

Eseguire dalla root del repo:

```bash
scripts/qa/run_frattura_abissale_pipeline.sh
```

Il comando fallisce al primo errore critico di ciascun step ma continua a eseguire la sequenza; il codice di uscita finale restituisce il primo errore incontrato (al momento lo style check). Tutti i passi girano in modalità read-only/dry-run; gli output dei tool trait vengono indirizzati a `/tmp`.

### Risultato ultimo run

- ✅ Validazioni schema/coerenza (script python dedicato).
- ✅ `npm run style:check` (nessun suggerimento: debito tecnico legacy azzerato in questo pacchetto).
- ✅ `evaluate_internal` / `sync_missing_index` eseguiti (read-only, nessuna anomalia); output salvati in `reports/evo/rollout/frattura_abissale_traits_eval.{csv,json}`.

## Note operative

- Il pipeline si basa sui dataset già applicati dalla patch Frattura Abissale; non crea/modifica file.
- Per un pacchetto completo CI, concatenare dopo il run: `npm run lint:stack && npm run test:stack`.
- In caso di modifiche future ai trait, aggiornare la lista di slugs in `scripts/qa/frattura_abissale_validations.py`.
- Classificazione issue: nessun blocco per il pacchetto Frattura Abissale; nessun residuo di debito storico sui trait valutati in questo run.
