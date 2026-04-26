---
title: Tier E extraction matrix — algoritmi + methodology + tooling + academic
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Tier E extraction matrix — algoritmi + methodology + tooling + academic

> **Scope**: 20 fonti tecniche Tier E (NON giochi). Pattern adottabile + use case Evo-Tactics + status integration + agent owner + effort. Companion di [`docs/guide/games-source-index.md`](../guide/games-source-index.md) §Tier-E.
>
> **Caveman mode**. Tabella stretta. Cross-ref doc esistenti dove live.
>
> **Status legend**: 🟢 live · 🟡 parziale (spec o partial wire) · 🔴 pending (zero runtime).

## Matrix sintetica

| #   | Fonte                          | Tipo        | Status |
| --- | ------------------------------ | ----------- | :----: |
| 1   | Stockfish SPRT                 | tooling     |   🔴   |
| 2   | Hearthstone Map-Elites         | academic    |   🟡   |
| 3   | Wave Function Collapse         | algorithm   |   🔴   |
| 4   | Pathfinder TTRPG XP budget     | tabletop    |   🟡   |
| 5   | ASP constraint solvers         | algorithm   |   🔴   |
| 6   | MAP-Elites Quality-Diversity   | algorithm   |   🟡   |
| 7   | MCTS smart playout             | algorithm   |   🔴   |
| 8   | LLM-as-critic                  | methodology |   🟡   |
| 9   | Tufte sparklines               | viz theory  |   🔴   |
| 10  | Grafana                        | tooling     |   🔴   |
| 11  | Riot / Valorant analytics      | industry    |   🔴   |
| 12  | deck.gl hex WebGL              | library     |   🔴   |
| 13  | DuckDB JSONL pipelines         | tooling     |   🔴   |
| 14  | Machinations.io                | tooling     |   🟡   |
| 15  | Game Design Patterns Chalmers  | academic    |   🟢   |
| 16  | Game Programming Patterns Nys. | book        |   🟢   |
| 17  | Overwatch ECS GDC              | talk        |   🟡   |
| 18  | Software Archaeology           | methodology |   🟢   |
| 19  | Dublin Core Provenance         | metadata    |   🟢   |
| 20  | git pickaxe                    | tool        |   🟢   |

---

## 1. Stockfish SPRT

- **Cosa è**: chess engine che usa Sequential Probability Ratio Test per accept/reject patch tuning con confidenza statistica.
- **Pattern adottabile**: SPRT loop `H0: win_rate <= baseline` vs `H1: win_rate >= baseline + delta`, alpha/beta = 0.05, stop early su confidenza.
- **Use case Evo-Tactics**: hardcore-06/07 calibration N=10/30 attualmente "manual eyeball". SPRT chiude iter quando significance reached → meno run sprecati.
- **Status integration**: 🔴 pending. Esistono harness Python (`tools/py/batch_calibrate_hardcore0[67].py`) ma usano N fisso, non early-stop.
- **Agent owner**: `balance-illuminator` (calibration mode).
- **Effort adoption**: Minimal (~3-4h: wrapper SPRT su batch esistente, libreria `scipy.stats`).

## 2. Hearthstone Map-Elites Deck Spaces (Fontaine 2019)

- **Cosa è**: paper [arxiv 1904.10656] che usa MAP-Elites per esplorare deck space Hearthstone, mette in luce archetipi outlier oltre il meta dominante.
- **Pattern adottabile**: feature descriptor 2D (es. avg_mana × creature_density), elite per cella, mutation+crossover.
- **Use case Evo-Tactics**: build/form discovery oltre meta corrente — esplora F4/F8/F12 form + perk combo che human designer non testa.
- **Status integration**: 🟡 parziale. Doc spec live `docs/balance/2026-04-25-map-elites-archive.md` + HTTP wrapper `2026-04-25-map-elites-archive-http.md`. Engine runtime non wirato.
- **Agent owner**: `balance-illuminator` (research mode).
- **Effort adoption**: Full (~12-15h: feature_descriptor schema + elite store + mutation operators + integration con `predictCombat` N=1000 evaluator).

## 3. Wave Function Collapse (mxgmn)

- **Cosa è**: algoritmo PCG constraint-based che genera tile maps coerenti da single example via entropy minimization + propagation.
- **Pattern adottabile**: tile adjacency rules + entropy collapse per generation biome map o encounter grid.
- **Use case Evo-Tactics**: encounter grid procedural beyond hand-authored 6×6/8×8/10×10 tutorial. Biome-aware tile adjacency (savana→cespuglio→roccia).
- **Status integration**: 🔴 pending. Encounter author oggi via YAML statico (`packs/evo_tactics_pack/data/encounters/`). Zero PCG runtime.
- **Agent owner**: `pcg-level-design-illuminator`.
- **Effort adoption**: Full (~20-25h: tile dictionary + adjacency YAML + WFC solver Node port o pyhton bridge + integration con `encounterLoader.js`).

## 4. Pathfinder TTRPG XP budget

- **Cosa è**: sistema TTRPG con budget XP per encounter scaling + Bestiary CR/XP table per party_level.
- **Pattern adottabile**: tabella `(party_level, difficulty) → xp_budget` + creature `cr → xp_value` lookup.
- **Use case Evo-Tactics**: encounter difficulty scaling deterministico, sostituisce eyeball "boss hp 14→22". Audit gap: `docs/balance/2026-04-25-encounter-xp-audit.md` esiste già.
- **Status integration**: 🟡 parziale. Audit doc live, formula non integrata in `encounterLoader.js`/`reinforcementSpawner.js`.
- **Agent owner**: `pcg-level-design-illuminator`.
- **Effort adoption**: Minimal (~5-7h: extract `xp_budget_table.yaml` + `cr_xp_lookup.yaml` + wire in encounter loader validate-time).

## 5. ASP constraint solvers (Answer Set Programming)

- **Cosa è**: paradigma logico declarativo (clingo, DLV) per generazione PCG con constraint hard/soft + symmetry breaking.
- **Pattern adottabile**: encode encounter constraints (es. "boss adjacent to ≥2 cover", "spawn pods ≥3 hex from player") in ASP, solve.
- **Use case Evo-Tactics**: hardcore encounter authoring assistito — designer scrive constraint, ASP enumera valid layouts.
- **Status integration**: 🔴 pending. Zero ASP integration, encounter ancora handcrafted.
- **Agent owner**: `pcg-level-design-illuminator`.
- **Effort adoption**: Full (~25-30h: clingo Python binding + DSL constraint → ASP rules + UI integration). HIGH-RISK new dep approval.

## 6. MAP-Elites Quality-Diversity

- **Cosa è**: algoritmo evolutionary che riempie archive multidimensionale di "elite" per ogni cella di feature space, esplorando diversità oltre fitness.
- **Pattern adottabile**: archive `(feature_x, feature_y) → best_individual`, mutation+evaluation loop continuo.
- **Use case Evo-Tactics**: balance disruption — scopre build/form combinazioni outlier che dominant strategy ignora.
- **Status integration**: 🟡 parziale. Ref #2 (Hearthstone applicato). Spec doc live, runtime engine pending.
- **Agent owner**: `balance-illuminator` (research mode).
- **Effort adoption**: Full (~12-15h, condiviso con #2).

## 7. MCTS smart playout policies

- **Cosa è**: Monte Carlo Tree Search con playout heuristic-guided (vs random) per game-tree exploration efficiente.
- **Pattern adottabile**: replace random rollout in `predictCombat` con policy-guided rollout (es. `selectAiPolicy`) → riduce variance.
- **Use case Evo-Tactics**: AI Sistema decision-making round model — MCTS top-K candidate intent + smart playout = più tactical AI.
- **Status integration**: 🔴 pending. AI Sistema oggi usa Utility AI (`utilityBrain.js`) opt-in + `declareSistemaIntents.js`. Zero MCTS.
- **Agent owner**: `balance-illuminator` (cross con `coop-phase-validator`).
- **Effort adoption**: Full (~15-20h: MCTS skeleton + reuse `predictCombat` evaluator + tree budget cap + benchmark vs Utility baseline).

## 8. LLM-as-critic

- **Cosa è**: methodology dove LLM judge candidate solutions vs criteria, usato per Bayesian knob-tuning loops.
- **Pattern adottabile**: balance loop "propose tune → simulate → LLM critique outcome → propose new tune" auto-iterativo.
- **Use case Evo-Tactics**: tutorial/hardcore calibration sostituisce manuale "iter1 96% → bump hp +3" con LLM critique loop.
- **Status integration**: 🟡 parziale. Pattern in uso ad-hoc dal main agent per calibration sessions, non codified come automation.
- **Agent owner**: `balance-illuminator` + `playtest-analyzer`.
- **Effort adoption**: Minimal (~4-6h: prompt template + harness orchestrator chiamando LLM API tra batch run).

## 9. Tufte sparklines + small multiples

- **Cosa è**: viz theory (Edward Tufte) — micro-charts inline + griglie ripetute per dense-information display senza chart junk.
- **Pattern adottabile**: telemetry dashboard usa sparkline per per-session win-rate + small multiples per per-archetype trend.
- **Use case Evo-Tactics**: `/api/session/telemetry` JSONL output → dashboard analytics dense (40+ session a colpo d'occhio).
- **Status integration**: 🔴 pending. Telemetry endpoint live (V7 PR #1726), no viz layer.
- **Agent owner**: `telemetry-viz-illuminator`.
- **Effort adoption**: Minimal (~6-8h: HTML dashboard statico + Chart.js sparkline component + small-multiples grid CSS).

## 10. Grafana

- **Cosa è**: dashboard tooling open-source con heatmap + sparkline + alerting + datasource pluggable (Postgres, JSON API, Prometheus).
- **Pattern adottabile**: deploy Grafana locale, datasource = Game backend `/api/session/telemetry` + Prisma DB.
- **Use case Evo-Tactics**: ops monitoring playtest sessions live + win-rate alerts su threshold.
- **Status integration**: 🔴 pending. Zero Grafana setup. Telemetry JSONL grezzo in `logs/`.
- **Agent owner**: `telemetry-viz-illuminator`.
- **Effort adoption**: Full (~10-12h: docker-compose Grafana + JSON datasource plugin + 3-5 dashboard JSON spec). Approval new dep.

## 11. Riot / Valorant analytics

- **Cosa è**: industry pattern (Riot Games dev blogs) — heatmap spatial + funnel onboarding + retention curve + Sankey player flow tra modes.
- **Pattern adottabile**: 4 viz canonical: (1) hex heatmap kill positions (2) funnel tutorial T01→T05 (3) D1/D7/D30 retention (4) Sankey state machine session.
- **Use case Evo-Tactics**: telemetry dashboard layered — heatmap risolve "dove muoiono player", funnel risolve "quale tutorial perde retention", Sankey risolve "come fluiscono tra lobby/combat/debrief".
- **Status integration**: 🔴 pending. Zero dashboard, zero heatmap collection (raw events ok ma no aggregator).
- **Agent owner**: `telemetry-viz-illuminator`.
- **Effort adoption**: Full (~15-20h: extends #9+#10, 4 viz custom, aggregator script JSONL → time-bucketed JSON).

## 12. deck.gl hex WebGL

- **Cosa è**: library Uber per WebGL spatial viz, supporto nativo `HexagonLayer` + `H3HexagonLayer` per density maps.
- **Pattern adottabile**: hex grid encounter render → density overlay (kills, AI moves, status apply).
- **Use case Evo-Tactics**: replay analyzer post-session — overlay heatmap su encounter map originale.
- **Status integration**: 🔴 pending. Mission Console (Vue 3 prebuilt) zero deck.gl.
- **Agent owner**: `telemetry-viz-illuminator` + cross UI (Mission Console source not in repo).
- **Effort adoption**: Full (~12h, ma source UI non disponibile → blocked finché Mission Console source non ricostruito o nuovo replay viewer scratch).

## 13. DuckDB JSONL pipelines

- **Cosa è**: in-process analytical DB con SQL nativo su file JSONL/Parquet, zero server, ~10x più veloce di sqlite per analytics.
- **Pattern adottabile**: `tools/py/analyze_telemetry.py` legge `logs/session-telemetry-*.jsonl` via DuckDB SQL.
- **Use case Evo-Tactics**: telemetry analytics ad-hoc senza Postgres roundtrip — joins, aggregates, percentiles in 1 query.
- **Status integration**: 🔴 pending. Analytics ad-hoc oggi via Python pandas o awk.
- **Agent owner**: `telemetry-viz-illuminator` + `playtest-analyzer`.
- **Effort adoption**: Minimal (~3-5h: `pip install duckdb` + 5-10 query template + CLI wrapper).

## 14. Machinations.io

- **Cosa è**: tooling visual node-based per economy simulation (drains/sources/converters/triggers) con Monte Carlo runs.
- **Pattern adottabile**: 4 modelli canonical già spec'd: d20 attack distrib + PT economy + damage cap + status feedback loop.
- **Use case Evo-Tactics**: balance pre-validation prima di runtime — simula 1000 run economy in Machinations vs runtime sim.
- **Status integration**: 🟡 parziale. Spec live `docs/balance/MACHINATIONS_MODELS.md` (4 modelli), `pi-shop-monte-carlo.md`, `macro-economy-source-sink.md`. Zero modello effettivamente costruito sul tool web.
- **Agent owner**: `economy-design-illuminator`.
- **Effort adoption**: Minimal (~8-10h: build 4 modelli su machinations.io + export run results + cross-check vs `predictCombat` Node).

## 15. Game Design Patterns Wiki (Chalmers)

- **Cosa è**: catalogo academic Chalmers Univ. di game design pattern (Action Point Allowance, RPS, Asymmetric Abilities, Team Combos, etc.).
- **Pattern adottabile**: 4 pattern già wired: Action Point (AP=2 canonical), RPS (T_F axes), Asymmetric (jobs+forms), Team Combos (squadCombo focus_fire).
- **Use case Evo-Tactics**: cross-pillar reference per design review — "questo trait è Pattern X, conformità a vincoli Y".
- **Status integration**: 🟢 live. Pattern integrati implicitamente in M2 ability executor + M11 co-op + M13 jobs.
- **Agent owner**: cross (no single owner, lookup via `external-references.md` C).
- **Effort adoption**: Minimal (already-done baseline; explicit cite pattern X in PR descriptions = ~0h ongoing).

## 16. Game Programming Patterns (Nystrom)

- **Cosa è**: book canonical (robertnystrom.com/gameprog) — State Machine, Observer, Command, Component, Game Loop, Service Locator.
- **Pattern adottabile**: 4 pattern attivi nel session engine: State Machine (`statusEffectsMachine.js` xstate, `roundStatechart.js`), Observer (round event hooks), Command (round intent queue), Component (xstate FSM context).
- **Use case Evo-Tactics**: refactor reference quando session engine cresce — eg. plugin pattern (Service Locator) per `pluginLoader.js`.
- **Status integration**: 🟢 live. Architettura backend conforme. ADR-2026-04-16 round model = State Machine + Command pattern.
- **Agent owner**: cross (architecture-aware tutti gli agent backend: `session-debugger`, `schema-ripple`).
- **Effort adoption**: Minimal (already-done; reference book in nuovi ADR = ~0h).

## 17. Overwatch ECS GDC Talk (Timothy Ford)

- **Cosa è**: GDC talk Blizzard 2017 — Entity Component System architecture per Overwatch, composition over inheritance, system-driven update loop.
- **Pattern adottabile**: ECS-style: entity = `unit_id`, components = `{position, hp, status[], traits[], abilities[]}`, systems = `combatResolver`, `statusTicker`, `roundOrchestrator`.
- **Use case Evo-Tactics**: backend già parzialmente ECS-shaped (units = data, services = systems). Pattern reference per refactor `session.js` 851 LOC se cresce ancora.
- **Status integration**: 🟡 parziale. Engine session-shape ECS-compatibile ma non strict ECS (services accedono direttamente a `state.units`, no archetype query optimization).
- **Agent owner**: `session-debugger` + `schema-ripple`.
- **Effort adoption**: Full (~20h se refactor strict ECS — overkill ora; defer fino sprint multi-encounter parallel).

## 18. Software Archaeology (Hermann/Caimito)

- **Cosa è**: methodology — pattern di excavation di codice/idee buried in repo legacy, archive, branch chiusi (paper Hermann + book Caimito).
- **Pattern adottabile**: 4-state lifecycle `excavated → curated → reviewed → revived|rejected` (museum cards).
- **Use case Evo-Tactics**: 18 sprint accumulati = repo sa di "ideas in incoming/" + branch chiusi + ADR superseded. Excavation evita re-invent buried work.
- **Status integration**: 🟢 live. `docs/museum/MUSEUM.md` + `repo-archaeologist` agent + 11 cards curated 2026-04-25.
- **Agent owner**: `repo-archaeologist`.
- **Effort adoption**: Minimal (already-done; ongoing curation via agent on-demand).

## 19. Dublin Core Provenance

- **Cosa è**: metadata schema (DCMI) — 15 elements canonical (creator, source, date, rights, etc.) per provenance tracking.
- **Pattern adottabile**: museum cards frontmatter conforme Dublin Core (creator, source_url, source_branch_sha, date_excavated, rights).
- **Use case Evo-Tactics**: cross-PC museum sync via git → provenance verificata, no AI-hallucinated source.
- **Status integration**: 🟢 live. `docs/museum/cards/*.md` frontmatter conforme. Verificato 2026-04-25 (lezione `ancestors-neurons-dump-csv` PR #1818 — provenance fake → fixed).
- **Agent owner**: `repo-archaeologist`.
- **Effort adoption**: Minimal (schema in card template, ongoing enforce manuale + CI lint candidate).

## 20. git pickaxe (`git log -S`)

- **Cosa è**: tool nativo git — `git log -S "string"` cerca commit che han added/removed exact string, usato per buried code archaeology.
- **Pattern adottabile**: `git log -S "magnetic_rift" --all` per find quando trait fu introdotto/rimosso. Combina con `git log --diff-filter=D` per find deletions.
- **Use case Evo-Tactics**: investigation tool per `repo-archaeologist` — riscopre trait/feature deleted in branch chiusi.
- **Status integration**: 🟢 live. Standard tool, usato ad-hoc nei excavation di museum cards.
- **Agent owner**: `repo-archaeologist`.
- **Effort adoption**: Minimal (zero install, ongoing usage in excavation runs).

---

## Aggregati

- **Live (🟢)**: 5/20 (Patterns Chalmers + Nystrom, Software Archaeology, Dublin Core, git pickaxe). Tutti methodology/reference. Zero algoritmi runtime.
- **Parziali (🟡)**: 6/20 (MAP-Elites + Hearthstone, Pathfinder XP, LLM-as-critic, Machinations, Overwatch ECS). Spec doc live, runtime wire pending.
- **Pending (🔴)**: 9/20 (Stockfish SPRT, WFC, ASP, MCTS, Tufte, Grafana, Riot, deck.gl, DuckDB). Zero integration.

**Pattern**: Tier E methodology/reference 100% adopted; Tier E algoritmi+tooling runtime 0% wired (alti effort + dipendenze nuove).

**Top 3 highest ROI (Minimal effort, leverage immediato)**:

1. **Pathfinder XP budget** (~5-7h) — chiude calibration eyeball gap, audit doc già esistente.
2. **DuckDB JSONL pipelines** (~3-5h) — sblocca telemetry analytics V7 endpoint live.
3. **Stockfish SPRT** (~3-4h) — efficienza calibration batch (less run sprecati).

**Top 3 highest impact (Full effort, gameplay disruption)**:

1. **MAP-Elites engine** (~12-15h) — disruptive balance discovery oltre meta corrente.
2. **WFC encounter PCG** (~20-25h) — sblocca encounter author beyond handcrafted.
3. **MCTS smart playout** (~15-20h) — AI Sistema più tactical, meno scripted.

**Bloccati / approval gates**:

- ASP solver (clingo) → new Python dep approval.
- Grafana → new infra dep + docker-compose extension.
- deck.gl → blocked finché Mission Console source non ricostruito.

## Cross-ref doc esistenti

| Doc                                                                                                      | Tier E refs                           |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [`docs/balance/2026-04-25-map-elites-archive.md`](../balance/2026-04-25-map-elites-archive.md)           | #2 + #6 (spec)                        |
| [`docs/balance/2026-04-25-map-elites-archive-http.md`](../balance/2026-04-25-map-elites-archive-http.md) | #2 + #6 (HTTP wrapper)                |
| [`docs/balance/2026-04-25-encounter-xp-audit.md`](../balance/2026-04-25-encounter-xp-audit.md)           | #4 (Pathfinder gap audit)             |
| [`docs/balance/MACHINATIONS_MODELS.md`](../balance/MACHINATIONS_MODELS.md)                               | #14 (4 modelli spec)                  |
| [`docs/balance/macro-economy-source-sink.md`](../balance/macro-economy-source-sink.md)                   | #14 (variant)                         |
| [`docs/balance/2026-04-25-pi-shop-monte-carlo.md`](../balance/2026-04-25-pi-shop-monte-carlo.md)         | #14 (PI shop variant)                 |
| [`docs/museum/MUSEUM.md`](../museum/MUSEUM.md)                                                           | #18 + #19 + #20                       |
| `.claude/agents/repo-archaeologist.md`                                                                   | #18 + #19 + #20 (canonical owner)     |
| `.claude/agents/balance-illuminator.md`                                                                  | #1 + #2 + #6 + #7 + #8 (5 owners)     |
| `.claude/agents/telemetry-viz-illuminator.md`                                                            | #9 + #10 + #11 + #12 + #13 (5 owners) |
| `.claude/agents/pcg-level-design-illuminator.md`                                                         | #3 + #4 + #5 (3 owners)               |
| `.claude/agents/economy-design-illuminator.md`                                                           | #14                                   |
