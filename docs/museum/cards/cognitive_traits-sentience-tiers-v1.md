---
title: Sentience Traits v1.0 — tier scale T1-T6 + interoception hooks
museum_id: M-2026-04-25-001
type: dataset
domain: cognitive_traits
provenance:
  found_at: incoming/sentience_traits_v1.0.yaml
  git_sha_first: f28b3001
  git_sha_last: f28b3001
  last_modified: 2025-11-02
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 5
reuse_path: docs/museum/cards/cognitive_traits-sentience-tiers-v1.md (3 ranked Minimal/Moderate/Full)
related_pillars: [P2, P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Sentience Traits v1.0 — tier scale T1-T6 + interoception hooks

## Summary (30s)

- **99 LOC YAML** in `incoming/` definisce 6 tier sentienza (T1 Proto-Sentiente → T6 Avanzato) con flags social/tools/language + descriptors testuali + milestone gating
- **Drift critico**: enum T0-T6 LIVE in `schemas/core/enums.json` da 6 mesi (commit `3e1b4f22`), ma **0 species** in `data/core/species.yaml` usano `sentience_index` (zero adoption)
- **Skiv Sprint C unblock**: descriptors T3 (`grooming rituale`, `attenzione condivisa`) + T4 (`divisione del lavoro`, `proto-legge`) diretto plug-in per diary entries — minimal reuse path 3h

## What was buried

YAML strutturato in 3 sezioni:

1. **`tiers[T1..T6]`**: per ogni tier `id`, `label` (Proto-Sentiente / Pre-Sociale / Emergente / Civico / Avanzato / +1), `flags[]` (social/tools/language livello), `descriptors[]` testuali ("reattivo", "solitario/bande lasche", "mimicry", "segnali territoriali", "grooming rituale", "attenzione condivisa", "divisione del lavoro", "proto-legge"), `milestones[]` (gating Senses/AB capacity)
2. **`interoception_traits`**: 4 hook canonici (`proprioception`, `vestibular`, `nociception`, `thermoception`) ognuno con effetti combat (es. `proprioception: "+1 step equilibrio/posizione, -1 stack fatica sprint"`) e mapping mechanics (`stat_buff` / `stat_debuff` esistenti)
3. **`namespace: EvoTactics.Sentience`** + `version: 1.0` + ref a pack esterno `ancestors/rfc-sentience-v0.1`

Snippet:

```yaml
- id: T3
  label: Emergente
  flags: [social:structured, tools:deliberate, language:proto-lexical]
  descriptors: [grooming rituale, attenzione condivisa]
  milestones: [Senses mid+, AB 02–03 movement/carry]
```

## Why it was buried

`f28b3001` 2025-11-02 portò assieme:

- ✅ `docs/guide/README_SENTIENCE.md` (canonical, source_of_truth: true)
- ✅ `docs/public/sentience_sdk.md` (SDK reference)
- ✅ `docs/process/sentience_rollout_plan.md` (ops plan)
- ✅ `schemas/core/enums.json` + `schemas/evo/enums.json` (enum T0-T6)
- ❌ **`incoming/sentience_traits_v1.0.yaml` rimase qui** — assente da pipeline integrazione

Causa probabile: rollout plan `sentience_rollout_plan.md` ha TODO esplicito ("rinfrescare cataloghi" + "applicare migration script") mai eseguito. PR completò scaffolding doc + schema, NON apply runtime.

## Why it might still matter

- **Pillar P2 Evoluzione 🟢c**: Sentience tier è layer naturale per progression Spore-core. Skiv sentience_index va da T2 (proto-sociale) → T3 (emergente) durante campaign arc
- **Pillar P4 MBTI/Ennea 🟡++**: descriptors testuali sono base per voice palette (T3 "grooming rituale" = social grooming → INFJ-friendly diary tone)
- **Skiv Sprint C (voices + diary, ~11h)**: ha **bisogno** di template testuali tier-aware. Sentience YAML ha già scritto i 24 descriptor (4 per 6 tier). Riusa = 60% del lavoro saving
- **Schema-runtime drift insurance**: enum esiste senza adoption = tech debt latente. Card serve come trigger per chiudere drift

## Concrete reuse paths

1. **Minimal — Skiv diary descriptor plugin (P0, ~3h)**
   - Estrarre `tiers[T2..T4].descriptors` come tabella Markdown
   - Skiv canonical sentience_index assumed T2-T3 (`Arenavenator vagans` proto-sociale → emergente)
   - Pass a `narrative-design-illuminator` per Sprint C voice/diary template
   - Output: `data/core/narrative/skiv_voices_by_tier.yaml`

2. **Moderate — backfill `sentience_index` 45 species (P1, ~8h)**
   - Itera `data/core/species.yaml` + `species_expansion.yaml`
   - Assegna T1-T5 per species via milestone matching (T1 = "Senses core", T2 = "AB 01 Endurance", ecc.)
   - Validate via `pytest tests/test_species_builder.py`
   - Chiude drift schema-vs-runtime (enum LIVE da 6 mesi → 45 species adoption)
   - Pass a `creature-aspect-illuminator` per gating coerente con lifecycle

3. **Full — `interoception_traits` runtime (P2, ~15h)**
   - 4 hook (`proprioception` / `vestibular` / `nociception` / `thermoception`) → 4 nuovi entry in `data/core/traits/active_effects.yaml`
   - Mapping diretto a `stat_buff` / `stat_debuff` esistenti (zero engine work)
   - Esempio: `proprioception` trigger `on_move` → `+1 step equilibrium` modificatore
   - Pass a `sot-planner` per ADR `interoception_traits → active_effects.yaml`
   - Apre P2 → 🟢 candidato definitivo

## Sources / provenance trail

- Found at: [incoming/sentience_traits_v1.0.yaml:1](../../../incoming/sentience_traits_v1.0.yaml)
- Git history: `f28b3001` (2025-11-02, MasterDD-L34D, "feat: align sentience rollout references") — single commit, mai più toccato
- Bus factor: 1 (solo MasterDD-L34D)
- Related canonical: [docs/guide/README_SENTIENCE.md](../../guide/README_SENTIENCE.md) (T0-T6 source_of_truth)
- Related enum: [schemas/core/enums.json](../../../schemas/core/enums.json) + [schemas/evo/enums.json](../../../schemas/evo/enums.json) — `sentience_index` enum live da `3e1b4f22` 2026-04-16
- Related rollout: [docs/process/sentience_rollout_plan.md](../../process/sentience_rollout_plan.md) (TODO open)
- Related RFC: [docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md](../../planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md)
- Inventory excavation: [docs/museum/excavations/2026-04-25-cognitive_traits-inventory.md](../excavations/2026-04-25-cognitive_traits-inventory.md)

## Risks / open questions

- ❓ **User decision (OPEN_DECISIONS candidate)**: backfillare `sentience_index` su 45 species esistenti (~8h Moderate path) o solo new species da Sprint C in poi?
- ⚠️ Schema-runtime drift latente: enum LIVE 6 mesi, 0 adoption. Decision pending → silent drift continua
- ⚠️ Tier T0 (placeholder pre-T1?) non documentato in YAML ma esiste in enum. Da chiarire
- ✅ Encoding clean: spot-check primi 30 righe → no mojibake, UTF-8 native

## Next actions

- **Sprint C kickoff**: `narrative-design-illuminator --target docs/museum/cards/cognitive_traits-sentience-tiers-v1.md` per Skiv voice palette
- **OPEN_DECISIONS**: OD-008 ✅ RISOLTA 2026-04-25 — verdict B incrementale (backfill durante natural editing, no sweep dedicato)
- **Drift escalation**: `schema-ripple` agent per audit `sentience_index` consumers
