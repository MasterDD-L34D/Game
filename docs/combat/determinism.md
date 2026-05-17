---
title: Determinism & RNG Namespacing
description: Come il rules engine garantisce riproducibilità dei combat tramite RNG namespacing.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Determinism & RNG Namespacing

Il rules engine è **deterministico**: dato un `(state, action, catalog, seed, namespace)`, `resolve_action` produce sempre lo stesso `(next_state, turn_log_entry)`. Questa proprietà è essenziale per:

- **Replay**: riprodurre un combat dalla log entry senza dipendere dalla wall clock o da stato esterno.
- **Test**: scrivere test unitari con RNG controllato senza mock fragili.
- **Snapshot**: paragonare un run contro uno snapshot di riferimento (`tests/snapshots/hydration_caverna.json`).
- **Debugging**: riprodurre un bug dato un seed + turn log senza "non riesco a riprodurre".

Questo documento spiega come il determinismo è implementato via `namespaced_rng` e quali sono le sue proprietà.

## Il contract di `namespaced_rng`

L'helper vive in `tools/py/game_utils/random_utils.py` ed è condiviso tra il rules engine e il flow pipeline (`services/generation/`).

```python
from game_utils.random_utils import namespaced_rng

rng = namespaced_rng(seed="s-2026-04-14", namespace="attack")
# rng è un RandomFloatGenerator: chiamate a rng() restituiscono float in [0.0, 1.0)
```

**Proprietà**:

1. **Deterministico su (seed, namespace)**: dato lo stesso `(seed, namespace)`, `rng` produce **sempre la stessa sequenza** di float, a prescindere dal thread, dal processo, dal sistema operativo.
2. **Indipendente tra namespace**: namespace diversi sullo stesso seed producono stream **indipendenti**. `namespaced_rng("s1", "attack")` e `namespaced_rng("s1", "parry")` non condividono stato.
3. **Algoritmo**: mulberry32 (LCG veloce a 32 bit), seedato da `hash(seed + namespace)`. La scelta è documentata nell'ADR-2026-04-13: stesso algoritmo del generation pipeline per riuso e test parity.

## Perché separato dal generation RNG

Il flow pipeline (`services/generation/orchestrator.py`) usa lo stesso helper `namespaced_rng` ma con **namespace diversi** (tipicamente `"species"`, `"biome"`, `"trait"`). Questa separazione garantisce che:

- Rigiocare un combat con lo stesso seed non consuma RNG del generation e viceversa.
- Un bug in un sotto-sistema non contamina l'altro tramite side effect sul global RNG state.
- I test possono usare lo stesso seed per casi diversi senza preoccuparsi di ordering.

Il namespace `"attack"` è il **default** del worker rules engine e viene usato per tutti i tiri di `resolve_action` (d20 attack + damage dice + parry). Il `resolve_parry` eredita il namespace del chiamante, non crea un sub-namespace.

## Come riprodurre un combat

Dato un turn log di un combat reale:

```json
{
  "session_id": "skydock-2026-04-14-01",
  "seed": "s-2026-04-14",
  "log": [
    {
      "turn": 1,
      "action": {...},
      "roll": {"natural": 17, "total": 19, "dc": 15, "success": true, ...},
      "damage_applied": 6,
      ...
    },
    ...
  ]
}
```

Per riprodurre il tiro `natural: 17` del turn 1, serve:

1. **Stesso seed**: `"s-2026-04-14"`.
2. **Stesso namespace**: `"attack"` (default) o l'esatto namespace passato al worker.
3. **Stesso stato di partenza**: l'initial `CombatState` prima dell'azione.
4. **Stesso catalog**: `trait_mechanics.yaml` identico (versioning tramite `schema_version`).
5. **Stesso ordine di azioni**: ogni action precedente consuma N tiri dall'RNG stream. Riprodurre solo il turn N richiede di ripetere tutti i 1..N-1 turni nell'ordine originale.

Pseudocodice per il replay:

```python
from services.rules.hydration import hydrate_encounter, load_trait_mechanics
from services.rules.resolver import resolve_action
from game_utils.random_utils import namespaced_rng

catalog = load_trait_mechanics("packs/evo_tactics_pack/data/balance/trait_mechanics.yaml")
state = hydrate_encounter(encounter, party, catalog, seed=original_seed, session_id=...)

for turn_entry in original_log:
    rng = namespaced_rng(original_seed, namespace="attack")
    # WARNING: ogni call a resolve_action crea un nuovo RNG dallo stesso seed.
    # Il tiro restituito sarà lo stesso solo se l'RNG è "fresh" — vedi caveat sotto.
    result = resolve_action(state, turn_entry["action"], catalog, rng)
    assert result["turn_log_entry"]["roll"]["natural"] == turn_entry["roll"]["natural"]
    state = result["next_state"]
```

## Caveat importante: fresh RNG per request

Guarda `services/rules/worker.py::_handle_resolve`:

```python
seed = _validate_str(payload, "seed")
namespace = payload.get("namespace") or _DEFAULT_RNG_NAMESPACE
rng = namespaced_rng(seed, namespace)
return resolve_action(state=state, action=action, catalog=catalog, rng=rng)
```

**Ogni request** a `resolve-action` crea un `rng` fresco con lo stesso `(seed, namespace)`. Questo significa che:

- Se il parent invia N azioni con lo stesso seed e namespace, **ogni azione riparte dal primo valore dell'RNG stream**.
- L'N-esimo tiro di un attack singolo è sempre uguale (es. `rng()` → 0.42 → d20 rolls 9).
- Ma se vuoi stream diversi per azioni diverse nello stesso combat, devi variare il seed o il namespace a ogni request.

**Pattern consigliato**:

- **Opzione A (seed per turno)**: il parent passa un seed diverso per ogni request, es. `"s-base-turn-1"`, `"s-base-turn-2"`, ecc. Semplice ma richiede un seeding strategy.
- **Opzione B (namespace crescente)**: il parent passa lo stesso seed ma un namespace diverso, es. `"attack-001"`, `"attack-002"`, ecc. Più ordinato.
- **Opzione C (seed derivato dallo state)**: il parent deriva il seed dal turn + attack index, es. `hash(seed_base + "-" + turn + "-" + action_id)`. Più robusto ma richiede che il client sia consistente.

Attualmente il backend Node **non enforce** nessuno di questi pattern: è responsabilità del caller. In un replay affidabile, il pattern usato deve essere documentato nel log entry (es. salvare `rng_seed_effective` nel `turn_log_entry`).

## Caveat: stress breakpoints e ordine degli status

Gli status auto-applicati da `check_stress_breakpoints` sono deterministici **se l'ordine degli status esistenti è stabile**. La lista `unit.statuses` è un `list` Python (non `set`), quindi l'ordine è preservato nello state JSON.

Tuttavia:

- Un `apply_status` che fa refresh **non sposta la posizione** nella lista (modifica in-place).
- Un nuovo `apply_status` appende in fondo.

Se un replay serializza/deserializza lo state passando per un parser JSON che non preserva l'ordine degli array (raro ma possibile), il replay potrebbe divergere. Questa è una gap teorica che nella pratica non si verifica (JSON parser standard preservano l'ordine degli array).

## Riproducibilità vs performance

Il `namespaced_rng` non fa caching dello stream: ogni invocazione consuma `hash(seed+namespace)` e inizializza un nuovo LCG. Questo è O(1) ma non zero (~1µs per init).

Se il worker dovesse gestire migliaia di azioni al secondo, questo overhead potrebbe essere visibile. Nella pratica, il bottleneck del worker è `deepcopy(state)` e il parsing JSON, non l'RNG init. Non ottimizzare finché non misurato.

## Proprietà formali

Dato lo stesso input:

- `resolve_action(s, a, c, rng)` == `resolve_action(s, a, c, rng)` ✅
- `hydrate_encounter(e, p, c, seed, sid)` == `hydrate_encounter(e, p, c, seed, sid)` ✅
- `begin_turn(s, uid)` == `begin_turn(s, uid)` ✅ (non usa RNG — pure transform)
- `resolve_parry(t, rng, bonus, total)` == `resolve_parry(t, rng, bonus, total)` ✅
- `apply_status(u, id, dur, int, src_u, src_a)` == `apply_status(u, id, dur, int, src_u, src_a)` ✅

**Non deterministico**:

- Nessuna chiamata a `time.time()`, `uuid.uuid4()`, `os.urandom()` nel resolver/hydration/worker. Se un futuro contributor ne aggiunge una, rompe il contract.

## Checklist per cambi al resolver

Prima di mergiare un cambio a `services/rules/resolver.py`, verifica:

- [ ] Il nuovo codice non usa `random.random()` direttamente. Se serve un random value, passa per `rng`.
- [ ] Il nuovo codice non usa `time.time()`, `datetime.now()`, `uuid.uuid4()`, `os.urandom()`.
- [ ] Il nuovo codice non muta globale. Variabili module-level aggiunte devono essere immutabili (costanti, frozenset).
- [ ] Il nuovo test può passare anche con `rng = lambda: 0.5` (RNG fisso) se il test non deve stressare una distribuzione specifica.
- [ ] La snapshot di `hydration_caverna.json` viene rigenerata se l'hydration cambia il risultato. Vedi [testing.md](testing.md).

## Riferimenti

- Implementazione `namespaced_rng`: `tools/py/game_utils/random_utils.py`
- Worker che istanzia rng: `services/rules/worker.py::_handle_resolve`
- Test di determinismo end-to-end: `tests/api/contracts-hydration-snapshot.test.js`
- ADR-2026-04-13 decisione 3 (RNG namespacing): [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md)
- Contract del resolver (purity): [resolver-api.md](resolver-api.md#contract-di-purezza)
