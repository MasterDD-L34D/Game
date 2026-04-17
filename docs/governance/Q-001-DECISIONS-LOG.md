---
title: 'Q-001 Decisions Log'
doc_status: active
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: true
language: it
review_cycle_days: 7
---

# Q-001 Decisions Log

Tracker ufficiale delle decisioni Master DD sui 9 DRAFT prodotti nel branch `explore/open-questions-triage` (PR #1463).

## Stato generale

- **Branch**: `explore/open-questions-triage`
- **PR**: #1463
- **Start review**: 2026-04-17
- **Approach**: A (sync batch 4h)
- **Tracker file**: questo doc

## Tier 1 · Quick approve

| #    | DRAFT                    | Decisione                               | Outcome                                        | Commit  | Data       |
| ---- | ------------------------ | --------------------------------------- | ---------------------------------------------- | ------- | ---------- |
| T1.1 | Loading tips YAML (Q26)  | Contenuto 22 tip OK?                    | ✅ SI (content confermato)                     | pending | 2026-04-17 |
| T1.2 | Accessibility YAML (Q22) | Struttura + 6 preset OK?                | ✅ SI (7 cat + 6 preset + volumi default)      | pending | 2026-04-17 |
| T1.3 | Deaf parity matrix (Q23) | Priority P0-P3 OK?                      | ✅ SI · playtest POST-M4                       | pending | 2026-04-17 |
| T1.4 | SFX spec (Q10)           | 13 categorie + procedural pipeline OK?  | ✅ SI · HYBRID pipeline · 50MB · POST-M4       | pending | 2026-04-17 |
| T1.5 | i18n scaffold (Q3)       | `data/i18n/` JSON + namespace split OK? | ✅ DATA · split · JSON · MUSTACHE · PR-2 first | pending | 2026-04-17 |

## Tier 2 · Mid review

| #    | DRAFT            | Decisione                  | Outcome | Commit | Data |
| ---- | ---------------- | -------------------------- | ------- | ------ | ---- |
| T2.1 | XP Cipher (G1.1) | Park definitivo?           | ☐ TBD   | —      | —    |
| T2.2 | Personas (A5)    | 3 persone + playtest plan? | ☐ TBD   | —      | —    |
| T2.3 | Difficulty (A3)  | 5-PR split + profiles?     | ☐ TBD   | —      | —    |
| T2.4 | Replay (A4)      | Endpoint + pseudonymize?   | ☐ TBD   | —      | —    |

## Tier 3 · Deep review

| #    | DRAFT                      | Decisione                    | Outcome | Commit | Data |
| ---- | -------------------------- | ---------------------------- | ------- | ------ | ---- |
| T3.1 | Utility AI (G1.2)          | Opzione A/B/C?               | ☐ TBD   | —      | —    |
| T3.2 | Tri-Sorgente bridge (G2.1) | Python worker pool approach? | ☐ TBD   | —      | —    |

## Follow-up branch plan (post-approval)

Branch feature da aprire dopo approval:

| Branch                        | Scope                                                     | Dipende da                  |
| ----------------------------- | --------------------------------------------------------- | --------------------------- |
| `feat/utility-ai-flip`        | Flip default (Opzione A) o aggiunge flag YAML (Opzione C) | T3.1                        |
| `feat/tri-sorgente-bridge`    | Python worker pool + endpoint + schema                    | T3.2                        |
| `feat/difficulty-calc`        | services/difficulty/difficultyCalculator.js               | T2.3                        |
| `feat/difficulty-integration` | apps/backend/routes/session.js hook                       | T2.3 + feat/difficulty-calc |
| `feat/difficulty-ci`          | tools/py/validate_encounter_difficulty.py                 | T2.3                        |
| `feat/difficulty-ui`          | Dashboard Settings panel                                  | T2.3                        |
| `feat/replay-endpoint`        | GET /api/v1/session/:id/replay                            | T2.4                        |
| `feat/replay-engine`          | services/replay/replayEngine.js                           | T2.4 + feat/replay-endpoint |
| `feat/replay-ui`              | Debrief replay player                                     | T2.4                        |
| `feat/replay-export`          | Export JSON + share code                                  | T2.4                        |
| `feat/i18n-validation`        | CI parity check                                           | T1.5                        |
| `feat/i18n-runtime`           | Loader + t() helper                                       | T1.5 + feat/i18n-validation |
| `feat/i18n-migration`         | Migrate hardcoded strings                                 | T1.5 + feat/i18n-runtime    |
| `feat/colyseus-boilerplate`   | Room manager (G2.3 post-Q-001)                            | indipendente                |
| `feat/a11y-ui`                | Settings UI panel                                         | T1.2 + T1.3                 |
| `feat/sfx-curation`           | Freesound bank curation                                   | T1.4                        |

## Merge plan Q-001

- Dopo Tier 1 approve → merge parziale Q-001 (items T1.\*)
- Dopo Tier 2+3 approve → merge completo Q-001
- QUARANTINE Q-001 → sposta in § Resolved con hash merge
- ADR DRAFT → active (frontmatter flip)

## Decision format

Ogni decisione committata con:

```
docs(decision): <item-id> - <outcome>

<rationale breve>

Decided-by: <nome>
Decided-at: YYYY-MM-DD
```
