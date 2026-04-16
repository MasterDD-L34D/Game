---
title: Combat Hub
description: Hub canonico per il rules engine d20 e il loop tattico.
tags: [combat, rules-engine, d20, tactical]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-16
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
- [**Combat Canon Spec**](../combat/combat-canon.md) — specifica canonica unificata: action types, status shipping, timing, formule, non-scope (FD-020)
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

- `services/rules/resolver.py` — resolver d20 puro (attack, MoS, damage_step, resistenze, armor, status modifiers, `predict_combat()` W1, `merge_resistances()` W2, `compute_swarm_attacks()` W7, terrain_defense_mod W4)
- `services/rules/round_orchestrator.py` — orchestratore di round (planning → commit → resolve) sopra il resolver atomico
- `services/rules/hydration.py` — idratazione encounter/party → CombatState, caricamento trait_mechanics.yaml con supporto `inherits:` (O1 pattern)
- `services/rules/demo_cli.py` — CLI dimostrativa con modalità interactive e auto
- `services/rules/worker.py` — bridge JSON-line stdin/stdout verso backend Node
- `apps/backend/services/roundOrchestrator.js` — orchestratore round Node con `shouldAutoAdvance()` (B1 pattern)
- `apps/backend/services/roundStatechart.js` — round lifecycle come xstate statechart (X1 pattern)
- `apps/backend/services/statusEffectsMachine.js` — status effects come xstate parallel FSM (X2 pattern)
- `apps/backend/services/ai/sistemaActor.js` — Sistema AI come xstate actor model (X3 pattern)
- `apps/backend/services/ai/policy.js` — policy engine con `loadAiConfig()`, `applyProfile()`, `scoreObjectives()` (W3/W5/B3 pattern)
- `apps/backend/services/sessionValidation.js` — centralized validation + stateID (B2 pattern)
- `apps/backend/services/pluginLoader.js` — plugin registration per servizi backend (V1 pattern)
- `services/narrative/narrativeEngine.js` — inkjs narrative engine (I1/I2 pattern)

### Tool di generazione

- `tools/py/gen_trait_docs.py` — auto-genera `docs/generated/trait-reference.md` da YAML (O3 pattern)
- `tools/py/gen_trait_types.py` — codegen TS + Python + JSON Schema da YAML (L1 pattern)

## Dati di bilanciamento

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — fonte unica di verità per i valori meccanici dei trait (attack_mod, defense_mod, damage_step, resistances, cost_ap, active_effects). 33 core trait con supporto `inherits:` per classi (O1 pattern). Allineati con `docs/catalog/traits_inventory.json`.
- `packs/evo_tactics_pack/data/balance/ai_intent_scores.yaml` — costanti decisionali AI Sistema (soglie retreat, kite buffer, damage dice default). Pattern W3.
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — profili personalità AI (aggressive/balanced/cautious). Pattern W5.
- `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` — modificatori CD per tipo terreno (roccia +2, lava -1, etc.). Pattern W4.
- `packs/evo_tactics_pack/data/balance/movement_profiles.yaml` — profili movimento (heavy/medium/light) con terrain cost multiplier. Pattern W6.
- `packs/evo_tactics_pack/data/balance/species_resistances.yaml` — matrice resistenze per 5 archetipi specie (corazzato/bioelettrico/psionico/termico/adattivo). Pattern W2.
- `packs/evo_tactics_pack/pack_manifest.yaml` — manifest esplicito di tutti i file dati del pack. Pattern O2.

## Schemi e tipi generati

- `packages/contracts/schemas/combat.schema.json` — shape CombatState, action, turn_log, status_effect, roll_result, parry_result
- `packages/contracts/schemas/traitMechanics.schema.json` — shape del catalog
- `packages/contracts/generated/traitTypes.ts` — TypeScript interfaces generati da YAML (L1 pattern)
- `packages/contracts/generated/traitMechanics.generated.schema.json` — JSON Schema generato
- `services/rules/generated/trait_types.py` — Python dataclass stubs generati
- `docs/generated/trait-reference.md` — reference doc auto-generato (O3 pattern)

## ADR

- [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md) — scelte di linguaggio (Python), gate sul balance layer separato, RNG namespacing, scope degli status in Fase 1.
- [ADR-2026-04-15: Round-based combat model](../adr/ADR-2026-04-15-round-based-combat-model.md) — nuovo loop shared-planning → commit → ordered-resolution, semantica di `initiative` come reaction speed.
- [ADR-2026-04-16: Session engine round migration](../adr/ADR-2026-04-16-session-engine-round-migration.md) — piano di migrazione del Node session engine (`apps/backend/routes/session.js`) al round-based model, con feature flag, wrapper legacy e checklist in 17 step.

## Vista di prodotto

- [Final Design Freeze v0.9 §7 Combat system](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto del combat nucleo canonico, scope shipping degli action type e status, resolver freeze API, formula tattica da fissare nel rulebook. Complementare alla reference API di questo hub.

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
- **Fairness caps (Pilastro 6)**: `DAMAGE_STEP_CAP=6` (step danno massimo dopo MoS + trait + status + buff — Surge Burst clampa qui), `PT_POOL_CAP=12` (pool PT massimo per unità). PP senza cap di pool per design (serve PP≥10 per Ultimate). Schema `combat.schema.json` aggiornato con campo `pp` su `combat_unit` e `pp_gained` su `roll_result`.
- **Combat prediction** (W1): `predict_combat()` simula N=1000 attacchi, restituisce hit%/crit%/kill%/avg_damage/MoS/CD. Pure function, no side effects.
- **Terrain defense** (W4): `terrain_defense_mod` aggiunto al calcolo CD. Terreno favorevole alza CD per il difensore.
- **Species resistance matrix** (W2): 5 archetipi con resistenze per canale danno. `merge_resistances()` combina species + trait.
- **Swarm attacks** (W7): `compute_swarm_attacks()` — numero attacchi scala con HP/PP ratio.
- **AI data-driven** (W3/W5/B3): intent scores e profili personalità in YAML. `scoreObjectives()` per weighted scoring.
- **Session validation** (B2): `validateAction()` centralizzata + stateID optimistic lock.
- **Auto phase transitions** (B1): `shouldAutoAdvance()` per avanzamento automatico fasi round.
- **Delta log** (B4): flag `automatic: true` su eventi sistema (bleeding, kill).
- **xstate machines** (X1/X2/X3): roundStatechart, statusEffectsMachine, sistemaActor — non ancora wired nel gameplay vivo, pronti per integrazione.
- **Narrative service** (I1/I2): inkjs engine con briefing/debrief, external functions per binding dati sessione.
- **Trait inheritance** (O1): `_defaults` per classe + `inherits:` in trait_mechanics.yaml.
- **Plugin loader** (V1): `pluginLoader.js` per auto-registrazione servizi.
