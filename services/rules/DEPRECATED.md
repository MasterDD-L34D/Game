# ⚠️ DEPRECATED — services/rules/ Python engine

**Deprecation date**: 2026-04-19
**ADR**: [ADR-2026-04-19 Kill Python rules engine](../../docs/adr/ADR-2026-04-19-kill-python-rules-engine.md)

## Stato

🟡 **PHASE 1: Deprecation mark active** (feature freeze incoming).

Questo directory contiene il rules engine d20 Python originale (sprint 6xxx 2025), pensato come source-of-truth per tabletop Master DM + digital companion bridge.

**User direction 2026-04-19**: "1 solo gioco online, senza master" → tabletop DM mode non è roadmap. Python rules engine = duplicato rispetto al runtime canonical **Node** (`apps/backend/`).

## Cosa NON fare

- ❌ Non aggiungere nuove features qui
- ❌ Non fixare bug se non blocking (preferire porting a Node)
- ❌ Non referenziare da nuovo codice (import Python rules)
- ❌ Non estendere test suite Python rules (`tests/test_resolver.py`, `tests/test_hydration.py`, `tests/test_round_orchestrator.py`)

## Cosa fare al posto

- ✅ Nuova logica combat → `apps/backend/services/combat/*.js`
- ✅ Nuova resistance logic → `apps/backend/services/combat/resistanceEngine.js` (M6-#1)
- ✅ Round/ability logic → `apps/backend/services/roundOrchestrator.js` + `abilityExecutor.js`
- ✅ Nuovi test → `tests/ai/*.test.js` (Node native)

## Phase roadmap

| Phase              |        Status        | Action                                      |
| ------------------ | :------------------: | ------------------------------------------- |
| 1 Deprecation mark |   🟢 active (now)    | Header comments + this file                 |
| 2 Feature freeze   | pending user confirm | No commits to `services/rules/*`            |
| 3 Removal          |      pending PR      | Delete subdir + Python tests + master_dm.py |

## File inventario (tutti deprecated)

| File                    | Role                             | Node replacement                                                                             |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `resolver.py`           | d20 attack + resistance + status | `apps/backend/services/combat/resistanceEngine.js` (partial M6-#1), session.js performAttack |
| `hydration.py`          | CombatState builder              | Session init in `apps/backend/routes/session.js` /start                                      |
| `round_orchestrator.py` | Round phases + intent queue      | `apps/backend/services/roundOrchestrator.js`                                                 |
| `trait_effects.py`      | Trait evaluation 2-pass          | `apps/backend/services/traitEffects.js`                                                      |
| `grid.py`               | Hex axial + pathfinding          | `apps/backend/services/ai/hexGrid.js`                                                        |
| `worker.py`             | Bridge Node→Python               | N/A (no consumer Node)                                                                       |
| `demo_cli.py`           | CLI tabletop DM                  | N/A (tabletop feature morta)                                                                 |
| `__init__.py`           | Package init                     | Obsolete post-removal                                                                        |

## Test suite

- `tests/test_resolver.py` — 83 test
- `tests/test_hydration.py` — 28 test
- `tests/test_round_orchestrator.py` — 124 test
- `tests/test_trait_effects.py` — 25 test

Rimangono CI attivi come regression safety net finché Phase 3.

## Consumer Python external

- `tools/py/master_dm.py` — tabletop DM REPL (deprecated, feature morta)

## Rollback

Phase 1 = docs + headers only. Git revert instant.

## Riferimenti

- [ADR kill Python rules engine](../../docs/adr/ADR-2026-04-19-kill-python-rules-engine.md) — full rationale
- [M6 iter2b baseline](../../docs/playtest/2026-04-19-m6-iter2b-baseline.md) — evidence Node path canonical
- [M6 resistance spike evidence](../../docs/playtest/2026-04-19-m6-resistance-spike-evidence.md) — Flint review
