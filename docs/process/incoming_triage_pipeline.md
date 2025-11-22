# Pipeline operativo agentica per il triage della cartella `incoming/`

## Obiettivi
- Trasformare `incoming/` da deposito grezzo a flusso controllato e versionato orchestrato da agenti.
- Garantire che ogni asset passi per analisi automatica (`scripts/report_incoming.sh`) e validazione cooperativa fra agenti specializzati.
- Preservare idee scartate ma interessanti tramite archiviazione motivata e tracciabile dagli agenti curatori.

## Panoramica agenti
| Identificativo agente | Area di competenza | Script/strumenti principali | Output chiave |
| --- | --- | --- | --- |
| `AG-Orchestrator` | Coordinamento triage settimanale, aggiornamento board | `scripts/report_incoming.sh`, API board Kanban | Agenda triage, log sessioni, sincronizzazione card |
| `AG-Validation` | Analisi logiche/tecniche del materiale in entrata | `tools/py/game_cli.py`, `tools/ts/validate_species.ts` | Report validazione, alert regressioni |
| `AG-Core` | Custodia rules & stats | `packs/` core, feature map v1…v8 | Piani integrazione rules, issue tecniche |
| `AG-Biome` | Specie/Morph & Biomi | Asset `biomes/`, hook ambientali | Raccolta intuizioni biomi, follow-up ambientali |
| `AG-Personality` | Personality modules (MBTI/Enneagramma) | `compat_map.json`, `personality_module.v1.json` | Aggiornamenti compatibilità, limiti bilanciamento |
| `AG-Toolsmith` | Manutenzione strumenti e pipeline CI | `scripts/report_incoming.sh`, `ci-pipeline` | Log manutenzione, PR strumenti |

## Strumenti agentici disponibili
- **Script di triage**: `scripts/report_incoming.sh` (invocato direttamente dal Support Hub o via cron da `AG-Orchestrator`).
- **Support Hub web**: `docs/index.html` → sezione "Incoming Pipeline" per generare il comando, consultare l'ultimo report e accedere rapidamente a playbook, checklist e archivio.
- **Checklist operativa**: `docs/checklist/incoming_triage.md` (sincronizzata con il widget del Support Hub).
- **Backlog agentico**: `docs/process/incoming_agent_backlog.md` con task e reminder automatizzati.
- **Registro review**: `docs/process/incoming_review_log.md` (letto dal Support Hub per mostrare l'ultimo report pubblicato).
- **Indice archivio**: `../incoming/archive/INDEX.md` con motivazioni e follow-up sugli asset storicizzati.

## 1. Ciclo settimanale "Incoming Review"
1. **Pianificazione automatizzata**
   - `AG-Orchestrator` crea un recurring job di 30 minuti ogni lunedì (cron o scheduler interno).
   - Il job prepara la stanza di collaborazione agentica (documento condiviso + API board).
2. **Pre-work (T-1 giorno)**
   - `AG-Orchestrator` apre il Support Hub (`docs/index.html`) e, dalla sezione "Incoming Pipeline", controlla che il widget "Ultimo report triage" non segnali follow-up aperti.
   - `AG-Orchestrator` invoca:
     ```bash
     ./scripts/report_incoming.sh --destination sessione-$(date +%Y-%m-%d)
     ```
   - L'esecuzione produce log di validazione (`reports/incoming/validation/`) e report HTML/JSON (`reports/incoming/sessione-AAAA-MM-GG/`).
   - Il percorso del report viene postato da `AG-Orchestrator` nel canale operativo agentico (`#incoming-triage-agenti`).
3. **Sync asincrona degli agenti**
   - `AG-Validation` indicizza l'output per risultato e segnala anomalie critiche.
   - `AG-Core`, `AG-Biome`, `AG-Personality` e `AG-Toolsmith` commentano sul documento condiviso assegnando etichette provvisorie **Da integrare**, **Archivio storico**, **Scarto** (vedi §3).
   - `AG-Orchestrator` consolida le decisioni in `docs/process/incoming_review_log.md`.
4. **Post-sync (entro 24h)**
   - `AG-Orchestrator` esegue lo spostamento file (§3) tramite script automatizzati.
   - `AG-Orchestrator` e `AG-Validation` aggiornano board Kanban (§2) e knowledge base (§6).

## 2. Board Kanban dedicato
- **Struttura colonne**: `Da analizzare` → `In validazione` → `In integrazione` → `In playtest` → `Archivio`.
- **Card**: una card per ogni asset o gruppo logico (es. `evo_tactics_unified_pack-v1.9.zip`).
- **Automazioni agentiche**:
  - `AG-Orchestrator` crea card importando il JSON del report tramite API.
  - `AG-Validation` aggiorna la card con l'esito dei test e allega log.
  - Webhook automatico invia notifiche quando una card entra in `In playtest`.
- **Definition of Done per colonna**:
  - `Da analizzare`: asset estratto e metadati compilati da `AG-Orchestrator`.
  - `In validazione`: `AG-Validation` conclude `report_incoming.sh`, allega log e segnala eventuali regressioni.
  - `In integrazione`: uno fra `AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith` apre issue/PR con piano di lavoro.
  - `In playtest`: `AG-Orchestrator` collega build o scenario disponibile per QA/telemetria.
  - `Archivio`: `AG-Orchestrator` aggiorna l'indice (vedi §3.3) con motivazioni.

## 3. Gestione asset dopo il triage
### 3.1 Da integrare
- `AG-Orchestrator` sposta gli asset nella directory target (`packs/`, `docs/`, `tools/`, ...).
- L'agente responsabile (Core/Biome/Personality/Toolsmith) apre issue con checklist di integrazione e link al report di validazione.
- `AG-Orchestrator` propone eventuale sprint tematico (§7).

### 3.2 Archivio storico
- `AG-Orchestrator` sposta gli asset in `../incoming/archive/YYYY/MM/` (creando cartelle se assenti).
- `AG-Orchestrator` aggiorna `../incoming/archive/INDEX.md` con motivazioni e follow-up.
- `AG-Orchestrator` applica tag `archivio` alla card Kanban.

### 3.3 Scarto controllato
- `AG-Validation` e l'agente di dominio valutano se estrarre porzioni utili.
- `AG-Orchestrator` salva gli estratti in `../incoming/archive/` e documenta il razionale.
- Eliminazioni definitive avvengono solo dopo conferma di `AG-Orchestrator` sull'esistenza di copie versionate.

## 4. Ruoli "Caretaker" agentici
| Area | Agente primario | Agente di back-up | Responsabilità |
| --- | --- | --- | --- |
| Core Rules & Stats | `AG-Core` | `AG-Orchestrator` | Revisione numeri, compatibilità dadi, bilanciamento pack core |
| Specie/Morph & Biomi | `AG-Biome` | `AG-Core` | Sincronizzare pacchetti specie/biomi, verificare hook ambientali |
| Personality Modules | `AG-Personality` | `AG-Core` | Aggiornare moduli MBTI/Enneagram, definire limiti provvisori |
| Tools & Validation | `AG-Toolsmith` | `AG-Validation` | Manutenzione script, pipeline CI, documentazione tecnica |

- Ogni caretaker agent produce note pre-sync con highlights, regressioni, richieste.
- Gli agenti di back-up assumono temporaneamente il ruolo quando il primario è impegnato in altra pipeline.

## 5. Documentazione di compatibilità
- `AG-Personality` applica le istruzioni di `../incoming/GAME_COMPAT_README.md` per l'addon Enneagramma:
  - Aggiorna `compat_map.json` e `personality_module.v1.json` quando l'asset passa in `In integrazione`.
  - Registra i test rapidi (108 profili) in `reports/incoming/tests/`.
- `AG-Core` e `AG-Biome` replicano lo stesso approccio per gli altri README guida (`../incoming/README_INTEGRAZIONE_MECCANICHE.md`, ecc.).
- `AG-Orchestrator` allega tutti i link rilevanti nelle card Kanban.

## 6. Knowledge base condivisa
- `AG-Orchestrator` aggiorna la pagina Notion/Confluence agentica con sezioni:
  - **Integrati**: elenco + link PR/report.
  - **Backlog**: asset rimasti in `Da analizzare` o `In validazione`.
- **Archivio**: highlight spunti creativi con riferimento a `../incoming/archive/INDEX.md`.
  - **Decisioni**: motivazioni e follow-up.
- In assenza di strumento esterno, `AG-Orchestrator` utilizza `docs/process/incoming_review_log.md` (vedi §8) come knowledge base locale.

## 7. Sprint tematici
- `AG-Orchestrator` propone sprint di 1-2 settimane focalizzati su cluster (es. "MBTI ↔ Job affinities").
- Input: card `In integrazione` correlate.
- Output: pacchetto aggiornato, test passati, note di tuning.
- `AG-Orchestrator` registra il risultato sprint in `docs/piani/` con summary e telemetria.

## 8. Template sincronizzazione e checklist
- Sessione di sincronizzazione agentica: `docs/templates/incoming_triage_meeting.md` (agenda standard, spazio note).
- Checklist operativa: `docs/checklist/incoming_triage.md` (pre/durante/post sync).
- `AG-Orchestrator` salva le note generate in `docs/process/incoming_review_log.md` oppure esporta sulla knowledge base.

## 9. Loop feedback playtest & telemetria
- Quando una card entra in `In playtest`:
  - `AG-Orchestrator` collega i file YAML di telemetria (`telemetry/vc.yaml`, `telemetry/pf_session.yaml`).
  - `AG-Validation` apre task QA per comparare ipotesi vs. dati raccolti.
  - L'agente di dominio aggiorna la card con conclusioni e azioni di tuning.

## 10. Manutenzione strumenti
- Micro-sprint mensile orchestrato da `AG-Toolsmith` per:
  - Aggiornare `scripts/report_incoming.sh` (supporto nuovi formati, log più chiari).
  - Validare schemi JSON utilizzati dagli asset.
  - Sincronizzare script Python/TypeScript per addon (es. Enneagramma) con feedback dell'ultimo triage.
- `AG-Toolsmith` registra ogni azione in `docs/process/tooling_maintenance_log.md` e notifica `AG-Orchestrator`.

## 11. Avvio dal Support Hub
- `AG-Orchestrator` utilizza la sezione "Incoming Pipeline" del Support Hub (`docs/index.html`) per:
  1. Selezionare la data della sessione e copiare il comando generato automaticamente (`./scripts/report_incoming.sh --destination sessione-AAAA-MM-GG`).
  2. Verificare, tramite il widget "Ultimo report triage", data, facilitatore e link HTML dell'ultima sessione registrata su `docs/process/incoming_review_log.md`.
  3. Aprire rapidamente playbook, checklist, template e archivio usando i link rapidi della card.
- Il widget "Ultimo report triage" legge sempre la prima sezione con data reale del log: assicurarsi che ogni nuova voce rispetti il formato `## YYYY-MM-DD — Facilitatore: ...` per mantenerlo sincronizzato.
- Se il widget segnala follow-up aperti o assenti, `AG-Orchestrator` aggiorna il log prima di lanciare un nuovo triage.

## 12. Escalation e contatti rapidi
- **Canale operativo**: `#incoming-triage-agenti` rimane il punto unico di coordinamento per tutti gli incidenti.
- **Sequenza di escalation**:

| Scenario | Trigger | Contatto primario | Escalation | Evidenze da allegare |
| --- | --- | --- | --- | --- |
| Fallimento `report_incoming.sh` | Exit code ≠ 0 durante l'esecuzione manuale | `AG-Validation` (`validation-oncall`) | `AG-Toolsmith`, poi `support-lead@game.dev` | Output `reports/incoming/validation/*`, log CLI `scripts/report_incoming.sh` |
| Problemi decompressione ZIP | messaggi "estrazione fallita" o errori `unzip` | `AG-Toolsmith` (`tooling-oncall`) | `AG-Orchestrator` per riassegnazione caretaker | Path asset, log temporanei in `/tmp/incoming_validation*` |
| Asset critici con blocker di design | segnalazioni dagli agenti di dominio | `AG-Orchestrator` | Responsabile dominio di back-up (`AG-Core`, `AG-Biome`, `AG-Personality`) | Report di validazione, card Kanban, snippet doc |
| Inattività canale > 30 min su nuovo arrivo | Nuovo asset segnalato in `incoming/` senza update nel canale operativo | `AG-Orchestrator` | `support-lead@game.dev` per escalation cross-team | Messaggio di presa in carico/assenza nel canale, timestamp, caretaker assegnati |

- **Template escalation**: utilizzare `docs/support/bug-template.md` allegando sempre riferimenti a report HTML/JSON e timestamp UTC.

## 13. Retrospettive periodiche
- **Cadenza**: primo lunedì del mese alle 16:00 CET, facilitata da `AG-Orchestrator` con supporto di `AG-Validation`.
- **Input obbligatori**:
  - Snapshot differenza `incoming/` vs. ultimo report pubblicato (timestamp, asset nuovi o non triagiati).
  - Ultime tre voci di `docs/process/incoming_review_log.md` e del registro agentico (`logs/incoming_triage_agenti.md`).
  - Metriche di tempo ciclo (tempo da arrivo a decisione) derivate dal backlog `docs/process/incoming_agent_backlog.md`.
- **Formato**:
  1. Revisione KPI (tempo triage, numero incidenti, esiti validator).
  2. Analisi qualitativa degli incidenti registrati e delle escalation attivate.
  3. Decisioni: ogni punto produce issue/PR o aggiornamento playbook, da tracciare nella sezione "Controlli periodici" della checklist.
- **Output**: creare una nuova voce in `docs/process/incoming_review_log.md` con tag `[Retrospettiva]` e allegare eventuali ticket aperti.

## Metriche di salute
- % asset triagiati entro 7 giorni dall'arrivo.
- Numero di regressioni rilevate dagli script di validazione vs. manuali.
- Tempo medio per passaggio `Da analizzare` → `In integrazione`.

## Allegati
- [Checklist triage](../checklist/incoming_triage.md)
- [Template meeting](../templates/incoming_triage_meeting.md)
- [Indice archivio incoming](../incoming/archive/INDEX.md)
- [Piano di lavoro agentico](incoming_agent_backlog.md)
