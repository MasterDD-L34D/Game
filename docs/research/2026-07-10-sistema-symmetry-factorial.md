---
title: "Fattoriale 2x2 simmetria Sistema -- il ceiling WR 1.0 e' ROTTO (gate+AP, N=40)"
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-10'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Fattoriale 2x2 simmetria Sistema -- prima sconfitta del party sul driver faithful

Data: 2026-07-10 | Macchina: Ryzen (Node v24.11.0) | Arco: spec+piano #3249, flag #3254,
apLedger #3251, telegraph #3258, prerequisito fix stepTowards #3253.
Harness: `tools/sim/grid-band-probe.js` + `tools/sim/intent-mix-probe.js`, seed paired.
Criterio primario (spec sez. 5): distanza dalla banda WR standard di
`data/core/balance/damage_curves.yaml` [0.35, 0.55] (ADR-2026-04-20).

## 1. Prima misura (mattina): CONTAMINATA -- e il perche' e' un finding

Il primo fattoriale (arm `*-n10-{gate,ap,gateap}-on`, control = `*-n40-terrain-on`)
mostro' dKO fino a +0.194 su gateap, MA il dettaglio per-round rivelo' il regime
"castello immobile": col budget AP attivo, il passo di `stepTowards` clampato al box
6x6 legacy (bug, poi #3253) costava fino a 7 AP -> le unita' lontane skippavano
`NO_AP` a ripetizione (statue), e attaccavano solo quando il party arrivava adiacente.
L'assunzione "clamp uguale nei due arm" era FALSA: il control teleportava (avanzava),
l'arm AP restava fermo -- il pairing non isolava piu' il flag. Misura scartata,
sequenziamento invertito con verdetto owner: #3253 PRIMA delle misure.
Artifacts conservati (`reports/sim/*-n10-{gate,ap,gateap}-on/`) come evidenza
dell'interazione flag x bug.

## 2. Nuovo control post-fix (N=40, flag simmetria OFF = prod)

Il fix #3253 cambia il movimento Sistema su TUTTE le board grid_sized -> le bande
substrate-ON del mattino (`docs/research/2026-07-10-grid-terrain-geometry-reprobe.md`)
sono superate. Questo control e' la nuova referenza flag-OFF (e chiude il re-probe
post-fix richiesto da L-069):

| Encounter     | WR    | KO    | pace avg (sd) [min,max] | reinf | banda pace nuova |
| ------------- | ----- | ----- | ----------------------- | ----- | ---------------- |
| dorsale 16x12 | 1.000 | 0.000 | 18.82 (2.07) [15,24]    | 4.0   | [14, 25]         |
| canyon 20x12  | 1.000 | 0.006 | 17.45 (1.08) [16,20]    | 4.0   | [15, 21]         |
| abisso 18x10  | 1.000 | 0.013 | 16.05 (1.50) [14,20]    | 4.0   | [13, 21]         |

Nota: il pace dorsale sale 14.1 -> 18.8 col fix (le creature AVANZANO invece di
teleport-clampare: combattimento reale, piu' lungo). WR resta 1.000: il fix da solo
NON rompe il ceiling. Canyon time_limit 30 vs max 20 = margine sano; dorsale/abisso
time_limit 30/25 vs max 24/20 = watch (margine 6/5).

## 3. Fattoriale pulito (N=10 paired sul control stepfix)

| Arm         | dorsale dWR / dKO  | canyon dWR / dKO | abisso dWR / dKO | verdetto         |
| ----------- | ------------------ | ---------------- | ---------------- | ---------------- |
| gate-only   | 0.00 / 0.000       | 0.00 / 0.000     | 0.00 / +0.050    | non basta        |
| ap-only     | 0.00 / +0.025      | 0.00 / +0.075    | 0.00 / +0.100    | direzione debole |
| **gate+AP** | **-0.20 / +0.400** | 0.00 / +0.100    | 0.00 / +0.150    | **VINCE 3/3**    |

gateap/dorsale N=10: 2 SCONFITTE del party. Criterio direction (dWR <= -0.2 |
dKO >= +0.05): centrato esatto. La sinergia e' la storia: senza gate le azioni extra
si sprecano in ritirate; senza AP la non-ritirata non converte (1 azione = o avvicini
o colpisci). Insieme: avvicini E colpisci.

## 4. N=40 RATIFY su gate+AP (seeds 1..40 paired)

| Metric            | dorsale 16x12          | canyon 20x12        | abisso 18x10        |
| ----------------- | ---------------------- | ------------------- | ------------------- |
| **WR party**      | **0.925**              | 1.000               | **0.975**           |
| WR CI95 Wilson    | **[0.801, 0.974]**     | [0.912, 1.0]        | [0.871, 0.996]      |
| defeats           | **3**                  | 0                   | **1**               |
| creature_ko_rate  | **0.275** (ctrl 0.000) | 0.113 (ctrl 0.006)  | 0.175 (ctrl 0.013)  |
| pace avg (sd)     | 16.7 (2.6) [12,22]     | 16.1 (1.6) [14,19]  | 14.9 (2.3) [13,24]  |
| dPace paired CI95 | -2.10 [-3.05,-1.15]    | -1.38 [-1.91,-0.84] | -1.10 [-1.91,-0.29] |
| timeouts          | 0                      | 0                   | 0                   |
| reinf             | 4.0                    | 4.0                 | 4.0                 |

**Il CI95 della dorsale NON tocca 1.0**: prima volta che il driver `grid-band-probe`
in FAITHFUL ARM (party canonico, zero knob di difficolta') produce sconfitte del party
con significativita'. Scope del claim (fact-check): sconfitte erano gia' state misurate
con knob/fixture speciali (los-units-block crowd 07-06 WR 0.525; map-elites v2 con
boss_hp/cap) -- qui cadono SENZA toccare nulla dell'encounter. N=40 conferma N=10
(0.925 vs 0.80, stessa direzione): nessuno STOP.

## 5. Composizione (intent-mix, 9 fight gateap post-fix)

|                       | control storico | gateap post-fix                         |
| --------------------- | --------------- | --------------------------------------- |
| attivazioni (9 fight) | 237             | **448** (~2x: per-unit AP reale)        |
| attack                | 4.6%            | **16.7%**                               |
| approach              | 39.7%           | **82.6%** (avanzano davvero, fix #3253) |
| retreat               | 55.7%           | **0.7%**                                |

Conversione su, ritirate azzerate, movimento reale: nessun segnale di artefatto
(la WR scende CON la conversione che sale, come richiesto dal criterio secondario).

## 6. Lettura onesta del criterio banda

WR gateap = 0.925/1.000/0.975 contro banda target [0.35, 0.55]: la distanza si e'
MOSSA per la prima volta (dorsale: 0.45 -> 0.375) ma il gap resta grande. I flag
rompono il ceiling STRUTTURALE; arrivare IN banda e' lavoro di tuning (authoring,
pressure, tier) che ora ha finalmente una leva che risponde -- materia delle fasi
successive, NON di altri flag. Dichiarato per evitare over-claim.

## 7. Bande e baseline (questa PR)

- `docs/core/15-LEVEL_DESIGN.md`: bande pace aggiornate dal control stepfix (sez. 2 --
  semantica flag-OFF = prod corrente post-#3253).
- `data/core/balance/grid_ratify_baseline.json`: evidence_ref -> questo doc,
  ratified_at 2026-07-10 (grid invariati).
- Le bande arm-ON (gateap) si ratificano AL FLIP (ADR, Task 7): qui restano misurate
  ma non promosse.
- xpBudget `action_economy` (`dial_cap_reference: 3`): a flag ON quel 3 non descrive
  il throughput (per-unit AP). PROPOSTA (SDMG, decider Eduardo, si applica SOLO al
  flip): rimuovere lo scale (neutro 1) e ricalibrare `budget_base` sotto la nuova
  semantica quando esistono misure non-ceiling in banda.

## 8. Gate eseguiti

- Fattoriale + N=40: harness invariato, wiring proof per batch, checkpoint JSONL.
- Paired su seed identici; CI95 su delta e Wilson su WR.
- Review two-stage su ogni PR dell'arco (Codex usage-limit -> sostituto ratificato).
- Suite: tests/ai 608/608 al momento del batch (con tutti i flag unset).

## 9. Artifacts

- Control: `reports/sim/*-n40-stepfix/` | Fattoriale: `reports/sim/*-n10-{gate,ap,gateap}-stepfix/`
- Ratify: `reports/sim/*-n40-gateap-stepfix/` | Contaminati (evidenza): `*-n10-{gate,ap,gateap}-on/`
- Intent-mix: `Extras/ollama-runs/2026-07-10-gateap-stepfix-intent-mix.jsonl` (cdd)
- Log: `Extras/ollama-runs/2026-07-10-{sistema-symmetry-factorial,symmetry-remeasure-postfix}.log` (cdd)

## 10. Rollback

Doc + bande + baseline: revert del commit. I flag restano OFF in prod fino all'ADR
(Task 7): nessun cambio runtime da questa PR.

## Addendum 2026-07-10 sera -- re-probe flag-OFF post-merge: delta ZERO

Dopo il landing dell'intero arco su main (#3252/#3256/#3257/#3259/#3260 + #3250,
ADR #3262 merged), re-probe flag-OFF N=10 paired (seeds 1..10) vs i control
`reports/sim/*-n40-stepfix` sui 3 grid_sized: **bit-exact su tutti i 30 run**
(outcome/rounds/kos, incluso il KO di seed 4 abisso). I refactor apLedger e i fix
#3257/#3260 non muovono la semantica combat flag-OFF: bande `15-LEVEL_DESIGN`
[14,25]/[15,21]/[13,21] riprodotte bit-exact (nessuna regressione -- restano derivate
dal control N=40), niente N=40 nuovo (guardrail N-sample, delta nullo). Nota driver:
seed di grid-band-probe EFFETTIVI (riproduzione deterministica in un run indipendente
post-merge, stessa toolchain Node v24.11.0; il full-loop driver resta unseeded).
Output: `reports/sim/*-n10-postmerge-0710/` | log
`Extras/ollama-runs/2026-07-10-grid-band-reprobe-postmerge.log` (cdd).

## Addendum 2 -- 2026-07-10 sera: FLIP eseguito, bande flag-ON promosse

- **Pre-flip probe flag-ON** (main `d9fd2f0ca` post-#3264, env gate+AP+telegraph ON):
  N=10 paired (seeds 1..10) vs `reports/sim/*-n40-gateap-stepfix` = **bit-exact 30/30**
  (incluse le 2 sconfitte dorsale seed 5 e 10, kos 4/4). Doppia conferma: il contratto
  hidden-row (#3264) e' presentation-only, e le misure N=40 gateap descrivono ESATTAMENTE
  il comportamento prod flag-ON. Evidence: `reports/sim/*-n10-flagon-preflip-0710/` |
  log `Extras/ollama-runs/2026-07-10-flagon-preflip-probe.log` (cdd).
- **FLIP eseguito** (owner-authorized in-session, da Ryzen via SSH): checkout prod
  Lenovo `_gamewt-lenovo-host` `dc0de487` -> `d9fd2f0ca` (nessun delta lockfile o
  migrazioni sui 141 file); keys.env + `SISTEMA_RETREAT_GATE_ENABLED=true` +
  `SISTEMA_PER_UNIT_AP_ENABLED=true` + `SISTEMA_TELEGRAPH_THREATS_ONLY=true`;
  restart task (pid nuovo, `/api/health` ok, boot log pulito). Rollback: flag via
  da keys.env (+ eventuale `git checkout --detach dc0de487`) + restart.
- **Bande flag-ON promosse** in `docs/core/15-LEVEL_DESIGN.md` (quarta ratifica,
  min-1/max+1 su N=40 gateap): dorsale [11,23], canyon [13,20], abisso [12,25].
  Completion: sconfitte by-design (dorsale WR 0.925 CI95 [0.801,0.974]).
- **xpBudget `action_economy`**: decisione owner = DEFER (warn /start accettato;
  neutralizzazione in PR dedicato quando esistono misure in banda, come da sez. 7).
- **D2 widening 1.2x** (deciso nell'ADR): implementazione nel gate PENDENTE -- il
  threshold a `declareSistemaIntents.js` non applica il fattore che il legacy ha in
  `policy.js` (`LOW_HP_RETREAT_THRESHOLD * 1.2` sotto persistent-threat). Non blocca
  ne' flip ne' bande (nessun encounter di misura ha `persistent_high_threat`);
  follow-up TDD dedicato.
