---
title: Telemetry Viz Illuminator Agent — Smoke Test (4-gate DoD G2)
workstream: ops-qa
category: qa
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  - agent
  - smoke-test
  - telemetry-viz-illuminator
  - 4-gate-dod
related:
  - .claude/agents/telemetry-viz-illuminator.md
  - .claude/agents/balance-illuminator.md
  - .claude/agents/ui-design-illuminator.md
  - .claude/agents/pcg-level-design-illuminator.md
---

# Smoke Test: `telemetry-viz-illuminator`

**Data**: 2026-04-26
**Target**: dry-run `--mode audit --topic "existing telemetry JSONL + analysis infrastructure"`

## Input

- `apps/backend/routes/session.js` — `POST /api/session/telemetry` endpoint
- `logs/telemetry/*.jsonl` — batch JSONL append
- `tools/py/batch_calibrate_*.py` — harness JSON output
- `packages/contracts/schemas/combat.schema.json`
- `.claude/agents/playtest-analyzer.md` — existing agent
- `docs/playtest/*.md` + `batch_*.json` — historical analysis

## Execution trace

### Step 1: Identify telemetry surface

Grep `POST /api/session/telemetry` + event types:

- Event types noti: `session_start`, `turn_end`, `ability_use`, `damage_taken`, `damage_dealt`, `reward_offer`, `reward_accept`, `reward_skip`, `sg_earn`, `pack_roll`, `mbti_projection`, `session_end`
- Storage: JSONL append cap 200/file in `logs/telemetry/`
- Anonymous events allowed (aggregate on scenario_id / encounter_id / modulation / build_hash)

### Step 2: Gap analysis matrix

| Dimensione                 |   Status   | Fix prioritario                                  |
| -------------------------- | :--------: | ------------------------------------------------ |
| Event schema consistency   | 🟡 PARTIAL | Define `telemetry.schema.json` esplicita         |
| Aggregation pipeline       | 🔴 MISSING | DuckDB script `tools/py/telemetry_analyze.py`    |
| Dashboard live             | 🔴 MISSING | Observable Plot standalone page                  |
| Heatmap spatial (hex grid) | 🔴 MISSING | deck.gl HexagonLayer (post-playtest N=100+)      |
| Funnel analysis            | 🔴 MISSING | DuckDB query + tutorial_start/complete events    |
| Sankey flow                | 🔴 MISSING | Google Charts per reward R/A/P pool flow         |
| Sparkline small multiples  | 🔴 MISSING | Observable Plot per scenario WR/KD/dmg_taken     |
| D-retention cohort         | 🔴 MISSING | Richiede player ID stable (oggi anonymous) — V6+ |

**Gap rating**: 🔴 HIGH — telemetry endpoint è shipped ma aggregation/viz quasi-zero.

### Step 3: Pattern recommendation (P0)

Applying decision tree dal spec:

- "Need fast JSONL analytics?" YES → **DuckDB + Pandas** (P0)
- "Need spatial correlation?" YES post-playtest → **Heatmap + deck.gl** (P0, N=100+)
- "Need drop-off analysis?" YES per tutorial 01-05 → **Funnel + D1/D7/D30** (P0)
- "Need overview dashboard?" YES per playtest session → **Sparkline small multiples** (P0)

### Step 4: Specific recommendations

| #   | Pattern                     | Scope                                                            | Effort |
| --- | --------------------------- | ---------------------------------------------------------------- | :----: |
| 1   | DuckDB aggregation pipeline | `tools/py/telemetry_analyze.py` read JSONL → DataFrame           |   3h   |
| 2   | Funnel analysis tutorial    | Add `tutorial_start` + `tutorial_complete` events + DuckDB query |   2h   |
| 3   | Observable Plot dashboard   | `apps/analytics/index.html` sparkline small multiples            |   4h   |
| 4   | Telemetry schema explicit   | `packages/contracts/schemas/telemetry.schema.json` + AJV         |   2h   |
| 5   | deck.gl HexagonLayer POC    | Post-TKT-M11B-06 quando N≥100                                    |   6h   |

### Step 5: Report output

Dry-run genererebbe `docs/analytics/2026-04-26-telemetry-infra-audit.md` con:

- Frontmatter YAML
- Gap analysis matrix 8-dim
- Pattern recommendation P0/P1/P2
- Effort estimate per recommendation
- Baseline + target metric per ogni

## Verdict

### 🟢 USABLE

**Strengths**:

- Gap analysis matrix 8-dim genera audit sistematico
- Pattern selection decision tree concreto
- Escalation path esplicito (playtest-analyzer esistente + balance-illuminator + ui)
- Anti-pattern 10 items (incl. content farm blocklist)
- Fonte primary Tufte (classica) + industry (Riot, Grafana, GameAnalytics) + docs

**Non toccato** (nice-to-have):

- Automated telemetry schema generation da TypeScript types = P1 backlog
- Real-time dashboard (vs batch) = Grafana stack, deferred

## Gate compliance

- **G1 Research**: ✅ 16 web searches, primary sources Tufte / GDC / Riot Games / Grafana / DuckDB / deck.gl
- **G2 Smoke**: ✅ dry-run completato verdict USABLE
- **G3 Tuning**: ✅ spec ben strutturato, no post-fix richiesto
- **G4 Optimization**: ✅ caveman data-accurate, matrix numbered, escalation esplicita

## Next action

Agent pronto. Commit + PR merge. Ultimo del quartetto.

## Sources

- Agent spec: `.claude/agents/telemetry-viz-illuminator.md`
- Research primary: [Tufte Sparkline Theory](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/), [Riot Valorant Scalability](https://technology.riotgames.com/news/scalability-and-load-testing-valorant), [DuckDB Game Telemetry Quix](https://quix.io/docs/blog/2024/09/18/game-telemetry-duckdb-quixstreams.html), [GameAnalytics Balance Flow Maps](https://www.gameanalytics.com/blog/balance-and-flow-maps), [deck.gl HexagonLayer](https://deck.gl/gallery/hexagon-layer), [Grafana GitHub](https://github.com/grafana/grafana)
