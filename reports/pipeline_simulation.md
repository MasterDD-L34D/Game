# Pipeline 02A→Freeze→03A→Transizione→03B→Sblocco

Questa sintesi documenta la sequenza richiesta per PIPELINE_SIMULATOR, la variante ottimizzata con PIPELINE_OPTIMIZER e il piano batch/gate di PIPELINE_EXECUTOR. Le indicazioni rispettano la modalità report-only dove previsto e mantengono i gate serializzati per le approvazioni Master DD.

## PIPELINE_SIMULATOR (strict-mode, step 1→6)
1. **02A — validator report-only su `patch/03A-core-derived`**  
   - Esegui schema-only, trait audit e style audit.  
   - Registra log locale con ID `TKT-02A-VALIDATOR`, includendo whitelist temporanee (se servono) e archiviando output temporanei.  
   - Dipendenze: branch disponibile.  
   - Rischio: medio (difformità schema).

2. **Freeze 3→4 — apertura/riconferma**  
   - Crea log del freeze con ID/owner/branch/file toccati/rischi/ticket/comandi.  
   - Registra approvazione Master DD, esegui snapshot/backup e tracciali.  
   - Dipendenze: report 02A a supporto.  
   - Rischio: medio-alto (blocco release).

3. **03A — patch core/derived**  
   - Applica patch minime, produci changelog e pacchetto di rollback legato allo snapshot.  
   - Richiedi approvazione Master DD per il merge.  
   - Dipendenze: freeze attivo, snapshot registrato, esito 02A.  
   - Rischio: medio (alterazione dataset core/derived).

4. **Transizione verso 03B**  
   - Checkpoint con backup/redirect pronti, piano di switch documentato.  
   - Conferma superamento gate di uscita 03A e approvazione Master DD.  
   - Rischio: basso-medio.

5. **03B — cleanup + redirect**  
   - Pulizia branch `patch/03B-incoming-cleanup`, verifica redirect e backup incoming con istruzioni di ripristino.  
   - Esegui smoke 02A post-merge in report-only.  
   - Dipendenze: transizione ok, backup/redirect preparati.  
   - Rischio: medio (disallineamento redirect).

6. **Sblocco freeze**  
   - Log di chiusura con riferimenti ad approvazione Master DD e smoke 02A positivo.  
   - Aggiorna README solo dopo il log, quindi trigger di riavvio ciclo.  
   - Dipendenze: smoke 02A ok e approvazione finale.  
   - Rischio: basso.

**Output attesi**: report 02A (+ whitelist), log freeze + backup/snapshot, patch 03A con changelog/rollback, checkpoint transizione, report cleanup/redirect + smoke 02A, log sblocco freeze.

## PIPELINE_OPTIMIZER (preparazioni in parallelo)
- **Step 1: 02A report-only** su `patch/03A-core-derived` come baseline qualità.
- **Step 2 in parallelo con 02A**: raccogli approvazioni Master DD in bozza; predisponi snapshot/backup core/derived in staging (non attivati); prepara redirect plan.
- **Step 3: Freeze 3→4** con attivazione backup e log ufficiale.
- **Step 4: 03A patch** con changelog/rollback legati allo snapshot; richiedi approvazione Master DD per il merge.  
- **Step 5: Transizione verso 03B** (verifica pre-redirect, backup confermati).  
- **Step 6: 03B cleanup/redirect** su `patch/03B-incoming-cleanup` + smoke 02A post-merge in report-only.  
- **Step 7: Sblocco freeze** dopo smoke 02A ok e approvazione finale Master DD.

**Parallelo consentito**: solo preparazioni (approvazioni draft, backup in staging, redirect plan). Tutti i gate restano serializzati. Non attivare backup prima del freeze ufficiale; il validator 02A resta report-only finché non arriva il via libera; collega patch 03A allo snapshot e cleanup 03B al backup incoming/redirect.

### Runbook operativo (variante ottimizzata)
Esegui i punti nell'ordine indicato, usando in parallelo solo le preparazioni del punto 2. Ogni step richiede log con ID/owner/branch/file/rischi/ticket/comandi e, dove indicato, approvazione Master DD.

1. **Kickoff 02A (baseline qualità)** – Avvia 02A in report-only su `patch/03A-core-derived`; salva output temporanei, whitelist e log `TKT-02A-VALIDATOR`.
2. **Preparazioni in parallelo** – Mentre 02A gira, raccogli approvazioni Master DD in bozza, prepara snapshot/backup core/derived (staging, non attivati), redigi redirect plan. Nessuna attivazione o merge in questa fase.
3. **Freeze 3→4 ufficiale** – Attiva backup, registra il freeze con log completo e collega i preparativi (snapshot/redirect plan). Richiedi e registra approvazione Master DD.
4. **Patch 03A + validazione** – Applica patch minime 03A con changelog e pacchetto rollback legati allo snapshot; rerun 02A in report-only; invia richiesta di approvazione Master DD per il merge.
5. **Transizione verso 03B** – Gate di uscita 03A superati e approvati: conferma backup/redirect pronti, pianifica lo switch e logga il checkpoint.
6. **03B cleanup e redirect** – Su `patch/03B-incoming-cleanup`, esegui cleanup/redirect, aggiorna backup incoming con istruzioni di ripristino, quindi smoke 02A post-merge in report-only con log dell'esito.
7. **Sblocco e riavvio** – Sblocca il freeze dopo smoke 02A positivo e approvazione finale Master DD; aggiorna README solo dopo il log; attiva il trigger di riavvio (vedi sezione dedicata) e riallinea snapshot/backup per il ciclo successivo.

## PIPELINE_EXECUTOR (batch & gate)
- **Batch 1–2**: rerun 02A (schema-only/trait/style) in report-only su `patch/03A-core-derived`; salva output temporanei, log ID `TKT-02A-VALIDATOR`, documenta whitelist. Apri o riconferma il freeze 3→4 con approvazione Master DD e snapshot/backup registrati (log completo di ID/owner/branch/file/rischi/ticket/comandi).
- **Batch 3**: applica patch minime 03A sullo stesso branch; genera changelog e pacchetto rollback legati allo snapshot; riesegui 02A in report-only; invia richiesta di approvazione Master DD per il merge.
- **Batch 4–5**: checkpoint transizione verso 03B (backup/redirect pronti, gate 03A confermati); esegui cleanup su `patch/03B-incoming-cleanup`, verifica redirect e backup incoming, quindi smoke 02A post-merge in report-only con log esito.
- **Step 6**: chiudi e sblocca il freeze solo dopo smoke 02A positivo e approvazione Master DD registrata; aggiorna README solo dopo il log (ID/owner/branch/file/rischi/ticket/comandi), poi trigger del ciclo successivo.

**Quality/Safety**: log obbligatorio prima/dopo ogni micro-step; validator sempre in report-only finché non arriva il via libera; documentare whitelist temporanee 02A; associare patch 03A a snapshot core/derived e 03B a backup incoming/redirect; evitare compressione dei controlli.

## Sequenza operativa pronta all’uso (come procedere)
Usa questa checklist per eseguire subito i passi consigliati. Tutti i punti prevedono log con ID/owner/branch/file/rischi/ticket/comandi.

1) **Rerun 02A in report-only** su `patch/03A-core-derived` (schema-only, trait audit, style). Salva output temporanei, annota whitelist e collega il log a `TKT-02A-VALIDATOR`.
2) **Apri o riconferma il freeze 3→4**: registra approvazione Master DD, attiva snapshot/backup e archivia il log di freeze.
3) **Applica le patch 03A minime** con changelog + rollback legati allo snapshot; riesegui 02A in report-only; invia richiesta di approvazione Master DD per il merge.
4) **Esegui il checkpoint di transizione**: verifica che backup/redirect siano pronti, conferma il superamento dei gate di uscita 03A e documenta il piano di switch.
5) **Completa 03B** su `patch/03B-incoming-cleanup`: cleanup + redirect verificati, backup incoming aggiornato con istruzioni di ripristino, quindi smoke 02A post-merge in report-only con log dell’esito.
6) **Sblocca il freeze** solo dopo smoke 02A positivo e approvazione Master DD registrata; aggiorna README dopo il log e attiva il trigger di riavvio.
7) **Riavvia la simulazione** sull’intera sequenza (02A→freeze→03A→transizione→03B→sblocco) aggiornando branch/artefatti se le baseline sono cambiate. Allinea la whitelist 02A, ricollega patch 03A allo snapshot aggiornato e 03B al backup/redirect rivisti.

## Action plan ottimizzato (parallelo vs seriale)
Usa questa griglia per distinguere cosa può correre in parallelo e cosa resta serializzato. Ogni blocco richiede log obbligatori.

- **Parallelo ammesso (solo preparazioni)**
  - Approvals: raccogli approvazioni Master DD in bozza (nessun merge). Output: log draft approvazioni.
  - Backup/Snapshot staging: predisponi snapshot/backup core/derived senza attivarli. Output: checklist staging pronta all’attivazione.
  - Redirect plan: stesura del piano di redirect con mapping e rollback. Output: redirect plan versionato in bozza.

- **Seriale obbligatorio (gate con approvazioni e attivazioni)**
  - Freeze 3→4: attiva backup, log ufficiale, approvazione Master DD registrata.
  - Patch 03A: applica patch minime, genera changelog+rollback, rerun 02A, richiesta approvazione merge.
  - Transizione: checkpoint con backup/redirect pronti, conferma gate 03A superato.
  - 03B cleanup+redirect: applicazione redirect, verifica backup incoming, smoke 02A post-merge.
  - Sblocco freeze: chiusura log, approvazione finale Master DD, trigger riavvio.

## Tabella gate rapida
| Step | Owner | Modalità | Input chiave | Output richiesto |
| --- | --- | --- | --- | --- |
| 02A | Dev-tooling | Report-only | Branch `patch/03A-core-derived`, whitelist temporanee (se servono) | Log `TKT-02A-VALIDATOR`, report schema/trait/style, output temporanei salvati |
| Freeze 3→4 | Coordinator | Gate | Report 02A, approvazione Master DD | Log freeze con ID/owner/branch/file/rischi/ticket/comandi, backup/snapshot attivati e tracciati |
| 03A patch | Coordinator + Dev-tooling | Gate | Freeze attivo, snapshot registrato | Patch minime + changelog + pacchetto rollback, rerun 02A, richiesta approvazione Master DD merge |
| Transizione | Coordinator | Gate | Approvazione Master DD su 03A | Checkpoint con backup/redirect pronti, piano di switch confermato |
| 03B cleanup | Coordinator + Dev-tooling | Gate | Backup/redirect pronti, branch `patch/03B-incoming-cleanup` | Cleanup+redirect verificati, backup incoming aggiornato, smoke 02A post-merge (report-only) loggato |
| Sblocco | Coordinator | Gate | Smoke 02A ok, approvazione Master DD finale | Log chiusura freeze, README aggiornato dopo il log, trigger riavvio ciclo |

## Riavvio simulazione post-sblocco
Dopo lo sblocco e la registrazione dell’approvazione finale, riavvia PIPELINE_SIMULATOR sulla sequenza 02A→freeze→03A→transizione→03B→sblocco. Aggiorna branch e artefatti di backup se le baseline sono cambiate per mantenere la copertura del nuovo ciclo.

## Prossimo passo (ottimizzato) – esecuzione immediata
Usa questa mini-checklist per avviare subito il ciclo ottimizzato senza perdere i parallelismi consentiti:

1. **Kickoff 02A** – Lancia 02A in report-only su `patch/03A-core-derived`, salva output temporanei e whitelist, collega il log a `TKT-02A-VALIDATOR`.
2. **Preparazioni in parallelo** – In parallelo al punto 1, redigi il redirect plan e predisponi snapshot/backup in staging (non attivarli); raccogli approvazioni Master DD in bozza. Nessun merge né attivazione in questa fase.
3. **Freeze 3→4 ufficiale** – Attiva i backup, chiudi il redirect plan, registra approvazione Master DD e il log completo del freeze (ID/owner/branch/file/rischi/ticket/comandi).
4. **03A + rerun 02A** – Applica patch minime 03A con changelog e pacchetto rollback legati allo snapshot, riesegui 02A in report-only e invia la richiesta formale di approvazione Master DD per il merge.
5. **Transizione e 03B** – Dopo l’ok su 03A, logga il checkpoint di transizione (backup/redirect pronti), quindi esegui cleanup/redirect su `patch/03B-incoming-cleanup` con backup incoming aggiornato e smoke 02A post-merge loggato.
6. **Sblocco + trigger** – Sblocca il freeze solo con smoke 02A positivo e approvazione finale; aggiorna README dopo il log e riavvia la sequenza con i nuovi snapshot/backup.

### Template di log consigliato (per ogni step)
- **ID step / owner / branch**
- **Comandi eseguiti** (con riferimenti a script o job)
- **Rischi e mitigazioni**
- **Checkpoint approvazioni Master DD** (draft/ufficiale)
- **Snapshot/backup associati** (ID, percorso, timestamp)
- **Whitelist temporanee 02A** (se applicate)
- **Esito e follow-up** (incluso trigger di riavvio, se rilevante)

## Stato rispetto al piano iniziale
Questa sezione riassume dove siamo e il prossimo passo da eseguire, in coerenza con le ottimizzazioni concordate:

- **Documentazione**: pipeline simulatore/ottimizzatore/executor, checklist operativa e template di log già definiti in questo file.
- **Pre-flight**: pronta la checklist per allineare branch, validator report-only, snapshot/backup in staging, redirect plan e approvazioni draft.
- **Checkpoint transizione → 03B**: backup/redirect pronti e confermati in report-only (`reports/backups/2026-02-20_incoming_backup/README.md`, `reports/temp/patch-03B-incoming-cleanup/2026-02-20/cleanup_redirect.md`). Smoke 02A post-merge registrato nella stessa cartella.
- **Prossima azione operativa**: chiudere il gate di sblocco freeze dopo approvazione Master DD, usando i log smoke 02A più recenti come supporto e aggiornando `logs/agent_activity.md`.

## Pre-flight (prima del kickoff 02A)
Esegui questa checklist prima di avviare il ciclo ottimizzato:

1. **Branch e ticket** – Verifica che `patch/03A-core-derived` e `patch/03B-incoming-cleanup` siano aggiornati; conferma il riferimento a `TKT-02A-VALIDATOR` nel log di run.
2. **Validator in report-only** – Assicurati che schema-only/trait/style siano configurati in modalità report-only e che non esistano override locali.
3. **Snapshot/backup staging** – Predisponi gli snapshot/backup core/derived in staging (non attivarli), annotando ID, percorso, timestamp.
4. **Redirect plan** – Prepara la bozza di mapping/rollback redirect e conferma che i target di redirect siano raggiungibili in staging.
5. **Approvals draft** – Raccogli in bozza le approvazioni Master DD con owner e canale di escalation.
6. **Log book** – Prepara il template di log per ogni step con campo whitelist 02A e sezione follow-up (per il trigger di riavvio post-sblocco).

## Pacchetto di audit e riavvio post-sblocco
Per chiudere il ciclo e riavviare la simulazione:

1. **Audit bundle** – Archivia in un pacchetto unico: log freeze/sblocco, report 02A (run iniziale e post-merge), changelog+rollback 03A legati allo snapshot, backup/redirect instructions 03B, esito smoke 02A post-merge.
2. **Allineamento artefatti** – Aggiorna snapshot/backup/redirect plan per la baseline successiva, ricollegando patch 03A e cleanup 03B ai nuovi ID artefatto.
3. **Trigger riavvio** – Riavvia PIPELINE_SIMULATOR sulla sequenza 02A→freeze→03A→transizione→03B→sblocco usando le baseline rinnovate; azzera o rinnova la whitelist 02A se cambiata.
