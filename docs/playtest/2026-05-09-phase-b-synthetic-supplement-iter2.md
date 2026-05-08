---
title: 'Phase B synthetic supplement iter2 — Tier 1 phone smoke regression check 2026-05-09'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-09
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/planning/2026-05-07-phase-a-handoff-next-session.md
tags: [playtest, phase-b, synthetic, tier-1, supplement, day-3-monitoring]
---

# Phase B synthetic supplement iter2 — 2026-05-09

Phase A Day 3/7 monitoring window (OD-021 trigger autonomous Day 3+5+7 only). Pattern γ Claude synthetic supplement regression check vs iter1 baseline 2026-05-08. **NOT replace canonical 4-amici social playtest** (ADR-2026-05-05 §5 trigger 2/3).

## 1. Scope statement

**What this run IS**:

- Tier 1 functional gate fresh capture localhost (regression check vs iter1)
- Bug bundle B5+B6+B7+B8+B9+B10 + iter3 host reconnect 90s grace + WS RTT p95 baseline guard
- Multi-client 4-context scaling Playwright deterministic
- Canvas visual baseline + color sampling

**What this run IS NOT**:

- Phase B trigger 2/3 satisfaction (require 4 amici + master-dd social playtest, OD-017 downgraded nice-to-have 2026-05-08)
- Hardware residue coverage (WAN/touch/airplane/thermal — master-dd hardware-only)

## 2. Setup

```bash
cd /c/Users/VGit/Desktop/Game
LOBBY_WS_SHARED=true PORT=3334 npm run start:api &
# Health probe: {"status":"ok","service":"idea-engine"} after ~5s
PHONE_BASE_URL=http://localhost:3334 npm --prefix tools/ts run test:phone:smoke
# Cleanup:
taskkill //F //PID <backend_pid>
```

Backend launch UTC 2026-05-08 12:30 (calendar Day 2 evening / Day 3 trigger autonomous per OD-021), killed clean post-harness, port 3334 freed.

Main repo HEAD post-pull: `51d9df4e` (= post-Day-2-closure #2116 memory save).

## 3. Results

**15/16 PASS + 1 SKIP** (39.8s, 3 worker parallel):

| Test                                                                             | Status |  Time | Coverage                               |
| -------------------------------------------------------------------------------- | :----: | ----: | -------------------------------------- |
| canvas-visual canvas mounts non-zero dimensions                                  |   ✅   | 897ms | Phone HTML5 canvas init                |
| canvas-visual canvas renders content post-load                                   |   ✅   | 20.8s | Lobby form/splash visible              |
| canvas-visual color sampling utilities                                           |   ✅   |   7ms | NxM grid helper                        |
| phone-multi host create + player join intact                                     |   ✅   |  1.8s | Lobby lifecycle baseline               |
| phone-multi state_version field numeric                                          |   ✅   | 524ms | B5 baseline                            |
| phone-multi 4 contexts join max_players honored                                  |   ✅   |  4.2s | Multi-client scaling                   |
| phase-flow-ws B5+B7 phase=onboarding broadcast versioned to all peers            |   ✅   |  1.3s | B5 broadcast + host preserved          |
| phase-flow-ws B5+B8 lobby → char_creation → world_setup, host preserved          |   ✅   | 517ms | Phase advance defer guard              |
| phase-flow-ws B9+B10 world_tally + world_vote_accepted ACK voter only            |   ✅   | 746ms | NO unknown_type bystander              |
| phase-flow-ws B5 monotonic version 3 transitions (lobby → char → world → combat) |   ✅   | 569ms | Versioned event ordering               |
| phase-flow-ws B6 unrecognized intent does NOT trigger unknown_type bystander     |   ✅   |  1.2s | B6 regression guard                    |
| phase-flow-ws B5 boundary invalid phase rejected (no broadcast leak)             |   ✅   |  2.4s | Negative path                          |
| phase-flow-ws combat → debrief → ended e2e endCombat REST + retreat next_macro   |   ✅   | 839ms | Full lifecycle close                   |
| phase-flow-ws Iter3 item 3 host disconnect+reconnect within 90s grace preserved  |   ✅   | 30.9s | Reconnect grace lobbyHostTransferGrace |
| phase-flow-ws Iter3 item 2 WS RTT p95 baseline (proxy for 5R combat p95)         |   ✅   | 441ms | Latency baseline localhost             |
| phase-flow-ws Iter3 item 1 Cloudflare tunnel WAN RTT (env-gated)                 |   ⏸   |     — | TUNNEL_URL unset → skip (expected)     |

**Verdict synthetic**: Tier 1 functional gate **PASS** — zero regression vs iter1 Day 2 (2026-05-08).

## 4. Comparative analysis Day 1 → Day 2 → Day 3

| Metric                         | Day 1 (2026-05-07) | Day 2 (2026-05-08) | Day 3 (2026-05-09) | Delta D2→D3 |
| ------------------------------ | ------------------ | ------------------ | ------------------ | ----------- |
| Total test                     | 16 (15 + 1 skip)   | 16 (15 + 1 skip)   | 16 (15 + 1 skip)   | =           |
| Total runtime                  | ~30-40s            | 39.4s              | 39.8s              | +0.4s noise |
| B5 broadcast guard             | ✅                 | ✅                 | ✅                 | =           |
| B6 unknown_type guard          | ✅                 | ✅                 | ✅                 | =           |
| B7 host preserve grace         | ✅                 | ✅                 | ✅                 | =           |
| B8 phase advance defer         | ✅                 | ✅                 | ✅                 | =           |
| B9+B10 world_tally + ACK       | ✅                 | ✅                 | ✅                 | =           |
| Iter3 reconnect 90s grace      | ✅ (~31s)          | ✅ (31.0s)         | ✅ (30.9s)         | =           |
| Iter3 WS RTT p95 baseline      | ✅                 | ✅ (429ms)         | ✅ (441ms)         | +12ms noise |
| Multi-client 4 context scaling | ✅                 | ✅                 | ✅                 | =           |
| Canvas mount + content render  | ✅                 | ✅                 | ✅                 | =           |

**Zero functional regression Day 1 → Day 2 → Day 3**. Phase A LIVE 50% monitoring window (Day 3/7) stable.

Runtime delta +0.4s + RTT delta +12ms = environmental noise (CPU scheduling, lobby bootstrap variance), well below significance threshold.

## 5. Master-dd weekend playtest signal — absent

Calendar Day 2/7 sera (post-handoff Day 2 closure 2026-05-08 00:28 UTC #2116 memory save):

- 12+h silenzio post-closure (Day 2/7 master-dd verdict 5/5 OD chiusi shipped, no follow-up trigger)
- Zero PR/comment/Discord/email da master-dd post sera 2026-05-07
- Zero Phase B trigger 2/3 invocation

OD-017 verdict 2026-05-08: Phase B trigger 2/3 **DOWNGRADE nice-to-have**. Synthetic-only path (Option γ continuous) sufficient se hardware regression assente.

Pertanto Day 3 monitoring = **autonomous safe**, ZERO master-dd burden invocato.

## 6. Continuous monitoring schedule status

Per OD-021 (Option C ridotto Day 3+5+7 only):

| Day | Date       | Action                                  |  Status   |
| --- | ---------- | --------------------------------------- | :-------: |
| 1   | 2026-05-07 | Tier 1 baseline shipped (canonical)     |   done    |
| 2   | 2026-05-08 | Synthetic supplement iter1              |   done    |
| 3   | 2026-05-09 | Synthetic supplement iter2 (questo run) | **done**  |
| 4   | 2026-05-10 | Skip (weekend, OD-021 confirmed)        |     —     |
| 5   | 2026-05-11 | Synthetic supplement iter3              | scheduled |
| 6   | 2026-05-12 | Skip (OD-021 Day 3+5+7 only)            |     —     |
| 7   | 2026-05-13 | Synthetic supplement iter4 final        | scheduled |
| 8   | 2026-05-14 | Phase B trigger eval — master-dd        | userland  |

Cumulative Claude effort 7-day cycle: ~15-20min + zero master-dd burden.

## 7. Phase A guard health summary

- ✅ CI Game/ main verde (5/5 last runs incluso Skiv Monitor 4/4 post-restore)
- ✅ CI Godot v2 main verde (5/5 last runs)
- ✅ Tier 1 functional gate stable iter1 → iter2 (zero functional regression)
- ✅ Iter3 hardware-equivalent (host reconnect 90s + WS RTT p95) zero degradation
- ✅ No critical bug regression Phase A (continuous monitoring trigger ADR §4.4 NOT fired)
- ✅ Master-dd verdict 5/5 OD chiusi (#2114 shipped Day 2/7)
- ✅ Skiv Monitor restored post 12gg fail streak (#2115 admin merge override)

## 8. Cross-ref

- ADR canonical: [`docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) §5 + §6 amendment Day 2/7
- Iter1 baseline: [`docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md`](2026-05-08-phase-b-synthetic-supplement-iter1.md)
- Workflow doc: [`docs/playtest/AGENT_DRIVEN_WORKFLOW.md`](AGENT_DRIVEN_WORKFLOW.md)
- Handoff: [`docs/planning/2026-05-07-phase-a-handoff-next-session.md`](../planning/2026-05-07-phase-a-handoff-next-session.md)
- OD tracker: [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md) OD-017 + OD-021

## 9. Status

**SPEC ACTIVE** — synthetic supplement Day 3/7. Phase A LIVE 50% monitoring stable. Iter3 scheduled 2026-05-11 (Day 5).

Anti-pattern guard CLAUDE.md §"Verify Before Claim Done": questo run NON claim "Phase B accepted". Solo regression detection + canonical evidence dataset supplement Day 3 cumulative.
