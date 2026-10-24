---
title: 'Legacy Claude Code Packet v1 — archived 2026-05-06'
doc_status: historical_ref
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 365
related:
  - docs/planning/2026-05-06-sessione-closure-handoff.md
  - data/core/jobs.yaml
  - data/core/jobs_expansion.yaml
---

# Legacy Claude Code Packet v1 — archived 2026-05-06

## Status

ARCHIVED — historical reference only. **NON eseguire i prompt drop-in originali**.

## Origine

Pacchetto standalone `evo_legacy_claude_code_packet_v1.zip` (367KB, 70+ file) prodotto 2026-05-04 per ripartire Claude Code senza ricostruire context. Audit `evo_tactics_param_synergy_v8_3` legacy vs Game + Game-Godot-v2.

Original zip preserved in `~/Desktop/Asset gen/evo_legacy_claude_code_packet_v1.zip` (path PC-locale, NOT in repo).

## Cosa è preservato qui

Solo materiali con valore storico/template:

- `01_context/` — source map gerarchia + no-import policy + project state snapshot 2026-05-04
- `02_audit/` — legacy audit report + legacy_to_godot_matrix.csv + summary.json (audit completo legacy pack)
- `04_workflow/` — legacy triage workflow + recommended first sprint
- `05_templates/` — 4 template (job recovery + legacy triage card + morph promotion + PR plan)
- `06_tasks/` — 5 task sequence (verify state + inventory + job recovery + gear/tag/surge + mating/lineage)

## Cosa NON è preservato

- `00_START_HERE/README_START_HERE.md` — entrypoint context obsoleto
- `03_legacy_source/` (170KB zip + extracted 60+ YAML) — legacy pack archive ridondante (original `~/Desktop/Asset gen/` preserved + git history)
- `07_scripts/packet_check.py` — non utile fuori original packet
- `08_manifests/` — manifest packet obsoleto
- `09_prompts/CLAUDE_CODE_INITIAL_PROMPT.txt` + `PROMPT_SHORT_DROP_IN.txt` — **escluso intenzionalmente**: prompts overrider context attuale repo, già più aggiornato post-sessione 2026-05-05/06

## Stato audit packet vs realtà sessione 2026-05-05/06

Audit packet 2026-05-04 era **largely outdated** post 14 PR shipped 2026-05-05/06:

| Task packet                                | Stato reale 2026-05-06 | Evidence                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TASK_02 Legacy Job Recovery 6 job          | ✅ DONE                | 7 job (skirmisher+vanguard+warden+artificer+invoker+harvester+ranger) r1-r4 wired in `data/core/jobs.yaml` (PR [#1978](https://github.com/MasterDD-L34D/Game/pull/1978) + [#2057](https://github.com/MasterDD-L34D/Game/pull/2057)). 35 base + 8 expansion ability r3/r4. |
| TASK_04 Mating/Lineage compare             | ✅ DONE                | Mating engine PR [#1879](https://github.com/MasterDD-L34D/Game/pull/1879) + Sprint 12 wire. LineagePropagator live.                                                                                                                                                       |
| TASK_03 Gear/tag/surge review              | ⚠️ FUTURE              | Audit ha già declared "future Sprint" + "non canonical runtime". Defer plan v3.3+.                                                                                                                                                                                        |
| TASK_00 + TASK_01 verify state + inventory | 📝 RUNNABLE            | Useful sanity check ma audit handoff già fatto sessione 2026-05-05 ([repo audit handoff](../../../planning/2026-05-05-repo-content-audit-handoff.md)).                                                                                                                    |

## Quando consultare questo archive

- 🟢 **Templates** (`05_templates/`) — riusabili per future legacy triage cycle (Sprint Q ETL Godot port + future legacy pack)
- 🟢 **NO_DIRECT_IMPORT_POLICY** (`01_context/`) — esplicita la regola implicit in CLAUDE.md per port Godot
- 🟢 **legacy_to_godot_matrix.csv** (`02_audit/`) — reference audit storico cross-repo
- 🔴 **NON consultare** `06_tasks/TASK_02_LEGACY_JOB_RECOVERY_PASS.md` come actionable — già done

## Pipeline canonical preservata

```
legacy idea → design review → Game canonical dataset/spec → ETL/sync → Game-Godot-v2 port
```

Non importare YAML legacy direttamente in Godot v2. Vedi `01_context/NO_DIRECT_IMPORT_POLICY.md`.

## Companion packet — Ferrospora image pipeline

Companion packet `ferrospora_image_pipeline_decision_pack_v1.zip` (12KB) target Game-Godot-v2 repo (out-of-scope here). Drop quando Sprint M.3 asset import live. Vedi [`docs/planning/2026-05-06-ferrospora-pipeline-handoff.md`](../../planning/2026-05-06-ferrospora-pipeline-handoff.md) per deployment notes.
