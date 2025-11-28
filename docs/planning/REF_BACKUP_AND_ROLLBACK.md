# REF_BACKUP_AND_ROLLBACK – Runbook archivi, manifest e rollback

Versione: 0.1
Data: 2026-02-10
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

## Stato readiness 03A/03B (2026-04-13)

- Freeze confermato fino alla chiusura 03B: nessun nuovo snapshot/restore su `incoming/**` o `docs/incoming/**` finché non viene chiuso il branch `patch/03B-incoming-cleanup` (branch di lavoro `patch/03A-core-derived` mantenuto per i controlli core/derived). Operare solo in report-only.
- Manifest attivi di riferimento (nessun nuovo upload):
  - `reports/backups/2025-11-25_freeze/manifest.txt` e `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.sha256` per snapshot/backup core, derived, incoming/docs_incoming (owner rollback: Master DD).
  - Redirect/cleanup 03B collegati ai log `reports/backups/2026-02-20_incoming_backup/README.md` e `reports/temp/patch-03B-incoming-cleanup/2026-02-20/cleanup_redirect.md` (solo reference, nessuna attivazione nuova).
- Approvazioni: via libera Master DD per l'uso dei manifest già registrato nei log di freeze 2025-11-25 e checkpoint 03B; eventuali nuovi ripristini richiedono ticket esplicito e riconferma Master DD prima dello sblocco.
