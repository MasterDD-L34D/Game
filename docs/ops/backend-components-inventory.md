---
title: Backend "Idea Engine" -- inventario componenti + stato runtime
doc_status: active
doc_owner: platform-docs
workstream: ops-qa
last_verified: 2026-06-28
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Backend "Idea Engine" -- inventario componenti + stato runtime

Snapshot dei componenti del backend (`apps/backend`) emersi dal log di boot, con
cosa fanno, se sono online, e come verificarli. Probe live eseguiti contro prod
`http://localhost:3334` (host Lenovo CODEMASTERDD) il 2026-06-28.

> NB: "Idea Engine" e' il nome **legacy** del backend (nato come API di raccolta
> idee/feedback con tassonomia; vedi `docs/tutorials/idea-engine.md`,
> `historical_ref`). Oggi e' il backend di gioco completo (combat / session /
> co-op / meta-loop). Compare ancora nei log di boot e in `GET /api/health`
> (`service: idea-engine`).

## Legenda stato

- 🟢 online + serve (handler root 200)
- 🔒 online ma auth-gated (401 senza token)
- ⚪ in-process, caricato (no handler root / superficie solo sub-path o on-demand)
- 🟡 online ma su sorgenti fallback/statiche
- 🔴 offline

## Core

| Componente  | Cosa fa                                        | Stato | Verifica                                               |
| ----------- | ---------------------------------------------- | ----- | ------------------------------------------------------ |
| idea-engine | Server Express (entry `index.js` -> `app.js`). | 🟢    | `GET /api/health` -> `{status:ok,service:idea-engine}` |

## Motori combat/session (in-process, caricati al boot)

| Componente    | Cosa fa                                                                           | Stato                                   |
| ------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| trait-effects | Risolve 503 trait attivi (`data/core/traits/active_effects.yaml`) nel combat.     | ⚪ caricato                             |
| fairness      | Cap economia PT (`cap_pt_max=1`, `data/packs.yaml`) anti-snowball.                | ⚪ caricato                             |
| vc-scoring    | Profiling comportamentale: 6 indici + 4 MBTI + 9 Ennea su eventi sessione.        | ⚪ caricato                             |
| ai-profiles   | 7 profili AI nemica; `utility_brain` (decisione a utility-score) su 4 aggressivi. | ⚪ caricato                             |
| combat        | Rules engine d20 (`services/combat/*` + roundOrchestrator).                       | 🟢 sub-path (`/api/combat/*`, root 404) |

## Plugin (8, via `services/pluginLoader.js` -> montano `/api/<nome>`)

| Plugin      | Cosa fa                                             | Stato live                                    |
| ----------- | --------------------------------------------------- | --------------------------------------------- |
| jobs        | 12 classi/ruoli (`data/core/jobs.yaml`).            | 🟢 `/api/jobs` -> `count:11` (vedi nota jobs) |
| tutorial    | Scenari onboarding.                                 | 🟢 `/api/tutorial`                            |
| narrative   | Testi/eventi narrativi.                             | ⚪ `/api/v1/narrative/*` (root 404)           |
| meta        | Meta-progressione (NPG, nido, trust, mating).       | ⚪ `/api/v1/meta/*` (es. `/npg`)              |
| forms       | Form-evolution engine (M12).                        | ⚪ `/api/v1/forms/*`                          |
| progression | XP + perk-pair (M13).                               | ⚪ `/api/v1/progression/*`                    |
| mutations   | Catalogo mutazioni post-encounter (M14).            | ⚪ `/api/v1/mutations/*`                      |
| lineage     | Propagazione generazionale (eredita 1-2 mutazioni). | ⚪ `/api/v1/lineage/*`                        |

## Networking / esterni / telemetria

| Componente        | Cosa fa                                                                                 | Stato                        | Note                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| lobby-ws          | WebSocket co-op (TV+phone). Prod = porta dedicata :3341; playtest = shared `/ws`.       | 🟢 :3341 LISTEN              | `services/network/wsSession.js`                                                                                                  |
| traits API        | CRUD trait + glossary + ermes-suggestions.                                              | 🔒 401                       | token `TRAIT_EDITOR_TOKEN`/JWT                                                                                                   |
| game-database     | Fetch trait glossary HTTP dal repo sibling :3333 (Alt B, OD-030).                       | 🔴 offline                   | :3333 giu' -> fallback file locale (funziona, solo rumore log). Default flag = ON (`index.js:30`).                               |
| nebula-aggregator | Telemetria dashboard "Nebula"/Atlas (coverage specie, timeline incidenti, generatore).  | 🟡 online, sorgenti fallback | `/api/v1/atlas/{dataset,telemetry,generator}` 200; feed live non configurati -> dataset statico (`data/nebula/atlasDataset.js`). |
| ermes             | Simulatore eco-pressure per bioma (Node -> Python `prototypes/ermes_lab/ermes_sim.py`). | 🟢 boot report fresh         | Nessun endpoint dedicato; lazy-spawn on trait-edit + export co-op debrief; suggestions via `/api/traits/suggestions`.            |

## Note runtime

### jobs: 11 vs 12 (NON e' un bug)

`jobs.yaml` ha 12 entry (8 base + 4 expansion). Una e' `trait_native`, uno
**pseudo-job** auto-generato da `scripts/generate_trait_native_abilities.py`
(indice delle ability native dei trait, esposto solo a `abilityExecutor`),
`status: pseudo`. `apps/backend/routes/jobs.js` lo **filtra** -> `/api/jobs`
ritorna 11 classi giocabili. Comportamento documentato in `jobs.yaml:625-628`.

### Sintesi "online"

- Tutto in-process e' **online** (backend su). I `404` al root = modulo caricato
  senza handler root (solo sub-path), NON "giu'".
- Unico realmente **offline**: game-database :3333 (fallback locale copre).
- Nebula: API su, ma serve dati statici/mock (feed telemetria live non agganciati).
- ERMES: report a disco, processo Python solo on-demand (no daemon).

### Contesto persistenza (vedi memory `project_backend_db_topology_imprint_playtest`)

- Prod gira dal worktree `C:\dev\_gamewt-lenovo-host` (il suo `.env` ha
  `DATABASE_URL` -> Postgres :5432 schema `public`) -> persiste (`Prisma hydrate`).
- Il repo dev `C:\dev\Game` non ha `DATABASE_URL` -> stub in-memory.
- Launcher playtest isolato: `C:\Users\edusc\run-imprint-playtest.cmd`
  (schema `playtest_imprint`, PORT 3400, WS shared, `GAME_DATABASE_ENABLED=false`).

### Incidente prod 2026-06-24 (risolto)

Crash-loop `prisma:error Can't reach database server :5432`: PG con shutdown
sporco ha fatto crash-recovery in 37s, ma il launcher prod aspettava
`pg_isready` solo 30s -> backend partito a DB non pronta. Fix: attesa 30 -> 90s
in `start-evo-backend.cmd` (e nel launcher playtest). Resilienza task
(RestartCount=999 + BootTrigger) gia' presente (#2965/#2966).

## Follow-up aperti

- Audit "quali componenti usiamo davvero / cosa cambiare/migliorare/sostituire":
  issue su `MasterDD-L34D/codemasterdd-ai-station` (2026-06-28).
- Nebula: feed telemetria live mai configurati -> valutare se cablare o ritirare.
- game-database: default ON ma :3333 spesso giu' -> valutare default o health-gate.
- Doc-drift `GAME_DATABASE_ENABLED=false` (`.env.example:51` + CLAUDE.md) vs default ON.
