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

All 6 proposed mechanics reuse an EXISTING `active_effects` effect kind
(`apply_status` / `extra_damage` / `damage_reduction` / `buff_stat` / `heal`) and
an EXISTING actor-side trigger (`passive` / `attack+on_result:hit`). **No
forbidden-path schema edit** (no new effect_type, no `traitMechanics.schema.json`,
no jobs re-baseline). Each is a data-only add: `trait_mechanics.yaml` +
`active_effects.yaml` MIRROR (the P1 gate) + `add_trait_stub` if the DB needs the
mechanic-flag -- exactly the #3035 recipe.

## The 6 proposed mechanics (all PROPOSED magnitudes -> ratify + N=40)

| #   | trait                           | cat         | tier | glossary grounding                                                                                         | trigger        | effect (PROPOSED)                                 |
| --- | ------------------------------- | ----------- | ---- | ---------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------- |
| 1   | `zanne_idracida`                | offensivo   | T4   | "Corrodere tessuti e metalli."                                                                             | attack, on hit | `apply_status` fracture 2t (corrosion eats armor) |
| 2   | `emolinfa_conducente`           | offensivo   | T3   | "Fluido che accumula carica e drena energia nemica."                                                       | attack, on hit | `extra_damage` 1 (electric discharge)             |
| 3   | `placche_pressioniche`          | difensivo   | T3   | "Strati che disperdono pressione abissale e riducono trauma."                                              | passive        | `damage_reduction` 1                              |
| 4   | `scudo_gluteale_cheratinizzato` | difensivo   | T3   | "Assorbire impatti posteriori."                                                                            | passive        | `damage_reduction` 1                              |
| 5   | `ectotermia_dinamica`           | fisiologico | T3   | "Microscosse isometriche che innalzano la temperatura corporea per picchi prestazionali in climi freschi." | passive        | `buff_stat` +1 (readiness; exact stat to confirm) |
| 6   | `piume_solari_fotovoltaiche`    | fisiologico | T2   | "Piumaggio fotovoltaico che immagazzina luce per lunghe missioni."                                         | passive        | `heal` 1 once/round (solar sustain)               |

Per-trait rationale:

1. **zanne_idracida** -- direct mirror of #3035's `ghiandola_caustica` (on-hit
   `fracture`), but 2 turns (a T4 corrosive bite > a T1 acid gland). Armor-shred
   on hit; no new engine.
2. **emolinfa_conducente** -- "drains enemy energy" simplified to flat on-hit
   bonus damage (the literal energy-steal/buff-drain primitive does NOT exist;
   see Future clusters). A small `extra_damage` is the band-neutral reading.
3. **placche_pressioniche** -- "disperse pressure, reduce trauma" = a flat passive
   `damage_reduction 1` (mirror the 89 existing DR traits).
4. **scudo_gluteale_cheratinizzato** -- "absorb rear impacts" = passive
   `damage_reduction 1`. (Directional rear-only DR would need a facing system that
   does not exist -> flat DR is the band-neutral reading; flagged.)
5. **ectotermia_dinamica** -- "rapid warm-up for performance peaks in cool
   climates" = a passive readiness `buff_stat +1`. The exact buffed stat
   (initiative vs move vs attack) is the design call; PROPOSED = the trait's combat
   tempo stat. (A biome-conditional "only in cold biomes" gate would need a biome
   read at resolve; PROPOSED = unconditional for band-neutrality.)
6. **piume_solari_fotovoltaiche** -- "stores light for long missions" = a passive
   `heal 1` once per round (mirror the 4 existing `heal` traits). PROPOSED cadence
   once/round (a per-turn heal would be strong).

All 6 are **band-neutral by default**: no current sim/combat unit carries them
(they are inert catalog traits; wiring only makes the catalog mechanic
dispatchable, AI 557/557 holds, as with #3035).

## Build plan (after ratify -- per the #3035 recipe)

1. For each: add the `trait_mechanics.yaml` entry + the `active_effects.yaml`
   MIRROR (the `check_trait_mirror_consistency.py` P1 gate -- a trait in one but
   not the other is silently no-op'd).
2. No jobs regen (all passive/on-hit, no trait-granted ability) and no schema edit.
3. 5 trait gates (template/style/coverage/qa) + `npm run test:api` 0-fail + AI
   557/557 + cavecrew review.
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
