# Playthrough — Vittoria 2026-04-15

## Metadata

- **Session ID**: `5d22fdce-121d-4b28-b180-eb3f32c4f54f`
- **Raw events**: `logs/session_20260415_005713.json` (16 events, finalizzato)
- **Turni giocati**: 5 (`turn_final = 5`)
- **Scoring version**: `0.1.0`
- **Fairness**: `cap_pt_used=0 / cap_pt_max=1` (nessun cap speso)
- **Esito**: VITTORIA — `unit_2` (SIS carapax/vanguard) eliminato a HP 0

## Stato finale

| Unit | Specie · Job | Pos finale | HP | Controlled by |
|------|--------------|------------|----|--|
| unit_1 (P1) | velox · skirmisher | (3, 3) | 10 / 10 | player |
| unit_2 (SIS) | carapax · vanguard | (4, 5) | **0** / 10 | sistema |

P1 esce indenne: `damage_taken = 0`.

## Timeline log combattimento

| # | Tipo | Dettaglio |
|---|------|-----------|
| 1 | info | Sessione avviata — `5d22fdce…` |
| 2 | move | P1 → (1,1) |
| 3 | ia   | SISTEMA (REGOLA_001) si muove |
| 4 | move | P1 → (1,3) |
| 5 | move | P1 → (3,3) |
| 6 | miss | Attacco P1 → `d20=11 MoS=-1 PT=0` |
| 7 | move | P1 → (3,5) |
| 8 | hit  | Attacco P1 → `d20=22 MoS=10 PT=3` — SIS HP 10 → 7 (damage_reduction trait) |
| 9 | ia   | SISTEMA (REGOLA_001) si muove |
| 10 | hit | Attacco P1 → `d20=13 MoS=1 PT=0` — nessun danno (DR assorbe) |
| 11 | hit | Attacco P1 → `d20=13 MoS=1 PT=0` — nessun danno (DR assorbe) |
| 12 | miss | Attacco P1 → `d20=10 MoS=-2 PT=0` |
| 13 | hit | Attacco P1 → `d20=23 MoS=11 PT=4` — SIS HP 7 → 3 |
| 14 | hit | Attacco P1 → `d20=18 MoS=6 PT=2` — SIS HP 3 → 1 |
| 15 | move | P1 → (3,3) |
| 16 | **KO** | Attacco P1 → `d20=18 MoS=6 PT=2` — SIS HP 1 → **0** — VITTORIA |

Totale attacchi P1: **8** (6 hit, 2 miss — **hit rate 75%**).
Damage totale inflitto: **11** (HP SIS 10 → 0, scalato da DR di `pelle_elastomera`).
Movimenti P1: **5**. Movimenti SIS: **1**.

## VC Scoring — unit_1 (P1)

### Raw metrics

```
attacks_started       : 8
attack_hit_rate       : 0.75
kills                 : 1
first_blood           : 1
damage_dealt_total    : 11
damage_taken          : 0
damage_taken_ratio    : 0
low_hp_time           : 0.125
kill_pressure         : 0.20
close_engage          : 0.625
moves                 : 5
moves_ratio           : 0.385
setup_ratio           : 0.375
support_bias          : 0.192
time_to_commit        : 1
utility_actions       : 0.375
total_actions         : 13
```

### Aggregate indices

| Indice | Coverage | Value |
|--------|----------|-------|
| **aggro** | full | **0.765** |
| risk | partial (mancano `1vX`, `self_heal`, `overcap_guard`) | 0.055 |
| cohesion | partial (mancano `formation_time`, `support_actions`) | 0.000 |
| explore | null | — |
| setup | null | — |
| tilt | null | — |

### MBTI axes

| Asse | Coverage | Value | Lettura |
|------|----------|-------|---------|
| **T_F** | full | **0.909** | Forte polo T (pensiero/efficienza) |
| J_P | partial | 0.469 | Leggermente P |
| E_I | null | — | non coperto |
| S_N | null | — | non coperto |

### Ennea archetypes

Nessun archetipo triggerato. `Conquistatore(3)` (condizione `aggro>0.65 && risk>0.55`) è sfiorato ma fallisce sul risk (0.055).

## VC Scoring — unit_2 (SIS)

### Raw metrics
```
attacks_started       : 1
attack_hit_rate       : 0
damage_dealt_total    : 0
damage_taken          : 11
damage_taken_ratio    : 1
moves                 : 1
total_actions         : 2
```

### Aggregate indices
- aggro: 0.350 (full)
- risk: 0.560 (partial)
- cohesion / explore / setup / tilt: null

### MBTI axes
- T_F: 0.625 (full)
- J_P: 0.208 (partial)
- E_I / S_N: null

## Coverage gaps (sessione intera)

- **Full**: `T_F`, `aggro`
- **Partial**: `J_P`, `cohesion`, `risk`
- **Null**: `E_I`, `S_N`, `explore`, `setup`, `tilt`

I moduli di telemetria per esplorazione/setup/tilt/EI/SN non sono ancora popolati dal loop tattico attuale — attesi in scope sprint successivi.

## Note operative

- Backend servito da `express.static(apps/backend/public/)` su porta **3334**.
- Fix applicati in questa sessione (vedi chat):
  - `apps/backend/app.js` — `express.static`
  - `apps/backend/routes/session.js` — `state` nei response `/action`+`/turn/end`, auto-advance turno SIS
  - `apps/backend/public/Evo-Tactics — Playtest.html` — `controlled_by:'sistema'` per unit_2
