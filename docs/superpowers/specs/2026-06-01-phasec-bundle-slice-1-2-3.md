---
title: 'PHASEC bundle — slice 1+2+3: micro-passives + def-eval + aberrant SG-fold'
workstream: combat
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
parent_spec: docs/superpowers/specs/2026-05-31-phasec-prereq-subsystems-scoping.md
language: it
tags:
  [phasec, combat, passives, defense-eval, sg-economy, tdd, spec, no-impl]
---

# PHASEC bundle — slice 1+2+3

> Implementa i 3 slice no-fork del parent scoping (#2506) in 1 cluster. Sblocca 3
> tag (`defense_after_silent`, `aura_defense_2tile`, `first_kill_sg_bonus`) + crea
> il seam difensivo riusato dai fork futuri. Zero unit-type nuovo, zero fork.
> Ground-truth su `origin/main`. **OQ-PE risolta = SG-fold** (master-dd
> 2026-06-01): la risorsa-speciale aberrant e' SG, non un PE-pool distinto.

## Scope split (per rischio)

| Slice                            | Tocca                       | Gate | Ship       |
| -------------------------------- | --------------------------- | ---- | ---------- |
| 1 silent_step last-ability       | solo codice                 | --   | si subito  |
| 3 def-eval + aura_defense_2tile   | solo codice                 | --   | si subito  |
| 2 aberrant SG-fold               | dati (yaml + tag rename)    | --   | si (OQ-PE risolta) |

Slice 1+3 = puro codice. Slice 2 = unico che tocca `data/`. Raccomando 1+3 in 1
PR (puro codice), slice 2 in PR separato (tocca dati) per rollback granulare.

## Slice 1 — silent_step last-ability tracking

- **Tag sbloccato**: `defense_after_silent` (stalker r2 camo_protocol): +2 def nel
  turno dopo aver usato `silent_step`.
- **Seam**: `abilityExecutor` emette gia evento con `ability_id`. Aggiungere
  `actor._last_ability_id` settato post-`appendEvent`; decay end-of-round in
  `sessionRoundBridge.js` (vicino a `last_action_type` ~1632/1687, oggi coarse).
- **Consumo**: nel def-eval di slice 3 (case `defense_after_silent` legge
  `actor._last_ability_id === 'silent_step'`).
- **Test TDD**:
  1. usa silent_step -> `_last_ability_id === 'silent_step'` set
  2. turno dopo -> +2 def applicato a damage-taken
  3. 2 turni dopo (decay) -> bonus assente
  4. altra ability tra mezzo -> bonus non si applica
- **Blast radius**: basso (1 campo + 1 set + 1 decay tick).

## Slice 3 — computePerkDefenseBonus + aura_defense_2tile

- **Tag sbloccato**: `aura_defense_2tile` (symbiont): alleati Manhattan <=2 -> +1 def.
- **Gap verificato**: `progressionApply.js` ha solo `computePerkDamageBonus` (@131,
  offensivo). `computePerkDefenseBonus` ASSENTE (grep=0 su origin).
- **Seam**: nuova funzione gemella `computePerkDefenseBonus(actor, ctx)` + hook nel
  defender-side di resolveAttack (dove si calcola dc/DR difensore). `default: break`
  per tag ignoti (stesso pattern dei 3 dispatch esistenti @131/232/283).
- **Ammortizza**: il seam serve anche slice 1 (`defense_after_silent`) e slice 5
  futuro (`bonded_proximity_defense`). Investimento condiviso.
- **Test TDD**:
  1. 0 alleati <=2 -> +0 def
  2. 1 alleato a Manhattan 2 -> +1 def
  3. alleato a Manhattan 3 -> +0 (fuori range)
  4. 2 alleati <=2 -> +2 (o cap, da decidere in impl)
  5. tag ignoto -> no-op (default break)
- **Blast radius**: medio (tocca defender-side core damage path, ma additivo).

## Slice 2 — aberrant SG-fold (OQ-PE risolta = SG)

- **Tag sbloccato**: `first_kill_sg_bonus` (ex `first_kill_pe_bonus`): +N SG al primo
  kill dell'encounter.
- **Razionale fold** (ground-truth): nel tree aberrant, `aberrant_overdrive` gate su
  `cost_pe:5` ma i fratelli `stabilized_mutation`/`perfect_mutation` su `cost_sg`.
  `normaliseUnit` materializza `sg` (@111) NON `pe`. `cost_pe` = 3 occorrenze totali,
  tutte overdrive = naming-accident, non sistema. Fold su SG: zero nuovo pool, zero
  6a risorsa, collisione meta-PE evitata (PE resta esclusivo meta-evolution).
- **Data change**:
  - `jobs_expansion.yaml`: `aberrant_overdrive` `cost_pe:5` -> `cost_sg:5` (allinea
    ai fratelli gia su sg). Aggiornare anche `description_it` "Trigger PE >= 5" ->
    "Trigger SG >= 5" + upgrade row `cost_pe da 5 a 3` -> `cost_sg`.
  - rename tag `first_kill_pe_bonus` -> `first_kill_sg_bonus`,
    `minion_kill_pe_bonus` -> `minion_kill_sg_bonus` (+ description_it).
- **Code**: earn = nuovo case in `applyPerkKillEffects` (@232, gia hook kill) che
  chiama `applySgEarn`. Spend/gate = `cost_sg` gia risolto se overdrive lo usa.
- **Test TDD**:
  1. primo kill -> +N sg (one-shot, flag encounter-scoped)
  2. secondo kill stesso encounter -> no doppio earn
  3. overdrive con sg<5 -> gated (non eseguibile)
  4. overdrive con sg>=5 -> spende 5 sg
- **Blast radius**: basso-medio (data + 1 kill-case + cost-resolution gia esiste).
- **Migration obbligatoria**: grep cross-repo `first_kill_pe_bonus` /
  `minion_kill_pe_bonus` (perk defs + i18n + test) PRIMA del rename -> no orfani
  (anti-pattern #10 drop-on-non-CI-guarded).

## Sequencing interno

1. slice 1 (cheapest, riscalda last-ability)
2. slice 3 (crea def-eval, consuma slice 1)
3. slice 2 (data fold + earn)

## Rollback (03A)

Revert per-slice commit. Slice 2 reversibile anche lato dati (`cost_sg`->`cost_pe` +
tag rename inverso). Nessun impatto runtime se non shippato. Doc-only fino al primo
PR di impl.

## Cosa questo bundle NON fa

- NON tocca i fork 5/6 (symbiont/minion).
- NON implementa la random-roll aberrant (OQ-F, sub-spec separata).
- NON costruisce un PE-pool (OQ-PE risolta verso SG-fold).
- NON localizza ancora `sgTracker.js` (citato dal parent ma non trovato in
  `services/` root; da confermare in impl, `applySgEarn` @abilityExecutor:135 si).
