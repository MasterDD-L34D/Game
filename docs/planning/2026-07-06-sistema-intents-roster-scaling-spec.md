# Sistema intents roster-scaling -- spec (SDMG: valori PROPOSED, decider Eduardo)

Data: 2026-07-06 | Stato: PROPOSED (flag default OFF) | Autore: claude-fable-5 (sessione autonoma)
Feed: docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md "Limite di modello" (PR #3229)
Decisione a monte: D4 threat/pressure-dial (ricerca big-map 2026-07-03, Imperial Assault threat dial;
activation count = lever #1). Stacked su feat/enc-grid-sized-first-16x12.

## 1. Problema (misurato, non ipotizzato)

Il throughput del Sistema e' cappato da un dial GLOBALE per round che non scala ne' con la
board ne' col roster:

- Party 4 unita' x 2 AP = 8 azioni/round; Sistema = 1-4 intents/round (tier pressure).
- Su 16x12 con roster grandi solo 2-3 unita' agiscono: "piu' nemici" = MENO pressione
  per-unita' (2/13 = 15% attivo). Letalita' AI-vs-AI = ceiling WR 1.0 su qualsiasi authoring
  (faithful, hp+3/mod+1/dc+1, +range4: tutti WR 1.0, 0 KO).
- Il lever che la ricerca indica come #1 (activation count) al runtime e' cappato dal dial,
  non dal count autorato.

## 2. Ground-truth correction (Currency Gate)

Il finding cita `sessionHelpers.SISTEMA_PRESSURE_TIERS` (1/2/2/3/3). Verifica sul codice: il
dial RUNTIME degli intents e' `PRESSURE_TIER_INTENT_CAP` in
`apps/backend/services/ai/declareSistemaIntents.js` = **1/2/3/3/4** (rebalance 2026-04-17),
consumato da `intentsCapForPressure()` (:124, call-site :276). Quattro copie della tabella:

| Copia | Valori intents | Stato |
| --- | --- | --- |
| `packs/evo_tactics_pack/data/balance/sistema_pressure.yaml` (authority) | 1/2/3/3/4 | OK |
| `declareSistemaIntents.PRESSURE_TIER_INTENT_CAP` (runtime dial) | 1/2/3/3/4 | OK |
| `aiProgressMeter.PRESSURE_TIERS` (HUD) | 1/2/3/3/4 | OK |
| `sessionHelpers.SISTEMA_PRESSURE_TIERS` | 1/2/2/3/3 | **STALE** (pre-rebalance; display-only, spawner legge solo reinforcement_budget che combacia) |

Lo scaling si aggancia a `intentsCapForPressure()` -- unico choke-point, session disponibile
al call-site. Il drift stale e' fixato in commit separato (display-only).

## 3. Tre approcci (protocollo ADR-0026 #6)

### A. Per-roster con tier-floor (RACCOMANDATO)

`effectiveCap = min(max(tierCap, ceil(aliveSistema / K)), ABS_CAP)`

- Il tier resta il FLOOR: roster piccoli (tutorial, encounter attuali: 3-7 vivi) ->
  `ceil(alive/K) <= tierCap` -> comportamento IDENTICO anche a flag ON.
- Morde solo dove serve: roster grandi. Con 13 vivi e K=3 -> cap 5 (vs 3).
- Dinamico: i rinforzi entrano nel conteggio -> la valvola push-economy sostiene la
  pressione mentre spawna (eco AI War).
- Contro: K e' un nuovo knob da ratificare; non modella la geografia della board.

### B. Per-board (area multiplier)

`effectiveCap = round(tierCap * sqrt(area / 36))` (36 = board 6x6 legacy).

- Pro: zero dipendenza dal roster; 16x12 -> x2.3.
- Contro: statico a meta' fight (l'area non cambia, il roster si'); proxy debole
  (una 16x12 con 3 nemici NON deve triplicare il cap); scala anche quando la patologia
  non esiste. La ricerca indica activation count, e il denominatore diretto e' il roster,
  non l'area. SCARTATO.

### C. Activation-ratio target (tier -> ratio)

Il tier mappa a un target di attivazione (es. Calm 15% ... Apex 50%): `cap = ceil(ratio * alive)`.

- Pro: il piu' principled (il campo passivo `activation_ratio` di xpBudget Shape 2 gia'
  esiste come segnale); dial unico coerente.
- Contro: ridefinisce la semantica di TUTTI i tier -> re-ratify dell'intero parco encounter
  (tutorial_01 "gentle start" incluso); blast radius massimo. SCARTATO per v1; resta la
  direzione naturale di v2 se A ratifica bene.

## 4. Design scelto (A) -- valori PROPOSED

| Knob | Valore | Rationale |
| --- | --- | --- |
| `SISTEMA_INTENTS_ROSTER_SCALING_ENABLED` | env, default **OFF** | pattern A2 (`PRESSURE_TIER_FLOOR_ENABLED`): `=== 'true'`, letto per-call -> probe-friendly, OFF = byte-identical |
| `SISTEMA_INTENTS_ROSTER_K` | env int, default **3** | PROPOSED: attivazione ~33% su roster grandi; A/B con K=2 nel probe |
| `INTENTS_ABS_CAP` | costante **6** | PROPOSED: sotto le 8 azioni party -> action-economy player-favored preservata; bound al telegraph UI |

API: `intentsCapForPressure(pressure, floor, aliveSistema)` -- terzo parametro opzionale;
undefined/invalid -> tierCap (back-compat totale per ogni caller esistente). Call-site
(declareSistemaIntents :276) conta `session.units` con `controlled_by === 'sistema' && hp > 0`.

Garanzie back-compat (testate, non promesse):
1. Flag OFF -> byte-identical (test di regressione con terzo arg presente).
2. Flag ON + roster piccolo -> tier-floor -> identico.
3. Flag ON -> mai sotto tierCap, mai sopra ABS_CAP.

## 5. Piano probe A/B (L-069: N=10 direction -> N=40 ratify)

Probe: `tools/sim/dorsale-ferrosa-band-probe.js` + nuovi knob `--intents-scaling` /
`--intents-k` (settano env, registrati in `summary.scaling`). Banda ratificata di riferimento:
completion 1.0, pace [10,18], reinf 4 (N=40 2026-07-06).

| Arm | Flag | K | countMult | Attesa |
| --- | --- | --- | --- | --- |
| A1 | ON | 3 | 1 | INVARIATO (tier-floor: 3-7 vivi -> ceil <= 3). Valida garanzia 2 |
| B0 | OFF | - | 3 | patologia riprodotta: WR 1.0, pace lenta, pressione per-unita' bassa |
| B1 | ON | 3 | 3 | il dial morde: KO-rate > 0 e/o pace shift misurabile vs B0 |
| B2 | ON | 2 | 3 | sensitivity K: arm piu' duro, informa il default |

N=10 direction sui 4 arm -> N=40 ratify sull'arm K vincente (+ A1 resta N=10: la garanzia
flag-OFF e' strutturale, non statistica). Nessun cambio a `grid_ratify_baseline.json`:
flag default OFF -> la banda shipped non si muove.

Criterio direction (N=10 = probe, non ratifica): B1/B2 "morde" se dWR <= -0.2 o KO-rate
>= 0.05 o dRounds fuori banda vs B0. Se nessun arm morde -> negative result, si documenta
e lo scaling resta spec-only (il ceiling potrebbe essere altrove, es. AI melee mai-converte).

## 6. Fuori scope v1 (gap dichiarati)

- HUD `ai_progress.intents_per_round` mostra il tier baseline, non il cap effettivo a flag
  ON -> follow-up chip (surface `intents_cap_effective`).
- Wiring del knob K nel YAML authority (`sistema_pressure.yaml scaling:`) -> post-ratify.
- AI zone-defense per obiettivi non-elimination (variante capture_point): altro lever D4,
  non toccato qui.
- Flip del flag in prod: SOLO Eduardo, post N=40 + harsh-review (SDMG).
