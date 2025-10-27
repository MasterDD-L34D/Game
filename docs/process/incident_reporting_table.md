# Registro Segnalazioni Cross-Team — Implementazione Operativa

## 1. Scelta dello strumento
- **Piattaforma**: Airtable (base dedicata "VC Segnalazioni").
- **Motivazione**:
  - Permessi granulari (creator, editor, commenter, read-only) con possibilità di limitare l'editing delle viste condivise.
  - Automazioni native per notifiche Slack/Email e creazione ticket (Webhooks + integrazione Jira/GitHub) senza sviluppi custom.
  - Sincronizzazione con altre tabelle/fogli già usati dal team (import CSV, API REST, sincronizzazione con Google Drive) utile per integrare log `driveSync` e report playtest.
  - Audit trail (revision history) incluso nei piani Team/Enterprise richiesti per conformità QA.
- **Prerequisiti**:
  - Abilitare piano Team per controlli avanzati sui permessi.
  - Configurare SSO aziendale per gestione accessi (QA/Engineering/Product) e attivare 2FA per gli editor.

## 2. Struttura tabella principale `Segnalazioni`
| Campo | Tipo | Note compilazione |
| --- | --- | --- |
| `ID segnalazione` | Formula (`SR-{AUTO_ID()}`) | Generato automaticamente; usare come chiave primaria e riferimento nei ticket collegati. |
| `Fonte` | Single select (`telemetry-log`, `drive-sync`, `visual-regression`, `playtest`, `support`, `altro`) | Selezionare pipeline/contesto di provenienza. |
| `Descrizione` | Long text (rich) | Inserire sintesi (max 3 paragrafi) con passaggi riproduzione/contesto. |
| `Timestamp evento` | Date/Time (ISO, UTC, include time) | Obbligatorio; usare timestamp originale della pipeline o orario di rilevazione. |
| `Owner` | Collaborator | Assegnare responsabile follow-up (persona QA/Engineering/Product). |
| `Stato` | Single select (`open`, `triaged`, `in_progress`, `blocked`, `resolved`, `closed`) | Aggiornare ad ogni cambio di stato; automazione per notifiche Slack. |
| `Priorità` | Single select (`critical`, `high`, `medium`, `low`) | Definita da QA al triage; visibile in tutte le viste. |
| `Riproducibilità` | Single select (`confermata`, `parziale`, `non_riprodotta`) | Indica lo stato di verifica QA; necessario per triage. |
| `Frequenza` | Single select (`sempre`, `intermittente`, `raro`, `non_riprodotto`) | Obbligatoria; compilare in base alle osservazioni QA/log. |
| `Link a evidenze` | URL multiple (campo "Attachment" + formula URL) | Caricare o linkare log, screenshot, video; minimo un riferimento valido. |
| `Note aggiuntive` | Long text | Spazio per decisioni meeting, follow-up, dipendenze. |

### Tabelle di supporto (linkate)
- `Team` (record per QA, Engineering, Product + referenti) collegata a `Owner` per report per-team.
- `Automazioni` (configurazioni webhook, mapping Slack channel) per controllo versioni automatismi.

## 3. Viste e permessi
### QA
- **Vista**: `QA - Triaged` (filtro `Stato` in `open`/`triaged`, `Fonte` != `support`).
- **Layout**: Kanban per `Stato`, ordinamento per `Priorità` desc.
- **Permessi**: ruolo *Editor* per membri QA; possono modificare tutti i campi tranne automazioni (bloccate tramite locked view).

### Engineering
- **Vista**: `ENG - Attive` (filtro `Owner` contiene membri Eng o `Fonte` in `telemetry-log`, `visual-regression`).
- **Layout**: Griglia con colonne principali + `Note aggiuntive` nascoste per ridurre rumore.
- **Permessi**: ruolo *Editor* limitato alla vista; possono aggiornare `Stato`, `Note aggiuntive`, allegare evidenze; campi `Priorità` e `Fonte` in sola lettura tramite field permissions.

### Product
- **Vista**: `PM - Impatto` (filtro `Priorità` in `critical`/`high`, `Stato` != `closed`).
- **Layout**: Calendario basato su `Timestamp evento` per valutare cluster; campo rollup da tabella `Team` per referenti.
- **Permessi**: ruolo *Commenter* (possono lasciare note ma non modificare record). Condivisione come link read-only con password per stakeholder esterni.

### Altre configurazioni
- **Dashboard**: usare interfaccia "Interface Designer" per creare pannello riepilogo (card per priorità, grafico stato, lista backlog per owner).
- **Automazioni**:
  - Trigger "When record matches conditions" (`Stato` → `triaged`) → invia messaggio Slack `#vc-telemetry` con campi principali e link record.
  - Trigger "When record enters view" (`ENG - Attive`) → crea issue GitHub via integrazione se `Priorità` >= `high`.
  - Promemoria settimanale (lunedì 09:00) con summary record `open`/`blocked` ai lead (email).

## 4. Scala impatto e frequenza per il backlog

Per garantire triage coerente e confrontabile tra sorgenti diverse, ogni record nel backlog deve includere sia l'impatto sia la frequenza stimati usando le seguenti scale oggettive.

### Impatto
- **Critical** — Blocco totale di una funzionalità core, crash, perdita dati o violazione SLA primaria. Richiede hotfix immediato e comunicazione incidenti.
- **High** — Funzionalità principale degradata o comportamenti errati che impediscono il completamento di scenari QA/telemetria ma con workaround limitato disponibile.
- **Medium** — Problemi che alterano l'esperienza utente senza interrompere il flusso principale (es. valori HUD errati, metriche fuori soglia ma con alternativa temporanea).
- **Low** — Glitch estetici, incoerenze di copy o issue con impatto minimo sullo user journey e senza rischi per telemetria/dati.

### Frequenza
- **Sempre** — Riproducibile al 100% seguendo i passi descritti oppure si manifesta a ogni run/partita.
- **Intermittente** — Si verifica almeno nel 30% dei tentativi o dei playtest monitorati, con pattern osservabile (es. ogni N° run, determinate squadre).
- **Raro** — Inferiore al 30% dei tentativi, segnalato da pochi tester o log isolati; richiede ulteriori dati per conferma.
- **Non riprodotto** — Non ancora riproducibile internamente; usare solo se i passi noti non generano il problema ma esistono evidenze esterne (log, video).

Annotare il valore di impatto nella colonna `Priorità` (`critical` → Critical, `high` → High, ecc.) e la frequenza tramite nuova colonna `Frequenza` (single select). Registrare inoltre lo stato di verifica QA nella colonna `Riproducibilità` (`confermata`, `parziale`, `non_riprodotta`). I tre campi sono obbligatori per passare dalla vista `Backlog - Triage` a `QA - Triaged`.

## 5. Linee guida di compilazione
1. **Creazione segnalazione**: QA inserisce nuovo record appena validata la riproducibilità. Usare template descrizione: contesto → passi → risultato atteso → risultato osservato. Prima del triage spuntare la [Bug Intake Checklist](../checklist/bug-intake.md).
2. **Triage giornaliero**: entro le 12:00 CET, QA aggiorna `Priorità` e assegna `Owner`. Se duplicato, impostare `Stato` = `closed` e nota con riferimento ID correlato.
3. **Aggiornamento stato**: Owner deve aggiornare `Stato` entro 24h da ogni cambiamento significativo e allegare evidenze (commit, PR, video fix).
4. **Chiusura**: richiede conferma QA (test di regressione) e nota con build/versione risolutiva. Automazione invia report chiusura a Product.
5. **Note aggiuntive**: utilizzare per link a meeting note, follow-up esterni, decisioni di backlog.

## 6. Condivisione e comunicazione
- **Link base**: condividere URL della base Airtable con permessi differenziati (QA/Eng editor, Product commenter, stakeholder read-only).
- **Documentazione**: allegare questa guida in `docs/process/` e nel workspace Airtable (tab "Documentation").
- **Onboarding**: pianificare sessione di walkthrough (30 min) con i tre team; registrare la demo e salvare link in `Note aggiuntive` della segnalazione `SR-0001` (entry di test).
- **Supporto**: nominare QA Lead come owner della tabella e punto di contatto per richieste di permesso/aut automazioni.

