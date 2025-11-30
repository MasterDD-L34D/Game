# REF_REDIRECT_PLAN_STAGING – Redirect mapping, rollback e backup (bozza)

Versione: 0.1
Data: 2026-02-18
Owner: coordinator (supporto dev-tooling + archivist)
Stato: bozza operativa
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

| ID   | Source (staging)     | Target                    | Tipo redirect | Owner       | Ticket            | Note                                                                                                                                                                                                                                                              |
| ---- | -------------------- | ------------------------- | ------------- | ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | `/data/species.yaml` | `/data/core/species.yaml` | 301           | dev-tooling | TKT-03B-REDIR-001 | Target presente in staging (`data/core/species.yaml`), nessun loop. Dipendenze: `config/data_path_redirects.json` + `scripts/data_layout_migration.py`. Analytics: conteggio 301 nei log di accesso staging. Config unica.                                        |
| R-02 | `<path/vecchio>`     | `<path/nuovo>`            | 301 / 302     | archivist   | TKT-03B-REDIR-002 | Slot da completare dopo validazione; mantenere verifica staging e note analytics come per le altre righe.                                                                                                                                                         |
| R-03 | `/data/analysis`     | `/data/derived/analysis`  | 302           | dev-tooling | TKT-03B-REDIR-003 | Target presente in staging (`data/derived/analysis/`), nessun cascade. Dipendenze: `config/data_path_redirects.json` + pipeline di ingest che referenzia `data/derived`. Analytics: monitorare hit 302 nei log staging. Config condivisa, nessuna patch multipla. |

Note operative:

- Annotare per ogni riga l’ownership (dev-tooling/archivist) e il ticket di riferimento.
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

| Step                         | Owner/Approvatore       | Stato    | Note                                                                                                                                                                  |
| ---------------------------- | ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validazione mapping redirect | Master DD               | Approved | Ticket Master DD: [#1201](https://github.com/MasterDD-L34D/Game/issues/1201). Approvati R-01 e R-03 con note analytics consolidate; R-02 in attesa di payload finale. |
| Backup core/derived staging  | Master DD / Dev-tooling | Approved | Ticket Master DD: [#1203](https://github.com/MasterDD-L34D/Game/issues/1203). Manifest e checksum verificati su staging; link al bucket in nota operativa del ticket. |
| Ok a finestra di attivazione | Master DD               | Draft    | Ticket Master DD aperto: [#1204](https://github.com/MasterDD-L34D/Game/issues/1204). Mancano esito smoke-test redirect e conferma overlap con freeze QA.              |
| Go-live redirect             | Master DD               | Draft    | Ticket Master DD aperto: [#1205](https://github.com/MasterDD-L34D/Game/issues/1205). Prerequisiti: checklist smoke-test + log analytics T-24h rispetto a go-live.     |
| Rollback (se necessario)     | Master DD + Dev-tooling | Draft    | Ticket Master DD aperto: [#1206](https://github.com/MasterDD-L34D/Game/issues/1206). Da allegare runbook rollback e log di ripristino simulato su staging.            |

## TODO prima dell’attivazione

- Popolare la tabella mapping con i path effettivi e assegnare owner per riga.
- Agganciare i ticket/link di approvazione Master DD nelle note del log.
- Preparare script di verifica automatica (dev-tooling) per smoke test dei redirect su staging.
