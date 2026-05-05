---
title: Combat Hub
description: Hub canonico per il rules engine d20 e il loop tattico.
tags: [combat, rules-engine, d20, tactical]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Combat Hub

Il rules engine d20 risolve le azioni tattiche del loop di combat: attack (d20 vs CD con MoS e damage step), parry contestata, PT spend, status effect (bleeding/fracture/disorient/rage/panic) e stress breakpoints.

## ✅ Phase 3 removal completata (2026-05-05)

**Runtime canonical**: Node (`apps/backend/services/combat/`, `apps/backend/routes/session.js`, `apps/backend/services/roundOrchestrator.js`, `apps/backend/services/traitEffects.js`). Ex-`services/rules/` Python rimosso fisicamente in Phase 3 ([ADR-2026-04-19](../adr/ADR-2026-04-19-kill-python-rules-engine.md)).

Sezioni "File principali" sotto fanno riferimento storico ai path Python rimossi — preservate per archeologia git blame + ADR continuity. NON usare come fonte runtime: il codice non esiste più in main post-Phase-3.

---

## Doc historical (ex-`services/rules/` Python) — REMOVED 2026-05-05

Il codice Python originariamente viveva in `services/rules/`, decoppiato dal generation pipeline, dal dashboard e dal repo `Game-Database`. Phase 3 removal completata 2026-05-05.

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

> Sezione "File principali" — i 5 path `services/rules/*.py` sono stati rimossi in Phase 3 (2026-05-05). Riferimento storico per archeologia (resolver/round_orchestrator/hydration/demo_cli/worker = tutto portato a Node canonical). Sotto i file Node attivi runtime.

- `apps/backend/services/roundOrchestrator.js` — orchestratore round Node con `shouldAutoAdvance()` (B1 pattern)
- `apps/backend/services/roundStatechart.js` — round lifecycle come xstate statechart (X1 pattern)
- `apps/backend/services/statusEffectsMachine.js` — status effects come xstate parallel FSM (X2 pattern)
- `apps/backend/services/ai/sistemaActor.js` — Sistema AI come xstate actor model (X3 pattern)
- `apps/backend/services/ai/policy.js` — policy engine con `loadAiConfig()`, `applyProfile()`, `scoreObjectives()` (W3/W5/B3 pattern)
- `apps/backend/services/sessionValidation.js` — centralized validation + stateID (B2 pattern)
- `apps/backend/services/pluginLoader.js` — plugin registration per servizi backend (V1 pattern)
- `services/narrative/narrativeEngine.js` — inkjs narrative engine (I1/I2 pattern)
- `apps/backend/services/combat/timeOfDayModifier.js` — Wesnoth time-of-day modifier (lawful/chaotic/neutral × dawn/day/dusk/night) wired in `session.js#performAttack` (Sprint 1 PR #1934, Tier S #5)
- `apps/backend/services/combat/defenderAdvantageModifier.js` — AI War defender's advantage asymmetric (player→sistema gated, +1 def CD su SIS-defender) (Sprint 1 PR #1934, Tier S #10)
- `apps/backend/services/species/biomeAffinity.js` — Subnautica habitat lifecycle modifier per phase (preferred biome → +1 atk/+1 def, non-affine → -1 def, apex_free) wired in `session.js#performAttack` (Sprint 2 PR #1935, Tier A #9)

### Tool di generazione

- `tools/py/gen_trait_docs.py` — auto-genera `docs/generated/trait-reference.md` da YAML (O3 pattern)
- `tools/py/gen_trait_types.py` — codegen TS + Python + JSON Schema da YAML (L1 pattern)

## Dati di bilanciamento

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — fonte unica di verità per i valori meccanici dei trait (attack_mod, defense_mod, damage_step, resistances, cost_ap, active_effects). 33 core trait con supporto `inherits:` per classi (O1 pattern). Allineati con `docs/catalog/traits_inventory.json`.
- `packs/evo_tactics_pack/data/balance/ai_intent_scores.yaml` — costanti decisionali AI Sistema (soglie retreat, kite buffer, damage dice default). Pattern W3.
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — profili personalità AI (aggressive/balanced/cautious). Pattern W5.
- `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` — modificatori CD per tipo terreno (roccia +2, lava -1, etc.) + Sprint 1 sezione `time_of_day` (4 stati × 3 alignments). Pattern W4 + Wesnoth #5.
- `packs/evo_tactics_pack/data/balance/movement_profiles.yaml` — profili movimento (heavy/medium/light) con terrain cost multiplier. Pattern W6.
- `packs/evo_tactics_pack/data/balance/species_resistances.yaml` — matrice resistenze per 5 archetipi specie (corazzato/bioelettrico/psionico/termico/adattivo). Pattern W2.
- `packs/evo_tactics_pack/data/balance/sistema_pressure.yaml` — AI War "AI Progress" meter: 5 tier da Calm (0) a Apex (95) con intents_per_round + reinforcement_budget + unlocked_intent_types. Gate capabilities SIS via `computeSistemaTier()` in `sessionHelpers.js`.
- `packs/evo_tactics_pack/pack_manifest.yaml` — manifest esplicito di tutti i file dati del pack. Pattern O2.

## Invarianti di design combat

Stabiliti 2026-04-17 da lezioni AI War + Fallout Tactics postmortem (vedi `memory/reference_tactical_postmortems.md`).

- **Single combat mode**. Round model (ADR-2026-04-15) è l'**unico** modello di combat. Qualsiasi "quick mode" o "real-time variant" è un breaking change, non una feature flag. Lesson: Fallout Tactics shipped 3 modi (CTB/ITB/STB) nessuno canonico — confusion player + reviewer split.
- **Asymmetric AI rules**. SIS non usa l'economia PG. Niente PT pool, niente trait cost. Intent budget derivato da `sistema_pressure` (vedi `sistema_resource_model` in `ai_profiles.yaml`). SIS può ignorare fog-of-war, avere budget reinforcement invisibile, non build economia. Fairness garantita via outcome measurement (`vcScoring`), non simmetria di regole. Lesson AI War: AI che mimano player "fall apart in advanced play" (Park).

## Schemi e tipi generati

- `packages/contracts/schemas/combat.schema.json` — shape CombatState, action, turn_log, status_effect, roll_result, parry_result
- `packages/contracts/schemas/traitMechanics.schema.json` — shape del catalog
- `packages/contracts/generated/traitTypes.ts` — TypeScript interfaces generati da YAML (L1 pattern)
- `packages/contracts/generated/traitMechanics.generated.schema.json` — JSON Schema generato
- `docs/generated/trait-reference.md` — reference doc auto-generato (O3 pattern)

## ADR

- [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md) — scelte di linguaggio (Python), gate sul balance layer separato, RNG namespacing, scope degli status in Fase 1.
- [ADR-2026-04-15: Round-based combat model](../adr/ADR-2026-04-15-round-based-combat-model.md) — nuovo loop shared-planning → commit → ordered-resolution, semantica di `initiative` come reaction speed.
- [ADR-2026-04-16: Session engine round migration](../adr/ADR-2026-04-16-session-engine-round-migration.md) — piano di migrazione del Node session engine (`apps/backend/routes/session.js`) al round-based model, con feature flag, wrapper legacy e checklist in 17 step.

## Vista di prodotto

- [Final Design Freeze v0.9 §7 Combat system](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto del combat nucleo canonico, scope shipping degli action type e status, resolver freeze API, formula tattica da fissare nel rulebook. Complementare alla reference API di questo hub.

## Comandi demo

```bash
# Smoke combat Node (post Phase 3 rimozione Python rules engine 2026-05-05)
node --test tests/ai/*.test.js                       # AI baseline 383 tests
node --test tests/api/contracts-combat.test.js tests/api/contracts-trait-mechanics.test.js
node --test tests/services/movementTraitEffects.test.js
```

> Comandi Python `demo_cli.py` rimossi in Phase 3 (vedi ADR-2026-04-19). Per smoke runtime end-to-end usa `npm run start:api` + `curl /api/v1/session/start`.

## Stato implementazione (Phase 2)

- **Furia / Panico**: implementati con logica completa — breakpoint stress (0.5 / 0.75), intensity, bonus/malus offensivi e difensivi. Panic blocca PT spend (azioni concentrate).
- **Parata contestata**: `resolve_parry()` implementata — tiro d20 reattivo del target con `parry_bonus`, opt-in via `action.parry_response`. Fallback a `PARRY_CD=12` se `attack_total` non fornito.
- **PT spend**: `perforazione` (armor -2) e `spinta` (status sbilanciato sul target) implementati con consumo pool PT e validazione. Panic impedisce la spesa.
- **Status effect**: bleeding (HP tick in begin_turn), fracture (step reduction), disorient (attack malus), rage (furia cieca), panic (malus + block PT) — tutti consumati dal resolver.
- **Azioni abilità**: il campo `active_effects` dei trait esiste nello schema ma è **NOOP** — non viene consumato dal resolver. Deferred a Fase 3 (vedi [action-types-guide.md](../combat/action-types-guide.md) quando disponibile).
- **Fairness caps (Pilastro 6)**: `DAMAGE_STEP_CAP=6` (step danno massimo dopo MoS + trait + status + buff — Surge Burst clampa qui), `PT_POOL_CAP=12` (pool PT massimo per unità). **Rev 2026-04-20 (P0 Q54 default A)**: **PP max=3** canonical (`Freeze §7.2`). **Ultimate costa 3 PP = consume all pool** (precedente "PP≥10" era errore doc). PT reset: **per-round** (P0 Q51 default B, coerente round-model ADR-04-15). Schema `combat.schema.json` aggiornato con campo `pp` su `combat_unit` e `pp_gained` su `roll_result`.
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
