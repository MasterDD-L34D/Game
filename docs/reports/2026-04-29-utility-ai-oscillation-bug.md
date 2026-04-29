---
title: Utility AI Oscillation Bug — Kill-Switch 2026-04-29
doc_status: active
doc_owner: ai-team
workstream: ops-qa
last_verified: 2026-04-29
source_of_truth: false
language: it
review_cycle_days: 30
---

# Utility AI Oscillation Bug — Kill-Switch 2026-04-29

Bug latente in `apps/backend/services/ai/utilityBrain.js` esposto dal fix `normaliseUnit` (PR #2008). SIS unità con `ai_profile: 'aggressive'` oscilla tra approach e retreat senza chiudere distanza. Encounter unwinnable.

## Reproducibility

- **Branch repro**: `fix/preserve-ai-profile-normalise-unit` (origin/main + ai_profile preservation fix)
- **Test fail**: `tests/api/tutorial05.test.js` — `player attacks 0 < N_RUNS=10 — combat engine silently broken`
- **Pre-fix (main)**: ai_profile dropped → SIS legacy AI → tests pass
- **Post-fix (#2008)**: ai_profile preserved → SIS Utility AI → bug exposed

## Trace

Tutorial 05 BOSS FIGHT, scenario:
- player p_scout (0,2), p_tank (0,3), attack_range 2 e 1
- e_apex (5,2), `ai_profile: 'aggressive'`, AP 3, hp 11

Sequence (debug repro):

| Round | Apex pos | Distance | Player attack |
|-------|----------|----------|---------------|
| R1 | (5,2) | 5 | 400 out of range |
| R2 | (4,2) | 4 | 400 out of range |
| R3 | (5,2) | 5 | 400 out of range |
| R4 | (4,2) | 4 | 400 out of range |
| R5 | (5,2) | 5 | 400 out of range |

Forward → backward → forward → backward, mai chiude. Player attacks 0/10 runs.

**Main legacy AI (origin/main)**: monotonic forward — R1=5, R2=4, R3=3, R4 player hits.

## Root cause hypothesis

`utilityBrain.scoreAction` o `enumerateLegalActions` produce score oscillante per Apex `aggressive`:

- Possibile: `linearInverse(distance)` favorisce retreat quando distance bassa, approach quando alta → flip-flop al confine.
- Possibile: `threat consideration` su Apex HP alto trigger retreat erroneo.
- Possibile: AP 3 multi-action genera "approach + retreat = +0 net" bug.

**Investigation pending** — non risolto in questa sessione.

## Kill-switch applicato (PR #2008)

`packs/evo_tactics_pack/data/balance/ai_profiles.yaml`:

```yaml
aggressive:
  use_utility_brain: false  # was: true (ADR-2026-04-17 first flip)
```

Effetto: SIS aggressive cade su `selectAiPolicy` legacy (REGOLA_001-004). Apex movimento monotonic forward, encounter playable.

## Re-flip criterion

Re-attivare `aggressive.use_utility_brain: true` solo dopo:

1. Fix `utilityBrain.scoreAction` per Apex-class enemies (HP alto + AP 3+ multi-action)
2. Test repro: 5x N=10 tutorial_05 → mean ≥1 victory + 0 timeouts non-balance-related
3. Smoke check Apex movimento monotonic in `debug-multi.js` style

## Cross-ref

- PR #2008: `fix(ai): preserve ai_profile in normaliseUnit (PR #1495 bot P1)` — fix di base + kill-switch atomico
- PR #1495: ADR-2026-04-17 Q-001 T3.1 wiring originale (non bug, solo wiring)
- PR #1497: `balance(tutorial): wire Utility AI on tutorial 02-05 enemies` — sprint 17/04 ha flagged Apex/lanciere/guardiani come `aggressive`. Affected per kill-switch.
- ADR-2026-04-16: AI Utility Architecture (architettura mantiene status accepted, runtime kill-switched)
- ADR-2026-04-17: Utility AI Default Activation Decision (rollout sequence aggiornata: aspetta fix utilityBrain)

## Investigation TODO

Branch dedicato `fix/utility-brain-oscillation` (when scheduled):

- [ ] Aggiungere log `[utility] action=approach/retreat score=N.NN` per debug
- [ ] Repro `debug-multi.js` con 5 round Apex tutorial_05
- [ ] Identificare quale consideration flip-flop (curve linearInverse?)
- [ ] Patch + verify monotonic
- [ ] Re-enable aggressive.use_utility_brain + ship
