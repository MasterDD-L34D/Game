---
title: Combat Hub
description: Hub canonico per il rules engine d20 e il loop tattico.
tags: [combat, rules-engine, d20, tactical]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: '2026-06-06'
source_of_truth: true
language: it-en
review_cycle_days: 180
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

Per una panoramica e mappa completa dei doc del workstream vedi [docs/combat/README.md](../combat/README.md). Il riferimento runtime corrente resta [combat-canon.md](../combat/combat-canon.md); gli altri documenti combat possono contenere path Python storici e ora hanno un banner di stato 2026-06-06.

### Quick links

- [Combat overview + mappa doc](../combat/README.md) — mappa storica aggiornata con banner post-migrazione
- [**Combat Canon Spec**](../combat/combat-canon.md) — specifica canonica unificata: action types, status shipping, timing, formule, non-scope (FD-020)
- [Data flow end-to-end (diagrammi)](../combat/data-flow.md) — semantic reference; path Python storici
- [Resolver API reference](../combat/resolver-api.md) — historical Python API reference; non usare come runtime authority
- [**Round loop** (shared planning → commit → ordered resolution)](../combat/round-loop.md) — semantic reference; runtime Node in `roundOrchestrator.js`
- [Trait mechanics guide](../combat/trait-mechanics-guide.md) — semantic/data reference; verificare runtime su Node
- [Status effects guide](../combat/status-effects-guide.md) — semantic reference; implementazione corrente Node
- [Action types guide](../combat/action-types-guide.md) — semantic reference; implementazione corrente Node
- [Worker bridge](../combat/worker-bridge.md) — historical reference only; worker Python rimosso
- [Determinism & RNG](../combat/determinism.md) — semantic reference; verificare runtime su Node
- [Testing guide](../combat/testing.md) — historical commands may mention Python tests; use Node suites listed below/current CI

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
- `apps/backend/services/traitEffects.js#applyBiomeEcoEffects` — orchestratore eco unificato ADR-21c + ERMES + A13 woundedStep + **ER1 role gap** (SPEC-I, ratificato 2026-06-08): party senza un ruolo demanded dal bioma → +1 soft su UNA stat dei nemici, targeting max-headroom (mai una stat gia' spinta dall'eco), dentro il budget ER2 +/-2 condiviso. Gate N=40 sez.8 PASSED → flag `ERMES_ROLE_GAP_ENABLED` **default ON** (flip master-dd 2026-06-10, opt-out `'false'`; evidence `docs/reports/2026-06-10-spec-i-er1-role-gap-n40-evidence.md`: effetto paired = noise floor, WR in banda [0.40,0.60], no-op party completo; step=1 RATIFIED-PROVISIONAL, re-validate player data). Caller `session.js` start: ruoli canonici da `BIOME_ROLE_DEMANDS`, party legacy senza ruoli → no-op conservativo. Telegraph: `role_gap` in `biomeCostsLog` (public tier sez.9). Probe: `tools/sim/spec-i-gates-probe.js --effect er1`.
- `apps/backend/services/combat/woundSystem.js` — **wound location system D3 LIVE** (OD-058, cutover 2026-06-10): crit su PG → ferita `lieve`, KO → `grave` (4 location → stat malus -1/-1/-2 RATIFIED-PROVISIONAL, evidence #2714 "firma segnaletica"); grave = scar cross-encounter (`session.lastMissionWounds`, campaign-scoped); flag `WOUND_LOCATION_V2` **default ON** (opt-out `false`); legacy woundedPerma HP-penalty solo in opt-out; `status.wounds` esente dal wipe round-sync (`PERSISTENT_STATUS_KEYS`).
- `apps/backend/services/combat/stressWave.js` — **ER6 StressWave event-trigger** (SPEC-I, ratificato 2026-06-10 opz. C): i dati `stresswave` di biomes.yaml (20/28 biomi, finora dormienti) wired come wave session-local (`baseline + escalation_rate * turno`, NESSUN feed di sistema_pressure); al primo crossing di soglia UN evento one-shot — `rescue` = +2 HP alle player vive (cap max_hp), `overrun` = +1 reinforcement budget SIS per un solo tick (`reinforcementSpawner` `opts.budgetBonus`, consume-once). Tick nei 4 turn-advance sites (accanto a `sgBeginTurnAll`). Gate N=40 sez.8 PASSED → flag `STRESSWAVE_EVENTS_ENABLED` **default ON** (flip master-dd 2026-06-10, opt-out `'false'`; evidence `docs/reports/2026-06-10-spec-i-er6-stresswave-n40-evidence.md`: eventi deterministici 40/40, rescue WR-neutro al floor). RESCUE_HEAL_HP=2 RATIFIED-PROVISIONAL; OVERRUN_BUDGET_BONUS=1 resta PROPOSED — strutturalmente no-op finché lo spawner non spawna con PG vivi (**bug #2724**, position array vs `{x,y}`): re-run N=40 post-fix. Telegraph: `stresswave_event` in state (public, diegetico) + 4o slot biomeChip ("Soccorso in arrivo"/"Ondata in arrivo") + raw event `stresswave_event`. Probe: `tools/sim/spec-i-gates-probe.js --effect er6`.
- `apps/backend/services/combat/reinforcementSpawner.js#tick` -- **ER7 population shaping** (SPEC-I, ratificato 2026-06-10 opz. A): dopo il foodweb whitelist filter, secondo stage flag-gated che consuma lo stato popolazione cross-run del bioma (`campaign.biomePopulation`, engine `worldgen/biomePopulation.js`). Ruolo trofico `depleted` (apex/prey/mesopredator) escluso dallo spawn pool, `abundant` pesato su (`foodwebFilter.applyPopulationToPool` + `ecosystemResolver.getSpeciesRoles`). Avanza al season-tick (`campaign.js advance-season`); segnali biomeWounded (A13) + apexOverhunted (run vinto, `session.js`). Band-safe (mai svuota il pool). Flag `BIOME_POPULATION_ENABLED` default OFF, pilot badlands, magnitudini PROPOSED -> N=40. Evidence `docs/reports/2026-06-10-er7-biome-population-build-evidence.md`.

- `apps/backend/services/combat/{movementProfiles,moveCost,movementResolver}.js` + move-gate wire in `routes/session.js` (player + AI) e `services/abilityExecutor.js` (minion) — **move terrain-cost substrate** (spec `docs/superpowers/specs/2026-06-23-move-terrain-cost-substrate-design.md`). Flag `MOVE_TERRAIN_COST_ENABLED` **default OFF = band-neutral**: con flag ON il costo-AP del movimento = `ceil(cheapest terrain-weighted path)` (Dijkstra `moveCost`) sotto il `movement_profile` dell'unita' (esplicito > derive morphotype/form > medium); OFF = Manhattan invariato. `adattamento_volo` (graduato: g1 libera terreno normale, g2 dimezza hazard, g3 hazard-free) morde qui. Terreno preso da `encounter.grid.terrain_features` → `session.grid` (assente = all-default = Manhattan). I range-check delle abilita' restano Manhattan (linea di tiro != costo cammino). Band-affecting quando ON → flip gated N=40 + master-dd (fase 4-5).
- `apps/backend/services/combat/anchorState.js` — **radici_ancora_planare anchor** (fase 3, 12° e ultimo slice difensivo del kit creature). `applyAnchorAtActivation` ancora i carrier a inizio round (status `ancorato`, DR2) — producer in `/start` (round 1) + `sgBeginTurnAll` (round 2+, sia `session.js` sia `sessionRoundBridge.js`); `breakAnchor(actor)` in **entrambi** i move-handler (player + AI) = muoversi perde la DR per quel round (consumer); `computeAnchorDR(target)` realizza la DR alla mitigation seam accanto a `computeCortecciaDR`. `ancorato` ∈ `PERSISTENT_STATUS_KEYS` (sopravvive al wipe del sync mid-round; il producer ri-setta DR2 ogni round → niente decay). **Always-on slice, NON gated su `MOVE_TERRAIN_COST_ENABLED`** (verdetto master-dd 2026-06-23: la DR difensiva è disaccoppiata dal terrain-cost): band-neutral perché nessuna unità viva porta `radici_ancora_planare` (autoring fase 3 task 10). DR2 = valore PROPOSED (ri-valida al flip live del primo carrier).

### Tool di generazione

- `tools/py/gen_trait_docs.py` — auto-genera `docs/generated/trait-reference.md` da YAML (O3 pattern)
- `tools/py/gen_trait_types.py` -- codegen TS + JSON Schema da YAML (L1 pattern; output Python rimosso in Phase 3, ADR-2026-04-19)

## Dati di bilanciamento

- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — fonte unica di verità per i valori meccanici dei trait (attack_mod, defense_mod, damage_step, resistances, cost_ap, active_effects). 33 core trait con supporto `inherits:` per classi (O1 pattern). Allineati con `docs/catalog/traits_inventory.json`.
- `packs/evo_tactics_pack/data/balance/ai_intent_scores.yaml` — costanti decisionali AI Sistema (soglie retreat, kite buffer, damage dice default). Pattern W3.
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` — profili personalità AI (aggressive/balanced/cautious). Pattern W5.
- `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` — modificatori CD per tipo terreno (roccia +2, lava -1, etc.) + Sprint 1 sezione `time_of_day` (4 stati × 3 alignments). Pattern W4 + Wesnoth #5.
- `packs/evo_tactics_pack/data/balance/movement_profiles.yaml` — profili movimento (heavy/medium/light) con terrain cost multiplier. Pattern W6. **Consumato** dal move terrain-cost substrate (`movementProfiles.js`, flag `MOVE_TERRAIN_COST_ENABLED`; era dormiente fino al 2026-06-23).
- `packs/evo_tactics_pack/data/balance/species_resistances.yaml` — matrice resistenze per 5 archetipi specie (corazzato/bioelettrico/psionico/termico/adattivo). Pattern W2.
- `packs/evo_tactics_pack/data/balance/sistema_pressure.yaml` — AI War "AI Progress" meter: 5 tier da Calm (0) a Apex (95) con intents_per_round + reinforcement_budget + unlocked_intent_types. Gate capabilities SIS via `computeSistemaTier()` in `sessionHelpers.js`.
- **A2 pressure_tier_floor** (TKT-PRESSURE-TIER-ENCOUNTER, mirror Godot-v2 PR #221): helper `effectivePressure(p, floor)` in `sessionHelpers.js` alza la pressure _effettiva_ per-encounter (`encounter.pressure_tier_floor` 1-5, FLOOR_MIN 0/25/50/75/95) PRIMA di OGNI derivazione tier -- publicSessionView `sistema_tier`, `reinforcementSpawner` budget (`:241`), `aiProgressMeter`, `declareSistemaIntents` `intentsCapForPressure`. Flag `PRESSURE_TIER_FLOOR_ENABLED` **default OFF** (back-compat byte-identical: con flag OFF `effectivePressure` = clamp identico al pre-A2). Flip-ON gated da N=40 band-verify + ratifica master-dd dei valori floor (NON calibrati). Spec: `docs/design/2026-06-16-pressure-tier-floor-backend-mirror.md`.
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
- **Status producer persistence (round model)** (TKT-D4-ENRICH #2533, 2026-06-10): gli status applicati mid-resolve dai producer trait (`on_hit_status` di trait_mechanics, GAP-1 + `apply_status` di active_effects, SPRINT_018) passano dal canale drain condiviso `session._pendingStatusApplies` (ex `_pendingMoraleStatus`, rename) — senza, `syncStatusesFromRoundState` li cancellava nel mini-resolve stesso (no-op silenzioso nel round model). Il result di `/round/execute` ora espone `on_hit_status` + `status_applies` per attack. Test: `tests/api/onHitStatusRoundPersist.test.js`.
- **Canale `elettrico` attivo** (TKT-D4-ENRICH #2533): prime fonti di danno/control — `elettromagnete_biologico` (anti-corazza, ability `magnetic_overload` 1d8+1 elettrico) + `seta_conduttiva_elettrica` (control, disorient dc13); retune `bioelettrico elettrico: 80`. Valori PROPOSED, evidence `docs/reports/2026-06-10-electric-channel-n40-evidence.md`.
- **Azioni abilità**: non sono più NOOP. Il runtime corrente passa da `apps/backend/services/abilityExecutor.js` e dai cataloghi job/trait; per scope shipping e cost-gate usa [combat-canon.md](../combat/combat-canon.md) come riferimento.
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
