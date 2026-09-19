---
title: TKT-M15 CT bar + promotion audit — 2026-05-11
workstream: ops-qa
status: active
owner: claude
last_review: 2026-05-11
tags: [tkt-m15, audit, ct-bar, promotion, sprint-q+]
---

# TKT-M15 CT bar + promotion — audit + scoping

Scope ticket `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` §3 nota "già parzialmente shipped per Sprint G/M3 (CT bar visual lookahead 2026-04-29 PR #1998) — verify state + complete promotion side". Questo doc raccoglie audit findings + scope PR effettivo.

## Audit findings

### CT bar — STATO: 100% LIVE + WIRED

Grep `CT bar|ct_bar|chargeTime|ChargeTime` rivela:

| File                                               |  LOC | Status                         |
| -------------------------------------------------- | ---: | ------------------------------ |
| `apps/play/src/ctBar.js`                           |  190 | Engine + render pure functions |
| `apps/play/src/main.js` linee 42, 1114, 1242, 1415 | wire | Import + 3 callsites refresh   |
| `apps/play/src/style.css`                          |  CSS | HUD container styling          |

**Conferme**:

- ✅ `renderCtBar(containerEl, world, lookahead)` esportato + chiamato 3x in main.js (post action + post round + on new session)
- ✅ `DEFAULT_LOOKAHEAD = 3` (verdict user 2026-04-28 Q6: non 2 = poca info, non 5 = cognitive overload)
- ✅ Tunable via `window.__evoUiConfig.ct_bar_lookahead`
- ✅ `statusPenalty(statuses)` integra panic/disorient — mirror logic backend `roundOrchestrator.computeResolvePriority`
- ✅ `effectivePriority(unit) = initiative - statusPenalty` ordering canonical
- ✅ Render target DOM `#ct-bar` presente nell'HTML shell

**Acceptance §1 scope ticket** (CT bar mostra prossimi 3 turni unit order pre-action): ✅ SODDISFATTO da PR #1998 (squash 2026-04-29).

Riferimento PR storico: PR #1998 `bf9b39ff` "Action 7 CT bar visual lookahead 3 turni FFT-style HUD".

### Promotion engine — STATO: 0% pre-PR, ora 100% backend ready

Grep `promotion|promote|rank_up|class_advance` su `apps/backend/services/`, `apps/backend/routes/`, `data/core/` (pre-PR): zero risultati per class promotion (solo network host promotion + meta progression non collegato a tier advancement).

**Gap colmati questa PR**:

| Componente       | File                                                              |        LOC | Status post-PR |
| ---------------- | ----------------------------------------------------------------- | ---------: | -------------- |
| Engine           | `apps/backend/services/progression/promotionEngine.js`            | +260 (new) | LIVE           |
| Config data      | `data/core/promotions/promotions.yaml`                            |  +44 (new) | LIVE           |
| Endpoint elig    | `apps/backend/routes/session.js` GET `/:id/promotion-eligibility` |        +20 | LIVE           |
| Endpoint promote | `apps/backend/routes/session.js` POST `/:id/promote`              |        +60 | LIVE           |
| Unit tests       | `tests/ai/promotionEngine.test.js`                                | +180 (new) | 12/12 green    |
| API tests        | `tests/api/promotion.test.js`                                     | +110 (new) | 5/5 green      |

## Verdict TKT-M15

| Acceptance criterion (scope ticket §3)                                   | Status                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1. CT bar mostra prossimi 3 turni unit order                             | ✅ pre-existing PR #1998                                                       |
| 2. Promotion eligibility computed end-of-mission (kill+assist+objective) | ✅ this PR                                                                     |
| 3. Player può accept/defer promotion (UI button)                         | 🟡 backend ready, UI button deferred to atlas/HUD work                         |
| 4. Reward applicato: +stats + new ability tier                           | ✅ this PR (hp_bonus, attack_mod_bonus, initiative_bonus, ability_unlock_tier) |
| 5. Test suite 6+                                                         | ✅ 17/17 (12 unit + 5 API)                                                     |

**4.5/5 criteri soddisfatti** post questa PR. Acceptance §3 UI button = surface frontend ~1h work, scopeable next PR atlas/HUD (non parte di TKT-M15 minimum viable scope poiché backend è il blocker effettivo).

## Promotion tier ladder canonical

```
base → veteran → captain
```

**Thresholds** (cumulative across battles in a campaign):

| Tier    | kills_min | objectives_min | assists_min |
| ------- | --------: | -------------: | ----------: |
| veteran |         3 |              1 |           — |
| captain |         8 |              3 |           2 |

**Rewards**:

| Tier    | hp_bonus | attack_mod_bonus | initiative_bonus | ability_unlock_tier |
| ------- | -------: | ---------------: | ---------------: | ------------------- |
| veteran |       +5 |               +1 |                — | r2                  |
| captain |      +10 |               +2 |               +2 | r3                  |

## Effort delta vs scope ticket estimate

Scope ticket §3 stima ~10h: 2h CT bar verify + 4h promotionEngine + 2h API/UI + 2h test.

Actual:

- 0h CT bar (già completo PR #1998, solo audit grep ~5min)
- 1.5h promotionEngine (engine + data + cache + fallback)
- 0.5h API endpoints (2 routes + event logging)
- 1h test suite (12 unit + 5 API)
- 0.5h audit doc + scope doc

**Total: ~3.5h** vs stima 10h = -65% (CT bar pre-existing è il guadagno principale).

## Follow-up (NOT in scope this PR)

- UI button accept/defer (acceptance §3) — atlas/HUD work ~1h
- End-of-mission auto-trigger evaluation event (currently must be polled via GET) — minor enhancement ~30min
- Promotion event integration with debrief / VC scoring — ~1h
- Campaign-level persistence (Prisma write-through similar to progressionStore) — ~2-3h se cross-mission persistence needed

## Pillar impact

**P3 Identità Specie × Job** 🟢ⁿ rinforzato (canonical FFT progression depth). Combined with CT bar visible (P1 leggibilità tattica già 🟢++), TKT-M15 chiude la sequenza A2 Triangle Strategy M14-A/B/M15.

## Conclusione

TKT-M15 = **COMPLETION PR** (non solo verify). CT bar pre-existing + promotion engine new ship = 4.5/5 acceptance criteri soddisfatti. UI button deferred a follow-up scoped ~1h.
