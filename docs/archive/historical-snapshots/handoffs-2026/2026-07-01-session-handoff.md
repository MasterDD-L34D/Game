---
title: 'Session handoff -- form-pulse v2 build + 7/8 imprint wiring + 12 trait mechanics (2026-07-01)'
date: 2026-07-01
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, form-pulse, aa01-impronta, trait, handoff, n40, tkt-p6]
---

# Session handoff -- 2026-07-01

## TL;DR

- **Form-Pulse trait v2 flip-readiness core BUILT** (W1-W4, flag-OFF byte-identical) +
  imprint mapping wired **7/8** + the `selectImprintAxis` **tuple-determined** mechanism that
  makes verdict D-2 ("all 4 imprint axes matter") actually reachable.
- **12 missing combat trait mechanics authored** (of 29 orphans flagged by
  `check_missing_traits`), engine-LIVE + grounded in glossary lore, PROPOSED -> N=40.
- **4 PR merged**, 4 Codex P2/P1 caught + fixed (all real: zero-weight grant, magnitude-0,
  imprint-cell unreachability, duplicate trait files).
- **Next unblock**: the W5 sim-harness (shared long-pole) is the gate to the form-pulse W6 flip
  AND the Tier-3 N=40 lane; the 17 non-combat trait orphans (TKT-P6) are the next buildable.

## PR mergiati (4)

| PR                                                       | Scope                                                                                  | SHA        | Test                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- | ----------------------------- |
| [#3113](https://github.com/MasterDD-L34D/Game/pull/3113) | unified `brancoTraitProducer` (W2) + buff-scaled enemy-HP offset (W1) + flag-unif (W4) | `de8bde40` | AI 560; +Codex P2 (w=0)       |
| [#3114](https://github.com/MasterDD-L34D/Game/pull/3114) | imprint weak-cell balance-pick recon (PROPOSED menu, doc-only)                         | `36537b1a` | governance                    |
| [#3115](https://github.com/MasterDD-L34D/Game/pull/3115) | wire 3 recon-clean imprint cells (7/8) + `selectImprintAxis` tuple-determined (D-2)    | `9a40cb94` | AI 567; +Codex P2 (reachable) |
| [#3118](https://github.com/MasterDD-L34D/Game/pull/3118) | author 12 missing combat trait mechanics (active_effects only, engine-LIVE)            | `42a00832` | AI 567; +Codex P1 (dup files) |

## Cosa e' cambiato (milestone)

- **Form-Pulse trait v2 (`FORM_PULSE_TRAIT_V2_ENABLED`, default OFF)**: W1 offset =
  `f(grantedBuffPower)` (chiude il bug solo +40% HP) · W2 produttore unico (argmax form-pulse +
  imprint tuple-determined) · W3 mapping imprint 7/8 (solo offense/RAPIDA unwired) · W4 flag
  collassati. Tutto byte-identical flag-OFF. SoT:
  [`2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md`](2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md)
  (W1-W4 = BUILT, W3 = 7/8).
- **`selectImprintAxis` (tuple-determined)**: i 4 assi imprint binari a peso uguale non potevano
  argmax fra loro (solo locomotion reachable) -> la 4-tupla intera hash-mod-seleziona l'asse =
  vera D-2, tutte le celle reachable, reconnect-stabile, PROPOSED (master-dd puo' swappare a
  tabella curata al N=40). Menu candidati per le celle deboli:
  [`2026-06-30-form-pulse-trait-v2-imprint-weak-cell-recon.md`](2026-06-30-form-pulse-trait-v2-imprint-weak-cell-recon.md).
- **12 trait combat** (#3118): `active_effects.yaml` solo (la taxonomy gia' esisteva). 🔑 map:
  active_effects = resolver combat (il reference di `check_missing_traits`); index.json +
  per-trait file = taxonomy. `add_trait_stub` duplica se la category-dir differisce.

## Blockers residui (owner-gated / N=40)

- [ ] **W5 sim-harness AI-player objective-aware** -- SHARED long-pole: gate del form-pulse W6
      flip E della lane Tier-3 N=40 (SPEC-J/HA1/STAMINA). Register sez.1 + close-out X1. Owner =
      Tier-3 lane. **W6 (flip prod form-pulse) PARKED finche' W5 non atterra.**
- [ ] **Form-pulse N=40 picks** (master-dd): offense/RAPIDA imprint cell (no clean pick; menu in
      #3114) · `w` (FORM_PULSE_IMPRINT_WEIGHT) · valori offset (anchor/reference) · la tabella
      tupla->asse (sostituire l'hash-mod?) · senses/LONTANO swap a `senso_magnetico` (serve de-stub
      della desc in active_effects).
- [ ] **TKT-P6: 17 trait non-combat orphans** -- environmental/feeding/AI/buff-theft; active_effects
      e' combat-only (0 pattern descriptor) -> serve species-ref cleanup (species_catalog owner) O
      un pattern trait non-combat (resolver design-call). + 29 specie senza trait_refs (species-side).
- [ ] **Borderline trait mechanics** (master-dd review #3118): coralli_sinaptici_fotofase
      (barrier->offense), nodi_sinaptici_superficiali (sense->accuracy), scintilla_sinaptica
      (reflex->DR) = semantic stretch, PROPOSED.

## Next entry point

1. **First action**: scegli il prossimo workstream -- (a) **TKT-P6** non-combat orphans (buildable:
   propone pattern non-combat O cleanup species-ref), oppure (b) **W5 sim-harness** (long-pole,
   sblocca i flip N=40), oppure (c) ratifica N=40 i pick form-pulse (owner-gated).
2. **Reference**: questo handoff + il build-spec form-pulse + il recon #3114 + il register sez.1 +
   `project_missing_trait_combat_mechanics` + `project_form_pulse_v2_flip_readiness` (memory).
3. **Estimated effort**: TKT-P6 pattern proposal = M; W5 = settimane (owner-strategico).

## Memory (gia' salvate questa sessione)

- `project_form_pulse_v2_flip_readiness` (updated: W1-W4 + wiring 7/8 + tuple-determined).
- `project_missing_trait_combat_mechanics` (new: trait system map + add_trait_stub dup gotcha).

## Cross-reference (piani completati / toccati)

- Build-spec form-pulse (W1-W4 BUILT): `2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md`
- Recon weak-cell (PROPOSED N=40 menu): `2026-06-30-form-pulse-trait-v2-imprint-weak-cell-recon.md`
- Residual-gate register (W5 row sez.1): `2026-06-23-residual-gate-register.md`
- Close-out master plan (X1 broadened): `2026-06-29-closeout-master-plan.md`
- aa01 deferred-tracker (D6 superseded): `2026-06-22-aa01-deferred-tracker.md`
