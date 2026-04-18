---
title: CLAUDE.md
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🪨 Caveman mode (always on for coding tasks)

Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically), pleasantries, hedging. Fragments OK.

Off: `stop caveman` / `normal mode` — On: `/caveman`

Auto-exceptions (use normal prose for): security warnings, irreversible actions,
multi-step sequences where fragment ambiguity risks misread, user confused or repeating.

---

## Project overview

**Evo-Tactics** is a co-op tactical game (d20-based, modular evolutionary progression) delivered as a polyglot monorepo. It ships YAML datasets, Python + TypeScript CLIs, an Express "Idea Engine" backend, a Vue/Vite dashboard, and publishing/validation pipelines. Most docs, commit messages, and inline comments are written in **Italian** — match that language when editing docs, but code identifiers stay English.

## Repository layout (high-level)

The monorepo uses npm workspaces declared in root `package.json`:

- `apps/backend/` — Express "Idea Engine" API (entry `index.js`, Prisma schema under `apps/backend/prisma/`). Serves `/api/*` including `/api/v1/generation/species`, `/api/v1/atlas/*`, `/api/mock/*`, `/api/ideas/*`.
- `services/generation/` — Node/Python bridge: `SpeciesBuilder`, `TraitCatalog`, biome synthesizer, runtime validators. The Python orchestrator (`services/generation/orchestrator.py`) is called from Node via a pool configured by `config/orchestrator.json` (`poolSize`, `requestTimeoutMs`).
- `services/rules/` — Rules engine d20 per il loop tattico: `resolver.py` (risoluzione azioni d20), `hydration.py` (idratazione trait meccanici da `trait_mechanics.yaml`), `demo_cli.py` (CLI demo turni), `worker.py` (bridge backend). Dati di bilanciamento in `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`.
- `packages/contracts/` — shared JSON Schema + TypeScript types used by backend, CLI mocks, and dashboard for Flow/Atlas payloads.
- `packages/ui/` — shared UI components.
- `tools/py/` — unified Python CLI (`game_cli.py`), validators, showcase builders. Legacy wrappers (`roll_pack.py`, `generate_encounter.py`) redirect to the shared parser.
- `tools/ts/` — TypeScript CLI + Node/Playwright tests (Lighthouse, roll pack, UI smoke).
- `packs/evo_tactics_pack/` — self-contained Ecosystem Pack v1.7 (data, validators, HTML reports under `out/validation/`).
- `data/` — canonical YAML datasets (species, biomes, traits, telemetry) + `data/derived/` analysis reports. Source of truth for Flow, Atlas, and pack validators.
- `services/eventsScheduler/`, `services/publishing/`, `services/export/`, `services/moderation/`, `services/squadsync/` — Node micro-services called from scripts and the backend.
- `scripts/` — top-level automation (dev stack, tracker refresh, snapshot regeneration, Drive sync).
- `tests/` — cross-cutting suites: `tests/api/*.test.js` (Node test runner), `tests/server/*.spec.ts`, `tests/generation/*.spec.ts`, `tests/scripts/*`, `tests/events/*.ts` (tsx), plus Python unit tests at `tests/test_*.py`.

The README "Settori e dipendenze" section is the canonical dependency map between Flow (generation), Atlas (telemetry/dashboard), backend, and datasets — **if you change a dataset in `data/core/`, you must also regenerate mocks and re-run the backend suite**, not just the validator you edited.

## Documentation layout (post-restructuring)

`docs/` is organized by **workstream**, with the governance system enforcing frontmatter coverage on every file via `tools/check_docs_governance.py` (CI-required, strict mode). Only `docs/00-INDEX.md` (legacy entrypoint, marked superseded) and `docs/README.md` live at the root; everything else is under a workstream directory:

- `docs/core/` — canonical game design reference (numbered docs `01-VISIONE.md`..`40-ROADMAP.md`, plus `DesignDoc-Overview.md`, `Mating-Reclutamento-Nido.md`, `PI-Pacchetti-Forme.md`, etc.). Stable spine of the project.
- `docs/hubs/` — workstream hubs (canonical entrypoints): `combat.md`, `flow.md`, `atlas.md`, `backend.md`, `dataset-pack.md`, `ops-qa.md`, `incoming.md`, `cross-cutting.md`.
- `docs/governance/` — registry, schema, validator outputs, workstream matrix, rollout plans. The single source of truth for "what docs exist and who owns them" is `docs/governance/docs_registry.json`.
- `docs/adr/` — architecture decision records (e.g., `ADR-2026-04-13-rules-engine-d20.md`).
- `docs/guide/` — onboarding, contributing, FAQ, how-tos, integration guides, templates.
- `docs/core/`, `docs/traits/`, `docs/biomes/`, `docs/species/`, `docs/balance/`, `docs/catalog/`, `docs/evo-tactics/`, `docs/evo-tactics-pack/` — dataset-pack workstream.
- `docs/pipelines/`, `docs/architecture/` — flow workstream (CI, build, generation pipelines).
- `docs/frontend/` — atlas workstream (UI, wireframes, test-interface, feature-updates, styleguide).
- `docs/process/`, `docs/qa/`, `docs/ci/`, `docs/playtest/`, `docs/ops/`, `docs/logs/`, `docs/reports/`, `docs/tutorials/` — ops-qa workstream.
- `docs/planning/` — roadmap, ideas, research, changelog, migration plans, EchoWake notes, sentience research.
- `docs/incoming/` — narrowed to 3 active operational files (PATCHSET-01 dispatcher + 01B integration plan + tasks board). Everything else has been triaged.
- `docs/generated/pr-summaries/` — auto-generated daily PR summaries from `tools/py/daily_pr_report.py`. Excluded from frontmatter governance via `AUTOGEN_PATH_PATTERNS`.
- `docs/archive/historical-snapshots/` — frozen historical snapshots of the cleanup operations (`2025-11-15_evo_cleanup`, `2025-12-19_inventory_cleanup`, `decompressed-index.md`).

**Frontmatter is required** for every new `.md` file in `docs/` (except `docs/generated/`). Use the schema in `docs/governance/docs_metadata.schema.json` and run `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict` locally before committing. The CI workflow `.github/workflows/docs-governance.yml` enforces this on every PR.

When adding or moving docs, also update `docs/governance/docs_registry.json` atomically in the same PR — a path drift will fail the strict check. The `tools/docs_governance_migrator.py` tool can populate registry entries and generate frontmatter in bulk if you need it.

## Common commands

Node 18+ (22.19.0 recommended) and npm 11+; Python 3.10+. Install once with `npm ci` (root), `npm --prefix tools/ts install`, and `pip install -r tools/py/requirements.txt` (+ `requirements-dev.txt` for backend tooling). `npm run prepare` wires Husky hooks.

### Dev stack

- `npm run start:api` — backend on `http://0.0.0.0:3334` (override with `PORT`). NeDB default at `data/idea_engine.db` unless `IDEA_ENGINE_DB` is set; Prisma/Postgres when `DATABASE_URL` is provided. The default port was changed from 3333 in April 2026 to avoid collision with the sibling Game-Database repo which owns port 3333 — see `docs/adr/ADR-2026-04-14-game-database-topology.md`.
- `docker compose up` — Postgres + backend with auto Prisma bootstrap (guarded by `.docker-prisma-bootstrapped` marker; override with `PRISMA_BOOTSTRAP_FILE`, reset via `docker compose down -v`).

### Tests

- `npm run test` — runs `test:backend`.
- `npm run test:stack` (or `make test-stack`) — backend tests.
- `npm run test:api` — backend-only chain; it runs `node --test tests/api/*.test.js`, then multiple `tsx`-driven specs (`tests/generation/flow-shell.spec.ts`, `tests/server/orchestrator-*.spec.ts`, `tests/scripts/tune_items.test.ts`, `tests/events/dynamicEvents.e2e.ts`, `tests/api/serviceActorSessions.spec.ts`) plus `node --test tests/server/generationSnapshot.spec.js` and `tests/tools/deploy-checks.spec.js`. Most stages set `ORCHESTRATOR_AUTOCLOSE_MS=2000` — keep that env if you run them individually.
- **Run one Node `node --test` file**: `node --test tests/api/<file>.test.js` (use `--test-name-pattern '<name>'` to pick a subtest).
- **Run one tsx spec**: `./node_modules/.bin/tsx tests/server/orchestrator-bridge.spec.ts` (remember `ORCHESTRATOR_AUTOCLOSE_MS=2000` for orchestrator specs).
- **tools/ts tests**: `npm --prefix tools/ts test` (compiles, runs Node unit tests + Playwright). Playwright-only: `npm run test:web`.
- **Python suites**: `PYTHONPATH=tools/py pytest` from the repo root. Single test: `PYTHONPATH=tools/py pytest tests/test_species_builder.py::test_case`.
- **Docs generator Vitest**: `npm run test:docs-generator` (uses `vitest.config.docs-generator.ts`).
- **Rules engine tests**: `PYTHONPATH=services/rules pytest tests/test_rules_engine.py`. Demo CLI: `PYTHONPATH=services/rules python3 services/rules/demo_cli.py`.
- **AI/session tests (sprint 006–019)**: `node --test tests/ai/*.test.js` — 45 test, ~120ms.

### Build, lint, format

- `npm run build` — build across workspaces that expose `build`.
- `npm run ci:stack` — pre-deploy check: `lint:stack` + `test:backend`. Mirror what CI runs.
- `npm run lint:stack` — Prettier check on stack files (`scripts/lint-stack.mjs`).
- `npm run format` / `npm run format:check` — Prettier.
- `npm run schema:lint` — AJV-based YAML schema lint for `schemas/evo/`.
- `npm run docs:lint` / `npm run docs:smoke` — link & smoke checks for `docs/`.
- `npm run style:check` — trait style linter (`scripts/trait_style_check.js`).

### Dataset / validation workflows

Canonical flow when changing `data/core/` or `packs/evo_tactics_pack/data/`:

1. `python3 tools/py/game_cli.py validate-datasets`
2. `python3 tools/py/game_cli.py validate-ecosystem-pack --json-out packs/evo_tactics_pack/out/validation/last_report.json --html-out packs/evo_tactics_pack/out/validation/last_report.html`
3. `npm run mock:generate` — regenerates Flow + Nebula demo snapshots. **Run this any time you touch Flow/Nebula datasets or `packages/contracts`** — backend and mock consumers share those schemas and will fail validation otherwise.
4. `pytest tests/scripts/test_trace_hashes.py` + `node --test tests/scripts/sync_evo_pack_assets.test.js tests/services/biomeSynthesizerMetadata.test.js` before a database release.
5. `npm run sync:evo-pack` — rebuilds catalog + mirrors under `docs/evo-tactics-pack/` and `public/docs/evo-tactics-pack/` (paths are rewritten to `../../packs/evo_tactics_pack/data/...`).

Other automation: `make evo-list|evo-plan|evo-run` (`tools/automation/evo_batch_runner`), `make evo-validate` (AJV on `incoming/`), `make update-tracker` (tracker registry sync — used by the daily GitHub Actions workflow). `scripts/daily_tracker_refresh.py` refreshes README tracker sections; the `chore: aggiorna riepilogo PR giornaliero` commits in history come from that job — don't hand-edit those sections unless the script is broken.

### Database

- `npm run db:migrate` / `db:migrate:down` / `db:migrate:status` — Python runner at `scripts/db/run_migrations.py`.
- `npm run dev:setup --workspace apps/backend` — applies `prisma generate` + `prisma migrate deploy` + `prisma db seed` against the current `DATABASE_URL`.

## Architecture notes worth reading multiple files for

- **Generation pipeline (Flow)**. HTTP request → `apps/backend/routes/*` → `services/generation/*` (Node) → Python bridge (`services/generation/orchestrator.py`) via a worker pool sized by `config/orchestrator.json`. Inputs are normalized (slug, trait_ids, seed, biome_id); when trait validation fails, a hardcoded fallback set (`artigli_sette_vie`, `coda_frusta_cinetica`, `scheletro_idro_regolante`) is applied and logged as structured JSON (`component = generation-orchestrator`). Responses always combine `blueprint` + `validation` + `meta` — don't change that shape without also updating `packages/contracts` and the dashboard renderers.
- **Combat pipeline (Rules Engine)**. Il rules engine d20 in `services/rules/` risolve azioni tattiche (attacco d20 vs DC, Margin of Success, damage step, parata reattiva, status fisici/mentali). `hydration.py` carica i valori meccanici da `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`; `resolver.py` esegue la risoluzione; `worker.py` espone il bridge per il backend. Lo schema payload è in `packages/contracts/schemas/combat.schema.json`. Vedi `docs/hubs/combat.md` per il canonical hub e `docs/adr/ADR-2026-04-13-rules-engine-d20.md` per le decisioni architetturali.
- **Session engine (sprint 006–019, round model since ADR-2026-04-16)**. Split in 4 moduli (851+602+248+58 LOC): `session.js` (createSessionRouter closure, /start /action /turn/end /end /state /:id/vc), `sessionRoundBridge.js` (round flow wrappers + 4 round endpoints), `sessionHelpers.js` (15 pure functions), `sessionConstants.js` (constants + defaults). **Round model ON by default** (M17 complete): `/action` attack e `/turn/end` passano attraverso il round orchestrator (`apps/backend/services/roundOrchestrator.js`). AI SIS usa `declareSistemaIntents.js` (intents puri). Legacy sequential-turn code rimosso. Schema raw event: `{ action_type, turn, actor_id, target_id, damage_dealt, result, position_from, position_to }` — non rompere questo formato, è usato da vcScoring.
- **Contracts are the seam**. `packages/contracts` holds AJV schemas + TS types loaded by the backend (schema registry validates both live and mock responses) and by `scripts/mock/generate-demo-data.js`. A schema change ripples to backend tests and mock snapshots.
- **Mock parity**. `/api/mock/*` endpoints serve the JSON that `npm run mock:generate` writes. The production Mission Console bundle (`docs/mission-console/`) reads the same data — mocks are not just test fixtures, they back the "offline" UX.
- **Auth**. Backend routes honor JWT (`AUTH_SECRET`, `AUTH_AUDIENCE`, `AUTH_ISSUER`, `AUTH_ROLES_CLAIM`, etc.) when configured, otherwise open. Legacy Bearer tokens `TRAIT_EDITOR_TOKEN`/`TRAITS_API_TOKEN` protect trait routes; accepted roles are `reviewer`/`editor`/`admin` (admin always allowed).
- **Trait Editor** is a separate Vite app under `apps/trait-editor/` — see `docs/traits/trait-editor.md` before touching it.
- **Mission Console**. The production UI is a pre-built Vue 3 bundle under `docs/mission-console/` (`ConsoleLayout-*.js`, `FlowShellView-*.js`, `atlas-*.js`, `nebula-*.js`, `index.html`), served via GitHub Pages. Source is NOT in this repo. The former `apps/dashboard/` AngularJS scaffold was removed in #1343 — see [`ADR-2026-04-14`](docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) (superseded).
- **Sibling repo topology**. A second repository `MasterDD-L34D/Game-Database` (local path typically `C:/Users/VGit/Documents/GitHub/Game-Database`) lives alongside this one. It is a taxonomy CMS (Prisma + Postgres + Express + React) that imports trait/species/biome content from this repo's `packs/evo_tactics_pack/docs/catalog/` via a build-time script (`server/scripts/ingest/import-taxonomy.js`, invoked by `npm run evo:import` on the Game-Database side). The data flow is **unidirectional build-time**: Game → Game-Database. **HTTP runtime integration (Alt B)** is scaffolded and feature-flagged OFF by default: `GAME_DATABASE_ENABLED=false`. When enabled, Game's catalog service fetches the trait glossary from `GET /api/traits/glossary` on Game-Database (response shape: `{ traits: [{ _id, labels: { it, en }, descriptions: { it, en } }] }`), with TTL cache and graceful fallback to local files. The shared contract is defined in `packages/contracts/schemas/glossary.schema.json`. Full rationale, schema mismatch analysis, and roadmap in [`docs/adr/ADR-2026-04-14-game-database-topology.md`](docs/adr/ADR-2026-04-14-game-database-topology.md). Port allocation: Game backend = **3334**, Game-Database = **3333**, Game-Database Postgres host port = **5433** (to avoid conflict with Game's Postgres on 5432).

## Token optimization (context budget)

**DO NOT read these files unless explicitly needed** — they are large and consume significant context:

- `docs/governance/docs_registry.json` (196KB, 477 entries) — only for governance check scripts, never for coding
- `.ai/` folder (Codex-only agent profiles) — irrelevant for Claude Code sessions
- `docs/planning/EVO_FINAL_DESIGN_*.md` (836KB total, 8 files) — reference-only, read individual sections via offset/limit
- `apps/backend/routes/session.js` (1967 LOC) — read only the section you need, use grep to find line numbers first

**Prefer targeted reads**: use `grep -n` to find line numbers, then `Read` with `offset`+`limit`. Avoid reading entire large files.

## Agent / automation conventions in this repo (Codex-only)

> **Note**: this section describes the Codex agent orchestration system, NOT Claude Code. Claude Code does not need to read `AGENTS.md`, `.ai/BOOT_PROFILE.md`, or per-agent profiles. These are listed here only so Claude Code recognizes when users reference Codex commands.

- `AGENTS.md` + `.ai/BOOT_PROFILE.md` define a STRICT MODE workflow for Codex agents, with automatic agent routing and macro-command library. Users may send prompts like `COMANDO: GOLDEN_PATH_FEATURE ...` or `AGENTE: trait-curator` — those map to Codex flows, not to Claude Code.
- **Don't invent new `COMANDO:` semantics** or create slugs/files that don't match the existing schemas.
- The per-agent profiles under `.ai/<agente>/` describe scope for Codex agents (trait-curator, species-curator, balancer, etc.).

## Contribution gates (from CONTRIBUTING.md)

- PRs must reference a passing release validator report; regressions block merge.
- **Master DD approval** must be documented (link a comment/issue) before merging.
- Include a changelog entry and a **03A rollback plan** in the PR notes.
- Run `npm run format:check` + `npm run test` locally; for frontend changes, also `npm run build` + `npm run preview` (or `npm run webapp:deploy`).
- Do not commit binary archives under `reports/backups/**` — upload externally and update the `manifest.txt` (Archive/SHA256/Location/On-call/Last verified) per `docs/planning/REF_BACKUP_AND_ROLLBACK.md`, then log in `logs/agent_activity.md`. `npm run lint:backups` enforces this.
- Husky runs a Prettier pre-commit on staged files; re-run `npm run prepare` after a fresh checkout.

## Session workflow patterns (Claude Code)

Pattern codificati in memory per persistenza cross-session. Dettagli in `feedback_*.md` sotto `C:/Users/VGit/.claude/projects/C--Users-VGit-Desktop-Game/memory/`.

**File principali**:

- [`feedback_claude_workflow_consolidated.md`](~/.claude/projects/C--Users-VGit-Desktop-Game/memory/feedback_claude_workflow_consolidated.md) — **8 pattern consolidati in 1 file** (kill-60 post-research 2026-04-18): tabella opzioni, caveman voice, checkpoint memory, CI auto-merge, delega research, piano file:line, admit+reinvestigate, probe-before-batch
- [`feedback_meta_checkpoint_directive.md`](~/.claude/projects/C--Users-VGit-Desktop-Game/memory/feedback_meta_checkpoint_directive.md) — pausa riflessiva 5-step, auto-trigger su "analizza"/"ricorda"/"checkpoint", comando `/meta-checkpoint`
- [`reference_flint_optimization_guide.md`](~/.claude/projects/C--Users-VGit-Desktop-Game/memory/reference_flint_optimization_guide.md) — 40+ fonti research + kill-60 decision log + follow-up priorities

Memory files auto-caricati via `MEMORY.md` ogni sessione.

## Platform notes

Primary working directory is on Windows, but the shell is bash (Git Bash/MSYS) — use Unix paths and `/dev/null`, not `NUL`. Line endings are managed by `.gitattributes`/Prettier; don't fight them.

---

## 🎮 Sprint context (aggiornato: 2026-04-18)

> Sezione aggiunta post-sprint 019. Aggiorna a ogni sessione significativa.

**Visione**: "Tattica profonda a turni, cooperativa contro il Sistema, condivisa su TV: come giochi modella ciò che diventi."

**Sprint completati**: 001–020 · **Sessione 16-17/04**: 22 PR (#1383→#1405) · **Sessione 16/04 (repo analysis)**: 10 PR (#1422→#1431) · **Sessione 17/04 (game loop arc)**: 21 PR (#1447→#1471) · **Sessione 17/04 M2 (ability + canonical)**: 16 PR (#1498→#1527) · **Sessione 17-18/04 (co-op scaling 4→8)**: 6 PR (#1529, #1530, #1531, #1534, #1537, #1542)

**Milestone completate sessione 16-17/04**:

- Final Design Freeze v0.9 pubblicato (PR #1378, sessione precedente)
- Round orchestrator Python batch 2: predicates DSL, cooldown, counter/overwatch, heal/healed (+42 test, 217/217 verdi)
- **ADR-2026-04-16 Node session engine migration: 17/17 step completati** (#1387-#1405). Round model default ON, legacy removed.
- Workflow cleanup: 28→16 (-43%), 0 broken, Node 22 + FORCE_NODE24
- Issue cleanup: 33→0 (-100%)
- Token optimization: session.js -57% (1967→851 LOC, split in 4 moduli), docs/planning -49%

**Milestone sessione repo analysis (#1422-#1431)**:

- 18 repo esterni analizzati con scorecard (7 deep dive: wesnoth, boardgame.io, xstate, OpenRA, bevy, ink, langium)
- 24 pattern architetturali estratti e implementati (+3816 LOC)
- Nuove dipendenze: `xstate@5` (state machines), `inkjs` (narrative engine)
- **Nuovi moduli**: statusEffectsMachine.js (xstate FSM), roundStatechart.js, sistemaActor.js, sessionValidation.js, narrativeEngine.js + narrativeRoutes.js, pluginLoader.js, gen_trait_docs.py, gen_trait_types.py
- **Nuovi YAML balance**: ai_intent_scores, ai_profiles, terrain_defense, movement_profiles, species_resistances, pack_manifest
- AI Sistema ora data-driven (intent scores + profiles in YAML)
- Combat prediction: `predict_combat()` simula N=1000 attacchi
- Terrain defense modifier nel calcolo CD
- Narrative service con inkjs (briefing/debrief con scelte)
- Plugin registration pattern per servizi backend
- **P4 completato**: MBTI axes E_I+S_N implementati, 16 Forms YAML, PF_session endpoint, Ennea theme effects, deriveMbtiType()

**Milestone sessione SoT deep dive (#1441)**:

- **SoT v1→v4**: 13→19 sezioni, deep dive 12+ repo esterni (AncientBeast, wesnoth, yuka, GOApy, UtilityAI, easystarjs, honeycomb-grid, Colyseus)
- **3 ADR nuovi**: Grid hex axial, Networking Colyseus, AI Utility Architecture
- **hexGrid.js** (195 LOC): axial coordinates, Dijkstra flood-fill, A\* pathfinding, BFS range, LOS ray-cast (23 test)
- **utilityBrain.js** (310 LOC): 7 considerations, 6 curve, 3 difficulty profiles, bridge selectAiPolicy (14 test)
- **encounter.schema.json**: AJV schema completo, 3 encounter validati, test CI
- **terrain_defense.yaml v0.2**: +movement_cost, cover, blocks_los, hazard_effect, elevation (3 livelli)
- **2 draft promossi**: 15-LEVEL_DESIGN.md, 17-SCREEN_FLOW.md
- **28 Open Questions**: 12✅ chiuse, 9🟡 proposte, 7🔴 bloccate (Art Direction + Business)
- **Utility AI wired opt-in** in declareSistemaIntents.js (zero breaking change)

**Milestone sessione 17/04 game loop arc (#1447-#1471, 21 PR)**:

- **Mega-task documentale canonico** — GDD Master, Promotion Matrix, naming styleguide bilingue (45 specie + 40 biomi), 5 doc canonical nuovi, 8/8 TODO chiusi
- **Game loop end-to-end funzionante per la prima volta** — primo playtest digitale + N=10 batch harness rivela 3 bug critici (target dead, AI fratricide, enemy damage 0)
- **Curva tutorial completa 1→5** (5 encounter giocabili: savana, savana asimmetrica, caverna+hazard, foresta+bleeding, BOSS Apex). Win rate decrescente: 80%→80%→50%→30%→20%
- **Atlas live** in /api/session/state — pressure/momentum/warning_signals
- **Sistema pressure tier** wirato — pressure +20 su KO player → tier gates SIS intents (Calm 1 → Apex 3). AI passive→aggressive
- **SquadSync focus_fire combo** — 2+ player same target same round = +1 bonus dmg
- **Hazard tile damage** — wired in handleTurnEndViaRound, hazard_events response
- **VC calibration iter1 applied** — Ennea threshold lower + MBTI dead-band 0.45-0.55, 4/6 archetipi reachable
- **Status effects** — bleeding via trait `denti_seghettati` su enemy
- Vedi [`docs/process/sprint-2026-04-17.md`](docs/process/sprint-2026-04-17.md) per dettagli completi

**Milestone sessione 17/04 M2 (#1498-#1527, 16 PR — ability executor + SoT canonical)**:

- **Ability executor**: 0 → **18/18 effect_type live** (move_attack, attack_move, buff, heal, multi_attack, attack_push, debuff, ranged_attack, drain_attack, execution_attack, shield, team_buff, team_heal, aoe_buff, aoe_debuff, surge_aoe, reaction, aggro_pull)
- **Reaction trigger system**: intercept (ally_attacked_adjacent) + overwatch_shot (enemy_moves_in_range INTO) con kill chain + reaction cap 1/actor
- **Stat bonus wiring**: actor.attack_mod_bonus + target.defense_mod_bonus consumati in resolveAttack + predictCombat, decay via status[stat_buff|debuff]
- **SoT canonical round model**: `POST /api/session/round/execute` batch endpoint con priority queue (ADR-2026-04-15 compliant). Formula: `initiative + action_speed - status_penalty`
- **AP canonical**: tutorial 02-05 allineati a `ap_max=2`. Tutorial 01 eccezione easy documentata
- **CLI playtest**: `tools/py/master_dm.py` REPL per Master DM tabletop → batch canonical endpoint
- **FRICTION 7/7 risolte**: AP budget + ability syntax + effective_reach + effect_trigger on_hit/always
- **Polish**: squadCombo flake eliminato (50/50), kill chain on intercept death, aggro_warning player, reaction cap 1
- **M3 automated**: N=30 aggregate post ap=2. T04 33% ✓ centrato (hp tune -1), T05 ~20% ✓ in band (hp 9→11)
- Vedi [`docs/process/sprint-2026-04-17-m2-canonical.md`](docs/process/sprint-2026-04-17-m2-canonical.md) per dettagli completi

**Milestone sessione 17-18/04 co-op scaling 4→8 (ADR-2026-04-17, 6 PR)**:

- **PR #1529 data**: `data/core/party.yaml` canonical 11 modulation preset (solo→full 8p), schema AJV `schemas/evo/party.schema.json`, ADR `ADR-2026-04-17-coop-scaling-4to8.md`
- **PR #1530 engine**: `services/party/loader.js` (memoized YAML loader), `apps/backend/routes/party.js` (4 endpoint /api/party/{config,modulations,modulations/:id,grid-size}), `session.js /start` accetta `modulation` param, grid dinamica 6×6/8×8/10×10. AI factories (sistemaTurnRunner, declareSistemaIntents, abilityExecutor) leggono session.grid per-call. +7 test partyRoutes.
- **PR #1531 UI**: lobby modulation picker in `apps/play/index.html`, popolato da `/api/party/modulations`, change event riavvia sessione, canvas auto-fit
- **PR #1534 hardcore encounter**: `enc_tutorial_06_hardcore` "Cattedrale dell'Apex" 8p vs 6 enemy (1 BOSS + 2 elite + 3 minion), grid 10×10, pressure 75, +3 test
- **PR #1537 docs(playtest)**: tutorial 01-05 sweep report (11 run su 20 log), addendum predict_combat N=1000 baseline. Identificato bug aggregate_mod ignora unit.mod (TKT-06). Backlog TKT-07 sweep #2.
- **PR #1542 calibration iter 1**: batch N=13 hardcore_06 → 84.6% win (target 15-25%, +59pp out of band). Tune: boss hp 14→22, +1 elite (3 totali), guardia +1. Harness `tools/py/batch_calibrate_hardcore06.py` + report `docs/playtest/2026-04-18-hardcore-06-calibration.md` + 4 backlog ticket (TKT-08..11).

**Backlog ticket aperti** (sessione 17-18/04):

- TKT-06 predict_combat include unit.mod stat
- TKT-07 tutorial sweep #2 N=10/scenario post telemetry fix
- TKT-08 backend stability under batch (morì run #14 batch N=30)
- TKT-09 ai_intent_distribution non emessa via /round/execute response
- TKT-10 harness retry+resume incrementale (JSONL write per-run)
- TKT-11 predict_combat 8p aggregate sanity (boss vs full party)

**Test totali aggiornati**: Python rules engine 196/196 · Node AI 197/197 · VC scoring 21/21 · Encounter schema 6/6 · **Session/playtest/atlas 309/309** · **Ability/canonical 60+** (M2) · **Party + hardcore 10/10** (co-op arc) · **Totale 710+**

### Pilastri di design — stato attuale

| #   | Pilastro                     | Stato |
| --- | ---------------------------- | :---: |
| 1   | Tattica leggibile (FFT)      |  🟢   |
| 2   | Evoluzione emergente (Spore) |  🟢   |
| 3   | Identità Specie × Job        |  🟢   |
| 4   | Temperamenti MBTI/Ennea      |  🟢   |
| 5   | Co-op vs Sistema             |  🟢   |
| 6   | Fairness                     |  🟢   |

### Guardrail sprint (non negoziabili)

**Non toccare senza segnalare:**

- `.github/workflows/` — CI
- `migrations/` — schema DB
- `packages/contracts/` — schema condivisi (ripple su backend + mock)
- `services/generation/` — generatore specie, pipeline separata dal session engine

**Regola 50 righe**: task >50 righe nuove fuori da `apps/backend/` → ferma, segnala, aspetta conferma.

**Trait**: solo in `data/core/traits/active_effects.yaml`. Mai hardcoded nel resolver.

**Nuove dipendenze npm/pip**: approvazione esplicita richiesta.

### Definition of Done (ogni sprint)

1. `node --test tests/ai/*.test.js` → verde
2. `npm run format:check` → verde
3. `git status` → working tree pulito
4. Nessun nuovo file in cartelle vietate
5. Se toccato `vcScoring.js` o `policy.js` → aggiorna `docs/architecture/ai-policy-engine.md`
6. Se toccato `services/rules/` → aggiorna `docs/hubs/combat.md`
