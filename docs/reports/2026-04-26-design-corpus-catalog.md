---
title: "Design Corpus Catalog — Vision/Spec/Design full inventory (v1, SUPERSEDED)"
date: 2026-04-26
status: superseded
authority: A0
workstream: cross-cutting
owners: [eduardo]
purpose: "Inventario completo di tutti i documenti che descrivono cosa è Evo-Tactics, cosa dovrebbe fare, design canonical, vision, mechanics promesse. Base per deep-analysis successiva via agent specializzati."
sources:
  - 5 Explore agent paralleli (2026-04-26)
  - Aree coperte: docs/core, docs/planning, docs/hubs, docs/adr, docs/architecture, docs/pipelines, docs/process, docs/qa, root *.md, .claude/, docs/skiv, docs/museum, docs/research, docs/incoming, docs/archive, docs/reports, docs/traits, docs/biomes, docs/species, docs/balance, docs/catalog, docs/evo-tactics*, docs/frontend, docs/tutorials, docs/playtest, docs/ops, docs/ci, docs/logs, packs/, data/, schemas/evo
---

> ⚠️ **SUPERSEDED 2026-04-28** — Versione canonical aggiornata: [2026-04-26-design-corpus-catalog-V2.md](2026-04-26-design-corpus-catalog-V2.md). Doc v1 mantenuto come provenance trail (drift audit 2026-04-28 PR #1989). Snapshot historical archiviato in [docs/archive/historical-snapshots/2026-04-28-pre-consolidation/corpus-catalog-v1-archive.md](../archive/historical-snapshots/2026-04-28-pre-consolidation/corpus-catalog-v1-archive.md).

# Design Corpus Catalog

> Output di scan multi-agent 2026-04-26. ~700 file documentali coperti. Base per analisi profonda successiva.

## TL;DR conteggio

| Macro-area | File | LOC stimati | Status dominante |
|---|---:|---:|---|
| **A — Vision/Core canonical** (`docs/core/`) | 28 | 5,800 | canonical |
| **B — Hubs workstream** (`docs/hubs/`) | 8 | 380 | canonical |
| **C — Final Design Freeze bundle** (`docs/planning/EVO_FINAL_DESIGN_*`) | 7 | 2,470 | draft (A3) |
| **D — ADR** (`docs/adr/`) | 38 | ~3,500 | 60% proposed / 30% accepted / 10% superseded |
| **E — Architecture / Pipelines / Process / QA** | ~120 | ~12,000 | mix draft/active |
| **F — Root bootstrap** (PROJECT_BRIEF, CLAUDE, COMPACT_CONTEXT, …) | 26 | 5,361 | canonical |
| **G — Agent profiles** (`.claude/agents/`, `.ai/`) | 27 | 2,400 | active |
| **H — Skills + protocols** (`.claude/skills/`, `.claude/TASK_PROTOCOL`, `SAFE_CHANGES`) | 7 | 800 | canonical |
| **I — Skiv canonical** (`docs/skiv/`) | 3 | 391 | active |
| **J — Museum curated ideas** (`docs/museum/`) | 22+ | ~3,000 | curated |
| **K — Research/RFC** (`docs/research/`, `docs/planning/research/`) | 32 | ~6,000 | mixed draft/parked |
| **L — Ideas index + parked** (`docs/planning/ideas/`) | 5 | ~600 | live + parked |
| **M — Reports/Audit/Postmortem** (`docs/reports/`) | 31 | ~5,000 | active 50% / archived 50% |
| **N — Archive storico** (`docs/archive/`) | 130+ | superseded | reference only |
| **O — Sprint/handoff/planning timeline** (`docs/planning/2026-*`) | 15+ | ~6,000 | active |
| **P — Encounter YAML templates** (`docs/planning/encounters/`) | 9 | 387 | canonical |
| **Q — Trait/Biome/Species/Balance specs** (`docs/traits|biomes|species|balance|catalog`) | 26 | 2,785 | mix draft/canonical |
| **R — Evo-Tactics guide bundle** (`docs/evo-tactics*`) | 16 | 5,922 | canonical (Italian) |
| **S — Frontend/UI/Tutorial/Playtest** | 50 | ~5,200 | mix draft/generated |
| **T — Ops/CI/Logs/Misc** | 24 | ~3,000 | mix |
| **U — Pack + data internal docs** (`packs/`, `data/`) | 14 | 637 | draft |
| **V — JSON schemas** (`schemas/evo/`) | 7 | — (binary spec) | canonical |

**Totale stimato**: ~700 file documentali, ~70k LOC.

---

## A — Vision / Core canonical (`docs/core/`)

Authority A1. **Source of truth canonica** del design del gioco.

### A.1 Vision spine

| File | Titolo | Scopo | LOC |
|---|---|---|---:|
| `00-GDD_MASTER.md` | GDD Master entrypoint | Single entry: vision + mechanics + scope + system sources | 179 |
| `00-SOURCE-OF-TRUTH.md` | **Source of Truth v5** (19 sezioni) | Tesi + first game + worldgen + foodweb + species-trait-form + TV/companion/salotto + narrative premise | **1341** |
| `01-VISIONE.md` | Visione | Tesi: "Tattica profonda a turni in cui come giochi modella ciò che diventi" | 14 |
| `02-PILASTRI.md` | 6 Pilastri di design | Readable tactics + emergent evolution + species×job + temperaments + co-op vs System + fairness | 35 |
| `03-LOOP.md` | Loop di gioco (alto livello) | metaprogression → species draft → match TBT → telemetry VC → mutations/unlocks | 17 |
| `40-ROADMAP.md` | Roadmap MVP→Alpha | Scope lock: level cap, content budget, campaign 3 acts, 6 specie, 7 jobs, 2 maps. Cadence M7-M12+ | 51 |
| `90-FINAL-DESIGN-FREEZE.md` | **Final Design Freeze v0.9** | Product synthesis + shipping scope + frozen systems + tuning rules. Authority A3 | **759** |

### A.2 Core mechanics

| File | Scopo | LOC |
|---|---|---:|
| `10-SISTEMA_TATTICO.md` | Sistema tattico TV/d20 (init scatti, 2 AP, MoS, terrain/heights/facing, status, PT, Guard&Parry) | 20 |
| `11-REGOLE_D20_TV.md` | **Regole canoniche d20 TV** — chiude FRICTION 1-3 playtest 2026-04-17 | 207 |
| `15-LEVEL_DESIGN.md` | Encounter anatomy: Bioma + Layout + Objective + Wave + Conditions | 154 |
| `17-SCREEN_FLOW.md` | UI flow: onboarding → mission select → combat → telemetry reveal | 153 |
| `20-SPECIE_E_PARTI.md` | Slot anatomici (locomotion/offense/defense/senses/metabolism), budget, sinergie | 20 |
| `22-FORME_BASE_16.md` | 16 Forme MBTI (E/I, S/N, T/F, J/P) con hook meccanici | 16 |
| `24-TELEMETRIA_VC.md` | Behavioral tracking → MBTI → Ennea → Disco-Elysium reveal | 18 |
| `25-REGOLE_SBLOCCO_PE.md` | PE unlock + progression rules | 16 |
| `26-ECONOMY_CANONICAL.md` | **Glossario PE/PI/PT/PP/SG/Seed canonical** A1 | 171 |
| `27-MATING_NIDO.md` | Mating + nesting + recruitment meta-slice (summary) | 18 |
| `28-NPC_BIOMI_SPAWN.md` | NPC + biome spawn tables | 17 |
| `30-UI_TV_IDENTITA.md` | TV-first UI identity (companion mission-console) | 17 |
| `Mating-Reclutamento-Nido.md` | Detail full mating/nesting | 51 |
| `PI-Pacchetti-Forme.md` | Pack structure + form selection | 83 |
| `SistemaNPG-PF-Mutazioni.md` | NPC + player-facing mutations + progression | 65 |
| `Telemetria-VC.md` | Full telemetry (mirror 24-, dedup pending) | 57 |
| `DesignDoc-Overview.md` | High-level overview | 78 |
| `Guida_Evo_Tactics_Pack_v2.md` | Comprehensive pack guide (specie/jobs/forme/trait/encounter/biome/schema/validator) | **1187** |

### A.3 Art / audio / business / asset

| File | LOC |
|---|---:|
| `41-ART-DIRECTION.md` | 199 |
| `42-STYLE-GUIDE-UI.md` | 329 |
| `43-ASSET-SOURCING.md` | 263 |
| `44-HUD-LAYOUT-REFERENCES.md` | 285 |
| `00F-ART_AUDIO_BUSINESS.md` | 215 |
| `51-ONBOARDING-60S.md` | 193 |

### A.4 Governance metadocs

| File | Scopo | LOC |
|---|---|---:|
| `00B-CANONICAL_PROMOTION_MATRIX.md` | 10 sistemi: core/appendix/research/historical | 59 |
| `00C-WHERE_TO_USE_WHAT.md` | Decision tree doc selection + authority resolution | 319 |
| `00D-ENGINES_AS_GAME_FEATURES.md` | Engine tecnici → gameplay feature | 522 |
| `00E-NAMING_STYLEGUIDE.md` | Naming species/jobs/trait/item enforced YAML/code/UI | 338 |

---

## B — Hubs workstream (`docs/hubs/`)

Entry point per workstream. Authority A1.

| Hub | Scopo |
|---|---|
| `README.md` | Canonical workstream root: GDD Master → Freeze → SoT → Authority Map → Promotion Matrix |
| `combat.md` | Rules engine d20 + tactical loop (resolver, round, trait, status) |
| `flow.md` | Generation orchestration + CLI + validation gates |
| `backend.md` | API runtime + event scheduler + cross-repo topology |
| `dataset-pack.md` | Runtime data + pack catalog + import/sync gates |
| `atlas.md` | Vue 3 mission-console production bundle |
| `incoming.md` | Intake + triage + archive + freeze policy |
| `ops-qa.md` | CI + quality gates + audit + release checks |

---

## C — Final Design Freeze bundle (`docs/planning/EVO_FINAL_DESIGN_*`)

Authority A3. Bundle 7-doc product synthesis.

| File | LOC | Scopo |
|---|---:|---|
| `EVO_FINAL_DESIGN_ROADMAPS_INDEX.md` | 208 | Bundle index + reading order |
| `EVO_FINAL_DESIGN_MASTER_ROADMAP.md` | 544 | Tesi operativa + 6 specie target + d20 + telemetry + scope lock |
| `EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md` | 395 | Milestone formali + exit criteria + validator + smoke + rollback |
| `EVO_FINAL_DESIGN_BACKLOG_REGISTER.md` | 382 | Registro task FD-001..FD-100+ |
| `EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md` | 283 | A0-A5 hierarchy: governance/hub/data/freeze/agent/canvas |
| `EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md` | 371 | Codex prompt + strict-mode + fast-path |
| `EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md` | 289 | Cross-repo sync plan + import cadence + trigger |

---

## D — ADR (`docs/adr/`) — 38 decisioni

### D.1 Combat / Tattica
- `ADR-2026-04-13-rules-engine-d20.md` — Rules engine d20 Python sotto `services/rules/` (proposed → poi superseded da kill-python-rules)
- `ADR-2026-04-15-round-based-combat-model.md` — **Accepted** Round-based shared planning → commit → ordered resolution
- `ADR-2026-04-16-session-engine-round-migration.md` — Migrazione Node session.js a round-based
- `ADR-2026-04-19-reinforcement-spawn-engine.md` — **Accepted** Dynamic spawn budget
- `ADR-2026-04-19-kill-python-rules-engine.md` — Decommissioning Python rules engine
- `ADR-2026-04-19-resistance-convention.md` — Unit schema standardization
- `ADR-2026-04-20-objective-parametrizzato.md` — **Accepted** 6 objective types (elim/capture/escort/sabotage/survival)
- `ADR-2026-04-20-damage-scaling-curves.md` — Trait mechanics scaling
- `ADR-2026-04-26-pincer-followup-queue.md` — Encounter spawn pattern
- `ADR-2026-04-26-sg-earn-mixed.md` — SG earn formula Opzione C mixed (chiude Q52 P2)

### D.2 Networking / Co-op
- `ADR-2026-04-16-networking-co-op.md` — Architettura incrementale hotseat → WS → Colyseus
- `ADR-2026-04-16-networking-colyseus.md` — Colyseus framework
- `ADR-2026-04-17-coop-scaling-4to8.md` — **Accepted** Co-op scaling 4→8 player + grid auto-scale 6×6→10×10
- `ADR-2026-04-20-m11-jackbox-phase-a.md` — M11 Jackbox WebSocket Phase A
- `ADR-2026-04-26-hosting-stack-decision.md` — **Accepted** Render + Cloudflare Pages + Durable Objects

### D.3 AI
- `ADR-2026-04-16-ai-architecture-utility.md` — Utility AI 7 considerations + 6 curves
- `ADR-2026-04-17-utility-ai-default-activation.md` — **Accepted** Default ON

### D.4 Level / Grid
- `ADR-2026-04-16-grid-type-hex-axial.md` — Hex axial (q,r) per pathfinding + LOS + multi-tile

### D.5 Progressione / Campagna / Form
- `ADR-2026-04-21-campaign-save-persistence.md` — **Accepted** SQLite + branching + unlock sequenziale
- `ADR-2026-04-21-meta-progression-prisma.md` — Meta-progression Prisma
- `ADR-2026-04-21b-onboarding-narrative-60s.md` — Onboarding 60s loop
- `ADR-2026-04-23-m12-phase-a-form-evolution.md` — Form evolution engine M12.A
- `ADR-2026-04-24-p3-character-progression.md` — **Accepted** XCOM EU/EW perk-pair 7×2

### D.6 Topology / Repo / DB
- `ADR-2026-04-14-game-database-topology.md` — **Accepted** Game ↔ Game-Database boundary
- `ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md` — **Superseded** (rimosso AngularJS)
- `ADR-2025-12-07-generation-orchestrator.md` — **Accepted** Pipeline generazione

### D.7 Asset / Art / Audio
- `ADR-2026-04-18-art-direction-placeholder.md`
- `ADR-2026-04-18-audio-direction-placeholder.md`
- `ADR-2026-04-18-zero-cost-asset-policy.md`
- `ADR-2026-04-21c-trait-environmental-costs.md`

### D.8 Scope / Misc / UI / Skiv
- `ADR-2026-04-17-xp-cipher-official-park.md` — **Accepted** XP Cipher OUT OF SCOPE
- `ADR-2026-04-18-plan-reveal-round.md`
- `ADR-2026-04-24-p6-hardcore-timeout.md` — Long War 2 mission timer
- `ADR-2026-04-25-skiv-as-monitor.md`
- `ADR-2026-04-26-m15-coop-ui-redesign.md` — Phone + TV layout split
- `ADR-2025-11-refactor-cli.md` + `ADR-2025-11-18-cli-rollout.md` — CLI consolidation

---

## E — Architecture / Pipelines / Process / QA

### E.1 Architecture (10)
- `ai-policy-engine.md` — **A1** Backend AI flow event→metric→aggregate→Ennea archetype
- `tri-sorgente/overview.md` + `tri-sorgente/qa.md` + `tri-sorgente-node-bridge.md` — Reward pipeline d20+personality+action
- `i18n-strategy.md` — IT primary + EN day-1
- `difficulty-integration.md`, `replay-from-event-log.md`, `resistance-engine-gap.md`, `flusso-richieste-idea-engine.md`, `evo_tactics_pack_mongodb.md` (superseded)

### E.2 Pipelines (~30)
- `GOLDEN_PATH.md` (8-agent feature flow), `GOLDEN_PATH_FEATURE.md`, `BIOME_FEATURE_CHECKS.md`
- `ci-pipeline.md`, `ci-gap-analysis.md`, `roadmap_generator.md`, `ema-metrics.md`, `drive_sync.md`, `gh-cli-manual-dispatch.md`
- 17 `PIPELINE_*` template (Frattura Abissale Sinaptica multi-step generation)

### E.3 Process (~30)
**Sprint outcome**:
- `sprint-2026-04-17.md` (21 PR, end-to-end loop + tutorial 1→5)
- `sprint-2026-04-26-M16-M20-close.md` (co-op MVP full loop, 41 test)
- `sprint-2026-04-25-parallel-validation.md`, `sprint-2026-04-24-playtest-prep.md`, `sprint-2026-04-18-m3-telemetry-adr.md`
- `2026-04-26-calibration-harness-policy.md`, `2026-04-26-tkt-08-backend-stability.md`

**Retro**:
- `2026-04-18-M4-retrospective-art-integration-gap.md`
- `2026-04-19-M5-audit-sprint-completion.md` (9 agent concurrent → 6 P0 finding)
- `2026-04-19-M7-sprint-plan-expert-synthesis.md`

**Procedural**: bug-intake, bug-template, clone-setup, demo-release, project-setup-todo, telemetry, token-rotation, vc_playtest_plan, milestones, feedback_collection_pipeline, incident_reporting_table, localization, qa_hud, sentience_rollout_plan, telemetry_ingestion_pipeline, tooling_maintenance_log, trait_*_log, web_handoff, web_pipeline, action-items.

### E.4 QA (12)
- `QA.md`, `qa-checklist.md`, `rollout_checklist.md`, `playtest-log-guidelines.md`, `QA_TRAITS_V2.md`, `nebula-webapp-checklist.md`
- Playbooks: `eventi.md`, `loadout.md`, `moderazione.md`
- 2026-04-24/25/26 smoke: coop-phase, museum-validation, repo-archaeologist, 6× illuminator smokes (balance, economy, narrative, PCG, telemetry, UI)

---

## F — Root bootstrap (26 file, 5,361 LOC)

Identity + state + agent infrastructure.

| File | Scopo | KB |
|---|---|---:|
| **PROJECT_BRIEF.md** | Stable identity 90-sec read | 7.2 |
| **CLAUDE.md** | Master session: sprint context + gates + decisions + pillar status | **77** |
| **COMPACT_CONTEXT.md** | 30-sec session snapshot (auto via /compact) | 17 |
| **WORKSPACE_MAP.md** | Physical ecosystem map (audited 2026-04-25) | 25 |
| **DECISIONS_LOG.md** | Chronological ADR index | 14 |
| **OPEN_DECISIONS.md** | Ambiguous non-blocking decisions | 22 |
| **BACKLOG.md** | Prioritized open tickets | 20 |
| **LIBRARY.md** | External systems + studied repos + tools + APIs | 17 |
| **PROMPT_LIBRARY.md** | Reusable prompt entry | 2.6 |
| **MODEL_ROUTING.md** | AI model/tool per phase | 12 |
| **README.md**, **CONTRIBUTING.md**, **CREDITS.md** | Standard repo docs | 22 |
| **AGENTS.md**, **agent.md**, **agent_constitution.md**, **AGENT_WORKFLOW_GUIDE.md**, **router.md** | Codex agent system (NOT Claude Code — reference) | 27 |
| **SPRINT_001/002/003.md** | Operational sprint docs | 40 |
| **RESEARCH_TODO.md** | Deep research roadmap actionable | 13 |
| **MASTER_PROMPT.md**, **INDEX.md**, **FLINT.md**, **PULL_REQUEST_TEMPLATE.md** | Misc | 8.6 |

---

## G — Agent profiles

### G.1 `.claude/agents/` (16 specialized — **Claude Code**)
balance-auditor, balance-illuminator, coop-phase-validator, creature-aspect-illuminator, economy-design-illuminator, migration-planner, narrative-design-illuminator, pcg-level-design-illuminator, playtest-analyzer, repo-archaeologist (32K, museum curator unico writer), schema-ripple, session-debugger, sot-planner, species-reviewer, telemetry-viz-illuminator, ui-design-illuminator.

### G.2 `.ai/` (11 Codex agents)
archivist, asset-prep, balancer, biome-ecosystem-curator, combat-engineer, coordinator, dev-tooling, gameplay-prototyper, lore-designer, species-curator, trait-curator + `BOOT_PROFILE.md` + `GLOBAL_PROFILE.md`.

---

## H — Skills + protocols (`.claude/`)

- `TASK_PROTOCOL.md` — Standard task execution order
- `SAFE_CHANGES.md` — Auto-allowed vs checkpoint-needed
- `skills/`: compact, evo-tactics-monitor, skiv, sot-plan, verify-done

---

## I — Skiv canonical (`docs/skiv/`)

- `CANONICAL.md` — Cross-PC entry point per creatura recap-card (175 LOC)
- `LAUNCHER.md` (140), `MONITOR.md` (76)

---

## J — Museum curated ideas (`docs/museum/`)

Hades-Codex-pattern reuse repository. **repo-archaeologist** unico writer.

- `MUSEUM.md` index + `README.md`
- **11 cards** curate (Enneagram, mating/nido, personality, ancestors, magnetic_rift, ecc.) score 4-5/5
- **9 excavations** (batch 2026-04-25 + skiv-monitor extension)
- `galleries/` (visual/thematic, emerging)

Domain coverage 8/8 (100%): ancestors, cognitive_traits, enneagramma, personality, mating_nido, old_mechanics, species_candidate, architecture.

---

## K — Research / RFC (`docs/research/`, `docs/planning/research/`)

### K.1 docs/research/ (5 file)
- `2026-04-25-skiv-lifecycle-visual-research.md` ⭐⭐⭐⭐⭐ — Visual progression industry pattern (9 stages)
- `2026-04-25-skiv-narrative-arc-research.md` ⭐⭐⭐⭐⭐ — Narrative arc + emotional beats lifecycle
- `2026-04-25-skiv-online-imports.md` ⭐⭐⭐⭐
- `2026-04-25-skiv-prior-art-web.md` ⭐⭐⭐⭐
- `triangle-strategy-transfer-plan.md` ⭐⭐⭐⭐⭐ (65KB) — Combat/UI/progression/co-op transfer

### K.2 docs/planning/research/ (27 file)
- `README.md`, `intentional-friendly-fire.md`, `lore_concepts.md`, `refs/2008_spore.md`
- **enneagram-addon/** (8 file) — Personality addon parked
- **sentience-branch-layout/** (5 file) — Sentience MVP T1-T6
- **sentience-rfc/** (2 file) — RFC formal v0.1 + sources

---

## L — Ideas index (`docs/planning/ideas/`)

- `IDEAS_INDEX.md` ⭐⭐⭐⭐⭐ — **26 idee parked** + 4D classification + triggers + kill-60 enforcement. Top-5: Fase C reazioni, Fog of intent, Action preview, 5v5+ stress, Eval classifier
- `README.md` (intake), `changelog.md`, `feedback.md`, `refresh-plan.md`

---

## M — Reports / Audit / Postmortem (31)

### M.1 Active audit
- `2026-04-17-audit-gap-implementativo-docs.md` — **G1 critici**: XP Cipher + Utility AI wiring
- `2026-04-24-repo-autonomy-readiness-audit.md` — Score 21.5/24 → 24/24 post Sprint 3
- `data_inventory.md` — Catalog data/core + data/derived + game-database imports

### M.2 Trait reports (active)
- `trait_balance_summary.md`, `trait_merge_proposals.md`, `trait_taxonomy_analysis.md`, `trait_progress.md`, `trait-env-alignment.md`
- `traits/` subdir (4 file): audit duplicati + merge analysis + pipeline simulator locomotivo

### M.3 Evo subdir
- `evo/integration_propagation_review.md`, `evo/species_summary.md`, `evo/rollout/` (3 file)
- Archived snapshots: `evo/inventory_audit.md` (2025-11-15), `evo/species_analysis_report.md` (2026-02-20), `evo/trait_review_report.md`

### M.4 Frattura Abissale Sinaptica (4 archived)
patchset, validation_report, archivist_final, validation_commands.

### M.5 Misc
analytics-toolkit, styleguide_compliance, evo-tactics-showcase-dossier-report, progress-dashboard (archived nov 2025), qa-changelog.

---

## N — Archive storico (`docs/archive/`) — 130+ file superseded

- `evo-tactics/` (11 file, 180KB) — Trait guide v1/v2 archive
- `gdd-baseline/` — GDD v1 baseline
- `concept-explorations/2026-04/` (4 file)
- `flint-kill-60-2026-04-18/` (12 file) — Lessons + memory feedback
- `historical-snapshots/` (70+ file, 800KB+) — 2025-11 evo_cleanup, 2025-12 inventory_cleanup, 2026-04 incoming/reports
- `planning-reference/` (37 file, 400KB) — Migration logs Fase 0-7

---

## O — Sprint / handoff timeline (`docs/planning/2026-*`)

- `2026-04-20-strategy-m9-m11-evidence-based.md` (547)
- `2026-04-20-design-audit-consolidated.md` (562)
- `2026-04-20-pilastri-reality-audit.md` (498)
- `2026-04-20-design-audit-raw-questions.md`
- `2026-04-20-integrated-design-map.md` (402)
- `2026-04-25-workspace-audit-drift-fixes-handoff.md`
- `2026-04-26-coop-mvp-spec.md` (269), `2026-04-26-coop-truths.md` (292), `2026-04-26-vision-gap-sprint-handoff.md`
- + altri handoff/checkpoint

### O.1 Feature map
- `docs/planning/feature-map/FEATURE_MAP_EVO_TACTICS.md` (826 LOC) — Inventario v1→v8 sistemi/specie/morphs/forme/jobs/trait/encounter/biome/schema/validator

---

## P — Encounter YAML templates (`docs/planning/encounters/`)

9 file canonical: enc_tutorial_01/02, enc_savana_01, enc_caverna_02, enc_capture_01, enc_escort_01, enc_frattura_03, enc_survival_01, enc_hardcore_reinf_01.

---

## Q — Trait/Biome/Species/Balance/Catalog specs

### Q.1 Traits (9, 951 LOC)
README_TRAITS, trait_reference_manual (canonical), traits_scheda_operativa, traits_evo_pack_alignment, traits_template, trait-editor + trait-editor-api, next_steps_trait_migration, Frattura_Abissale_Sinaptica_trait_draft.

### Q.2 Biomes (4, 301 LOC)
manifest (canonical registry), biomes (definizioni), Frattura_Abissale_Sinaptica_biome + lore.

### Q.3 Species (1)
Frattura_Abissale_Sinaptica_species_draft.

### Q.4 Balance (9, 1,252 LOC)
**MACHINATIONS_MODELS** (4 visual models), **macro-economy-source-sink** (canonical XP/resource architecture), vc-calibration-iter1, tutorial-tuning, 4 generated 2026-04-25 (PI shop monte carlo, MAP-Elites archive ×2, encounter XP audit).

### Q.5 Catalog (3)
trait_reference (canonical), Frattura_Abissale_Sinaptica_assets_draft, bioma_frattura.

---

## R — Evo-Tactics guide bundle (`docs/evo-tactics*`)

**16 file canonical Italian, ~5,922 LOC**. Pillar reference per design completo.

| File | LOC | KB |
|---|---:|---:|
| `evo-tactics/evo_tactics_guide.md` | 445 | 56 |
| `evo-tactics/guida-ai-tratti-1.md` | 937 | 52 |
| `evo-tactics/guida-ai-tratti-2.md` | 1069 | 56 |
| `evo-tactics/guida-ai-tratti-3-database.md` | 315 | 16 |
| `evo-tactics/guida-ai-tratti-3-evo-tactics.md` | 1070 | 60 |
| `evo-tactics/integrazioni-v2.md` | 938 | 52 |
| `evo-tactics-pack/` (8 file) | 1118 | 52 |

Include: db-schema, ennea-themes, deploy procedures, generator benchmarks, internal-announcement, handover-summary.

---

## S — Frontend / Tutorial / Playtest

### S.1 Frontend (4)
styleguide, feature-updates, mockups_evo, accessibility-deaf-visual-parity.

### S.2 Tutorial (8)
adaptive-engine-quickstart, cli-quickstart, dashboard-tour, hud-overlay-quickstart, idea-engine + feedback, feedback-form.

### S.3 Playtest (38, 4,507 LOC)
Templates + 26 generated session reports (2025-11 → 2026-04-29 90min playbook). Include: hardcore calibration iter 1-7, M4-M14 user playtest reports, coop-ngrok-playbook, demo launcher, deploy render+CF Pages, SKIV saga state, 90min playbook.

---

## T — Ops / CI / Logs (24)

### T.1 Ops (17)
**COMMAND_LIBRARY.md** (active, 430 LOC), AGENT_COMMANDS_CHEATSHEET, agent_telemetry, AI_AGENT_AUDIT_LOG, chatgpt_sync_status, dependency_audit, drive-sync, evo-tooling, nebula-rollout, npm-proxy-migration, observability, publishing_calendar, qa-window-checklist, site-audit, tool_run_report, workflow_diff, cli-tools.

### T.2 CI/Logs (7)
ci/README, logs/trait_audit, traits_tracking, incoming_triage_agenti, slack_plan, link-fix, web_status.

---

## U — Pack + data internal docs (14)

### U.1 packs/evo_tactics_pack/
README, docs/affinity_trust, docs/mating, docs/catalog/README, tools/py/modules/personality/enneagram/README, data/balance/README.

### U.2 data/
derived/analysis/README, derived/exports/README, derived/mock/README + 2 nested test-fixtures/minimal, external/evo/README, art/icons/README, art/tilesets/README.

---

## V — JSON schemas (`schemas/evo/`)

7 schema canonical: accessibility (7.7K), difficulty (3.4K), encounter (10.2K), enums (2.9K), party (2.5K), species (2.9K), trait (4.8K).

---

# Cross-domain coverage matrix (vision vs corpus)

| Pilastro | Spec canonical | Architecture | ADR | Implementation status (CLAUDE.md) | Gap doc-vs-runtime |
|---|---|---|---|---|---|
| **P1 Tattica leggibile** | 10/11/15/17 + macro-economy | combat hub + ai-policy | rules-engine, round-based, hex | 🟢 | bassa |
| **P2 Evoluzione** | 22 forme + 25 PE + PI-Pacchetti + 26 economy | tri-sorgente | M12.A form-evolution + meta-progression | 🟢 candidato | media (mating deferred) |
| **P3 Specie×Job** | 20 specie + Guida v2 + traits guides | flow hub | M13.P3 perk-pair | 🟢 candidato | bassa |
| **P4 MBTI/Ennea** | 22 + 24 telemetria + ennea-themes + Telemetria-VC | ai-policy + tri-sorgente | (vari) | 🟡++ | **ALTA — axes parziali, Disco-Elysium reveal pending** |
| **P5 Co-op vs System** | 30 UI TV + co-op truths/spec + onboarding 60s | networking-coop + Colyseus | scaling 4→8 + jackbox + hosting | 🟢 candidato | bassa (playtest live pending) |
| **P6 Fairness** | balance/macro-economy + tutorial-tuning | difficulty-integration | hardcore-timeout + damage-scaling | 🟢 candidato | bassa (calibration iter pending) |

---

# Hot-spot identificati (analisi rapida)

## H1 — Doc duplicates / dedup pending
- `24-TELEMETRIA_VC.md` vs `Telemetria-VC.md` → consolidare
- `27-MATING_NIDO.md` vs `Mating-Reclutamento-Nido.md` → mantenere summary + detail oppure mergere
- `EVO_FINAL_DESIGN_*` bundle (draft) vs `90-FINAL-DESIGN-FREEZE.md` → autorità sovrapposta (A1 vs A3)

## H2 — ADR superseded ma riferiti
- ADR-2026-04-13 (Python rules) → killed by ADR-2026-04-19
- ADR-2026-04-14-dashboard-scaffold → superseded
- ADR-XXX-refactor-cli (legacy stub) → cleanup candidato

## H3 — Gap audit identificati (da reports)
- **G1 audit gap implementativo** (2026-04-17): XP Cipher → CHIUSO via ADR-04-17 OUT OF SCOPE
- **enneaEffects.js orphan** (93 LOC, mai require): SoT §13.4 corretto a 🟡, **NON wired runtime**
- **Schema AJV registry partial**: 3/10 schema registrati runtime (combat/traitMechanics/glossary/narrative/speciesBiomes esportati ma non validati live)
- **68/267 ancestor traits silently no-op** (status linked/fed/healing/attuned/sensed/telepatic_link/frenzy non consumati)

## H4 — Vision gap V1-V7 (sprint 2026-04-26)
6/7 chiusi PR #1726. **V3 Mating/Nido + V6 UI TV polish** deferred.

## H5 — Decisioni aperte (OPEN_DECISIONS)
- OD-001 Mating Path A/B/C verdict (50-80h sunk cost)
- OD-013 MBTI surface presentation (proposta)

---

# Raccomandazioni deep-analysis (next phase)

Spawn 6 illuminator agent + 3 auditor in parallelo, ciascuno legge sezioni mirate del catalog + cross-check vs runtime:

| Agent | Input docs | Output atteso |
|---|---|---|
| **balance-illuminator** | A.4 economy + Q.4 balance + M.2 trait reports + ADR damage/timeout | Gap balance vs runtime + hot-spot tuning |
| **creature-aspect-illuminator** | A.1+A.2 specie/forme + K.1 skiv research + Q.2-3 biomi/species + R guide | Visual lifecycle gap + creature design coverage |
| **narrative-design-illuminator** | A.1 SoT narrative premise + K.1 skiv narrative + K.2 enneagram + lore_concepts | Gap narrative vs runtime + reactivity coverage |
| **pcg-level-design-illuminator** | A.2 level-design + P encounters + ADR objective/spawn | Encounter coverage + emergence gap |
| **economy-design-illuminator** | A.2 economy canonical + Q.4 macro-economy + balance reports | Source/sink coverage + reward loop gap |
| **telemetry-viz-illuminator** | A.2 telemetria-vc + ai-policy + reports analytics-toolkit | VC/MBTI/Ennea coverage gap + viz opportunità |
| **ui-design-illuminator** | A.2 UI TV + A.3 art/style/HUD + K.1 skiv + S.1 frontend | UI gap vs spec |
| **coop-phase-validator** | A.2 co-op truths/spec + ADR networking + sprint M16-M20 + qa coop-phase | State machine + WS protocol compliance |
| **balance-auditor** | trait_mechanics + ai_intent_scores + species_resistances + ADR resistance | Outlier + asimmetria run |

Ciascuno: leggi le tue sezioni del catalog + grep runtime corrispondente + report `docs/reports/2026-04-26-deep-analysis-<agent>.md` ≤500 LOC con gap concreti file:line + reuse opportunity.
