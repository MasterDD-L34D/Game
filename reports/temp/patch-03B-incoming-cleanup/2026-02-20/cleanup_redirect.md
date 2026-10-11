# Cleanup/redirect 03B – checkpoint 2026-02-20

## Scope
- Branch: `patch/03B-incoming-cleanup` (report-only, nessun merge su `main`).
- Obiettivo: confermare che backup/redirect siano pronti prima dello switch e documentare il piano di ripristino.

## Stato redirect/indici
- Tabella redirect aggiornata in `incoming/REDIRECTS.md` (nessun cambiamento richiesto in questa esecuzione).
- Indice archivio confermato in `docs/incoming/archive/INDEX.md`.
- Nessun file spostato: solo verifica e logging della prontezza.

## Rischi e mitigazioni
- Rischio: disallineamento redirect ↔ backup. Mitigazione: usare manifest `incoming/archive_cold/backups/2025-11-25/manifest.sha256` e la guida in `reports/backups/2026-02-20_incoming_backup/README.md` prima di modificare percorsi.
- Rischio: validator 02A in warning per modulo jsonschema mancante. Mitigazione: mantenere modalità report-only e tracciare gli avvisi nel log smoke.

## Note operative
- Nessun nuovo artefatto binario aggiunto; redirect pronti per l’eventuale switch post-approvazione Master DD.
- Output smoke 02A associato a questa verifica è salvato nella stessa cartella (`schema_only.log`, `trait_audit.log`, `trait_style.log`, `trait_style.json`).

## Ripristino rapido redirect (post-merge fail)
- Backup di riferimento: `reports/backups/2025-11-25_freeze/manifest.txt` + `incoming/archive_cold/backups/2025-11-25/manifest.sha256` (percorsi e checksum già verificati).
- Script/changelog pronti: usare questa scheda con `incoming/REDIRECTS.md` come fonte canonica per ripristinare le entry originali; i delta core/derived hanno il rollback in `reports/temp/patch-03A-core-derived/rollback.md`.
- Procedura sintetica:
  1. Ripristina lo snapshot incoming/redirect dal manifest sopra in staging (no commit) e riallinea `incoming/REDIRECTS.md` alla versione archiviata.
  2. Riesegui i validator smoke: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` (per dipendenze incoming ↔ core/derived) e lo smoke redirect documentato in `reports/redirects/redirect-smoke-staging.json`.
  3. Registra l’esito in `logs/agent_activity.md` e nel ticket collegato prima di riaprire la finestra di merge.

## Aggiornamento 2025-12-02
- Verifica manifest: riletti `reports/backups/2025-11-25_freeze/manifest.txt` e `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt` come fonti primarie per core/derived/incoming; confermati i checksum dichiarati senza estrazioni dagli archivi.
- Smoke 02A (report-only): log aggiornati in `reports/temp/patch-03B-incoming-cleanup/2025-12-02/` (schema-only: 10 controlli pack, 0 avvisi; trait audit: schema skip per jsonschema mancante; trait style: 0 suggerimenti su 251 file). Copie canoniche nella root di cartella 03B riallineate.
- Dry-run restore: rehearsal senza estrarre archivi, replicando le istruzioni di `reports/temp/patch-03A-core-derived/rollback.md` per ripristinare eventuali redirect e core/derived correlati in staging.
- Rebase: branch 03B riallineato allo stato di `patch/03A-core-derived` post-validator per l'apertura PR verso `main` senza delta non validati.

## Aggiornamento 2026-04-27
- Verificati i manifest backup storici prima del cleanup: `reports/backups/2025-11-25_freeze/manifest.txt` e `incoming/archive_cold/backups/2025-11-25/manifest.sha256` (nessun drift rilevato).
- Confermata la tabella redirect in `incoming/REDIRECTS.md` senza nuove righe o modifiche: rimane l’archiviazione in `incoming/archive_cold/**` per bundle repo, devkit e inventari storici.
- Nessun file spostato in questo giro di cleanup; le note di triage restano allineate con `docs/incoming/archive/INDEX.md`.
- Smoke 02A rieseguito su `patch/03B-incoming-cleanup` con i log aggiornati in questa directory (schema/trait/style) per supportare la chiusura del freeze con approvazione Master DD.

## Aggiornamento 2026-05-01
- Checkpoint pre-cleanup: riconfermati i manifest `reports/backups/2025-11-25_freeze/manifest.txt` e `incoming/archive_cold/backups/2025-11-25/manifest.sha256` come fonte unica di backup/redirect.
- Nessun nuovo spostamento di file: la tabella `incoming/REDIRECTS.md` resta invariata e punta all’archiviazione fredda esistente.
- Smoke 02A (schema-only) rieseguito in report-only: log `schema_only_2026-05-01_smoke.log` (14 controlli, 3 avvisi pack, nessun errore) salvato in questa directory.
- Freeze 03B chiuso a log con firma Master DD: cleanup solo documentale e redirect confermati senza variazioni.

## Aggiornamento 2026-05-02
- Nessun elemento spostato o archiviato: redirect invariati rispetto al checkpoint precedente e ancora allineati all’indice `incoming/REDIRECTS.md`.
- Confermati come fonti i manifest `reports/backups/2025-11-25_freeze/manifest.txt` e `incoming/archive_cold/backups/2025-11-25/manifest.sha256` insieme al README `reports/backups/2026-02-20_incoming_backup/README.md`.
- Smoke 02A schema-only rieseguito post-merge: log `schema_only_2026-05-02_smoke.log` (14 controlli, 3 avvisi pack) salvato in questa directory con checksum testuale.
- Freeze 03B chiuso con firma Master DD: finestra operativa terminata senza modifiche a redirect o backup.

## Aggiornamento 2026-07-26
- Cleanup/redirect pianificato rieseguito in report-only su `patch/03B-incoming-cleanup`: nessun nuovo spostamento; tabella `incoming/REDIRECTS.md` e indici di archivio confermati sui manifest `reports/backups/2025-11-25_freeze/manifest.txt` e `incoming/archive_cold/backups/2025-11-25/manifest.sha256`.
- Smoke 02A schema-only rilanciato con il comando `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`; log aggiornato in `reports/temp/patch-03B-incoming-cleanup/schema_only.log` (10 controlli, 0 avvisi) per la finestra di cleanup.
- Firma Master DD registrata per la chiusura del giro di cleanup/redirect senza variazioni ai percorsi o ai backup di riferimento.
