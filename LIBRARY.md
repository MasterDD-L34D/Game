# LIBRARY — Evo-Tactics Reference Index

> **Scope**: mappa dei sistemi esterni + repo studiati + tool + API usati nel progetto. Entrypoint veloce per "dove trovo X?".
> **Sorgente template**: `04_BOOTSTRAP_KIT/` archivio (campo `LIBRARY.md`).
> **Aggiornamento**: on-demand quando aggiungi una reference nuova o disattivi una vecchia.

---

## 📚 Archivio operativo esterno

**Path**: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`

**Cosa contiene**: libreria universale di prompt + bootstrap kit + Claude Code operating package + template riusabili + materiale sorgente (screenshot OCR).

**Struttura**: 7 subdir (00_START_HERE, 01_MASTER_INDEX, 02_LIBRARY, 03_REFERENCE, 04_BOOTSTRAP_KIT, 05_TEMPLATE_REALI_PROMPTATI, 06_WORKFLOWS_AND_CHECKLISTS, 07_CLAUDE_CODE_OPERATING_PACKAGE).

**Stato adoption Evo-Tactics**: Sprint 0 + 1 integrati 2026-04-24 (PR #1732). Dettagli: `docs/planning/2026-04-24-archivio-libreria-inventory.md` + memory `project_archivio_adoption_status.md`.

---

## 🎮 Repo esterni studiati (transfer plan sources)

> **Catalogo completo + ricerche**: vedi [`docs/guide/games-source-index.md`](docs/guide/games-source-index.md) — 70+ giochi/source/repo organizzati in 8 sezioni (S/A/B/C/D/E tier + anti-ref + persona) con depth indicator + path canonical + mappa pilastri → top-3.

| Repo/Gioco                                                     | Scope studiato                                                                                                                       | Doc riferimento                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Triangle Strategy** (Square Enix 2022)                       | Conviction system, terrain interaction, elevation+facing, initiative CT bar, AI threat preview                                       | `docs/research/triangle-strategy-transfer-plan.md`                                                |
| **Wesnoth** (Battle for Wesnoth)                               | Hex grid, unit advancement, recruit+retain economy                                                                                   | `docs/planning/SoT-v4` sezione deep dive wesnoth                                                  |
| **AncientBeast**                                               | Hex grid axial, reaction system                                                                                                      | SoT ADR-2026-04-16 grid hex axial                                                                 |
| **XCOM EU/EW**                                                 | Perk pair progression 7 levels × 2                                                                                                   | ADR-2026-04-17 xp-cipher, M13 P3 progression                                                      |
| **Long War 2**                                                 | Mission timers, pod count > HP philosophy                                                                                            | M13 P6 hardcore 07 design, ADR-2026-04-21                                                         |
| **Jackbox / XCOM 2 online**                                    | Host-authoritative room-code co-op, phone-as-controller                                                                              | ADR-2026-04-20 m11 Phase A, ADR-2026-04-17 coop-scaling                                           |
| **FFT (Final Fantasy Tactics)**                                | CT bar, Wait action, facing crit                                                                                                     | tradition reference, not direct-transfer                                                          |
| **Colyseus / Yuka / GOApy / UtilityAI / EasyStar / Honeycomb** | Networking + AI + pathfinding pattern                                                                                                | SoT deep dive v4                                                                                  |
| **Spore**                                                      | Emergent evolution via part/trait pack                                                                                               | Pilastro 2 inspiration (Form evolution M12)                                                       |
| **Fire Emblem**                                                | Permadeath + support conversations                                                                                                   | inspiration, not direct-transfer                                                                  |
| **Disco Elysium**                                              | Thought cabinet + diegetic personality reveal                                                                                        | Pilastro 4 MBTI/Ennea pattern, V1 onboarding 60s                                                  |
| **Voidling Bound** (Hatchery Games 2026)                       | Rarity-gated ability class unlock + element path-lock + Spliced terminal endpoint + 3-currency separation + visual change every tier | `docs/research/2026-04-26-voidling-bound-evolution-patterns.md` + museum M-2026-04-26-001 (P2+P3) |

---

## 📦 Online libraries shipped inline (Skiv-as-Monitor 2026-04-25)

> 3 industry pattern adopted **inline Python** (zero npm deps — vincolo CLAUDE.md). Combinatorial expansion + data-driven storylets + typed commit parser. Reference doc: [docs/research/2026-04-25-skiv-online-imports.md](docs/research/2026-04-25-skiv-online-imports.md).

| Library / Spec                                                                                                                 | License     | Pattern adopted                                                     | Adopted as                                                                                                                       | ROI |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --- |
| [tracery-grammar](https://www.npmjs.com/package/tracery-grammar) ([galaxykate/tracery](https://github.com/galaxykate/tracery)) | Apache 2.0  | Story-grammar `dict[symbol, list]` + `#sym#` reference + seeded RNG | `tools/py/skiv_tracery.py` — 218 LOC inline. **131→662 voci** combinatorial                                                      | 5/5 |
| [SimpleQBN](https://github.com/videlais/simple-qbn) (videlais)                                                                 | MIT         | Quality-Based Narrative storylets YAML + salience tie-break by id   | `tools/py/skiv_qbn.py` + `data/core/narrative/skiv_storylets.yaml` — 14 storylets data-driven, predicates gte/lte/eq/in          | 4/5 |
| [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)                                                    | Public spec | `<type>[(scope)][!]: <description>` regex + breaking change         | `parse_conventional_commit()` in `tools/py/skiv_monitor.py` — typed feat/fix/chore/docs/style/refactor/perf/test/build/ci/revert | 3/5 |

### Adopted post Master DD verdict 2026-04-26

| Library                                                                            | License          | Adopted as                                                                            |
| ---------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| [@octokit/webhooks](https://github.com/octokit/webhooks.js/)                       | MIT              | `apps/backend/routes/skiv.js` — webhook HMAC verify typed (octokit + inline fallback) |
| [@octokit/webhooks-types](https://www.npmjs.com/package/@octokit/webhooks-types)   | MIT              | TypeScript types reference future-proofing payload schema                             |
| [LPC Drakes and lizardfolk](https://opengameart.org/content/drakes-and-lizardfolk) | CC-BY-SA 3.0+GPL | `apps/play/public/skiv/raster/lpc/` 4 sprite + CREDITS.txt full attribution           |
| [OpenGameArt TL_Creatures CC0](https://opengameart.org/content/various-creatures)  | CC0              | `apps/play/public/skiv/raster/TL_Creatures.png` 7.2KB GrafxKid (PR #1849)             |

### Skipped (low ROI)

| Library                        | Skip reason                                      |
| ------------------------------ | ------------------------------------------------ |
| Storyboard (lazerwalker)       | Alpha, non su npm                                |
| TinyQBN                        | Twine/SugarCube specific (not standalone JS)     |
| Pixilart Tamagotchi sprites    | License unclear (UGC)                            |
| Freepik vectors                | Attribution required, non sempre commercial-safe |
| ChronicleHub QBN               | Not released open source                         |
| Tamagotchi On official sprites | Bandai copyright                                 |

---

## 🤖 Claude Code skills installate (40+)

**Built-in**: Explore, general-purpose, Plan, claude-code-guide, statusline-setup.

**Anthropic official**:

- `anthropic-skills:first-principles-game` — audit game repo first-principles
- `anthropic-skills:multi-ai-routing` — routing decisioni multi-AI
- `anthropic-skills:evo-tactics-monitor` — monitor progetto Evo-Tactics
- `anthropic-skills:game-repo-orchestrator` — bootstrap game repo + archivio
- `anthropic-skills:consolidate-memory` — memory cleanup + merge duplicates
- `anthropic-skills:mcp-builder` — build MCP servers
- `anthropic-skills:skill-creator` — creare/ottimizzare skills
- `anthropic-skills:docx|pptx|pdf|xlsx|canvas-design|algorithmic-art|theme-factory|brand-guidelines` — document + visual artifacts
- `anthropic-skills:internal-comms|doc-coauthoring|schedule|setup-cowork|slack-gif-creator` — comms + automation

**Design plugin suite** (design:\*):

- `design-critique`, `accessibility-review`, `ux-copy`, `research-synthesis`, `user-research`, `design-system`, `design-handoff`

**Repo-local** (`.claude/skills/`):

- `authority-check`, `catalog-sync`, `combat-sim`, `docs-govern`, `meta-checkpoint`, `monitor`, `pr-prepare`, `sprint-close`, `trait-lint`, `evo-tactics-monitor`, `sot-plan`
- **Nuova 2026-04-24**: `compact` (session handoff)

**Settings skills**: `update-config`, `keybindings-help`, `simplify`, `less-permission-prompts`, `loop`, `schedule`, `claude-api`

**Pendenti install** (da `docs/planning/2026-04-24-claude-skills-shopping-list.md` P0):

- `@modelcontextprotocol/server-filesystem`
- `@modelcontextprotocol/server-git + server-github`
- `superpowers` plugin (Jesse Vincent / obra)
- `Game Balance & Economy Tuning` skill
- `serena` MCP semantic retrieval

---

## 🔧 Subagent custom (`.claude/agents/`)

| Agent                                   | Scope                                                                          | File                                     |
| --------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| `balance-auditor`                       | Balance data analysis (trait_mechanics, species_resistances, ai_intent_scores) | `.claude/agents/balance-auditor.md`      |
| `migration-planner`                     | Prisma + data migrations cross-repo                                            | `.claude/agents/migration-planner.md`    |
| `schema-ripple`                         | Consumer tracing `packages/contracts/`                                         | `.claude/agents/schema-ripple.md`        |
| `session-debugger`                      | Session engine flow (round orchestrator + resolver + VC)                       | `.claude/agents/session-debugger.md`     |
| `sot-planner`                           | Source of Truth + external repos integration                                   | `.claude/agents/sot-planner.md`          |
| `species-reviewer`                      | Species JSON audit + catalog readiness                                         | `.claude/agents/species-reviewer.md`     |
| **`playtest-analyzer`** (2026-04-24)    | Telemetry + batch harness + historical fallback analysis                       | `.claude/agents/playtest-analyzer.md`    |
| **`coop-phase-validator`** (2026-04-24) | State machine M16-M20 + WS protocol invariants                                 | `.claude/agents/coop-phase-validator.md` |

---

## 🌐 Tools esterni

| Tool                   | Uso                                        | Accesso                                 |
| ---------------------- | ------------------------------------------ | --------------------------------------- |
| **Claude Code CLI**    | Implementazione + QA + docs principale     | Anthropic subscription                  |
| **ChatGPT**            | Brainstorm early-phase + narrative prompts | openai.com web                          |
| **NotebookLM**         | Corpus digest multi-fonte (research)       | notebooklm.google.com                   |
| **Codex GitHub bot**   | Daily tracker refresh auto                 | GitHub Actions                          |
| **gh CLI**             | PR + issue + release management            | `brew install gh` / `winget install gh` |
| **git + Git Bash**     | VCS + shell Unix-like su Windows           | git-scm.com                             |
| **npm + Node 22**      | Package manager + runtime Node             | nodejs.org                              |
| **Python 3.10+ + pip** | Validators, batch scripts, governance tool | python.org                              |
| **Prisma**             | ORM Postgres/SQLite                        | `npm i prisma @prisma/client`           |
| **Prettier**           | Code format (auto via Husky)               | devDependency                           |
| **Playwright**         | UI smoke tests (tools/ts)                  | devDependency                           |
| **AJV**                | JSON Schema validation                     | devDependency                           |

---

## 🔌 API esterne

| API               | Uso                                  | Auth                       |
| ----------------- | ------------------------------------ | -------------------------- |
| **Anthropic API** | Claude Code backend                  | Managed by Claude Code CLI |
| **OpenAI API**    | GPT-5 via ChatGPT web                | Managed by ChatGPT session |
| **GitHub API**    | PR + issue + release                 | `gh auth login`            |
| **ngrok**         | Playtest live tunnel (demo launcher) | `ngrok authtoken <token>`  |

Non in uso: Linear, Jira, Slack, Figma (possibili ma non configurati).

---

## 📝 File canonical del progetto

**Root**:

- `CLAUDE.md` — project overview + sprint context + guardrail + DoD
- `README.md` — user-facing entrypoint
- `PROJECT_BRIEF.md` — identità stabile progetto
- `COMPACT_CONTEXT.md` — snapshot sessione corrente
- `DECISIONS_LOG.md` — index 30 ADR
- `MODEL_ROUTING.md` — routing AI/tool per fase
- `LIBRARY.md` — questo file
- `PROMPT_LIBRARY.md` — entrypoint a `.claude/prompts/`

**.claude/**:

- `TASK_PROTOCOL.md` — 7-fasi task flow
- `SAFE_CHANGES.md` — whitelist cambi
- `agents/` — subagent custom (8)
- `skills/` — skill locali (11+)
- `prompts/` — prompt templates riusabili (4)
- `settings.json` — Claude Code config

**docs/**:

- `adr/` — architecture decision records (30)
- `core/` — canonical game design (numbered 01-40)
- `hubs/` — workstream entrypoints (combat, flow, atlas, backend, dataset-pack, ops-qa)
- `governance/` — docs registry + validator schema
- `planning/` — roadmap, ideas, handoff
- `research/` — deep-dive studies (e.g., Triangle Strategy)
- `playtest/` — playtest analysis reports
- `qa/` — QA reports + validation
- `process/` — sprint docs
- `reports/` — audit + refactor reports

**packs/evo_tactics_pack/**: Ecosystem Pack v1.7 (self-contained data + validators)

---

## 🧠 Memory cross-session (`~/.claude/projects/.../memory/`)

| File                                         | Tipo      | Scope                                     |
| -------------------------------------------- | --------- | ----------------------------------------- |
| `MEMORY.md`                                  | Index     | Entry point (auto-loaded)                 |
| `feedback_session_timing_reset.md`           | Feedback  | Hack #5 @okaashish session window reset   |
| `feedback_smoke_test_agents_before_ready.md` | Feedback  | Policy 4-gate DoD permanente              |
| `feedback_4gate_dod_application_pattern.md`  | Feedback  | Template concreto applicazione 4 gate     |
| `feedback_user_decision_shortcuts.md`        | Feedback  | "ok"/"cosa consigli"/"valuta tu" parsing  |
| `project_archivio_adoption_status.md`        | Project   | Stato adoption archivio (Sprint 0+1 done) |
| `reference_archivio_libreria_operativa.md`   | Reference | Path + struttura archivio esterno         |

---

## 🗺️ Workspace topology

`C:/Users/edusc/Desktop/gioco/` ospita Game (questo) + sibling Game-Database (CMS, da clonare) + game-swarm (AI swarm esterno, zip non estratto) + codemasterdd-ai-station (archivio) + synesthesia (progetto UPO separato, NON Evo-Tactics) + 7 zip + sandbox.

**Mappa fisica completa**: [`WORKSPACE_MAP.md`](WORKSPACE_MAP.md) — path, ruolo, stato adoption, entry point per ognuno + diagramma flussi + cleanup TODO.

---

## 🔗 Ref veloci

- **Cosa leggere prima**: `PROJECT_BRIEF.md` → `COMPACT_CONTEXT.md` → `CLAUDE.md`
- **Dove sta cosa nel workspace**: `WORKSPACE_MAP.md`
- **Prima di decidere**: `DECISIONS_LOG.md` + `docs/adr/`
- **Prima di scrivere codice**: `.claude/TASK_PROTOCOL.md` + `.claude/SAFE_CHANGES.md`
- **Prima di aggiungere agent/skill**: memory `feedback_smoke_test_agents_before_ready.md` (policy 4-gate DoD)
- **Prima di scegliere AI tool**: `MODEL_ROUTING.md`
- **Prima di usare prompt ripetuto**: `.claude/prompts/README.md`
