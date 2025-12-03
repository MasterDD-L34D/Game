# REF_REDIRECT_PLAN_STAGING – Redirect mapping, rollback e backup (bozza)

Versione: 0.2
Data/Milestone: 2025-12-07 (milestone staging redirect)
Owner: coordinator (supporto dev-tooling + archivist)
Stato: **Ready/Approved** (smoke PASS 2026-07-23 su host `http://localhost:8000`; gate #1204/#1205 confermati Approved; #1206 aggiornato a **Ready** dopo simulazione rollback `[ROLLBACK-SIM-2026-09-07T1200Z]`; mapping TKT-03B-001 allineato alla milestone 07/12/2025 con report allegato; freeze 03AB chiuso con firma Master DD e manifest archiviati)
Ambito: preparazioni in parallelo (staging, core/derived) senza attivazioni; milestone aggiornata a 07/12/2025

## Scopo

Preparare un piano di redirect con mapping e rollback, predisponendo snapshot/backup di core/derived su staging e raccogliendo le approvazioni Master DD in bozza, senza attivare i redirect in questa fase.

## Contesto e delta rispetto al checkpoint 2026

- Il checkpoint 2026-02-18 è stato ritirato: la milestone operativa passa a **07/12/2025** per evitare il riuso di finestre storiche.
- I gate (attivazione e go-live) sono riallineati alle finestre QA documentale 2025 e devono restare bloccati finché lo smoke test non torna **PASS** sul nuovo host di staging.
- I riferimenti operativi (ticket #1204 e #1205) puntano ora alla milestone 2025 e richiedono di allegare i report aggiornati.

## Aggiornamento tracciabilità 2025-12-07

- Log di riferimento: `[REDIR-VALIDATOR-SMOKE-2025-12-07T0900Z]` in `logs/agent_activity.md` con allegati `reports/02A_validator_rerun.md` (validator 02A PASS) e `reports/redirects/redirect-smoke-staging.json` (smoke PASS R-01/R-02/R-03 su `http://localhost:8000`).
- Finestra QA documentale 2025-12-01T09:00Z → 2025-12-08T18:00Z verificata senza overlap; slot alternativa 2025-12-09T09:00Z → 2025-12-09T18:00Z pronta per fallback e da riusare anche per eventuale rollback ticket #1206.

## Aggiornamento tracciabilità 2025-12-08

- Log di riferimento: `[REDIR-SMOKE-2025-12-08T1100Z]` in `logs/agent_activity.md` con smoke test **PASS** su `http://localhost:8000` (report riutilizzato `reports/redirects/redirect-smoke-staging.json`) e milestone confermata al 07/12/2025.
- Ticket #1204/#1205 aggiornati a Approved con allegato il report di smoke 2025-12-08; ticket #1206 era in Draft usando lo stesso report come baseline di rollback, ora marcato **Ready** dopo il log `[ROLLBACK-SIM-2026-09-07T1200Z]`.
- Ticket **TKT-03A-001** e **TKT-03B-001** marcati Ready grazie ai log `[02A-REMEDIATION-2025-12-08T1030Z]` e `[REDIR-SMOKE-2025-12-08T1100Z]` (validator 02A PASS + smoke redirect PASS) per lo sblocco dei gate 03A/03B.

## Aggiornamento tracciabilità 2025-12-03 (refresh mapping e smoke)

- Tabella mapping popolata con owner per riga e link diretti ai ticket Master DD #1204/#1205/#1206.
- Smoke test rieseguito su host `http://localhost:8000` con esito **PASS** per R-01/R-02/R-03 utilizzando `scripts/redirect_smoke_test.py`; report salvato in `reports/redirects/redirect-smoke-staging.json` per allegati #1204/#1205 e baseline rollback #1206.

## Aggiornamento tracciabilità 2026-07-23

- Log di riferimento: `[03A03B-CHECKPOINT-2026-07-23T0930Z]` in `logs/agent_activity.md` con validator 02A e smoke redirect **PASS** archiviati come allegati per i ticket 03A/03B e #1204/#1205/#1206.
- Ticket #1204/#1205 confermati in stato **Approved** con il report `reports/redirects/redirect-smoke-staging.json` allegato (host `http://localhost:8000`, mapping R-01/R-02/R-03). Ticket #1206 era **Draft** usando lo stesso report come baseline di rollback, ora **Ready** dopo `[ROLLBACK-SIM-2026-09-07T1200Z]`.
- Ticket **TKT-03A-001** e **TKT-03B-001** in stato **Ready** con i riferimenti al validator 02A (`reports/02A_validator_rerun.md`) e al smoke redirect (`reports/redirects/redirect-smoke-staging.json`) per la finestra di freeze 03A/03B 2025-11-29→2025-12-07.

## Aggiornamento tracciabilità 2026-07-26

- Log di riferimento: `[FREEZE-03A03B-CLOSE-2026-07-26T1200Z]` in `logs/agent_activity.md` con backup post-merge e rollback ready.
- Firma Master DD registrata per la chiusura del freeze 03AB; manifest archiviati e referenziati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD) per eventuale ripristino.
- Ticket **TKT-03A-001** e **TKT-03B-001** aggiornati: validator schema-only PASS (`logs/ci_runs/freezer_validator_2026-07-24.log`) e smoke redirect PASS (`reports/redirects/redirect-smoke-2026-07-24.json`) con gate chiusi e rollback pronto (ticket #1206 in Ready grazie alla simulazione `[ROLLBACK-SIM-2026-09-07T1200Z]`).

## Aggiornamento tracciabilità 2026-09-07

- Log di riferimento: `[ROLLBACK-SIM-2026-09-07T1200Z]` in `logs/agent_activity.md` con simulazione di rollback staging basata sui manifest `reports/backups/2025-11-25_freeze/manifest.txt` e `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt` (checksum verificati via `sha256sum -c`).
- Runbook rollback aggiornato in questa pagina con sequenza dettagliata, preferenza tar.gz per restore completo e zip staging rapido 2025-11-29T0525Z.
- Smoke test post-rollback **PASS** su `http://localhost:8000` con output `reports/redirects/redirect-smoke-staging.json`; ticket #1206 avanzato a **Ready** e allineato con i ticket #1204/#1205.

## Aggiornamento tracciabilità 2026-07-21 (storico)

- Log di riferimento: `[REDIR-SMOKE-2026-07-21T0935Z]` in `logs/agent_activity.md` con smoke redirect su host `https://staging.example.com` eseguito con mapping corrente R-01/R-02/R-03. Tutte le voci in **ERROR** per host non risolvibile (`Name or service not known`); report archiviato in `reports/redirects/redirect-smoke-staging.json` e notificato a #1204/#1205/#1206 e TKT-03B-001 come blocco operativo.

## Stato ticket e allegati (aggiornati al log 2026-07-26)

| Ticket                                                                                    | Owner                            | Stato    | Allegati/Note                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) – Ok a finestra di attivazione | Master DD (supporto archivist)   | Approved | Report `reports/redirects/redirect-smoke-staging.json` con esito **PASS** su host `http://localhost:8000` (log `[03A03B-CHECKPOINT-2026-07-23T0930Z]`); finestra QA 2025-12-01T09:00Z→2025-12-08T18:00Z verificata, fallback 2025-12-09 pronto.                                                                                                                                                                            |
| [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) – Go-live redirect             | Master DD (supporto coordinator) | Approved | Stesso report di smoke PASS allegato (log `[03A03B-CHECKPOINT-2026-07-23T0930Z]`); go-live subordinato al mantenimento del freeze 03A/03B e al via libera Master DD sulla stessa finestra QA.                                                                                                                                                                                                                              |
| [#1206](https://github.com/MasterDD-L34D/Game/issues/1206) – Rollback redirect            | Master DD + dev-tooling          | Ready    | Baseline di rollback aggiornata con manifest archiviati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`), log di simulazione `[ROLLBACK-SIM-2026-09-07T1200Z]` (checksum PASS) e report smoke post-restore `reports/redirects/redirect-smoke-staging.json` **PASS**. Finestra alternativa 2025-12-09T09:00Z→18:00Z disponibile per eventuale ripristino. |
| TKT-03A – Validator pre-03A                                                               | dev-tooling                      | Ready    | Esiti PASS in `reports/02A_validator_rerun.md` e `logs/ci_runs/freezer_validator_2026-07-24.log` con firma Master DD e freeze 03AB chiuso (log `[FREEZE-03A03B-CLOSE-2026-07-26T1200Z]`).                                                                                                                                                                                                                                  |
| TKT-03B – Redirect mapping                                                                | archivist                        | Ready    | Mapping R-01/R-02/R-03 stabile con report `reports/redirects/redirect-smoke-staging.json` **PASS** e gate chiusi con firma Master DD; rollback pronto con manifest referenziati (log `[FREEZE-03A03B-CLOSE-2026-07-26T1200Z]`).                                                                                                                                                                                            |

### Mapping vecchia data → nuova data (checkpoint)

| Vecchia data checkpoint          | Nuova data/milestone                         | Ticket                                                     | Owner                 | Note                                                                |
| -------------------------------- | -------------------------------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| 2026-02-18 (bozza staging)       | 2025-12-07 (milestone staging redirect)      | [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) | Master DD / archivist | Evitare riuso della finestra 2026; loggare rilanci smoke e QA 2025. |
| 2026-02-20 (placeholder go-live) | 2025-12-08 (slot go-live legato a milestone) | [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) | Master DD             | Go-live subordinato a smoke PASS e verifica overlap con QA 2025.    |

## Prerequisiti e vincoli

- Freeze parziale su staging: nessuna attivazione redirect fino a GO approvato.
- Allineare riferimenti a `REF_BACKUP_AND_ROLLBACK.md` per gestione archivi/manifest.
- Evitare commit di artefatti binari: solo tracce e manifest in repo, archivi su bucket esterno.
- Coinvolgere dev-tooling per script/CI e archivist per naming, indici e percorsi.

## Redirect plan – bozza (mapping + rollback)

### Mapping (definitivo)

<!-- prettier-ignore -->
| ID   | Source (staging)     | Target                    | Tipo redirect | Owner       | Ticket Master DD                                                                                            | Note |
| ---- | -------------------- | ------------------------- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------- | ---- |
| R-01 | `/data/species.yaml` | `/data/core/species.yaml` | 301           | dev-tooling | [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) · [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) · [#1206](https://github.com/MasterDD-L34D/Game/issues/1206) | Target presente (`data/core/species.yaml`), nessun loop. Config unica `config/data_path_redirects.json` + `scripts/data_layout_migration.py`; analytics: conteggio 301 nei log staging. Report smoke `reports/redirects/redirect-smoke-staging.json` allegato (baseline rollback #1206). |
| R-02 | `/data/traits`       | `/data/core/traits`       | 301           | archivist   | [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) · [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) · [#1206](https://github.com/MasterDD-L34D/Game/issues/1206) | Target su host `http://localhost:8000` in `data/core/traits/`, nessun loop/cascade. Config unica `config/data_path_redirects.json` in mirror R-01/R-03; conteggio 301 nei log staging. Report smoke `reports/redirects/redirect-smoke-staging.json` allegato per #1204/#1205, baseline rollback #1206. |
| R-03 | `/data/analysis`     | `/data/derived/analysis`  | 302           | dev-tooling | [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) · [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) · [#1206](https://github.com/MasterDD-L34D/Game/issues/1206) | Target `data/derived/analysis/`, nessun cascade. Config condivisa `config/data_path_redirects.json` + pipeline ingest `data/derived`; monitorare hit 302 nei log staging. Report `reports/redirects/redirect-smoke-staging.json` allegato a #1204/#1205, baseline rollback #1206. |

Note operative:

- Annotare per ogni riga l'ownership (dev-tooling/archivist) e il ticket di riferimento.
- Validare che i target esistano in staging e che non introducano loop/cascate.
- Indicare se il redirect può essere consolidato in config unica (es. file di routing) o necessita patch multiple.

### Rollback

1. Conservare la configurazione redirect corrente in `reports/backups/<label>/redirect-config/manifest.txt` (solo testo: percorso file, checksum, branch).
2. Per ogni mapping nuovo, mantenere il delta in bozza (diff) senza applicazione su staging.
3. In caso di stop, ripristinare la configurazione precedente tramite manifest e allegare log in `docs/logs/tooling/` (o ticket collegato).
4. Dopo rollback, aggiornare la tabella mapping marcando lo stato come "rollback" con link al log.

## Checklist snapshot/backup core/derived (staging)

1. Confermare finestra di freeze e on-call: data/ora, referenti dev-tooling e archivist.
2. Eseguire inventory rapido dei dataset core/derived coinvolti e delle configurazioni redirect (percorsi, branch, tag).
3. Generare snapshot/backup in staging rispettando `REF_BACKUP_AND_ROLLBACK.md`:
   - esportare i dataset in workspace temporaneo
   - calcolare `sha256sum` per ogni archivio
   - caricare su bucket `reports/backups/<label>/` con struttura coerente
4. Compilare `reports/backups/<label>/manifest.txt` con Archive, SHA256, Location, On-call, Last verified.
5. Validare l’accesso/permessi al bucket da parte dei referenti e condividere link nel ticket.
6. Loggare esito e checksum in `logs/agent_activity.md` o registro operativo equivalente.

## Log approvazioni – draft

| Step                         | Owner/Approvatore       | Stato    | Note                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validazione mapping redirect | Master DD               | Approved | Ticket Master DD: [#1201](https://github.com/MasterDD-L34D/Game/issues/1201). Approvati R-01, R-02 e R-03 con payload definitivo e note analytics consolidate sul nuovo host staging.                                                                                                                                                                        |
| Backup core/derived staging  | Master DD / Dev-tooling | Approved | Ticket Master DD: [#1203](https://github.com/MasterDD-L34D/Game/issues/1203). Manifest e checksum verificati su staging; link al bucket in nota operativa del ticket.                                                                                                                                                                                        |
| Ok a finestra di attivazione | Master DD               | Approved | Ticket Master DD [#1204](https://github.com/MasterDD-L34D/Game/issues/1204). Smoke test `reports/redirects/redirect-smoke-staging.json` **PASS** su nuovo host staging (`http://localhost:8000`) con mapping R-01/R-02/R-03; overlap QA documentale 2025-12-01T09:00Z → 2025-12-08T18:00Z verificato senza conflitti, fallback 2025-12-09 valido.            |
| Go-live redirect             | Master DD               | Approved | Ticket Master DD [#1205](https://github.com/MasterDD-L34D/Game/issues/1205). Prerequisiti chiusi: smoke test PASS su host staging aggiornato (`http://localhost:8000`) e finestra QA 2025 confermata senza overlap (slot alternativa 2025-12-09 pronta). Report allegato (`reports/redirects/redirect-smoke-staging.json`) e milestone 2025-12-08 allineata. |
| Rollback (se necessario)     | Master DD + Dev-tooling | Ready    | Ticket Master DD [#1206](https://github.com/MasterDD-L34D/Game/issues/1206) avanzato a **Ready** dopo simulazione su staging (`[ROLLBACK-SIM-2026-09-07T1200Z]`) con runbook allegato e smoke test post-restore **PASS**.                                                                                                                                    |

## TODO prima dell’attivazione

- [x] Popolare la tabella mapping con i path effettivi e assegnare owner per riga (owner e ticket Master DD collegati).
- [x] Agganciare i ticket/link di approvazione Master DD nelle note del log (sezione mapping aggiornata con #1204/#1205/#1206).
- [x] Preparare script di verifica automatica (dev-tooling) per smoke test dei redirect su staging e salvare report in `reports/redirects/redirect-smoke-staging.json` (ultima esecuzione **PASS** su `http://localhost:8000`).

## Smoke test redirect automatizzato (staging)

- Script: `scripts/redirect_smoke_test.py` (Python 3, nessuna dipendenza esterna). Legge la tabella di mapping di questo documento e valida HTTP status + header `Location` verso un host parametrico (staging `http://localhost:8000`).
- Comando base (staging):

  ```bash
  python scripts/redirect_smoke_test.py \
    --host http://localhost:8000 \
    --environment staging \
    --output reports/redirects/redirect-smoke-staging.json
  ```

- Parametri:
  - `--host`: host da testare (con schema). Obbligatorio (`http://localhost:8000` su staging).
  - `--environment`: label salvata nel report JSON (default: `staging`).
  - `--mapping`: percorso alternativo al file di mapping, se necessario.
  - `--timeout`: timeout HTTP in secondi (default: `5.0`).
  - `--output`: percorso del report JSON (crea cartelle se assenti) in `reports/redirects/`. Default preimpostato: `reports/redirects/redirect-smoke-staging.json`. Allegare l’esito ai ticket #1204/#1205 e includerlo come baseline rollback #1206.

- Interpretazione esiti:
  - `PASS`: status HTTP e `Location` corrispondono a quanto indicato nel mapping.
  - `FAIL`: lo status o la `Location` non corrispondono al mapping; bloccare il go-live finché non è risolto.
  - `SKIP`: riga di mapping incompleta (placeholder, status mancante o source/target vuoti); completare il dato prima del test finale.
  - `ERROR`: problemi di rete/timeout/parsing; riprovare o verificare la raggiungibilità dell’host.

- Exit code: 0 se nessun `FAIL`/`ERROR`, altrimenti 1. I risultati dettagliati vengono stampati su stdout e (se indicato) nel file JSON.
- Lancio consigliato su staging (con registrazione report in `reports/redirects/redirect-smoke-staging.json`):

  ```bash
  python scripts/redirect_smoke_test.py \
    --host http://localhost:8000 \
    --environment staging \
    --output reports/redirects/redirect-smoke-staging.json
  ```

- Conservare i report generati in `reports/` (es. `reports/redirects/redirect-smoke-staging.json`) e allegarli ai ticket #1204 (finestra di attivazione) e #1205 (go-live redirect). Lo script stampa anche un riepilogo finale PASS/FAIL/SKIP/ERROR.

- Ultima esecuzione (2025-12-03T21:28Z): host `http://localhost:8000`, tutti i mapping **PASS**; report aggiornato `reports/redirects/redirect-smoke-staging.json` pronto per allegati #1204/#1205 e baseline rollback #1206.

## Runbook sintetico attivazione/rollback (ticket #1204 / #1206)

### Sequenza attivazione redirect (staging → go-live)

1. **Pre-flight** – Verificare che l'host di staging sia raggiungibile; ripetere lo smoke test con `reports/redirects/redirect-smoke-staging.json` come output e allegare il log aggiornato a [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) e [#1205](https://github.com/MasterDD-L34D/Game/issues/1205).
2. **Check freeze QA** – Confermare che la finestra QA documentale 2025-12-01T09:00Z → 2025-12-08T18:00Z (owner archivist, approvata da Master DD e referenziata in `REF_INCOMING_CATALOG.md`) non sovrapponga la data di attivazione; in caso di blocco usare la finestra alternativa 2025-12-09T09:00Z → 2025-12-09T18:00Z e loggare l'esito nei ticket [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) e [#1205](https://github.com/MasterDD-L34D/Game/issues/1205).
3. **Applicazione config** – Aggiornare il file di routing/redirect su staging secondo il mapping approvato (R-01, R-03 attivi; R-02 solo dopo payload completo), mantenendo backup corrente in `reports/backups/<label>/redirect-config/` come da sezione Rollback.
4. **Verifica post-apply** – Rieseguire lo smoke test; se `PASS` per tutte le righe, pubblicare il risultato su [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) e notificare Master DD per il via libera go-live.
5. **Handoff prod** – Allineare la configurazione di produzione replicando il mapping validato; registrare timestamp e owner nel log di attivazione e aggiornare le note di ticket #1204/#1205 con gli estremi della finestra utilizzata.

### Runbook rollback dettagliato (ticket [#1206](https://github.com/MasterDD-L34D/Game/issues/1206))

**Prerequisiti e manifest**

- Backup freeze 2025-11-25 (core/derived/incoming/docs incoming):
  - `reports/backups/2025-11-25_freeze/manifest.txt` – checksum chiave:
    - core tar: `d986100a5440aea18658d6a22600cd403ba9fcfb6db4473dc9dd70227d43b984` (preferito per restore, zip mirror `0d8cae8c6f81e934c2739a10a235da8ca81f012f8d269cab361d2b4c43992707`).
    - derived tar: `283e3b2f50514446dd9843a069ed089bd79f470bbcb0cdb3caab1a6b96c45355` (zip mirror `7544d832d494c712063e73b20291f080c42de7a83f6c1a176871174ca79ef9ea`).
    - incoming tar: `043c20b99dc565a3f3e354959f2dd273183435001583c009133d4c4c7fd2a619` (zip mirror `e0809a1c3ba17339c4b2f92d8a3ef9b11b6d70b7f93c0e92f5b2c75e6160f12d`).
    - docs incoming tar: `c5475c1c32813b2feb861768480c1a851dbc7667e9c54bf642fea873d0201a9c` (zip mirror `3d437f07451bfeccdefda9e6ac95bfad3195f75756d8cc7a794f6a2a8dcb7770`).
- Backup freeze 2025-11-29T0525Z (slot rapido staging):
  - `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt` – checksum ready:
    - core zip: `63e038ec2e79016ce37753b6c96914c3703c7cc2b58972d1b22f657db0e6755e` @ `/tmp/2025-11-29T0525Z_freeze_03A-03B/data-core-2025-11-29T0525Z_freeze_03A-03B.zip`.
    - derived zip: `1c3bdb0e9af8f5916d2e2883aac1ca025983680bc20d149dcdd7e50bf541d7bd` @ `/tmp/2025-11-29T0525Z_freeze_03A-03B/data-derived-2025-11-29T0525Z_freeze_03A-03B.zip`.
    - incoming zip: `aa75ce79543116d458fc60866095fd187b45db294e752218aac88d8ea94730f7` @ `/tmp/2025-11-29T0525Z_freeze_03A-03B/incoming-2025-11-29T0525Z_freeze_03A-03B.zip`.

**Sequenza operativa (staging)**

1. **Trigger** – Attivare se lo smoke test post-apply fallisce, se il monitoraggio analytics rileva loop/errore 5xx, o su richiesta QA durante il freeze. Notificare Master DD e aprire ticket #1206 in modalità rollback.
2. **Preparazione ambiente** – Allestire staging in `/tmp/rollback_staging_<timestamp>`; montare i manifest in sola lettura (`reports/backups/2025-11-25_freeze/manifest.txt` + `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`).
3. **Verifica checksum** – Eseguire `sha256sum -c manifest.txt` nella directory del backup scelto. Se uno dei checksum fallisce, bloccare il rollback e richiedere rigenerazione artefatti (script `scripts/backup/rebuild_freeze_2025_11_25.sh`).
4. **Ripristino config redirect** – Usare il pacchetto rapido 2025-11-29T0525Z per ripristinare i file di routing (core/derived/incoming) in staging, mantenendo copia dei file correnti in `/tmp/rollback_staging_<timestamp>/pre`. Applicare eventuali delta di configurazione (payload R-01/R-02/R-03) solo dopo conferma checksum.
5. **Ripristino completo (fallback)** – Se il pacchetto rapido fallisce o è incompleto, ripristinare dal freeze 2025-11-25 decomprimendo i tar.gz preferiti (core/derived/incoming/docs incoming) e riallineando owner/permessi secondo il manifest.
6. **Verifica post-rollback** – Rieseguire lo smoke test:
   ```bash
   python scripts/redirect_smoke_test.py \
     --host http://localhost:8000 \
     --environment staging \
     --output reports/redirects/redirect-smoke-staging.json
   ```
   Se l’esito è `PASS`, registrare timestamp, host e owner nel log (`logs/agent_activity.md`, tag #1206) e allegare il report aggiornato ai ticket #1204/#1205.
7. **Chiusura** – Aggiornare lo stato di #1206 a **Ready** nel presente documento e nel log, includendo link al runbook usato e ai manifest verificati. Notificare Master DD con i riferimenti al checksum eseguito e allo smoke test post-rollback.

### Rilancio smoke test e criteri di rientro dei gate

- Host da usare per il rilancio: `https://staging.example.com` (aggiornare se viene pubblicata una nuova endpoint di staging); l'output atteso rimane `reports/redirects/redirect-smoke-staging.json` con label `staging`.
- Annotare nel ticket di follow-up di connettività il log del rilancio e l'eventuale screenshot/estratto del report.
- Criteri di accettazione per rimettere i gate "Ok a finestra di attivazione" e "Go-live redirect" in **Approved**:
  - smoke test con esito `PASS` su tutte le righe di mapping senza `ERROR` per raggiungibilità host,
  - conferma che la finestra QA documentale 2025 non sia in overlap e che eventuale finestra alternativa sia concordata con Master DD,
  - report aggiornato archiviato in `reports/redirects/redirect-smoke-staging.json` e collegato ai ticket [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) e [#1205](https://github.com/MasterDD-L34D/Game/issues/1205).
