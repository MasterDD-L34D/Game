---
title: 'Electric channel enrichment (TKT-D4-ENRICH) -- N=40 probe evidence'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, electric, elettrico, tkt-d4-enrich, od-058, n40, scenario-probe, ratification]
---

# Electric channel enrichment (TKT-D4-ENRICH #2533) -- N=40 probe evidence

> Questo documento RIPORTA; la ratifica e' verdetto master-dd (posture L-069).
> Tutti i valori shipped sono **PROPOSED** fino a verdetto.

## Scope shipped

1. **`elettromagnete_biologico`** (SPEC-D4 sez.5 PROPOSTA A, offensivo anti-corazza):
   `extra_damage +1` su hit MoS>=5 + ability `magnetic_overload` (1d8+1, canale
   `elettrico`, 2 AP) + resist elettrico +10. Consolida lo stub electromanta
   2026-05-10 (PR #2164) che aveva trigger `ranged_attack` mai matchato (no-op).
2. **`seta_conduttiva_elettrica`** (PROPOSTA C, debuff/control): on_hit_status
   `disorient` (dc 13, durata 1 = cap canonico) + apply_status su MoS>=5 +
   ability `voltaic_web` (apply_status, 2 AP) + resist elettrico +10.
   Coordinamento D1: nessun effetto -AP.
3. **Retune `bioelettrico elettrico: 70 -> 80`** (SPEC-D4 sez.6): con le prime
   fonti di danno live il -30% over-shieldava il canale appena aperto; 80
   allinea alla famiglia (ionico 80, wind 90), resta il piu' resistente.
4. PROPOSTA B (chain/AoE) **esclusa**: richiede meccanica nuova in
   abilityExecutor (l'issue #2533 la gate-a esplicitamente).

Lore: entrambi i trait esistevano gia' nel catalogo `data/traits/offensivo/`
(famiglia Offensivo/Elettrico, usage_tag `breaker`, glossary v2.0 con
description IT/EN canoniche) -- attivazione, non invenzione (forms speak).

## Probe (gate anti-pattern #14)

Gli scenari tutorial/hardcore non schierano corazzato + attaccante elettrico
(stesso caveat di #2389: N=40 su quegli scenari = rumore). Probe dedicata:

- Harness: `tools/py/batch_calibrate_electric_probe.py` (pattern hc06/badlands;
  unit inline via `/api/session/start`, channel exploit `action.channel`).
- Roster: party 4 (2 carrier trait elettrici + tank + support) vs 4 difensori
  che coprono la matrice: 2x corazzato (elettrico 120), 1x bioelettrico
  (elettrico 80 post-retune), 1x adattivo (100).
- Arm paired (seed 7000-7039, stessa lista su entrambi):
  - `control`: niente trait elettrici, attacchi canale `fisico`
  - `live`: trait elettrici + attacchi canale `elettrico`
- Comando: `python tools/py/batch_calibrate_electric_probe.py --runs 40 --arm both --out reports/sim/electric-probe-n40`
- Output: `reports/sim/electric-probe-n40/{summary.json,runs.jsonl}` (committati,
  pattern reports/sim A13 #2702; rigenerabili dal comando sopra, elapsed ~30 s).

## Risultati N=40

| arm | n | WR | defeat | timeout | turns_avg | trigger elettromagnete | trigger seta | disorient applied |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control | 40 | 0.65 (CI95 0.50-0.80) | 0.0 | 0.35 | 23.98 | 0 | 0 | 0 |
| live | 40 | 0.85 (CI95 0.74-0.96) | 0.0 | 0.15 | 20.77 | 104 | 157 | 308 |

Paired per-seed (40 coppie): both_win 21, **live_only_win 13, ctrl_only_win 5**,
both_other 1. Sign test sui 18 discordanti: direzione consistente (13/18),
p ~0.10 two-sided -- magnitudo entro rumore di banda, direzione netta.

Danno medio per hit (post-resistenza, attacchi player):

| difensore | control (fisico) | live (elettrico) | EV deterministica ability 1d8+1 (fisico vs elettrico) |
| --- | --- | --- | --- |
| corazzato | 2.893 | 3.000 | 4.00 vs **6.13** |
| bioelettrico | 3.492 | 3.472 | 6.13 vs **4.00** |
| adattivo | 2.519 | 3.385 | 5.50 vs 5.50 |

EV deterministica = `applyResistance` puro su 1d8+1 (esiti 2..9, floor), matrice
post-retune. Il sim greedy usa attack normali (danno pt MoS-based 2-4), non
le ability -- vedi F3.

## Findings

- **F1 -- probe discriminante**: entrambi i trait esercitati (104 + 157 trigger,
  308 disorient applied su 40 run); il gate "N=40 su scenario che non esercita
  il canale = rumore" e' chiuso.
- **F2 -- direzione package**: WR +20pp / timeout -20pp / TTK -13% (turns 23.98
  -> 20.77). Composizione: control intra-round (disorient: attack -2 +
  action_speed -1 sul prossimo attore) + chip damage (+1 MoS-gated) + canale
  vs corazzato. Magnitudo non separata per leva in questa probe.
- **F3 -- granularita' floor** (nota di design, non bug): `applyResistance` fa
  `floor(damage * factor)`; sul chip damage pt-based (2-4) la vuln 120 paga
  poco (floor(3*1.2)=3) mentre il resist 80 si vede (floor(3*0.8)=2). Il
  premio anti-corazza del canale passa dalle **ability** (1d8+1: EV 6.13 vs
  4.00, +53%) e dagli hit alti, non dal chip. Surface player: ability
  `magnetic_overload` via jobs.yaml. Eventuale rebalance del floor = fuori
  scope, decisione DD separata.
- **F4 -- bioelettrico post-retune**: contro il difensore bioelettrico il canale
  elettrico resta in svantaggio (EV 4.00 vs 6.13 fisico = trade-off speculare
  del corazzato). Nel sim il +1 flat del trait compensa il malus sul chip
  (3.472 vs 3.492, ~flat): il check di canale resta, non over-shielda piu'.
- **F5 -- bug engine pre-esistente scoperto e fixato** (stessa PR): nel round
  model gli status applicati dai producer trait (`on_hit_status` GAP-1 +
  `apply_status` SPRINT_018) venivano cancellati da
  `syncStatusesFromRoundState` nel mini-resolve stesso (mai esistiti oltre
  l'azione). Fix: canale drain condiviso `session._pendingStatusApplies`
  (rename del canale morale esistente) + surface `on_hit_status`/
  `status_applies` nel result di `/round/execute`. Beneficia anche i trait
  shipped in precedenza (arco_voltaico, denti_silice_termici, intimidatore,
  ferocia, ...). TDD: `tests/api/onHitStatusRoundPersist.test.js` (4 test).
- **F6 -- duplicate-key trap**: `elettromagnete_biologico` esisteva gia' come
  stub orphan in coda ad active_effects.yaml; la chiave duplicata rompeva
  js-yaml load -> **intero registry trait {} no-op** (silenzioso, mirror
  checker regex non lo vede). Consolidato in un'unica entry. Raccomandazione:
  estendere `check_trait_mirror_consistency.py` con un check duplicate-key.

## Ratifica (master-dd)

- [x] Q1 -- trait A `elettromagnete_biologico` (extra +1 MoS5, ability 1d8+1
      elettrico, resist +10): **RATIFICATO** (RATIFIED-PROVISIONAL).
- [x] Q2 -- trait C `seta_conduttiva_elettrica` (disorient dc13 durata 1=cap,
      ability voltaic_web, resist +10): **RATIFICATO** (RATIFIED-PROVISIONAL;
      cap disorient=1 resta canonico).
- [x] Q3 -- retune `bioelettrico elettrico: 80`: **RATIFICATO**.
- [x] Q4 -- F3 floor-granularity: **IDENTITA' DEL CANALE** -- elettrico =
      burst/ability, non chip; differenziazione voluta tra canali, nessun
      ticket rebalance.

Verdetto: **master-dd 2026-06-10 (sessione interattiva)** -- tutti i valori
RATIFIED-PROVISIONAL (re-validate on player data, tier #2693).
