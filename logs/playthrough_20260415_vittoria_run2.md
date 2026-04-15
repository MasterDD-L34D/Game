# Playthrough — Vittoria Run 2 (2026-04-15)

## Metadata

- **Session ID**: `83d06926-81aa-49a8-9382-1e8564bd7f58`
- **Raw events**: `logs/session_20260415_010225.json` — **75 eventi**, 47 KB
- **Turni giocati**: **69** (vs 5 della run 1)
- **Esito**: VITTORIA (SIS KO al turno 69)
- **Strategia dichiarata**: kite — muovi, attacca, fine turno

## Numeri cardine

### Unità giocatore (unit_1)

| Metrica | Valore | Δ vs run 1 |
|---------|:-:|:-:|
| Attacchi | 25 | +17 |
| Hit | 17 | +11 |
| Miss | 8 | +6 |
| **Hit rate** | **0.680** | −0.07 |
| Movimenti | 15 | +10 |
| Azioni totali | 40 | +27 |
| Damage dealt | 12 | +1 |
| **Damage taken** | **7** | +7 (prima era 0) |
| Turni totali | 69 | +64 |

### Unità sistema

| Metrica | Valore |
|---------|:-:|
| Attacchi | 7 |
| Hit | 3 (hit_rate 0.429) |
| **Movimenti** | **27** ← l'osservazione chiave |
| Damage dealt | 7 |

## VC Scoring — unit_1

### Indici
| Indice | Coverage | Run 1 | **Run 2** |
|--------|:-:|:-:|:-:|
| aggro | full | 0.765 | **0.603** |
| risk  | partial | 0.055 | **0.578** |
| cohesion | partial | 0.000 | 0.000 |

### MBTI
| Asse | Run 1 | **Run 2** |
|------|:-:|:-:|
| T_F | 0.909 | 0.854 |
| J_P | 0.469 | 0.473 |

### Ennea archetypes
**Ancora 0 triggerati.** Analisi gap:

- **Conquistatore(3)** — `aggro>0.65 && risk>0.55`
  - Run 1: aggro ✓ (0.765), risk ✗ (0.055)
  - **Run 2**: aggro ✗ (0.603), risk ✓ (0.578) — **invertito**, ancora sotto soglia
  - Sei quasi sul filo di entrambe: scendi in aggressività mentre sali in risk, ma nessuna delle due supera entrambe le soglie nello stesso run.

### Perché aggro è SCESO nonostante più attacchi (25 vs 8)

```
aggro = 0.35·attacks_started + 0.25·first_blood + 0.20·close_engage + 0.20·kill_pressure
```

Calcolo run 2:
| Termine | w | raw | clamp01 | contributo |
|---------|:-:|:-:|:-:|:-:|
| attacks_started | 0.35 | 25 | 1.000 | 0.350 |
| first_blood | 0.25 | 1 | 1.000 | 0.250 |
| **close_engage** | 0.20 | **0** | 0.000 | **0.000** ← |
| kill_pressure | 0.20 | 0.0145 | 0.0145 | 0.0029 |
| | | | **Σ** | **0.603** ✓ |

Il crollo è tutto su **`close_engage = 0`** (run 1 era 0.625). La metrica premia chi sta vicino al nemico quando lo colpisce — il kiting ti penalizza.

E **`kill_pressure = 0.014`** (quasi zero): formula = kills / turni ≈ 1/69. Più tiri in lungo il match, più scende.

### Perché risk è SALITO

```
risk = 0.28·damage_taken + 0.28·1vX + 0.22·low_hp_time − 0.18·self_heal + 0.18·overcap_guard
```
Con coverage parziale (solo `damage_taken`, `low_hp_time`):

| Termine | w | raw | contributo |
|---------|:-:|:-:|:-:|
| damage_taken | 0.28 | 1.0 (clamp) | 0.28 |
| low_hp_time | 0.22 | 0.04 | 0.0088 |
| | | Σ/0.50 | **0.578** ✓ |

`damage_taken = 7` si satura a 1.0 dopo clamp. Bastano pochi colpi presi per saturare la metrica — è una soglia abbastanza bassa.

## Le tre osservazioni di design che hai fatto

### 1. "Il nemico si muove anche se non ne ha bisogno" (27 movimenti SIS)

Root cause in [apps/backend/routes/session.js:178-196](apps/backend/routes/session.js:178):

```
pickLowestHpEnemy → stepTowards(from, to)
```

`runSistemaTurn` sceglie sempre il bersaglio a HP più basso e fa **un passo Manhattan** verso di esso, senza controllare se è già **in range di attacco**. Non c'è la condizione "se posso colpire, colpisci invece di muoverti". Conseguenza: il SIS rincorre all'infinito un bersaglio che non raggiunge mai (tu skirmisher ti muovi alla stessa velocità).

**Fix di design**: la routine SIS dovrebbe essere
```
if (distance <= attack_range) → attack
else → move towards
```

### 2. "Non c'è un range per gli attacchi"

Conferma nel codice: in `router.post('/action')` per `attack` ([session.js:532](apps/backend/routes/session.js:532)), non c'è alcun check su `manhattanDistance(actor.position, target.position)`. L'attacco è **globale**. Hai colpito SIS da 7 celle di distanza perché il backend non valida il range.

**Fix**: introdurre `attack_range` per unità (o per trait/job) e rifiutare 400 se `dist > range`.

### 3. "Muoversi e attaccare a ripetizione è ancora possibile"

Confermato: nel /action route **non c'è consumo di AP**. Il check su line [session.js:594](apps/backend/routes/session.js:594) verifica solo che la distanza del move sia ≤ `actor.ap`, ma **non decrementa `ap_remaining`**. Quindi puoi fare infiniti move e attack nello stesso turno — l'unico limite è clickare "Fine Turno".

**Fix**: in ogni branch `action_type`, decrementare `ap_remaining` (e rifiutare se ≤0). Il turn/end già lo resetta al massimo.

## Take-away

Il rules engine attuale è una **demo minimale**: session + log funzionano (75 eventi persistiti, VC scoring funzionante), ma mancano tre gate fondamentali:
1. Consumo AP
2. Attack range
3. IA awareness del proprio range

Questi sono exactly i tre punti che hai identificato giocando — il che è utile feedback: la telemetria VC conferma il pattern (alto numero di azioni senza cap) ma senza i gate il gameplay non è bilanciabile. Senza fixing, `aggro` e `risk` restano metriche su un loop "infinito" che non riflette le intenzioni del design doc.

## File toccati in chat

- [apps/backend/app.js:369](apps/backend/app.js:369) — `express.static`
- [apps/backend/routes/session.js:564,609,648-668](apps/backend/routes/session.js:564) — state nei response + auto-advance SIS
- [apps/backend/public/Evo-Tactics — Playtest.html:354](apps/backend/public/Evo-Tactics%20%E2%80%94%20Playtest.html:354) — controlled_by unit_2
