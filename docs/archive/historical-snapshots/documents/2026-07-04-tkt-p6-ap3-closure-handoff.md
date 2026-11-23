---
title: Handoff TKT-P6-AP3 closure (reclassify-as-ultimate + outlier trim)
date: 2026-07-04
sprint: balance-tkt-p6-ap3
doc_status: active
workstream: dataset-pack
last_verified: 2026-07-04
source_of_truth: false
language: it
---

# Handoff TKT-P6-AP3 closure -- 2026-07-04

## TL;DR

- TKT-P6-AP3 (5 abilita' `cost_ap:3` > budget 2 AP, decision-gated, aperto dal 2026-05-22) CHIUSO end-to-end. 2 PR merged su `main`.
- **Verify-first ha ribaltato la premessa del ticket**: il braccio "unlock-mechanic" era GIA' shippato e LIVE (Overcharge verb). Scelta = reclassify-as-ultimate, NON rebalance-to-2.
- Il reclassify ha creato un residuo onesto (mantello outlier) -> confermato da balance-auditor via EV-parity statico -> trim minimale al cap.
- Tutto su git `main` = cross-machine (Lenovo lo vede al `git pull`). Questo doc = bridge del contesto-sessione verso Lenovo (la memory `.claude` e' per-PC, non sincronizzata).

## PR mergiati (2)

| PR                                                       | Scope                                                 | SHA         | Gate                                                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| [#3208](https://github.com/MasterDD-L34D/Game/pull/3208) | close reclassify-as-ultimate (doc-only, band-neutral) | `bb74c94ad` | validate-datasets OK, contracts-trait-mechanics 16/16, AI 570/570, combat-oracle CI pass, governance 0 |
| [#3209](https://github.com/MasterDD-L34D/Game/pull/3209) | trim outlier `mantello_meteoritico` buff 4->3         | `c19ba559b` | idem + combat-oracle CI pass (banda invariata)                                                         |

## Cosa e' cambiato

**#3208 -- reclassify (master-dd verdict).**

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`: header documenta l'ultimate-tier (cost_ap:3 legale, Overcharge-gated); `mantello_meteoritico` riclassificato defensive -> hybrid (tanka + nuka `meteor_strike` 1d8+2); distribuzione header defensive 9->8, hybrid 1->2; rimossi i 5 self-flag comment `balance-audit 2026-05-22`.
- `BACKLOG.md` (2 ref) + `docs/reports/2026-06-29-drift-audit.md`: TKT-P6-AP3 marcato CLOSED.
- Band-neutral by construction: trait "class" NON ha campo macchina (solo header/notes) -> zero consumo runtime, zero shift di banda.

**#3209 -- outlier trim (master-dd option A).**

- `meteoric_shield.buff_amount: 4 -> 3` (era unico max del file). Post-trim comb power/AP 3.17 (pareggia il top tier invece di superarlo). Nuke intatto.

## Perche' reclassify e non rebalance

- Overcharge verb GIA' costruito + LIVE: `apps/backend/services/combat/overchargeEngine.js` + route `POST /session/:id/overcharge` (gemello di `/defy`). Spendi 3 SG -> +1 AP questo turno -> `cost_ap:3` sta nel budget. Ratificato in SoT 90-FINAL-DESIGN-FREEZE 7.1 ("2 AP base, esteso a 3 con spesa 3 SG").
- `data/core/jobs.yaml` usa gia' `cost_ap:3` come capstone gated (es. `dervish_whirlwind` + cost_pp:10) -> pattern gia' canonico, non eccezione inventata.
- Rebalance-to-2 avrebbe orfanato il motore Overcharge live -> rigettato.

## Blockers residui

- Nessuno bloccante. Ticket chiuso, outlier trimmato, tutto su main.
- (Design-value, non gated) mantello resta post-trim comb/AP 3.17 = competitivo ma non piu' strettamente dominante. Eventuale ulteriore review = audit balance futuro, non urgente.

## Next entry point

1. **First action**: nessuna azione dovuta -- lane chiusa. Prossimo lavoro balance = a scelta owner (vedi BACKLOG residui non-correlati).
2. **Reference**: questo doc + commit-body #3208/#3209 + commenti provenance in `trait_mechanics.yaml` (mantello block ~561, meteoric_shield buff line).
3. **Estimated effort**: 0 (chiuso).

## Lessons (cross-machine, load-bearing)

1. **Reclassify che tiene i numeri del tier vecchio + aggiunge un campo nuovo = outlier silenzioso.** Ri-normalizza la magnitudine per il nuovo tier, non solo l'etichetta. Il close (a) era corretto ma generava il residuo (b) -- vanno guardati insieme.
2. **Exercise-limit / false-null**: la policy sim (`tools/sim/combat-policy.js:135`) fa SOLO basic-attack 1-AP, non invoca mai `cost_ap` 2-3. Nessun tool in `tools/sim/` esercita gli active pesanti -> un N=40 WR probe su una trait-ability = false-null (~0% usage a prescindere dalla potenza). Evidenza corretta = EV-parity statico (precedente PR #2381 ratify). Non spacciare un WR-sim non-discriminante come prova in-banda.
3. **Verify-first sul marker del ticket**: la premessa "cost_ap:3 = bug" era stale (Overcharge gia' shippato). Marker = ipotesi, git+codice = verita' (anti-pattern #19).

## Memory candidates

- [x] `project_tkt_p6_ap3_closure_2026_07_04.md` (Ryzen-local, gia' salvato) -- questo handoff e' la copia cross-machine su git.
