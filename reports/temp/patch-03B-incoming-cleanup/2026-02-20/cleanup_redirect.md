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
