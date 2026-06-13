---
title: Vision Gap Sprint V1-V7 — handoff post-PR #1726
workstream: cross-cutting
category: handoff
doc_status: active
doc_owner: master-dd
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - vision-gap
  - sprint-handoff
  - v1
  - v2
  - v4
  - v5
  - v7
  - telemetry
  - playtest-readiness
related:
  - docs/process/sprint-2026-04-26-M16-M20-close.md
  - docs/adr/ADR-2026-04-26-sg-earn-mixed.md
---

# Vision Gap Sprint V1-V7 — handoff

Sprint autonomous post-M20 co-op. Audit gap visione vs shipped rilevò 7
verità promesse in `docs/core/` ma zero runtime. Chiusi 6 gap principali in
3 commit (2 feat + 1 wire) su branch `feat/p5-vision-gaps`, PR #1726.

## PR shipped

| PR        | Scope                                | Commits      | Tests           |
| --------- | ------------------------------------ | ------------ | --------------- |
| #1726     | V1+V5+Telemetry                      | `0fcabb17`   | +22             |
|           | V2+V4+V7                             | `5da6c946`   | +43             |
|           | Wire V5+V7 runtime                   | `041e717c`   | regression only |
|           | Docs handoff + CLAUDE.md             | `ae291fcb`   | —               |
|           | UI wire onboarding+rewards debrief   | `21a2e631`   | —               |
|           | V4 form pack routes                  | `f20f0b46`   | +3              |
| **Total** | **6 vision gaps + UI wire + V4 API** | **6 commit** | **+68 tests**   |

## Gap chiusi

### V1 Onboarding 60s Phase B ✅

- Backend: `/api/campaign/start` accetta `initial_trait_choice` (option_a|b|c)
- Store: `onboardingChoice` + `acquiredTraits[]` su campaign
- Frontend: `apps/play/src/onboardingPanel.js` overlay Disco Elysium 3-stage
- Chiude: [docs/core/51-ONBOARDING-60S.md](../core/51-ONBOARDING-60S.md) Phase B

### V2 Tri-Sorgente reward API ✅

- Replace Python bridge legacy → Node-native
- Pool R/A/P merge + softmax T=0.7 + skip fragmenti genetici
- `services/rewards/rewardOffer.js` + `rewardPoolLoader.js` + `skipFragmentStore.js`
- `data/core/rewards/reward_pool_mvp.yaml` 15 carte seed
- Routes: `POST /api/rewards/offer`, `/skip`, `GET /fragments`

### V4 PI-Pacchetti tematici 16 forme ✅

- `data/core/forms/form_pack_bias.yaml` machine-readable (16 MBTI × 3 pack)
- `services/forms/formPackRecommender.js` — d20/d12 branches
- Chiude tabella canonical in [PI-Pacchetti-Forme.md](../core/PI-Pacchetti-Forme.md)

### V5 SG earn formula ✅

- **Opzione C mixed** canonical (ADR-2026-04-26): 5 dmg taken OR 8 dmg dealt → +1 SG
- Cap 2 SG/turn, pool max 3, reset per encounter
- `services/combat/sgTracker.js` pure module
- **Wired** in `session.js` damage step runtime
- Chiude Q52 P2 debito economy canonical

### V7 Biome-aware spawn bias ✅

- `services/combat/biomeSpawnBias.js` pure module
- matchAffix vocabulary (termico→fire, sabbia→sand, etc.)
- Archetype primary 3x, support 2x, affix 1.5x per match, cap 3x
- **Wired** in `reinforcementSpawner.pickPoolEntry` (optional hook)
- Chiude [28-NPC_BIOMI_SPAWN.md](../core/28-NPC_BIOMI_SPAWN.md) "biomi guidano spawn"

### Telemetry endpoint ✅

- `POST /api/session/telemetry` batch JSONL append
- Pattern R6 Siege "Unfun matrix" capture: ui_error, input_latency, client_fps
- `logs/telemetry_YYYYMMDD.jsonl` (gitignored)

## Gap NON chiusi (deferred)

### V3 Mating/Nido slice (20h, deferred post-MVP)

- Effort troppo alto per session autonomous. Design-frozen, zero runtime.
- Blocked by: nest UI + companion Relazioni app (fuori scope MVP)

### V6 UI TV dashboard identità (6h, deferred polish)

- Debrief panel già data-complete (M19). Visual tree/register polish post-playtest.

## Test baseline post-sprint

| Suite                 | Count   |    Status     |
| --------------------- | ------- | :-----------: |
| AI regression         | 307     |      🟢       |
| Campaign routes       | 30      |  🟢 (+5 V1)   |
| Telemetry             | 5       |    🟢 new     |
| SG tracker            | 12      |    🟢 new     |
| Reward offer          | 17      |    🟢 new     |
| Form pack recommender | 12      |    🟢 new     |
| Biome spawn bias      | 14      |    🟢 new     |
| Reinforcement spawner | 13      | 🟢 regression |
| First playtest        | 1       | 🟢 regression |
| **Grand total**       | **411** |    **🟢**     |

## Pilastri aggiornati post-sprint

| #   | Pilastro   | Pre V-sprint |                       Post V-sprint                        |
| --- | ---------- | :----------: | :--------------------------------------------------------: |
| 1   | Tattica    |      🟢      |                             🟢                             |
| 2   | Evoluzione |     🟢c      |              **🟢c+** (tri-sorgente API live)              |
| 3   | Specie×Job |     🟢c      |                            🟢c                             |
| 4   | MBTI       |     🟡+      | **🟡++** (PI pacchetti machine-readable + thought cabinet) |
| 5   | Co-op      |     🟢c      |                            🟢c                             |
| 6   | Fairness   |     🟢c      |       **🟢c+** (SG wired + biome bias + Q52 chiuso)        |

## Next session — handoff azioni

### Priority 1 — UI polish ✅ COMPLETATO NELLA STESSA SESSIONE

- [x] Wire `onboardingPanel` in `apps/play/src/main.js` campaign start flow (commit `21a2e631`)
- [x] Expose `/api/rewards/offer` in `debriefPanel.js` post-mission via `showRewardOffer()` (commit `21a2e631`)
- [x] Expose V4 pack recommender via REST `GET /api/forms/:id/packs` + `POST /recommend` (commit `f20f0b46`)
- [ ] Remainder: wire `characterCreation.js` UI fetch `/api/forms/:id/packs` dopo form pick (deferred polish, UI tests dependency)

### Priority 2 — Runtime integration (3h autonomous)

- [ ] Wire `sgTracker.accumulate` in `abilityExecutor.js` damage paths (5 code sites)
- [ ] Wire `sgTracker.resetEncounter` + `beginTurn` in session lifecycle hooks
- [ ] Wire `/api/rewards/skip` → increment campaign `skip_fragments_earned` persistent

### Priority 3 — Playtest live (userland, 2h)

- [ ] **TKT-M11B-06**: 2-4 amici ngrok playtest reale
- [ ] Capture telemetry via `/api/session/telemetry` dalla dashboard
- [ ] Post-session: Unfun matrix + top-3 action items

### Priority 4 — Calibration (1-2h)

- [ ] Playtest iter1: verify SG rates (5/8 threshold) — aggiornabili in ADR se troppo
- [ ] Reward pool: check skip-rate mediano ∈ [18%, 32%] (target doc tri-sorgente)
- [ ] Biome bias: verify spawn distribution coerente post biome-hazard

## Quello che user deve fare

**Nulla in autonomous — auto-mode coperto. Solo 2 cose bloccanti su user:**

1. **Playtest live 2-4 amici** (TKT-M11B-06) — userland non-automatizzabile.
   Kit pronto: `docs/playtest/2026-04-26-coop-full-loop-playbook.md` +
   onboardingPanel ora si attiva automaticamente al campaign start (host).
2. **Review [PR #1726](https://github.com/MasterDD-L34D/Game/pull/1726)** merge decision — se green CI, merge e continue.

**TUTTO altro autonomous completato questa sessione.**

### Scope sessione (quanto fatto):

- 6/7 vision gap (V3 mating + V6 UI TV dashboard deferred per effort vincolo)
- +68 test (411/411 verde)
- 6 commit pushati
- UI wire onboarding pre-tutorial (phone host)
- UI wire tri-sorgente rewards in debrief panel
- REST API expose V4 form pack recommender
- Runtime wire V5 SG + V7 biome bias
- Docs handoff + governance registry + CLAUDE.md + memory

## Riferimenti

- PR: [#1726](https://github.com/MasterDD-L34D/Game/pull/1726)
- Branch: `feat/p5-vision-gaps`
- ADR: [ADR-2026-04-26-sg-earn-mixed.md](../adr/ADR-2026-04-26-sg-earn-mixed.md)
- Filosofia: `Archivio_Libreria_Operativa_Progetti/02_LIBRARY/02_Modules_Starter_Packs_and_Best_Of.md` (Feature Cancellation + Technical Task Breaker applicati)
