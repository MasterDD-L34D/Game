---
title: Excavate inventory — architecture (ADR chain + DEPRECATED + concept-explorations)
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, architecture, decisions]
---

# Excavate inventory — architecture (decisioni sepolte)

## Summary

- 1 ADR formalmente Risolto (`ADR-2026-04-14` dashboard scaffold) + 1 ADR Supersedes parziale (`ADR-2026-04-19` kill Python rules → supersedes `ADR-2026-04-13` porzione runtime). Resto ADR = Accepted/Proposed/Active/Draft (NON sepolti).
- `services/rules/DEPRECATED.md` Phase 1 attiva: 8 file Python in feature freeze, mappati 1:1 a Node replacement. Phase 2 (commit ban) + Phase 3 (delete) pending.
- `docs/archive/concept-explorations/2026-04/` archivio handoff Master DD: 5 vertical-slice HTML (Evoluzione Visible / Nido Ritual / Debrief Emotivo / Onboarding) + integrated design map A3 + 3 exploration-note (BiomeMemory / costo ambientale trait / onboarding narrativo) candidati triage P2.

## Inventory

### ADR superseded chain

| M-ID             | Artifact                                                                                              | Status reale                                                              | Superseder                                                                                                                   | Pillar        | Note                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| M-2026-04-25-007 | `docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md`                                    | `doc_status: superseded` + Stato: **Risolto** scaffold rimosso 2026-04-16 | rimozione fisica `apps/dashboard/` + `packages/angular*` (#1343, Option A) → resta solo `docs/mission-console/` Vue 3 bundle | P5 (UI co-op) | Unico ADR formalmente Risolto. Storia AngularJS scaffold (sept 2025) → Vue 3 bundle (oct 2025).                                    |
| M-2026-04-25-008 | `docs/adr/ADR-2026-04-13-rules-engine-d20.md` (porzione Python runtime)                               | `doc_status: active` ma **runtime canonico ribaltato**                    | `ADR-2026-04-19-kill-python-rules-engine.md` (Supersedes esplicito)                                                          | P1/P6         | Solo porzione runtime supersa. Schema d20 + DC + MoS regole concettuali RESTANO canoniche. Pivot: tabletop+digital → digital-only. |
| M-2026-04-25-009 | `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` §Roadmap step 8-9 (commission freelance asset) | parziale supersede                                                        | `ADR-2026-04-18-zero-cost-asset-policy.md` (Supersedes roadmap esplicito)                                                    | (asset/UI)    | Decision evolution: budget freelance → zero-cost solodev policy. Stessa giornata, pivot rapido.                                    |
| M-2026-04-25-010 | `docs/adr/ADR-2026-04-15-round-based-combat-model.md` (estensione)                                    | Accepted                                                                  | `ADR-2026-04-18-plan-reveal-round.md` (Supersedes hint, "estende non sostituisce")                                           | P1            | Plan-reveal aggiunge fase reveal post-commit. Round model originale resta canonico, plan-reveal additivo.                          |
| M-2026-04-25-011 | `docs/adr/ADR-2026-04-16-networking-co-op.md` (Opzione A hotseat-first / Opzione B WS custom)         | Proposed (draft)                                                          | `ADR-2026-04-20-m11-jackbox-phase-a.md` Accepted (WS native `ws@8.18.3`, no Colyseus)                                        | P5            | Decision evolution networking: hotseat→WS custom→Jackbox-style host-authoritative. Colyseus tier-2 fallback.                       |
| M-2026-04-25-012 | `docs/adr/ADR-2026-04-16-networking-colyseus.md`                                                      | Proposto, **non implementato**                                            | de facto sostituito da Phase A jackbox `ws`                                                                                  | P5            | Tier-2 fallback dichiarato, runtime mai partito. Resta come opzione documented.                                                    |
| M-2026-04-25-013 | `docs/adr/ADR-2026-04-17-coop-scaling-4to8.md` `supersedes: SoT §pilastro 5 linea 930 (max 4 coop)`   | Accepted                                                                  | (è esso superseder)                                                                                                          | P5            | Singola modifica autorità: SoT v5 linea 930 4-cap → 8-cap canonico via `data/core/party.yaml` 11 modulation.                       |

### DEPRECATED.md files in services/

| M-ID             | Artifact                       | Status                                                                                                      | Pillar | Note                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-2026-04-25-014 | `services/rules/DEPRECATED.md` | Phase 1 active (mark + freeze incoming). Phase 2 commit ban pending user confirm. Phase 3 delete pending PR | P1/P6  | 8 file Python: `resolver.py` `hydration.py` `round_orchestrator.py` `trait_effects.py` `grid.py` `worker.py` `demo_cli.py` `__init__.py`. Mapping 1:1 a Node replacement (`apps/backend/services/combat/*.js` + `roundOrchestrator.js`). Test suite Python `tests/test_resolver.py` `tests/test_hydration.py` `tests/test_round_orchestrator.py` deprecate (no extend). |

Nessun altro `DEPRECATED.md` in `services/*` (verificato via `ls services/*/DEPRECATED.md`).

### docs/archive/concept-explorations/2026-04/

| M-ID             | Artifact                                                                                                     | Tipo                              | Pillar                             | Note                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-2026-04-25-015 | `docs/archive/concept-explorations/2026-04/handoff/2026-04-20-integrated-design-map.md`                      | Mappa A3 (planning, NON canonica) | tutti P1-P6                        | Sintesi 4 fonti: Freeze v0.9 + SoT v5 + audit 20-apr + concept-exploration. 11 lacune residue, 5 P0 blocking M9. Subordinata a SoT/ADR in caso conflict.                                                                                      |
| M-2026-04-25-016 | `docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck [SUPERSEDED].html`                         | Pitch deck v1 (707 LOC HTML)      | (meta)                             | File-name suffix `[SUPERSEDED]` esplicito. Sostituito da `Evo Tactics Pitch Deck v2.html` (1106 LOC).                                                                                                                                         |
| M-2026-04-25-017 | `docs/archive/concept-explorations/2026-04/Vertical Slice - 60s Onboarding.html`                             | Mock HTML interattivo (3178 LOC)  | P4 (Disco Elysium thought cabinet) | Onboarding narrativo Phase B base. V1 chiusa PR #1726 `/api/campaign/start initial_trait_choice`.                                                                                                                                             |
| M-2026-04-25-018 | `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 0 Onboarding.html`                        | Mock HTML (2163 LOC)              | P4                                 | Briefing pre-match + primo turno guidato (tutorial_01 skin).                                                                                                                                                                                  |
| M-2026-04-25-019 | `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html`                            | Mock HTML (2106 LOC)              | P1                                 | Mock HUD combat. Reference UX per HUD attuale.                                                                                                                                                                                                |
| M-2026-04-25-020 | `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 3 Consequence.html`                       | Mock HTML (2349 LOC)              | P2/P6                              | Debrief post-match con beat emotivo. Risponde gap P0 narrative arc framework.                                                                                                                                                                 |
| M-2026-04-25-021 | `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html`                    | Mock HTML (2128 LOC)              | P1/P6                              | Vertical-slice BOSS encounter. Reference per scenari hardcore.                                                                                                                                                                                |
| M-2026-04-25-022 | `docs/archive/concept-explorations/2026-04/Evo Tactics Wireframes.html`                                      | Wireframe deck (3345 LOC)         | P5 (UI)                            | Storyboard UI completo. Reference visuale.                                                                                                                                                                                                    |
| M-2026-04-25-023 | `docs/archive/concept-explorations/2026-04/uploads/EvoTactics_Design_Bible_Biodiversita_Connessa_final.docx` | Design Bible legacy (.docx)       | P2/P3                              | Bible "Biodiversità Connessa" — pre-pillars naming convention.                                                                                                                                                                                |
| M-2026-04-25-024 | `docs/archive/concept-explorations/2026-04/uploads/EvoTactics_Roadmap_Biodiversita_Connessa.docx`            | Roadmap legacy (.docx)            | (meta)                             | Roadmap pre-Sprint freeze. Storica.                                                                                                                                                                                                           |
| M-2026-04-25-025 | `docs/archive/concept-explorations/2026-04/uploads/Naming di specie e biomi per Evo Tactics.docx`            | Naming styleguide legacy (.docx)  | P3                                 | Pre-canonica naming. Sostituita da naming-styleguide bilingue (sessione 17/04 PR #1447-1471, 45 specie + 40 biomi).                                                                                                                           |
| M-2026-04-25-026 | 3 exploration-note nel deck v2 (BiomeMemory / costo ambientale trait / onboarding narrativo)                 | Idee triage candidate             | P2/P3/P4                           | Nota 1: bioma "ricorda" creatura post-N encounter (rischio quarta economia). Nota 2: trait costo ambientale per-bioma (esplosione tuning). Nota 3: onboarding diegetico → V1 già wired PR #1726 (`onboardingPanel.js` Disco Elysium 3-stage). |

### GDD baseline

| M-ID             | Artifact                                       | Status                               | Pillar      | Note                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------- | ------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-2026-04-25-027 | `docs/archive/gdd-baseline/GDD_v1_baseline.md` | `doc_status: historical_ref`, 99 LOC | tutti P1-P6 | GDD v1 pre-pillars. Loop principale Tri-Sorgente già descritto. Sostituito da SoT v5 + Final Design Freeze v0.9 + Promotion Matrix (sessione 17/04). Curiosità: scoring formula Tri-Sorgente già citata. |

### Flint kill-60 archive

| M-ID             | Artifact                                            | Status                 | Pillar              | Note                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-2026-04-25-028 | `docs/archive/flint-kill-60-2026-04-18/MANIFEST.md` | `doc_status: archived` | (meta-productivity) | PR #1556 kill 60% Flint. Archive preserva classificazione per valore/applicabilità/stato. 40+ fonti research consolidate. Skiv link: ZERO (Flint = caveman ex-evo, Skiv = Arenavenator). |

## Top 3 candidates (most relevant to current pillar status)

### #1 — M-2026-04-25-014 `services/rules/DEPRECATED.md` (P1/P6)

Pilastro 1 Tattica 🟢 attuale. Phase 2/3 Python rules removal pending = unfinished decision evolution. Decision: portare le poche regole Python residue (es. `predict_combat()` se non già migrato) a Node prima di delete fisico. Riguarda P1 (canonical runtime cleanup) + P6 (resistance + reinforcement engines già migrati M6-#1). **Pillar match**: forte. **Skiv link**: nullo.

### #2 — M-2026-04-25-026 Exploration-note "Costo ambientale del trait" + "BiomeMemory" (P2/P3)

Pilastro 2 Evoluzione 🟢 candidato post Phase D, Pilastro 3 Specie×Job 🟢c. Ma SoT §pilastro 2 dice "bioma come moltiplicatore" e Agent 4 audit segnala runtime Node non consuma `terrain_defense` per memoria per-unità. Nota 1 (BiomeMemory) + Nota 2 (trait per-bioma cost) sono il **next push naturale** post-V7 biome-aware spawn bias (PR #1726). Triage decision pending: pilot 4 trait × 3 biomi ship vs parcheggio per esplosione tuning. **Pillar match**: alto P2+P3. **Skiv link**: indiretto (Skiv = Arenavenator vagans, biome-mover canonical creature → BiomeMemory potrebbe essere Skiv differentiator).

### #3 — M-2026-04-25-007 `ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md` (P5)

Lezione architetturale viva. Pilastro 5 Co-op 🟢c post M11 Phase A-C. Mission Console resta production UI (Vue 3 bundle in `docs/mission-console/`) ma source NOT in repo. Se mai serve dashboard dev nuovo → "partire da zero con Vue 3" (Option B originale). Reference per evitare AngularJS scaffold disconnesso ricomparsa. **Pillar match**: P5 UI canonical. **Skiv link**: nullo.

## False positives (NON sepolti)

ADR Status `Accepted`/`Proposed`/`Active`/`Draft` = canonici o pending decisione, NON buried. Esclusi dall'inventory:

- `ADR-2025-11-18-cli-rollout.md` (Accepted, CLI canonical)
- `ADR-2025-11-refactor-cli.md` (Proposto, mai chiuso ma non superseded — gemello con `ADR-XXX-refactor-cli.md` Accettato)
- `ADR-2025-12-07-generation-orchestrator.md` (Approvato, generation orchestrator ATTIVO runtime)
- `ADR-2026-04-15-round-based-combat-model.md` (Accepted, round model ON by default)
- `ADR-2026-04-16-ai-architecture-utility.md`, `ADR-2026-04-16-grid-type-hex-axial.md` (Accepted)
- `ADR-2026-04-17-utility-ai-default-activation.md` (Accepted post #1525)
- `ADR-2026-04-19-kill-python-rules-engine.md` (Proposed → SUPERSEDER, non superseded)
- `ADR-2026-04-19-resistance-convention.md`, `ADR-2026-04-19-reinforcement-spawn-engine.md` (Accepted)
- `ADR-2026-04-20-damage-scaling-curves.md`, `ADR-2026-04-20-objective-parametrizzato.md` (Accepted)
- `ADR-2026-04-21*`, `ADR-2026-04-23-m12-phase-a-form-evolution.md`, `ADR-2026-04-24-p3-character-progression.md`, `ADR-2026-04-24-p6-hardcore-timeout.md`, `ADR-2026-04-26-*` (Accepted, runtime canonical)

Note: `ADR-XXX-refactor-cli.md` (file-name `XXX`) è un duplicate stylistico di `ADR-2025-11-refactor-cli.md` — entrambi 2025-11-20, uno Accettato uno Proposto. **Sospetto branch parallelo**: candidato cleanup separato (NON archeologia). Out-of-scope qui.

## Suggested next-step

1. **Phase 2/3 Python rules removal**: aprire issue `chore(combat): kill services/rules/ Phase 2 commit ban + Phase 3 delete`. Verifica nessun import live da Node, run test suite Node, delete + rimozione `tools/py/master_dm.py` REPL. Effort ~2-3h.
2. **Triage exploration-note BiomeMemory + trait cost ambientale**: spawn task riferito a M-2026-04-25-026 → 1 ADR proposal "biome environmental coupling" con scope pilot (4 trait × 3 biomi) prima di generalizza. Lega a P2 V7 spawn bias già live e Skiv canonical creature persona (biome-mover).
3. **Cleanup ADR duplicate `ADR-XXX-refactor-cli.md`**: out-of-archeologia, ticket housekeeping. Decidere se merge in `ADR-2025-11-refactor-cli.md` o eliminare uno dei due.

---

Cross-check ADR Status field eseguito su tutti i 36 ADR `docs/adr/*.md`. Solo 1 con `doc_status: superseded` (ADR-2026-04-14) + 4 con relazioni Supersedes parziali esplicite (ADR-2026-04-17 / ADR-2026-04-18-zero-cost / ADR-2026-04-18-plan-reveal / ADR-2026-04-19-kill-python). Resto = canonici Accepted/Proposed/Approvato.
