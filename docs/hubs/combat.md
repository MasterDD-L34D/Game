---
title: Combat Hub
description: Hub canonico per il rules engine d20 e la pipeline di combattimento tattico.
tags: [combat, rules-engine, d20]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-13
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Combat Hub

## Scope

- Rules engine d20: `services/rules/`
- Dati di bilanciamento: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`

## File principali

| File                          | Ruolo                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| `services/rules/resolver.py`  | Risoluzione d20: tiri attacco, MoS, danni a step, status effect |
| `services/rules/hydration.py` | Costruzione CombatState da encounter JSON + party + catalogo    |
| `services/rules/demo_cli.py`  | CLI demo combattimento (modalità auto e interattiva)            |
| `services/rules/worker.py`    | Stub bridge JSON-line per integrazione Node                     |
| `trait_mechanics.yaml`        | Catalogo meccaniche trait (source of truth bilanciamento)       |

## Documenti live

- [ADR Rules Engine D20](../adr/ADR-2026-04-13-rules-engine-d20.md)
- [Sistema Tattico](../10-SISTEMA_TATTICO.md)
- [Regole D20 TV](../11-REGOLE_D20_TV.md)

## Come lanciare la demo

```bash
# Demo automatica (10 round max, seed riproducibile)
PYTHONPATH=tools/py python -m services.rules.demo_cli --auto --seed demo-1 --max-rounds 10

# Demo interattiva (scelta manuale azioni)
PYTHONPATH=tools/py python -m services.rules.demo_cli --seed demo-1
```

## Gate principali

- `PYTHONPATH=tools/py pytest tests/test_resolver.py tests/test_hydration.py`

## Limitazioni correnti (deferred da ADR)

- Nessuna integrazione API HTTP (solo CLI e bridge stub).
- Worker JSON-line (`worker.py`) è uno stub, non ancora collegato al pool Node.
- Mancano status effect avanzati (stun multi-round, buff/debuff compositi).
- Nessun supporto multi-target o AoE nel resolver.
- Il bilanciamento numerico è preliminare e richiede playtest iterativi.
