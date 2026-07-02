# 2025-12-02 – Validator Frattura Abissale e verifica backup

## Scope
- Triade validator/smoke per il pacchetto Frattura Abissale Sinaptica in tre fasi: pre-merge, post-rebase, post-merge.
- Verifica del branch snapshot `backup/2025-11-25/20251202T013259Z` e lettura manifest di riferimento.

## Esecuzioni validator
- Script: `bash scripts/qa/run_frattura_abissale_pipeline.sh` (comprende `scripts/qa/frattura_abissale_validations.py`, `npm run style:check`, `tools/traits/evaluate_internal.py`, `tools/traits/sync_missing_index.py` in dry-run).
- Pre-merge: PASS (tutti i check OK, trait style 0 errori/warning/info; gap report presente → evaluate + sync in dry-run senza aggiunte).
- Post-rebase: PASS (stessa triade in PASS).
- Post-merge: PASS (stessa triade in PASS).

## Backup / restore dry-run
- Creato branch `backup/2025-11-25/20251202T013259Z` puntato all’HEAD corrente; switch in/out riuscito (restore dry-run su snapshot Git OK).
- Manifest di riferimento verificato: `reports/backups/2025-11-25_freeze/manifest.txt` (core/derived/incoming/docs_incoming con SHA e location S3) letto per conferma checksum/storage.

## Note
- Nessun file modificato dai validator; output temporanei generati in `/tmp/frattura_abissale_traits_eval.{json,csv}`.
- Nessun redirect/cleanup eseguito; scope limitato a validazioni e verifica backup.
