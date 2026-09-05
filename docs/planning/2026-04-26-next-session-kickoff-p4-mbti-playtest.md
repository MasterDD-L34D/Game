---
title: 'Next session kickoff — P4 MBTI completamento / playtest live gating 🟢 / Prisma lobby'
workstream: cross-cutting
category: handoff
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - kickoff
  - session-handoff
  - p4-mbti
  - playtest-live
related:
  - docs/adr/ADR-2026-04-24-p3-character-progression.md
  - docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
---

# Next session kickoff — post M13 P3.B + P6.B close

Sessione 2026-04-25 chiude **Phase B stack** (P3 + P6) + verification sweep. **6 PR** totali in main 2026-04-24/25.

## Stack PR 2026-04-24/25

| PR                                                       | Commit     | Scope              |
| -------------------------------------------------------- | ---------- | ------------------ |
| [#1693](https://github.com/MasterDD-L34D/Game/pull/1693) | `2cfd4540` | M12 Phase D        |
| [#1694](https://github.com/MasterDD-L34D/Game/pull/1694) | `24169c41` | M13 P3 Phase A     |
| [#1695](https://github.com/MasterDD-L34D/Game/pull/1695) | `3e308708` | M13 P6 Phase A     |
| [#1696](https://github.com/MasterDD-L34D/Game/pull/1696) | `9319eedd` | Verification sweep |
| [#1697](https://github.com/MasterDD-L34D/Game/pull/1697) | `a462d4d5` | M13 P3 Phase B     |
| [#1698](https://github.com/MasterDD-L34D/Game/pull/1698) | `135b5b1f` | M13 P6 Phase B     |

## Pilastri post-sessione 2026-04-25

| #   | Stato pre |    Stato post    | Residuo 🟢                                       |
| --- | :-------: | :--------------: | ------------------------------------------------ |
| 1   |    🟢     |        🟢        | —                                                |
| 2   |   🟡++    | **🟢 candidato** | playtest live userland                           |
| 3   |    🟡     | **🟢 candidato** | playtest live validation pick perk + stat impact |
| 4   |    🟡     |        🟡        | Disco Elysium diegetic 3 axes (~8h)              |
| 5   |    🟡     |        🟡        | TKT-M11B-06 playtest ngrok (userland)            |
| 6   |    🟡     | **🟢 candidato** | calibration N=10 harness execution (userland)    |

**Score**: 1/6 🟢 + **3/6 🟢 candidato** + 2/6 🟡 (zero 🔴).

## Prompt next session

### Opzione A — P4 MBTI completamento 3 axes (~8h autonomous) ⭐ raccomandato

```text
Leggi:
- apps/backend/services/vcScoring.js (deriveMbtiType + axes computation)
- data/core/forms/mbti_forms.yaml (16 forms + axes target)
- docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md (Disco Elysium pattern)

Task: P4 MBTI completare 3 axes residui (E_I, S_N, J_P).

Scope (~8h):
1. VC scoring refinement per E_I, S_N, J_P (~2h each = 6h):
   - E_I: ratio (intents_targeting_enemy) / (total_intents) per extraversion proxy
   - S_N: ratio (concrete_actions: attack/move) / (abstract: ability/heal/buff) per sensing
   - J_P: variance nel turn time / round planning change count per judging
2. Thought Cabinet pattern (~2h):
   - data/core/thoughts/mbti_thoughts.yaml: 3 axes × 2 poli × 3 soglie = 18 thoughts
   - Runtime: session.thoughts_unlocked[] cumulativo per unit
   - UI: tooltip reveal su pick perk / form change
```

### Opzione B — Playtest live 3 Pilastri 🟢 gating (userland, closes 3 🟢)

Non-autonomous. Richiede user + 2 amici + 1 session ~2h.

```text
Scenario test (~2h):
- 1 run enc_tutorial_01-05 (baseline Pilastro 1 🟢 stability)
- 1 run enc_tutorial_06_hardcore con timer (Pilastro 6 validation)
- 1 run campaign con pick perk + form evolve (P2 + P3 validation)

Checklist gating:
- [ ] P2: evolve opportunity flag fires on pe_earned ≥ 8; formsPanel auto-open
- [ ] P3: leveled_up survivor → progressionPanel auto-open; perk click persists
- [ ] P6: timer HUD visible bottom-right; warning red pulse @ ≤3 rounds; expired override outcome to timeout

Output: docs/playtest/2026-04-XX-gating-validation.md
Se 3/3 pass → bump 3 🟢 definitivi + update CLAUDE.md.
```

### Opzione C — Prisma P3 lobby persistence (~5h autonomous)

```text
Task: wire Prisma adapter per wsSession lobby rooms.

Scope:
1. Schema migration LobbyRoom + RoomMember tables
2. wsSession.Room persistence optional (env LOBBY_PRISMA_ENABLED)
3. Reconnect dopo restart backend → hydrate rooms dal DB
```

### Opzione D — Pausa + verifica userland

Esegui playtest live Opzione B manualmente senza AI driving.

## Backlog globale

| Item                                                   |  P  |  Autonomo?  |
| ------------------------------------------------------ | :-: | :---------: |
| **P4 MBTI** 3 axes + Thought Cabinet                   | P1  |     ✅      |
| **Playtest gating** 3 🟢 validation                    | P1  | ❌ userland |
| **TKT-M11B-06** playtest ngrok co-op                   | P1  | ❌ userland |
| **Prisma lobby** P3 rooms persistence                  | P2  |     ✅      |
| **Calibration hardcore 07** N=10 harness execute       | P2  | ❌ userland |
| **Phase C** ability_mod runtime + passive tags residui | P3  |     ✅      |

## Baseline snapshot post-sessione 2026-04-25

```bash
cd /c/Users/VGit/Desktop/Game
git fetch origin main
node --test tests/ai/*.test.js                                                         # 307/307
node --test tests/api/progressionEngine.test.js tests/api/progressionRoutes.test.js tests/api/progressionApply.test.js tests/api/progressionBalance.test.js  # 44/44
node --test tests/api/missionTimer.test.js tests/api/hardcoreScenarioTimer.test.js tests/api/missionTimerHud.test.js  # 27/27
node --test tests/api/formEvolution.test.js tests/api/formsRoutes.test.js tests/api/formSessionStore.test.js tests/api/packRoller.test.js tests/api/formsRoutesSessionPack.test.js tests/api/formsPanelInfer.test.js tests/api/formSessionStorePrisma.test.js  # 63/63
node --test tests/api/campaignRoutes.test.js tests/api/campaignIntegration.test.js     # 31/31
node --test tests/api/lobbyRoutes.test.js tests/api/lobbyWebSocket.test.js              # 15/15
node --test tests/e2e/lobbyEndToEnd.test.mjs                                            # 11/11
node --test tests/scripts/tutorialSpeciesExistence.test.js                              # 3/3
npm run format:check                                                                    # verde
```

**Grand total**: ~**500+/500+** verde.

## Warning / constraint

- **NON toccare** `apps/backend/routes/session.js` senza justification (guardrail 2000 LOC)
- **NON toccare** `apps/backend/services/network/wsSession.js` senza ADR addendum
- **NON committare** binari sotto `reports/backups/**`
- **Caveman mode** attivo default

## Riferimenti

- Memory sintesi: [`~/.claude/projects/C--Users-VGit-Desktop-Game/memory/project_sprint_m13_session_2026_04_24.md`](file:~/.claude/projects/C--Users-VGit-Desktop-Game/memory/project_sprint_m13_session_2026_04_24.md)
- ADR P3: [`docs/adr/ADR-2026-04-24-p3-character-progression.md`](../adr/ADR-2026-04-24-p3-character-progression.md)
- ADR P6: [`docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md`](../adr/ADR-2026-04-24-p6-hardcore-timeout.md)
- Handoff prec: [`docs/planning/2026-04-25-next-session-kickoff-m13-phase-b.md`](2026-04-25-next-session-kickoff-m13-phase-b.md)
