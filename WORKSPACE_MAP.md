# WORKSPACE_MAP — Evo-Tactics ecosystem

> **Scope**: mappa fisica COMPLETA dell'ecosystem (non solo `gioco/`). Risponde a "dove sta X, che ruolo ha, qual è l'entry point?". Audit a fondo 2026-04-25 post user feedback "non c'è punto chiaro di ingresso".
> **Aggiornato**: 2026-04-25
> **Sorgenti**: filesystem-wide grep (`Dafne`, `Game*`, `swarm*`, `aa01`, `.openclaw`) + `gh repo list MasterDD-L34D` + `git remote -v` cross-check + content lettura README/CLAUDE/INDEX di ogni progetto.

---

## TL;DR

L'ecosystem Evo-Tactics è composto da **4 GitHub repo core + 3 progetti AI satelliti + 2 location parallele di lavoro**. Non è solo `gioco/`. Game (runtime) si parla con Game-Database (CMS) via build-time + HTTP Alt B. **Dafne** (AI agent standalone con widget Tauri) ospita il **evo-swarm** (repo separato MasterDD-L34D/evo-swarm) che produce artifact staged in `Game/incoming/swarm-candidates/` per review umana prima di promozione canonical. AA01 (Archon Atelier) e OpenClaw sono runtime cognitivi paralleli che orchestrano Dafne + altri agent.

---

## 🗺️ Topologia COMPLETA per location

### Primary workspace `C:/Users/edusc/Desktop/gioco/` (post cleanup 2026-04-25)

| Slot                      | Path                                               | Tipo               | Stato                                                         |
| ------------------------- | -------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| **Game** (questo)         | `gioco/Game/`                                      | Monorepo polyglot  | 🟢 runtime canonical Evo-Tactics (Express + Vue + YAML + CLI) |
| `_archive/`               | `gioco/_archive/2026-04-20-codemasterdd-handoffs/` | Storico            | 🟢 6 zip storici codemasterdd (declutter post 2026-04-25)     |
| `codemasterdd-ai-station` | `gioco/codemasterdd-ai-station/`                   | Archivio operativo | 🟢 Sprint 0+1 integrati (PR #1732 2026-04-24)                 |
| `aider-tty-test`          | `gioco/aider-tty-test/`                            | Sandbox            | 🟢 isolato                                                    |
| `scratch`                 | `gioco/scratch/`                                   | Scratch ephemeral  | 🟢                                                            |
| `game-swarm-package.zip`  | `gioco/`                                           | Zip starter swarm  | 🟡 NOT estratto (deferred post-MVP, vedi Game Swarm)          |

> **synesthesia** spostato 2026-04-25 a `~/Documents/UPO/synesthesia/` (UPO esame, NON Evo-Tactics).

### `C:/Users/edusc/Documents/`

| Slot              | Path                              | Stato                                                 |
| ----------------- | --------------------------------- | ----------------------------------------------------- |
| **Game-Database** | `Documents/GitHub/Game-Database/` | 🟢 sibling CMS taxonomy, clonato 2026-04-25, smoke OK |
| `synesthesia`     | `Documents/UPO/synesthesia/`      | 🟢 spostato 2026-04-25 (esame UPO, standalone)        |

### `C:/Users/edusc/Dafne/` — AI Agent standalone (81MB)

| Slot                         | Path                     | Tipo                          | Note                                                                            |
| ---------------------------- | ------------------------ | ----------------------------- | ------------------------------------------------------------------------------- |
| `agent/`                     | `Dafne/agent/`           | Auth profiles + models config | Active (auth-profiles.json, auth-state.json, models.json + backup 2026-04-25)   |
| **`workspace/`**             | `Dafne/workspace/`       | Dafne working files           | IDENTITY.md, MEMORY.md, SOUL.md, AGENTS.md, voice-models, skills, test_trait.py |
| **`workspace/swarm/`**       | `Dafne/workspace/swarm/` | **evo-swarm repo clonato**    | 🟢 GitHub `MasterDD-L34D/evo-swarm` HEAD `25c148b`                              |
| `widget-tauri/`              | `Dafne/widget-tauri/`    | Desktop widget (Tauri Rust)   | dist + src-tauri (compiled?)                                                    |
| `start-dafne.cmd`            | `Dafne/`                 | Launcher Windows              | Backup 2026-04-25                                                               |
| `make-{dafne,swarm}-icon.py` | `Dafne/`                 | Build script .ico             | Source per dafne.ico + swarm.ico                                                |

### `C:/Users/edusc/aa01/` — Archon Atelier 01 (multi-agent cognitive studio)

| Slot                                                  | Path                 | Note                                                                                    |
| ----------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `archon/`                                             | `aa01/archon/`       | Orchestratore 12 strati, 7 ruoli universali, Pattern E (eredita ARCHON v2.0.2 + A00 v2) |
| `inbox/`                                              | `aa01/inbox/`        | Capture zone                                                                            |
| `workspace/`                                          | `aa01/workspace/`    | Lavoro attivo (es. `2026-04-aa01-001-2026-04-25-voice-test-protocol-dafne/`)            |
| `archive/`                                            | `aa01/archive/`      | Lavori chiusi                                                                           |
| `decision-log/`                                       | `aa01/decision-log/` | ADR cognitive                                                                           |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CHANGELOG.md` | `aa01/`              | Onboarding multi-AI (last update 2026-04-25 03:56)                                      |

**Status**: 🟢 attivo (CHANGELOG aggiornato 2026-04-25). NON git repo locally, archivio personale. Versione 1.0.0.

### `C:/Users/edusc/.openclaw/` — OpenClaw runtime (active)

| Slot                       | Note                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents/dafne`             | Dafne agent profile (gestito anche da OpenClaw, NON solo da `Dafne/`)                                                                        |
| `subagents/`               | Subagent definitions                                                                                                                         |
| `sandboxes/`               | Sandbox per agenti (es. `agent-dafne-c52ca5e1`)                                                                                              |
| `skills/`                  | Skill definitions                                                                                                                            |
| `memory/dafne.sqlite`      | Memory persistente Dafne                                                                                                                     |
| `telegram/`, `qqbot/`      | Integration bot                                                                                                                              |
| `workspace/`               | Template generico OpenClaw (IDENTITY.md "Fill this in during first conversation"). NON è Dafne workspace — quello è in `~/Dafne/workspace/`. |
| `openclaw.json` + 8 backup | Config attivo (last modify 2026-04-24 20:24)                                                                                                 |

**Status**: 🟢 attivo runtime (config touched 2026-04-24, multipli `openclaw.json.clobbered.*` indicano rescue tracking). Coordina Dafne agent.

### Desktop `C:/Users/edusc/Desktop/` — entrypoint diretti

| File                                           | Tipo                     | Note                                                                                                                                                                                                |
| ---------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`WRITE-ACCESS-POLICY.md`**                   | Canonical governance doc | 🟢 `source_of_truth: true` — define se/quando/come/quanto un agente swarm può scrivere su repo. Doc anticipato pre-prima esperienza, review cycle "dopo ogni promozione di livello, o ogni 3 mesi". |
| `Swarm AI Dashboard.url`                       | Browser bookmark         | Local dashboard `http://127.0.0.1:5000` (Dafne swarm runtime UI)                                                                                                                                    |
| `Dafne.lnk` + `Dafne Widget.lnk` + `Swarm.lnk` | Launcher shortcuts       | Shortcut Windows verso `~/Dafne/start-dafne.cmd` + widget Tauri                                                                                                                                     |
| `Claude Code.lnk`                              | Launcher                 | Claude Code CLI shortcut                                                                                                                                                                            |
| `Docker Desktop.lnk`                           | Launcher                 | Docker Desktop shortcut                                                                                                                                                                             |
| `files.zip`                                    | Zip generic              | Da non confondere con `gioco/_archive/.../files.zip` (era stesso o copia, archiviare se utile)                                                                                                      |

### `C:/dev/` — Location alternativa lavoro

| Slot                      | Path                              | Stato vs primary                                                                                                                                                                                                                            |
| ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Game**                  | `C:/dev/Game/`                    | 🟡 SECONDO checkout Game su branch `swarm/register-biome-gameplay-integrator-2026-04-24`, 121 commits behind main, uncommitted changes (agents_index.json + flint-status.json). Probabile working copy abbandonato post-merge swarm staging |
| `synesthesia`             | `C:/dev/synesthesia/`             | 🟡 TERZA copia synesthesia (identica `~/Documents/UPO/synesthesia/`, candidato cleanup)                                                                                                                                                     |
| `codemasterdd-ai-station` | `C:/dev/codemasterdd-ai-station/` | 🟡 SECONDO clone (stesso remote di `gioco/codemasterdd-ai-station/`)                                                                                                                                                                        |
| `AA01`                    | `C:/dev/AA01/`                    | 🟡 Versione tarball-based (aa01.tar.gz + AGENTS/GUIDE/README), diversa da `~/aa01/`                                                                                                                                                         |
| `aider-tty-test`          | `C:/dev/aider-tty-test/`          | 🟡 Duplicato di `gioco/aider-tty-test/`                                                                                                                                                                                                     |
| `backup-20260419-0518/`   | `C:/dev/backup-20260419-0518/`    | Snapshot                                                                                                                                                                                                                                    |
| `scratch/`, `null/`       | `C:/dev/`                         | Scratch (contiene anche `awesome-claude-code-toolkit/` clone `rohitg00/awesome-claude-code-toolkit` — toolkit Claude Code esterno: agents, commands, contexts, hooks, mcp-configs. Reference, NON parte ecosystem Evo-Tactics)              |

**Raccomandazione**: `C:/dev/` contiene principalmente checkout duplicati. Decidere fate (consolidare o purgare) per evitare path-confusion. Path canonical da preferire:

- Game → `gioco/Game/` (worktrees attivi qui)
- synesthesia → `~/Documents/UPO/synesthesia/` (post move)
- codemasterdd-ai-station → `gioco/codemasterdd-ai-station/` (Sprint integrato)
- AA01 → `~/aa01/` (CHANGELOG attivo, archon completo)

---

## 🐙 Ecosystem GitHub (org `MasterDD-L34D`, 13 repo totali)

### Core Evo-Tactics (4 repo)

| Repo                        | Ruolo                                                        | Local checkout                                                              | Stato     |
| --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- | --------- |
| **Game**                    | Runtime tactical co-op + dataset YAML                        | `gioco/Game/` (primary) + `C:/dev/Game/` (stale)                            | 🟢 active |
| **Game-Database**           | Taxonomy CMS Prisma + Postgres + React                       | `~/Documents/GitHub/Game-Database/`                                         | 🟢 active |
| **evo-swarm**               | Dafne AI swarm (orchestrator + agents specialist via Ollama) | `~/Dafne/workspace/swarm/`                                                  | 🟢 active |
| **codemasterdd-ai-station** | Archivio operativo prompt + bootstrap kit                    | `gioco/codemasterdd-ai-station/` + `C:/dev/codemasterdd-ai-station/` (dupe) | 🟢 active |

### Tangenziali / personali (9 repo)

| Repo                       | Ruolo                                                              | Note                                    |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| `synesthesia`              | Esame universitario UPO 2025-26 (Prisma Interiore 9 archetipi)     | NON Evo-Tactics, condivide solo concept |
| `vault`                    | Personal Obsidian vault (ACCESS + Karpathy LLM-wiki overlay)       | Knowledge personale                     |
| `compass-marketplace`      | Marketplace skill `compass:*` (in `.claude/plugins/marketplaces/`) | Plugin Claude Code                      |
| `Master-DD-Pathfinder-GPT` | GPT modulare Pathfinder                                            | Esterno Evo-Tactics                     |
| `pathfinder-1e-homebrew`   | Pathfinder 1e custom rules                                         | RPG tabletop personale                  |
| `torneo-cremesi-site`      | Sito statico torneo Cremesi (PF1e)                                 | Standalone                              |
| `Item-generator`           | (no description)                                                   | Utility                                 |
| `Gpt`                      | "per il gpt"                                                       | Storico                                 |
| `LeaD`                     | "Una prova"                                                        | Test repo                               |

---

## 🔄 Relazioni runtime

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│     ┌─────────────┐     build-time evo:import      ┌───────────────────┐ │
│     │             │ ─────────────────────────────► │                   │ │
│     │   Game/     │                                │  Game-Database/   │ │
│     │ (runtime)   │ ◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  (taxonomy CMS)   │ │
│     │             │   HTTP Alt B (flag-OFF)        │                   │ │
│     └──────▲──────┘   GET /api/traits/glossary     └───────────────────┘ │
│            │                                                             │
│            │ artifacts staged in                                          │
│            │ incoming/swarm-candidates/                                   │
│            │                                                             │
│     ┌──────┴──────────┐                                                  │
│     │  evo-swarm      │ ◄── ospitato in ~/Dafne/workspace/swarm/         │
│     │  (Dafne swarm)  │                                                  │
│     │  Ollama+CAMEL   │                                                  │
│     └────────▲────────┘                                                  │
│              │                                                           │
│              │ orchestrato da                                            │
│              │                                                           │
│     ┌────────┴────────┐         ┌─────────────────┐                      │
│     │  Dafne agent    │ ◄────── │  OpenClaw       │                      │
│     │  (.openclaw +   │         │  runtime        │                      │
│     │   ~/Dafne/agent)│         │  (~/.openclaw)  │                      │
│     └─────────────────┘         └─────────────────┘                      │
│                                                                          │
│     ┌─────────────────┐         ┌─────────────────┐                      │
│     │  AA01 cognitive │         │  codemasterdd-  │                      │
│     │  studio         │         │  ai-station     │                      │
│     │  (~/aa01)       │         │  (archivio)     │                      │
│     └─────────────────┘         └─────────────────┘                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Workspace fisico:
~/Desktop/gioco/Game             ← Game runtime (worktrees attivi qui)
~/Documents/GitHub/Game-Database ← Game-Database CMS
~/Documents/UPO/synesthesia      ← UPO esame (parcheggiato fuori scope)
~/Dafne/                         ← Dafne agent + widget + swarm clone
~/aa01/                          ← AA01 cognitive studio
~/.openclaw/                     ← OpenClaw runtime config + sandboxes
C:/dev/                          ← Location alternativa, mostly duplicati
```

---

## 🚦 Decisioni rapide

- **"Voglio cambiare un trait runtime"** → `Game/data/core/traits/active_effects.yaml` + `npm run sync:evo-pack`. Game-Database lo riceve via `npm run evo:import` lato CMS.
- **"Voglio batch-generare contenuti via swarm"** → swarm già live in `~/Dafne/workspace/swarm/` (repo evo-swarm). Output va in `Game/incoming/swarm-candidates/<topic>/<name>.yaml` con `provenance:`. Eduardo review → promozione `data/core/*`.
- **"Voglio testare una nuova abilità Dafne"** → `~/Dafne/workspace/test_trait.py` o subagent OpenClaw in `~/.openclaw/subagents/`.
- **"Voglio prompt riusabile"** → archivio in `gioco/codemasterdd-ai-station/02_LIBRARY/` o `Game/.claude/prompts/`.
- **"Voglio cambiare voce Dafne"** → `~/Dafne/workspace/voice-models/` o `~/aa01/workspace/2026-04-aa01-001-2026-04-25-voice-test-protocol-dafne/`.
- **"Voglio attivare Game-Database HTTP runtime"** → `GAME_DATABASE_ENABLED=true` + `GAME_DATABASE_URL=http://localhost:3333` in Game `.env`. Validato 2026-04-25 end-to-end.

---

## 🧹 Cleanup TODO + raccomandazioni

- [ ] **C:/dev/Game** → decidere: branch `swarm/register-biome-gameplay-integrator-2026-04-24` 121 commits behind main + uncommitted changes. Se lavoro abbandonato, eliminare. Se ancora utile, rebase + push o merge in main.
- [ ] **C:/dev/synesthesia** → duplicato di `~/Documents/UPO/synesthesia/`. Eliminare dopo verifica.
- [ ] **C:/dev/codemasterdd-ai-station** → duplicato di `gioco/codemasterdd-ai-station/`. Eliminare o tenere come backup esplicito.
- [ ] **C:/dev/AA01** vs `~/aa01/` → versione tarball vs versione live. Decidere quale è canonical.
- [ ] **C:/dev/aider-tty-test** → duplicato di `gioco/aider-tty-test/`.
- [ ] **`game-swarm-package.zip`** → estrarre a `C:/dev/game-swarm/` SE si vuole un secondo swarm separato da Dafne (o lasciare zippato — Dafne swarm è già il runtime live).
- [ ] **Cross-link bidirezionali**: scrivere `WORKSPACE_MAP.md` simmetrici anche in `Game-Database/` (✅ done 2026-04-25), `evo-swarm/`, `Dafne/`, `aa01/` se sviluppo attivo.

---

## ✅ Validazione end-to-end (2026-04-25)

| Check                                     | Esito                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Game-Database `docker compose up`         | 🟢 Postgres :5433 healthy                                                                   |
| Game-Database `npm run dev:setup`         | 🟢 2 migrations + seed (200 record / 4 trait / 4 biomi / 3 specie / 3 ecosistemi)           |
| Game-Database `npm run dev`               | 🟢 server :3333 + 4 endpoint canonical 200 OK                                               |
| Game `GAME_DATABASE_ENABLED=true` runtime | 🟢 backend :3344 fetcha glossary da Game-Database (log conferma "HTTP integration ENABLED") |
| evo-swarm clone                           | 🟢 in `~/Dafne/workspace/swarm/`, HEAD `25c148b`                                            |
| OpenClaw runtime                          | 🟢 config `openclaw.json` aggiornato 2026-04-24                                             |
| AA01 cognitive studio                     | 🟢 CHANGELOG aggiornato 2026-04-25                                                          |

---

## 🔗 Cross-link

- `LIBRARY.md` § Workspace topology — entry-point compatto
- `PROJECT_BRIEF.md` § Identità — riferimento sibling Game-Database
- `docs/adr/ADR-2026-04-14-game-database-topology.md` — ADR canonical Game ↔ Game-Database
- `Game-Database/WORKSPACE_MAP.md` — pendant simmetrico (cross-link bidirezionale ✅)
- `incoming/swarm-candidates/README.md` — workflow swarm → Game integration
- `~/Dafne/workspace/swarm/INDEX.md` — entry-point Dafne swarm (per Eduardo / per Dafne / per agent specialist)
- `~/aa01/README.md` — quickstart Archon Atelier
- `~/.openclaw/openclaw.json` — runtime config (NON edit a mano)
