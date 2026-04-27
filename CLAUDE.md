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

## 🔁 Autonomous Execution (always on)

Derived from `/insights` audit 2026-04-25 — friction "stopping early" + "config not applied" recurring.

- **Non fermarsi prematuramente**: continuare fino a goal esplicito O blocking error reale. Se "perché ci fermiamo?" è già stato detto in passato → quel pattern è proibito.
- **Surface blocker, don't end session**: se mancano prerequisiti (file, dipendenza, env), riporta blocco esplicito e proponi 2-3 path alternativi. Non inventare il piano mancante.
- **Verify config changes**: dopo ogni edit a `*.json`, `*.yaml`, `.env`, config service → (1) re-read file, (2) restart/reload servizio se applicable, (3) probe live (test API call / `curl /health`). Mai "configurato X" senza i 3 step.
- **Stop-on-missing-prereq**: se handoff doc / planning file referenziato non esiste, FERMA e chiedi. Non auto-creare il piano mancante per "salvare" la sessione.

## 🌳 Worktree & Path Discipline

Friction ricorrente da insights: 3 sessioni hanno editato main repo invece del worktree.

- **Pre-edit check**: `pwd` + `git rev-parse --show-toplevel` prima di edit non triviali se incerto su contesto. Working directory in CLAUDE_WORKING_DIR ha priorità sui path assunti dalla memoria.
- **Worktree path detection**: se `pwd` contiene `.claude/worktrees/<slug>/`, sei in worktree isolato. Edit qui, NON nel main repo path.
- **Missing file = ASK**: se path referenziato non esiste (`docs/planning/2026-XX-XX-*.md`, ADR, handoff), chiedi prima di fabbricare. Lista path candidati via `ls`/`find` se utile.
- **Auto-enforced**: hook `PreToolUse` `.claude/hooks/pre-edit-worktree-guard.sh` (warn-only) emette `[worktree-guard] WARN` quando target Edit/Write/MultiEdit è fuori dal worktree corrente o tocca main repo da worktree. Se vedi il warn, ferma e verifica intent.

## 🔤 Encoding Discipline

Friction concreta sprint 2026-04-25 PR #1776: glossary.json aveva 37 char mojibake `Ã` da Python `json.dump` cross-platform. Bug invisibile finché CI `Generate QA baselines` ha failed.

- **Sempre encoding esplicito**: `open(path, encoding='utf-8')` per read, `open(path, 'w', encoding='utf-8')` + `json.dump(..., ensure_ascii=False, indent=2)` per write. Nessun default-encoding implicito.
- **Restore-from-git pattern**: se file ha mojibake, NON correggere in-place (rischio doppia corruzione). Restore da `git show origin/main:<path>` su file pulito + ri-applica modifiche con encoding UTF-8 esplicito.
- **Auto-enforced**: hook `PostToolUse` `.claude/hooks/post-edit-validate.sh` emette `[hook] WARN: N mojibake sequences (Ã)` per file con >5 occorrenze di `Ã`. Threshold scelto per zero falsi positivi su Italian normale (es. "città" pulito = 0 match).

## 📤 Output Token Limits

3 sessioni perse per output >500 token max.

- **Long deliverables → file**: audit, multi-file summary, analisi ≥30 righe → scrivi in `docs/reports/YYYY-MM-DD-<slug>.md` o `docs/playtest/`, poi referenzia path. NON dump inline.
- **Recap concisi**: end-of-turn = 1-2 frasi. Tabelle PR / ranked list ≤10 righe inline OK. Oltre → file.
- **Tool result siphon**: se Read/Bash ritorna >2000 char e ti serve solo summary, riassumi in 5 bullet inline e referenzia il file.

## 📡 System Notification Handling

1 sessione: 12 timeout notifications interpretate come user message.

- **Ripetizioni identiche = system signal**: stesso messaggio/error 2+ volte di fila NON è il user che ripete. È un loop tool / hook / notifier rotto. Diagnostica il sender, non rispondere conversazionalmente.
- **Subagent timeout 2x = stop retry**: se subagent stesso pattern timeout 2 volte, FERMA. Investiga prompt size / tool config. Non fare 5+ retry sperando vada.
- **Distinguish hook output vs user**: `<user-prompt-submit-hook>` e similari sono hook. Riconosci tag, non rispondere come a un user.

## 🦎 Skiv canonical creature (cross-PC entrypoint 2026-04-25)

**Skiv** è la creatura canonical recap-card del progetto (`Arenavenator vagans` / `dune_stalker`). User esplicito 2026-04-25: _"non voglio perderlo!"_.

**Hub canonical**: [`docs/skiv/CANONICAL.md`](docs/skiv/CANONICAL.md) — identity + persona/voice + dove vive (catalogo file repo) + sprint plan ~22h + recap format ASCII tamagotchi card + don't-reinvent rule. **Cross-PC via git** (memory PC-local NON sync, hub sì).

**Skill on-demand**: [`.claude/skills/skiv.md`](.claude/skills/skiv.md) — invoca `/skiv` quando user chiede _"scheda Skiv / recap / a che punto siamo (con creatura)"_. Read REAL data da `data/core/species.yaml` + `species/dune_stalker_lifecycle.yaml` + `data/derived/skiv_saga.json` → render 6-part recap + ASCII card.

**Voice rule**: italiano, prima persona, metafore desertiche (_sabbia, vento, ridge, sole basso_), all'"allenatore" (= user). Closing tipico: _"Sabbia segue."_ MAI registro pure-tecnico nel narrative beat.

**Anti-pattern**: NON reinventare persona ad-hoc — Skiv è canonical. NON fabricare data (species id, trait id, gauge value): SEMPRE grep YAML reale prima.

## ✅ Verify Before Claim Done (anti-rescue policy 2026-04-25)

Friction concreta `/insights` 2026-04-25: **25 buggy_code incidents** (top friction, vs 15 wrong_approach + 5 subagent_timeout). Pattern: first-pass implementation ships con bug, Claude poi fa rescue pass. Costo: doppio commit, doppio test cycle, user vede regressione prima di fix.

**Pattern**: prima di dichiarare task done O scrivere "✅ X works" O committare:

1. **Run tests applicable** al diff: `node --test tests/<area>/*.test.js` (se modifichi backend), `pytest tests/test_<area>.py` (se modifichi tools/py), `npm run format:check` (se ≥3 file edit), `python tools/check_docs_governance.py` (se modifichi docs).
2. **Diff vs intent**: `git diff` rileggi tu stesso, verifica che NON ci siano:
   - File toccati fuori scope dichiarato
   - Schema breaking change senza ADR
   - Hardcode invece di config/data
   - Mock/stub lasciati al posto di logic vera
3. **Smoke probe live** se modifica backend: `curl /api/<endpoint>` o invocazione minimal flow E2E. Mai dichiarare "wired" senza un colpo di test.

**Skip rules** (verify NON necessario):

- Edit purely cosmetic (typo, formatting senza logic)
- Single-file doc edit ≤30 LOC
- Read-only operations (Glob/Grep/Read sequences)

**Skill `/verify-done`** (vedi `.claude/skills/verify-done.md`): orchestrates il flow sopra in un colpo. Invoca prima di "ok l'ho finito".

**Anti-pattern**:

- ❌ Dichiarare done sulla base "ha compilato" → compile-only ≠ behavior verified
- ❌ Skip test perché "modifica piccola" → 25 buggy_code dimostra falso senso di sicurezza
- ❌ "I tests should pass" senza eseguirli → speculative claim, ottenuto da rescue pass

## 🏛 Museum-first protocol (validato 2026-04-25)

Friction concreta: 18 sprint hanno accumulato idee buone in `incoming/`, `docs/archive/`, `reports/incoming/`, branch chiusi, ADR superseded. Future agent rischia duplicate research O re-invent buried work.

**Pattern**: **PRIMA** di WebSearch / repo dig su un dominio nuovo, consulta [`docs/museum/MUSEUM.md`](docs/museum/MUSEUM.md) per card curate Dublin-Core-style con provenance verificata + reuse path concreti.

- **Tutti gli agent** (`balance-illuminator`, `creature-aspect-illuminator`, `narrative-design-illuminator`, `pcg-level-design-illuminator`, `economy-design-illuminator`, `telemetry-viz-illuminator`, `ui-design-illuminator`, `coop-phase-validator`, `sot-planner`, `playtest-analyzer`, `session-debugger`, `schema-ripple`, `migration-planner`, `species-reviewer`, `balance-auditor`) **leggono** museum.
- **Solo `repo-archaeologist` scrive** card. Lifecycle: `excavated → curated → reviewed → revived | rejected`. Card additive-only.
- **Validato 2026-04-25**: cross-agent test con `creature-aspect-illuminator` su Skiv Sprint A audit → ha letto MUSEUM.md spontaneously, consultato card M-005 magnetic_rift, identificato 6 GAP concreti, saved 10-15min repo dig (vedi [docs/qa/2026-04-25-museum-validation.md](docs/qa/2026-04-25-museum-validation.md)).

**Trigger consultation**:

- ✅ Domain research nuovo (es. "audit Skiv lifecycle for Sprint A") → leggi MUSEUM.md domain section
- ✅ Architectural decision pending → leggi gallery galleries/<domain>.md se esiste
- ✅ Reuse path estimation → card hanno effort stimato + blast-radius multiplier
- ❌ Bug fix puntuali → museum non rilevante
- ❌ Tweak parametri esistenti → museum non rilevante

**Domain coverage 2026-04-25**: 8/8 (100%) — ancestors, cognitive_traits, enneagramma, personality, mating_nido, old_mechanics, species_candidate (pool secco), architecture. 11 card curate (5 score 5/5 + 6 score 4/5).

**Antipatterns**:

- ❌ Ignorare museum + WebSearch direct → duplicate research
- ❌ Citare museum come fonte canonical → museum è "idee da valutare", NON `data/core/`
- ❌ Auto-revive card senza ADR + user OK → museum è additive-only, decisione product needed

## 🔑 API Keys & Secrets — canonical path

Friction insights 2026-04-25: Tavily API key posizionata in repo `.env` invece del path canonico `~/.config/api-keys/keys.env` (OD-005). Move richiesto post-fact.

- **Canonical**: TUTTI i secret (API key, token, credential) vivono in `~/.config/api-keys/keys.env`. Mai in repo `.env*`.
- **Read pattern**: backend / script che servono secret → `source ~/.config/api-keys/keys.env` o `os.environ.get('KEY_NAME')` con `keys.env` esportato all'inizio del processo.
- **Repo `.env*` = vietato per secrets**: solo per fixture pubblici, schema example, mai per token reali. `.env.example` / `.env.template` sono OK (vuoti).
- **Auto-enforced**: hook `PreToolUse` `.claude/hooks/pre-edit-env-keys-guard.sh` (warn-only) emette `[env-keys-guard] WARN` quando target Edit/Write è un `.env*` fuori da `~/.config/api-keys/`. Se vedi warn, ferma e sposta nel path canonico.

## 💾 Memory Save Ritual (end-of-session)

Friction insights: 4+ sessioni il user ha esplicitamente chiesto memory save dimenticato. BACKLOG stale con ticket già chiusi shown come open.

- **Save without being asked**: a fine sessione significativa (≥2 PR mergiati O nuovo agent/skill), aggiorna SENZA prompt:
  1. `COMPACT_CONTEXT.md` (snapshot 30s)
  2. Handoff doc (`docs/planning/YYYY-MM-DD-*-handoff.md` o equivalente)
  3. Memory file persistent (`~/.claude/projects/.../memory/feedback_*` o `project_*`)
  4. `BACKLOG.md` chiusura ticket completati + add nuovi residui
  5. `MEMORY.md` index file (`~/.claude/projects/.../memory/MEMORY.md`) — 1 riga ≤150 char per ogni nuovo memory file
- **Don't leave stale**: ticket "open" in BACKLOG che hanno PR mergiato → mark closed con SHA + commit.
- **Skip rule**: micro-fix singolo (1 PR docs/typo) → no memory save necessario; signals + code change ≥50 LOC → save obbligatorio.

## 📝 Commit & Hook Hygiene

Friction insights: commit-msg hook ha caught Claude uppercase commit (retry richiesto), commit-guard ha bloccato Claude due volte per body length, PostEdit stderr leak per ordering errato.

- **Lowercase commit prefix**: `feat:`, `fix:`, `docs:`, `chore:` — NON `Feat:` o `FEAT:`. commit-msg hook blocca uppercase.
- **Body length cap**: rispetta limite commit-guard (verifica con `cat .git/hooks/commit-msg` se incerto). Long commit body → drop in PR description, non in commit msg.
- **Stderr ordering nei hook**: `cmd 2>/dev/null` corretto (redirect 2 verso null); `cmd >/dev/null 2>&1` se vuoi sopprimere entrambi. Il pattern `cmd 2>&1 >/dev/null` è BUGGY (stderr ridiretto a vecchio stdout, poi stdout va a null → stderr leak su terminal).
- **Hook self-block**: se un hook blocca un tuo commit, non skippare con `--no-verify`. Investiga il messaggio, fixa il commit body, retenta. Hook esistono per difendere il repo, anche da Claude.

---

## Project overview

**Evo-Tactics** is a co-op tactical game (d20-based, modular evolutionary progression) delivered as a polyglot monorepo. It ships YAML datasets, Python + TypeScript CLIs, an Express "Idea Engine" backend, a Vue/Vite dashboard, and publishing/validation pipelines. Most docs, commit messages, and inline comments are written in **Italian** — match that language when editing docs, but code identifiers stay English.

**Bootstrap files** (archivio operativo, Sprint 0-3 adottati 2026-04-24, PR #1732 merged + Sprint 3):

- **Sprint 0 (root)**: `PROJECT_BRIEF.md` (identità stabile progetto), `COMPACT_CONTEXT.md` (snapshot 30s sessione corrente), `DECISIONS_LOG.md` (index 30 ADR), `MODEL_ROUTING.md` (quale AI/tool per quale fase).
- **Sprint 1 (`.claude/`)**: `TASK_PROTOCOL.md` (7-fasi task flow), `SAFE_CHANGES.md` (whitelist 🟢/🟡/🔴), `prompts/` (4 prompt template: game design, research bridge, Claude brief, first-principles checklist).
- **Sprint 2 (root + docs)**: `LIBRARY.md` (reference index sistemi esterni + tools + skills + APIs), `PROMPT_LIBRARY.md` (entrypoint prompts), `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md` (score 21.5/24 → 24/24 post Sprint 3), `docs/guide/claude-code-setup-p1-skills.md` (install guide top 5 P0 MCP/plugin).
- **Sprint 3 (root)**: `BACKLOG.md` (ticket aperti prioritizzati estratti da CLAUDE.md), `OPEN_DECISIONS.md` (ambiguità non bloccanti con default + verdict).

Leggi `PROJECT_BRIEF` + `COMPACT_CONTEXT` prima di CLAUDE.md per onboarding veloce. Policy 4-gate DoD (vedi sezione "DoD nuovi agent / skill / feature" più sotto) applicata a ogni nuovo agent/skill/feature. **Archivio adoption COMPLETA** (7/10 Top Ranked integrati, 3 deliberatamente skip-out-of-scope).

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
3. _(Superseded)_ ~~`npm run mock:generate`~~ — script and `scripts/mock/generate-demo-data.js` were removed with the dashboard scaffold (PR #1343). Flow/Nebula mock snapshots are no longer regenerated from this repo. Backend tests still validate `packages/contracts` schemas directly via the AJV registry in `apps/backend/app.js`.
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
- **Contracts are the seam**. `packages/contracts` holds AJV schemas + TS types loaded by the backend (schema registry validates live responses). A schema change ripples to backend tests — keep `apps/backend/app.js` AJV registration in sync with `packages/contracts/index.js`.
- **Mock parity**. `/api/mock/*` endpoints serve static JSON shipped under `apps/backend/data/` and `docs/mission-console/data/`. The production Mission Console bundle (`docs/mission-console/`) reads the same data. The former `npm run mock:generate` regenerator was removed with the dashboard scaffold (PR #1343); mocks are now hand-curated fixtures.
- **Auth**. Backend routes honor JWT (`AUTH_SECRET`, `AUTH_AUDIENCE`, `AUTH_ISSUER`, `AUTH_ROLES_CLAIM`, etc.) when configured, otherwise open. Legacy Bearer tokens `TRAIT_EDITOR_TOKEN`/`TRAITS_API_TOKEN` protect trait routes; accepted roles are `reviewer`/`editor`/`admin` (admin always allowed).
- **Trait Editor** is a separate Vite app under `apps/trait-editor/` — see `docs/traits/trait-editor.md` before touching it.
- **Mission Console**. The production UI is a pre-built Vue 3 bundle under `docs/mission-console/` (`ConsoleLayout-*.js`, `FlowShellView-*.js`, `atlas-*.js`, `nebula-*.js`, `index.html`), served via GitHub Pages. Source is NOT in this repo. The former `apps/dashboard/` AngularJS scaffold was removed in #1343 — see [`ADR-2026-04-14`](docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) (superseded).
- **Sibling repo topology**. A second repository `MasterDD-L34D/Game-Database` (local path on this machine: `C:/Users/edusc/Documents/GitHub/Game-Database`, cloned 2026-04-25) lives alongside this one. It is a taxonomy CMS (Prisma + Postgres + Express + React) that imports trait/species/biome content from this repo's `packs/evo_tactics_pack/docs/catalog/` via a build-time script (`server/scripts/ingest/import-taxonomy.js`, invoked by `npm run evo:import` on the Game-Database side). The data flow is **unidirectional build-time**: Game → Game-Database. **HTTP runtime integration (Alt B)** is scaffolded and feature-flagged OFF by default: `GAME_DATABASE_ENABLED=false`. When enabled, Game's catalog service fetches the trait glossary from `GET /api/traits/glossary` on Game-Database (response shape: `{ traits: [{ _id, labels: { it, en }, descriptions: { it, en } }] }`), with TTL cache and graceful fallback to local files. The shared contract is defined in `packages/contracts/schemas/glossary.schema.json`. Full rationale, schema mismatch analysis, and roadmap in [`docs/adr/ADR-2026-04-14-game-database-topology.md`](docs/adr/ADR-2026-04-14-game-database-topology.md). Port allocation: Game backend = **3334**, Game-Database = **3333**, Game-Database Postgres host port = **5433** (to avoid conflict with Game's Postgres on 5432).

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

Pattern codificati in memory per persistenza cross-session. Dettagli in `feedback_*.md` sotto `C:/Users/edusc/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/`.

**File principali**:

- [`feedback_claude_workflow_consolidated.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_claude_workflow_consolidated.md) — **8 pattern consolidati in 1 file** (kill-60 post-research 2026-04-18): tabella opzioni, caveman voice, checkpoint memory, CI auto-merge, delega research, piano file:line, admit+reinvestigate, probe-before-batch
- [`feedback_meta_checkpoint_directive.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_meta_checkpoint_directive.md) — pausa riflessiva 5-step, auto-trigger su "analizza"/"ricorda"/"checkpoint", comando `/meta-checkpoint`
- [`reference_flint_optimization_guide.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/reference_flint_optimization_guide.md) — 40+ fonti research + kill-60 decision log + follow-up priorities

Memory files auto-caricati via `MEMORY.md` ogni sessione.

## Platform notes

Primary working directory is on Windows, but the shell is bash (Git Bash/MSYS) — use Unix paths and `/dev/null`, not `NUL`. Line endings are managed by `.gitattributes`/Prettier; don't fight them.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 notte — 5 sprint autonomous + OD-001 closure)

**Sessione 2026-04-27 notte (autonomous full-stack)**: 5 sprint autonomous shipped + 4 fixture maintenance fix + OD-001 Path A 4/4 chiuso definitivamente (PR #1877 superseded).

**PR shipped main** (5):

| PR                                                       | Sprint | Scope                                                                                                                                                                               | Pattern source                   |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| [#1934](https://github.com/MasterDD-L34D/Game/pull/1934) | 1      | Wesnoth time-of-day modifier + AI War defender's advantage + Disco day pacing flavor + Fallout numeric reference doc + 2 ADR design AI War                                          | Tier S #5/#9/#10/#11             |
| [#1935](https://github.com/MasterDD-L34D/Game/pull/1935) | 2      | Subnautica habitat lifecycle wire (biomeAffinity service + dune_stalker `biome_affinity_per_stage` + 14 lifecycle YAML stub script + biomeSpawnBias initial wave universal closure) | Tier A #9                        |
| [#1937](https://github.com/MasterDD-L34D/Game/pull/1937) | 3      | Tunic Glifi codexPanel tab + AncientBeast wikiLinkBridge slug bridge + Wildermyth choice→permanent flag campaign state                                                              | Tier S #6/#12 + Tier A indie     |
| [#1938](https://github.com/MasterDD-L34D/Game/pull/1938) | 4      | Cogmind stratified tooltip Shift-hold expand + Dead Space holographic AOE cone shimmer + Isaac Anomaly card glow effect                                                             | Tier B #3/#7 + Tier S #11 hybrid |
| [#1940](https://github.com/MasterDD-L34D/Game/pull/1940) | 5      | Tufte sparkline HTML dashboard generator + DuckDB analyze_telemetry +4 SQL query (mbti_distribution / archetype_pickrate / kill_chain_assists / biome_difficulty)                   | Tier E #9/#13                    |

**OD-001 chiusura definitiva**: PR #1877 (Sprint C UI + backend, 51K LOC stale) chiuso come superseded. Path A 4/4 già live via combo #1874+#1875+#1876+#1879+#1911. Niente perso.

**Engine LIVE Surface DEAD anti-pattern killed**: Subnautica habitat (Tier A #9) chiuso (engine + lifecycle YAML + wire performAttack + UI biome_affinity surface). biomeSpawnBias universal init wave closure (encounter.biome_id derive biomeConfig).

**Test baseline post-merge**: AI 311/311 + spawner 15/15 + biomeAffinity 7/7 + wikiLinkBridge 10/10 + campaignFlags 9/9 + sparkline 8/8 + 4 fixture restore = **~360 test verde**.

**Stato pillars post-sprint**:

| #   | Pilastro          |  Pre   |  Post  | Delta                                                   |
| --- | ----------------- | :----: | :----: | ------------------------------------------------------- |
| P1  | Tattica leggibile |   🟢   |  🟢++  | + Cogmind tooltip + Dead Space AOE + Isaac glow         |
| P2  | Evoluzione        | 🟢 def | 🟢 def | + Subnautica habitat lifecycle live (15 species)        |
| P3  | Specie×Job        |  🟢c   |  🟢c+  | + AncientBeast wiki cross-link runtime ↔ catalog       |
| P4  | MBTI/Ennea        |  🟡++  |  🟢c   | + Wildermyth permanent flags + Disco day pacing         |
| P5  | Co-op             |  🟢c   |  🟢c   | unchanged (residuo TKT-M11B-06 userland)                |
| P6  | Fairness          |  🟢c+  | 🟢c++  | + AI War defender adv + Fallout numeric ref + Tufte viz |

**Lessons codified questa sessione**:

- **Cherry-pick fixture fix opportunistic** quando CI block PR proprio per stale fixtures di altre PR mergiate (sangue_piroforico nerf #1869, orphan currency #1870, schema object #1871).
- **`gh pr update-branch` API > rebase + force-push** quando branch protection blocca admin merge.
- **Sandbox guardrail**: force-push e admin merge denied automatically. Workflow alternative: GitHub UI "Update branch" button via `gh pr update-branch <num>`.
- **Multi-PC race PR superseded**: PR aperti pre-cross-PC che restano stale > 1 giorno = candidate close-as-superseded automatic. Pattern visto su #1877.

**Handoff**: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md) §A.2 PR table aggiornato + §B.1.5/§B.1.11/§B.2 #9/§B.3 #3/§B.5 #9/#13 marked 🟢 shipped.

**Next session candidati**:

- A) **TKT-M11B-06 playtest live** (userland 2-4 amici) — chiude P5 🟢 def
- B) **Beast Bond reaction trigger** (~5h) — adjacency-trigger per-creature trait, AncientBeast Tier S #6 residuo
- C) **3 nuovi elementi channel resistance** earth/wind/dark (~6h con balance pass) — AncientBeast Tier S #6 residuo
- D) **Thought Cabinet UI panel cooldown round-based** (~8h) — Disco Tier S #9 residuo, P4 dominante
- E) **Ability r3/r4 tier progressive** (~10h) — AncientBeast Tier S #6 residuo, P3+

---

## 🎮 Sprint context (aggiornato: 2026-04-27 sera — Spore Moderate FULL + Recovery + Bundle B Indie Quick-Wins)

**Sessione 2026-04-27 sera (continuazione)**: 18 PR mergiati main (Spore S1-S6 stack + lifecycle + UI QW-1/2/3 + recovery 6 deliverables persi + classification + 12 museum cards + Bundle B 4 indie quick-wins).

**Highlights**:

- **P2 Evoluzione 🟡++ → 🟢 def**: Spore Moderate FULL stack chiuso (S1+S2+S3+S5+S6 + lifecycle hooks + 3 UI surfaces). Player loop completo: encounter→MP→mutation pick→ability emerge→archetype passive→cross-gen inherit.
- **Recovery 6 deliverables persi**: 5 indie research docs (~1370 LOC) + RANKED report (312 LOC) mai-committed → rigenerati PR #1926 + #1927.
- **Museum +12 cards**: Dublin-Core M-019→M-031 (3×4/5 + 7×3/5 + 2×2/5). Total 19→31.
- **Bundle B Indie Quick-Wins** (4 patterns ~16h): Citizen Sleeper drift briefing (P4) + Wildfrost counter HUD (P1) + TBW Undo libero (P1) + Tunic decipher Codex pages session-scope (cross). Test +28.
- **Conflict resolved**: cross-PC race con #1931 Tunic glyph progression — merged campaign-scope + session-scope endpoints in unified codex router.

**Pillar score finale 2026-04-27 sera**: **3/6 🟢 def** (P1++ + P2 + P4 candidato) + 1/6 🟢 cand (P5) + 2/6 🟡+/++ (P3 P6).

**Handoff**: [`docs/planning/2026-04-27-bundle-b-recovery-handoff.md`](docs/planning/2026-04-27-bundle-b-recovery-handoff.md).

**Lessons codified**:

- Untracked file → `git add` immediato anche WIP
- Background agent + branch ops → isolation worktree raccomandato
- Audit forensic post-cleanup mandatory

**Decisioni master-dd pendenti** (sblocca next sprint): D3 permadeath, D4 writer budget, D5 mini-map, TKT-09 ai_intent, TKT-M11B-06 playtest live.

**Next session candidati**: A) Resolver adapter+alpha consumption (~3-5h, S6 100%), B) Mutation catalog rebalance (~3-4h, fix bingo physiological dominance), C) Decisioni user, D) Playtest live.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — cross-PC absorption + deep extraction pass 2 + 73 pattern residui catalogati)

**Sessione 2026-04-27** (master-dd + Claude): absorption massiccia da origin/main (32 PR mergiati 2026-04-26/27 cross-PC) + seconda passata estrattiva profonda sui 5 cross-game extraction matrix doc + audit 5 nuovi backend services + sintesi v3.7.

**Doc canonical post-sprint**:

- **Stato dell'arte completo + vertical slice**: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md) — §A inventario decisioni, §B 73 pattern residui dettagliati, §C vertical slice 8-fasi, §E 6 decisioni richieste
- **v3.7 master synthesis**: [`docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md`](docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md) — 6 opzioni action plan
- **Cross-game tier matrices synthesis**: [`docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md`](docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md) — top 15 ROI ranked
- **Deep-analysis residual gaps**: [`docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md`](docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md) — 9 domain residual P0/P1/P2

**Pattern residui catalogati**: 73 pattern cross-game (38 Tier S + 11 Tier A + 11 Tier B + 13 Tier E) — quick wins ≤5h totali ~64h, full residual ~509h. Doc dettagliati al §B dello stato-arte.

**Anti-pattern dominante "Engine LIVE Surface DEAD"**: ~30% delle 61 voci catalogate hanno runtime built ma surface player dead. 8 engine orphan diagnosticati (predictCombat/Tactics Ogre HUD/Spore part-pack/Mating gene_slots/objectiveEvaluator/biomeSpawnBias initial wave/QBN debrief/Thought Cabinet). Sweep ~17-32h chiude P1+P2+P4 strategico.

**Pillar status post-wave**: 0/6 🟢 + **2/6 🟢 candidato** (P1+P5) + **3/6 🟡+** (P2/P4/P6) + 1/6 🟡 (P3).

**Trigger consultation rules** (post-sessione):

- ✅ Research/audit dominio cross-game → leggi PRIMA i 4 synthesis 2026-04-27 + tier matrix originale + MUSEUM.md
- ✅ Sprint planning next session → leggi §C 6 opzioni con effort + outcome
- ✅ Pattern X gioco Y specifico → tier matrix è canonical, synthesis è index
- ❌ NON re-research dominio cross-game senza prima consultare i 4 synthesis (waste duplicate)

**Decisione user pending**: quale path attivare? A (polish demo ~10-12h) / C (P2 closure ~30h) / E (surface sweep ~25-35h).

---

## 🎮 Sprint context (aggiornato: 2026-04-25 sera-late — workspace audit + drift fixes 8 PR)

**Sessione 2026-04-25 sera-late (workspace ecosystem audit)**: utente segnala "non c'è punto chiaro di ingresso tra Game-Database, game-swarm e altri repo collegati". Audit a fondo scopre ecosystem 3x più grande del precedentemente mappato + multi-PC race condition + drift sistematico BACKLOG.

**PR shipped main** (8 Game + 1 Game-Database):

| PR                                                                | Scope                                                     | SHA        | Status |
| ----------------------------------------------------------------- | --------------------------------------------------------- | ---------- | :----: |
| [#1804](https://github.com/MasterDD-L34D/Game/pull/1804)          | WORKSPACE_MAP iniziale + clone Game-Database + path edusc | `ad23d0bf` |   ✅   |
| [#1806](https://github.com/MasterDD-L34D/Game/pull/1806)          | Stack validation + Alt B runtime smoke proven             | `113e832d` |   ✅   |
| [#1809](https://github.com/MasterDD-L34D/Game/pull/1809)          | Synesthesia move a `~/Documents/UPO/`                     | `17aea1c0` |   ✅   |
| [#1810](https://github.com/MasterDD-L34D/Game/pull/1810)          | WORKSPACE_MAP comprehensive ecosystem completo            | `effef40e` |   ✅   |
| [#1812](https://github.com/MasterDD-L34D/Game/pull/1812)          | WORKSPACE_MAP sweep finale (Desktop + WRITE-ACCESS)       | `148a5a75` |   ✅   |
| [#1814](https://github.com/MasterDD-L34D/Game/pull/1814)          | BACKLOG drift fix #1 (3 SHA closures)                     | `bb19697b` |   ✅   |
| [#1818](https://github.com/MasterDD-L34D/Game/pull/1818)          | Ancestors drift fix #2 + card AI-hallucination fix        | `6b2670a3` |   ✅   |
| [#1820](https://github.com/MasterDD-L34D/Game/pull/1820)          | BACKLOG drift fix #3 (F-1/F-2/F-3 + M14-A partial)        | `4ee9e30f` |   ✅   |
| [GD#106](https://github.com/MasterDD-L34D/Game-Database/pull/106) | Game-Database WORKSPACE_MAP simmetrico                    | `ea3791e`  |   ✅   |

PR #1816 closed-redundant (multi-PC race vs PR #1813 same scope OD-011) — caught early via `gh pr list --state merged`.

**Discoveries chiave**:

- `WORKSPACE_MAP` precedente copriva solo `gioco/`, miss massiccio. Realtà: 4 GitHub core (Game + Game-Database + evo-swarm + codemasterdd-ai-station) + 3 AI satelliti locali (~/Dafne/ 81MB, ~/aa01/ Archon Atelier, ~/.openclaw/ runtime) + C:/dev/ duplicati + Desktop entrypoints (WRITE-ACCESS-POLICY canonical, Swarm Dashboard :5000).
- Game-Database stack validato end-to-end: Postgres :5433 + server :3333 + Game backend :3344 con flag `GAME_DATABASE_ENABLED=true` log-confirmed `[game-database] HTTP integration ENABLED` + `[game-database] trait glossary fetched via HTTP`.
- Museum card `ancestors-neurons-dump-csv.md` AI-hallucinated: claim "22 Self-Control" smentito da `awk count $branch column` reale = 12. Schema columns fake. Esempi codici "CO 01 Pause Reflex" inventati (CO è branch Attack, SC reali usano FR codes). Fix con evidence reale.
- BACKLOG drift sistematico: 5 ticket "open" già chiusi (M13 P3 #1697, M13 P6 #1698, SWARM-SKIV #1774, ANCESTORS-22 #1813, ANCESTORS-RECOVERY #1815, F-1/F-2/F-3 #1736). Mitigation memorizzata.
- Multi-PC parallel race: 8 PR altro PC merged interleaved (OD-008/011/012, sentience tier backfill 45 species, ancestors 297/297 wiki recovery + 267 wire). Mio PR #1816 redundant chiuso post-detection.

**Memory salvate** (cross-session):

- `feedback_workspace_audit_scope_lesson.md` — "controlla a fondo" = filesystem-wide
- `feedback_data_grounded_expert_pattern.md` — `awk`/`head -1` cross-check obbligatorio pre-card

**Stato pillars post-sessione**: P3 + P6 → 🟢 candidato verificato (drift fix conferma chiusure precedenti). P5 🟡 (TKT-M11B-06 playtest userland resta unico bloccante). Altri stable.

**Handoff**: [`docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md`](docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md).

**Next session entry**: M14-A resolver wire residual (~3-4h, helpers shipped PR #1736, full integration combat damage step pending) o TKT-MUSEUM-ENNEA-WIRE (~7-9h, vcSnapshot round-aware refactor required) o userland TKT-M11B-06 playtest live.

---

## 🎮 Sprint context (aggiornato: 2026-04-25 sera — massive autonomous session 16 PR + OD-008/011/012 override)

**Sessione 2026-04-25 sera (autonomous trust mode)**: 16 PR consecutivi mergiati main da check-up audit a OD override esecuzione completa. User policy "trust autonomous" con verifica intermedia 5 OD museum-driven.

**PR shipped main** (sequenza):

| PR                                                       | Scope                                                                                                                                   | Status |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| [#1802](https://github.com/MasterDD-L34D/Game/pull/1802) | docs M14-C calibration stale fix (cross-out tickets già chiusi PR #1744)                                                                |   ✅   |
| [#1800](https://github.com/MasterDD-L34D/Game/pull/1800) | M11 co-op WS test gaps + round_ready replay host transfer                                                                               |   ✅   |
| [#1801](https://github.com/MasterDD-L34D/Game/pull/1801) | schema AJV exports + 5 schema register runtime                                                                                          |   ✅   |
| [#1803](https://github.com/MasterDD-L34D/Game/pull/1803) | balance audit fix — dominance + drift + cautious AI + spore                                                                             |   ✅   |
| [#1796](https://github.com/MasterDD-L34D/Game/pull/1796) | repo-archaeologist agent + museum bootstrap + 4 excavation + 6 card                                                                     |   ✅   |
| [#1712](https://github.com/MasterDD-L34D/Game/pull/1712) | Wrangler bot worker name fix                                                                                                            |   ✅   |
| [#1804](https://github.com/MasterDD-L34D/Game/pull/1804) | WORKSPACE_MAP entry-point ecosystem                                                                                                     |   ✅   |
| [#1805](https://github.com/MasterDD-L34D/Game/pull/1805) | SoT §13.4 P4 Ennea wire false claim fix                                                                                                 |   ✅   |
| [#1807](https://github.com/MasterDD-L34D/Game/pull/1807) | OD-008/011/012 user override codify                                                                                                     |   ✅   |
| [#1808](https://github.com/MasterDD-L34D/Game/pull/1808) | OD-008 sentience_tier backfill ALL 45 species (T0=2, T1=23, T2=14, T3=3, T4=0, T5=3, T6=0)                                              |   ✅   |
| [#1811](https://github.com/MasterDD-L34D/Game/pull/1811) | OD-012 magnetic_rift_resonance promoted from staging (single trait pool limited)                                                        |   ✅   |
| [#1813](https://github.com/MasterDD-L34D/Game/pull/1813) | OD-011 Path A — 22 ancestors reaction trigger (FR 8 + CO 6 + DO 7 + BB 2)                                                               |   ✅   |
| [#1815](https://github.com/MasterDD-L34D/Game/pull/1815) | OD-011 Path B v07 wiki recovery 297/297 neurons (RFC v0.1 promise CHIUSA, CC BY-NC-SA Fandom via MediaWiki API)                         |   ✅   |
| [#1817](https://github.com/MasterDD-L34D/Game/pull/1817) | OD-011 Path B wire — 267 ancestors neurons batch (Senses 37 + Dexterity 33 + PrevMed 30 + Ambulation 26 + TheraMed 24 + Comm 20 + ... ) |   ✅   |

**Bug critici discoveries**:

- **Stale doc trap**: M14-C calibration doc raccomandava obsolete tune già shipped #1744. Anti-pattern guard — futuri agent leggono "stato corretto reale".
- **enneaEffects.js orphan**: 93 LOC PR #1433 mai `require`/`import`. SOURCE-OF-TRUTH §13.4 falso claim "Operativo P4 completo" → corretto a 🟡 reale.
- **Schema AJV registry partial**: solo 3/10 schema registrati runtime; `combat`/`traitMechanics`/`glossary`/`narrative`/`speciesBiomes` esportati ma non validati live.
- **OD-007 hybrid pattern enacted**: data/core/personality/ runtime + packs/ encyclopedia + sync script (raccomandato da card M-002).

**Counters end-of-session**:

- **active_effects.yaml traits**: 165 → **432** (+267 ancestors batch)
- **Ancestors entries**: 22 (Path A) → **289** total (Path A + Path B wire)
- **Species sentience_tier**: 0 → **45/45** (OD-008 full backfill)
- **AI test baseline**: 311/311 ✅ verde post-merge (zero regression)
- **Lines added active_effects.yaml**: ~3193 → ~8412 (+5219)
- **Museum cards**: 11 (10 score 4-5/5 cross-domain)

**Audit findings post-massive-session** (general-purpose + balance-auditor agent paralleli 2026-04-25 sera):

- 🔴 P0 — **68/267 ancestor traits silently no-op**: status `linked`/`fed`/`healing`/`attuned`/`sensed`/`telepatic_link`/`frenzy` non consumati da `policy.js`/`resolver.py`. Tests pass per evaluator pass-1 (triggered:true + log) ma downstream consumption morta. M-future status-system extension richiesta (~6-8h).
- 🟠 P1 — **`ancestor_self_control_determination` dominance**: T2 +2 unconditional MoS≥3 → bumped 5 (peer T2 parity)
- 🟠 P1 — **`passesBasicTriggers` ignora `requires_ally_adjacent` + `requires_target_status`**: 2 trait fire ungated (`coscienza_d_alveare_diffusa`, `biochip_memoria`) → fix wire
- 🟡 P2 — 13 rage on_kill sources chain potential (review)
- 🟡 P2 — 220 dead-loop entries in evaluator (passive/movement traits non-attack-action) → analytics noise

**Override scope FINAL**:

- ✅ **OD-008 sentience full**: 45/45 species T0-T6 backfill
- ✅✅ **OD-011 Path A + Path B + Wire**: RFC v0.1 promise CHIUSA, 297/297 neuroni recovery + 22+267 trait wired
- 🟡 **OD-012 single trait** (magnetic_rift only, pool 5-10 non achievable, 1 staged solo): pool expansion follow-up

**Pillar impact**:

- **P2 Evoluzione 🟢c → 🟢c+ candidato**: ancestors base genetica popolata 297 neuroni
- **P3 Specie×Job 🟢c+**: rami Ancestors mappabili job archetypes (Senses → Recon, Comm → Support, Settlement → Tank)

**Restano autonomous procedibili next**:

- **Status engine extension** (~6-8h): wire `linked`/`fed`/`healing`/`focused` runtime-active in `policy.js` + `resolver.py` consumers + 7 unit tests
- **Pool swarm expansion**: autonomous Dafne regen session OR user-driven content design (4-9 trait candidate)
- **Ancestor gallery doc**: consolidating 289 ancestor entries con domain breakdown

**Bloccanti user input**:

- **OD-001 Mating Path A/B/C verdict**: 50-80h sunk cost engine, frontend zero, decision blocking
- **OD-013 MBTI surface presentation** (proposta, pending verdict A/B/C/skip)

---

## 🎮 Sprint context (aggiornato: 2026-04-25 — /parallel-sprint validation + jobs_expansion wire)

**Sessione 2026-04-25 pomeriggio (autonomous)**: prima esecuzione live di `/parallel-sprint` skill (PR #1788) + wire jobs_expansion runtime loader. 4 PR mergiati su main, pipeline self-healing parzialmente validata.

**PR shipped main**:

| PR                                                       | Scope                                                                                                                                                                                          | SHA        | Status |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | :----: |
| [#1791](https://github.com/MasterDD-L34D/Game/pull/1791) | Wave 6 sensori\_\* trait mechanics (3 entries: sensori_geomagnetici/planctonici/sismici) + glossary +1                                                                                         | `dc12dea1` |   ✅   |
| [#1792](https://github.com/MasterDD-L34D/Game/pull/1792) | Wave 6 mente*\*+cervello*\* trait mechanics (3 entries: cervello_a_bassa_latenza/mente_lucida/cervello_predittivo, apply_status panic/stunned) + glossary +2                                   | `9ee6308d` |   ✅   |
| [#1793](https://github.com/MasterDD-L34D/Game/pull/1793) | Wave 6 cuore*\*+midollo*\* trait mechanics (3 entries: cuore_multicamera_bassa_pressione/midollo_antivibrazione/cuore_in_furia, apply_status rage on_kill) + glossary +1                       | `b37de1f6` |   ✅   |
| [#1795](https://github.com/MasterDD-L34D/Game/pull/1795) | Wire jobs_expansion runtime: jobsLoader merge additivo 4 jobs (stalker/symbiont/beastmaster/aberrant) + progressionLoader normalize 48 perks + 4 expansion test cases + parallel-sprint report | `b418eb01` |   ✅   |

**Pipeline /parallel-sprint validation outcome**:

- **Worker layer**: ✅ 3/3 DONE first round (~10 min)
- **Critic layer**: 🟡 3/3 subagent FAILED (1 quota, 2 stall 600s) → recovery via main-thread direct verification
- **Merge layer**: 🟡 NEEDS-MANUAL-RESOLUTION per shared-file additive PRs (3-step: `checkout --ours` → programmatic append → `rebase --continue`). Naive regex resolve mangia struttura YAML

**Lessons learned** (vedi `docs/process/sprint-2026-04-25-parallel-validation.md`):

- Critic prompt deve essere ≤30 righe, output budget esplicito
- Fallback automatico a main-thread se 2/3 critic fail
- Per shared-file additive ticket: structured patches (ticket-id-N-additions.yaml) > full-file diff
- Alternative: split target file per famiglia (es. `data/core/traits/active_effects/sensori.yaml`) — schema loader può supportare directory walk

**Trait mechanics counter**: 111 → **120** (+9, all glossary cross-referenced).
**Glossary entries**: 275 → **279** (+4 new).
**Jobs runtime**: 7 → **11** (4 expansion live).
**Perks runtime**: 84 → **132** (+48 expansion).
**AI test baseline**: 311/311 ✅ verde post-merge (zero regression).

**Steps deferred** (next session pickup):

- **STEP 3 Status effects v2 Phase A** (5 stati Tier 1: slowed/marked/burning/chilled/disoriented) — ~110 LOC + 5 trait + 5 test, **HIGH-RISK** runtime combat resolver. Decompose in 5 mini-PR sequenziali post design call.
- **STEP 4 Content wave 6 manuale** (~20 trait residui) — additive ad active_effects.yaml, ~1h. Quick win bookmark next sprint.

**Handoff doc**: [`docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md`](docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md).

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

### DoD nuovi agent / skill / feature — 4-gate policy (dichiarazione 2026-04-24)

**Policy permanente**: ogni nuovo `.claude/agents/*.md`, `.claude/skills/*.md`, o feature non banale (>50 LOC runtime o user-facing) deve passare 4 gate sequenziali prima di essere dichiarato "ready". Niente asset "draft" committato come "done".

**Gate 1 — Research investigation** (prima di scrivere):

- Path reali via `grep` (NON fidarsi di CLAUDE.md — può essere obsoleto/aspirazionale)
- Prior art (ADR, SoT, repo esterni già studiati), reference pattern
- Use case concreto + metrica di successo (chi lo usa, cosa sblocca, come sappiamo che funziona)

**Gate 2 — Smoke test** (dopo primo draft):

- Invoke `general-purpose` subagent: "leggi `.claude/<path>` come istruzioni, esegui step-by-step su repo reale, produce il report, ritorna critique USABLE/NEEDS-FIX/REWRITE + fix line-by-line"
- Test su stato degradato noto (dati mancanti, dir vuote, first-run)
- Report smoke salvato in `docs/playtest/` o `docs/qa/YYYY-MM-DD-<asset>-smoke.md`

**Gate 3 — Tuning** (post-test iterazione):

- Applica le suggestion line-by-line dalla critique
- Edge case handling + graceful degradation verificato
- Se verdict REWRITE → stop, riconsidera scope, eventualmente taglia

**Gate 4 — Optimization** (polish finale):

- Context efficiency: data source priority, read budget cap
- Prompt density: caveman voice, no redundancy, numbered steps
- Anti-pattern guards: "DO NOT do X" list esplicita nel file
- Escalation path: cosa fa l'agent se fallisce o a chi passa il controllo

**Eccezioni** (lightweight, saltano alcuni gate):

- One-off prompts in `.claude/prompts/` → solo Gate 1
- Edit triviali (typo, path rename) → nessun gate
- Research docs `docs/research/*` → Gate 1 obbligatorio (citazioni fonti), altri opzionali

**Motivation**: l'agent `coop-phase-validator` del 2026-04-24 fu scritto "a tavolino" con path sbagliati (`phaseMachine.js` inesistente). Smoke test trovò il file reale (`coopOrchestrator.js`) via grep. Senza test = commit agent rotto. Policy deriva da lezione diretta.

Ref memoria: [`feedback_smoke_test_agents_before_ready.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_smoke_test_agents_before_ready.md).

### Gate 5 — Engine wired (dichiarazione 2026-04-27)

**Policy permanente — ANTI-PATTERN "Engine LIVE Surface DEAD" KILLER**:

Diagnosticato 2026-04-26: ~30% delle 61 voci catalogate (18/61) hanno **runtime built ma surface player dead**. Esempi shipped poi orphan:

- enneaEffects.js 93 LOC mai `require` (revived PR #1825-1830 dopo audit)
- objectiveEvaluator.js 5 obj types → 0 scenari runtime usavano non-elim
- biomeSpawnBias.js → 1 scenario opt-in only
- QBN engine 17 events → 0 chiamate session
- Tactics Ogre HUD canonical doc → no implementation
- Spore P2 fonte primaria → ZERO research doc (until PR #1895)

**Regola**: ogni nuovo engine/service/library backend DEVE avere wire frontend (UI/HUD/CLI/log player-visible) **PRIMA di essere ship-ready**. Solo backend = WIP, **non production-ready**.

**Checklist mandatory** pre-merge per nuova feature non triviale:

1. ✅ Backend logic implementato + test
2. ✅ Schema/contracts aggiornati
3. ✅ **Surface player exists**: UI overlay / HUD widget / debrief field / log line / CLI output / debug endpoint
4. ✅ Smoke E2E: utente reale può VEDERE l'effetto della feature in <60s di gameplay
5. ✅ Documented in changelog: "Player vede X. Prima vedeva Y."

**Eccezioni esplicite** (skip Gate 5 con justification):

- Audit/telemetry internal (es. `xpBudget.auditEncounter` warn console) — surface = log developer
- Refactor / cleanup tecnico (no behavior change)
- Schema migration (no UX impact)
- Methodology tooling (es. linter `lint_mutations.py`)

**Anti-pattern check**: durante PR review chiedi sempre _"un player vede questa feature in 60s di gameplay?"_. Se risposta NO senza justification → blocca merge.

**Motivation**: `mating_engine_orphan.md` museum card score 5/5. 469 LOC + 7 endpoint shipped 4 mesi fa, ZERO frontend. Decision blocking OD-001 ancora aperta. Costo opportunità enorme. Engine wired DoD previene la prossima volta.

**Trigger consultation**:

- Quando proponi nuovo agent/skill/feature
- Quando audit identifica gap "engine X esiste ma..."
- Quando spec doc dice "wire deferred / pending"
- Quando review PR autonomous mode

Ref memoria: vedi pattern dominante in [`docs/research/2026-04-26-cross-game-extraction-MASTER.md §4`](docs/research/2026-04-26-cross-game-extraction-MASTER.md), [`docs/research/2026-04-26-agent-integration-plan-DETAILED.md §4`](docs/research/2026-04-26-agent-integration-plan-DETAILED.md), [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §C.2`](docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md).
