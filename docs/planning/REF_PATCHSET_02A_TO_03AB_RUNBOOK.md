# PATCHSET-02A → 03A/03B – Runbook operativo

Versione: 0.1
Data: 2026-02-13
Owner: **Master DD (approvatore umano)** con agente coordinator (supporto: dev-tooling, archivist, species/trait-curator)
Stato: PIANO ESECUTIVO – sequenza operativa dal baseline 02A al rollout 03A/03B

## Contesto

- Baseline 02A in modalità report-only già acquisita su branch `work` (vedi `docs/planning/02A_validator_report.md`).
- Freeze fase 3→4 e branch dedicati `patch/03A-core-derived`, `patch/03B-incoming-cleanup` registrati in `logs/agent_activity.md` (2026-02-11).
- Obiettivo: preparare l’esecuzione coordinata di 03A (patch core/derived) e 03B (pulizia incoming) mantenendo validator in report-only finché non arriva via libera Master DD.

## Sequenza rapida

1. **Rieseguire 02A in report-only sul branch 03A**
   - Branch: `patch/03A-core-derived`.
   - Comandi: riutilizza checklist di `02A_validator_report.md` (schema-only, trait audit, trait style check) con output solo su log temporanei.
   - Deliverable: log in `logs/agent_activity.md` con esito e link ai report temporanei.

2. **Aprire/riconfermare freeze fase 3→4**
   - Scope: blocco merge non urgenti su `core/**`, `derived/**`, `incoming/**`, `docs/incoming/**` durante 03A/03B.
   - Prerequisiti: approvazione Master DD pre-freeze, snapshot core/derived + backup incoming etichettato.
   - Procedura standard:
     1. Registrare finestra freeze e owner (coordinator + archivist) in `logs/agent_activity.md` con timestamp UTC.
     2. Allegare percorsi snapshot `data/core/**` e `data/derived/**`, branch `patch/03A-core-derived`, checksum e storage.
     3. Allegare backup `incoming/**` e `docs/incoming/**` con manifest e branch `patch/03B-incoming-cleanup` associato.
     4. Indicare responsabile rollback (coordinator) e verifica archivist sul ripristino.
   - Deliverable: entry log con finestra freeze, percorsi snapshot/backup e responsabili rollback.

3. **Esecuzione 03A – patch core/derived**
   - Branch: `patch/03A-core-derived`; owner coordinator con species/trait-curator + balancer.
   - Attività chiave: applicare patch minime per coprire errori evidenziati da 02A (schema biomi, sinergie trait, i18n/stile) generando changelog e script di rollback.
   - Gate di uscita: validator 02A in pass (report-only), changelog+rollback pubblicati, approvazione Master DD registrata.

4. **Transizione verso 03B**
   - Checkpoint: backup/snapshot `incoming/**` confermato leggibile; redirect e indicizzazioni preparati in bozza.
   - Loggare in `logs/agent_activity.md` il punto di stato con riferimento ai file di backup e ai redirect proposti.

5. **Esecuzione 03B – pulizia incoming/archivio**
   - Branch: `patch/03B-incoming-cleanup`; owner archivist con asset-prep.
   - Attività chiave: rimozione/spostamento elementi incoming con tag di archiviazione e redirect verificati; nessun touch su core/derived.
   - Gate di uscita: validator 02A (smoke) rieseguito post-merge, checklist post-pulizia archiviata, approvazione Master DD per lo sblocco freeze.

6. **Chiusura e sblocco freeze**
   - Condizioni: validator 02A (smoke) ok, redirect/link verificati, log completato.
   - Checklist di chiusura (dry-run rollback):
     - Eseguire dry-run di rollback 03A su copia snapshot core/derived e loggare esito.
     - Eseguire dry-run di ripristino backup incoming/redirect e loggare esito.
     - Validare che i branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup` siano puliti da change locali non loggati.
   - Aggiornare `logs/agent_activity.md` con via libera Master DD e stato freeze chiuso, includendo timestamp e owner.
   - Registrare l’approvazione finale di Master DD (firma) come gate di uscita del freeze fase 3→4.

## Checklist operative per ogni passo

- **Log obbligatorio prima/dopo:** ID step, owner, branch, file toccati, rischi, ticket. Nessuna modifica ai README senza log precedente.
- **Backup/Snapshot:** percorsi e timestamp da riportare nel log; backup incoming richiesto prima di qualsiasi rimozione/redirect.
- **Approvals:** Master DD approva freeze, merge 03A, avvio 03B e uscita freeze; includere riferimento a ticket/patchset.
- **Validator:** mantenere modalità report-only fino al via libera per rollout; allegare output sintetico nel log e collegare ai comandi usati.
- **Rollback:** indicare script/percorso di rollback per 03A; per 03B, percorso backup incoming + istruzioni di ripristino redirect.

## Audit bundle e riavvio

- Conservare il pacchetto di audit in `reports/audit/2026-02-20_audit_bundle.md`, che aggrega log freeze/sblocco, report 02A (baseline e smoke post-merge), changelog/rollback 03A e istruzioni backup/redirect 03B.
- Usare il bundle come checkpoint per il ciclo successivo: completare il log di sblocco, rieseguire PIPELINE_SIMULATOR sulla sequenza 02A→freeze→03A→03B e aggiornare eventuali whitelist 02A prima di nuovi patchset.

## Rischi e mitigazioni rapide

- **Freeze non formalizzato:** rischio ingressi non tracciati → non avviare patch senza log di freeze approvato.
- **Validator instabile:** falsi positivi 02A possono bloccare merge → documentare whitelist temporanee e rieseguire prima/dopo 03A.
- **Link/redirect incompleti:** pulizia incoming senza redirect porta orfani → predisporre check automatico e smoke 02A su link/redirect.
- **Rollback non testato:** snapshot/backup senza percorso chiaro rendono irreversibile il cleanup → salvare path e testare ripristino su copia.

## Collegamenti

- Sequenza e trigger di fase: `docs/planning/REF_REPO_MIGRATION_PLAN.md` (sezioni 02A–03B e freeze fase 3→4).
- Baseline validator: `docs/planning/02A_validator_report.md`.
- Log operativo e freeze: `logs/agent_activity.md` (entry 2026-02-10, 2026-02-11).
