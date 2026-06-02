---
title: 'Economy cost-gate follow-up — PP/PT pool model (H2 residuo)'
date: 2026-06-02
workstream: combat
category: spec
doc_status: review_needed
doc_owner: master-dd
language: it
tags: [economy, cost-gate, pp-pool, pt-pool, phasec, pending-design, balance]
---

# Economy cost-gate follow-up — PP/PT pool model

> Follow-up del verdetto master-dd 2026-06-02 su H2 (`= option C hybrid`). Lo **SG
> cost-gate e' SHIPPED** (vedi sotto); **PP/PT restano decorativi** perche' gatearli
> richiede prima di costruire un pool-model + earn-curve = leve di **balance** che,
> essendo band-neutral (nessuna sim usa queste ability), **non sono validabili via
> band-verify** -> verdetto numerico master-dd. Estende la spec `2026-06-01-phasec-economy-cost-gate.md`.

> **UPDATE 2026-06-02 (master-dd ha accordato autonomia di scelta su evidenza): PP cost-gate SHIPPED.**
> Il SoT `26-ECONOMY` GIA fissa l'earn PP (+1 crit, +1 kill) e "Ultimate = 3 PP consume all" -> NON era
> un verdetto balance ma canon-compliance. Wired: `ppTracker` (POOL_MAX 3) + earn in `session.js`
> performAttack (crit/kill) + gate consume-all in `executeAbility` (tutti i cost_pp 4-12 > 3 ->
> consume-all, NO rescale) + `initial_pp` seed (mirror initial_sg). Band-neutral (AI non decide su pp;
> ability assenti dalle sim) -> AI 500/500. **Solo PT resta deferito** (pool spendibile NON wired +
> costi gia coerenti <=12 + ruolo canonico = manovre, non ancora costruite). NOTA: i cost_pp rank-2
> (blade_flurry 6 / resonance 4 / kill_shot 6 / deathmark 4) sono consume-all per cost-threshold; set
> `cost_pp <= 3` per-ability se master-dd li vuole numerici (reversibile, come cataclysm).

## Stato (questo PR) -- SG cost-gate SHIPPED

Implementato in `abilityExecutor.executeAbility` (option C, master-dd 2026-06-02):

- `cost_sg <= POOL_MAX (3)` -> **gate numerico**: richiede `actor.sg >= cost_sg`, deduce `cost_sg` sul 2xx.
- `cost_sg > POOL_MAX` -> **consume-all**: richiede pool PIENO (3), drena a 0 sul 2xx. Il valore gonfiato
  (cataclysm 75 / arcane_lance 40 / apocalypse_ray 100 / stabilized_mutation 5 / perfect_mutation 80)
  legge come "ultimate -> scarica il gauge" (26-ECONOMY "Ultimate = consume all"). **NESSUN rescale dati.**
- Deduct SOLO sul 2xx (nessun addebito su 400/501), come il modello `cost_ap`/`cost_pe` (#2522).
- SG e' l'unico pool MODELLATO: `normaliseUnit` lo seeda (`sessionHelpers.js:114`), `sgTracker` lo guadagna
  (+1/5 dmg taken, +1/8 dmg dealt, cap 3) + `initial_sg` lo seeda nei test/save-load (`session.js:1936`).
- **Band-neutral**: nessuna party sim/scenario porta una ability `cost_sg` -> HC06/HC07 byte-identici.
  Regressione: progression+abilityExecutor+jobs 224/224, AI 500/500. Test: `tests/progression/abilityCostGate.test.js`.
- ⚠️ **NB cataclysm** e' `rank: 2` per label ma `cost_sg: 75` (ultimate-tier) -> trattato consume-all dal
  cost-threshold. Se master-dd lo vuole numerico, set `cost_sg <= 3` nel dato.

## Residuo gated -- PP/PT (verdetto numerico master-dd)

### Perche' NON e' stato gatato ora

- **PP**: NON e' un pool seeded. `normaliseUnit` non scrive `pp` (compare solo come `u.pp || 0` in alcune
  serializzazioni). Tutti i `cost_pp` (4..12) eccedono il cap 3. Gatearlo richiede: (1) seed `pp` in
  `normaliseUnit` (mirror `sg`), (2) **earn/reset curve** (es. +1 crit / +1 kill, cap 3, reset per-encounter).
- **PT**: NON e' un pool spendibile. PT e' un **roll per-round** (`sessionHelpers.js:248-252`: die 15-19 +1,
  20 +2, +floor(MoS/5)) consumato come tactical-points, non un gauge accumulato. Tutti i `cost_pt` (3..10)
  sono <= cap 12 (gia coerenti!) ma non c'e' un pool persistito da spendere. Gatearlo richiede un modello
  PT-spendibile (per-round, cap 12) + come PT roll alimenta lo spend.

Entrambe le **earn-curve** sono leve di balance che determinano la frequenza degli ultimate -- e
**band-neutral** (le ability non sono in nessuna sim) quindi **non validabili** via HC06/HC07. Shippare
una curva indovinata = leva di balance non verificata -> per policy no-anticipated-judgment = verdetto master-dd.

### Proposta (Claude-proposed, pending master-dd review)

| Pool | Modello proposto                                                                  | Earn proposto                                 | Gate (option C)                          |
| ---- | --------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| PP   | seed `pp` in normaliseUnit (default 0, cap 3), per-encounter (no reset per-round) | +1 su crit, +1 su kill (cap 3)                | tutti i cost_pp > 3 -> consume-all       |
| PT   | pool spendibile per-round (cap 12), alimentato dal PT roll esistente              | += PT roll a inizio turno, reset a fine turno | cost_pt <= 12 -> numerico (gia coerenti) |

Note: i `cost_pp` (4..12) sotto consume-all NON richiedono rescale (come SG). I `cost_pt` (3..10) sono
gia <= cap 12 -> gate numerico esatto, nessun rescale. Resta da decidere SE PT vada gatato (oggi e' un
roll tattico, non un gauge "speso").

### Verdetto richiesto

1. **PP**: approvo seed+earn (+1 crit/+1 kill cap 3)? altra curva? oppure PP resta decorativo?
2. **PT**: PT diventa un pool spendibile (earn da roll) o resta roll-tattico decorativo?

Post-verdetto: impl = mirror dello SG-gate (gate + deduct 2xx) + seed/earn nel pool model + test +
band-neutral proof (grep). Reversibile.

## Riferimenti

- Verdetto: chat master-dd 2026-06-02 ("H2 = C"). Spec base: `2026-06-01-phasec-economy-cost-gate.md` (#2530-A2).
- Report design-closure: `docs/reports/2026-06-02-design-closure.md` §H2.
- Impl SG: `apps/backend/services/abilityExecutor.js` (executeAbility gate + 2xx deduct).
