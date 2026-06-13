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

## Root cause (2026-04-29 RESOLVED)

Diagnosi confermata: **3 problemi compounding** identificati post-investigation:

### Bug 1 — Faction key mismatch (PRIMARIO)

`enumerateLegalActions` filtra enemies via `u.team !== actor.team`. Session units usano `controlled_by` (player/sistema) — campo `team` undefined. Filter `undefined !== undefined === false` → **zero enemies enumerati** → only retreat action available → retreat ALWAYS chosen.

### Bug 2 — Multiplicative scoring annihilation (SECONDARIO)

`scoreAction` accumulator `score *= (weighted + 0.01)`. Single 0-weighted consideration (es. TargetHealth=0 su full-hp target) annichila score totale. Sparse considerations + many small values → near-zero scores favoring default 0.5 path (retreat).

### Bug 3 — Action-agnostic considerations (TERZIARIO)

`TargetHealth` + `SelfHealth` valutavano stesso valore per approach/retreat/attack — nessuna differenziazione semantica. Retreat dovrebbe scoreare HIGH quando wounded, LOW quando healthy. Approach opposto.

## Fix shipped (PR #2012 candidate)

### Fix 1 — Faction compatibility

```js
const factionOf = (u) => u.team ?? u.controlled_by;
const enemies = Object.entries(state.units || {}).filter(
  ([id, u]) => factionOf(u) !== factionOf(actor) && u.hp > 0,
);
```

### Fix 2 — Additive scoring

`totalScore += weighted` invece di `*= weighted + 0.01`. Robusto a sparse considerations + matches utility AI literature pattern.

### Fix 3 — Action-aware considerations

```js
TargetHealth.evaluate: (action, ...) => {
  if (action.type === 'retreat') return 0.5;  // neutral for retreat
  // ... normal target health for approach/attack
}

SelfHealth.evaluate: (action, actor) => {
  const ratio = actor.hp / actor.max_hp;
  if (action.type === 'retreat') return 1 - ratio;  // wounded → high retreat
  return ratio;  // healthy → high engage
}
```

## Verification post-fix

Apex tutorial_05 trace:

| Round | Apex pos | Intent | Score |
|-------|----------|--------|-------|
| R1 | (5,2) | approach | 2.10 |
| R2 | (4,2) | approach | 2.17 |
| R3 | (3,2) | approach | 2.23 |
| R4 | (2,2) | **attack** | 2.51 |

Player p_scout finally in attack range. **Monotonic forward + closes.**

Test suite: 384/384 verdi (utility 14/14 + tutorial05 + AI suite full).

## Kill-switch ripristinato

`packs/evo_tactics_pack/data/balance/ai_profiles.yaml`:

```yaml
aggressive:
  use_utility_brain: true  # re-enabled 2026-04-29 post fix
```

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
