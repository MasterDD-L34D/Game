---
title: 'Form-Pulse trait v2 -- MBTI x Ennea coverage matrix + engine-LIVE audit (PROPOSED)'
date: 2026-06-23
sprint: aa01-impronta-reconciliation
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Form-Pulse trait v2 -- coverage matrix + engine-LIVE audit

> **L-069 posture: this PROPOSES; the branco/minor mappings + the cap-tier rule are a master-dd
> ratify (MA3).** This is the ratify-condition for the per-player minor traits of
> [Game PR #2992](https://github.com/MasterDD-L34D/Game/pull/2992) (flag
> `FORM_PULSE_TRAIT_V2_ENABLED`, default OFF) and gates the flag flip. Companion evidence:
> [`2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`](2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md).
> Enforcement: `tests/services/formPulseTraitV2Coverage.test.js`.

## 1. What this covers

Every MBTI type (16) + Ennea archetype (9) branch, mapped to the Form-Pulse axis profile that
produces it, and to the **branco trait** + **per-player minor trait** it would emerge -- then each
branco+minor combo AUDITED for coherence + balance. Task scope (master-dd verdict 2026-06-23):
(1) coverage, (2) audit, (3) fix broken picks, (4) apply the cap-tier decision.

## 2. The mechanism (recap, so the matrix is readable)

5 Form-Pulse **creature axes**, each in [-1,+1] (one swipe bar). 4 of the 5 map to an MBTI letter
(`formPulseVc.PROPOSED_FP_VC_MAPPING`, engine convention `deriveMbtiType` HIGH = I/S/T/J); the 5th
(`agile_robust` = Forma/physical) is deliberately NOT an MBTI axis but DOES feed branco/minor.

| Creature axis       | + pole (MBTI letter)       | - pole (MBTI letter) |
| ------------------- | -------------------------- | -------------------- |
| solitary_swarm      | Sciame / social = **E**    | solitario = **I**    |
| explore_caution     | Cauto / concrete = **S**   | esplorazione = **N** |
| symbiosis_predation | Predazione / cold = **T**  | simbiosi = **F**     |
| memory_instinct     | Memoria / planning = **J** | istinto = **P**      |
| agile_robust        | Robusto (Forma)            | Agile (Forma)        |

- **Branco trait** (shared, 1 per team): the team aggregate's **dominant axis** (argmax|avg|) ->
  its pole -> 1 trait. v2 flag ON drops the emergence threshold 0.30 -> 0 (always emerge).
- **Minor trait** (1 per player): the player's OWN dominant axis -> its minor-pool trait; if that
  axis == the branco axis, fall to the 2nd-strongest (COMPLEMENT rule, never duplicate the branco).

So there are exactly **10 branco picks + 10 minor picks** (5 axes x 2 poles). The 16 MBTI types and
9 Ennea archetypes are COMBINATIONS over these atomic poles -- so the coverage + coherence lives at
the pole level (Table A); Tables B/C show the type/archetype decomposition.

## 3. Engine-LIVE audit -- the core finding

A trait id only matters if the **session engine actually applies it**. Verified consumers
(`apps/backend/services/traitEffects.js`, `combat/passiveStatusApplier.js`, `abilityExecutor.js`,
`routes/session.js`):

| Trigger shape                                              | Consumer                         | LIVE?                                  |
| ---------------------------------------------------------- | -------------------------------- | -------------------------------------- |
| `action_type: attack` + extra_damage/damage_reduction/heal | evaluateAttackTraits             | yes                                    |
| `action_type: attack` + apply_status (+ on_kill)           | evaluateStatusTraits             | yes                                    |
| `triggers_on_ally_attack`                                  | combat/beastBondReaction         | yes                                    |
| `action_type: movement` + buff_stat **move_bonus**         | evaluateMovementTraits           | yes                                    |
| `action_type: passive` + apply_status (Wave-A status)      | combat/passiveStatusApplier      | yes                                    |
| **`action_type: passive` + buff_stat (atk/def)**           | **none**                         | **NO -- INERT**                        |
| `requires: posizione_sopraelevata`                         | evaluateAttackTraits (elevation) | fires ~never on flat maps = near-inert |

`passesBasicTriggers` rejects any `action_type !== 'attack'` in the attack pipeline, and no module
applies a trait `effect.kind: buff_stat` outside of `move_bonus`. (All `ability.buff_stat` paths in
session.js/abilityExecutor are ACTIVE abilities with `cost_ap`, not traits.)

**Result: 4 of the 20 picks were engine-INERT / near-inert** -- the same defect class the PR #2992
harsh review caught on the minor pool, but on poles the review did not check:

| Pool . pole           | OLD pick (broken)                  | defect                                                  |
| --------------------- | ---------------------------------- | ------------------------------------------------------- |
| Branco I (solitary-)  | `mimetismo_cromatico_passivo`      | passive buff_stat -> no consumer = INERT                |
| Branco F (symbiosis-) | `empatia_coordinativa`             | passive buff_stat -> INERT                              |
| Branco Agile (agile-) | `zampe_a_molla`                    | `requires: posizione_sopraelevata` = near-inert on flat |
| Minor F (symbiosis-)  | `comunicazione_fotonica_coda_coda` | passive buff_stat -> INERT                              |

Side effect on the N=200 ratify evidence: the power proxy CREDITED power to these 3 passive
buff_stat traits, so `~1.21 power/creature` is a slight **over-count**; the real add is marginally
lower. Direction unchanged (still a moderate, calibratable buff); re-run after the remaps if a
tighter figure is wanted.

## 4. The fix -- remap to existing engine-LIVE traits (verdict 2026-06-23: remap, not author-new)

| Pool . pole           | OLD                              | -> NEW (LIVE)                   | tier | LIVE via                                                  | coherence                                                                              |
| --------------------- | -------------------------------- | ------------------------------- | ---- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Branco I (solitary-)  | mimetismo_cromatico_passivo      | **mente_lucida**                | T2   | evaluateStatusTraits (panic 2t, mos>=5)                   | lone perceptive hunter; the prey feels "seen" -> panic. Contrasts the +pole pack-bond. |
| Branco F (symbiosis-) | empatia_coordinativa             | **spirito_combattivo**          | T2   | beastBondReaction (+1 atk when ANY ally adjacent attacks) | co-op morale = simbiosi/F, BETTER fit than the old name.                               |
| Branco Agile (agile-) | zampe_a_molla                    | **coda_stabilizzatrice_vortex** | T2   | evaluateAttackTraits (+2 dmg melee, mos>=5)               | agile precision strike; T2 sibling of the Agile minor `coda_stabilizzatrice_filo`.     |
| Minor F (symbiosis-)  | comunicazione_fotonica_coda_coda | **membrane_eliofiltranti**      | T1   | evaluateAttackTraits (dr 1, no-gate)                      | endure-beside-allies; complements the co-op `spirito_combattivo` branco.               |

All other 16 picks were already LIVE + the 10 minors already T1. The fix is a DATA change to the two
`PROPOSED_*` mappings only (no trait authored, no shared trait mutated, no schema/glossary churn).

## 5. Table A -- atomic axis-pole coverage (the real coverage + coherence)

Legend: tier(effect, gate). LIVE = engine-live-reliable after the remaps. **bold** = remapped pick.

| Axis pole             | MBTI  | Ennea lean(s)                   | BRANCO (tier, effect)                                     | MINOR (T1, effect)                          | Verdict                         |
| --------------------- | ----- | ------------------------------- | --------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| solitary_swarm +      | E     | Coordinatore(2) [alt]           | legame_di_branco (T2, +1atk/+1def on same-sp ally attack) | biofilm_glow (dr1 melee)                    | OK ++ pack-bond = social        |
| solitary_swarm -      | I     | Individualista(4)               | **mente_lucida** (T2, panic 2t, mos>=5)                   | camere_mirage (dr1)                         | OK (was INERT)                  |
| explore_caution +     | S     | Lealista(6)                     | sensori_sismici (T2, +1dmg melee+mos>=5)                  | cuticole_cerose (dr1 melee)                 | WEAK (double-gated; see 8)      |
| explore_caution -     | N     | Esploratore(7)                  | sensori_geomagnetici (T1, +1dmg mos>=5)                   | antenne_dustsense (+1dmg mos>=5)            | OK ++ explorer navigation       |
| symbiosis_predation + | T     | Conquistatore(3), Cacciatore(8) | ferocia (T1, rage 3t on_kill)                             | denti_seghettati (bleeding 2t)              | OK (snowball gate)              |
| symbiosis_predation - | F     | Coordinatore(2)                 | **spirito_combattivo** (T2, +1atk any-ally attack)        | **membrane_eliofiltranti** (dr1)            | OK (both were INERT)            |
| memory_instinct +     | J     | Riformatore(1), Architetto(5)   | cervello_predittivo (T3, stun 2t, mos>=6)                 | sensori_planctonici (dr1)                   | OK ++ but POWER OUTLIER (see 8) |
| memory_instinct -     | P     | --                              | cervello_a_bassa_latenza (T2, stun 1t, mos>=5)            | coda_prensile_muscolare (fracture 1t melee) | OK ++ instinct/reflex           |
| agile_robust +        | Forma | Stoico(9)                       | pelle_elastomera (T1, dr1)                                | cartilagini_biofibre (dr1 melee)            | OK robust tank                  |
| agile_robust -        | Forma | Cacciatore(8)                   | **coda_stabilizzatrice_vortex** (T2, +2dmg melee+mos>=5)  | coda_stabilizzatrice_filo (+1dmg melee)     | OK (was near-INERT)             |

All 20 picks now pass the engine-live-reliable gate; all 10 minors are T1. No branco/minor id overlap.

## 6. Table B -- MBTI 16 -> axis profile -> branco candidates

Each type fixes 4 axis poles (the 5th, Forma, is free). The branco that actually emerges is the
team's DOMINANT axis; the minor is the player's own dominant (complement). So a type maps to a SET
of possible branco traits (one per leaned letter). Trait per letter (from Table A):

E=legame_di_branco I=mente_lucida S=sensori_sismici N=sensori_geomagnetici
T=ferocia F=spirito_combattivo J=cervello_predittivo P=cervello_a_bassa_latenza

| Type | E/I -> branco        | S/N -> branco            | T/F -> branco          | J/P -> branco                |
| ---- | -------------------- | ------------------------ | ---------------------- | ---------------------------- |
| ISTJ | mente_lucida (I)     | sensori_sismici (S)      | ferocia (T)            | cervello_predittivo (J)      |
| ISFJ | mente_lucida (I)     | sensori_sismici (S)      | spirito_combattivo (F) | cervello_predittivo (J)      |
| INFJ | mente_lucida (I)     | sensori_geomagnetici (N) | spirito_combattivo (F) | cervello_predittivo (J)      |
| INTJ | mente_lucida (I)     | sensori_geomagnetici (N) | ferocia (T)            | cervello_predittivo (J)      |
| ISTP | mente_lucida (I)     | sensori_sismici (S)      | ferocia (T)            | cervello_a_bassa_latenza (P) |
| ISFP | mente_lucida (I)     | sensori_sismici (S)      | spirito_combattivo (F) | cervello_a_bassa_latenza (P) |
| INFP | mente_lucida (I)     | sensori_geomagnetici (N) | spirito_combattivo (F) | cervello_a_bassa_latenza (P) |
| INTP | mente_lucida (I)     | sensori_geomagnetici (N) | ferocia (T)            | cervello_a_bassa_latenza (P) |
| ESTJ | legame_di_branco (E) | sensori_sismici (S)      | ferocia (T)            | cervello_predittivo (J)      |
| ESFJ | legame_di_branco (E) | sensori_sismici (S)      | spirito_combattivo (F) | cervello_predittivo (J)      |
| ENFJ | legame_di_branco (E) | sensori_geomagnetici (N) | spirito_combattivo (F) | cervello_predittivo (J)      |
| ENTJ | legame_di_branco (E) | sensori_geomagnetici (N) | ferocia (T)            | cervello_predittivo (J)      |
| ESTP | legame_di_branco (E) | sensori_sismici (S)      | ferocia (T)            | cervello_a_bassa_latenza (P) |
| ESFP | legame_di_branco (E) | sensori_sismici (S)      | spirito_combattivo (F) | cervello_a_bassa_latenza (P) |
| ENFP | legame_di_branco (E) | sensori_geomagnetici (N) | spirito_combattivo (F) | cervello_a_bassa_latenza (P) |
| ENTP | legame_di_branco (E) | sensori_geomagnetici (N) | ferocia (T)            | cervello_a_bassa_latenza (P) |

Every one of the 16 types now resolves -- on EVERY leaned axis -- to an engine-LIVE branco trait
(pre-fix, any I, F, or Forma-Agile lean produced an inert branco). The minor is whichever non-branco
axis the player leans 2nd-most, drawn from the (all-LIVE, all-T1) minor pool in Table A.

Worked example (INFP team): aggregate leans `symbiosis_predation-` (F) strongest -> branco =
**spirito_combattivo**. A player whose own strongest is also F collides -> complement to their 2nd
axis, say `explore_caution-` (N) -> minor = `antenne_dustsense`. Combo = co-op morale branco + small
personal precision minor. Coherent.

## 7. Table C -- Ennea 9 -> dominant axis -> branco+minor combo

Mapping rationale grounded in `telemetry.yaml ennea_themes` triggers + creature-axis semantics
(PROPOSED, reasoned -- not fiat; same governance as the rest).

| Ennea archetype   | telemetry trigger (proxy)              | dominant axis                   | BRANCO                      | typical MINOR (complement)      | Verdict                                 |
| ----------------- | -------------------------------------- | ------------------------------- | --------------------------- | ------------------------------- | --------------------------------------- |
| Riformatore(1)    | setup_ratio>0.5 && hit_rate>0.65       | memory_instinct +               | cervello_predittivo         | sensori_planctonici / 2nd axis  | OK ++ methodical planner                |
| Coordinatore(2)   | cohesion>0.55                          | symbiosis_predation -           | spirito_combattivo          | membrane_eliofiltranti / 2nd    | OK ++ co-op giver (name-match)          |
| Conquistatore(3)  | aggro>0.65 && risk>0.55                | symbiosis_predation +           | ferocia                     | denti_seghettati / 2nd          | OK ++ aggressive achiever               |
| Individualista(4) | low_hp_time>0.4 && damage_dealt>0      | solitary_swarm -                | mente_lucida                | camere_mirage / 2nd             | OK withdrawn resilient                  |
| Architetto(5)     | setup_ratio>0.4 && low risk            | memory_instinct +               | cervello_predittivo         | sensori_planctonici / 2nd       | OK ++ meticulous planner (shares J w/1) |
| Lealista(6)       | assists>=2 && low risk                 | explore_caution +               | sensori_sismici             | cuticole_cerose / 2nd           | WEAK branco (double-gated; see 8)       |
| Esploratore(7)    | explore>0.45                           | explore_caution -               | sensori_geomagnetici        | antenne_dustsense / 2nd         | OK ++ explorer navigation               |
| Cacciatore(8)     | evasion_ratio>0.6 && first_blood>0     | agile_robust - (or symbiosis +) | coda_stabilizzatrice_vortex | coda_stabilizzatrice_filo / 2nd | OK (was near-INERT zampe!)              |
| Stoico(9)         | kills<1 && damage_taken>0 && endurance | agile_robust +                  | pelle_elastomera            | cartilagini_biofibre / 2nd      | OK robust steady                        |

Notes: Coordinatore(2) leans co-op -> mapped to F/simbiosi (could also read solitary_swarm+ social;
F is the giver/empathy fit). Cacciatore(8)'s hit-and-run/evasion lands on the Agile pole -- which was
exactly the near-inert `zampe_a_molla`; the remap makes this branch LIVE. Riformatore(1) + Architetto(5)
both land on the T3 `cervello_predittivo` (see 8).

## 8. Residual balance (NOT inert -- documented, not blocking)

Per the verdict, branco tiers are NOT normalized; handled via encounter-offset (ratify-doc path).

- **memory_instinct + (J) = `cervello_predittivo` T3 (2-turn stun)** is a power OUTLIER vs the other
  poles, and TWO Ennea archetypes (Riformatore-1, Architetto-5) plus 8 of 16 MBTI types (all \*J)
  route to it. A J-heavy team gets a structurally stronger branco. Mitigation: the encounter-difficulty
  offset (ratify-doc sec.5) -- the buff is near-constant -> offsettable; confirm the exact number with
  a real combat A/B before fixing it.
- **explore_caution + (S) = `sensori_sismici` T2 double-gated (melee + mos>=5)** is the WEAK end (and
  the Lealista-6 branch lands here, whose archetype flavor is defensive while the trait is +dmg). LIVE
  but low-value. Left as-is for this proposal; candidate for a future swap to a reliable defensive S
  pick if the spread proves too wide in playtest.
- **ferocia (T) on_kill** and **legame_di_branco (E) same-species** are conditional (snowball /
  same-species adjacency) but thematically the strongest fits -- accepted as flavor-gated, not inert.

## 9. Cap-tier decision (task item 4)

**The minor pool stays genuinely minor = every minor id is T1 AND engine-live-reliable.** Already
satisfied by the pool (all 10 T1); now ENFORCED by `tests/services/formPulseTraitV2Coverage.test.js`,
which also asserts the 4 old broken picks FAIL the live-reliable gate (so the guard cannot silently
regress). Branco is NOT tier-capped (spread handled by the offset, sec.8).

## 10. Disposition

- Changed (PROPOSED, flag default OFF): `brancoTraitEmergence.js` 4 mapping picks + rationale; new
  enforcement test. No behavior change until the Form-Pulse UX populates pulses AND the flag flips.
- **Ratification pending master-dd.** On ratify: set the encounter-offset (sec.8) before
  `FORM_PULSE_TRAIT_V2_ENABLED` is ever turned ON. Optionally re-run `node tools/sim/fp-trait-delta-probe.js --n 200`
  with the remapped pool for an updated (slightly lower) power figure.
