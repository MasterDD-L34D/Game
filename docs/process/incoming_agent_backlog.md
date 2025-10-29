# Incoming Pipeline — Piano di lavoro agentico

Questo backlog traduce le iniziative prioritarie emerse dal report di triage in task eseguibili da agenti specializzati.

## 0. Collegare il Support Hub alla pipeline incoming
- **Agente owner**: `AG-Orchestrator`
- **Supporto**: `AG-Toolsmith`
- **Attività**:
  1. Validare che la sezione "Incoming Pipeline" di `docs/index.html` generi correttamente il comando `report_incoming.sh` e mostri l'ultimo report dal log.
  2. Aggiornare `docs/process/incoming_review_log.md` subito dopo ogni sessione per mantenere coerente il widget web.
  3. Segnalare in `docs/process/tooling_maintenance_log.md` eventuali modifiche necessarie al Support Hub (es. parsing del log, nuovi link rapidi).
- **Deliverable**: sezione web funzionante con link aggiornati a playbook, checklist, backlog e archivio.

## 1. Programmare il ciclo settimanale "Incoming Review"
- **Agente owner**: `AG-Orchestrator`
- **Attività**:
  1. Configurare cron job `incoming_review_weekly` (lunedì h09:00 UTC) che avvia `./scripts/report_incoming.sh --destination sessione-$(date +%Y-%m-%d)`.
  2. Pubblicare automaticamente il link al report su canale `#incoming-triage-agenti` e aggiornare l'agenda condivisa.
  3. Creare/aggiornare sezione corrente in `docs/process/incoming_review_log.md` utilizzando il [template](../templates/incoming_triage_meeting.md).
  4. Prima di eseguire il cron manuale, verificare dal Support Hub che il widget "Ultimo report triage" non segnali follow-up pendenti.
- **Deliverable**: log sessione popolato, report accessibile, board Kanban sincronizzata.

## 2. Automatizzare il board Kanban dei materiali
- **Agente owner**: `AG-Orchestrator`
- **Supporto**: `AG-Validation`
- **Attività**:
  1. Integrare import JSON dei report per generare/aggiornare card (`Da analizzare`).
  2. Implementare webhook che sposta card verso `In validazione` quando `AG-Validation` completa l'analisi.
  3. Agganciare notifica quando card entra in `In playtest`.
- **Deliverable**: board popolata senza intervento umano, con stato coerente ai log.

## 3. Assegnare caretaker agentici per i macro filoni
- **Agente owner**: `AG-Orchestrator`
- **Attività**:
  1. Registrare gli assignment nel [playbook](incoming_triage_pipeline.md#4-ruoli-caretaker-agentici).
  2. Creare reminder settimanale per raccolta note da `AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith`.
  3. Abilitare failover verso agenti di back-up in caso di inattività >24h.
- **Deliverable**: tabella caretaker aggiornata e reminder automatici attivi.

## 4. Standardizzare la documentazione di compatibilità
- **Agente owner**: `AG-Personality`
- **Supporto**: `AG-Core`
- **Attività**:
  1. Sincronizzare `compat_map.json` e `personality_module.v1.json` con le istruzioni di `incoming/GAME_COMPAT_README.md` appena una card passa a `In integrazione`.
  2. Registrare test rapidi (108 profili) in `reports/incoming/tests/` e allegarli alla card.
  3. Replicare la pipeline per altri README guida (es. `README_INTEGRAZIONE_MECCANICHE.md`).
- **Deliverable**: checklist compatibilità completata per ogni asset personality.

## 5. Proteggere idee "perse" e scarti interessanti
- **Agente owner**: `AG-Orchestrator`
- **Supporto**: agenti di dominio
- **Attività**:
  1. Spostare materiali non integrati in `incoming/archive/YYYY/MM/` e documentare su `incoming/archive/INDEX.md`.
  2. Estrarre highlight e salvarli come snippet o README locale.
  3. Pianificare revisione trimestrale con promemoria automatico.
- **Deliverable**: archivio completo di motivazioni e spunti riusabili.

## 6. Automatizzare i controlli di regressione
- **Agente owner**: `AG-Validation`
- **Supporto**: `AG-Toolsmith`
- **Attività**:
  1. Collegare `tools/py/game_cli.py validate-*` e `tools/ts/validate_species.ts` alla pipeline CI su merge verso `main`.
  2. Pubblicare badge di stato nel report settimanale.
  3. Aprire issue automatiche quando i validatori falliscono.
- **Deliverable**: smoke-test suite attiva e monitorabile.

## 7. Programmare sprint tematici
- **Agente owner**: `AG-Orchestrator`
- **Attività**:
  1. Analizzare timeline feature map per suggerire cluster (es. "MBTI ↔ Job affinities").
  2. Creare task `sprint_<tema>_<YYYYMM>` in board dedicata con definizione DoD.
  3. Al termine, aggiornare `docs/piani/` con summary e telemetria.
- **Deliverable**: sprint documentati e collegati agli asset integrati.

## 8. Curare la knowledge base condivisa
- **Agente owner**: `AG-Orchestrator`
- **Attività**:
  1. Aggiornare pagina Notion/Confluence agentica con sezioni Integrati/Backlog/Archivio/Decisioni.
  2. Allegare screenshot, snippet hook e link report.
  3. In assenza di strumenti esterni, sincronizzare `docs/process/incoming_review_log.md` e generare export Markdown.
- **Deliverable**: knowledge base allineata al termine di ogni ciclo settimanale.

## 9. Loop di feedback con playtest e telemetria
- **Agente owner**: `AG-Validation`
- **Supporto**: agenti di dominio
- **Attività**:
  1. Quando una card passa in `In playtest`, agganciare `telemetry/vc.yaml` e `telemetry/pf_session.yaml`.
  2. Confrontare dati raccolti con ipotesi salvate nei documenti incoming.
  3. Aprire ticket di tuning se gli scostamenti superano le soglie definite.
- **Deliverable**: report di confronto telemetrico allegato alla card.

## 10. Budget di manutenzione strumenti
- **Agente owner**: `AG-Toolsmith`
- **Supporto**: `AG-Validation`
- **Attività**:
  1. Programmare micro-sprint mensile per aggiornare `scripts/report_incoming.sh` e schemi JSON.
  2. Sincronizzare hook Python/TypeScript dell'addon Enneagramma con feedback dell'ultimo triage.
  3. Registrare ogni attività in `docs/process/tooling_maintenance_log.md` e conferma test di `AG-Validation`.
- **Deliverable**: log manutenzione aggiornato e strumenti allineati all'ultimo ciclo.
