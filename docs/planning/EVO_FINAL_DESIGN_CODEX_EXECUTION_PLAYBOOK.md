---
title: Evo Final Design — Codex Execution Playbook
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Evo Final Design — Codex Execution Playbook

## 1. Scopo

Questa guida dice a Codex come usare il freeze e le roadmap senza creare drift, scorciatoie pericolose o patch fuori perimetro.

## 2. Fonti da caricare all’avvio

| Stato | Task                       | Dettagli operativi                                                                                                                                  |
| ----- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | AGENTS bootstrap           | `AGENTS.md` come indice iniziale.                                                                                                                   |
| ☑    | Profilo completo           | `.ai/BOOT_PROFILE.md` per strict-mode, router automatico, Command Library, Golden Path.                                                             |
| ☑    | Macro-comandi              | `docs/ops/COMMAND_LIBRARY.md`.                                                                                                                      |
| ☑    | Freeze                     | [`docs/core/90-FINAL-DESIGN-FREEZE.md`](../core/90-FINAL-DESIGN-FREEZE.md).                                                                         |
| ☑    | Authority map              | [`docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md).                                               |
| ☑    | Roadmap master             | [`docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md).                                                           |
| ☑    | Gates                      | [`docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md).                                               |
| ☑    | Backlog                    | [`docs/planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md).                                                       |
| ☑    | Cross-repo plan            | [`docs/planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md`](EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) se il task tocca import, taxonomy o Game-Database. |
| ☑    | Guardrail operativi locali | `CLAUDE.md` per coding workflow, guardrail file sensibili, DoD locale e realta architetturale del repo.                                             |

## 3. Prompt consigliato di avvio

```text
Per favore, leggi e applica .ai/BOOT_PROFILE.md.
Conferma strict-mode, router automatico, Command Library e Golden Path caricati.
Poi usa come baseline:
- docs/core/90-FINAL-DESIGN-FREEZE.md
- docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md
- docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md
- docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md
- docs/planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md

Task:
[lavoro preciso]
```

## 4. Modalità corrette di utilizzo

### 4.1 Info-only

Usare quando si vuole:

- analizzare;
- riassumere;
- proporre;
- istanziare pipeline senza patch.

### 4.2 Action-required

Usare quando si vuole:

- scrivere file;
- modificare YAML/JSON/MD;
- lanciare validator o test;
- preparare patchset.

## 5. Comandi consigliati

### Per disegnare lavoro senza modifiche

```text
COMANDO: PIPELINE_DESIGNER
AGENTE: coordinator
Task:
Genera una pipeline multi-agente per chiudere [ID task o milestone].
Usa come baseline il Final Design Freeze e il bundle roadmap.
Non eseguire ancora, solo design.
```

### Per simulare l’intera esecuzione

```text
COMANDO: PIPELINE_SIMULATOR
Pipeline:
[incolla pipeline]
Task:
Simula tutti gli step e indica file coinvolti, dipendenze, rischi e output finale.
```

### Per eseguire un singolo step

```text
COMANDO: PIPELINE_EXECUTOR
Pipeline:
[incolla pipeline]
Task:
Esegui lo step N.
Rispettare il freeze, i gate e il backlog register.
Mostra piano, file coinvolti, impatti e self-critique.
```

## 6. Regole ferree

| Stato | Task                                                                | Dettagli operativi                                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | Non inventare semantica                                             | Usare solo i comandi definiti dalla Command Library.                                                                                                                                                              |
| ☑    | Non allargare scope                                                 | Se una richiesta richiede nuove meccaniche core, fermarsi e segnalarlo.                                                                                                                                           |
| ☑    | Non rompere il confine Game/DB                                      | Nessuna dipendenza runtime verso Game-Database introdotta durante il freeze.                                                                                                                                      |
| ☑    | Non saltare il balance layer                                        | Nessuna decisione finale di tuning senza passare dal layer numerico e dai test.                                                                                                                                   |
| ☑    | Non usare FAST_PATH su task rischiosi                               | FAST_PATH solo per patch piccole, isolate e non core.                                                                                                                                                             |
| ☑    | Non toccare troppi file insieme senza piano                         | Per lavori multi-file usare pipeline o piano 3–7 punti minimo.                                                                                                                                                    |
| ☑    | Non promuovere `CLAUDE.md` / `AGENTS.md` a fonte canonica di design | Questi file governano **come** si lavora (modalita' operativa degli agenti), non **cosa** diventa canonico nel design. Le decisioni di design si prendono in freeze, ADR, hub, core data — non in file operativi. |

## 7. Quando usare FAST_PATH

Usare `FAST_PATH: true` solo se:

- la patch riguarda markdown/config a basso rischio;
- massimo 3 file;
- massimo 100 linee totali modificate;
- nessun file runtime, schema, dataset core o validator;
- nessuna creazione/eliminazione file sensibile.

Non usare `FAST_PATH` per:

- combat canon;
- trait mechanics;
- core datasets;
- import contract;
- gate o rollback plan ad alto impatto;
- modifiche cross-repo.

## 8. Routing consigliato per il final design

| Stato | Task                      | Dettagli operativi                                                |
| ----- | ------------------------- | ----------------------------------------------------------------- |
| ☑    | `coordinator`             | Pianificazione, priorità, dipendenze, gate, sequenza esecutiva.   |
| ☑    | `balancer`                | Trait mechanics, economy, stress, CD, HP, numeri e scaling.       |
| ☑    | `trait-curator`           | Trait, pool, glossari, normalizzazioni e mapping.                 |
| ☑    | `species-curator`         | Species slice, morph budget, compatibilità, requisiti.            |
| ☑    | `biome-ecosystem-curator` | Biomi, hazard, ecosystem, encounter.                              |
| ☑    | `archivist`               | Docs, registry, changelog, cross-link e bundle.                   |
| ☑    | `dev-tooling`             | Validator, CI, smoke, runbook, script, rollback support.          |
| ☑    | `asset-prep`              | Solo per materiali visuali o cataloghi asset realmente coinvolti. |

## 9. Sequenza consigliata per i task principali

| Stato | Task   | Dettagli operativi                                              |
| ----- | ------ | --------------------------------------------------------------- |
| ☑    | Step 1 | Pubblicare freeze e bundle roadmap.                             |
| ☑    | Step 2 | Disegnare pipeline per M1 Combat Freeze.                        |
| ☑    | Step 3 | Eseguire task `FD-020..030` (EPIC C Combat).                    |
| ☑    | Step 4 | Disegnare ed eseguire pipeline M2 Balance & Progression.        |
| ☑    | Step 5 | Chiudere content slice e vertical slice.                        |
| ☑    | Step 6 | Chiudere HUD/telemetry shipping layer.                          |
| ☑    | Step 7 | Chiudere meta slice e import contract.                          |
| ☑    | Step 8 | Correre verso G6 con validator, smoke, playtest, PR e sign-off. |

## 10. Template di task per Codex

### Template design-only

```text
AGENTE: coordinator
Task:
Analizza il backlog `FD-060..068` (EPIC F Species).
Usa freeze + roadmap + gates.
Restituisci una pipeline eseguibile senza toccare file.
```

### Template action-required per documentazione

```text
AGENTE: archivist
Task:
Aggiorna `docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md`
allineando gli owner e i gate chiusi.
Mostra prima il piano e poi il diff.
```

### Template action-required per tuning

```text
AGENTE: balancer
Task:
Lavora su `FD-040..046` (EPIC D Balance layer).
Analizza `trait_mechanics.yaml`, individua placeholder e proponi una patch ragionata.
Non applicare nulla senza preview e senza check dei test collegati.
```

## 11. Merge checklist per Codex

| Stato | Task                       | Dettagli operativi                                         |
| ----- | -------------------------- | ---------------------------------------------------------- |
| ☐     | Validator report collegato | Nessuna PR senza report PASS.                              |
| ☐     | Changelog aggiornato       | Inserire la voce pertinente.                               |
| ☐     | Rollback plan 03A          | Richiesto nelle note PR se il task ha impatto serio.       |
| ☐     | Master DD approval         | Linkare commento, issue o nota di approvazione.            |
| ☐     | File toccati elencati      | Riepilogo chiaro di impatto.                               |
| ☐     | Gate coerente              | La PR deve dichiarare quale gate avanza e quale non tocca. |

## 12. Anti-pattern da evitare

| Stato | Task                                                       | Dettagli operativi                                         |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| ☑    | Patch grandi senza roadmap                                 | Alto rischio di drift e regressione.                       |
| ☑    | Cambio contemporaneo di combat, UI e DB                    | Mischia workstream e rende impossibile il rollback pulito. |
| ☑    | Introduzione di nuove feature “interessanti” a metà freeze | Distrugge il perimetro finale.                             |
| ☑    | Uso del Game-Database come sorgente runtime implicita      | Contraddice l’ADR topology.                                |
| ☑    | Telemetria usata come psicologia vera                      | Contraddice il design freeze.                              |

## 13. Guardrail minimi da rispettare

| Stato | Task                                        | Dettagli operativi                                                                                                            |
| ----- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ☑    | Non ridefinire la gerarchia delle fonti     | Se c'e conflitto, consultare prima la Source Authority Map.                                                                   |
| ☑    | Non toccare file sensibili senza escalation | `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/` richiedono prudenza ed eventuale conferma. |
| ☑    | Non hardcodare trait nel resolver           | I trait attivi devono vivere nei dati e non nel codice di risoluzione.                                                        |
| ☑    | Aggiornare docs correlate quando richiesto  | Se si tocca `services/rules/`, aggiornare l'hub combat e i riferimenti docs rilevanti.                                        |
| ☑    | Tenere working tree pulito                  | Nessuna esecuzione e nessun patchset chiuso con tree sporco o validator ignorati.                                             |
| ☑    | Non inventare nuovi `COMANDO:`              | Seguire `AGENTS.md`, `.ai/BOOT_PROFILE.md`, `docs/ops/COMMAND_LIBRARY.md` e `CLAUDE.md`.                                      |

## 14. Documenti correlati

- [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto, baseline decisionale.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — **prima fonte da consultare** in caso di conflitto.
- [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md) — fasi e milestone.
- [`EVO_FINAL_DESIGN_MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md) — gate formali + glossario operativo (strict-mode, action-required, FAST_PATH, ecc.).
- [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) — task esecutivi per ID `FD-XXX`.
- [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC`](EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — obbligatorio per task che toccano import o taxonomy Game-Database.
