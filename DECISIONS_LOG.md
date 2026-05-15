# DECISIONS_LOG — Evo-Tactics

> **Scope**: index cronologico delle decisioni architetturali. Punto d'ingresso per capire "perché le cose sono così".
> **Sorgente canonical**: `docs/adr/*.md`. Questo file è l'index navigabile, non la fonte primaria.
> **Aggiornamento**: manuale a ogni nuovo ADR mergiato in main.
> **Totale ADR**: 42 (aggiornato 2026-05-15 — 30 cumulativi 2025+2026-04 + 12 nuovi 2026-05 sezione bottom)

---

## Come usare questo file

1. Cerca per **data** (cronologico) o per **tag** (`#architecture`, `#combat`, `#networking`, `#content`, `#cli`).
2. Click sul titolo ADR per dettagli completi.
3. Per adottare uno standard: leggi ADR → eventualmente commenta in PR → proponi supersede con ADR nuovo (mai modificare ADR mergiato).

**Template nuovo ADR**: vedi `docs/guide/templates/adr-template.md` (se manca, usa `docs/adr/ADR-2026-04-13-rules-engine-d20.md` come reference).

---

## Index per data (cronologico)

### 2025

| ID                                                                   | Titolo                                            | Status   | Tag                           |
| -------------------------------------------------------------------- | ------------------------------------------------- | -------- | ----------------------------- |
| [ADR-XXX-refactor-cli](docs/adr/ADR-XXX-refactor-cli.md)             | Motivazioni refactor CLI e allineamento toolchain | Accepted | `#cli` `#tooling`             |
| [ADR-2025-11](docs/adr/ADR-2025-11-refactor-cli.md)                  | Consolidamento refactor CLI                       | Accepted | `#cli`                        |
| [ADR-2025-11-18](docs/adr/ADR-2025-11-18-cli-rollout.md)             | Rollout refactor CLI e onboarding Support/QA      | Accepted | `#cli` `#ops`                 |
| [ADR-2025-12-07](docs/adr/ADR-2025-12-07-generation-orchestrator.md) | Orchestratore pipeline generazione specie         | Accepted | `#generation` `#architecture` |

### 2026-04-13 — Rules Engine foundation

| ID                                                            | Titolo                                         | Status                                       | Tag                       |
| ------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- | ------------------------- |
| [ADR-2026-04-13](docs/adr/ADR-2026-04-13-rules-engine-d20.md) | Rules Engine d20 per il loop tattico giocabile | Superseded (parz.) da 2026-04-19 kill-python | `#combat` `#architecture` |

### 2026-04-14 — Topology decisions

| ID                                                                                           | Titolo                                                 | Status                              | Tag                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------- | ------------------------------ |
| [ADR-2026-04-14 dashboard](docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) | Dashboard scaffold vs Mission Console bundle dichotomy | Superseded (#1343 rimosso scaffold) | `#frontend` `#architecture`    |
| [ADR-2026-04-14 game-db](docs/adr/ADR-2026-04-14-game-database-topology.md)                  | Game ↔ Game-Database topology + HTTP Alt B (flag-OFF) | Accepted                            | `#architecture` `#integration` |

### 2026-04-15 — Combat model

| ID                                                                    | Titolo                                                                   | Status                      | Tag                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------- | ------------------------- |
| [ADR-2026-04-15](docs/adr/ADR-2026-04-15-round-based-combat-model.md) | Round-based combat model (shared planning → commit → ordered resolution) | Accepted, default ON da M17 | `#combat` `#architecture` |

### 2026-04-16 — Session engine + AI + grid + networking foundations

| ID                                                                                  | Titolo                                                     | Status                                        | Tag                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------- | --------------------- |
| [ADR-2026-04-16 session](docs/adr/ADR-2026-04-16-session-engine-round-migration.md) | Migrazione Node session engine al round-based combat model | Accepted, 17/17 step completati (#1387-#1405) | `#combat` `#backend`  |
| [ADR-2026-04-16 utility](docs/adr/ADR-2026-04-16-ai-architecture-utility.md)        | AI Sistema — Utility AI Architecture                       | Accepted                                      | `#ai` `#architecture` |
| [ADR-2026-04-16 hex](docs/adr/ADR-2026-04-16-grid-type-hex-axial.md)                | Grid Type — Hex con coordinate axial                       | Accepted                                      | `#combat` `#grid`     |
| [ADR-2026-04-16 coop](docs/adr/ADR-2026-04-16-networking-co-op.md)                  | Networking architecture for co-op multiplayer              | Accepted                                      | `#networking` `#coop` |
| [ADR-2026-04-16 colyseus](docs/adr/ADR-2026-04-16-networking-colyseus.md)           | Networking Co-op — Colyseus (tier-2 fallback)              | Accepted (deferred, `ws` baseline scelto M11) | `#networking` `#coop` |

### 2026-04-17 — Co-op scaling + Utility AI default + XP

| ID                                                                                         | Titolo                                                  | Status   | Tag                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------- | ------------------ |
| [ADR-2026-04-17 scaling](docs/adr/ADR-2026-04-17-coop-scaling-4to8.md)                     | Co-op scaling: 4 → 8 giocatori (modulazioni party.yaml) | Accepted | `#coop` `#content` |
| [ADR-2026-04-17 utility-default](docs/adr/ADR-2026-04-17-utility-ai-default-activation.md) | Utility AI: Default Activation Decision                 | Accepted | `#ai`              |
| [ADR-2026-04-17 xp-cipher](docs/adr/ADR-2026-04-17-xp-cipher-official-park.md)             | XP Cipher: Official Park                                | Accepted | `#progression`     |

### 2026-04-18 — Asset policy + reveal round

| ID                                                                             | Titolo                                                   | Status   | Tag                |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- | -------- | ------------------ |
| [ADR-2026-04-18 art](docs/adr/ADR-2026-04-18-art-direction-placeholder.md)     | Art Direction canonical (naturalistic stylized)          | Accepted | `#art` `#policy`   |
| [ADR-2026-04-18 audio](docs/adr/ADR-2026-04-18-audio-direction-placeholder.md) | Audio Direction canonical (ambient organic + percussive) | Accepted | `#audio` `#policy` |
| [ADR-2026-04-18 zero-cost](docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md)  | Zero-cost asset policy + AI-generated legal framework    | Accepted | `#policy` `#legal` |
| [ADR-2026-04-18 plan-reveal](docs/adr/ADR-2026-04-18-plan-reveal-round.md)     | Plan & Reveal round model (contemporary hybrid)          | Accepted | `#combat` `#coop`  |

### 2026-04-25 — Skiv-as-Monitor

| ID                                                           | Titolo                                                    | Status   | Tag                      |
| ------------------------------------------------------------ | --------------------------------------------------------- | -------- | ------------------------ |
| [ADR-2026-04-25](docs/adr/ADR-2026-04-25-skiv-as-monitor.md) | Skiv-as-Monitor — creature canonica reagisce a git events | Accepted | `#cross-cutting` `#skiv` |

### 2026-04-19 — Combat systems consolidation

| ID                                                                                    | Titolo                                                    | Status                                                           | Tag                      |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------ |
| [ADR-2026-04-19 kill-python](docs/adr/ADR-2026-04-19-kill-python-rules-engine.md)     | Kill Python rules engine (`services/rules/` deprecated)   | Accepted, Phase 1 done, Phase 2 freeze + Phase 3 removal pending | `#combat` `#deprecation` |
| [ADR-2026-04-19 reinforcement](docs/adr/ADR-2026-04-19-reinforcement-spawn-engine.md) | Reinforcement spawn engine (Option B)                     | Accepted                                                         | `#combat` `#ai`          |
| [ADR-2026-04-19 resistance](docs/adr/ADR-2026-04-19-resistance-convention.md)         | Resistance convention (species 100-neutral + trait delta) | Accepted                                                         | `#combat` `#content`     |

### 2026-04-20 — Damage + M11 + Objective

| ID                                                                              | Titolo                                                    | Status         | Tag                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------- | ------------------------- |
| [ADR-2026-04-20 damage](docs/adr/ADR-2026-04-20-damage-scaling-curves.md)       | Damage scaling curves (difficulty as feature, not tuning) | Accepted       | `#combat` `#balance`      |
| [ADR-2026-04-20 m11](docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md)            | M11 Phase A — Jackbox room-code WebSocket backend         | Accepted, live | `#networking` `#coop`     |
| [ADR-2026-04-20 objective](docs/adr/ADR-2026-04-20-objective-parametrizzato.md) | Objective parametrizzato (Option C)                       | Accepted       | `#combat` `#level-design` |

### 2026-04-21 — Campaign + meta-progression + onboarding

| ID                                                                          | Titolo                                                       | Status   | Tag                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- | ----------------------------- |
| [ADR-2026-04-21 save](docs/adr/ADR-2026-04-21-campaign-save-persistence.md) | Campaign save persistence + branching + encounter unlock     | Accepted | `#progression` `#campaign`    |
| [ADR-2026-04-21 meta](docs/adr/ADR-2026-04-21-meta-progression-prisma.md)   | Meta progression Prisma persistence (Prompt B / L06 partial) | Accepted | `#progression` `#persistence` |
| [ADR-2026-04-21b](docs/adr/ADR-2026-04-21b-onboarding-narrative-60s.md)     | Onboarding narrativo 60s (3 scelte identitarie pre-Act 0)    | Accepted | `#onboarding` `#narrative`    |
| [ADR-2026-04-21c](docs/adr/ADR-2026-04-21c-trait-environmental-costs.md)    | Costo ambientale trait (pilot 4 trait × 3 biomi)             | Accepted | `#content` `#balance`         |
| [ADR-2026-04-25](docs/adr/ADR-2026-04-25-skiv-as-monitor.md)                | Skiv-as-Monitor — creature canonica reagisce a git events    | Accepted | `#cross-cutting` `#skiv`      |

### 2026-05 — Cutover Godot v2 + Sprint Q+ closure + ai-station methodology

| ID                                                                                                                  | Titolo                                                                           | Status   | Tag                              |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- | -------------------------------- |
| [ADR-2026-05-02](docs/adr/ADR-2026-05-02-species-ecology-schema.md)                                                 | Species ecology schema canonical                                                 | Accepted | `#content` `#species`            |
| [ADR-2026-05-04 cutover](docs/adr/ADR-2026-05-04-cutover-godot-v2-decision-gate.md)                                 | Cutover Godot v2 decision gate                                                   | Accepted | `#architecture` `#godot-v2`      |
| [ADR-2026-05-04 ennea](docs/adr/ADR-2026-05-04-ennea-taxonomy-canonical.md)                                         | Ennea 9-canon taxonomy canonical                                                 | Accepted | `#personality` `#ennea`          |
| [ADR-2026-05-05](docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md)                                         | Cutover Godot v2 Fase 3 formal (PROPOSED → ACCEPTED Phase A 2026-05-07)         | Accepted | `#architecture` `#godot-v2`      |
| [ADR-2026-05-06](docs/adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md)                                            | Drop Hermeticormus Sprint L                                                      | Accepted | `#scope`                         |
| [ADR-2026-05-07 abort](docs/adr/ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md)                            | Abort web quickwins reincarnate Godot                                            | Accepted | `#frontend` `#godot-v2`          |
| [ADR-2026-05-07 auto-merge](docs/adr/ADR-2026-05-07-auto-merge-authorization-l3.md)                                 | Auto-merge L3 authorization (Claude-shipped PR Game/+Godot v2)                  | Accepted | `#process` `#automation`         |
| [ADR-2026-05-10 mc-recovery](docs/adr/ADR-2026-05-10-mission-console-recovery.md)                                   | Mission console recovery                                                         | Accepted | `#frontend` `#mission-console`   |
| [ADR-2026-05-10 mut-trigger](docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md)                            | Mutation Phase 4 auto-trigger evaluator                                          | Accepted | `#mutations` `#engine`           |
| [ADR-2026-05-10 sprint-q](docs/adr/ADR-2026-05-10-sprint-q-plus-lineage-merge-shipped.md)                           | Sprint Q+ Lineage merge shipped                                                  | Accepted | `#sprint` `#progression`         |
| [ADR-2026-05-10 trait-editor](docs/adr/ADR-2026-05-10-trait-editor-angularjs-migration.md)                          | Trait Editor AngularJS → Vue 3 migration (Path C)                                | Accepted | `#frontend` `#trait-editor`      |
| [ADR-2026-05-11](docs/adr/ADR-2026-05-11-species-expansion-schema-canonical-migration.md)                           | species_expansion schema canonical migration (Path B variant trait_plan)        | Accepted | `#content` `#species` `#schema`  |

**Totale ADR aggiornato 2026-05-15: 42** (30 + 12 nuovi 2026-05).

---

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
