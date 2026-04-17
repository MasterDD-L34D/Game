---
title: Adattamento TV/d20 — Regole canoniche turno
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-17
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

**Regola canonica**: `AP 2 = 1 attack MAX + N move` dove `N ≤ AP rimanenti`.

| AP spesi          | Azioni valide                |
| ----------------- | ---------------------------- |
| 0                 | nessuna azione (skip turno)  |
| 1 attack          | 1 attacco, 0 move residui    |
| 1 attack + 1 move | 1 attacco + 1 step movimento |
| 2 move            | 2 step movimento, 0 attacchi |
| 1 move + skip     | 1 step + skip                |

**No doppio attack.** Un'unità attacca al massimo **1 volta per turno**, indipendentemente da AP residui. Motivazione:

- Tensione tattica: "devo colpire adesso" ha peso. 2 attacchi/turno trivializzano target priority.
- Coerenza con reference (FFT, XCOM, Wesnoth): tutti 1 attack/turn.
- Matematica bilanciamento: player scout mod 3 \* 2 attack/turn = Sistema wipe garantito round 2.

**Eccezioni future** (post-M4, opt-in):

- Trait `ferocia_lampo` (placeholder): consente 2nd attack se MoS ≥10 al primo.
- Job `berserker` (placeholder): 2nd attack a -2 mod.
- Entrambi richiedono spec esplicita, non default.

**Codice**: `apps/backend/services/roundOrchestrator.js` deve rifiutare 2° attack stesso turno (enforcement TODO — oggi consente via AP budget, ma batch test e playtest human usano già 1/turn convenzionalmente).

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

- Master/agent DM deve rifiutare input non-canonico con messaggio: `SYNTAX: <actor_id>: [move [x,y]] [atk <target_id>] | skip`.
- Parser di riferimento: `apps/backend/routes/session.js` (accetta già `{actor_id, action_type, target_id, position}`).
- Testi liberi ("vai a nord", "colpisci il nemico vicino") NON accettati — Master traduce in canonico prima.

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
