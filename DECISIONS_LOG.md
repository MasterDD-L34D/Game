# DECISIONS_LOG — Evo-Tactics

> **Scope**: index cronologico delle decisioni architetturali. Punto d'ingresso per capire "perché le cose sono così".
> **Sorgente canonical**: `docs/adr/*.md`. Questo file è l'index navigabile, non la fonte primaria.
> **Aggiornamento**: AUTO-GENERATO -- la tabella "Index per data" e prodotta da `tools/generate_decisions_log.py` (CI fail-on-diff, anti-drift #19). NON editarla a mano; editi gli ADR in `docs/adr/`. Le sezioni prosa (tag-index, superseded, criteri) restano hand-maintained.
> **Totale ADR**: auto (vedi conteggio nel blocco generato sotto, sempre corrente).

---

## Come usare questo file

1. Cerca per **data** (cronologico) o per **tag** (`#architecture`, `#combat`, `#networking`, `#content`, `#cli`).
2. Click sul titolo ADR per dettagli completi.
3. Per adottare uno standard: leggi ADR → eventualmente commenta in PR → proponi supersede con ADR nuovo (mai modificare ADR mergiato).

**Template nuovo ADR**: vedi `docs/guide/templates/adr-template.md` (se manca, usa `docs/adr/ADR-2026-04-13-rules-engine-d20.md` come reference).

---

## Index per data (cronologico)

<!-- gen:adr-index -->
_Generato da `tools/generate_decisions_log.py` (70 ADR). NON editare a mano: editi gli ADR in `docs/adr/`._

| Data | ADR | Titolo | Status |
| --- | --- | --- | --- |
| 2025-11 | [ADR-2025-11-refactor-cli](docs/adr/ADR-2025-11-refactor-cli.md) | ADR-2025-11: Consolidamento refactor CLI | Accepted |
| 2025-11-18 | [ADR-2025-11-18-cli-rollout](docs/adr/ADR-2025-11-18-cli-rollout.md) | ADR-2025-11-18: Rollout refactor CLI e onboarding Support/QA | Accepted |
| 2025-12-07 | [ADR-2025-12-07-generation-orchestrator](docs/adr/ADR-2025-12-07-generation-orchestrator.md) | ADR-2025-12-07: Orchestratore pipeline generazione specie | Accepted |
| 2026-04-13 | [ADR-2026-04-13-rules-engine-d20](docs/adr/ADR-2026-04-13-rules-engine-d20.md) | ADR-2026-04-13: Rules Engine d20 per il loop tattico giocabile | Superseded |
| 2026-04-14 | [ADR-2026-04-14-dashboard-scaffold-vs-mission-console](docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) | ADR-2026-04-14: Dashboard scaffold vs Mission Console bundle dichotomy | Superseded |
| 2026-04-14 | [ADR-2026-04-14-game-database-topology](docs/adr/ADR-2026-04-14-game-database-topology.md) | ADR-2026-04-14: Game ↔ Game-Database topology and integration boundary | Accepted |
| 2026-04-15 | [ADR-2026-04-15-round-based-combat-model](docs/adr/ADR-2026-04-15-round-based-combat-model.md) | ADR-2026-04-15: Round-based combat model (shared planning → commit → ordered resolution) | Accepted |
| 2026-04-16 | [ADR-2026-04-16-ai-architecture-utility](docs/adr/ADR-2026-04-16-ai-architecture-utility.md) | ADR-2026-04-16: AI Sistema — Utility AI Architecture | Accepted |
| 2026-04-16 | [ADR-2026-04-16-grid-type-hex-axial](docs/adr/ADR-2026-04-16-grid-type-hex-axial.md) | ADR-2026-04-16: Grid Type — Hex con coordinate axial | Accepted |
| 2026-04-16 | [ADR-2026-04-16-networking-co-op](docs/adr/ADR-2026-04-16-networking-co-op.md) | ADR-2026-04-16: Networking architecture for co-op multiplayer | Superseded |
| 2026-04-16 | [ADR-2026-04-16-networking-colyseus](docs/adr/ADR-2026-04-16-networking-colyseus.md) | ADR-2026-04-16: Networking Co-op — Colyseus | Superseded |
| 2026-04-16 | [ADR-2026-04-16-session-engine-round-migration](docs/adr/ADR-2026-04-16-session-engine-round-migration.md) | ADR-2026-04-16: Migrazione Node session engine al round-based combat model | Accepted |
| 2026-04-17 | [ADR-2026-04-17-coop-scaling-4to8](docs/adr/ADR-2026-04-17-coop-scaling-4to8.md) | ADR 2026-04-17 — Co-op scaling: 4 → 8 giocatori | Accepted |
| 2026-04-17 | [ADR-2026-04-17-utility-ai-default-activation](docs/adr/ADR-2026-04-17-utility-ai-default-activation.md) | ADR 2026-04-17 — Utility AI: Default Activation Decision | Accepted |
| 2026-04-17 | [ADR-2026-04-17-xp-cipher-official-park](docs/adr/ADR-2026-04-17-xp-cipher-official-park.md) | ADR 2026-04-17 — XP Cipher: Official Park | Accepted |
| 2026-04-18 | [ADR-2026-04-18-art-direction-placeholder](docs/adr/ADR-2026-04-18-art-direction-placeholder.md) | ADR 2026-04-18 — Art Direction canonical (naturalistic stylized) | Accepted |
| 2026-04-18 | [ADR-2026-04-18-audio-direction-placeholder](docs/adr/ADR-2026-04-18-audio-direction-placeholder.md) | ADR 2026-04-18 — Audio Direction canonical (ambient organic + percussive) | Accepted |
| 2026-04-18 | [ADR-2026-04-18-plan-reveal-round](docs/adr/ADR-2026-04-18-plan-reveal-round.md) | ADR 2026-04-18 — Plan & Reveal round model (contemporary hybrid) | Superseded |
| 2026-04-18 | [ADR-2026-04-18-zero-cost-asset-policy](docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md) | ADR 2026-04-18 — Zero-cost asset policy + AI-generated legal framework | Accepted |
| 2026-04-19 | [ADR-2026-04-19-kill-python-rules-engine](docs/adr/ADR-2026-04-19-kill-python-rules-engine.md) | ADR 2026-04-19 — Kill Python rules engine (services/rules/) | Accepted |
| 2026-04-19 | [ADR-2026-04-19-reinforcement-spawn-engine](docs/adr/ADR-2026-04-19-reinforcement-spawn-engine.md) | ADR 2026-04-19 — Reinforcement spawn engine (Option B) | Accepted |
| 2026-04-19 | [ADR-2026-04-19-resistance-convention](docs/adr/ADR-2026-04-19-resistance-convention.md) | ADR 2026-04-19 — Resistance convention (species 100-neutral + trait delta) | Accepted |
| 2026-04-20 | [ADR-2026-04-20-damage-scaling-curves](docs/adr/ADR-2026-04-20-damage-scaling-curves.md) | ADR 2026-04-20 — Damage scaling curves (difficulty as feature, not tuning) | Accepted |
| 2026-04-20 | [ADR-2026-04-20-m11-jackbox-phase-a](docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md) | ADR-2026-04-20: M11 Phase A — Jackbox room-code WebSocket backend | Accepted |
| 2026-04-20 | [ADR-2026-04-20-objective-parametrizzato](docs/adr/ADR-2026-04-20-objective-parametrizzato.md) | ADR 2026-04-20 — Objective parametrizzato (Option C) | Accepted |
| 2026-04-21 | [ADR-2026-04-21-campaign-save-persistence](docs/adr/ADR-2026-04-21-campaign-save-persistence.md) | ADR 2026-04-21 — Campaign save persistence + branching + encounter unlock | Accepted |
| 2026-04-21 | [ADR-2026-04-21-meta-progression-prisma](docs/adr/ADR-2026-04-21-meta-progression-prisma.md) | ADR 2026-04-21 — Meta progression Prisma persistence (Prompt B / L06 partial) | Accepted |
| 2026-04-21 | [ADR-2026-04-21b-onboarding-narrative-60s](docs/adr/ADR-2026-04-21b-onboarding-narrative-60s.md) | ADR 2026-04-21b — Onboarding narrativo 60s (3 scelte identitarie pre-Act 0) | Accepted |
| 2026-04-21 | [ADR-2026-04-21c-trait-environmental-costs](docs/adr/ADR-2026-04-21c-trait-environmental-costs.md) | ADR 2026-04-21c — Costo ambientale trait (pilot 4 trait × 3 biomi) | Accepted |
| 2026-04-23 | [ADR-2026-04-23-m12-phase-a-form-evolution](docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md) | ADR-2026-04-23: M12 Phase A — Form evolution engine (Pilastro 2) | Accepted |
| 2026-04-24 | [ADR-2026-04-24-p3-character-progression](docs/adr/ADR-2026-04-24-p3-character-progression.md) | ADR-2026-04-24: M13 P3 — Character progression (XCOM EU/EW perk-pair) | Accepted |
| 2026-04-24 | [ADR-2026-04-24-p6-hardcore-timeout](docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md) | ADR-2026-04-24: M13 P6 — Hardcore mission timer + pod activation (Long War 2) | Accepted |
| 2026-04-25 | [ADR-2026-04-25-skiv-as-monitor](docs/adr/ADR-2026-04-25-skiv-as-monitor.md) | ADR-2026-04-25 — Skiv-as-Monitor: creature canonica reagisce a git events | Accepted |
| 2026-04-26 | [ADR-2026-04-26-cross-bioma-worldstate-persistence](docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md) | ADR-2026-04-26 — Cross-bioma world-state persistence | Proposed |
| 2026-04-26 | [ADR-2026-04-26-hosting-stack-decision](docs/adr/ADR-2026-04-26-hosting-stack-decision.md) | ADR 2026-04-26 — Hosting stack decision: Render (pilot) + Cloudflare Pages + Durable Objects (M14) | Superseded |
| 2026-04-26 | [ADR-2026-04-26-m15-coop-ui-redesign](docs/adr/ADR-2026-04-26-m15-coop-ui-redesign.md) | ADR 2026-04-26 — M15 co-op UI redesign (Jackbox pattern phone+TV) | Accepted |
| 2026-04-26 | [ADR-2026-04-26-multi-stage-encounter-schema](docs/adr/ADR-2026-04-26-multi-stage-encounter-schema.md) | ADR-2026-04-26 — Multi-stage encounter schema (HP threshold + form switch) | Proposed |
| 2026-04-26 | [ADR-2026-04-26-parley-outcome-enum](docs/adr/ADR-2026-04-26-parley-outcome-enum.md) | ADR-2026-04-26 — Parley/accordo outcome enum extension | Proposed |
| 2026-04-26 | [ADR-2026-04-26-pincer-followup-queue](docs/adr/ADR-2026-04-26-pincer-followup-queue.md) | ADR 2026-04-26 — Pincer follow-up intent queue (Triangle Strategy Mechanic 3B) | Superseded |
| 2026-04-26 | [ADR-2026-04-26-sg-earn-mixed](docs/adr/ADR-2026-04-26-sg-earn-mixed.md) | ADR-2026-04-26 — SG (Surge Gauge) earn formula — Opzione C mixed | Accepted |
| 2026-04-26 | [ADR-2026-04-26-spore-part-pack-slots](docs/adr/ADR-2026-04-26-spore-part-pack-slots.md) | ADR-2026-04-26 — Spore part-pack slots — schema lock + Moderate scope | Accepted |
| 2026-04-27 | [ADR-2026-04-27-ability-r3-r4-tier](docs/adr/ADR-2026-04-27-ability-r3-r4-tier.md) | ADR-2026-04-27: Ability r3/r4 tier progressive — Sprint 8 final closure Tier S #6 | Accepted |
| 2026-04-27 | [ADR-2026-04-27-ancestors-recovery-canonical](docs/adr/ADR-2026-04-27-ancestors-recovery-canonical.md) | ADR-2026-04-27 — Ancestors Neurons Recovery v0.7 — canonical adoption | Accepted |
| 2026-04-27 | [ADR-2026-04-27-creature-bond-reactions](docs/adr/ADR-2026-04-27-creature-bond-reactions.md) | ADR-2026-04-27: Beast Bond — creature reaction trigger system | Accepted |
| 2026-04-27 | [ADR-2026-04-27-pilastri-canonical-6](docs/adr/ADR-2026-04-27-pilastri-canonical-6.md) | ADR-2026-04-27: Pilastri canonical — 6-pilastri (P1-P6) wins | Accepted |
| 2026-04-27 | [ADR-2026-04-27-skiv-portable-companion-crossbreeding](docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md) | ADR-2026-04-27 — Skiv portable companion + crossbreeding async cross-player | Accepted |
| 2026-04-28 | [ADR-2026-04-28-bg3-lite-plus-movement-layer](docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md) | ADR-2026-04-28: BG3-lite Plus movement layer — Sprint G.2b NEW (frontend visual abstraction + 3 backend cherry-pick) | Accepted |
| 2026-04-28 | [ADR-2026-04-28-deep-research-actions](docs/adr/ADR-2026-04-28-deep-research-actions.md) | ADR-2026-04-28: Deep research SRPG/strategy — 5 micro-actions plan v2 (additive, no decision-altering) | Accepted |
| 2026-04-28 | [ADR-2026-04-28-grid-type-square-final](docs/adr/ADR-2026-04-28-grid-type-square-final.md) | ADR-2026-04-28: Grid type final — SQUARE wins (post BG3-lite Plus, supersedes ADR-2026-04-16 hex axial) | Accepted |
| 2026-04-29 | [ADR-2026-04-29-pivot-godot-immediate](docs/adr/ADR-2026-04-29-pivot-godot-immediate.md) | ADR-2026-04-29: Pivot Godot immediate — drop Sprint G.2b BG3-lite Plus + rubric session, accelerate Sprint M onset | Accepted |
| 2026-04-30 | [ADR-2026-04-30-pillar-promotion-criteria](docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md) | ADR-2026-04-30: Pillar promotion criteria — formalize 🟢++/🟢/🟢 candidato/🟡++/🟡 thresholds | Accepted |
| 2026-05-02 | [ADR-2026-05-02-species-ecology-schema](docs/adr/ADR-2026-05-02-species-ecology-schema.md) | ADR-2026-05-02: Species ecology schema extension (food web machine-readable) | Proposed |
| 2026-05-04 | [ADR-2026-05-04-cutover-godot-v2-decision-gate](docs/adr/ADR-2026-05-04-cutover-godot-v2-decision-gate.md) | ADR-2026-05-04: Cutover Godot v2 decision gate — criteria + web v1 archive plan | Superseded |
| 2026-05-04 | [ADR-2026-05-04-ennea-taxonomy-canonical](docs/adr/ADR-2026-05-04-ennea-taxonomy-canonical.md) | ADR-2026-05-04: Ennea taxonomy canonical — 9 full enneagram vs 6 archetypes simplified | Proposed |
| 2026-05-05 | [ADR-2026-05-05-cutover-godot-v2-fase-3-formal](docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) | ADR-2026-05-05: Cutover Godot v2 Fase 3 — formal decision (Scenario 3 STAGED canary) | Accepted |
| 2026-05-06 | [ADR-2026-05-06-drop-hermeticormus-sprint-l](docs/adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md) | ADR-2026-05-06: Drop Sprint L HermeticOrmus prompt cherry-pick — out-of-scope MVP vertical slice | Accepted |
| 2026-05-07 | [ADR-2026-05-07-abort-web-quickwins-reincarnate-godot](docs/adr/ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md) | ADR-2026-05-07 ABORT 3 web stack v1 quick wins (P1.8 plan v3.2 audit) — reincarnate Godot v2 audit P1 GAPs | Accepted |
| 2026-05-07 | [ADR-2026-05-07-auto-merge-authorization-l3](docs/adr/ADR-2026-05-07-auto-merge-authorization-l3.md) | ADR-2026-05-07 Auto-merge authorization L3 — blanket Claude PR auto-merge with safety gates | Accepted |
| 2026-05-10 | [ADR-2026-05-10-mission-console-recovery](docs/adr/ADR-2026-05-10-mission-console-recovery.md) | ADR-2026-05-10 — Mission Console Source Recovery | Accepted |
| 2026-05-10 | [ADR-2026-05-10-mutation-auto-trigger-evaluator](docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md) | ADR-2026-05-10 — Mutation Auto-Trigger Evaluator | Accepted |
| 2026-05-10 | [ADR-2026-05-10-sprint-q-plus-lineage-merge-shipped](docs/adr/ADR-2026-05-10-sprint-q-plus-lineage-merge-shipped.md) | ADR-2026-05-10: Sprint Q+ Lineage Merge ETL — SHIPPED | Accepted |
| 2026-05-10 | [ADR-2026-05-10-trait-editor-angularjs-migration](docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md) | ADR-2026-05-10 — Trait Editor AngularJS 1.x → Vue 3 migration (ACCEPTED 2026-05-11) | Proposed |
| 2026-05-11 | [ADR-2026-05-11-species-expansion-schema-canonical-migration](docs/adr/ADR-2026-05-11-species-expansion-schema-canonical-migration.md) | ADR-2026-05-11 — species_expansion schema canonical migration (morph_slots → trait_plan) | Accepted |
| 2026-05-15 | [ADR-2026-05-15-species-catalog-schema-fork-resolution](docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md) | ADR-2026-05-15 — species catalog schema fork resolution (Q1 OD-027) | Accepted |
| 2026-05-18 | [ADR-2026-05-18-df-levels-integration-direction](docs/adr/ADR-2026-05-18-df-levels-integration-direction.md) | ADR-2026-05-18 — DF-Levels integration: direzione confermata + decision-matrix governata | Accepted |
| 2026-05-18 | [ADR-2026-05-18-sistema-persistent-state-learning](docs/adr/ADR-2026-05-18-sistema-persistent-state-learning.md) | ADR-2026-05-18 — Sistema persistent cross-session state (learning AI, P5) | Accepted |
| 2026-05-26 | [ADR-2026-05-26-deep-genetics-phase1-supersede-freeze](docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md) | ADR-2026-05-26 — Deep genetics Fase-1: scoped supersede of FINAL-DESIGN-FREEZE §21.3 | Accepted |
| 2026-05-30 | [ADR-2026-05-30-coop-server-authoritative-combat](docs/adr/ADR-2026-05-30-coop-server-authoritative-combat.md) | ADR 2026-05-30 -- Co-op server-authoritative combat (vcSnapshot reconstruction) | Accepted |
| 2026-05-31 | [ADR-2026-05-31-meta-network-arc-conditions-schema](docs/adr/ADR-2026-05-31-meta-network-arc-conditions-schema.md) | ADR-2026-05-31 — Meta-network edge arc-conditions schema (2.0 → 2.1) | Accepted |
| 2026-06-07 | [ADR-2026-06-07-device-authority-tv-mirror-canon](docs/adr/ADR-2026-06-07-device-authority-tv-mirror-canon.md) | ADR 2026-06-07 -- Device-authority / TV-mirror canon + reconstruction-suite ratification | Accepted |
<!-- /gen:adr-index -->

## Index per tag

### `#combat` (10)

ADR-2026-04-13 rules-engine, ADR-2026-04-15 round-based, ADR-2026-04-16 session-migration, ADR-2026-04-16 hex-axial, ADR-2026-04-18 plan-reveal, ADR-2026-04-19 kill-python, ADR-2026-04-19 reinforcement, ADR-2026-04-19 resistance, ADR-2026-04-20 damage, ADR-2026-04-20 objective

### `#networking` `#coop` (6)

ADR-2026-04-16 coop-networking, ADR-2026-04-16 colyseus, ADR-2026-04-17 scaling, ADR-2026-04-18 plan-reveal, ADR-2026-04-20 m11, ADR-2026-04-16 co-op

### `#architecture` (5)

ADR-2025-12-07 orchestrator, ADR-2026-04-13 rules-engine, ADR-2026-04-14 dashboard, ADR-2026-04-14 game-db-topology, ADR-2026-04-16 utility-ai

### `#content` `#balance` (4)

ADR-2026-04-17 coop-scaling, ADR-2026-04-19 resistance, ADR-2026-04-20 damage, ADR-2026-04-21c trait-environmental

### `#progression` (3)

ADR-2026-04-17 xp-cipher, ADR-2026-04-21 campaign-save, ADR-2026-04-21 meta-progression

### `#policy` (3)

ADR-2026-04-18 art, ADR-2026-04-18 audio, ADR-2026-04-18 zero-cost

### `#ai` (3)

ADR-2026-04-16 utility-ai, ADR-2026-04-17 utility-default, ADR-2026-04-19 reinforcement

### `#cli` (3)

ADR-XXX, ADR-2025-11, ADR-2025-11-18

---

## Decisioni superseded

- **ADR-2026-04-14 dashboard scaffold** → superseded dal remove scaffold (#1343). Mission Console è canonical.
- **ADR-2026-04-13 rules-engine-d20** → parzialmente superseded da ADR-2026-04-19 kill-python-rules-engine (runtime canonical spostato a Node `apps/backend/services/combat/`).
- **ADR-2026-04-16 colyseus** → superseded operativamente da ADR-2026-04-20 m11 Jackbox Phase A (scelto `ws@8.18.3` baseline, Colyseus tier-2 fallback).

---

## Criteri per nuovo ADR

Crea un ADR quando:

1. **Scelta architetturale irreversibile** (schema, runtime, contract seam)
2. **Standard tecnico adottato** (libreria, framework, convention)
3. **Policy vincolante** (asset, content, security)
4. **Decisione con alternatives rigettate** documentabile (serve sapere perché non X)

**NON** creare ADR per:

- Bug fix (PR commit message sufficiente)
- Tuning numerico (playtest doc in `docs/playtest/`)
- Refactor localizzato (<50 righe)
- Decisione reversibile facile (feature flag)

**Naming convention**: `ADR-YYYY-MM-DD-slug-descrittivo.md`. Se più ADR stesso giorno: suffix `-b`, `-c`.
