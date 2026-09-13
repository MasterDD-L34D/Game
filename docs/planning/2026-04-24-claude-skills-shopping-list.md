---
title: Claude Code Skills & Plugins Shopping List
workstream: cross-cutting
status: draft
owners:
  - eduardo
created: 2026-04-24
updated: 2026-04-24
audience:
  - claude-code-users
  - devops
  - game-designers
tags:
  - claude-code
  - skills
  - plugins
  - mcp
  - tooling
  - shopping-list
summary: >
  Curated inventory of Claude Code skills, plugins, MCP servers, SDK agents, and hooks
  evaluated for Evo-Tactics monorepo needs (game content validation, combat balance audits,
  species/trait taxonomy, co-op network testing, YAML schema lints, Playwright UI smoke,
  orchestrator pool monitoring, sprint close DoD). Recommendations prioritized P0/P1/P2.
  NOT installed — requires user approval.
---

# Claude Code Skills & Plugins — Shopping List (Evo-Tactics)

**Scope**: inventario recente (Q1-Q2 2026) di skills, plugin, MCP server, SDK agent e hook configurabili in Claude Code, filtrati per utilità concreta sul monorepo Evo-Tactics (Node + Python + YAML + Prisma + Vue dashboard + Playwright + co-op WebSocket).

**Non ancora installato**: questa è shopping list per approvazione. Niente `/plugin install` eseguito.

**Già presenti nell'ambiente** (esclusi da questa lista): superpowers-adjacent `anthropic-skills:*`, design plugin suite, `authority-check/catalog-sync/combat-sim/docs-govern/trait-lint/sprint-close/pr-prepare/meta-checkpoint/monitor` local skills, `update-config/keybindings-help/simplify/less-permission-prompts/loop/schedule/claude-api` settings skills.

---

## Top 5 Recommendations (install first)

Ranked per ROI sul progetto concreto. Tutti P0.

1. **`@modelcontextprotocol/server-filesystem`** — governance + audit veloci su tree polyglot (Node + Python + YAML). Base necessario, reference server ufficiale Anthropic. [Source](https://github.com/modelcontextprotocol/servers)
2. **`@modelcontextprotocol/server-git` + `server-github`** — già usi `gh` CLI; MCP server aggiungono semantic diff per review veloce pre-PR e issue triage batch. [Source](https://github.com/modelcontextprotocol/servers)
3. **`superpowers` plugin (Jesse Vincent / obra)** — 14 skill agentici, disciplina clarify→design→plan→code→verify. -14% token medio, -40-60% su refactor multi-file. Directamente applicabile al tuo sprint workflow (M11/M12/M13 hanno molti branch paralleli). [Source](https://github.com/obra/superpowers)
4. **`Game Balance & Economy Tuning` skill (mcpmarket.com)** — fit diretto per iter1-iter7 hardcore calibration, Pillar 6 (Fairness), tuning `data/core/`. Systematic framework per mechanics tuning. [Source](https://mcpmarket.com/tools/skills/game-balance-economy-tuning)
5. **`serena` MCP server (oraios)** — semantic code retrieval + persistent memory cross-session su monorepo 700K+ LOC. Salva tokens enormi rispetto a `grep + Read` batch. [Source](https://github.com/oraios/serena)

**Razionale combinato**:

- filesystem + git/github MCP coprono i gap ops (pre-commit, diff review, PR prep)
- superpowers impone disciplina TDD/brainstorm (già gate del DoD sprint, ma self-enforced)
- game-balance skill allinea lavoro post-M13 Phase B (calibration harness hardcore 07)
- serena è il single biggest token optimization per un monorepo poliglotta come il tuo (session.js 1967 LOC, tanti file 500+ LOC)

**Prerequisito**: nessuna nuova npm dep nel package.json del progetto — MCP server girano fuori banda in `.mcp.json` a livello utente, non intaccano `npm ci`.

---

## Full Inventory (grouped by category)

### 1. MCP Servers (runtime context connectors)

#### 1.1 `@modelcontextprotocol/server-filesystem` — P0

- **Install**: aggiungi a `.mcp.json`:
  ```json
  {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/Users/edusc/Desktop/gioco/Game"]
    }
  }
  ```
- **What**: read/write/edit/search file locali con scope directory-limited (sicuro).
- **Why Evo-Tactics**: baseline per workflow agentico su monorepo polyglot. Evita bash grep ripetuti (cache friendly), scope-limited riduce rischio di toccare file fuori repo.
- **Source**: https://github.com/modelcontextprotocol/servers

#### 1.2 `@modelcontextprotocol/server-git` — P0

- **Install**: `uvx mcp-server-git --repository /path/to/Game` (Python) o npm equivalent
- **What**: git read/search/blame/log tools senza shell overhead.
- **Why Evo-Tactics**: sprint close DoD richiede `git status` clean + commit tidy. MCP git evita shell round-trip per diff semantici su PR review. Utile per "trova quando è stato introdotto X" su 1700+ PR.
- **Source**: https://github.com/modelcontextprotocol/servers/tree/main/src/git

#### 1.3 `@modelcontextprotocol/server-github` — P0

- **Install**: `npx -y @modelcontextprotocol/server-github` + `GITHUB_PERSONAL_ACCESS_TOKEN` env.
- **What**: PR/issue/workflow run/release management via API, non gh CLI.
- **Why Evo-Tactics**: sprint workflow coinvolge 20+ PR/settimana (sessione 17-18/04 = 22 PR). Batch triage issue, auto-assign workstream labels, PR diff readonly. Copre `make update-tracker` gap.
- **Source**: https://github.com/modelcontextprotocol/servers/tree/main/src/github

#### 1.4 `serena` MCP (oraios) — P0

- **Install**: `uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project /path/to/Game` + add to `.mcp.json`
- **What**: semantic code retrieval (LSP-backed), persistent memory cross-session, symbol-aware edit. Supporta TS, Python, Go, Rust.
- **Why Evo-Tactics**: token optimization guide in CLAUDE.md elenca `session.js` (1967 LOC), `EVO_FINAL_DESIGN_*.md` (836KB) come "do not read full". Serena risolve via symbol search. Persistent memory elimina re-read CLAUDE.md ogni sessione.
- **Caveat**: bug memoria ~30GB in SSE mode (issue #944, gen 2026) — usa stdio mode solo, non SSE.
- **Source**: https://github.com/oraios/serena

#### 1.5 `context7` MCP — P1

- **Install**: `npx -y @upstash/context7-mcp` + add to `.mcp.json`
- **What**: docs up-to-date di librerie popolari (inkjs, xstate, colyseus, prisma, ws, playwright) via API.
- **Why Evo-Tactics**: dipendenze recenti (`xstate@5`, `inkjs`, `ws@8.18.3`, Colyseus deferred) hanno docs in evoluzione. Context7 evita drift "Claude knowledge cutoff" su API.
- **Source**: https://github.com/upstash/context7

#### 1.6 `@modelcontextprotocol/server-fetch` — P1

- **Install**: `uvx mcp-server-fetch` (Python)
- **What**: HTTP fetch con HTML→markdown conversion, rate-limited.
- **Why Evo-Tactics**: alternativa a `WebFetch` built-in per research su AncientBeast/Wesnoth/XCOM design patterns (già fatti, ma recurring). Anche utile per GitHub API raw non coperto da gh.
- **Source**: https://github.com/modelcontextprotocol/servers/tree/main/src/fetch

#### 1.7 `playwright-mcp` (microsoft) — P1

- **Install**:
  ```json
  {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
  ```
- **What**: browser automation via accessibility snapshot (non screenshot). Auto-install browser binaries al primo uso.
- **Why Evo-Tactics**: hai già Playwright in `tools/ts/` + `apps/play/` smoke tests. MCP server permette a Claude di debuggare il lobby WebSocket flow live (Phase B+ e2e test in real browser) senza scrivere `page.locator()` manualmente. Copre `TKT-M11B-06 playtest live` prep.
- **Source**: https://github.com/microsoft/playwright-mcp

#### 1.8 `puppeteer-mcp` (modelcontextprotocol) — P2

- **Install**: `npx -y @modelcontextprotocol/server-puppeteer`
- **What**: alternative browser automation. Simile a Playwright MCP ma Chromium-only.
- **Why Evo-Tactics**: ridondante vs Playwright MCP se già lo usi; P2 solo se vuoi isolare test suite atlas dashboard (pre-built bundle in `docs/mission-console/`) da test co-op.
- **Source**: https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer

#### 1.9 `prisma-mcp` — P1

- **Install**: `npx -y prisma mcp` (built-in since Prisma v6.6.0)
- **What**: `migrate-status`, `migrate-dev`, `migrate-reset`, schema introspection via natural language.
- **Why Evo-Tactics**: già usi Prisma in `apps/backend/prisma/` + `scripts/db/run_migrations.py`. Adapter `FormSessionState` (migration 0003) e `UnitProgression` (0004) appena aggiunti. MCP accelera il prossimo batch Phase D follow-up senza shell wrappers.
- **Source**: https://www.prisma.io/docs/postgres/integrations/mcp-server

#### 1.10 `mcp-json-yaml-toml` (bitflight-devops) — P1

- **Install**: repo-local clone + register in `.mcp.json`
- **What**: query/modify JSON/YAML/TOML via `yq`, preserva commenti e struttura. Supporta SchemaStore.org + custom schemas.
- **Why Evo-Tactics**: i tuoi dataset sono 100% YAML (`data/core/traits/active_effects.yaml`, `data/core/progression/xp_curve.yaml`, 84 perks in `perks.yaml`, etc.). Script edit YAML tramite yq > Python script one-off. Schema validation pulita sotto AJV.
- **Source**: https://lobehub.com/mcp/bitflight-devops-mcp-json-yaml-toml

#### 1.11 `sequential-thinking` MCP — P2

- **Install**: `npx -y @modelcontextprotocol/server-sequential-thinking`
- **What**: framework thinking step-by-step con revisione/branch/refine del reasoning.
- **Why Evo-Tactics**: utile per debug complessi (es. Pillar 6 calibration deadlock multiplier knob exhausted) ma `meta-checkpoint` skill locale copre parzialmente. Dup evitabile.
- **Source**: https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking

#### 1.12 `pg-aiguide` MCP (timescale) — P2

- **Install**: `npx pg-aiguide-mcp`
- **What**: Postgres skill pack + docs per query optimization; superset di generic postgres MCP.
- **Why Evo-Tactics**: Prisma mcp già copre migration. pg-aiguide utile solo se espandi runtime analytics queries (non priority vs M12.D playtest).
- **Source**: https://github.com/timescale/pg-aiguide

---

### 2. Plugins (Claude Code Marketplace)

Tutti installabili via `/plugin install <name>@<marketplace>`. Marketplace default: `claude-plugins-official`.

#### 2.1 `superpowers@obra` — P0

- **Install**: `/plugin install superpowers@obra-superpowers` (accettato in claude-plugins-official Jan 2026) oppure `/plugin install superpowers@claude-plugins-official`
- **What**: 14 agentic skills: brainstorming, TDD red-green-refactor, code review pre-merge, systematic debugging, visual companion (HTML dashboard preview).
- **Why Evo-Tactics**: Sprint workflow DoD richiede "node --test verde + format:check verde + working tree pulito". TDD forza enforcing, auto code review blocca merge su regression. Brainstorming utile per design fase M13 P3 Phase B (perk wiring) e M12 Phase D playtest spec. -40-60% token su refactor multi-file = win per session.js split pattern.
- **Source**: https://github.com/obra/superpowers + https://claude.com/plugins/superpowers

#### 2.2 `feature-dev@anthropic` — P0

- **Install**: `/plugin install feature-dev@claude-plugins-official`
- **What**: trasforma feature brief in codice con processo strutturato (89K+ install, plugin più popolare 2026).
- **Why Evo-Tactics**: ogni sprint comincia con kickoff doc (es. `2026-04-25-next-session-kickoff-m13-phase-b.md`). `feature-dev` legge brief, decompone, implementa. Replica il pattern "golden path feature" che Codex ha.
- **Source**: https://github.com/anthropics/claude-plugins-official

#### 2.3 `frontend-design@anthropic` — P1

- **Install**: `/plugin install frontend-design@claude-plugins-official`
- **What**: UI production-grade, evita "AI slop" generico, typography/palette originale.
- **Why Evo-Tactics**: Mission Console è pre-built bundle esterno (`docs/mission-console/`), ma `apps/play/` + `apps/trait-editor/` + overlay (`onboardingPanel`, `formsPanel`, `progressionPanel`) sono custom Vue/vanilla. Skill utile per polish UI post-M11 (TKT-M11B-04 canvas TV widescreen già merged #1688, ma future overlay work).
- **Source**: https://github.com/anthropics/claude-plugins-official

#### 2.4 `unit-test-generator@jeremylongshore` — P1

- **Install**: `/plugin install unit-test-generator@community`
- **What**: auto-gen unit test Jest/Vitest/pytest con coverage analysis.
- **Why Evo-Tactics**: suite test già massive (725+ test aggregate). Skill utile per accelerare coverage su nuovi moduli (`rewardOffer.js` 12 test, `biomeSpawnBias.js` 14 test — standard pattern ma scriveva a mano). Integra con `npm run test:docs-generator` (vitest).
- **Source**: https://www.claudepluginhub.com/plugins/jeremylongshore-unit-test-generator-plugins-testing-unit-test-generator-3

#### 2.5 `wshobson/agents` plugin bundle — P1

- **Install**: `/plugin install wshobson-agents@wshobson-marketplace` (vari sotto-plugin, 78 totali)
- **What**: 184 specialized agents + 16 orchestrator + 150 skills + 98 commands. Modular: backend-architect, code-reviewer, security-auditor, test-automator, performance-engineer, debugger, dx-optimizer.
- **Why Evo-Tactics**: pick-and-choose: `code-reviewer` pre-merge, `security-auditor` su routes backend JWT, `test-automator` per colmare i 12 backlog ticket (TKT-06..11). Non installare bundle intero (150 skills = context overhead) ma cherry-pick.
- **Source**: https://github.com/wshobson/agents

#### 2.6 `agent-orchestrator@composio` — P2

- **Install**: clone https://github.com/ComposioHQ/agent-orchestrator + follow `README.md`
- **What**: Claude Code session parallele in git worktrees separati. Auto CI fix + merge conflict + review addressing. Agent-agnostic (Claude/Codex/Aider) + runtime-agnostic (tmux/Docker).
- **Why Evo-Tactics**: usi già git worktrees (current session è `.claude/worktrees/distracted-volhard-2f84a5/`). Orchestrator automatizza creation + dispatch, chiude PR quando CI verde. Adatto a sprint multi-feature (M13 P3 Phase B + P6 Phase B in parallelo = 2 worktree).
- **Source**: https://github.com/ComposioHQ/agent-orchestrator

#### 2.7 `prisma@anthropic` plugin — P1

- **Install**: `/plugin install prisma@claude-plugins-official`
- **What**: Prisma docs + best practice + workflow migration nativo.
- **Why Evo-Tactics**: duplica in parte `prisma-mcp` ma livello più alto (commands + skill ready). Installare insieme o alternativa — scegli uno.
- **Source**: https://claude.com/plugins/prisma

#### 2.8 `plugin-dev@anthropic` — P2

- **Install**: `/plugin install plugin-dev@claude-plugins-official`
- **What**: 7 expert skills per costruire plugin custom (hooks/MCP/commands/agents/validation/best-practices).
- **Why Evo-Tactics**: solo se intendi pacchettizzare le skill locali (`combat-sim`, `trait-lint`, `sprint-close`) come plugin condiviso. Altrimenti skip.
- **Source**: https://claude.com/plugins/plugin-dev

---

### 3. Game-Dev Specific Skills (mcpmarket.com)

#### 3.1 `Game Balance & Economy Tuning` skill — P0

- **Install**: via `claude-skill-installer` skill dopo averlo installato, o manual clone in `~/.claude/skills/`
- **What**: systematic framework per tuning items/weapons/economia/combat mechanics. Target: fair gameplay, meaningful choices.
- **Why Evo-Tactics**: Pillar 6 (Fairness) status 🟡+ con hardcore 06 iter3 e hardcore 07 pending calibration N=10. Skill rimpiazza il workflow ad-hoc con framework ripetibile. Allineato a `tools/py/batch_calibrate_hardcore07.py` come harness, skill come guida analitica.
- **Source**: https://mcpmarket.com/tools/skills/game-balance-economy-tuning

#### 3.2 `D20 Character Manager` skill — P1

- **Install**: clone GitHub + `~/.claude/skills/` o mcpmarket installer
- **What**: character lifecycle management d20 TTRPG: creazione, level-up, subclass, multiclassing validation.
- **Why Evo-Tactics**: stack è d20-based (rules engine Python deprecated, Node `apps/backend/services/combat/` canonical). Skill può guidare il design di `progressionEngine.js` + `perks.yaml` (84 perks 7 jobs × 6 livelli × 2). Non plug-and-play (logic è tua) ma utile come "lint" design-level.
- **Source**: https://mcpmarket.com/tools/skills/d20-character-manager

#### 3.3 `Game Design & Mechanics Framework` skill — P1

- **Install**: mcpmarket installer
- **What**: framework ampio per analisi meccaniche, tradeoff, coerenza sistemica.
- **Why Evo-Tactics**: copre gap "cosa testare prima di merge design" — Pillars audit 2026-04-20 (6 livelli di verità) è esattamente questo. Sinergico con `first-principles-game` anthropic skill che hai già.
- **Source**: https://mcpmarket.com/tools/skills/game-design-framework

#### 3.4 `Progression Systems` skill — P1

- **Install**: mcpmarket installer
- **What**: design patterns per XP curve, perk trees, skill ladder.
- **Why Evo-Tactics**: allineato a M13 P3 Phase B (XP grant hook + perk resolver wire). Skill come reference durante implementazione.
- **Source**: https://mcpmarket.com/tools/skills/game-progression-systems

#### 3.5 `Game Performance Optimizer` skill — P2

- **Install**: mcpmarket installer
- **What**: ottimizzazione render/memory/frame rate.
- **Why Evo-Tactics**: basso valore — non hai un game engine pesante, backend Express + Vue UI + canvas 2D (apps/play). P2 se in futuro muovi a canvas WebGL.
- **Source**: https://mcpmarket.com/tools/skills/game-performance-optimizer

---

### 4. SDK Agents (Claude Agent SDK patterns)

Questi non sono "install-once" come skill — sono pattern codificabili in subagent config (`.claude/agents/`).

#### 4.1 Explore-then-Act pattern — P0 (codificare)

- **What**: subagent "Explore" (readonly, research-heavy, big context) → return structured summary → main agent act. Pattern più comune in produzione.
- **Why Evo-Tactics**: già in uso informalmente (Task tool calls per grep + read batch). Codificare in `.claude/agents/explore.md` con tool restrictions (solo Read/Grep/Glob/WebSearch). Esempio: repo analysis batch (#1422-#1431) fatto 18 repo esterni — Explore subagent ideal.
- **Source**: https://platform.claude.com/docs/en/agent-sdk/subagents

#### 4.2 Layered Orchestrator (backend/SDK/frontend split) — P1

- **What**: main agent delega a sub-agent specializzati per layer isolato. Backend agent legge solo `apps/backend/**`, SDK agent `packages/contracts/**`, frontend agent `apps/play/**`. Parent coordina.
- **Why Evo-Tactics**: monorepo polyglot con 3 seam (contracts, backend, frontend) + Python bridge. Pattern evita context bloat "backend dev che legge Vue component inutile". Da codificare in `.claude/agents/{backend,frontend,contracts}.md` con tool + path restrictions.
- **Source**: https://www.channel.tel/blog/claude-code-subagents-orchestrator-pattern

#### 4.3 Parallel Specialists con MAX_ITERATIONS guardrail — P1

- **What**: multipli sub-agent in parallelo con hard limit MAX_ITERATIONS=8 + reflection prompt pre-retry ("What failed? What specific change would fix it? Am I repeating?").
- **Why Evo-Tactics**: parallelo su worktree (M12 Phase A + M13 P3 + M13 P6 contemporaneamente). Evita infinite loop su retry batch calibrate harness.
- **Source**: https://shipyard.build/blog/claude-code-multi-agent/

#### 4.4 Subagent Validation Gate — P1

- **What**: subagent "Reviewer" legge diff + test output + blocca merge su regressioni. Separato dal main agent.
- **Why Evo-Tactics**: DoD sprint include "format:check verde + test verde". Reviewer subagent enforce prima di PR open.
- **Source**: https://code.claude.com/docs/en/sub-agents

---

### 5. Hooks (guardrails automatici in `.claude/settings.json`)

#### 5.1 PreToolUse `pre-bash-guard.sh` — P0

- **Setup**: `update-config` skill per aggiungere a settings.json:
  ```json
  {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Bash",
          "hooks": [{ "type": "command", "command": "./scripts/hooks/pre-bash-guard.sh" }]
        }
      ]
    }
  }
  ```
  Script blocca `rm -rf`, `git push --force`, `git reset --hard`, leaked API keys, `| sh`.
- **Why Evo-Tactics**: CLAUDE.md elenca guardrail "non toccare `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`". Hook enforce automaticamente — non dipende da memoria Claude.
- **Source**: https://github.com/mafiaguy/claude-security-guardrails

#### 5.2 PostToolUse `format-on-edit` (Prettier) — P0

- **Setup**:
  ```json
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [{ "type": "command", "command": "npx prettier --write $CLAUDE_FILE_PATH" }]
        }
      ]
    }
  }
  ```
- **Why Evo-Tactics**: Husky pre-commit Prettier già attivo. Hook fa format inline → zero pre-commit failure (Edit → format → re-stage automatic). Accelera `npm run format:check` verde.
- **Source**: https://code.claude.com/docs/en/hooks-guide

#### 5.3 PostToolUse `lint-touched-files` — P1

- **Setup**: PostToolUse Write|Edit matcher → `scripts/lint-touched.sh` che rileva file path → lancia ESLint/Pylint/schema lint selettivo.
- **Why Evo-Tactics**: `npm run lint:stack` completo = 30s+. Lint solo file toccati = <2s. Stessa copertura, 10x più veloce.
- **Source**: https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns

#### 5.4 Stop hook `test-on-stop` (Node test + Python pytest) — P1

- **Setup**: Stop hook che rileva workstream toccato e lancia suite mirata (AI tests se toccato `apps/backend/services/ai/*`, rules tests se `services/rules/*`, etc.). Check `stop_hook_active` per evitare infinite loop.
- **Why Evo-Tactics**: DoD sprint include "node --test tests/ai/\*.test.js → verde". Hook enforce → chiude session solo quando verde. Previene "dimenticato test" pattern.
- **Source**: https://code.claude.com/docs/en/hooks

#### 5.5 PreToolUse `pre-commit-scan` (secrets) — P1

- **Setup**: PreToolUse su Bash matcher `git commit` → scan staged files per hardcoded secrets (AWS/JWT/OpenAI key regex).
- **Why Evo-Tactics**: CLAUDE.md enforce "do not commit `reports/backups/**`". Hook allarga a secret patterns generici.
- **Source**: https://github.com/mafiaguy/claude-security-guardrails

#### 5.6 SessionStart `load-sprint-context` — P2

- **Setup**: SessionStart hook legge `docs/planning/*next-session-kickoff*.md` e inietta come system message.
- **Why Evo-Tactics**: hai già pattern kickoff doc per ogni sprint. Hook automatizza caricamento. P2 perché `CLAUDE.md` Sprint context section copre già il caso principale.
- **Source**: https://smartscope.blog/en/generative-ai/claude/claude-code-hooks-guide/

---

### 6. Community Plugins / Marketplaces

Curated directory da monitorare.

#### 6.1 `claudemarketplaces.com`

- **What**: directory community-curated, 150+ skills Mar 2026. Rating + install count.
- **Why**: discovery runtime. Non installare nulla di diretto — usare come browse.
- **Source**: https://claudemarketplaces.com/

#### 6.2 `awesome-claude-skills` (travisvn) — `github.com/travisvn/awesome-claude-skills`

- **What**: lista awesome curata.
- **Source**: https://github.com/travisvn/awesome-claude-skills

#### 6.3 `awesome-claude-plugins` (ComposioHQ)

- **What**: curated list plugin-level (skill + agent + hook + MCP).
- **Source**: https://github.com/ComposioHQ/awesome-claude-plugins

#### 6.4 `awesome-claude-code-subagents` (VoltAgent)

- **What**: 100+ specialized subagents per dominio (ML, security, frontend, backend).
- **Why Evo-Tactics**: sinergico con pattern "Layered Orchestrator" (§4.2). Cherry-pick per sprint.
- **Source**: https://github.com/VoltAgent/awesome-claude-code-subagents

#### 6.5 `awesome-agent-skills` (VoltAgent)

- **What**: 1000+ skills cross-tool (Claude, Codex, Gemini CLI, Cursor). Universal format.
- **Source**: https://github.com/VoltAgent/awesome-agent-skills

---

### 7. TikTok / Creator Tooling (fuori-scope primario, segnalato)

Richiesta specifica nel prompt utente, ma **non applicabile al repo Evo-Tactics** (è un monorepo di gioco, non content factory). Elenco minimo per completezza.

#### 7.1 `tiktok-mcp@composio` — P2

- **Install**: `npx composio-mcp tiktok`
- **What**: profile/analytics/post via TikTok API.
- **Why Evo-Tactics**: utile SOLO se marketing/dev-rel del gioco post-lancio. Non priority sprint.
- **Source**: https://composio.dev/toolkits/tiktok/framework/claude-code

#### 7.2 Creator workflow references

- Jesse Vincent (creator `superpowers`, obra on GitHub): https://blog.fsck.com/2025/10/09/superpowers/
- Boris Cherny (Claude Code creator): workflow secrets https://mindwiredai.com/2026/04/14/claude-code-creator-workflow-boris-cherny/
- Marco Lancini (Italian, security): setup 2026 https://blog.marcolancini.it/2026/blog-my-claude-code-setup/
- Pasquale Pillitteri (Italian, Claude Code educator): https://www.pasqualepillitteri.it/en/news/215/superpowers-claude-code-complete-guide

**Nota ricerca**: creator italiani TikTok-first per Claude Code sono rari. Marco Lancini e Pasquale Pillitteri sono i riferimenti principali italiani (blog-first, non TikTok). Anthropic non ha account TikTok dedicato ai dev.

---

## Priority Matrix

| #    | Name                                  | Cat            | Prio | Effort | ROI   |
| ---- | ------------------------------------- | -------------- | ---- | ------ | ----- |
| 1.1  | server-filesystem                     | MCP            | P0   | 5min   | ★★★★★ |
| 1.2  | server-git                            | MCP            | P0   | 5min   | ★★★★  |
| 1.3  | server-github                         | MCP            | P0   | 10min  | ★★★★  |
| 1.4  | serena                                | MCP            | P0   | 15min  | ★★★★★ |
| 2.1  | superpowers                           | Plugin         | P0   | 5min   | ★★★★★ |
| 2.2  | feature-dev                           | Plugin         | P0   | 5min   | ★★★★  |
| 3.1  | Game Balance & Economy Tuning         | Skill (mcpmkt) | P0   | 10min  | ★★★★  |
| 5.1  | PreToolUse pre-bash-guard             | Hook           | P0   | 20min  | ★★★★  |
| 5.2  | PostToolUse format-on-edit            | Hook           | P0   | 10min  | ★★★★★ |
| 4.1  | Explore-then-Act subagent             | SDK pattern    | P0   | 15min  | ★★★★  |
| 1.5  | context7                              | MCP            | P1   | 5min   | ★★★   |
| 1.6  | server-fetch                          | MCP            | P1   | 5min   | ★★★   |
| 1.7  | playwright-mcp                        | MCP            | P1   | 10min  | ★★★★  |
| 1.9  | prisma-mcp                            | MCP            | P1   | 5min   | ★★★   |
| 1.10 | mcp-json-yaml-toml                    | MCP            | P1   | 10min  | ★★★★  |
| 2.3  | frontend-design                       | Plugin         | P1   | 5min   | ★★    |
| 2.4  | unit-test-generator                   | Plugin         | P1   | 10min  | ★★★   |
| 2.5  | wshobson/agents (cherry-pick)         | Plugin         | P1   | 30min  | ★★★★  |
| 2.7  | prisma                                | Plugin         | P1   | 5min   | ★★    |
| 3.2  | D20 Character Manager                 | Skill          | P1   | 10min  | ★★★   |
| 3.3  | Game Design & Mechanics               | Skill          | P1   | 10min  | ★★★   |
| 3.4  | Progression Systems                   | Skill          | P1   | 10min  | ★★★★  |
| 4.2  | Layered Orchestrator subagents        | SDK pattern    | P1   | 30min  | ★★★★  |
| 4.3  | Parallel Specialists + MAX_ITERATIONS | SDK pattern    | P1   | 20min  | ★★★   |
| 4.4  | Subagent Validation Gate              | SDK pattern    | P1   | 20min  | ★★★   |
| 5.3  | PostToolUse lint-touched              | Hook           | P1   | 30min  | ★★★★  |
| 5.4  | Stop hook test-on-stop                | Hook           | P1   | 45min  | ★★★★  |
| 5.5  | PreToolUse pre-commit-scan            | Hook           | P1   | 20min  | ★★★   |
| 1.8  | puppeteer-mcp                         | MCP            | P2   | 10min  | ★     |
| 1.11 | sequential-thinking                   | MCP            | P2   | 5min   | ★★    |
| 1.12 | pg-aiguide                            | MCP            | P2   | 10min  | ★★    |
| 2.6  | agent-orchestrator                    | Plugin         | P2   | 60min  | ★★★★  |
| 2.8  | plugin-dev                            | Plugin         | P2   | 5min   | ★★    |
| 3.5  | Game Performance Optimizer            | Skill          | P2   | 10min  | ★     |
| 5.6  | SessionStart load-sprint-context      | Hook           | P2   | 20min  | ★★    |
| 7.1  | tiktok-mcp                            | MCP            | P2   | 15min  | ★     |

**Totale P0**: 10 item, ~100min setup complessivo, ROI aggregato molto alto.
**Totale P1**: 17 item, ~260min setup, ROI medio-alto.
**Totale P2**: 8 item, ~135min setup, ROI basso o niche.

---

## Install Strategy (suggested order)

### Fase 1 — baseline MCP + safety (30min)

1. `.mcp.json`: filesystem + git + github (P0 MCP baseline)
2. `update-config` skill: aggiungi PreToolUse pre-bash-guard + PostToolUse format-on-edit hooks
3. Verifica: restart Claude Code, test hook con `touch test.md` + edit → Prettier eseguito auto

### Fase 2 — discipline + semantic (30min)

4. `/plugin install superpowers` + `/plugin install feature-dev`
5. `serena` MCP via uvx (stdio mode, no SSE)
6. Verifica: prossima sessione userà brainstorm+TDD pattern + symbol search

### Fase 3 — game-dev specific (20min)

7. `Game Balance & Economy Tuning` skill da mcpmarket
8. `Progression Systems` skill
9. Verifica: lancio calibration hardcore07 con guida skill

### Fase 4 — optional expansion (as needed)

- Playwright MCP prima di TKT-M11B-06 playtest live
- Prisma MCP prima del prossimo migration batch
- yaml-toml MCP quando si tocca `data/core/**` massivo

---

## Guardrail decisionali (come valutare skill futuri)

Domande da porsi prima install:

1. **Risolve un pain reale ricorrente?** (es. token burn su `session.js` = serena sì; sequential-thinking duplica meta-checkpoint = no)
2. **Sovrappone a skill esistente?** (es. `prisma@anthropic` plugin vs `prisma-mcp` — installare 1)
3. **Richiede nuove dep npm/pip nel repo?** Se sì → approvazione esplicita (CLAUDE.md guardrail)
4. **Rischio context bloat?** (es. wshobson 150 skills bundle — cherry-pick, non bulk)
5. **Affidabilità community (GitHub stars + issue attivi)?** (es. serena 10K+ stars OK, niche skill 5 stars = skip)

---

## Source index (master list)

### Official Anthropic

- Claude Code plugins official: https://github.com/anthropics/claude-plugins-official
- Plugin hub: https://claude.com/plugins
- Docs plugins: https://code.claude.com/docs/en/discover-plugins
- Docs hooks: https://code.claude.com/docs/en/hooks
- Docs subagents: https://code.claude.com/docs/en/sub-agents
- Docs skills: https://code.claude.com/docs/en/skills
- Docs MCP: https://code.claude.com/docs/en/mcp
- Agent SDK subagents: https://platform.claude.com/docs/en/agent-sdk/subagents

### MCP servers

- Official reference servers: https://github.com/modelcontextprotocol/servers
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Serena: https://github.com/oraios/serena
- Prisma MCP: https://www.prisma.io/docs/postgres/integrations/mcp-server
- Context7: https://github.com/upstash/context7
- yaml/toml/json MCP: https://lobehub.com/mcp/bitflight-devops-mcp-json-yaml-toml

### Plugin hubs

- claudemarketplaces.com: https://claudemarketplaces.com/
- claudepluginhub.com: https://www.claudepluginhub.com/
- mcpmarket.com skills: https://mcpmarket.com/tools/skills/
- aitmpl.com plugins: https://www.aitmpl.com/plugins/

### Awesome lists

- travisvn/awesome-claude-skills: https://github.com/travisvn/awesome-claude-skills
- ComposioHQ/awesome-claude-plugins: https://github.com/ComposioHQ/awesome-claude-plugins
- ComposioHQ/awesome-claude-skills: https://github.com/ComposioHQ/awesome-claude-skills
- VoltAgent/awesome-claude-code-subagents: https://github.com/VoltAgent/awesome-claude-code-subagents
- VoltAgent/awesome-agent-skills: https://github.com/VoltAgent/awesome-agent-skills
- rahulvrane/awesome-claude-agents: https://github.com/rahulvrane/awesome-claude-agents

### Specific plugins

- superpowers (obra): https://github.com/obra/superpowers + https://claude.com/plugins/superpowers
- wshobson/agents: https://github.com/wshobson/agents
- Composio agent-orchestrator: https://github.com/ComposioHQ/agent-orchestrator
- security-guardrails: https://github.com/mafiaguy/claude-security-guardrails

### Guides / reviews 2026

- Best Claude Code plugins 2026 (Composio): https://composio.dev/content/top-claude-code-plugins
- Superpowers review (Mejba): https://www.mejba.me/blog/superpowers-plugin-claude-code-review
- Superpowers review (Builder.io): https://www.builder.io/blog/claude-code-superpowers-plugin
- Hooks guide (Pixelmojo): https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns
- Marco Lancini setup 2026: https://blog.marcolancini.it/2026/blog-my-claude-code-setup/
- Pasquale Pillitteri superpowers guide: https://www.pasqualepillitteri.it/en/news/215/superpowers-claude-code-complete-guide
- TurboDocx best plugins 2026: https://www.turbodocx.com/blog/best-claude-code-skills-plugins-mcp-servers
- Morph LLM guide: https://www.morphllm.com/claude-code-skills-mcp-plugins
- dev.to raxxostudios guide: https://dev.to/raxxostudios/best-claude-code-skills-plugins-2026-guide-4ak4
- Snyk game dev skills: https://snyk.io/articles/top-claude-skills-3d-modeling-game-dev-shader-programming/

---

## Next step

1. Utente rivede priority matrix
2. Approva batch P0 (10 item, ~100min install + verify)
3. Eseguo install sequenza Fase 1→3 in ordine
4. Registro skill aggiunti in `docs/governance/docs_registry.json` se creano file markdown locali
5. Aggiorno CLAUDE.md sezione "Session workflow patterns" con nuovi skill/hook
