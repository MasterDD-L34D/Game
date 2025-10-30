# Incoming Pipeline — Piano di lavoro agentico

Questo backlog traduce le iniziative prioritarie emerse dal report di triage in task eseguibili da agenti specializzati.

## Sessione 2025-10-29 — Kickoff immediato
- **Owner**: `AG-Orchestrator`
- **Obiettivo**: chiudere gli action item generati dal primo ciclo automatizzato e sbloccare l'esecuzione settimanale.
- **Task a breve termine**:
  1. Creare 3 card Kanban (`evo_pacchetto_minimo_v7`, `ancestors_integration_pack_v0_5`, `recon_meccaniche.json`) con owner assegnati ai caretaker e link al report 2025-10-29.
  2. Notificare gli agenti in `#incoming-triage-agenti` includendo riepilogo validazioni e scadenze follow-up.
  3. Registrare l'incidente unzip (`evo_tactics_param_synergy_v8_3.zip`) e aprire ticket manutenzione per `AG-Toolsmith`.

### Note Kanban 2025-11-08

Consultare l'[inventario aggiornato al 2025-10-30](../../reports/incoming/inventory-2025-10-30.md) per il dettaglio completo degli asset presenti in `incoming/` prima di procedere con i task.

| Card | Colonna | Caretaker | Prerequisiti accodati | Next step | Riferimento pre-esecuzione |
| --- | --- | --- | --- | --- | --- |
| `evo_pacchetto_minimo_v7` | In validazione | `AG-Biome` | Annotato fix `unzip -o` come blocco con allegato il log `reports/incoming/validation/evo_pacchetto_minimo_v7-20251030-133350/`. | Condividere ai caretaker l'esito dei validator e preparare il passaggio a `In integrazione` dopo la patch unzip. | [Report sessione-2025-11-14](../../reports/incoming/sessione-2025-11-14/report.html) |
| `ancestors_integration_pack_v0_5` | In validazione | `AG-Core` | Validazioni dataset/ecosistema salvate in `reports/incoming/validation/ancestors_integration_pack_v0_5-20251030-133350/`; resta da completare lo smoke test CLI (`config/cli/staging_incoming.yaml`). | Eseguire `scripts/cli_smoke.sh --profile staging_incoming` con log in `logs/incoming_smoke/` per sbloccare il passaggio a `In integrazione`. | [`scripts/cli_smoke.sh`](../scripts/cli_smoke.sh) |
| `recon_meccaniche.json` | In validazione | `AG-Validation` | Segnato bisogno raccolta stime tempo-analisi e confronto con hook evento correnti. | Consolidare report e passare outcome a `AG-Orchestrator` per decisione. | [Report latest](../../reports/incoming/latest/report.html) |

### Slot calendario condiviso · settimana 2025-11-10

Prima di ogni blocco `AG-Orchestrator` verifica i prerequisiti indicati per evitare blocchi operativi; al termine applica i controlli post-processo per mantenere sincronizzati board, log e knowledge base.

| Slot (CET) | Card Kanban | Prerequisiti da verificare (pre-slot) | Controlli post-processo |
| --- | --- | --- | --- |
| 2025-11-10 10:00–10:45 | `evo_pacchetto_minimo_v7` → focus validazioni | Confermare merge del fix `unzip -o` su `scripts/report_incoming.sh`, rieseguire `./scripts/report_incoming.sh --destination sessione-2025-11-10` e raccogliere i log in `reports/incoming/sessione-2025-11-10/`. | Spostare la card in `In validazione`, allegare il nuovo log nella board, registrare l'esito in `logs/incoming_triage_agenti.md` e aggiornare la sezione corrente di `docs/process/incoming_review_log.md` con summary e link. |
| 2025-11-10 14:30–15:30 | `ancestors_integration_pack_v0_5` → tuning core | Garantire disponibilità ambiente CLI `staging_incoming`, completare smoke test `scripts/cli_smoke.sh --profile staging_incoming` con output salvato in `logs/incoming_smoke/` e confermare caretaker `AG-Core` reperibile. | Aggiornare la card a `In integrazione` con link al risultato dello smoke test, annotare la decisione e il tuning previsto nel log agentico, integrare il follow-up nel knowledge base (`incoming_review_log.md`). |
| 2025-11-11 11:00–12:00 | `recon_meccaniche.json` → consolidamento report | Raccogliere le stime tempo-analisi dagli agenti di dominio, esportare i confronti con gli hook evento correnti e predisporre il report `reports/incoming/latest/report.html` per la review finale. | Applicare l'esito (integrazione o archivio) sulla card Kanban, allegare il report consolidato, aggiornare `logs/incoming_triage_agenti.md` con decisione e follow-up e sintetizzare nel knowledge base con eventuali ticket aperti. |

### Slot calendario condiviso · settimana 2025-11-14

| Slot (CET) | Card / Focus | Dipendenze dichiarate | Checklist / Prerequisiti | Comandi / Script pianificati | Log / Registri da aggiornare |
| --- | --- | --- | --- | --- | --- |
| 2025-11-14 09:30–10:15 | `evo_pacchetto_minimo_v7` → riesecuzione validazioni post-fix unzip | Patch `unzip -o` registrata nel maintenance log (`docs/process/tooling_maintenance_log.md`) e conferma sessione 2025-11-13 nel registro review. Richiede che `AG-Orchestrator` abbia lanciato il Support Hub e preparato il report preliminare. | Checklist triage — sezione Pre-sync (`docs/checklist/incoming_triage.md`) con verifica spazio temporaneo e creazione card. | `./scripts/report_incoming.sh --destination sessione-2025-11-14`<br>`python tools/py/game_cli.py --profile staging_incoming validate-datasets` | `reports/incoming/sessione-2025-11-14/` per HTML/JSON e log validazione · `logs/incoming_triage_agenti.md` per annuncio · `docs/process/incoming_review_log.md` per sintesi slot. |
| 2025-11-14 11:00–12:00 | `ancestors_integration_pack_v0_5` → validazione ecosistema e tuning core | Dipende dal completamento dello slot precedente (log aggiornati) e dalla reperibilità di `AG-Core`/`AG-Validation` come da ruoli caretaker (`docs/process/incoming_triage_pipeline.md`). Necessita smoke test CLI `staging_incoming`. | Checklist triage — sezione Durante la sync (`docs/checklist/incoming_triage.md`) per ownership e note dipendenze + checklist smoke CLI (`scripts/cli_smoke.sh`). | `./scripts/cli_smoke.sh --profile staging_incoming`<br>`python tools/py/game_cli.py --profile staging_incoming validate-ecosystem-pack --json-out reports/incoming/sessione-2025-11-14/ancestors_v0_5.json --html-out reports/incoming/sessione-2025-11-14/ancestors_v0_5.html` | Appendere output smoke in `logs/incoming_smoke/2025-11-14/` · Allegare report pack nella card Kanban · Aggiornare `docs/process/incoming_review_log.md` con decisione tuning. |
| 2025-11-14 15:00–16:00 | `recon_meccaniche.json` → consolidamento insight e handoff knowledge base | Richiede completamento slot mattutini e raccolta stime dominio (vedi note card) più disponibilità `AG-Validation` per confronto con hook evento (`docs/process/incoming_triage_pipeline.md`). | Checklist triage — sezione Post-sync (`docs/checklist/incoming_triage.md`) per aggiornare board, knowledge base e archivio. | `python tools/py/game_cli.py --profile staging_incoming investigate incoming/recon_meccaniche.json --destination analisi-recon-2025-11-14 --html` | Salvare report in `reports/incoming/analisi-recon-2025-11-14/` · Aggiornare `logs/incoming_triage_agenti.md` con outcome · Registrare decisione e follow-up in `docs/process/incoming_review_log.md` e knowledge base. |

## 0. Collegare il Support Hub alla pipeline incoming
- **Agente owner**: `AG-Orchestrator`
- **Supporto**: `AG-Toolsmith`
- **Stato**: ✅ Validazione iniziale completata il 2025-10-29 (widget "Ultimo report triage" ora mostra la sessione 2025-10-29).
- **Attività**:
  1. Validare che la sezione "Incoming Pipeline" di `docs/index.html` generi correttamente il comando `report_incoming.sh` e mostri l'ultimo report dal log.
  2. Aggiornare `docs/process/incoming_review_log.md` subito dopo ogni sessione per mantenere coerente il widget web.
  3. Segnalare in `docs/process/tooling_maintenance_log.md` eventuali modifiche necessarie al Support Hub (es. parsing del log, nuovi link rapidi).
- **Deliverable**: sezione web funzionante con link aggiornati a playbook, checklist, backlog e archivio.

## 1. Programmare il ciclo settimanale "Incoming Review"
- **Agente owner**: `AG-Orchestrator`
- **Stato**: ⚠️ Avvio manuale completato il 2025-10-29; schedulazione cron `incoming_review_weekly` ancora da configurare per avvio automatico 2025-11-03 h09:00 UTC.
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
- **Stato**: ❌ Fermo per incidente unzip su `evo_tactics_param_synergy_v8_3.zip` (vedi log 2025-10-29); ripartenza subordinata alla patch di `AG-Toolsmith`.
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
- **Stato**: ⚠️ Nuova voce da registrare entro 2025-10-30 per fix `unzip -o` su `scripts/report_incoming.sh`.
- **Attività**:
  1. Programmare micro-sprint mensile per aggiornare `scripts/report_incoming.sh` e schemi JSON.
  2. Sincronizzare hook Python/TypeScript dell'addon Enneagramma con feedback dell'ultimo triage.
  3. Registrare ogni attività in `docs/process/tooling_maintenance_log.md` e conferma test di `AG-Validation`.
- **Deliverable**: log manutenzione aggiornato e strumenti allineati all'ultimo ciclo.
