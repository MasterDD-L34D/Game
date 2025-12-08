# 02A validator rerun (report-only)

- **Modalità**: consultiva, nessuna modifica ai dataset.
- **Comandi previsti**:
  1. `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
  2. `python scripts/trait_audit.py --check`
  3. `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`
- **Output atteso**:
  - Stato `PASS` per ogni comando dopo le fix pre-03A; se emergono errori residui, elencarli con timestamp e riferimento al ticket correlato.
  - Log archiviato qui e referenziato da `docs/planning/02A_validator_report.md`.
- **Note**: esecuzione pianificata prima del gate 03A per convalida schema/trait/style.

## Rerun 2025-12-01T15:24Z (report-only)

- **Schema-only** — `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
  - Esito: PASS (0 avvisi).【F:reports/temp/02A_rerun_20251201T152424Z/schema_only.log†L1-L2】
- **Trait audit** — `python scripts/trait_audit.py --check`
  - Esito: PASS; validazione schema saltata perché `jsonschema` non è installato (warning atteso).【F:reports/temp/02A_rerun_20251201T152424Z/trait_audit.log†L1】
- **Trait style** — `node scripts/trait_style_check.js --output-json reports/temp/02A_rerun_20251201T152424Z/trait_style.json --fail-on error`
  - Esito: PASS (0 suggerimenti su 251 file).【F:reports/temp/02A_rerun_20251201T152424Z/trait_style.log†L1】

I log completi sono archiviati in `reports/temp/02A_rerun_20251201T152424Z/` e costituiscono la baseline PASS per lo sblocco merge 03A/03B.

## Rerun 2025-12-01T18:25Z (report-only)

- **Config pipeline** — `scripts/run_pipeline_cycle.sh --prepare-only` seguito da esecuzione completa con `LOG_ID=TKT-02A-VALIDATOR`.
  - Branch 03A/03B non trovati, fallback su `work`; `CYCLE_COUNT` bloccato a 1 per il rerun singolo.【F:logs/pipeline_status.log†L1-L10】
- **Esecuzione** — ciclo 1/1 completato su `work` con Kickoff 02A, freeze ufficiale, patch 03A con rerun 02A, transizione 03B e sblocco freeze.【F:logs/pipeline_status.log†L10-L23】
- **Artifact** — generato `logs/audit-bundle.tar.gz` per allegato nota di rilascio (include stato finale e audit).【F:logs/pipeline_status.log†L22-L23】

## Rerun 2025-12-01T20:37Z (report-only)

- **Schema-only** — `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
  - Esito: PASS (0 avvisi, dataset core/pack validi).【F:reports/temp/patch-03A-core-derived/rerun-2025-12-01T20-37-45Z/schema_only.log†L1-L2】
- **Trait audit** — `python scripts/trait_audit.py --check`
  - Esito: PASS; validazione schema saltata per assenza di `jsonschema` (warning atteso), nessuna regressione rispetto al report 08/12/2025.【F:reports/temp/patch-03A-core-derived/rerun-2025-12-01T20-37-45Z/trait_audit.log†L1-L2】
- **Trait style** — `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/rerun-2025-12-01T20-37-45Z/trait_style.json --fail-on error`
  - Esito: PASS (0 suggerimenti su 251 file).【F:reports/temp/patch-03A-core-derived/rerun-2025-12-01T20-37-45Z/trait_style.log†L1】

I log in formato testuale (`reports/temp/patch-03A-core-derived/rerun-2025-12-01T20-37-45Z/`) sono allegati per TKT-03A-001 e confermano l'assenza di regressioni rispetto al report del 08/12/2025. Nessun tarball è stato creato per rispettare la policy anti-binari del repository.
