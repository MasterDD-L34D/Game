---
title: 'Calibrazione D9 xpBudget geometry -- action-economy scale + hazard gating (evidence)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-06'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Calibrazione D9 xpBudget geometry -- action-economy scale + hazard gating

Data: 2026-07-06 | Macchina: Ryzen (Node v24.11.0) | Base: stacked su
feat/enc-grid-sized-abisso-18x10 (PR #3237 -- serve l'encounter hazard).
Spec a monte: `docs/superpowers/specs/2026-07-03-encounter-geometry-difficulty-gate-design.md`
(D9 "warn -> calibra -> block"). Stato: CALIBRAZIONE, valori PROPOSED (SDMG, decider Eduardo).
**Il flip di `XP_BUDGET_GEOMETRY_ENABLED` NON avviene qui** (owner-gated).

## 1. Problema (misurato, non ipotizzato)

Il modello stat-mass di `auditEncounter` OVER-predice sui grid_sized: dorsale
`budget 200 / used 590 / ratio 2.95 -> critical_over` mentre il fight misurato N=40 e'
WR 1.000 / KO 0. Causa: il modello somma massa (hp/mod/ap) e ignora l'action-economy --
il Sistema gioca `intents_per_round` azioni GLOBALI per round (dial
`PRESSURE_TIER_INTENT_CAP`: Escalated = 3) contro `party_size * 2 AP = 8` del party.
Il termine hazard vecchio (flag-ON) PEGGIORAVA: abisso 18 lava x 40 x 1.2 = +864
(ratio 7.27) contro un fight facile.

## 2. Le due modifiche (SOLO nel ramo flag-ON -- flag-OFF byte-identical)

1. **Shape 3 action-economy scale** (`actionEconomyScale`, config
   `geometry.action_economy` in `data/core/balance/xp_budget.yaml`):
   `used *= min(1, dial_cap_reference / (party_size * party_ap))`.
   PROPOSED: `dial_cap_reference: 3` (Escalated -- la pressure_start 50 dei ratify N=40),
   `party_ap: 2`. Party 4 -> scale 0.375. Senza config -> 1 (neutro). Clamp a 1
   (mai amplificare).
2. **Shape 1 hazard gating**: il termine hazard conta SOLO con
   `MOVE_TERRAIN_COST_ENABLED=true`. Misurato (abisso, primo grid_sized con hazard
   reali, N=40): a cost-substrate OFF il pathing EVITA la lava -> contributo reale 0;
   sommarlo predice difficolta' che meccanicamente non puo' esistere. `hazard_xp`
   (lava 40 / acqua 30) resta PROPOSED e si ratifica quando il substrate flippa.

## 3. Predicted-vs-measured (i 3 grid_sized, N=40 ciascuno)

| Encounter              | flag-OFF ratio (status) | flag-ON VECCHIO | flag-ON NUOVO      | Misurato N=40                       |
| ---------------------- | ----------------------- | --------------- | ------------------ | ----------------------------------- |
| dorsale 16x12          | 2.95 (critical_over)    | 3.91            | **1.11 (in_band)** | WR 1.0, pace 14.03 in banda [10,18] |
| canyon 20x12           | 2.95 (critical_over)    | 3.91            | **1.11 (in_band)** | WR 1.0, pace 12.85 in banda [10,17] |
| abisso 18x10 (18 lava) | 2.95 (critical_over)    | 7.27            | **1.11 (in_band)** | WR 1.0, pace 14.00 in banda [10,18] |

Il modello NUOVO flag-ON e' l'unico dei tre che concorda col fight misurato su tutti e 3.
(WR 1.0 e' ceiling di modello sul driver AI-vs-AI -- doc dorsale "Limite di modello" --
quindi "in_band" e' la predizione corretta per encounter completabili a pace in banda.)

## 4. Tabella completa 19 encounter (predicted, party 4)

Generata con `auditEncounter` su `docs/planning/encounters/*.yaml` (env toggle per arm):

| Encounter                          | cls      | budget | OFF ratio (status)   | haz XP | ON-vecchio ratio | ON-nuovo ratio (status) | act_ratio |
| ---------------------------------- | -------- | ------ | -------------------- | ------ | ---------------- | ----------------------- | --------- |
| abisso_colata_basaltica_01         | standard | 200    | 2.95 (critical_over) | 864    | 7.27             | 1.11 (in_band)          | 0.75      |
| badlands_canyon_lungo_01           | standard | 200    | 2.95 (critical_over) | 192    | 3.91             | 1.11 (in_band)          | 0.75      |
| badlands_dorsale_ferrosa_01        | standard | 200    | 2.95 (critical_over) | 192    | 3.91             | 1.11 (in_band)          | 0.75      |
| badlands_foodweb_pilot_01          | hardcore | 400    | 1.70 (critical_over) | 0      | 1.70             | 0.64 (under)            | 0.75      |
| badlands_foodweb_probe_01          | hardcore | 400    | 1.70 (critical_over) | 0      | 1.70             | 0.64 (under)            | 0.75      |
| badlands_ultima_caccia_01          | hardcore | 400    | 1.25 (over)          | 0      | 1.25             | 0.47 (under)            | 1.25      |
| capture_01                         | standard | 200    | 1.48 (over)          | 0      | 1.48             | 0.56 (under)            | 1.25      |
| caverna_02                         | standard | 200    | 1.85 (critical_over) | 0      | 1.85             | 0.70 (under)            | 1.25      |
| deserto_caldo_bocche_vulcaniche_01 | standard | 200    | 0.66 (under)         | 384    | 2.58             | 0.25 (under)            | 0.75      |
| escape_01                          | standard | 200    | 0.66 (under)         | 0      | 0.66             | 0.25 (under)            | 0.75      |
| escort_01                          | standard | 200    | 1.48 (over)          | 0      | 1.48             | 0.56 (under)            | 1.25      |
| frattura_03                        | hardcore | 400    | 2.56 (critical_over) | 0      | 2.56             | 0.96 (in_band)          | 2.5       |
| hardcore_reinf_01                  | hardcore | 400    | 1.48 (over)          | 0      | 1.48             | 0.55 (under)            | 0.75      |
| sabotage_01                        | standard | 200    | 1.03 (in_band)       | 0      | 1.03             | 0.39 (under)            | 0.75      |
| savana_01                          | standard | 200    | 1.25 (over)          | 0      | 1.25             | 0.47 (under)            | 1         |
| savana_skiv_solo_vs_pack           | hardcore | 400    | 1.03 (in_band)       | 0      | 1.03             | 0.39 (under)            | 0.75      |
| survival_01                        | hardcore | 400    | 0.74 (under)         | 0      | 0.74             | 0.28 (under)            | 1.25      |
| tutorial_01                        | tutorial | 80     | 1.10 (in_band)       | 0      | 1.10             | 0.41 (under)            | 0.5       |
| tutorial_02                        | tutorial | 80     | 2.20 (critical_over) | 0      | 2.20             | 0.83 (in_band)          | 1         |

**Warn parity flag-OFF**: colonna OFF = INVARIATA byte-identical (il ramo flag-OFF non e'
toccato; e' l'unico che gira oggi, il warn a /start non cambia di un byte).

## 5. Lettura onesta (residuo dichiarato, NON nascosto)

Lo scale 0.375 comprime TUTTO il parco: molti encounter piccoli passano a `under`
flag-ON (tutorial_01 0.41, sabotage 0.39, ...). Due letture possibili:

- **Coerente col misurato**: sul driver AI-vs-AI la WR e' 1.0 OVUNQUE (ceiling) -- "il
  party ha action-economy d'avanzo" e' esattamente cio' che la sim conferma; gli
  `in_band` vecchi non erano mai stati validati contro un fight misurato.
- **Trade-off di scala**: `budget_base` per classe fu tarato sul modello NON corretto;
  la correzione ri-ranka bene il top (i 3 misurati) ma sposta l'ancora di tutto il resto.

**Fork per Eduardo (pre-flip, SDMG)**: (a) accettare la lettura relativa (il gate D9
"block" scatterebbe solo su critical_over, che ora significa davvero fuori scala); (b)
ri-basare `budget_base` per classe sotto flag-ON (secondo giro di calibrazione, servono
piu' encounter misurati non-ceiling -- arriva col lever D5 zone-defense); (c)
`dial_cap_reference` per-tier (floor autorato -> cap) invece del riferimento fisso 3.
Il flip resta gated su questa scelta + verdetto owner.

**Verdetto owner (2026-07-06, ratificato in sessione via AskUserQuestion)**: fork **(a)
lettura relativa RATIFIED** -- flag-ON 'under' = action-economy d'avanzo (coerente col
misurato), il futuro 'block' scatta solo su critical_over; (b)/(c) restano opzioni v2
quando arrivera' evidence non-ceiling (lever zone-defense). Flip
`XP_BUDGET_GEOMETRY_ENABLED` = **staged-latent keys.env** (owner, host CODEMASTERDD:
inerte fino a restart; da Ryzen non si tocca prod 3334).

## 6. Gate eseguiti

- `tests/services/xpBudget.test.js` **21/21** (19 pre-esistenti + 2 nuovi; 1 test
  riscritto DICHIARATO: `flag OFF -> byte-identical` ora asserisce il nuovo contratto
  flag-ON = scale, hazard gated -- il vecchio asserava `used+48` pre-calibrazione).
- `node --test tests/ai/*.test.js` 584/584 · `validate-datasets` PASS ·
  governance strict errors=0 (numeri nel PR).

## 7. Artifacts

Tabelle generate da script inline (node, env-toggle per arm) su
`docs/planning/encounters/*.yaml`; nessun file tool nuovo (scope minimo). Evidence
misurate citate: `docs/research/2026-07-06-{dorsale-ferrosa,canyon-lungo,abisso-colata}-grid-ratify.md`.
