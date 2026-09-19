---
title: 'Cross-Game Extraction MASTER — cosa prendere da ogni gioco + agent integration'
date: 2026-04-26
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [research, extraction, cross-game, agent-integration, sprint-planning]
related:
  - docs/guide/games-source-index.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-tier-e-extraction-matrix.md
  - docs/research/triangle-strategy-transfer-plan.md
  - docs/research/2026-04-26-voidling-bound-evolution-patterns.md
---

# Cross-Game Extraction MASTER

> **Scope**: documento aggregato di **cosa esattamente prendere da ogni gioco/fonte referenziata** nel catalogo Evo-Tactics, + agent owner + ticket sprint + ROI integration.
>
> **Generated**: spawn 4 agent paralleli + 2 deep-dive esistenti (Triangle Strategy + Voidling Bound).
>
> **Cosa risolve**: prima `games-source-index.md` aveva 1-2 frasi per gioco. Ora 60+ giochi/fonti hanno extraction matrix concreta con effort + status + agent owner.

---

## §1 — Inventario tier coverage

| Tier                      | File research                                                                 |         Voci |     LOC | Depth     |
| ------------------------- | ----------------------------------------------------------------------------- | -----------: | ------: | --------- |
| **S — Pilastri donor**    | [`tier-s-extraction-matrix.md`](2026-04-26-tier-s-extraction-matrix.md)       |    13 giochi |     565 | 🔬 deep   |
| **A — Feature donor**     | [`tier-a-extraction-matrix.md`](2026-04-26-tier-a-extraction-matrix.md)       |    11 giochi |     403 | 📋 medium |
| **B — Postmortem**        | [`tier-b-extraction-matrix.md`](2026-04-26-tier-b-extraction-matrix.md)       |    15 giochi |     150 | 📌 light  |
| **E — Algoritmi/tooling** | [`tier-e-extraction-matrix.md`](2026-04-26-tier-e-extraction-matrix.md)       | 20 voci tech |     213 | 🔧 tech   |
| **Pre-existing 🔬**       | `triangle-strategy-transfer-plan.md` + `voidling-bound-evolution-patterns.md` |     2 giochi | 65K+10K | 🔬 deep   |

**Totale**: **61 voci catalogate** (59 nuove + 2 pre-esistenti). +`Anti-reference` (14) + `Persona origin` (7) + `GDD pubblici` (4) coperti in `games-source-index.md`.

---

## §2 — Top quick-wins consolidated (cross-tier)

Sintesi delle **5 quick-wins ROI massimo** (raccolte da 4 matrix):

| Rank | Feature                          | Donor game(s)       | Tier | Effort | Pillar | Agent owner                  |
| ---: | -------------------------------- | ------------------- | :--: | -----: | :----: | ---------------------------- |
|    1 | **HP bar floating sopra sprite** | Tactics Ogre Reborn |  S   |     5h | P1 UI  | ui-design-illuminator        |
|    2 | **Wait action (defer turn)**     | FFT                 |  S   |     3h |   P1   | balance + ui                 |
|    3 | **MBTI tag debrief**             | Disco Elysium       |  S   |     3h |   P4   | narrative-design-illuminator |
|    4 | **Time-of-day biome bias**       | Wesnoth             |  S   |     3h | P1+P3  | pcg-level-design-illuminator |
|    5 | **AI Progress meter**            | AI War              |  S   |     5h |   P5   | ui + telemetry               |

**Bundle**: ~19h totali → chiude P1 UI gap + P4 surfacing + P5 visibility.

**Tier A 5 quick-wins (~18h totali)**:

- Subnautica habitat lifecycle (3h, P2 Skiv)
- Into the Breach telegraph (3h, P1 — già parziale PR #1884)
- Slay the Spire intent preview (4h, P1 UI)
- Monster Hunter Stories gene grid (4h, P2 mutation)
- Spelunky 4×4 grid PCG (4h, P5 PCG)

**Tier E 3 ROI Minimal (~13h)**:

- Pathfinder XP budget (5-7h, P6 calibration)
- DuckDB JSONL pipelines (3-5h, telemetry)
- Stockfish SPRT statistical balance (3-4h, P6 fairness)

---

## §3 — Coverage matrix per pilastro

| Pilastro          | Donor games shipped                                                                                   | Pending high-ROI                                                                                   | Gap critici                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **P1 Tattica**    | Triangle Strategy ✅, FFT 📌, AncientBeast (hex) ✅, Frozen Synapse 🔬, Wesnoth 📋, ITB ✅ (parziale) | Tactics Ogre HP floating, FFT Wait, Halfway numbers visible                                        | Replay cinematico Frozen Synapse (round VCR)          |
| **P2 Evoluzione** | Voidling Bound 🔬, Spore 📌 (ZERO runtime!)                                                           | Subnautica lifecycle, Caves of Qud morphotype, MHS gene grid, MT pact shards, Hades multi-currency | Spore part-pack genuino — fonte primaria mai estratta |
| **P3 Specie×Job** | XCOM perks ✅ (84 perks live), Wildermyth 📋                                                          | Cogmind component identity, Fire Emblem support conv, BG2 party identity                           | Strategist role 5p+                                   |
| **P4 MBTI/Ennea** | Triangle Strategy ✅ (Path A+B shipped), Disco Elysium ✅ V1 onboarding                               | Disco MBTI tag debrief, Triangle Path C recruit gating                                             | T_F+J_P axes parziali                                 |
| **P5 Co-op**      | Jackbox/M11 ✅, AI War 📋, ITB ✅                                                                     | Magicka spell combo, NS2 asimmetria coop                                                           | Playtest live TKT-M11B-06                             |
| **P6 Fairness**   | XCOM Long War 2 ✅, Wesnoth 📋, Hades GDC 📌                                                          | Pathfinder XP budget, Stockfish SPRT, MAP-Elites, Hades Pact menu                                  | hardcore-07 deadlock                                  |

---

## §4 — Agent integration matrix

Ownership current + proposed update:

| Agent (`.claude/agents/*-illuminator.md`) | Donor games attualmente catalogato                                                        | Donor games da AGGIUNGERE                                                                   | Effort agent update |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------: |
| **ui-design-illuminator**                 | ITB telegraph, StS intent, Dead Space diegetic, Jackbox UX                                | **Tactics Ogre HP floating, Halfway numbers, Frozen Synapse replay, AI War progress meter** |                 ~1h |
| **economy-design-illuminator**            | StS gold/relic/potion, Hades multi-currency, MT pact                                      | **Hades Pact menu modificatori, Balatro emergent balance, Voidling Bound 3-currency**       |                 ~1h |
| **creature-aspect-illuminator**           | Caves of Qud morphotype, MHS gene grid, CK3 DNA, Subnautica habitat, Wildermyth portraits | **Spore part-pack, Wildermyth storylets, Cogmind component identity**                       |                 ~1h |
| **narrative-design-illuminator**          | ink/inkle weave, QBN Fallen London, Disco micro-react, Wildermyth layered                 | **Disco MBTI tag debrief, Frozen Synapse replay narrative, Hades GDC visione**              |                 ~1h |
| **pcg-level-design-illuminator**          | ITB hand+random, Dead Cells concept graph, WFC, Spelunky 4×4, Dormans grammar             | **Wesnoth time-of-day, Wargroove hex commander, Songs of Conquest hybrid**                  |                 ~1h |
| **balance-illuminator**                   | Stockfish SPRT, MAP-Elites, MCTS, LLM-as-critic, Bayesian                                 | **Pathfinder XP budget runtime, Hearthstone academic, Balatro iterazione**                  |                 ~1h |
| **telemetry-viz-illuminator**             | Tufte sparklines, Grafana, Riot/Valorant, deck.gl, DuckDB                                 | **Mission timer telemetry pattern Long War 2, Stockfish ELO drift**                         |                 ~1h |
| **coop-phase-validator**                  | Jackbox host-auth, ADR M11 Phase A                                                        | **AI War decentralized AI, NS2 asimmetria coop**                                            |                 ~1h |
| **playtest-analyzer**                     | (vuoto)                                                                                   | **Halfway scope discipline, Cogmind tooltip, Battle Brothers ATB**                          |                 ~1h |
| **balance-auditor**                       | trait_mechanics outliers, ai_intent_scores                                                | **Pathfinder bestiary scaling, Hearthstone deck space MAP-Elites**                          |              ~30min |

**Totale aggiornamento agent profiles**: ~9.5h se fatto in batch.

---

## §5 — Sprint backlog proposto (ticket P0/P1/P2)

### P0 quick-wins (~19h totali)

| Ticket                           | Feature                                     | Effort | Owner           |
| -------------------------------- | ------------------------------------------- | -----: | --------------- |
| `TKT-UI-HP-FLOATING`             | HP bar floating sopra sprite (Tactics Ogre) |     5h | ui-design       |
| `TKT-COMBAT-WAIT-ACTION`         | Wait action defer turn (FFT)                |     3h | combat-engineer |
| `TKT-NARRATIVE-MBTI-TAG-DEBRIEF` | MBTI tag debrief (Disco)                    |     3h | narrative       |
| `TKT-PCG-TIME-OF-DAY`            | Time-of-day biome bias (Wesnoth)            |     3h | pcg             |
| `TKT-UI-AI-PROGRESS-METER`       | AI Progress meter (AI War)                  |     5h | ui + telemetry  |

### P1 second wave (~25h)

| Ticket                              | Feature                        | Effort |
| ----------------------------------- | ------------------------------ | -----: |
| `TKT-CREATURE-SUBNAUTICA-LIFECYCLE` | Habitat lifecycle 5-stage Skiv |     3h |
| `TKT-UI-STS-INTENT-PREVIEW`         | Intent preview deterministico  |     4h |
| `TKT-CREATURE-MHS-GENE-GRID`        | Gene grid creature genetics    |     4h |
| `TKT-PCG-SPELUNKY-4X4`              | 4×4 grid PCG generation        |     4h |
| `TKT-BALANCE-PATHFINDER-XP-BUDGET`  | XP budget runtime              |   5-7h |
| `TKT-TELEMETRY-DUCKDB`              | DuckDB JSONL pipeline          |   3-5h |

### P2 third wave (~30h)

- TKT-NARRATIVE-FROZEN-SYNAPSE-REPLAY (round VCR ~6h)
- TKT-ECONOMY-HADES-PACT-MENU (P6 difficulty modifiers ~4h)
- TKT-CREATURE-SPORE-PART-PACK (P2 fonte primaria genuina ~10h)
- TKT-PCG-WESNOTH-RECRUIT-RETAIN (economy ~5h)
- TKT-BALANCE-STOCKFISH-SPRT (statistical test ~3-4h)

### P3 deferred (>50h o scope review)

- MAP-Elites engine full (~12-15h)
- Wave Function Collapse PCG (~20-25h)
- MCTS playout (~15-20h)
- Spore full part-pack runtime (~20h+)

---

## §6 — Anti-pattern aggregato (cross-game)

Cosa NON prendere mai (sintesi 4 matrix + games-source-index anti-ref):

### Visual / Art

- ❌ Disney/Pokémon-cute aesthetic (target adult-leaning)
- ❌ Pokémon evolution by level (linear stat-bump = no agency)
- ❌ Diablo random rare drop (player powerless vs RNG)
- ❌ Destiny early HP bar color-only (colorblind fail)

### Mechanics

- ❌ Cinematic blocking (player attesa passiva)
- ❌ Permadeath senza recovery (Fire Emblem classic mode → restart)
- ❌ Opaque RNG (Slay the Spire fix con telegraph deterministico)
- ❌ Session 8+ ore (Pathfinder TTRPG → Evo target 90min)
- ❌ 15+ class subdivision (cognitive overload)
- ❌ Octopath boost (skipped — scope creep)

### UI/UX

- ❌ Numbers hidden (Halfway lesson: show ALL numbers)
- ❌ Mass Effect paragon/renegade binary (Triangle 3-axis preferred)
- ❌ D&D 5e alignment grid 9-cell (too coarse)
- ❌ Path of Exile ailment ratio (too complex onboarding 60s)

### Architecture

- ❌ Pokémon doubles 6on6 scale (>4 coop limit)
- ❌ Diablo 4 necromancer 7+ pets (cognitive load)

---

## §7 — Status pattern adoption per gioco

### 🟢 Live in Evo-Tactics (deep adoption)

- Triangle Strategy MBTI Path A+B + recruit/conviction (PR #1726, Triangle research)
- XCOM EU/EW perk-pair (84 perks shipped M13.P3)
- XCOM Long War 2 mission timer + pod activation (M13.P6)
- Jackbox host-auth coop (M11 Phase A)
- Disco Elysium V1 onboarding 60s (PR #1726)
- Into the Breach threat telegraph (PR #1884 questa session)
- Wesnoth content/balance separation (canonical structure)
- AncientBeast hex axial (ADR-2026-04-16)
- Stockfish/MAP-Elites methodology (balance-illuminator agent)
- Software Archaeology/Dublin Core/git pickaxe (repo-archaeologist agent)

### 🟡 Parziale (engine live, surface dead — Pattern A)

- Voidling Bound 6 patterns (research shipped, runtime M14+ pending)
- Spore part-pack (P2 mai estratto come runtime!)
- Tactics Ogre HP floating (HUD canonical doc, no implementation)
- Hades multi-currency (codex archive UX adopted, currency duality dual-PE pending)
- Fallen London QBN (engine inkjs + skiv_qbn live, integration narrative pending)
- AI War asymmetric AI rules (museum reference, runtime decentralized AI pending)
- Pathfinder XP budget (encounter design reference, runtime budget calc pending)
- Tufte sparklines + Grafana (telemetry-viz-illuminator agent, dashboard pending)

### 🔴 Mancante (research solo doc, zero adoption)

- FFT CT bar + Wait action
- Tactics Ogre Charm (recruit conv)
- Fire Emblem support conversations
- Wildermyth storylets layered
- Frozen Synapse replay cinematico
- Cogmind component-identity
- Halfway scope discipline 2-dev
- Magicka spell combo coop
- Battle Brothers ATB initiative
- Wave Function Collapse runtime
- ASP constraint solvers
- MCTS playout

---

## §8 — Investigation: agent integration optimization

### Problema attuale

`.claude/agents/*-illuminator.md` (16 file) hanno sezione "donor patterns" ma **non sempre cross-link al gioco source**. Esempio: `ui-design-illuminator` dice "ITB telegraph rule" ma non link a `docs/research/2026-04-26-tier-a-extraction-matrix.md` per concrete extraction.

### Proposta integration (3-step)

**Step 1 — Cross-link automatico** (~2h):
Per ogni agent illuminator:

- Aggiungi sezione `## Donor games (extraction matrix)` con link a `docs/research/2026-04-26-tier-{S,A,B,E}-extraction-matrix.md` filtered per agent owner
- Riferimento esplicito ai 5 quick-wins se rilevanti per pillar

**Step 2 — Smart pattern matching** (~3h):
Quando agent illuminator viene invocato per audit/research, deve:

1. Leggere FIRST il proprio extraction matrix subset
2. Citare donor game con effort + status quando propone fix
3. Output formatto: `[fix] [donor game origin] [reuse path effort]`

**Step 3 — Ticket auto-generation** (~5h, pendente Sprint M14):
Per ogni gap identificato dall'audit, agent genera proposed ticket BACKLOG con:

- Title: `TKT-{PILLAR}-{DONOR-GAME}-{FEATURE}`
- Body: extraction matrix entry + reuse path
- Owner: l'agent stesso
- Auto-assign sprint priority based on pillar status

### ROI totale agent integration

~10h totali per cross-link + smart matching + ticket gen scaffold. ROI: ogni futuro audit produce ticket BACKLOG-ready invece findings-only.

---

## §9 — Maintenance protocol

**Trigger update extraction matrix**:

- Nuovo gioco studiato → aggiungi voce in tier-X-extraction-matrix.md + games-source-index.md
- Pattern shipped runtime → flip status 🔴/🟡 → 🟢 in matrix
- Quick-win completato → rimuovi da §2 + aggiorna §7

**Trigger review questo MASTER doc**:

- Ogni 60 giorni (review_cycle_days frontmatter)
- Quando 3+ ticket P0 quick-win chiusi (re-rank §2)
- Quando nuovo pillar passa 🟢→🟡 o vice (aggiorna §3 coverage)

**Owner**: `repo-archaeologist` agent (museum-first protocol estende a extraction matrix).

---

## §10 — Action items immediati

### Per utente (decisioni)

1. **Quale quick-win bundle attivare prima?** Default raccomandato: P0 5-bundle (~19h) Tier S quick-wins
2. **Voidling Bound adoption livello?** Minimal/Moderate/Full (vedi research dedicato)
3. **Spore deep extraction priorità?** P2 fonte primaria mai estratta — dovrebbe essere 🔬 ma è solo 📌
4. **Agent integration step 1+2 OK?** ~5h cross-link + smart matching

### Per agent (autonomous)

- ✅ 4 extraction matrix shipped
- ✅ MASTER aggregato shipped
- ⏸️ Pending PR push (P1-21 telemetry schema AJV next from SYNTHESIS)
- ⏸️ Pending agent integration step 1 (cross-link automatico)

---

## §11 — File correlati

- [`docs/guide/games-source-index.md`](../guide/games-source-index.md) — catalogo width 70+ voci (1-2 frasi)
- [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](2026-04-26-tier-s-extraction-matrix.md) — 13 giochi deep
- [`docs/research/2026-04-26-tier-a-extraction-matrix.md`](2026-04-26-tier-a-extraction-matrix.md) — 11 giochi medium
- [`docs/research/2026-04-26-tier-b-extraction-matrix.md`](2026-04-26-tier-b-extraction-matrix.md) — 15 giochi light
- [`docs/research/2026-04-26-tier-e-extraction-matrix.md`](2026-04-26-tier-e-extraction-matrix.md) — 20 voci tech
- [`docs/research/triangle-strategy-transfer-plan.md`](triangle-strategy-transfer-plan.md) — pre-existing 65KB
- [`docs/research/2026-04-26-voidling-bound-evolution-patterns.md`](2026-04-26-voidling-bound-evolution-patterns.md) — pre-existing
- [`LIBRARY.md`](../../LIBRARY.md) — reference index
- [`docs/museum/MUSEUM.md`](../museum/MUSEUM.md) — 12 cards curate
- 16 `.claude/agents/*-illuminator.md` — agent profiles owners
