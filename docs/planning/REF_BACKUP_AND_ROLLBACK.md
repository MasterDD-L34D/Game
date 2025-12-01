# REF_BACKUP_AND_ROLLBACK – Runbook archivi, manifest e rollback

Versione: 0.2
Data: 2025-12-01
Owner: dev-tooling (con supporto archivist)
Stato: operativo

## Dove caricare gli archivi

1. Genera gli snapshot/backup fuori repo (es. export core/pack) e **non copiarli** in `reports/backups/**`.
2. Carica gli archivi nel bucket esterno mantenendo la struttura logica `reports/backups/<label>/` (es. `s3://evo-backups/game/<label>/...`).
3. Per ogni upload annota subito il percorso completo e il checksum (usando `sha256sum <file>`).
4. Evita di committare file binari: in repo va solo la traccia testuale.

## Come registrare i manifest

1. Crea/aggiorna `reports/backups/<label>/manifest.txt` con un blocco per archivio includendo i campi:
   - `Archive`, `SHA256`, `Location`, `On-call`, `Last verified`.
2. Mantieni l'ordine degli artefatti coerente con il planning corrispondente.
3. Riporta note e verifiche incrociate anche in `logs/agent_activity.md` o nel ticket associato.
4. Se il manifest vive in una nuova cartella `reports/backups/<label>/`, aggiungi un breve README (testuale) che rimandi a questo runbook.

## Cosa fare per un rollback

1. Individua il manifest della finestra temporale corretta in `reports/backups/<label>/` e recupera gli URL dal campo `Location`.
2. Scarica gli archivi in workspace temporaneo e verifica il checksum (`sha256sum -c manifest.txt`).
3. Applica il restore solo in sandbox/staging, seguendo le note operative collegate (es. ripristino pack o dataset) e senza committare gli artefatti.
4. Dopo il ripristino aggiorna `Last verified` nel manifest, registra l'azione in `logs/agent_activity.md` e allega l'esito (pass/fail) nel ticket di incidente.

## Controlli automatici

- Il pre-commit blocca nuovi binari sotto `reports/backups/**` e suggerisce di spostarli off-repo e committare solo il manifest.
- In caso di necessità di commit temporanei, richiedere un'eccezione documentata al maintainer e allegare il piano di ripulitura.

## Stato readiness 03A/03B (finestra freeze 2025-11-29 → 2025-12-07)

- Freeze confermato sui branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup` fino alla chiusura 03B: nessun nuovo snapshot/restore su `incoming/**` o `docs/incoming/**` oltre ai checkpoint 2025. Operare solo in report-only finché non viene loggata l'uscita dal freeze.
- Manifest di riferimento (attivi per rollback 03A/03B):
  - `reports/backups/2025-11-25_freeze/manifest.txt` (snapshot S3 core/derived/incoming/docs_incoming) e `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt` (snapshot locale dry-run 03A/03B) come baseline principali.
  - Manifest firmati Master DD: `reports/backups/2025-11-25T1500Z_freeze/manifest.txt`, `reports/backups/2025-11-25T1724Z_masterdd_freeze/manifest.txt` e `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt` (+ `manifest.sha256`). Usarli per verifiche incrociate prima di ogni restore.
- Log di freeze e checkpoint: registrazioni 2025 su `logs/agent_activity.md` (freeze 03A/03B e rerun 02A) e bundle di audit `reports/audit/2025-04-08_audit_bundle.md` (rerun 02A, changelog/rollback 03A e istruzioni redirect 03B). I percorsi 2026 (es. `reports/backups/2026-02-20_incoming_backup/README.md`) restano **storici** e non vanno riattivati senza nuovo ticket.

### Nota di delta (backup/restore autorizzati fino alla chiusura 03B 2025)

- Ammessi solo restore/dry-run basati sui manifest 2025 sopra elencati; nessun nuovo upload in `reports/backups/**` durante il freeze 03A/03B.
- Ogni verifica o ripristino deve essere loggato in `logs/agent_activity.md` con il formato sintetico `[FREEZE-03A03B-<timestampZ>] owner=<agente> (approvatore Master DD); files=<manifest/percorsi usati>; rischio=<basso/medio/alto>; note=<esito checksum o dry-run>`, includendo il riferimento al manifest specifico.
- In caso di nuovi check, aggiungere ticket/approvazione Master DD nel log e aggiornare il campo `Last verified` nel manifest corrispondente solo dopo verifica riuscita.
