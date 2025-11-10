# Daily PR Summary — 2025-11-09

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#589](https://github.com/MasterDD-L34D/Game/pull/589) | Add optimistic locking and version management to trait API | @MasterDD-L34D | 2025-11-09T12:31:11Z |
| [#590](https://github.com/MasterDD-L34D/Game/pull/590) | Add JWT-based RBAC with audit logging for trait API | @MasterDD-L34D | 2025-11-09T12:43:55Z |
| [#591](https://github.com/MasterDD-L34D/Game/pull/591) | Add stack dev scripts and trait editor deployment guide | @MasterDD-L34D | 2025-11-09T12:55:27Z |
| [#592](https://github.com/MasterDD-L34D/Game/pull/592) | feat: normalise trait data and improve fallback handling | @MasterDD-L34D | 2025-11-09T13:35:19Z |
| [#593](https://github.com/MasterDD-L34D/Game/pull/593) | Expand trait editor to support full entry payload | @MasterDD-L34D | 2025-11-09T13:52:14Z |
| [#594](https://github.com/MasterDD-L34D/Game/pull/594) | docs: add contributing guide and QA workflow | @MasterDD-L34D | 2025-11-09T21:34:35Z |
| [#595](https://github.com/MasterDD-L34D/Game/pull/595) | feat: secure trait editor mutations with auth refresh | @MasterDD-L34D | 2025-11-09T21:48:55Z |
| [#596](https://github.com/MasterDD-L34D/Game/pull/596) | feat(trait-editor): add trait validation workflow | @MasterDD-L34D | 2025-11-09T22:52:46Z |

## #589 — Add optimistic locking and version management to trait API

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T12:31:11Z
- Link: https://github.com/MasterDD-L34D/Game/pull/589

> ## Summary
> - add optimistic locking to trait mutations and return ETag/version metadata in API responses
> - persist trait history with metadata-rich manifests and configurable retention when snapshotting
> - expose endpoints to list, fetch, and restore previous trait versions through the trait router
> ## Testing
> - not run (not requested)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_6910827294c8832ab21bfa2518c47fc6)

## #590 — Add JWT-based RBAC with audit logging for trait API

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T12:43:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/590

> ## Summary
> - add a reusable JWT authentication middleware with RBAC helpers and audit logging support
> - enforce role-based access and audit trail recording across trait routes using the new middleware
> - cover the new access rules with tests and document the required AUTH_* environment variables
> ## Testing
> - node --test tests/api/traits.validate.test.js *(fails: Cannot find module 'supertest' – dev dependency not available in environment)*
> - node --test tests/api/traits.auth.test.js *(fails: Cannot find module 'supertest' – dev dependency not available in environment)*
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_6910899db638832ab1826a57a8a68002)

## #591 — Add stack dev scripts and trait editor deployment guide

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T12:55:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/591

> ## Summary
> - document stack setup in the main README and add a dedicated Trait Editor setup/deploy guide
> - add npm and Makefile helpers for running the backend + webapp together, stack tests, and CI preflight checks
> - extend the CI workflow with a stack job that lints touched files, runs API/frontend tests, and builds the production bundle
> ## Testing
> - npm run lint:stack
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_69108cabcf30832ab2fb5fbab77eadd2)

## #592 — feat: normalise trait data and improve fallback handling

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T13:35:19Z
- Link: https://github.com/MasterDD-L34D/Game/pull/592

> ## Summary
> - parse trait index documents into DTOs that preserve nested schema data and expose presentation fields
> - refresh the trait data service to normalise remote responses, manage fallback cache TTLs, and provide retry helpers
> - add reusable trait cloning utilities and update editor/state flows to keep schema data in sync
> - supply sample traits aligned to the real index and introduce vitest unit tests for parsing and caching logic
> ## Testing
> - ../node_modules/.bin/vitest run
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_6910941b8fa4832abb59cd16992e7893)

## #593 — Expand trait editor to support full entry payload

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T13:52:14Z
- Link: https://github.com/MasterDD-L34D/Game/pull/593

> ## Summary
> - extend the trait editor controller and template so every required Trait.entry field can be inspected and edited without dropping nested data
> - replace shallow cloning logic with deep clone/merge helpers to keep preview and save payloads aligned with the backend schema
> - cover the new behaviour with Vitest specs for trait helpers and the state service
> ## Testing
> - npm test
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_691098a34854832a8073da23bc5f2b66)

## #594 — docs: add contributing guide and QA workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T21:34:35Z
- Link: https://github.com/MasterDD-L34D/Game/pull/594

> ## Summary
> - add the Support Hub contributing guide derived from the blueprint and link it from the docs landing page
> - publish a reusable QA checklist with the first audit cycle recorded
> - provide an offline-friendly smoke test script and npm alias for serving the docs alongside the API
> ## Testing
> - npm run docs:smoke
> - npx prettier --check docs/CONTRIBUTING_SITE.md docs/qa-checklist.md scripts/docs-smoke.js
> - npx html-validate docs/index.html docs/ideas/index.html *(fails: npm 403 – registry not reachable in the execution environment)*
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_690a7f421aa8832aa3756f2004911ade)

## #595 — feat: secure trait editor mutations with auth refresh

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T21:48:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/595

> ## Summary
> - route trait editor mutations through the /api/traits/:id endpoints while persisting concurrency metadata for PUT requests
> - add token acquisition/refresh logic and remote detail sync to recover from 401/412/428 responses
> - cover the authenticated mutation flow with new TraitDataService tests
> ## Testing
> - npm test
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_69110918a7ec832ab554d3ac1e88bd73)

## #596 — feat(trait-editor): add trait validation workflow

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-09T22:52:46Z
- Link: https://github.com/MasterDD-L34D/Game/pull/596

> ## Summary
> - integrate the remote trait validation API with normalization, error handling, and JSON pointer auto-fix support in the data service
> - add a validation panel component, hook it into the trait editor UI, and support applying or undoing auto-fixes on the form model
> - style the new validation widgets and cover the workflow with dedicated service and controller tests
> ## Testing
> - npm run test (Trait Editor)
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_b_69110c5019a8832ab45ab0c403232198)
