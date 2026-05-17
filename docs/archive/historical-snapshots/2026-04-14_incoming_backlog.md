---
title: Incoming Agent Backlog — Snapshot pre-archiviazione 2026-04-14
doc_status: historical_ref
doc_owner: incoming-archivist
workstream: incoming
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Incoming Agent Backlog — Snapshot pre-archiviazione 2026-04-14

## Contesto del triage

Questo file conserva, congelato al 2026-04-14, il contenuto integrale di
`docs/process/incoming_agent_backlog.md` come era prima dell'archiviazione.
Il backlog originale era stato generato durante la sessione di kickoff del
2025-10-29 con 13 voci (kickoff + 2 settimane di slot + 10 task numerati 0-10),
tutte legate all'iniziativa "Incoming Pipeline / Support Hub / AG-Orchestrator".

Cinque mesi dopo (aprile 2026) il triage ha rilevato che:

- L'iniziativa "Incoming Review settimanale" si è fermata dopo 3 sessioni
  (`docs/process/incoming_review_log.md`: 2025-10-29, 2025-10-30, 2025-11-13)
  e non ha più avuto follow-up.
- Il cron `incoming_review_weekly` previsto dal Task #1 non è mai stato
  configurato.
- Diverse reference citate nel backlog non esistono nel repo:
  `docs/checklist/incoming_triage.md`, `logs/incoming_triage_agenti.md`,
  `compat_map.json`, `telemetry/vc.yaml`, `telemetry/pf_session.yaml`,
  `reports/incoming/sessione-2025-11-*/`, `reports/incoming/latest/`,
  `incoming/archive/INDEX.md`.
- Gli agenti `AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith` sono
  concept del routing Codex non più attivi nei flussi recenti.

### Verdetto per voce

| Voce                                                  | Verdetto   | Motivazione                                                                                                                                                                                                             |
| ----------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kickoff 2025-10-29 (3 card + notifica + ticket unzip) | DEAD       | Card mai create come tracciate in repo, scadenza 5 mesi fa                                                                                                                                                              |
| Slot calendario 2025-11-10 e 2025-11-14               | DEAD       | Slot orari passati da 5 mesi, mai eseguiti                                                                                                                                                                              |
| 0. Collegare Support Hub alla pipeline incoming       | DONE/STALE | Stato originale "✅ completata 2025-10-29"; il widget `docs/index.html` esiste ma punta a sessioni vecchie                                                                                                              |
| 1. Cron `incoming_review_weekly`                      | DEAD       | Cron mai configurato, ultimo run manuale 2025-11-13                                                                                                                                                                     |
| 2. Webhook board Kanban                               | DEAD       | Nessuna board Kanban tracciata in repo                                                                                                                                                                                  |
| 3. Caretaker agentici `AG-*`                          | DEAD       | Concept Codex non più attivi nei flussi recenti                                                                                                                                                                         |
| 4. Standardizzare doc compatibilità                   | DEAD       | `compat_map.json` non esiste, "108 profili test" mai materializzati                                                                                                                                                     |
| 5. Archivio idee in `incoming/archive/`               | DEAD       | `incoming/archive/INDEX.md` mai creato                                                                                                                                                                                  |
| 6. Regression check CI sui validator                  | **DONE**   | `ci.yml` lines 184/315/318/355 invocano già `validate_species.js`, `game_cli.py validate-datasets`, `validate-ecosystem-pack`, più i workflow dedicati `validate_traits.yml`, `data-quality.yml`, `schema-validate.yml` |
| 7. Sprint tematici                                    | DEAD       | Roadmap-level mai iniziato                                                                                                                                                                                              |
| 8. Knowledge base Notion/Confluence                   | DEAD       | Nessuna integrazione esterna in repo                                                                                                                                                                                    |
| 9. Loop telemetria playtest                           | DEAD       | `telemetry/vc.yaml` e `pf_session.yaml` non esistono                                                                                                                                                                    |
| 10. Budget manutenzione strumenti                     | DEAD       | Voce specifica `unzip -o` scaduta 2025-10-30                                                                                                                                                                            |

Nessuna voce è stata trasferita in un nuovo backlog: tutte sono DEAD o già DONE
(Task #6 coperto da CI, Task #0 coperto dal Support Hub esistente).

Il file vivente `docs/process/incoming_agent_backlog.md` è stato sostituito con
una nota di archiviazione che rimanda a questo snapshot.

---

# Contenuto originale (frozen 2026-04-14)

> Sotto: trascrizione integrale di `docs/process/incoming_agent_backlog.md` come
> era prima del triage. Tutte le indicazioni operative qui sotto sono **storiche**
> e non vanno eseguite.

## Sessione 2025-10-29 — Kickoff immediato

- **Owner**: `AG-Orchestrator`
- **Obiettivo**: chiudere gli action item generati dal primo ciclo automatizzato e sbloccare l'esecuzione settimanale.
- **Task a breve termine**:
  1. Creare 3 card Kanban (`evo_pacchetto_minimo_v7`, `ancestors_integration_pack_v0_5`, `recon_meccaniche.json`) con owner assegnati ai caretaker e link al report 2025-10-29.
  2. Notificare gli agenti in `#incoming-triage-agenti` includendo riepilogo validazioni e scadenze follow-up.
  3. Registrare l'incidente unzip (`evo_tactics_param_synergy_v8_3.zip`) e aprire ticket manutenzione per `AG-Toolsmith`.

### Note Kanban 2025-11-08

Consultare l'inventario aggiornato al 2025-10-30 per il dettaglio completo degli asset presenti in `incoming/` prima di procedere con i task.

| Card                              | Colonna        | Caretaker       | Prerequisiti accodati                                                                                                                                                                                 | Next step                                                                                                        |
| --------------------------------- | -------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `evo_pacchetto_minimo_v7`         | In validazione | `AG-Biome`      | Annotato fix `unzip -o` come blocco con allegato il log `reports/incoming/validation/evo_pacchetto_minimo_v7-20251030-133350/`.                                                                       | Condividere ai caretaker l'esito dei validator e preparare il passaggio a `In integrazione` dopo la patch unzip. |
| `ancestors_integration_pack_v0_5` | In validazione | `AG-Core`       | Validazioni dataset/ecosistema salvate in `reports/incoming/validation/ancestors_integration_pack_v0_5-20251030-133350/`; resta da completare lo smoke test CLI (`config/cli/staging_incoming.yaml`). | Eseguire `scripts/cli_smoke.sh --profile staging_incoming` con log in `logs/incoming_smoke/`.                    |
| `recon_meccaniche.json`           | In validazione | `AG-Validation` | Segnato bisogno raccolta stime tempo-analisi e confronto con hook evento correnti.                                                                                                                    | Consolidare report e passare outcome a `AG-Orchestrator` per decisione.                                          |

### Slot calendario condiviso · settimana 2025-11-10

| Slot (CET)             | Card Kanban                                     | Prerequisiti                                                                                                                                      | Controlli post-processo                                                                                                                                            |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2025-11-10 10:00–10:45 | `evo_pacchetto_minimo_v7` → focus validazioni   | Confermare merge del fix `unzip -o` su `scripts/report_incoming.sh`, rieseguire `./scripts/report_incoming.sh --destination sessione-2025-11-10`. | Spostare la card in `In validazione`, allegare log nella board, registrare in `logs/incoming_triage_agenti.md` e aggiornare `docs/process/incoming_review_log.md`. |
| 2025-11-10 14:30–15:30 | `ancestors_integration_pack_v0_5` → tuning core | Garantire disponibilità ambiente CLI `staging_incoming`, completare smoke test.                                                                   | Aggiornare card a `In integrazione`, annotare decisione e tuning previsto nel log agentico.                                                                        |
| 2025-11-11 11:00–12:00 | `recon_meccaniche.json` → consolidamento report | Raccogliere stime tempo-analisi, esportare confronti con hook evento, predisporre report finale.                                                  | Applicare esito (integrazione o archivio) sulla card, allegare report consolidato.                                                                                 |

### Slot calendario condiviso · settimana 2025-11-14

| Slot (CET)             | Card / Focus                                                             | Comandi pianificati                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-14 09:30–10:15 | `evo_pacchetto_minimo_v7` → riesecuzione validazioni post-fix unzip      | `./scripts/report_incoming.sh --destination sessione-2025-11-14` + `python tools/py/game_cli.py --profile staging_incoming validate-datasets`     |
| 2025-11-14 11:00–12:00 | `ancestors_integration_pack_v0_5` → validazione ecosistema e tuning core | `./scripts/cli_smoke.sh --profile staging_incoming` + `python tools/py/game_cli.py --profile staging_incoming validate-ecosystem-pack`            |
| 2025-11-14 15:00–16:00 | `recon_meccaniche.json` → consolidamento insight                         | `python tools/py/game_cli.py --profile staging_incoming investigate incoming/recon_meccaniche.json --destination analisi-recon-2025-11-14 --html` |

## 0. Collegare il Support Hub alla pipeline incoming

- **Agente owner**: `AG-Orchestrator`
- **Supporto**: `AG-Toolsmith`
- **Stato originale**: ✅ Validazione iniziale completata il 2025-10-29.
- **Attività**: validare la sezione "Incoming Pipeline" di `docs/index.html`, aggiornare `docs/process/incoming_review_log.md` dopo ogni sessione, segnalare modifiche al Support Hub in `tooling_maintenance_log.md`.
- **Deliverable**: sezione web funzionante con link aggiornati a playbook, checklist, backlog e archivio.

## 1. Programmare il ciclo settimanale "Incoming Review"

- **Agente owner**: `AG-Orchestrator`
- **Stato originale**: ⚠️ Avvio manuale completato 2025-10-29; cron `incoming_review_weekly` ancora da configurare.
- **Attività**: configurare cron job lunedì h09:00 UTC, pubblicare link al report su `#incoming-triage-agenti`, aggiornare sezione corrente di `docs/process/incoming_review_log.md`.
- **Deliverable**: log sessione popolato, report accessibile, board Kanban sincronizzata.

## 2. Automatizzare il board Kanban dei materiali

- **Agente owner**: `AG-Orchestrator`
- **Supporto**: `AG-Validation`
- **Attività**: integrare import JSON dei report per generare card, implementare webhook che sposta card a `In validazione`, agganciare notifica per `In playtest`.
- **Deliverable**: board popolata senza intervento umano.

## 3. Assegnare caretaker agentici per i macro filoni

- **Agente owner**: `AG-Orchestrator`
- **Attività**: registrare assignment nel playbook, creare reminder settimanale per `AG-Core`/`AG-Biome`/`AG-Personality`/`AG-Toolsmith`, abilitare failover.
- **Deliverable**: tabella caretaker aggiornata e reminder automatici attivi.

## 4. Standardizzare la documentazione di compatibilità

- **Agente owner**: `AG-Personality`
- **Supporto**: `AG-Core`
- **Attività**: sincronizzare `compat_map.json` e `personality_module.v1.json` con `incoming/GAME_COMPAT_README.md`, registrare test rapidi (108 profili), replicare per altri README.
- **Deliverable**: checklist compatibilità completata per ogni asset personality.

## 5. Proteggere idee "perse" e scarti interessanti

- **Agente owner**: `AG-Orchestrator`
- **Attività**: spostare materiali non integrati in `incoming/archive/YYYY/MM/`, estrarre highlight, pianificare revisione trimestrale.
- **Deliverable**: archivio completo di motivazioni e spunti riusabili.

## 6. Automatizzare i controlli di regressione

- **Agente owner**: `AG-Validation`
- **Supporto**: `AG-Toolsmith`
- **Stato originale**: ❌ Fermo per incidente unzip su `evo_tactics_param_synergy_v8_3.zip`.
- **Attività**: collegare `tools/py/game_cli.py validate-*` e `tools/ts/validate_species.ts` alla pipeline CI su merge verso `main`, pubblicare badge di stato, aprire issue automatiche.
- **Verdetto 2026-04-14**: **DONE**. Tutti i validator citati sono già in CI (`ci.yml` lines 184/315/318/355), più workflow dedicati `validate_traits.yml`, `data-quality.yml`, `schema-validate.yml`.

## 7. Programmare sprint tematici

- **Agente owner**: `AG-Orchestrator`
- **Attività**: analizzare timeline feature map, creare task `sprint_<tema>_<YYYYMM>` con DoD, aggiornare `docs/piani/`.
- **Deliverable**: sprint documentati e collegati agli asset integrati.

## 8. Curare la knowledge base condivisa

- **Agente owner**: `AG-Orchestrator`
- **Attività**: aggiornare pagina Notion/Confluence agentica, allegare screenshot/snippet/link, in alternativa sincronizzare `incoming_review_log.md`.
- **Deliverable**: knowledge base allineata al termine di ogni ciclo settimanale.

## 9. Loop di feedback con playtest e telemetria

- **Agente owner**: `AG-Validation`
- **Supporto**: agenti di dominio
- **Attività**: agganciare `telemetry/vc.yaml` e `telemetry/pf_session.yaml` quando una card passa in `In playtest`, confrontare dati con ipotesi, aprire ticket di tuning.
- **Deliverable**: report di confronto telemetrico allegato alla card.

## 10. Budget di manutenzione strumenti

- **Agente owner**: `AG-Toolsmith`
- **Supporto**: `AG-Validation`
- **Stato originale**: ⚠️ Nuova voce da registrare entro 2025-10-30 per fix `unzip -o`.
- **Attività**: programmare micro-sprint mensile per aggiornare `scripts/report_incoming.sh` e schemi JSON, sincronizzare hook Python/TypeScript dell'addon Enneagramma, registrare in `tooling_maintenance_log.md`.
- **Deliverable**: log manutenzione aggiornato e strumenti allineati.

---

_Frozen 2026-04-14 — non modificare. Il file vivente `docs/process/incoming_agent_backlog.md` è ora una nota di archiviazione che rimanda qui._
