---
title: 'ADR-2026-05-07 ABORT 3 web stack v1 quick wins (P1.8 plan v3.2 audit) — reincarnate Godot v2 audit P1 GAPs'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-07
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
tags: [adr, plan-v3-2, p1-deferred, web-v1-archive, godot-v2-pivot]
---

# ADR-2026-05-07 — ABORT web stack v1 quick wins (P1.8) → reincarnate Godot v2 audit P1 GAPs

## Status

ACCEPTED 2026-05-07.

## Context

Plan v3.2 gap audit synthesis 2026-04-30 ([`docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md §P1.8`](../research/2026-04-30-gap-audit-plan-v3-2-synthesis.md)) flagged 3 web stack v1 quick wins ~3h cumulative pre-Sprint M.1 freeze:

- **TKT-MUTATION-P6-VISUAL** ~1h P0 — visual mutation tag in HUD (helps P2 Spore wire)
- **Sprint 6 Thought Cabinet 8-slot orfano** (P1) — 4 slot wired, 4 ZERO surface
- **Sprint 10 QBN debrief orfano** — 17 events backend, debrief beat field shipped #1979 ma surface limited

Audit annotation: "NON urgenti ma low-cost archive prima freeze". Master-dd decision deferred plan v3.3.

Post-pivot Godot ([ADR-2026-04-29](ADR-2026-04-29-pivot-godot-immediate.md)) + cutover Phase A LIVE 2026-05-07 ([ADR-2026-05-05](ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md)), web stack v1 (`apps/play/src/`) entra in archive Phase B (post 7gg grace + 1+ playtest pass, target window ≥ 2026-05-14). Quick wins su frontend deprecato = effort sprecato.

## Decision

**ABORT formal 3 web stack v1 quick wins P1.8.** Re-incarnate target Godot v2 audit ([`Game-Godot-v2/docs/godot-v2/qa/2026-05-07-godot-surface-coverage-audit.md`](https://github.com/MasterDD-L34D/Game-Godot-v2)) P1 GAP residui:

| Originale web v1                | Re-incarnate Godot v2                        | Audit GAP | Effort | Pillar |
| ------------------------------- | -------------------------------------------- | :-------: | :----: | :----: |
| TKT-MUTATION-P6-VISUAL          | GAP-7 PassiveStatusApplier wire `main.gd`    |    P0     | ~1-2h  |   P3   |
| Sprint 6 Thought Cabinet 8-slot | GAP-9 ThoughtsRitual already shipped #203 ✅ |    P0     |  done  |   P4   |
| Sprint 10 QBN debrief orfano    | GAP-5 MissionTimer countdown HUD             |    P1     | ~2-3h  |   P6   |
| (bonus)                         | GAP-10 AiProgressMeter never instantiated    |    P1     |  ~1h   |   P5   |

GAP-9 closed via PR #203 (2026-05-07) — Thought Cabinet path Disco Elysium portrait analog. GAP-5 + GAP-7 + GAP-10 nuovi target Sprint M.7 chip post Phase A stable.

## Consequences

- **Web stack v1 frozen at current state.** No further patch su `apps/play/src/`. Bug critical-only fix se Phase B archive ritardato.
- **Plan v3.3 P1.8 → CLOSED ABORT** (formal). Synthesis doc updated.
- **Sprint M.7 scope expand**: ex-quick-wins target re-spec Godot. Audit GAP-5 + GAP-7 + GAP-10 incorporated come Sprint M.7 chip.
- **No effort waste**: GAP-7 PassiveStatusApplier shippa 297 ancestor passive trait (P3 win significativo vs web mutation tag), GAP-5 closes Long War 2 mission timer parity (P6), GAP-10 closes AI War Pilastro 5 visibility.

## Rollback

Improbabile. Trigger: Phase A rollback ([ADR-2026-05-05 §4.4](ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md)) → web v1 ri-LIVE. Quick wins originali re-instated come Sprint M.7 substitute.

## References

- Plan v3.2 synthesis: [`docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md`](../research/2026-04-30-gap-audit-plan-v3-2-synthesis.md) §P1.8
- ADR pivot Godot: [`ADR-2026-04-29-pivot-godot-immediate.md`](ADR-2026-04-29-pivot-godot-immediate.md)
- ADR cutover Phase A: [`ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md)
- Godot v2 surface audit: `Game-Godot-v2/docs/godot-v2/qa/2026-05-07-godot-surface-coverage-audit.md`
- PR #203 Godot v2 (GAP-2 + GAP-9): https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203
- PR #204 Godot v2 (GAP-1 + GAP-4 + D3): https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204
