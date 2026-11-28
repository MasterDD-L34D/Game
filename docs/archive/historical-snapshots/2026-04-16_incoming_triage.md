---
title: Incoming directory triage (2026-04-16)
doc_status: historical_ref
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 365
---

# Triage incoming/ (2026-04-16)

Issue: #1344. Totale pre-triage: 327 file, 6.6 MB.

## MANTENUTI (attivamente referenziati da Makefile, tools/, automation)

| Path                                                    | Motivo                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `incoming/scripts/` (7 file)                            | Makefile targets: evo-validate, evo-backlog, traits-review                    |
| `incoming/species/` (10 JSON)                           | Validation target per `make evo-validate`                                     |
| `incoming/templates/` (2 schema)                        | AJV validation schemas per species/trait                                      |
| `incoming/lavoro_da_classificare/` (9 file)             | tasks.yml + integration_batches.yml usati da evo_batch_runner + daily tracker |
| `incoming/pathfinder/bestiary1e_index.csv`              | Import source per pathfinder_bestiary.py                                      |
| `incoming/sentience_traits_v1.0.yaml`                   | DEFAULT_INCOMING_PATH in import_external_traits.py                            |
| `incoming/sensienti_traits_v0.1.yaml`                   | Versione precedente, referenziata in docs/planning                            |
| `incoming/engine_events.schema.json`                    | Event validation schema                                                       |
| `incoming/Ennagramma/` (6 file)                         | Enneagram mechanics dataset, referenced in VC scoring docs                    |
| `incoming/enneagramma_mechanics_registry.template.json` | Template per registry enneagramma                                             |
| `incoming/personality_module.v1.json`                   | Personality module data, referenced in planning docs                          |
| `incoming/recon_meccaniche.json`                        | Mechanics recon data                                                          |

## CANCELLATI (superseded, duplicati, o non referenziati)

### ZIP pack snapshots (50 file, 3.8 MB) — tutti superseded da packs/evo_tactics_pack/

Tutti i file `*.zip` nella root di incoming/: versioni storiche dei pack (v0.1-v2.0.1),
ancestors packs, neurons dumps, validator packs, starter packs, badlands addons.
Il contenuto canonico vive ora in `packs/evo_tactics_pack/` (v1.7+).

### CSV/DOCX/XLSX legacy (4 file)

- `Ancestors_Neurons_Attack_Dodge_SelfControl_Ambulation_Partial_v0_6.csv` — ingerito in data/
- `ancestors_branches_totals_v0.3.csv` — ingerito
- `ancestors_neurons_dump_v0.3__DEXTERITY.csv` — ingerito
- `evo_tactics_tables_v8_3.xlsx` — superseded da YAML datasets
- `Inserisci questi parametri nella tabella e dammi i....docx` — file con nome troncato, non referenziato

### Docs/meta non referenziati

- `incoming/README.md` — dispatcher doc, sostituito da docs/incoming/README.md
- `incoming/REDIRECTS.md` — redirect table obsoleta
- `incoming/IDEA-001_ecosistema_template.yaml` — template idea, non usato
- `incoming/idea_catalog.csv` — catalogo idee legacy
- `incoming/hook_bindings.ts` — binding hooks, non importato da nessun file
- `incoming/scan_engine_idents.py` — script standalone, non referenziato da Makefile

### Directories non referenziate

- `incoming/archive/` — vecchio archivio interno, sostituito da docs/archive/
- `incoming/archive_cold/` — archivio freddo, non referenziato
- `incoming/Img/` — SVG, licenza non confermata, non usate
- `incoming/ops/` — ops scripts legacy
- `incoming/tests/` — test fixture legacy

Tutto il contenuto cancellato resta in git history per eventuali recuperi.
