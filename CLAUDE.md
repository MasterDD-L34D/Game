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

### 🎯 Open-ended go-signal ("prossimo punto / lavoro irrisolto")

Segnali open-ended (_"prossimo punto"_, _"continuiamo"_, _"procedi"_) sono gestiti dai costrutti **esistenti** — niente protocollo dedicato. (Un "Autonomous Next-Point Protocol" formale è stato **rifiutato** da harsh-reviewer SDMG 2026-05-21: ridondante con quanto sotto, "highest-value" = euristica-as-decider [P7 step 6], nessun problema empirico — selezione improvvisata ha funzionato su ~6 go-signal. Rif: codemasterdd `docs/superpowers/specs/2026-05-21-autonomous-next-point-protocol-design.md`.)

In pratica: applica **Autonomous Execution** (sopra) + **verifica ground-truth prima di lavorare item ⏳/🟡** (`git fetch origin main` poi `grep` impl + `git log origin/main | grep <ticket>` + check artifact — marker=ipotesi, git=verità, L-075 / anti-pattern #19) + **FERMATI** per irreversibile / owner-gated / forbidden-path / fork architetturale.

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

## 📜 Canonical PRD — READ FIRST (design + build status)

> Unified PRD EXISTS — stop re-deriving design/build (recurring rework 2026-05-25).

- **Design / loop / Nido / mating / specie / narrative** → repo-local `docs/core/00-SOURCE-OF-TRUTH.md` (v5 canonical, promoted here) + `docs/core/{01-VISIONE,03-LOOP,17-SCREEN_FLOW,20-SPECIE_E_PARTI,27-MATING_NIDO,90-FINAL-DESIGN-FREEZE}.md`. 28 GDD OQ all CLOSED (§19). Loop = §23. _(Upstream authority A5 = vault `Spaces/Dev/Evo-Tactics/core/` — NOT resolvable from a Game checkout; use the repo-local copies above.)_
- **Build status** → SoT **§13 is STALE** (web-v1, 2026-04-16, pre-Godot-pivot AND pre M1/CAMP sprints). Cross-stack live status (sibling repo): https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md (🔵 rows = backend-built-here). Backend meta-loop (nest/mating/geneEncoder/campaignEngine/affinity/trust) is BUILT here but unported to Godot.

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

## 🎮 Sprint context (aggiornato: 2026-05-20 late-notte — Multi-agent cascade wave 1-6 + A4 design-space — v44.3)

**Sessione 2026-05-20 (cascade wave 1-6, ~11h cumulative)**: **21 PR cross-repo shipped + merged main** (20 Game + 1 codemasterdd). Multi-agent dispatch pattern (`superpowers:dispatching-parallel-agents`) provato canonical **6 wave consecutive** (3+2+3+3+1+2 agent + serial inline cleanup). Pilastri reinforced: 5/5 BACKLOG coop test gaps CLOSED + balance P1+P2+P3 cleanup + A4 design-space activation (ionico channel live) + 5 A6-pattern readonly diagnostic endpoint (starter-biomas/role-demands/aliena/status+biome/ennea-effects) + 17 offspring negative tests + 9 env flag documented + termico glass-cannon ratified.

**PR shipped main 2026-05-20 wave 6 addendum** (5 nuovi vs v44.2):

| #   | PR                                                            | Wave | Topic                                                                         |
| --- | ------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| 17  | [Game #2349](https://github.com/MasterDD-L34D/Game/pull/2349) | 5    | Handoff doc v44.2 (16 PR cumulative)                                          |
| 18  | [Game #2350](https://github.com/MasterDD-L34D/Game/pull/2350) | 5b   | Balance P2/P3 cleanup (termico desc + commit_window deprecated + gravita doc) |
| 19  | [Game #2351](https://github.com/MasterDD-L34D/Game/pull/2351) | 5c   | A4 design-space activation: 2 ionico traits (scarica_ionica + arco_voltaico)  |
| 20  | [Game #2352](https://github.com/MasterDD-L34D/Game/pull/2352) | 6    | Ennea-effects readonly diagnostic (A6 5th endpoint cumulative)                |

**Pillar deltas v44.2 → v44.3**:

- P3 Identità: 🟢 candidato HARD reinforced **+ ennea catalog surface** (4 trait readonly endpoint cumulativi expose canonical map)
- P4 Temperamenti MBTI/Ennea: 🟢 candidato → 🟢 **candidato HARD reinforced** (ennea-effects readonly endpoint shipped + 9/9 archetype catalog frontend-preloadable)
- P6 Fairness: 🟢 confirmed candidato post **A4 design-space activation** (ionico dead-channel closed + 2 new trait + termico practical exposure 15% → 21%)

**Tool/skill stack proven (cumulative wave 1-6)**:

- `superpowers:dispatching-parallel-agents` v5.1.0 — **proven 6 wave consecutive** ROI 4-6x
- `superpowers:handoff` × 3 (v44 + v44.1/2 + v44.3)
- `superpowers:fewer-permission-prompts` — 10 entries applied
- 10 agent total dispatched cross wave: `coop-phase-validator` + `repo-archaeologist` × 2 + `Explore` × 3 + `general-purpose` × 5 + `balance-auditor` + `playtest-analyzer`
- 2 museum cards (coop-ws-test-infra + session-debug-infra) score 5/5
- AA01 lessons L-064/065/066/067/068 encoded (multi-agent ROI + Self-Mod HARD BLOCK + parallel session drift + cwd contamination recovery + **design-space activation via corpus balance**)

**Balance audit verdict status (post wave 6)**:

- ✅ P1 Wave 5-7 cluster nerf — SHIPPED #2344
- ✅ P2 termico glass-cannon — RATIFIED (3-channel intentional, A4 corpus activated)
- ✅ P2 artigli pick-rate — monitor flag (playtest-analyzer wave 6: no fresh post-nerf batch data, need N=10 hardcore_07 run)
- ✅ P3 aggressive_commit_window — DEPRECATED #2350
- ✅ P3 gravita reserved — DOC #2350 (B1 verdict KEEP)
- ✅ A4 ionico design-space — ACTIVATED #2351 (2 trait shipped)

**Playtest-analyzer wave 6 findings** (gated master-dd action):

- 🔴 hardcore_07 WR 80-100% vs target 30-50% (4-5 batch runs out-of-band, all pre-Wave 5-7 data)
- 🔴 hardcore_06 0% WR (party damage insufficient vs Apex+Critical boss, all pre-Wave 5-7)
- 🟡 enc_tutorial_01 round=41 cap 14% stall rate (47/337 runs)
- 🟡 MBTI vc telemetry not firing (vc_mbti null in 413 session logs)
- 🟡 PI-shop trait_T3 acquisition <3% (economically unreachable in normal play)

**Recommendation autonomous-defer master-dd**: run N=10 `batch_calibrate_hardcore07.py` post-Wave 5-7 nerf per verify drift (richiede backend + Python + ~10-15min userland).

**Resume trigger phrase canonical** (next session):

> _"verifica worktree cleanup post-master-dd + run N=10 batch_calibrate_hardcore07.py post-Wave 5-7 nerf per verify drift OR tackle Atlas Envelope C runtime gated playtest OR Sprint Q+ ETL Q-1+Q-2 forbidden path bundle"_

A6 pattern provato 5x scalabile (starter-biomas + role-demands + aliena + status/biome + ennea). Coop infra COMPLETO. Balance ecosystem reinforced + design-space ionico activated. Prossima frontiera: P6 calibration verification post-nerf + P5 playtest live.

---

### 📌 Stato pilastri + sprint-context storico (consolidato 2026-06-01)

> **Pillar status runtime (SOT canonical)** = [`docs/reports/PILLAR-LIVE-STATUS.md`](docs/reports/PILLAR-LIVE-STATUS.md) — NON le tabelle inline (driftavano su 3 superfici). Definizione P1-P6 = [`docs/core/02-PILASTRI.md`](docs/core/02-PILASTRI.md).
> **Sprint-context storico** (v44.2 → 2026-04-20 + pillar reality-audit) archiviato in [`docs/planning/sprint-context-history.md`](docs/planning/sprint-context-history.md). Solo la sezione corrente (v44.3, sopra) resta qui.
> Anti-drift #19: pillar status hand-attested in UN file (SOT) + freshness gate (#2489). Vedi [`docs/guide/roadmap-intervention.md`](docs/guide/roadmap-intervention.md).

---

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
