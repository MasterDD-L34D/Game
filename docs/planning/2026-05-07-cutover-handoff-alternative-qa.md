---
title: 'Cutover Phase A handoff — alternative QA infra (post-hardware retry iter1+iter2)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 7
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md
  - docs/playtest/2026-05-07-phone-smoke-bundle-rca.md
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/reports/2026-05-07-cross-repo-audit-synthesis.md
tags: [cutover, godot-v2, phase-a, qa-infra, handoff, playwright, alternative-approach]
---

# Cutover Phase A handoff — alternative QA infra

Sessione 2026-05-07 (resume guidata + agenti) ha eseguito 2 iterazioni hardware retry phone validation. Pattern emergente: **hardware retry come functional gate è instrument errato**. Diminishing returns + signal noise. Master-dd decide alt session esplora QA infra rinnovata.

## Cosa è successo (forensic)

### Iter1 — chip session (browser-headless)

Trovato **B6 + B7 + B8** runtime bugs:

- B6: `[unknown_type]: character_accepted` — stale dist (char_create handler PR #197 non incluso)
- B7: host kicked dalla room — stale dist (host preserve PR #169 non incluso)
- B8: player non-host stuck STAGE_TRANSITION — defer guard re-fire da `transition_complete`

Fix shipped same session:

- [Godot v2 #205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205) `d48efe1` — B8 fix (defer guard helper extract)
- [Godot v2 #206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) `00e11c4` — deploy-quick rebuild dist default (B6+B7 prevention)
- [Game/#2091](https://github.com/MasterDD-L34D/Game/pull/2091) `77644e8f` — RCA forensic post-mortem
- [Game/#2092](https://github.com/MasterDD-L34D/Game/pull/2092) `b3667b2c` — agent-driven workflow canonical doc

### Iter2 — master-dd hardware retry post-fix iter1

Phone reali (Android Chrome host + iOS Safari player) trovato **B9 + B10** runtime bugs:

- B9: `[unknown_type]: world_tally` — phone composer ZERO subscription handler per world_tally broadcast (3x in `wsSession.js:928,967,1396`)
- B10: `[unknown_type]: world_vote_accepted` — host phone toast post-voto (info-only ACK non gestito)

Plus: backend silent crash post-onboarding (no log error, server PID died) — possibile correlazione con B9/B10 cascading exceptions.

Fix shipped:

- [Godot v2 #207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207) `3909cb2c` — B9+B10 phone composer subscription handlers + 12 GUT tests (1883 → 1899)

**Iter3 NON eseguita** — master-dd decide stop, considerare approccio alternativo QA.

## Pattern problematico identificato

```
bash hack → cmd → tunnel → cloudflared → Express :3334 → 2 phone real
   ↓
   5 layer brittle, ogni env hop cumulativo
   ↓
   Iter loop wallclock ~30min per validate single fix
   ↓
   Trovato bugs 1-by-1 hardware → fix → rebuild dist → redeploy → retest
   ↓
   Cumulative cost: ~2h master-dd + ~3h Claude orchestrator per round
```

**Anti-pattern**: hardware retry come **functional correctness gate** quando funzionalità ancora bugged. Wrong instrument — hardware copre RTT WAN + touch latency + battery/background, NON unit/integration logic.

## Alternative QA layered approach (proposta)

| Layer           | Tool                                       | Cover | Iter wallclock | Bug catch type                                     |
| --------------- | ------------------------------------------ | :---: | :------------: | -------------------------------------------------- |
| **Functional**  | Playwright multi-tab WS smoke              |  70%  |     ~3min      | unknown_type, state propagation, phase transitions |
| **Integration** | Headless browser session record/replay     |  20%  |     ~5min      | timing, ordering, race conditions                  |
| **Physical**    | 2-phone real session post-functional verde |  10%  |     ~10min     | RTT WAN, touch p95, battery/background pause       |

**Outcome**:

- Iter loop functional ~3min vs ~30min hardware
- Hardware = last-mile validation post functional verde, NON gate primario
- Bug catch shift-left: 70% caught browser-headless, 20% headless integration, 10% only on real device

## Stato cross-repo post-sessione 2026-05-07

### PR shipped main

| PR                                                              | Repo     | Squash     | Topic                             |
| --------------------------------------------------------------- | -------- | ---------- | --------------------------------- |
| [#2087](https://github.com/MasterDD-L34D/Game/pull/2087)        | Game/    | `a1a88d7b` | harness 17 test B5+B2+5R+airplane |
| [#2089](https://github.com/MasterDD-L34D/Game/pull/2089)        | Game/    | `f5845484` | β quick-wins                      |
| [#2090](https://github.com/MasterDD-L34D/Game/pull/2090)        | Game/    | `a716fbe1` | D6 pillar honest                  |
| [#2091](https://github.com/MasterDD-L34D/Game/pull/2091)        | Game/    | `77644e8f` | RCA B6-B8                         |
| [#2092](https://github.com/MasterDD-L34D/Game/pull/2092)        | Game/    | `b3667b2c` | agent-driven workflow             |
| [#202](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/202) | Godot v2 | `682a405`  | p95 integration                   |
| [#203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203) | Godot v2 | `5d098e7`  | β P4 apex (GAP-2 + GAP-9)         |
| [#204](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204) | Godot v2 | `194a68d`  | γ leftover                        |
| [#205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205) | Godot v2 | `d48efe1`  | B8 fix                            |
| [#206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) | Godot v2 | `00e11c4`  | deploy-quick rebuild default      |
| [#207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207) | Godot v2 | `3909cb2c` | B9+B10 fix                        |

**11 PR + 1 DRAFT ADR** ([#2088](https://github.com/MasterDD-L34D/Game/pull/2088)) — sessione produttiva malgrado retry phone fail.

### Pillar status post-sessione

| Pillar        | Pre-sessione   | Post-sessione                                          |
| ------------- | -------------- | ------------------------------------------------------ |
| P1 Tattica    | 🟢++           | 🟢 candidato (Telemetry HUD live #204)                 |
| P2 Evoluzione | 🟢++           | 🟢 candidato (apex ritual reachable #203)              |
| P3 Identità   | 🟢ⁿ            | 🟢ⁿ confirmed                                          |
| P4 MBTI/Ennea | 🟢 cross-stack | 🟢 candidato (Ennea debrief view + expand toggle live) |
| P5 Co-op      | 🟢 candidato   | 🟢 confirmed (post-#2089 inject + B9+B10 fix)          |
| P6 Fairness   | 🟢 candidato   | 🟢 candidato (Wound badge live #204)                   |

### Bug bundle 2026-05-07 audit trail

| Bug                                  | Severity   | Fix PR                        | Status                   |
| ------------------------------------ | ---------- | ----------------------------- | ------------------------ |
| B5 phase_change                      | functional | #2087 harness catch           | shipped + harness        |
| B6 stale-dist char_create            | infra      | #206 deploy rebuild           | shipped + RCA            |
| B7 stale-dist host preserve          | infra      | #206 deploy rebuild           | shipped + RCA            |
| B8 defer guard re-fire               | functional | #205 helper extract           | shipped + RCA            |
| B9 world_tally unknown_type          | functional | #207 phone composer subscribe | shipped, retest deferred |
| B10 world_vote_accepted unknown_type | functional | #207 phone composer subscribe | shipped, retest deferred |

## Action plan next session

1. **Spawn agent**: prototype Playwright multi-tab smoke harness (browser-headless host + player + WS round-trip + phase advance assertions)
2. **Define test scenarios** record/replay:
   - Phase advance: lobby → onboarding → character_creation → world_setup → combat → debrief
   - Vote scenarios: tutti option_a/b/c onboarding + tutti vote progress world_setup
   - Reconnect mid-phase
3. **Hardware playtest scope**: solo post functional verde, focus su RTT + touch feel + battery
4. **ADR-2026-05-05 finalize**: post functional QA + 1 hardware playtest pass

## Cleanup eseguito 2026-05-07

- Tunnel cloudflared killed
- Backend Node :3334 killed
- Working tree clean tutti repo
- ADR #2088 status updated (PROPOSED — retesting deferred)
- Memory save canonical (project*session_2026_05_07*\*.md)

## Trigger phrase canonical next session (any PC)

> _"leggi docs/planning/2026-05-07-cutover-handoff-alternative-qa.md, spawn agent Playwright multi-tab smoke prototype"_

OR

> _"alternative QA infra next: prototype Playwright + headless multi-tab phone replicate, test fix B9+B10 + iter1 verde"_
