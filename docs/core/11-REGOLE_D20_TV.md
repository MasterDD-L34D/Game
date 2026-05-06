---
title: Adattamento TV/d20 — Regole canoniche turno
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Adattamento TV/d20

Regole canoniche per turno, AP budget, syntax input. Chiude FRICTION #1-#3 dal playtest 2026-04-17. Autorità A1 (hub canonico).

## Setup TV/companion

- **Schermo condiviso** (app/sito TV): stato gruppo, mappa, log VC, consigli sblocchi.
- **Dadi**: d20 centrale; dadi "Descent-like" mappati su spese PT/PP (icona e pattern).
- **Condivisione tavolo**: ogni turno produce **eventi grezzi** per VC (no quiz).
- **Privacy**: toggle "profilazione stile" (on/off); reset profilo (amnesia evolutiva).

## AP budget canonico (FRICTION #2 + #3)

**Regola canonica**: AP è **budget spendibile liberamente** per turno. Nessun template fisso "1 attack + 1 move". Qualunque combinazione valida se `Σ ap_cost ≤ ap_max`.

### Costi azioni

| Azione                     | AP cost                      |
| -------------------------- | ---------------------------- |
| `attack`                   | 1                            |
| `move` (1 cella Manhattan) | 1                            |
| `ability` (generic)        | variabile (spec per ability) |
| `skip`                     | 0                            |

### Combinazioni valide con `ap_max=2`

| Build                     | AP  | Note                                                                       |
| ------------------------- | --- | -------------------------------------------------------------------------- |
| 2 attack                  | 1+1 | **FRICTION #3 resolution**: doppio attack stesso o diversi target = valido |
| 1 attack + 1 move 1-cella | 1+1 | hit-and-run base                                                           |
| 1 move 2-celle            | 1+1 | reposizionamento puro                                                      |
| 1 attack + skip           | 1+0 | save AP se nessun'altra opzione                                            |
| 1 ability (cost=2)        | 2   | abilità pesante                                                            |
| skip                      | 0   | passa turno                                                                |

### Motivazione

- **Libertà tattica**: player sceglie tempo/target senza template forzato (contro Halfway lesson "prescriptive turn = frustrating").
- **Economy meaningful**: 2 attack vs move = trade-off esplicito damage-now vs position-now.
- **AI symmetry**: Sistema gode stesso budget → asimmetria solo via profili AI + HP/DC, non via regole turno.

### Enforcement

- **Codice**: `apps/backend/services/roundOrchestrator.js` + `sessionRoundBridge.js` validano `ap.current >= ap_cost` prima di eseguire azione.
- **Test canonical**: [`tests/api/apBudget.test.js`](../../tests/api/apBudget.test.js) — asserisce budget valido con `ap_max` dinamico.
- **Scenari**: tutorial 02-05 allineati a `ap_max=2` canonical. Tutorial 01 mantiene `ap_max=3` come eccezione esplicita (onboarding easy) — vedi `apps/backend/services/tutorialScenario.js`.

### Batch execution: `POST /api/session/round/execute`

Endpoint canonical per eseguire un round completo in una singola request.

**Body**:

```json
{
  "session_id": "uuid",
  "player_intents": [
    { "actor_id": "p_scout", "action": { "type": "attack", "target_id": "e_nomad_1" } },
    { "actor_id": "p_tank", "action": { "type": "move", "position": { "x": 2, "y": 3 } } }
  ],
  "ai_auto": true,
  "priority_queue": false
}
```

**Validazione cumulativa**: `Σ ap_cost ≤ ap_remaining` per ogni actor. Violations → 400 con lista dettagliata.

**Response**: aggregato di `results[]` (per intent), `ai_result` (se `ai_auto` + `priority_queue=false`), `events[]`, `ap_consumed`, `state`, `priority_queue_used`.

**Priority queue** (opt-in, canonical ADR-2026-04-15): quando `priority_queue: true`, tutti gli intents (player + AI se `ai_auto`) vengono ordinati per:

```
priority = unit.initiative + action_speed - status_penalty
```

- `action_speed`: defend/parry **+2**, attack **0**, ability/heal **-1**, move **-2**, turn/skip **0**
- `status_penalty`: panic **2×intensity**, disorient **1×intensity**

Tiebreak: priority desc, actor_id alfabetico asc, declaration order asc. Con `priority_queue=true`, `ai_result=null` (AI intents dispatched inline) + end-of-round ticks (bleeding, status decay, AP reset) applicati inline.

**Modalità default** (`priority_queue=false`): dispatch in declaration order + `ai_auto` esegue `handleTurnEndViaRound` dopo (legacy behavior, compat).

**CLI assistant**: [`tools/py/master_dm.py`](../../tools/py/master_dm.py) — REPL canonical syntax → batch endpoint.

### Varianti future (opt-in, non default)

- Trait `ferocia_lampo` (placeholder): 2° attack guadagna bonus se MoS ≥10 al primo.
- Job `berserker` (placeholder): 2° attack gratuito (ap_cost=0) sotto HP 25%.
- Entrambi richiedono spec esplicita (non alterano regola base AP).

## Syntax mosse canonica (FRICTION #1)

**Formato input per playtest testuale**:

```
<actor_id>: move [<x>,<y>] atk <target_id>
<actor_id>: move [<x>,<y>]
<actor_id>: atk <target_id>
<actor_id>: skip
```

### Esempi validi

```
p_scout: move [3,2] atk e_nomad_1     # move + attack (2 AP)
p_tank: atk e_hunter                   # attack only (1 AP)
p_scout: move [4,2]                    # move only (1 AP), skip resto
e_nomad_1: atk p_scout                 # SIS attack (dichiarato da AI o Master)
p_tank: skip                           # passa turno
```

### Coordinate

- **Sistema**: `[x,y]` con origine `(0,0)` angolo **in alto a sinistra**.
- `x` cresce verso destra (est), `y` cresce verso il basso (sud).
- Alternativa cardinale NON canonica (ambigua su griglia non allineata): evitare "N 2" / "E 1" in input testuale.

### Attack range

- `atk <target>` valido solo se `distance(actor, target) ≤ actor.attack_range`.
- Distance = **Manhattan** (`|dx| + |dy|`) su griglia quadrata.
- Futuro (hex grid): distance axial-hex via `services/rules/hexGrid.py::distance()`.

### Parser

- Master/agent DM deve rifiutare input non-canonico con messaggio: `SYNTAX: <actor_id>: [move [x,y]] [atk <target_id>] | skip | ability <ability_id> [target=<target_id>]`.
- Parser di riferimento: `apps/backend/routes/session.js` (accetta già `{actor_id, action_type, target_id, position}`).
- Testi liberi ("vai a nord", "colpisci il nemico vicino") NON accettati — Master traduce in canonico prima.

## Ability syntax (FRICTION #4)

**Formato canonico per job abilities** (dash_strike, taunt, binding_field, etc.):

```
<actor_id>: ability <ability_id> target=<target_id>
<actor_id>: ability <ability_id>  # su self-target o no-target
```

### Esempi validi

```
p_scout: ability dash_strike target=e_nomad_1   # Skirmisher hit-and-run
p_tank: ability taunt                           # Vanguard aggro pull (no explicit target)
p_scout: ability evasive_maneuver               # self-target buff
p_tank: ability fortify                         # self buff 2 turni
```

### Catalog abilities

**Runtime discoverability**: `GET /api/jobs` per lista job, `GET /api/jobs/:job_id` per dettaglio con cost/trigger.

**7 job base**: `skirmisher`, `vanguard`, `warden`, `artificer`, `invoker`, `ranger`, `harvester`. Ogni job ha 2 R1 abilities + 1 R2 (`unlock_r1_1`, `unlock_r1_2`, `unlock_r2`). Spec completa in [`data/core/jobs.yaml`](../../data/core/jobs.yaml).

### Cost spec per ability

Ogni ability specifica:

- `cost_ap`: AP consumati (tipico 0-2)
- `cost_pi`: Punti Investimento per unlock (3 R1, 8 R2) — meta-progression, non runtime
- `cost_pt` / `cost_pp` / `cost_sg` / `cost_seed`: risorse rigenerabili in-match (opzionali)
- `effect_type`: es. `move_attack`, `attack_move`, `multi_attack`, `buff`, `debuff`, `heal`, `shield`, `aoe_debuff`, `reaction`, `ranged_attack`, `execution_attack`

### Enforcement

- **Runtime executor**: TODO follow-up PR (action_type `ability` in session route + effect dispatcher per `effect_type`).
- **Discoverability oggi**: Master/agent DM può curlare `GET /api/jobs/:job_id` durante playtest per lookup rapido.
- **Fallback playtest senza executor**: Master applica manualmente effect (es. `dash_strike` = move 2 celle + attack con +1 mod se target non-adjacent a inizio turno), traccia evento raw come `ability` action_type placeholder.

## Ordine turno (initiative)

**Fisso per round**: `P1 → S1 → P2 → S2 → …` alternato player/sistema per initiative decrescente.

- Initiative risolta a inizio encounter (stat `initiative` per unità).
- Ties: player prima di Sistema (asymmetric bias per leggibilità).
- Initiative NON rirollata tra i round (elimina meta-gioco).

## Eventi grezzi per VC

Ogni azione emette raw event:

```
{ action_type, turn, actor_id, target_id, damage_dealt, result, position_from, position_to }
```

Schema canonico in `packages/contracts/schemas/combat.schema.json`. Consumato da `apps/backend/services/vcScoring.js` per calcolo MBTI/Ennea aggregato a fine sessione.

## Cross-ref

- FRICTION log completo: [`docs/playtests/2026-04-17/notes.md`](../playtests/2026-04-17/notes.md)
- Sistema tattico: [`10-SISTEMA_TATTICO.md`](10-SISTEMA_TATTICO.md)
- Combat hub: [`../hubs/combat.md`](../hubs/combat.md)
- Rules engine: `services/rules/resolver.py` + `services/rules/demo_cli.py`

---

_Aggiornato 2026-04-17 post-playtest M1. Revisione ogni 14 giorni o dopo playtest successivo._
