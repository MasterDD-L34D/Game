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

## Scope

Motore regole d20 per il loop tattico: resolver di azione, idratazione trait meccanici, demo CLI e worker bridge.

## File principali

- `services/rules/resolver.py` — resolver d20 (attacco, difesa, danno, Margin of Success)
- `services/rules/hydration.py` — idratazione trait meccanici da `trait_mechanics.yaml`
- `services/rules/demo_cli.py` — CLI dimostrativa per simulare turni di combattimento
- `services/rules/worker.py` — worker bridge per integrazione backend

## Dati di bilanciamento

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — fonte unica di verita per i valori meccanici dei trait (attack_mod, defense_mod, damage_step, resistances, cost_ap, active_effects).

## Schema

- `packages/contracts/schemas/combat.schema.json` — schema JSON per i payload di combattimento.

## ADR di riferimento

- [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md) — decisioni architetturali, scelte di linguaggio e gate sui trait meccanici.

## Comandi demo

```bash
# Simulazione turno di combattimento
PYTHONPATH=services/rules python3 services/rules/demo_cli.py

# Test unitari rules engine
PYTHONPATH=services/rules pytest tests/test_rules_engine.py

# Validazione schema combattimento
npm run schema:lint
```

## Limitazioni correnti

Le seguenti funzionalita sono segnalate nell'ADR come non ancora implementate o parziali:

- **Furia / Panico**: status marcati nel resolver ma senza logica comportamentale completa.
- **Azioni abilita**: gli effetti attivi dei trait (`active_effects`) sono NOOP — il campo esiste nello schema ma non viene consumato dal resolver.
- **Parata contestata**: il tiro di parata reattivo (d20 vs d20) non e ancora cablato nel flusso di risoluzione.
- **Spinta (PT spend)**: la spesa di Punti Tecnica per ottenere bonus offensivi o effetti speciali e prevista ma non implementata.
