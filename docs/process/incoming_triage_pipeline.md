# Pipeline operativo per il triage della cartella `incoming/`

## Obiettivi
- Trasformare `incoming/` da deposito grezzo a flusso controllato e versionato.
- Garantire che ogni asset passi per analisi automatica (`scripts/report_incoming.sh`) e valutazione umana coordinata.
- Preservare idee scartate ma interessanti tramite archiviazione motivata.

## 1. Ciclo settimanale "Incoming Review"
1. **Pianificazione**
   - Calendarizzare un recurring meeting di 30 minuti ogni lunedì.
   - Owner: Lead Game Designer. Partecipanti fissi: Narrative, Systems, Tooling.
2. **Pre-work (T-1 giorno)**
   - L'owner esegue:
     ```bash
     ./scripts/report_incoming.sh --destination sessione-$(date +%Y-%m-%d)
     ```
   - Lo script genera: log di validazione (`reports/incoming/validation/`), report HTML/JSON (`reports/incoming/sessione-AAAA-MM-GG/`).
   - Condividere il link al report nella calendar invite.
3. **Durante il meeting**
   - Scorrere l'output ordinato per "risultato validazione" e "novità".
   - Per ogni asset segnare etichetta provvisoria: **Da integrare**, **Archivio storico**, **Scarto** (vedi §3).
   - Registrare decisioni in `docs/process/incoming_review_log.md` (nuovo file per meeting) oppure nello strumento knowledge base.
4. **Post-meeting (entro 24h)**
   - Spostare i file secondo etichetta (§3).
   - Aggiornare board Kanban (§2) e knowledge base (§6).

## 2. Board Kanban dedicato
- **Struttura colonne**: `Da analizzare` → `In validazione` → `In integrazione` → `In playtest` → `Archivio`.
- **Card**: una card per ogni asset o gruppo logico (es. `evo_tactics_unified_pack-v1.9.zip`).
- **Automazioni suggerite**:
  - Creazione card automatica tramite import CSV dal report JSON.
  - Notifica Slack quando una card entra in `In playtest`.
- **Definition of Done per colonna**:
  - `Da analizzare`: asset estratto e metadati compilati.
  - `In validazione`: `report_incoming.sh` eseguito, log allegati.
  - `In integrazione`: task implementativo aperto nel repo (issue/PR) e owner assegnato.
  - `In playtest`: build o scenario disponibile per QA/telemetria.
  - `Archivio`: indice aggiornato (vedi §3.3) con motivazioni.

## 3. Gestione asset dopo il triage
### 3.1 Da integrare
- Spostare asset nella directory target (`packs/`, `docs/`, `tools/`, ...).
- Aprire issue con checklist di integrazione e link al report di validazione.
- Pianificare eventuale sprint tematico (§7).

### 3.2 Archivio storico
- Spostare in `incoming/archive/YYYY/MM/` (creare cartella se assente).
- Aggiornare `incoming/archive/INDEX.md` con tabella motivazioni.
- Aggiungere tag `archivio` nella board Kanban.

### 3.3 Scarto controllato
- Se il materiale è duplicato o obsoleto ma contiene intuizioni, salvarne estratti in `incoming/archive/` e documentarli.
- In caso di file non più utili, eliminarli solo dopo aver verificato che esista copia versionata su repository o drive.

## 4. Ruoli "Caretaker"
| Area | Owner primario | Back-up | Responsabilità |
| --- | --- | --- | --- |
| Core Rules & Stats | Lead Systems Designer | Senior Analyst | Revisione numeri, compatibilità dadi, bilanciamento pack core |
| Specie/Morph & Biomi | Narrative Biome Lead | Worldbuilding | Sincronizzare pacchetti specie/biomi, verificare hook ambienti |
| Personality Modules | Narrative Psych Lead | UX Research | Aggiornare moduli MBTI/Enneagram, definire limiti provvisori |
| Tools & Validation | Toolsmith | QA Automation | Manutenzione script, pipeline CI, documentazione tecnica |

- Ogni caretaker prepara note pre-meeting: highlights dei propri asset, regressioni, richieste.
- Rotazione trimestrale delle responsabilità per evitare single point of failure.

## 5. Documentazione di compatibilità
- Applicare immediatamente le istruzioni di `incoming/GAME_COMPAT_README.md` per l'addon Enneagramma:
  - Aggiornare `compat_map.json` e `personality_module.v1.json` quando l'asset passa in `In integrazione`.
  - Registrare i test rapidi (108 profili) in `reports/incoming/tests/`.
- Replicare la stessa disciplina per altri README guida (`README_INTEGRAZIONE_MECCANICHE.md`, ecc.).
- Allegare i link in ogni card della board Kanban.

## 6. Knowledge base condivisa
- Dopo il meeting, aggiornare pagina Notion/Confluence con sezioni:
  - **Integrati**: elenco + link PR/report.
  - **Backlog**: asset rimasti in `Da analizzare` o `In validazione`.
  - **Archivio**: highlight spunti creativi con riferimento a `incoming/archive/INDEX.md`.
  - **Decisioni**: motivazioni e follow-up.
- In assenza di strumento esterno, usare `docs/process/incoming_review_log.md` con formato meeting template (§8).

## 7. Sprint tematici
- Pianificare sprint di 1-2 settimane focalizzati su cluster (es. "MBTI ↔ Job affinities").
- Input: card `In integrazione` correlate.
- Output: pacchetto aggiornato, test passati, note di tuning.
- Registra risultato sprint in `docs/piani/` con summary e telemetria.

## 8. Template meeting e checklist
- Meeting template: `docs/templates/incoming_triage_meeting.md` (agenda standard, spazio note).
- Checklist operativa: `docs/checklist/incoming_triage.md` (pre/durante/post meeting).
- Salvare meeting note generate in `docs/process/incoming_review_log.md` oppure export su knowledge base.

## 9. Loop feedback playtest & telemetria
- Quando una card entra in `In playtest`:
  - Collegare i file YAML di telemetria (`telemetry/vc.yaml`, `telemetry/pf_session.yaml`).
  - Aprire task QA per comparare ipotesi vs. dati raccolti.
  - Aggiornare card con conclusioni e azioni di tuning.

## 10. Manutenzione strumenti
- Micro-sprint mensile (mezza giornata) per:
  - Aggiornare `scripts/report_incoming.sh` (supporto nuovi formati, log più chiari).
  - Validare schemi JSON utilizzati dagli asset.
  - Sincronizzare script Python/TypeScript per addon (es. Enneagramma) con feedback dell'ultimo triage.
- Registrare azioni in `docs/process/tooling_maintenance_log.md`.

## Metriche di salute
- % asset triagiati entro 7 giorni dall'arrivo.
- Numero di regressioni rilevate dagli script di validazione vs. manuali.
- Tempo medio per passaggio `Da analizzare` → `In integrazione`.

## Allegati
- [Checklist triage](../checklist/incoming_triage.md)
- [Template meeting](../templates/incoming_triage_meeting.md)
- [Indice archivio incoming](../../incoming/archive/INDEX.md)
