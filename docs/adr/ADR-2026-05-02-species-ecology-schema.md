---
title: 'ADR-2026-05-02: Species ecology schema extension (food web machine-readable)'
doc_status: proposed
doc_owner: dataset-curator
workstream: cross-cutting
last_verified: 2026-05-02
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - data/core/species.yaml
  - data/core/species_expansion.yaml
  - schemas/evo/species.schema.json
  - docs/planning/2026-04-25-creature-concept-catalog.md
  - docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md
---

# ADR-2026-05-02: Species ecology schema extension (food web machine-readable)

- **Data**: 2026-05-02
- **Stato**: PROPOSED
- **Owner**: Dataset curator + Backend
- **Stakeholder**: Pilastro 2 (Evoluzione emergente), Pilastro 3 (Specie×Job),
  generation pipeline (Flow), encounter authoring CLI

## Contesto

`data/core/species.yaml` e `data/core/species_expansion.yaml` codificano oggi
identita, morph_slots e trait_loadout, ma le interazioni ecologiche
(chi predica chi, chi compete con chi, chi vive in branco) sono solo descritte
in prosa nei documenti `docs/planning/2026-04-25-creature-concept-catalog.md`
e `docs/core/`. Conseguenze:

- L'encounter authoring CLI non puo proporre packing coerenti
  ("metti X predator + Y prey nella stessa scena").
- Il biome spawn bias (`apps/backend/services/combat/biomeSpawnBias.js`,
  PR #1726 V7) non puo modulare in funzione di pressione predator-prey.
- I balance auditor non hanno modo di trovare orphan ("specie senza prede note"
  o "predator senza preda") via lint statico.

L'aggiunta di Pulverator gregarius (apex savana, pack 3-5) come quinta
voce in `species_expansion.yaml` rende urgente formalizzare gli archi
del food web prima che la prosa cresca ancora.

## Decisione

Estendere `schemas/evo/species.schema.json` con un blocco `ecology` opzionale
e backward compatible, e backfillare le specie savana esistenti (`dune_stalker`)
oltre alla nuova entry Pulverator.

### Sette nuovi campi (tutti opzionali sotto `species.ecology`)

1. **`trophic_tier`** — `enum` (`producer | primary_consumer | secondary_consumer | tertiary_consumer | apex | decomposer | scavenger | omnivore`).
   Tier ecologico canonico, leggibile dal balance auditor per controlli di
   coerenza pack vs roster.
2. **`pack_size`** — oggetto `{ min: int>=1, max: int>=1 }`.
   Default implicito: `{1,1}` se assente. Necessario per encounter spawner
   (es. Pulverator pack 3-5 nello stesso scenario).
3. **`prey_of`** — lista `species_id` (snake_case). Specie che cacciano questa.
4. **`preys_on`** — lista `species_id`. Specie cacciate da questa.
5. **`competes_with`** — lista `species_id`. Stessa nicchia ecologica
   (stesso biome + stesso trophic_tier). Trigger di pressure escalation
   se messi nello stesso encounter.
6. **`scavenges_from`** — lista `species_id`. Specie da cui questa raccoglie
   carcasse senza ucciderle direttamente.
7. **`mutualism_with`** — lista oggetti `{ species_id, type, note? }`
   con `type` in `direct | indirect | obligate | facultative`.
   Es. Pulverator pack indirettamente aiuta dune_stalker scacciando prede.

### Migration strategy (additive, backward compatible)

- Tutte le entry esistenti **restano valide** senza modifiche
  (`ecology` e' un property opzionale, non e' aggiunto a `required`).
- Il blocco `ecology` puo essere backfillato incrementalmente per biome
  o per cluster funzionale.
- Schema species.yaml legacy (root key `species:` con `id`, `default_parts`,
  `trait_plan`) e schema species_expansion.yaml (root key `species_examples:`
  con `morph_slots`, `preferred_biomes`) sono trattati come sorgenti
  parallele: il blocco `ecology` ha la stessa shape in entrambi i formati.

### Cross-ref validation rules

Un nuovo validatore in `tools/py/validate_datasets.py`
(`validate_species_ecology`) impone:

1. **species_id orphan check**: ogni id citato in `prey_of / preys_on /
competes_with / scavenges_from / mutualism_with[].species_id`
   DEVE esistere come `id` di una entry di `species.yaml` o
   `species_expansion.yaml` (o e' tollerato solo se prefissato `catalog_*`,
   convenzione futura per concept-only).
2. **bidirectional consistency**: se `A.preys_on` include `B`, allora
   `B.prey_of` DEVE includere `A` (warning, non error, durante backfill;
   error post-Phase-2).
3. **self-reference forbidden**: `species_id` non puo riferirsi a se stesso
   in qualunque dei campi.

## Alternative scartate

- **`packs/evo_tactics_pack/data/species/<biome>/*.yaml` come unica fonte**:
  rimanderebbe il problema, mantiene split tra species canoniche
  (`data/core/`) e species pack (`packs/`). Scartato perche' Pulverator e'
  destinato a `data/core/species_expansion.yaml` per allineamento con
  pipeline Flow.
- **Grafo ecologia in file separato `data/core/ecology.yaml`**: rompe il
  principio "una specie = una entry self-contained". Cross-ref piu' costoso
  per i lettori. Scartato.

## Conseguenze

**Positive**

- Pipeline encounter authoring puo generare pack ecologicamente coerenti.
- Balance auditor puo emettere warn per specie isolate (zero archi).
- `biomeSpawnBias` puo evolvere a `ecologySpawnBias` con peso predator/prey.
- Documentazione catalog (markdown) puo essere generata da YAML
  (single source of truth invece di duplicato).

**Negative / debiti**

- Backfill incrementale: 9 specie inizialmente (1 nuova + 1 backfill core +
  ~7 expansion con default minimi), 30+ residue da mappare nei prossimi sprint.
- Cross-ref bidirectional vincola: aggiungere una preda implica almeno 2 edit.

## Rollback plan

`git revert` del PR. Lo schema `ecology` resta opzionale: rimuovere tutti i
blocchi non rompe nessun consumer (zero codice runtime ancora wirato sui
campi nuovi al momento del merge — wire e' Phase 2 separata).

## Stato Pulverator dopo questo ADR

`pulverator_gregarius` entra in `species_expansion.yaml` come 31a entry
(suffisso espansivo del roster docx_2026-04-16). Compete con `dune_stalker`
per nicchia apex savana. Non eredita `preys_on` reali perche' le creature
prey citate in `creature-concept-catalog.md` (`pista_corridor`,
`branco_cucciolo`) non hanno entry data; `preys_on` resta `[]` con TODO
nel doc fino al loro promozione a data layer.
