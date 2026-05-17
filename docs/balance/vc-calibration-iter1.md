---
title: VC Scoring Calibration — Iteration 1 (analysis + applied)
doc_status: active
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-04-17'
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# VC Scoring Calibration — Iteration 1

> **Stato**: proposte applicate 2026-04-17. Vedi sezione "Applied changes" in fondo.

Prima analisi VC scoring vs dati osservati nei batch playtest tutorial. Iterazione conservativa, **non applicare modifiche al config senza N≥50 sessioni varie**.

## Stato config attuale

- **EMA**: alpha=0.3, phase weights {early:0.25, mid:0.35, late:0.40}
- **Normalizzazione**: ema_capped_minmax {floor:0.15, ceiling:0.75}
- **MBTI threshold**: 0.5 (split centrale)

## Coverage indici

| Index        | Derivable                                                   | Observed (tutorial)                    | Ennea trigger            |
| ------------ | ----------------------------------------------------------- | -------------------------------------- | ------------------------ |
| **aggro**    | ✅ full (4/4 weights)                                       | moderate (~74% hit, 1 first_blood/run) | borderline 0.55-0.70     |
| **risk**     | ⚠ partial (3/5 — self_heal e overcap_guard null)           | low (avg enemy dmg 1.0/run)            | **MAI** triggera (>0.55) |
| **cohesion** | ❌ partial (formation_time + support_actions null)          | —                                      | **MAI** (>0.70)          |
| **setup**    | ❌ null (overwatch + trap + cover_before_attack tutti null) | —                                      | **MAI**                  |
| **explore**  | ⚠ partial (1/3 — solo new_tiles)                           | low (~0.14 su grid 6x6)                | **MAI** (>0.70)          |
| **tilt**     | ❌ non wired in snapshot                                    | null                                   | **MAI**                  |

**Conseguenza**: 4/6 archetipi Ennea **irraggiungibili** dal tutorial. Solo `Conquistatore(3)` e `Cacciatore(8)` triggerabili.

## Proposte calibrazione (conservative)

### 1. Abbassa soglie Ennea su indici partial-coverage

```yaml
# data/core/telemetry.yaml — proposta non applicata
ennea_triggers:
  Coordinatore(2): { cohesion: 0.55 } # da 0.70
  Esploratore(7): { explore: 0.45 } # da 0.70
```

Compensa weight mancanti finche' `formation_time`, `support_actions`, `time_in_fow`, `optionals` non sono derivati.

### 2. MBTI dead-band

`deriveMbtiType` ora hardcoded soglia 0.5 → flip facile su sessioni corte. Proposta: dead-band 0.45-0.55 → ritorna `null` per quell'asse.

Previene classification noise da sessioni < 5 round.

### 3. Risk index — escludi weights null

Attualmente `risk` ha 5 weights, 2 null. Renormalizzazione su 3 weights inflated.

Proposta: marcare null-weights come `excluded` esplicito o azzerarli in YAML finche' non derivati.

### 4. Guard "insufficient data"

Aggiungere conjunction su Ennea triggers:

```yaml
trigger_min_attacks: 3 # o trigger_min_turns: 5
```

Mirror del pattern `Cacciatore` (gia' usa `attacks_started>=5`).

## Caveat

- **N=10 troppo piccolo** per tuning EMA window
- Tutorial enemies deboli → `risk` e `low_hp_time` near-zero a prescindere
- `tilt` non implementato — calibrazione prematura
- Servono N≥50 su encounter varie (non solo enc_tutorial_01) prima di toccare `ema_alpha` o `phase_weights`

## TODO follow-up

1. Wirare `tilt` window model in vcScoring snapshot
2. Derivare `formation_time`, `support_actions`, `cover_before_attack` (servono coordinate vicinanza unita' nello stesso round)
3. Eseguire batch su tutti e 3 gli encounter (1, 2, 3) e aggregare
4. Decidere se applicare proposte 1-4 o aspettare piu' dati

## Riferimenti

- `apps/backend/services/vcScoring.js` (linee 439, 522-536)
- `data/core/telemetry.yaml`
- `tests/api/batchPlaytest.test.js`
- `tests/api/firstPlaytest.test.js`

## Applied changes (2026-04-17)

### #1 Ennea threshold lower (data/core/telemetry.yaml)

- `Coordinatore(2)`: cohesion>0.70 → **>0.55**
- `Esploratore(7)`: explore>0.70 → **>0.45**
- `Architetto(5)`: setup>0.70 → **>0.50**
- `Stoico(9)`: tilt>0.65 (invariato — tilt non implementato)

### #2 MBTI dead-band (apps/backend/services/vcScoring.js)

`deriveMbtiType` ora usa dead-band 0.45-0.55 → ritorna `X` per asse indeterminato. Esempi:

- `INTJ`: tutti gli assi nettamente fuori dead-band
- `XNTJ`: E/I nel dead-band, asse N/T/J chiari
- `XXXX`: classification incerta, sessione troppo corta

### #3 Risk null weights — NOT applied

Decisione: non azzerare `self_heal` e `overcap_guard` in YAML. Servono per quando heal/overcap saranno derivati. Aspetto piu' dati.

### #4 insufficient_data guard — NOT applied

Aggiungere `min_attacks` su Ennea triggers richiede update parser whitelist in vcScoring. Rinviato a iter2 con piu' contesto.

## Iter2 todo

- Implementare `tilt` window model (richiede storico per-round)
- Derivare `formation_time`, `support_actions`, `cover_before_attack`
- Run batch su tutti e 3 gli encounter (1, 2, 3) e aggregare N≥30
- Applicare proposta #4 (insufficient_data guard) se Ennea triggers troppo rumorosi
