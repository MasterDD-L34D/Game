---
title: 'FP->VC delta (MAX_FP_VC_DELTA) -- N=40 paired evidence'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [evo-tactics, vc, form-pulse, ma3, n40, ratification, spec-m]
---

# FP->VC delta (MA3) -- N=40 paired evidence (2026-06-10)

Evidence pack per la taratura di `MAX_FP_VC_DELTA` (formPulseVc.js, SPEC-M).
Posture L-069: questo documento RIPORTA; la ratifica e' verdetto master-dd.
Il batch #2688 dichiarava esplicitamente di NON esercitare formPulseVc -- questo
probe chiude quel gap con un paired A/B offline sul transform REALE.

## Setup

- Batch: `tools/sim/full-loop-batch.js --runs 40 --isolate --policy greedy
  --branch cave_path --out reports/sim/fp-delta-n40-2026-06-10`. 40/40 run validi,
  meta-band sanity 7/7 in band (completion_rate 0.55 in 0.4-0.7) -> batch
  rappresentativo del calibrato corrente.
- Cattura: `combat-adapter` ora legge `mbti_axes` per-unit dal RAW snapshot
  `GET /:id/vc` (top-level `per_actor`; il `debrief_payload` pinned #276 li
  omette volutamente e NON e' stato toccato).
- Probe: `tools/sim/fp-delta-probe.js` -- paired by construction: stesso
  campione baseline, transform `applyFormPulseDelta` REALE (mapping
  RATIFIED-PROVISIONAL MA3 2026-06-10) applicato con profili FP sintetici
  branco-level x cap candidati {0.03, 0.05, 0.10}. Zero varianza tra arm.
- Campione: **2234 per-unit baseline mbti_axes** su 40 run. Artifacts:
  `reports/sim/fp-delta-n40-2026-06-10/{runs.jsonl,fp-delta-summary.json,fp-delta-report.md}`.

## Risultati chiave

Metriche: mean |shift| osservato vs atteso (cap x |profilo|), flip_rate
(cambio lato 0.5 = proxy flip lettera MBTI), clamp_rate (saturazione [0,1]).

| Lettura | Evidenza |
| --- | --- |
| Sanity transform | profilo neutro -> shift 0.0000, flip 0, ovunque |
| Nudge mai gate | flip_rate = **0.0%** su TUTTI gli assi/profili/cap, unica eccezione J_P full_minus = **4.6%** (29/629 campioni boundary), costante a 0.03/0.05/0.10 |
| Spinta negativa = effetto pieno | full_minus: shift == cap esatto (0.03/0.05/0.10), clamp 0% |
| Spinta positiva = quasi satura | full_plus: clamp 78-100% (baseline greedy gia' vicini a 1.0 nella convenzione HIGH=I/S/T/J) -> shift osservato 0.001-0.046 |
| Scaling lineare | half_plus = ~meta' dello shift full_plus a parita' di cap |

Numeri completi: `reports/sim/fp-delta-n40-2026-06-10/fp-delta-summary.json`.

## Caveat dichiarato

I baseline della sim greedy sono SATURI verso 1.0 (policy attack-heavy):
su dati player reali la distribuzione sara' piu' centrale -> flip_rate
effettivo piu' alto di quello osservato qui. Coerente col tier
RATIFIED-PROVISIONAL (#2693): re-validate on player data.

## Raccomandazione (non vincolante, L-069)

**Cap 0.05 (valore corrente) -> RATIFIED-PROVISIONAL.** Motivazione:
flip ~0% = anti-hard-gate rispettato; effetto percepibile dove c'e' spazio
(spinte negative e assi non saturi); 0.03 sotto soglia percettiva sul radar
UI; 0.10 raddoppia l'esposizione boundary su distribuzioni player centrali
senza beneficio identitario chiaro.

## Verdetto

- [x] master-dd: cap **0.05** -> tier **RATIFIED-PROVISIONAL** (2026-06-10,
  sessione interattiva; re-validate on player data, stesso tier di mapping
  MA3 e costanti #2693)

## Nota batch provenance

Batch eseguito su commit pre-#2698 (data-derived agile_robust bounds):
irrilevante per questa evidence -- `agile_robust` e' volutamente ESCLUSO dal
mapping MA3 (alimenta la Forma, non il VC); gli assi misurati (E_I/S_N/T_F/J_P)
non dipendono da quei bounds.
