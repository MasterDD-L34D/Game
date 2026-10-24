---
title: Machinations — modelli di bilanciamento per Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: dataset-pack
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 60
---

# Machinations — modelli di bilanciamento

[Machinations](https://machinations.io) è un tool visuale per modellare economie di gioco come grafi di flusso (pool, source, drain, gate, register). Questo documento specifica **4 modelli da ricostruire nel tool** per validare visualmente il bilanciamento di Evo-Tactics, alternativa agli spreadsheet per calibrare Pilastro 6 (Fairness).

Machinations non ha un formato di export aperto canonico: i modelli vanno ricostruiti manualmente dal diagramma qui descritto. Il file `.machinations` finale va salvato in `docs/balance/machinations/` (nuova cartella da creare al primo export).

---

## Modello 1 — `d20_attack_economy`

**Scopo**: visualizzare la distribuzione di esiti dell'attacco d20 vs Difficulty Class, inclusi Margin of Success tiers e damage step scaling.

**Fonte dati**: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` + `packs/evo_tactics_pack/data/balance/terrain_defense.yaml`.

**Nodi**:

- `d20_roll` (source, random 1–20, uniform)
- `attacker_mod` (register, da `trait_mechanics.yaml::attack_mod`)
- `DC` (register, da `species_resistances.yaml` + terrain cover bonus)
- `hit_check` (gate, condizione: `d20_roll + attacker_mod >= DC`)
- `MoS_tier` (converter, mappa MoS → {0: miss, 1–4: graze, 5–9: hit, 10+: crit})
- `damage_step` (pool, output per tier, cap DAMAGE_STEP_CAP)
- `miss_pool` / `hit_pool` / `crit_pool` (drain counters per fairness telemetry)

**Verifica**: run 1000 iterazioni → confronta distribuzione con `services/rules/predict_combat.py` (N=1000 già esistente). Divergenza >5% = bug nel modello o nel resolver.

---

## Modello 2 — `pt_pool_combo_meter`

**Scopo**: modellare accumulo Power Tokens (PT) durante un round e trigger soglie combo.

**Fonte dati**: `apps/backend/services/roundOrchestrator.js` + `packs/evo_tactics_pack/data/balance/action_speed.yaml`.

**Nodi**:

- `round_start` (trigger, 1x per round)
- `pt_per_action` (source, da action_speed.yaml per azione risolta)
- `pt_pool` (pool, cap PT_POOL_CAP)
- `combo_threshold_t1` (gate, fire a 3 PT)
- `combo_threshold_t2` (gate, fire a 6 PT)
- `combo_threshold_t3` (gate, fire a 10 PT)
- `round_end_drain` (drain, azzera pt_pool con decay_rate configurabile)

**Verifica**: confronta firing rate con log round in `tests/ai/roundOrchestrator.test.js`. Se un threshold scatta >80% dei round = cap troppo basso (power creep combo).

---

## Modello 3 — `damage_step_fairness_cap`

**Scopo**: verificare che nessun trait o combo bypassi DAMAGE_STEP_CAP per più di N turni consecutivi.

**Fonte dati**: `data/core/traits/active_effects.yaml` + `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`.

**Nodi**:

- `trait_damage_output` (source per trait, 7 paralleli)
- `stack_multiplier` (register, moltiplicatore da synergie trait)
- `raw_damage` (pool, somma trait outputs)
- `cap_gate` (gate, condizione: `raw_damage <= DAMAGE_STEP_CAP`)
- `overflow_register` (counter turni consecutivi con overflow)
- `fairness_flag` (trigger, fire se overflow_register > 2)

**Verifica**: se `fairness_flag` scatta → trait va flaggato in `docs/reports/trait_balance_summary.md`. Lega con telemetria esistente.

---

## Modello 4 — `status_propagation_decay`

**Scopo**: validare durate e cleanup dei 7 status fisici/mentali (panic, rage, stunned, focused, confused, bleeding, fracture).

**Fonte dati**: `apps/backend/services/statusEffectsMachine.js` (xstate FSM) + `data/core/traits/active_effects.yaml`.

**Nodi per ogni status**:

- `apply_trigger` (source, da azione o trait)
- `duration_pool` (pool, iniziale 3 turni, decay 1/turno)
- `tick_drain` (drain, -1 per round_end)
- `cleanse_gate` (gate, input da healer trait o turn cap)
- `propagation_source` (gate, fire se status produce contagio a adiacenti — es. panic bleeding→rage)

**Verifica**: confronta decay con `tests/ai/statusEffects.test.js`. Se un status persiste >6 turni in media = decay rate troppo basso.

---

## Workflow di utilizzo

1. **Setup**: account free su machinations.io. Salva workspace "Evo-Tactics".
2. **Modellazione**: ricostruisci i 4 modelli dal descrittore sopra. Ogni nodo deve citare il file YAML sorgente come nota.
3. **Run simulation**: Machinations supporta Monte Carlo run (N=1000). Esporta i risultati come CSV.
4. **Confronto**: diff con output `predict_combat.py` e `tests/ai/*.test.js`. Documenta divergenze in PR.
5. **Export**: salva il `.machinations` file in `docs/balance/machinations/<modello>.machinations`. Screenshot PNG in `docs/balance/machinations/img/`.

## Quando aggiornare

- Cambio di `trait_mechanics.yaml`, `ai_intent_scores.yaml`, `species_resistances.yaml` → rerun Modello 1+3.
- Cambio di `action_speed.yaml` o `roundOrchestrator.js` → rerun Modello 2.
- Nuovo status in `statusEffectsMachine.js` → aggiungi branch a Modello 4.

## Limiti

- Machinations è un tool closed-source, no CI integration. Il modello è **documentazione visuale**, non autorità. Il source of truth rimane YAML + rules engine Python.
- Free tier ha limiti di complessità grafi; per modelli >50 nodi valutare tier Pro o splittare in sub-modelli.

## Riferimenti

- [Machinations.io documentation](https://machinations.io/community/wiki)
- Citato in `docs/guide/external-references.md` sezione "Tool di bilanciamento"
- Pattern origine: `reference_tier0_deep_dive.md` (awesome-game-design gap resources)
