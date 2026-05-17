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

## ⚖ No anticipated judgment / completionist-preserve discarded (2026-05-08 sera)

Friction concreta sessione 2026-05-08 sera: durante closure cumulative + OD audit, Claude shipped 3 anticipated judgment in canonical docs senza explicit user OK. User feedback: "mi preoccupano il punto 3 il 4 e il 5" → reframe via "player completista" lens.

### Pattern fix canonical

**Completionist principle**: zero info lost. Quando subjective Claude judgment non è verificabile factual (gate da master-dd review), preserva tutto + caveat explicit + museum card per discarded items.

### Rule autonomous mode (Auto mode active OR generic "procedi"/"continua")

- ✅ **OK factual cleanup**: move misplace section, fix typo, format align, aggregate data via gh raw count, verify-before-claim live test capture
- ✅ **OK preserve + caveat**: subjective claim shippable se markup soft `(⚠️ Claude autonomous judgment — pending master-dd review for criteria diversi)` + breakdown alternativi value criteria preserved
- ✅ **OK museum card per discarded**: ogni item Claude scarta (revert / soften / drop) → `docs/museum/cards/<topic>-<date>-discard.md` Dublin Core entry preserve + reuse paths + lifecycle additive-only
- ❌ **NOT OK**: design decisions cross-doc linking gated user verdict senza markup soft (e.g., bundle OD-X ↔ OD-Y senza "Claude-proposed pending master-dd")
- ❌ **NOT OK**: subjective value framing canonical pre master-dd review come fact (e.g., "ZERO actionable", "deceptively low", "Real signal-to-noise = ~0%")
- ❌ **NOT OK**: silent discard senza museum card preservation

### Pattern markup canonical

Subjective Claude judgment shippato canonical doc:

> **<claim>** (⚠️ Claude autonomous judgment — pending master-dd review per criteri value diversi: <list 2-3 alternative interpretations>). <discarded items count> preservati [museum card M-YYYY-MM-DD-NNN](docs/museum/cards/<topic>-discard.md).

### Trigger consultation pre commit

Prima di committare canonical doc edit autonomous chiedi:

1. Sto facendo **factual cleanup** (path fix, format align, gh raw aggregation)? → ✅ procedi
2. Sto facendo **design judgment gated** (bundle / scope / value framing)? → markup soft `(⚠️ Claude autonomous — pending master-dd review)`
3. Sto **discarding items** (revert / soften / drop)? → museum card additive preserve

### Validato 2026-05-08 sera

PR #2123 cross-link OD-022 ↔ OD-020 + 5 doc canonical "ZERO" framing → user spotted drift 3+4+5 → corrective approach via completionist principle: preserve + caveat + museum card M-2026-05-08-001 (10 discarded swarm claim items) shipped (this commit).

**Lesson canonical**: in Auto mode autonomous, NEVER silent revert / soften / drop subjective items. Always preserve via museum card + caveat markup canonical. Future Claude legge regola, evita recurrence.

---

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
- `apps/backend/services/combat/` — Node native combat logic canonical (M6-#1 2026-04-19). `resistanceEngine.js` (channel resistance per archetype), `reinforcementSpawner.js`, `objectiveEvaluator.js`. Sostituisce ex-`services/rules/` Python (Phase 3 removal completata 2026-05-05, ADR-2026-04-19).
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
- **Combat pipeline (Rules Engine)**. Il rules engine d20 vive nel runtime Node canonical: `apps/backend/services/combat/` (resistanceEngine, reinforcementSpawner, objectiveEvaluator, passiveStatusApplier), `apps/backend/services/roundOrchestrator.js` (round phases planning→commit→resolve), `apps/backend/services/traitEffects.js` (trait evaluation 2-pass, `evaluateMovementTraits` per ancestor buff_stat). I valori meccanici provengono da `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`. Lo schema payload è in `packages/contracts/schemas/combat.schema.json`. Vedi `docs/hubs/combat.md` per il canonical hub e [ADR-2026-04-19](docs/adr/ADR-2026-04-19-kill-python-rules-engine.md) per la rimozione del rules engine Python (ex-`services/rules/`, Phase 3 closed 2026-05-05).
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
- **Master DD approval** must be documented (link a comment/issue) before merging — **EXCEPT auto-merge L3 PR Claude-shipped** (vedi sotto).
- Include a changelog entry and a **03A rollback plan** in the PR notes.
- Run `npm run format:check` + `npm run test` locally; for frontend changes, also `npm run build` + `npm run preview` (or `npm run webapp:deploy`).
- Do not commit binary archives under `reports/backups/**` — upload externally and update the `manifest.txt` (Archive/SHA256/Location/On-call/Last verified) per `docs/planning/REF_BACKUP_AND_ROLLBACK.md`, then log in `logs/agent_activity.md`. `npm run lint:backups` enforces this.
- Husky runs a Prettier pre-commit on staged files; re-run `npm run prepare` after a fresh checkout.

### Auto-merge L3 (ACCEPTED 2026-05-07)

Per [ADR-2026-05-07-auto-merge-authorization-l3](docs/adr/ADR-2026-05-07-auto-merge-authorization-l3.md): Claude-shipped PR su `Game/` + `Game-Godot-v2` autorizzati auto-merge via `gh pr merge --squash --auto --delete-branch` SE TUTTI i 7 safety gate verdi:

1. CI 100% verde (zero `fail` o `pending`; skip OK)
2. Codex review resolved (no outstanding `requested_changes` su latest commit)
3. Format + governance verde (Prettier + docs-governance Game/, gdformat + gdlint Godot v2)
4. Test baseline preserved (AI ≥382/382 Game/, GUT ≥1877 Godot v2)
5. ZERO file in forbidden paths: `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`, `services/rules/`
6. No regola 50 righe violation fuori `apps/backend/`
7. No nuove dipendenze npm/pip

OUT of scope auto-merge (require master-dd manual): multi-author PR, schema breaking change, migration, new dep, direct push main.

Master-dd preserve veto via: post-merge `git revert`, branch protection rule, "stop auto-merge" comment, new ADR supersede.

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

<!-- Sprint context: policy max 3 sections (drift audit 2026-04-28). Sezioni storiche
     archived in docs/archive/historical-snapshots/2026-04-28-pre-consolidation/CLAUDE-sprint-context-archive.md.
     Live runtime status pillars → docs/reports/PILLAR-LIVE-STATUS.md (single SOT runtime). -->

## 🎮 Sprint context (aggiornato: 2026-05-15 — Ecosystem audit + Q1 Option A canonical migration + Phase 3 Path D HYBRID FULL CLOSURE — v43)

**Sessione 2026-05-13/14/15 (PR #2260 audit ecosystem + PR #2271 Phase A + Q1 canonical migration + Phase 3 Path D)**: 46+ commit cumulative cross-stack. Resume trigger user "analizza col metodo tutta l'infrastruttura Ecosistema > Biomi > reti trofiche > hazard > specie > mating > creature giocabili > evoluzioni" → cascade 8 OD ai-station verdict + ADR-2026-05-15 Q1 Option A canonical migration full rollout.

**46 commit cumulative PR #2271 + 8 PR merged main session 2026-05-13/14**:

| Layer                  | PR / commit                                                                                                                                          | Topic                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| #2260 (merged)         | audit ecosystem 7-strati 495 LOC + plan 22 ticket TKT-ECO-XX 730 LOC                                                                                 | docs                 |
| #2261 (open)           | Envelope A bundle (OD-025 smoke + OD-028 Howler CDN + OD-030 flag-ON)                                                                                | 3 OD shipped         |
| #2262 (open)           | Envelope B bundle (OD-024 sentience 15/15 + OD-025-B2 + OD-027 + OD-029 + OD-031)                                                                    | 5 OD shipped         |
| #2263 (merged)         | fix promotion JS FALLBACK_CONFIG cross-stack parity                                                                                                  | parity               |
| #2264 (merged)         | Phase B3 PromotionEngine job_archetype_bias + vc_scoring sentience fold                                                                              | TKT-A8 ✅            |
| #2265-#2270 (merged)   | Playtest #2 analyzer + Cloudflare deploy + GSD Bundle B + Phase B4 + endCombat debrief                                                               | infra                |
| **#2271 (open ready)** | **Phase A residue 9/9 + Q1 Option A canonical migration FULL CLOSURE + Phase 3 Path D HYBRID + Phase 4d Scope A + Scope B prep + gap audit closure** | 46 commit cumulative |

**Q1 Option A canonical migration ADR-2026-05-15 — 100% phases COMPLETE**:

- Phase 1+2 — ETL absorb 38 residue → 53 species single SOT + DEPRECATED header
- Phase 3 Path Quick + Path D HYBRID — heuristic enrichment Pattern A+B+C industry-proven (Caves of Qud + Dwarf Fortress + RimWorld). Coverage: **visual_description 36/38 (94.7%) + constraints 38/38 (100%) + symbiosis 47% derived heuristic + \_provenance audit trail 38/38 (100%)**
- Phase 4a — sync:evo-pack regen 75 file mirrors
- Phase 4b — JS refactor traitEffects + wikiLinkBridge
- Phase 4c.1-4c.7 — schema v0.4.0 (default_parts + catalog_synergies + ecology + pack_size + genus + epithet preserved) + JS biomeResonance + synergyDetector + Python migration 8/8 tools + FILE REMOVAL species.yaml + schema deprecation note
- Phase 4d Scope A — canonical mirror species-canonical-index.json 53 species shipped
- Phase 4d Scope B — Game-Database cross-stack PR template handoff master-dd ready

**Anti-pattern killer milestone**: Engine LIVE Surface DEAD chain CLOSED end-to-end species canonical. Schema fork OD-027 resolved Option A canonical migration full rollout autonomous (master-dd verdict A+C+C+C ratified + Path D HYBRID Q4d-2=B + Skiv synthetic Q4-Skiv=B).

**Catalog v0.4.1 final state**:

- 53 species single SOT canonical (10 pack-v2-full-plus + 5 game-canonical-stub + 38 legacy-yaml-merge)
- 24 fields preserved: scientific_name + classification + functional_signature + visual_description + risk_profile + interactions + constraints + sentience_index + ecotypes + trait_refs + lifecycle_yaml + source + merged_at + clade_tag + role_tags + legacy_slug + biome_affinity + default_parts + ecology + pack_size + genus + epithet + **\_provenance audit trail** + common_names
- catalog_synergies array preserved verbatim (1 entry: echo_backstab)

**Pillar deltas v42 → v43**:

- P3 Identità: 🟢 candidato HARD CONFIRMED + reinforced (catalog 53/53 + Pattern A+C 100% constraints)
- P4 Temperamenti: 🟢 candidato HARD CONFIRMED + reinforced (sentience 53/53 + 4-layer ready + 4 traits interocettivi)
- P6 Fairness: 🟢 candidato confermato (A5 bioma pressure surface + conviction tactical flags inline #2267)

**CI cumulative session**:

- 12/12 verify gates verde finale post Codex fixes
- **715 Python tests + 1193 JS test:api + 417 AI + 229 play + 23 Trait Editor = 2677/2677 verde** post all autonomous shipping
- Codex reviews 2/2 addressed (terrain RNG flake + validate_species ENOENT + check_missing_traits strict flag)

**Anti-pattern killer culmination**:

- L7c Promotions ORPHAN false-negative corrected (museum card M-2026-05-13-001)
- Engine LIVE Surface DEAD chain CLOSED (mating + promotions + bioma pressure + starter_bioma + sentience)
- Schema fork dual SOT → single SOT canonical (Q1 Option A)
- Industry-pattern reuse methodology codified (Pattern A+B+C, museum card M-2026-05-15-001)

**Outstanding master-dd manual** (autonomous shipped 100%, master-dd authority residue):

- D.5 Master-dd review + polish visual_description 36/38 batch session (~4-5h)
- D.6 Master-dd Skiv-style symbiosis Apex+Keystone subset (~1-1.5h)
- Phase 4d Scope B Game-Database cross-stack execution (PR template ready, ~2-3h)
- PR #2271 review + merge (master-dd authority)

**Branch state**: HEAD `58558ce` (PR #2271 ready for review), tree pulito + push verde.

**Resume trigger phrase canonical** (next session):

> _"verifica PR #2271 review status + procede D.5 master-dd polish visual_description batch OR Phase 4d Scope B Game-Database execution"_

---

## 🎮 Sprint context (aggiornato: 2026-05-09 sera — K4 Approach B + 4 task autonomous closure)

**Sessione 2026-05-09 sera (K4 Approach B commit-window + cascade 4 task autonomous)**: 4 PR Game/ shipped main ~2-2.5h cumulative. Resume trigger user "leggi handoff PR #2148, esegui Option A K4 Approach B commit-window" + escalation "3+5+esegui FASE 1 T1.3" + grant esplicito `.github/workflows/`.

| PR                                                       | Squash     | Topic                                                                          |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| [#2149](https://github.com/MasterDD-L34D/Game/pull/2149) | `e608ddd8` | K4 Approach B commit-window guard 100% WR N=40 (+10pp vs K3 baseline 90%)      |
| [#2150](https://github.com/MasterDD-L34D/Game/pull/2150) | `94dabd95` | swap default aggressive profile → utility ON + commit_window 2                 |
| [#2151](https://github.com/MasterDD-L34D/Game/pull/2151) | `9f8bcaae` | FASE 1 T1.3 browser sync spectator harness Playwright + visual diff            |
| [#2153](https://github.com/MasterDD-L34D/Game/pull/2153) | `ebb04e8f` | FASE 5 nightly cron `.github/workflows/ai-sim-nightly.yml` + threshold checker |

**K4 Approach B (PR #2149) — anti-flip commit-window guard deterministico**:

- `_detectFlip(actor, newIntent, newDirection)` in `declareSistemaIntents.js` rileva intent reversal (approach↔retreat) OR direction reversal (N↔S, E↔W) vs `last_action_type` / `last_move_direction`.
- Su flip detected → forza intent precedente per `commit_window` turni (=2 default).
- **Side-fix critico**: state tracking `last_action_type` + `last_move_direction` ora avviene in `sessionRoundBridge.js realResolveAction` post-commit. Pre-PR esisteva solo in `sistemaTurnRunner.js` (legacy DEAD path M17 ADR-2026-04-16) — K4 sticky era no-op nel round flow.
- Sweep N=40 vs K3 baseline N=20: 100% WR / avg 24.2r vs 90% WR / 25.0r. Zero timeouts, zero defeats. 7.4% guard footprint (90 firings / 1208 SIS decisions).
- Hypothesis confirmed: determinismo beats additive sticky (PR #2147 negative result @ 55-60% WR).

**Default aggressive profile swap (PR #2150)**: production state ai_profiles.yaml ora utility ON + commit_window 2. Profile alternativi preservati per ablation testing (`aggressive_no_util`, `aggressive_with_stickiness`, `aggressive_sticky_30`, `aggressive_commit_window`).

**FASE 1 T1.3 browser sync spectator (PR #2151)**: twin-harness di `tests/smoke/ai-driven-sim.js`. Playwright chromium headless, hook su `window.__evoLobbyBridge._currentPhase` (poll 200ms), cattura PNG full-page + grid signature 4×4 RGBA su ogni `phase_change`. Diff utility CLI 3 modi (`--baseline` / `--compare` / `--compare-baseline`). Smoke validato 4 PNG cattura + manifest.json + telemetry.jsonl. Open question master-dd: phone composer no canvas → DOM bbox sample vs PNG-only fallback (PNG fallback shipped).

**FASE 5 nightly cron (PR #2153)**: `ai-sim-nightly.yml` cron 02:00 UTC daily + workflow_dispatch. Backend boot localhost → batch-ai-runner N=40 × 3 profile → `tools/sim/check-thresholds.js` aggrega vs canonical baseline → su regression open GH Issue label `ai-sim-regression,automated` + artifact upload 14d retention. Drift threshold ±10pp WR + completion floor 95%. **First scheduled run 2026-05-10 02:00 UTC**.

**Cumulative Day 5 (2026-05-09)** = 13 PR Game/ shipped main (#2140-#2151 + #2153) + 1 Godot v2 + 1 Godot v2 direct main.

**Pillar deltas**: P1 Tattica 🟢++ (commit-window deterministico = AI behavior più readable). P5 Co-op 🟢 confermato (zero regressione sim baseline). Altri pilastri invariati.

**Resume trigger phrase canonical** (ANY PC, next session):

> _"verifica nightly cron 2026-05-10 02:00 UTC primo run + esegui scenario diversity sweep `aggressive` × enc_tutorial_02..05 + hardcore-\*"_

OR (post first nightly run pass):

> _"esegui MAP-Elites K4 grid — sticky × commit × softmax cells ~150 runs"_

**Next session candidati**:

- A) Verifica primo nightly cron run (artifact + threshold report)
- B) Scenario diversity sweep aggressive default × 5+ scenari (~10-15min)
- C) MAP-Elites combo grid sticky × commit × softmax (~150 runs ~2-3h)
- D) `--with-spectator` flag in `batch-ai-runner.js` (T1.3 next-iter ~1-2h)
- E) BASELINE_WR.cautious update post empirical N=40 measurement
- F) Master-dd playtest LIVE balance check post profile swap (NICE-TO-HAVE)

---

## 🎮 Sprint context (aggiornato: 2026-05-09 — Status Effects v2 Phase A gaps closed, 2 PR)

**Sessione 2026-05-09 (Status Effects v2 Phase A gap-fill)**: Audit rivelò che i 5 stati Tier 1 (slowed/marked/burning/chilled/disoriented) erano già su main dal 2026-04-27. Sessione pivot su 2 gap residui: glossary sync + AI policy.

| PR                                                       | Branch                         | Topic                                                                                   | CI          |
| -------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- | ----------- |
| [#2138](https://github.com/MasterDD-L34D/Game/pull/2138) | `feat/status-phase-a-glossary` | Glossary sync: 5 trait Phase A (592→597 entries)                                        | ✅ verde    |
| [#2139](https://github.com/MasterDD-L34D/Game/pull/2139) | `feat/status-phase-a-policy`   | AI policy: `attack_debuffed_target` objective + debuff tie-break in pickTargetExcluding | in progress |

**Test baseline post-sessione**: 52/52 status effects (+10 nuovi vs 42 baseline). AI totale: 220 pass / 10 fail infrastruttura (pre-esistenti, invariati).

**Gap residui deferred**:

- Gate 5 HUD surface (Priority 2): Godot v2 `unit_info_panel.gd` status icons — ~3-4h frontend
- Phase B stati: burning+chilled interaction + frozen upgrade (design call master-dd needed)

**Handoff**: `docs/planning/2026-05-09-status-effects-phase-a-handoff.md`

---

## 🎮 Sprint context (aggiornato: 2026-05-08 sera — Phase A Day 3/7 trigger autonomous + 7 PR cumulative)

**Sessione 2026-05-08 sera (Day 3/7 trigger autonomous OD-021)**: 7 PR Game/ shipped cascade ~2.5h cumulative. User resume trigger phrase anticipato 1 calendar day vs OD-021 schedule (label = `2026-05-09`, execution UTC = `2026-05-08`). Day 5 iter3 schedule confermato `2026-05-11`.

| PR                                                       | Squash     | Topic                                                                                              |
| -------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| [#2118](https://github.com/MasterDD-L34D/Game/pull/2118) | `27dc92e6` | Phase B synthetic supplement iter2 (Tier 1 15/16 verde, ZERO regression Day 1→2→3)                 |
| [#2119](https://github.com/MasterDD-L34D/Game/pull/2119) | `0423001a` | Normalize chip drift Day 3: date label + PR count gh ground truth + CLAUDE.md sprint Day 3 section |
| [#2108](https://github.com/MasterDD-L34D/Game/pull/2108) | `1cfd7220` | evo-swarm run #5 distillation merge (honesty pass pre-shipped: 7/13 hallucinated flagged)          |
| [#2120](https://github.com/MasterDD-L34D/Game/pull/2120) | `9d57a2c5` | OD-022 add: evo-swarm pipeline cross-verification gate pre run #6 (~7-9h Sprint Q+ candidate)      |
| [#2121](https://github.com/MasterDD-L34D/Game/pull/2121) | `1ee6fd94` | Triage run #5 5/7 questions closed canonical grep (~25min, 2 deferred Sprint Q+)                   |
| [#2117](https://github.com/MasterDD-L34D/Game/pull/2117) | `2656640c` | Skiv Monitor auto-update admin merge (canonical pattern post #2115 lesson)                         |
| [#2122](https://github.com/MasterDD-L34D/Game/pull/2122) | `95ac1ef3` | Day 3 closure cumulative: BACKLOG + COMPACT + CLAUDE.md + memory + handoff fill TBDs               |
| [#2123](https://github.com/MasterDD-L34D/Game/pull/2123) | `bec82f12` | OD audit cleanup OD-016 sposta + OD-022 cross-link (drift, corrected by #2125)                     |
| [#2125](https://github.com/MasterDD-L34D/Game/pull/2125) | `e6e0ba0a` | Completionist enrichment + museum card M-2026-05-08-001 + lesson codify CLAUDE.md                  |
| [#2126](https://github.com/MasterDD-L34D/Game/pull/2126) | `35c1ca31` | Final closure TBD fill + count audit fresh                                                         |
| [#2129](https://github.com/MasterDD-L34D/Game/pull/2129) | `62cd6b60` | Multi-action: A pre-design preview + B+D+E findings + aggregate doc                                |
| [#2127](https://github.com/MasterDD-L34D/Game/pull/2127) | `c2e21551` | Skiv Monitor auto-update admin merge (cascade)                                                     |
| [#2128](https://github.com/MasterDD-L34D/Game/pull/2128) | `20dda146` | Master-dd cross-repo `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY                   |
| [#2130](https://github.com/MasterDD-L34D/Game/pull/2130) | `b492cdd6` | Sprint Q+ kickoff coordination + OD-022 IMPLICIT ACCEPT post cross-repo evidence                   |

**Synthetic iter2 evidence**: Tier 1 phone smoke 15/16 PASS + 1 skip in 39.8s vs iter1 39.4s = noise. Iter3 hardware-equivalent reconnect 30.9s + WS RTT p95 441ms = zero degradation.

**evo-swarm run #5 score post-triage**: 5/13 verified + 8/13 hallucinated + 2 redundant + 2 deferred. **Net actionable per data integration immediate = ZERO** (Claude triage autonomous judgment); 5 verified consistency-minor pendente master-dd review per criteri value non-data-integration (baseline pipeline metric / pattern reference / doc audit). 10 discarded items preservati [museum card M-2026-05-08-001](docs/museum/cards/evo-swarm-run-5-discarded-claims.md). OD-022 trip-wire candidate Sprint Q+ post-Phase-B-accept.

**Cumulative Phase A PR count audit (gh ground truth UTC)**:

- UTC 2026-05-07 Day 1: 26 Game/ + 14 Godot v2 = 40 PR
- UTC 2026-05-08 Day 2 + Day 3 trigger sera: 16 Game/ (#2115 + #2116 + #2117 + #2118 + #2108 + #2119 + #2120 + #2121 + #2122 + #2123 + #2125 + #2126 + #2129 + #2127 + #2128 master-dd + #2130 + this final-final closure)
- **Total = 56 PR cross-repo Phase A monitoring window UTC Day 1+2** (+1 PR #2124 chiuso senza merge revert direction wrong)

**OD aperte tracking master-dd**: 5 → 6 (+OD-022 evo-swarm cross-verification gate pre run #6).

**Bloccante residuo**: NESSUNO autonomous. Master-dd weekend playtest signal NICE-TO-HAVE (OD-017 downgrade Day 2/7).

---

## 🎮 Sprint context (aggiornato: 2026-05-08 — Phase A Day 2/7 monitoring + autonomous research-only cascade)

**Sessione 2026-05-08 (Day 2/7 monitoring window post-Phase-A-LIVE)**: Master-dd silenzioso playtest signal. Claude autonomous research-only scoping + RCA + synthetic supplement. **4 PR Game/ shipped autonomous** (~10min cumulative auto-merge L3 cascade):

| PR                                                       | Squash     | Topic                                                                                               |
| -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| [#2109](https://github.com/MasterDD-L34D/Game/pull/2109) | `66bfc200` | Sprint Q+ GAP-12 LineageMergeService ETL scoping (12 ticket Q-1→Q-12 ~14-17h, design-only NO impl)  |
| [#2110](https://github.com/MasterDD-L34D/Game/pull/2110) | `009c812c` | Tier 2 PlayGodot integration prep — kill-60 verdict reject (custom Godot fork burden 20-40h)        |
| [#2111](https://github.com/MasterDD-L34D/Game/pull/2111) | `3c588278` | Skiv Monitor RCA + 4-option fix menu (30/30 fail post 2026-04-25, Option A 30s 1-click recommended) |
| [#2112](https://github.com/MasterDD-L34D/Game/pull/2112) | `c4515b31` | Phase B synthetic supplement iter1 (Tier 1 phone smoke 15/16 verde, ZERO regression Day 1→2)        |

**Stato outstanding master-dd**: 5 OD aperte tracking decisioni canonical (vedi `OPEN_DECISIONS.md`):

- OD-017 Phase B trigger 2/3 Option α full social vs β solo hardware vs γ synthetic only
- OD-018 Tier 2 PlayGodot kill-60 accept/reject
- OD-019 Skiv Monitor fix Option A repo toggle vs B/C/D workflow edit
- OD-020 Sprint Q+ pre-kickoff 5 sub-decisione (gated post-Phase-B)
- OD-021 Continuous synthetic monitoring Day 3-7 schedule confirm/reject

**Stale ticket cleanup BACKLOG.md**: 6 ticket pre-pivot/pre-Phase-A marcati closed/superseded (Sprint M.1 + Sprint M.5 race + Sprint G.2b BG3-lite Plus + TKT-M11B-06 + Playtest round 2 + Pivot Godot).

**Test baseline**: Tier 1 phone smoke fresh 15/16 + 1 skip (39.4s, ZERO regression Day 1→Day 2). CI Game/ + Godot v2 main verde.

**Cumulative Phase A Day 1+2** = 18 PR Claude-shipped autonomous.

---

## 🎮 Sprint context (aggiornato: 2026-05-07 — Cutover Phase A LIVE + Tier 1 layered QA complete)

**Sessione 2026-05-07 (alternative QA infra + ADR cutover Phase A)**: 17 PR shipped (12 Game/ + 5 Godot v2) tutti merged main. ADR-2026-05-05 status `PROPOSED → ACCEPTED Phase A 2026-05-07` ([#2088](https://github.com/MasterDD-L34D/Game/pull/2088) MERGED `7247656`). Tier 1 layered QA infra (handoff doc canonical: 70% Functional + 20% Integration + 10% Physical) **completo** in singola sessione ~10h.

**PR shipped main 2026-05-07** (12 Game/):

| PR                                                       | Squash        | Topic                                                 | Pillar |
| -------------------------------------------------------- | ------------- | ----------------------------------------------------- | ------ |
| [#2087](https://github.com/MasterDD-L34D/Game/pull/2087) | `a1a88d7`     | Phone smoke harness 17 test (Node 11 + GUT 6)         | meta   |
| [#2091](https://github.com/MasterDD-L34D/Game/pull/2091) | `77644e8`     | RCA forensic B6+B7+B8 bundle                          | meta   |
| [#2092](https://github.com/MasterDD-L34D/Game/pull/2092) | `b3667b2`     | Canonical agent-driven workflow doc                   | meta   |
| [#2093](https://github.com/MasterDD-L34D/Game/pull/2093) | `4662e1c`     | Tier 1 #1 Playwright multi-context REST               | meta   |
| [#2094](https://github.com/MasterDD-L34D/Game/pull/2094) | `31b198f`     | Tier 1 #2 Artillery WS load (1598 req 0 fail p95=1ms) | meta   |
| [#2095](https://github.com/MasterDD-L34D/Game/pull/2095) | `0a6105b`     | Tier 1 #3 canvas-grid visual regression               | meta   |
| [#2096](https://github.com/MasterDD-L34D/Game/pull/2096) | `1965b46`     | Tier 1 #4 phone-smoke-bot native agent                | meta   |
| [#2097](https://github.com/MasterDD-L34D/Game/pull/2097) | `6d41ebc`     | Playwright WS multi-tab phase-flow B5-B10             | meta   |
| [#2098](https://github.com/MasterDD-L34D/Game/pull/2098) | `8a0ec55`     | combat → debrief → ended e2e closes Tier 1 gap        | meta   |
| [#2099](https://github.com/MasterDD-L34D/Game/pull/2099) | `196f606`     | Iter3 hardware-equivalent agent + browser smoke       | meta   |
| [#2088](https://github.com/MasterDD-L34D/Game/pull/2088) | **`7247656`** | 🎯 **ADR-2026-05-05 ACCEPTED Phase A**                | meta   |
| [#2100](https://github.com/MasterDD-L34D/Game/pull/2100) | `3935074`     | Phase A LIVE handoff doc + closure session            | meta   |

**PR Godot v2 shipped main 2026-05-07** (5):

| PR                                                              | Squash     | Topic                                                                                                          |
| --------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| [#203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203) | `5d098e7b` | β fix GAP-2 Ennea debrief view top archetype + GAP-9 ThoughtsRitual instance (+19 GUT)                         |
| [#204](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204) | `194a68da` | γ leftover GAP-1 TelemetryCollector p95 HUD + GAP-4 WoundState badge + D3 Ennea expand toggle 9-list (+15 GUT) |
| [#205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205) |            | B8 non-host transition stuck fix (defer guard helper extract)                                                  |
| [#206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) |            | deploy-quick rebuild dist by default (B6/B7 prevention)                                                        |
| [#207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207) |            | B9+B10 phone composer subscription handlers + 12 GUT tests                                                     |

**Bug bundle 2026-05-07 audit trail complete**:

| Bug                                  | Severity   | Fix PR                        | Status            |
| ------------------------------------ | ---------- | ----------------------------- | ----------------- |
| B5 phase_change                      | functional | #2087 harness catch           | shipped + harness |
| B6 stale-dist char_create            | infra      | #206 deploy rebuild           | shipped + RCA     |
| B7 stale-dist host preserve          | infra      | #206 deploy rebuild           | shipped + RCA     |
| B8 defer guard re-fire               | functional | #205 helper extract           | shipped + RCA     |
| B9 world_tally unknown_type          | functional | #207 phone composer subscribe | shipped + 12 GUT  |
| B10 world_vote_accepted unknown_type | functional | #207 phone composer subscribe | shipped + 12 GUT  |

**Tier 1 layered QA infra adoption complete**:

| Tier  | Tool                          | Effort actual | Coverage                                      |
| ----- | ----------------------------- | :-----------: | --------------------------------------------- |
| 1 #1  | Playwright multi-context REST |     ~1.5h     | host create + player join + 4-context scaling |
| 1 #2  | Artillery WS scenarios        |     ~1.5h     | HTTP throughput stress p95<500ms              |
| 1 #3  | canvas-grid visual regression |    ~45min     | NxM pixel sampling helper                     |
| 1 #4  | phone-smoke-bot native agent  |    ~30min     | Codified pattern via .claude/agents/          |
| 1 ext | WS multi-tab phase-flow       | ~3h subagent  | Full lifecycle lobby → ended                  |
| 1 ext | combat→debrief→ended e2e      |    ~30min     | Closes coverage gap                           |
| 1 ext | Iter3 hardware-equivalent     |     ~1.5h     | Reconnect + p95 baseline + tunnel-gated       |

**~10h totale Tier 1 vs ~7h budget**. ~+43% over budget per ext deliverables (WS + e2e + iter3).

**ADR-2026-05-05 status post-sessione**:

- Pre: PROPOSED — hardware iter3 deferred a alternative QA infra
- Post: ✅ **ACCEPTED Phase A 2026-05-07** — Tier 1 functional gate verde + 2-iter hardware campaign 5 bug bundle fixed + iter3 hardware-equivalent ~70-90% fidelity automated

**Phase A actions GO** (this session):

- 4.1 Frontend primary switch: Godot v2 phone HTML5 primary, web v1 secondary
- 4.2 README.md root: primary frontend banner aggiunto
- 4.2 Plan v3: Fase 3 Phase A LIVE marker
- 4.2 CLAUDE.md sprint context: this section
- 4.3 Monitoring window 7gg grace start: 2026-05-07 → 2026-05-14

**Pillar status post-Phase A LIVE**:

| Pillar        |                            Stato                            |
| ------------- | :---------------------------------------------------------: |
| P1 Tattica    |             🟢 (Telemetry HUD + p95 wire live)              |
| P2 Evoluzione |            🟢 candidato (apex ritual reachable)             |
| P3 Identità   |                   🟢ⁿ (11/11 jobs r1→r4)                    |
| P4 MBTI/Ennea |             🟢 candidato (cross-stack 9-canon)              |
| P5 Co-op      | 🟢 confirmed (post #2089 inject + B9+B10 fix + Tier 1 gate) |
| P6 Fairness   |               🟢 candidato (Wound badge live)               |

**Resume trigger phrase canonical** (any PC, next session):

> _"leggi docs/planning/2026-05-07-phase-a-handoff-next-session.md, monitoring window day N + Phase B trigger eval"_

OR

> _"Phase B archive web v1: post 7gg grace + 1+ playtest pass, eseguire ADR §6"_

**Next session candidati**:

- A) Master-dd 1+ playtest session post-cutover (4 amici + master-dd, full combat) → Phase B trigger 1/3
- B) 7gg monitoring window day-by-day check (no critical bug regression, p95 stable, WS reconnect <5%) → Phase B trigger 3/3 baseline
- C) Phase B archive web v1 formal post 7gg + playtest pass (ADR §6) — `apps/play/src/` → `apps/play.archive/`, deprecate banner, web-v1-final tag refresh
- D) Tier 2 PlayGodot full integration (~5h) — post Phase A stable
- E) GodotTestDriver in-engine (~2h) — post Phase A stable
- F) Wesnoth AI vs AI nightly (~6h) — Sprint M9+ fairness gate

---

## 🎮 Sprint context (aggiornato: 2026-05-05 — phone smoke runtime 5-bug bundle + drift sync close-marks)

**Sessione 2026-05-04→05 (drift sync deep clean + phone smoke userland)**: Game-Godot-v2 main HEAD `ddacd860` (post #169). Game/ main HEAD `97185317` (post #2053). 8 PR Game/ + 3 Game-Godot-v2 merged main in ~36h. Drift sync 2026-05-04 critical path Fase 3 cutover ridotto **47-70h → ~30 min** userland retry + 1-2h ADR formal (-99%).

**PR Game/ shipped main 2026-05-04→05** (8):

| PR                                                       | Squash commit | Topic                                                             |
| -------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| [#2045](https://github.com/MasterDD-L34D/Game/pull/2045) | `2f0b94b9`    | docs origin phone smoke step-by-step userland                     |
| [#2047](https://github.com/MasterDD-L34D/Game/pull/2047) | `dd677908`    | fix Codex P1+P2 review (Quick Tunnel coherent path + config.yml)  |
| [#2048](https://github.com/MasterDD-L34D/Game/pull/2048) | `b3fbde5c`    | gitignore `.env` + doc redirect upstream `deploy-quickstart.md`   |
| [#2050](https://github.com/MasterDD-L34D/Game/pull/2050) | `beec9bda`    | drop MSYS workaround section (post Game-Godot-v2 #168 fix)        |
| [#2051](https://github.com/MasterDD-L34D/Game/pull/2051) | `5aba1fff`    | drift sync Item 10 close-mark (phone smoke guida shipped)         |
| [#2052](https://github.com/MasterDD-L34D/Game/pull/2052) | `e53368cd`    | drift sync Items 1+2+Ennea close-marks (M.7 + N.7 + 9-canon)      |
| [#2053](https://github.com/MasterDD-L34D/Game/pull/2053) | `97185317`    | fix ws grace 30→90s + setPhase→publishPhaseChange + smoke results |

**PR Game-Godot-v2 shipped main 2026-05-04→05** (3 today + 6 prior 2026-05-04):

| PR                                                              | Topic                                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [#168](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/168) | fix MSYS build_web + serve_local (Windows compat + path traversal guard)                                               |
| [#169](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/169) | fix phone smoke bug bundle (B1 share screen + B3 host start button + B4 presence broadcasts + B5 phase_change handler) |

**Phone smoke runtime 2026-05-05 — 5 bug bundle shipped iter1**:

| Bug    | Sintomo                                                              | Fix shipped                                                             |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **B1** | Phone Crea Stanza non mostra codice (composer transitions immediato) | Share screen overlay codice + deep-link + Continue CTA                  |
| **B2** | 30s host-transfer grace troppo corto cross-device mobile             | 30s → 90s + env override `LOBBY_HOST_TRANSFER_GRACE_MS`                 |
| **B3** | Host stuck MODE_WAITING senza UI advance phase                       | Bottone "Inizia mondo (host)" runtime in MODE_WAITING                   |
| **B4** | "Errore [unknown_type]: player_connected" toast cover-screen         | Riconosci 3 presence broadcasts info-only (push_warning)                |
| **B5** | setPhase non trigger phone transition                                | `publishPhaseChange` versionato + composer `event_received` → swap mode |

**Verdict smoke**: **CONDITIONAL** — B1+B2+B3+B4 runtime-verified ✅, B5 shipped post-build runtime-retest pending. Combat 5 round + p95 capture + airplane reconnect DEFERRED next session.

**Drift sync 2026-05-04 status post-close-marks**:

| Item           |        Pre         |                                    Post                                    |
| -------------- | :----------------: | :------------------------------------------------------------------------: |
| 1 M.7 p95      |     🟡 PARTIAL     |                         🟢 ENGINE+WIRE LIVE (#166)                         |
| 2 N.7 5/5      |       🟡 3/5       | 🟢 4/5 GATE 0 NEAR-PASS (CampaignState + LineageMergeService #165 shipped) |
| 10 Phone smoke | ⏸ master-dd manual |          🟡 GUIDA SHIPPED + RUNTIME ITER1 BUG-FIX (5 bug bundle)           |
| Ennea drift    |  ❌ schema 9 vs 6  |                 ✅ RESOLVED (#167 Godot v2 + #2041 Game/)                  |

**Pillar realignment post-2026-05-05**:

- P5 Co-op (plan v3 🟡): 🟢 candidato — phone smoke runtime crossed cross-device 2-phone end-to-end
- P4 MBTI/Ennea (plan v3 🟡++): 🟢 cross-stack parity restored, surface debt residuo Godot debrief 9 archetype wire (~2-3h)

**Pillar realignment post-2026-05-07 audit (HONEST CHECK)**:

3 agent paralleli audit cross-repo 2026-05-07 hanno rivelato pattern Engine LIVE Surface DEAD pervasivo (~67% Godot v2). CLAUDE.md sprint context Wave 6 era aspirational vs reality. Stato post-β fix shipped (PR #2089 + Godot v2 #203):

| Pillar                   | Pre-audit claim       | Reality post-β + γ leftover                                                                                                        |
| ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P1 Tattica               | 🟢++                  | 🟡 candidato — 3 surface debt (TelemetryCollector HUD shipped via γ, MissionTimer countdown PARTIAL, Reinforcement telegraph DEAD) |
| P2 Evoluzione            | 🟢++                  | 🟢 candidato — apex ritual now reachable post #203 ThoughtsRitual wire                                                             |
| P3 Identità Specie × Job | 🟢ⁿ                   | 🟢ⁿ confirmed (no major audit gap)                                                                                                 |
| P4 MBTI/Ennea            | 🟢 cross-stack parity | 🟢 candidato — Ennea 9-canon debrief view live (#203) + ThoughtsRitual reachable                                                   |
| P5 Co-op vs Sistema      | 🟢 candidato          | 🟢 confirmed — threatAssessment now injected (#2089), depends post-validation                                                      |
| P6 Fairness              | 🟢 candidato          | 🟡 candidato — WoundState badge shipped via γ, xpBudget surface DEAD, threatAssessment surface still silent                        |

**Audit reports canonical** (read PRIMA di reclaim 🟢++ o 🟢 def stato):

- `docs/research/2026-05-07-orphan-engine-audit-game.md` (8 orphan flagged Game/)
- `Game-Godot-v2/docs/godot-v2/qa/2026-05-07-godot-surface-coverage-audit.md` (15 system audited Godot v2)
- `docs/reports/2026-05-07-cross-repo-audit-synthesis.md` (synthesis cross-repo + α/β/γ strategy)
- `docs/planning/2026-05-07-plan-v3-3-drift-sync-pq-formalization.md` (Sprint P+Q reality CLOSED + GUT 4095 asserts measured)

**β fix shipped 2026-05-07**:

- Game/ #2089: threatAssessment inject + replay schema register + tri-sorgente schema register (~1.5h, low blast radius)
- Godot v2 #203: GAP-2 Ennea debrief view + GAP-9 ThoughtsRitual wire (apex P4 surface reachable, +19 GUT tests)

**γ leftover SHIPPED 2026-05-07** (PR [#204](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204) `194a68da`, +15 GUT tests, 1877/1877 verde):

- ✅ Godot v2 GAP-1 TelemetryCollector p95 HUD label (debug-only) → P1 🟡 → **🟢**
- ✅ Godot v2 GAP-4 WoundState severity badge unit_info_panel → P6 🟡 → **🟢**
- ✅ D3 Ennea expand toggle (top archetype + click expand full 9-list) → P4 polish UX

**Anti-pattern observation pervasive**: 67% Godot v2 surface debt post-Wave 1-7 dimostra che port-velocity + Gate 5 enforcement insufficient. Tighten policy: ogni Tier port (O.3, M, N, R) deve includere surface wire ASSERTION nel PR DoD. Aggiunto a Gate 5 §enforcement.

**Cross-repo sequence reality (vs plan v3 stima)**:

Plan v3 originale stima Godot v2 Sprint M+N+O+P+Q+R+S = 13-19 settimane. Reality: M+N+O+R **closed** in ~1 settimana (Sprint R closed 2026-05-04 — vedi `Game-Godot-v2/docs/godot-v2/sprint-r-plan.md` status complete). Sprint P+Q ETL parzialmente shipped via W7.x bundle (combat stubs registry 14→9). OVERSHOT enorme.

**Lessons codified questa sessione**:

- **Iterative bug fix loop**: 4 rebuild cycles deploy-quick.sh + master-dd phone retest per fix → 5 bug critici caught + fixati senza spec dettagliato. Pattern self-healing senza CI infra dedicata mobile.
- **Mobile cross-device WS grace**: 30s default troppo corto per mobile browser tab pause. 90s min per playtest userland (env override per stricter SLA).
- **Phone composer host UX gap**: TV-driven phase transitions ASSUMPTION rotta in phone-only smoke flow. Surface CTA host-only era mancante (M11 spec implicit assumption). Fix runtime button ad-hoc + TODO scene-level redesign.
- **Versioned event subscription gap**: Sprint R.5 versioned events (phase_change + action_resolved + status_apply) richiedono explicit `event_received` subscription. Phone composer subscribed solo `state_received` originale → silently dropped phase transitions.
- **Doc fate evolution**: PR #2045 origin doc → #2048 redirect upstream `deploy-quickstart.md` → #2050 drop MSYS workaround post-#168 fix → 244 LOC final. Pattern "doc-as-code" iterativo invece di freezing first-draft.

**Resume trigger phrase canonical** (ANY PC):

> _"resume phone smoke retry 2026-05-05, verify B5 phase transition runtime + combat 5 round p95 capture + airplane reconnect"_

OR

> _"leggi memory/project_phone_smoke_session_2026_05_05.md, procedi cutover Fase 3 ADR formal post-smoke-retry"_

**Critical path Fase 3 cutover post-2026-05-05**: ~30 min userland retry + 1-2h ADR formal. **Items 6 + 9 only blocking**.

**Next session candidati**:

- A) **Master-dd phone smoke retry** (B5 verify + combat 5c + airplane 5d) → unblocks cutover
- B) Cutover Fase 3 ADR formal draft (master-dd + dev) — sblocca quando results PASS o CONDITIONAL accettato
- C) Surface debt M.7 debug HUD widget + Godot debrief 9 archetype wire (~5h)
- D) Sprint P/Q ETL formalization vs reality post-W7.x bundle (combat stubs registry update)

---

## 🎮 Sprint context (aggiornato: 2026-04-29 — Sprint Fase 1 closure 100% autonomous shipped)

**Sessione 2026-04-28/29 (Sprint Fase 1 ondata 3+ autonomous)**: 10 PR mergiati main in ~36h chiudono Sprint Fase 1 9/9 task autonomous. Bottleneck residuo = master-dd rubric session 4 amici tester DIVERSI per Spike POC verdict.

**PR shipped main** (10 sequenziali, branch deleted o pending worktree cleanup):

| PR                                                       | Squash commit | Topic                                                                                                                                                                                                               | Pillar             |
| -------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [#1996](https://github.com/MasterDD-L34D/Game/pull/1996) | `16fdebb7`    | Deep research SRPG/strategy synthesis (18 titoli) + 5 ADR (deep-research-actions + BG3-lite Plus + grid-type-square-final + supersede ADR-2026-04-16 hex axial + grid-less feasibility) + 9 deferred Q user verdict | meta               |
| [#1997](https://github.com/MasterDD-L34D/Game/pull/1997) | `5884e50f`    | Action 4 Sprint M.7 doc re-frame DioField command-latency p95                                                                                                                                                       | meta               |
| [#1998](https://github.com/MasterDD-L34D/Game/pull/1998) | `bf9b39ff`    | Action 7 CT bar visual lookahead 3 turni FFT-style HUD                                                                                                                                                              | P1 🟢++            |
| [#1999](https://github.com/MasterDD-L34D/Game/pull/1999) | `252593b3`    | Action 5 BB hardening: injury severity 3-tier enum + slow_down trigger expanded (panic/confused/bleeding≥medium/fracture≥medium)                                                                                    | P6 🟢 candidato    |
| [#2000](https://github.com/MasterDD-L34D/Game/pull/2000) | `246e1369`    | Action 2 tactical AI archetype templates (Battle Brothers + XCOM:EU postmortem, 3 archetype Beehave)                                                                                                                | meta P4            |
| [#2001](https://github.com/MasterDD-L34D/Game/pull/2001) | `28eeb71a`    | Action 1 SRPG engine reference codebase extraction (Project-Tactics + nicourrea + OpenXcom + Lex Talionis)                                                                                                          | meta               |
| [#2002](https://github.com/MasterDD-L34D/Game/pull/2002) | `d6f04300`    | Sprint G v3 Legacy Collection asset swap (Ansimuz CC0, 47 PNG 345KB ≤20MB cap, 5 biomi tile + 8 archetype creature + parallax 4-layer + VFX 8 types + Skiv LPC override preserved)                                  | P1 visual          |
| [#2003](https://github.com/MasterDD-L34D/Game/pull/2003) | `c6587ce5`    | Spike POC BG3-lite Tier 1 — hide grid + smooth movement + range cerchio + AOE shape + ui_config.json toggle (gate decision binary)                                                                                  | P1                 |
| [#2004](https://github.com/MasterDD-L34D/Game/pull/2004) | `dcba8295`    | Action 6 ambition Skiv-Pulverator alleanza (combat path + bond gate ritual choice fame vs alliance + reconciliation narrative beat)                                                                                 | P2+P5 🟢 candidato |
| [#2005](https://github.com/MasterDD-L34D/Game/pull/2005) | `88a4fded`    | Action 3 Sprint N gate row failure-model parity MANDATORY 5/5 + N.7 spec doc (WoundState.gd + LegacyRitualPanel.gd)                                                                                                 | meta               |

**Test baseline post-merge**: AI 382/382 verde zero regression preservato across all 10 PR. Format + governance + paths-filter + python-tests + dataset-checks + styleguide-compliance verdi.

**Pillar status finale post-wave-3**:

| #   | Pilastro                     |                                              Stato                                               |
| --- | ---------------------------- | :----------------------------------------------------------------------------------------------: |
| 1   | Tattica leggibile (FFT)      |      🟢++ (visual upgrade Legacy + CT bar lookahead 3 turni + BG3-lite Tier 1 toggle live)       |
| 2   | Evoluzione emergente (Spore) |   🟢++ (mating engine #1879 + Spore S1-S6 + ambition long-arc Skiv-Pulverator alleanza wired)    |
| 3   | Identità Specie × Job        |         🟢ⁿ (35 ability r1-r4 #1978 + Beast Bond + 4 jobs orfani Battle Sprite assigned)         |
| 4   | Temperamenti MBTI/Ennea      | 🟡++ (T_F full + thought cabinet UI + thoughts ritual G3 + tactical AI archetype templates spec) |
| 5   | Co-op vs Sistema             |  🟢 candidato (long-arc goal closes "combat isolated" risk + M11 lobby/ws + ambition HUD wired)  |
| 6   | Fairness                     |      🟢 candidato (BB attrition severity stack + slow_down trigger + status engine wave A)       |

**5/6 🟢++/🟢 candidato** + 1/6 🟡++ (P4). Demo-ready confermato.

**Bottleneck residuo Sprint Fase 1 → Fase 2 Godot onset**:

1. **🚫 Master-dd rubric session Spike POC** (~1-2h userland) — 4 amici tester DIVERSI da TKT-M11B-06 pool. Toggle `apps/play/public/data/ui_config.json` `bg3lite_*: false ↔ true` per A/B test. Score rubric 4-criteria (movement smooth + range readability + 2024 RPG feel + Skiv lore-faithful) 1-5 scale. Aggregate scores in `docs/playtest/2026-04-29-bg3-lite-spike-rubric.md` placeholder. Threshold pass: media ≥3.5 + zero score 1.
2. **🚫 Sprint G.2b BG3-lite Plus** (~10-12g, 2-2.5 sett) — solo se rubric pass. Tier 2 add-ons sub-tile float positioning + vcScoring area_covered float + flanking 5-zone smooth angle.
3. **🚫 Sprint I TKT-M11B-06 playtest** (~1 sett userland) — post Sprint G.2b ship.

**Effort delta cumulativo plan v2 → v3**: ~+109-127h (~+19-23% base 14 sett, justified data-driven post tester feedback informal 2026-04-28).

**Lessons codified questa sessione**:

- **10 PR sequential merge zero downtime**: ondata 3+ shipped via chip dispatch + master-dd merge approval. Pattern parallel chips file-disjoint = scalable autonomy.
- **Force-push blocked recovery via merge strategy**: PR #2001 + #2004 entrambi conflict registry/style.css post-prima-merge → `git pull --no-rebase` + commit merge + regular push (NO force-push per CLAUDE.md policy).
- **`gh pr update-branch <num>`** > rebase quando branch BEHIND main (PR #2002 esempio post 2000+2001 merge).
- **Spike POC rubric session pattern**: gate decision-binary pre full G.2b ~10-12g commitment evita scope creep speculative.
- **Multi-conflict registry post parallel chip**: PR 2000 + 2001 entrambi aggiungono row registry. Manual resolution mantieni BOTH entries come 2 oggetti JSON separati.

**Resume trigger phrase canonical** (ANY PC):

> _"leggi COMPACT_CONTEXT.md v19 + BACKLOG.md, master-dd ha eseguito rubric session Spike POC, verdict X/Y/N → procedi Sprint G.2b OR Sprint I"_

**Next session candidati**:

- A) **Master-dd rubric session Spike POC** (chiude bottleneck Sprint G.2b unblock) — UNICO bloccante autonomous pipeline
- B) Skiv state.json recompute post-encounter live playthrough (deferred a Phase 4 — non backfillable senza run reale)
- C) Sentience tier 4 species candidate exploration (T4=0 attualmente, gap noted OD-008)
- D) Ennea archetypes UI surface (gap noted handoff §1 — 9 archetypes ZERO surface)
- E) Sprint H itch.io gap-fill OPT (~3-4h, conditional on rubric verdict + Sprint G v3 visual gaps emerge)

---

<!-- Sprint context 2026-04-28 (Skiv Personal Sprint 4/4 goals) archived 2026-05-07
     per policy max 3 Sprint context. Full content in
     docs/archive/historical-snapshots/2026-04-28-pre-consolidation/CLAUDE-sprint-context-archive.md.
     Summary: PR #1982/#1977/#1983/#1984. P1 Skiv combat showcase + echolocation pulse +
     P2 legacy cross-gen agency + P4 thoughts ritual choice + P5 solo-vs-pack base.
     Memory: project_skiv_personal_wishlist_2026_04_27.md. -->

<!-- ARCHIVED below: Sprint context 2026-04-28 — replaced 2026-05-07 by Phase A LIVE section above.

## 🎮 Sprint context (aggiornato: 2026-04-28 — Skiv Personal Sprint 4/4 goals shipped)

**Sessione 2026-04-27/28 (Skiv personal wishlist autonomous)**: 4 goals canonical Skiv shipped end-to-end in singola sessione ~9h via 3-phase wave (G1+G2 parallel → G3 → G4). Plan canonical [`docs/planning/2026-04-27-skiv-personal-sprint-handoff.md`](docs/planning/2026-04-27-skiv-personal-sprint-handoff.md).

**PR shipped main** (4):

| PR                                                       | Goal                                      | Pillar | Scope                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------- | ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1982](https://github.com/MasterDD-L34D/Game/pull/1982) | G1 Encounter Skiv solo vs Pulverator pack | P1+P5  | encounter wired via encounterLoader + `wounded_perma` status persistent + `woundedPerma.js` mirror sgTracker + harness N=20 win 45.0% in band 35-45% + 9 test                                                                                                                   |
| [#1977](https://github.com/MasterDD-L34D/Game/pull/1977) | G2 Echolocation visual fog-of-war pulse   | P1     | `senseReveal.js` pure helper + `tile_visibility` in publicSessionView + `drawEcholocationPulse` cyan #66d1fb 800ms 40→120px + `installEcholocationOverlay` wire-point + 6 test (anti-pattern Engine LIVE Surface DEAD chiuso per echolocation)                                  |
| [#1983](https://github.com/MasterDD-L34D/Game/pull/1983) | G3 Thoughts ritual choice UI              | P4     | `thoughtsRitualPanel.js` overlay top-3 candidati + `GET /thoughts/candidates` ranked vcSnapshot + 30s timer countdown + irreversible session lock + voice line preview Disco-style ("Il branco non ti vede più. La sabbia segue solo te.") + 10 test                            |
| [#1984](https://github.com/MasterDD-L34D/Game/pull/1984) | G4 Legacy death mutation choice ritual    | P2     | `propagateLineage` opt-in `options.mutationsToLeave` filter (back-compat preserved) + `computeBondHeartsDelta` narrative beat (50% threshold + 100% bonus) + `POST /api/v1/lineage/legacy-ritual` + `legacyRitualPanel.js` overlay lifecycle_phase=legacy auto-trigger + 4 test |

**Test budget post-merge**: AI baseline 382/382 verde zero regression. +29 nuovi (9 G1 + 6 G2 + 10 G3 + 4 G4). Total ~1100 LOC.

**Skiv impact reale**:

- **P1 Tattica**: Skiv combat showcase live (encounter 35-45% win) + sense surface visible (echolocation pulse + tile reveal `?` glyph)
- **P2 Evoluzione**: legacy cross-gen agency live (cosa lascio = scelta esplicita)
- **P4 MBTI**: identity agency at apex (3rd thought = scelta vs auto-pick)
- **P5 Co-op**: solo-vs-pack base per future co-op pack scenarios

**Lessons codified questa sessione**:

- **Wave-merge gate**: G1+G2 disjoint file ownership = parallel safe. G3+G4 share session.js + api.js = sequential mandatory. Handoff §3.1 collision matrix vincente.
- **Worktree contention recovery**: agente G1 ha creato worktree `Game-skiv-g1` per evitare collisione G2 nel main repo. Lesson da CLAUDE.md "Worktree isolation raccomandato per agent paralleli" applicata correttamente.
- **Force-push blocked → merge strategy**: post #1977 merge, branch G1 BEHIND main + force-push denied. Recovery via `git pull --no-rebase` + commit merge + push regular = clean path no force.
- **CI flake terrainReactionsWire fire**: stesso pattern Sprint 6 (CLAUDE.md riga 491). Re-run GA jobs failed = canonical fix per questo flake. Non-blocking ai PR Skiv.

**Resume trigger phrase canonical** (ANY PC):

> _"leggi docs/planning/2026-04-27-skiv-personal-sprint-handoff.md, verifica §6 progress, esegui fase corrente"_

**Next session candidati**:

- A) **TKT-M11B-06 playtest live** userland (chiude P5 🟢 def, unico bloccante umano)
- B) Skiv state.json recompute post-encounter live playthrough (deferred a Phase 4 — non backfillable senza run reale)
- C) Sentience tier 4 species candidate exploration (T4=0 attualmente, gap noted OD-008)
- D) Ennea archetypes UI surface (gap noted in handoff §1 — 9 archetypes ZERO surface)

ARCHIVED end. -->

---

<!-- Sprint context 2026-04-27 (50 PR mergiati cross-PC + 8/8 anti-pattern Engine LIVE Surface DEAD chiusi)
     archived 2026-05-05 per policy max 3 Sprint context. Full content preservato in
     docs/archive/historical-snapshots/2026-04-28-pre-consolidation/CLAUDE-sprint-context-archive.md.
     Summary preserved: PR #1975 predict_combat hover + #1901+#1960 Tactics Ogre HUD + #1922 Spore S1-S6 +
     #1918 mating engine propagateLineage + #1976 Objective HUD + #1966 Thought Cabinet UI. Pillar score
     5/6 🟢 def + 1/6 🟡++ (P3). Situation report `docs/reports/2026-04-27-situation-report-late.md`. -->

<!-- Sprint 8 Ability r3/r4 tier section (2026-04-27) archived 2026-04-29 per policy max 3 Sprint context.
     Full content in docs/archive/historical-snapshots/2026-04-29-claude-sprint-context-archive.md.
     Summary preserved: PR #1978 jobs.yaml v0.2.0 21→35 ability + cost ladder r1=3/r2=8/r3=14/r4=22 PI.
     AncientBeast Tier S #6 100% closed (channel resist #1964 + Beast Bond #1971 + wiki #1937 + r3/r4 #1978). -->

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
6. Se toccato `apps/backend/services/combat/` o `roundOrchestrator.js` → aggiorna `docs/hubs/combat.md`

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

## 🎨 Asset workflow (canonical 2026-04-29)

Per creare/acquisire asset visivi/audio Evo-Tactics:

1. **Workflow doc primary**: [`docs/guide/asset-creation-workflow.md`](docs/guide/asset-creation-workflow.md) — Path 1 (Kenney+modify) / Path 2 (AI Retro Diffusion + human edit) / Path 3 (reference legali + redraw fresh).
2. **Workspace locale** (out-of-repo, gitignored by design DMCA mitigation): `~/Documents/evo-tactics-refs/` 184GB — 32136 file CC0+PD+Sonniss royalty-free 100% license-classified, 10/14 tools auto-installed, recipes Skiv asset class in `HANDOFF.md` + `SKIV_REFS_EXTRACTED.md`.
3. **Backup meta repo** (private): [`MasterDD-L34D/evo-tactics-refs-meta`](https://github.com/MasterDD-L34D/evo-tactics-refs-meta) — doc + scripts (`robust_download.py` + `gen_manifest.py`) + URL lists pre-scraped (Kenney/HF/Sonniss/archive.org) + MANIFEST.json file-level index. Asset binaries NON committati (rebuildable cross-PC ~2h via bootstrap).
4. **Skill on-demand**: invoca `/asset-workflow` per orchestrate Path 1+2+3+4 con recipes Skiv direct.
5. **Trigger phrase user**: _"asset workflow / Skiv asset / Path 1|2|3 / crea icona|sprite|SFX / recipe Skiv"_ → leggi workflow doc + apri `~/Documents/evo-tactics-refs/HANDOFF.md`.

**Anti-pattern check** (vedi ADR-2026-04-18 + workflow doc):

- ❌ Commit reference asset locali a repo (DMCA fastlane on public repo)
- ❌ Trace su sprite proprietary
- ❌ Paint-over fan-rip
- ❌ AI img2img da asset proprietary
- ❌ Style prompt artisti viventi
