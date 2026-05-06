---
title: 'ADR-2026-04-16: Migrazione Node session engine al round-based combat model'
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# ADR-2026-04-16: Migrazione Node session engine al round-based combat model

- **Data**: 2026-04-16
- **Stato**: Proposed
- **Owner**: Combat Team + Backend Team
- **Stakeholder**: AI Policy Engine (sistemaTurnRunner), Frontend Playtest (client HTML), QA Automation (45 test AI)

## Contesto

Dopo [`ADR-2026-04-15`](ADR-2026-04-15-round-based-combat-model.md) il rules engine Python (`services/rules/round_orchestrator.py`) implementa il round loop **shared planning → commit → ordered resolution** come reference implementation. Il loop Python e' ora maturo: supporta 2 trigger events (`attacked`, `damaged`), 2 payload types (`parry`, `trigger_status`), 174 test verdi, cascade FD-IDs chiuso, bundle Final Design v0.9 pubblicato.

Il Node session engine (`apps/backend/routes/session.js`) resta pero' **sequenziale**: usa `session.turn_order` + `session.turn_index` + `session.active_unit` per driver un modello "una-unita'-alla-volta". Disallineamento dichiarato in ADR-2026-04-15 Conseguenze/Negative:

> **Disallineamento temporaneo con `apps/backend/routes/session.js`**: il Node session engine resta sequenziale fino a una migrazione dedicata. Oggi i due layer sono indipendenti (non c'è bridge runtime), quindi il disallineamento non produce bug funzionali — solo il rules engine Python ha il modello nuovo.

Il disallineamento non blocca il gameplay (i due layer non si parlano a runtime), ma crea:

1. **Drift semantico**: `initiative` nel Node engine significa "turn order", nel Python "reaction speed". Stessa keyword, significati incompatibili.
2. **Debito di feature**: tutte le estensioni del round orchestrator (reaction events, payload types, cooldown, predicates DSL) vivono solo in Python.
3. **Confusione per contributor**: un developer che tocca il combat non sa quale dei due layer e' "quello vero".

Questo ADR propone la **migrazione del Node session engine al round model**, mantenendo retrocompatibilita' API durante la transizione.

## Decisione

Migrare `apps/backend/routes/session.js` al round-based combat model seguendo un approccio **additive → transitional → default-switch → cleanup**. Le API legacy vengono preservate come wrapper durante la transizione, poi deprecate, infine rimosse.

### 1. Mapping API

| Endpoint legacy  | Endpoint round-based          | Note                                                                                  |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `POST /start`    | `POST /start` (invariato)     | Risposta estesa: `round_phase: 'planning'`, `pending_intents: []`                     |
| `POST /action`   | **deprecato**, wrapper        | Internamente: `declare-intent` + `commit-round` + `resolve-round` per quel solo actor |
| `POST /turn/end` | **deprecato**, wrapper        | Internamente: `resolve-round` se ci sono intents pendenti                             |
| —                | `POST /declare-intent`        | Nuovo, preview-only, accetta `{unit_id, action}`                                      |
| —                | `POST /clear-intent/:unit_id` | Nuovo, rimuove intent dichiarato                                                      |
| —                | `POST /commit-round`          | Nuovo, lock intents, transizione fase                                                 |
| —                | `POST /resolve-round`         | Nuovo, esegue resolution queue, restituisce turn_log_entries + reactions_triggered    |
| `GET /state`     | `GET /state` (invariato)      | Risposta estesa con `round_phase` e `pending_intents`                                 |

### 2. CombatState extension

I campi legacy restano per retrocompatibilita':

```json
{
  "turn_order": ["alpha", "bravo"],
  "turn_index": 0,
  "active_unit": "alpha",
  "turn": 3,

  "round_phase": "planning",
  "pending_intents": [],
  "reaction_cooldown_remaining": {}
}
```

I campi `turn_order` / `turn_index` / `active_unit` diventano **advisory** (usati dalla UI per display "chi sta risolvendo ora") ma non guidano piu' il flusso.

### 3. AI policy engine

`services/ai/policy.js` (REGOLA_001/002/003) e `services/ai/sistemaTurnRunner.js` richiedono ripensamento:

- **Oggi**: il runner esegue turni sequenziali, un unit alla volta, fino a esaurimento AP.
- **Nuovo**: il runner **dichiara intents** in fase planning, un intent per unit_id controllato da sistema. Il commit e il resolve sono chiamati dall'orchestratore principale.

Pattern pseudo-code:

```js
// Before (oggi)
async function runSistemaTurn(session) {
  while (unit.ap_remaining > 0) {
    const action = policy.selectAiPolicy(unit, target);
    await performAttack(session, unit, target);
  }
}

// After (round model)
async function declareSistemaIntents(session) {
  const sistemaUnits = session.units.filter((u) => u.controlled_by === 'sistema');
  for (const unit of sistemaUnits) {
    const action = policy.selectAiPolicy(unit, pickLowestHpEnemy(session, unit));
    session.pending_intents.push({ unit_id: unit.id, action });
  }
}
```

### 4. Feature flag

Introdurre un feature flag `USE_ROUND_MODEL` (env var o config) con default `false` durante la transizione:

- `false` (default): session engine esegue il vecchio flusso sequenziale; le API `/declare-intent`, `/commit-round`, `/resolve-round` rispondono `503 Not Enabled`.
- `true`: session engine esegue il round flow; le API legacy `/action`, `/turn/end` diventano wrapper.

Il flag consente:

- Testing in ambiente di sviluppo senza rompere la produzione.
- Rollback immediato se si scoprono regressioni in playtest.
- Migrazione graduale dei 45 test AI (alcuni su USE_ROUND_MODEL=false, altri su true).

### 5. Test AI migration

I 45 test AI esistenti in `tests/ai/*.test.js` usano assert sul flusso sequenziale (es. `expect(session.active_unit).toBe('alpha')`). Vanno migrati in batch di 5 per commit:

- Batch 1: test di inizializzazione (start, build turn_order → build pending_intents)
- Batch 2: test di singolo turno (attack, move, defend)
- Batch 3: test di policy (REGOLA_001 approach/attack, REGOLA_002 retreat, REGOLA_003 kite)
- Batch 4: test di status (panic skip, rage bonus, stunned skip)
- Batch 5: test di trait effects (pelle_elastomera damage reduction, ferocia kill → rage, ecc.)
- Batch 6: test di fine round + vittoria/sconfitta
- Batch 7: test di iniziativa + reaction speed (sprint-020)
- Batch 8: test di facing/backstab (sprint-022)
- Batch 9: edge cases rimanenti

Ogni batch include un'entry nel changelog e un commit dedicato.

### 6. Client HTML playtest

`apps/backend/public/Evo-Tactics — Playtest.html` usa `fetch` sugli endpoint `/action` e `/turn/end`. Con il feature flag `true`, i wrapper funzionano, quindi il client HTML continua a girare senza modifiche immediate. Una fase successiva puo' migrare il client per usare direttamente `/declare-intent` + `/commit-round` + `/resolve-round`, aggiungendo una UI di planning phase con preview dei cost/target.

## Checklist di migrazione

Ordine consigliato di esecuzione, un task per commit:

- [ ] **M1. Feature flag + state extension** — aggiungi `USE_ROUND_MODEL` env var + `round_phase`/`pending_intents` nello stato session. Nessun cambiamento di comportamento. 1 commit.
- [ ] **M2. Endpoint stub** — aggiungi `/declare-intent`, `/clear-intent/:id`, `/commit-round`, `/resolve-round` come stub che rispondono `503` se flag off. 1 commit.
- [ ] **M3. Implementazione round lifecycle** — porta `begin_round`, `declare_intent`, `commit_round`, `resolve_round` in Node seguendo la reference Python. 1 commit, ~400 righe.
- [ ] **M4. AI policy engine refactor** — `sistemaTurnRunner.js` diventa `declareSistemaIntents.js`. Aggiorna chiamate in `session.js`. 1 commit.
- [ ] **M5. Wrapper legacy endpoints** — `/action` e `/turn/end` diventano wrapper che chiamano il round flow internamente. Test `sistema` vs `player` flow. 1 commit.
- [ ] **M6..M14. Test AI migration** — 9 batch di test, 1 batch per commit. Ogni batch verde prima di passare al successivo.
- [ ] **M15. Client HTML playtest** — preservare il client esistente con wrapper, no modifica UI. 1 commit.
- [ ] **M16. Default switch** — flip `USE_ROUND_MODEL` default a `true`. Test completo regressione. 1 commit.
- [ ] **M17. Cleanup (opzionale)** — rimuovi wrapper legacy dopo 1 mese di stabilita' e nessun bug aperto. 1 commit.

**Totale stimato**: ~17 commit su 1 sprint dedicato di 5 giornate.

## Rischi

| Rischio                                                           | Severita' | Mitigazione                                                                                                            |
| ----------------------------------------------------------------- | :-------: | ---------------------------------------------------------------------------------------------------------------------- |
| Regressione su 45 test AI esistenti                               | **Alta**  | Feature flag consente test paralleli; batch migration step-by-step; ogni batch verde prima del successivo              |
| Client HTML playtest non aggiornato                               |   Media   | Wrapper legacy preservano compatibilita'; client continua a girare senza modifiche fino a M15                          |
| AI policy engine refactor distrugge REGOLA_001/002/003            |   Alta    | Test dedicati pre-refactor per baseline comportamento; confronto before/after su scenari canonici                      |
| Drift tra round_orchestrator.py e session.js se entrambi evolvono |   Media   | Round orchestrator Python rimane reference implementation; session.js deve restare **comportamentalmente equivalente** |
| Blast radius su endpoint REST in produzione                       |   Media   | Feature flag off in produzione durante transizione; flip a true solo dopo M16 verde                                    |
| Reattivita' UI (planning → commit → resolve richiede piu' click)  |   Bassa   | Client HTML preserva flow legacy 1-click via wrapper; nuovo flow e' opt-in per UI future                               |

## Rollback plan

1. **Fase transitoria (M1..M15)**: rollback banale, `USE_ROUND_MODEL=false` nell'env. Il session engine torna al flusso sequenziale. Nessuna perdita di dati.
2. **Post M16 default switch**: rollback = feature flag a false + revert dei commit M16..M17. Test AI migration batch restano verdi anche col flag off (grazie ai wrapper), quindi il rollback e' safe.
3. **Post M17 cleanup**: rollback = revert dei commit di cleanup. I wrapper legacy tornano disponibili. Potenziale perdita di 1 commit di cleanup code se servono fix nel frattempo.

Feature flag come safety net durante la transizione: abilita il rollback senza richiedere revert di codice.

## Stima effort

**1 sprint dedicato** (~5 giornate di lavoro full-time):

- Giorno 1: M1 + M2 + M3 (feature flag + stub + round lifecycle)
- Giorno 2: M4 + M5 (AI policy refactor + legacy wrappers)
- Giorno 3: M6..M10 (5 batch di test AI migration)
- Giorno 4: M11..M14 + M15 (4 batch test rimanenti + client HTML)
- Giorno 5: M16 + smoke test integrazione + review Master DD

**Prerequisiti**:

- Rules engine Python stabile (✅ gia' soddisfatto, 174 test verdi)
- Nessuna feature in corso su `session.js` (verificare prima di iniziare lo sprint)
- Disponibilita' del combat team per review di policy refactor

## Riferimenti

- [`docs/combat/round-loop.md`](../combat/round-loop.md) — reference del round model Python
- [`ADR-2026-04-15-round-based-combat-model.md`](ADR-2026-04-15-round-based-combat-model.md) — ADR precedente che introduce il modello
- [`services/rules/round_orchestrator.py`](../../services/rules/round_orchestrator.py) — reference implementation Python
- [`apps/backend/routes/session.js`](../../apps/backend/routes/session.js) — Node session engine (target della migrazione)
- [`apps/backend/services/ai/sistemaTurnRunner.js`](../../apps/backend/services/ai/sistemaTurnRunner.js) — AI runner da refactor
- [`tests/ai/`](../../tests/ai) — 45 test AI da migrare
- [Final Design Freeze v0.9 §7.1](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto del combat round-based

## Consumer di prodotto

Questo ADR chiude il **disallineamento temporaneo** dichiarato in ADR-2026-04-15 Conseguenze/Negative. Recepisce la decisione del round-based model come vincolo architetturale anche per il Node session engine. Dopo la migrazione, i due layer (Python rules engine + Node session engine) implementano la **stessa semantica** con interfacce diverse — Python come reference pura, Node come API-backed runtime.

Il [`Final Design Freeze v0.9 §7`](../core/90-FINAL-DESIGN-FREEZE.md) recepisce la convergenza dei due layer come parte del combat system finale shipping.
