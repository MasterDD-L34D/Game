# 2025-12-02 – Rerun validator Frattura Abissale (03A/03B)

## Contesto
- Richiesta: riesecuzione dei comandi `CHECK_SCHEMA_E_SLUG_FRATTURA_ABISSALE`, `CHECK_COHERENZA_TRAIT_SPECIE_BIOMA_FRATTURA_ABISSALE` e `CHECK_TEST_E_PIPELINE_FRATTURA_ABISSALE` sui branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup`.
- Script: `bash scripts/qa/run_frattura_abissale_pipeline.sh` (include `scripts/qa/frattura_abissale_validations.py`, `npm run style:check`, `tools/traits/evaluate_internal.py`, `tools/traits/sync_missing_index.py` in dry-run).
- Timestamp esecuzione: 2025-12-02T11:07Z (UTC). Owner: dev-tooling.

## Risultati
### patch/03A-core-derived
- Esito: **FAIL** – validazione schema/coerenza termina con errore "Specie polpo-araldo-sinaptico mancante" (exit 1).
- Trait style / evaluate / index sync: PASS (0 suggerimenti, nessuna modifica generata; evaluate e sync in sola lettura/dry-run).
- Log: `reports/temp/patch-03A-core-derived/frattura_abissale_pipeline_20251202T1107Z.log`.

### patch/03B-incoming-cleanup
- Esito: **FAIL** – stessa anomalia: "Specie polpo-araldo-sinaptico mancante" nei check di schema/coerenza (exit 1).
- Trait style / evaluate / index sync: PASS (0 suggerimenti, nessuna modifica generata; evaluate e sync in sola lettura/dry-run).
- Log: `reports/temp/patch-03B-incoming-cleanup/frattura_abissale_pipeline_20251202T1107Z.log`.

## Stato
- Stato complessivo: **Blocked** su entrambe le linee 03A/03B finché la specie `polpo-araldo-sinaptico` non viene ripristinata e i tre validator tornano in PASS.
- Nessuna modifica a dati o manifest; output temporanei in `/tmp/frattura_abissale_traits_eval.{json,csv}` da eliminare se non servono.

---

## Aggiornamento 2025-12-02T11:21Z (UTC) – Riesecuzione post-fix (owner: dev-tooling)

- Comandi rieseguiti: `CHECK_SCHEMA_E_SLUG_FRATTURA_ABISSALE`, `CHECK_COHERENZA_TRAIT_SPECIE_BIOMA_FRATTURA_ABISSALE`, `CHECK_TEST_E_PIPELINE_FRATTURA_ABISSALE` tramite `bash scripts/qa/run_frattura_abissale_pipeline.sh`.

### patch/03A-core-derived
- Esito: **PASS** – validazioni schema/coerenza OK; trait style senza suggerimenti; evaluate/index sync in sola lettura senza delta.
- Log: `reports/temp/patch-03A-core-derived/frattura_abissale_pipeline_20251202T112146Z.log`.

### patch/03B-incoming-cleanup
- Esito: **PASS** – stessi risultati di 03A (tutti i passaggi verdi, nessuna modifica dati generata).
- Log: `reports/temp/patch-03B-incoming-cleanup/frattura_abissale_pipeline_20251202T112146Z.log`.

## Stato aggiornato
- Stato complessivo: **Unblocked** per la triade di validator su 03A/03B dopo l’allineamento slug; nessun fallimento residuo.
- Output temporanei in `/tmp/frattura_abissale_traits_eval.{json,csv}` da pulire se non necessari.
