# PROJECT_BRIEF — Evo-Tactics

> **Scope**: identità stabile del progetto. Non cambia tra sessioni. Letto in 90 secondi.
> **Aggiornato**: 2026-04-24
> **Sorgenti**: `CLAUDE.md` (Project overview, Pillar audit), `docs/core/01-VISIONE.md`, `docs/core/90-FINAL-DESIGN-FREEZE.md`.

---

## Identità del progetto

- **Nome**: **Evo-Tactics**
- **Tipo**: co-op tactical game (d20-based) + modular evolutionary progression + turn-based hex combat
- **Stato attuale**: MVP co-op M16-M20 chiuso (2026-04-26), Vision Gap V1-V7 6/7 chiusi, 411/411 test verdi, playtest live TKT-M11B-06 pendente
- **Owner / team**: Eduardo Scarpelli (single dev + AI pair: Claude Code principale, Codex bot CI)
- **Repo**: `C:/Users/edusc/Desktop/gioco/Game/` (branch default `main`, Node 22.19.0, Python 3.10+)
- **Repo sibling**: `MasterDD-L34D/Game-Database` (taxonomy CMS, integrazione HTTP Alt B scaffolded flag-OFF)

## Scopo

- **Problema che risolve**: creare un'esperienza tattica a turni profonda e cooperativa giocabile in presenza (TV condivisa + smartphone controller), con simulazione evolutiva che modella le scelte dei giocatori
- **Perché esiste**: "Tattica profonda a turni, cooperativa contro il Sistema, condivisa su TV: come giochi modella ciò che diventi" (visione frozen 2026-04-18)
- **Risultato concreto atteso**: 4 amici giocano ~60 min, ogni run è diversa per le scelte morali + assetti specie+job, host vede TV + 4 phone come controller (modello Jackbox), singleplayer skippabile via lobby solo

## Pubblico / destinatario

- **Utenti primari**: 4-8 amici in co-op locale (party modulato 2-8 player), esperti di tactical RPG (FFT, XCOM, Fire Emblem, Triangle Strategy)
- **Utenti secondari**: singleplayer che vogliono ciclo emergente Spore-like (evoluzione trait via PI pack)
- **Contesto d'uso**: salotto domestico, TV 1080p/4K + 2-8 smartphone come input, sessione 45-90 minuti (tutorial 01-05 calibrati per curva progressiva 80%→20% win rate)

## Obiettivo core

- **Job-to-be-done principale**: "fammi giocare un tactical RPG in co-op con amici senza Master, dove le scelte hanno peso meccanico e narrativo"
- **Unità minima che deve funzionare**: tutorial 01 (Savana) → tutorial 05 (Apex Boss) + 1 mission campaign loop giocabile 4-player in <90min senza crash
- **Cosa NON è importante ora**: singleplayer deep campaign (30+ mission), moddability esterna, art production quality (placeholders OK), localizzazione multi-lingua (italiano+inglese bastano)

## Vincoli

### Vincoli tecnici hard

- **Monorepo polyglot**: Node 18+ (22.19.0 rec), npm 11+, Python 3.10+, Prisma+Postgres opzionale (default NeDB)
- **Rules engine Python DEPRECATED** (M6-#4 2026-04-19): porting a Node `apps/backend/services/combat/`. No new feature su `services/rules/`
- **Contracts seam**: `packages/contracts/` è source-of-truth schema — ogni cambio ripple su backend + mock + dashboard
- **Dataset canonical**: `data/core/` + `packs/evo_tactics_pack/data/` — cambi richiedono validator pipeline (vedi CLAUDE.md "Dataset workflows")
- **Regola 50 righe**: task >50 righe nuove fuori da `apps/backend/` → ferma, segnala, aspetta
- **No nuove deps npm/pip senza approvazione esplicita**

### Vincoli di team / tempo / budget

- Single dev + AI pair → sprint kill-60 (limite 60 righe bonus per AI pair, solo code richiesto)
- Claude Code principale per implementazione + QA
- Codex bot per CI daily tracker refresh (`chore: aggiorna riepilogo PR giornaliero`)
- Documentazione in italiano, identifier code in inglese
- Sessione media ~4h autonomous + ~2h userland/sprint
- Budget: zero, nessuna infrastruttura pagata oltre GitHub + hosting statico Pages

### Vincoli di scope

- **Non toccare senza segnalare**: `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/` (guardrail sprint)
- **Trait solo in** `data/core/traits/active_effects.yaml`, mai hardcoded nel resolver
- **Mission Console** bundle pre-built in `docs/mission-console/` — source NON in repo, non editabile
- **Master DM approval** documentato prima di merge (CONTRIBUTING.md)

## Materiali esistenti

- **Repo**: `C:/Users/edusc/Desktop/gioco/Game/` — branch corrente `claude/distracted-volhard-2f84a5` sync con `origin/main`
- **Documentazione canonical**: `CLAUDE.md` (spine progetto, ~500 righe), `docs/core/01-VISIONE.md`, `docs/core/90-FINAL-DESIGN-FREEZE.md`, `docs/core/DesignDoc-Overview.md`
- **Hub workstream**: `docs/hubs/{combat,flow,atlas,backend,dataset-pack,ops-qa,incoming,cross-cutting}.md`
- **ADR**: `docs/adr/` (30 decisioni registrate, index in `DECISIONS_LOG.md`)
- **Planning docs**: `docs/planning/` — ultimi critici: `2026-04-26-vision-gap-sprint-handoff.md`, `2026-04-24-next-session-kickoff-m12-phase-d.md`, `2026-04-22-next-session-kickoff-m11-playtest.md`
- **Reference esterni studiati**: Wesnoth, AncientBeast, XCOM EU/EW, Jackbox, Long War 2, Colyseus, Utility AI, EasyStar.js, Honeycomb Grid, yuka, GOApy, Triangle Strategy (ricerca 2026-04-24)
- **Archivio operativo esterno**: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/` — prompt library + operating package
- **Skills installate**: 40+ (vedi `docs/planning/2026-04-24-claude-skills-shopping-list.md` sezione "Già presenti")
- **Subagenti custom**: 6 in `.claude/agents/` (balance-auditor, migration-planner, schema-ripple, session-debugger, sot-planner, species-reviewer) + 2 P0 nuovi (playtest-analyzer, coop-phase-validator — 2026-04-24)
- **Skiv-as-Monitor** (2026-04-25): creatura canonical `Arenavenator vagans` reagisce live a git events (PR/issue/workflow) del repo. Stack: `tools/py/skiv_monitor.py` Python poller + cron 4h + `apps/backend/routes/skiv.js` 4 endpoint (`/api/skiv/{status,feed,card,webhook}`) + UI overlay 🦎 + Swarm dashboard cross-origin. Persona canonical `docs/skiv/CANONICAL.md`, ADR `docs/adr/ADR-2026-04-25-skiv-as-monitor.md`, autogen `docs/skiv/MONITOR.md`. Voice deterministic via Tracery seeded grammar (662 voci) + QBN storylets (14 weekly digest) + Conventional Commits parser. 5 lifecycle fasi visual (SVG hand-craft + raster CC0 GrafxKid).

## Problemi attuali

- **P5 Co-op**: 🟡 runtime shipped (M11 Phase A-C + TKT-05), ma TKT-M11B-06 playtest live userland pendente (unico blocco umano → 🟢)
- **P6 Fairness**: 🟢 candidato, hardcore 06/07 calibration harness `tools/py/batch_calibrate_hardcore07.py` da eseguire userland (target 30-50% win)
- **M13 P3 Phase B wire**: campaign advance XP grant + combat resolver 5 passive tags live, UI progressionPanel live, ma balance pass 448 builds validazione non automatizzata
- **V3 Mating/Nido**: deferred (~20h post-MVP)
- **V6 UI TV dashboard polish**: deferred (~6h post-playtest)

## Metriche di successo

- **Short-term (next 2 sprint)**: TKT-M11B-06 playtest live completato (4 amici, <90min, zero crash) → P5 🟢 definitivo
- **Mid-term (next 6 sprint)**: 6/6 pilastri 🟢 o 🟢 candidato validato, MVP demo giocabile 2-8 player
- **Long-term**: ciclo evoluzione Spore-core (P2 full Form, Phase D+) + 30+ mission campaign (3 big arc narrativi)
- **Technical health**: 411+/411 test verdi, guardrail sprint zero violazioni, ci pipeline <10 min

## Prossimo passo singolo più utile

**TKT-M11B-06 playtest live 2-4 amici** — userland, unico bloccante umano, chiude P5 🟢 definitivo e sblocca feedback per V6 UI polish.
