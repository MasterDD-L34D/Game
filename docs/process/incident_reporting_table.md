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

## 4. Linee guida di compilazione
1. **Creazione segnalazione**: QA inserisce nuovo record appena validata la riproducibilità. Usare template descrizione: contesto → passi → risultato atteso → risultato osservato.
2. **Triage giornaliero**: entro le 12:00 CET, QA aggiorna `Priorità` e assegna `Owner`. Se duplicato, impostare `Stato` = `closed` e nota con riferimento ID correlato.
3. **Aggiornamento stato**: Owner deve aggiornare `Stato` entro 24h da ogni cambiamento significativo e allegare evidenze (commit, PR, video fix).
4. **Chiusura**: richiede conferma QA (test di regressione) e nota con build/versione risolutiva. Automazione invia report chiusura a Product.
5. **Note aggiuntive**: utilizzare per link a meeting note, follow-up esterni, decisioni di backlog.

## 5. Condivisione e comunicazione
- **Link base**: condividere URL della base Airtable con permessi differenziati (QA/Eng editor, Product commenter, stakeholder read-only).
- **Documentazione**: allegare questa guida in `docs/process/` e nel workspace Airtable (tab "Documentation").
- **Onboarding**: pianificare sessione di walkthrough (30 min) con i tre team; registrare la demo e salvare link in `Note aggiuntive` della segnalazione `SR-0001` (entry di test).
- **Supporto**: nominare QA Lead come owner della tabella e punto di contatto per richieste di permesso/aut automazioni.

