---
title: Evo Final Design — Master Roadmap
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Evo Final Design — Master Roadmap

## 1. Obiettivo

Questa roadmap traduce il `Final Design Freeze` in un piano esecutivo serio, repo-ready e Codex-ready.

Non serve a generare nuove idee.
Serve a chiudere il gioco in modo disciplinato.

## 2. Tesi operativa

Evo Tactics va finalizzato come:

- gioco tattico cooperativo a turni;
- con progressione evolutiva leggibile;
- con combat d20 come nucleo;
- con telemetria e UI al servizio del tuning e della leggibilità;
- con Nido / Recruit / Mating ridotti a shipping slice;
- con `Game` come runtime source of truth e `Game-Database` come CMS / import target.

## 3. Assunzioni non negoziabili

| Stato | Task                 | Dettagli operativi                                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | Scope lock           | Il target prodotto resta quello sintetizzato in [`docs/core/40-ROADMAP.md`](../core/40-ROADMAP.md): core TBT, **6 specie base come target** (4 specie shipping nella slice freeze attuale, vedi [freeze §24](../core/90-FINAL-DESIGN-FREEZE.md)), 6 job base, VC telemetry, 12 unlock rules, UI identità, 2 mappe, privacy/reset, 50 partite di playtest. |
| ☑    | Combat-first         | Il rules engine d20 è il cuore eseguibile del progetto; ogni milestone successiva dipende dal suo freeze.                                                                                                                                                                                                                                                 |
| ☑    | Balance separato     | `trait_mechanics.yaml` resta il layer numerico separato e obbligatorio.                                                                                                                                                                                                                                                                                   |
| ☑    | Confine cross-repo   | `Game` continua a leggere file locali a runtime; nessun redesign finale può dipendere da Game <- HTTP runtime.                                                                                                                                                                                                                                            |
| ☑    | Governance docs      | I file nuovi devono avere frontmatter coerente con il sistema di governance docs.                                                                                                                                                                                                                                                                         |
| ☑    | Source authority map | Le decisioni su conflitti tra freeze, ADR, YAML, Canvas e file operativi passano da [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md).                                                                                                                                                                                  |
| ☑    | Codex workflow       | AGENTS, BOOT_PROFILE, COMMAND_LIBRARY e strict-mode vanno rispettati per tutte le esecuzioni che toccano file.                                                                                                                                                                                                                                            |

## 4. Stato delle fonti

| Stato | Task         | Dettagli operativi                                                                                                                                                                                                                                |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | Fonti 2026   | Il backbone documentale e gli ADR sono stati riallineati e verificati il 2026-04-14.                                                                                                                                                              |
| ☑    | Storico 2025 | Checklist, action items e alcuni report operativi contengono ancora task dell’ondata VC 2025: utili come storico, non come piano da copiare integralmente.                                                                                        |
| ☑    | Implicazione | La roadmap finale deve recuperare solo ciò che serve davvero al freeze: HUD overlay, vertical slice, validator, smoke, import cadence. _(XP Cipher parked via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md), out of scope.)_ |

## 5. Roadmap macro

> **Nota di numerazione**: Fasi rinumerate in sequenza continua `0..6`. Le Fasi mappano 1:1 sulle milestone `M0..M6` (§6) e sui gate `G0..G7` di [`MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md). La mappatura completa fase↔milestone↔gate e' in §6.1.

| Stato | Task                                         | Dettagli operativi                                                                                                                |
| ----- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | Fase 0 — Baseline & Governance               | Congelare fonti, path, owner, naming, policy di merge, checklist di tracciabilita, source authority map e rapporto con il freeze. |
| ☐→☑  | Fase 1 — Combat Freeze                       | Chiudere combat canon, resolver scope, status shipping, PT spend, parry, determinismo e test pack.                                |
| ☐     | Fase 2 — Balance & Progression Freeze        | Chiudere trait mechanics, build identity, economy PE/PI/Seed, unlock rules, gates MBTI/PF.                                        |
| ☐     | Fase 3 — Content Shipping Slice              | Definire specie, morph, job, biomi, surge, armi, mission vertical slice e director set minimo.                                    |
| ☐     | Fase 4 — UX / HUD / Telemetry Shipping Layer | Chiudere overlay HUD, telemetria leggibile, debrief, surfacing counter, report utili a QA/balancing.                              |
| ☐     | Fase 5 — Meta Slice & Cross-Repo Readiness   | Ridurre Nido/Mating/Reclutamento a slice shipping e fissare il raccordo Game → Game-Database.                                     |
| ☐     | Fase 6 — Release Candidate                   | Validator, smoke, snapshot, playtest mirati, backlog residuale, firma Master DD e PR merge-ready.                                 |

## 6. Milestone ufficiali

### 6.1 Mapping Fase ↔ Milestone ↔ Gate

| Fase roadmap                               | Milestone (§6) | Gate in [`MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md)                                                            |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Fase 0 — Baseline & Governance             | M0             | **G0** Baseline & Governance                                                                                                          |
| —                                          | —              | **G1** Session Model / Controls / In-match HUD _(gate trasversale, task in [`BACKLOG`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) EPIC B)_ |
| Fase 1 — Combat Freeze                     | M1             | **G2** Combat Freeze                                                                                                                  |
| Fase 2 — Balance & Progression Freeze      | M2             | **G3** Balance & Progression Freeze                                                                                                   |
| Fase 3 — Content Shipping Slice            | M3             | **G4** Content Shipping Slice                                                                                                         |
| Fase 4 — UX / HUD / Telemetry Shipping     | M4             | **G5** UX / HUD / Telemetry Shipping Layer                                                                                            |
| Fase 5 — Meta Slice & Cross-Repo Readiness | M5             | **G6** Meta Slice & Cross-Repo                                                                                                        |
| Fase 6 — Release Candidate                 | M6             | **G7** Release Candidate                                                                                                              |

> **Nota sul gap M↔G**: il gate **G1** "Session Model / Controls / In-match HUD" non ha oggi una milestone `M*` dedicata nella roadmap: i task relativi vivono nel [`BACKLOG`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) EPIC B e sono trattati come lavoro trasversale a M0→M1. La decisione se promuovere G1 a una milestone autonoma resta **aperta** e richiede conferma del Master DD — la struttura dei gate in [`MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md) resta la fonte di verita' per l'esecuzione.

### M0 — Baseline di progetto

| Stato | Task                                   | Dettagli operativi                                                                                                    |
| ----- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ☐→☑  | Pubblicare il freeze                   | Caricare `docs/core/90-FINAL-DESIGN-FREEZE.md` come baseline da cui discendono tutte le decisioni.                    |
| ☐→☑  | Pubblicare il bundle roadmap           | Caricare questi file in `docs/planning/` e linkarli dal freeze.                                                       |
| ☐→☑  | Pubblicare la source authority map     | Caricare `docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md` e trattarlo come riferimento obbligatorio di merge. |
| ☐     | Congelare overview e pilastri canonici | Chiudere un unico set di pilastri e product boundary prima delle milestone di sistema.                                |
| ☐     | Registrare i file nel docs registry    | Aggiornare `docs/governance/docs_registry.json` se si vuole governance completa.                                      |
| ☐     | Allineare naming e ownership           | Confermare owner umani e owner logici per ogni milestone.                                                             |

### M1 — Combat Freeze

| Stato | Task                         | Dettagli operativi                                                                                        |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| ☐     | Scrivere `Combat Canon Spec` | Documento unico: action types, order of operations, formula hit/damage, parry, PT spend, status timing.   |
| ☐     | Bloccare scope azioni        | Shipping: `attack`, `move`, `defend`, `parry`, ability stub solo se non rompe il freeze.                  |
| ☐     | Bloccare status shipping     | Solo `bleeding`, `fracture`, `disorient`, `rage`, `panic`.                                                |
| ☐     | Bloccare active_effects      | Resta NOOP / deferred; vietato usarlo per definire meta o contenuto shipping.                             |
| ☐     | Eseguire suite combat        | Resolver, hydration, contracts-combat, contracts-trait-mechanics, snapshot real encounter, demo CLI auto. |

### M2 — Balance & Progression Freeze

| Stato | Task                       | Dettagli operativi                                                                                                                                   |
| ----- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐     | Trait mechanics audit      | Rivedere `attack_mod`, `defense_mod`, `damage_step`, `resistances`, `cost_ap`, `active_effects`.                                                     |
| ☐     | Build identity matrix      | Tabella Specie × Morph × Job × Surge × Bioma con note su sinergie, costi e counter.                                                                  |
| ☐     | Economy freeze             | Bloccare PE, PI, Seed, PP, SG e rispettive conversioni e limiti.                                                                                     |
| ☐     | Unlock freeze              | Selezionare il set ufficiale di unlock rules del primo design shipping.                                                                              |
| ☐     | Chiudere gap storici utili | Portare a termine HUD overlay (ultimo task aperto storico). XP Cipher parked via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md). |

### M3 — Content Shipping Slice

| Stato | Task                   | Dettagli operativi                                                                                |
| ----- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| ☐     | Species slice          | Stabilire il set shipping immediato e il set target.                                              |
| ☐     | Morph slice            | Definire parte obbligatorie, costi, budget e combinazioni consentite.                             |
| ☐     | Jobs slice             | Chiudere 6 job con unlock minimi, risorse e counter dichiarati.                                   |
| ☐     | Biome slice            | Desert, Cavern, Badlands come baseline; ogni bioma deve impattare visibilità, mobilità o risorse. |
| ☐     | Mission vertical slice | Chiudere 1–2 missioni di riferimento come banco di prova del sistema completo.                    |
| ☐     | Director slice         | Generazione controllata di NPG con output minimi e comportamento leggibile.                       |

### M4 — UX / HUD / Telemetry Shipping Layer

| Stato | Task                      | Dettagli operativi                                                                                   |
| ----- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| ☐     | Overlay HUD shipping      | PT/PP/SG, AP, reazioni, status, biome bonus, warnings, risk/cohesion e surfacing counter essenziali. |
| ☐     | Debrief shipping          | VC trend, PF session drift, PE/PI/Seed, unlock sbloccati e prossimi, suggerimenti build.             |
| ☐     | Player-facing UI freeze   | Separare ciò che è per il giocatore da ciò che è solo per QA/analytics.                              |
| ☐     | Telemetry output contract | Definire metriche obbligatorie, naming export, frequenza, soglie e ownership.                        |
| ☐     | Regressioni visuali       | Nessun rilascio con regressioni gravi su contrasto eventi, alert e feedback leggibili.               |

### M5 — Meta Slice & Cross-Repo Readiness

| Stato | Task                 | Dettagli operativi                                                                    |
| ----- | -------------------- | ------------------------------------------------------------------------------------- |
| ☐     | Recruit slice        | Recruit leggibile, subset NPG, gating su Affinity/Trust e casi eccezione documentati. |
| ☐     | Nido slice           | 1 livello di nido shipping con requisiti chiari e impatti reali.                      |
| ☐     | Mating slice         | Attivabile solo con trust + nido, output limitati e leggibili.                        |
| ☐     | Import contract      | Chiarire cosa viene importato nel Game-Database e con quale cadenza.                  |
| ☐     | Cross-repo readiness | Runbook import, cadenza, log, fallback e policy di non dipendenza runtime.            |

### M6 — Release Candidate

| Stato | Task                 | Dettagli operativi                                                                       |
| ----- | -------------------- | ---------------------------------------------------------------------------------------- |
| ☐     | Validator pass       | Tutti i validator richiesti devono essere verdi.                                         |
| ☐     | Smoke CLI pass       | Profili `hud`, `playtest`, `support`, `telemetry` e combat demo devono essere allineati. |
| ☐     | Snapshot pass        | Nessuna regressione critica tra encounter, hydration e export.                           |
| ☐     | Playtest mirati      | Minimo 50 partite target, con audit predator/counter e log affidabili.                   |
| ☐     | Changelog + rollback | PR notes complete con changelog e piano 03A di rollback.                                 |
| ☐     | Master DD approval   | Merge solo dopo approvazione esplicita e validator report collegato.                     |

## 7. Critical path

| Stato | Task                                   | Dettagli operativi                                                              |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------- |
| ☑    | Combat freeze precede tutto            | Senza combat canon spec, il resto genera drift.                                 |
| ☑    | Trait mechanics precede content tuning | Senza layer numerico stabile, specie/job/biomi non sono confrontabili.          |
| ☑    | Content slice precede HUD definitivo   | La UI deve spiegare un sistema già definito, non inseguirlo.                    |
| ☑    | Meta slice dopo il core                | Nido/Mating non devono bloccare combat, progression e content slice.            |
| ☑    | Import contract dopo il freeze dati    | Il Game-Database va sincronizzato dopo che i dati Game sono stabili, non prima. |

## 8. Owner matrix

| Stato | Task                             | Dettagli operativi                                                             |
| ----- | -------------------------------- | ------------------------------------------------------------------------------ |
| ☑    | Master DD                        | Owner umano finale: approvazione, priorità, merge gate, arbitraggi di scope.   |
| ☑    | Platform Docs / Archivist        | Consolidamento freeze, roadmap, registry, changelog, cross-link docs.          |
| ☑    | Combat Team                      | Combat canon, resolver scope, test combat, determinismo, status shipping.      |
| ☑    | Balancer / Progression Design    | Trait mechanics, economy, unlock, gap XP Cipher, shaping build identity.       |
| ☑    | Content Design                   | Species slice, morphs, jobs, biomes, surge, armi, vertical slice.              |
| ☑    | UI Systems                       | HUD overlay, debrief, surfacing warnings e metriche player-facing.             |
| ☑    | QA Support                       | Smoke, scenario matrix, telemetry validation, issue triage, playtest evidence. |
| ☑    | Game-Database maintainer (Codex) | Import hardening, runbook, sync policy, eventuali workflow automatici lato DB. |
| ☑    | Release Ops / Dev Tooling        | Validator, CI, smoke, bundle, rollback plan, gating di PR.                     |

## 9. Artefatti obbligatori per chiudere la roadmap

| Stato | Task                                                         | Dettagli operativi          |
| ----- | ------------------------------------------------------------ | --------------------------- |
| ☐     | `docs/core/90-FINAL-DESIGN-FREEZE.md`                        | Documento master di design. |
| ☐     | `docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md`           | Questa roadmap.             |
| ☐     | `docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md`     | Gate di esecuzione.         |
| ☐     | `docs/planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md`         | Registro task completo.     |
| ☐     | `docs/planning/EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md` | Guida a Codex.              |
| ☐     | `docs/planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md`       | Piano cross-repo.           |

## 10. Criterio finale di successo

Il progetto entra in stato “final design freeze ready” solo quando:

- il combat è unico, documentato e testato;
- il balance layer è chiuso per il set shipping;
- la progression economy è leggibile e non contraddittoria;
- esiste una content slice reale, ripetibile e playtestabile;
- HUD e telemetria spiegano ciò che il gioco fa;
- Nido / Recruit / Mating non allargano più lo scope oltre la slice definita;
- il rapporto con Game-Database è disciplinato e non rompe il runtime.

## 11. Documenti correlati

- [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto che questa roadmap esegue.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — gerarchia delle fonti e regole di risoluzione conflitti.
- [`EVO_FINAL_DESIGN_MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md) — gate formali `G0..G7` con entry/exit criteria.
- [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) — task esecutivi organizzati per epic.
- [`EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK`](EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md) — guida operativa per agenti Codex.
- [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC`](EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — piano cross-repo Game ↔ Game-Database.
