---
title: 'GAP2 block-3 trait-mechanics proposal -- 6 crisp inert traits (salvage item 3)'
date: 2026-06-29
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-29'
source_of_truth: false
review_cycle_days: 90
tags: [salvage, traits, gap2, inert, mechanics, proposal, ratify]
---

# GAP2 block-3 trait-mechanics proposal -- 6 crisp inert traits

Continues the GAP2 framework. Block-1 (6 secretion/sensory) ratified+built in
#3035; block-2 (6 more) ratified+built in #3044. **Propose-then-build** (master-dd
ratifies, then I wire it -- same flow as #3033->#3035, #3041->#3044). **Nothing is
wired here.**

## Current inert landscape (recounted on origin/main, 2026-06-29)

`active_effects.yaml.traits` = 401; DB trait files (`index.json.traits`) = 309;
**inert** (DB trait with NO active_effects mechanic) = **91** (down from 97 after
block-2). Split:

| Bucket                                                  | Count  | Disposition                                          |
| ------------------------------------------------------- | ------ | ---------------------------------------------------- |
| Genuinely crisp-described (specific glossary line)      | **~37**| groundable -- this block picks 6                     |
| Auto-gen boilerplate ("X permette alle squadre di...")  | ~45    | description-rewrite FIRST (design call, not as-is)   |
| `*_2` appendix-A variants                               | 9      | separate ratify track (#3036)                        |

## Proposed 6 (all reuse ALREADY-WIRED effect kinds -- no forbidden schema, no jobs regen)

Wired kinds confirmed in `resolveTraitEffect` + the passive path: passive
`apply_status` (WAVE_A `attuned` = +1 def / `healing` = +1 HP/turn), on-hit
`apply_status` (`fracture`/`disorient`/`abbagliato`), actor `attack_bonus`,
`extra_damage`, `damage_reduction` (side:target). Each mechanic is grounded in the
trait's own glossary line.

| # | trait | glossary grounding | proposed mechanic (wired) |
| - | ----- | ------------------ | ------------------------- |
| 1 | `circolazione_bifasica_palude` | doppio circuito che separa ossigeno e agenti tossici | **passive `attuned` (+1 def)** -- il sangue tampone attutisce il danno ambientale/tossico (difensivo) |
| 2 | `placca_diffusione_foschia` | placche che diffondono e attenuano cariche erratiche | **passive `attuned` (+1 def)** -- le placche disperdono le scariche in arrivo (difensivo) |
| 3 | `polmoni_cristallini_alta_quota` | polmoni che concentrano ossigeno rarefatto in quota | **passive `healing` (+1 HP/turno)** -- riserva d'ossigeno = recupero sostenuto (fisiologico) |
| 4 | `organi_sismici_cutanei` | lamelle meccano-recettive che percepiscono vibrazioni del suolo | **`attack_bonus` +1 (actor)** -- tremorsense = posizionamento preemptivo / colpo piu' preciso (sensoriale) |
| 5 | `cavita_risonanti_tundra` | camere toraciche che proiettano richiami a lunga distanza | **on-hit `apply_status disorient`** -- il richiamo risonante disorienta il bersaglio colpito (sensoriale) |
| 6 | `emettitori_voidsong` | organi che emettono cori a frequenze profonde per stabilizzare lo shear | **on-hit `apply_status abbagliato`** (-1 atk next) -- il void-song destabilizza la mira del bersaglio (offensivo) |

Mix: 2 passive-defensive, 1 passive-regen, 1 attack-bonus, 2 on-hit-status -- same
balance-neutral profile as block-1/2 (inert until a sim unit carries them).

## Build steps (after ratify -- mirror #3044)

1. Append the 6 to `active_effects.yaml.traits` SURGICALLY (the `traits:` map is the
   last top-key; 2-space indent; NO `yaml.safe_dump` reformat; verify no dup key).
2. Mirror-consistency gate (`check_trait_mirror_consistency.py`): the DB+index
   entries already exist (these are inert DB traits), so active_effects-only is
   consistent (the mirror is trait_mechanics->active_effects one-way; we add no
   trait_mechanics here).
3. Verify: `node --test tests/ai/*.test.js` band-neutral 557/557, `npm run test:api`
   exit 0, cavecrew. Band-neutral: no sim unit carries these traits.

## NOT proposed (surfaced, separate clusters)

- **buff-manipulation** (`ghiandole_mnemoniche`, `riverbero_memetico`,
  `organi_metacronici`) -- need a steal/copy primitive (new effect kind, forbidden
  schema). Owner design call.
- **mobility/adhesion** (`locomozione_miriapode_ibrida`, `cinghia_iper_ciliare`,
  `cartilagine_flessotermica_venti`) -- SUBSTRATE-gated (move-terrain-cost
  workstream); don't double-build.
- **recon/foresight** (`nodi_micorrizici_oracolari`, `pathfinder`, `pianificatore`)
  -- need a reveal/scout mechanic (no wired primitive yet).
- **45 boilerplate** -- description-rewrite first.

## Decision requested (master-dd)

Ratify the 6 above (build via the block-2 recipe), adjust the mechanic mapping, or
defer. `random` (an artifact slot) is intentionally excluded.
