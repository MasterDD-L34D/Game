---
title: 'Form-Pulse trait v2 -- imprint weak-cell balance-pick recon (PROPOSED, N=40 scouting)'
date: 2026-06-30
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-30'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, form-pulse, aa01-impronta, trait, imprint, balance, recon, n40]
---

> **Provenance + verify-first.** Produced by a verify-gated multi-agent scout (scout -> adversarial
> liveness verify -> synth, 9 agents). Every recommended pick was then RE-AUDITED by the main session
> against the live engine before publishing -- results below. **Nothing is wired** (master-dd verdict
> 2026-06-30: defer / leave the live mapping as-is). This is the candidate MENU for the N=40 ratify of
> the build-spec W3 cells. Companion: [`2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md`](2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md) sec. W3.

## Independent re-audit (main session, against the real registry)

| pick                               | cell                       | re-audit (`isEngineLiveReliable` + consumer check)                                                                      | disjoint |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| `dilatazione_temporale_percettiva` | offense/RAPIDA primary     | `situational(min_mos:4)` attack/extra_damage+1 actor -- LIVE, lightest gate                                             | yes      |
| `coda_frusta_cinetica_2`           | offense/RAPIDA no-gate alt | `LIVE-CLEAN` attack/apply_status disorient -- disorient consumed (session.js:629 `-2` atk)                              | yes      |
| `risposta_di_fuga`                 | defense/FLESSIBILE primary | `LIVE-CLEAN` attack/damage_reduction-1 target, no gate                                                                  | yes      |
| `senso_magnetico`                  | senses/LONTANO re-pick     | `LIVE-CLEAN` attack/apply_status `sensed` actor -- `sensed` in WAVE_A + consumed (statusModifiers.js:198 `+1` accuracy) | yes      |
| `occhi_analizzatori_di_tensione`   | senses/ACUTO re-pick       | `LIVE-CLEAN` attack/extra_damage+1 actor, no gate                                                                       | yes      |

The adversarial verify also caught 3 **false-greens** (syntactic LIVE-CLEAN but engine-DEAD) -- confirmed
by the main session: `velocita_di_valutazione`, `orientamento_nello_spazio`, `orientamento_focused` all
apply the `focused` status, which is NOT in WAVE_A and has NO consumer (`policy.js:111-114`: "dichiarati
come flag ma non [consumati]"). They would pass N=40 falsely as ~0 delta (lesson #3083). REJECTED.

---

# Form-Pulse Trait v2 -- Weak-Cell Balance-Pick Recon (PROPOSED, N=40 scouting)

## What this is

Candidate scouting for the 4 weakest imprint cells of Form-Pulse trait v2. **Nothing here is wired** -- the live mapping stays exactly as-is, deferred. This is the menu master-dd ratifies (or rejects) at the N=40 gate. Two distinct shapes:

- **2 UNWIRED cells** -- `offense/RAPIDA` and `defense/FLESSIBILE` -- currently have no honest mapping; these are first-fill candidates.
- **2 re-pick cells** -- `senses/LONTANO` and `senses/ACUTO` -- already wired to a `situational(min_mos:5)`/double-gated trait; these are cleaner-trait swap options, current picks stay wired unless master-dd ratifies the swap.

Selection method (all candidates): re-audited LIVE against the engine (structural predicate + functional consumer check), disjointness verified programmatically vs branco pool + minor pool + the 6 wired imprint picks. **Liveness gate is HARD**: any trait whose effect has no engine consumer (false-green / inert) is rejected on sight -- shipping a dead trait would falsely pass N=40 as ~0 delta (lesson #3083).

Liveness buckets: `LIVE-CLEAN` (fires on any hit, no gate) > `situational` (gated: min_mos / melee / actor-tag) > `INERT` (no consumer -- always rejected).

---

## Cell 1 -- offense/RAPIDA (UNWIRED, no clean candidate)

No no-gate, high-fast-flavor trait exists in the catalog. The honest primary is **situational** (lightest gate + best fast-flavor); the only no-gate option trades fast-flavor for liveness-purity.

| candidate                          | liveness    | gated?          | fit     | rec         | one-line                                                                                                                                                                                              |
| ---------------------------------- | ----------- | --------------- | ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dilatazione_temporale_percettiva` | situational | min_mos:4       | HIGH    | **primary** | Lightest situational gate (min_mos:4, no melee) + perceptual time-dilation = best honest fast pole; strict upgrade over the draft on gate + flavor                                                    |
| `coda_frusta_cinetica_2`           | LIVE-CLEAN  | none            | MEDIUM  | alt         | Only genuinely-effective no-gate option (disorient is really consumed: -2 atk + priority penalty + AI reads it); pick if W3 liveness-purity is a HARD constraint -- but flavor leans PROFONDA-control |
| `occhi_cinetici`                   | situational | min_mos:5       | HIGH    | alt         | Kinetic-anticipation flavor, same shape as primary, one notch stricter gate; T2 swap candidate                                                                                                        |
| `antenne_tesla`                    | situational | min_mos:5       | MEDIUM  | reject      | Highest situational damage (+2) but electric-discharge flavor only adjacent to speed                                                                                                                  |
| `coda_balanciere`                  | situational | +melee          | MEDIUM  | reject      | Fires every melee hit (reliable) but precision-while-moving != pure speed, +1 weak                                                                                                                    |
| `artigli_scivolo_silente`          | situational | min_mos:8+melee | LOW-MED | reject      | Double-gated crit-only -> fires ~never                                                                                                                                                                |
| `coda_contrappeso`                 | situational | min_mos:5+melee | LOW     | reject      | Double-gated, counterweight-heavy -> PROFONDA lean                                                                                                                                                    |
| `artiglio_cinetico_a_urto` (DRAFT) | situational | min_mos:5+melee | MED-LOW | reject      | The draft pick; fracture-on-melee-crit, leans PROFONDA -- primary beats it on both gate-lightness and flavor                                                                                          |
| `velocita_di_valutazione`          | **INERT**   | (false-green)   | --      | reject      | `focused` status has ZERO consumer (policy.js:111-114) + triggers on MISS = anti-RAPIDA; ships dead, lesson #3083                                                                                     |

**Honest note**: there is no clean LIVE-CLEAN + HIGH-fit option for RAPIDA. The recommended primary is situational by necessity. If master-dd makes liveness-purity a hard constraint, the only no-gate pick is `coda_frusta_cinetica_2` at the cost of fast-flavor (MEDIUM fit, control-leaning).

---

## Cell 2 -- defense/FLESSIBILE (UNWIRED, clean candidate EXISTS)

The W3 "no clean evasion trait today" note is **STALE** -- the Dodge branch (DO 01-06) exists and `risposta_di_fuga` is a clean LIVE-CLEAN target-side DR with textbook evasion flavor. This cell does NOT need a new authored trait.

| candidate                   | liveness    | gated?              | fit      | rec         | one-line                                                                                                                                                                     |
| --------------------------- | ----------- | ------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `risposta_di_fuga`          | LIVE-CLEAN  | none                | HIGH     | **primary** | Target-side DR -1 on any incoming hit, 'preparazione schivata potenziata' = textbook evasion; the agile analogue of DURA's pelle_elastomera; cleanest honest FLESSIBILE pick |
| `preservazione_di_gruppo`   | LIVE-CLEAN  | none                | MED-HIGH | alt         | Identical clean DR shape; semantics lean co-op/branco-protection (overlaps co-op-flavored picks); solid backup                                                               |
| `riflesso_di_ritiro`        | situational | +melee              | HIGH     | alt         | Strongest dodge DR (-2) but melee-only = no-op vs ranged; weaker general fit                                                                                                 |
| `azione_evasiva_wildlife`   | situational | actor-tag:wildlife  | HIGH     | alt         | Gate is BROAD (unknown species + Bridge/Keystone/Support default to wildlife) -> fires fairly reliably; audit-predicate LIVE-CLEAN reading overstated it                     |
| `azione_evasiva_predator`   | situational | actor-tag:predator  | HIGH     | reject      | Fires only vs predator-class enemies = narrow                                                                                                                                |
| `azione_evasiva_irascible`  | situational | actor-tag:irascible | HIGH     | reject      | Narrowest taxonomy gate of the trio                                                                                                                                          |
| `sensori_planctonici`       | LIVE-CLEAN  | none                | HIGH     | reject      | DISQUALIFIED -- already the minor-pool pick for memory_instinct['+'] (not disjoint)                                                                                          |
| `struttura_elastica_amorfa` | **INERT**   | passive             | --       | reject      | passive buff_stat:defense_mod has no consumer; on-theme name but engine-dead, lesson #3083                                                                                   |
| `scivolamento_magnetico`    | **INERT**   | passive             | --       | reject      | passive move_bonus has no consumer; engine-dead                                                                                                                              |
| `coda_balanciere`           | situational | +melee              | --       | reject      | Pole mismatch: actor-side extra_damage = OFFENSE buff, wrong cell entirely                                                                                                   |

**Evasion-gap status: RESOLVED (not a gap).** Contrary to the stale W3 note, a clean LIVE evasion trait exists (`risposta_di_fuga`). No new authored trait required; master-dd has a clean honest primary plus a no-gate backup.

---

## Cell 3 -- senses/LONTANO (RE-PICK, current = sensori_geomagnetici situational min_mos:5)

Current pick is fine but `situational(min_mos:5)` AND double-duties as the `explore_caution '-'` branco pick. `senso_magnetico` is a strictly-cleaner same-semantic upgrade (no-gate) that also frees the branco overlap.

| candidate                            | liveness    | gated?    | fit    | rec         | one-line                                                                                                                                                                                                                                                         |
| ------------------------------------ | ----------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `senso_magnetico`                    | LIVE-CLEAN  | none      | HIGH   | **primary** | No-gate; `sensed` IS consumed (+1 accuracy while sensed>0, statusModifiers.js:198-200); same magnetic-perception family as incumbent but no-gate + frees branco overlap. CAVEAT: YAML desc still says 'Stub data-only' -- STALE, cosmetic one-line fix if picked |
| `antenne_wideband`                   | situational | min_mos:3 | HIGH   | alt         | Lowest gate in the perception family (fires more often than min_mos:5 siblings); pick if extra_damage flavor wanted with higher fire-rate                                                                                                                        |
| `sensori_geomagnetici` (incumbent)   | situational | min_mos:5 | HIGH   | alt         | Current wiring / no-change fallback; NOT disjoint (also branco explore_caution '-')                                                                                                                                                                              |
| `occhi_infrarosso_composti`          | situational | min_mos:5 | HIGH   | alt         | Same gate + same effect as incumbent -> semantic variant only, no mechanical gain                                                                                                                                                                                |
| `antenne_eco_turbina`                | situational | min_mos:5 | HIGH   | alt         | Slightly better LONTANO fit (echolocation) but same gate + effect -> no mechanical gain                                                                                                                                                                          |
| `occhi_analizzatori_di_tensione`     | LIVE-CLEAN  | none      | LOW    | reject      | No-gate but structural-stress/weak-point read = ACUTO pole (wrong cell)                                                                                                                                                                                          |
| `occhi_cinetici`                     | situational | min_mos:5 | MEDIUM | reject      | Motion-prediction leans close-tracking; same gate, no gain                                                                                                                                                                                                       |
| `baffi_mareomotori`                  | situational | min_mos:5 | MEDIUM | reject      | Close-anticipation, not navigation; same gate, no gain                                                                                                                                                                                                           |
| `orientamento_nello_spazio`          | **INERT**   | miss-only | --     | reject      | TRAP: ideal Wayfinding flavor but `focused` unconsumed + triggers on MISS -> practically inert, lesson #3083                                                                                                                                                     |
| `orientamento_focused`               | **INERT**   | miss-only | --     | reject      | Near-duplicate of above; same defect                                                                                                                                                                                                                             |
| `velocita_di_trasduzione_sensoriale` | **INERT**   | passive   | --     | reject      | passive + `focused` (double-dead)                                                                                                                                                                                                                                |
| `memoria_sensoriale`                 | **INERT**   | passive   | --     | reject      | passive + unconsumed `focused`                                                                                                                                                                                                                                   |
| `sensori_planctonici`                | LIVE-CLEAN  | none      | HIGH   | reject      | DISQUALIFIED -- minor-pool pick memory_instinct '+' (not disjoint)                                                                                                                                                                                               |
| `antenne_dustsense`                  | situational | min_mos:5 | HIGH   | reject      | DISQUALIFIED -- branco explore_caution '-' (not disjoint)                                                                                                                                                                                                        |

---

## Cell 4 -- senses/ACUTO (RE-PICK, current = sensori_sismici situational min_mos:5+melee)

Current pick is **double-gated** (min_mos:5 + melee) -> fires rarely = the reliability defect the re-pick targets. `occhi_analizzatori_di_tensione` is no-gate, same +1 damage, honest acute-close weak-point read -> strictly dominates.

| candidate                        | liveness    | gated?          | fit    | rec         | one-line                                                                                                                                                                          |
| -------------------------------- | ----------- | --------------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `occhi_analizzatori_di_tensione` | LIVE-CLEAN  | none            | HIGH   | **primary** | No-gate, +1 dmg on every hit; acute structural weak-point read; strictly dominates double-gated incumbent (same dmg, zero gate); same reliability tier as shipped SILENZIOSA pick |
| `occhi_cinetici`                 | situational | min_mos:5       | HIGH   | alt         | Single-gate (beats double-gated incumbent); acute sound/motion sensing                                                                                                            |
| `baffi_mareomotori`              | situational | min_mos:5       | HIGH   | alt         | Strongest thematic ACUTO (whisker vibration/flow); single-gate                                                                                                                    |
| `branchie_eoliche`               | situational | min_mos:5       | HIGH   | alt         | Air-pressure-variation read; single-gate                                                                                                                                          |
| `antenne_eco_turbina`            | situational | min_mos:5       | HIGH   | alt         | Directional-echo; single-gate, T1 (lighter than T2 incumbent)                                                                                                                     |
| `occhi_infrarosso_composti`      | situational | min_mos:5       | MEDIUM | reject      | Thermal-tracking leans detection, not sharp-close ACUTO                                                                                                                           |
| `antenne_wideband`               | situational | min_mos:3       | MEDIUM | reject      | Lowest gate but detection-breadth flavor, not sharp ACUTO                                                                                                                         |
| `lingua_cristallina`             | situational | min_mos:8       | HIGH   | reject      | Crit-only (fires rarely) = the exact defect being fixed                                                                                                                           |
| `occhi_cristallo_modulare`       | situational | min_mos:8       | MEDIUM | reject      | Crit-only + already wired as SCAR_TRAIT_MAP target (#3098) -> other engine wiring                                                                                                 |
| `denti_tuning_fork`              | situational | min_mos:8       | --     | reject      | apply_status stunned = offensive CC, off-archetype for a sensory pick                                                                                                             |
| `barbigli_sensori_plasma`        | situational | min_mos:5       | MEDIUM | reject      | +2 dmg but bioelectric flavor drifts off pure ACUTO                                                                                                                               |
| `sensori_planctonici`            | LIVE-CLEAN  | none            | --     | reject      | DISQUALIFIED -- minor-pool + GRANTED_V2_TRAIT_IDS (not disjoint)                                                                                                                  |
| `sensori_sismici` (incumbent)    | situational | min_mos:5+melee | HIGH   | reject      | CURRENT pick / fallback; double-gate = the defect; keep only if master-dd rejects all cleaner picks                                                                               |

---

## Disposition

- **All 4 cells stay UNWIRED / current picks stay wired as-is.** Nothing in this recon changes the live mapping -- it is deferred pending the master-dd N=40 ratify.
- `offense/RAPIDA`: no clean candidate -> recommended primary is situational (`dilatazione_temporale_percettiva`); the only no-gate option (`coda_frusta_cinetica_2`) sacrifices fast-flavor.
- `defense/FLESSIBILE`: evasion-gap is **RESOLVED** -- clean LIVE primary exists (`risposta_di_fuga`), no new authored trait needed (corrects the stale W3 "no clean trait" note).
- `senses/LONTANO` + `senses/ACUTO`: re-pick primaries (`senso_magnetico`, `occhi_analizzatori_di_tensione`) are both no-gate strict upgrades over their gated incumbents; current picks remain wired until ratified.
- **These candidates are the menu for the N=40 ratify.** Master-dd picks per cell (or rejects and keeps current); only then does any wiring change. When wired, each pick re-runs the W3 liveness HARD-gate (`tests/services/imprintTraitGrantLiveness.test.js`).
