---
title: 'GAP2 -- inert-trait mechanics PROPOSAL (subset: 6 secretion/sensory traits)'
date: 2026-06-23
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
review_cycle_days: 90
tags: [traits, gap2, mechanics, proposal, ratify, salvage]
---

# GAP2 -- inert-trait mechanics PROPOSAL (subset)

Salvage item 3. master-dd directive: **propose mechanics for a coherent subset**
(band-neutral, draft -- you ratify, then I build). This is a PROPOSAL only: nothing
is wired yet.

## GAP2 recount (ground-truth, post ancestor-rename #3001)

- **104 inert** per-trait DB files have no `active_effects.yaml` mechanic (94 are also
  in `index.json` = real traits). `active_effects.traits` = 389; per-trait DB = 310.
- **53 of the 94** have a crisp glossary description (groundable); the rest have
  auto-generated boilerplate ("permette alle squadre di interpretare segnali...") --
  those need a real description BEFORE a mechanic (description-first; flagged).
- The **9 `*_2` drafts** in `data/traits/_drafts/` are empty TODO skeletons
  (`famiglia_tipologia: TODO/import_esterno`, all `da_definire`, `external_source: true`,
  from `appendix_a_canvas`) whose base names already exist as complete canonical traits;
  the `_2` are unserved (not in index). Zero content to preserve. Resolution
  (delete-as-cruft vs author-as-distinct from appendix-A) deferred to you.

## Proposed mechanics -- 6 traits (all use EXISTING effect_types; no forbidden schema)

Each maps to an already-supported mechanic class (defensive/offensive stat mods +
`apply_status`/`cleanse_status`/`buff` active effects). Band-neutral: no sim unit carries
these, so wiring them is inert until a species does. Values flagged **PROPOSED** (ratify
N=40 / calib). The glossary line is the grounding.

| trait                             | glossary (grounding)                                           | proposed mechanic                                                                                      |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ghiandola_caustica`              | "spruzza acidi rapidi contro corazze leggere" (offensive)      | **offensive**: `on_hit_status` -> `fracture` 1t (acid-weakens armor), trigger_dc 13; +0 dmg            |
| `estroflessione_gastrica_acida`   | "liquefare tessuti al contatto e aspirarli" (on-contact drain) | **offensive**: active `drain` -- small damage + self-heal half (existing drain_attack pattern)         |
| `impulsi_bioluminescenti`         | "scariche ritmiche che abbagliano e sincronizzano alleati"     | **control/support**: active `apply_status` -> `abbagliato` (reuse pigmenti dazzle) on enemy in range 2 |
| `canto_risonante`                 | "frequenze che armonizzano il gruppo e riducono stress (temp)" | **support**: active `buff` defense_mod +1 / 2t to an ally (range 2)                                    |
| `mucillagine_simbionte_mangrovie` | "mucosa simbionte che assorbe veleni e sigilla ferite"         | **defensive**: passive once/round cleanse 1 `poison`-class status + heal 1 (mirror filtri passive)     |
| `nebbia_mnesica`                  | "foschia psionica che offusca memorie e orientamento"          | **control**: active `apply_status` -> `disorient` 1t to enemies in range 2 (AoE-1)                     |

### Mechanic-class framework (for the broader 104, your ratify per block)

- **defensive integument** (placche_pressioniche / scudo_gluteale_cheratinizzato /
  squame_rifrangenti_deserto / ...): `defense_mod +1` + a channel `resistance` from the
  description (pressure->fisico, heat->fuoco). Lowest-risk class.
- **secretion glands** (the 6 above + ghiandole_mnemoniche / cromofori_alert_acido):
  `apply_status` / `cleanse_status` / `buff` actives.
- **resonant/sonic** (echi_risonanti / lobi_risonanti_crepuscolo / cavita_risonanti_tundra):
  `disorient` control (reuse eco_sismico's status pattern; some are tile-area candidates).
- **sensory/detection** (`bioantenne_gravitiche` / `nodi_micorrizici_oracolari` / `antenne_*`):
  reveal/telegraph -- NO combat-stat mechanic; likely metadata-only (out of the d20 stat layer).

## After your ratify

For each ratified trait: add the entry to `trait_mechanics.yaml` (+ `active_effects.yaml`
registry if a new active ability) -> regen jobs.yaml (`generate_trait_native_abilities.py`)
-> abilityExecutor handler ONLY if a new effect_type is needed (these 6 reuse existing
ones, so no new effect_type / no forbidden schema) -> 5-gate + AI-baseline band-neutral
check. The `*_2` deletion (if you confirm cruft) = a separate 9-file cleanup.
