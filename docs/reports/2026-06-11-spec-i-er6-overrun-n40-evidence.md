---
title: 'SPEC-I ER6 overrun -- N=40 re-run post-fix #2730 (ratifica OVERRUN_BUDGET_BONUS)'
date: 2026-06-11
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-11'
source_of_truth: false
language: it
tags: [evo-tactics, spec-i, er6, overrun, n40, ratification, reinforcement]
---

# SPEC-I ER6 overrun -- N=40 re-run post-fix (2026-06-11)

Chiude il residuo #1 dell'handoff 2026-06-10: re-run N=40 dell'effetto
`overrun` (+`OVERRUN_BUDGET_BONUS`=1, consume-once) con lo spawner
funzionante (#2730 -- position format drift array vs {x,y}, #2724).
Nel pack 2026-06-10 il knob era rimasto PROPOSED perche' strutturalmente
no-op: lo spawner non spawnava mai con PG vivi.

**VERDETTO master-dd 2026-06-11: RATIFIED as-built** (semantica nicchia
documentata sotto). Posture L-069: il documento riporta, il flip e' verdetto
master-dd -- ratifica arrivata su domanda strutturata, con ri-conferma dopo
la correzione artefatto (sez. Outcome).

## Run inventory (5 dir, 3 classi di qualita')

| Dir (`reports/sim/`) | Classe | Note |
| --- | --- | --- |
| `spec-i-er6-stresswave-n40-2026-06-11` | diagnostica | replica esatta del setup 06-10 (NO `--modulation`): board auto-scala 6x6, entry tiles authored 10x10 off-grid -> spawner strutturalmente muto A PRESCINDERE dal fix. Riproduce e spiega il gap del pack 06-10. |
| `...-2026-06-11-mod10x10` | diagnostica (CONTAMINATA) | prima run 10x10 ma 3 armi nello STESSO processo -> il "-17pp win" osservato era artefatto da stato modulo-globale (lo stesso +0.20 fantasma documentato nel pack 06-10). NON usare per outcome-claims. |
| `...-2026-06-11-atollo` | diagnostica (CONTAMINATA) | come sopra, biome atollo_obsidiana. |
| `...-2026-06-11-mod10x10-iso` | **ratify-grade** | un processo node per arm + `--aggregate` (`isolated_arms: true`), abisso_vulcanico, seed 52000. |
| `...-2026-06-11-atollo-iso` | ratify-grade (gamba INFORMATIVA SOLO sul meccanismo) | idem, atollo_obsidiana, seed 53000. Floor outcome ROTTO (vedi Harness). |

Setup comune: `enc_hardcore_reinf_01`, scaling `{countAdd:6,hpAdd:4,modAdd:6,dcAdd:2}`,
`pressure_start` 30 (Alert, budget 1/tick), `--modulation duo_hardcore`
(deployed 8 -> board 10x10 = entry tiles authored validi), N=40 paired + replica
noise-floor. Harness: `tools/sim/spec-i-gates-probe.js --effect er6`.

## Finding 1 -- meccanismo (deterministico 40/40, indipendente dalla contaminazione)

Griglia tick spawner osservata: **t2, t5, t8, t11** (drip 1/finestra al tier
Alert, cap `max_total` 4 -> fill naturale a t11).

| Gamba | Overrun crossing | Spawn pattern OFF | Spawn pattern ON | Effetto |
| --- | --- | --- | --- | --- |
| abisso_vulcanico (0.36+0.06t, soglia 0.82) | t8 = ON-grid | (2,5,8,11) 40/40 | **(2,5,8,8)** 40/40 | +1 spawn sul tick t8, cap chiuso 3 turni prima |
| atollo_obsidiana (0.33+0.05t, soglia 0.78) | t9 = off-grid | (2,5,8,11) 40/40 | (2,5,8,11) 40/40 | bonus consumato sul tick t11 gia' cap-clamped = **zero effetto** |

**Semantica as-built**: il +1 budget e' consume-once sul primo tick spawner
post-crossing; se quel tick e' gia' clampato dal cap, il bonus e' lettera
morta. Con questa griglia e cap, morde solo se la soglia overrun scatta
<= t8. Soglie per-bioma al tier Alert: abisso t8 (unico on-grid osservato);
atollo t9, badlands/caldera/canyons ~t10, canopia ~t11 = dead letter.
E' una **meccanica di nicchia per biomi fast-escalation** -- fit narrativo
abisso ("assalti verticali ad alto rischio") -- NON una pressione universale.

## Finding 2 -- outcome (correzione artefatto, ISO ratify-grade)

| Gamba ISO | Win delta on-off | Noise floor (off2-off) | Lettura |
| --- | --- | --- | --- |
| abisso | -0.03 | -0.03 | **outcome-neutro**: il timing-shift non muove il win rate al punto di misura |
| atollo | +0.23 | **+0.33 (16/3 flips)** | floor rotto, gamba non informativa per outcome |

Correzione esplicita: il "-17pp win (0.78->0.60)" della prima run 10x10
era **artefatto same-process** (armi sequenziali nello stesso processo
condividono stato modulo-globale combat). Con processi isolati l'effetto
outcome scompare nel floor. La ratifica e' stata ri-confermata DOPO questa
correzione: knob = pressione meccanica reale e leggibile, balance-neutro.

## Finding 3 -- harness (nuovo, ticket)

La gamba atollo ISO mostra **floor +0.33 tra due armi byte-identiche in
processi separati** (off 0.57 vs off2 0.90, 16/3 flips; abisso floor -0.03
pulito). Il seed di sessione non pinna tutta la varianza: esiste entropia
process-level non-seedata che su alcuni biomi travolge il paired design.
-> `TKT-SIM-PROBE-ENTROPY` in BACKLOG (investigare rng non-seedato nel
path biome-specifico; finche' aperto, ogni N=40 di questa famiglia deve
riportare il floor della PROPRIA gamba e scartare gambe con floor anomalo).

## Decisioni e forward-work

- `OVERRUN_BUDGET_BONUS = 1` -> **RATIFIED** (comment flip in
  `stressWave.js`, stesso PR). RESCUE_HEAL_HP resta RATIFIED-PROVISIONAL
  (invariato, pack 06-10).
- Annotazione al pack 06-10: la sua gamba ER6-ON misurava di fatto il solo
  rescue-heal (board 6x6 = overrun invisibile). Non invalida il flip del
  flag (l'evidenza citata era rescue + eventi deterministici), ma il
  contributo overrun in partita reale parte da oggi.
- **Fork candidate (design, non bloccante)**: semantica carry-over (bonus
  persiste fino al primo tick spawnabile / spawn-tick immediato al
  crossing) renderebbe il knob significativo in tutti i biomi stresswave
  -> `TKT-ER6-CARRYOVER` in BACKLOG, richiede nuova N=40.
- Probe header aggiornato: protocollo evidence-grade = un processo per arm
  + `--aggregate` (era documentato solo nel pack 06-10).
