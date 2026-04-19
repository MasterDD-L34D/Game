---
title: Gap architetturale Node↔Python resistance engine (M5-#1c discovery)
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
  - 'docs/process/2026-04-19-M5-audit-sprint-completion.md'
  - 'docs/hubs/combat.md'
---

# Gap architetturale Node↔Python resistance engine

**Data scoperta**: 2026-04-19 (post merge M5 sprint 7 PR)
**Severity**: **M6 blocker** per calibration iter2 hardcore-06
**Trigger**: tentativo avvio M5-#1c (caller integration + calibration)

## TL;DR

Sprint M5 ha fixato il bug vuln formula `factor = (100 - pct) / 100` **solo lato Python** (`services/rules/resolver.py` + `hydration.py`). Il runtime game reale (Node session engine `apps/backend/routes/session.js`) **non implementa** resistance/channel damage logic. Il fix M5-#1b wire `merge_resistances` beneficia solo demo_cli + master_dm tabletop, **non il game loop Node**.

Conseguenza: calibration iter2 hardcore-06 via `batch_calibrate_hardcore06.py` (che colpisce Node backend su port 3340) **non può osservare** il fix post-M5. Win rate 84.6% out-of-band persiste sul runtime reale.

## Evidenze

### Node backend — zero resistance references

```
grep -r "species_resistances|apply_resistance|merge_resistances" apps/backend/
→ No files found
```

```
grep -r "resistance|channel_damage" apps/backend/services/
→ No files found
```

`apps/backend/routes/session.js` (performAttack + damage step), `apps/backend/services/abilityExecutor.js`, `apps/backend/services/reactionEngine.js` calcolano damage senza consultare né `species_resistances.yaml` né `trait_mechanics[].resistances[]`.

### Python pipeline — wire completo M5-#1b

```
services/rules/hydration.py::build_party_unit(species_archetype=...)
  ↓ _resistances_with_species
  ↓ merge_resistances (resolver.py:202)
  ↓ unit.resistances (delta format)
services/rules/resolver.py::apply_resistance(damage, resistances, channel)
  ↓ applied to damage step
```

Python path completo. Ma zero consumer Node.

### Consumer Python current

- `services/rules/demo_cli.py::main()` → interactive CLI DM. Usa `hydrate_encounter` ma **senza** passare `species_resistances_data` né `*_archetypes` (M5-#1b kwarg default None). Anche qui wire orfano finché non si passano param.
- `tools/py/master_dm.py` → tabletop DM REPL. Stesso gap.
- `tests/test_hydration.py::test_hydrate_encounter_with_species_resistances_end_to_end` → coverage test-only.

## Storico

| Milestone                          | Layer  |       Resistance        |
| ---------------------------------- | ------ | :---------------------: |
| ADR-2026-04-13 d20 rules engine    | Python |       ✅ designed       |
| Sprint 006–019 session engine      | Node   |     ❌ non portato      |
| ADR-2026-04-15 round model         | Node   |     ❌ non portato      |
| ADR-2026-04-16 session migration   | Node   |     ❌ non portato      |
| M5-#1b wire hydration (2026-04-19) | Python |        ✅ wirato        |
| M5-#1c **discovery**               | —      | 🔴 **gap identificato** |

Il gap **precede** sprint M5. Non è regression: è caratteristica dormiente pre-existing che l'audit ha evidenziato.

## Implicazioni

### 1. Calibration iter2 hardcore-06 bloccata

`batch_calibrate_hardcore06.py` → HTTP POST Node backend port 3340 → session engine Node → damage = roll + mod − armor, **no channel resistance**. Win rate 84.6% persiste invariato.

### 2. Gameplay reale vs tabletop divergenti

- Master DM via `master_dm.py` con wire corretto: osserva vulnerability amplify + resistance reduce
- Game loop via frontend `apps/play/` + Node backend: tutti i canali si comportano come `fisico` neutral

Conseguenza design: pilastro P3 "Identità Specie × Job" e P6 "Fairness" non raggiungibili finché gap persiste.

### 3. Test suite non coglie il gap

- Python pytest: valuta Python path → verde
- Node `tests/ai/*`: valuta Node path → verde su damage formula diversa
- Nessun cross-contract test che verifica Node ↔ Python damage equivalence

## Decisione proposta

**M6 ticket** (nuovo sprint):

### M6-#1 Port resistance logic a Node session engine

**Scope** (~4-6h):

1. Nuovo file `apps/backend/services/combat/resistanceEngine.js`:
   - `loadSpeciesResistances(path)` loader YAML
   - `getArchetypeResistances(archetypeId, data)` con fallback default
   - `mergeResistances(traitResistances, speciesDict)` (match Python semantic)
   - `applyResistance(damage, resistances, channel)` (formula delta + floor)

2. Wire in `session.js::performAttack` damage step post-armor:
   - Load `unit.resistances` (populate durante session init)
   - `applyResistance(damageAfterArmor, unit.resistances, action.channel)`

3. Session init (`startSession` endpoint) carica species_resistances.yaml + risolve archetype per ogni unit via `species.resistance_archetype` field (dipende da M6-#2 species data migration).

4. Test `tests/ai/nodeResistanceEngine.test.js`:
   - Parità contract Node ↔ Python (same input → same output)
   - Smoking gun end-to-end
   - 6+ test coprendo 4 archetype × 3 canale

### M6-#2 Species YAML `resistance_archetype` field

**Scope** (~2h):

1. Aggiungi `resistance_archetype: <corazzato|bioelettrico|psionico|termico|adattivo>` field a `data/core/species/*.yaml` (~45 species)
2. Default `adattivo` per unspecified
3. Catalog sync propaga field a `species-index.json`
4. CI guard: ogni species ha archetype valido (`speciesArchetypeReferences.test.js`)

### M6-#3 Calibration iter2 hardcore-06 post-port

**Scope** (~1h):

1. Run `batch_calibrate_hardcore06.py` N=30 post M6-#1+#2
2. Atteso win rate drop 84.6% → 15-25% (target band)
3. Report `docs/playtest/2026-04-20-hardcore-06-calibration-iter2.md`
4. Se ancora out-of-band → iter3 tuning boss stats (vuln functional)

### M6-#4 Contract parity test Node↔Python

**Scope** (~2h):

1. Test cross-stack: stesso encounter/party/seed → damage output equivalente
2. Prevent future divergence
3. Sudoku test matrix 4 archetype × 8 canale × 2 stack

**Effort totale M6 cluster**: ~10h, 4 PR.

## Follow-up ticket

Creato in `docs/planning/ideas/submissions/` (se schema permette) o referenziato come M6-#1..#4 in successive session memory.

## Riferimenti

- [ADR-2026-04-19 Resistance convention](../adr/ADR-2026-04-19-resistance-convention.md) — convention lock, valida per entrambe stack
- [M5 retrospective](../process/2026-04-19-M5-audit-sprint-completion.md) — contesto sprint
- `services/rules/resolver.py:229-244` — Python `apply_resistance` (reference impl)
- `apps/backend/services/abilityExecutor.js` — dove Node dovrebbe integrare post-port
