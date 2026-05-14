---
title: Playtest #2 execution plan — ai-station verdict validation
doc_status: draft
doc_owner: master-dd
workstream: ai-station-playtest
last_verified: 2026-05-14
language: it
---

# Playtest #2 plan — ai-station verdict validation

Userland validation gate per 🟢-cand → 🟢 hard promotion P3+P4+P6.
Telemetry analyzer infrastructure ready ahead-of-time:
`tools/py/playtest_2_analyzer.py` + report template auto-generato.

## Obiettivi

1. **P3 Identità** — verifica job_archetype_bias preferences emergono
   in player behavior (guerriero/esploratore/tessitore/custode pick
   distinctly at elite/master tier).
2. **P4 Temperamenti** — verifica 4-layer psicologico (MBTI + Ennea +
   Conviction + Sentience) clusterizza in modo non-uniforme (player
   identity emergent).
3. **P6 Fairness** — rewind frequency + pressure tier balance OK
   (no abuse + sufficient challenge).
4. **OD-024 interoception traits** — firing rate ≥10% of attacks (proof
   sensoriale tier T1 surface visible in combat).
5. **OD-026 Skiv pulse atlas** — usage frequency ≥1× per session avg.
6. **Performance M.7** — command latency p95 < 100ms PASS gate.

## Sample size target

- **🟢 hard verdict**: **30 sessions** minimum
- **🟡 partial**: 5-29 sessions (ship pillars qualifying, repeat for gap)
- **🔴 insufficient**: <5 (defer promotion, replan)

## Setup

### Pre-playtest checklist

- [ ] Cloudflare prod deploy LIVE (Prisma migration 0010 auto-runs)
- [ ] Telemetry capture wire LIVE (verify command_latency_ms + vc_snapshot + trait_effects + skiv_pulse_fired events flowing to JSONL)
- [ ] Telemetry endpoint reachable: `/api/telemetry/log` (or local JSONL)
- [ ] Playwright agent ready (PR #246 C1 scaffold) for automated paths
- [ ] Test recruiter list ≥30 (mix MBTI + experience levels)

### Test session structure

Per session (~20-30 min):

1. Form pulse (5 axes character creation)
2. World setup + Custode reveal
3. Combat encounter (8x6 grid, 3-5 rounds)
4. Debrief (4-layer psicologico reveal)
5. Promotion decision (elite/master if eligible)
6. Optional: Atlas pulse exploration

### Telemetry events captured

| Event type                         | Captures                           |
| ---------------------------------- | ---------------------------------- |
| `attack`                           | command_latency_ms + trait_effects |
| `promotion` / `promotion_accepted` | job_id + applied_tier              |
| `vc_snapshot`                      | per_actor 4-layer psicologico      |
| `rewind`                           | rewind usage                       |
| `skiv_pulse_fired`                 | OD-026 atlas reveal events         |
| `biome_focus_changed`              | atlas neighbor click events        |

## Execution

```bash
# 1. Stream telemetry to JSONL (per session)
node apps/backend/scripts/telemetry-capture.js > playtest-2-session-N.jsonl

# 2. Aggregate all sessions
cat playtest-2-session-*.jsonl > playtest-2-all-sessions.jsonl

# 3. Run analyzer
python tools/py/playtest_2_analyzer.py \
    --telemetry playtest-2-all-sessions.jsonl \
    --output docs/playtest/$(date +%Y-%m-%d)-playtest-2-report.md \
    --min-sample 30

# 4. Review markdown report → master-dd verdict
```

## Report sections

Auto-generato analyzer:

1. **Executive summary** — sample size + 🟢/🟡/🔴 per pillar
2. **P3 promotion uptake** — tier distribution + Job × Tier breakdown
3. **P4 4-layer psicologico** — MBTI + Ennea + Conviction + Sentience
4. **P6 fairness** — pressure tier + rewind frequency
5. **OD-024 interoception** — 4 trait firing rates
6. **OD-026 atlas** — pulse events + biome reveals
7. **Performance** — p50/p95 latency vs M.7 gate
8. **Verdict + next action** — 3/3 / 2/3 / 1/3 / 0/3 pillars hard verified

## Decision matrix

| Verdict               | Action                                                         |
| --------------------- | -------------------------------------------------------------- |
| 🟢 3/3 hard           | Promote P3+P4+P6 🟢-cand → 🟢 hard. Update pillar-status.md.   |
| 🟡 2/3 partial        | Promote qualifying pillars. Repeat playtest #3 for gap pillar. |
| 🟡 1/3 partial        | Single pillar promotion + cause analysis for non-qualifying.   |
| 🔴 0/3 / undersampled | Broader recruitment + Playtest #2bis.                          |

## Cross-link

- Analyzer: `tools/py/playtest_2_analyzer.py`
- Tests: `tools/py/test_playtest_2_analyzer.py` (19 unit tests)
- Synthetic fixture: `tests/fixtures/playtest-2-synthetic-telemetry.jsonl`
- ai-station re-analisi: `vault docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md`
- Phase B3: PR #2264 (Game/) + #261 (Godot v2)
- Envelope A+B+C: PRs #2261/#2262/#259/#260
- Skiv pulse wire: PR #262
- D2-C Prisma: PR #2259 (Cloudflare prod deploy auto-deploys migration 0010)
