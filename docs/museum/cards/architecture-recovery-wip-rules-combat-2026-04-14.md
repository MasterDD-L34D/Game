---
title: work/recovery-wip — Rules engine + combat API stub + d20 schema (50 file orphan post #1295)
museum_id: M-2026-05-04-001
type: code-orphan
domain: architecture
provenance:
  found_at: origin/work/recovery-wip
  git_sha_first: 9a34610a
  git_sha_last: 808595f5
  last_modified: 2026-04-14
  last_author: MasterDD-L34D
  buried_reason: PR #1295 squash-merged ma branch continued con 7 commit incrementali, mai PR'd singolarmente
  diff_archive: prune-2026-05-04/recovery_wip_full_diff.patch
relevance_score: 3
reuse_path: services/rules/* (DEPRECATED M6-#4 ADR-2026-04-19) + apps/backend/routes/combat.js (Node native sostituito) + tests/api/combat.test.js (potenziale salvage)
related_pillars: [P1, P6]
status: snapshot
excavated_by: repo-archaeologist
excavated_on: 2026-05-04
last_verified: 2026-05-04
doc_status: active
doc_owner: governance-illuminator
workstream: cross-cutting
source_of_truth: false
language: it
review_cycle_days: 14
---

# work/recovery-wip — Rules engine d20 + combat API stub orphan

## TL;DR

Branch creato 2026-04-13/14 contiene **50 file modificati / +1938 / -678** post-merge PR #1295 (squash). Mai PR'd come unità separata. Contenuto = combat API Node stub + rules engine Python iter + d20 schema + 16 forme base + roadmap update + spore complexity budget. Snapshot pre-prune 2026-05-04.

## Provenance verificata

```
git log origin/main..origin/work/recovery-wip --format='%h %cI %s'
808595f5 2026-04-14T00:50:35+02:00 fix: update JS tests and schema for new TRT-02 trait mechanics format
ac3ef104 2026-04-14T00:43:35+02:00 fix: Windows compatibility for npm scripts
1a5abeda 2026-04-14T00:21:00+02:00 feat: combat API stub, CLAUDE.md update, and governance alignment
44e939fe 2026-04-14T00:15:08+02:00 Merge remote-tracking branch 'origin/main' into work/recovery-wip
231b5168 2026-04-14T00:13:59+02:00 feat: update demo CLI with new trait IDs and fix resistances parsing
dc6c0f1d 2026-04-14T00:07:24+02:00 feat: implement defend action and fix on_hit_status key mapping
9a34610a 2026-04-13T23:55:28+02:00 feat: docs consolidation, trait balance values, and repo cleanup
```

## File map (50 file, top categorie)

| Categoria            | File                                                                                                  | LOC delta | Nota                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Combat API Node      | `apps/backend/routes/combat.js` (NEW)                                                                 |      +193 | Stub HTTP endpoint /api/combat. Sostituito da `apps/backend/services/combat/*` M6-#1 (2026-04-19)                                          |
| Rules engine Python  | `services/rules/{demo_cli,hydration,resolver}.py`                                                     |    +76/-? | DEPRECATED M6-#4 (ADR-2026-04-19 kill-python-rules-engine)                                                                                 |
| Schema contracts     | `packages/contracts/schemas/traitMechanics.schema.json`                                               |    +96/-? | Pre-r3/r4 ability tier shape                                                                                                               |
| Tests combat         | `tests/api/combat.test.js` (NEW)                                                                      |      +166 | Test suite combat stub. POTENZIALE SALVAGE — Node native combat ora a `apps/backend/services/combat/`                                      |
| Tests hydration      | `tests/api/contracts-hydration-snapshot.test.js`, `tests/test_hydration.py`, `tests/test_resolver.py` |      +213 | Probabilmente superati da test attuali sprint M6-#3                                                                                        |
| Trait mechanics yaml | `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`                                            |   +723/-? | Variant pre-balancing iter1. Subset probabilmente in main via PR #1505+.                                                                   |
| Docs core            | `docs/{01-VISIONE,10-SISTEMA_TATTICO,11-REGOLE_D20_TV,40-ROADMAP}.md`                                 |      +250 | Variant alt M3 era. Superato M3.5+ docs.                                                                                                   |
| Spore research       | `docs/research/refs/spore__*.yaml` (3 file)                                                           |      +129 | Spore complexity budget + part_based_scaling + stage_gated_progression. Possibile valore P2 (sprint Spore S1-S6 PR #1922 forse copre già). |

Full stat: `git diff origin/main...origin/work/recovery-wip --stat` — 50 files, +1938 insertions, -678 deletions.

## Why buried

PR #1295 chiuso 2026-04-13T21:07Z (merge_commit `bfb7015e`). User (`MasterDD-L34D`) ha continuato a sviluppare sul branch fino 2026-04-14T00:50Z (7 commit, ~3.7h post-merge). Branch mai aperto come PR singola. Probabile pattern: lavoro in continuation post-PR senza re-PR, abbandonato quando attenzione spostata altrove.

## Reality check 2026-05-04

- **services/rules/** = DEPRECATED M6-#4 (ADR-2026-04-19). User direction "1 solo gioco online, senza master" → Python engine = dead weight. Phase 2 feature freeze + Phase 3 removal pending. **NO new features porting**.
- **apps/backend/routes/combat.js** = sostituito da `apps/backend/services/combat/{resistanceEngine.js,reinforcementSpawner.js,objectiveEvaluator.js}` M6-#1 2026-04-19. Stub orphan vs runtime canonical Node.
- **packages/contracts/schemas/traitMechanics.schema.json** variant = potenziale conflict con r3/r4 ability syntax PR #1496+ + ability rank tier #1978.
- **trait_mechanics.yaml** +723/-? = grossa variante balance. Probabile superato da batch calibration M3.5+ + iter5 DPR validation.
- **tests/api/combat.test.js** = STUB testing, schema obsoleto. Forse 5-10% pattern transferable a test combat Node attuali.

## Reuse path possibili

1. **Minimal (NIL)**: contenuto fully obsoleto. Skip salvage. Branch delete OK.
2. **Moderate**: estrai 3 yaml spore (`spore__complexity_budget.yaml`, `spore__part_based_scaling.yaml`, `spore__stage_gated_progression.yaml`) per cross-check vs PR #1922 Spore S1-S6 shipped. Verifica eventual gaps.
3. **Full salvage** (~3-5h): leggere singolo commit per commit, verificare quale parte (combat.test.js pattern, schema delta, yaml balance) ha valore residuo vs main attuale. Cherry-pick. **Costo > beneficio probabile**: M6 sprint ha già rimpiazzato con architettura migliore.

## Decision 2026-05-04

User selezionato "Snapshot to museum + delete" — questa card snapshot. Branch `work/recovery-wip` viene incluso nella prune remote 438. Patch full archived: `docs/museum/excavations/2026-05-04-recovery-wip.patch` (riferimento).

Recovery se serve: `git fetch origin work/recovery-wip` non più disponibile post-prune; riapertura via SHA `808595f5` da reflog server-side (~30gg) OR re-apply patch da museum archive.

## Anti-pattern

Non re-fetchare `origin/work/recovery-wip` per lavoro nuovo: tutto contenuto è semantically superseded da M6-\* sprint architettura Node-native. Se serve combat stub pattern per refactor futuro, prendi `apps/backend/services/combat/` runtime canonical.
