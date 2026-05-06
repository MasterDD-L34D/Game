---
title: Combat Workstream — Overview
description: Indice dei documenti del rules engine d20 e navigazione per workstream combat.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Combat Workstream — Overview

Il workstream **combat** raccoglie la documentazione del rules engine d20 di Evo Tactics: il sistema che risolve un turno di combattimento tattico a partire da un `CombatState` e una `action`, producendo il prossimo stato e una entry del turn log.

Il codice vive sotto `services/rules/` (~1,900 righe di Python, 82 test) e il contratto dati è in `packages/contracts/schemas/combat.schema.json`. La fonte unica per i valori meccanici dei trait è `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`.

## Mappa documentazione

### Iniziare

- [Combat Hub](../hubs/combat.md) — punto di atterraggio del workstream con link ad ADR, schema e demo CLI.
- [data-flow.md](data-flow.md) — diagrammi ASCII end-to-end: encounter JSON → hydration → resolve → response. Partire da qui per capire come i dati si muovono nel sistema.

### API reference

- [resolver-api.md](resolver-api.md) — API reference strutturato di `services/rules/resolver.py`: entry point, helper formule, costanti, side effects. Contratto pubblico del modulo.

### Guide di estensione

- [trait-mechanics-guide.md](trait-mechanics-guide.md) — come popolare o modificare una entry di `trait_mechanics.yaml`, con esempi worked per offensive/defensive/hybrid. _(PR B2)_
- [status-effects-guide.md](status-effects-guide.md) — catalog dei 5 status implementati (bleeding, fracture, disorient, rage, panic) e procedura per aggiungerne di nuovi. _(PR B2)_
- [action-types-guide.md](action-types-guide.md) — action types supportati, PT spend (perforazione / spinta), parry response e ability stub. _(PR B2)_

### Integrazione e operations

- [worker-bridge.md](worker-bridge.md) — protocollo JSON-line stdin/stdout per chiamare il rules engine dal backend Node. _(PR B3)_
- [determinism.md](determinism.md) — RNG namespacing e riproducibilità dei combat. _(PR B3)_
- [testing.md](testing.md) — come scrivere unit test e snapshot test del resolver. _(PR B3)_

## Scope e non-scope

**In scope per il rules engine:**

- Risoluzione di azioni d20 (attack, defend, parry, ability stub, move) su un CombatState.
- Idratazione di encounter + party in un CombatState iniziale.
- Gestione di status effect (bleeding/fracture/disorient/rage/panic), stress breakpoints, PT spend.
- Determinismo via `namespaced_rng(seed, namespace)`.
- Contratto dati `combat.schema.json` + schema `traitMechanics.schema.json`.

**Fuori scope (vive altrove):**

- Taxonomy e anagrafiche trait/species/biomes — vedi repo `MasterDD-L34D/Game-Database` (sistema separato, non invocato a runtime dal rules engine).
- Generation pipeline (species builder, biome synthesizer) — vedi `docs/hubs/flow.md` e `services/generation/`.
- Telemetry e dashboard — vedi `docs/hubs/atlas.md`.
- UI interattiva / HUD combat — vedi `docs/hubs/frontend/` (atlas workstream).

## File principali del codice

| File                          | Righe | Responsabilità                                                                                                                    |
| ----------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| `services/rules/resolver.py`  | ~810  | Funzioni pure: `resolve_action`, `begin_turn`, `apply_status`, `resolve_parry`, `apply_pt_spend`, formule damage/resistance/armor |
| `services/rules/hydration.py` | ~310  | `hydrate_encounter`, `load_trait_mechanics`, costruzione party/hostile units, aggregazione resistenze                             |
| `services/rules/demo_cli.py`  | ~520  | CLI interattiva/auto: `run_combat`, action builders, pretty printer stato + turn log                                              |
| `services/rules/worker.py`    | ~265  | Bridge JSON-line stdin/stdout verso il backend Node, heartbeat, catalog caching                                                   |

Test corrispondenti:

| Test file                                        | Test | Scope                                                           |
| ------------------------------------------------ | ---- | --------------------------------------------------------------- |
| `tests/test_resolver.py`                         | 64   | Unit test per ogni funzione pubblica + scenari end-to-end       |
| `tests/test_hydration.py`                        | 18   | Encounter → CombatState, resistenze aggregate, initiative order |
| `tests/api/contracts-combat.test.js`             | 23   | Schema validation di CombatState, action, turn log              |
| `tests/api/contracts-hydration-snapshot.test.js` | 7    | Snapshot test di un encounter reale                             |
| `tests/api/contracts-trait-mechanics.test.js`    | 15   | Allineamento inventory vs mechanics (33 core traits)            |

## ADR di riferimento

[ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md) — decisioni di design: scelta di Python, separazione del balance layer in `trait_mechanics.yaml`, RNG namespacing, scope status effect in Fase 1.
