---
title: 'Narrative onboarding port — decisioni Q1-Q5 + execute path'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-05-06-character-creation-port-godot-spec.md
  - docs/core/51-ONBOARDING-60S.md
  - data/core/campaign/default_campaign_mvp.yaml
  - apps/backend/routes/campaign.js
---

# Narrative onboarding port — decisioni Q1-Q5

## Status

PROPOSED — Claude autonomous risposte a 5 Q bloccanti spec port. Master-dd confirm o pivot.

## Prerequisiti audit (tutti GREEN)

| Prereq                                               | Path                                                 | Status                      |
| ---------------------------------------------------- | ---------------------------------------------------- | --------------------------- |
| Trait `zampe_a_molla`                                | `data/core/traits/active_effects.yaml:21`            | ✅ exist                    |
| Trait `pelle_elastomera`                             | `data/core/traits/active_effects.yaml:38`            | ✅ exist                    |
| Trait `denti_seghettati`                             | `data/core/traits/active_effects.yaml:140`           | ✅ exist                    |
| Campaign `onboarding:` section                       | `data/core/campaign/default_campaign_mvp.yaml:32-63` | ✅ canonical 3 choice       |
| Backend `/api/campaign/start` `initial_trait_choice` | `apps/backend/routes/campaign.js:95-122`             | ✅ already wired V1 Phase B |
| Web stack `apps/play/src/onboardingPanel.js`         | esiste                                               | ✅ reference impl           |

**Conclusion**: backend è 80% pronto. Solo gap = WS intent handler `onboarding_choice` (drain + pipe a `/api/campaign/start`) + Godot phone view.

## Q1 — BASE vs COMBO?

**Verdetto**: **BASE first (Sprint M.6) + COMBO upgrade (Sprint N.x post-playtest)**.

**Rationale**:

- User vision = COMBO esplicit ("combinazione risposte muta mondo prima combo"). MA agent narrative-design-illuminator caveat valido: 9 combo × narrative content = budget esponenziale.
- Hybrid: ship MVP BASE 8-10h → playtest → combo design **informato** dai dati MBTI/Ennea reali → ship COMBO upgrade 10h additional.
- Effort totale BASE+COMBO sequenziale ~18h vs direct COMBO ~16-20h. **Quasi pari**, ma BASE first ha 3 vantaggi: (a) MVP playable fast, (b) combo design data-informed, (c) iterazione granulare.
- Pillar: BASE chiude gap P4 MBTI identità pre-match + P5 host-flow. COMBO upgrade aggiunge P2 Evoluzione (mondo muta = evolution hint).

## Q2 — Combo trait set (solo COMBO Sprint N.x)?

**Verdetto MVP**: **N/A — Sprint N.x deferred design call**. Pragmatic: no decisione BASE-time.

**Quando si materializza**: post Sprint M.6 BASE shipped + playtest. Design combo trait pair scelti da pool `active_effects.yaml` esistente (458 trait disponibili). NO trait nuovi (evita ADR + schema ripple). Esempi candidate da pool esistente:

- Scelta 2 X "burst" → trait esistente con `effect_type=burst_attack`
- Scelta 2 Y "formation" → trait esistente con `effect_type=adjacent_buff`
- Scelta 2 Z "biome react" → trait esistente con `biome_affinity` trigger

Defer formal Sprint N.x ticket.

## Q3 — Mondo muta?

**Verdetto MVP**: **NIENTE in BASE**. Defer Sprint N.x COMBO upgrade.

**Rationale**:

- Canonical 51-ONBOARDING-60S.md non specifica mondo mutation in MVP scope (out of scope esplicit).
- Aggiungere biome forced O scenario seed in BASE = scope creep, aumenta effort 2-3h, complica testing.
- COMBO upgrade Sprint N.x: scenario seed integer modifier (NO N scene unique → evita budget content).

**MVP path**: trait pre-assegnato a tutto il branco è sufficient per identity expression. Mondo statico (default `enc_tutorial_01` biome).

## Q4 — Host-only vs vote co-op?

**Verdetto**: **HOST-ONLY Sprint M.6**. Vote co-op deferred (probabilmente skip permanente).

**Rationale**:

- Canonical 51 §Phase C: "host fa scelta vincolante per intero roster". Esplicit nel doc canonical.
- Vote co-op = +4h protocol overhead + sync edge cases (timeout vote, tie break, AFK player).
- Disco Elysium pattern: identità del branco è UNITARIA. "Come vuoi che ti ricordino?" è singolare. Vote co-op rompe il tono diegetico.
- Co-op flow: host phone vede 3 card + tap. Altri phone vedono briefing read-only + result broadcast `onboarding_chosen`.

## Q5 — Sequenza flow composer?

**Verdetto**: **CONFIRM proposed sequence**.

```
LOBBY_JOIN → ONBOARDING → CHARACTER_CREATION → WORLD_REVEAL → COMBAT → DEBRIEF
```

**Rationale**:

- ONBOARDING = scelta branco (1 sola, host-only, narrative).
- CHARACTER_CREATION = scelta individuale PG co-op (Jackbox M17 per-player).
- Sequenza coerente: identità branco → identità individuale → mondo → combat → debrief.
- Backend impact: phase enum extension. `coopOrchestrator.PHASES` add `'onboarding'` BEFORE `'character_creation'`. `KNOWN_PHASES` already extensible.

## Sprint integration

**Sprint M.6 NEW** (post M.5 cross-stack spike):

```
TKT-NARR-ONBOARD-GODOT-PORT-BASE: 8-10h total
  Phase A — Backend (3h, autonomous Claude):
    - Add 'onboarding' to coopOrchestrator.PHASES + KNOWN_PHASES
    - Add coopOrchestrator.submitOnboardingChoice(playerId, optionKey)
      with host-only enforcement
    - Wire wsSession.js intent handler action='onboarding_choice'
    - Auto-publishPhaseChange('character_creation') post submit
    - Tests + harness scenario 4f
  Phase B — Godot frontend (5-7h, master-dd or Codex):
    - phone_onboarding_view.gd + .tscn (3-stage briefing/choices/transition)
    - Timer logic + auto-select on timeout
    - Composer integration (MODE_ONBOARDING enter pre-CHARACTER_CREATION)
    - Display onboarding_chosen broadcast on player phones (read-only)
    - HTTP fetch campaign/onboarding payload OR receive via WS state
```

**Sprint N.x COMBO upgrade** (post Sprint M.6 playtest):

- Conditional su playtest verdict BASE: do players cite choice in debrief? → COMBO upgrade greenlit
- Effort ~10h: 2nd choice card + 9 combo trait pair design + scenario seed integer modifier

## Execute path autonomous (Phase A backend)

Claude può procedere AUTONOMOUS Phase A backend SENZA bloccare master-dd:

1. Add `'onboarding'` to PHASES (coopOrchestrator) + KNOWN_PHASES (wsSession)
2. Add orch method `submitOnboardingChoice(playerId, optionKey, {allPlayerIds, hostId})` — host-only enforcement, validate optionKey vs campaign.onboarding.choices[]
3. Add method `loadOnboardingFromCampaign(campaignDefId)` — lazy-load campaign yaml
4. Wire wsSession.js `case 'intent'` action='onboarding_choice' drain branch
5. Auto-publishPhaseChange('character_creation') quando submit success
6. Broadcast `onboarding_chosen` event to all clients
7. Tests:
   - `tests/api/coopOrchestrator.test.js` — submitOnboardingChoice behavior
   - `tools/testing/phone-flow-harness.js` scenario 4f — verify drain
8. Commit + new PR (separate from #2071) — keeps cleaner reviewer surface

**Phase A doesn't need master-dd answer to ship** because Q1=BASE choice means the schema is already canonical (3 choices flat from yaml). Phase B (Godot frontend) waits for master-dd confirm sequence Q5 + chip spawn.

## Reversibility

Phase A backend = additive (new orch method + new intent action). Reversible via revert PR. Web v1 path unchanged. Godot phone Sprint W7 character_create path preserved. ZERO breaking change.

## Decision points pending master-dd

Solo se vuole **deviare** dalle proposte:

1. ⚠️ Vote co-op invece di host-only (+4h)?
2. ⚠️ Mondo muta in BASE invece di defer (+2-3h)?
3. ⚠️ COMBO direct invece di BASE first?
4. ⚠️ Skip narrative onboarding (mantieni Sprint W7 dropdown placeholder)?

Default OK = ship Phase A backend autonomous now.
