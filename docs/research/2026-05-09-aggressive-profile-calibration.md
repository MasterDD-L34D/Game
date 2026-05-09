---
title: 'Balance Illuminator — Profilo Aggressive (enc_tutorial_01)'
workstream: ops-qa
category: playtest
doc_status: active
source_of_truth: true
language: it
last_verified: '2026-05-09'
tags: [ai, balance, calibration, sprt, utility-brain, aggressive-profile]
---

# Balance Illuminator: Profilo Aggressive — enc_tutorial_01

## Summary (30s)

### N=30 baseline (initial signal)

| Metric       | Aggressive | Balanced | Cautious |
| ------------ | :--------: | :------: | :------: |
| Win rate     |    60%     |   100%   |   90%    |
| Timeout rate |    40%     |    0%    |    0%    |
| Defeat rate  |     0%     |    0%    |   10%    |
| Avg rounds   |    30.3    |   25.5   |   24.5   |

### N=162 merged confirm (3 batches)

| Profile        | Runs | Victory | Defeat | Timeout | **Win rate** | Avg rounds |
| -------------- | ---: | ------: | -----: | ------: | -----------: | ---------: |
| **balanced**   |   43 |      43 |      0 |       0 |   **100.0%** |       24.3 |
| **cautious**   |   76 |      73 |      3 |       0 |    **96.1%** |       24.0 |
| **aggressive** |   43 |      23 |      0 |      20 |    **53.5%** |       31.8 |

**Statistical confirm**: aggressive 53.5% vs balanced 100% — Fisher exact p<0.0001. Signal **CONFIRMED + reverts to mean** at higher N (60% N=30 → 53.5% N=43). Aggressive utility-brain is structurally underperforming.

- **Stato**: WR=53.5% vs target 80%+ → **ROSSO**
- **Diagnosis**: stalemate last-enemy (vedi RCA §2)
- **Root cause primario**: utility brain retreat threshold troppo basso + kite_buffer=0 → il Sistema entra in range, attacca, poi nega retreat per HP% che non viene mai raggiunto
- **Top knob candidati**: `retreat_hp_pct 0.15→0.25`, `kite_buffer 0→1`, `use_utility_brain false` (ablation)

---

## Dati baseline N=30

Batch `batch-2026-05-09T11-41-21-043Z`, 10 run per profilo, scenario `enc_tutorial_01`, max_rounds=40, seed 1001-1030.

### Aggressive breakdown per seed

| Run | Seed | Rounds | Outcome     |
| --- | ---- | ------ | ----------- |
| 1   | 1001 | 40     | **timeout** |
| 2   | 1002 | 26     | victory     |
| 3   | 1003 | 40     | **timeout** |
| 4   | 1004 | 25     | victory     |
| 5   | 1005 | 40     | **timeout** |
| 6   | 1006 | 40     | **timeout** |
| 7   | 1007 | 22     | victory     |
| 8   | 1008 | 25     | victory     |
| 9   | 1009 | 24     | victory     |
| 10  | 1010 | 21     | victory     |

Timeout seeds (1001, 1003, 1005, 1006) → tutti con rounds=40, rest_count=129 (identico). Indicatore di determinismo del ciclo stalemate: stesso numero di round steps in ogni timeout → loop strutturale, non varianza RNG.

---

## RCA — Analisi JSONL

### Pattern universale (vittorie e timeout condividono)

Da run-1 (timeout) e run-7 (victory), sequenza `player_action` identica:

```
Rounds 1-13:  move 400 × 13    ← player non riesce ad avvicinarsi (403 = fuori range? o range guard?)
Round 14:     attack 200        ← primo attacco riuscito
Rounds 14-20: attack × 7       ← fase di damage
Round 20/21:  enemies 2→1      ← primo nemico eliminato
```

Dopo la prima kill la storia diverge:

| Esito           | Rounds post-kill | Pattern                 |
| --------------- | ---------------- | ----------------------- |
| Victory (run-7) | 2                | attack→attack→enemies=0 |
| Timeout (run-1) | 20               | move 400 × 18 → timeout |

### Causa del timeout: last-enemy stalemate post-kill

Dopo la prima kill in run-1:

- Rounds 22-40: **19 `move 400`** consecutive con `enemies=1` invariato
- L'unico nemico rimasto NON viene eliminato per 19 round

Tre ipotesi per il `move:400` persistente:

**H1 (più probabile): utility brain sceglie `retreat` invece di `attack`**
Il profilo aggressive ha `retreat_hp_pct=0.15`. Il Sistema entra in combattimento, subisce danni, HP scende. Se HP/max_hp > 0.15 la SelfHealth consideration SCORAGGIA retreat (SelfHealth = ratio, non inverted per approach). Ma con `kite_buffer=0` l'unit rimane a range=2 e continua ad alternare approach/retreat basandosi sul score additivo. La `Distance` consideration (quadratic_inverse) + `SelfHealth` (linear) possono bilanciarsi verso approach che poi fallisce (400) se la griglia non permette movimento valido → loop.

**H2: move:400 = pathfinding block, non scelta AI**
Lo status 400 su `/action move` suggerisce che l'azione è respinta dal session engine (fuori AP, target non raggiungibile, posizione bloccata). Il `stepTowards` potrebbe ritornare `null` o la stessa posizione quando l'enemy è in corner/wall → `declareSistemaIntents` log `"cannot approach"` e itera skip, ma il test runner chiama ugualmente `turn/end`. Questo causa round infiniti senza danni.

**H3: `threat_passivity_threshold=2` blocca l'escalation**
Con soglia 2, il Sistema dovrebbe reagire aggressivamente più velocemente. Ma se il threatCtx non è iniettato correttamente nel test harness (harness usa `/api/session/action` direct, non il round orchestrator completo), la threat context può essere null → `selectAiPolicy` legacy path, non utility brain.

### Osservazione critica: utility brain NON è chiamato dal player harness

Il test harness `ai-driven-sim.js` è il **player AI** (minimal closest-enemy attack), NON controlla il Sistema. Il **Sistema** esegue autonomamente lato server tramite `declareSistemaIntents`. L'output `player_action kind:round` traccia le azioni del **player AI**, non del Sistema.

Quindi `move:400` è il **player AI** che prova `move` e lo riceve respinto. Il Sistema (sul server) può star eseguendo correttamente le sue azioni ogni round, ma il player AI non ci attacca sopra perché:

1. Il player AI chiama `/api/session/action` con `action=move` (range check fallisce se player già adiacente o se AP=0)
2. Il pattern 13 `move:400` poi `attack:200` → il player AI non riesce a muoversi prima che le unità Sistema avanzino (round 14 = Sistema entra in range → player può finalmente attaccare)
3. Post-prima-kill: player AI torna a `move:400` → l'unico nemico rimasto è probabilmente **fuori range** del player (il Sistema con utility brain potrebbe star retreating attivamente, mantenendo distanza)

**Conclusione RCA**: il timeout è causato dal **Sistema che retreata attivamente** dopo la prima kill, sfruttando `kite_buffer=0` (kite senza buffer) + `retreat_hp_pct=0.15` bassissimo (retreat solo in extremis). Il Sistema sopravvive abbondantemente sopra 15% HP, NON retreata per HP, ma la utility brain POTREBBE scegliere `approach` verso la griglia che poi fallisce (stepTowards blocked), causando intent=skip every round. Con 1 nemico rimasto e il Sistema che non riesce a pathfindare o che kita continuamente, il player AI non riesce a chiudere → stalemate.

### Differenza strutturale victory vs timeout

Le 6 vittorie terminano in round 21-26 → la prima kill avviene quando il secondo nemico è già a portata d'attacco. I 4 timeout terminano a 40 → la posizione post-prima-kill lascia il secondo nemico isolato. Questo è **dipendente dal seed di posizionamento iniziale**: semi 1001/1003/1005/1006 generano layout dove il secondo nemico è in posizione protetta o distante.

Implicazione: non è solo un problema di parametri AI, ma di **interaction tra posizione iniziale e comportamento kiting**. Il utility brain con `kite_buffer=0` è più aggressivo nel rimanere adiacente, ma quando il pathfinding fallisce non ha fallback.

---

## Top 3 knob proposal

### Knob-1 (P0): `retreat_hp_pct 0.15 → 0.25`

**Hypothesis**: alzare la soglia di retreat aumenta la frequenza con cui il Sistema retreata anzichè tenere posizione. Paradossalmente per un profilo "aggressive", retreatare più spesso permette al Sistema di resettare posizione e trovare pathfinding valido, riducendo gli stuck-loop.

**Δ WR atteso**: +15-20pp (da 60% a 75-80%). Basato su analogia cautious: retreat_hp_pct=0.4 → 90% WR, ma non vogliamo raggiungere cautious behavior.

**Trade-off**: profilo meno "aggressivo" visivamente. Accettabile se WR>80%.

### Knob-2 (P0): `kite_buffer 0 → 1`

**Hypothesis**: `kite_buffer=0` fa sì che il Sistema stia esattamente a range=2 (default_attack_range=2). Con kite_buffer=1, il Sistema mantiene distanza range+1=3, riducendo la probabilità che `stepTowards` sia bloccato da wall/corner perché opera a distanza maggiore.

**Δ WR atteso**: +10-15pp. Riduce i loop move:400 del Sistema aumentando lo spazio di manovra.

**Trade-off**: Sistema leggermente più lontano → meno danni per round → partite più lunghe.

### Knob-3 (P1): ablazione `use_utility_brain false`

**Hypothesis**: disabilitare utility brain su aggressive e tornare al policy legacy (`selectAiPolicy`) per misurare il delta diretto. Se legacy ottiene WR>80% su stessi seed, il problema è specificamente nell'utility brain (pathfinding integration mancante, consideration bilanciamento, o enumerate_actions che non vede correttamente il grid state dalla session shape).

**Δ WR atteso**: sconosciuto — questo è un esperimento di ablazione, non un miglioramento. Se WR sale → bug utility brain. Se WR cala → utility brain è corretto ma parametri sbagliati.

**Trade-off**: reverte comportamento distinguente del profilo. Solo per diagnostica.

---

## SPRT plan — Stockfish pattern

### Configurazione

```
H0: WR_proposed ≤ WR_baseline (aggressive corrente = 60%)
H1: WR_proposed ≥ WR_target (80%)
α = β = 0.05
upper_bound = ln((1-β)/α) = ln(19) ≈ 2.944
lower_bound = ln(β/(1-α)) = ln(0.0526) ≈ -2.944
```

### N stimato (Wald 1945)

Formula SPRT per win-rate binary (win=1, non-win=0):

```
N ≈ 4 × (Z_α + Z_β)² / (WR1 - WR0)²
  = 4 × (1.645 + 1.645)² / (0.80 - 0.60)²
  = 4 × 10.824 / 0.04
  ≈ 1082 runs per decisione (upper bound conservativo)
```

Nella pratica SPRT è adaptive: se il candidato è molto migliore, il test termina prima (~200-400 runs). Con N=10 per seed come ora, stimare 20-40 seed per raggiungere bounds.

**Budget pratico N=40**: batch 40 run per candidato → segnale direzionale (non 95% confidence, ma sufficiente per kill/keep decision). N=99 (batch in corso) fornirà stima più robusta.

### CLI invocation

```bash
# Knob-1: retreat_hp_pct 0.15→0.25 (modifica ai_profiles.yaml temporanea)
node tools/sim/batch-ai-runner.js \
  --profiles aggressive_v2 \
  --scenarios enc_tutorial_01 \
  --seeds 1001-1040 \
  --max-rounds 40 \
  --tunnel https://given-jan-convention-cowboy.trycloudflare.com \
  --out /tmp/ai-sim-runs/sprt-knob1-$(date +%Y%m%dT%H%M%S)

# Knob-3 ablation: aggressive con use_utility_brain=false
node tools/sim/batch-ai-runner.js \
  --profiles aggressive_noub \
  --scenarios enc_tutorial_01 \
  --seeds 1001-1040 \
  --max-rounds 40 \
  --tunnel https://given-jan-convention-cowboy.trycloudflare.com \
  --out /tmp/ai-sim-runs/sprt-knob3-$(date +%Y%m%dT%H%M%S)
```

Confronto: se `victory/(victory+timeout+defeat)` su 40 run ≥ 0.80 → PASS candidate.

**SPRT tool esistente**: `tools/py/sprt_calibrate.py --target-low 0.75 --target-high 0.85 --n-max 40`

---

## MAP-Elites grid sketch

Feature space 2D: `retreat_hp_pct` × `kite_buffer`.

```
kite_buffer
    2 |  [0.15,2]  [0.20,2]  [0.25,2]
    1 |  [0.15,1]  [0.20,1]  [0.25,1]   ← target zone (Knob-1+Knob-2 combo)
    0 |  [0.15,0]* [0.20,0]  [0.25,0]
       +---------+---------+---------
        0.15      0.20      0.25
                    retreat_hp_pct

* = baseline corrente (60% WR, 4/10 timeout)
```

Performance target per cella: `winrate ≥ 0.80` + `timeout_rate ≤ 0.10`.

Priorità probing (6 celle, N=10 ciascuna = 60 run totali):

| Priorità | Cella     | Rationale                                |
| -------- | --------- | ---------------------------------------- |
| P0       | [0.25, 1] | Knob-1+Knob-2 combo, minimale deviazione |
| P0       | [0.20, 1] | Knob-2 puro, test kite isolato           |
| P1       | [0.25, 0] | Knob-1 puro                              |
| P1       | [0.20, 0] | Intermedio                               |
| P2       | [0.15, 2] | Massimo kite buffer, retreat invariato   |
| P2       | [0.25, 2] | Massimo entrambi                         |

**Fitness function per cella**:

```
fitness = winrate × (1 - timeout_rate × 2)
```

Penalizza fortemente i timeout (danno UX peggiore di una sconfitta).

---

## Pending: N=99 batch (in corso)

Batch 33 seed × 3 profili (max_rounds=40) avviato in background. Output atteso in `/tmp/ai-sim-runs/batch-<ISO>/`. Fornirà:

- Distribuzione WR su seed diversi (1001-1033 vs 1001-1010 N=30)
- Conferma o confutazione del pattern seed-dipendente per i timeout
- Baseline più robusta per SPRT comparison

---

## Gap strutturale identificato (escalation)

Il logging del test harness non cattura le **decisions del Sistema** (rule, intent, target per ogni unit SIS ogni round). Senza questo, l'RCA è inferenziale. Per N=99 batch e SPRT, idealmente aggiungere:

```jsonl
{"kind":"sistema_decision","round":N,"unit_id":"...","rule":"UTILITY_AI","intent":"retreat","target_id":"...","score":0.82}
```

Questo richiederebbe modificare `tests/smoke/ai-driven-sim.js` per leggere `/api/session/state` e loggare i `decisions` di `declareSistemaIntents`. Effort stimato: 30-45min. Sblocca RCA definitivo per H1/H2/H3.

---

## Proposed tickets

```
TKT-BALANCE-AGGRESSIVE-KNOB1: 2h — test retreat_hp_pct 0.15→0.25 N=40 SPRT run + report delta WR
TKT-BALANCE-AGGRESSIVE-KNOB2: 2h — test kite_buffer 0→1 N=40 SPRT run + report delta WR
TKT-BALANCE-AGGRESSIVE-ABLATION: 1h — ablation use_utility_brain=false N=40 run, verifica H1/H2/H3
TKT-BALANCE-HARNESS-DECISIONS-LOG: 1h — aggiungi sistema_decision events al test harness per RCA definitivo
TKT-BALANCE-MAP-ELITES-6CELL: 4h — MAP-Elites grid 6 celle × N=10 run, fitness matrix, pick winner
```

---

## Resume trigger phrases

```
"aggresive profile calibration 2026-05-09, N=99 batch completato, procedi SPRT knob-1"
"leggi docs/research/2026-05-09-aggressive-profile-calibration.md, esegui MAP-Elites grid 6 celle"
"N=99 batch done, confronta aggressive 60% baseline vs knob candidati, update SPRT bounds"
```

---

## Fonti

- [Fishtest Mathematics — SPRT Stockfish](https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html)
- [Wald 1945 SPRT Sequential Analysis](https://www.chessprogramming.org/Sequential_Probability_Ratio_Test)
- [Jaffe AIIDE 2012 — Restricted Play multi-policy proxy](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf)
- [Fontaine MAP-Elites Hearthstone 2019](https://quality-diversity.github.io/papers.html)
- `docs/reports/2026-04-29-utility-ai-oscillation-bug.md` — fix precedente oscillation (additive aggregation + action-aware SelfHealth)
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` v0.2.0 — profilo baseline
