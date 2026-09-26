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

> Follow-up del verdetto master-dd 2026-06-02 su H2 (`= option C hybrid`). Estende la spec
> `2026-06-01-phasec-economy-cost-gate.md`.
>
> **STATO FINALE: SG (#2554) + PP (#2555) + PT (#2557) cost-gate TUTTI SHIPPED.** La framing originale
> qui sotto ("PP/PT restano decorativi / earn-curve = leva balance non validabile -> verdetto master-dd")
> e' **SUPERSEDED** dalle 2 UPDATE qui sotto: le earn-curve PP/PT erano GIA canon in `26-ECONOMY` (non
> balance-pending) — vedi lezione currency-gate. Le sezioni storiche restano per provenance, ma leggi le
> UPDATE + il verdetto rescale come stato corrente.

> **UPDATE 2026-06-02 (master-dd ha accordato autonomia di scelta su evidenza): PP cost-gate SHIPPED.**
> Il SoT `26-ECONOMY` GIA fissa l'earn PP (+1 crit, +1 kill) e "Ultimate = 3 PP consume all" -> NON era
> un verdetto balance ma canon-compliance. Wired: `ppTracker` (POOL_MAX 3) + earn in `session.js`
> performAttack (crit/kill) + gate consume-all in `executeAbility` (tutti i cost_pp 4-12 > 3 ->
> consume-all, NO rescale) + `initial_pp` seed (mirror initial_sg). Band-neutral (AI non decide su pp;
> ability assenti dalle sim) -> AI 500/500.

> **UPDATE 2026-06-02 (autonomia su evidenza): PT cost-gate + pool SHIPPED (#2557).** Stesso
> currency-gate del PP: il SoT `26-ECONOMY §PT` GIA fissa pool 0..12 + reset per-round + earn
> `nat15-19 +1 / nat20 +2 / +5 MoS +1` -> NON era balance-pending ma canon-compliance (la framing
> "PT deferito / earn-curve = leva balance" qui sotto era SBAGLIATA: stessa lezione del PP). Il PT roll
> si calcolava gia ma alimentava SOLO il danno (`1+pt`); ora alimenta ANCHE un pool spendibile
> (super-meter: un colpo costruisce meter mentre infligge danno, danno INTOCCATO -> band-neutral).
> Wired: `ptTracker` (POOL_MAX 12, resetRound) + earn in `performAttack` + gate numerico in
> `executeAbility` (cost_pt 3..10 tutti <= 12 -> deduct esatto, NO rescale) + `initial_pt` seed +
> surface `pt` in `publicSessionView` (Gate-5) + reset per-round ai due round-boundary. AI 500/500,
> ptTracker 8 + ptCostGate 6 + ptEconomyWire 4. **Manovre** (perforazione/spinte/condizioni/combo)
> deferite (non ancora azioni discrete). **Rescale rank-2 -> vedi verdetto sotto.**

## Rescale rank-2 -> numerico — VERDETTO 2026-06-02 (autonomia su evidenza): KEEP consume-all

Domanda residua (handoff `2026-06-02-h2-economy-handoff.md` §2): le ability rank-2 con costo gonfiato
(cataclysm `cost_sg 75`; PP rank-2 blade_flurry 6 / resonance_amplifier 4 / kill_shot 6 / deathmark 4)
oggi sono **consume-all per cost-threshold**. Vanno rescalate a numerico (`cost <= pool`)?

**Verify-first (catalogo completo, currency-gate = leggi il SoT INTERO):**

- **PP** (pool max 3): TUTTI i cost_pp del catalogo sono 4..12 (blade_flurry 6, resonance 4, kill_shot 6,
  deathmark 4, phantom_step 5, arcane_renewal 5, hunter_mark 5, shadow_mark 5, dervish_whirlwind 10,
  convergence_wave 10, headshot 12, shadow_assassinate 10). **ZERO cost_pp <= 3.** Il SoT `26-ECONOMY §PP`
  dice **solo** "Ultimate = 3 PP consume all" — **non esiste un modello di spesa PP numerico in canon.**
  Rescalare i rank-2 PP a `<=3` **INVENTEREBBE** una spesa PP sub-ultimate non canonica.
  -> **Anti-canon. KEEP consume-all** (non e' una leva balance: e' canon-compliance).
- **SG** (pool max 3): modello GIA MISTO — `synaptic_burst 2` + `aberrant_overdrive 3` sono **numerici**
  (<= pool); `cataclysm 75` / `arcane_lance 40` / `apocalypse_ray 100` sono **consume-all** (ultimate-tier:
  surge_aoe AoE + stress_reset). I valori gonfiati leggono come sentinella "ultimate -> scarica il gauge"
  (intento autoriale, 26-ECONOMY "Ultimate = consume all"). Rescalare cataclysm a `<=3` lo trasformerebbe
  da **ultimate AoE** a **AoE ripetibile economico** = cambio di **identita'** dell'ability.
  -> **KEEP consume-all** (raccomandato). MA: a differenza del PP, SG **supporta** il numerico (precedente
  synaptic/aberrant) -> il rescale di cataclysm e' una **leva reversibile master-dd** (non anti-canon).

**Decisione (band-neutral, reversibile):** **NESSUN rescale.** PP resta consume-all (canon-mandato);
gli ultimate SG (cataclysm/arcane_lance/apocalypse_ray) restano consume-all (intento + modello-misto
gia coerente). L'opzione "rescale ultimate -> numerico" e' **preservata come leva master-dd** con i valori
pronti, NON scartata per sempre -> museum card `M-2026-06-02-002`
(`docs/museum/cards/economy-rescale-ultimates-numeric-discard.md`).

**Se master-dd vuole il numerico** (override reversibile, 1 valore-dato per ability, nessun codice):

| Ability (rank-2)    | Pool | Oggi (consume-all) | Numerico proposto |
| ------------------- | :--: | -----------------: | ----------------: |
| cataclysm           |  SG  |                 75 |          3 (≤cap) |
| blade_flurry        |  PP  |                  6 |    2 (anti-canon) |
| resonance_amplifier |  PP  |                  4 |    2 (anti-canon) |
| kill_shot           |  PP  |                  6 |    2 (anti-canon) |
| deathmark           |  PP  |                  4 |    2 (anti-canon) |

> Nota: i valori PP-numerici sono elencati per completezza ma **sconsigliati** (anti-canon). Solo
> cataclysm-numerico e' una leva legittima (SG mixed-model). Il gate-engine non cambia: abbassare il
> dato sotto `pool` flippa automaticamente quell'ability da consume-all a numerico.

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

## Residuo gated -- PP/PT (verdetto numerico master-dd) — SUPERSEDED (PP #2555 + PT #2557 shipped)

> ⚠️ **SUPERSEDED 2026-06-02**: questa sezione (PP/PT "non gatabili senza verdetto balance") era
> SBAGLIATA — le earn-curve erano canon. PP e PT sono ora SHIPPED (vedi UPDATE in cima). Conservata
> sotto per provenance / lezione currency-gate.

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
