---
title: 'ADR-2026-05-11 — species_expansion schema canonical migration (morph_slots → trait_plan)'
date: 2026-05-11
type: adr
workstream: dataset-pack
owner: master-dd
status: proposed
related_files:
  - data/core/species.yaml
  - data/core/species_expansion.yaml
  - tools/py/validate_species.py
  - tools/ts/validate_species.ts
related_adr:
  - docs/adr/ADR-2026-04-19-kill-python-rules-engine.md
  - docs/adr/ADR-2026-05-02-species-ecology-schema.md
related_pr:
  - https://github.com/MasterDD-L34D/Game/pull/2214
---

# ADR-2026-05-11 — species_expansion schema canonical migration

## Status

**PROPOSED** — 2026-05-11. Pending master-dd verdict (Path A / B / C).

## Context

Il repository ha due roster di specie con **schema divergenti**:

| File                               | Roster | Schema slot                                                               | trait_plan        |
| ---------------------------------- | -----: | ------------------------------------------------------------------------- | ----------------- |
| `data/core/species.yaml`           |     20 | `default_parts: {locomotion, metabolism, offense[], defense[], senses[]}` | **canonical**     |
| `data/core/species_expansion.yaml` |     30 | `morph_slots: {locomotion, offense, defense, senses, metabolism}`         | parziale (~10/30) |

### Origine drift

- `species.yaml` è il roster canonical curato (Skiv, polpo_araldo_sinaptico, T4 ladder, etc.) — campo `default_parts` consumato dai validator (`tools/py/validate_species.py`, `tools/ts/validate_species.ts`), dai test di synergy (`tests/services/synergyDetector.test.js`) e dai builder runtime.
- `species_expansion.yaml` è il roster di espansione 30-species da `docx_2026-04-16` (naming canonical) — campo `morph_slots` introdotto come schema parallelo per separare la batch di import dal canonical.
- Wave 7 trait-orphan closure (PR #2214, squash `<pending>`) ha shippato una **sezione `trait_plan` parallela additiva** dentro a 10/30 species_expansion entries — workaround per chiudere ASSIGN-A waves 5-7, **NON migrazione canonical**.

### Evidence di consumer

`grep -rn "morph_slots" apps/ services/ tools/ packs/ tests/`:

- **Zero runtime consumer** (apps/backend, services/, tools/py/validate_species.py, tools/ts/validate_species.ts).
- Solo riferimenti in doc (`docs/planning/2026-05-10-notte-trait-orphan-full-closure-handoff.md`, `BACKLOG.md`, `COMPACT_CONTEXT.md`, `docs/reports/2026-05-06-species-forms-traits-audit.md`).
- File `species_expansion.yaml` non è loaded dal validator canonical Python/TS — è isolato.

→ `morph_slots` è **schema fantasma**: 30 species hanno dati strutturati che nessun runtime legge.

### Costo dello status quo

1. **Schema debt persistente** — ogni nuova feature che tocca species roster (synergy, biome bias, trait wiring) deve decidere caso-per-caso quale schema supportare → fork esplicito.
2. **Trait coverage gap** — 20/30 entries species_expansion non hanno `trait_plan` → contribuiscono al residuo orphan trait audit.
3. **Validator blind spot** — `morph_slots` non passa attraverso `validate_species.py` → drift naming/typo non caught (auto-discovered in audit 2026-05-06).
4. **Worktree friction Wave 7** — il fix additivo (`trait_plan` parallel) ha richiesto refactor logic in `tools/py/lint_mutations.py` per leggere entrambi gli schema. Tech debt cumulative.

## Decision

**Recommend Path B** (migrate `morph_slots` → `default_parts` + complete `trait_plan` per tutte le 30 species, deprecate `morph_slots` field, single canonical schema).

Effort estimate: **~3-5h** scoped + zero runtime risk (nessun consumer da rompere).

## Alternatives

### Path A — Keep parallel schema forever (no migration)

**Decisione**: lasciare `morph_slots` su `species_expansion.yaml`, accettare schema dual permanente.

- **Pro**: zero effort immediato, zero risk.
- **Con**:
  - Schema debt permanente (ogni nuovo developer/agent deve imparare entrambi).
  - Trait coverage gap non chiuso → 20 species "muti" per validator/synergy.
  - Future feature multi-schema cost ~+30% per ogni layer (esempio Wave 7 lint_mutations refactor).
  - Audit gate 5 "engine LIVE/surface DEAD" rischio recurrence (morph_slots = engine dead).
- **Verdict**: scoraggiata. Accumula debito senza chiusura prevista.

### Path B — Migrate `morph_slots` → `default_parts` canonical (RECOMMENDED)

**Decisione**: convertire le 30 entries in `species_expansion.yaml` allo schema `default_parts` + completare `trait_plan` per tutte le 30. Mantieni i due file separati (roster canonical + roster espansione) ma con **schema condiviso**.

- **Step**:
  1. Script di transform `morph_slots: {a, b, c, d, e}` → `default_parts: {locomotion: a, metabolism: e, offense: [b], defense: [c], senses: [d]}` (lista wrap per offense/defense/senses per parity con `species.yaml`).
  2. Per le 20 entries senza `trait_plan` → identify core/optional/synergies via lookup nei trait audit doc (ancestor families) + grep active_effects.yaml.
  3. Validator coverage: estendere `tools/py/validate_species.py` per loadare anche `species_expansion.yaml` (oggi load solo `species.yaml`).
  4. Smoke: validate-datasets + AI 382/382.
- **Pro**:
  - Single canonical schema cross-roster.
  - Validator coverage 50/50 (era 20/50).
  - Trait coverage potenziale completa 30/30.
  - Zero runtime breaking (no consumer attuale).
- **Con**:
  - ~3-5h scoped (script + 20 trait_plan stub + validator extension).
  - Master-dd review necessario per i 20 trait_plan stub (lore-faithful).
- **Verdict**: **RECOMMENDED**.

### Path C — Merge `species_expansion.yaml` → `species.yaml` single source

**Decisione**: appendere tutte le 30 entries a `species.yaml`, eliminare `species_expansion.yaml`, single roster file.

- **Pro**:
  - Single source of truth assoluto (50 species in 1 file).
  - Zero ambiguità "quale file edito?".
- **Con**:
  - ~5-7h (Path B + merge + grep-fix tutti i path di riferimento + audit roster consumers).
  - File `species.yaml` cresce a ~2200 LOC (perde navigabilità).
  - Loss della distinzione semantica "canonical curated (20)" vs "expansion import (30)".
- **Verdict**: rejected unless master-dd flags single-file preference esplicitamente.

## Consequences

### Se Path B accepted

- **Pro**:
  - Validator runs `python tools/py/validate_species.py` covers 50/50 species.
  - Trait wiring 30/30 grep-able dai catalog tool.
  - Wave 7 additive trait_plan non più workaround → diventa canonical structure.
  - Unblock futuri agent (e.g. `species-curator`) lavoro single-schema.
- **Con**:
  - 20 trait_plan stub richiedono master-dd lore review (NON Claude autonomous — Gate "no anticipated judgment" CLAUDE.md §"No anticipated judgment").
  - `tools/py/lint_mutations.py` refactor (parziale) per drop dual-schema branch.

### Se Path A (status quo)

- **Pro**: zero touch ora.
- **Con**: schema debt cumulative + audit recurrence costo.

### Se Path C (merge)

- **Pro**: single file.
- **Con**: navigabilità + ~10 grep-fix path consumer in docs/code.

## Effort estimate

| Path | Effort | Risk       | Trait coverage | Validator coverage |
| ---- | ------ | ---------- | -------------- | ------------------ |
| A    | 0h     | low (debt) | 20/50 (40%)    | 20/50 (40%)        |
| B    | 3-5h   | low        | 50/50 (100%)\* | 50/50 (100%)       |
| C    | 5-7h   | medium     | 50/50 (100%)\* | 50/50 (100%)       |

\* trait_plan stub require master-dd review, non Claude autonomous.

## Acceptance criteria

- Master-dd selects Path A / B / C in PR comment or successor ADR.
- Se Path B/C: spawn implementation ticket scoped in Sprint Q+ o follow-up sprint con effort allocato.
- Se Path A: chiusura formal di questo ADR come "rejected, parallel schema accepted" + nota explicit in `CLAUDE.md` repo layout section ("two schemas by design").

## References

- PR #2214 — Wave 7 additive trait_plan workaround (squash pending)
- `data/core/species.yaml` (20 entries canonical)
- `data/core/species_expansion.yaml` (30 entries morph_slots)
- `tools/py/validate_species.py` — validator canonical (default_parts only)
- `docs/reports/2026-05-06-species-forms-traits-audit.md` — audit forensic identifying drift
- `docs/planning/2026-05-10-notte-trait-orphan-full-closure-handoff.md` — Wave 7 closure context
- ADR-2026-04-19 — kill python rules engine (precedent canonical migration pattern)
- ADR-2026-05-02 — species ecology schema (precedent additive schema extension)

---

**Master-dd verdict gate**: questa ADR è PROPOSED. Procedere a IMPLEMENTATION solo dopo verdict esplicito Path A / B / C nel PR thread o successor ADR.
