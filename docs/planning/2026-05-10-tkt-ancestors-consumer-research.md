---
title: TKT-ANCESTORS-CONSUMER — Research adapt findings + corrected scope
status: actionable-master-dd
date: 2026-05-10
type: planning
audience: master-dd
priority: low (P2 corrected)
related:
  - data/core/ancestors/ancestors_rename_proposal_v1.yaml
  - data/core/ancestors/ancestors_rename_proposal_v2.yaml
  - data/core/traits/active_effects.yaml
  - docs/museum/MUSEUM.md
  - PR #2164 T4 species candidate proposals
  - BACKLOG.md TKT-ANCESTORS-CONSUMER
---

# TKT-ANCESTORS-CONSUMER — Research adapt findings

User verdict 2026-05-10 #F3 = "accept tramite research adapt museum e agent (usa anche la swarm)". Research dispatched via `repo-archaeologist` agent + museum + swarm reports.

## Major finding — BACKLOG description was misleading

Original BACKLOG: _"`data/core/ancestors/` 297 proposal entries zero runtime consumer (proposal-only inert data)"_.

**Reality post-research**: i 297 proposals are **NAMING MIGRATION DOCS**, NOT unimplemented traits.

- `ancestors_rename_proposal_v1.yaml` (4640 lines, English IDs)
- `ancestors_rename_proposal_v2.yaml` (4645 lines, Italian IDs — master-dd verdict 2026-04-27)

**290 / 297 (~97%) traits already applied a `data/core/traits/active_effects.yaml`** post-collapse. Files YAML proposals = provenance + attribution registries (CC BY-NC-SA 3.0 wiki sources).

## Distribution by branch (18 branches)

| Branch           | Count | Notes               |
| ---------------- | :---: | ------------------- |
| Senses           |  37   | predator perception |
| Dexterity        |  33   | precision motor     |
| Preventive Med   |  30   | resilience          |
| Ambulation       |  26   | terrain traversal   |
| Therapeutic Med  |  24   | healing             |
| Communication    |  20   | social              |
| Motricity        |  20   | gross motor         |
| Hominid lineages |  33   | 3 split types       |
| Intelligence     |  14   | cognitive           |
| Settlement       |  10   | proto-civic         |
| Dodge            |  10   | evasion             |
| Omnivore         |  11   | diet flexibility    |
| Attack           |   8   | predator            |
| Swim             |   5   | aquatic             |
| Metabolism       |   4   | energy              |

**Genetic/T2 split**: 89 genetic (BB-prefixed T2) + 208 regular (T1) = 297.

## What's already consumed runtime

- `passiveStatusApplier.js` (Sprint 13) — Wave A statuses (linked/fed/healing/attuned/sensed/telepatic_link) per `apply_status` ancestors at session/start + applyEndOfRoundSideEffects
- `traitEffects.js evaluateMovementTraits` (PR #2058) — `buff_stat: move_bonus` per Ambulation/Motricity ancestors (51 traits reduce AP cost)
- `passesBasicTriggers` — `extra_damage` ancestors (Self-Control/Attack/Dodge MoS thresholds)

## What's NOT consumed

- `legacy_code` (AB 01, FR 01...) — nowhere referenced runtime
- `sources` (wiki URLs) — provenance only
- `branch` groupings — no code groups by branch

## Adapt paths comparative

| Path                                                | Effort |   Player-visible?   | Pillar | Scope                |
| --------------------------------------------------- | :----: | :-----------------: | :----: | -------------------- |
| **A** Codex browser (lore tab)                      |  ~2h   |         YES         | P3+P4  | NEW UI required      |
| **B** Trait pool seeder (branch → biome_pools.json) |  ~4h   | INDIRECT (unit gen) | P2+P3  | Service+data         |
| **C** Encounter briefing ink injection              |  ~6h   |         YES         | P1+P4  | Ink narrative wire   |
| **D** T4 species seeder (PR #2164)                  | ~0h ✅ |      INDIRECT       | P2+P3  | Already in motion    |
| **E** Discard proposals (delete v1/v2 YAML)         |  ~1h   |         N/A         |   —    | Requires museum card |

## Primary recommendation: **Path B + Path D**

**Path D already covered**: PR #2164 T4 species candidate proposals (`docs/planning/2026-05-10-tkt-species-candidate-t4-proposals.md`) reference museum M-001 + branch → orphan trait → active_effects chain. Zero new work.

**Path B (biome pool seeder, ~4h)**:

- Uses branch groupings (unique proposal value not in active_effects)
- AB/SW/MT → terrain-traversal biomes
- CM/IN → social biomes
- SE/DX/AT → predator biomes
- Wires `biome_pools.json` known gap (TKT-BIOME-POOL-EXPAND open)
- Blast radius: ×1.2 (service layer only)
- Zero schema change

**Path E rejected (completionist-preserve protocol)**: museum card required pre-delete per CLAUDE.md 2026-05-08 rule. Archival via museum card additive — separate ticket if master-dd accepts.

## Master-dd verdict needed

Q1: Path B ship now (~4h biome pool seeder using branch metadata)?
Q2: Discard proposal YAML v1/v2 (Path E) — museum card archival sufficient OR keep canonical reference?
Q3: BACKLOG TKT-ANCESTORS-CONSUMER description correction — update from "zero runtime consumer" → "naming migration applied, branch metadata unconsumed"?

## Out of scope this doc

- Path A codex browser UI (NEW UI scope)
- Path C ink narrative wire (multi-system)
- Path B implementation (verdict gated)

## Resume trigger

> _"TKT-ANCESTORS-CONSUMER ship Path B — biome_pools.json seed using branch metadata da ancestors_rename_proposal_v2.yaml"_

OR

> _"TKT-ANCESTORS-CONSUMER archive proposals — museum card M-2026-05-10-XXX preserve provenance, delete v1/v2 YAML"_
