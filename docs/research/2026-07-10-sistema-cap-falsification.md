---
title: "Falsificazione del cap-ipotesi: il ceiling WR 1.0 non e' il tetto di intent (e il Sistema non attacca mai)"
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-10'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Falsificazione del cap-ipotesi -- e il finding vero: il Sistema non attacca

Data: 2026-07-10 | Macchina: Ryzen (Node v24.11.0) | Base: origin/main `3bcf84df3`
Esperimento autorizzato da Eduardo in sessione. Stato: **NEGATIVE RESULT** sull'ipotesi
testata, **POSITIVE** su un finding non cercato. Zero flip, zero cambio di banda.

## 1. L'ipotesi (di Eduardo, formalizzata)

> "L'AI non gioca realmente: fa poche azioni rispetto ai player, e non ci sono azioni
> per unita'."

Formalizzata come ipotesi falsificabile: **il ceiling WR 1.000 di ogni ratify N=40 non e'
un artefatto del driver AI-vs-AI, ma il cap globale di intent del Sistema.**

L'ipotesi ha basi forti nel codice, non e' un sospetto:

- `declareSistemaIntents.js` `PRESSURE_TIER_INTENT_CAP` = 1/2/3/3/4 intent **globali** per
  round. I nostri ratify girano a pressure 50 (Escalated) -> **3 intent contro le 8 azioni
  del party** (4 PG x 2 AP).
- `INTENTS_ABS_CAP = 6`, commento sorgente: _"keeps Sistema below the party's 8
  actions/round (4 units x 2 AP) and bounds the telegraph UI load"_. Il vincolo e'
  deliberato e **circolare**: garantisce cio' che poi misuriamo.
- Il ledger AP per-unita' **esiste gia'** anche per il Sistema (`session.js:2948` valida
  contro `actor.ap_remaining`): il cap e' un coperchio sopra un'infrastruttura per-unita'.
- Correzione a un errore dei doc precedenti: `declareSistemaIntents` e' chiamato da
  `routes/session.js` e `routes/sessionRoundBridge.js` -- **e' il gioco reale**, non solo il
  driver di simulazione. Chiamare quel ceiling "limite di modello del driver AI-vs-AI"
  (doc dorsale 07-06, calibration 07-06, reprobe 07-10) e' impreciso: il cap vale anche
  quando gioca un umano.

## 2. Finding collaterale (recon, non nella spec-draft 07-06)

Il cap non sceglie **chi** agisce per merito: il loop `:361` scorre `session.units`
nell'ordine di inserimento, le prime unita' vive consumano il tetto, la coda riceve
`PRESSURE_CAP -> skip`. Misurato su sessione sintetica a regime (wave-1 + 4 rinforzi):

```
cap tier Escalated(50) -> intents emessi: 3 / sistema vivi: 7
  wave1_a  rule=REGOLA_001    intent=approach
  wave1_b  rule=REGOLA_001    intent=approach
  wave1_c  rule=REGOLA_001    intent=approach
  reinf_1  rule=PRESSURE_CAP  intent=skip
  reinf_2  rule=PRESSURE_CAP  intent=skip
  reinf_3  rule=PRESSURE_CAP  intent=skip
  reinf_4  rule=PRESSURE_CAP  intent=skip
```

**I rinforzi sono statue.** Spawnano, contano nella metrica `avg_reinforcements: 4.00
(a cap)` dei ratify N=40, e restano fermi finche' non muore qualcuno della wave-1. La
liveness misurata era quella dello **spawner**, mai quella dei rinforzi. La sez. 2.1 della
spec-draft zone-defense dichiara verificato quel file ma non riporta l'ordinamento.

## 3. L'esperimento (flag `SISTEMA_PER_UNIT_ACTIONS_ENABLED`, default OFF)

Flag ON = ogni unita' Sistema viva dichiara il suo intent; il cap globale non gata piu'
l'emissione. Flag OFF = byte-identical.

**Scope dichiarato**: ON emette **1 intent per unita'**, NON 2 azioni/unita' come il party.
E' meta' del divario -- la meta' misurabile senza toccare la risoluzione multi-azione.
Il flag e' uno strumento di probe, **non una proposta di bilanciamento**: il telegraph UI
load (la seconda ragione, legittima, del cap) non e' affrontato qui.

Arm A/B N=10 paired, seed numerici 1..10, contro il control = i N=40 substrate-ON del
reprobe (stessi seed, stesso harness `grid-band-probe.js`, flag prod terrain+geometry ON).

### Falsificazione del wiring (prima dei risultati)

Prerequisito metodologico: un "nessun effetto" da flag morto e' indistinguibile da un
"nessun effetto" reale. Divergenza per-seed vs control:
**dorsale 6/10, canyon 8/10, abisso 7/10**. Il flag morde.

### Risultati

| Encounter     | dWR       | dKO     | dPace (CI95)         | Criterio direction |
| ------------- | --------- | ------- | -------------------- | ------------------ |
| dorsale 16x12 | **0.000** | -0.0250 | +0.20 [-0.67, +1.07] | non soddisfatto    |
| canyon 20x12  | **0.000** | +0.0000 | -1.30 [-3.85, +1.25] | non soddisfatto    |
| abisso 18x10  | **0.000** | +0.0250 | -0.30 [-1.40, +0.80] | non soddisfatto    |

Criterio (mirror `2026-07-06-intents-roster-scaling-ab.md`): dWR <= -0.2 | dKO >= +0.05 |
pace fuori banda. **Nessun arm lo soddisfa.** WR 1.000 in tutti e 30 i run, 0 timeout.

**L'ipotesi e' FALSIFICATA.** Il cap non e' la causa del ceiling. Piu' che raddoppiare le
attivazioni (3 -> 7 a regime) lascia la win-rate del party a 1.000. Nessun N=40 (guardrail
N-sample: niente direction da ratificare), nessun flip, baseline intatta.

## 4. Il finding vero: la conversione e' ~0 (il Sistema non attacca)

Strumento nuovo: `tools/sim/intent-mix-probe.js` (patch del module-cache di
`declareSistemaIntents` prima del load di `app.js` -> conta le decisioni sul percorso
REALE, nessun mock). 3 encounter x 3 seed x 2 arm = 18 fight.

| Arm      | attack | approach | retreat | attivazioni | **attacchi** | vittorie party |
| -------- | ------ | -------- | ------- | ----------- | ------------ | -------------- |
| control  | 11     | 94       | 132     | 237         | **4.6%**     | 9/9            |
| uncapped | 6      | 117      | 137     | 260         | **2.3%**     | 9/9            |

Dorsale seed 1-2: **zero attacchi in 15 round**. Il Sistema spende ~55% delle attivazioni
in **ritirate** e il resto in avvicinamenti.

E il dato contro-intuitivo, che chiude il cerchio sui due negative result:
**raddoppiando le attivazioni gli attacchi DIMINUISCONO** (11 -> 6). Piu' unita' attive =
piu' unita' che avanzano scoperte = piu' danno subito = piu' ritirate.

Questo e' esattamente il "limite di CONVERSIONE" ipotizzato dalla spec-draft 07-06
(sez. 1, "le unita' extra si attivano, avanzano closest-target, muoiono in approccio"), ora
**misurato** invece che ipotizzato -- e conferma indipendente del negative result
roster-scaling #3231.

### Causa candidata (meccanica, verificata a grep -- NON ancora testata A/B)

Tre fatti che compongono un loop:

1. **Il Sistema fa 1 azione per unita' per round; il PG ne fa 2** (2 AP). Il PG puo'
   `muovi + attacca` nello stesso round; il Sistema fa `muovi` **oppure** `attacca`.
2. **Asimmetria di gittata**: Sistema `attack_range: 1` (harness + authoring); il party
   canonico ha 2 PG su 4 con `attack_range: 2` (`p_ranger`, `p_warden`). Chi ha gittata 2 e
   2 AP colpisce e arretra; chi ha gittata 1 e 1 azione non chiude mai la distanza.
3. **`SelfHealth` spinge la ritirata**: in `utilityBrain.js` la consideration vale
   `1 - hp_ratio` per `retreat` (peso 0.7). Il Sistema ferito preferisce ritirarsi ->
   non attacca -> viene inseguito e colpito -> si ritira ancora.

Il Sistema non e' "tarato male": arriva ferito e scappa, e non e' mai adiacente-e-sano nel
round in cui potrebbe colpire.

## 5. Vincolo di design da rispettare (trovato durante il recon)

`packs/evo_tactics_pack/data/balance/ai_profiles.yaml`:

```yaml
sistema_resource_model:
  economy: 'intent_budget' # non "pt_pool"
  ignores_trait_costs: true # intent non consuma PT/AP del PG model
  note: 'Asymmetry invariant -- do NOT refactor to mirror player rules' # em-dash nel sorgente
```

L'economia asimmetrica del Sistema (budget di intent, non AP) e' un **invariante di design
dichiarato**, con fonte (`reference_tactical_postmortems.md` sez. A.2): la fairness si risolve
per outcome misurato, non per simmetria di regole. Dare 2 AP per unita' al Sistema
**viola esplicitamente quella nota**.

Questo esperimento l'ha violato temporaneamente **dietro flag OFF** e solo in parte (piu'
intent, non AP), con l'unico scopo di falsificare. Risultato: la violazione non produce
nemmeno il beneficio sperato. **L'invariante non e' cio' che tiene basso il Sistema.**

## 6. Cosa NON e' stato fatto (e perche')

- **Nessun flip**: il flag resta OFF, in prod nulla cambia.
- **Nessun N=40**: il criterio direction non e' soddisfatto -> niente da ratificare.
- **Nessun 2-AP-per-unita'**: viola l'invariante sez. 5 -> decisione owner, non implementativa.
- **Nessun tocco a `SelfHealth`/retreat**: e' il candidato piu' promettente ma e' un
  cambio di bilanciamento sul brain, SDMG -> serve fork espliciti + falsificazione esterna.

## 7. Gate eseguiti

- `node --test tests/ai/sistemaPerUnitActions.test.js` **5/5** (nuovi; TDD: RED prima,
  3 fail su `isPerUnitActionsEnabled is not a function`).
- `node --test tests/ai/*.test.js` **589/589** (584 pre-esistenti + 5 nuovi), flag unset
  -> ramo OFF band-neutral provato dalla suite intera.
- `node --check tools/sim/intent-mix-probe.js` OK; il tool promosso riproduce
  byte-identico il conteggio dello scratch (dorsale seed 1: attack=0 approach=11
  retreat=15 capped=7).

## 8. Artifacts

- `reports/sim/{dorsale-ferrosa,canyon-lungo,abisso-colata}-n10-perunit-on/` (arm uncapped)
- Control paired: `reports/sim/*-n40-terrain-on/` (reprobe 07-10, invariati)
- `Extras/ollama-runs/2026-07-10-sistema-per-unit-actions-probe.log` (batch A/B)
- `Extras/ollama-runs/2026-07-10-intent-mix.jsonl` (18 fight, composizione intent)

## 9. Rollback

Revert del commit (flag + test + tool + doc = unita' atomica). Il flag e' default OFF e
non e' referenziato da nessun encounter, workflow o config: rimuoverlo non tocca prod.

## 10. Prossimo passo (owner-gated, NON deciso qui)

L'ipotesi "poche azioni" e' falsificata nella sua forma "poche **unita' attive**". Resta
aperta nella forma "poche **azioni per unita'**" (1 vs 2 AP), che pero' e' esattamente cio'
che l'invariante sez. 5 vieta. Tre strade, decider Eduardo:

- **(a) retreat-gating**: il candidato indicato dalla misura (55% ritirate, 4.6% attacchi).
  Non viola l'invariante (non tocca l'economia, tocca la policy). A/B su
  `SelfHealth`/retreat con lo stesso harness. Piu' economico e piu' mirato di `defend_zone`.
- **(b) `defend_zone`** (spec-draft 07-06, fork gia' ratificati A/B/C+D): un verbo nuovo.
  La misura di questo doc dice che il problema non e' il verbo mancante ma il verbo
  sbagliato (retreat) -- `defend_zone` potrebbe non essere scelto piu' di quanto lo sia
  `attack` oggi, per la stessa consideration.
- **(c) 2 AP per unita'**: richiede di ratificare la rottura dell'invariante sez. 5, con
  costo telegraph. Da NON fare senza ADR.

Raccomandazione: **(a) prima di (b)**. Costo simile, ma (a) testa la causa misurata, mentre
(b) costruisce un verbo che la stessa policy potrebbe scartare.
