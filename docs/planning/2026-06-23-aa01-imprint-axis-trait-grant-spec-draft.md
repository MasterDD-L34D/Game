---
title: 'Imprint axis->trait grant -- spec (D6, RATIFIED + BUILT flag-OFF 2026-06-30)'
date: 2026-06-23
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-30'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Imprint axis->trait grant -- spec (D6)

> **Status: RATIFIED + BUILT flag-OFF (2026-06-30).** Master-dd ratified (AskUserQuestion,
> close-out Tier-2 aa01 cluster) the design below; the producer + wire shipped flag-gated
> OFF. The mapping stays PROPOSED-pending-N=40. See **sec.0 (RATIFIED + BUILT)** for the
> as-built decision + the verify-first liveness correction; the rest of the doc is the
> original DRAFT proposal it ratified.
>
> Parent: [`2026-06-22-aa01-c2-imprint-build-spec.md`](2026-06-22-aa01-c2-imprint-build-spec.md)
> (sec.9 open-risk "axis->trait grant pending") +
> [`2026-06-22-aa01-deferred-tracker.md`](2026-06-22-aa01-deferred-tracker.md) (row D6).

## 0. RATIFIED + BUILT (2026-06-30)

**Master-dd verdict (AskUserQuestion, close-out Tier-2 aa01 cluster):** YES, build it --
**stacking model B + mechanism (a) designated-axis = `locomotion`**.

**As built** (`apps/backend/services/imprint/imprintTraitGrant.js` + wire in
`coopOrchestrator._applyBrancoTraitEmergence` / `_computeImprintHint`):

- **Stacking B**: the imprint FEEDS the single shared branco-trait slot -- it does NOT
  stack a second trait (no P6 power-creep). Dominance rule (PROPOSED): **Form-Pulse
  precedence**; the imprint candidate fills the slot ONLY when the Form-Pulse aggregate
  yields nothing.
- **Mechanism (a)**: only the `locomotion` pole grants; the other 3 axes stay cosmetic for
  the trait (they still drive the biome hint).
- **Flag** `IMPRINT_TRAIT_GRANT_ENABLED` (default OFF, AND-gated by `IMPRINT_BEAT_ENABLED`).
  OFF = byte-identical (imprint stays cosmetic). Mapping PROPOSED -> ratify via N=40 before
  any flip (mirror MA3).

**Verify-first liveness correction (load-bearing).** The DRAFT's sec.4 PROPOSED locomotion
picks were `zampe_a_molla` (VELOCE) + `mimetismo_cromatico_passivo` (SILENZIOSA). BOTH are
engine-INERT/near-inert -- the exact defect the `brancoTraitEmergence` coverage audit
(2026-06-23) already caught and rejected (`mimetismo` = `action_type:passive` -> no runtime
consumer; `zampe_a_molla` = `min_mos>=5` -> fires ~never). A third candidate considered for
SILENZIOSA, `spore_psichiche_silenziate`, is ALSO inert (`action_type:melee_attack` fails
`traitEffects.passesBasicTriggers`, which gates on `action_type === 'attack'`). Shipping any
of them would make the N=40 ratify pass falsely (a no-op trait shows ~0 delta) and ship the
feature engine-LIVE / surface-DEAD. **The as-built PROPOSED mapping uses audited-LIVE picks
instead**: `VELOCE -> coda_stabilizzatrice_vortex` (attack/extra_damage, the branco Agile
pick), `SILENZIOSA -> cartilagini_flessoacustiche` (attack/damage_reduction, no-gate,
reliable). master-dd may re-pick at the N=40 ratify (esp. if a genuinely LIVE stealth trait
is authored for SILENZIOSA).

## 1. Purpose

The imprint beat collects a team 4-tuple over 4 body-part axes
(locomotion / offense / defense / senses). Today it only drives the COSMETIC biome hint.
This draft asks: should the imprint also grant a mechanical trait, and if so, how -- modeled
on the EXISTING branco-trait emergence so it inherits its proven governance instead of
inventing a parallel one.

## 2. Load-bearing precedent -- mirror, do not reinvent

`apps/backend/services/identity/brancoTraitEmergence.js` (MA1 part 2, ADR-2026-06-08,
SPEC-M onboarding-identity) ALREADY grants ONE emergent branco trait:

- **Mechanism (objective)**: aggregate the per-player Form-Pulse signals -> dominant axis
  = `argmax|avg|`; if `|avg| >= EMERGENCE_THRESHOLD` (0.30) the trait for that axis's pole
  emerges. Pure, no-mutate, deterministic tie-break, tested.
- **Mapping + threshold (subjective)**: `PROPOSED_BRANCO_TRAIT_MAPPING` (axis x pole ->
  `trait_id`) + the threshold are PROPOSED, ratified via N=40 (MA3 anti-hard-gate), NOT a
  fiat.
- **Dormant-until-populated**: no pulses -> empty aggregate -> no trait. Soft signal, never
  a hard archetype gate (museum anti-pattern `personality-mbti-gates-ghost`).

**D6 should mirror this exact shape** on the DISTINCT imprint body-part axes -- same purity,
same PROPOSED-mapping-ratified-via-N=40 governance, same dormant + soft-signal posture.

## 3. Central design call -- stacking vs the existing branco trait

`brancoTraitEmergence` already yields ONE branco trait from the Form-Pulse aggregate. The
imprint is ALSO a branco-level aggregate (a single shared 4-tuple). So an imprint->trait
grant is a **second branco-trait source**. How the two coexist is the #1 master-dd call:

| Opt | Model                                                                                                       | Power / fairness                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A   | Imprint grants a SEPARATE branco trait (stacks with the Form-Pulse one) -> 2 branco traits                  | Highest power creep; the co-op branco gets 2 free traits a baseline run lacks (P6 risk). |
| B   | Imprint axes FEED the same single emergence (added to the mapping; still ONE trait emerges across all axes) | Unified, lowest creep; but imprint + Form-Pulse compete for one slot.                    |
| C   | Imprint and Form-Pulse are ALTERNATIVE sources; pick the dominant, still ONE branco trait                   | One slot, no creep; needs a dominance rule between the two channels.                     |
| D   | Imprint grants a DISTINCT minor/passive trait CATEGORY (not the combat branco trait)                        | Avoids stacking on the combat slot; needs a separate minor-trait channel + balance.      |

**No recommendation is asserted** -- this is the gating fairness decision. The draft's lean,
for discussion: **B or C** (keep ONE branco trait slot) to avoid the P6 power-creep of A.

## 4. PROPOSED imprint axis -> trait mapping (to RATIFY, not a fiat)

Mirror of `PROPOSED_BRANCO_TRAIT_MAPPING`. All cited `trait_id`s VERIFIED to exist in
`data/core/traits/active_effects.yaml` (2026-06-23). The semantic fit + balance is the
master-dd / N=40 call; loose fits are flagged.

| Axis       | Pole       | PROPOSED trait_id              | Effect (active_effects.yaml)           | Fit                    |
| ---------- | ---------- | ------------------------------ | -------------------------------------- | ---------------------- |
| locomotion | VELOCE     | `zampe_a_molla`                | repositioning extra-damage (elevation) | good                   |
| locomotion | SILENZIOSA | `mimetismo_cromatico_passivo`  | passive stealth/concealment            | good                   |
| offense    | PROFONDA   | `ferocia`                      | heavy/aggressive offense               | good                   |
| offense    | RAPIDA     | `artiglio_cinetico_a_urto`     | kinetic impact strike                  | **candidate (verify)** |
| defense    | DURA       | `pelle_elastomera`             | damage reduction                       | good                   |
| defense    | FLESSIBILE | (no clean evasion trait today) | dodge/evasion-flavored                 | **TBD (balance pick)** |
| senses     | LONTANO    | `sensori_geomagnetici`         | long-range navigation sense            | good                   |
| senses     | ACUTO      | `sensori_sismici`              | acute ground/vibration sense           | good                   |

Two cells (offense/RAPIDA, defense/FLESSIBILE) need a master-dd / balance pick -- there is
no obviously-right existing trait; do NOT auto-assign.

## 5. Mechanism question -- 4-tuple -> which trait?

`brancoTraitEmergence` works on a CONTINUOUS aggregate (dominant axis by `|avg|`). The
imprint gives 4 BINARY picks (all axes answered), so "dominant axis" does not map directly.
Options for which trait the tuple grants:

- **(a) Designated-axis**: one axis is the "trait axis"; its pole -> the trait. Simple,
  predictable, only uses 1 of 4 axes.
- **(b) Full-tuple table**: map the 16 combos -> 1 trait (like `biome_resolution.yaml`'s
  base_lookup). Uses all axes; needs a 16-entry PROPOSED table to ratify.
- **(c) Per-axis (4 traits)**: each axis grants its pole's trait -> 4 traits. REJECT under
  Opt 3-A/B/C (way too much power; only viable under a minor-trait category, Opt 3-D, and
  even then heavy).

Lean for discussion: **(a)** if the team keeps it minimal, **(b)** if the imprint should
"feel" like the whole tuple matters. Master-dd call.

## 6. Flag + band-neutrality

NON-band-neutral by nature (a granted trait changes combat). Mandatory gating:

- Its OWN flag, e.g. `IMPRINT_TRAIT_GRANT_ENABLED`, default OFF + only active when
  `IMPRINT_BEAT_ENABLED` is on. OFF = byte-identical legacy (no trait granted).
- PROPOSED mapping + threshold ratified via N=40 BEFORE the flag is ever flipped (mirror
  MA3 / `PROPOSED_FP_VC_MAPPING`).
- Producer pure + no-mutate; the resolver applies the trait; an unknown/mismatched
  `trait_id` is a silent no-op (mirror `brancoTraitEmergence` + `traitEffects.js`).

## 7. P6 Fairness implications (the ratify-blocking concern)

- A shared branco trait benefits all players equally (fair WITHIN the team), but it adds
  team power. Stacking it on top of the Form-Pulse branco trait (Opt 3-A) gives the co-op
  branco TWO free traits a solo/baseline run does not get -- a P6 asymmetry that must be
  balanced against encounter difficulty (N=40), or avoided by Opt 3-B/C/D.
- If imprint is co-op-only, solo runs never get the trait -> a solo-vs-co-op power gap to
  account for (or the imprint must also run solo).

## 8. Open questions for master-dd (ratify checklist)

1. **Is it even wanted?** V2 dropped V1's choice->trait deliberately -- reaffirm intent
   before any build.
2. Stacking model: **3-A / 3-B / 3-C / 3-D**.
3. Tuple->trait mechanism: **5-(a) designated-axis / 5-(b) 16-combo table / 5-(c) per-axis**.
4. The mapping itself (sec.4), incl. the 2 flagged cells.
5. Balance vs encounters -- N=40 pass before flip.
6. Solo applicability (co-op-only vs also solo).

## 9. Disposition

**D6 stays DRAFT.** This document is the spec PROPOSAL, not an approval. No code is written
until master-dd (1) reaffirms the feature is wanted, (2) picks the stacking + mechanism +
mapping, and (3) the mapping clears an N=40 balance pass. On ratify, the build mirrors
`brancoTraitEmergence` (pure producer + PROPOSED mapping + flag-gated resolver + tests). On
decline, close D6 and record that the imprint axes stay cosmetic.
