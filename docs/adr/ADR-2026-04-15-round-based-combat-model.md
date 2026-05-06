---
title: 'ADR-2026-04-15: Round-based combat model (shared planning → commit → ordered resolution)'
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# ADR-2026-04-15: Round-based combat model

- **Data**: 2026-04-15
- **Stato**: Accepted
- **Owner**: Team Combat & Rules Engine
- **Stakeholder**: Frontend (UI di planning), Backend (session engine), QA Automation (test determinismo), Narrative Ops (fluff di round simultaneo)

## Contesto

Fino a sprint 023 il loop di combat di Evo-Tactics era modellato come **turni individuali sequenziali**:

- `session.turn_order` = lista di `unit_id` ordinata per `initiative` desc (sprint-020)
- `session.active_unit` = puntatore all'unità attualmente in azione
- `POST /turn/end` avanza al prossimo unit nell'ordine
- `initiative` significava "chi gioca per primo"

Questo modello funziona per un singolo giocatore contro l'AI ma crea attriti con la visione di design di Evo-Tactics:

1. **Cooperazione**: la squadra player deve pianificare insieme. Ogni player consulta il proprio device con informazioni personali rivelate individualmente e condivide le opzioni con la squadra. Un loop "una-unità-alla-volta" non rappresenta questa fase.
2. **Simultaneità narrativa**: nel fluff tattico, le azioni di un round avvengono in un arco di tempo comune. Un'unità veloce "reagisce prima", non "gioca prima". Una parata è un'azione preparata nello stesso istante in cui l'avversario muove l'arma, non dopo il suo turno.
3. **Preview vs reale**: il player deve poter vedere costi, target, traiettorie, probabilità di hit **senza mai toccare lo stato canonico**. Il vecchio loop non aveva questa distinzione — ogni click era immediato e reale.
4. **Reaction speed come stat**: `initiative` deve diventare **una stat passiva** (reaction speed dell'unità) invece di un semplice schedulatore. Questo apre la porta a tuning di gioco per velocità (traits, status, abilità) in modo leggibile.

Un semplice rename (`initiative → reaction_speed`) è insufficiente: il cambiamento è del **loop**, non del campo dati.

## Opzioni considerate

### Opzione A — Rename cosmetico

Rinominare `initiative` in `reaction_speed` senza toccare il loop.

**Pro**: zero cambiamento architetturale, zero rischio di regressione.
**Contro**: non risolve nessuno dei problemi di design. Il loop resta sequenziale, la preview non esiste, la cooperazione non è modellata. **Rifiutata**.

### Opzione B — Riscrittura del resolver

Buttare `resolver.resolve_action` e costruire un nuovo motore di combat simultaneo da zero.

**Pro**: libertà di design totale.
**Contro**:

- invalida 69 test di resolver + 26 test di hydration
- richiede riscrittura di `demo_cli.py`, `worker.py`, `session.js`
- perde il layer di bilanciamento deterministico faticosamente tarato nei sprint 001-023
- alto rischio di introdurre regressioni in aree non coperte

**Rifiutata**.

### Opzione C — Layer di orchestrazione sopra il resolver (scelta)

Mantenere `resolver.resolve_action` come **building block atomico** invariato, aggiungere un **nuovo modulo** `services/rules/round_orchestrator.py` che implementa il loop shared-planning → commit → ordered-resolution sopra il resolver.

**Pro**:

- zero modifica al resolver → zero regressione sui 69 test esistenti
- loop nuovo testato in isolamento (29 test nuovi in `tests/test_round_orchestrator.py`)
- schema combat non cambia (additionalProperties: true al livello di CombatState)
- campi legacy (`initiative_order`, `active_unit_id`) restano per retrocompatibilità
- migrazione incrementale possibile: `demo_cli.py` e il Node session engine possono adottare il nuovo loop indipendentemente

**Contro**: due modelli di round coesistono durante la transizione (il Node session engine resta sequenziale mentre il Python rules engine è round-based). **Mitigato** dal fatto che i due layer oggi sono indipendenti (nessun bridge runtime Python ↔ Node).

**Accettata.**

## Decisione

Adottiamo **l'opzione C**. Implementiamo un nuovo modulo `services/rules/round_orchestrator.py` che offre:

### API pubblica

```python
begin_round(state) -> {next_state, expired, bleeding_total}
declare_intent(state, unit_id, action) -> {next_state}  # preview-only
clear_intent(state, unit_id) -> {next_state}
commit_round(state) -> {next_state}
build_resolution_queue(state) -> list[{unit_id, action, priority}]
resolve_round(state, catalog, rng) -> {next_state, turn_log_entries, resolution_queue, skipped}
compute_resolve_priority(unit, action) -> int
action_speed(action) -> int
```

### Semantica

- **`unit.initiative`** mantiene il nome ma cambia significato: **reaction speed passiva**, determina la posizione nella resolution queue del round.
- **`resolve_priority = unit.initiative + action_speed(action) - status_penalty`**
- **`ACTION_SPEED`** tabella (defend/parry +2, attack 0, ability -1, move -2)
- **Status penalty**: panic -2/intensity, disorient -1/intensity. Rage e stunned non influenzano priority (rage potenzia `attack_mod` nel resolver, stunned è trattato a policy level).
- **Tiebreak**: alfabetico su `unit_id` (deterministico).
- **Preview-only**: `declare_intent` NON consuma AP, NON modifica HP, NON fa roll, NON append log.
- **Consumo AP**: solo dentro `resolve_action` invocato da `resolve_round`. Se un intent viene saltato (actor/target dead), il suo AP non è consumato.
- **Determinism**: stesso stato + stessi intent + stesso rng + stesso catalog → stesso `next_state`. 29 test lo verificano end-to-end.

### Fase `round_phase` come state machine

```
None / "planning" --begin_round--> "planning"
"planning" --declare_intent--> "planning"  (preview-only, idempotente)
"planning" --clear_intent--> "planning"
"planning" --commit_round--> "committed"
"committed" --resolve_round--> "resolving" (transitorio) --> "resolved"
"resolved" --begin_round--> "planning"  (prossimo round)
```

Transizioni invalide sollevano `ValueError` con messaggio esplicito. Testato in `test_declare_intent_rejects_wrong_phase`, `test_commit_round_rejects_non_planning_phase`, `test_resolve_round_requires_committed_phase`.

### Compatibilità con lo schema

`packages/contracts/schemas/combat.schema.json` al livello di `CombatState` dichiara `additionalProperties: true`. I nuovi campi `round_phase` e `pending_intents` sono additivi e non richiedono schema bump. Nessun campo legacy è deprecato in questa patch:

- `initiative_order` → mantenuto, ora rappresenta "ordine di default tiebreak" (informativo)
- `active_unit_id` → mantenuto, ora advisory: "ultimo unit che ha risolto" o "unit in corso di resolving"
- `turn` → mantenuto, rappresenta il numero di round (incrementale)
- `units[i].initiative` → stesso schema, **semantica riletta come reaction speed**
- `log` → invariato, ogni round aggiunge gli entry dei soli intent effettivamente risolti

## Conseguenze

### Positive

- Il rules engine Python diventa la **reference implementation** del loop corretto.
- `demo_cli.py` può adottare gradualmente il nuovo loop senza rompere i test esistenti.
- Il client/UI può implementare la preview della planning phase chiamando `build_resolution_queue` e `compute_resolve_priority` senza toccare lo stato.
- Test di determinismo garantiti: 29 nuovi test + 69 di resolver + 26 di hydration = 124 test verdi.
- **Nessuna modifica al resolver atomico** → zero rischio di regressione sul layer di bilanciamento d20.

### Negative / Rischi

- **Disallineamento temporaneo con `apps/backend/routes/session.js`**: il Node session engine resta sequenziale fino a una migrazione dedicata. Oggi i due layer sono indipendenti (non c'è bridge runtime), quindi il disallineamento non produce bug funzionali — solo il rules engine Python ha il modello nuovo.
- **Fase `planning` idempotente implicita**: rilanciare `declare_intent` per la stessa unit sovrascrive silenziosamente. Questo è voluto (latest-wins) ma può confondere un utente che non conosce il modello. Mitigato dalla doc.
- **Reazioni non first-class**: parry/counter restano dentro `resolve_action` come flag `parry_response`. Una versione futura dovrà promuoverle a intent con priority propria (vedi follow-ups).
- **Tabella `ACTION_SPEED` hardcoded**: in attesa di spostamento in un YAML di balance.

### Follow-ups (tracciati in `docs/combat/round-loop.md` §6)

1. Reazioni come intent first-class
2. `ACTION_SPEED` da `packs/evo_tactics_pack/data/balance/action_speed.yaml`
3. Interrupt window (intent condizionati)
4. Migrazione Node session engine al round-based model
5. `preview_round(state, ...)` per UI di "cosa succederebbe se..."
6. Timer opzionale sulla planning phase

## Test

- `tests/test_round_orchestrator.py`: 29 test nuovi (verdi)
- `tests/test_resolver.py`: 69 test (verdi, nessuna regressione)
- `tests/test_hydration.py`: 26 test (verdi, nessuna regressione)
- `tests/test_demo_cli.py`: 16 test (verdi, demo_cli non modificato)
- Totale rules engine: **140/140 verdi** in ~640ms

## Riferimenti

- Implementazione: `services/rules/round_orchestrator.py`
- Test: `tests/test_round_orchestrator.py`
- Doc: `docs/combat/round-loop.md`
- ADR precedente: [`ADR-2026-04-13-rules-engine-d20.md`](ADR-2026-04-13-rules-engine-d20.md)
- Hub combat: [`docs/hubs/combat.md`](../hubs/combat.md)
- Schema contracts: `packages/contracts/schemas/combat.schema.json`

## Consumer di prodotto

Questo ADR e' recepito dal [`Final Design Freeze v0.9 §7.1 Nucleo canonico`](../core/90-FINAL-DESIGN-FREEZE.md) come parte del combat system finale: dichiara `initiative` come reaction speed passiva e il round loop shared-planning → commit → ordered-resolution sopra il resolver atomico. Il freeze non sostituisce questo ADR: in caso di conflitto, **vince l'ADR** per tutto cio' che riguarda confini architetturali e contratti tecnici (vedi [`SOURCE_AUTHORITY_MAP §4.1`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)).
