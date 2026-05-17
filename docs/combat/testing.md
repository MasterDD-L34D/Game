---
title: Combat Testing Guide
description: Come scrivere unit test e snapshot test per il rules engine d20.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Combat Testing Guide

Il rules engine è coperto da **82 test Python** (64 resolver + 18 hydration) e **45 test Node** (contract validation su schema, snapshot, trait mechanics). Questo documento spiega l'infrastruttura, le convenzioni e come aggiungere/aggiornare test.

## Panoramica test esistenti

| File                                             | Tipo          | Test | Scope                                                                                            |
| ------------------------------------------------ | ------------- | ---- | ------------------------------------------------------------------------------------------------ |
| `tests/test_resolver.py`                         | Python unit   | 64   | Funzioni pure del resolver: pipeline attack, status, PT spend, parry, stress, formule            |
| `tests/test_hydration.py`                        | Python unit   | 18   | `hydrate_encounter`, `load_trait_mechanics`, aggregazione resistenze, initiative ordering        |
| `tests/api/contracts-combat.test.js`             | Node contract | 23   | Schema JSON validation: CombatState, action, turn_log, status_effect, roll_result, parry_result  |
| `tests/api/contracts-hydration-snapshot.test.js` | Node snapshot | 7    | Hydration di un encounter reale contro snapshot `tests/snapshots/hydration_caverna.json`         |
| `tests/api/contracts-trait-mechanics.test.js`    | Node contract | 15   | `trait_mechanics.yaml` valida contro schema + allineamento con `traits_inventory.json` (33 core) |

## Eseguire i test

```bash
# Python: tutti i test del rules engine
PYTHONPATH=services/rules pytest tests/test_resolver.py tests/test_hydration.py -v

# Singolo file
PYTHONPATH=services/rules pytest tests/test_resolver.py -v

# Test specifico per pattern
PYTHONPATH=services/rules pytest tests/test_resolver.py -k "rage" -v

# Node: tutti i contract test combat (fast, ~1s totali)
node --test tests/api/contracts-combat.test.js \
            tests/api/contracts-hydration-snapshot.test.js \
            tests/api/contracts-trait-mechanics.test.js
```

Il set Python non richiede `ORCHESTRATOR_AUTOCLOSE_MS` o altri env (il resolver è puro). Il set Node richiede solo le node_modules (`npm ci`).

## Scrivere un unit test del resolver

Il pattern canonico:

```python
import pytest
from services.rules.resolver import resolve_action


def _make_state(actor_trait_ids=None, target_tier=2, target_defense_mod=0):
    """Factory helper per uno state minimale 2-unit."""
    return {
        "session_id": "test",
        "seed": "s-test",
        "turn": 1,
        "initiative_order": ["a", "t"],
        "active_unit_id": "a",
        "log": [],
        "units": [
            {
                "id": "a", "species_id": "test-sp", "side": "party",
                "tier": 2,
                "hp": {"current": 30, "max": 30}, "ap": {"current": 2, "max": 2},
                "armor": 0, "initiative": 10, "stress": 0.0,
                "pt": 2, "reactions": {"current": 1, "max": 1},
                "trait_ids": actor_trait_ids or [],
                "statuses": [], "resistances": [],
            },
            {
                "id": "t", "species_id": "test-sp", "side": "hostile",
                "tier": target_tier,
                "hp": {"current": 40, "max": 40}, "ap": {"current": 2, "max": 2},
                "armor": 0, "initiative": 8, "stress": 0.0,
                "pt": 0, "reactions": {"current": 1, "max": 1},
                "trait_ids": [], "statuses": [], "resistances": [],
            },
        ],
    }


def _make_catalog(**kwargs):
    """Factory helper per un catalog minimale."""
    return {"artigli_sette_vie": {"attack_mod": 1, "damage_step": 1}, **kwargs}


def _fixed_rng(value: float):
    """RNG che restituisce sempre lo stesso valore. Utile per tiri deterministici."""
    return lambda: value


def test_resolve_attack_with_artigli_hits_at_mos_4():
    state = _make_state(actor_trait_ids=["artigli_sette_vie"])
    catalog = _make_catalog()
    action = {
        "id": "a-1",
        "type": "attack",
        "actor_id": "a",
        "target_id": "t",
        "ap_cost": 1,
        "damage_dice": {"count": 1, "sides": 8, "modifier": 2},
    }

    # Con rng fisso a 0.7, d20 = 1 + floor(0.7 * 20) = 1 + 14 = 15
    # attack_mod da artigli = +1, total = 16
    # CD = 10 + tier(2) + defense_mod(0) = 12
    # mos = 16 - 12 = 4, step_count = (4 // 5) + 1 = 1
    # damage rolled (fisso a 0.7): ..., + step_bonus: ..., - armor: 0
    result = resolve_action(state, action, catalog, rng=_fixed_rng(0.7))

    roll = result["turn_log_entry"]["roll"]
    assert roll["success"] is True
    assert roll["mos"] == 4
    assert roll["damage_step"] == 1
    assert result["turn_log_entry"]["damage_applied"] > 0
```

**Pattern ricorrenti**:

- **RNG fisso**: per test deterministici, usa `_fixed_rng(v)` dove `v` è un float tra 0 e 1. Il dado viene calcolato come `1 + floor(v * sides)`, quindi `v=0` → roll 1, `v=0.999` → roll `sides`.
- **State minimale**: usa `_make_state()` e sovrascrivi solo i campi rilevanti per il test. Evita di copia-incollare state interi.
- **Un asserto per concetto**: test `test_resolve_attack_with_X_hits_at_mos_Y` verifica solo il success e il mos. Test separato per damage. Test separato per status applicati. Non overloadare un test con 10 asserti.
- **Commento inline del calcolo**: scrivi nel commento come hai derivato i valori attesi (es. `d20 = 1 + floor(0.7 * 20) = 15`). Facilita il debugging quando il test si rompe.

## Scrivere un test per un nuovo status effect

Vedi la procedura completa in [status-effects-guide.md](status-effects-guide.md#aggiungere-un-nuovo-status-effect). In sintesi, per uno status `poisoned`:

```python
def test_resolve_attack_with_poisoned_reduces_damage_step():
    state = _make_state(actor_trait_ids=["artigli_sette_vie"])
    state["units"][0]["statuses"].append({
        "id": "poisoned",
        "intensity": 2,
        "remaining_turns": 3,
        "source_unit_id": None,
        "source_action_id": None,
    })
    # artigli_sette_vie dà damage_step +1
    # poisoned intensity=2 → -2 damage_step
    # effective damage_step = max(0, 1 - 2) = 0
    result = resolve_action(state, attack_action(), _make_catalog(), _fixed_rng(0.7))
    # ... asserzioni
```

## Scrivere un contract test (Node)

I contract test validano gli schemi JSON. Pattern in `tests/api/contracts-combat.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { combatSchema } = require('../../packages/contracts');
const { createSchemaValidator } = require('../../apps/backend/middleware/schemaValidator');

const SCHEMA_ID = 'contracts://combat/state';

function buildValidator() {
  const validator = createSchemaValidator();
  validator.registerSchema(SCHEMA_ID, combatSchema);
  return validator;
}

test('CombatState valido accetta stato minimale', () => {
  const validator = buildValidator();
  const state = {
    session_id: 'test-session',
    seed: 's1',
    turn: 1,
    initiative_order: ['u-1'],
    active_unit_id: 'u-1',
    units: [
      {
        id: 'u-1',
        species_id: 'sp-1',
        side: 'party',
        tier: 1,
        hp: { current: 10, max: 10 },
        ap: { current: 2, max: 2 },
        armor: 0,
        initiative: 5,
        stress: 0,
        statuses: [],
        resistances: [],
        trait_ids: [],
        pt: 0,
        reactions: { current: 1, max: 1 },
      },
    ],
    log: [],
  };
  assert.doesNotThrow(() => validator.validate(SCHEMA_ID, state));
});
```

**Pattern**:

- **Valido + invalido per ogni constraint**: per ogni campo required/enum/range, scrivi un test che lo accetta valido e un test che lo rifiuta invalido.
- **Costruisci state minimale**: non riusare lo snapshot, costruisci a mano per isolare il constraint.
- **`assert.doesNotThrow` per success, `assert.throws` per reject**: il validator lancia `SchemaValidationError` su fallimento.

## Aggiornare uno snapshot di hydration

Lo snapshot `tests/snapshots/hydration_caverna.json` è generato hydratando `docs/examples/encounter_caverna.md` + una party fissa. Se il tuo cambio all'hydration (o al catalog) ne modifica l'output, devi rigenerare.

**Procedura**:

1. Esegui lo script che rigenera lo snapshot (se esiste) o il test in "update mode":

```bash
# Se lo script dedicato esiste:
PYTHONPATH=services/rules python3 scripts/regenerate_hydration_snapshot.py

# Altrimenti, aggiorna manualmente:
#   - Apri tests/api/contracts-hydration-snapshot.test.js
#   - Trova il test che produce l'actual state
#   - Aggiungi temporaneamente: fs.writeFileSync(snapshotPath, JSON.stringify(state, null, 2))
#   - Esegui il test una volta, verifica il diff
#   - Rimuovi la riga di writeFile
```

2. **Verifica il diff manualmente** prima di committare. Uno snapshot update che cambia troppi campi è un warning: magari il cambio non è intenzionale.

3. Committa lo snapshot **insieme** al cambio che l'ha generato, con un commit message esplicito:

```
refactor(hydration): adjust hostile power scaling formula

Old: HP = 40 + 10*power, armor = 2 + power//2
New: HP = 50 + 8*power, armor = 2 + power//3

Snapshot regenerated: tests/snapshots/hydration_caverna.json
All 4 hostile units updated (h-01..h-04).
```

## Scrivere un contract test end-to-end per un nuovo trait

Se aggiungi un trait a `trait_mechanics.yaml`, assicurati che il contract test lo cattura:

```bash
# 1. Aggiungi trait all'inventory (docs/catalog/traits_inventory.json)
#    Aggiungi trait a trait_mechanics.yaml
#    Aggiorna count nel test (33 → 34)

# 2. Esegui contract test
node --test tests/api/contracts-trait-mechanics.test.js

# Ci dovrebbero essere 15 test passing.
# Se il conteggio non matcha, il gate fallisce con:
#   "traits_inventory.json deve esporre 33 core"

# 3. Per un trait defensive con resistenze, aggiungi un test Python che verifica
#    che il damage subito dal target sia ridotto correttamente:

def test_resolve_attack_vs_target_with_new_resistance():
    state = _make_state()
    state["units"][1]["trait_ids"] = ["nuovo_trait_defensive"]
    state["units"][1]["resistances"] = [{"channel": "ionico", "modifier_pct": 20}]
    catalog = {"nuovo_trait_defensive": {"defense_mod": 1}}
    action = {
        "id": "a-1", "type": "attack", "actor_id": "a", "target_id": "t",
        "ap_cost": 1, "channel": "ionico",
        "damage_dice": {"count": 1, "sides": 6, "modifier": 0},
    }
    result = resolve_action(state, action, catalog, _fixed_rng(0.9))
    # Verifica che il danno sia stato ridotto del 20%
```

## Best practices

**Do**:

- Usa RNG fisso (`_fixed_rng`) quando possibile. Solo per test di distribuzione (es. "su 1000 attack, il crit rate è ~5%") usa RNG reale.
- Nomina i test con il pattern `test_<funzione>_<scenario>_<esito_atteso>`. Es: `test_resolve_parry_contested_fails_when_natural_is_1`.
- Isola ogni meccanica in un test separato anche se sembra ridondante. Un test che verifica 10 cose è un test che ne verifica 0 quando fallisce.
- Aggiorna il test count in `tests/api/contracts-trait-mechanics.test.js` quando aggiungi/rimuovi core traits.

**Don't**:

- Non usare `random.seed()` manualmente nei test Python. Il resolver riceve `rng` come argomento, mock via quello.
- Non modificare `state` in-place nei test (il resolver già fa deep copy, ma i tuoi test dovrebbero riflettere la semantica di purezza).
- Non usare fixture complesse che nascondono la shape dello state. Se il test richiede uno state elaborato, costruiscilo esplicitamente: il test deve essere leggibile senza decodificare 3 helper.
- Non commentare un test flaky con `@pytest.mark.skip` senza aprire un ticket. Un test skip è debt.

## Coverage goals

- **64+ test resolver**: copertura completa delle funzioni pubbliche di `resolver.py`. Ogni costante di status (`RAGE_*`, `PANIC_*`, ecc.) dovrebbe avere almeno un test che ne verifica l'effetto.
- **18+ test hydration**: copertura di `hydrate_encounter` per scenari party-only, hostile-only, mixed, trait sconosciuti, initiative order.
- **45+ test contract Node**: schema validation positiva e negativa per ogni campo required dello schema combat.

Il coverage tool (`pytest-cov`) non è attualmente configurato, ma può essere aggiunto con:

```bash
pip install pytest-cov
PYTHONPATH=services/rules pytest tests/test_resolver.py --cov=services.rules --cov-report=html
```

## Riferimenti

- File di test: `tests/test_resolver.py`, `tests/test_hydration.py`, `tests/api/contracts-*.test.js`
- Snapshot di riferimento: `tests/snapshots/hydration_caverna.json`
- Contratto di purezza del resolver: [resolver-api.md](resolver-api.md#contract-di-purezza)
- RNG determinismo: [determinism.md](determinism.md)
- Come aggiungere trait: [trait-mechanics-guide.md](trait-mechanics-guide.md#procedura-aggiungere-un-nuovo-trait)
- Come aggiungere status: [status-effects-guide.md](status-effects-guide.md#aggiungere-un-nuovo-status-effect)
