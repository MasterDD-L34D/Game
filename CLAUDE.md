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
- `services/rules/` — ⚠️ **DEPRECATED (M6-#4 Phase 1, 2026-04-19)**. Rules engine d20 Python pensato per tabletop Master DM. **User direction**: "1 solo gioco online, senza master" → Python engine = dead weight. **Runtime canonical**: Node (`apps/backend/services/combat/`, `apps/backend/routes/session.js`). Phase 2 feature freeze + Phase 3 removal pending. Vedi `services/rules/DEPRECATED.md` + `docs/adr/ADR-2026-04-19-kill-python-rules-engine.md`. NO new features; porting a Node.
- `apps/backend/services/combat/` — Node native combat logic canonical (M6-#1 2026-04-19). `resistanceEngine.js` (channel resistance per archetype), `reinforcementSpawner.js`, `objectiveEvaluator.js`. Replace Python `services/rules/`.
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

## 🎮 Sprint context (aggiornato: 2026-04-24 — Playtest prep + smoke round 1)

**Sessione 2026-04-24 (playtest prep)**: 4 PR mergiati su main consecutivi per abilitare playtest live. Smoke round 1 rivelò bug reali → fix-round immediato.

**PR shipped main**:

| PR                                                       | Scope                                                                                                                                                                                                                                      | SHA        | Status |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | :----: |
| [#1727](https://github.com/MasterDD-L34D/Game/pull/1727) | V5 SG runtime wire abilityExecutor (7 sites) + UI rewards/packs in phaseCoordinator + characterCreation                                                                                                                                    | `b9a6dc73` |   ✅   |
| [#1728](https://github.com/MasterDD-L34D/Game/pull/1728) | **Bug critico**: `publicSessionView` sovrascriveva V5 pool `u.sg` con gauge stress legacy. Fix preserve V5 + rename legacy → `stress_gauge` + CSS cc-preview-packs                                                                         | `0df68899` |   ✅   |
| [#1729](https://github.com/MasterDD-L34D/Game/pull/1729) | Launcher UX rewrite: 5 preflight check, health probe /api/health, ngrok tunnel + auto-open browser + clipboard copy URL + QR link + ANSI banner pulito. Backend stdout → `logs/demo-<ts>.log` separato                                     | `a5d18248` |   ✅   |
| [#1730](https://github.com/MasterDD-L34D/Game/pull/1730) | Playtest-ui fix round 1: share hint self-poll setInterval 1s (salvagente race dismiss), layout ultrawide (CELL cap 96→160 + `min-height:0` main + sidebar 300→360), `public/runtime-config.js` fallback statico per ngrok single-tunnel WS | `168a8d0d` |   ✅   |

**Bug critici identificati + fix root cause**:

- **V5 SG pool collision**: spread `...u` preservava `u.sg` V5 (integer 0..3) ma linea successiva sovrascriveva con stress gauge legacy (0..100). V5 mai esposto al client.
- **ngrok single-tunnel WS rotto**: client defaultava `:3341/ws` non esposto. Fix: backend intercepta `/play/runtime-config.js` dinamicamente + file statico fallback in `public/`.
- **Share hint race dismiss**: event-driven listener fallivano su race (hint reso post-hello con roster già popolato). Fix: `updateHostRoster` trigger dismiss + self-poll setInterval salvagente.
- **Layout ultrawide 3436×1265**: `fitCanvas` CELL cap 96 era TV-safe ma canvas minuscolo su desktop. Fix cap 160.

**Playtest round 2 pending** (userland): retest post PR #1730 con browser Ctrl+Shift+R (cache bust). Residuo: narrative log prose feature M18+ (gap non-bug).

---

## 🎮 Sprint context (aggiornato: 2026-04-26 — Vision Gap V1-V7 + M16-M20 co-op MVP)

**Sessione 2026-04-26 sera (Vision Gap autonomous)**: Audit post-M20 rileva 7 verità promesse in `docs/core/` zero runtime. PR [#1726](https://github.com/MasterDD-L34D/Game/pull/1726) branch `feat/p5-vision-gaps` chiude 6/7 in 3 commit.

**Gap chiusi**:

- **V1 Onboarding 60s Phase B**: `/api/campaign/start` accetta `initial_trait_choice`, `onboardingPanel.js` Disco Elysium 3-stage overlay
- **V2 Tri-Sorgente reward API Node-native**: `rewardOffer.js` + pool R/A/P + softmax T=0.7 + `/api/rewards/{offer,skip}` + `/fragments`, skipFragmentStore + 15-card seed pool
- **V4 PI-Pacchetti tematici 16×3 machine-readable**: `form_pack_bias.yaml` + `formPackRecommender.js` (d20 universal/bias_forma/bias_job/scelta)
- **V5 SG earn formula Opzione C mixed**: ADR-2026-04-26 chiude Q52 P2. `sgTracker.js` 5 dmg taken OR 8 dmg dealt → +1 SG, cap 2/turn, pool max 3. **Wired** in session.js damage step
- **V7 Biome-aware spawn bias**: `biomeSpawnBias.js` affix+archetype weight (primary 3x, support 2x, affix 1.5x per match, cap 3x). **Wired** in reinforcementSpawner
- **Telemetry endpoint**: `POST /api/session/telemetry` batch JSONL append (cap 200, anonymous events OK, logs gitignored)

**Deferred**: V3 Mating/Nido (~20h post-MVP), V6 UI TV dashboard polish (~6h post-playtest).

**Tests**: +65 nuovi (5+5+12+17+12+14) · AI regression 307/307 · **411/411 verde aggregate**.

**Sessione 2026-04-26 mattina (M16-M20 co-op)**: PR #1721/#1722/#1723/#1724/#1725. State machine `lobby → character_creation → world_setup → combat → debrief → (loop|ended)`. +41 test.

**Score pilastri aggiornato**:

| #   | Pilastro   |                 Stato                 |
| --- | ---------- | :-----------------------------------: |
| 1   | Tattica    |                  🟢                   |
| 2   | Evoluzione |       🟢c+ (tri-sorgente live)        |
| 3   | Specie×Job |                  🟢c                  |
| 4   | MBTI       | 🟡++ (PI pacchetti + Thought Cabinet) |
| 5   | Co-op      |      🟢c (residuo playtest live)      |
| 6   | Fairness   |     🟢c+ (SG wired + biome bias)      |

Handoff: [`docs/planning/2026-04-26-vision-gap-sprint-handoff.md`](docs/planning/2026-04-26-vision-gap-sprint-handoff.md) + [`docs/process/sprint-2026-04-26-M16-M20-close.md`](docs/process/sprint-2026-04-26-M16-M20-close.md).

**Next session residuo** (autonomous 4h + userland 2h):

- UI polish: wire onboardingPanel in main.js, reward offer in debriefPanel, pack recommender in char creation
- Runtime: sgTracker.accumulate in abilityExecutor.js (5 sites), lifecycle reset hooks
- **TKT-M11B-06 playtest live 2-4 amici** (userland, unico bloccante umano)

---

## 🎮 Sprint context (aggiornato: 2026-04-23)

> Sezione aggiunta post-sprint 019. Aggiorna a ogni sessione significativa.

**Visione**: "Tattica profonda a turni, cooperativa contro il Sistema, condivisa su TV: come giochi modella ciò che diventi."

**Sprint completati**: 001–020 + M11/M12/M13 · **Sessione 16-17/04**: 22 PR (#1383→#1405) · **Sessione 16/04 (repo analysis)**: 10 PR (#1422→#1431) · **Sessione 17/04 (game loop arc)**: 21 PR (#1447→#1471) · **Sessione 17/04 M2 (ability + canonical)**: 16 PR (#1498→#1527) · **Sessione 17-18/04 (co-op scaling 4→8)**: 6 PR (#1529, #1530, #1531, #1534, #1537, #1542)

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

**Test totali aggiornati**: Python rules engine 196/196 · Node AI 197/197 · VC scoring 21/21 · Encounter schema 6/6 · **Session/playtest/atlas 309/309** · **Ability/canonical 60+** (M2) · **Party + hardcore 10/10** (co-op arc) · **Lobby/WS 15/15** (M11 Phase A) · **Totale 725+**

**Milestone sessione 2026-04-20 M11 Phase A (Jackbox WebSocket backend, PR #1680)**:

- **PR #1680 merged** `db4325f0` (sequenza C→B→A: C ✅ B ✅ A ✅, M11 Phase A chiuso)
- **P5 🟡 → 🟡-progressing**: network beachhead live. Phase B (frontend lobby + TV view) next session chiude P5 → 🟢
- **Stack**: `ws@8.18.3` pre-installato, **zero nuove deps**. Colyseus ADR-2026-04-16 resta tier-2 fallback.
- **Runtime**: `apps/backend/services/network/wsSession.js` (LobbyService + Room + createWsServer) + `routes/lobby.js` (5 REST endpoint) + `app.js`/`index.js` wire. WS server isolato su porta **3341** (`LOBBY_WS_PORT`, disable via `LOBBY_WS_ENABLED=false`).
- **Code gen**: 4-letter da alfabeto 20 consonanti `BCDFGHJKLMNPQRSTVWXZ` (no vocali → no parole). Spazio 160k.
- **Protocollo**: host-authoritative (solo host può pubblicare `state`), intent relayed al solo host (non broadcast peers), reconnect via token stabile, 30s heartbeat ping/pong.
- **Tests**: 15/15 nuovi (9 REST + 6 WS integration: 4-player sync + host-auth gate + intent relay scope + reconnect survives drop + auth failures).
- **ADR-2026-04-20 Accepted**: [docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md](docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md).

**Fuori scope M11 Phase A (delegato Phase B next session, ~8-10h)**:

- Frontend lobby picker `apps/play/src/lobby.html` + TV dual-view (shared spectator vs phone-private input)
- Client reconnect logic `apps/play/src/network.js` (backoff + state replay)
- Campaign-state live mirror via WS `state` channel (link M10 campaign engine)
- Prisma persistence adapter (Phase C opzionale, default in-memory)
- Rate-limit / DoS hardening (Phase D se produzione pubblica)

**Milestone sessione 2026-04-20 M11 Phase B + B+ + C + TKT-05 (stack 4 PR mergiati)**:

- **PR #1682 merged** `d35dde92` — Phase B: `apps/play/lobby.html` + `apps/play/src/network.js` (LobbyClient + reconnect backoff 1s→30s + stateVersion reconcile) + `apps/play/src/lobbyBridge.js` (banner + spectator overlay) + main.js bootstrap gate + 5 e2e test
- **PR #1686 merged** `d14b2655` — Phase B+ (TKT-01/02/03): phone intent composer (roster + unit/action/target select) + host `onPlayerIntent` hook → `api.declareIntent` + `setCampaignSummary` + 2 e2e test
- **PR #1684 merged** `583be2a8` — Phase C (TKT-04/06 partial): host TV roster panel (status dots + collapsible) + `body.lobby-role-{host,player}` classes + ngrok playbook `docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md` + 1 e2e test
- **PR #1685 merged** `d97eb5f8` — TKT-05 host-transfer: `Room.transferHostAuto` FIFO + `scheduleHostTransfer` grace 30s default + `host_transferred` broadcast backward-compat + bridge re-wire (banner swap + overlay remove + host panel spawn) + 3 e2e test
- **Test stack lobby**: 11 e2e + 15 Phase A REST/WS + 307 AI = **333/333** · format:check verde
- **Flow end-to-end programmatico**: phone composer → `sendPlayerIntent` → WS → host `onPlayerIntent` → `api.declareIntent` → round ready → `publishWorld` → player overlay render
- **Pilastro 5 status**: **🟡** (flow + resilience 100% chiuso) → **🟢 atteso dopo TKT-M11B-06 playtest live** (non-automatizzabile, next session userland)
- **Handoff doc**: [`docs/planning/2026-04-22-next-session-kickoff-m11-playtest.md`](docs/planning/2026-04-22-next-session-kickoff-m11-playtest.md)

**Residuo backlog M11**:

- ~~TKT-M11B-04 canvas TV widescreen layout~~ ✅ merged #1688
- **TKT-M11B-06** playtest live execution (P1, userland, chiude P5 🟢)
- Prisma room persistence (P3, deferred)
- Rate-limit / DoS hardening (P3, solo deploy pubblico)

**M12 big rock next**:

- P2 full Form evoluzione (Spore-core, ~35h, 2-3 sprint — split M12.A/B/C)

**Sessione 2026-04-23** (PR #1688 merged `2f26e8be`):

- `apps/play/src/lobbyBridge.css` NEW (423 LOC CSS extract)
- `apps/play/src/lobbyBridge.js` -152 LOC cleaner bridge
- `scripts/run-{test-api,test-stack,export-qa}.cjs` cross-platform runner
- `tests/scripts/crossPlatformRunners.test.js` guard
- Baseline: **333/333** (AI 307 + lobby 15 + e2e 11)

**Milestone sessione 2026-04-23 M12 Phase A + B + C (stack 3 PR mergiati)**:

- **PR #1689 merged** `0d26ca6a` — Phase A: `apps/backend/services/forms/formEvolution.js` `FormEvolutionEngine` class + `apps/backend/routes/forms.js` 5 endpoint REST (registry/:id/evaluate/options/evolve) + 5 regole di gating (confidence/PE/cooldown/cap/same-form) + 25 test (16 unit + 9 route) + ADR `docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md`
- **PR #1690 merged** `578e1cc9` — Phase B: `formSessionStore.js` (in-memory keyed `${sid}:${uid}` + Prisma slot reserved) + `packRoller.js` (data/packs.yaml loader + mulberry32 seeded RNG + d20/d12/BIAS/SCELTA) + 7 nuovi endpoint (session CRUD + pack/roll + pack/costs) + 27 test (6 store + 11 pack + 10 session+pack route)
- **PR #1691 merged** `080bf3b9` — Phase C: `apps/play/src/formsPanel.js` overlay modale (16 MBTI form cards + confidence bar + eligibility + evolve + pack roll) + `apps/play/src/api.js` +13 metodi client + header button 🧬 Evo + 5 unit test inferVcAxes helper
- **Test M12 suite**: 16 engine + 9 route + 6 store + 11 pack + 10 route sessione+pack + 5 panel = **57 test** · format:check verde
- **Grand total main post-merge**: **390/390** (307 AI + 26 lobby + 57 M12 + altri)
- **Flow end-to-end**: unit VC axes → projectForm → engine.evaluate (gating) → engine.evolve → formSessionStore.applyDelta → UI panel render + pack roll preview
- **Pilastro 2 status**: 🔴 → 🟡 (Phase A) → 🟡+ (Phase B) → **🟡++** (Phase C) → 🟢 candidato post-Phase D
- **Handoff doc**: [`docs/planning/2026-04-24-next-session-kickoff-m12-phase-d.md`](docs/planning/2026-04-24-next-session-kickoff-m12-phase-d.md)

**Sessione 2026-04-25 P3.B + P6.B + verify sweep (3 PR)**:

- **PR #1696 merged** `9319eedd` — Verification post-merge: registry 3 new docs (2 ADR + 1 handoff) + workstream fix `planning` → `cross-cutting`. Governance 0 errors. Baseline 467/467.
- **PR #1697 merged** `a462d4d5` — M13 P3 Phase B: campaign advance XP grant hook (survivors+xp_per_unit opzionali, response.xp_grants[]). Session /start applyProgressionToUnits (stat bonuses + \_perk_passives/ability_mods). Combat resolver 5 passive tags wired (flank_bonus, first_strike_bonus, execution_bonus, isolated_target_bonus, long_range_bonus). Frontend progressionPanel overlay (pattern formsPanel) + header btn 📈 Lv + auto-open on leveled_up. Balance pass 448 builds validated. **Pilastro 3**: 🟡+ → **🟢 candidato**. +24 test.
- **PR #1698 merged** `135b5b1f` — M13 P6 Phase B: calibration harness Python tools/py/batch_calibrate_hardcore07.py (N=10 target win 30-50%, execution userland). HUD timer countdown bottom-right overlay + CSS @keyframes mt-pulse (red warning + strikethrough expired). Campaign auto-timeout: state.lastMissionTimer cache → advance override outcome='timeout' quando timer.expired. **Pilastro 6**: 🟡+ → **🟢 candidato**. +10 test.

**Sessione 2026-04-24 M12.D + M13.P3 + M13.P6 (3 PR)**:

- **PR #1693 merged** `2cfd4540` — M12 Phase D: campaign `/advance` response += `evolve_opportunity` additive flag (victory + pe_earned ≥ 8). `main.js refresh` fire-and-forget `api.vc(sid)` → `state.vcSnapshot` pipe. `formsPanel.onEvolveSuccess` callback → `pushPopup('🧬 ' + form_id)` + `flashUnit` + `sfx.select`. Prisma write-through adapter `FormSessionState` model + migration 0003 + graceful in-memory fallback. **Pilastro 2**: 🟡++ → **🟢 candidato**. +10 test (27 campaignRoutes + 6 formSessionStorePrisma).
- **PR #1694 merged** `24169c41` — M13 P3 character progression XCOM EU/EW perk-pair: `data/core/progression/xp_curve.yaml` (7 levels threshold 0→275) + `perks.yaml` (**7 jobs × 6 levels × 2 perks = 84 perks canonical**). `ProgressionEngine` class + 6 pure helpers + `progressionStore` in-memory + Prisma write-through (`UnitProgression` model + migration 0004). 8 endpoint `/api/v1/progression/*` (registry/jobs/:id/perks/:uid CRUD + xp + pick + effective). Plugin wire. **Pilastro 3**: 🟡 → **🟡+** (engine + REST live; resolver/UI integration Phase B pending). +24 test (13 engine + 11 routes).
- **PR #1695 open** — M13 P6 hardcore mission timer (Long War 2 pattern): `apps/backend/services/combat/missionTimer.js` (135 LOC) + wire `sessionRoundBridge` both paths. Hardcore 06 iter3 += timer 15 rounds, `on_expire: escalate_pressure` +30 + 2 extra spawns. Nuovo **scenario 07 "Assalto Spietato"** quartet 4p timer 10 + pod activation reinforcement (6 spawn cap). Risolve iter1 N=30 → 96.7% win deadlock (multiplier knob exhausted). **Pilastro 6**: 🟡 → **🟡+** (engine live; calibration N=10 + UI HUD Phase B pending). +17 test.

**Score pilastri post-sessione 2026-04-24**: 1/6 🟢 (P1) + **1/6 🟢 candidato** (P2 post-D) + **3/6 🟡+** (P3/P5/P6) + 2/6 🟡 (P4/P6 residual). Branch baseline: AI 307 + progression 24 + M12 63 + lobby 26 + campaign 27 + timer 17 = **~464/464** verde.

**Residuo backlog post-sessione 2026-04-24**:

- **M13 P3 Phase B** (~8h): campaign advance XP grant hook + combat resolver wire (effectiveStats/listAbilityMods/listPassives) + frontend pick perk overlay + balance N=10 sim
- **M13 P6 Phase B** (~3-5h): calibration harness `tools/py/batch_calibrate_hardcore07.py` N=10 + frontend HUD timer countdown + campaign outcome='timeout' auto-set on timer expire
- **M12 Phase D follow-up**: playtest live end-to-end (userland, chiude P2 🟢 definitivo)
- **TKT-M11B-06 playtest live** (userland, chiude P5 🟢)

### Pilastri di design — stato reale (audit 2026-04-20, rev post deep-audit)

Revisione honest post-M7 + deep-audit Explore agent. Statuses precedenti 6/6 🟢 confondevano **"dataset shipped"** con **"runtime shipped"**.

- `docs/planning/2026-04-20-pilastri-reality-audit.md` — breakdown dettagliato per Pilastro.
- `docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md` — roadmap 3-sprint con pattern proven (Wesnoth + XCOM + Jackbox + Long War).

| #   | Pilastro                     |                        Stato                         |
| --- | ---------------------------- | :--------------------------------------------------: |
| 1   | Tattica leggibile (FFT)      |                          🟢                          |
| 2   | Evoluzione emergente (Spore) |   🟢 candidato (Phase D shipped, playtest pending)   |
| 3   | Identità Specie × Job        |   🟢 candidato (Phase B shipped, playtest gating)    |
| 4   | Temperamenti MBTI/Ennea      |                          🟡                          |
| 5   | Co-op vs Sistema             |              🟡 (playtest pending → 🟢)              |
| 6   | Fairness                     | 🟢 candidato (Phase B shipped, calibration userland) |

**Score**: 1/6 🟢 + **3/6 🟢 candidato** + 2/6 🟡 (zero 🔴).

**Gap principali + evidence-based strategy**:

- **P2 🟡**: `metaProgression.js` + 6 route meta runtime in-memory. Persistence + PI pack spender = **Wesnoth advancement + AI War pack unlock** (non Spore sim). ~15-20h.
- **P3 🟡**: 7 jobs + abilities rank r1/r2 live. Level curves YAML-only. **XCOM EU/EW perk-pair** 7 livelli × 2 perks. ~15-17h.
- **P4 🟡**: T_F **FULL**, altri 3 axes partial/null. **Disco Elysium thought cabinet** diegetic reveal. Non shippare axes senza focus group validation. ~8h.
- **P5 🟡**: **M11 SHIPPED** (Phase A–C + TKT-05, 4 PR, 333/333 test). Stack live: lobby.html + network.js + host-transfer + ngrok playbook. Chiude → 🟢 dopo TKT-M11B-06 playtest live (userland, non-automatizzabile).
- **P6 🟡**: Hardcore iter7 RED deadlock. Multiplier knob exhausted. **Long War 2 mission timers + pod count > HP**. ~5-7h.

**Sprint roadmap M9-M12** (single dev + AI pair, kill-60, decisione user 2026-04-20):

| Sprint  | Big rock                            | Effort | Demo impact                            |
| ------- | ----------------------------------- | ------ | -------------------------------------- |
| M9      | P6 timeout + P4 axes + P3 XP proof  | ~20h   | Hardcore playable, MBTI 4/4            |
| M10     | P2 PI pack runtime + P3 full levels | ~25h   | Trait acquisition campaign             |
| **M11** | **P5 Jackbox co-op TV (LOCKED)**    | ~20h   | 4 amici + phones + TV = tactical co-op |
| M12+    | P2 full Form evoluzione (deferred)  | ~35h   | Spore-core ciclo next                  |

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
