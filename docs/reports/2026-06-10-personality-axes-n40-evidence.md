---
title: 'Personality axes (Opt 3 OUTPUT) -- N=40 ratification evidence'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, vc, personality-axes, n40, ratification, '2679']
---

# Personality axes (Opt 3 OUTPUT) -- N=40 evidence (2026-06-10)

Evidence pack per la ratifica delle costanti PROPOSED di #2679 (Opt 3 OUTPUT,
merged Game #2687 + GGv2 #460) + i flag J_P / E_I. Posture L-069: questo
documento RIPORTA; la ratifica e' verdetto master-dd.

## Setup

- Harness: `tools/sim/full-loop-batch.js --runs 40 --isolate --policy greedy
  --branch cave_path` (commit `0200aef6`), cattura personality additiva
  (combat-adapter -> `GET /api/session/:id/vc` -> `debrief_payload.per_actor
  [uid].personality_axes`).
- Esito batch: 39/40 run validi (seed 1020 escluso: crash nativo 0xC0000409
  noto, 3 retry, loggato non contato). Meta-band sanity: 7/7 metriche in band
  (completion_rate 0.615 in 0.4-0.7) -> il batch e' rappresentativo del
  calibrato corrente.
- Campioni personality: **2153 per-unit** (712 player / 1441 sistema), 1 riga
  per (run, missione, unita') da `runs.jsonl`. Artifacts:
  `reports/sim/personality-n40-2026-06-10/{runs.jsonl,summary.json,report.md}`.

## Distribuzioni (sezione generata dal batch)

| axis | n | mean | sd | min | max | neutral_rate |
| --- | --- | --- | --- | --- | --- | --- |
| symbiosis_predation | 2153 | 0.991 | 0.041 | 0.688 | 1.000 | 0.000 |
| explore_caution | 2153 | 0.627 | 0.206 | 0.500 | 1.000 | 0.718 |
| solitary_swarm | 2153 | 0.574 | 0.205 | 0.250 | 1.000 | 0.769 |
| memory_instinct | 2153 | 0.505 | 0.048 | 0.438 | 0.875 | 0.886 |
| agile_robust | 2153 | 0.500 | 0.000 | 0.500 | 0.500 | 1.000 |

Dominant-axis histogram: symbiosis_predation 1959 (91%), solitary_swarm 194.
Degenerate (tutti-5 neutri): 0. Collinearita' |r|>=0.8: sym~memory r=-0.90.

## Finding (per il verdetto)

### F1 -- symbiosis_predation SATURO (mean 0.991, min 0.688)

Sotto policy AI combat-only, T_F sta inchiodato al polo T -> OGNI unita' legge
"Predatore quasi pieno" e domina il radar nel 91% dei casi. Causa: formula
T_F = clamp01(1 - 0.5*utility_actions + 0.5*support_bias) con support ~0 e
utility bassa nel sim. NB la policy greedy non fa azioni support -> il dato
NON dice che i player veri saturerebbero uguale; dice che l'asse e' guidato
quasi solo da support-actions, assenti qui.

### F2 -- agile_robust MORTO backend-side (sd 0.000)

Nessuna varianza: la route `session.js` chiama
`vcSnapshotToDebriefPayload(vcSnapshot)` senza `unitStatsById` -> speed/hp_max
mai threadati -> fallback neutro by design. I bounds backend PROPOSED
(speed 1-6 / hp 6-20) sono quindi NON VALUTABILI da questo batch: serve
threading stats route-level (gap pre-esistente, ora misurato). Lato Godot le
stats sono threadate (GGv2 #460) -- la valutazione CT-scale va fatta la'.

### F3 -- collinearita' strutturale sym~memory r=-0.90

REFUTA (sotto questa policy) la premessa research 2026-04-27 "ogni asse ha
sistema d'origine distinto -> no collinearita'": `vcScoring.js` definisce
`utility_actions = setup_ratio` (proxy), quindi setup_ratio entra in T_F
(segno -) E in memory_instinct (segno +) -> anti-correlazione meccanica.
Structural, non comportamentale: due dei 5 assi condividono un input upstream.

### F4 -- memory_instinct quasi-piatto (sd 0.048, neutral 89%)

action_switch_rate/setup_ratio omogenei sotto greedy. Spread residuo
0.438-0.875 -> l'asse discrimina poco con UNA policy; varianza attesa solo
con stili di gioco diversi (player veri / policy multiple).

### F5 -- direzione poli OK dove valutabile

solitary_swarm: player mean 0.61 (close-engage -> E -> Sciame > 0.5) coerente
con il contratto +pole post-fix e_i (GGv2 ccf6b94). explore_caution spread
sano (sd 0.206) quando le metriche coprono. neutral_rate alti (72%/77%) =
coverage parziale E_I/S_N su unita' a vita breve, non bug.

## Implicazioni per la ratifica (menu, NON verdetti)

1. **Blend 0.6/0.4 + 0.5/0.5**: non falsificati ma poco esercitati (F4);
   ratificabili come default SOLO con etichetta "ri-validare su dati player".
2. **Bounds backend 1-6/6-20**: non valutabili (F2). Opzioni: (a) thread
   `unitStatsById` nella route /vc + /end e rifare il probe; (b) lasciare
   l'asse neutro backend-side finche' non serve (il surface canonico e' Godot).
3. **T_F/sym saturazione (F1)**: opzioni: (a) accettare (i player veri fanno
   support); (b) rebalance pesi utility/support; (c) sostituire la sorgente
   con un segnale meno proxy (es. enemy_target_ratio iter2). Decisione di
   design, non di codice.
4. **Collinearita' (F3)**: opzioni: (a) accettare e documentare; (b)
   spezzare il proxy `utility_actions = setup_ratio` (engine change, ripple
   su T_F/J_P -- richiede il suo N=40); (c) cambiare la sorgente di
   memory_instinct. Tocca la premessa Opt 3, quindi va deciso PRIMA di
   promuovere l'output a canonico.
5. **Flag J_P / E_I input (formPulseVc)**: questo batch non li esercita
   (input phone assente nel sim). Restano aperti; l'evidenza qui sopra non li
   sblocca.

## Limiti

- Una sola policy di combat (greedy condivisa) -> varianza comportamentale
  compressa; N=2153 unita' ma ~1 stile di gioco. Direction-probe forte,
  population-claim debole (L-072/L-073).
- Solo backend stack; la superficie giocatore (Godot, VcScoringMbti euristico
  + CT bounds) ha pipeline input diversa -> probe Godot separato se serve.

## Verdetto master-dd (2026-06-10, Q1-Q4 + Q2-bis)

- **Q1 (F1 saturazione + F3 collinearita')**: DEFER su dati vari -- nessun
  cambio formula da dati single-policy (dottrina vault vc-calibration-iter1
  "no config change senza N>=50 sessioni varie"). Rivalutare al primo playtest
  player reale. F1/F3 = finding ACCETTATI e documentati, non bug aperti.
- **Q2 + Q2-bis (F2 agile backend)**: threading `unitStatsById` nelle route
  /end + /:id/vc IMPLEMENTATO (+ passthrough `speed` in normaliseUnit, che lo
  strippava -- stesso pattern del fix morale_mod). Bounds restano hardcoded
  RATIFIED-PROVISIONAL: il dataset stat-per-specie NON esiste (species.yaml
  della research = fantasma; species_catalog.json senza stats numeriche) ->
  ticket dedicato come prerequisito dei bounds data-derived.
- **Q3 (costanti)**: PROPOSED -> **RATIFIED-PROVISIONAL** come default
  operativi con condizione "re-validate su dati player" (commenti aggiornati
  in personalityAxes.js / personality_axes.gd / debrief_view.gd).
- **Q4 (flag input)**: E_I sign FIXATO in formPulseVc (engine letter
  convention: +Sciame ora abbassa E_I verso Extraversion; prima nudgava verso
  Solitario). J_P ratificato AS-DESIGNED (input nudge != output derivation,
  misure diverse che coesistono) -- flag chiuso senza code change.

## Riproduzione

```
GIT_COMMIT=<sha> node tools/sim/full-loop-batch.js --runs 40 --isolate \
  --policy greedy --branch cave_path --out reports/sim/personality-n40-<date>
```

## Addendum 2026-06-10 -- F2 RISOLTO (#2691: dataset base-stats + bounds data-derived)

> Follow-up claude-autonomous del verdetto Q2-bis. Riporta evidenza; il flip dei
> bounds RATIFIED-PROVISIONAL -> data-derived e' il deliverable richiesto
> dall'issue #2691 (master-dd-authorized). (claude autonomous -- pending
> master-dd review della derivazione prose-based.)

F2 diceva: `agile_robust` morto backend-side (sd 0.000) perche' le unita' non
portavano `speed` (il threading route era il primo gap, fixato in #2693). Il
secondo gap era l'assenza di un dataset stat-per-specie: i bounds di
normalizzazione erano hardcoded RATIFIED-PROVISIONAL e nessuna unita' del sim
aveva un valore `speed`. Entrambi ora chiusi.

### Cosa e' stato costruito (#2691)

1. **Dataset canonico** `data/core/species/base_stats.yaml` -- `speed` + `hp_max`
   per le 15 specie canoniche (ADR-2026-05-15: 10 `pack-v2-full-plus` + 5
   `game-canonical-stub`). Le specie canoniche NON hanno stat numeriche: l'unico
   segnale design e' la prosa del catalog (`functional_signature` +
   `visual_description`). Ogni valore e' derivato da quella prosa via rubrica
   documentata (`_meta` nel file), con l'evidenza citata in `speed_basis` /
   `hp_basis` per specie -- NON fiat. `speed` e' uno stat NUOVO (l'engine combat
   legge `initiative`, mai `speed`): introdurlo e' band-neutral.
2. **Loader** `apps/backend/services/speciesBaseStats.js` -- `deriveStatBounds()`
   calcola min/max reale del dataset (cache); `personalityAxes.deriveFromVcActor`
   ora usa questi bounds come default, con fallback ai vecchi hardcoded
   (speed 1-6 / hp 6-20) se il dataset manca/e' malformato (mai throw).
3. **Wiring sim** -- `ecologyCombatAdapter.deriveCombatStats` emette `speed` dalla
   morfotipo (`speedForMorphotype`, stessa scala 1-6 della rubrica del dataset):
   i recruit del sim (specie con `morphotype` reale) portano speed variato
   (1/2/5) end-to-end fino a `unitStatsById`. Starter `DEFAULT_ROSTER` con `speed`
   esplicito.

### Bounds: RATIFIED-PROVISIONAL -> DATA-DERIVED

| bound | prima (hardcoded) | ora (da base_stats.yaml) |
| --- | --- | --- |
| speed | {1, 6} | {1, 6} (invariato: rubrica gia' 1-6) |
| hp | {6, 20} | **{5, 22}** (proteus_plasma T0 frail 5 .. leviatano/terracetus colossus 22) |

### Re-probe N=40 (commit di questo PR, `--out personality-n40-2026-06-10-databounds`)

39 run validi (1 escluso: stesso crash nativo 0xC0000409 noto), meta-band 7/7 in
band (completion_rate 0.513 in 0.4-0.7) -> rappresentativo. `agile_robust`:

| metrica | F2 (originale) | re-probe (data-derived) |
| --- | --- | --- |
| n | 2153 | 2059 |
| mean | 0.500 | 0.479 |
| **sd** | **0.000** | **0.075** |
| min / max | 0.500 / 0.500 | 0.140 / 0.735 |
| neutral_rate | 1.000 | 0.669 |
| faction player | 0.50 (morto) | **0.44 (vivo)** |
| faction sistema | 0.50 | 0.50 (neutro) |

L'asse e' VIVO: varianza reale (sd 0.075, spread 0.140-0.735), degenerate-rate
0.000, faction player non piu' neutra. Gli altri 4 assi invariati entro il
rumore (nessuna regressione). La faction **sistema resta neutra by design**: i
nemici da `scenario-enemies.js` (tier-table) non hanno `morphotype` autorato ->
nessuno `speed` -> asse 0.5 (onesto: la fisicita' dei nemici non e' autorata,
non e' un bug). Il segnale `agile_robust` vive sulla faction player+recruit.

### Limiti residui (invariati)

- Una sola policy (greedy) -> varianza comportamentale degli ALTRI assi ancora
  compressa (F1/F4 restano finding accettati). `agile_robust` invece dipende da
  stat fisiche (speed/hp), non dal comportamento -> e' gia' discriminante con una
  policy sola.
- I valori `speed`/`hp_max` delle 15 specie sono prose-derived (rubrica
  documentata), non da una fonte numerica design (che non esiste). Master-dd
  ratifica la derivazione; il dataset e' una leva reversibile (two-way door).
