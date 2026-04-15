---
title: Combat Hub
description: Hub canonico per il rules engine d20 e il loop tattico.
tags: [combat, rules-engine, d20, tactical]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-14
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Combat Hub

Il rules engine d20 risolve le azioni tattiche del loop di combat: attack (d20 vs CD con MoS e damage step), parry contestata, PT spend, status effect (bleeding/fracture/disorient/rage/panic) e stress breakpoints. Il codice vive in `services/rules/` ed è completamente decoppiato dal generation pipeline, dal dashboard e dal repo `Game-Database`.

## Navigazione

Per una panoramica e mappa completa dei doc del workstream vedi [docs/combat/README.md](../combat/README.md).

### Quick links

- [Combat overview + mappa doc](../combat/README.md)
- [Data flow end-to-end (diagrammi)](../combat/data-flow.md) — come i dati passano da encounter JSON a turn log
- [Resolver API reference](../combat/resolver-api.md) — signature e semantica di ogni funzione pubblica
- [**Round loop** (shared planning → commit → ordered resolution)](../combat/round-loop.md) — nuovo orchestratore di round sopra il resolver atomico (ADR-2026-04-15)
- [Trait mechanics guide](../combat/trait-mechanics-guide.md) _(in arrivo, PR B2)_
- [Status effects guide](../combat/status-effects-guide.md) _(in arrivo, PR B2)_
- [Action types guide](../combat/action-types-guide.md) _(in arrivo, PR B2)_
- [Worker bridge](../combat/worker-bridge.md) _(in arrivo, PR B3)_
- [Determinism & RNG](../combat/determinism.md) _(in arrivo, PR B3)_
- [Testing guide](../combat/testing.md) _(in arrivo, PR B3)_

## File principali

- `services/rules/resolver.py` — resolver d20 puro (attack, MoS, damage_step, resistenze, armor, status modifiers)
- `services/rules/round_orchestrator.py` — orchestratore di round (planning → commit → resolve) sopra il resolver atomico
- `services/rules/hydration.py` — idratazione encounter/party → CombatState, caricamento trait_mechanics.yaml
- `services/rules/demo_cli.py` — CLI dimostrativa con modalità interactive e auto
- `services/rules/worker.py` — bridge JSON-line stdin/stdout verso backend Node

## Dati di bilanciamento

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — fonte unica di verità per i valori meccanici dei trait (attack_mod, defense_mod, damage_step, resistances, cost_ap, active_effects). 33 core trait allineati con `docs/catalog/traits_inventory.json`.

## Schemi

- `packages/contracts/schemas/combat.schema.json` — shape CombatState, action, turn_log, status_effect, roll_result, parry_result
- `packages/contracts/schemas/traitMechanics.schema.json` — shape del catalog

## ADR

- [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md) — scelte di linguaggio (Python), gate sul balance layer separato, RNG namespacing, scope degli status in Fase 1.
- [ADR-2026-04-15: Round-based combat model](../adr/ADR-2026-04-15-round-based-combat-model.md) — nuovo loop shared-planning → commit → ordered-resolution, semantica di `initiative` come reaction speed.

## Comandi demo

```bash
# Simulazione interattiva di un turno di combattimento
PYTHONPATH=services/rules python3 services/rules/demo_cli.py

# Modalità auto (AI attacca il primo vivo) — utile per smoke test
PYTHONPATH=services/rules python3 services/rules/demo_cli.py --auto --max-rounds 10

# Test unitari resolver + hydration
PYTHONPATH=services/rules pytest tests/test_resolver.py tests/test_hydration.py

# Validazione schema e allineamento inventory ↔ mechanics
node --test tests/api/contracts-combat.test.js tests/api/contracts-trait-mechanics.test.js
```

## Stato implementazione (Phase 2)

- **Furia / Panico**: implementati con logica completa — breakpoint stress (0.5 / 0.75), intensity, bonus/malus offensivi e difensivi. Panic blocca PT spend (azioni concentrate).
- **Parata contestata**: `resolve_parry()` implementata — tiro d20 reattivo del target con `parry_bonus`, opt-in via `action.parry_response`. Fallback a `PARRY_CD=12` se `attack_total` non fornito.
- **PT spend**: `perforazione` (armor -2) e `spinta` (status sbilanciato sul target) implementati con consumo pool PT e validazione. Panic impedisce la spesa.
- **Status effect**: bleeding (HP tick in begin_turn), fracture (step reduction), disorient (attack malus), rage (furia cieca), panic (malus + block PT) — tutti consumati dal resolver.
- **Azioni abilità**: il campo `active_effects` dei trait esiste nello schema ma è **NOOP** — non viene consumato dal resolver. Deferred a Fase 3 (vedi [action-types-guide.md](../combat/action-types-guide.md) quando disponibile).
