---
title: Evo Final Design — Roadmaps Index
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Evo Final Design — Roadmaps Index

## Scopo

Questo bundle raccoglie i file roadmap del repo **Game / Evo Tactics** come supporto operativo al [`Final Design Freeze`](../core/90-FINAL-DESIGN-FREEZE.md), che e' il riferimento canonico di sintesi del prodotto.

### Assunzione di riferimento

Il freeze vive in [`docs/core/90-FINAL-DESIGN-FREEZE.md`](../core/90-FINAL-DESIGN-FREEZE.md). Se in futuro il path cambiasse, aggiornare i riferimenti interni con una sostituzione globale.

## Legenda operativa

| Stato | Significato                                |
| ----- | ------------------------------------------ |
| ☐     | Da fare                                    |
| ☐→☑  | In corso / da consolidare                  |
| ☑    | Chiuso / assunto come baseline documentata |

## Ordine consigliato di lettura

| Stato | Task                                                                                                | Dettagli operativi                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| ☑    | Leggere [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md)                               | Documento sorgente di scope, tesi di design, sistemi, contenuti e vincoli cross-repo.                                |
| ☑    | Leggere [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)         | Mappa delle autorita: stabilisce chi vince in caso di conflitto tra freeze, ADR, hub, YAML, Canvas e file operativi. |
| ☑    | Leggere [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md)                     | Vista manageriale e di produzione: fasi, milestone, dipendenze, owner e criteri di uscita.                           |
| ☑    | Leggere [`EVO_FINAL_DESIGN_MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md)         | Gate formali, test, validator, rollback e condizioni di freeze.                                                      |
| ☑    | Leggere [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md)                 | Registro completo di epic e task esecutivi, già pronto per backlog / issue / Codex executor.                         |
| ☑    | Leggere [`EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK`](EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md) | Guida per usare i file con Codex rispettando AGENTS, BOOT_PROFILE, COMMAND_LIBRARY, strict-mode e fast-path.         |
| ☑    | Leggere [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC`](EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md)             | Piano cross-repo Game ↔ Game-Database, con confine architetturale, import cadence e trigger futuri.                 |

## File inclusi nel bundle

| Stato | Task                                                                                           | Dettagli operativi                                                                  |
| ----- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| ☑    | `EVO_FINAL_DESIGN_ROADMAPS_INDEX.md` _(questo file)_                                           | Indice del bundle, ordine di lettura e mappa dei file.                              |
| ☑    | [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)         | Mappa delle autorita documentali e regole di risoluzione conflitti.                 |
| ☑    | [`EVO_FINAL_DESIGN_MASTER_ROADMAP.md`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md)                     | Roadmap principale da allegare al freeze.                                           |
| ☑    | [`EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md)         | Milestone, exit criteria, validator, smoke, rollback, release gate.                 |
| ☑    | [`EVO_FINAL_DESIGN_BACKLOG_REGISTER.md`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md)                 | Registro task dettagliato per sistema, contenuto, UX, QA, release e cross-repo.     |
| ☑    | [`EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md`](EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md) | Playbook Codex-oriented con prompt, regole di esecuzione, naming e policy di patch. |
| ☑    | [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md`](EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md)             | Piano dedicato all’import e alla futura integrazione con Game-Database.             |

## Fonti repo da trattare come base

### Canoniche

- `docs/core/40-ROADMAP.md`
- `docs/hubs/combat.md`
- `docs/combat/README.md`
- `docs/adr/ADR-2026-04-13-rules-engine-d20.md`
- `docs/adr/ADR-2026-04-14-game-database-topology.md`
- `AGENTS.md`
- `.ai/BOOT_PROFILE.md`
- `docs/ops/COMMAND_LIBRARY.md`
- `docs/process/milestones.md`
- `docs/process/action-items.md`
- `docs/governance/docs_registry.json`
- `CLAUDE.md`

### Note di lettura importanti

| Stato | Task                                                                                                                                         | Dettagli operativi                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | Trattare `docs/core/40-ROADMAP.md` come target di prodotto                                                                                   | Fissa l’orizzonte MVP → Alpha: core TBT, 6 specie, 6 job, telemetria VC, 12 regole sblocco, UI identità, 2 mappe, 50 playtest.    |
| ☑    | Trattare combat hub e combat README come fonte del nucleo giocabile                                                                          | Il rules engine d20 è oggi il sottosistema più vicino a un sistema eseguibile e testabile.                                        |
| ☑    | Trattare `ADR-2026-04-14-game-database-topology.md` come confine non negoziabile                                                             | `Game` resta runtime source of truth; `Game-Database` resta CMS + import target, non dipendenza runtime.                          |
| ☑    | Trattare `docs/process/milestones.md` e `docs/process/action-items.md` come storico operativo, non come roadmap finale da riusare alla cieca | Contengono task ancora utili, ma molti riferimenti sono legati all’ondata VC 2025 e vanno reinterpretati in chiave freeze finale. |

## Posizionamento consigliato nel repo

| Stato | Task                                     | Dettagli operativi                                                                                   |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ☑    | Salvare questi file in `docs/planning/`  | Coerente con la presenza di altri documenti di piano e di migrazione.                                |
| ☑    | Aggiungere i nuovi file al registry docs | Aggiornare `docs/governance/docs_registry.json` se vuoi renderli visibili come documenti governati.  |
| ☑    | Linkare il bundle dal freeze finale      | Inserire una sezione “Roadmap & Execution Files” nel freeze, con link espliciti ai file di planning. |

## Uso pratico con Codex

| Stato | Task              | Dettagli operativi                                                                                                      |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ☑    | Avvio consigliato | `Per favore, leggi e applica .ai/BOOT_PROFILE.md...`                                                                    |
| ☑    | Design-only       | Usare il bundle in info-only o `COMANDO: PIPELINE_DESIGNER` / `PIPELINE_SIMULATOR` per disegnare il lavoro senza patch. |
| ☑    | Esecuzione        | Usare backlog + milestone + playbook per lanciare step puntuali con `PIPELINE_EXECUTOR`.                                |
| ☑    | Merge             | Nessun merge senza validator PASS, changelog, rollback plan e approvazione Master DD.                                   |
