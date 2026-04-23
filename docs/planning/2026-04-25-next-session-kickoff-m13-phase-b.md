---
title: 'Next session kickoff — M13 Phase B (P3 resolver wire / P6 calibration) + P4 MBTI completion'
workstream: cross-cutting
category: handoff
status: draft
owner: master-dd
created: 2026-04-25
tags:
  - kickoff
  - session-handoff
  - m13-phase-b
  - pilastro-3
  - pilastro-6
related:
  - docs/adr/ADR-2026-04-24-p3-character-progression.md
  - docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md
  - docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
---

# Next session kickoff — post M12.D + M13.P3.A + M13.P6.A

Sessione 2026-04-24 chiude **3 PR** in stack (M12 Phase D + M13 P3 Phase A + M13 P6 Phase A). Pilastri 2/3/6 all upgradati.

## Stack PR mergiati sessione 2026-04-24

| PR                                                       | Commit     | Scope                                                    | Test |
| -------------------------------------------------------- | ---------- | -------------------------------------------------------- | ---: |
| [#1693](https://github.com/MasterDD-L34D/Game/pull/1693) | `2cfd4540` | M12 Phase D — campaign trigger + VC pipe + anim + Prisma |  +10 |
| [#1694](https://github.com/MasterDD-L34D/Game/pull/1694) | `24169c41` | M13 P3 — progression engine + 84 perks + 8 endpoints     |  +24 |
| [#1695](https://github.com/MasterDD-L34D/Game/pull/1695) | TBD        | M13 P6 — mission timer + pod activation + scenario 07    |  +17 |

**Grand total** sessione: ~51 nuovi test. Baseline post-merge: **464+/464+** verde.

## Stato Pilastri post-sessione 2026-04-24

|  #  | Pilastro                | Stato pre |    Stato post    | Residuo per 🟢                        |
| :-: | ----------------------- | :-------: | :--------------: | ------------------------------------- |
|  1  | Tattica leggibile       |    🟢     |        🟢        | —                                     |
|  2  | Evoluzione emergente    |   🟡++    | **🟢 candidato** | playtest live end-to-end              |
|  3  | Identità Specie × Job   |    🟡     |     **🟡+**      | resolver wire + UI pick perk (~8h)    |
|  4  | Temperamenti MBTI/Ennea |    🟡     |        🟡        | Disco Elysium diegetic reveal (~8h)   |
|  5  | Co-op vs Sistema        |    🟡     |        🟡        | TKT-M11B-06 playtest ngrok (userland) |
|  6  | Fairness                |    🟡     |     **🟡+**      | calibration N=10 + HUD timer (~3-5h)  |

**Score**: 1/6 🟢 + 1/6 🟢 candidato + 3/6 🟡+ + 2/6 🟡.

## Prompt next session

### Opzione A — M13 P3 Phase B (resolver wire + UI pick perk, ~8h autonomous) ⭐ raccomandato

```text
Leggi:
- docs/adr/ADR-2026-04-24-p3-character-progression.md (scope + fuori scope Phase B)
- apps/backend/services/progression/progressionEngine.js (effectiveStats/listPassives/listAbilityMods)
- apps/backend/services/abilityExecutor.js (resolver ability apply)
- apps/backend/routes/session.js (unit load point)
- apps/backend/routes/campaign.js (advance → XP grant hook)
- apps/play/src/formsPanel.js (pattern UI overlay per pick perk)

Task: M13 P3 Phase B — chiudi Pilastro 3 (🟢 candidato).

Scope (~8h):
1. Campaign advance → grant XP (~1h):
   - Estendere POST /api/campaign/advance: su victory, grant XP a survivors
     via engine.applyXp per unità in session.units controlled_by='player'
   - Response += { xp_grants: [{unit_id, amount, leveled_up, level_after}] }
   - Wire store.set per ogni grant (prisma write-through già attivo)
2. Combat resolver wire (~3h):
   - apps/backend/services/combat/resolver (o abilityExecutor):
     leggere progressionStore per unit prima di apply action
     → applicare effectiveStats bonus (sommare a base), ability_mods
     (additive delta per field dell'ability in uso)
   - Passive tag lookup: flank_bonus (quando adjacent ally at target),
     first_strike_bonus, damage_reduction_first_hit, ecc.
     Minimo 5 passive tags wire (top 5 più frequenti in perks.yaml)
3. Frontend pick perk overlay (~3h):
   - apps/play/src/progressionPanel.js: overlay pattern formsPanel
   - Header btn "📈 Perks" post-mission + auto-open post-campaign-advance
     se pending_level_ups.length > 0 per selected unit
   - Grid 2-col: perk_a vs perk_b side-by-side, click = pick
4. Balance pass N=10 (~1h):
   - tools/py/batch_progression_sim.py N=10 run scenario 02-04 con
     progression random picks → misura stat inflation vs baseline
   - Target: no unit > +4 cumulative stat_bonus su stessa stat
     (sanity check non-degenerate)

Output:
- Campaign XP grant hook + test
- Resolver wire + 5 passive tags + test integration
- progressionPanel.js + CSS (riusa formsPanel pattern)
- Balance harness + report
- ADR addendum Phase B
- Baseline preserve 464+ → 500+ totale

Branch: feat/m13-p3-phase-b-resolver-ui
```

### Opzione B — M13 P6 Phase B (calibration + HUD timer, ~3-5h autonomous)

```text
Leggi:
- docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md (fuori scope Phase B)
- tools/py/batch_calibrate_hardcore06.py (pattern harness)
- apps/play/src/main.js showCommitReveal (pattern overlay timer)

Task: M13 P6 Phase B — chiudi Pilastro 6 (🟢 candidato).

Scope (~3-5h):
1. Calibration harness hardcore 07 (~2h):
   - tools/py/batch_calibrate_hardcore07.py N=10 baseline
   - Target win rate 30-50%. Se out-of-band, tune turn_limit o
     reinforcement_pool (cooldown/weight).
2. HUD timer countdown (~1.5h):
   - apps/play/src/main.js: state.missionTimer = {remaining, total}
     aggiornato da response mission_timer post ogni turn/round.
   - Overlay HUD bottom-right: "⏱ N/15" + red tint quando remaining ≤ 3
     (warning threshold). CSS animation pulse on warning.
3. Campaign outcome auto-timeout (~0.5h):
   - apps/backend/routes/campaign.js: se session mission_timer.expired
     quando advance chiamato → forzare outcome='timeout' se caller non specificato.

Branch: feat/m13-p6-phase-b-calibration-hud
```

### Opzione C — P4 MBTI completamento (Disco Elysium pattern, ~8h autonomous)

```text
Task: completare 3 MBTI axes residui (E_I, S_N, J_P) con diegetic reveal.

Scope:
- VC scoring refinement per i 3 axes non-T_F
- Thought Cabinet pattern: unit accumula "riflessioni" (threshold events)
  che si sbloccano come dialog/tooltip durante session
- Focus group validation (N=5 playtest ~1h each)

Effort: ~8h.
```

## Backlog globale residuo

| Item                                                  | Priorità |  Autonomo?  |
| ----------------------------------------------------- | :------: | :---------: |
| **P3 Phase B** resolver wire + UI pick perk + balance |    P1    |     ✅      |
| **P6 Phase B** calibration + HUD timer                |    P1    |     ✅      |
| **P4 MBTI** 3 axes completamento                      |    P2    |     ✅      |
| **M12 Phase D** playtest live end-to-end              |    P1    | ❌ userland |
| **TKT-M11B-06** playtest ngrok                        |    P1    | ❌ userland |
| **Prisma P3** lobby rooms persistence                 |    P2    |     ✅      |

## Baseline snapshot post-sessione

```bash
cd /c/Users/VGit/Desktop/Game
git fetch origin main
git checkout main
node --test tests/ai/*.test.js                                             # 307/307
node --test tests/api/progressionEngine.test.js tests/api/progressionRoutes.test.js  # 24/24
node --test tests/api/missionTimer.test.js tests/api/hardcoreScenarioTimer.test.js   # 17/17
node --test tests/api/formEvolution.test.js tests/api/formsRoutes.test.js tests/api/formSessionStore.test.js tests/api/packRoller.test.js tests/api/formsRoutesSessionPack.test.js tests/api/formsPanelInfer.test.js tests/api/formSessionStorePrisma.test.js  # 63/63
node --test tests/api/campaignRoutes.test.js tests/api/campaignIntegration.test.js   # 27/27
node --test tests/api/lobbyRoutes.test.js tests/api/lobbyWebSocket.test.js            # 15/15
node --test tests/e2e/lobbyEndToEnd.test.mjs                                          # 11/11
node --test tests/scripts/tutorialSpeciesExistence.test.js                            # 3/3
npm run format:check                                                                   # verde
```

## Warning / constraint next session

- **NON toccare** `apps/backend/routes/session.js` (guardrail 851 LOC owner-lock) senza ADR
- **NON toccare** `apps/backend/services/network/wsSession.js` senza ADR addendum
- **NON committare** binari sotto `reports/backups/**` (lint:backups enforcement)
- **Schema P3 stabile**: `UnitProgression` shape caller-supplied, Prisma adapter mappa senza breaking
- **Schema P6 stabile**: `mission_timer` additivo encounter YAML (back-compat con encounter legacy)
- **Caveman mode attivo** default

## Follow-up tracked

- **M13 P3 Phase B** resolver wire + UI pick perk (P1, questo doc)
- **M13 P6 Phase B** calibration + HUD timer (P1, questo doc)
- **M12 Phase D** playtest live userland (P1 userland)
- **TKT-M11B-06** playtest live ngrok (P1 userland)
- **P4 MBTI** completamento 3 axes (P2)
- **Prisma P3** lobby rooms persistence (P2)

## Riferimenti utili

- ADR P3: [`docs/adr/ADR-2026-04-24-p3-character-progression.md`](../adr/ADR-2026-04-24-p3-character-progression.md)
- ADR P6: [`docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md`](../adr/ADR-2026-04-24-p6-hardcore-timeout.md)
- ADR M12 + Phase D addendum: [`docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md`](../adr/ADR-2026-04-23-m12-phase-a-form-evolution.md)
- Handoff precedente: [`docs/planning/2026-04-24-next-session-kickoff-m12-phase-d.md`](2026-04-24-next-session-kickoff-m12-phase-d.md)
- Pilastri audit: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](2026-04-20-pilastri-reality-audit.md)
- Strategy M9-M11: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](2026-04-20-strategy-m9-m11-evidence-based.md)
