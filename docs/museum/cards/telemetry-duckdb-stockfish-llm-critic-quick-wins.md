---
title: 'Tier E quick wins — DuckDB + Stockfish SPRT + LLM-as-critic (P6 ops ROI)'
museum_id: M-2026-04-27-010
type: research
domain: telemetry_balance
provenance:
  found_at: docs/research/2026-04-26-tier-e-extraction-matrix.md#1-stockfish-sprt
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: platform-docs
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: 3 quick wins ~10-15h totali (DuckDB + SPRT + LLM critic) / Moderate: + Tufte sparklines dashboard (~7h) / Full: MAP-Elites + MCTS + Riot/Valorant viz (~50h+)'
related_pillars: [P6, cross-cutting]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Tier E quick wins — DuckDB + Stockfish SPRT + LLM-as-critic (P6 ops)

## Summary (30s)

- **4/5 score** — 3 tech voci ad alto-ROI Min-effort che chiudono ops gap di calibration + analytics. Ognuno ≤5h.
- **Bundle**: DuckDB JSONL pipelines (~3-5h) + Stockfish SPRT (~3-4h) + LLM-as-critic balance loop (~4-6h) = **~10-15h totali**.
- **Pathfinder XP budget shipped** PR #1894/#1899 (primo pezzo Tier E). MAP-Elites spec'd ma runtime engine pending (Full ~12-15h).

## What was buried

Tier E matrix categorizza 20 voci tech (algoritmi + tooling + academic + book + methodology). 5/20 live (methodology), 6/20 spec'd, 9/20 pending. Top 3 quick wins Min-effort:

- 🔴 **Stockfish SPRT** (~3-4h) — Sequential Probability Ratio Test per accept/reject patch tuning. Wrapper su `tools/py/batch_calibrate_*.py` esistente. scipy.stats.
- 🔴 **DuckDB JSONL pipelines** (~3-5h) — in-process analytical DB con SQL nativo su file JSONL/Parquet. ~10x sqlite. `tools/py/analyze_telemetry.py` legge `logs/session-telemetry-*.jsonl`.
- 🔴 **LLM-as-critic** (~4-6h) — methodology dove LLM judge candidate solutions vs criteria. Balance loop "propose tune → simulate → LLM critique outcome → propose new tune".

⏸️ **ASP solver, Grafana, deck.gl** — blocked dep approval o source not in repo.
⏸️ **MAP-Elites engine, MCTS, WFC, Riot/Valorant viz** — Full effort >12h, defer.

## Why it might still matter

### Pillar match

- **P6 Fairness 🟡+**: hardcore-07 deadlock multiplier knob exhausted. SPRT accelera calibration cycle. LLM-as-critic sostituisce manuale eyeball "iter1 96% → bump hp +3" con loop auto-iterativo.
- **Cross-cutting ops**: DuckDB JSONL ad-hoc analytics → unblocks `/api/session/telemetry` V7 endpoint dati raw.

### Convergenza calibration efficiency (3 fonti)

- **Stockfish SPRT** (early-stop su confidenza)
- **LLM-as-critic** (auto-iterative tune loop)
- **MAP-Elites Hearthstone** (deck space exploration oltre meta)

3 metodologie complementari per balance disruption. SPRT = efficienza single-loop, LLM = auto-iter, MAP-Elites = breadth disruption.

### File targets

- Calibration harness: [`tools/py/batch_calibrate_hardcore0[67].py`](../../../tools/py/) — N=10/30 fisso
- Telemetry endpoint: [`apps/backend/routes/session.js`](../../../apps/backend/routes/session.js) `/api/session/telemetry`
- JSONL output: `logs/session-telemetry-*.jsonl`
- Spec docs:
  - `docs/balance/2026-04-25-map-elites-archive.md`
  - `docs/balance/MACHINATIONS_MODELS.md`
  - `docs/balance/2026-04-25-encounter-xp-audit.md`

### Cross-card relations

- M-2026-04-27-005 [Hades Multi-Currency](economy-hades-multi-currency-pact-menu.md) — economy validation pre-runtime via Machinations
- M-Tier-E spec docs — MAP-Elites + Machinations roadmap

## Concrete reuse paths

### Minimal — 3 quick wins (~10-15h totali)

**Stockfish SPRT** (~3-4h):

1. `tools/py/sprt_wrapper.py` (NEW) — wrap existing batch_calibrate scripts
2. `scipy.stats` SPRT loop: H0 win_rate <= baseline, H1 >= baseline + delta, alpha/beta=0.05
3. Stop early on significance reached → meno run sprecati
4. Smoke test su hardcore-07 calibration

**DuckDB JSONL** (~3-5h):

1. `pip install duckdb` (verify dev requirements)
2. `tools/py/analyze_telemetry.py` (NEW) — DuckDB SQL query library
3. 5-10 query template: per-session win-rate, status apply distribution, kill heatmap raw, retention D1/D7
4. CLI wrapper: `python tools/py/analyze_telemetry.py --query <name>` → JSON output

**LLM-as-critic** (~4-6h):

1. `tools/py/llm_critic_loop.py` (NEW) — prompt template + harness orchestrator
2. Loop: read calibration result → format LLM prompt → propose new tune → apply → re-run batch
3. Cap iterations (max 3) per evitare runaway
4. Approval gate: write proposed tune → require user confirm → apply

### Moderate — + Tufte sparklines dashboard (~7h)

1. HTML statico dashboard `docs/playtest/dashboard/` con Chart.js sparkline component
2. Small-multiples grid CSS per per-session viz
3. Auto-refresh on new telemetry JSONL append
4. Cross-link da Mission Console oppure standalone tool

### Full — MAP-Elites + MCTS + Riot/Valorant (~50h+)

- MAP-Elites engine ~12-15h (vedi #2-#6 spec)
- MCTS smart playout ~15-20h (replace random rollout in predictCombat)
- Riot/Valorant 4 viz canonical ~15-20h (heatmap + funnel + retention + Sankey)

## Tickets proposed

- [`TKT-BALANCE-STOCKFISH-SPRT`](../../../data/core/tickets/proposed/TKT-BALANCE-STOCKFISH-SPRT.json) (4h) — quick win
- [`TKT-TELEMETRY-DUCKDB-JSONL`](../../../data/core/tickets/proposed/TKT-TELEMETRY-DUCKDB-JSONL.json) (4h) — quick win
- [`TKT-BALANCE-LLM-AS-CRITIC`](../../../data/core/tickets/proposed/TKT-BALANCE-LLM-AS-CRITIC.json) (5h) — quick win
- [`TKT-TELEMETRY-TUFTE-SPARKLINES`](../../../data/core/tickets/proposed/TKT-TELEMETRY-TUFTE-SPARKLINES.json) (7h) — moderate
- 8 altri Tier E ticket Full effort (deferred)

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-e-extraction-matrix.md`](../../research/2026-04-26-tier-e-extraction-matrix.md) §1, §13, §8
- Stockfish: chessprogramming.org, scipy.stats SPRT
- DuckDB: duckdb.org (in-process OLAP)
- LLM-as-critic: pattern Anthropic / Claude Sonnet 4.6 critic mode
- PR shipped Pathfinder XP: [#1894](https://github.com/MasterDD-L34D/Game/pull/1894)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.4

## Risks / open questions

- **DuckDB new dep**: pip install — minimal risk (single self-contained lib).
- **LLM-as-critic cost**: API call per iteration. Cap iterations + cost budget.
- **SPRT validity assumption**: assume independent runs. Re-validate per multi-encounter campaign batch.
- **Tufte dashboard scope**: HTML statico vs dynamic — tieni statico Min, defer dynamic Moderate.

## Anti-pattern guard

- ❌ NON ASP solver senza dep approval (clingo new Python dep)
- ❌ NON Grafana senza docker-compose extension approval
- ❌ NON deck.gl finché Mission Console source non disponibile
- ❌ NON SPRT loop senza early-stop alpha/beta cap (può loopare infinito)
- ❌ NON LLM critic auto-apply senza user gate (loss of control)
- ✅ DO methodology+reference 100% adopted (Patterns Chalmers, Nystrom, Software Archaeology, Dublin Core)
- ✅ DO ad-hoc analytics via SQL (DuckDB) NOT pandas (slower)
