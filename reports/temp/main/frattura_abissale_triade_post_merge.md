# Triade Frattura Abissale – post-merge `main` (2025-12-03)

## Scope
- Chiusura post-merge su `main` della triade di validator Frattura Abissale Sinaptica.
- Sintesi delle esecuzioni PASS, dei log canonici e dei riferimenti di backup/restore.

## Log esecuzioni (PASS)
- `reports/temp/main/frattura_abissale_pipeline_20251203T031847Z.log` – schema/coerenza, trait style, evaluate e sync dry-run in PASS.
- `reports/temp/main/frattura_abissale_pipeline_20251203T032252Z.log` – rerun di conferma in PASS sugli stessi step.
- Riferimenti di origine patch per la triade: `reports/temp/patch-03A-core-derived/frattura_abissale_pipeline_20251203T031825Z.log`, `reports/temp/patch-03A-core-derived/frattura_abissale_pipeline_20251203T032241Z.log` (mirror su 03B) e log di triade sequenziale `reports/temp/patch-03A-core-derived/frattura_abissale_triade_20251203T030508Z.log` (pre-fix, usato come baseline storica).

## Handoff backup/restore
- Manifest di backup: `reports/backups/2025-11-25_freeze/manifest.txt` e `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt` (core/derived/incoming + snapshot intermedi Master DD).
- Prove documentate di restore/dry-run: `reports/audit/2025-12-02_frattura_abissale_validators.md` (branch `backup/2025-11-25/20251202T013259Z` con checkout/restore dry-run) e `reports/audit/2025-12-02_frattura_abissale_validators_rerun.md` (rerun validator con sblocco triade).

## Rollback rapido
1. `git checkout backup/2025-11-25/20251202T013259Z -- data/core data/derived incoming docs/incoming` (ripristino git-only su snapshot confermato).
2. Estrarre gli archivi da manifest: `tar -xzf core_snapshot_2025-11-25.tar.gz -C /workspace/Game --overwrite` e `tar -xzf derived_snapshot_2025-11-25.tar.gz -C /workspace/Game --overwrite` (ripetere per incoming/docs_incoming se necessario).
3. Validare dopo il ripristino: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`, `node scripts/trait_style_check.js --fail-on error` e `bash scripts/qa/run_frattura_abissale_pipeline.sh` in modalità report-only.

## Note
- Esiti PASS confermati con owner `archivist` e approvatore Master DD per la chiusura triade su `main`.
- Artefatti di audit collegati: vedi bundle `reports/audit/2025-12-02_frattura_abissale_validators.md` e rerun `reports/audit/2025-12-02_frattura_abissale_validators_rerun.md`.
