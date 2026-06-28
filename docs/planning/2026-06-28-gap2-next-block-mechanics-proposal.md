---
title: 'GAP2 next-block trait-mechanics proposal -- 6 crisp inert traits (salvage item 3)'
date: 2026-06-28
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-28'
source_of_truth: false
review_cycle_days: 90
tags: [salvage, traits, gap2, inert, mechanics, proposal, ratify]
---

# GAP2 next-block trait-mechanics proposal -- 6 crisp inert traits

Continues the GAP2 framework (the first 6 secretion/sensory mechanics were
ratified + built in #3035). **Propose-then-build** (master-dd ratifies, then I
wire it -- same flow as #3033 -> #3035). Nothing is wired here.

## Current inert landscape (recounted on origin/main, 2026-06-28)

`active_effects.yaml.traits` = 395; DB trait files = 309; **inert** (DB file with
NO active_effects mechanic) = **97**. Split:

| Bucket                                                              | Count  | Disposition                                                           |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Genuinely crisp-described (specific glossary line)                  | **49** | groundable -- this proposal picks 6                                   |
| Auto-gen boilerplate ("X permette alle squadre di stabilizzare...") | 39     | needs a description-rewrite FIRST (design call, not groundable as-is) |
| `*_2` appendix-A variants                                           | 9      | separate ratify track (#3036, `design_stub` prose pending)            |

After this block, ~43 crisp inert remain; they fall into clusters with different
gating (see [Future clusters](#future-clusters)).

## Effect-type constraint

All 6 mechanics use only RUNTIME-CONSUMED trigger/effect pairs (no forbidden-path
schema edit, no new effect_type, no jobs re-baseline). The two wired channels:

- **attack-side**: `trigger.action_type: attack` -> `resolveTraitEffect` handles
  `apply_status` (on-hit, deferred), `extra_damage`, `attack_bonus`.
- **passive apply_status**: `trigger.action_type: passive` + `effect.kind:
apply_status` with a WAVE_A status -> `passiveStatusApplier` sets it ->
  `computeStatusModifiers` / `applyTurnRegen` consume it (e.g. `attuned` -> +1
  defense, `healing` -> +1 HP/turn).

A raw passive `damage_reduction` / `heal` / `buff_stat` is NOT consumed (it is
filtered by `passesBasicTriggers` before the handler runs) -> see the wiring
correction below. Each entry is `active_effects.yaml`-only (the 6 DB files +
index already exist; the mirror gate is `trait_mechanics -> active_effects`
one-way, so active_effects-only is consistent -- corrected from the #3035 recipe,
which needed `trait_mechanics` only for active abilities).

## The 6 proposed mechanics (all PROPOSED magnitudes -> ratify + N=40)

> **WIRING CORRECTION (post-build, verify-first -- Codex P2).** The runtime only
> consumes an active_effects trait when EITHER (a) the trigger is `action_type:
attack` (`passesBasicTriggers` in `traitEffects.js` rejects every non-attack
> trigger before `resolveTraitEffect` runs), OR (b) the trigger is `passive` with
> `effect.kind: apply_status` (the `passiveStatusApplier` only wires passive
> apply_status). So a passive `damage_reduction` / `heal` / `buff_stat` is INERT.
> The build (#3044) therefore remapped the 3 passive rows below to the wired
> pattern (passive `apply_status` -> a WAVE_A status -> consumer); ectotermia uses
> `attack_bonus` (passive buff_stat is inert). The "effect (built)" column shows
> what shipped.

| #   | trait                           | cat         | tier | glossary grounding                                                                                         | trigger        | effect (built, wired)                                         |
| --- | ------------------------------- | ----------- | ---- | ---------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| 1   | `zanne_idracida`                | offensivo   | T4   | "Corrodere tessuti e metalli."                                                                             | attack, on hit | `apply_status` fracture 2t (corrosion eats armor)             |
| 2   | `emolinfa_conducente`           | offensivo   | T3   | "Fluido che accumula carica e drena energia nemica."                                                       | attack, on hit | `extra_damage` 1 (electric discharge)                         |
| 3   | `placche_pressioniche`          | difensivo   | T3   | "Strati che disperdono pressione abissale e riducono trauma."                                              | passive        | `apply_status attuned` -> +1 defense (computeStatusModifiers) |
| 4   | `scudo_gluteale_cheratinizzato` | difensivo   | T3   | "Assorbire impatti posteriori."                                                                            | passive        | `apply_status attuned` -> +1 defense                          |
| 5   | `ectotermia_dinamica`           | fisiologico | T3   | "Microscosse isometriche che innalzano la temperatura corporea per picchi prestazionali in climi freschi." | attack         | `attack_bonus` 1 (passive buff_stat is inert)                 |
| 6   | `piume_solari_fotovoltaiche`    | fisiologico | T2   | "Piumaggio fotovoltaico che immagazzina luce per lunghe missioni."                                         | passive        | `apply_status healing` -> +1 HP/turn (applyTurnRegen)         |

Per-trait rationale:

1. **zanne_idracida** -- direct mirror of #3035's `ghiandola_caustica` (on-hit
   `fracture`), but 2 turns (a T4 corrosive bite > a T1 acid gland). Armor-shred
   on hit; no new engine.
2. **emolinfa_conducente** -- "drains enemy energy" simplified to flat on-hit
   bonus damage (the literal energy-steal/buff-drain primitive does NOT exist;
   see Future clusters). A small `extra_damage` is the band-neutral reading.
3. **placche_pressioniche** -- "disperse pressure, reduce trauma" = passive defense.
   Built as passive `apply_status attuned` (the `attuned` status is read by
   `computeStatusModifiers` as +1 defense_mod target-side). A raw passive
   `damage_reduction` is inert (see the wiring correction).
4. **scudo_gluteale_cheratinizzato** -- "absorb rear impacts" = passive `apply_status
attuned` (+1 defense). Directional rear-only DR would need a facing system that
   does not exist -> a flat defensive buff is the band-neutral reading.
5. **ectotermia_dinamica** -- "rapid warm-up for performance peaks in cool climates"
   = an `attack_bonus 1` on attack (warmed musculature strikes harder). A passive
   `buff_stat` is inert in the resolver; `attack_bonus` is the wired readiness analog.
6. **piume_solari_fotovoltaiche** -- "stores light for long missions" = passive
   `apply_status healing` (the `healing` status is read by
   `statusModifiers.applyTurnRegen` -> +1 HP/turn HoT). A raw passive `heal` is inert.

All 6 are **band-neutral by default**: no current sim/combat unit carries them
(they are inert catalog traits; wiring only makes the catalog mechanic
dispatchable, AI 557/557 holds, as with #3035).

## Build plan (as built in #3044)

1. For each: add the `active_effects.yaml` entry ONLY (the 6 DB files + index
   already exist; the `check_trait_mirror_consistency.py` gate is
   `trait_mechanics -> active_effects` one-way, so an active_effects-only add is
   consistent -- no `trait_mechanics.yaml`, no `add_trait_stub`, no jobs regen).
2. Use a runtime-consumed trigger/effect pair (attack-side or passive
   apply_status; see the wiring correction) -- proven end-to-end, not
   handler-exists.
3. `npm run test:api` 0-fail + AI 557/557 byte-stable (band-neutral, no carrier) +
   cavecrew review.
4. PR (non-forbidden, freely mergeable).

## Future clusters (the remaining ~43 crisp inert -- different gating)

- **Buff-manipulation** (`ghiandole_mnemoniche`, `riverbero_memetico`,
  `spicole_canalizzatrici`, `organi_metacronici`, `scintilla_sinaptica`) -- copy /
  steal / re-emit buffs. Coherent cluster BUT needs a NEW buff-copy/steal
  primitive (not an existing effect_type) -> like eco/substrate, owner-gated for a
  new engine primitive.
- **Mobility / adhesion** (`unghie_a_micro_adesione`, `locomozione_miriapode_ibrida`,
  `cinghia_iper_ciliare`, `cartilagine_flessotermica_venti`) -- terrain/locomotion
  -> SUBSTRATE-gated (master-dd's MOVE/TERRAIN/ELEVATION workstream #2997/#3006;
  do NOT double-build, anti-pattern #19).
- **Sensory / recon** (`pathfinder`, `organi_sismici_cutanei`,
  `nodi_micorrizici_oracolari`) -- detect/reveal/anticipate -> needs a
  reveal/initiative mechanic (no clean existing combat effect_type).
- **Description-first 39 boilerplate** -- rewrite the auto-gen glossary line into a
  specific behavior before a mechanic can be grounded (design authoring).

## Decision requested (master-dd)

Ratify the 6 proposed mechanics (and any magnitude edits) -> I build them via the
#3035 recipe. Or trim/extend the set. The future clusters are surfaced, not
proposed (they need a primitive / substrate / description-rewrite first).
