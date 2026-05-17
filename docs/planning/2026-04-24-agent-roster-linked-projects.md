---
title: Agent Roster — Progetti Collegati (Evo-Tactics Ecosystem)
workstream: cross-cutting
status: draft
owners:
  - eduardo
created: 2026-04-24
updated: 2026-04-24
audience:
  - claude-code-users
  - project-leads
tags:
  - agents
  - subagent-sdk
  - linked-projects
  - integration-plan
summary: >
  Mappa progetti collegati all'ecosistema Evo-Tactics, inventario dei 6 subagent esistenti,
  e proposta di 5 nuovi subagent/skill per coprire i gap (Game-Database bridge, playtest
  telemetry, co-op state machine, vision-gap tracker, archivio librarian). Non installa
  niente — richiede approvazione utente.
---

# Agent Roster — Progetti Collegati

## Progetti identificati

| #   | Progetto                        | Path                                                                            | Stato                  | Ruolo                                                                    |
| --- | ------------------------------- | ------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| 1   | **Evo-Tactics** (Game)          | `C:/Users/edusc/Desktop/gioco/Game/`                                            | 🟢 Active dev          | Monorepo polyglot, session engine + content datasets + dashboard         |
| 2   | **Game-Database**               | `C:/Users/VGit/Documents/GitHub/Game-Database/` (sibling, non presente locally) | 🟡 Scaffolded flag-OFF | Taxonomy CMS (Prisma+Postgres+Express+React), import Evo-Tactics content |
| 3   | **Mission Console**             | `docs/mission-console/` (pre-built bundle)                                      | 🟢 Production          | Vue 3 production UI servita via GitHub Pages, source NON in questo repo  |
| 4   | **Archivio Libreria Operativa** | `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`          | 📚 Reference           | Libreria prompt + bootstrap-kit + operating package                      |
| 5   | **TikTok Prompt Library**       | `tmp/tiktok/` (extracted)                                                       | 📚 Reference           | 27 screenshot prompt engineering (Blue Viper, The Shift, @okaashish)     |

**Relazioni**:

- Evo-Tactics → Game-Database: unidirectional build-time (`npm run sync:evo-pack` + `evo:import`), HTTP runtime Alt B flag-OFF
- Evo-Tactics → Mission Console: pre-built bundle, no source
- Archivio → tutti progetti: reference-only
- TikTok → tutti progetti: reference-only

---

## Subagent esistenti (Evo-Tactics)

Dir: `.claude/agents/` (6 file) + agenti built-in Claude Code.

| Agent               | File                                  | Scope                                                                             | Copre                                                                |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `balance-auditor`   | `.claude/agents/balance-auditor.md`   | Balance dati (trait_mechanics, species_resistances, ai_intent_scores, combat sim) | Pilastro 6 (Fairness) audits. **Evo-Tactics**.                       |
| `migration-planner` | `.claude/agents/migration-planner.md` | Prisma migration + data transform cross-repo                                      | Game ↔ Game-Database schema changes. **Entrambi**.                  |
| `schema-ripple`     | `.claude/agents/schema-ripple.md`     | Contracts consumer tracing                                                        | `packages/contracts/` → backend + mock + dashboard. **Evo-Tactics**. |
| `session-debugger`  | `.claude/agents/session-debugger.md`  | Session engine flow (round orchestrator, resolver, trait effects, VC)             | Core combat loop. **Evo-Tactics**.                                   |
| `sot-planner`       | `.claude/agents/sot-planner.md`       | Source-of-Truth vs external repos integration                                     | Wesnoth, AncientBeast, XCOM pattern sourcing. **Evo-Tactics**.       |
| `species-reviewer`  | `.claude/agents/species-reviewer.md`  | Species JSON completeness + balance + catalog readiness                           | Content pipeline. **Evo-Tactics**.                                   |

**Built-in**: Explore, general-purpose, Plan, claude-code-guide, statusline-setup.

**Coverage**: ~75% di Evo-Tactics. ~40% di Game-Database. 0% di Mission Console (giustificato: external). 0% Archivio (giustificato: reference-only).

---

## Gap analysis

Dalle sezioni CLAUDE.md "Sprint context" + "Backlog ticket aperti" emergono queste aree senza agent dedicato:

### 🔴 P0 — Gap critici

1. **Playtest telemetry analysis** — `/api/session/telemetry` JSONL (sprint V1-V7) accumula dati. Nessun agent analizza win rate / bug pattern / MBTI distribution. Collegato a calibration harness hardcore 06/07.
2. **Co-op state machine validation** — M16-M20 lobby→character_creation→world_setup→combat→debrief. Transizioni + vote tally + ready broadcast. Nessun agent valida invariants phase machine.

### 🟡 P1 — Gap medi

3. **Vision-gap tracker** — V1-V7 residuo (V3 Mating deferred, V6 UI polish, TKT-M11B-06 playtest). Tracking status + regression detection manuale.
4. **Game-Database HTTP bridge validator** — Alt B flag-OFF ma schema `glossary.schema.json` shared. Quando si attiverà, serve agent per smoke test `/api/traits/glossary` + cache + fallback.

### 🟢 P2 — Nice-to-have

5. **Archivio-librarian** — mantiene link + prompt library sync tra archivio esterno e `.claude/prompts/`. Utile solo se adottiamo Sprint 0/1/2 dell'integration plan.
6. **Triangle-Strategy-curator** — orchestratore integrazione mechanics TS (conviction, terrain, initiative). Potrebbe essere skill one-shot invece di agent.

---

## Proposta nuovi subagent (5 item)

### 1. `playtest-analyzer` — P0

**Purpose**: analizza telemetry JSONL + batch harness output, estrae pattern (win rate per scenario, MBTI axes distribution, reaction cap violations, pressure tier gates, reward offer accept ratio).

**File**: `.claude/agents/playtest-analyzer.md`

**Scope tools**: Read, Grep, Glob, Bash (per pytest + batch run), Write (per report).

**Input tipico**: `logs/telemetry/*.jsonl`, `tests/scripts/batch_calibrate_*.py` output, `tools/py/batch_calibrate_hardcore07.py` results.

**Output tipico**: `docs/playtest/YYYY-MM-DD-<scenario>-analysis.md` con win rate table + anomaly flags + calibration suggestions.

**Rationale**: close gap P6 (Fairness) calibration. Richiesto da TKT-M11B-06 post-playtest + iter 2+ hardcore.

### 2. `coop-phase-validator` — P0

**Purpose**: valida state machine M16-M20 (lobby→character_creation→world_setup→combat→debrief). Checks: transizioni autorizzate, vote tally consistency, ready broadcast completeness, host-auth gate, reconnect survives drop.

**File**: `.claude/agents/coop-phase-validator.md`

**Scope tools**: Read, Grep, Glob, Bash (per node --test), Write.

**Input**: `apps/backend/services/session/phaseMachine.js`, `tests/api/phaseMachine.test.js`, `apps/backend/services/network/wsSession.js`, `tests/network/*.test.js`.

**Output**: invariant violations report, suggested test additions.

**Rationale**: chiude pilastro 5 (Co-op). Previene regressioni prima playtest live.

### 3. `vision-gap-tracker` — P1

**Purpose**: tracking V1-V7 vision promises vs runtime. Mappa docs/core/ "verità promesse" → endpoint + UI component. Flag regressioni.

**File**: `.claude/agents/vision-gap-tracker.md`

**Scope tools**: Read, Grep, Glob, Write.

**Input**: `docs/core/*.md`, `docs/planning/2026-04-26-vision-gap-sprint-handoff.md`, `apps/backend/routes/*`, `apps/play/src/*`.

**Output**: `docs/planning/YYYY-MM-DD-vision-gap-status.md` con V1-V7 check table + residuo.

**Rationale**: eredita monitoring ad-hoc sprint 2026-04-26. Automatizza recurring audit.

### 4. `game-database-bridge` — P1 (attivabile)

**Purpose**: quando Alt B flag-ON, valida HTTP runtime Game-Database: `/api/traits/glossary` response shape, cache TTL, fallback locale.

**File**: `.claude/agents/game-database-bridge.md`

**Scope tools**: Read, Grep, WebFetch (per endpoint live), Bash (per curl + npm test), Write.

**Input**: `packages/contracts/schemas/glossary.schema.json`, `apps/backend/services/catalog/gameDatabaseClient.js`, sibling Game-Database `server/routes/traits.js` (quando presente).

**Output**: compatibility matrix + smoke test report.

**Rationale**: attualmente dormiente (flag-OFF). Attivare quando si promuove Alt B a production. `schema-ripple` + `migration-planner` coprono parzialmente — questo è HTTP runtime specific.

### 5. `archivio-librarian` — P2

**Purpose**: sync Archivio Libreria Operativa (esterno) ↔ `.claude/prompts/` + `/LIBRARY.md`. Detect drift, suggest updates.

**File**: `.claude/agents/archivio-librarian.md`

**Scope tools**: Read, Grep, Glob, Write.

**Input**: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`, `.claude/prompts/`, `/LIBRARY.md`.

**Output**: drift report, suggested cherry-picks.

**Rationale**: attivare solo dopo Sprint 1/2 integration plan (vedi `docs/planning/2026-04-24-archivio-libreria-inventory.md`). Senza integration, inutile.

---

## Installazione proposta

Ordine raccomandato:

1. 🔴 **playtest-analyzer** + **coop-phase-validator** — install NOW (P0), ~1h ciascuno per skeleton + policy.
2. 🟡 **vision-gap-tracker** — install next sprint (P1), dopo chiusura V1-V7.
3. 🟡 **game-database-bridge** — deferred fino a Alt B attivazione.
4. 🟢 **archivio-librarian** — deferred fino a Sprint 1/2 archivio integration.

**Effort totale**: ~3h per P0+P1. Tutti basati su template `.claude/agents/*.md` esistenti.

**Prerequisito**: nessuno. I nuovi agent riusano i tool built-in (Read/Grep/Write/Bash) — no deps esterne.

---

## Triangle-Strategy — non è un agent, è un transfer plan

Inizialmente identificato come candidato agent. **Conclusione**: meglio come **skill one-shot** (o semplice docs) perché:

- Il transfer plan è design-time, non recurring.
- Una volta scritti i ticket d'implementazione, la maintenance la fa balance-auditor + session-debugger.
- Skill `first-principles-game` (già installata) copre metodologia audit.

**Output atteso**: `docs/research/triangle-strategy-transfer-plan.md` (in scrittura — agent background `a3e39abb54355a7da`). Produce 7-10 mechanic proposal, ognuna con effort S/M/L → diventano ticket di backlog.

---

## Decisione richiesta

Approvazione integrazione in 2 passaggi:

- ✅ **Step A (ora)**: creare 2 agent file (`playtest-analyzer.md` + `coop-phase-validator.md`) in `.claude/agents/`. Effort ~2h. Zero breaking change.
- ⏸️ **Step B (dopo)**: creare i restanti 3 agent quando serve (vision-gap dopo sprint close, game-database-bridge quando Alt B attivato, archivio-librarian dopo integration plan).

**Next action proposta**: se OK, procedo con Step A. File agent seguono template esistente (vedi `balance-auditor.md` come reference).
