---
title: 'Phase B synthetic supplement iter1 — Tier 1 phone smoke fresh capture 2026-05-08'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-08
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/planning/2026-05-07-phase-a-handoff-next-session.md
tags: [playtest, phase-b, synthetic, tier-1, supplement, day-2-monitoring]
---

# Phase B synthetic supplement iter1 — 2026-05-08

Phase A Day 2/7 monitoring window. Pattern γ Claude browser MCP synthetic supplement (user explicit request 2026-05-08 cumulative session). **NOT replace canonical 4-amici social playtest** (ADR-2026-05-05 §5 trigger 2/3). Solo evidence supplement post-Phase-A-stable + pre-master-dd-Option-α/β.

## 1. Scope statement

**What this run IS**:

- Tier 1 functional gate fresh capture localhost
- Regression guard B5+B6+B7+B8+B9+B10 + iter3 host reconnect 90s grace + WS RTT p95 baseline
- Multi-client 4-context scaling Playwright deterministic
- Canvas visual baseline + color sampling

**What this run IS NOT**:

- Phase B trigger 2/3 satisfaction (require 4 amici + master-dd social playtest)
- Hardware residue coverage: WAN RTT geographic LTE | touch p95 capacitive iOS Safari | airplane mode tab background pause | device thermal/memory throttling
- UX subjective verdict ("è divertente?", "tactical leggible?", "co-op coherent?")

## 2. Setup

```bash
# Backend Game/ main repo path
cd /c/Users/VGit/Desktop/Game
LOBBY_WS_SHARED=true PORT=3334 nohup node apps/backend/index.js > /tmp/backend-phase-b-supplement.log 2>&1 &
# Wait ~6s health
curl -sI http://localhost:3334/api/lobby/list  # 200 OK + {"rooms":[],"count":0}

# Run Tier 1 phone smoke harness localhost
PHONE_BASE_URL=http://localhost:3334 npm --prefix tools/ts run test:phone:smoke
# Total: 39.4s, 3 worker parallelism, 16 test (1 skip iter3 tunnel env-gated)

# Cleanup
taskkill /F /PID <backend_pid>
```

Backend PID 33004 launch UTC 2026-05-08, killed clean post-harness, port 3334 freed.

## 3. Results

**15/16 PASS + 1 SKIP** (39.4s):

| Test                                                                             | Status |  Time | Coverage                               |
| -------------------------------------------------------------------------------- | :----: | ----: | -------------------------------------- |
| canvas-visual canvas mounts non-zero dimensions                                  |   ✅   | 612ms | Phone HTML5 canvas init                |
| canvas-visual canvas renders content post-load                                   |   ✅   | 20.7s | Lobby form/splash visible              |
| canvas-visual color sampling utilities                                           |   ✅   |   3ms | NxM grid helper                        |
| phone-multi host create + player join intact                                     |   ✅   |  1.5s | Lobby lifecycle baseline               |
| phone-multi state_version field numeric                                          |   ✅   | 462ms | B5 baseline                            |
| phone-multi 4 contexts join max_players honored                                  |   ✅   |  3.6s | Multi-client scaling                   |
| phase-flow-ws B5+B7 phase=onboarding broadcast versioned to all peers            |   ✅   | 995ms | B5 broadcast + host preserved          |
| phase-flow-ws B5+B8 lobby → char_creation → world_setup, host preserved          |   ✅   | 512ms | Phase advance defer guard              |
| phase-flow-ws B9+B10 world_tally + world_vote_accepted ACK voter only            |   ✅   | 753ms | NO unknown_type bystander              |
| phase-flow-ws B5 monotonic version 3 transitions (lobby → char → world → combat) |   ✅   | 691ms | Versioned event ordering               |
| phase-flow-ws B6 unrecognized intent does NOT trigger unknown_type bystander     |   ✅   |  2.5s | B6 regression guard                    |
| phase-flow-ws B5 boundary invalid phase rejected (no broadcast leak)             |   ✅   | 768ms | Negative path                          |
| phase-flow-ws combat → debrief → ended e2e endCombat REST + retreat next_macro   |   ✅   | 873ms | Full lifecycle close                   |
| phase-flow-ws Iter3 item 3 host disconnect+reconnect within 90s grace preserved  |   ✅   | 31.0s | Reconnect grace lobbyHostTransferGrace |
| phase-flow-ws Iter3 item 2 WS RTT p95 baseline (proxy for 5R combat p95)         |   ✅   | 429ms | Latency baseline localhost             |
| phase-flow-ws Iter3 item 1 Cloudflare tunnel WAN RTT (env-gated)                 |   ⏸   |     — | TUNNEL_URL unset → skip (expected)     |

**Verdict synthetic**: Tier 1 functional gate **PASS** — zero regression vs Day 1 baseline shipped sessione 2026-05-07.

## 4. Comparative analysis Day 1 baseline vs Day 2

| Metric                         | Day 1 (2026-05-07)    | Day 2 (2026-05-08)    | Delta |
| ------------------------------ | --------------------- | --------------------- | ----- |
| Total test                     | 16 (15 pass + 1 skip) | 16 (15 pass + 1 skip) | =     |
| Total runtime                  | ~similar (~30-40s)    | 39.4s                 | =     |
| B5 broadcast guard             | ✅                    | ✅                    | =     |
| B6 unknown_type guard          | ✅                    | ✅                    | =     |
| B7 host preserve grace         | ✅                    | ✅                    | =     |
| B8 phase advance defer         | ✅                    | ✅                    | =     |
| B9+B10 world_tally + ACK       | ✅                    | ✅                    | =     |
| Iter3 reconnect 90s grace      | ✅ (~31s)             | ✅ (31.0s)            | =     |
| Iter3 WS RTT p95 baseline      | ✅                    | ✅                    | =     |
| Multi-client 4 context scaling | ✅                    | ✅                    | =     |

**Zero functional regression Day 1 → Day 2**. Phase A LIVE stable confirmed.

## 5. Limitations + master-dd action menu (canonical)

Synthetic supplement NON sostituisce ADR-2026-05-05 §5 trigger 2/3:

> _"1+ playtest session pass post-cutover (4 amici + master-dd, full combat scenario)"_

Master-dd action 3-option menu:

### Option α (canonical) — full social playtest 4 amici + master-dd

- 5 player umani (Discord/WhatsApp setup)
- Effort ~1-2h userland
- Outcome: trigger 2/3 ✅ canonical

### Option β (lighter) — master-dd solo hardware

- 2 device proprio (PC + phone)
- 5 round combat + 3 hardware-only check (WAN/touch/airplane)
- Effort ~30min userland
- Outcome: trigger 2/3 ⚠️ borderline (physical residue OK, social NO)

### Option γ (synthetic) — questo run shipped 2026-05-08

- Zero player umano
- Tier 1 functional + iter3 hardware-equivalent ~70-90% fidelity
- Effort ~5min Claude
- Outcome: trigger 2/3 ❌ NON canonical, supplement evidence only

**Recommendation master-dd**: Option α canonical → Phase B ACCEPTED. Option β fallback se 4 amici NON disponibili settimana 2026-05-08→14. Option γ continuous supplement (Claude può rerun ogni Day N monitoring window per regression detection autonomous).

## 6. Hardware residue coverage check

Tier 1 layered QA infra **NON copre** (master-dd hands-on canonical, vedi `docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md`):

| Item                                   | Why hardware-only                                                      | Master-dd action                              |
| -------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| Real WAN RTT geografico LTE            | LTE → CF edge → backend (vs localhost roundtrip)                       | Tunnel tab phone real device                  |
| Touch p95 mobile capacitive iOS Safari | Capacitive sensor + iOS Safari render path differs from desktop cursor | Touch fingertip 5R combat                     |
| Airplane mode tab background pause     | Mobile browser tab background pause OS-level (no DevTools equivalent)  | Mobile airplane toggle + 30s wait + reconnect |
| Device thermal/memory throttling       | Sustained combat 5R+ on mid-tier phone                                 | Sostained 10min usage check                   |

**Iter3 item 1 Cloudflare tunnel WAN RTT** (skipped today, env-gated):

```bash
# Run iter3 WAN RTT capture (master-dd opzionale Option β):
./tools/deploy/deploy-quick.sh
# → URL https://<random>.trycloudflare.com
PHONE_BASE_URL=https://<random>.trycloudflare.com npm --prefix tools/ts run test:phone:smoke -- --grep Iter3
```

## 7. Continuous monitoring schedule (proposal)

Pattern γ synthetic supplement = Claude può rerun zero-cost Day 3-7. Cadence proposta:

| Day | Date       | Action                                           | Effort Claude |
| --- | ---------- | ------------------------------------------------ | :-----------: |
| 1   | 2026-05-07 | Tier 1 + Tier 1 ext shipped (canonical baseline) |    (done)     |
| 2   | 2026-05-08 | Synthetic supplement iter1 (questo run)          |     ~5min     |
| 3   | 2026-05-09 | Synthetic supplement iter2 (regression check)    |     ~5min     |
| 4   | 2026-05-10 | Skip (weekend opzionale)                         |       —       |
| 5   | 2026-05-11 | Synthetic supplement iter3                       |     ~5min     |
| 6   | 2026-05-12 | Synthetic supplement iter4                       |     ~5min     |
| 7   | 2026-05-13 | Synthetic supplement iter5 final                 |     ~5min     |
| 8   | 2026-05-14 | Phase B trigger eval — master-dd verdict         |   userland    |

Total Claude effort 7-day cycle: ~25-30min cumulative + zero master-dd burden.

Master-dd action: solo Phase B trigger 2/3 (Option α | β) post-7gg-grace-end.

## 8. Cross-ref

- ADR canonical: [`docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) §5 trigger Phase B
- Workflow doc: [`docs/playtest/AGENT_DRIVEN_WORKFLOW.md`](AGENT_DRIVEN_WORKFLOW.md) §Pattern B + §Mobile residue
- Master-dd 10min checklist: [`docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md`](2026-05-07-master-dd-validation-10min-checklist.md)
- Handoff: [`docs/planning/2026-05-07-phase-a-handoff-next-session.md`](../planning/2026-05-07-phase-a-handoff-next-session.md)
- Iter3 baseline shipped: [PR #2099](https://github.com/MasterDD-L34D/Game/pull/2099) `196f606`

## 9. Status

**SPEC ACTIVE** — synthetic supplement evidence Phase A Day 2/7 monitoring window. Master-dd Option α/β verdict still required pre-Phase-B-Day-7-end (2026-05-14).

Anti-pattern guard CLAUDE.md §"Verify Before Claim Done": questo run NON claim "Phase B accepted". Solo regression detection + canonical evidence dataset supplement.
