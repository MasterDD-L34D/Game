# REF_REDIRECT_PLAN_STAGING – Redirect mapping, rollback e backup (bozza)

Versione: 0.1
Data: 2026-02-18
Owner: coordinator (supporto dev-tooling + archivist)
Stato: Draft/Blocked (smoke test ERROR su raggiungibilità host, gate bloccati finché non torna PASS)
Ambito: preparazioni in parallelo (staging, core/derived) senza attivazioni

## Scopo

Preparare un piano di redirect con mapping e rollback, predisponendo snapshot/backup di core/derived su staging e raccogliendo le approvazioni Master DD in bozza, senza attivare i redirect in questa fase.

## Prerequisiti e vincoli

- Freeze parziale su staging: nessuna attivazione redirect fino a GO approvato.
- Allineare riferimenti a `REF_BACKUP_AND_ROLLBACK.md` per gestione archivi/manifest.
- Evitare commit di artefatti binari: solo tracce e manifest in repo, archivi su bucket esterno.
- Coinvolgere dev-tooling per script/CI e archivist per naming, indici e percorsi.

## Redirect plan – bozza (mapping + rollback)

### Mapping (da compilare)

<!-- prettier-ignore -->
| ID   | Source (staging)     | Target                    | Tipo redirect | Owner       | Ticket            | Note |
| ---- | -------------------- | ------------------------- | ------------- | ----------- | ----------------- | ---- |
| R-01 | `/data/species.yaml` | `/data/core/species.yaml` | 301           | dev-tooling | TKT-03B-REDIR-001 | Target presente in staging (`data/core/species.yaml`), nessun loop. Dipendenze: `config/data_path_redirects.json` + `scripts/data_layout_migration.py`. Analytics: conteggio 301 nei log di accesso staging. Config unica. |
| R-02 | `<path/vecchio>`     | `<path/nuovo>`            | 301 / 302     | archivist   | TKT-03B-REDIR-002 | Slot da completare dopo validazione; mantenere verifica staging e note analytics come per le altre righe. |
| R-03 | `/data/analysis`     | `/data/derived/analysis`  | 302           | dev-tooling | TKT-03B-REDIR-003 | Target presente in staging (`data/derived/analysis/`), nessun cascade. Dipendenze: `config/data_path_redirects.json` + pipeline di ingest che referenzia `data/derived`. Analytics: monitorare hit 302 nei log staging. Config condivisa, nessuna patch multipla. |

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

| Step                         | Owner/Approvatore       | Stato         | Note                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validazione mapping redirect | Master DD               | Approved      | Ticket Master DD: [#1201](https://github.com/MasterDD-L34D/Game/issues/1201). Approvati R-01 e R-03 con note analytics consolidate; R-02 in attesa di payload finale.                                                                                                                                                                                                                                              |
| Backup core/derived staging  | Master DD / Dev-tooling | Approved      | Ticket Master DD: [#1203](https://github.com/MasterDD-L34D/Game/issues/1203). Manifest e checksum verificati su staging; link al bucket in nota operativa del ticket.                                                                                                                                                                                                                                              |
| Ok a finestra di attivazione | Master DD               | Draft/Blocked | Ticket Master DD aperto: [#1204](https://github.com/MasterDD-L34D/Game/issues/1204). Smoke test eseguito (report `reports/redirects/redirect-smoke-staging.json`, esito ERROR per raggiungibilità host) con issue di connettività tracciata nel ticket di follow-up; overlap aggiornato con freeze QA documentale 2025 approvata da Master DD (vedi finestra sotto), blocco attivo finché lo smoke non torna PASS. |
| Go-live redirect             | Master DD               | Draft/Blocked | Ticket Master DD aperto: [#1205](https://github.com/MasterDD-L34D/Game/issues/1205). Prerequisiti in revisione: smoke test archiviato con esito ERROR per raggiungibilità host e follow-up di connettività collegato; nota di overlap aggiornata con la finestra QA 2025 approvata da Master DD; gate da riaprire solo dopo rilancio smoke PASS e conferma finestra senza conflitti.                               |
| Rollback (se necessario)     | Master DD + Dev-tooling | Draft         | Ticket Master DD aperto: [#1206](https://github.com/MasterDD-L34D/Game/issues/1206). Da allegare runbook rollback e log di ripristino simulato su staging.                                                                                                                                                                                                                                                         |

## TODO prima dell’attivazione

- Popolare la tabella mapping con i path effettivi e assegnare owner per riga.
- Agganciare i ticket/link di approvazione Master DD nelle note del log.
- Preparare script di verifica automatica (dev-tooling) per smoke test dei redirect su staging.

## Smoke test redirect automatizzato (staging)

- Script: `scripts/redirect_smoke_test.py` (Python 3, nessuna dipendenza esterna). Legge la tabella di mapping di questo documento e valida HTTP status + header `Location` verso un host parametrico.
- Comando base (staging):

  ```bash
  python scripts/redirect_smoke_test.py \
    --host https://staging.example.com \
    --environment staging \
    --output reports/redirect-smoke.json
  ```

- Parametri:
  - `--host`: host da testare (con schema). Obbligatorio.
  - `--environment`: label salvata nel report JSON (default: `staging`).
  - `--mapping`: percorso alternativo al file di mapping, se necessario.
  - `--timeout`: timeout HTTP in secondi (default: `5.0`).
  - `--output`: percorso del report JSON (crea cartelle se assenti). Allega l’esito al ticket di go-live.

- Interpretazione esiti:
  - `PASS`: status HTTP e `Location` corrispondono a quanto indicato nel mapping.
  - `FAIL`: lo status o la `Location` non corrispondono al mapping; bloccare il go-live finché non è risolto.
  - `SKIP`: riga di mapping incompleta (placeholder, status mancante o source/target vuoti); completare il dato prima del test finale.
  - `ERROR`: problemi di rete/timeout/parsing; riprovare o verificare la raggiungibilità dell’host.

- Exit code: 0 se nessun `FAIL`/`ERROR`, altrimenti 1. I risultati dettagliati vengono stampati su stdout e (se indicato) nel file JSON.
- Lancio consigliato su staging:

  ```bash
  python scripts/redirect_smoke_test.py \
    --host https://staging.example.com \
    --environment staging \
    --output reports/redirects/redirect-smoke-staging.json
  ```

- Conservare i report generati in `reports/` (es. `reports/redirects/redirect-smoke-staging.json`) e allegarli ai ticket #1204 (finestra di attivazione) e #1205 (go-live redirect). Lo script stampa anche un riepilogo finale PASS/FAIL/SKIP/ERROR.

## Runbook sintetico attivazione/rollback (ticket #1204 / #1206)

### Sequenza attivazione redirect (staging → go-live)

1. **Pre-flight** – Verificare che l'host di staging sia raggiungibile; ripetere lo smoke test con `reports/redirects/redirect-smoke-staging.json` come output e allegare il log aggiornato a [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) e [#1205](https://github.com/MasterDD-L34D/Game/issues/1205).
2. **Check freeze QA** – Confermare che la finestra QA documentale 2025-07-08T09:00Z → 2025-07-15T18:00Z (owner archivist, approvata da Master DD e referenziata in `REF_INCOMING_CATALOG.md`) non sovrapponga la data di attivazione; in caso di blocco usare la finestra alternativa 2025-07-16T09:00Z → 2025-07-16T18:00Z e loggare l'esito nel ticket [#1204](https://github.com/MasterDD-L34D/Game/issues/1204).
3. **Applicazione config** – Aggiornare il file di routing/redirect su staging secondo il mapping approvato (R-01, R-03 attivi; R-02 solo dopo payload completo), mantenendo backup corrente in `reports/backups/<label>/redirect-config/` come da sezione Rollback.
4. **Verifica post-apply** – Rieseguire lo smoke test; se `PASS` per tutte le righe, pubblicare il risultato su [#1205](https://github.com/MasterDD-L34D/Game/issues/1205) e notificare Master DD per il via libera go-live.
5. **Handoff prod** – Allineare la configurazione di produzione replicando il mapping validato; registrare timestamp e owner nel log di attivazione e aggiornare le note di ticket #1204/#1205 con gli estremi della finestra utilizzata.

### Runbook rollback (ticket [#1206](https://github.com/MasterDD-L34D/Game/issues/1206))

1. **Trigger** – Attivare se lo smoke test post-apply fallisce, se il monitoraggio analytics rileva loop/errore 5xx, o su richiesta QA durante il freeze.
2. **Ripristino config** – Recuperare il manifest in `reports/backups/<label>/redirect-config/manifest.txt`, ripristinare i file di routing precedenti e confermare checksum, loggando l'owner (dev-tooling) e l'orario nel ticket #1206.
3. **Verifica post-rollback** – Rieseguire lo smoke test puntando allo stesso host; se `PASS`, aggiornare #1204/#1205 con nota di rollback e pianificare nuova finestra (preferibilmente fuori da eventuali freeze QA o nella slot alternativa 2025-07-16T09:00Z → 2025-07-16T18:00Z).
4. **Chiusura** – Archiviare il report di rollback in `reports/redirects/redirect-smoke-staging.json` (nuova versione) e allegare il log a #1206; notificare Master DD per la riapertura del piano.

### Rilancio smoke test e criteri di rientro dei gate

- Host da usare per il rilancio: `https://staging.example.com` (aggiornare se viene pubblicata una nuova endpoint di staging); l'output atteso rimane `reports/redirects/redirect-smoke-staging.json` con label `staging`.
- Annotare nel ticket di follow-up di connettività il log del rilancio e l'eventuale screenshot/estratto del report.
- Criteri di accettazione per rimettere i gate "Ok a finestra di attivazione" e "Go-live redirect" in **Approved**:
  - smoke test con esito `PASS` su tutte le righe di mapping senza `ERROR` per raggiungibilità host,
  - conferma che la finestra QA documentale 2025 non sia in overlap e che eventuale finestra alternativa sia concordata con Master DD,
  - report aggiornato archiviato in `reports/redirects/redirect-smoke-staging.json` e collegato ai ticket [#1204](https://github.com/MasterDD-L34D/Game/issues/1204) e [#1205](https://github.com/MasterDD-L34D/Game/issues/1205).
