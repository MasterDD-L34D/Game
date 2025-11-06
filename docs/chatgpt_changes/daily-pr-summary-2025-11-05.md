# Daily PR Summary — 2025-11-05

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#552](https://github.com/MasterDD-L34D/Game/pull/552) | Rewrite webapp frontend in AngularJS | @MasterDD-L34D | 2025-11-05T00:04:32Z |
| [#553](https://github.com/MasterDD-L34D/Game/pull/553) | Convert Evo-Tactics navigation to sliding menu | @MasterDD-L34D | 2025-11-05T00:51:31Z |
| [#554](https://github.com/MasterDD-L34D/Game/pull/554) | Add top navigation entries and supporting pages | @MasterDD-L34D | 2025-11-05T01:07:58Z |
| [#555](https://github.com/MasterDD-L34D/Game/pull/555) | Prevent off-canvas navigation from being focusable when closed | @MasterDD-L34D | 2025-11-05T01:16:46Z |
| [#556](https://github.com/MasterDD-L34D/Game/pull/556) | Make mission console navigation persistent outside slider | @MasterDD-L34D | 2025-11-05T01:22:54Z |
| [#557](https://github.com/MasterDD-L34D/Game/pull/557) | Add fallback integration test for biome synthesis | @MasterDD-L34D | 2025-11-05T18:25:30Z |
| [#558](https://github.com/MasterDD-L34D/Game/pull/558) | Add Nebula sync failure integration test | @MasterDD-L34D | 2025-11-05T18:36:49Z |
| [#559](https://github.com/MasterDD-L34D/Game/pull/559) | Improve generator readiness coverage | @MasterDD-L34D | 2025-11-05T18:37:56Z |
| [#560](https://github.com/MasterDD-L34D/Game/pull/560) | Enrich Evo Tactics pack catalog and bundle assets | @MasterDD-L34D | 2025-11-05T19:07:11Z |
| [#561](https://github.com/MasterDD-L34D/Game/pull/561) | Fix recursive trait category sync for Evo Tactics assets | @MasterDD-L34D | 2025-11-05T19:14:36Z |
| [#562](https://github.com/MasterDD-L34D/Game/pull/562) | Align Evo Tactics generation API base across server and docs | @MasterDD-L34D | 2025-11-05T19:33:41Z |
| [#563](https://github.com/MasterDD-L34D/Game/pull/563) | Enhance generator audit tooling and coverage checks | @MasterDD-L34D | 2025-11-05T19:58:37Z |
| [#564](https://github.com/MasterDD-L34D/Game/pull/564) | Add Evo Tactics pack distribution build pipeline | @MasterDD-L34D | 2025-11-05T20:25:57Z |
| [#565](https://github.com/MasterDD-L34D/Game/pull/565) | Add Evo Tactics Mongo schema docs and tooling | @MasterDD-L34D | 2025-11-05T20:44:57Z |
| [#566](https://github.com/MasterDD-L34D/Game/pull/566) | feat: add Mongo-backed catalog service for biome generation | @MasterDD-L34D | 2025-11-05T21:18:26Z |
| [#567](https://github.com/MasterDD-L34D/Game/pull/567) | Fix tab indentation for evo tactics pack recipe | @MasterDD-L34D | 2025-11-05T21:22:37Z |
| [#568](https://github.com/MasterDD-L34D/Game/pull/568) | Load Evo Tactics catalog via API with offline fallbacks | @MasterDD-L34D | 2025-11-05T22:07:18Z |
| [#569](https://github.com/MasterDD-L34D/Game/pull/569) | feat: automate mongodb migrations and seeding | @MasterDD-L34D | 2025-11-05T22:18:27Z |
| [#570](https://github.com/MasterDD-L34D/Game/pull/570) | chore: remove eslint tooling | @MasterDD-L34D | 2025-11-05T23:04:41Z |

## #552 — Rewrite webapp frontend in AngularJS

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T00:04:32Z
- Link: https://github.com/MasterDD-L34D/Game/pull/552

> ## Summary
> - replace the previous Vue/React console with a new AngularJS single page app that boots from CDN delivered Angular scripts
> - implement AngularJS modules, navigation, dashboard, atlas, traits and nebula views backed by a lightweight data store and sample mission data
> - refresh Vite/TypeScript configuration, scripts and styling to suit the new AngularJS structure and remove obsolete dependencies
> ## Testing
> - npm run build
> ------
> https://chatgpt.com/codex/tasks/task_b_690a86f852fc832a93f86d3b4a7caa56

## #553 — Convert Evo-Tactics navigation to sliding menu

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T00:51:31Z
- Link: https://github.com/MasterDD-L34D/Game/pull/553

> ## Summary
> - convert the Evo-Tactics Console navigation into a sliding drawer with overlay and external toggle
> - wire navigation component to accept open state and update accessibility attributes
> - refresh styling to support the off-canvas behaviour and new controls
> ## Testing
> - npm --prefix webapp run lint
> ------
> https://chatgpt.com/codex/tasks/task_e_690a99f27fa08328bd5f5c34570db6c8

## #554 — Add top navigation entries and supporting pages

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T01:07:58Z
- Link: https://github.com/MasterDD-L34D/Game/pull/554

> ## Summary
> - add a horizontal top navigation menu exposing Generatore, Mission Control, Mission Console, and Ecosystem Pack shortcuts
> - create placeholder pages and routes for the new sections while wiring them into the AngularJS router
> - style the new menu for active states and integrate it with the existing navigation component
> ## Testing
> - npm --prefix webapp run build
> ------
> https://chatgpt.com/codex/tasks/task_e_690aa205b6fc832898650e68758667bd

## #555 — Prevent off-canvas navigation from being focusable when closed

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T01:16:46Z
- Link: https://github.com/MasterDD-L34D/Game/pull/555

> ## Summary
> - toggle accessibility attributes on the mission console navigation so it is hidden from assistive tech when closed
> ## Testing
> - git commit (runs npm run lint --workspaces --if-present via hooks)
> ------
> https://chatgpt.com/codex/tasks/task_e_690aa39eeddc8328b76f97007d43d6c7

## #556 — Make mission console navigation persistent outside slider

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T01:22:54Z
- Link: https://github.com/MasterDD-L34D/Game/pull/556

> ## Summary
> - restructure the app shell so the mission console navigation renders in its own sidebar instead of inside the sliding content panel
> - update responsive styles to keep the drawer behavior on mobile while keeping the sidebar visible on larger viewports
> ## Testing
> - npm run lint
> ------
> https://chatgpt.com/codex/tasks/task_e_690aa57016a48328a1ea3bd06ffdd24c

## #557 — Add fallback integration test for biome synthesis

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T18:25:30Z
- Link: https://github.com/MasterDD-L34D/Game/pull/557

> ## Summary
> - add a docs generator integration test that forces biome synthesis to fall back to the local pipeline
> - ensure the activity log records the fallback message and generated biomes are marked synthetic
> ## Testing
> - npm run test:docs-generator
> ------
> https://chatgpt.com/codex/tasks/task_e_690b94f65f288328a0927324e3307b16

## #558 — Add Nebula sync failure integration test

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T18:36:49Z
- Link: https://github.com/MasterDD-L34D/Game/pull/558

> ## Summary
> - add Nebula-specific elements to the generator integration test harness
> - cover the Nebula snapshot failure path with an integration test that checks UI tone and activity log entries
> ## Testing
> - npm run test:docs-generator
> ------
> https://chatgpt.com/codex/tasks/task_e_690b96be5e948328b178f012d1cf40de

## #559 — Improve generator readiness coverage

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T18:37:56Z
- Link: https://github.com/MasterDD-L34D/Game/pull/559

> ## Summary
> - add a docs generator integration test that asserts the `__EVO_TACTICS_API_BASE__` override is honoured
> - extend the dashboard validator to record script sources and ensure the generator HTML includes the runtime libraries
> - make the demo bundle sanity check resilient to single-quoted manifest entries
> ## Testing
> - npm run test:docs-generator
> - python tests/validate_dashboard.py
> ------
> https://chatgpt.com/codex/tasks/task_e_690b91d4a9d4832885c634c61c2124a5

## #560 — Enrich Evo Tactics pack catalog and bundle assets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T19:07:11Z
- Link: https://github.com/MasterDD-L34D/Game/pull/560

> ## Summary
> - regenerate the Evo Tactics catalog with enriched biome metadata, species telemetry, and generate per-species registry JSON alongside an index for incremental loading
> - add automation scripts and CI hooks to rebuild and sync pack assets into docs/public plus expose an npm helper
> - document catalog override options and ensure static bundles include the latest fallbacks for traits, hazards, and species
> ## Testing
> - npm run test:docs-generator
> ------
> https://chatgpt.com/codex/tasks/task_e_690b9a38a0008328972483656a3af1ac

## #561 — Fix recursive trait category sync for Evo Tactics assets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T19:14:36Z
- Link: https://github.com/MasterDD-L34D/Game/pull/561

> ## Summary
> - ensure the Evo Tactics asset sync script copies trait category directories recursively so all JSON files reach the public bundle
> ## Testing
> - npm run lint --workspaces --if-present
> ------
> https://chatgpt.com/codex/tasks/task_b_690ba06af9b0832ab13340d6dc3bb2d3

## #562 — Align Evo Tactics generation API base across server and docs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T19:33:41Z
- Link: https://github.com/MasterDD-L34D/Game/pull/562

> ## Summary
> - expose the canonical Evo Tactics biome generation endpoint and API base constants on the server
> - default the generator bundle to the official api.evo-tactics.dev base and allow safe overrides from window.__EVO_TACTICS_API_BASE__
> - document CDN/self-hosted configuration plus monitoring guidance for the generation worker
> ## Testing
> - npm run test:docs-generator
> ------
> https://chatgpt.com/codex/tasks/task_e_690ba234ad1c8328a7ee925b94cbe294

## #563 — Enhance generator audit tooling and coverage checks

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T19:58:37Z
- Link: https://github.com/MasterDD-L34D/Game/pull/563

> ## Summary
> - extend the docs generator integration suite to cover multi-language glossary entries and stored audio preferences
> - expand `scripts/generator.py` with a combined trait profile and coverage audit workflow for deploy reviews
> - add an automated dashboard/generator validation step to the CI bundle pipeline and archive the metrics
> ## Testing
> - npx vitest --config vitest.config.docs-generator.ts run tests/docs-generator/integration/generator.integration.test.ts
> ------
> https://chatgpt.com/codex/tasks/task_e_690ba6a1857483289f0f25896fa8b1de

## #564 — Add Evo Tactics pack distribution build pipeline

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T20:25:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/564

> ## Summary
> - add scripts and Makefile target to assemble a self-contained `dist/evo-tactics-pack` bundle with runtime assets and data
> - document the quick deploy checklist and runtime vendor guidance for the Evo Tactics Pack
> - provide a local preview server to drive post-deploy smoke tests
> ## Testing
> - npm run build:evo-tactics-pack:offline
> - npm run preview:docs-generator
> ------
> https://chatgpt.com/codex/tasks/task_e_690bac788d9883288bccac15a65b5b63

## #565 — Add Evo Tactics Mongo schema docs and tooling

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T20:44:57Z
- Link: https://github.com/MasterDD-L34D/Game/pull/565

> ## Summary
> - document the MongoDB collections, relationships, and indexes for the Evo Tactics pack
> - add a Python seeding script that imports the generated catalog JSON into MongoDB
> - provide a lightweight migration runner with the first two incremental migrations and npm hooks
> ## Testing
> - `python scripts/db/seed_evo_generator.py --dry-run` *(fails: module `pymongo` not installed in sandbox)*
> ------
> https://chatgpt.com/codex/tasks/task_e_690bb334a3dc8328ba20e443f43ca33c

## #566 — feat: add Mongo-backed catalog service for biome generation

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T21:18:26Z
- Link: https://github.com/MasterDD-L34D/Game/pull/566

> ## Summary
> - add a shared MongoDB connection helper and catalog service wired into the biome generation routes
> - allow the biome synthesizer and species builder to consume Mongo-backed trait catalogs with local fallback
> - cover the Mongo data path with an integration test that seeds an in-memory MongoDB instance
> ## Testing
> - node --test tests/api/biome-generation-mongo.test.js *(fails: missing mongodb dependencies in the execution environment)*
> ------
> https://chatgpt.com/codex/tasks/task_e_690bb755b1a083289e5e52f21e2f4214

## #567 — Fix tab indentation for evo tactics pack recipe

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T21:22:37Z
- Link: https://github.com/MasterDD-L34D/Game/pull/567

> ## Summary
> - add the missing leading tab to the `evo-tactics-pack` recipe so GNU Make treats it as a command
> ## Testing
> - git commit
> ------
> https://chatgpt.com/codex/tasks/task_b_690bbf4175e8832a9447a6796661a615

## #568 — Load Evo Tactics catalog via API with offline fallbacks

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T22:07:18Z
- Link: https://github.com/MasterDD-L34D/Game/pull/568

> ## Summary
> - add a shared data source service that reads Evo Tactics catalog sections from REST endpoints with override support and embedded fallback data
> - update the generator to use the API loader, reuse the embedded catalog for biome synthesis, and serve a Nebula snapshot when the console is offline
> - document the new catalog endpoints and base URL configuration for deployments
> ## Testing
> - npm run test:docs-generator
> ------
> https://chatgpt.com/codex/tasks/task_e_690bc23b627c8328a8f7980d97ea7900

## #569 — feat: automate mongodb migrations and seeding

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T22:18:27Z
- Link: https://github.com/MasterDD-L34D/Game/pull/569

> ## Summary
> - add MongoDB environment configuration files and loader utility shared by migration/seed scripts
> - extend deployment workflow and ops script to run migrations plus seed automatically using the new configs
> - document backup, retention, and access policies for MongoDB operations
> ## Testing
> - python -m compileall scripts/db
> ------
> https://chatgpt.com/codex/tasks/task_e_690bca9f43408328819ea788b7799bc8

## #570 — chore: remove eslint tooling

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-05T23:04:41Z
- Link: https://github.com/MasterDD-L34D/Game/pull/570

> ## Summary
> - remove the shared ESLint configuration and associated scripts
> - drop ESLint dependencies from all package manifests and lockfile
> - update the Husky pre-commit hook and contributor docs to focus on Prettier-only formatting checks
> ## Testing
> - not run
> ------
> https://chatgpt.com/codex/tasks/task_e_690bd634226c83289cad79d2d1fd06bc
