---
title: '12 creature-kit trait mechanics -- rich design (game-ref, ratify)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: combat
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [combat, trait, mechanic, design, salvage, game-ref, ratify]
---

# 12 creature-kit trait mechanics -- rich design

Master-dd direction: NOT flat +1 buffs -- coherent, graded, game-ref-inspired
mechanics in EvoTactics style + a REAL ability suppressor. Researched via
balance-illuminator (museum-first + acclaimed-game refs, adapted). **Ratify the
design**, then implement as a sequenced engine program (tiering + tickets below).
Band-neutral: every trait is unreferenced by sim until a creature flips live.

Engine grounding: traits resolve from `active_effects.yaml` via
`apps/backend/services/combat/traitEffects.js`; existing `effect.kind` =
apply_status / damage_reduction / extra_damage / attack_bonus / buff_stat / heal /
persistent_marker; statuses are integer-countdown (`{name: N}`); reaction system
(parry/counter/overwatch/trigger_status). New kinds/statuses are implementable.

## Ability suppression (prereq) -- status `inibito`

- Disables only the unit's ACTIVE abilities (action_type=ability). Movement, basic
  attacks, reactions (reflex), and passive trait bonuses still work -> legible.
- Applied via new `suppress_ability` kind (AoE radius, Mode A) or `apply_status`
  (on-hit, Mode B). Integer countdown; cleared at round end like any status.
- Engine hook: in intent partition, reject ability intents when `inibito>0` -> emit
  `ability_blocked`. Telegraph: locked ability icons on the unit card.
- Ref: XCOM Disruptive Field + D&D Antimagic Field, duration/AP-gated (not total
  silence). Engine: SMALL (status + 1 guard) + MEDIUM (suppress_ability AoE).

## The 12 traits

1. **adattamento_volo** (archon/balor/banshee/couatl) -- 3 GRADES:
   - I Planato (banshee/couatl): ignore terrain move-cost.
   - II Propulsivo (balor): + free ascent; descent>=2 -> `atterraggio_pesante` (+2 crash-strike).
   - III Stazionario (archon): hover when 0-move + altitude -> +1 atk / +1 vs melee.
     Ref: Into the Breach flight + XCOM elevation. Engine: MEDIUM (Grade I move stat) + SMALL.
2. **artigli_psionici** (rakshasa) -- on melee hit, `lettura_preda_<target>` marker on
   actor -> stacking `damage_reduction` (cap 3) vs THAT target only. Read-the-prey ->
   conditional defense. Ref: Pillars Psion + Hades Guan Yu. Engine: MEDIUM (source-marked predicate).
3. **matrice_antimagia** (golem) -- Mode A pulse (2 AP): `inibito` 2t to enemies in radius 2;
   Mode B on-hit: `inibito` 1t to target. The real suppressor. Engine: MEDIUM.
4. **corteccia_memetica** (treant) -- on hit taking >=3 dmg: `damage_reduction 2` + broadcast
   `risonanza_memetica` (single-use +1 atk) to allies in range 3. Ref: Darkest Dungeon ripple +
   Banner Saga willpower. Engine: MEDIUM (`ally_aura_mark` kind + single_use marker).
5. **eco_sismico** (banshee) -- Phase A reveal pulse (range 4) + Phase B `zona_risonante`
   terrain (2 rounds): units entering get `disorient`; banshee self-immune. Ref: ITB telegraph +
   Qud seismic sense. Engine: LARGE (tile-level timed status).
6. **filtri_bioattivi** (otyugh) -- turn-start: cleanse 1 bleeding/fracture + `heal 1` per cleanse;
   active (1 AP, 2t cd): cleanse all neg-status on adjacent ally. Ref: Subnautica filtering +
   Pathfinder otyugh. Engine: MEDIUM (`cleanse_status` kind).
7. **membrane_osmotiche** (otyugh) -- heal 1 when turn-start adjacent water/bog; incoming
   status durations -1 on apply. Tension w/ filtri (less suffering -> fewer cleanse heals).
   Ref: Subnautica fluids + Darkest bleed-resist. Engine: MEDIUM (`duration_absorb` + terrain trigger).
8. **nuclei_di_controllo** (golem) -- 2-state: intact = +1 atk + ally `coordinamento` aura
   (range 2); MoS>=5 hit -> `danno_nucleo` (lose aura, gain DR1); 2nd -> `nucleo_distrutto` (+2 burst).
   Targetable weak-point. Ref: XCOM MEC weak-point + Othercide trauma. Engine: SMALL (reuses ally_aura_mark).
9. **pigmenti_aurorali** (treant) -- while HP>=50%: enemies ending turn adjacent get `abbagliato`
   (-1 atk next); active (1 AP) intensifies to -2 + disorient on attackers. Dims as HP drops.
   Ref: Slay-the-Spire Glow. Engine: LARGE (end-of-round adjacency sweep).
10. **radici_ancora_planare** (treant) -- 0-move = `radicato`: DR3 + +1 atk + forced-move immune;
    first move costs +1 AP; no DR when un-anchored. Fortress/mobility tradeoff. Ref: Banner Saga
    willpower + Pathfinder immovable. Engine: SMALL (marker + requires_marker condition).
11. **tessuti_adattivi** (rakshasa) -- take >=2 dmg of a channel -> `adattamento_<channel>`:
    +15% resist that channel 3 rounds + heal 1; cap 2 channels. Ref: Hades Stubborn Roots.
    Engine: MEDIUM (channel tracking + runtime resistance delta).
12. **kit synergy** (design note): treant = anchored broadcaster (10+4+9); golem = suppressor +
    weak-point coordinator (3+8); rakshasa = duel-specialist that learns (2+11); otyugh = status
    -> HP absorber (6+7); flyers = style-differentiated (archon perch / balor diver / banshee+couatl slip).

## Implementation tiering + sequence

- SMALL: radici_ancora, nuclei_di_controllo, volo II/III, matrice Mode B.
- MEDIUM: volo I, artigli_psionici, matrice Mode A (`suppress_ability`), corteccia
  (`ally_aura_mark`), filtri (`cleanse_status`), membrane (`duration_absorb`), tessuti (channel).
- LARGE: eco_sismico (tile timed-status), pigmenti_aurorali (end-of-round adjacency sweep).

Build order: (1) SMALL first (validate markers); (2) `ally_aura_mark` shared by 4+8;
(3) Grade-I flight + artigli + tessuti (damage-event pipeline); (4) LARGE last. New
kinds (`suppress_ability`, `cleanse_status`) TDD against the AI baseline before merge.

## Tickets

TKT-COMBAT-TRAIT-{VOLO-GRADE1, VOLO-GRADE23, ARTIGLI-PSIONICI, MATRICE-ANTIMAGIA,
CORTECCIA-MEMETICA, ECO-SISMICO, FILTRI-BIOATTIVI, MEMBRANE-OSMOTICHE,
NUCLEI-DI-CONTROLLO, PIGMENTI-AURORALI, RADICI-ANCORA, TESSUTI-ADATTIVI} -- ~52h total.

## Your call

Ratify the design (mechanics + grades + the `inibito` suppressor model + build
order); edit anything. Then I implement the engine pieces (TDD, sequenced
SMALL->LARGE), wire each trait into active_effects + the per-trait DB (add_trait_stub),
and into the creature kits. Implementation = combat-engine work (apps/backend) =
its own sequenced PRs.
