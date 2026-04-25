# WORKSPACE_MAP — Evo-Tactics ecosystem

> **Scope**: mappa fisica del workspace `C:/Users/edusc/Desktop/gioco/`. Risponde a "dove sta X, che ruolo ha, qual è l'entry point?".
> **Aggiornato**: 2026-04-25
> **Sorgenti**: filesystem `gioco/` + `PROJECT_BRIEF.md` + `LIBRARY.md` + `docs/adr/ADR-2026-04-14-game-database-topology.md` + `game-swarm-package/README.md`.

---

## TL;DR

`Game/` è il runtime. `Game-Database/` è il CMS taxonomy sibling (HTTP Alt B flag-OFF). `game-swarm/` è uno swarm AI esterno (Ollama+Aider+AG2) che produce artifact validati che il Game importa. `codemasterdd-ai-station/` è l'archivio operativo prompt+template. `synesthesia/` NON è Evo-Tactics (progetto universitario separato).

---

## 🗺️ Topologia repo (cartelle vive)

| Slot                        | Path locale                                             | Tipo               | Ruolo                                                                                                    | Stato adoption                                                                                                     | Entry point doc                                                                                                       |
| --------------------------- | ------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Game** (questo)           | `C:/Users/edusc/Desktop/gioco/Game/`                    | Monorepo polyglot  | Runtime canonical: backend Express + Vue dashboard + dataset YAML + CLI tools                            | 🟢 attivo, MVP M16-M20 chiuso, 411/411 test                                                                        | `PROJECT_BRIEF.md` → `COMPACT_CONTEXT.md` → `CLAUDE.md`                                                               |
| **Game-Database**           | `C:/Users/edusc/Documents/GitHub/Game-Database/`        | Sibling repo CMS   | Taxonomy CMS (Prisma + Postgres + Express + React MUI Tailwind TanStack Table) per glossary trait/specie | 🟢 clonato 2026-04-25 (branch `main`) · HTTP runtime Alt B scaffolded **flag-OFF** (`GAME_DATABASE_ENABLED=false`) | `Game-Database/README.md` + `Game-Database/CLAUDE.md` + `Game-Database/README_HOWTO_AUTHOR_TRAIT.md` + ADR-2026-04-14 |
| **codemasterdd-ai-station** | `C:/Users/edusc/Desktop/gioco/codemasterdd-ai-station/` | Archivio operativo | Prompt library + bootstrap kit + Claude Code operating package + template                                | 🟢 Sprint 0+1 integrati (PR #1732, 2026-04-24)                                                                     | `LIBRARY.md` § Archivio operativo + memory `reference_archivio_libreria_operativa.md`                                 |
| **synesthesia**             | `C:/Users/edusc/Desktop/gioco/synesthesia/`             | Progetto separato  | Esame universitario UPO 2025-26 (web app archetipi multimediali)                                         | ❌ **NON parte di Evo-Tactics**, condivide solo concept 9-archetipi                                                | `synesthesia/README.md` (autonomo, ignorare per Game)                                                                 |
| **aider-tty-test**          | `C:/Users/edusc/Desktop/gioco/aider-tty-test/`          | Sandbox            | Test Aider TTY pairing                                                                                   | 🟢 sandbox isolato, side-effect zero                                                                               | n/a                                                                                                                   |
| **scratch**                 | `C:/Users/edusc/Desktop/gioco/scratch/`                 | Scratch            | Spazio temporaneo                                                                                        | 🟢 ephemeral, nessun commit                                                                                        | n/a                                                                                                                   |

**Game-Database stack** (porte locali):

- Postgres (Docker compose): `localhost:5432` (host port 5433 raccomandato in CLAUDE.md per evitare collisione con Postgres Game)
- Server Express + Prisma: `http://localhost:3333` (`server/`)
- Dashboard React MUI: `http://localhost:5174` (`apps/dashboard/`)

**Bootstrap quick** (PowerShell, dal repo Game-Database):

```powershell
docker compose up -d                      # Postgres
Set-Location server; Copy-Item .env.example .env
npm install; npm run dev:setup; npm run dev   # API :3333
Set-Location ..\apps\dashboard; Copy-Item .env.local.example .env.local
npm install; npm run dev                  # UI :5174
```

---

## 📦 Zip non estratti (in `gioco/`)

| Zip                               | Contenuto stimato                                     | Decisione                                                                                 |
| --------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `game-swarm-package.zip`          | Starter pack swarm AG2/CAMEL + 3 docx + deep-research | Estrai a `C:/dev/game-swarm/` quando si attiva swarm AI esterno (vedi sezione Game Swarm) |
| `cm-agents-docs-batch2.zip`       | Batch 2 docs codemasterdd agent profiles              | Estrai dentro archivio `codemasterdd-ai-station/` se mai serve                            |
| `cm-agents-planning.zip`          | Planning docs codemasterdd agent                      | Idem                                                                                      |
| `codemasterdd-docs.zip`           | Docs misc codemasterdd                                | Probabile duplicato dell'archivio già adottato — verificare prima di estrarre             |
| `codex-update-for-claude-web.zip` | Handoff Codex bot ↔ Claude web                       | Reference storica, estrai solo se debug Codex                                             |
| `handoff-2026-04-21.zip`          | Snapshot handoff sessione 2026-04-21                  | Reference storica, archivio                                                               |
| `files.zip`                       | Generic dump                                          | **Lasciare zippato** finché non si conosce contenuto                                      |

---

## 🌐 Game Swarm (esterno, separato da Game/)

**Cos'è**: pacchetto AG2 (autogen) + CAMEL pattern per orchestrare un team di agenti AI locali (planner = `qwen3:8b`, coder = `qwen2.5-coder` via Ollama + Aider) che lavora SEPARATO dal repo Game.

**Filosofia**: il Game resta source-of-truth. Lo swarm comunica via **artifact validati** (JSON Schema, YAML) che vengono importati nel Game tramite adapter, non tramite edit diretti.

**Path target installazione**: `C:/dev/game-swarm/` (FUORI da `gioco/`). Stato: zip non estratto, swarm non installato.

**Pre-req**:

- Python 3.10+
- Ollama (download `https://ollama.com`)
- Aider (`pip install aider`)
- Godot 4.x CLI (per validation headless artifact)

**Bootstrap quick** (vedi `game-swarm-package.zip > README.md` per dettagli):

```bash
mkdir C:/dev/game-swarm
cd C:/dev/game-swarm
unzip C:/Users/edusc/Desktop/gioco/game-swarm-package.zip
python -m venv .venv && source .venv/Scripts/activate
pip install -U pip "ag2[ollama,tracing]" pydantic PyYAML jsonschema pytest
ollama pull qwen3:8b qwen2.5-coder
```

**Quando attivarlo**: deferred. M9-M12 roadmap NON include lo swarm. Va attivato dopo MVP playtest (post TKT-M11B-06) per task content generation in batch (es. trait wave 7+, biome variant generation).

**Integrazione con Game**: tramite artifact in `data/derived/` o `packs/evo_tactics_pack/data/` con validation pipeline `npm run mock:generate` + `python3 tools/py/game_cli.py validate-datasets`. NON tramite HTTP runtime.

---

## 🔗 Game ↔ Game-Database flow

**Build-time (default, attualmente unico flusso live)**: Game produce `packs/evo_tactics_pack/docs/catalog/` → script `server/scripts/ingest/import-taxonomy.js` su Game-Database side (lanciato da `npm run evo:import`) importa nel Postgres.

**Runtime HTTP Alt B (scaffolded, flag-OFF)**: Game backend chiama `GET /api/traits/glossary` su Game-Database (porta 3333). Schema in `packages/contracts/schemas/glossary.schema.json`. Cache TTL + fallback locale. Attivare con `GAME_DATABASE_ENABLED=true` quando Game-Database è up.

**Port allocation** (ADR-2026-04-14):

- Game backend: **3334**
- Game-Database backend: **3333**
- Game Postgres: **5432**
- Game-Database Postgres host: **5433**

**Tutto in ADR**: [`docs/adr/ADR-2026-04-14-game-database-topology.md`](docs/adr/ADR-2026-04-14-game-database-topology.md).

---

## 📐 Diagramma flussi

```
┌─────────────────────────────────────────────────────────────────────┐
│  C:/Users/edusc/Desktop/gioco/                                      │
│                                                                     │
│  ┌──────────────┐    build-time    ┌──────────────────┐             │
│  │              │  evo:import      │                  │             │
│  │   Game/      │ ───────────────► │  Game-Database/  │             │
│  │  (runtime)   │                  │  (taxonomy CMS)  │             │
│  │              │ ◄─ ─ ─ ─ ─ ─ ─ ─ │                  │             │
│  └──────┬───────┘  HTTP Alt B      └──────────────────┘             │
│         │          (flag-OFF)                                        │
│         │                                                            │
│         │ legge prompt + template                                    │
│         ▼                                                            │
│  ┌──────────────────────────┐                                        │
│  │ codemasterdd-ai-station/ │  archivio operativo                    │
│  │  (Sprint 0+1 integrato)  │                                        │
│  └──────────────────────────┘                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                       │
                       │ artifact validati (JSON/YAML)
                       │
                       ▼
       ┌────────────────────────────────────┐
       │  C:/dev/game-swarm/  (NON installato) │
       │  AG2 + Ollama + Aider                 │
       │  (planner+coder swarm)                │
       └────────────────────────────────────┘

   synesthesia/  ⟵  PROGETTO SEPARATO (UPO esame), zero coupling
   aider-tty-test/, scratch/  ⟵  sandbox/scratch
```

---

## 🚦 Decisioni rapide

- **"Voglio cambiare un trait"** → `data/core/traits/active_effects.yaml` in **Game**, poi `npm run sync:evo-pack`. Game-Database lo riceve al prossimo `npm run evo:import` lato Game-Database.
- **"Voglio un nuovo glossary entry"** → solo **Game-Database** (CMS UI o direct Postgres). Game lo legge via HTTP quando flag ON, altrimenti via mirror in `packs/evo_tactics_pack/docs/catalog/`.
- **"Voglio batch-generare 50 trait"** → swarm AI (deferred). Frattempo: prompt library in `codemasterdd-ai-station/02_LIBRARY/` + Claude Code session manuale.
- **"Voglio aggiungere un repo esterno alla mappa"** → aggiungi riga in tabella **Topologia** sopra + sezione dedicata se non triviale + cross-link da `LIBRARY.md`.

---

## 🧭 Cleanup TODO

- [x] ~~Aggiornare `CLAUDE.md` "Sibling repo topology": path~~ — done 2026-04-25 (clone + path update)
- [x] ~~Decidere fate dei 6 zip rimanenti~~ — done 2026-04-25, archiviati in `gioco/_archive/2026-04-20-codemasterdd-handoffs/` con README index. Solo `game-swarm-package.zip` resta visibile a root.
- [x] **Game-Database offline validation** — done 2026-04-25: `npm install` ✅, `.env` configurato (`DATABASE_URL=postgresql://postgres:postgres@localhost:5433/game`), `npx prisma generate` ✅ Client v5.22.0, `npx prisma validate` ✅ schema valid
- [ ] **Game-Database end-to-end smoke** — BLOCKED: Docker Desktop daemon non parte autonomo su questa macchina (WSL distro `docker-desktop` STOPPED, nessun processo `Docker Desktop.exe` spawnato dopo `Start-Process`). Richiede primo avvio interattivo Docker Desktop GUI per accept license/login. Una volta running: `docker compose up -d` → `npm run dev:setup` → `npm run dev` → smoke `curl http://localhost:3333/api/traits/glossary`
- [ ] **HTTP Alt B flag-ON validation** — deferred fino a end-to-end smoke 🟢 (richiede Game-Database server up)
- [ ] `synesthesia/` valutare se spostare a path diverso (es. `~/Documents/UPO/`) per evitare confusione con workspace Evo-Tactics
- [ ] Game-Database: scrivere `WORKSPACE_MAP.md` simmetrico nel suo repo (cross-link bidirezionale) — facoltativo, attivare solo se sviluppo Game-Database diventa attivo

---

## 🔗 Cross-link

- `LIBRARY.md` § "🗺️ Workspace topology" punta qui (entry-point veloce)
- `PROJECT_BRIEF.md` § "Identità del progetto" cita Game-Database sibling
- `docs/adr/ADR-2026-04-14-game-database-topology.md` (ADR canonical Game ↔ Game-Database)
- `game-swarm-package/README.md` (dentro zip) per swarm bootstrap step-by-step
