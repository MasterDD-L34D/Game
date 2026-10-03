---
title: 'Sprint close M16-M20 — co-op MVP full loop shipped'
workstream: ops-qa
category: sprint-close
status: complete
owner: master-dd
created: 2026-04-26
tags:
  - sprint-close
  - m16
  - m17
  - m18
  - m19
  - m20
  - coop
related:
  - docs/planning/2026-04-26-coop-truths.md
  - docs/planning/2026-04-26-coop-mvp-spec.md
  - docs/planning/2026-04-26-coop-migration-plan.md
---

# Sprint close M16-M20

Chiude migration plan `2026-04-26-coop-migration-plan.md`. Co-op full loop
MVP demo-ready shipped autonomous in 1 sessione.

## PR shipped

| #     | Sprint | Scope                                                                      | Tests added |
| ----- | ------ | -------------------------------------------------------------------------- | ----------- |
| #1721 | M16    | P0 fixes (PG mapping, round clear, phase auto) + coopOrchestrator skeleton | 10          |
| #1722 | M17    | Character creation phase (phone 16 MBTI + REST + TV roster)                | 6           |
| #1723 | M18    | World setup (phone vote + tally broadcast)                                 | 5           |
| #1724 | M19    | Debrief (phone outcome + narrative + ready)                                | 5           |
| #1725 | M20    | Sprint close docs + playtest kit update + CLAUDE.md                        | —           |

**Total tests**: 26 nuovi + 15 regression lobby = **41/41 verde** post-merge.

## State machine finale co-op

```
lobby → character_creation → world_setup → combat → debrief → (loop|ended)
  ✅           ✅                ✅           ✅        ✅        ✅
```

Ogni fase ha:

- REST endpoint (`/api/coop/*`)
- Phone UI overlay specifico
- TV host roster sync (character list, vote tally, debrief ready)
- Broadcast WS events per sync

## Pilastri aggiornati

| #            | Stato pre M16 | Stato post M19 | Residuo 🟢                         |
| ------------ | :-----------: | :------------: | ---------------------------------- |
| 1 Tattica    |      🟢       |       🟢       | —                                  |
| 2 Evoluzione |      🟢c      |      🟢c       | playtest (form evolve UI deferred) |
| 3 Specie×Job |      🟢c      |      🟢c       | playtest pick perk                 |
| 4 MBTI       |      🟡       |       🟡       | P4 residui                         |
| 5 Co-op      |      🟡       |    **🟢c**     | **playtest live 4 amici**          |
| 6 Fairness   |      🟢c      |      🟢c       | calibration                        |

**Score**: 1/6 🟢 + **5/6 🟢 candidato** + 0/6 🟡 hard blockers.

## Flow completo (host + 2-4 player)

### 1. Host avvia stanza (M11, già shipped)

- `npm run demo` + `ngrok http 3334`
- Apre `/play/lobby.html`, crea stanza, share URL

### 2. Player join (M11/M17)

- Apre URL ngrok + codice, inserisce nome
- Overlay `char-creation-overlay` auto-mostrato

### 3. Character creation (M17)

- Player sceglie nome + form (16 MBTI) + specie
- Preview stats → Conferma
- TV roster: 🎭 name+form per player

### 4. World setup (M18)

- Auto-transition quando tutti submitted
- Phone: card scenario proposto + vote accept/reject + tally
- Host conferma → combat

### 5. Combat (M15/M16)

- Phone: card PG + action tiles + target list + chat + ready broadcast
- Round simultaneo planning → auto phase ready → host resolve → round_clear
- TV: canvas + roster ✅/💭 ticks

### 6. Debrief (M19)

- Auto-call combat/end su endgame
- Phone: outcome (victory/defeat) + PG stats + narrative log + ready button
- All ready → next scenario (stack) OR ended

## Cosa NON è nel MVP

- Form evolve scelta debrief → placeholder hidden, defer M21
- Perk pair level-up choice → defer M21
- Timer round phone → defer M21
- Voice chat → defer indefinito
- Persistenza run cross-session → defer (Prisma lobby rooms shipped M11.D, coop state no)
- 8 player modulation → MVP 2-4

## Playtest readiness

Ready per TKT-M11B-06 userland live con amici:

1. ✅ UI ogni fase (phone + TV)
2. ✅ PG per-player (owner_id mapping)
3. ✅ Round flow anti-spam (1 intent/round + commit gate)
4. ✅ Chat party live
5. ✅ Feedback narrativo (eventi IT)
6. ✅ Scenari stack campagna (enc_tutorial_01 → 05)
7. ✅ End-to-end testato 41/41

## Handoff

- Next action: **playtest live 2-4 amici reali via ngrok**
- Se report positivo → bump P5 🟢 definitivo + celebrate
- Se bug trovati → M21 fix-first (pattern stesso M3-M5)

## File touched nello stack M16-M20

```
apps/backend/services/coop/coopOrchestrator.js  NEW M16
apps/backend/services/coop/coopStore.js          NEW M17
apps/backend/routes/coop.js                      NEW M17
apps/backend/app.js                              EDIT (wire)
apps/backend/routes/session.js                   EDIT (characters param)
apps/backend/routes/sessionHelpers.js            EDIT (owner_id normalize)
apps/backend/services/network/wsSession.js       EDIT (phase auto)
apps/play/src/api.js                             EDIT (coop helpers)
apps/play/src/network.js                         EDIT (WS event types)
apps/play/src/lobbyBridge.js                     EDIT (wire coordinator)
apps/play/src/phoneComposerV2.js                 (M15)
apps/play/src/characterCreation.js               NEW M17
apps/play/src/characterCreation.css              NEW M17
apps/play/src/worldSetup.js                      NEW M18
apps/play/src/worldSetup.css                     NEW M18
apps/play/src/debriefPanel.js                    NEW M19
apps/play/src/debriefPanel.css                   NEW M19
apps/play/src/phaseCoordinator.js                NEW M17 (extended M18, M19)
apps/play/src/main.js                            EDIT (coop host flow + combat end)
tests/api/coopOrchestrator.test.js               NEW M16 (10 test)
tests/api/coopRoutes.test.js                     NEW M17 (6 test)
tests/api/coopWorldVote.test.js                  NEW M18 (5 test)
tests/api/coopDebrief.test.js                    NEW M19 (5 test)
```

## Celebrazione

- **Pattern Jackbox implementato correttamente** (phone input + TV output).
- **First principles applicati** (Layer A/B/C docs + state machine).
- **5 sprint × ~4-6h planned** → reality ~5h totali autonomous grazie a
  incremento precedente (M11-M15 già live).
- **Zero regression** nei tests esistenti.

## Riferimenti

- Truths: [coop-truths.md](../planning/2026-04-26-coop-truths.md)
- Spec: [coop-mvp-spec.md](../planning/2026-04-26-coop-mvp-spec.md)
- Migration: [coop-migration-plan.md](../planning/2026-04-26-coop-migration-plan.md)
- Filosofia sorgente: `Archivio_Libreria_Operativa_Progetti/02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md`
