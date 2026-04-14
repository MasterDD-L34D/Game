# Daily PR Summary — 2025-11-29

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#949](https://github.com/MasterDD-L34D/Game/pull/949) | Update migration plan to latest 2026 status | @MasterDD-L34D | 2025-11-29T01:11:16Z |
| [#950](https://github.com/MasterDD-L34D/Game/pull/950) | Formalize 01A deadlines and add 02A operational row | @MasterDD-L34D | 2025-11-29T01:14:29Z |
| [#951](https://github.com/MasterDD-L34D/Game/pull/951) | Add targeted migration workplan | @MasterDD-L34D | 2025-11-29T01:18:56Z |
| [#952](https://github.com/MasterDD-L34D/Game/pull/952) | Record 02A rerun status with logs | @MasterDD-L34D | 2025-11-29T01:37:39Z |
| [#953](https://github.com/MasterDD-L34D/Game/pull/953) | Reorder biome metadata to root level | @MasterDD-L34D | 2025-11-29T01:43:45Z |
| [#954](https://github.com/MasterDD-L34D/Game/pull/954) | Add synergies and species affinities to trait dataset | @MasterDD-L34D | 2025-11-29T01:53:01Z |
| [#955](https://github.com/MasterDD-L34D/Game/pull/955) | Complete biome note metadata for trait style checks | @MasterDD-L34D | 2025-11-29T02:12:21Z |
| [#956](https://github.com/MasterDD-L34D/Game/pull/956) | Fix trait synergies and slot coverage | @MasterDD-L34D | 2025-11-29T02:24:12Z |
| [#957](https://github.com/MasterDD-L34D/Game/pull/957) | Update validator rerun log | @MasterDD-L34D | 2025-11-29T02:33:34Z |
| [#958](https://github.com/MasterDD-L34D/Game/pull/958) | Update 02A checklist log references | @MasterDD-L34D | 2025-11-29T02:39:30Z |
| [#959](https://github.com/MasterDD-L34D/Game/pull/959) | Add freeze phase procedure and log template | @MasterDD-L34D | 2025-11-29T02:41:42Z |
| [#960](https://github.com/MasterDD-L34D/Game/pull/960) | Add guardrails for applying patch 03A | @MasterDD-L34D | 2025-11-29T02:47:23Z |
| [#961](https://github.com/MasterDD-L34D/Game/pull/961) | Add 03B redirect checklist and log guidance | @MasterDD-L34D | 2025-11-29T02:59:06Z |
| [#962](https://github.com/MasterDD-L34D/Game/pull/962) | Add CI promotion tracking for patch 01C | @MasterDD-L34D | 2025-11-29T04:10:01Z |
| [#963](https://github.com/MasterDD-L34D/Game/pull/963) | Add post-migration checklist for trait/biome alignment | @MasterDD-L34D | 2025-11-29T04:43:57Z |
| [#964](https://github.com/MasterDD-L34D/Game/pull/964) | Document 2025-11-29 freeze backups for 03A/03B | @MasterDD-L34D | 2025-11-29T05:36:45Z |
| [#965](https://github.com/MasterDD-L34D/Game/pull/965) | Update 03A changelog with validation logs | @MasterDD-L34D | 2025-11-29T06:34:34Z |
| [#966](https://github.com/MasterDD-L34D/Game/pull/966) | Track CI runs and validate-naming decision | @MasterDD-L34D | 2025-11-29T13:01:28Z |
| [#967](https://github.com/MasterDD-L34D/Game/pull/967) | Normalize famiglia tipologia for abyss traits | @MasterDD-L34D | 2025-11-29T14:11:47Z |
| [#968](https://github.com/MasterDD-L34D/Game/pull/968) | Add Frattura Abissale Sinaptica trait files and rebuild index | @MasterDD-L34D | 2025-11-29T15:28:18Z |

## #949 — Update migration plan to latest 2026 status

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T01:11:16Z
- Link: https://github.com/MasterDD-L34D/Game/pull/949

> ## Summary
> - align migration plan header with 2026 version/date and freeze status per latest logs
> - mark gate approvals for 01A/01B/01C and 03A/03B with 02A as the remaining open gate
> - add changelog entry referencing 2026 log updates and patch branches
> ## Testing
> - Not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a3496d2e88328acca0106db8ff4df)

## #950 — Formalize 01A deadlines and add 02A operational row

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T01:14:29Z
- Link: https://github.com/MasterDD-L34D/Game/pull/950

> ## Summary
> - set concrete due-dates for Log attività 01A and Gap list 01A based on 2026 approval logs and freeze dependencies
> - add operational 02A validator row with owner and expected window tied to freeze 03A/03B
> - note dates shared with Master DD and record calendar formalization in the changelog
> ## Testing
> - not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a483b7eec83288066078f0672ea24)

## #951 — Add targeted migration workplan

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T01:18:56Z
- Link: https://github.com/MasterDD-L34D/Game/pull/951

> ## Summary
> - add a targeted migration workplan capturing high-impact tasks to start the migration
> ## Testing
> - not run (documentation change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a4900495c8328832b2cad65cfa0e6)

## #952 — Record 02A rerun status with logs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T01:37:39Z
- Link: https://github.com/MasterDD-L34D/Game/pull/952

> ## Summary
> - document the latest 02A rerun status with log paths and open items for schema and trait alignment
> - capture executed validation steps and outstanding i18n/trait notes flagged by style checks
> - keep Master DD sign-off explicit and pending
> ## Testing
> - python tools/py/validate_datasets.py --schemas-only
> - python scripts/trait_audit.py --check
> - node scripts/trait_style_check.js
> - npx prettier --check docs/migration_targeted_workplan.md
> ------

## #953 — Reorder biome metadata to root level

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T01:43:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/953

> ## Summary
> - repositioned vc_adapt, mutations, and frequencies blocks to the root of data/core/biomes.yaml alongside the biomes catalog
> - ensured the biomes map now contains only biome entries without accessory sections
> ## Testing
> - python - <<'PY' (jsonschema.validate biomes.yaml against config/schemas/biome.schema.yaml)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a4e6757d8832896f509a5b07c2b13)

## #954 — Add synergies and species affinities to trait dataset

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T01:53:01Z
- Link: https://github.com/MasterDD-L34D/Game/pull/954

> ## Summary
> - Populate sinergie, slot choices, and sinergie_pi combinations for strategy, offensive, sensorial, and support traits, aligning usage tags with canonical roles.
> - Add species_affinity mappings in trait files, index, and shared registry, including updated biome notes for ali_fono_risonanti.
> - Synchronize data/index entries to reflect new combinations, species links, and slot assignments.
> ## Testing
> - node scripts/trait_style_check.js --output-json /tmp/trait_style.json --output-markdown /tmp/trait_style.md --fail-on-error
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a4fd79760832890417b2bac1fc695)

## #955 — Complete biome note metadata for trait style checks

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:12:21Z
- Link: https://github.com/MasterDD-L34D/Game/pull/955

> ## Summary
> - populate biome activation notes across 62 trait JSON files to resolve the informational suggestions on environmental requirements
> - align rationale text for terrestrial and foresta_miceliale traits so the style check no longer reports pending warnings
> ## Testing
> - node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on-error
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a529eccb083288f9f6acc31110744)

## #956 — Fix trait synergies and slot coverage

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:24:12Z
- Link: https://github.com/MasterDD-L34D/Game/pull/956

> ## Summary
> - add coverage forms to packs.yaml to reference previously unused trait slots
> - add missing reciprocal synergies across trait catalog entries
> - rerun trait audit to refresh reports and surface current schema validation issues
> ## Testing
> - python scripts/trait_audit.py
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a5715a0608328bd5f04bdab7e0144)

## #957 — Update validator rerun log

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:33:34Z
- Link: https://github.com/MasterDD-L34D/Game/pull/957

> ## Summary
> - document the latest schema-only validation rerun for evo_tactics_pack after bridge-species fix
> - note that the validator now reports zero warnings for the pack
> ## Testing
> - python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a59541b048328ab966194ac87a712)

## #958 — Update 02A checklist log references

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:39:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/958

> ## Summary
> - update the 02A operational checklist to point to current validator logs stored under logs/
> - keep Master DD approval state and execution items marked completed
> ## Testing
> - not run (documentation changes only)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a5b8b3cdc8328a51dc3f05abd61b0)

## #959 — Add freeze phase procedure and log template

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:41:42Z
- Link: https://github.com/MasterDD-L34D/Game/pull/959

> ## Summary
> - document standard procedure to open/close freeze phase 3→4 with snapshots, backups, and branch references
> - add dry-run rollback checklist and Master DD approval gate for freeze closure
> - provide a logging template for freeze entries in logs/agent_activity.md with timestamp, owner, and backup details
> ## Testing
> - not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a5cf467e08328b63ce612056f6c89)

## #960 — Add guardrails for applying patch 03A

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:47:23Z
- Link: https://github.com/MasterDD-L34D/Game/pull/960

> ## Summary
> - documentare prerequisito 02A verde e checklist operativa per applicare la patch 03A su core/derived
> - aggiungere template di changelog linkabile e sezione con comandi di rollback rapidi
> - inserire punto di controllo per rieseguire i validator 02A post-patch con output archiviati
> ## Testing
> - non eseguito (documentazione)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a5dcab0e883288e7b5385e40ae6d1)

## #961 — Add 03B redirect checklist and log guidance

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T02:59:06Z
- Link: https://github.com/MasterDD-L34D/Game/pull/961

> ## Summary
> - expand the 03B steps with an explicit checklist for backups, redirect/link verification, and 02A smoke reporting
> - require redirect report and freeze-closure log with Master DD approval in the logging template
> - add recommended owners and archived report format for redirect documentation in `logs/`
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a5ec35b548328a94115bed2bc0cff)

## #962 — Add CI promotion tracking for patch 01C

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T04:10:01Z
- Link: https://github.com/MasterDD-L34D/Game/pull/962

> ## Summary
> - extend the progressive CI promotion section with a tracking table and enforcement note for validate-naming
> - add a logs entry to capture CI outcomes and links for patch/01C-tooling-ci-catalog
> ## Testing
> - not run (documentation-only change)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a61803e9c8328ad2554707df2177c)

## #963 — Add post-migration checklist for trait/biome alignment

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T04:43:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/963

> ## Summary
> - add a post-migration checklist covering trait pipeline execution, QA, and index updates
> - specify owners, file paths to refresh, and tracking fields for QA reports and index URLs
> ## Testing
> - not run (documentation-only changes)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a722119ac8328896d8d3815a4dd60)

## #964 — Document 2025-11-29 freeze backups for 03A/03B

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T05:36:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/964

> ## Descrizione
> - Documentato il freeze 2025-11-29 per i branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup` con manifest e istruzioni di ripristino per snapshot `data/core`, `data/derived` e backup `incoming/`.
> - Registrati percorsi e checksum degli archivi generati in staging locale e note operative per il trasferimento su storage permanente.
> - Eseguito dry-run rollback con i validator 02A (schema-only, trait audit, trait style) e loggato esito/owner in `logs/agent_activity.md`.
> ## Checklist guida stile & QA
> - [x] Nessuna modifica a `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**` nella finestra freeze 2025-11-25T12:05Z–2025-11-27T12:05Z (salvo rollback autorizzati Master DD)
> - [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
> - [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
> - [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati
> - [x] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact)

## #965 — Update 03A changelog with validation logs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T06:34:34Z
- Link: https://github.com/MasterDD-L34D/Game/pull/965

> ## Summary
> - update the 03A core/derived changelog with the latest validation run and rollback snippet
> - add the 2025-11-29 schema-only, trait audit, and trait style logs/json to `logs/`
> ## Testing
> - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
> - `python scripts/trait_audit.py --check`
> - `node scripts/trait_style_check.js --output-json logs/trait_style_2025-11-29.json --fail-on error`
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692a8678030c8328b7fe3c0b02c5a0b4)

## #966 — Track CI runs and validate-naming decision

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T13:01:28Z
- Link: https://github.com/MasterDD-L34D/Game/pull/966

> ## Summary
> - track three schema-only data-quality runs and link local logs in the CI memo
> - record validate_traits run 1 outcome and add three schema-validate runs with log references
> - document the decision to keep validate-naming consultative with rollback guidance and ownership notes
> ## Testing
> - python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack
> - bash -lc "python - <<'PY'\nimport json,glob,sys\nfrom jsonschema import Draft202012Validator\nerrors=[]\nfor path in glob.glob('schemas/*.json'):\n    with open(path, 'r', encoding='utf-8') as f:\n        data=json.load(f)\n    try:\n        Draft202012Validator.check_schema(data)\n    except Exception as e:\n        errors.append(f\"{path}: {e}\")\nif errors:\n    for e in errors:\n        print(e)\n    sys.exit(1)\nelse:\n    print('All schemas OK')\nPY"
> - bash -lc "python tools/py/trait_template_validator.py --summary && node scripts/build_trait_index.js && python tools/py/report_trait_coverage.py --strict && node scripts/trait_style_check.js --output-json logs/ci/trait_style_run1.json --output-markdown logs/ci/trait_style_run1.md --fail-on error" (fails: index/coverage mismatches)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692aec3ac46c8328a682bd218cd4a8c0)

## #967 — Normalize famiglia tipologia for abyss traits

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T14:11:47Z
- Link: https://github.com/MasterDD-L34D/Game/pull/967

> ## Summary
> - normalize `famiglia_tipologia` for `sensori_planctonici` and `nebbia_mnesica` to the Macro/Sotto format with alphanumeric-friendly labels
> - keep trait metadata aligned with their analytical and mnesic-control roles
> ## Testing
> - python tools/py/trait_template_validator.py --summary
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_692af17efa6883288cab0c91935094d6)

## #968 — Add Frattura Abissale Sinaptica trait files and rebuild index

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-29T15:28:18Z
- Link: https://github.com/MasterDD-L34D/Game/pull/968

> ## Summary
> - add explicit trait definitions for the Frattura Abissale Sinaptica set with valid families, tiers, and biome requirements
> - rebuild the trait index and regenerate coverage outputs after adding the new entries
> - record the successful validate_traits reruns for run2 and run3
> ## Testing
> - python tools/py/trait_template_validator.py --summary
> - node scripts/build_trait_index.js
> - python tools/py/report_trait_coverage.py --strict
> - node scripts/trait_style_check.js --output-json reports/trait_style/trait_style_report.json --output-markdown reports/trait_style/trait_style_report.md --fail-on error
> ------
