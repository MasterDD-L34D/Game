---
title: 'PHASEC slice 4b — aberrant ability roll semantics (Cat F residue)'
workstream: combat
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
language: it
tags: [phasec, jobs-expansion, combat, aberrant, mutation, phenotype, random-roll, cooldown, cat-f]
---

# PHASEC slice 4b — aberrant ability roll semantics (Cat F residue)

> **Sub-spec di OQ-F** (scoping spec
> [#2506](https://github.com/MasterDD-L34D/Game/pull/2506) §Slice 4 → _"implementare
> la random-roll delle ability — sub-spec separata, vedi OQ-F"_). Copre i **4 tag
> Cat F residui** dopo `#2524`/`#2525` (Cat F oggi 3/7).
>
> Diviso in **Parte A (DECISA — ship)** + **Parte B (OQ-F-impl — gated master-dd)**.
> Parte A è faithful-to-data e non tocca il signature-mechanic balance → si builda
> subito (PR A1a). Parte B randomizza un signature-mechanic + mappa outcome
> eterogenei + introduce un cap per-round (nerf) → verdict master-dd prima di buildare.

## 0. Stato di partenza (ground-truth `origin/main` `8f1e1348`)

PE-canon chiuso (`#2528`, verdict A): `unit.pe` = solo XP campaign; aberrant
`cost_sg` DECORATIVO un-gated. Cat F wired 3/7 (`sg_on_mutation_burst`,
`phenotype_baseline_heal`, `mutation_chain_on_kill`). Residui 4/7:

| Tag                      | Perk                      | Richiede                                      | Parte |
| ------------------------ | ------------------------- | --------------------------------------------- | ----- |
| `mutation_status_extend` | ab_r2_random_status_extra | mutation_burst applica uno status (MoS-gated) | **A** |
| `perfect_mutation_burst` | ab_r6_perfect_aberrant    | mutation_burst status + damage step bonus     | **A** |
| `double_phenotype_roll`  | ab_r5_extreme_phenotype   | phenotype_shift = tabella random 1d6          | **B** |
| `phenotype_double_use`   | ab_r6_chaos_incarnate     | sistema use-cap per-round su phenotype_shift  | **B** |

Ground-truth verificato (worktree off `8f1e1348`):

- `executeDrainAttack` (mutation_burst) = `performAttack` standard. **NON** applica
  `damage_step_min/max`, **NON** applica status MoS-gated. `mutation_chain_on_kill`
  refund già wired (`abilityExecutor.js:996`).
- `executeBuff` (phenotype_shift) = buff FISSO singolo `buff_stat: attack_mod +3`.
  **NON** rolla la tabella 1d6 descritta nei dati. Non gestisce `buff_stat_2`.
- Status `rage`/`panic`/`stunned`/`bleeding`/`fracture` esistono tutti e decadono
  nel loop generico `Object.entries(statusObj)` di
  `sessionRoundBridge.applyEndOfRoundSideEffects`.
- Pattern status MoS-gated GIA' presente: `executeRangedAttack` regex
  `^mos\s*>=\s*(\d+)` + `target.status[sid] = Math.max(existing, dur)`.
- Pattern damage post-hoc GIA' presente: `executeMultiAttack`/`Ranged`/`Execution`
  aggiustano `res.damageDealt` via `damage_step_mod` (add/sub a target.hp +
  `session.damage_taken`).
- **Nessun sistema cooldown/use-per-round** esiste: le ability sono gated solo da
  `cost_ap`.

---

## PARTE A — mutation_burst combat semantics (DECISA, ship A1a)

**Razionale gate**: faithful-to-data (la description di `mutation_burst` dichiara
esplicitamente _"MoS >= 5 applica un random status: rage/panic/stunned/bleeding/fracture
(1 turno)"_). La lista status è esplicita, la soglia è esplicita, la durata è
esplicita → **zero ambiguità di mapping**. Cambia il comportamento base di
`mutation_burst` ma in modo canonico, e i band-scenari HC non castano
`mutation_burst` → band-neutral (verificato by-construction + band-verify).

### A.1 — Base: MoS-gated random status su mutation_burst

In `executeDrainAttack`, dopo `performAttack` + `applySgEarn`, gated su
`ability.ability_id === 'mutation_burst' && res.result.hit`:

- `STATUSES = ['rage', 'panic', 'stunned', 'bleeding', 'fracture']`
- Se `res.result.mos >= 5` → applica **1** status random (`rng`) per `turns` turni
  (default 1), via `target.status[sid] = Math.max(existing, turns)`.
- **NON** job-gated: è semantica dell'ability (chi casta mutation_burst la ottiene),
  non una risorsa-exploit (≠ base-PE-earn che fu job-gated in `#2526`).
- `rng` = la closure RNG già iniettata in `createAbilityExecutor(deps.rng)`
  (deterministica nei test).

### A.2 — Perk mods via `computeMutationBurstPerkMods(actor)` (progressionApply.js)

Nuovo helper gemello di `applyMutationChainRefund`, legge `actor._perk_passives`:

```
{ extraTurns, forceAllStatuses, bonusDamage, applied[] }
```

- `mutation_status_extend` (payload `{turns:1}`) → `extraTurns += payload.turns`.
- `perfect_mutation_burst` (payload `{fixed_dmg:6, all_statuses:true, turns:1}`) →
  `forceAllStatuses = true`, `bonusDamage += payload.fixed_dmg`.

`executeDrainAttack` consuma i mods (lazy-require non-blocking, pattern sgTracker):

- `turns = 1 + extraTurns`
- `toApply = forceAllStatuses ? [tutti i 5] : (mos>=5 ? [random] : [])`
- applica ogni status a `turns` turni.
- `bonusDamage` (perfect) → drena post-hoc come `damage_step_mod>0`
  (`extra = min(bonusDamage, target.hp)`, sottrai a hp + `session.damage_taken` +
  `applySgEarn` + somma a `adjustedDamage` per l'evento).
- Evento `drain_attack`: aggiungi `applied_statuses[]` + `bonus_damage`.

### A.3 — Interpretazione documentata (reversibile)

- **`perfect_mutation_burst` "damage_step diventa 6 garantito (no random)"** → mappato
  a `bonusDamage +6` flat post-hoc (pattern `execution_attack`). La base
  `mutation_burst` NON ha damage random (vedi sotto), quindi "no random" è un no-op
  e il `+6` è additivo. _Più faithful sarebbe sostituire il damage step base con 6
  fisso, ma `resolveAttack` non espone lo "step" → l'additivo è la via clean +
  established._
- **Base `mutation_burst` random-1d6-DAMAGE (description `damage_step_min/max 1/6`)
  = DEFERRED**: nessun tag Cat F lo richiede (`mutation_status_extend` vuole lo
  status, `perfect` dà `+6` flat). Gap di faithfulness documentato; follow-up
  separato se master-dd lo vuole (tocca il damage step base → band-impact reale).
- **`all_statuses` (perfect) ignora la soglia MoS** (è un capstone: applica tutti
  e 5 su hit). Interpretazione: capstone = unconditional-on-hit.

### A.4 — Test (TDD) + band-verify

- `computeMutationBurstPerkMods` unit (extend/perfect/none/stack).
- `executeDrainAttack` integration via `createAbilityExecutor` con `performAttack`
  stub (`result.mos` controllato) + `rng` deterministica: MoS<5 = nessuno status;
  MoS>=5 = 1 status; +perfect = 5 status + bonus damage; +extend = +1 turno.
- Regressione: AI 495/495, progression+abilityExecutor suites, combat.
- Band-verify HC06 `[15-25%]` + HC07 `[30-50%]` seed 4242 (atteso band-neutral —
  zero mutation_burst nei band-scenari).

---

## PARTE B — phenotype roll table + use-cap (OQ-F-impl, GATED master-dd)

**Razionale gate**: 3 forche di design non risolvibili faithful-senza-ambiguità.

### OQ-F-impl-1 — mapping della tabella 1d6 di phenotype_shift

`phenotype_shift` description = tabella `1d6`: `1=attack+3, 2=defense+3,
3=mobility+2, 4=ap+1, 5=heal 4, 6=initiative+5`. Lo schema strutturato encoda solo
l'outcome 1 (`buff_stat: attack_mod +3`). 3 dei 6 outcome NON hanno un canale di
applicazione pulito come attack/defense:

| Roll | Outcome       | Applicazione pulita?                                                                               |
| ---- | ------------- | -------------------------------------------------------------------------------------------------- |
| 1    | attack +3     | ✅ `applySelfBuff('attack_mod', 3, 2)`                                                             |
| 2    | defense +3    | ✅ `applySelfBuff('defense_mod', 3, 2)`                                                            |
| 3    | mobility +2   | ⚠️ `mobility_bonus` consumato in 4 file (movement) — semantica buff incerta                        |
| 4    | ap +1         | ⚠️ nessun `*_buff`; +1 `ap_remaining` immediato = action-economy swing                             |
| 5    | heal 4        | ✅ heal `min(4, missing)`                                                                          |
| 6    | initiative +5 | ⚠️ initiative consumata a round-order (`session.js:2387`) — effetto next-round, awkward mid-combat |

**Opzioni:**

- **A (faithful nearest-mechanic)** — mappa tutti i 6 con interpretazione
  documentata: mobility→`mobility_bonus` buff, ap→`+1 ap_remaining` immediato,
  initiative→`initiative` buff per `dur`. Massima fedeltà, ma 3 outcome hanno
  semantica "best-effort" non testata in-combat.
- **B (subset clean)** — la tabella rolla solo tra outcome con canale pulito
  (attack/defense/heal), gli altri 3 → re-map al più vicino o a un default. Meno
  fedele, zero comportamento incerto.
- **C (defer)** — non randomizzare phenotype_shift; `double_phenotype_roll` resta
  gated finché non si decide il mapping.

> _Proposta Claude_: **A** con i 3 outcome incerti chiaramente documentati come
> "best-effort", più band-verify. Ma è una scelta di design (vedi OQ-F-impl-2) →
> verdict master-dd.

### OQ-F-impl-2 — randomizzare il signature-mechanic (balance lever)

Oggi `phenotype_shift` = `+3 attack` DETERMINISTICO. Il `signature_mechanic`
("Mutation Cascade: rolla 1d6") + la description vogliono RANDOM. Renderlo random
cambia EV+varianza del self-buff base aberrant (non perk-gated → ogni cast).

- **Pro random**: implementa il canone (chaos = identità aberrant).
- **Contro**: cambia il balance base del job; il `+3 attack` fisso attuale è uno
  stopgap ma è ciò che gira in produzione. Verdict: randomizzare (faithful) o
  tenere fisso e far operare i perk su altro?

> _Proposta Claude_: randomizzare (faithful al signature). Band-verify a conferma
> (aberrant assente dai band-scenari → band-neutral pratico). **Ma è una modifica
> di signature-mechanic → no-anticipated-judgment, gated.**

### OQ-F-impl-3 — `phenotype_double_use` richiede un base cap per-round (nerf)

`phenotype_double_use` (`cap_per_round: 2`) ha senso SOLO se esiste un cap base
`= 1/round`. Oggi le ability sono gated solo da AP (con `ap≥2` puoi già castare
phenotype_shift `cost_ap:1` 2-3×/round). Introdurre un cap base `1/round` =
**NERF** all'attuale gating AP-only (anche se phenotype_shift 3× è degenere). Il
task chiede esplicitamente "un sistema per-round-use/cooldown".

- **Opzione A**: cap base 1/round su phenotype_shift; capstone → 2/round (faithful
  all'esistenza del capstone, ma nerf base + nuovo sistema use-counter).
- **Opzione B**: nessun cap base; `phenotype_double_use` = no-op/informational
  (unfaithful al capstone).

> _Proposta Claude_: **A** — il capstone esiste perché il base è cappato; il nerf è
> minimo. Sistema use-counter generico (`actor._use_count[abilityId][round]`),
> riusabile per futuri cooldown. **Ma nerf base = gated.**

### OQ-F-impl-4 (minore) — `double_phenotype_roll` con due roll uguali

Due roll della tabella che danno lo stesso outcome (es. 1+1) → stack additivo
(`+6 attack`) o distinct-only? _Proposta_: stack additivo (semplice, faithful a
"applicabili entrambi"). Edge minore, deciso in impl se A1b procede.

### Build A1b (post-verdict)

phenotype_shift random table (per OQ-1/2) + use-cap system (per OQ-3) →
`double_phenotype_roll` + `phenotype_double_use`. TDD + band-verify HC06/HC07.

---

## Sequenza

1. **PR A1a** (Parte A) — ship subito: mutation_burst status + 2 tag
   (`mutation_status_extend`, `perfect_mutation_burst`). Cat F 3/7 → **5/7**.
2. **OQ-F-impl verdict master-dd** (Parte B, 4 forche) → **PR A1b**: phenotype table
   - use-cap + 2 tag (`double_phenotype_roll`, `phenotype_double_use`). Cat F →
     **7/7** (aberrante completo).

A1a non dipende da A1b. A1b è gated.
