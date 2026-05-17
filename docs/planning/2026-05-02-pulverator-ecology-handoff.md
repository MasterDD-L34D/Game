---
doc_status: active
doc_owner: dataset-curator
workstream: cross-cutting
last_verified: 2026-05-02
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-02-species-ecology-schema.md
  - docs/planning/2026-04-25-creature-concept-catalog.md
  - docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md
  - data/core/species_expansion.yaml
  - data/encounters/enc_savana_pack_clash.yaml
---

# Handoff 2026-05-02 — Pulverator gregarius + species ecology schema

## TL;DR

PR **#1967** opened (head `eeafd4d6`, branch
`claude/pulverator-ecology-2026-05-02`). Aggiunge Pulverator gregarius
come 31a entry di species_expansion.yaml + estende lo schema species
con un blocco `ecology` opzionale per food web machine-readable
(ADR-2026-05-02 PROPOSED).

- Test totali aggiunti: **7 pytest** in `tests/scripts/test_species_validator.py`
- Baseline AI test: **353/353** verde (zero regressione)
- Validator wirato: `python3 tools/py/game_cli.py validate-datasets` → 0 errori
- Governance docs: 0 errori, 0 warning

## Cosa contiene la PR (atomica, 2 commit)

### Commit 1 — `ae902b8a` schema + ADR + validator + tests

- `schemas/evo/species.schema.json`: blocco `ecology` opzionale,
  7 nuovi campi (trophic_tier, pack_size, prey_of, preys_on,
  competes_with, scavenges_from, mutualism_with)
- `docs/adr/ADR-2026-05-02-species-ecology-schema.md`: PROPOSED,
  source_of_truth=true, review_cycle 180gg
- `tools/py/validate_datasets.py`: `validate_species_ecology()` con
  orphan check, self-ref forbidden, bidirectional consistency.
  Wirato in `main()`.
- `tests/scripts/test_species_validator.py`: 7 pytest (Pulverator
  presence + dune_stalker backfill + orphan + self-ref + bidirectional
  - pack_size sanity + integration validator).

### Commit 2 — `eeafd4d6` Pulverator + backfill + encounter + catalog

- `data/core/species_expansion.yaml`:
  - Pulverator gregarius (31a entry, primo case-study ecology completo)
  - 4 backfill ecology (sp_arenavolux/ferriscroba/arenaceros/noctipedis)
- `data/core/species.yaml`: dune_stalker.ecology aggiunta
  (apex solitario, competes_with pulverator_gregarius reciprocita')
- `data/encounters/enc_savana_pack_clash.yaml`: encounter MVP 4-player
  hardcore (3 Pulverator vs party + 1 Skiv NPC neutrale)
- `docs/planning/2026-04-25-creature-concept-catalog.md`: sezione
  Pulverator + ASCII food web savana + cross-ref 7 schema fields

## Conteggi

| Metric                            | Valore                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| Species ecology fields populated  | 6 (1 Pulverator + 1 dune_stalker full + 4 expansion partial) |
| Trait cross-ref glossary verified | 5 core + 3 synergy                                           |
| Schema fields aggiunti            | 7 (tutti opzionali)                                          |
| Encounter seeds aggiunti          | 1 (enc_savana_pack_clash)                                    |
| Validator errori post-merge       | 0                                                            |
| AI test post-merge                | 353/353                                                      |
| Pytest species validator          | 7/7                                                          |

## Bidirectional consistency check (Pulverator ↔ Skiv)

| Edge                      | Direzione                            | Verificato          |
| ------------------------- | ------------------------------------ | ------------------- |
| competes_with             | dune_stalker ↔ pulverator_gregarius | OK                  |
| mutualism_with (indirect) | dune_stalker ↔ pulverator_gregarius | OK                  |
| scavenges_from            | pulverator_gregarius → dune_stalker  | OK (one-way valido) |
| preys_on / prey_of        | n/a (entrambi apex)                  | n/a                 |

## Decisioni esecutive prese durante la sessione

1. **Drop `mutation_chain` Pulverator T2**: spec diceva `voce_dominante`
   ma quel trait non esiste in glossary.json (solo `voce_imperiosa` e'
   reale). Optato per non inventare un trait orphan; mutation_chain
   omessa, lasciata a successivo content sprint trait expansion.
2. **`preys_on` Pulverator vuoto**: le creature prey citate dal catalog
   (`pista_corridor`, `branco_cucciolo`) sono concept-only nel markdown,
   non hanno entry data. Spec autorizzava esplicitamente "se SOLO in
   catalog markdown, NON migrare". TODO documentato in catalog +
   ADR §"Stato Pulverator dopo questo ADR".
3. **Schema species_expansion.yaml ha 30 entries (non 4)**: spec era
   approssimativa. Pulverator inserito come 31a entry, dopo
   `sp_siltovena_bifida`, mantenendo ordering originale.
4. **species_expansion.yaml usa `morph_slots` + `preferred_biomes`**:
   shape diversa da species.yaml core. Pulverator usa entrambe le shape
   (morph_slots + biome_affinity legacy field) per bridge tra i due
   modelli durante migration.

## Next session priority

1. **Calibration N=10 `enc_savana_pack_clash`** (~2h userland):
   harness `tools/py/batch_calibrate_*.py` pattern come hardcore_07.
   Target win 25-40%. Iter1 atteso fuori band, knob: pack count,
   alpha hp, terrain coverage.
2. **Phase 2 wire ecology in runtime** (~3-5h):
   - `apps/backend/services/combat/biomeSpawnBias.js` evolve a
     `ecologySpawnBias` con peso predator/prey
   - encounter authoring CLI legge `ecology.pack_size` per generare
     gruppi coerenti (no piu' `count` hardcoded)
3. **Backfill ecology per residui 25 expansion species** (~2-3h
   batch): pattern minimal sensible defaults (trophic_tier inferito
   da role_tags). Bidirectional check rimane garantito dal validator.
4. **Promote `pista_corridor` + `branco_cucciolo` da catalog markdown
   a data/core**: prerequisito per popolare `Pulverator.preys_on`
   con prey reali (TODO esplicito ADR-2026-05-02).

## Stato pillars

Nessun cambio diretto pillars. Indiretto:

- **P3 Specie×Job 🟢c**: ecologia machine-readable supporta archetipi
  job-aware (Beastmaster ora puo riconoscere pack alpha vs solitario)
- **P6 Fairness 🟢c+**: encounter authoring tool puo generare scenari
  con pressione ecologica calcolabile (next: wire spawn bias)

## Anti-patterns evitati

- ❌ NO trait orphan invented (drop `voce_dominante` mutation T2)
- ❌ NO species_id orphan in ecology refs (pista_corridor/branco_cucciolo
  rimasti in catalog markdown TODO, non promossi a edge ecology)
- ❌ NO break schema esistente (ecology e' opzionale, no required field)
- ❌ NO touch existing expansion entries oltre additivo ecology block
- ❌ NO subagent / NO tool autonomi non richiesti
- ✅ Branch isolato `claude/pulverator-ecology-2026-05-02`
- ✅ Atomic commit (schema/validator vs data/encounter)
- ✅ Cross-ref bidirectional verificato e testato

## Stop criteria triggered

Goal raggiunto: Single PR opened (#1967). Nessun stop di emergenza.
