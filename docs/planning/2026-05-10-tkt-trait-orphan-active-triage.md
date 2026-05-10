---
title: TKT-TRAIT-ORPHAN-ACTIVE — Triage doc 59 entries (P2 design call)
status: pending-master-dd-verdict
date: 2026-05-10
type: planning
audience: master-dd
related:
  - data/core/traits/active_effects.yaml
  - data/core/biomes.yaml
  - data/core/species.yaml
  - data/core/traits/biome_pools.json
  - BACKLOG.md TKT-TRAIT-ORPHAN-ACTIVE
---

# TKT-TRAIT-ORPHAN-ACTIVE — Triage doc

## Context

Cross-domain audit 2026-05-10 (balance-auditor):

> **59 of 168 active_effects traits sono mai referenziati** in any code, data file, biome pool, or scenario. They exist in YAML but **no unit can ever get them**. Sample: `aculei_velenosi`, `antenne_dustsense`, `artigli_acidofagi`, `aura_glaciale`, `camere_mirage`...

**P2 priority**: not breaking, ma 35% del catalog è economy dead weight.

## Triage proposal — 3 categorie

### A) **Keep — future content** (likely majority ~40 entries)

Trait con tematica forte coerente con design Evo-Tactics (mutazioni biome / synergie species candidate / Tier 2 specialization). Master-dd verdict: keep + flag come "content backlog" pending PCG generation OR designer authoring.

**Effort fix**: zero ship. Solo flag in BACKLOG come "future content".

**Esempi candidati category A**:

- `aculei_velenosi` (poison spikes) — fits species candidates Threat clade
- `aura_glaciale` (glacial aura) — fits cryosteppe biome species
- `camere_mirage` (mirage chambers) — fits deserto species illusion-tactic
- `tasche_sismiche` (seismic pockets) — fits sotterraneo species

### B) **Wire opt-in** (medium ~15 entries)

Trait orfani ma con effect.kind canonical (`extra_damage` / `damage_reduction` / `apply_status`). Possono essere assegnati a species esistenti via `biome_pools.json` rotation (TKT-BIOME-POOL-EXPAND, future ticket).

**Effort fix**: ~1-2h per batch — update biome_pools.json + add 2-3 trait per pool entry.

### C) **Delete — orphan dead** (small ~4 entries)

Trait creati pre-design-freeze 2026-04-XX, no thematic fit, duplicate semantic con trait più recenti. Master-dd verdict: rimuovere da active_effects.yaml + glossary.json.

**Effort fix**: ~30min — git rm + governance check + commit.

## Master-dd verdict needed

- **Q1**: Categoria A keep-as-content threshold — quanti % accettabile come "future content backlog" vs delete pressure?
- **Q2**: Categoria B opt-in wire — assegnare a species via biome_pools.json (additive) o creare nuove species candidate (Tier 4 sentience expansion)?
- **Q3**: Categoria C delete list — fornire 4-5 candidates specifici master-dd review pre-rm?

## Lista 59 orphan completa

Generabile via balance-auditor agent re-run con flag `--list-orphans-only` o:

```bash
# Pseudo-script (deferred actual implementation):
node tools/audit/list-orphan-traits.js \
  --active-effects data/core/traits/active_effects.yaml \
  --refs apps/backend,services,packs,data \
  --output reports/audit/2026-05-10-orphan-traits.json
```

## Out of scope this triage doc

- Actual list dei 59 IDs (richiede tool ad-hoc / agent re-run)
- Effect.kind audit per ciascuno
- Reference path completo (cross-grep across data files)

## Resume trigger

> _"TKT-TRAIT-ORPHAN-ACTIVE — master-dd verdict A/B/C threshold + lista 59 IDs full audit + ship category C delete batch"_
