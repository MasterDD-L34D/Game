# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Evo-Tactics** is a co-op tactical game (d20-based, modular evolutionary progression) delivered as a polyglot monorepo. It ships YAML datasets, Python + TypeScript CLIs, an Express "Idea Engine" backend, a Vue/Vite dashboard, and publishing/validation pipelines. Most docs, commit messages, and inline comments are written in **Italian** — match that language when editing docs, but code identifiers stay English.

## Repository layout (high-level)

The monorepo uses npm workspaces declared in root `package.json`:

- `apps/backend/` — Express "Idea Engine" API (entry `index.js`, Prisma schema under `apps/backend/prisma/`). Serves `/api/*` including `/api/v1/generation/species`, `/api/v1/atlas/*`, `/api/mock/*`, `/api/ideas/*`.
- `apps/dashboard/` — Vue 3 + Vite SPA (workspace `@game/dashboard`). Consumes the backend + fallback JSON in `apps/dashboard/public/data/`. Data source registry lives at `apps/dashboard/src/config/dataSources.ts`.
- `services/generation/` — Node/Python bridge: `SpeciesBuilder`, `TraitCatalog`, biome synthesizer, runtime validators. The Python orchestrator (`services/generation/orchestrator.py`) is called from Node via a pool configured by `config/orchestrator.json` (`poolSize`, `requestTimeoutMs`).
- `services/rules/` — Rules engine d20 per il loop tattico: `resolver.py` (risoluzione azioni d20), `hydration.py` (idratazione trait meccanici da `trait_mechanics.yaml`), `demo_cli.py` (CLI demo turni), `worker.py` (bridge backend). Dati di bilanciamento in `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`.
- `packages/contracts/` — shared JSON Schema + TypeScript types used by backend, CLI mocks, and dashboard for Flow/Atlas payloads.
- `packages/ui/`, `packages/angular*` — shared UI + vendored AngularJS packages consumed as `file:` workspace deps.
- `tools/py/` — unified Python CLI (`game_cli.py`), validators, showcase builders. Legacy wrappers (`roll_pack.py`, `generate_encounter.py`) redirect to the shared parser.
- `tools/ts/` — TypeScript CLI + Node/Playwright tests (Lighthouse, roll pack, UI smoke).
- `packs/evo_tactics_pack/` — self-contained Ecosystem Pack v1.7 (data, validators, HTML reports under `out/validation/`).
- `data/` — canonical YAML datasets (species, biomes, traits, telemetry) + `data/derived/` analysis reports. Source of truth for Flow, Atlas, and pack validators.
- `services/eventsScheduler/`, `services/publishing/`, `services/export/`, `services/moderation/`, `services/squadsync/` — Node micro-services called from scripts and the backend.
- `scripts/` — top-level automation (dev stack, tracker refresh, snapshot regeneration, Drive sync).
- `tests/` — cross-cutting suites: `tests/api/*.test.js` (Node test runner), `tests/server/*.spec.ts`, `tests/generation/*.spec.ts`, `tests/scripts/*`, `tests/events/*.ts` (tsx), plus Python unit tests at `tests/test_*.py`.

The README "Settori e dipendenze" section is the canonical dependency map between Flow (generation), Atlas (telemetry/dashboard), backend, and datasets — **if you change a dataset in `data/core/`, you must also regenerate mocks and re-run the backend + dashboard suites**, not just the validator you edited.

## Common commands

Node 18+ (22.19.0 recommended) and npm 11+; Python 3.10+. Install once with `npm ci` (root), `npm --prefix tools/ts install`, `npm --prefix apps/dashboard install`, and `pip install -r tools/py/requirements.txt` (+ `requirements-dev.txt` for backend tooling). `npm run prepare` wires Husky hooks.

### Dev stack

- `npm run dev:stack` (or `make dev-stack`) — starts backend (`npm run start:api`) + dashboard (`npm run dev --workspace apps/dashboard`) together; if either dies, both stop.
- `npm run start:api` — backend only on `http://0.0.0.0:3333` (override with `PORT`). NeDB default at `data/idea_engine.db` unless `IDEA_ENGINE_DB` is set; Prisma/Postgres when `DATABASE_URL` is provided.
- `npm run dev` — dashboard only (Vite).
- `docker compose up` — Postgres + backend with auto Prisma bootstrap (guarded by `.docker-prisma-bootstrapped` marker; override with `PRISMA_BOOTSTRAP_FILE`, reset via `docker compose down -v`).

### Tests

- `npm run test` — full stack: runs `test:backend` then dashboard Vitest.
- `npm run test:stack` (or `make test-stack`) — coordinated backend + dashboard tests.
- `npm run test:api` — backend-only chain; it runs `node --test tests/api/*.test.js`, then multiple `tsx`-driven specs (`tests/generation/flow-shell.spec.ts`, `tests/server/orchestrator-*.spec.ts`, `tests/scripts/tune_items.test.ts`, `tests/events/dynamicEvents.e2e.ts`, `tests/api/serviceActorSessions.spec.ts`) plus `node --test tests/server/generationSnapshot.spec.js` and `tests/tools/deploy-checks.spec.js`. Most stages set `ORCHESTRATOR_AUTOCLOSE_MS=2000` — keep that env if you run them individually.
- **Run one Node `node --test` file**: `node --test tests/api/<file>.test.js` (use `--test-name-pattern '<name>'` to pick a subtest).
- **Run one tsx spec**: `./node_modules/.bin/tsx tests/server/orchestrator-bridge.spec.ts` (remember `ORCHESTRATOR_AUTOCLOSE_MS=2000` for orchestrator specs).
- **Dashboard unit tests**: `npm run test --workspace apps/dashboard` (Vitest + jsdom). Single file: `npm --prefix apps/dashboard exec vitest run path/to/file.spec.ts`.
- **tools/ts tests**: `npm --prefix tools/ts test` (compiles, runs Node unit tests + Playwright). Playwright-only: `npm run test:web`.
- **E2E Playwright (dashboard)**: `npm run test:e2e` (uses `apps/dashboard/tests/playwright/playwright.config.mjs`).
- **Python suites**: `PYTHONPATH=tools/py pytest` from the repo root. Single test: `PYTHONPATH=tools/py pytest tests/test_species_builder.py::test_case`.
- **Docs generator Vitest**: `npm run test:docs-generator` (uses `vitest.config.docs-generator.ts`).
- **Rules engine tests**: `PYTHONPATH=services/rules pytest tests/test_rules_engine.py`. Demo CLI: `PYTHONPATH=services/rules python3 services/rules/demo_cli.py`.

### Build, lint, format

- `npm run build` — build across workspaces that expose `build`.
- `npm run ci:stack` — pre-deploy check: `lint:stack` + `test:backend` + dashboard tests + a Vite build with `VITE_BASE_PATH=./`. Mirror what CI runs.
- `npm run lint:stack` — Prettier check on stack files (`scripts/lint-stack.mjs`).
- `npm run format` / `npm run format:check` — Prettier.
- `npm run schema:lint` — AJV-based YAML schema lint for `schemas/evo/`.
- `npm run docs:lint` / `npm run docs:smoke` — link & smoke checks for `docs/`.
- `npm run style:check` — trait style linter (`scripts/trait_style_check.js`).

### Dataset / validation workflows

Canonical flow when changing `data/core/` or `packs/evo_tactics_pack/data/`:

1. `python3 tools/py/game_cli.py validate-datasets`
2. `python3 tools/py/game_cli.py validate-ecosystem-pack --json-out packs/evo_tactics_pack/out/validation/last_report.json --html-out packs/evo_tactics_pack/out/validation/last_report.html`
3. `npm run mock:generate` — regenerates Flow + Nebula demo snapshots under `apps/dashboard/public/data/`. **Run this any time you touch Flow/Nebula datasets or `packages/contracts`** — backend and dashboard share those schemas and will fail validation otherwise.
4. `pytest tests/scripts/test_trace_hashes.py` + `node --test tests/scripts/sync_evo_pack_assets.test.js tests/services/biomeSynthesizerMetadata.test.js` before a database release.
5. `npm run sync:evo-pack` — rebuilds catalog + mirrors under `docs/evo-tactics-pack/` and `public/docs/evo-tactics-pack/` (paths are rewritten to `../../packs/evo_tactics_pack/data/...`).

Other automation: `make evo-list|evo-plan|evo-run` (`tools/automation/evo_batch_runner`), `make evo-validate` (AJV on `incoming/`), `make update-tracker` (tracker registry sync — used by the daily GitHub Actions workflow). `scripts/daily_tracker_refresh.py` refreshes README tracker sections; the `chore: aggiorna riepilogo PR giornaliero` commits in history come from that job — don't hand-edit those sections unless the script is broken.

### Database

- `npm run db:migrate` / `db:migrate:down` / `db:migrate:status` — Python runner at `scripts/db/run_migrations.py`.
- `npm run dev:setup --workspace apps/backend` — applies `prisma generate` + `prisma migrate deploy` + `prisma db seed` against the current `DATABASE_URL`.

## Architecture notes worth reading multiple files for

- **Generation pipeline (Flow)**. HTTP request → `apps/backend/routes/*` → `services/generation/*` (Node) → Python bridge (`services/generation/orchestrator.py`) via a worker pool sized by `config/orchestrator.json`. Inputs are normalized (slug, trait_ids, seed, biome_id); when trait validation fails, a hardcoded fallback set (`artigli_sette_vie`, `coda_frusta_cinetica`, `scheletro_idro_regolante`) is applied and logged as structured JSON (`component = generation-orchestrator`). Responses always combine `blueprint` + `validation` + `meta` — don't change that shape without also updating `packages/contracts` and the dashboard renderers.
- **Combat pipeline (Rules Engine)**. Il rules engine d20 in `services/rules/` risolve azioni tattiche (attacco d20 vs DC, Margin of Success, damage step, parata reattiva, status fisici/mentali). `hydration.py` carica i valori meccanici da `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`; `resolver.py` esegue la risoluzione; `worker.py` espone il bridge per il backend. Lo schema payload e in `packages/contracts/schemas/combat.schema.json`. Vedi `docs/hubs/combat.md` per il canonical hub e `docs/adr/ADR-2026-04-13-rules-engine-d20.md` per le decisioni architetturali.
- **Contracts are the seam**. `packages/contracts` holds AJV schemas + TS types loaded by the backend (schema registry validates both live and mock responses), by `scripts/mock/generate-demo-data.js`, and by the dashboard registry in `apps/dashboard/src/config/dataSources.ts`. A schema change ripples to backend tests, mock snapshots, and dashboard consumers — budget for all three.
- **Mock parity**. `/api/mock/*` endpoints serve the JSON that `npm run mock:generate` writes to `apps/dashboard/public/data/flow/snapshots/` and `.../nebula/`. The dashboard's fallback path reads the same files — mocks are not just test fixtures, they back the "offline" UX.
- **Dashboard deploy path**. `VITE_BASE_PATH` (default `./`) controls asset paths; `VITE_API_BASE_URL`/`VITE_API_BASE` + individual `VITE_*_URL` select live vs. mock; `VITE_API_USER` propagates as `X-User` header for audit. Empty values fall back to the next source in the registry automatically.
- **Auth**. Backend routes honor JWT (`AUTH_SECRET`, `AUTH_AUDIENCE`, `AUTH_ISSUER`, `AUTH_ROLES_CLAIM`, etc.) when configured, otherwise open. Legacy Bearer tokens `TRAIT_EDITOR_TOKEN`/`TRAITS_API_TOKEN` protect trait routes; accepted roles are `reviewer`/`editor`/`admin` (admin always allowed).
- **Trait Editor** is a separate Vite app under `Trait Editor/` — see `docs/trait-editor.md` before touching it.

## Agent / automation conventions in this repo

The repo ships a dedicated agent orchestration system (Codex-oriented) that's distinct from Claude Code. You don't need to "boot" it yourself, but be aware:

- `AGENTS.md` + `.ai/BOOT_PROFILE.md` define a STRICT MODE workflow, automatic agent routing (`router.md`, `agents/agents_index.json`), and a macro-command library (`docs/COMMAND_LIBRARY.md`, `docs/pipelines/GOLDEN_PATH.md`, `docs/PIPELINE_TEMPLATES.md`). Users may send prompts like `COMANDO: GOLDEN_PATH_FEATURE ...` or `AGENTE: trait-curator` — those map to the flows defined in those docs, not to Claude Code slash commands.
- **Don't invent new `COMANDO:` semantics** or create slugs/files that don't match the existing schemas. When an instruction conflicts with `agent_constitution.md`/`agent.md`, surface the conflict instead of picking a side.
- The per-agent profiles under `.ai/<agente>/` describe scope for Codex agents (trait-curator, species-curator, balancer, etc.). Useful as reference for where domain expertise lives, even when you're the one doing the edit.

## Contribution gates (from CONTRIBUTING.md)

- PRs must reference a passing release validator report; regressions block merge.
- **Master DD approval** must be documented (link a comment/issue) before merging.
- Include a changelog entry and a **03A rollback plan** in the PR notes.
- Run `npm run format:check` + `npm run test` locally; for frontend changes, also `npm run build` + `npm run preview` (or `npm run webapp:deploy`).
- Do not commit binary archives under `reports/backups/**` — upload externally and update the `manifest.txt` (Archive/SHA256/Location/On-call/Last verified) per `docs/planning/REF_BACKUP_AND_ROLLBACK.md`, then log in `logs/agent_activity.md`. `npm run lint:backups` enforces this.
- Husky runs a Prettier pre-commit on staged files; re-run `npm run prepare` after a fresh checkout.

## Platform notes

Primary working directory is on Windows, but the shell is bash (Git Bash/MSYS) — use Unix paths and `/dev/null`, not `NUL`. Line endings are managed by `.gitattributes`/Prettier; don't fight them.
