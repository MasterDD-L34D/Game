---
title: 'ADR-2026-05-06: Drop Sprint L HermeticOrmus prompt cherry-pick — out-of-scope MVP vertical slice'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md
---

# ADR-2026-05-06 — Drop Sprint L HermeticOrmus

## Status

ACCEPTED — 2026-05-06

## Context

Sprint L (HermeticOrmus prompt cherry-pick, ~2 giorni) era enumerato in `docs/planning/2026-04-28-master-execution-plan.md §Sprint L` (lines 539-572) come fase post-Sprint K Donchitos cherry-pick. Source: `https://github.com/HermeticOrmus/claude-code-game-development` (MIT). Scope: 10-15 prompt cherry-picked + 5-8 pattern doc per pixel art / tactical AI / combat balance / procedural level / narrative branching.

Plan v3 (`docs/planning/2026-04-29-master-execution-plan-v3.md`, post-pivot Godot 2026-04-29) ha **silently dropped** Sprint L senza ADR formal. Gap audit synthesis 2026-04-30 (3 agent paralleli, `docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md §P1.4`) ha flagged dropped-silent come P1 deferred plan v3.3 → richiesto ADR formal "drop" o "incorporate Sprint M.1b decision later".

**User direction inferred** (plan v3 § effort sequencing): MVP vertical slice = Sprint M.1-M.7 + N.1-N.7 → priority Godot bootstrap + GATE 0 failure-model parity. Prompt library expansion = nice-to-have, NON gate per playable demo.

## Decision

**DROP Sprint L formal**. Out-of-scope MVP vertical slice (Sprint M+N).

Reasoning:

1. **Effort/value mismatch**: 2 giorni cherry-pick prompt library = zero impact gate exit Sprint N (vertical slice playable). Master DD cherry-pick on-demand quando emergono use case concreti (es. "serve prompt pixel art per Skiv silhouette spec Sprint M.3" → cherry-pick mirato 30min vs 2 giorni speculative).
2. **HermeticOrmus repo già accessibile**: MIT license, clone + grep on-demand basta. NON serve adoption preventiva a repo livello.
3. **Bloat risk**: 100 prompt generic in `.claude/prompts/` aumenta noise auto-skills routing senza chiaro ROI. Donchitos cherry-pick (Sprint K) già fornisce 18 agent + 32 skill curated tactical-RPG-focus.
4. **Plan v3 sequencing**: Sprint L collocato post-K pre-M.1 = gating Godot bootstrap su task non-bloccante. Drop unblocks 2g calendar Sprint M.1 onset.

## Consequences

**Positive**:

- Plan v3.3 effort -2g (~14% saving Sprint K-M phase, da 14g → 12g cumulative)
- Zero gating non necessario pre Sprint M.1 Godot bootstrap
- Cherry-pick on-demand mantiene optionality (accesso futuro non bloccato)

**Negative**:

- Possibile valore residuo prompt patterns mai discovered (mitigation: Master DD revisit on-demand quando hit specific blocker)
- Plan v3 sequencing doc references Sprint L deprecated → followup edit required

**Neutral**:

- Donchitos Sprint K cherry-pick scope rimane 18 agent + 32 skill (no expansion)
- HermeticOrmus repo NOT removed da `LIBRARY.md` reference index (rimane accessibile)

## Implementation

1. **Plan v3 cleanup** — `docs/planning/2026-04-29-master-execution-plan-v3.md` rimuovere/strikethrough Sprint L row in sequence table. Marker: "Sprint L DROPPED ADR-2026-05-06".
2. **Plan v2 archival** — `docs/planning/2026-04-28-master-execution-plan.md §Sprint L` (lines 539-572) ha già status `Superseded items only` (ADR-2026-04-28-deep-research-actions §G.2b/H/A1 superseded). Sprint L sezione lasciata come reference storica con ADR cross-link.
3. **Gap audit close** — `docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md §P1.4` aggiornato a CLOSED ADR-2026-05-06.
4. **BACKLOG.md** — rimuovere row "ADR drop HermeticOrmus formal ~30min" da Sprint Fase 1 deferred P1 plan v3.3.

## Reversibility

Reversibile in qualsiasi momento via nuovo ADR "revive Sprint L" + clone + cherry-pick mirato. Costo revive ~2g (uguale a Sprint L originale). Nessuna decisione schema/contratto vincola questa scelta.

## Cross-reference

- Source: `https://github.com/HermeticOrmus/claude-code-game-development`
- Plan v3 master: [`docs/planning/2026-04-29-master-execution-plan-v3.md`](../planning/2026-04-29-master-execution-plan-v3.md)
- Plan v2 archive: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md) §Sprint L lines 539-572
- Gap audit synthesis P1.4: [`docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md`](../research/2026-04-30-gap-audit-plan-v3-2-synthesis.md)
- Donchitos Sprint K (rimane): plan v3 § Sprint K
